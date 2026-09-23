/**
 * Gradi email šablone iz jednog izvora.
 *
 * ULAZ   emails/templates/_layout.html + admin.html + user.html
 * IZLAZ  1. emails/preview/*.html        — otvori u browseru da vidiš kako izgleda
 *        2. backend/apps-script/Templates.gs — nalepi u Apps Script
 *
 * Zašto generator, a ne dva ručno održavana fajla: šablon mora da postoji i u
 * Apps Scriptu (koji ne može da čita lokalne fajlove) i kao preview. Ručno
 * održavanje dve kopije završi tako što se raziđu. Ovde je izvor jedan.
 *
 * Pokretanje:  npm run emails
 */

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const TPL = join(ROOT, 'emails', 'templates');
const PREVIEW = join(ROOT, 'emails', 'preview');
const GS_OUT = join(ROOT, 'backend', 'apps-script', 'Templates.gs');

const read = (f) => readFileSync(join(TPL, f), 'utf8');

const layout = read('_layout.html');
const adminBody = read('admin.html');
const userBody = read('user.html');

/** Ugrađuje sadržaj u layout. Rezultat je jedan samostalan HTML dokument. */
function compose(body) {
  return layout.replace('{{CONTENT}}', body);
}

const adminFull = compose(adminBody);
const userFull = compose(userBody);

// ---------------------------------------------------------------------------
// 1. PREVIEW sa primerom podataka
// ---------------------------------------------------------------------------

const PHONES = [
  { label: 'Direktor', display: '+381 64 1101521', tel: '+381641101521' },
  { label: 'Komercijala', display: '+381 60 0440458', tel: '+381600440458' },
];

const COMMON_VARS = {
  COMPANY_ADDRESS: 'Vojvode Prijezde 17, Beograd',
  COMPANY_EMAIL: 'office@drcooker.rs',
  PHONE1_LABEL: PHONES[0].label,
  PHONE1: PHONES[0].display,
  PHONE1_TEL: PHONES[0].tel,
  PHONE2_LABEL: PHONES[1].label,
  PHONE2: PHONES[1].display,
  PHONE2_TEL: PHONES[1].tel,
  SITE_URL: 'https://drcooker.rs',
};

/** Jedan red tabele „labela → vrednost". Isti markup u oba mejla. */
function row(label, value) {
  return `<tr>
        <td class="lbl" width="150" valign="top" style="width:150px;padding:9px 12px 9px 0;border-bottom:1px solid #D5CCBE;font-family:Consolas,'Courier New',monospace;font-size:11px;letter-spacing:0.08em;text-transform:uppercase;color:#4A4238;">${label}</td>
        <td class="val" valign="top" style="padding:9px 0;border-bottom:1px solid #D5CCBE;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.5;color:#17140F;">${value}</td>
      </tr>`;
}

const sampleAdminRows = [
  row('Ime i prezime', 'Jelena Marković'),
  row('Ustanova', 'Predškolska ustanova „Primer“'),
  row('Email', '<a href="mailto:jelena@primer.rs" style="color:#A32A2E;text-decoration:underline;">jelena@primer.rs</a>'),
  row('Telefon', '<a href="tel:+381601234567" style="color:#A32A2E;text-decoration:underline;">060 123 4567</a>'),
  row('Usluga', 'Kuvani obroci — vrtić / jaslice'),
  row('Broj korisnika', '120'),
  row('Željeni početak', '01.10.2026.'),
].join('\n      ');

const sampleUserRows = [
  row('Ustanova', 'Predškolska ustanova „Primer“'),
  row('Usluga', 'Kuvani obroci — vrtić / jaslice'),
  row('Broj korisnika', '120'),
  row('Željeni početak', '01.10.2026.'),
].join('\n      ');

function fill(tpl, vars) {
  return Object.entries(vars).reduce(
    (acc, [k, v]) => acc.replaceAll(`{{${k}}}`, v ?? ''),
    tpl,
  );
}

mkdirSync(PREVIEW, { recursive: true });

writeFileSync(
  join(PREVIEW, 'admin.html'),
  fill(adminFull, {
    ...COMMON_VARS,
    SUBJECT: '[UPIT] Predškolska ustanova „Primer“ — Kuvani obroci',
    PREHEADER: 'Jelena Marković, 120 korisnika, željeni početak 01.10.2026.',
    HEADER_TAG: 'Upit sa sajta',
    USTANOVA: 'Predškolska ustanova „Primer“',
    IME: 'Jelena Marković',
    USLUGA: 'Kuvani obroci — vrtić / jaslice',
    TELEFON: '060 123 4567',
    TELEFON_TEL: '+381601234567',
    EMAIL: 'jelena@primer.rs',
    REPLY_SUBJECT: 'Odgovor%20na%20Va%C5%A1%20upit%20%E2%80%94%20Dr%20COOKER',
    ROWS: sampleAdminRows,
    PORUKA:
      'Dobar dan, zanima nas ponuda za doručak, ručak i dve užine za tri objekta.<br>Ukupno oko 120 dece uzrasta od 1 do 6 godina. Imamo i troje dece sa alergijom na gluten.',
    REFERENCE: 'UP-20260921-142233',
    PRIMLJENO: '21.09.2026. u 14:22',
    IZVOR: 'https://drcooker.rs/zatrazi-ponudu',
    FOOTER_NOTE:
      'Ovaj email je automatski poslat sa sajta drcooker.rs. Odgovor na ovu poruku ide direktno pošiljaocu upita.',
  }),
  'utf8',
);

