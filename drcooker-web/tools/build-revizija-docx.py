"""Generise list za komentare uz obilazak sajta.

    python tools/build-revizija-docx.py
    -> docs/Dr-Cooker-revizija.docx

ZASTO OVAKO IZGLEDA

Klijent gleda SAJT, ne dokument. Zato ovde ne ide tekst stranica nego samo
POPIS: koja stranica, koja sekcija, i prazno polje pored. On skroluje sajt,
nadje sekciju po nazivu i upise sta bi promenio.

Sekcije se imenuju onim sto se na sajtu VIDI: sitna oznaka iznad naslova i
sam naslov. To je jedino po cemu ih klijent moze prepoznati dok skroluje.

Numeracija 3.5 (treca stranica, peta sekcija) postoji da bi komentar mogao da
se vrati i telefonom ili mejlom, bez dokumenta.
"""

from __future__ import annotations

import sys
from pathlib import Path

from docx import Document
from docx.enum.table import WD_TABLE_ALIGNMENT
from docx.enum.text import WD_ALIGN_PARAGRAPH, WD_BREAK
from docx.oxml import OxmlElement
from docx.oxml.ns import qn
from docx.shared import Cm, Pt, RGBColor

sys.path.insert(0, str(Path(__file__).resolve().parent))
import izvuci_copy as iz  # noqa: E402

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "docs" / "Dr-Cooker-revizija.docx"

INK = RGBColor(0x17, 0x14, 0x0F)
SOFT = RGBColor(0x4A, 0x42, 0x38)
ACCENT = RGBColor(0xA3, 0x2A, 0x2E)
PROOF = RGBColor(0x12, 0x4A, 0x3F)
RULE = "8C7E69"
TINT = "E6EDE8"
POLJE = "FBF9F5"

doc = Document()

st = doc.styles["Normal"]
st.font.name = "Calibri"
st.font.size = Pt(10)
st.font.color.rgb = INK
st.paragraph_format.space_after = Pt(3)
st.paragraph_format.line_spacing = 1.06

for s in doc.sections:
    s.top_margin = Cm(1.5)
    s.bottom_margin = Cm(1.4)
    s.left_margin = Cm(1.7)
    s.right_margin = Cm(1.7)


def _shade(celija, color: str) -> None:
    sh = OxmlElement("w:shd")
    sh.set(qn("w:val"), "clear")
    sh.set(qn("w:fill"), color)
    celija._tc.get_or_add_tcPr().append(sh)


def _border(par, edge: str, color: str = RULE, size: int = 6) -> None:
    pPr = par._p.get_or_add_pPr()
    bd = pPr.find(qn("w:pBdr"))
    if bd is None:
        bd = OxmlElement("w:pBdr")
        pPr.append(bd)
    e = OxmlElement(f"w:{edge}")
    e.set(qn("w:val"), "single")
    e.set(qn("w:sz"), str(size))
    e.set(qn("w:color"), color)
    bd.append(e)


def _fixed(t) -> None:
    lay = OxmlElement("w:tblLayout")
    lay.set(qn("w:type"), "fixed")
    t._tbl.tblPr.append(lay)


def _ivice(t) -> None:
    b = OxmlElement("w:tblBorders")
    for edge in ("top", "left", "bottom", "right", "insideH", "insideV"):
        e = OxmlElement(f"w:{edge}")
        e.set(qn("w:val"), "single")
        e.set(qn("w:sz"), "4")
        e.set(qn("w:color"), RULE)
        b.append(e)
    t._tbl.tblPr.append(b)


def _min_h(row, cm: float) -> None:
    trPr = row._tr.get_or_add_trPr()
    h = OxmlElement("w:trHeight")
    h.set(qn("w:val"), str(int(cm * 567)))
    h.set(qn("w:hRule"), "atLeast")
    trPr.append(h)


def _broj_strane() -> None:
    par = doc.sections[0].footer.paragraphs[0]
    par.alignment = WD_ALIGN_PARAGRAPH.CENTER
    r = par.add_run()
    poc = OxmlElement("w:fldChar")
    poc.set(qn("w:fldCharType"), "begin")
    instr = OxmlElement("w:instrText")
    instr.set(qn("xml:space"), "preserve")
    instr.text = " PAGE "
    kraj = OxmlElement("w:fldChar")
    kraj.set(qn("w:fldCharType"), "end")
    for el in (poc, instr, kraj):
        r._r.append(el)
    r.font.size = Pt(8)
    r.font.color.rgb = SOFT


