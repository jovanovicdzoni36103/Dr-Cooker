"""Izvlaci tekst sajta, sekciju po sekciju, za reviziju kod klijenta.

Klijent ne cita HTML. Njemu treba ono sto posetilac vidi, grupisano onako
kako stranica stvarno tece, sa naslovom svake sekcije da zna gde je.

STA SE IZOSTAVLJA I ZASTO
  - zaglavlje i podnozje: isti su na svih 17 stranica, pa bi se ponovili 17
    puta i zatrpali dokument. Idu jednom, na kraju.
  - `.visually-hidden`: to su tekstovi za citace ekrana, ne za oko. Klijent
    ih ne vidi na sajtu, pa nema sta da komentarise.
  - `aria-hidden` i dekorativni elementi: isto.
  - <script>, <style>, HTML komentari.

Koristi ga `tools/build-revizija-docx.py`.
"""

from __future__ import annotations

import html as html_mod
import re
import sys
from dataclasses import dataclass, field
from pathlib import Path

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

ROOT = Path(__file__).resolve().parent.parent

# Redosled u dokumentu prati redosled u navigaciji, ne abecedu — klijent
# tako prolazi sajt kako bi ga i posetilac prosao.
STRANICE: list[tuple[str, str, str]] = [
    ("index.html", "Naslovna", "drcooker.rs"),
    ("pages/za-vrtice-i-skole.html", "Obroci za vrtiće i škole", "drcooker.rs/pages/za-vrtice-i-skole.html"),
    ("pages/nedeljni-jelovnik.html", "Nedeljni jelovnik", "drcooker.rs/pages/nedeljni-jelovnik.html"),
    ("pages/jelovnik.html", "Jelovnik", "drcooker.rs/pages/jelovnik.html"),
    ("pages/normativi.html", "Normativi", "drcooker.rs/pages/normativi.html"),
    ("pages/sinko-online-prodavnica.html", "Online supermarket", "drcooker.rs/pages/sinko-online-prodavnica.html"),
    ("pages/snabdevanje.html", "Asortiman za ustanove", "drcooker.rs/pages/snabdevanje.html"),
    ("pages/kako-radimo.html", "Kako radimo", "drcooker.rs/pages/kako-radimo.html"),
    ("pages/nutricionista.html", "Nutricionista", "drcooker.rs/pages/nutricionista.html"),
    ("pages/bezbednost-hrane.html", "Bezbednost hrane", "drcooker.rs/pages/bezbednost-hrane.html"),
    ("pages/dostava.html", "Dostava", "drcooker.rs/pages/dostava.html"),
    ("pages/galerija.html", "Galerija", "drcooker.rs/pages/galerija.html"),
    ("pages/o-nama.html", "O nama", "drcooker.rs/pages/o-nama.html"),
    ("pages/kontakt.html", "Kontakt", "drcooker.rs/pages/kontakt.html"),
    ("pages/zatrazi-ponudu.html", "Zatraži ponudu", "drcooker.rs/pages/zatrazi-ponudu.html"),
    ("pages/politika-privatnosti.html", "Politika privatnosti", "drcooker.rs/pages/politika-privatnosti.html"),
    ("404.html", "Stranica nije pronađena", "prikazuje se na pogrešnoj adresi"),
]


@dataclass
class Sekcija:
    """Jedna sekcija stranice, onako kako je posetilac vidi."""

    oznaka: str = ""          # eyebrow iznad naslova
    naslov: str = ""
    redovi: list[str] = field(default_factory=list)
    tabele: list[tuple[str, list[list[str]]]] = field(default_factory=list)


@dataclass
class Stranica:
    fajl: str
    ime: str
    adresa: str
    title: str = ""
    opis: str = ""
    sekcije: list[Sekcija] = field(default_factory=list)


def _tekst(fragment: str) -> str:
    """HTML fragment -> citljiv tekst u jednom redu."""
    t = re.sub(r"<br\s*/?>", " ", fragment)
    t = re.sub(r"<[^>]+>", " ", t)
    t = html_mod.unescape(t)
    t = re.sub(r"\s+", " ", t).strip()
    # Granica taga postaje razmak, pa `<a>tekst</a>:` ispadne kao `tekst :`.
    # Na stranici tog razmaka nema. Da ostane, klijent bi u dokumentu video
    # gresku koja ne postoji i trosio paznju na nju.
    t = re.sub(r"\s+([,.;:!?])", r"\1", t)
    t = re.sub(r"\(\s+", "(", t)
    t = re.sub(r"\s+\)", ")", t)
    return t


def _ocisti(html: str) -> str:
    """Skida sve sto klijent ne vidi na stranici."""
    html = re.sub(r"<!--.*?-->", "", html, flags=re.S)
    html = re.sub(r"<(script|style)[\s\S]*?</\1>", "", html)
    html = re.sub(r"<svg[\s\S]*?</svg>", "", html)
    # elementi skriveni od oka
    html = re.sub(r'<(\w+)[^>]*class="[^"]*visually-hidden[^"]*"[^>]*>.*?</\1>', "", html, flags=re.S)
    html = re.sub(r'<(\w+)[^>]*aria-hidden="true"[^>]*>.*?</\1>', "", html, flags=re.S)
    # Kartice za uzak ekran nose ISTE podatke kao tabela iznad njih. U
    # dokumentu bi bile duplikat od nekoliko desetina redova po primeru.
    for kl in ("meni__cards", "nutri__blokovi"):
        html = re.sub(
            rf'<(\w+)[^>]*class="[^"]*{kl}[^"]*"[^>]*>.*?</\1>', "", html, flags=re.S
        )
    return html


