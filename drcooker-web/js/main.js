/**
 * ============================================================================
 *  GLOBALNO PONAŠANJE SAJTA
 * ============================================================================
 *
 *  Radi na svakoj stranici:
 *    1. mobilni meni (otvaranje, Escape, zadržavanje fokusa, zaključan scroll)
 *    2. podmeni na desktopu (miš i tastatura)
 *    3. stanje zaglavlja pri skrolovanju
 *    4. označavanje aktivne stavke u navigaciji
 *
 *  Animacije NISU ovde — one su u js/motion.js. Razlog: navigacija mora da
 *  radi uvek, a motion.js se ceo gasi kada korisnik traži suzdržano kretanje.
 *
 *  Sve je „progressive enhancement": bez JavaScripta sajt i dalje radi.
 * ============================================================================
 */

(function () {
  'use strict';

  const FOCUSABLE =
    'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

  // =========================================================================
  //  1. Mobilni meni
  // =========================================================================

  function initMobileNav() {
    const toggle = document.querySelector('[data-nav-toggle]');
    const panel = document.querySelector('[data-nav-panel]');
    const label = document.querySelector('[data-nav-toggle-label]');
    if (!toggle || !panel) return;

    let open = false;

    function setOpen(next) {
      open = next;
      toggle.setAttribute('aria-expanded', String(next));
      panel.hidden = !next;
      document.documentElement.classList.toggle('is-nav-open', next);
      if (label) label.textContent = next ? 'Zatvori meni' : 'Otvori meni';

      if (next) {
        // Korisnik tastature odmah ulazi u meni.
        const first = panel.querySelector(FOCUSABLE);
        if (first) first.focus();
      } else {
        toggle.focus();
      }
    }

    toggle.addEventListener('click', function () {
      setOpen(!open);
    });

    // Klik na link zatvara panel.
    panel.addEventListener('click', function (e) {
      if (e.target.closest('a')) setOpen(false);
    });

    document.addEventListener('keydown', function (e) {
      if (!open) return;

      if (e.key === 'Escape') {
        e.preventDefault();
        setOpen(false);
        return;
      }

      if (e.key === 'Tab') {
        const items = Array.prototype.filter.call(
          panel.querySelectorAll(FOCUSABLE),
          function (el) {
            return el.offsetParent !== null;
          }
        );
        if (!items.length) return;

        const first = items[0];
        const last = items[items.length - 1];
        const active = document.activeElement;

        // Fokus ostaje u panelu dok je otvoren.
        if (e.shiftKey && (active === first || active === toggle)) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && active === last) {
          e.preventDefault();
          first.focus();
        }
      }
    });

    // Ako se prozor proširi na desktop dok je meni otvoren, zatvori ga.
    const desktop = window.matchMedia('(min-width: 84rem)');
    const onChange = function (e) {
      if (e.matches && open) setOpen(false);
    };
    if (desktop.addEventListener) desktop.addEventListener('change', onChange);
    else desktop.addListener(onChange);
  }

  // =========================================================================
  //  2. Podmeni na desktopu
  // =========================================================================

  function initSubmenus() {
    const items = document.querySelectorAll('.hdr__item--has-sub');

    Array.prototype.forEach.call(items, function (item) {
      const trigger = item.querySelector('[data-submenu-trigger]');
      const submenu = item.querySelector('[data-submenu]');
      if (!trigger || !submenu) return;

      let closeTimer;

      function open() {
        clearTimeout(closeTimer);
        item.setAttribute('data-open', '');
        trigger.setAttribute('aria-expanded', 'true');
      }

      // Mala odloga sprečava zatvaranje dok miš prelazi prazninu između
      // stavke i panela.
      function close(delay) {
        clearTimeout(closeTimer);
        closeTimer = setTimeout(function () {
          item.removeAttribute('data-open');
          trigger.setAttribute('aria-expanded', 'false');
        }, delay == null ? 120 : delay);
      }

      item.addEventListener('pointerenter', open);
      item.addEventListener('pointerleave', function () {
        close();
      });

      // Fokus tastaturom bilo gde u stavci drži podmeni otvorenim.
      item.addEventListener('focusin', open);
      item.addEventListener('focusout', function (e) {
        if (!item.contains(e.relatedTarget)) close(0);
      });

      item.addEventListener('keydown', function (e) {
        if (e.key === 'Escape' && item.hasAttribute('data-open')) {
          e.preventDefault();
          close(0);
          trigger.focus();
        }
      });
    });
  }

  // =========================================================================
  //  3. Stanje zaglavlja pri skrolovanju
  // =========================================================================

  function initScrollState() {
    const header = document.querySelector('[data-header]');
    if (!header || !('IntersectionObserver' in window)) return;

    // Sentinel na vrhu stranice je jeftiniji od scroll listenera i ne okida
    // layout na svaki piksel.
    const sentinel = document.createElement('div');
    sentinel.setAttribute('aria-hidden', 'true');
    sentinel.style.cssText =
      'position:absolute;top:0;left:0;height:1px;width:1px;pointer-events:none';
    document.body.prepend(sentinel);

    new IntersectionObserver(function (entries) {
      header.classList.toggle('is-stuck', !entries[0].isIntersecting);
    }).observe(sentinel);
  }

  // =========================================================================
  //  4. Aktivna stavka u navigaciji
  //
  //  Pošto nema build sistema, aktivnu stavku određuje JavaScript iz putanje.
  //  Poredi se samo naziv fajla, pa radi i na file:// i na serveru, i u
  //  podfolderu.
  // =========================================================================

  function initActiveNav() {
    const path = location.pathname.replace(/\/+$/, '');
    let current = path.split('/').pop() || 'index.html';
    if (!current.endsWith('.html')) current = 'index.html';

    const links = document.querySelectorAll('[data-nav] a[href]');
    Array.prototype.forEach.call(links, function (link) {
      const href = link.getAttribute('href') || '';
      const target = href.split('#')[0].split('/').pop();
      if (!target) return;

      if (target === current) {
        link.setAttribute('aria-current', 'page');
        // Ako je stavka u podmeniju, označi i roditelja.
        const parentItem = link.closest('.hdr__item--has-sub');
        if (parentItem) {
          const parentLink = parentItem.querySelector('.hdr__link');
          if (parentLink) parentLink.setAttribute('data-child-active', '');
        }
      }
    });
  }

  // =========================================================================
  //  Mapa koja se ucitava tek na klik
  //
  //  Google Maps iframe salje zahtev Google-u cim se stranica otvori, pa i
  //  posetiocu koji mapu nikad ne pogleda. Zato iframe nije u HTML-u.
  //  Bez JavaScripta ostaje dugme koje ne radi, ali i link „Otvori u Google
  //  mapama" pored njega — adresa je dostupna u svakom slucaju.
  // =========================================================================

  function initMaps() {
    const holders = document.querySelectorAll('[data-mapa]');
    if (!holders.length) return;

    Array.prototype.forEach.call(holders, function (holder) {
      const btn = holder.querySelector('[data-mapa-load]');
      const src = holder.getAttribute('data-mapa-src');
      if (!btn || !src) return;

      btn.addEventListener('click', function () {
        const frame = document.createElement('iframe');
        frame.src = src;
        frame.title = holder.getAttribute('data-mapa-title') || 'Mapa';
        frame.loading = 'lazy';
        frame.referrerPolicy = 'no-referrer-when-downgrade';
        holder.textContent = '';
        holder.appendChild(frame);
        frame.focus();
      });
    });
  }

  // =========================================================================
  //  Start
  // =========================================================================

  // =========================================================================
  //  6. Zone isporuke: obaveštenje pred odlazak na sinko.rs
  // =========================================================================

  /**
   * Presreće odlazak na sinko.rs i prvo pokaže dokle se isporučuje.
   *
   * Vlasnik je opisao tačan trenutak kada nastaje problem: kupac poruči robu
   * za mesto koje je predaleko i čeka isporuku koje nema. Taj trenutak nije
   * dolazak na našu stranicu nego odlazak na prodavnicu, pa se obaveštenje
   * otvara na klik, a ne samo od sebe. Posetilac ga je time sam pozvao, pa ne
   * može da se pročita kao reklama.
   *
   * Progressive enhancement: bez JavaScripta linkovi rade kao i pre, a
   * dijalog ostaje `hidden` i nikome ne smeta.
   */
  function initZoneIsporuke() {
    const dijalog = document.querySelector('[data-zone]');
    if (!dijalog) return;

    const panel = dijalog.querySelector('[role="dialog"]');
    const dalje = dijalog.querySelector('[data-zone-dalje]');
    const glavni = document.querySelector('main');
    if (!panel || !dalje || !glavni) return;

    // Linkovi u samom dijalogu se ne presreću, inače se otvara sam sebe.
    const okidaci = Array.prototype.filter.call(
      glavni.querySelectorAll('a[href*="sinko.rs"]'),
      function (a) {
        return !dijalog.contains(a);
      }
    );
    if (!okidaci.length) return;

    // Pozadina se sklanja iz stabla pristupačnosti sa `inert`. `main` ne može
    // da se isključi u celini jer dijalog živi u njemu, pa se isključuju
    // njegova deca pored dijaloga, plus zaglavlje i podnožje.
    const pozadina = [].concat(
      Array.prototype.slice.call(document.querySelectorAll('body > header, body > footer')),
      Array.prototype.filter.call(glavni.children, function (el) {
        return el !== dijalog;
      })
    );

    let otvoren = false;
    let pozvao = null;

    function postavi(next) {
      otvoren = next;
      dijalog.hidden = !next;
      document.documentElement.classList.toggle('is-zone-open', next);
      pozadina.forEach(function (el) {
        el.inert = next;
      });
      okidaci.forEach(function (a) {
        a.setAttribute('aria-expanded', String(next));
      });

      if (next) {
        const prvi = panel.querySelector(FOCUSABLE);
        if (prvi) prvi.focus();
      } else if (pozvao) {
        // Fokus se vraća tamo odakle je posetilac krenuo.
        pozvao.focus();
        pozvao = null;
      }
    }

    okidaci.forEach(function (a) {
      // Link vodi na prodavnicu i bez JavaScripta, pa najava „otvara se u
      // novom prozoru" u izvoru stoji s razlogom. Čim JavaScript preuzme
      // klik, ona prestaje da bude tačna: otvara se dijalog u istoj
      // stranici. Zato se skida ovde, a ne u HTML-u.
      const najava = a.querySelector('.visually-hidden');
      if (najava) najava.remove();
      a.setAttribute('aria-haspopup', 'dialog');
      a.setAttribute('aria-expanded', 'false');
      a.setAttribute('aria-controls', dijalog.id);

      a.addEventListener('click', function (e) {
        // Srednji klik, Ctrl i Cmd otvaraju u novoj kartici: to je namera
        // posetioca i ne presreće se.
        if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
        e.preventDefault();
        pozvao = a;
        if (a.href) dalje.href = a.href;
        postavi(true);
      });
    });

    dijalog.addEventListener('click', function (e) {
      // Klik na podlogu pored panela zatvara, klik unutar panela ne.
      if (e.target === dijalog || e.target.closest('[data-zone-close]')) {
        postavi(false);
      }
    });

    // Odlazak na prodavnicu zatvara dijalog iza sebe, da se posetilac ne
    // vrati na zaključanu stranicu sa otvorenim panelom.
    dalje.addEventListener('click', function () {
      postavi(false);
    });

    document.addEventListener('keydown', function (e) {
      if (!otvoren) return;

      if (e.key === 'Escape') {
        e.preventDefault();
        postavi(false);
        return;
      }

      if (e.key === 'Tab') {
        const stavke = Array.prototype.filter.call(
          panel.querySelectorAll(FOCUSABLE),
          function (el) {
            return el.offsetParent !== null;
          }
        );
        if (!stavke.length) return;

        const prvi = stavke[0];
        const zadnji = stavke[stavke.length - 1];
        const aktivan = document.activeElement;

        // Fokus ostaje u dijalogu dok je otvoren.
        //
        // Prva grana je zbog klika mišem na običan tekst u panelu: fokus
        // tada ode na `main`, koji nosi `tabindex="-1"` zbog skip-linka i
        // predak je dijaloga. Provera „je li aktivan prvi ili poslednji"
        // tada nije tačna ni za jedan, pa bi sledeći Tab odveo posetioca na
        // linkove iza zatamnjenja dok je dijalog još otvoren. Izmereno.
        if (!panel.contains(aktivan)) {
          e.preventDefault();
          (e.shiftKey ? zadnji : prvi).focus();
        } else if (e.shiftKey && aktivan === prvi) {
          e.preventDefault();
          zadnji.focus();
        } else if (!e.shiftKey && aktivan === zadnji) {
          e.preventDefault();
          prvi.focus();
        }
      }
    });
  }

  function init() {
    initMobileNav();
    initSubmenus();
    initScrollState();
    initActiveNav();
    initMaps();
    initZoneIsporuke();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
