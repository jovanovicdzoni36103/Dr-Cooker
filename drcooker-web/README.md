# Dr Cooker — sajt

Običan custom coded website. **HTML + CSS + JavaScript.**
Bez frameworka, bez build sistema, bez `npm install`, bez komandi.

---

## Kako da vidiš sajt

**Dvoklik na `start.cmd`.** Otvara se u browseru. To je sve.

Možeš i dvoklikom na `index.html` — sajt radi i tako. Razlika je samo u tome
što browser, kada se stranica otvori direktno sa diska (`file://`), iz
bezbednosnih razloga često ne učita custom fontove, pa tekst padne na sistemske.
Sve ostalo — izgled, navigacija, forma, animacije — radi identično.

Za objavljivanje na internetu: prekopiraj **ceo folder** na hosting.
Nema koraka izgradnje. Vidi [`docs/DEPLOY.md`](docs/DEPLOY.md).

---

## Struktura

```
drcooker-web/
├── index.html              ← naslovna
├── 404.html
├── start.cmd               ← dvoklik za lokalni pregled
│
├── css/
│   ├── base.css            dizajn tokeni (boje, fontovi, razmaci), reset, tipografija
│   ├── components.css      dugmad, forme, tabele, paneli, deljene sekcije
│   ├── layout.css          zaglavlje, navigacija, podnožje
│   ├── pages.css           ono što je specifično za pojedinačnu stranicu
│   ├── motion.css          animacije pri skrolu
│   └── print.css           izgled na papiru
│
├── js/
│   ├── config.js           ← SVE što kasnije unosiš je ovde
│   ├── api.js              submitInquiry() — jedina tačka ka backendu
│   ├── forms.js            validacija i stanja forme
│   ├── main.js             navigacija i mobilni meni — mora da radi uvek
│   └── motion.js           sve što se animira; gasi se na prefers-reduced-motion
│
├── pages/                  sve ostale stranice (15 fajlova)
│
├── assets/
│   ├── images/
│   ├── icons/
│   └── fonts/
│
├── backend/apps-script/    Google Apps Script (uputstvo na vrhu Code.gs)
├── emails/                 HTML šabloni oba mejla + preview
├── docs/                   dokumentacija
└── tools/                  opcione skripte za održavanje
```

---

## Šta treba da uneseš

**Jedna vrednost da forma proradi:**

`js/config.js` → `GOOGLE_APPS_SCRIPT_URL`

Uputstvo kako se dobija je na vrhu [`backend/apps-script/Code.gs`](backend/apps-script/Code.gs).

Dok je prazno, forma radi u demo režimu: validacija i sva stanja rade, ali se
korisniku jasno kaže da upit **nije** poslat. Nikada se ne prikazuje lažna
potvrda.

Sve ostalo što čeka podatke je u istom fajlu, označeno sa `TODO(klijent)`.
Objašnjenje svake stavke: [`docs/DELIVERY.md`](docs/DELIVERY.md).

---

## Gde se šta menja

| Šta menjaš | Gde |
|---|---|
| Apps Script URL, email primaoca | `js/config.js` |
| Telefon, adresa (prikazano na sajtu) | `tools/partials/footer.html`, pa `node tools/sync-partials.mjs` |
| Telefon, adresa (koje koristi JavaScript) | `js/config.js` → `CONTACT` |
| Stavke u navigaciji | `tools/partials/header.html`, pa sync |
| Tekst neke stranice | taj `.html` fajl u `pages/` |
| Jelovnik, gramature, cena | direktno u `pages/nedeljni-meni.html`, `pages/gramature.html` |
| Boje, fontovi, razmaci | `css/base.css`, sekcija `:root` |
| Izgled dugmadi, formi, tabela | `css/components.css` |
| Nešto na jednoj jedinoj stranici | `css/pages.css`, pod `.page-<ime>` |
| Link ka Sinko prodavnici | `grep -rn sinko.rs` — stoji u HTML-u, ne u configu |

### Zaglavlje i podnožje

Ista su na svih 16 stranica i upisana su u svaku. Da se ne bi prekucavala
ručno, izvor im je u `tools/partials/`:

```powershell
node tools/sync-partials.mjs
```

Skripta upiše `tools/partials/header.html` i `footer.html` u sve stranice,
između marker komentara `<!-- #region header -->` i `<!-- #endregion header -->`.
Sve van markera ostaje netaknuto. Nema zavisnosti.

Zaglavlje se namerno **ne** učitava JavaScriptom: to ne radi kada se stranica
otvori dvoklikom, pomera layout pri učitavanju i sakriva navigaciju od
pretraživača.

---

## CSS — kako je organizovan

Redosled učitavanja je bitan i svuda je isti:

```
base → components → layout → pages → motion → print
```

