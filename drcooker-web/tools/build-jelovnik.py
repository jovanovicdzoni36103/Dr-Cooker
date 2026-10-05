"""Pravi nedeljni jelovnik na sajtu iz Word fajlova koje klijent salje.

    python tools/build-jelovnik.py <putanja do foldera sa .docx jelovnicima>

ZASTO ALAT, A NE RUCNO KUCANJE

Klijent salje jelovnik svake nedelje. Rucno prekucavanje pet dana puta cetiri
obroka puta dve varijante je 40 polja po nedelji, uz zagarantovanu gresku u
nekom gramu ili nazivu jela. Ovde se cita njegov fajl.

ULAZ
    .doc fajlove prvo konvertuj u .docx (Word: Sacuvaj kao). Alat cita .docx.
    Ocekuje dve tabele: nedelju (6x5) i prosek (3x11).

CIRILICA
    Klijent kuca cirilicom, sajt je latinica. Preslovljavanje mora da ide od
    DUZIH zamena ka kracim, inace `љ` prvo postane `l` pa `ј` ostane visak.
"""

from __future__ import annotations

import re
import sys
from pathlib import Path

from docx import Document

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

ROOT = Path(__file__).resolve().parent.parent
STRANICA = ROOT / "pages" / "nedeljni-jelovnik.html"

START = "<!-- #region jelovnik -->"
END = "<!-- #endregion jelovnik -->"

# Digrafi prvi, inace `љ` -> `l` + visak `ј`.
PRESLOVI = [
    ("Љ", "Lj"), ("Њ", "Nj"), ("Џ", "Dž"), ("љ", "lj"), ("њ", "nj"), ("џ", "dž"),
    ("А", "A"), ("Б", "B"), ("В", "V"), ("Г", "G"), ("Д", "D"), ("Ђ", "Đ"),
    ("Е", "E"), ("Ж", "Ž"), ("З", "Z"), ("И", "I"), ("Ј", "J"), ("К", "K"),
    ("Л", "L"), ("М", "M"), ("Н", "N"), ("О", "O"), ("П", "P"), ("Р", "R"),
    ("С", "S"), ("Т", "T"), ("Ћ", "Ć"), ("У", "U"), ("Ф", "F"), ("Х", "H"),
    ("Ц", "C"), ("Ч", "Č"), ("Ш", "Š"),
    ("а", "a"), ("б", "b"), ("в", "v"), ("г", "g"), ("д", "d"), ("ђ", "đ"),
    ("е", "e"), ("ж", "ž"), ("з", "z"), ("и", "i"), ("ј", "j"), ("к", "k"),
    ("л", "l"), ("м", "m"), ("н", "n"), ("о", "o"), ("п", "p"), ("р", "r"),
    ("с", "s"), ("т", "t"), ("ћ", "ć"), ("у", "u"), ("ф", "f"), ("х", "h"),
    ("ц", "c"), ("ч", "č"), ("ш", "š"),
]


VELIKA_CIR = set("АБВГДЂЕЖЗИЈКЛЉМНЊОПРСТЋУФХЦЧЏШ")


def lat(t: str) -> str:
    """Cirilica u latinicu, uz sredjivanje razmaka oko interpunkcije.

    Digraf u reci pisanoj velikim slovima mora da bude ceo veliki: PONEDELJAK,
    ne PonedeLjak. Odlucuje slovo KOJE SLEDI — ako je i ono veliko cirilicno,
    cela rec je u velikim slovima.
    """
    out = []
    for i, ch in enumerate(t):
        if ch in ("Љ", "Њ", "Џ"):
            sledece = t[i + 1] if i + 1 < len(t) else ""
            veliko = sledece in VELIKA_CIR
            out.append({"Љ": "LJ", "Њ": "NJ", "Џ": "DŽ"}[ch] if veliko
                       else {"Љ": "Lj", "Њ": "Nj", "Џ": "Dž"}[ch])
        else:
            out.append(ch)
    t = "".join(out)

    for a, b in PRESLOVI:
        t = t.replace(a, b)
    t = re.sub(r"\s+", " ", t).strip()
    t = re.sub(r"\s+([,.;:])", r"\1", t)
    t = re.sub(r"([,:])(?=\S)", r"\1 ", t)
    return t


def esc(t: str) -> str:
    return t.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")


def celija(c) -> list[str]:
    """Jela iz jedne celije. Prazni redovi razdvajaju varijante."""
    return [lat(x) for x in c.text.split("\n") if x.strip()]


