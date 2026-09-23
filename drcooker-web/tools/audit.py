"""Finalna provera statickog sajta.

    python tools/audit.py

Proverava ono sto se najlakse polomi kada projekat raste:
  - reference (CSS, JS, slike, fontovi, interne stranice, #ankeri)
  - ostatke prethodnog frameworka
  - strukturu HTML-a (jedan <h1>, hijerarhija naslova, alt, title na iframe)
  - SEO (title, description, canonical, OG, lang, validan JSON-LD)
  - duplirane id-eve i mrtve linkove
  - zabranjeni CSS i tragove debagovanja
  - da zaglavlje i podnozje odgovaraju partial fajlovima

Izlazni kod 1 ako ima greske. Nema nijednu zavisnost.
"""

from __future__ import annotations

import json
import re
import sys
from pathlib import Path
from urllib.parse import unquote

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

ROOT = Path(__file__).resolve().parent.parent
NL = chr(10)

errors: list[tuple[str, str]] = []
warns: list[tuple[str, str]] = []


def err(f: str, m: str) -> None:
    errors.append((f, m))


def warn(f: str, m: str) -> None:
    warns.append((f, m))


# ---------------------------------------------------------------------------
#  Skup stranica
# ---------------------------------------------------------------------------

pages = [ROOT / "index.html", ROOT / "404.html"] + sorted((ROOT / "pages").glob("*.html"))
pages = [p for p in pages if p.exists()]

REF_RE = re.compile(r'(?:href|src)="([^"]+)"')
ID_RE = re.compile(r'\sid="([^"]+)"')
CSS_URL_RE = re.compile(r'url\(\s*[\'"]?([^\'")]+)[\'"]?\s*\)')


def external(u: str) -> bool:
    return u.startswith(("http://", "https://", "mailto:", "tel:", "data:", "//"))


def strip_noise(html: str) -> str:
    return re.sub(r"<(script|style)[\s\S]*?</\1>", "", html)


# ---------------------------------------------------------------------------
#  Po stranici
# ---------------------------------------------------------------------------

