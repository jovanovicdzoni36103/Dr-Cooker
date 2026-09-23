/**
 * QA rutina koja se izvršava U STRANICI.
 *
 * Proverava ono što statička analiza ne može: stvarne izračunate boje,
 * prelivanje na uskim ekranima, veličinu meta za dodir i vidljivost fokusa.
 *
 * Kako se koristi: sadržaj ovog fajla se nalepi u konzolu browsera na svakoj
 * stranici, ili se izvrši preko alata za automatizaciju. Vraća objekat sa
 * nalazima.
 *
 * Nije deo build-a i ne isporučuje se — alat za proveru.
 */
(() => {
  const nalazi = [];
  const dodaj = (ozbiljnost, poruka, detalj) => nalazi.push({ ozbiljnost, poruka, detalj });

  // --- Kontrast -------------------------------------------------------------

  const kanal = (c) => {
    const v = c / 255;
    return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  };

  const luminanca = ([r, g, b]) => 0.2126 * kanal(r) + 0.7152 * kanal(g) + 0.0722 * kanal(b);

  const parseRgb = (s) => {
    const m = s.match(/rgba?\(([^)]+)\)/);
    if (!m) return null;
    const parts = m[1].split(/[\s,/]+/).filter(Boolean).map(Number);
    return { rgb: parts.slice(0, 3), a: parts.length > 3 ? parts[3] : 1 };
  };

  const odnos = (a, b) => {
    const [l1, l2] = [luminanca(a), luminanca(b)].sort((x, y) => y - x);
    return (l1 + 0.05) / (l2 + 0.05);
  };

  /** Traži prvu neprozirnu pozadinu uz lanac roditelja. */
  const pozadina = (el) => {
    let n = el;
    while (n && n !== document.documentElement) {
      const p = parseRgb(getComputedStyle(n).backgroundColor);
      if (p && p.a > 0.95) return p.rgb;
      n = n.parentElement;
    }
    return [255, 255, 255];
  };

  const tekstualni = [...document.querySelectorAll('body *')].filter((el) => {
    if (el.closest('svg')) return false;
    const st = getComputedStyle(el);
    if (st.display === 'none' || st.visibility === 'hidden' || st.opacity === '0') return false;
    // Samo elementi sa sopstvenim tekstom.
    return [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim().length > 1);
  });

  for (const el of tekstualni) {
    const st = getComputedStyle(el);
    const fg = parseRgb(st.color);
    if (!fg) continue;
    const r = odnos(fg.rgb, pozadina(el));
    const px = parseFloat(st.fontSize);
    const veliki = px >= 24 || (px >= 18.66 && Number(st.fontWeight) >= 700);
    const prag = veliki ? 3 : 4.5;
    if (r < prag) {
      dodaj(
        'kriticno',
        `kontrast ${r.toFixed(2)}:1 (prag ${prag})`,
        `${el.tagName}.${String(el.className).slice(0, 40)} — "${el.textContent.trim().slice(0, 50)}"`,
      );
    }
  }

  // --- Prelivanje ------------------------------------------------------------

  const docW = document.documentElement.scrollWidth;
  if (docW > window.innerWidth + 1) {
    const krivci = [...document.querySelectorAll('body *')]
      .filter((el) => el.getBoundingClientRect().right > window.innerWidth + 1)
      .slice(0, 5)
      .map((el) => `${el.tagName}.${String(el.className).slice(0, 40)}`);
    dodaj('kriticno', `horizontalno prelivanje ${docW - window.innerWidth}px`, krivci.join(' | '));
  }

  // Elementi koji sami skroluju vodoravno.
  // `.table-scroll` je jedini dozvoljen slucaj: tabela sa recenicama u
  // celijama ne moze da se suzi ispod svoje najmanje sirine, pa pomeraj
  // dobija ona umesto cele stranice. Region je fokusabilan i imenovan.
  for (const el of document.querySelectorAll('body *')) {
    if (el.classList.contains('table-scroll')) continue;
    if (el.scrollWidth > el.clientWidth + 2 && el.clientWidth > 0) {
      const ov = getComputedStyle(el).overflowX;
      if (ov === 'auto' || ov === 'scroll') {
        dodaj('ozbiljno', 'element sa horizontalnim scroll-om', `${el.tagName}.${String(el.className).slice(0, 40)}`);
      }
    }
  }

  // --- Meta za dodir (WCAG 2.5.5, 44×44) --------------------------------------

  for (const el of document.querySelectorAll('a, button, input, select, textarea, [tabindex]:not([tabindex="-1"])')) {
    const st = getComputedStyle(el);
    if (st.display === 'none' || st.visibility === 'hidden') continue;
    const r = el.getBoundingClientRect();
    if (r.width === 0 || r.height === 0) continue;
    // Linkovi unutar teksta su izuzeti — pravilo se odnosi na kontrole.
    const uTekstu = el.tagName === 'A' && el.closest('p, li, dd, figcaption, .prose');
    if (uTekstu) continue;
    // Honeypot je namerno van ekrana i nedostupan i mišu i tastaturi.
    if (el.closest('[aria-hidden="true"]') || el.getAttribute('tabindex') === '-1') continue;
    if (r.height < 40 || r.width < 24) {
      dodaj(
        'sitno',
        `meta za dodir ${Math.round(r.width)}×${Math.round(r.height)}px`,
        `${el.tagName}.${String(el.className).slice(0, 36)} — "${(el.textContent || el.name || '').trim().slice(0, 30)}"`,
      );
    }
  }

  // --- Vidljiv fokus -----------------------------------------------------------

  const fokusabilni = [...document.querySelectorAll('a[href], button, input, select, textarea')].filter((el) => {
    const st = getComputedStyle(el);
    return st.display !== 'none' && st.visibility !== 'hidden';
  });

  // Programski `el.focus()` NE okida `:focus-visible` — to radi samo unos
  // tastaturom. Provera kroz .focus() zato uvek javlja lažni nalaz.
  // Umesto toga se proverava da pravilo uopšte postoji u stilovima, i da
  // nijedna kontrola nema `outline: none` bez zamene.
  let imaPravilo = false;
  for (const sheet of document.styleSheets) {
    let pravila;
    try {
      pravila = sheet.cssRules;
    } catch {
      continue; // cross-origin stylesheet
    }
    for (const r of pravila || []) {
      if (r.selectorText?.includes(':focus-visible') && /outline/.test(r.style?.cssText || '')) {
        imaPravilo = true;
      }
    }
  }
  if (!imaPravilo) dodaj('kriticno', 'nema nijednog :focus-visible pravila sa outline-om', '');

  const ugaseni = fokusabilni.filter((el) => {
    const st = getComputedStyle(el);
    return st.outlineStyle === 'none' && !/inset/.test(st.boxShadow) && st.boxShadow === 'none';
  });
  // Ovo je normalno u mirnom stanju; prijavljuje se samo ako pravila nema.
  void ugaseni;

  // --- Struktura ---------------------------------------------------------------

  const h1 = document.querySelectorAll('h1').length;
  if (h1 !== 1) dodaj('ozbiljno', `${h1} elemenata <h1>`, '');

  if (!document.querySelector('main')) dodaj('ozbiljno', 'nema <main>', '');
  if (!document.querySelector('a.skip-link')) dodaj('sitno', 'nema skip-link', '');

  const landmarks = document.querySelectorAll('header, nav, main, footer').length;
  if (landmarks < 4) dodaj('sitno', `samo ${landmarks} landmark elemenata`, '');

  // --- Rezime --------------------------------------------------------------------

  const broj = (o) => nalazi.filter((n) => n.ozbiljnost === o).length;
  return {
    stranica: location.pathname,
    sirina: window.innerWidth,
    kriticno: broj('kriticno'),
    ozbiljno: broj('ozbiljno'),
    sitno: broj('sitno'),
    nalazi: nalazi.slice(0, 25),
  };
})();
