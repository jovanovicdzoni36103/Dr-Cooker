"""Puni galeriju iz foldera sa fotografijama.

    python tools/build-galeriju.py

KAKO SE KORISTI

    1. Sve fotografije koje klijent posalje ubaci u
       `assets/images/galerija-izvor/`. Format je nebitan: JPG, PNG, HEIC
       sa iPhone-a — sve prolazi. Velicina je nebitna, skripta ih smanjuje.

    2. Opciono, napravi `assets/images/galerija-izvor/opisi.txt` sa po jednim
       redom za svaku sliku:

           kuhinja-01.jpg | Radni deo kuhinje pre pocetka smene
           priprema-02.HEIC | Priprema rucka za vrticki uzrast

       Bez opisa, slika dobija ime fajla kao opis. Opis je i `alt` tekst,
       pa ne sme da bude prazan — citac ekrana ga cita naglas.

    3. Pokreni skriptu. Ona pravi web verzije u `assets/images/galerija/`
       i upisuje mrezu u `pages/galerija.html` izmedju markera.

ZASTO OVAKO

    Fotografija sa telefona je 3–5 MB. Petnaest takvih je 60 MB na jednoj
    stranici — sajt bi bio neupotrebljiv na mobilnom internetu. Skripta pravi
    dve sirine (800 i 1600 px) i pusta browser da izabere manju kad moze.

    Izvorne fotografije OSTAJU u `galerija-izvor/`. Taj folder se NE
    objavljuje — sluzi kao arhiva da se galerija moze ponovo napraviti.
"""

from __future__ import annotations

import sys
from html import escape
from pathlib import Path

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

try:
    from PIL import Image, ImageOps
except ImportError:
    raise SystemExit(
        "Nedostaje Pillow.\n\n    pip install pillow pillow-heif\n\n"
        "pillow-heif je potreban samo za HEIC fotografije sa iPhone-a."
    )

try:  # HEIC sa iPhone-a
    import pillow_heif

    pillow_heif.register_heif_opener()
    HEIC = True
except ImportError:
    HEIC = False

ROOT = Path(__file__).resolve().parent.parent
IZVOR = ROOT / "assets" / "images" / "galerija-izvor"
IZLAZ = ROOT / "assets" / "images" / "galerija"
STRANICA = ROOT / "pages" / "galerija.html"

START = "<!-- #region galerija -->"
END = "<!-- #endregion galerija -->"

SIRINE = (800, 1600)
KVALITET = 82
NL = chr(10)

PODRZANO = {".jpg", ".jpeg", ".png", ".webp", ".heic", ".heif", ".tif", ".tiff"}


def opisi() -> dict[str, str]:
    """Cita `opisi.txt`: `ime fajla | opis`, po jedan red."""
    put = IZVOR / "opisi.txt"
    if not put.exists():
        return {}

    mapa: dict[str, str] = {}
    for red in put.read_text(encoding="utf-8").splitlines():
        red = red.strip()
        if not red or red.startswith("#") or "|" not in red:
            continue
        ime, _, opis = red.partition("|")
        mapa[ime.strip().lower()] = opis.strip()
    return mapa


def lepo_ime(put: Path) -> str:
    """Ime fajla kao citljiv opis, kad opis nije zadat."""
    return put.stem.replace("-", " ").replace("_", " ").strip().capitalize()


def obradi(izvorna: Path) -> dict | None:
    """Pravi web verzije jedne fotografije. Vraca podatke za `<img>`."""
    try:
        with Image.open(izvorna) as im:
            # EXIF orijentacija: fotografija sa telefona je inace okrenuta.
            im = ImageOps.exif_transpose(im)
            im = im.convert("RGB")
            w, h = im.size

            osnova = izvorna.stem.lower().replace(" ", "-")
            varijante = []
            for sirina in SIRINE:
                if sirina > w:
                    continue
                visina = round(h * sirina / w)
                kopija = im.resize((sirina, visina), Image.LANCZOS)
                ime = f"{osnova}-{sirina}.webp"
                kopija.save(IZLAZ / ime, "WEBP", quality=KVALITET, method=6)
                varijante.append((ime, sirina, visina))

            if not varijante:  # slika manja od najmanje varijante
                ime = f"{osnova}-{w}.webp"
                im.save(IZLAZ / ime, "WEBP", quality=KVALITET, method=6)
                varijante.append((ime, w, h))

    except Exception as exc:  # neispravan ili nepodrzan fajl
        print(f"  preskocena {izvorna.name}: {exc}")
        return None

    return {"izvor": izvorna, "varijante": varijante}