for f in pages:
    rel = f.relative_to(ROOT).as_posix()
    html = f.read_text(encoding="utf-8")
    body = strip_noise(html)
    ids = ID_RE.findall(html)
    is404 = rel == "404.html"

    # --- uparenost tagova ---
    #
    # Browser cuti na visku </span>: samo ga odbaci i stranica izgleda ispravno.
    # Zato se takva greska preziveti moze mesecima. Desila se pri zameni
    # tipografskog wordmarka slikom logotipa — ostao je zatvarac unutrasnjeg
    # elementa koji vise ne postoji.
    #
    # Ne broji se cela gramatika HTML-a, samo kontejneri u kojima se greska
    # zaista pravi rucnom izmenom.
    for tag in ("span", "div", "section", "article", "nav", "ul", "li", "p", "figure"):
        otvoreno = len(re.findall(rf"<{tag}\b", body))
        zatvoreno = len(re.findall(rf"</{tag}>", body))
        if otvoreno != zatvoreno:
            err(rel, f"<{tag}> nije uparen: {otvoreno} otvorenih, {zatvoreno} zatvorenih")

    # --- ostaci prethodnog frameworka ---
    for trace, label in (
        ("data-astro-cid", "Astro scoping atribut"),
        ("_astro/", "Astro asset putanja"),
        ("astro-island", "Astro island"),
        ("<astro-", "Astro element"),
    ):
        if trace in html:
            err(rel, f"ostatak prethodnog frameworka: {label}")

    # --- apsolutne putanje (lome se kada sajt stoji u podfolderu) ---
    #
    # 404.html je obrnut slucaj i jedini izuzetak: nju server servira za bilo
    # koji nepostojeci URL bez menjanja baze dokumenta, pa bi RELATIVNA
    # putanja za /ponuda-hrane/nesto trazila /ponuda-hrane/css/base.css.
    # Tamo se apsolutne traze, i proveravaju od korena projekta.
    for m in re.findall(r'(?:href|src)="(/[^/"][^"]*)"', html):
        if is404:
            meta = ROOT / m.lstrip("/").split("#")[0].split("?")[0]
            if not meta.exists():
                err(rel, f"apsolutna putanja ne postoji: {m}")
        else:
            err(rel, f"apsolutna putanja: {m}")

    if is404:
        for m in re.findall(r'(?:href|src)="(?!https?:|//|#|mailto:|tel:|data:|/)([^"]+)"', html):
            err(rel, f"404 mora koristiti putanju od korena, nadjeno: {m}")

    # --- reference ---
    for raw in REF_RE.findall(html):
        u = raw.strip()
        if not u or external(u):
            continue
        if u.startswith("#"):
            if unquote(u[1:]) not in ids:
                err(rel, f"anker bez cilja: {u}")
            continue
        path, _, frag = u.partition("#")
        if not path:
            continue
        # Putanja koja pocinje / racuna se od korena sajta, ne od fajla.
        # To koristi samo 404.html (vidi pravilo iznad).
        if path.startswith("/"):
            target = (ROOT / unquote(path.lstrip("/"))).resolve()
        else:
            target = (f.parent / unquote(path)).resolve()
        if not target.exists():
            err(rel, f"ne postoji: {raw}")
        elif frag and target.suffix == ".html":
            if frag not in ID_RE.findall(target.read_text(encoding="utf-8")):
                err(rel, f"{raw}: ciljna stranica nema #{frag}")

    # --- <head> ---
    title = re.search(r"<title>([\s\S]*?)</title>", html)
    if not title or not title.group(1).strip():
        err(rel, "nema <title>")
    elif len(title.group(1).strip()) > 65:
        warn(rel, f"title {len(title.group(1).strip())} znakova")

    desc = re.search(r'<meta name="description" content="([^"]*)"', html)
    if not desc or not desc.group(1).strip():
        err(rel, "nema meta description")
    elif len(desc.group(1)) > 160:
        err(rel, f"meta description {len(desc.group(1))} znakova (max 155)")

    for need, label in (
        (r'property="og:title"', "og:title"),
        (r'property="og:image"', "og:image"),
        (r'name="viewport"', "viewport"),
        (r"<html[^>]+lang=", "lang na <html>"),
    ):
        if not re.search(need, html):
            err(rel, f"nema {label}")

    # canonical i noindex su protivrecni signali: canonical kaze „ovo je
    # kanonska verzija, indeksiraj je", noindex kaze „ne indeksiraj".
    # Google trazi da se ne kombinuju — u praksi zna da poslusa canonical i
    # ignorise noindex, pa stranica zavrsi u indeksu iako ne treba.
    noindex = bool(re.search(r'name="robots"[^>]*content="[^"]*noindex', html))
    has_canonical = bool(re.search(r'rel="canonical"', html))

    if noindex and has_canonical:
        err(rel, "canonical na stranici sa noindex — protivrecni signali")
    elif not noindex and not has_canonical:
        err(rel, "nema canonical")

    for m in re.findall(r'<script type="application/ld\+json"[^>]*>([\s\S]*?)</script>', html):
        try:
            json.loads(m)
        except json.JSONDecodeError as e:
            err(rel, f"JSON-LD nije validan: {e}")

    # --- naslovi ---
    heads = [(int(m.group(2)), re.sub(r"<[^>]+>", "", m.group(3)).strip()[:40])
             for m in re.finditer(r"<(h([1-6]))\b[^>]*>([\s\S]*?)</\1>", body)]
    h1s = [h for h in heads if h[0] == 1]
    if len(h1s) == 0:
        err(rel, "nema <h1>")
    elif len(h1s) > 1:
        err(rel, f"{len(h1s)} elemenata <h1>")

    prev = 0
    for lvl, txt in heads:
        if prev and lvl > prev + 1:
            err(rel, f"preskocen nivo naslova h{prev} -> h{lvl} ({txt})")
        prev = lvl

    # --- slike, iframe, dugmad, tabele ---
    for tag in re.findall(r"<img[^>]*>", body):
        if "alt=" not in tag:
            err(rel, f"<img> bez alt: {tag[:70]}")
    for tag in re.findall(r"<iframe[^>]*>", body):
        if "title=" not in tag:
            err(rel, "<iframe> bez title")
        if 'loading="lazy"' not in tag:
            warn(rel, "<iframe> bez loading=lazy")
    for m in re.finditer(r"<button\b([^>]*)>([\s\S]*?)</button>", body):
        if not re.sub(r"<[^>]+>", "", m.group(2)).strip() and "aria-label=" not in m.group(1):
            err(rel, "dugme bez pristupacnog imena")
    for t in re.findall(r"<table[\s\S]*?</table>", body):
        if "<th" not in t:
            err(rel, "tabela bez <th>")
        elif "scope=" not in t:
            warn(rel, "tabela sa <th> bez scope")
        if "<caption" not in t:
            warn(rel, "tabela bez <caption>")

    # --- duplirani id ---
    seen: set[str] = set()
    for i in ids:
        if i in seen:
            err(rel, f"dupliran id={i}")
        seen.add(i)

    # --- ostaci u produkciji ---
    if re.search(r"\bTODO\b", body):
        warn(rel, "vidljiv TODO u sadrzaju")
    if re.search(r"lorem ipsum", body, re.I):
        err(rel, "lorem ipsum")
    if re.search(r"undefined|\[object Object\]", body):
        err(rel, "renderovano undefined / [object Object]")
    if re.search(r"\{\{[A-Z_]+\}\}", body):
        err(rel, "nepopunjen {{PLACEHOLDER}}")

    # --- redosled stylesheet-ova ---
    css_order = re.findall(r'<link rel="stylesheet" href="[^"]*css/([a-z]+)\.css"', html)
    expected = ["base", "components", "layout", "pages", "motion", "print"]
    if css_order != expected:
        err(rel, f"redosled CSS-a: {css_order} umesto {expected}")

    # --- skripte ---
    js_order = re.findall(r'<script src="[^"]*js/([a-z]+)\.js"></script>', html)
    if js_order != ["config", "api", "forms", "main", "motion"]:
        err(rel, f"redosled JS-a: {js_order}")
    if 'type="module"' in html:
        err(rel, 'type="module" ne radi kada se stranica otvori sa diska (file://)')

    # --- markeri za partial ---
    for marker in ("#region header", "#endregion header", "#region footer", "#endregion footer"):
        if marker not in html:
            err(rel, f"nema marker {marker}")

    if not is404 and rel != "index.html" and "<body class=\"page-" not in html:
        err(rel, "nema klasu page-* na <body>")

