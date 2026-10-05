"""Provera copy-ja, ono sto audit.py ne pokriva.

    python tools/provera-copy.py

`audit.py` cuva strukturu, reference i SEO. Ovo cuva TEKST: pravila oko
interpunkcije, jedinstvenost glasnog naslova, saglasnost cetiri kopije meta
opisa i nepostojanje termina koje je klijent izbacio.

Zasto odvojen alat: ove provere nisu tehnicke nego redakcijske. Padaju kada
neko prepise recenicu, ne kada polomi HTML, i treba da se citaju kao lista
redakcijskih zamerki, a ne kao greske u gradnji.

Izlazni kod 1 ako ima greske.
"""

from __future__ import annotations

import json
import re
import sys
from pathlib import Path

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

ROOT = Path(__file__).resolve().parent.parent

greske: list[tuple[str, str]] = []
upozorenja: list[tuple[str, str]] = []

# Veznik "i" koji je klijent otkucao kao veliko "I". Obrazac stoji ovde jer
# ga koristi i provera i samotest.
VEZNIK_I = r"(?<=[a-zćčđšž][^\S\n])I(?=[^\S\n]+\S)"

EM = chr(8212)   # em dash
EN = chr(8211)   # en dash
BAR = chr(8213)  # horizontal bar
MINUS = chr(8722)  # minus sign

# Termini koje je klijent izbacio. Levo obrazac, desno objasnjenje.
# Pise se kao obrazac jer `kuhinj` hvata i kuhinja i kuhinje i kuhinjski.
IZBACENO = [
    (r"7[.\s]?000", "7.000 artikala, tacan broj je 5.000"),
    (r"centralna\s+kuhinj", "centralna kuhinja, zove se PROIZVODNJA"),
    (r"(?:naš[aeu]|njihov[aeu])\s+kuhinj", "svoja kuhinja, zove se PROIZVODNJA"),
    (r"komercijal", "komercijala, uklonjen je poziv direktorovoj komercijali"),
    (r"Happy\s*kids", "ime ustanove koju je trazio da se ukloni"),
    (r"gramatur", "gramatura, zove se NORMATIVI"),
    (r"\bKompanij[ea]\b", "Kompanije, ta celina je ukinuta"),
    (r"najve[cć]u\s+privatnu", "tvrdnja o najvecoj privatnoj ustanovi"),
    (r"suhomesnat\w*\s+(?:proizvod|prera[dđ]evin)\w*\s+su\s+"
     r"(?:u\s+potpunosti\s+)?isklju[cč]en",
     "netacna tvrdnja da su suhomesnati proizvodi iskljuceni"),
]

# Reci koje je trazio da se izbace, ali ih je POSLE sam vratio u svom tekstu.
# Zato su upozorenje, ne greska: svaka pojava treba ljudsko oko, a ne pravilo.
#   "ketering" je sam napisao u novom uvodu stranice O nama
#   "kuhinja" se legitimno javlja za kuhinju KOD KLIJENTA i za osoblje kuhinje
ZA_OKO = [
    (r"\bketering", "ketering, proveri da li je to njegov tekst"),
    (r"\bkuhinj", "kuhinja, proveri da li se odnosi na njihovu proizvodnju"),
]

# Telefon: dozvoljen je samo jedan. Hvata srpske mobilne i fiksne zapise.
TELEFON = re.compile(r"\b0\d{1,2}[\s/-]?\d{3}[\s-]?\d{2}[\s-]?\d{2,3}\b")
DOZVOLJEN_TELEFON = re.compile(r"064\s*110\s*1521|0641101521")
# Broj iza "na primer" je uputstvo za popunjavanje polja, ne kontakt firme.
PRIMER = re.compile(r"[Nn]a\s+primer\s+$")


