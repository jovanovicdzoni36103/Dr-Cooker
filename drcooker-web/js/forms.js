/**
 * ============================================================================
 *  FORMA ZA UPIT — validacija i stanja
 * ============================================================================
 *
 *  Slanje ne radi ovaj fajl — radi ga js/api.js (submitInquiry).
 *  Ovde su samo pravila polja, validacija i ponašanje interfejsa.
 *
 *  Stanja: idle → submitting → success | error
 *  Nijedno stanje ne laže: `success` se prikazuje ISKLJUČIVO kada backend
 *  potvrdi prijem.
 *
 *  Pristupačnost:
 *    - greške su vezane za polja preko aria-describedby i aria-invalid
 *    - fokus se pomera na prvo polje sa greškom
 *    - promene stanja se najavljuju kroz aria-live region
 *    - dugme je isključeno samo dok slanje traje, ne dok forma nije validna
 * ============================================================================
 */

(function () {
  'use strict';

  // ==========================================================================
  //  SHEMA POLJA — jedini izvor pravila validacije
  //
  //  `key` mora da odgovara `name` atributu u HTML-u forme
  //  (pages/zatrazi-ponudu.html) i redosledu kolona u Sheet-u
  //  (FIELD_ORDER u backend/apps-script/Code.gs).
  //
  //  Dodavanje polja = unos ovde + polje u HTML-u + kolona u Code.gs.
  // ==========================================================================

  const FIELDS = [
    {
      key: 'ime',
      type: 'text',
      required: true,
      minLength: 2,
      maxLength: 80,
      requiredMessage: 'Unesite ime i prezime.',
      invalidMessage: 'Ime mora imati najmanje 2 znaka.',
    },
    {
      key: 'ustanova',
      type: 'text',
      required: true,
      maxLength: 120,
      requiredMessage: 'Unesite naziv ustanove ili firme.',
    },
    {
      key: 'email',
      type: 'email',
      required: true,
      maxLength: 254,
      requiredMessage: 'Unesite email adresu.',
      invalidMessage: 'Proverite format email adrese.',
    },
    {
      key: 'telefon',
      type: 'tel',
      required: true,
      requiredMessage: 'Unesite broj telefona.',
      invalidMessage: 'Unesite ispravan broj telefona (najmanje 9 cifara).',
    },
    {
      key: 'usluga',
      type: 'select',
      required: true,
      requiredMessage: 'Izaberite uslugu.',
    },
    {
      key: 'brojKorisnika',
      type: 'number',
      required: false,
      min: 1,
      max: 100000,
      invalidMessage: 'Unesite broj između 1 i 100000.',
      // Prikazuje se samo kada izabrana usluga uključuje obroke.
      showWhen: {
        field: 'usluga',
        oneOf: ['obroci-vrtic', 'obroci-skola', 'obroci-boravak', 'kombinovano'],
      },
    },
    { key: 'pocetak', type: 'date', required: false },
    {
      key: 'poruka',
      type: 'textarea',
      required: true,
      minLength: 10,
      maxLength: 2000,
      requiredMessage: 'Napišite kratku poruku.',
      invalidMessage: 'Poruka mora imati najmanje 10 znakova.',
    },
    {
      key: 'saglasnost',
      type: 'checkbox',
      required: true,
      requiredMessage: 'Potrebna je saglasnost da bismo mogli da odgovorimo na upit.',
    },
  ];

  /** Skriveno polje koje popunjavaju samo botovi. */
  const HONEYPOT = 'company_website';

  /** Brže od ovoga je skoro sigurno bot. Backend donosi konačnu odluku. */
  const MIN_FILL_TIME_MS = 2500;

  // ==========================================================================
  //  Pravila validacije
  // ==========================================================================

  /**
   * Namerno permisivna provera email-a: cilj je da uhvati očigledne greške
   * (nema @, nema tačke u domenu, razmak), a ne da implementira RFC 5322.
   * Prestroge provere odbijaju validne adrese i koštaju upite.
   */
  const EMAIL_RE = /^[^\s@]+@[^\s@.]+(\.[^\s@.]+)+$/;

  /** Korisnik koji je iskljucio animacije ne zeli ni gladak scroll. */
  function prefersReducedMotion() {
    return (
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    );
  }

  function countDigits(v) {
    const m = String(v).match(/\d/g);
    return m ? m.length : 0;
  }

  function isValidEmail(v) {
    const s = String(v).trim();
    return EMAIL_RE.test(s) && s.length <= 254;
  }

  function isValidPhone(v) {
    const s = String(v).trim();
    const d = countDigits(s);
    // Srpski brojevi: 9 cifara bez pozivnog, do 12 sa +381.
    return d >= 9 && d <= 15 && /^[\d\s()+./-]+$/.test(s);
  }

  /** Da li je polje trenutno vidljivo (uslovna polja). */
  function isVisible(field, values) {
    if (!field.showWhen) return true;
    const current = values[field.showWhen.field];
    return typeof current === 'string' && field.showWhen.oneOf.indexOf(current) !== -1;
  }

  /** Vraća poruku o grešci ili null. */
  function validateField(field, raw, values) {
    if (!isVisible(field, values)) return null;

    if (field.type === 'checkbox') {
      const checked = raw === true || raw === 'on' || raw === 'true';
      if (field.required && !checked) return field.requiredMessage || 'Ovo polje je obavezno.';
      return null;
    }

    const value = raw == null ? '' : String(raw).trim();

    if (!value) {
      return field.required ? field.requiredMessage || 'Ovo polje je obavezno.' : null;
    }
    if (field.maxLength && value.length > field.maxLength) {
      return 'Najviše ' + field.maxLength + ' znakova.';
    }
    if (field.minLength && value.length < field.minLength) {
      return field.invalidMessage || 'Najmanje ' + field.minLength + ' znakova.';
    }

    if (field.type === 'email' && !isValidEmail(value)) {
      return field.invalidMessage || 'Proverite format email adrese.';
    }
    if (field.type === 'tel' && !isValidPhone(value)) {
      return field.invalidMessage || 'Proverite broj telefona.';
    }
    if (field.type === 'number') {
      const n = Number(value);
      if (!isFinite(n)) return field.invalidMessage || 'Unesite broj.';
      if (field.min != null && n < field.min) return 'Najmanje ' + field.min + '.';
      if (field.max != null && n > field.max) return 'Najviše ' + field.max + '.';
    }
    if (field.type === 'date' && !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      return 'Izaberite ispravan datum.';
    }
    return null;
  }

  // ==========================================================================
  //  Ponašanje forme
  // ==========================================================================

  function initForm(form) {
    const mountedAt = Date.now();
    const touched = {};

    /** Osvezavanje brojaca znakova; puni se pri vezivanju polja. */
    const brojaci = [];
    const syncCounters = function () {
      brojaci.forEach(function (f) { f(); });
    };

    const el = function (key) {
      return form.querySelector('[name="' + key + '"]');
    };
    const errorEl = function (key) {
      return form.querySelector('[data-error-for="' + key + '"]');
    };
    const wrapEl = function (key) {
      return form.querySelector('[data-field="' + key + '"]');
    };

    /** Trenutne vrednosti svih polja iz sheme. */
    function readValues() {
      const values = {};
      FIELDS.forEach(function (f) {
        const node = el(f.key);
        if (!node) return;
        values[f.key] = f.type === 'checkbox' ? node.checked : node.value;
      });
      return values;
    }

    function showError(key, message) {
      const node = el(key);
      const err = errorEl(key);
      const wrap = wrapEl(key);
      if (!node || !err) return;

      if (message) {
        err.textContent = message;
        err.hidden = false;
        node.setAttribute('aria-invalid', 'true');
        if (wrap) wrap.setAttribute('data-invalid', '');
      } else {
        err.textContent = '';
        err.hidden = true;
        node.removeAttribute('aria-invalid');
        if (wrap) wrap.removeAttribute('data-invalid');
      }
    }

    /** Prikazuje ili sakriva uslovna polja. */
    function syncConditional() {
      const values = readValues();
      FIELDS.forEach(function (f) {
        if (!f.showWhen) return;
        const wrap = wrapEl(f.key);
        const node = el(f.key);
        if (!wrap || !node) return;

        const visible = isVisible(f, values);
        wrap.hidden = !visible;
        node.disabled = !visible;
        if (!visible) {
          node.value = '';
          showError(f.key, null);
        }
      });
    }

    function setStatus(message) {
      const s = form.querySelector('[data-form-status]');
      if (s) s.textContent = message;
    }

    function setState(state) {
      form.setAttribute('data-state', state);

      const submit = form.querySelector('[data-form-submit]');
      const label = form.querySelector('[data-submit-label]');
      const success = form.querySelector('[data-form-success]');
      const error = form.querySelector('[data-form-error]');

      if (submit) {
        submit.disabled = state === 'submitting';
        submit.setAttribute('aria-busy', String(state === 'submitting'));
      }
      if (label) {
        label.textContent =
          state === 'submitting'
            ? 'Šaljemo…'
            : (submit && submit.getAttribute('data-idle-label')) || 'Pošalji upit';
      }
      if (success) success.hidden = state !== 'success';
      if (error) error.hidden = state !== 'error';
    }

    // Ishod slanja mora da bude neprevidljiv. Panel se dovodi u vidno polje i
    // dobija fokus — inace posle dugacke forme ostaje ispod preloma ekrana i
    // korisnik ne zna da li je upit otisao.
    //
    // `preventScroll: true` je bitno: `focus()` bi sam skrolovao skokovito, pa
    // bi se to potuklo sa `scrollIntoView` i ispalo trzavo.
    function announce(panel) {
      if (!panel) return;
      panel.setAttribute('tabindex', '-1');
      try {
        panel.focus({ preventScroll: true });
      } catch (e) {
        panel.focus();
      }
      panel.scrollIntoView({
        behavior: prefersReducedMotion() ? 'auto' : 'smooth',
        block: 'center',
      });
    }

    // --- validacija u hodu -------------------------------------------------
    // Polje se validira na blur, pa zatim uživo dok se ispravlja. Tako korisnik
    // ne dobija crvenu poruku dok tek kuca prvi znak.

    FIELDS.forEach(function (f) {
      const node = el(f.key);
      if (!node) return;

      const revalidate = function () {
        const values = readValues();
        showError(f.key, validateField(f, values[f.key], values));
      };

      node.addEventListener('blur', function () {
        touched[f.key] = true;
        revalidate();
      });

      node.addEventListener('input', function () {
        if (touched[f.key]) revalidate();
        if (f.key === 'usluga') syncConditional();
      });

      if (f.type === 'select') {
        node.addEventListener('change', function () {
          touched[f.key] = true;
          revalidate();
          syncConditional();
        });
      }

      // Brojač znakova za textarea sa ograničenjem.
      if (f.type === 'textarea' && f.maxLength) {
        const wrap = wrapEl(f.key);
        const counter = wrap && wrap.querySelector('[data-char-counter]');
        if (counter) {
          const update = function () {
            const len = node.value.length;
            counter.textContent = len + ' / ' + f.maxLength;
            counter.setAttribute('data-near', String(len > f.maxLength * 0.9));
          };
          node.addEventListener('input', update);
          update();
          // `form.reset()` ne okida `input`, pa bi ispod praznog polja ostalo
          // „742 / 2000". Zato osvezavanje mora da bude dostupno i spolja.
          brojaci.push(update);
        }
      }
    });

    syncConditional();
    setState('idle');

    // --- slanje ------------------------------------------------------------

    form.addEventListener('submit', async function (event) {
      event.preventDefault();
      if (form.getAttribute('data-state') === 'submitting') return;

      const values = readValues();

      FIELDS.forEach(function (f) {
        showError(f.key, null);
      });

      const errors = [];
      FIELDS.forEach(function (f) {
        const msg = validateField(f, values[f.key], values);
        if (msg) errors.push({ key: f.key, message: msg });
      });

      if (errors.length) {
        errors.forEach(function (e) {
          touched[e.key] = true;
          showError(e.key, e.message);
        });
        setState('idle');
        setStatus(
          errors.length === 1
            ? 'Jedno polje treba ispraviti pre slanja.'
            : errors.length + ' polja treba ispraviti pre slanja.'
        );
        const first = el(errors[0].key);
        if (first) first.focus();
        return;
      }

      setState('submitting');
      setStatus('Šaljemo upit…');

      const honeypot = form.querySelector('[name="' + HONEYPOT + '"]');

      const payload = Object.assign({}, values, {
        timestamp: new Date().toISOString(),
        _fillMs: Date.now() - mountedAt,
      });
      payload[HONEYPOT] = honeypot ? honeypot.value : '';

      // MIN_FILL_TIME_MS se samo prosleđuje — odluku donosi backend, da se
      // spor korisnik ne blokira na klijentu.
      void MIN_FILL_TIME_MS;

      // Jedini `await` u handleru. Ako baci, prekida se POSLE
      // setState('submitting') — dugme ostaje iskljuceno, natpis „Saljemo…",
      // forma zauvek zakljucana. Zato se svaka greska pretvara u posten
      // ishod, umesto da rusi handler.
      let result;
      try {
        if (!window.DrCookerAPI || typeof window.DrCookerAPI.submitInquiry !== 'function') {
          throw new Error('js/api.js nije ucitan');
        }
        result = await window.DrCookerAPI.submitInquiry(payload);
      } catch (e) {
        result = {
          ok: false,
          code: 'NETWORK',
          title: 'Upit nije poslat.',
          message:
            'Slanje nije uspelo zbog greške u pregledaču. Upit NIJE poslat — molimo pozovite nas ili nam pišite.',
          detail: String((e && e.message) || e),
        };
      }

      if (result.ok) {
        setState('success');
        setStatus('Upit je uspešno poslat.');

        // Recenica o mejlu se pojavljuje SAMO ako je backend potvrdio da je
        // potvrda stvarno otisla. Apps Script vraca `mail.user`, i on ume da
        // bude false — dnevna kvota MailApp-a je 100 poruka, a svaki upit
        // trosi dve. Ranije je ekran to tvrdio bezuslovno.
        const mailNote = form.querySelector('[data-mail-note]');
        if (mailNote) {
          const poslato = !!(result.mail && result.mail.user);
          mailNote.textContent = poslato ? 'Potvrdu smo poslali i na Vašu email adresu.' : '';
          mailNote.hidden = !poslato;
        }

        // Broj upita na ekranu, ne samo u mejlu.
        //
        // Backend zavodi upit pod brojem i salje ga u obe poruke, ali mejl ume
        // da ne stigne — kvota, greska u adresi, spam folder. Ekran je jedina
        // povrsina koja se sigurno videla, pa broj stoji i tu: sa njim korisnik
        // ima sta da kaze kada pozove telefonom.
        const refBox = form.querySelector('[data-form-ref]');
        const refValue = form.querySelector('[data-form-ref-value]');
        if (refBox && refValue) {
          const broj = typeof result.reference === 'string' ? result.reference.trim() : '';
          refValue.textContent = broj;
          refBox.hidden = !broj;
        }

        form.reset();
        syncConditional();
        syncCounters();
        announce(form.querySelector('[data-form-success]'));
        return;
      }

      // Backend je vratio greške po poljima.
      if (result.fieldErrors) {
        Object.keys(result.fieldErrors).forEach(function (key) {
          touched[key] = true;
          showError(key, result.fieldErrors[key]);
        });
        setState('idle');
        setStatus('Server je odbio neka polja. Proverite označena polja.');
        const firstKey = Object.keys(result.fieldErrors)[0];
        const node = el(firstKey);
        if (node) node.focus();
        return;
      }

      setState('error');
      setStatus(result.message);
      const errText = form.querySelector('[data-form-error-text]');
      if (errText) errText.textContent = result.message;

      // Naslov mora da prati ishod. Kada ne znamo da li je upit stigao,
      // ne sme da pise „Upit nije poslat."
      const errTitle = form.querySelector('[data-form-error-title]');
      if (errTitle) errTitle.textContent = result.title || 'Nismo dobili potvrdu.';

      if (result.detail && window.console && console.warn) {
        console.warn('[Dr Cooker]', result.code, result.detail);
      }

      announce(form.querySelector('[data-form-error]'));
    });

    // Dugme „Pokušaj ponovo" u panelu greške.
    const retry = form.querySelector('[data-form-retry]');
    if (retry) {
      retry.addEventListener('click', function () {
        setState('idle');
        setStatus('');
        const submit = form.querySelector('[data-form-submit]');
        if (submit) submit.focus();
      });
    }

    // Dugme „Pošalji još jedan upit" u panelu uspeha. Bez njega korisnik posle
    // uspešnog slanja nema način da se vrati na formu — polja su sakrivena.
    const again = form.querySelector('[data-form-again]');
    if (again) {
      again.addEventListener('click', function () {
        setState('idle');
        setStatus('');
        syncCounters();
        const first = el(FIELDS[0].key);
        if (first) {
          first.focus();
          first.scrollIntoView({ behavior: prefersReducedMotion() ? 'auto' : 'smooth', block: 'center' });
        }
      });
    }
  }

  // Napomena za administratora se prikazuje SAMO dok backend nije povezan.
  // U HTML-u stoji sa `hidden`, pa cim se upise GOOGLE_APPS_SCRIPT_URL nestaje
  // sama — bez ovoga bi interna napomena zavrsila na produkciji.
  function syncAdminNote() {
    const notes = document.querySelectorAll('[data-admin-note]');
    const connected = !!(window.CONFIG && window.CONFIG.IS_BACKEND_CONNECTED);
    Array.prototype.forEach.call(notes, function (n) {
      n.hidden = connected;
    });
  }

  document.addEventListener('DOMContentLoaded', function () {
    syncAdminNote();
    const forms = document.querySelectorAll('[data-inquiry-form]');
    Array.prototype.forEach.call(forms, initForm);
  });
})();