# ---------------------------------------------------------------------------
#  CSS
# ---------------------------------------------------------------------------

css_files = sorted((ROOT / "css").glob("*.css"))
for f in css_files:
    rel = f.relative_to(ROOT).as_posix()
    css = f.read_text(encoding="utf-8")

    # --- uparenost komentara i zagrada ---
    #
    # Nezatvoren `/*` je najtisa greska u CSS-u: parser proguta sve do sledeceg
    # `*/`, pravila izmedju nestanu, a fajl i dalje izgleda ispravno u editoru
    # i prolazi svaku proveru zasnovanu na zagradama. Tako je jednom vec nestalo
    # pravilo koje nosi WCAG metu za dodir od 44px na sedam klasa.
    otvoreni, zatvoreni = css.count("/*"), css.count("*/")
    if otvoreni != zatvoreni:
        err(rel, f"komentari nisu upareni: {otvoreni}x /* prema {zatvoreni}x */")

    if css.count("{") != css.count("}"):
        err(rel, f"viticaste zagrade nisu uparene: {css.count('{')} prema {css.count('}')}")

    # `url()` unutar data: URI-ja (npr. filter='url(%23n)' u ugradjenom SVG-u)
    # nije referenca na fajl. Zato se data: URI-ji prvo uklone.
    #
    # Dva izraza umesto jednog sa backreference-om: `[^)]*` bi stao na prvu
    # zagradu, a ona je unutar SVG-a.
    scan = re.sub(r'url\(\s*"data:[^"]*"\s*\)', 'url(data:)', css)
    scan = re.sub(r"url\(\s*'data:[^']*'\s*\)", 'url(data:)', scan)

    for raw in CSS_URL_RE.findall(scan):
        if raw.startswith("data:"):
            continue
        if not external(raw) and not (f.parent / raw).resolve().exists():
            err(rel, f"url() ne postoji: {raw}")

    # `!important` je opravdan na tacno cetiri mesta: kada gasimo animacije zbog
    # prefers-reduced-motion, u stilu za stampu, na .visually-hidden i na
    # `[hidden]` (atribut mora da pobedi autorski `display`, vidi css/base.css).
    # Svako drugo koriscenje je znak da specificnost negde nije u redu.
    #
    # Komentari se prvo uklanjaju: objasnjenje koje pominje `!important` nije
    # upotreba `!important`.
    bare = re.sub(r"/\*.*?\*/", "", css, flags=re.S)

    legit = 0
    for m in re.finditer(r"@media[^{]*(prefers-reduced-motion|print)[^{]*\{", bare):
        depth, i = 1, m.end()
        while i < len(bare) and depth:
            if bare[i] == "{":
                depth += 1
            elif bare[i] == "}":
                depth -= 1
            i += 1
        legit += bare[m.end() : i].count("!important")
    for m in re.finditer(r"\.visually-hidden[^{]*\{([^}]*)\}", bare):
        legit += m.group(1).count("!important")
    for m in re.finditer(r"\[hidden\][^{]*\{([^}]*)\}", bare):
        legit += m.group(1).count("!important")

    total = bare.count("!important")
    if total > legit:
        warn(rel, f"!important van opravdanog konteksta ({total - legit}x)")
    if re.search(r"box-shadow:\s*(?!none)", css):
        warn(rel, "box-shadow — sistem ga ne koristi")
    # Horizontalni scroll je zabranjen NA DOKUMENTU. Jedini izuzetak je
    # `.table-scroll`: tabela koju je nemoguce suziti dobija svoj pomeraj,
    # umesto da prelije celu stranicu.
    for m in re.finditer(r"([^{}]*)\{[^}]*overflow-x:\s*(auto|scroll)", css):
        if ".table-scroll" in m.group(1):
            continue
        err(rel, f"overflow-x: {m.group(2)} van .table-scroll — zabranjeno")
    if "astro" in css:
        err(rel, "ostatak Astro scopinga")

