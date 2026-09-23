# Postavljanje sajta

Sajt je običan statički HTML. **Nema build korak.** Ono što vidiš u folderu je
tačno ono što ide na server.

---

## 1. Pregled pre objavljivanja

Dvoklik na `start.cmd` u korenu projekta. Otvara se u browseru.

Možeš i dvoklik na `index.html` — radi i tako. Razlika je što browser, kada
otvori stranicu direktno sa diska (`file://`), iz bezbednosnih razloga često ne
učita custom fontove, pa tekst padne na sistemske. Sve ostalo je isto.
`start.cmd` podiže mali lokalni server i to pitanje nestaje.

---

## 2. Objavljivanje

**Prekopiraj ceo sadržaj foldera na hosting.** To je sve.

Ne kopiraju se: `tools/`, `docs/`, `emails/`, `backend/` i `start.cmd` —
oni su za tebe, ne za posetioce. Nisu štetni ako ostanu, ali su suvišni.

Minimalno što ide na server:

```
index.html   404.html   favicon.ico   site.webmanifest
robots.txt   sitemap.xml   _redirects
css/   js/   pages/   assets/
```

### Netlify ili Cloudflare Pages — preporuka

Prevuci folder u njihov interfejs ili poveži Git repozitorijum.

| Podešavanje | Vrednost |
|---|---|
| Build command | **prazno** |
| Publish directory | `.` (koren projekta) |

Oba čitaju `_redirects` i daju pravi 301 sa starih URL-ova.

### Vercel

Isto — bez build komande, output je koren. Vercel ne čita `_redirects`;
preusmerenja se unose u `vercel.json` ili u panelu.

### Klasičan hosting (cPanel, Apache, Nginx)

FTP-uj sadržaj u `public_html`. Preusmerenja unesi ručno:

**Apache — `.htaccess` u korenu:**

```apache
RewriteEngine On

# Stari WordPress je servirao SVE ove adrese i sa zavrsnom kosom crtom, pa se
# obe varijante moraju pokriti. `Redirect` iz mod_alias to ne ume: on poredi
# po prefiksu i ostatak putanje LEPI na odrediste, pa bi /kontakt/ zavrsio na
# /pages/kontakt.html/ — a to je 404. Zato RewriteRule sa `/?$`.
#
# Konkretnije putanje MORAJU biti iznad opstijih.

RewriteRule ^sample-page/?$                          /                                        [R=301,L]
RewriteRule ^ponuda-hrane/transport-hrane/?$         /pages/dostava.html                      [R=301,L]
RewriteRule ^ponuda-hrane/strucna-podrska-nutricioniste/?$  /pages/nutricionista.html         [R=301,L]
RewriteRule ^ponuda-hrane/?$                         /pages/snabdevanje.html                  [R=301,L]
RewriteRule ^ponuda/?$                               /pages/snabdevanje.html                  [R=301,L]
RewriteRule ^o-nama/nasa-misija/?$                   /pages/o-nama.html#misija                [R=301,L]
RewriteRule ^o-nama/?$                               /pages/o-nama.html                       [R=301,L]
RewriteRule ^jelovnik/kvalitet-hrane/?$              /pages/kako-radimo.html#kvalitet-sirovina [R=301,L]
RewriteRule ^jelovnik/nedeljni-meni/?$               /pages/nedeljni-meni.html                [R=301,L]
RewriteRule ^jelovnik/?$                             /pages/jelovnik.html                     [R=301,L]
RewriteRule ^haccp/?$                                /pages/bezbednost-hrane.html             [R=301,L]
RewriteRule ^kontakt/?$                              /pages/kontakt.html                      [R=301,L]

ErrorDocument 404 /404.html
```

**Nginx:**

```nginx
location = /ponuda        { return 301 /pages/snabdevanje.html; }
location = /ponuda-hrane  { return 301 /pages/snabdevanje.html; }
location = /haccp         { return 301 /pages/bezbednost-hrane.html; }
location = /o-nama        { return 301 /pages/o-nama.html; }
location = /jelovnik      { return 301 /pages/jelovnik.html; }
location = /kontakt       { return 301 /pages/kontakt.html; }
# ostalo po istom obrascu, vidi _redirects

error_page 404 /404.html;

location ~* \.woff2$ {
  add_header Cache-Control "public, max-age=31536000, immutable";
}
```

Kompletan spisak preusmerenja je u `_redirects` u korenu.

---

## 3. Lepši URL-ovi (opciono)