def naslov(tekst: str, velicina: int = 20, boja=INK) -> None:
    p = doc.add_paragraph()
    p.paragraph_format.space_before = Pt(4)
    p.paragraph_format.space_after = Pt(4)
    r = p.add_run(tekst)
    r.font.size = Pt(velicina)
    r.font.bold = True
    r.font.color.rgb = boja


def pasus(tekst: str, velicina: float = 10, boja=INK, kurziv: bool = False) -> None:
    p = doc.add_paragraph()
    r = p.add_run(tekst)
    r.font.size = Pt(velicina)
    r.font.color.rgb = boja
    r.font.italic = kurziv


def oznaka(tekst: str, boja=PROOF) -> None:
    p = doc.add_paragraph()
    p.paragraph_format.space_after = Pt(1)
    r = p.add_run(tekst.upper())
    r.font.size = Pt(7.5)
    r.font.bold = True
    r.font.color.rgb = boja


def linija() -> None:
    p = doc.add_paragraph()
    p.paragraph_format.space_before = Pt(2)
    p.paragraph_format.space_after = Pt(7)
    _border(p, "bottom", RULE, 8)


def nova_strana() -> None:
    doc.add_paragraph().add_run().add_break(WD_BREAK.PAGE)


# ---------------------------------------------------------------------------
#  Naslovna
# ---------------------------------------------------------------------------

oznaka("Dr Cooker", ACCENT)
naslov("Šta biste promenili na sajtu", 24)
pasus("Otvorite sajt i idite redom. Ovde upisujete samo ono što bi trebalo ispraviti.", 11)
linija()

oznaka("Kako se koristi")
for red in (
    "1.  Otvorite sajt i krenite od početne strane.",
    "2.  Ovaj dokument prati sajt: iste stranice, istim redom, i svaka sekcija "
    "pod istim nazivom koji vidite na ekranu.",
    "3.  Kada naiđete na nešto što treba promeniti, upišete to u polje pored.",
    "4.  Sačuvate dokument i vratite ga.",
):
    p = doc.add_paragraph()
    p.paragraph_format.left_indent = Cm(0.45)
    p.paragraph_format.space_after = Pt(2)
    p.add_run(red).font.size = Pt(10)

pasus("Prazno polje znači da je tu sve u redu. Ne treba popunjavati sve.", 9.5, SOFT, kurziv=True)

doc.add_paragraph().paragraph_format.space_after = Pt(3)
oznaka("Ako Vam je lakše da se čujemo", ACCENT)
pasus(
    "Ne morate ovo da popunjavate. Javite kada Vam odgovara, pozvaću Vas i "
    "proći ćemo zajedno stranicu po stranicu, a ja ću zapisivati.",
    10.5,
)

doc.add_paragraph().paragraph_format.space_after = Pt(3)
oznaka("Numeracija", SOFT)
pasus(
    "Svaka sekcija ima broj, na primer 3.5, što znači treća stranica u ovom "
    "dokumentu, peta sekcija. Ako Vam je lakše da odgovorite porukom, dovoljno "
    "je da napišete broj i šta menjate.",
    9.5,
    SOFT,
)

# ---------------------------------------------------------------------------
#  Stranice
# ---------------------------------------------------------------------------


def novi_list(ime_stranice: str, redni: int, ukupno: int, adresa: str):
    nova_strana()
    oznaka(f"Stranica {redni} od {ukupno}", ACCENT)
    naslov(ime_stranice, 17)
    p = doc.add_paragraph()
    p.paragraph_format.space_after = Pt(6)
    r = p.add_run(adresa)
    r.font.size = Pt(8.5)
    r.font.color.rgb = SOFT

    t = doc.add_table(rows=1, cols=2)
    t.alignment = WD_TABLE_ALIGNMENT.CENTER
    _fixed(t)
    _ivice(t)
    t.columns[0].width = Cm(6.2)
    t.columns[1].width = Cm(11.2)
    for i, (txt, w) in enumerate((("Sekcija na sajtu", 6.2), ("Šta treba promeniti", 11.2))):
        c = t.rows[0].cells[i]
        c.width = Cm(w)
        _shade(c, TINT)
        p = c.paragraphs[0]
        p.paragraph_format.space_before = Pt(2)
        p.paragraph_format.space_after = Pt(2)
        r = p.add_run(txt.upper())
        r.font.size = Pt(7.5)
        r.font.bold = True
        r.font.color.rgb = PROOF
    return t


