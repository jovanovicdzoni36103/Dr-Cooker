/**
 * ============================================================================
 *  API SLOJ — jedina tačka komunikacije sa backendom
 * ============================================================================
 *
 *  Nijedan drugi fajl ne poziva fetch(). Forma zove isključivo
 *  submitInquiry(formData).
 *
 *  Ako se backend jednog dana promeni (Apps Script → nešto drugo), menja se
 *  samo ovaj fajl.
 *
 *  ---------------------------------------------------------------------------
 *  ZAŠTO text/plain UMESTO application/json
 *  ---------------------------------------------------------------------------
 *  Google Apps Script Web App ne odgovara na CORS preflight (OPTIONS).
 *  `application/json` je „non-simple" zahtev koji okida preflight, pa pada pre
 *  nego što uopšte stigne do skripte.
 *
 *  `text/plain;charset=utf-8` je „simple request" — nema preflight-a, Apps
 *  Script vrati `Access-Control-Allow-Origin: *`, i odgovor MOŽE da se pročita.
 *
 *  Čitanje odgovora je obavezno: bez njega ne možemo da potvrdimo da je upit
 *  stvarno stigao, a prikazivanje lažne potvrde je zabranjeno.
 *  Telo zahteva je i dalje JSON string — skripta ga parsira iz
 *  e.postData.contents.
 * ============================================================================
 */