- **`!important` samo na četiri mesta**: kada `prefers-reduced-motion` gasi
  animacije, u stilu za štampu, na `.visually-hidden` i na `[hidden]`. Ovo
  poslednje je obavezno: browserov `[hidden] { display: none }` živi u
  user-agent sloju i gubi od bilo kog autorskog pravila koje postavi `display`.
  Svuda drugde je znak da specifičnost negde nije u redu;
  `python tools/audit.py` to i proverava.
- **Media query stoji uz pravilo koje menja**, ne u zasebnom fajlu — tako se
  jedna komponenta menja na jednom mestu.
- **`404.html` je JEDINI fajl sa putanjama od korena** (`/css/…`). Server je
  servira za bilo koji nepostojeći URL bez menjanja baze dokumenta, pa bi
  relativna putanja za `/ponuda-hrane/nesto` tražila
  `/ponuda-hrane/css/base.css`. `sync-partials.mjs` i `audit.py` znaju za taj
  izuzetak; svuda drugde su apsolutne putanje greška.
- **Horizontalni scroll je zabranjen na dokumentu.** Jedini izuzetak je
  `.table-scroll`: tabela sa rečenicama u ćelijama ne može da se suzi ispod
  svoje najmanje širine, pa pomeraj dobija ona umesto cele stranice. Region je
  fokusabilan i imenovan, da bi radio i sa tastaturom.
- **Linija koja razdvaja PODATKE mora biti `--color-rule-strong`** (3,71:1).
  Dekorativna `--color-rule` je 1,49:1 i sme samo između sekcija.
- **Desktop navigacija počinje na 66rem**, ne na 60rem. Mereno: na 1023px je
  zaglavlju trebalo 956px, a imalo je 945 — dugme „Zatraži ponudu" je izlazilo
  van ekrana. Ako se u meni doda još stavki, ovaj prag treba premeriti.
- `pages.css` je ograničen klasom na `<body>` (`page-jelovnik`, `page-kontakt`…),
  pa iste klase mogu imati različite vrednosti po stranici bez sudaranja.
- Boje su podeljene u dva registra: **topla crvena** `#A32A2E` je glas firme
  (dugmad, linkovi), **hladna zelena** `#124A3F` je dokaz (tabele podataka,
  kontrola, HACCP). Nikad se ne dodiruju — kontrast između njih je 1.41:1 i
  nečitljiv je daltonistima.

---

## Forma

`pages/zatrazi-ponudu.html` → `js/forms.js` → `js/api.js` → Apps Script → Sheet

- validacija u browseru (obavezna polja, email, telefon, dužina poruke)
- uslovno polje: „broj korisnika" se pojavljuje samo kada usluga uključuje obroke
- stanja: mirno → šalje se → uspeh | greška
- zaštita od duplog slanja (otisak sadržaja + zaključavanje dok traje)
- honeypot polje i provera vremena popunjavanja protiv botova
- timeout 15 s, jedan automatski ponovni pokušaj
- **success se prikazuje isključivo kada backend potvrdi prijem**
- posle uspeha se polja sklanjaju; povratak ide preko „Pošalji još jedan upit"
- **poruka nikad ne tvrdi ono što se ne zna.** Timeout prekida čitanje odgovora
  na klijentu, ne slanje — pa tada piše „Nismo dobili potvrdu", a ne
  „Upit nije poslat". Ovo drugo stoji samo kada zahtev stvarno nije otišao.
- ako `config.js` ili `api.js` ne stignu, forma kaže šta se desilo i ostaje
  upotrebljiva; ranije bi se zaglavila na „Šaljemo…" zauvek

Podaci koji se šalju:

```js
{ ime, ustanova, email, telefon, usluga, brojKorisnika,
  pocetak, poruka, saglasnost, timestamp,
  _id, _fingerprint, _source, _sentAt }
```

---

## Opcione skripte

Nijedna nije potrebna da sajt radi.

```powershell
node tools/sync-partials.mjs     # prepiše zaglavlje i podnožje u sve stranice
node tools/build-seo-files.mjs   # regeneriše sitemap.xml, robots.txt, _redirects
node tools/build-emails.mjs      # regeneriše email šablone i Templates.gs
python tools/build-ticker.py    # osveži traku sa jelima iz nedeljnog menija
node tools/mock-backend.mjs      # lažni Apps Script, za testiranje forme
python tools/audit.py            # provera celog projekta
python tools/build-docx.py       # regeneriše upitnik za klijenta
```

Ove dve traže jednokratnu instalaciju i pokreću se samo ako menjaš brend:

```powershell
npm install sharp                # pa: node tools/build-icons.mjs
pip install fonttools brotli     # pa: python tools/build-fonts.py
```

---

## Sinko online prodavnica

Sajt upućuje klijente na **sinko.rs** — online prodavnicu koju vodi
Sinko plus d.o.o. Logika je podela posla:

| | Dr Cooker | Sinko online |
|---|---|---|
| Šta | kuvani obroci | roba iz kataloga |
| Kako se traži | upit → sastanak → ponuda | korpa → porudžbina |
| Brzina | dogovor, pa redovna isporuka | isti dan ako je do 12h |

