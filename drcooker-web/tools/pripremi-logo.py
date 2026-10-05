"""Priprema zajednicki logotip Sinko i Dr Cooker za sajt.

Klijent je poslao PNG 450x160 bez providnosti, na beloj podlozi. Podloga
sajta je krem `#faf7f2`, pa bi se beo pravougaonik video kao svetlija ploca.

ZASTO FLOOD FILL, A NE GLOBALNO UKLANJANJE BELE
Natpis „SINKO" je BEO na crvenoj podlozi, i korpa ima bele delove. Globalno
uklanjanje bele boje bi probusilo sam logotip. Zato se puni samo ono sto je
povezano sa ivicom slike: to je podloga i nista drugo.

Ivice se ne seku naglo. Piksel koji je delimicno beo, a dodiruje popunjenu
podlogu, dobija delimicnu providnost srazmerno tome koliko je blizu beloj.
Bez toga logotip dobija beo oreol na krem podlozi.
"""

from __future__ import annotations

import sys
from collections import deque
from pathlib import Path

from PIL import Image

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

IZVOR = Path(
    r"C:\Users\PC\AppData\Local\Temp\claude"
    r"\C--Users-PC-Desktop-CCX-Template\e37c8bc4-527a-4d1d-befb-a7f0143b9dae"
    r"\images\1.png"
)
KOREN = Path(r"C:\Users\PC\Desktop\Klijenti\Dr Cooker\drcooker-web")
IZLAZ = KOREN / "assets" / "images" / "sinko-drcooker-logo.webp"

PRAG_PODLOGE = 238  # iznad ovoga se piksel smatra podlogom pri sirenju
PRAG_IVICE = 200    # ispod ovoga je sigurno logotip, alfa ostaje puna


def pripremi() -> None:
    im = Image.open(IZVOR).convert("RGBA")
    sir, vis = im.size
    piks = im.load()

    podloga = bytearray(sir * vis)          # 1 = pripada podlozi
    red = deque()

    def ubaci(x: int, y: int) -> None:
        i = y * sir + x
        if podloga[i]:
            return
        r, g, b, _ = piks[x, y]
        if min(r, g, b) < PRAG_PODLOGE:
            return
        podloga[i] = 1
        red.append((x, y))

    for x in range(sir):
        ubaci(x, 0)
        ubaci(x, vis - 1)
    for y in range(vis):
        ubaci(0, y)
        ubaci(sir - 1, y)

    while red:
        x, y = red.popleft()
        for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            nx, ny = x + dx, y + dy
            if 0 <= nx < sir and 0 <= ny < vis:
                ubaci(nx, ny)

    # Delimicna providnost na prelazu: piksel koji NIJE podloga, ali dodiruje
    # podlogu i svetao je, dobija alfu po tome koliko je taman.
    prozirnih = meki = 0
    for y in range(vis):
        for x in range(sir):
            i = y * sir + x
            r, g, b, _ = piks[x, y]
            if podloga[i]:
                piks[x, y] = (r, g, b, 0)
                prozirnih += 1
                continue
            dodiruje = any(
                podloga[(y + dy) * sir + (x + dx)]
                for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1))
                if 0 <= x + dx < sir and 0 <= y + dy < vis
            )
            if not dodiruje:
                continue
            svetlina = min(r, g, b)
            if svetlina <= PRAG_IVICE:
                continue
            # 255 na pragu ivice, 0 na punoj beloj
            raspon = max(1, 255 - PRAG_IVICE)
            a = int(255 * (255 - svetlina) / raspon)
            piks[x, y] = (r, g, b, max(0, min(255, a)))
            meki += 1

    im.save(IZLAZ, "WEBP", quality=92, method=6, lossless=False)

    ukupno = sir * vis
    print(f"ulaz    : {IZVOR.name}  {sir}x{vis}  {IZVOR.stat().st_size // 1024} KB")
    print(f"izlaz   : {IZLAZ.relative_to(KOREN).as_posix()}  "
          f"{IZLAZ.stat().st_size // 1024} KB")
    print(f"podloga : {prozirnih} piksela providno ({prozirnih * 100 // ukupno}%)")
    print(f"prelaz  : {meki} piksela delimicno providno")

    # Kontrola: da li je unutrasnjost logotipa ostala puna?
    prov = Image.open(IZLAZ).convert("RGBA")
    a = prov.getchannel("A")
    punih = sum(1 for v in a.getdata() if v == 255)
    print(f"provera : {punih} piksela pune alfe ({punih * 100 // ukupno}% slike je logotip)")


pripremi()
