"""Ubacuje motion sloj u sve stranice.

  - <script js/motion.js> posle main.js
  - traka napretka odmah posle <body>
  - data-in na delove heroja koji ulaze posle naslova
  - data-split na naslove sekcija, da se otkrivaju red po red

Idempotentno: ponovno pokretanje nista ne duplira.

    python tools/apply-motion.py
"""

from __future__ import annotations

import re
import sys
from pathlib import Path

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

ROOT = Path(__file__).resolve().parent.parent
NL = chr(10)

pages = [ROOT / "index.html", ROOT / "404.html"] + sorted((ROOT / "pages").glob("*.html"))
pages = [p for p in pages if p.exists()]

changed = 0
report: list[str] = []

for f in pages:
    rel = f.relative_to(ROOT).as_posix()
    prefix = "../" if "/" in rel else ""
    html = f.read_text(encoding="utf-8")
    before = html
    acts: list[str] = []

    # --- 1. motion.js posle main.js ---------------------------------------
    if "js/motion.js" not in html:
        main_tag = f'<script src="{prefix}js/main.js"></script>'
        if main_tag in html:
            html = html.replace(
                main_tag,
                main_tag + NL + f'    <script src="{prefix}js/motion.js"></script>',
                1,
            )
            acts.append("motion.js")

    # --- 2. traka napretka -------------------------------------------------
    if 'class="progress"' not in html:
        m = re.search(r"<body[^>]*>", html)
        if m:
            html = (
                html[: m.end()]
                + NL
                + '    <div class="progress" aria-hidden="true"></div>'
                + html[m.end() :]
            )
            acts.append("progress")

    # --- 3. hero: sta ulazi posle naslova ----------------------------------
    hero_m = re.search(r'<section class="hero[^"]*">.*?</section>', html, re.S)
    if hero_m:
        hero = hero_m.group(0)
        new_hero = hero
        n = 0
        # eyebrow, lead i dugmad — naslov se animira kroz split, ne ovde
        for pat in (
            r'(<span class="eyebrow")(?![^>]*data-in)',
            r'(<p class="lead[^"]*")(?![^>]*data-in)',
            r'(<div class="hero__actions")(?![^>]*data-in)',
            r'(<p class="hero__text-2[^"]*")(?![^>]*data-in)',
        ):
            new_hero, k = re.subn(pat, r"\1 data-in", new_hero)
            n += k
        if n:
            html = html.replace(hero, new_hero, 1)
            acts.append(f"hero data-in ×{n}")

    # --- 4. naslovi sekcija: otkrivanje red po red -------------------------
    # .display-2 je naslov sekcije. Naslov u heroju (h1) se vec obradjuje.
    count = 0

    def mark(match: re.Match[str]) -> str:
        global count
        count += 1
        return match.group(1) + " data-split"

    html, count = re.subn(
        r'(<h2 class="display-2"(?![^>]*data-split))',
        r"\1 data-split",
        html,
    )
    if count:
        acts.append(f"data-split ×{count}")

    if html != before:
        f.write_text(html, encoding="utf-8")
        changed += 1
    report.append(f"  {rel:38s} {', '.join(acts) if acts else 'bez izmene'}")

print(NL.join(report))
print(f"{NL}Izmenjeno stranica: {changed} / {len(pages)}")

# --- provera --------------------------------------------------------------
missing = []
for f in pages:
    html = f.read_text(encoding="utf-8")
    rel = f.relative_to(ROOT).as_posix()
    if "js/motion.js" not in html:
        missing.append(f"{rel}: nema motion.js")
    if 'class="progress"' not in html:
        missing.append(f"{rel}: nema traku napretka")
    if html.count("js/motion.js") > 1:
        missing.append(f"{rel}: motion.js ubacen vise puta")

if missing:
    print(NL + "PROBLEMI:")
    for m in missing:
        print("  " + m)
    sys.exit(1)
print("Sve stranice imaju motion sloj, bez duplikata.")
