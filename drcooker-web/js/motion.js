/**
 * ============================================================================
 *  KRETANJE — sve što se animira
 * ============================================================================
 *
 *  Odvojeno od main.js namerno: main.js nosi navigaciju, koja mora da radi
 *  uvek. Ako ovaj fajl ne učita ili se ugasi zbog prefers-reduced-motion,
 *  sajt ostaje potpuno upotrebljiv — samo miran.
 *
 *  Nijedna animacija ne dira layout: sve ide preko transform i opacity.
 *
 *  Sadrži:
 *    1. split teksta u redove (maska za ulazak naslova)
 *    2. koreografiju heroja
 *    3. otkrivanje pri skrolu
 *    4. ticker sa imenima jela
 *    5. magnetna dugmad
 *    6. traku napretka (samo tamo gde browser nema scroll-driven CSS)
 * ============================================================================
 */

(function () {
  'use strict';

  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  if (reduced.matches) return;

  const root = document.documentElement;
  const hasViewTimeline = CSS.supports('animation-timeline: view()');
  const hasScrollTimeline = CSS.supports('animation-timeline: scroll()');

  // =========================================================================
  //  0. Sigurnosna mreza
  //
  //  Dva realna scenarija u kojima bi animacija ostavila prazan naslov:
  //
  //    a) Stranica se ucita u POZADINSKOM tabu. Tada requestAnimationFrame ne
  //       okida, pa klasa koja otkriva sadrzaj nikad ne bi bila dodata.
  //    b) Merenje redova na skrivenoj stranici daje innerWidth 0, pa se naslov
  //       prelomi na jednu rec po redu i takav ostane.
  //
  //  Zato se ceka da stranica bude stvarno vidljiva, a povrh toga stoji
  //  mreza koja posle 3 s otkriva sadrzaj koji je ekran vec presao. Sadrzaj koji
  //  se ne vidi je gora greska od animacije koja je preskocena.
  // =========================================================================

  function whenVisible(cb) {
    if (document.visibilityState === 'visible' && window.innerWidth > 0) {
      cb();
      return;
    }
    const onChange = function () {
      if (document.visibilityState !== 'visible') return;
      document.removeEventListener('visibilitychange', onChange);
      cb();
    };
    document.addEventListener('visibilitychange', onChange);
  }

  /**
   * Poslednja linija odbrane.
   *
   * Sve sto se animira krece od opacity 0. Ako IntersectionObserver iz bilo
   * kog razloga ne okine — nulti viewport, greska u browseru, stranica koja se
   * ucita ali nikad ne iscrta — sadrzaj bi ostao nevidljiv zauvek. To je
   * neuporedivo gora greska od preskocene animacije.
   *
   * Ranije je mreza posle 3 s otkrivala BAS SVE, bez obzira na to gde je sta.
   * Resavala je pravi problem i pravila drugi: posetilac koji cita heroj duze
   * od tri sekunde — dakle vecina — dalje je skrolovao kroz stranicu na kojoj
   * je svaka animacija vec odigrala u prazno. Naslovna ima 24 kukice, ceo sajt
   * 280, i nijedna se nije naplatila.
   *
   * Mreza vise ne pita DA LI POSMATRAC RADI. To pitanje nema dobar odgovor:
   * IntersectionObserver isporuci prvi poziv i za mete koje nista ne preseca,
   * pa "je li okinuo" bude tacno i kada mehanizam ne radi nista korisno.
   *
   * Pita se ono sto je jedino merljivo i jedino bitno:
   *
   *     je li OVAJ element na ekranu, a jos uvek nevidljiv?
   *
   * Ta provera je tacna bez obzira na uzrok otkaza, i po konstrukciji ne moze
   * da otme animaciju koja tek treba da odigra — element ispod linije okidanja
   * se ne dira.
   */

  /**
   * Jedan prolaz mreze. Vraca koliko je kukica jos uvek neotkriveno, pa
   * pozivalac zna kada da prestane.
   */
  function mrezaTik() {
    const dno = window.innerHeight || 0;
    // Prag je isti kao `rootMargin: '0px 0px -12% 0px'` na posmatracu dole:
    // element iznad ove linije je posmatrac VEC morao da obradi. Ako nije,
    // promasio ga je i mreza ga preuzima. Ispod linije se ne dira.
    const prag = dno * 0.88;
    let preostalo = 0;

    document
      .querySelectorAll(
        '[data-reveal]:not(.is-visible), [data-reveal-group]:not(.is-visible), [data-split]:not(.is-in)'
      )
      .forEach(function (el) {
        // Samo `top` — namerno, bez donje granice. Element koji je skrol
        // preskocio (brz potez, `scrollTo`, skok na sidro) ima `bottom < 0`
        // i, da se i on trazio, ostao bi nevidljiv zauvek. Sve iznad linije
        // okidanja je posetilac imao priliku da vidi i mora biti vidljivo.
        if (el.getBoundingClientRect().top < prag) {
          if (el.hasAttribute('data-split')) el.classList.add('is-in');
          el.classList.add('is-visible');
          return;
        }
        preostalo++;
      });

    const hero = document.querySelector('.hero');
    if (hero) hero.classList.add('is-shown');

    return preostalo;
  }

  /**
   * Otkriva sve odjednom. Koristi se samo kada posmatrac dokazano ne postoji —
   * nema ga u browseru ili je konstrukcija bacila izuzetak. Tada nema sta da
   * se cuva i sadrzaj ide na ekran odmah.
   */
  function revealEverything() {
    document.querySelectorAll('[data-reveal], [data-reveal-group]').forEach(
      function (el) {
        el.classList.add('is-visible');
      }
    );
    document.querySelectorAll('[data-split]').forEach(function (el) {
      el.classList.add('is-in');
    });
    // Naslov heroja se ne pominje: on nema animaciju i vidi se od prvog
    // iscrtavanja. Ostali delovi ulaze CSS animacijom koja traje najvise
    // ~1,4 s. Klasa `is-shown` gasi te animacije i vraca krajnje stanje —
    // ukljucujuci i pseudo-element linije, do koga se inline stilom ne moze.
    const hero = document.querySelector('.hero');
    if (hero) hero.classList.add('is-shown');
  }

  /**
   * Pusta mrezu.
   *
   * Prvi prolaz posle 3 s — isti ugovor kao ranije. Zatim jos najvise 20
   * prolaza na sekundu, da uhvati i element do koga je posetilac doskrolovao
   * dok posmatrac cuti. Staje cim nema sta da otkrije.
   *
   * `setInterval` radi i na stranici koja se nikad ne iscrta, a to je bas
   * scenario zbog koga mreza i postoji. `requestAnimationFrame` tamo ne bi
   * okinuo nijednom.
   */
  function pustiMrezu() {
    if (!mrezaTik()) return;

    let tikova = 0;
    const id = setInterval(function () {
      tikova++;
      if (!mrezaTik() || tikova >= 20) clearInterval(id);
    }, 1000);

    // Posle tog prozora ostaje jeftin cuvar na skrolu: ako posmatrac zaista ne
    // radi, posetilac koji nastavi da skroluje i dalje vidi sadrzaj. Cuvar se
    // sam skida cim vise nema sta da otkrije.
    let zakazan = false;
    const naSkrol = function () {
      if (zakazan) return;
      zakazan = true;
      requestAnimationFrame(function () {
        zakazan = false;
        if (!mrezaTik()) window.removeEventListener('scroll', naSkrol);
      });
    };
    window.addEventListener('scroll', naSkrol, { passive: true });
  }

  // =========================================================================
  //  1. Split teksta u redove
  //
  //  Naslov se lomi na onoliko redova koliko ga browser stvarno prelomi, pa
  //  se svaki red umota u masku. Merenje ide preko Range API-ja — pouzdanije
  //  od pogađanja po broju znakova i radi sa bilo kojim fontom.
  // =========================================================================

  /**
   * Nalazi sve reci u elementu i grupise ih po redu u kome ih je browser
   * stvarno ispisao. Merenje ide preko Range API-ja — pouzdanije od racunanja
   * po broju znakova i radi sa bilo kojim fontom.
   */
  function findWords(el) {
    const words = [];
    const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    let node;
    while ((node = walker.nextNode())) {
      const re = /\S+/g;
      let m;
      while ((m = re.exec(node.textContent))) {
        words.push({ node: node, start: m.index, end: m.index + m[0].length, text: m[0] });
      }
    }
    return words;
  }

  /** Lanac elemenata od reci do korena — npr. [em] za rec unutar <em>. */
  function ancestorChain(node, root) {
    const chain = [];
    let n = node.parentNode;
    while (n && n !== root) {
      chain.unshift(n);
      n = n.parentNode;
    }
    return chain;
  }

  /**
   * Prepakuje element u .line > .line__in strukturu.
   *
   * VAZNO: inline oznake se cuvaju. Rec unutar <em> zavrsi u kloniranom <em>
   * unutar svog reda. Bez toga bi split obrisao svako <em>, <strong> i <a> u
   * naslovu — a u H1 naslovnoj bas <em> nosi akcentnu boju.
   *
   * Original se cuva u data atributu, da se moze vratiti pri promeni sirine.
   */
  function splitElement(el) {
    if (el.dataset.splitDone === '1') return;
    if (!el.dataset.splitOriginal) el.dataset.splitOriginal = el.innerHTML;

    const words = findWords(el);
    if (!words.length) return;

    const range = document.createRange();
    const frag = document.createDocumentFragment();

    let lastTop = null;
    let inner = null;
    let lineIndex = -1;
    let openSrc = [];    // lanac ORIGINALNIH elemenata trenutno otvoren
    let openClone = [];  // odgovarajuci klonovi u novom stablu
    let firstInLine = true;

    words.forEach(function (w) {
      range.setStart(w.node, w.start);
      range.setEnd(w.node, w.end);
      const top = Math.round(range.getBoundingClientRect().top);

      // Novi red?
      if (lastTop === null || Math.abs(top - lastTop) > 2) {
        lastTop = top;
        lineIndex += 1;
        const outer = document.createElement('span');
        outer.className = 'line';
        inner = document.createElement('span');
        inner.className = 'line__in';
        inner.style.setProperty('--i', String(lineIndex));
        outer.appendChild(inner);
        frag.appendChild(outer);
        openSrc = [];
        openClone = [];
        firstInLine = true;
      }

      // Koliko se lanac poklapa sa vec otvorenim — toliko klonova ostaje.
      const chain = ancestorChain(w.node, el);
      let i = 0;
      while (i < chain.length && i < openSrc.length && chain[i] === openSrc[i]) i++;
      openSrc.length = i;
      openClone.length = i;

      let cursor = i === 0 ? inner : openClone[i - 1];

      // Razmak ide PRE otvaranja novih elemenata. Da ide posle, zavrsio bi
      // unutar njih — npr. <em> bi pocinjao razmakom (" centralne").
      if (!firstInLine) cursor.appendChild(document.createTextNode(' '));

      for (let k = i; k < chain.length; k++) {
        const clone = chain[k].cloneNode(false); // bez dece — punimo ih sami
        cursor.appendChild(clone);
        cursor = clone;
        openSrc[k] = chain[k];
        openClone[k] = clone;
      }

      cursor.appendChild(document.createTextNode(w.text));
      firstInLine = false;
    });

    // Redovi su blokovi, pa razmak na kraju ne menja izgled — ali cuva tekst
    // pri kopiranju, da se reci sa kraja i pocetka reda ne slepe.
    frag.querySelectorAll('.line__in').forEach(function (line) {
      line.appendChild(document.createTextNode(' '));
    });

    el.innerHTML = '';
    el.appendChild(frag);
    el.dataset.splitDone = '1';
  }

  function unsplit(el) {
    if (el.dataset.splitDone !== '1' || !el.dataset.splitOriginal) return;
    el.innerHTML = el.dataset.splitOriginal;
    el.dataset.splitDone = '0';
  }

  // =========================================================================
  //  2. Hero
  // =========================================================================

  // Heroj nema JS. Koreografija ulaska je u css/motion.css, sekcija 2:
  // cista CSS animacija koja krece sa prvim iscrtavanjem.
  //
  // Ranije je ovde bio `initHero()` koji je delio naslov na redove i dodavao
  // klasu `.is-in`. Lanac je bio document.fonts.ready -> whenVisible -> rAF
  // -> .js-on -> rAF -> .is-in -> 900ms tranzicija, pa je naslov postajao
  // citljiv tek posle ~1,5 s — i pre toga bi se video, pa sakrio. Uklonjeno.

  // =========================================================================
  //  3. Otkrivanje pri skrolu
  // =========================================================================

  function initReveal() {
    const targets = document.querySelectorAll('[data-reveal], [data-reveal-group], [data-split]');
    if (!targets.length) return;

    // Posmatrac koji se ne moze ni napraviti je isto sto i posmatrac koji ne
    // okida. `.js-on` je do ovog trenutka vec postavljen, dakle sadrzaj je vec
    // sakriven — pa ga odmah otkrivamo, umesto da cekamo mrezu tri sekunde.
    if (typeof IntersectionObserver !== 'function') {
      revealEverything();
      return;
    }

    let io;
    try {
      io = new IntersectionObserver(
        function (entries) {
          entries.forEach(function (entry) {
            if (!entry.isIntersecting) return;
            const el = entry.target;

            if (el.hasAttribute('data-split')) {
              // Merenje redova trazi stvarnu sirinu; na skrivenoj stranici je 0.
              if (window.innerWidth > 0) splitElement(el);
              // Split menja DOM; tek u sledecem okviru pustiti tranziciju.
              requestAnimationFrame(function () {
                el.classList.add('is-in');
              });
              // Ako okvir ne stigne (pozadinski tab), otkrij svejedno.
              setTimeout(function () {
                el.classList.add('is-in');
              }, 1200);
            }
            el.classList.add('is-visible');
            io.unobserve(el);
          });
        },
        { rootMargin: '0px 0px -12% 0px', threshold: 0.08 }
      );
    } catch (err) {
      revealEverything();
      return;
    }

    targets.forEach(function (el) {
      io.observe(el);
    });
  }

  function initTickerToggle() {
    const buttons = document.querySelectorAll('[data-ticker-toggle]');
    if (!buttons.length) return;

    Array.prototype.forEach.call(buttons, function (btn) {
      const ticker = btn.closest('.ticker');
      const label = btn.querySelector('[data-ticker-label]');
      if (!ticker) return;

      btn.addEventListener('click', function () {
        const stopped = ticker.classList.toggle('is-stopped');
        btn.setAttribute('aria-pressed', String(stopped));
        if (label) label.textContent = stopped ? 'Pokreni traku' : 'Zaustavi traku';
      });
    });
  }

  function initTicker() {
    document.querySelectorAll('.ticker__track').forEach(function (track) {
      const group = track.querySelector('.ticker__group');
      if (!group || track.children.length > 1) return;

      track.appendChild(group.cloneNode(true));
      // Kopija je samo vizuelna — čitač ekrana je ne treba čitati dvaput.
      track.lastElementChild.setAttribute('aria-hidden', 'true');

      // Brzina prati dužinu sadržaja, da duža traka ne juri.
      const width = group.scrollWidth;
      const speed = 70; // piksela u sekundi
      track.style.setProperty('--ticker-duration', Math.round(width / speed) + 's');
    });
  }

  // =========================================================================
  //  6. Magnetna dugmad
  //
  //  Samo tamo gde postoji pravi kursor. Na dodir hover ne postoji, pa bi
  //  efekat ostao „zalepljen" posle tapa.
  // =========================================================================

  function initMagnetic() {
    if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;

    document.querySelectorAll('.btn--primary, .btn--lg').forEach(function (btn) {
      let raf = 0;

      btn.addEventListener('pointermove', function (e) {
        if (raf) return;
        raf = requestAnimationFrame(function () {
          raf = 0;
          const r = btn.getBoundingClientRect();
          const dx = (e.clientX - (r.left + r.width / 2)) / r.width;
          const dy = (e.clientY - (r.top + r.height / 2)) / r.height;
          // Ograničeno na 6px — dovoljno da se oseti, premalo da smeta.
          btn.style.setProperty('--mx', (dx * 6).toFixed(2) + 'px');
          btn.style.setProperty('--my', (dy * 6).toFixed(2) + 'px');
        });
      });

      btn.addEventListener('pointerleave', function () {
        btn.style.setProperty('--mx', '0px');
        btn.style.setProperty('--my', '0px');
      });
    });
  }

  // =========================================================================
  //  7. Traka napretka — samo kao rezerva
  // =========================================================================

  function initProgress() {
    const bar = document.querySelector('.progress');
    if (!bar || hasScrollTimeline) return; // CSS to već radi bez JS-a

    let raf = 0;
    function update() {
      raf = 0;
      const max = document.documentElement.scrollHeight - window.innerHeight;
      const p = max > 0 ? window.scrollY / max : 0;
      bar.style.transform = 'scaleX(' + p.toFixed(4) + ')';
    }
    window.addEventListener(
      'scroll',
      function () {
        if (!raf) raf = requestAnimationFrame(update);
      },
      { passive: true }
    );
    update();
  }

  // =========================================================================
  //  8. Paralaksa — rezerva gde nema scroll-driven CSS-a
  // =========================================================================

  function initParallax() {
    if (hasViewTimeline) return; // CSS varijanta je bolja i već radi

    const els = Array.prototype.slice.call(document.querySelectorAll('[data-parallax]'));
    if (!els.length) return;

    let raf = 0;
    function update() {
      raf = 0;
      const vh = window.innerHeight;
      els.forEach(function (el) {
        const r = el.getBoundingClientRect();
        if (r.bottom < 0 || r.top > vh) return;
        // -1 kada element izlazi gore, +1 kada tek ulazi odozdo
        const p = (r.top + r.height / 2 - vh / 2) / (vh / 2);
        el.style.transform = 'translateY(' + (p * 3).toFixed(2) + '%)';
      });
    }
    window.addEventListener(
      'scroll',
      function () {
        if (!raf) raf = requestAnimationFrame(update);
      },
      { passive: true }
    );
    update();
  }

  // =========================================================================
  //  Ponovno merenje pri promeni širine
  //  Naslov prelomljen na 1440px nema iste redove na 375px.
  // =========================================================================

  /**
   * Ponovo lomi sve vec prelomljene naslove.
   *
   * Zove se iz dva razloga: promena sirine prozora i dolazak fontova. Oba
   * menjaju gde browser prelama red, pa bi maske ostale na starim mestima.
   * Naslov koji je vec otkriven odmah dobija finalno stanje — ne sme da se
   * animira po drugi put pred korisnikom.
   */
  function resplitAll() {
    document.querySelectorAll('[data-split-done="1"]').forEach(function (el) {
      const wasIn = el.closest('.is-in') || el.classList.contains('is-in');
      unsplit(el);
      splitElement(el);
      if (!wasIn) return;
      el.querySelectorAll('.line__in').forEach(function (n) {
        n.style.transition = 'none';
        n.style.transform = 'none';
      });
    });
  }

  function initResplit() {
    let t;
    let lastWidth = window.innerWidth;

    window.addEventListener('resize', function () {
      if (window.innerWidth === lastWidth) return; // samo visina (npr. traka browsera)
      lastWidth = window.innerWidth;

      clearTimeout(t);
      t = setTimeout(resplitAll, 180);
    });
  }

  // =========================================================================

  function init() {
    // Ticker i brojaci ne kriju nista, pa mogu odmah.
    initTicker();
    initTickerToggle();
    initMagnetic();
    initProgress();

    // Otkrivanje pri skrolu krece od skrivenog stanja. Klasa `js-on`, koja to
    // skrivanje uopste omogucava, dodaje se tek kada je stranica stvarno
    // vidljiva i izmerljiva — inace bi sadrzaj bio sakriven a animacija ne bi
    // krenula. Heroj nije u ovom lancu; on je cist CSS.
    whenVisible(function () {
      root.classList.add('js-on');
      initReveal();
      initParallax();
      initResplit();
    });

    // BEZUSLOVNO, izvan `whenVisible`.
    //
    // Ranije je i ova mreza stajala unutar `whenVisible`, pa se u jedinom
    // scenariju zbog koga i postoji — stranica ucitana a nikad iscrtana —
    // nije ni zakazivala. `setTimeout` radi i u pozadinskoj kartici, samo
    // uspoeno, sto je ovde potpuno dovoljno.
    setTimeout(pustiMrezu, 3000);

    // Fontovi menjaju prelom redova, pa naslov prelomljen pre njihovog
    // dolaska ima maske na pogresnim mestima. Ovo se NE ceka pre pokretanja —
    // ceka se samo da bi se vec prelomljeni naslovi premerili.
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(resplitAll);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