def dodaj_red(t, broj: str, oznaka_sek: str, naslov_sek: str) -> None:
    red = t.add_row()
    _min_h(red, 1.55)
    levo, desno = red.cells
    levo.width = Cm(6.2)
    desno.width = Cm(11.2)
    _shade(desno, POLJE)

    p = levo.paragraphs[0]
    p.paragraph_format.space_after = Pt(1)
    r = p.add_run(broj)
    r.font.size = Pt(8)
    r.font.bold = True
    r.font.color.rgb = ACCENT

    if oznaka_sek:
        p = levo.add_paragraph()
        p.paragraph_format.space_after = Pt(1)
        r = p.add_run(oznaka_sek)
        r.font.size = Pt(7.5)
        r.font.bold = True
        r.font.color.rgb = PROOF

    if naslov_sek:
        p = levo.add_paragraph()
        p.paragraph_format.space_after = Pt(0)
        r = p.add_run(naslov_sek)
        r.font.size = Pt(9.5)


stranice = iz.sve()
ukupno_sekcija = 0

for i, stranica in enumerate(stranice, 1):
    t = novi_list(stranica.ime, i, len(stranice) + 1, stranica.adresa)

    for k, s in enumerate(stranica.sekcije, 1):
        # Sekcija se imenuje onim sto se na sajtu vidi. Ako nema ni oznake ni
        # naslova, uzima se pocetak prvog reda — dovoljno da je prepozna.
        oz = s.oznaka
        na = s.naslov
        if not oz and not na and s.redovi:
            na = s.redovi[0].replace("PODNASLOV: ", "")[:60] + "…"
        dodaj_red(t, f"{i}.{k}", oz, na)
        ukupno_sekcija += 1

    # jedno prazno polje za sve sto sekcije ne pokrivaju
    dodaj_red(t, f"{i}.*", "", "Bilo šta drugo na ovoj stranici")

# ---------------------------------------------------------------------------
#  Zajednicko za sve stranice
# ---------------------------------------------------------------------------

t = novi_list("Meni i podnožje", len(stranice) + 1, len(stranice) + 1,
              "isti su na svim stranicama")
dodaj_red(t, "Z.1", "Vrh svake stranice", "Meni: Obroci za vrtiće i škole · Nedeljni "
                                          "jelovnik · Online supermarket · Kako radimo · "
                                          "Galerija · O nama · Kontakt")
dodaj_red(t, "Z.2", "Dno svake stranice", "Podnožje: adresa, telefon 064 110 1521, "
                                          "email, linkovi")

# ---------------------------------------------------------------------------
#  Pitanja
# ---------------------------------------------------------------------------

nova_strana()
oznaka("Poslednje", ACCENT)
naslov("Podaci koje samo Vi možete da potvrdite", 17)
pasus(
    "Ovo su podaci koje ste nam Vi dali i sada stoje na sajtu kao činjenice. "
    "Napišite DA ako je tačno, ili tačan podatak ako nije.",
    10,
)

