/**
 * Generiše favicon, apple-touch-icon i Open Graph sliku.
 *
 * Sve kreće od jednog SVG izvora — znaka poklopca šerpe iz zaglavlja — pa
 * su ikonica i sajt uvek isti znak. Nema ručno održavanih PNG-ova koji se
 * raziđu sa dizajnom.
 *
 * OG slika je tipografska, bez fotografije: na sajtu nemamo nijednu pravu
 * fotografiju, pa bi stock slika u deljenom linku bila prva laž koju
 * potencijalni klijent vidi.
 *
 * Pokretanje:  npm run icons
 */

// sharp je JEDINA zavisnost u celom projektu i potrebna je SAMO ovoj skripti.
// Ikonice su vec generisane i nalaze se u repozitorijumu — ovo se pokrece samo
// ako se menja znak brenda.
//   npm install sharp      (jednokratno, pa `node tools/build-icons.mjs`)
let sharp;
try {
  sharp = (await import('sharp')).default;
} catch {
  console.error(
    [
      'Ova skripta traži paket "sharp", koji nije instaliran.',
      '',
      'Ikonice su već generisane u assets/icons/ i assets/images/.',
      'Pokreni ovo samo ako menjaš znak brenda:',
      '',
      '  npm install sharp',
      '  node tools/build-icons.mjs',
      '',
    ].join('\n'),
  );
  process.exit(1);
}
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const ICONS = join(ROOT, 'assets', 'icons');
const IMAGES = join(ROOT, 'assets', 'images');
const FONTS = join(ROOT, 'assets', 'fonts');

const C = {
  paper: '#FAF7F2',
  paperDark: '#EFE9DE',
  ink: '#17140F',
  proofDeep: '#08221D',
  accent: '#A32A2E',
  mist: '#A8BEB7',
  rule: '#64726A',
};

// ---------------------------------------------------------------------------
// Znak — isti poklopac šerpe kao u zaglavlju
// ---------------------------------------------------------------------------

function mark(stroke, sw = 2.4) {
  return `
    <path d="M4 21h24" fill="none" stroke="${stroke}" stroke-width="${sw}" stroke-linecap="round"/>
    <path d="M5.5 21a10.5 10.5 0 0 1 21 0" fill="none" stroke="${stroke}" stroke-width="${sw}" stroke-linejoin="round"/>
    <path d="M16 6.5v-3" fill="none" stroke="${stroke}" stroke-width="${sw}" stroke-linecap="round"/>`;
}

// --- favicon.svg: znak na tamnoj podlozi, čitljiv i na 16px -----------------

const faviconSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" role="img" aria-label="Dr Cooker">
  <rect width="32" height="32" fill="${C.proofDeep}"/>
  <g transform="translate(0 1.5) scale(1)">${mark(C.paperDark, 2.6)}</g>
</svg>`;

mkdirSync(ICONS, { recursive: true });
mkdirSync(IMAGES, { recursive: true });
writeFileSync(join(ICONS, 'favicon.svg'), faviconSvg, 'utf8');

const faviconPng = (size) =>
  sharp(Buffer.from(faviconSvg)).resize(size, size).png({ compressionLevel: 9 }).toBuffer();

// --- apple-touch-icon: ista stvar, 180px, bez providnosti ------------------

const appleSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 180 180">
  <rect width="180" height="180" fill="${C.proofDeep}"/>
  <g transform="translate(34 40) scale(3.5)">${mark(C.paperDark, 2.4)}</g>
</svg>`;

// ---------------------------------------------------------------------------
// Open Graph 1200×630 — tipografska, bez fotografije
// ---------------------------------------------------------------------------

const fontData = {
  display: readFileSync(join(FONTS, 'fraunces-700.woff2')).toString('base64'),
  mono: readFileSync(join(FONTS, 'plex-mono-600.woff2')).toString('base64'),
};

const ogSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <defs>
    <style type="text/css"><![CDATA[
      @font-face{font-family:'F';src:url(data:font/woff2;base64,${fontData.display}) format('woff2');font-weight:700;}
      @font-face{font-family:'M';src:url(data:font/woff2;base64,${fontData.mono}) format('woff2');font-weight:600;}
      .h{font-family:'F',Georgia,serif;font-weight:700;fill:${C.paperDark};letter-spacing:-0.025em;}
      .m{font-family:'M',monospace;font-weight:600;letter-spacing:0.14em;text-transform:uppercase;}
    ]]></style>
  </defs>

  <rect width="1200" height="630" fill="${C.proofDeep}"/>

  <!-- znak -->
  <g transform="translate(80 74) scale(1.5)">${mark(C.paperDark, 2.4)}</g>

  <!-- wordmark -->
  <text x="152" y="104" class="h" font-size="34">Dr Cooker</text>
  <text x="153" y="126" class="m" font-size="14" fill="${C.mist}">Ketering servis</text>

  <!-- naslov -->
  <text x="80" y="300" class="h" font-size="76">Kuvani obroci za vrtiće,</text>
  <text x="80" y="386" class="h" font-size="76">škole i kompanije</text>

  <!-- linija -->
  <rect x="80" y="440" width="120" height="3" fill="${C.accent}"/>

  <!-- podnaslov -->
  <text x="80" y="492" class="m" font-size="18" fill="${C.mist}">Doručak · Ručak · Užine</text>
  <text x="80" y="528" class="m" font-size="18" fill="${C.mist}">Jelovnik izrađuje nutricionista</text>

  <!-- donja linija i adresa -->
  <rect x="80" y="566" width="1040" height="1" fill="${C.rule}"/>
  <text x="80" y="600" class="m" font-size="15" fill="${C.mist}">Beograd, Voždovac</text>
  <text x="1120" y="600" class="m" font-size="15" fill="${C.mist}" text-anchor="end">drcooker.rs</text>
</svg>`;

const out = [];

out.push(
  sharp(Buffer.from(appleSvg)).resize(180, 180).png({ compressionLevel: 9 }).toFile(join(ICONS, 'apple-touch-icon.png')),
);
out.push(
  sharp(Buffer.from(ogSvg)).png({ compressionLevel: 9, quality: 92 }).toFile(join(IMAGES, 'og-default.png')),
);
out.push(faviconPng(32).then((b) => writeFileSync(join(ICONS, 'favicon-32.png'), b)));

await Promise.all(out);

// --- favicon.ico: 16 + 32 + 48, ručno složen ICO kontejner ------------------
// sharp ne ume .ico, a dodavati biblioteku za 1 KB fajl nema smisla.
// ICO format je jednostavan: header + po jedan direktorijumski unos za svaku
// veličinu + ulančani PNG podaci.

const sizes = [16, 32, 48];
const pngs = await Promise.all(sizes.map(faviconPng));

const header = Buffer.alloc(6);
header.writeUInt16LE(0, 0); // rezervisano
header.writeUInt16LE(1, 2); // tip: 1 = ikonica
header.writeUInt16LE(sizes.length, 4);

let offset = 6 + sizes.length * 16;
const entries = sizes.map((size, i) => {
  const e = Buffer.alloc(16);
  e.writeUInt8(size === 256 ? 0 : size, 0); // širina
  e.writeUInt8(size === 256 ? 0 : size, 1); // visina
  e.writeUInt8(0, 2); // broj boja u paleti
  e.writeUInt8(0, 3); // rezervisano
  e.writeUInt16LE(1, 4); // ravni
  e.writeUInt16LE(32, 6); // bitova po pikselu
  e.writeUInt32LE(pngs[i].length, 8);
  e.writeUInt32LE(offset, 12);
  offset += pngs[i].length;
  return e;
});

writeFileSync(join(ROOT, 'favicon.ico'), Buffer.concat([header, ...entries, ...pngs]));

// ---------------------------------------------------------------------------
// webmanifest
// ---------------------------------------------------------------------------

writeFileSync(
  join(ROOT, 'site.webmanifest'),
  JSON.stringify(
    {
      name: 'Dr Cooker — ketering servis',
      short_name: 'Dr Cooker',
      description:
        'Kuvani obroci za vrtiće, škole, produžene boravke i kompanije. Kuhinja u Beogradu, na Voždovcu.',
      lang: 'sr-Latn-RS',
      start_url: '/',
      display: 'browser',
      background_color: C.paper,
      theme_color: C.proofDeep,
      icons: [
        { src: '/favicon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
        { src: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
      ],
    },
    null,
    2,
  ),
  'utf8',
);

const { statSync } = await import('node:fs');
const list = [
  ['assets/icons/favicon.svg', ICONS], ['favicon.ico', ROOT],
  ['assets/icons/favicon-32.png', ICONS], ['assets/icons/apple-touch-icon.png', ICONS],
  ['assets/images/og-default.png', IMAGES], ['site.webmanifest', ROOT],
];
for (const [label] of list) {
  console.log(`  OK   ${label.padEnd(34)} ${(statSync(join(ROOT, label)).size / 1024).toFixed(1)} KB`);
}