(function () {
  'use strict';

  /** Poruke za korisnika. Na jednom mestu da bi ton bio isti svuda. */
  const MESSAGES = {
    NOT_CONFIGURED:
      'Slanje forme još nije aktivirano na ovom sajtu. Upit NIJE poslat. Molimo kontaktirajte nas telefonom ili na email.',
    // PAZNJA na razliku: NETWORK znaci da zahtev NIJE otisao (fetch je pukao
    // pre slanja) — tu smemo da tvrdimo da upit nije poslat.
    // TIMEOUT i SERVER znace da je zahtev otisao a odgovor nije stigao ili
    // nije bio ispravan. Da li je upit primljen NE ZNAMO, pa ne tvrdimo.
    TIMEOUT:
      'Server nije odgovorio na vreme. Ne možemo da potvrdimo da li je upit stigao — pozovite nas da budemo sigurni.',
    NETWORK:
      'Nije uspelo povezivanje sa serverom. Upit nije poslat. Proverite internet vezu i pokušajte ponovo.',
    SERVER:
      'Server je vratio grešku. Ne možemo da potvrdimo da li je upit stigao — pozovite nas da budemo sigurni.',
    MALFORMED:
      'Server je vratio neočekivan odgovor. Ne možemo da potvrdimo da je upit stigao — molimo pozovite nas da budemo sigurni.',
    REJECTED: 'Podaci nisu prihvaćeni. Proverite unos i pokušajte ponovo.',
    DUPLICATE: 'Ovaj upit je već poslat. Javićemo Vam se na ostavljene kontakt podatke.',
    IN_FLIGHT: 'Slanje je već u toku.',
  };

  /** Naslov panela greske. Podrazumevano je neutralan; tvrdimo samo ono
   *  sto sigurno znamo. */
  const TITLES = {
    NOT_CONFIGURED: 'Upit nije poslat.',
    NETWORK: 'Upit nije poslat.',
    REJECTED: 'Upit nije poslat.',
    IN_FLIGHT: 'Slanje je u toku.',
    DUPLICATE: 'Upit je već poslat.',
    TIMEOUT: 'Nismo dobili potvrdu.',
    SERVER: 'Nismo dobili potvrdu.',
    MALFORMED: 'Nismo dobili potvrdu.',
  };

  function fail(code, detail, fieldErrors) {
    return {
      ok: false,
      code: code,
      title: TITLES[code] || 'Nismo dobili potvrdu.',
      message: MESSAGES[code],
      detail: detail,
      fieldErrors: fieldErrors,
    };
  }

  // -------------------------------------------------------------------------
  //  Zaštita od duplog slanja
  // -------------------------------------------------------------------------

  /** Da li zahtev trenutno traje. Sprečava paralelna slanja. */
  let inFlight = false;

  /** Otisci već uspešno poslatih upita u ovoj sesiji. */
  const submitted = new Set();

  /**
   * Stabilan otisak sadržaja upita. Dva identična slanja daju isti otisak, pa
   * drugo biva odbijeno kao duplikat.
   *
   * Namerno nije kriptografski hash — ovo nije bezbednosna mera, nego zaštita
   * korisnika od duplog klika i Sheet-a od duplog reda.
   */
  /**
   * Otisak SADRŽAJA upita. Metapodaci se izuzimaju, inače isti upit poslat
   * dva puta daje dva različita otiska i provera duplikata ne radi ništa.
   *
   * `timestamp` je upravo tako i promakao: nema donju crtu, pa je ulazio u
   * račun i menjao se pri svakom slanju. I lokalna provera i serverska
   * idempotencija su zbog toga bile mrtve.
   */
  const META_POLJA = ['company_website', 'timestamp'];

  function fingerprint(data) {
    const stable = Object.keys(data)
      .filter(function (k) {
        return k.charAt(0) !== '_' && META_POLJA.indexOf(k) === -1;
      })
      .sort()
      .map(function (k) {
        return k + '=' + String(data[k] == null ? '' : data[k]);
      })
      .join('|');

    let h = 0;
    for (let i = 0; i < stable.length; i++) {
      h = (h << 5) - h + stable.charCodeAt(i);
      h |= 0;
    }
    return 'f' + (h >>> 0).toString(36);
  }

  /** Jedinstven ID zahteva. Backend ga koristi za idempotenciju. */
  function requestId() {
    if (window.crypto && typeof window.crypto.randomUUID === 'function') {
      return window.crypto.randomUUID();
    }
    return 'r-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 10);
  }

  // -------------------------------------------------------------------------
  //  Transport
  // -------------------------------------------------------------------------

  /** Jedan HTTP pokušaj. Nikada ne baca — uvek vraća rezultat. */
  function postOnce(url, body, timeoutMs) {
    const controller = new AbortController();
    const timer = setTimeout(function () {
      controller.abort();
    }, timeoutMs);

    return fetch(url, {
      method: 'POST',
      // Vidi komentar na vrhu fajla — text/plain izbegava CORS preflight.
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: body,
      signal: controller.signal,
      redirect: 'follow',
      credentials: 'omit',
    })
      .then(function (response) {
        clearTimeout(timer);

        if (!response.ok) {
          return fail('SERVER', 'HTTP ' + response.status + ' ' + response.statusText);
        }
        return response.text().then(function (text) {
          let parsed;
          try {
            parsed = JSON.parse(text);
          } catch (e) {
            // Apps Script pri grešci u skripti vrati HTML stranicu, ne JSON.
            return fail('MALFORMED', 'Odgovor nije JSON: ' + String(text).slice(0, 200));
          }

          if (parsed.ok === true || parsed.status === 'ok') {
            // `mail` nosi da li je svaki od dva mejla zaista otisao. Forma
            // ga koristi da ne obeca potvrdu koja nije poslata.
            return { ok: true, reference: parsed.reference, mail: parsed.mail };
          }
          if (parsed.fieldErrors && Object.keys(parsed.fieldErrors).length > 0) {
            return fail('REJECTED', parsed.error, parsed.fieldErrors);
          }

          // Kod sa servera se preslikava EKSPLICITNO.
          //
          // Ranije je SVE bez fieldErrors zavrsavalo kao REJECTED, dakle kao
          // poruka „Podaci nisu prihvaceni. Proverite unos." Korisniku se
          // govorilo da je pogresio i kada njegov unos uopste nije bio u
          // pitanju, nijedno polje nije bilo obelezeno, a REJECTED nije u
          // RETRYABLE pa se nista nije ponavljalo.
          //
          // INTERNAL je poseban: `catch` u Code.gs pokriva i prozor POSLE
          // uspesnog upisa reda, pa „greska na serveru" NE znaci da upit nije
          // primljen. Zato ide u MALFORMED — „ne znamo", a ne „nije poslato".
          const MAPA_KODOVA = {
            VALIDATION: 'REJECTED',
            BAD_BODY: 'NETWORK',
            INTERNAL: 'MALFORMED'
          };
          return fail(
            MAPA_KODOVA[parsed.code] || 'MALFORMED',
            parsed.error || parsed.code || 'Backend je odbio zahtev.'
          );
        });
      })
      .catch(function (err) {
        clearTimeout(timer);
        const isAbort = err && err.name === 'AbortError';
        return fail(isAbort ? 'TIMEOUT' : 'NETWORK', err && err.message ? err.message : String(err));
      });
  }

  /** Greške kod kojih ima smisla pokušati ponovo. Odbijen zahtev se ne ponavlja. */
  const RETRYABLE = ['NETWORK', 'TIMEOUT', 'SERVER'];

  function wait(ms) {
    return new Promise(function (r) {
      setTimeout(r, ms);
    });
  }

  // -------------------------------------------------------------------------
  //  Javni API
  // -------------------------------------------------------------------------

  /**
   * Šalje upit. Jedina funkcija koju UI sme da zove.
   *
   * Garantuje:
   *   - nikada ne vraća ok:true bez potvrde backenda
   *   - nikada ne šalje dva puta isti sadržaj
   *   - nikada ne visi duže od CONFIG.REQUEST_TIMEOUT_MS po pokušaju
   *
   * @param {Object} formData  podaci iz forme (vidi DATA MODEL u forms.js)
   * @returns {Promise<{ok:true, reference?:string} | {ok:false, code:string, message:string}>}
   */
  async function submitInquiry(formData) {
    // `js/config.js` moze da ne stigne (404 na rucno prekopiranom deployu,
    // blokiran zahtev). Bez ovoga bi `cfg.IS_BACKEND_CONNECTED` bacio
    // TypeError i ostavio formu zakljucanu na „Saljemo…".
    const cfg = window.CONFIG || {};

    if (inFlight) return fail('IN_FLIGHT');

    const fp = fingerprint(formData);
    if (submitted.has(fp)) return fail('DUPLICATE');

    // DEMO režim: backend još nije povezan. Eksplicitno, bez lažnog uspeha.
    if (!cfg.IS_BACKEND_CONNECTED) {
      if (window.console && console.info) {
        console.info('[Dr Cooker] DEMO režim — payload koji bi bio poslat:', formData);
      }
      return fail('NOT_CONFIGURED');
    }

    /**
     * DATA MODEL koji stiže u Apps Script i u Sheet.
     * Polja bez donje crte su podaci iz forme; `_` polja su tehnička.
     */
    const payload = Object.assign({}, formData, {
      _id: requestId(),
      _fingerprint: fp,
      _source: typeof location !== 'undefined' ? location.href : '',
      _sentAt: new Date().toISOString(),
    });

    const body = JSON.stringify(payload);

    inFlight = true;
    try {
      let last = fail('NETWORK');

      for (let attempt = 0; attempt <= cfg.REQUEST_RETRIES; attempt++) {
        last = await postOnce(cfg.GOOGLE_APPS_SCRIPT_URL, body, cfg.REQUEST_TIMEOUT_MS);

        if (last.ok) {
          submitted.add(fp);
          return last;
        }
        if (RETRYABLE.indexOf(last.code) === -1) return last;

        if (attempt < cfg.REQUEST_RETRIES) {
          await wait(900 * (attempt + 1));
        }
      }
      return last;
    } finally {
      inFlight = false;
    }
  }

  window.DrCookerAPI = {
    submitInquiry: submitInquiry,
    /** Samo za testiranje — briše stanje duplikata. */
    _reset: function () {
      inFlight = false;
      submitted.clear();
    },
  };
})();
