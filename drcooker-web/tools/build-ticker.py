"""Gradi traku sa imenima jela i ubacuje je u naslovnu.

Imena se citaju iz pages/nedeljni-jelovnik.html — dakle iz objavljenog jelovnika,
ne iz izmisljene liste. Ako se jelovnik promeni, pokrene se ova skripta ponovo.

Traka postoji zato sto firma nema nijednu pravu fotografiju hrane. Stvarna
imena jela, postavljena krupno, rade za apetit bolje od stock tanjira — i
istinita su.

    python tools/build-ticker.py
"""

from __future__ import annotations

import html as H
import re
import sys
from pathlib import Path

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

ROOT = Path(__file__).resolve().parent.parent
NL = chr(10)

START = "<!-- #region ticker -->"
END = "<!-- #endregion ticker -->"

# Stavke koje nisu jela nego navigacija ili meta tekst.
NOT_FOOD = (
    "Politika", "Kontakt", "Jelovnik", "Gramature", "Nedeljni", "Vrtići",
    "Kompanije", "Snabdevanje", "Kako", "O nama", "Zatraži", "Dostava",
    "Nutricionista", "Bezbednost", "Početna",
)

# Kratke, samostalne stavke rade najbolje u traci; duge nabrajanja se seku.
def usable(name: str) -> bool:
    if any(b in name for b in NOT_FOOD):
        return False
    if len(name) > 46 or len(name) < 4:
        return False
    return True


src = (ROOT / "pages/nedeljni-jelovnik.html").read_text(encoding="utf-8")
raw = [H.unescape(x).strip() for x in re.findall(r"<li>([^<]{4,70})</li>", src)]

seen: set[str] = set()
dishes: list[str] = []
for item in raw:
    # „Salata, hleb" -> dve stavke; traka je ritmicnija sa kratkim imenima
    for part in re.split(r",\s+", item):
        part = part.strip().rstrip(".")
        if not usable(part):
            continue
        key = part.lower()
        if key in seen:
            continue
        seen.add(key)
        dishes.append(part)

if len(dishes) < 12:
    raise SystemExit(f"Premalo jela za traku: {len(dishes)}")

# Duzina trake: previse stavki znaci dugu petlju i veliki DOM.
dishes = dishes[:34]

items = NL.join(
    f'          <span class="ticker__item">{H.escape(d)}</span>' for d in dishes
)

# Dugme za zaustavljanje je obavezno: WCAG 2.2.2 (nivo A) trazi mehanizam
# kojim korisnik zaustavlja sadrzaj koji se sam pokrece i traje duze od 5s.
# Pauza na hover nije dovoljna — ne postoji za tastaturu ni za dodir.
block = f"""{START}
    <section class="ticker" aria-label="Jela sa objavljenog jelovnika">
      <div class="ticker__track">
        <div class="ticker__group">
{items}
        </div>
      </div>
      <button type="button" class="ticker__stop" data-ticker-toggle aria-pressed="false">
        <span data-ticker-label>Zaustavi traku</span>
      </button>
    </section>
    {END}"""

index = ROOT / "index.html"
html = index.read_text(encoding="utf-8")

if START in html and END in html:
    i, j = html.index(START), html.index(END) + len(END)
    html = html[:i] + block + html[j:]
    action = "azurirana"
else:
    # Odmah posle heroja: prvo sto se vidi po ulasku, umesto fotografije.
    m = re.search(r'<section class="hero[^"]*">.*?</section>', html, re.S)
    if not m:
        raise SystemExit("Nije pronadjen hero u index.html")
    html = html[: m.end()] + NL + NL + "    " + block + html[m.end() :]
    action = "ubacena"

index.write_text(html, encoding="utf-8")

print(f"Traka {action} u index.html")
print(f"Jela u traci: {len(dishes)}")
print("Prvih 6: " + " · ".join(dishes[:6]))