Zato linkovi stoje tamo gde je korisnik već u „treba mi roba" režimu:

| Gde | Zašto tu |
|---|---|
| `pages/sinko-online-prodavnica.html` | cela priča na jednom mestu |
| Zaglavlje → Snabdevanje → podmeni | isti posao, isti meni |
| `pages/snabdevanje.html` | čita o robi upravo sada |
| Panel „Upit je poslat" | najveća namera na celom sajtu — dok čeka odgovor, može da poruči |
| `index.html`, treća kartica | tri načina saradnje na jednom mestu |
| `za-vrtice-i-skole` | spisak prilagođen publici |
| Podnožje | prisutno, bez pritiska |

**Sve činjenice o Sinku pročitane su sa sinko.rs** i popisane u
[`docs/SOURCE-BRIEF.md`](docs/SOURCE-BRIEF.md), sekcija 15 — zajedno sa spiskom
onoga što se sa tog sajta **ne sme** uzeti (dve njihove strane su ostale
nedovršene iz šablona i protivreče podnožju).

**Otvoreno pitanje:** Sinko plus d.o.o. ima drugi PIB i drugu adresu od
Dr Cooker-a, pa se poslovni odnos ne može pročitati ni sa jednog izvora. Sajt
zato koristi neutralnu reč **„partner"**. Tačna formulacija je pitanje S u
upitniku.

Ako se domen promeni: `grep -rn "sinko.rs" .` — linkovi su u HTML-u namerno,
da rade i kad JavaScript zakaže.

## Animacije

Sve se animira preko `transform` i `opacity` — ništa što okida layout.

| Gde | Šta se dešava |
|---|---|
| Hero | naslov je tu odmah; ulaze eyebrow, lead, dugmad i kartica, pa se iscrtava linija |
| Odmah ispod heroja | traka sa imenima jela iz objavljenog jelovnika, u petlji |
| Pri skrolu | sekcije se otkrivaju, naslovi red po red |
| Referenca | brojke se odbrojavaju kada uđu u vidno polje |
| Dugmad | blago se povlače ka kursoru, samo tamo gde postoji miš |
| Prelaz stranica | meki prelaz preko View Transitions API-ja |
| Vrh ekrana | traka napretka čitanja |
| Mapa | ne učitava se sama — čeka klik na „Prikaži mapu" |

**Traka sa jelima postoji zato što firma nema nijednu pravu fotografiju hrane.**
Stvarna imena jela iz objavljenog jelovnika, postavljena krupno, rade za apetit
bolje od stock tanjira — i istinita su. Osvežavaju se sa
`python tools/build-ticker.py`.

Traka ima **dugme „Zaustavi traku"** u donjem desnom uglu. To nije ukras nego
obaveza: WCAG 2.2.2 (nivo A) traži da korisnik može da zaustavi sadržaj koji se
sam pokreće i traje duže od 5 sekundi. Pauza na hover ne važi — ne postoji za
tastaturu ni za dodir.

### Četiri pravila

1. **Naslov se nikad ne animira.** Svaka animacija koja otkriva tekst mora da
   krene od stanja u kome tekst nije vidljiv. To je u redu za ukras, ali ne za
   `h1`: on je LCP element i jedina rečenica zbog koje je stranica otvorena.
   Koreografija se zato dešava **oko** naslova.
2. **Ostali sadržaj ne sme da ostane nevidljiv.** Klasu `js-on`, koja uopšte
   omogućava skrivanje pri skrolu, dodaje JavaScript i to tek kada je stranica
   stvarno vidljiva. Povrh toga, posle 3 sekunde se sve otkriva bez uslova —
   uključujući i delove heroja. Najgori mogući ishod je sajt bez animacije,
   nikad sajt bez teksta.
3. **`prefers-reduced-motion` gasi ceo `motion.js`.** Ne umanjuje animacije —
   gasi ih.
4. **Navigacija nije u `motion.js`.** Ona je u `main.js` i radi uvek.

## Dokumentacija

| Fajl | Sadržaj |
|---|---|
| [`docs/FOTO-BRIEF.md`](docs/FOTO-BRIEF.md) | šta treba fotografisati i gde ide |
| [`docs/DELIVERY.md`](docs/DELIVERY.md) | šta je isporučeno, QA nalazi, šta čeka klijenta |
| [`docs/DEPLOY.md`](docs/DEPLOY.md) | hosting, domen, preusmerenja sa starog sajta |
| [`docs/SOURCE-BRIEF.md`](docs/SOURCE-BRIEF.md) | izvor svih činjenica sa starog sajta |
| [`docs/Dr-Cooker-upitnik.docx`](docs/) | upitnik za klijenta |
| `backend/apps-script/Code.gs` | instalacija Google Sheets integracije |