# Atribut `hidden` mora globalno da pobedi.
#
# Browserov `[hidden] { display: none }` zivi u user-agent sloju i gubi od BILO
# KOG autorskog pravila koje postavi `display`. Bez globalnog pravila su se
# panel „Upit je poslat" i panel „Upit nije poslat" videli istovremeno.
# Ako ovo pravilo nestane, greska se vraca tiho — zato je provera ovde.
base = (ROOT / "css/base.css").read_text(encoding="utf-8")
if not re.search(r"\[hidden\][^{]*\{[^}]*display:\s*none\s*!important", base):
    err("css/base.css", "nema [hidden] { display: none !important } — atribut hidden nece raditi")

# Animacija heroja MORA da stoji iza klase `js-on`.
#
# Sve sto krije sadrzaj radi preko `animation` sa `fill-mode: backwards`.
# Ako vremenska linija animacije ne krene — a ne krene kada dokument nije
# iscrtan, npr. u pozadinskoj kartici — takav element ostaje na opacity 0
# ZAUVEK. Izmereno: document.timeline.currentTime === null i animacija
# zaglavljena na currentTime 0 i posle 4 sekunde.
#
# Klasu `js-on` dodaje js/motion.js tek kada je stranica stvarno vidljiva.
# Bez nje nema skrivanja, pa je najgori ishod sajt bez animacije.
motion = (ROOT / "css/motion.css").read_text(encoding="utf-8")
bez_komentara = re.sub(r"/\*.*?\*/", "", motion, flags=re.S)

for blok in re.finditer(r"([^{}]+)\{([^}]*)\}", bez_komentara):
    selektori, telo = blok.group(1), blok.group(2)
    # Zanima nas samo pravilo koje POKRECE animaciju. Blok u
    # prefers-reduced-motion je gasi sa `animation: none` i on je ispravan.
    vrednosti = re.findall(r"animation(?:-name)?\s*:\s*([^;}]*)", telo)
    if not any(not v.strip().startswith("none") for v in vrednosti):
        continue
    for sel in selektori.split(","):
        sel = sel.strip()
        if not sel or ".hero" not in sel:
            continue
        if sel.startswith(".js-on"):
            continue
        err("css/motion.css", f"animacija heroja van .js-on: {sel}")

# site.webmanifest: putanje su apsolutne od korena sajta.
#
# Ovo je promaklo jednom vec: manifest je pokazivao na /favicon.svg i
# /apple-touch-icon.png, a fajlovi zive u /assets/icons/. Oba su vracala 404
# u produkciji, pa Android nije imao ikonicu pri dodavanju na pocetni ekran.
manifest_path = ROOT / "site.webmanifest"
if not manifest_path.exists():
    err("site.webmanifest", "nedostaje")