def samotest() -> int:
    """Provera pravila koja su se vec dva puta pokazala pogresnim.

        python tools/provera-copy.py --test

    Pravilo za veznik je prvo gledalo samo razmake oko slova, pa je prijavilo
    rimski broj u "Uzina I". Posle toga je gledalo malo slovo ispred, ali i u
    "Uzina I" ispred broja stoji malo "a". Tek uslov da iza veznika sledi rec
    razdvaja ta dva slucaja, i zato ovaj test postoji.
    """
    slucajevi: list[tuple[str, int, str]] = [
        ("<p>kontrole ulaza sirovina, pripreme I isporuke obroka</p>", 1,
         "njegova kucna greska usred recenice"),
        ("<p>popunite I posaljite upit</p>", 1, "ista greska, druga recenica"),
        ("<p>obroka I Vasu ustanovu</p>", 1, "greska pred velikim slovom"),
        ("<td>hleb i jogurt</td><th>Uzina I</th><td>Jabuka</td>", 0,
         "rimski broj posle celije koja se zavrsava malim slovom"),
        ("<dt>Uzina I</dt><dd>Jabuka</dd><dt>Uzina II</dt>", 0,
         "rimski brojevi u definicionoj listi"),
        ("<p>JASLE I VRTIC</p>", 0, "veznik u verzalu je ispravno napisan"),
    ]
    pao = 0
    for html, ocekivano, opis in slucajevi:
        n = len(re.findall(VEZNIK_I, tekst_po_cvoru(html)))
        if n != ocekivano:
            pao += 1
        print(f"  {'ok ' if n == ocekivano else 'PAD'} {n}=={ocekivano}  {opis}")
    print(f"\npadova: {pao}")
    return 1 if pao else 0


def _ocisti_html(html: str) -> str:
    """Odbacuje skripte, stilove, komentare i JSON-LD, dekodira entitete."""
    html = re.sub(r"<!--.*?-->", " ", html, flags=re.S)
    html = re.sub(r"<(script|style)\b[^>]*>.*?</\1>", " ", html, flags=re.S | re.I)
    return (html.replace("&nbsp;", " ").replace("&amp;", "&")
                .replace("&lt;", "<").replace("&gt;", ">")
                .replace("&#39;", "'").replace("&quot;", '"'))


def vidljiv_tekst(html: str) -> str:
    """Sav vidljiv tekst u jednom redu. Za trazenje reci i fraza."""
    return re.sub(r"\s+", " ", re.sub(r"<[^>]+>", " ", _ocisti_html(html)))


def tekst_po_cvoru(html: str) -> str:
    """Vidljiv tekst, ali svaki tekstualni cvor u svom redu.

    Pravila koja gledaju SUSEDSTVO reci ne smeju da rade na spljostenoj
    stranici: tamo granica elementa postaje razmak, pa se naslov jedne
    celije nadje odmah uz tekst prethodne. Tako je "jogurt" iz jedne celije
    tabele zavrsio ispred "Uzina I" iz sledece, i rimski broj je prijavljen
    kao njegova kucna greska. Granica taga je zato prelom reda.
    """
    red = re.sub(r"<[^>]+>", "\n", _ocisti_html(html))
    return "\n".join(
        " ".join(x.split()) for x in red.split("\n") if x.strip()
    )


def meta_kopije(html: str) -> dict[str, str]:
    """Cetiri mesta gde isti opis mora da stoji.

    Kada se jedno izmeni a ostala ne, pretrazivac i mreze prikazu razlicit
    tekst za istu stranicu. Greska je nevidljiva na samom sajtu.
    """
    k: dict[str, str] = {}
    m = re.search(r'<meta\s+name="description"\s+content="([^"]*)"', html)
    if m:
        k["description"] = m.group(1)
    for prop in ("og:description", "twitter:description"):
        m = re.search(
            rf'<meta\s+(?:property|name)="{re.escape(prop)}"\s+content="([^"]*)"', html
        )
        if m:
            k[prop] = m.group(1)
    for blok in re.findall(
        r'<script[^>]+type="application/ld\+json"[^>]*>(.*?)</script>', html, re.S
    ):
        try:
            podaci = json.loads(blok)
        except json.JSONDecodeError:
            continue
        # Opis stranice stoji na `WebPage` cvoru unutar `@graph`. Tip se mora
        # proveriti: `Organization` u istom grafu nosi opis FIRME, koji se
        # legitimno razlikuje od opisa stranice, pa bi "prvi description"
        # lazno prijavio razliku na svakoj stranici.
        cvorovi = podaci if isinstance(podaci, list) else [podaci]
        cvorovi = [c for c in cvorovi if isinstance(c, dict)]
        cvorovi += [
            g for c in cvorovi for g in c.get("@graph", []) if isinstance(g, dict)
        ]
        for cvor in cvorovi:
            tipovi = cvor.get("@type", "")
            tipovi = tipovi if isinstance(tipovi, list) else [tipovi]
            if not any(str(t).endswith("Page") for t in tipovi):
                continue
            if cvor.get("description") and "json-ld" not in k:
                k["json-ld"] = cvor["description"]
    return k


if "--test" in sys.argv:
    sys.exit(samotest())