def _tabela(fragment: str) -> tuple[str, list[list[str]]]:
    cap = re.search(r"<caption[^>]*>(.*?)</caption>", fragment, re.S)
    naslov = _tekst(cap.group(1)) if cap else ""
    redovi = []
    for tr in re.findall(r"<tr[^>]*>(.*?)</tr>", fragment, re.S):
        celije = [_tekst(c) for c in re.findall(r"<t[hd][^>]*>(.*?)</t[hd]>", tr, re.S)]
        if any(celije):
            redovi.append(celije)
    return naslov, redovi


def procitaj(fajl: str, ime: str, adresa: str) -> Stranica:
    sirovo = (ROOT / fajl).read_text(encoding="utf-8")

    title = _tekst(re.search(r"<title>(.*?)</title>", sirovo, re.S).group(1))
    m = re.search(r'<meta name="description" content="([^"]*)"', sirovo)
    opis = html_mod.unescape(m.group(1)) if m else ""

    html = _ocisti(sirovo)
    telo = html[html.index("<main") : html.index("</main>")] if "<main" in html else ""

    stranica = Stranica(fajl=fajl, ime=ime, adresa=adresa, title=title, opis=opis)

    granice = [m.start() for m in re.finditer(r"<section\b", telo)] + [len(telo)]
    for i in range(len(granice) - 1):
        blok = telo[granice[i] : granice[i + 1]]
        s = Sekcija()

        ey = re.search(r'class="[^"]*\beyebrow\b[^"]*"[^>]*>(.*?)<', blok, re.S)
        if ey:
            s.oznaka = _tekst(ey.group(1))

        # Neke sekcije nemaju ni naslov ni oznaku: traka sa imenima jela,
        # izdvojena recenica, zavrsni poziv. Bez imena klijent ne zna sta
        # komentarise, pa se ime izvodi iz klase same sekcije.
        if not s.oznaka:
            m_kl = re.match(r'<section[^>]*class="([^"]*)"', blok)
            klase = m_kl.group(1) if m_kl else ""
            for marker, ime_sekcije in (
                ("ticker", "Traka sa imenima jela"),
                ("ctaband", "Poziv na akciju (ponavlja se na dnu stranica)"),
                ("supermarket", "Online supermarket"),
            ):
                if marker in klase:
                    s.oznaka = ime_sekcije
                    break
            else:
                if "stats-strip" in blok[:500]:
                    s.oznaka = "Brojevi"
                elif "shell--narrow" in blok[:500]:
                    s.oznaka = "Izdvojena rečenica"
                elif "izlozak" in blok[:500]:
                    s.oznaka = "Izložak"

        n = re.search(r"<h[12][^>]*>(.*?)</h[12]>", blok, re.S)
        if n:
            s.naslov = _tekst(n.group(1))

        for tb in re.findall(r"<table[^>]*>.*?</table>", blok, re.S):
            naslov_t, redovi = _tabela(tb)
            if redovi:
                s.tabele.append((naslov_t, redovi))
        bez_tabela = re.sub(r"<table[^>]*>.*?</table>", "", blok, flags=re.S)

        vidjeno: set[str] = set()
        for m2 in re.finditer(r"<(h3|h4|p|li|dt|dd|figcaption|span)[^>]*>(.*?)</\1>", bez_tabela, re.S):
            t = _tekst(m2.group(2))
            if len(t) < 3 or t in vidjeno or t == s.naslov or t == s.oznaka:
                continue
            # kratke oznake unutar redova podataka ne nose recenicu
            if m2.group(1) == "span" and len(t) < 26:
                continue
            vidjeno.add(t)
            s.redovi.append(("PODNASLOV: " + t) if m2.group(1) in ("h3", "h4") else t)

        if s.naslov or s.redovi or s.tabele:
            stranica.sekcije.append(s)

    return stranica


def sve() -> list[Stranica]:
    return [procitaj(f, i, a) for f, i, a in STRANICE]


if __name__ == "__main__":
    ukupno_sekcija = 0
    for st in sve():
        ukupno_sekcija += len(st.sekcije)
        print(f"\n{'=' * 70}\n{st.ime}  ({st.fajl})")
        print(f"  title: {st.title}")
        for k, s in enumerate(st.sekcije, 1):
            t = sum(len(r) for _, r in s.tabele)
            print(f"   [{k}] {s.oznaka or '-':26} | {s.naslov[:44]:46} "
                  f"{len(s.redovi)} redova, {len(s.tabele)} tabela ({t} redova)")
    print(f"\nukupno sekcija: {ukupno_sekcija}")
