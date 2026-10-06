"""Pravi `dist/`: samo ono sto sajt stvarno servira.

    python tools/build-dist.py

ZASTO POSTOJI
Folder `drcooker-web` je radni folder, ne sajt. U njemu stoje i:
    docs/       DELIVERY.md, OTVORENO.md, klijentov popunjen .docx
    backend/    izvor Apps Script aplikacije
    emails/     sabloni mejlova
    tools/      sve skripte
    .claude/, .gitignore, README.md, start.cmd
Ako se taj folder objavi kao sajt, sve to je javno dostupno preko URL-a.
`docs/OTVORENO.md` posebno: tamo su interne beleske o protivrecnostima u
klijentovim tvrdnjama.

Zato bela lista: kopira se samo ono sto je navedeno, a sve ostalo ne ulazi
ni slucajno kada se u radni folder doda nov fajl.

PROVERA
Bela lista koja tiho ispusti referenciran fajl daje polomljen sajt, a to se
vidi tek u browseru. Zato se posle kopiranja svaka referenca iz HTML-a trazi
u `dist/`, i skripta pada ako neka fali.
"""

from __future__ import annotations

import re
import shutil
import sys
from pathlib import Path
from urllib.parse import unquote, urlparse

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

KOREN = Path(__file__).resolve().parent.parent
DIST = KOREN / "dist"

# Sve sto sajt servira. Folderi i pojedinacni fajlovi.
BELA_LISTA = [
    "index.html",
    "404.html",
    "pages",
    "css",
    "js",
    "assets",
    "favicon.ico",
    "site.webmanifest",
    "robots.txt",
    "sitemap.xml",
    "_redirects",
]

# Adresa za pregled ne sme u pretragu: `canonical` pokazuje na pravi domen,
# pa bi indeksiranje napravilo drugu kopiju istog sadrzaja. Pred objavu na
# pravom domenu ovaj red se brise.
HEADERS = "/*\n  X-Robots-Tag: noindex, nofollow\n"


def ocisti() -> None:
    if DIST.exists():
        shutil.rmtree(DIST)
    DIST.mkdir(parents=True)


def kopiraj() -> int:
    n = 0
    for ime in BELA_LISTA:
        izvor = KOREN / ime
        if not izvor.exists():
            raise SystemExit(f"bela lista navodi '{ime}', a toga nema u projektu")
        cilj = DIST / ime
        if izvor.is_dir():
            shutil.copytree(izvor, cilj)
            n += sum(1 for _ in cilj.rglob("*") if _.is_file())
        else:
            shutil.copy2(izvor, cilj)
            n += 1
    (DIST / "_headers").write_text(HEADERS, encoding="utf-8")
    return n + 1


REF = re.compile(r'(?:href|src)="([^"#?]+)"')


def proveri() -> list[str]:
    """Svaka lokalna referenca iz HTML-a mora da postoji u `dist`."""
    fale: list[str] = []
    for stranica in DIST.rglob("*.html"):
        html = stranica.read_text(encoding="utf-8")
        for ref in REF.findall(html):
            if ref.startswith(("http://", "https://", "//", "mailto:", "tel:", "data:")):
                continue
            put = unquote(urlparse(ref).path)
            if not put:
                continue
            cilj = (DIST / put.lstrip("/")) if put.startswith("/") else (stranica.parent / put)
            if not cilj.resolve().exists():
                fale.append(f"{stranica.relative_to(DIST).as_posix()} -> {ref}")
    return fale


def main() -> None:
    ocisti()
    broj = kopiraj()
    fale = proveri()

    print(f"dist: {broj} fajlova, {len(list(DIST.rglob('*.html')))} stranica")
    izostavljeno = sorted(
        p.name for p in KOREN.iterdir()
        if p.name not in BELA_LISTA and p.name not in ("dist", ".git")
    )
    print(f"nije objavljeno: {', '.join(izostavljeno)}")

    if fale:
        for f in fale[:10]:
            print(f"  FALI  {f}")
        raise SystemExit(f"\n{len(fale)} referenci pokazuje van dist-a, sajt bi bio polomljen")
    print("sve reference iz HTML-a pokazuju unutar dist-a")


main()