def main() -> None:
    IZVOR.mkdir(parents=True, exist_ok=True)
    IZLAZ.mkdir(parents=True, exist_ok=True)

    fotografije = sorted(
        p for p in IZVOR.iterdir() if p.is_file() and p.suffix.lower() in PODRZANO
    )

    if not fotografije:
        # Bez fotografija stranica ne sme da ostane prazna — dobija
        # rezervisane okvire u istim odnosima stranica koje ce slike imati.
        # Cim stignu prave slike, skripta ih zameni.
        mesta = [
            ("Centralna kuhinja", "4 / 3"),
            ("Kuhinja u radu", "4 / 3"),
            ("Priprema obroka", "3 / 4"),
            ("Oprema", "4 / 3"),
            ("Termo posude pred izlazak", "4 / 3"),
            ("Utovar u vozilo", "3 / 4"),
        ]
        okviri = NL.join(
            f'          <div class="photo-slot gal__mesto" style="--slot-ratio: {odnos}" data-no-print>{NL}'
            f'            <span class="photo-slot__label">{escape(ime)}</span>{NL}'
            f"          </div>"
            for ime, odnos in mesta
        )
        blok = (
            f"{START}{NL}"
            f'          <div class="gal" data-reveal-group>{NL}'
            f"{okviri}{NL}"
            f"          </div>{NL}"
            f"          {END}"
        )
        html = STRANICA.read_text(encoding="utf-8")
        i, j = html.index(START), html.index(END) + len(END)
        STRANICA.write_text(html[:i] + blok + html[j:], encoding="utf-8")

        print(f"Nema fotografija u {IZVOR.relative_to(ROOT).as_posix()}/")
        print(f"Upisano {len(mesta)} rezervisanih okvira u pages/galerija.html.")
        print()
        print("Kada stignu slike: ubaci ih u taj folder i pokreni skriptu ponovo.")
        if not HEIC:
            print("(Za HEIC sa iPhone-a: pip install pillow-heif)")
        return

    mapa = opisi()
    stavke = []

    for foto in fotografije:
        rezultat = obradi(foto)
        if not rezultat:
            continue

        opis = mapa.get(foto.name.lower()) or lepo_ime(foto)
        varijante = rezultat["varijante"]
        najveca = varijante[-1]

        srcset = ", ".join(f"../assets/images/galerija/{i} {w}w" for i, w, _ in varijante)
        stavke.append(
            f'          <figure class="gal__item">{NL}'
            f'            <img src="../assets/images/galerija/{najveca[0]}"{NL}'
            f'                 srcset="{srcset}"{NL}'
            f'                 sizes="(min-width: 64rem) 32vw, (min-width: 40rem) 48vw, 92vw"{NL}'
            f'                 alt="{escape(opis)}"{NL}'
            f'                 width="{najveca[1]}" height="{najveca[2]}"{NL}'
            f'                 loading="lazy" decoding="async">{NL}'
            f'            <figcaption class="gal__opis small">{escape(opis)}</figcaption>{NL}'
            f"          </figure>"
        )
        print(f"  {foto.name}  ->  {len(varijante)} varijanti")

    blok = (
        f"{START}{NL}"
        f'          <div class="gal" data-reveal-group>{NL}'
        + NL.join(stavke)
        + f"{NL}          </div>{NL}"
        f"          {END}"
    )

    html = STRANICA.read_text(encoding="utf-8")
    if START not in html or END not in html:
        raise SystemExit(f"Markeri {START} / {END} ne postoje u pages/galerija.html")

    i, j = html.index(START), html.index(END) + len(END)
    STRANICA.write_text(html[:i] + blok + html[j:], encoding="utf-8")

    ukupno = sum(p.stat().st_size for p in IZLAZ.glob("*.webp"))

    print()
    print(f"Fotografija u galeriji: {len(stavke)}")
    print(f"Ukupno na disku:        {ukupno / 1024 / 1024:.1f} MB")
    print(f"Upisano u:              pages/galerija.html")


main()