def procitaj(put: Path) -> dict:
    d = Document(str(put))
    if len(d.tables) < 2:
        raise SystemExit(f"{put.name}: ocekivane dve tabele, nadjeno {len(d.tables)}")

    nedelja, prosek = d.tables[0], d.tables[1]

    zaglavlje = [lat(c.text) for c in nedelja.rows[0].cells]
    # spoji ponovljene merge celije
    obroci: list[str] = []
    for z in zaglavlje[1:]:
        if z and (not obroci or obroci[-1] != z):
            obroci.append(z)

    dani = []
    for r in nedelja.rows[1:]:
        c = r.cells
        ime = celija(c[0])
        if not ime:
            continue
        kolone, pret = [], None
        for x in c[1:]:
            tekst = x.text
            if tekst == pret:
                continue
            pret = tekst
            kolone.append(celija(x))
        dani.append({"dan": ime[0], "datum": ime[1] if len(ime) > 1 else "", "obroci": kolone})

    nutr = [lat(c.text) for c in prosek.rows[0].cells]
    redovi = []
    for r in prosek.rows[1:]:
        v = [lat(c.text) for c in r.cells]
        if v and v[0]:
            redovi.append(v)

    return {"obroci": obroci, "dani": dani, "nutrKolone": nutr, "nutrRedovi": redovi}


def tabela_nedelje(j: dict, rb: int) -> str:
    glave = "".join(f'<th scope="col">{esc(o)}</th>' for o in j["obroci"])
    redovi = []
    for d in j["dani"]:
        celije = []
        for lista in d["obroci"]:
            if len(lista) <= 1:
                celije.append(f"<td>{esc(lista[0]) if lista else ''}</td>")
            else:
                stavke = "".join(f"<li>{esc(x)}</li>" for x in lista)
                celije.append(f'<td><ul role="list" class="meni__opcije">{stavke}</ul></td>')
        redovi.append(
            f'<th scope="row"><span class="meni__dan">{esc(d["dan"])}</span>'
            f'<span class="meni__datum">{esc(d["datum"])}</span></th>' + "".join(celije)
        )
    tr = "</tr><tr>".join(redovi)
    return (
        f'<div class="meni__scroll"><table class="meni__table">'
        f'<caption class="visually-hidden">Nedeljni jelovnik, primer {rb}. '
        f'Dani u redovima, obroci u kolonama.</caption>'
        f'<thead><tr><th scope="col">Dan</th>{glave}</tr></thead>'
        f"<tbody><tr>{tr}</tr></tbody></table></div>"
    )


def tabela_proseka(j: dict, rb: int) -> str:
    glave = "".join(f'<th scope="col">{esc(k)}</th>' for k in j["nutrKolone"][1:])
    redovi = []
    for v in j["nutrRedovi"]:
        tds = "".join(f"<td>{esc(x)}</td>" for x in v[1:])
        redovi.append(f'<th scope="row">{esc(v[0])}</th>{tds}')
    tr = "</tr><tr>".join(redovi)
    return (
        f'<table class="data-table nutri__table">'
        f'<caption class="visually-hidden">Prosečna dnevna energetska i nutritivna '
        f'vrednost za primer {rb}, posebno za jaslice i posebno za vrtićki uzrast.</caption>'
        f'<thead><tr><th scope="col">{esc(j["nutrKolone"][0])}</th>{glave}</tr></thead>'
        f"<tbody><tr>{tr}</tr></tbody></table>"
    )


def main() -> None:
    folder = Path(sys.argv[1]) if len(sys.argv) > 1 else Path.cwd()
    fajlovi = sorted(folder.glob("*.docx"))
    if not fajlovi:
        raise SystemExit(f"Nema .docx jelovnika u {folder}")

    blokovi = []
    for rb, f in enumerate(fajlovi, 1):
        j = procitaj(f)
        naslov = lat(f.stem.replace("predlog", "").replace("_", " ")).strip(" .")
        blokovi.append(
            f'<section class="meni" aria-labelledby="meni-{rb}">'
            f'<header class="meni__head stack stack--sm">'
            f'<h3 id="meni-{rb}" class="display-3">Primer {rb:02d}: cela radna nedelja</h3>'
            f'<p class="lead measure">{esc(naslov)}</p></header>'
            f"{tabela_nedelje(j, rb)}"
            f'<h4 class="meni__nutr-naslov">Prosečna dnevna vrednost</h4>'
            f"{tabela_proseka(j, rb)}"
            f"</section>"
        )
        print(f"  {f.name}")
        print(f"     dana: {len(j['dani'])}, obroka: {len(j['obroci'])} "
              f"({', '.join(j['obroci'])}), proseka: {len(j['nutrRedovi'])}")

    html = STRANICA.read_text(encoding="utf-8")
    if START not in html or END not in html:
        raise SystemExit(f"Markeri {START} / {END} ne postoje u {STRANICA.name}")
    i, k = html.index(START), html.index(END) + len(END)
    STRANICA.write_text(
        html[:i] + START + "".join(blokovi) + END + html[k:], encoding="utf-8"
    )
    print(f"\n  upisano u {STRANICA.relative_to(ROOT).as_posix()}: {len(blokovi)} nedelje")


main()
