"""Preuzima, instancira i subsetuje fontove na srpsku latinicu.

Zasto se fontovi self-hostuju umesto <link> ka Google Fonts:
  1. Jedan round-trip manje na kriticnoj putanji (nema fonts.googleapis.com
     pa fonts.gstatic.com lanca).
  2. Kontrola nad podskupom znakova.
  3. ZAMKA: Google Fonts drzi Dj/dj (U+0110-0111) u VIETNAMESE podskupu, ne u
     latin-ext. Preko css2 linka to radi automatski jer browser bira po
     unicode-range. Pri naivnom self-hostu latin-ext fajla, "dj" pada na
     sistemski fallback i vidno odskace u recima "predskolska", "djacka uzina",
     "djuvec". Zato UNICODES ispod eksplicitno ukljucuje U+0110-0111.

Varijabilni fontovi se INSTANCIRAJU (osa se pinuje) umesto da se nose sve ose:
  - Fraunces: opsz i wght se pinuju, SOFT=0 i WONK=0 trajno.
    WONK unosi sum u tekst sa dijakriticima i gura ton ka decijem, sto je
    pogresna publika — odlucuje direktor ustanove.
  - Archivo: wdth=100, wght se pinuje.

Pokretanje:  python tools/build-fonts.py

Izlaz: assets/fonts/*.woff2 . Pokrece se samo ako se menjaju fontovi —
vec izgradjeni fajlovi su u repozitorijumu.
"""

from __future__ import annotations

import io
import sys

# Windows konzola je podrazumevano cp1252 i puca na "Č" pri ispisu.
# Bez ovoga skripta uspesno izgradi fontove pa padne na poslednjem print-u.
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    sys.stderr.reconfigure(encoding="utf-8", errors="replace")
import urllib.request
import zipfile
from dataclasses import dataclass
from pathlib import Path

from fontTools import subset
from fontTools.ttLib import TTFont
from fontTools.varLib.instancer import instantiateVariableFont

OUT_DIR = Path(__file__).resolve().parent.parent / "assets" / "fonts"
CACHE_DIR = Path(__file__).resolve().parent / ".font-cache"

# latin + latin-ext + eksplicitno Dj/dj + interpunkcija i jedinice koje
# sajt stvarno koristi (mikro-znak zbog kolone "A (ug)" u nutritivnoj tabeli).
UNICODES = ",".join(
    [
        "U+0000-00FF",  # latin
        "U+0100-017F",  # latin extended-A (uklj. U+0110-0111 Dj/dj)
        "U+0180-024F",  # latin extended-B
        "U+02BB-02BC",
        "U+2000-206F",  # opsta interpunkcija: - -- ' ' " " ...
        "U+2070-209F",
        "U+20A0-20BF",  # valute
        "U+2113",
        "U+2122",
        "U+2190-2193",  # strelice
        "U+00B0",  # stepen
        "U+00B5",  # mikro (ug)
        "U+00D7",
        "U+2212",
        "U+25CF",
        "U+2022",  # bullet
    ]
)

GITHUB = "https://github.com"


@dataclass(frozen=True)
class FontSpec:
    """Jedno lice koje zavrsava kao jedan woff2 fajl."""

    out_name: str
    zip_url: str
    member: str
    axes: dict[str, float]


SPECS: list[FontSpec] = [
    FontSpec(
        out_name="fraunces-700.woff2",
        zip_url=f"{GITHUB}/google/fonts/raw/main/ofl/fraunces/Fraunces%5BSOFT%2CWONK%2Copsz%2Cwght%5D.ttf",
        member="",
        axes={"opsz": 144, "wght": 700, "SOFT": 0, "WONK": 0},
    ),
    FontSpec(
        out_name="fraunces-400.woff2",
        zip_url=f"{GITHUB}/google/fonts/raw/main/ofl/fraunces/Fraunces%5BSOFT%2CWONK%2Copsz%2Cwght%5D.ttf",
        member="",
        axes={"opsz": 72, "wght": 400, "SOFT": 0, "WONK": 0},
    ),
    FontSpec(
        out_name="archivo-400.woff2",
        zip_url=f"{GITHUB}/google/fonts/raw/main/ofl/archivo/Archivo%5Bwdth%2Cwght%5D.ttf",
        member="",
        axes={"wdth": 100, "wght": 400},
    ),
    FontSpec(
        out_name="archivo-600.woff2",
        zip_url=f"{GITHUB}/google/fonts/raw/main/ofl/archivo/Archivo%5Bwdth%2Cwght%5D.ttf",
        member="",
        axes={"wdth": 100, "wght": 600},
    ),
    FontSpec(
        out_name="plex-mono-400.woff2",
        zip_url=f"{GITHUB}/google/fonts/raw/main/ofl/ibmplexmono/IBMPlexMono-Regular.ttf",
        member="",
        axes={},
    ),
    FontSpec(
        out_name="plex-mono-600.woff2",
        zip_url=f"{GITHUB}/google/fonts/raw/main/ofl/ibmplexmono/IBMPlexMono-SemiBold.ttf",
        member="",
        axes={},
    ),
]