# Odluke koje su ostale posle primene njegovih primedbi. Prethodna verzija
# ovog spiska je bila lista cinjenica za potvrdu; njih je u medjuvremenu
# potvrdio svojim dokumentima, pa su zamenjene onim sto je i dalje otvoreno.
# Puno obrazlozenje svake stoji u docs/OTVORENO.md.
PITANJA = [
    'ADRESA. Za kontakt karticu ste napisali „Vojvode Prijezde 17, Opština Voždovac”. Sekcija „Gde smo” na istoj stranici kaže da su kontakt adresa i proizvodnja na Dušanovcu dva različita podatka koja se namerno ne spajaju. Jedna adresa ili dve?',
    'DELATNOST. Napisali ste „Jedina naša delatnost je priprema obroka”. Pasus ispod, i cele dve stranice, govore o snabdevanju robom široke potrošnje. Ostaje „jedina” ili „osnovna”?',
    'TELEFONI. Pravilo je jedan telefon, 064 110 1521. Na stranici Online supermarket stoje još 011 2751 874 i 060 044 0089. Jesu li to Sinkovi brojevi i ostaju?',
    'KONTROLA. Vaš tekst kaže „Interna kontrola”, kartica ispod kaže „Unutrašnja kontrola”. Koja reč ostaje?',
    'TRAKE NA DNU STRANICA. Za dve ste napisali „Ne znam šta je ovo”. Na šest stranica ste ih obrisali. Ostaju ili idu sa svih? Put do forme ostaje u svakom slučaju, „Zatraži ponudu” stoji u zaglavlju.',
    'PRAVILA BEZ SEKCIJE. Obrisali ste sekcije Higijena i Osnovne mere kontrole, ali iste tvrdnje (nema ukrštanja čistog i nečistog puta, provera temperature komora, datum na pakovanju) stoje u dijagramu i u karticama pored. Idu i odatle?',
    'KATEGORIJE. „22 kategorije proizvoda I ova tabela ispod”: lista od 22 kategorije ostaje ili ide? Za stranicu Snabdevanje ste tražili tu istu tabelu, pa je treba poslati ili dozvoliti da se preuzme.',
    'JELOVNIK ZA NAREDNU NEDELJU. „Dalje briši” smo pročitali kao ostatak naslova, jer odmah posle dajete nov tekst za istu sekciju. Lista od četiri stavke je zato zadržana. Ako ste mislili „briši sve ispod”, ta lista ide.',
    'OBJEKTI. Na sajtu stoji 38 objekata, iz Vašeg dokumenta. U jednom mejlu stoji 40. Koji broj je tačan?',
    'ISKUSTVO. Na sajtu stoje i „20 godina” i „15+ godina”, oba iz Vašeg teksta, na različitim mestima. Koji podatak ostaje?',
    'KETERING. Tražili ste da ta reč nestane sa sajta, pa ste je sami napisali u novom uvodu stranice O nama: „Dr Cooker je ketering za decu”. Ta jedna pojava je zadržana. Vraća se i na druga mesta?',
    'KRATKE STRANICE. Posle brisanja: Nutricionista 144 reči, Jelovnik 191, Snabdevanje 197, Dostava 226, a Normativi su ostali na uvodu i tabeli. Je li to namerno, ili tekst treba prepisati a ne ukloniti?',
    'MATERIJAL. Čeka se od Vas: logo Sinko, kog nema u projektu, fotografije proizvodnje za galeriju, i dva ažurna primera jelovnika.',
]

t2 = doc.add_table(rows=1, cols=2)
_fixed(t2)
_ivice(t2)
t2.columns[0].width = Cm(11.2)
t2.columns[1].width = Cm(6.2)
for i2, (txt, w) in enumerate((("Odluka koja čeka Vašu reč", 11.2), ("Vaš odgovor", 6.2))):
    c = t2.rows[0].cells[i2]
    c.width = Cm(w)
    _shade(c, TINT)
    p = c.paragraphs[0]
    p.paragraph_format.space_before = Pt(2)
    p.paragraph_format.space_after = Pt(2)
    r = p.add_run(txt.upper())
    r.font.size = Pt(7.5)
    r.font.bold = True
    r.font.color.rgb = PROOF

for n, tvrdnja in enumerate(PITANJA, 1):
    red = t2.add_row()
    _min_h(red, 1.35)
    levo, desno = red.cells
    levo.width = Cm(11.2)
    desno.width = Cm(6.2)
    _shade(desno, POLJE)
    p = levo.paragraphs[0]
    p.paragraph_format.space_after = Pt(1)
    r = p.add_run(f"P{n}")
    r.font.size = Pt(8)
    r.font.bold = True
    r.font.color.rgb = ACCENT
    p2 = levo.add_paragraph()
    p2.paragraph_format.space_after = Pt(0)
    p2.add_run(tvrdnja).font.size = Pt(10)

doc.add_paragraph().paragraph_format.space_after = Pt(4)
pasus(
    "Ako nešto od ovoga nije tačno, recite. Biće uklonjeno ili ispravljeno.",
    9.5,
    SOFT,
    kurziv=True,
)

_broj_strane()

OUT.parent.mkdir(parents=True, exist_ok=True)
doc.save(OUT)

stari = ROOT / "docs" / "Dr-Cooker-revizija-teksta.docx"
if stari.exists():
    stari.unlink()

print(f"  {OUT.relative_to(ROOT).as_posix()}")
print(f"  stranica: {len(stranice)} + zajednicko")
print(f"  sekcija za komentar: {ukupno_sekcija}")
print(f"  pitanja: {len(PITANJA)}")
print(f"  velicina: {OUT.stat().st_size / 1024:.0f} KB")