writeFileSync(
  join(PREVIEW, 'user.html'),
  fill(userFull, {
    ...COMMON_VARS,
    SUBJECT: 'Primili smo Vaš upit — Dr Cooker',
    PREHEADER: 'Vaš upit je stigao. Javićemo Vam se na ostavljene kontakt podatke.',
    HEADER_TAG: 'Potvrda',
    IME: 'Jelena Marković',
    ROWS: sampleUserRows,
    // Prazno namerno: PENDING.responseTime je null dok klijent ne potvrdi rok.
    ROK_BLOK: '',
    FOOTER_NOTE:
      'Ovaj email je potvrda prijema upita poslatog preko sajta drcooker.rs. Ako niste Vi poslali upit, slobodno zanemarite ovu poruku.',
  }),
  'utf8',
);

// ---------------------------------------------------------------------------
// 2. Templates.gs za Apps Script
// ---------------------------------------------------------------------------

/** Pakuje HTML u JS string literal bezbedan za Apps Script. */
function toGsLiteral(html) {
  return (
    "'" +
    html
      .replace(/\\/g, '\\\\')
      .replace(/'/g, "\\'")
      .replace(/\r?\n/g, "\\n' +\n  '") +
    "'"
  );
}

const gs = `/**
 * ============================================================================
 *  HTML EMAIL ŠABLONI — GENERISAN FAJL, NE MENJATI RUČNO
 * ============================================================================
 *
 *  Izvor:      emails/templates/_layout.html, admin.html, user.html
 *  Generator:  tools/build-emails.mjs   (pokreni: npm run emails)
 *
 *  Ako ovde nešto izmeniš, izmena nestaje pri sledećem generisanju.
 *  Menjaj .html fajlove pa pokreni generator.
 *
 *  Generisano: ${new Date().toISOString().slice(0, 10)}
 * ============================================================================
 */

var TPL_ADMIN = ${toGsLiteral(adminFull)};

var TPL_USER = ${toGsLiteral(userFull)};

/** Zamenjuje {{KLJUC}} vrednostima iz mape. */
function fillTemplate_(tpl, vars) {
  return Object.keys(vars).reduce(function (acc, key) {
    var safe = vars[key] == null ? '' : String(vars[key]);
    return acc.split('{{' + key + '}}').join(safe);
  }, tpl);
}

/** Escape za HTML. Sve što dolazi iz forme mora proći kroz ovo. */
function esc_(v) {
  return String(v == null ? '' : v)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** Jedan red tabele „labela → vrednost". */
function tplRow_(label, value) {
  return '<tr>' +
    '<td class="lbl" width="150" valign="top" style="width:150px;padding:9px 12px 9px 0;border-bottom:1px solid #D5CCBE;font-family:Consolas,\\'Courier New\\',monospace;font-size:11px;letter-spacing:0.08em;text-transform:uppercase;color:#4A4238;">' + label + '</td>' +
    '<td class="val" valign="top" style="padding:9px 0;border-bottom:1px solid #D5CCBE;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.5;color:#17140F;">' + value + '</td>' +
    '</tr>';
}

/** Datum u srpskom formatu, beogradska zona. */
function fmtDate_(d) {
  return Utilities.formatDate(d, 'Europe/Belgrade', 'dd.MM.yyyy.') +
    ' u ' + Utilities.formatDate(d, 'Europe/Belgrade', 'HH:mm');
}

/** Datum iz <input type="date"> (YYYY-MM-DD) u dd.MM.yyyy. */
function fmtDateOnly_(iso) {
  if (!iso) return '';
  var m = /^(\\d{4})-(\\d{2})-(\\d{2})$/.exec(iso);
  return m ? m[3] + '.' + m[2] + '.' + m[1] + '.' : iso;
}

function commonVars_(company) {
  return {
    COMPANY_ADDRESS: esc_(company.address),
    COMPANY_EMAIL: esc_(company.email),
    PHONE1_LABEL: esc_(company.phones[0].label),
    PHONE1: esc_(company.phones[0].display),
    PHONE1_TEL: esc_(company.phones[0].tel),
    PHONE2_LABEL: esc_(company.phones[1].label),
    PHONE2: esc_(company.phones[1].display),
    PHONE2_TEL: esc_(company.phones[1].tel),
    SITE_URL: esc_(company.site)
  };
}

/** Telefon očišćen za tel: link. */
function telHref_(v) {
  var digits = String(v || '').replace(/[^\\d+]/g, '');
  if (digits.indexOf('+') !== 0 && digits.indexOf('0') === 0) {
    digits = '+381' + digits.slice(1);
  }
  return digits;
}

// ---------------------------------------------------------------------------
//  ADMIN — obaveštenje firmi
// ---------------------------------------------------------------------------

function renderAdminEmail(clean, reference, company) {
  var rows = [];
  rows.push(tplRow_('Ime i prezime', esc_(clean.ime)));
  rows.push(tplRow_('Ustanova', esc_(clean.ustanova)));
  rows.push(tplRow_('Email',
    '<a href="mailto:' + esc_(clean.email) + '" style="color:#A32A2E;text-decoration:underline;">' + esc_(clean.email) + '</a>'));
  rows.push(tplRow_('Telefon',
    '<a href="tel:' + esc_(telHref_(clean.telefon)) + '" style="color:#A32A2E;text-decoration:underline;">' + esc_(clean.telefon) + '</a>'));
  rows.push(tplRow_('Usluga', esc_(clean._uslugaLabel)));
  if (clean.brojKorisnika) rows.push(tplRow_('Broj korisnika', esc_(clean.brojKorisnika)));
  if (clean.pocetak) rows.push(tplRow_('Željeni početak', esc_(fmtDateOnly_(clean.pocetak))));
  rows.push(tplRow_('Saglasnost', esc_(clean.saglasnost)));

  var vars = commonVars_(company);
  vars.SUBJECT = '[UPIT] ' + esc_(clean.ustanova);
  vars.PREHEADER = esc_(clean.ime) + ' \\u00b7 ' + esc_(clean._uslugaLabel) +
    (clean.brojKorisnika ? ' \\u00b7 ' + esc_(clean.brojKorisnika) + ' korisnika' : '');
  vars.HEADER_TAG = 'Upit sa sajta';
  vars.USTANOVA = esc_(clean.ustanova);
  vars.IME = esc_(clean.ime);
  vars.USLUGA = esc_(clean._uslugaLabel);
  vars.TELEFON = esc_(clean.telefon);
  vars.TELEFON_TEL = esc_(telHref_(clean.telefon));
  vars.EMAIL = esc_(clean.email);
  vars.REPLY_SUBJECT = encodeURIComponent('Odgovor na Vaš upit — Dr Cooker');
  vars.ROWS = rows.join('');
  vars.PORUKA = esc_(clean.poruka).replace(/\\r?\\n/g, '<br>');
  vars.REFERENCE = esc_(reference);
  vars.PRIMLJENO = fmtDate_(new Date());
  vars.IZVOR = esc_(clean._source || '—');
  vars.FOOTER_NOTE = 'Ovaj email je automatski poslat sa sajta. Odgovor na ovu poruku ide direktno pošiljaocu upita.';

  return fillTemplate_(TPL_ADMIN, vars);
}

// ---------------------------------------------------------------------------
//  KORISNIK — potvrda prijema
// ---------------------------------------------------------------------------

function renderUserEmail(clean, reference, company) {
  var rows = [];
  rows.push(tplRow_('Ustanova', esc_(clean.ustanova)));
  rows.push(tplRow_('Usluga', esc_(clean._uslugaLabel)));
  if (clean.brojKorisnika) rows.push(tplRow_('Broj korisnika', esc_(clean.brojKorisnika)));
  if (clean.pocetak) rows.push(tplRow_('Željeni početak', esc_(fmtDateOnly_(clean.pocetak))));
  rows.push(tplRow_('Broj upita', esc_(reference)));

  var vars = commonVars_(company);
  vars.SUBJECT = 'Primili smo Vaš upit — Dr Cooker';
  vars.PREHEADER = 'Vaš upit je stigao. Javićemo Vam se na ostavljene kontakt podatke.';
  vars.HEADER_TAG = 'Potvrda';
  vars.IME = esc_(clean.ime);
  vars.ROWS = rows.join('');

  // ROK_BLOK ostaje prazan dok klijent ne potvrdi stvaran rok odgovora.
  // Kada ga potvrdi, postavi CONFIG.RESPONSE_TIME u Code.gs i biće ubačen.
  var rok = (typeof CONFIG !== 'undefined' && CONFIG.RESPONSE_TIME) ? CONFIG.RESPONSE_TIME : '';
  vars.ROK_BLOK = rok ? ' ' + esc_(rok) : '';

  vars.FOOTER_NOTE = 'Ovaj email je potvrda prijema upita poslatog preko sajta. Ako niste Vi poslali upit, slobodno zanemarite ovu poruku.';

  return fillTemplate_(TPL_USER, vars);
}
`;

mkdirSync(dirname(GS_OUT), { recursive: true });
writeFileSync(GS_OUT, gs, 'utf8');

const kb = (s) => `${(Buffer.byteLength(s, 'utf8') / 1024).toFixed(1)} KB`;
console.log('  OK   emails/preview/admin.html      ', kb(adminFull));
console.log('  OK   emails/preview/user.html       ', kb(userFull));
console.log('  OK   backend/apps-script/Templates.gs', kb(gs));
console.log('\nOtvori preview fajlove u browseru da vidiš kako mejlovi izgledaju.');