else:
    try:
        manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    except json.JSONDecodeError as exc:
        err("site.webmanifest", f"neispravan JSON: {exc}")
        manifest = {}

    for icon in manifest.get("icons", []):
        src = icon.get("src", "")
        if not src.startswith("/"):
            err("site.webmanifest", f"putanja nije apsolutna: {src}")
            continue
        if not (ROOT / src.lstrip("/")).exists():
            err("site.webmanifest", f"ikonica ne postoji: {src}")

    start = manifest.get("start_url", "")
    if start and start != "/" and not (ROOT / start.lstrip("/")).exists():
        err("site.webmanifest", f"start_url ne postoji: {start}")

# nedefinisani tokeni
defined: set[str] = set()
for f in css_files:
    defined |= set(re.findall(r"^\s*(--[a-z0-9-]+)\s*:", f.read_text(encoding="utf-8"), re.M))
for f in css_files:
    rel = f.relative_to(ROOT).as_posix()
    for tok, nxt in re.findall(r"var\((--[a-z0-9-]+)\s*([,)])", f.read_text(encoding="utf-8")):
        if nxt == ")" and tok not in defined:
            err(rel, f"nedefinisan token {tok}")

# ---------------------------------------------------------------------------
#  JS
# ---------------------------------------------------------------------------

for f in sorted((ROOT / "js").glob("*.js")):
    rel = f.relative_to(ROOT).as_posix()
    js = f.read_text(encoding="utf-8")
    if re.search(r"^\s*(import|export)\s", js, re.M):
        err(rel, "ES modul — ne radi kada se stranica otvori sa diska (file://)")
    if "debugger" in js:
        err(rel, "ostavljen debugger")
    if "fetch(" in js and f.name != "api.js":
        err(rel, "direktan fetch() — komunikacija sa backendom ide kroz js/api.js")
    for m in re.finditer(r"console\.(log|debug)\s*\(", js):
        warn(rel, f"console.{m.group(1)} u produkcijskom kodu")

# ---------------------------------------------------------------------------
#  Fajlovi koji moraju postojati
# ---------------------------------------------------------------------------

for must in (
    "index.html", "404.html", "README.md", "start.cmd",
    "robots.txt", "sitemap.xml", "_redirects", "favicon.ico", "site.webmanifest",
    "js/config.js", "js/api.js", "js/forms.js", "js/main.js",
    "css/base.css", "css/components.css", "css/layout.css",
    "css/pages.css", "css/motion.css", "css/print.css",
    "backend/apps-script/Code.gs", "backend/apps-script/Templates.gs",
    "emails/templates/_layout.html", "emails/preview/admin.html",
    "docs/DELIVERY.md", "docs/DEPLOY.md", "docs/Dr-Cooker-upitnik.docx",
    "tools/partials/header.html", "tools/partials/footer.html",
):
    if not (ROOT / must).exists():
        err(must, "nedostaje")

# konfiguracija mora imati mesto za Apps Script URL
cfg = (ROOT / "js/config.js").read_text(encoding="utf-8")
if "GOOGLE_APPS_SCRIPT_URL" not in cfg:
    err("js/config.js", "nema GOOGLE_APPS_SCRIPT_URL")
if "RECIPIENT_EMAIL" not in cfg:
    err("js/config.js", "nema RECIPIENT_EMAIL")

# ---------------------------------------------------------------------------
#  Izvestaj
# ---------------------------------------------------------------------------

def block(title: str, items: list[tuple[str, str]]) -> None:
    if not items:
        return
    print(NL + title)
    cur = None
    for f, m in items:
        if f != cur:
            print(f"  {f}")
            cur = f
        print(f"      {m}")


block("GRESKE", errors)
block("UPOZORENJA", warns)

css_kb = sum(f.stat().st_size for f in css_files) / 1024
js_kb = sum(f.stat().st_size for f in (ROOT / "js").glob("*.js")) / 1024
html_kb = sum(p.stat().st_size for p in pages) / 1024

print(
    NL
    + "-" * 60
    + NL
    + f"Stranica: {len(pages)}   HTML: {html_kb:.0f} KB   "
    + f"CSS: {css_kb:.0f} KB   JS: {js_kb:.0f} KB"
    + NL
    + f"Greske: {len(errors)}   Upozorenja: {len(warns)}"
)

sys.exit(1 if errors else 0)