for put in sorted(ROOT.rglob("*.html")):
    # `partials` su delovi zaglavlja i podnozja, ne stranice: nemaju <head>
    # ni glasan naslov, pa bi svaka provera na nivou stranice lazno pala.
    if any(d in put.parts for d in (".git", "node_modules", "emails", "partials")):
        continue
    ime = put.relative_to(ROOT).as_posix()
    html = put.read_text(encoding="utf-8")
    tekst = vidljiv_tekst(html)
    cvorovi = tekst_po_cvoru(html)

    # --- interpunkcija ---
    # Crta se proverava na celom fajlu, ne samo na vidljivom tekstu: isto
    # vazi za alt, title, aria-label i meta content, koje citac ekrana i
    # pretrazivac prikazuju kao tekst.
    for znak, naziv in ((EM, "em dash"), (EN, "en dash"),
                        (BAR, "horizontal bar"), (MINUS, "minus sign")):
        n = html.count(znak)
        if n:
            greske.append((ime, f"{naziv} x{n}"))

    # Crtica okruzena razmacima je ista greska u drugom kostimu. Trazi se
    # samo u vidljivom tekstu, da se ne prijave CSS klase i URL-ovi.
    n = len(re.findall(r"(?<=\s)-(?=\s)", cvorovi))
    if n:
        greske.append((ime, f"crtica kao interpunkcija x{n}"))

    # --- njegova kucna greska: veliko I kao veznik ---
    # Veznik stoji IZMEDJU dve reci: "pripreme I isporuke". Rimski broj
    # zatvara oznaku i nema sta posle njega: "Uzina I", "Uzina II". Zato
    # odlucuje da li u istom tekstualnom cvoru posle njega sledi rec.
    # Malo slovo ispred odbacuje veznik u verzalu ("JASLE I VRTIC"), koji
    # je ispravno napisan.
    # Razmaci su `[^\S\n]`, ne `\s`: `\s` hvata i prelom reda, pa bi pravilo
    # ponovo prelazilo granicu elementa koju cvorovi upravo razdvajaju.
    n = len(re.findall(VEZNIK_I, cvorovi))
    if n:
        greske.append((ime, f'veliko "I" kao veznik x{n}, treba malo "i"'))

    # --- jedan glasan naslov po stranici ---
    n = len(re.findall(r"display-2--loud", html))
    if n != 1:
        greske.append((ime, f"display-2--loud x{n}, mora tacno 1"))

    # --- meta opis ---
    kopije = meta_kopije(html)
    if "description" not in kopije:
        greske.append((ime, "nema <meta name=description>"))
    else:
        duzina = len(kopije["description"])
        if duzina > 155:
            greske.append((ime, f"meta opis {duzina} znakova, max 155"))
        razlike = {k: v for k, v in kopije.items() if v != kopije["description"]}
        for k in razlike:
            greske.append((ime, f"meta opis se razlikuje u {k}"))

    # --- izbaceni termini ---
    for obrazac, zasto in IZBACENO:
        m = re.search(obrazac, tekst, re.I)
        if m:
            greske.append((ime, f'"{m.group(0)}" ({zasto})'))

    for obrazac, zasto in ZA_OKO:
        for m in re.finditer(obrazac, tekst, re.I):
            okolina = tekst[max(0, m.start() - 45):m.end() + 25].strip()
            upozorenja.append((ime, f"{zasto}: ...{okolina}..."))

    # --- samo jedan telefon ---
    # Proverava se i vidljiv tekst i `tel:` link, jer se razlikuju: link nosi
    # medjunarodni oblik (+381...) koji se normalizuje u lokalni pre poredjenja.
    kandidati: set[str] = set()
    for m in TELEFON.finditer(tekst):
        if not PRIMER.search(tekst[max(0, m.start() - 14):m.start()]):
            kandidati.add(m.group(0))
    for href in re.findall(r'href="tel:([^"]*)"', html):
        kandidati.add(re.sub(r"^\+381", "0", href.replace(" ", "")))

    for kandidat in sorted(kandidati):
        if not DOZVOLJEN_TELEFON.search(kandidat):
            upozorenja.append((ime, f"drugi telefon: {kandidat}"))


def ispisi(naslov: str, stavke: list[tuple[str, str]]) -> None:
    if not stavke:
        return
    print(f"\n{naslov} ({len(stavke)})")
    poslednji = None
    for fajl, poruka in stavke:
        if fajl != poslednji:
            print(f"  {fajl}")
            poslednji = fajl
        print(f"     {poruka}")


ispisi("GRESKE", greske)
ispisi("UPOZORENJA", upozorenja)

if not greske and not upozorenja:
    print("copy: cisto")
else:
    print(f"\ngresaka: {len(greske)}, upozorenja: {len(upozorenja)}")

sys.exit(1 if greske else 0)
