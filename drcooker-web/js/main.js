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

  function init() {
    initMobileNav();
    initSubmenus();
    initScrollState();
    initActiveNav();
    initMaps();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
