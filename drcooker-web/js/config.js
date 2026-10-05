/**
 * ============================================================================
 *  Dr Cooker — JEDINO MESTO ZA KONFIGURACIJU
 * ============================================================================
 *
 *  Sve što se kasnije unosi nalazi se OVDE. Nijedan drugi fajl ne sadrži
 *  endpoint, email adresu ili telefon zakucan u kod.
 *
 *  KADA DOBIJEŠ GOOGLE APPS SCRIPT URL:
 *    → upiši ga u CONFIG.GOOGLE_APPS_SCRIPT_URL (odmah ispod)
 *    Forma tog trenutka počinje da radi. Ništa drugo se ne menja.
 *
 *  Sve što još čeka podatke označeno je sa: TODO(klijent)
 * ============================================================================
 */

const CONFIG = {
  // ==========================================================================
  //  1. BACKEND — OVO JE JEDINA VREDNOST POTREBNA DA FORMA PRORADI
  // ==========================================================================

  /**
   * TODO(klijent): Web App URL Google Apps Script deployment-a.
   *
   * Izgleda ovako:
   *   https://script.google.com/macros/s/AKfycbx.../exec
   *
   * Uputstvo korak po korak je na vrhu backend/apps-script/Code.gs.
   *
   * Dok je prazan string, forma radi u DEMO režimu: validacija i sva stanja
   * rade normalno, ali se korisniku jasno kaže da upit NIJE poslat.
   * Nikada se ne prikazuje lažna potvrda.
   */
  GOOGLE_APPS_SCRIPT_URL:
    'https://script.google.com/macros/s/AKfycbzn-ebUSCQh9oMLuxedYvkEVf-ct8PBr1HRPuSJv11bc8qPyTZe2IeIFJytEbCt9PLo/exec',

  /**
   * TODO(klijent): adresa koja prima upite.
   * Frontend je ne koristi za slanje — slanje radi Apps Script. Stoji ovde da
   * bi sve konfiguracije bile na jednom mestu; prekopiraj je u CONFIG.RECIPIENT
   * unutar backend/apps-script/Code.gs.
   */
  RECIPIENT_EMAIL: '',

  /** TODO(klijent): opciono, kopija upita (npr. druga adresa u firmi). */
  CC_EMAIL: '',

  /** Posle koliko milisekundi se prekida zahtev i prijavljuje greška. */
  REQUEST_TIMEOUT_MS: 15000,

  /** Broj automatskih ponovnih pokušaja pri mrežnoj grešci (ne računa prvi). */
  REQUEST_RETRIES: 1,

  // ==========================================================================
  //  2. PODACI O SAJTU
  // ==========================================================================

  /** TODO(klijent): potvrditi konačan domen. Koristi se za canonical i OG. */
  SITE_URL: 'https://drcooker.rs',

  SITE_NAME: 'Dr Cooker',
  // LEGAL_NAME je potvrdjen 02.10.2026. iz klijentovog dokumenta i stoji
  // kao schema.org `legalName` u JSON-LD svih 17 stranica:
  // DR COOKER PREMIUM D.O.O. Ovde ga nema jer graf nije u partialu.

  // ==========================================================================
  //  3. KONTAKT — namenjen da bude izvor za telefone i mejlove
  //
  //     PAZNJA: niko ovo jos ne cita. Telefon, mejl i adresa su zakucani
  //     u tools/partials/footer.html i na stranici Kontakt. Upis ovde ne
  //     menja nista na sajtu dok se to ne poveze.
  // ==========================================================================

  CONTACT: {
    email: 'office@drcooker.rs',

    phones: [
      // Jedan broj. Komercijalin broj vise ne postoji (klijent, 29.09.2026),
      // a uz jedan broj i labela 'Direktor' je suvisna — posetilac zove firmu,
      // ne funkciju.
      { label: '', display: '064 110 1521', tel: '+381641101521' },
    ],

    address: {
      street: 'Vojvode Prijezde 17',
      city: 'Beograd',
      postalCode: '11000',
      /** Proizvodnja je na opštini Voždovac. Izvor nigde ne kaže da je na istoj
       *  adresi kao kancelarija — TODO(klijent): potvrditi. */
      municipality: 'Voždovac',
      lat: 44.789423,
      lng: 20.474673,
    },

    mapLink: 'https://www.google.com/maps/search/?api=1&query=44.789423,20.474673',

    /** TODO(klijent): radno vreme. Prazno = blok se ne prikazuje. */
    openingHours: [],

    /**
     * Profili na mrežama. Klijent ih je dao 05.10.2026.
     * Prikazuju se iz tools/partials/footer.html, ne odavde; ovde stoje
     * da budu na jednom mestu sa ostalim kontaktom. Isti par je upisan
     * i kao schema.org `sameAs` u JSON-LD svih stranica.
     */
    social: [
      'https://www.facebook.com/DrCookerketering/',
      'https://www.instagram.com/drcookerpremium.ketering/',
    ],

    /** TODO(klijent): potrebno za podnožje i politiku privatnosti. */
    pib: '',
    maticniBroj: '',
  },

  // ==========================================================================
  //  4. TVRDNJE KOJE SE NE SMEJU IZMISLITI
  //     Dok su prazne, sajt o njima ne piše ništa. To je namerno.
  // ==========================================================================

  PENDING: {
    /** TODO(klijent): stvaran rok odgovora, npr. 'Javljamo se u roku od jednog
     *  radnog dana.' Dok je prazno, sajt NE obećava nikakav rok. */
    responseTime: '',

    /** TODO(klijent): područje dostave. Prazno = piše samo „Beograd". */
    deliveryArea: '',

    /** TODO(klijent): godina osnivanja. Prazno = „dugi niz godina". */
    foundedYear: '',

    /** TODO(klijent): da li firma POSEDUJE HACCP sertifikat.
     *  Stari sajt kaže samo da se „poštuju principi HACCP standarda".
     *  Ne menjati u true bez pismene potvrde. */
    haccpCertified: false,
  },

  // ==========================================================================
  //  5. ANALITIKA
  // ==========================================================================

  /** TODO(klijent): npr. 'G-XXXXXXXXXX'. Prazno = nema analitike i nema
   *  kolačića (politika privatnosti trenutno to tako i navodi). */
  ANALYTICS_ID: '',
};

/** Da li je backend povezan. Koristi se za DEMO režim forme. */
CONFIG.IS_BACKEND_CONNECTED = CONFIG.GOOGLE_APPS_SCRIPT_URL.trim().length > 0;

// Dostupno svim skriptama preko window.CONFIG.
window.CONFIG = CONFIG;