# Znakovi koji MORAJU preziveti subsetovanje. Ako ijedan nedostaje, build pada
# glasno umesto da se problem otkrije na produkciji.
REQUIRED = "ČčĆćŠšŽžĐđ°µ–—„“”’•"


def fetch(url: str) -> bytes:
    """Preuzima fajl, sa lokalnim kesom da ponovni build ne ide na mrezu."""
    CACHE_DIR.mkdir(parents=True, exist_ok=True)
    cached = CACHE_DIR / url.rsplit("/", 1)[-1]
    if cached.exists():
        return cached.read_bytes()

    req = urllib.request.Request(url, headers={"User-Agent": "drcooker-build/1.0"})
    with urllib.request.urlopen(req, timeout=60) as resp:  # noqa: S310 - fiksni github URL-ovi
        data = resp.read()
    cached.write_bytes(data)
    return data


def load_font(spec: FontSpec) -> TTFont:
    raw = fetch(spec.zip_url)
    if spec.member:
        with zipfile.ZipFile(io.BytesIO(raw)) as zf:
            raw = zf.read(spec.member)
    return TTFont(io.BytesIO(raw))


def verify(font: TTFont, name: str) -> None:
    """Proverava da su srpski dijakritici stvarno u cmap tabeli."""
    cmap: set[int] = set()
    for table in font["cmap"].tables:
        cmap.update(table.cmap.keys())

    missing = [c for c in REQUIRED if ord(c) not in cmap]
    if missing:
        raise SystemExit(
            f"GRESKA: {name} nema znakove {''.join(missing)} posle subsetovanja. "
            "Proveri UNICODES — najverovatnije nedostaje U+0110-0111 (Dj/dj)."
        )


def build(spec: FontSpec) -> int:
    font = load_font(spec)

    if spec.axes and "fvar" in font:
        font = instantiateVariableFont(font, spec.axes, inplace=False, updateFontNames=False)

    options = subset.Options()
    options.flavor = "woff2"
    options.with_zopfli = True
    options.desubroutinize = True
    options.layout_features = ["kern", "liga", "tnum", "lnum", "calt", "ccmp", "locl", "mark", "mkmk"]
    options.name_IDs = ["*"]
    options.name_legacy = False
    options.notdef_outline = False
    options.recalc_bounds = True
    options.drop_tables += ["DSIG"]

    subsetter = subset.Subsetter(options=options)
    subsetter.populate(unicodes=subset.parse_unicodes(UNICODES))
    subsetter.subset(font)

    verify(font, spec.out_name)

    OUT_DIR.mkdir(parents=True, exist_ok=True)
    out = OUT_DIR / spec.out_name
    font.flavor = "woff2"
    font.save(out)
    font.close()
    return out.stat().st_size


def main() -> int:
    total = 0
    for spec in SPECS:
        try:
            size = build(spec)
        except Exception as exc:  # noqa: BLE001 - build skripta, poruka je vaznija od tipa
            print(f"  PAO  {spec.out_name}: {exc}", file=sys.stderr)
            return 1
        total += size
        print(f"  OK   {spec.out_name:22s} {size / 1024:7.1f} KB")

    print(f"\nUkupno: {total / 1024:.1f} KB u {OUT_DIR}")
    print(f"Provereni znakovi u svakom licu: {REQUIRED}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
