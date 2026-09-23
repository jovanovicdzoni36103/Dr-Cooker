/**
 * Lažni Apps Script endpoint za testiranje forme.
 *
 * Postoji da bi se putanje greške mogle stvarno proveriti, umesto da se
 * pretpostavi da rade. Apps Script ne može da simulira timeout ni pokvaren
 * odgovor na zahtev, a upravo to su slučajevi u kojima forma sme najviše da
 * pogreši (lažan uspeh).
 *
 * Pokretanje:  node tools/mock-backend.mjs
 * Zatim dev server sa: PUBLIC_APPS_SCRIPT_URL=http://127.0.0.1:4399/ok npm run dev
 *
 * Rute:
 *   /ok          uspeh, kao pravi Apps Script
 *   /slow        odgovara posle 20s — okida timeout (15s)
 *   /500         HTTP 500
 *   /html        HTTP 200, ali HTML umesto JSON (ovako Apps Script puca)
 *   /reject      validacija odbijena, sa greškama po poljima
 *   /nodata      HTTP 200, prazno telo
 *
 * Nije deo build-a i ne isporučuje se.
 */

import { createServer } from 'node:http';

const PORT = 4399;

const json = (res, code, body) => {
  res.writeHead(code, {
    'Content-Type': 'application/json; charset=utf-8',
    // Apps Script vraća ovo — bez njega browser ne bi pročitao odgovor.
    'Access-Control-Allow-Origin': '*',
  });
  res.end(JSON.stringify(body));
};

const server = createServer(async (req, res) => {
  const path = new URL(req.url, `http://${req.headers.host}`).pathname;

  let telo = '';
  for await (const chunk of req) telo += chunk;

  let podaci = {};
  try {
    podaci = JSON.parse(telo || '{}');
  } catch {
    /* namerno se ignoriše — deo scenarija */
  }

  console.log(`  ${req.method} ${path}  ${telo.length}B  ime="${podaci.ime ?? ''}"`);

  /**
   * Scenario se može izabrati i iz sadržaja poruke, ne samo iz rute.
   * Razlog: sajt čita endpoint iz `import.meta.env` u vreme build-a, pa bi
   * svaka ruta tražila svoj dev server. Ovako je jedan server dovoljan za
   * sve scenarije — u polje „poruka" se upiše marker.
   */
  const marker = /\[\[(SLOW|500|HTML|REJECT|NODATA)\]\]/.exec(String(podaci.poruka ?? ''));
  const efektivna = marker ? '/' + marker[1].toLowerCase() : path;

  switch (efektivna) {
    case '/ok':
      return json(res, 200, { ok: true, reference: 'UP-TEST-000123' });

    case '/slow':
      // Duže od CONFIG.REQUEST_TIMEOUT_MS (15s).
      await new Promise((r) => setTimeout(r, 20000));
      return json(res, 200, { ok: true, reference: 'UP-TEST-SPOR' });

    case '/500':
      return json(res, 500, { ok: false, error: 'Interna greška' });

    case '/html':
      // Ovako Apps Script odgovori kada skripta pukne: HTML, ne JSON.
      res.writeHead(200, { 'Content-Type': 'text/html', 'Access-Control-Allow-Origin': '*' });
      return res.end('<!doctype html><html><body><h1>Script error</h1></body></html>');

    case '/reject':
      return json(res, 200, {
        ok: false,
        code: 'VALIDATION',
        error: 'Neka polja nisu ispravna.',
        fieldErrors: { email: 'Ovu adresu ne prihvatamo.', telefon: 'Broj nije u opsegu.' },
      });

    case '/nodata':
      res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
      return res.end('');

    default:
      return json(res, 404, { ok: false, error: 'Nepoznata ruta' });
  }
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`Mock backend na http://127.0.0.1:${PORT}`);
  console.log('Rute: /ok /slow /500 /html /reject /nodata');
});