Podrazumevano su adrese oblika `drcooker.rs/pages/o-nama.html`.
Ako želiš `drcooker.rs/o-nama`, to je podešavanje hostinga, ne izmena sajta:

**Netlify / Cloudflare** — dopiši u `_redirects`:

```
/o-nama    /pages/o-nama.html    200
/jelovnik  /pages/jelovnik.html  200
```

Status `200` znači da adresa ostaje lepa, a servira se pravi fajl.

**Apache** — u `.htaccess`:

```apache
RewriteCond %{REQUEST_FILENAME} !-f
RewriteRule ^([a-z0-9-]+)$ pages/$1.html [L]
```

Ako to uradiš, prilagodi i generisanje adresa u `tools/build-seo-files.mjs`
pa pokreni skriptu, da `sitemap.xml` i `canonical` prijave nove adrese.

---

## 4. Domen

Sajt je pisan za **drcooker.rs** (isti domen kao mejl `office@drcooker.rs`).
Stari sajt je na **keteringservis.rs**.

**A — zadržati keteringservis.rs**

```powershell
# 1. u js/config.js promeni SITE_URL na 'https://keteringservis.rs'
node tools/build-seo-files.mjs
python tools/audit.py
```

Skripta menja domen na **svim** mestima: `sitemap.xml`, `robots.txt`, i u
`rel=canonical`, `og:url`, `og:image` i JSON-LD grafu svake od 17 stranica
(oko 270 pojavljivanja). Domen nije samo u configu — zakucan je u svakom
zaglavlju, pa bez ovog koraka sitemap i canonical pokazuju na različite
domene, a Google prati canonical.

**B — preći na drcooker.rs (preporuka)**
Jači brend, poklapa se sa mejlom. Postavi na `drcooker.rs`, a
`keteringservis.rs` preusmeri:

```apache
RewriteCond %{HTTP_HOST} ^(www\.)?keteringservis\.rs$ [NC]
RewriteRule ^(.*)$ https://drcooker.rs/$1 [R=301,L]
```

`SITE_URL` mora odgovarati stvarnom domenu — inače `canonical`, `sitemap.xml`
i Open Graph pokazuju na pogrešno mesto.

---

## 5. Posle postavljanja

1. **Google Search Console** — dodaj domen, pošalji `sitemap.xml`, proveri da
   nijedan stari URL nije ostao 404.
2. Ako menjaš domen: *Change of Address* sa keteringservis.rs na novi.
3. Otvori `https://<domen>/robots.txt` i proveri `Sitemap:` red.
4. Otvori nepostojeću adresu i proveri da se vidi 404 stranica.
5. Pošalji test upit i proveri da red stigne u Sheet i da oba mejla stignu.

---

## 6. Kada se menja sadržaj

| Šta menjaš | Gde |
|---|---|
| Apps Script URL, email primaoca | `js/config.js` |
| Zaglavlje ili podnožje (sve stranice) | `tools/partials/`, pa `node tools/sync-partials.mjs` |
| Tekst jedne stranice | taj `.html` u `pages/` |
| Jelovnik, gramature | `pages/nedeljni-meni.html`, `pages/gramature.html` |
| Boje, fontovi, razmaci | `css/base.css`, sekcija `:root` |
| Dugmad, forme, tabele | `css/components.css` |
| Nešto na jednoj stranici | `css/pages.css`, pod `.page-<ime>` |
| Nova stranica | kopiraj postojeću iz `pages/`, pa `node tools/build-seo-files.mjs` |

Posle izmene samo ponovo prekopiraj fajlove na hosting. Nema izgradnje.
Na Netlify/Vercel/Cloudflare je dovoljan `git push`.

---

## 7. Opcione skripte

Nijedna nije potrebna da sajt radi.

```powershell
node tools/sync-partials.mjs     # prepiše zaglavlje i podnožje u sve stranice
node tools/build-seo-files.mjs   # regeneriše sitemap.xml, robots.txt, _redirects
node tools/build-emails.mjs      # regeneriše email šablone i Templates.gs
node tools/mock-backend.mjs      # lažni Apps Script, za testiranje forme
python tools/audit.py            # provera celog projekta
python tools/build-docx.py       # regeneriše upitnik za klijenta
```

Ove dve traže jednokratnu instalaciju i samo ako menjaš brend:

```powershell
npm install sharp                # pa: node tools/build-icons.mjs
pip install fonttools brotli     # pa: python tools/build-fonts.py
```
