/**
 * Generiše sitemap.xml, robots.txt i _redirects iz stvarnih fajlova na disku.
 *
 * Pokreće se RUČNO, i to samo kada dodaš ili preimenuješ stranicu:
 *
 *     node tools/build-seo-files.mjs
 *
 * Sajt radi i bez ovoga — ovo nije build korak, nego alatka za održavanje.
 * Nema nijednu zavisnost.
 */

import { readdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

/** Domen se čita iz js/config.js da ne bi postojao na dva mesta. */
function siteUrl() {
  const cfg = readFileSync(join(ROOT, 'js/config.js'), 'utf8');
  const m = cfg.match(/SITE_URL:\s*'([^']+)'/);
  if (!m) throw new Error('Nije pronađen SITE_URL u js/config.js');
  return m[1].replace(/\/+$/, '');
}

const SITE = siteUrl();

/** Stranice koje ne idu u sitemap. */
const EXCLUDE = new Set(['404.html', 'pages/politika-privatnosti.html']);

/** Prioritet: naslovna najviše, glavne sekcije zatim, podstranice najmanje. */
const PRIORITY = {
  'index.html': '1.0',
  'pages/za-vrtice-i-skole.html': '0.9',
  'pages/zatrazi-ponudu.html': '0.9',
};

const pages = ['index.html'];
for (const f of readdirSync(join(ROOT, 'pages')).sort()) {
  if (f.endsWith('.html')) pages.push(`pages/${f}`);
}

// --- sitemap.xml -----------------------------------------------------------

const urls = pages
  .filter((p) => !EXCLUDE.has(p))
  .map((p) => {
    const loc = p === 'index.html' ? `${SITE}/` : `${SITE}/${p}`;
    const priority = PRIORITY[p] || '0.7';
    return `  <url><loc>${loc}</loc><changefreq>monthly</changefreq><priority>${priority}</priority></url>`;
  });

writeFileSync(
  join(ROOT, 'sitemap.xml'),
  `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.join('\n')}
</urlset>
`,
  'utf8',
);

// --- robots.txt ------------------------------------------------------------

writeFileSync(
  join(ROOT, 'robots.txt'),
  `User-agent: *
Allow: /

# Politika privatnosti se NE zabranjuje ovde. Ona nosi noindex u head-u,
# a robot koji ne sme da je obidje nikada taj noindex ne procita — pa bi
# Google indeksirao goli URL bez opisa. Obilazak dozvoljen + noindex je
# jedina kombinacija koja stvarno izbacuje stranicu iz indeksa.

Sitemap: ${SITE}/sitemap.xml
`,
  'utf8',
);

// --- _redirects ------------------------------------------------------------
// Stari URL-ovi sa keteringservis.rs. Bez ovoga svaki od njih postaje 404 i
// postojeći SEO se gubi. Čita ih Netlify i Cloudflare Pages.
// Za Apache/Nginx varijante vidi docs/DEPLOY.md.

const LEGACY = [
  ['/sample-page', '/'],
  ['/ponuda', '/pages/snabdevanje.html'],
  ['/ponuda-hrane', '/pages/snabdevanje.html'],
  ['/ponuda-hrane/transport-hrane', '/pages/dostava.html'],
  ['/ponuda-hrane/strucna-podrska-nutricioniste', '/pages/nutricionista.html'],
  ['/o-nama/nasa-misija', '/pages/o-nama.html#misija'],
  ['/o-nama', '/pages/o-nama.html'],
  ['/jelovnik/kvalitet-hrane', '/pages/kako-radimo.html#kvalitet-sirovina'],
  ['/jelovnik/nedeljni-meni', '/pages/nedeljni-meni.html'],
  ['/jelovnik', '/pages/jelovnik.html'],
  ['/haccp', '/pages/bezbednost-hrane.html'],
  ['/kontakt', '/pages/kontakt.html'],
];

const lines = [
  '# Preusmerenja sa starog sajta keteringservis.rs.',
  '# Generisano: node tools/build-seo-files.mjs — ne menjati ručno.',
  '',
];
for (const [from, to] of LEGACY) {
  lines.push(`${from}    ${to}    301`);
  // WordPress je servirao i varijantu sa završnom kosom crtom.
  lines.push(`${from}/    ${to}    301`);
}
writeFileSync(join(ROOT, '_redirects'), lines.join('\n') + '\n', 'utf8');

// --- Domen u HTML zaglavljima ---------------------------------------------
//
// Domen ne zivi samo u sitemap-u. U svakoj stranici je zakucan u
// rel=canonical, og:url, og:image, twitter:image i u svakom @id i url unutar
// JSON-LD grafa — oko 17 pojavljivanja po stranici.
//
// Bez ovoga bi promena SITE_URL-a dala sitemap na jednom domenu i canonical
// na drugom, a Google prati canonical.
const STARI = /https:\/\/(?:drcooker\.rs|keteringservis\.rs|www\.keteringservis\.rs)/g;

let izmenjenih = 0;
let ukupnoZamena = 0;
for (const rel of [...pages, '404.html']) {
  const put = join(ROOT, rel);
  if (!existsSync(put)) continue;
  const pre = readFileSync(put, 'utf8');
  const posle = pre.replace(STARI, SITE);
  if (posle === pre) continue;
  ukupnoZamena += (pre.match(STARI) || []).length;
  writeFileSync(put, posle, 'utf8');
  izmenjenih++;
}
if (izmenjenih) {
  console.log(`domen        ${ukupnoZamena} zamena u ${izmenjenih} HTML fajlova -> ${SITE}`);
} else {
  console.log(`domen        vec je ${SITE} u svim HTML fajlovima`);
}

// --- Izveštaj --------------------------------------------------------------

console.log(`sitemap.xml   ${urls.length} stranica`);
console.log(`robots.txt    sitemap -> ${SITE}/sitemap.xml`);
console.log(`_redirects    ${LEGACY.length * 2} pravila`);

for (const p of pages) {
  if (!existsSync(join(ROOT, p))) console.error(`  ! nedostaje fajl: ${p}`);
}
