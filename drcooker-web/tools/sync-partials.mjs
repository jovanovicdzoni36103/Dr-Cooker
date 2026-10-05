/**
 * Prepisuje zaglavlje i podnožje iz tools/partials/ u SVE stranice.
 *
 *     node tools/sync-partials.mjs
 *
 * Zašto ovako, a ne JavaScriptom u browseru:
 * učitavanje zaglavlja preko fetch() ne radi kada se stranica otvori dvoklikom
 * (file:// blokira fetch), pomera layout pri učitavanju i sakriva navigaciju od
 * pretraživača. Zato zaglavlje stoji upisano u svakoj stranici, a ova skripta
 * služi da se ne prekucava ručno.
 *
 * Sajt radi i bez ovoga — skripta se pokreće samo kada MENJAŠ zaglavlje ili
 * podnožje. Nema nijednu zavisnost.
 *
 * Kako radi: u svakoj stranici traži markere
 *     <!-- #region header --> ... <!-- #endregion header -->
 *     <!-- #region footer --> ... <!-- #endregion footer -->
 * i zamenjuje sadržaj između njih. Sve van markera ostaje netaknuto.
 *
 * {{PREFIX}} u partial-u postaje "" za stranice u rootu i "../" za pages/.
 */

import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const PARTIALS = join(ROOT, 'tools', 'partials');

/** Skida uvodni komentar iz partial fajla — on je uputstvo, ne sadržaj. */
function loadPartial(name) {
  const raw = readFileSync(join(PARTIALS, name), 'utf8');
  return raw.replace(/^\s*<!--[\s\S]*?-->\s*/, '').trimEnd();
}

const HEADER = loadPartial('header.html');
const FOOTER = loadPartial('footer.html');

const ZONE = loadPartial('zone.html');

const REGIONS = [
  { name: 'header', html: HEADER },
  { name: 'footer', html: FOOTER },
  // Obaveštenje o zonama isporuke stoji samo na stranicama koje vode na
  // sinko.rs, pa je region opcion: stranica bez markera se preskače bez
  // greške. Zaglavlje i podnožje su obavezni i tu markeri moraju postojati.
  { name: 'zone', html: ZONE, optional: true },
];

const pages = [
  join(ROOT, 'index.html'),
  join(ROOT, '404.html'),
  ...readdirSync(join(ROOT, 'pages'))
    .filter((f) => f.endsWith('.html'))
    .sort()
    .map((f) => join(ROOT, 'pages', f)),
];

let updated = 0;
let skipped = 0;
const problems = [];

for (const file of pages) {
  const rel = relative(ROOT, file).replace(/\\/g, '/');
  // Stranice u pages/ su jedan nivo dublje od korena.
  //
  // 404.html je izuzetak: server je servira za BILO KOJI nepostojeci URL, a
  // baza dokumenta ostaje ta adresa. Relativan prefiks bi za
  // /ponuda-hrane/nesto trazio /ponuda-hrane/css/base.css. Zato apsolutni.
  const prefix = rel === '404.html' ? '/' : rel.includes('/') ? '../' : '';

  let html = readFileSync(file, 'utf8');
  const before = html;

  for (const region of REGIONS) {
    const start = `<!-- #region ${region.name} -->`;
    const end = `<!-- #endregion ${region.name} -->`;

    const i = html.indexOf(start);
    const j = html.indexOf(end);

    if (i === -1 || j === -1) {
      // Opcion region se preskače bez greške: ne pripada svakoj stranici.
      // Ali jedan marker bez drugog je uvek greška, i na opcionom regionu.
      if (!region.optional) {
        problems.push(`${rel}: nema markere za "${region.name}"`);
      } else if (i !== -1 || j !== -1) {
        problems.push(`${rel}: "${region.name}" ima samo jedan marker`);
      }
      continue;
    }
    if (j < i) {
      problems.push(`${rel}: markeri za "${region.name}" su u pogrešnom redosledu`);
      continue;
    }

    const body = region.html.split('{{PREFIX}}').join(prefix);
    const indent = '    ';
    html = html.slice(0, i) + start + '\n' + body + '\n' + indent + html.slice(j);
  }

  if (html === before) {
    skipped++;
  } else {
    writeFileSync(file, html, 'utf8');
    updated++;
  }
  console.log(`  ${html === before ? 'bez izmene' : 'azurirano '}  ${rel}`);
}

console.log(`\nAzurirano: ${updated}   bez izmene: ${skipped}   ukupno: ${pages.length}`);

if (problems.length) {
  console.error('\nPROBLEMI:');
  for (const p of problems) console.error('  ' + p);
  process.exit(1);
}
