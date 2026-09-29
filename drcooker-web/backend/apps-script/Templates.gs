/**
 * ============================================================================
 *  HTML EMAIL ŠABLONI — GENERISAN FAJL, NE MENJATI RUČNO
 * ============================================================================
 *
 *  Izvor:      emails/templates/_layout.html, admin.html, user.html
 *  Generator:  tools/build-emails.mjs   (pokreni: npm run emails)
 *
 *  Ako ovde nešto izmeniš, izmena nestaje pri sledećem generisanju.
 *  Menjaj .html fajlove pa pokreni generator.
 *
 *  Generisano: 2026-09-29
 * ============================================================================
 */

var TPL_ADMIN = '<!doctype html>\n' +
  '<html lang="sr-Latn" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">\n' +
  '<head>\n' +
  '<meta charset="utf-8">\n' +
  '<meta name="viewport" content="width=device-width, initial-scale=1">\n' +
  '<meta name="x-apple-disable-message-reformatting">\n' +
  '<meta name="color-scheme" content="light">\n' +
  '<meta name="supported-color-schemes" content="light">\n' +
  '<title>{{SUBJECT}}</title>\n' +
  '<!--[if mso]>\n' +
  '<noscript><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml></noscript>\n' +
  '<![endif]-->\n' +
  '<style>\n' +
  '  /* Email klijenti podržavaju malo CSS-a. Sve što je kritično je i inline.\n' +
  '     Ovaj blok nosi samo ono što inline ne može: media query i pseudo-klase. */\n' +
  '  body { margin:0 !important; padding:0 !important; width:100% !important; }\n' +
  '  table { border-collapse:collapse !important; }\n' +
  '  img { border:0; outline:none; text-decoration:none; -ms-interpolation-mode:bicubic; }\n' +
  '  a { text-decoration:none; }\n' +
  '\n' +
  '  /* Gmail i Outlook.com ume da podvuče i oboji telefone i adrese. Ovo to gasi. */\n' +
  '  .x-auto a { color:inherit !important; text-decoration:none !important; }\n' +
  '\n' +
  '  @media only screen and (max-width:620px) {\n' +
  '    .wrap { width:100% !important; }\n' +
  '    .pad { padding-left:20px !important; padding-right:20px !important; }\n' +
  '    .pad-y { padding-top:28px !important; padding-bottom:28px !important; }\n' +
  '    .stack-col { display:block !important; width:100% !important; }\n' +
  '    .stack-col + .stack-col { padding-top:14px !important; }\n' +
  '    .btn-a { display:block !important; width:100% !important; text-align:center !important; }\n' +
  '    .btn-td { display:block !important; width:100% !important; }\n' +
  '    .btn-td + .btn-td { padding-top:10px !important; padding-left:0 !important; }\n' +
  '    .h1 { font-size:26px !important; line-height:1.2 !important; }\n' +
  '    .lbl { width:auto !important; display:block !important; padding-bottom:2px !important; }\n' +
  '    .val { display:block !important; width:100% !important; padding-left:0 !important; }\n' +
  '  }\n' +
  '</style>\n' +
  '</head>\n' +
  '<body style="margin:0;padding:0;background-color:#F1EBE0;">\n' +
  '\n' +
  '<!-- Pretekst: prvi red u listi poruka, pre otvaranja. -->\n' +
  '<div style="display:none;font-size:1px;color:#F1EBE0;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;">{{PREHEADER}}&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;</div>\n' +
  '\n' +
  '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#F1EBE0;">\n' +
  '<tr>\n' +
  '<td align="center" style="padding:24px 12px;">\n' +
  '\n' +
  '  <table role="presentation" class="wrap" width="600" cellpadding="0" cellspacing="0" border="0" style="width:600px;max-width:600px;background-color:#FAF7F2;border:1px solid #8C7E69;">\n' +
  '\n' +
  '    <!-- ZAGLAVLJE -->\n' +
  '    <tr>\n' +
  '      <td class="pad" style="background-color:#08221D;padding:26px 36px;">\n' +
  '        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">\n' +
  '          <tr>\n' +
  '            <td align="left" style="font-family:Georgia,\'Times New Roman\',serif;font-size:22px;line-height:1.1;font-weight:bold;color:#EFE9DE;letter-spacing:-0.01em;">\n' +
  '              Dr Cooker\n' +
  '              <div style="font-family:Consolas,\'Courier New\',monospace;font-size:10px;letter-spacing:0.18em;text-transform:uppercase;color:#A8BEB7;padding-top:6px;font-weight:normal;">Obroci za decu</div>\n' +
  '            </td>\n' +
  '            <td align="right" style="font-family:Consolas,\'Courier New\',monospace;font-size:10px;letter-spacing:0.14em;text-transform:uppercase;color:#A8BEB7;">\n' +
  '              {{HEADER_TAG}}\n' +
  '            </td>\n' +
  '          </tr>\n' +
  '        </table>\n' +
  '      </td>\n' +
  '    </tr>\n' +
  '\n' +
  '    <!-- SADRŽAJ -->\n' +
  '    <!-- SADRŽAJ: obaveštenje firmi o novom upitu.\n' +
  '     Cilj: u prvih pet sekundi znati ko je, šta traži i kako mu se javiti.\n' +
  '     Zato su POZOVI i ODGOVORI odmah ispod zaglavlja, pre svih detalja. -->\n' +
  '\n' +
  '<tr>\n' +
  '  <td class="pad pad-y" style="padding:36px 36px 24px;">\n' +
  '\n' +
  '    <div style="font-family:Consolas,\'Courier New\',monospace;font-size:11px;letter-spacing:0.14em;text-transform:uppercase;color:#A32A2E;padding-bottom:12px;">\n' +
  '      Novi upit sa sajta\n' +
  '    </div>\n' +
  '\n' +
  '    <h1 class="h1" style="margin:0 0 8px;font-family:Georgia,\'Times New Roman\',serif;font-size:30px;line-height:1.15;font-weight:bold;color:#17140F;letter-spacing:-0.02em;">\n' +
  '      {{USTANOVA}}\n' +
  '    </h1>\n' +
  '\n' +
  '    <p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:1.5;color:#4A4238;">\n' +
  '      {{IME}} &middot; {{USLUGA}}\n' +
  '    </p>\n' +
  '\n' +
  '  </td>\n' +
  '</tr>\n' +
  '\n' +
  '<!-- BRZE AKCIJE -->\n' +
  '<tr>\n' +
  '  <td class="pad" style="padding:0 36px 32px;">\n' +
  '    <table role="presentation" cellpadding="0" cellspacing="0" border="0">\n' +
  '      <tr>\n' +
  '        <td class="btn-td" style="padding-right:10px;">\n' +
  '          <a class="btn-a" href="tel:{{TELEFON_TEL}}"\n' +
  '             style="display:inline-block;background-color:#A32A2E;color:#FAF7F2;font-family:Arial,Helvetica,sans-serif;font-size:15px;font-weight:bold;line-height:1.2;padding:14px 26px;border:1px solid #A32A2E;">\n' +
  '            Pozovi {{TELEFON}}\n' +
  '          </a>\n' +
  '        </td>\n' +
  '        <td class="btn-td">\n' +
  '          <a class="btn-a" href="mailto:{{EMAIL}}?subject={{REPLY_SUBJECT}}"\n' +
  '             style="display:inline-block;background-color:#FAF7F2;color:#17140F;font-family:Arial,Helvetica,sans-serif;font-size:15px;font-weight:bold;line-height:1.2;padding:14px 26px;border:1px solid #8C7E69;">\n' +
  '            Odgovori na email\n' +
  '          </a>\n' +
  '        </td>\n' +
  '      </tr>\n' +
  '    </table>\n' +
  '  </td>\n' +
  '</tr>\n' +
  '\n' +
  '<!-- PODACI IZ FORME -->\n' +
  '<tr>\n' +
  '  <td class="pad" style="padding:0 36px 8px;">\n' +
  '    <div style="border-top:2px solid #124A3F;padding-top:20px;">\n' +
  '      <div style="font-family:Consolas,\'Courier New\',monospace;font-size:11px;letter-spacing:0.14em;text-transform:uppercase;color:#124A3F;padding-bottom:4px;">\n' +
  '        Podaci iz upita\n' +
  '      </div>\n' +
  '    </div>\n' +
  '  </td>\n' +
  '</tr>\n' +
  '\n' +
  '<tr>\n' +
  '  <td class="pad" style="padding:0 36px 12px;">\n' +
  '    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">\n' +
  '      {{ROWS}}\n' +
  '    </table>\n' +
  '  </td>\n' +
  '</tr>\n' +
  '\n' +
  '<!-- PORUKA -->\n' +
  '<tr>\n' +
  '  <td class="pad" style="padding:12px 36px 36px;">\n' +
  '    <div style="font-family:Consolas,\'Courier New\',monospace;font-size:11px;letter-spacing:0.14em;text-transform:uppercase;color:#124A3F;padding-bottom:10px;">\n' +
  '      Poruka\n' +
  '    </div>\n' +
  '    <div style="background-color:#E6EDE8;border-left:3px solid #124A3F;padding:18px 20px;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.65;color:#17140F;">\n' +
  '      {{PORUKA}}\n' +
  '    </div>\n' +
  '  </td>\n' +
  '</tr>\n' +
  '\n' +
  '<!-- META -->\n' +
  '<tr>\n' +
  '  <td class="pad" style="padding:0 36px 36px;">\n' +
  '    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-top:1px solid #D5CCBE;">\n' +
  '      <tr>\n' +
  '        <td style="padding-top:16px;font-family:Consolas,\'Courier New\',monospace;font-size:11px;line-height:1.7;color:#4A4238;">\n' +
  '          Broj upita: {{REFERENCE}}<br>\n' +
  '          Primljeno: {{PRIMLJENO}}<br>\n' +
  '          Stranica: {{IZVOR}}\n' +
  '        </td>\n' +
  '      </tr>\n' +
  '    </table>\n' +
  '  </td>\n' +
  '</tr>\n' +
  '\n' +
  '\n' +
  '    <!-- PODNOŽJE -->\n' +
  '    <tr>\n' +
  '      <td class="pad" style="background-color:#08221D;padding:28px 36px;">\n' +
  '        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">\n' +
  '          <tr>\n' +
  '            <td style="font-family:Arial,Helvetica,sans-serif;font-size:13px;line-height:1.6;color:#A8BEB7;">\n' +
  '              <div style="font-family:Consolas,\'Courier New\',monospace;font-size:10px;letter-spacing:0.14em;text-transform:uppercase;color:#A8BEB7;padding-bottom:10px;">Kontakt</div>\n' +
  '              <div class="x-auto" style="color:#EFE9DE;">\n' +
  '                {{COMPANY_ADDRESS}}<br>\n' +
  '                <a href="tel:{{PHONE1_TEL}}" style="color:#EFE9DE;text-decoration:none;">{{PHONE1}}</a><br>\n' +
  '                <a href="mailto:{{COMPANY_EMAIL}}" style="color:#EFE9DE;text-decoration:underline;">{{COMPANY_EMAIL}}</a>\n' +
  '              </div>\n' +
  '            </td>\n' +
  '          </tr>\n' +
  '          <tr>\n' +
  '            <td style="padding-top:20px;border-top:1px solid #64726A;margin-top:20px;">\n' +
  '              <div style="font-family:Arial,Helvetica,sans-serif;font-size:11px;line-height:1.6;color:#A8BEB7;padding-top:18px;">\n' +
  '                {{FOOTER_NOTE}}\n' +
  '              </div>\n' +
  '            </td>\n' +
  '          </tr>\n' +
  '        </table>\n' +
  '      </td>\n' +
  '    </tr>\n' +
  '\n' +
  '  </table>\n' +
  '\n' +
  '</td>\n' +
  '</tr>\n' +
  '</table>\n' +
  '\n' +
  '</body>\n' +
  '</html>\n' +
  '';

var TPL_USER = '<!doctype html>\n' +
  '<html lang="sr-Latn" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">\n' +
  '<head>\n' +
  '<meta charset="utf-8">\n' +
  '<meta name="viewport" content="width=device-width, initial-scale=1">\n' +
  '<meta name="x-apple-disable-message-reformatting">\n' +
  '<meta name="color-scheme" content="light">\n' +
  '<meta name="supported-color-schemes" content="light">\n' +
  '<title>{{SUBJECT}}</title>\n' +
  '<!--[if mso]>\n' +
  '<noscript><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml></noscript>\n' +
  '<![endif]-->\n' +
  '<style>\n' +
  '  /* Email klijenti podržavaju malo CSS-a. Sve što je kritično je i inline.\n' +
  '     Ovaj blok nosi samo ono što inline ne može: media query i pseudo-klase. */\n' +
  '  body { margin:0 !important; padding:0 !important; width:100% !important; }\n' +
  '  table { border-collapse:collapse !important; }\n' +
  '  img { border:0; outline:none; text-decoration:none; -ms-interpolation-mode:bicubic; }\n' +
  '  a { text-decoration:none; }\n' +
  '\n' +
  '  /* Gmail i Outlook.com ume da podvuče i oboji telefone i adrese. Ovo to gasi. */\n' +
  '  .x-auto a { color:inherit !important; text-decoration:none !important; }\n' +
  '\n' +
  '  @media only screen and (max-width:620px) {\n' +
  '    .wrap { width:100% !important; }\n' +
  '    .pad { padding-left:20px !important; padding-right:20px !important; }\n' +
  '    .pad-y { padding-top:28px !important; padding-bottom:28px !important; }\n' +
  '    .stack-col { display:block !important; width:100% !important; }\n' +
  '    .stack-col + .stack-col { padding-top:14px !important; }\n' +
  '    .btn-a { display:block !important; width:100% !important; text-align:center !important; }\n' +
  '    .btn-td { display:block !important; width:100% !important; }\n' +
  '    .btn-td + .btn-td { padding-top:10px !important; padding-left:0 !important; }\n' +
  '    .h1 { font-size:26px !important; line-height:1.2 !important; }\n' +
  '    .lbl { width:auto !important; display:block !important; padding-bottom:2px !important; }\n' +
  '    .val { display:block !important; width:100% !important; padding-left:0 !important; }\n' +
  '  }\n' +
  '</style>\n' +
  '</head>\n' +
  '<body style="margin:0;padding:0;background-color:#F1EBE0;">\n' +
  '\n' +
  '<!-- Pretekst: prvi red u listi poruka, pre otvaranja. -->\n' +
  '<div style="display:none;font-size:1px;color:#F1EBE0;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;">{{PREHEADER}}&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;</div>\n' +
  '\n' +
  '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#F1EBE0;">\n' +
  '<tr>\n' +
  '<td align="center" style="padding:24px 12px;">\n' +
  '\n' +
  '  <table role="presentation" class="wrap" width="600" cellpadding="0" cellspacing="0" border="0" style="width:600px;max-width:600px;background-color:#FAF7F2;border:1px solid #8C7E69;">\n' +
  '\n' +
  '    <!-- ZAGLAVLJE -->\n' +
  '    <tr>\n' +
  '      <td class="pad" style="background-color:#08221D;padding:26px 36px;">\n' +
  '        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">\n' +
  '          <tr>\n' +
  '            <td align="left" style="font-family:Georgia,\'Times New Roman\',serif;font-size:22px;line-height:1.1;font-weight:bold;color:#EFE9DE;letter-spacing:-0.01em;">\n' +
  '              Dr Cooker\n' +
  '              <div style="font-family:Consolas,\'Courier New\',monospace;font-size:10px;letter-spacing:0.18em;text-transform:uppercase;color:#A8BEB7;padding-top:6px;font-weight:normal;">Obroci za decu</div>\n' +
  '            </td>\n' +
  '            <td align="right" style="font-family:Consolas,\'Courier New\',monospace;font-size:10px;letter-spacing:0.14em;text-transform:uppercase;color:#A8BEB7;">\n' +
  '              {{HEADER_TAG}}\n' +
  '            </td>\n' +
  '          </tr>\n' +
  '        </table>\n' +
  '      </td>\n' +
  '    </tr>\n' +
  '\n' +
  '    <!-- SADRŽAJ -->\n' +
  '    <!-- SADRŽAJ: potvrda korisniku da je upit primljen.\n' +
  '     NE OBEĆAVA ROK. Blok {{ROK_BLOK}} se ubacuje samo ako klijent potvrdi\n' +
  '     stvarni rok odgovora (PENDING.responseTime u js/config.js).\n' +
  '     Dok je null, ovde ne piše nikakvo vreme — izmišljen rok je obećanje\n' +
  '     koje firma nije dala. -->\n' +
  '\n' +
  '<tr>\n' +
  '  <td class="pad pad-y" style="padding:36px 36px 20px;">\n' +
  '\n' +
  '    <div style="font-family:Consolas,\'Courier New\',monospace;font-size:11px;letter-spacing:0.14em;text-transform:uppercase;color:#124A3F;padding-bottom:12px;">\n' +
  '      Potvrda prijema\n' +
  '    </div>\n' +
  '\n' +
  '    <h1 class="h1" style="margin:0 0 16px;font-family:Georgia,\'Times New Roman\',serif;font-size:30px;line-height:1.2;font-weight:bold;color:#17140F;letter-spacing:-0.02em;">\n' +
  '      Primili smo Vaš upit\n' +
  '    </h1>\n' +
  '\n' +
  '    <p style="margin:0 0 14px;font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:1.65;color:#4A4238;">\n' +
  '      Poštovani/a {{IME}},\n' +
  '    </p>\n' +
  '\n' +
  '    <p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:1.65;color:#4A4238;">\n' +
  '      hvala što ste se obratili Dr Cooker-u. Vaš upit je stigao i\n' +
  '      prosleđen je našem timu. Javićemo Vam se na kontakt podatke koje ste\n' +
  '      ostavili, predložiti termin sastanka i pripremiti ponudu prema potrebama\n' +
  '      Vaše ustanove.{{ROK_BLOK}}\n' +
  '    </p>\n' +
  '\n' +
  '  </td>\n' +
  '</tr>\n' +
  '\n' +
  '<!-- ŠTA STE POSLALI -->\n' +
  '<tr>\n' +
  '  <td class="pad" style="padding:8px 36px 8px;">\n' +
  '    <div style="border-top:2px solid #124A3F;padding-top:20px;">\n' +
  '      <div style="font-family:Consolas,\'Courier New\',monospace;font-size:11px;letter-spacing:0.14em;text-transform:uppercase;color:#124A3F;padding-bottom:4px;">\n' +
  '        Sažetak Vašeg upita\n' +
  '      </div>\n' +
  '    </div>\n' +
  '  </td>\n' +
  '</tr>\n' +
  '\n' +
  '<tr>\n' +
  '  <td class="pad" style="padding:0 36px 24px;">\n' +
  '    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">\n' +
  '      {{ROWS}}\n' +
  '    </table>\n' +
  '  </td>\n' +
  '</tr>\n' +
  '\n' +
  '<!-- AKO NEŠTO NIJE U REDU -->\n' +
  '<tr>\n' +
  '  <td class="pad" style="padding:0 36px 32px;">\n' +
  '    <div style="background-color:#E6EDE8;border-left:3px solid #124A3F;padding:18px 20px;">\n' +
  '      <p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.65;color:#17140F;">\n' +
  '        Ako neki podatak nije tačan ili želite nešto da dodate, odgovorite\n' +
  '        direktno na ovaj email; poruka stiže istom timu.\n' +
  '      </p>\n' +
  '    </div>\n' +
  '  </td>\n' +
  '</tr>\n' +
  '\n' +
  '<!-- BRZI KONTAKT -->\n' +
  '<tr>\n' +
  '  <td class="pad" style="padding:0 36px 36px;">\n' +
  '    <div style="font-family:Consolas,\'Courier New\',monospace;font-size:11px;letter-spacing:0.14em;text-transform:uppercase;color:#124A3F;padding-bottom:14px;">\n' +
  '      Ako Vam je hitno\n' +
  '    </div>\n' +
  '    <table role="presentation" cellpadding="0" cellspacing="0" border="0">\n' +
  '      <tr>\n' +
  '        <td class="btn-td" style="padding-right:10px;">\n' +
  '          <a class="btn-a" href="tel:{{PHONE1_TEL}}"\n' +
  '             style="display:inline-block;background-color:#A32A2E;color:#FAF7F2;font-family:Arial,Helvetica,sans-serif;font-size:15px;font-weight:bold;line-height:1.2;padding:14px 26px;border:1px solid #A32A2E;">\n' +
  '            Pozovite {{PHONE1}}\n' +
  '          </a>\n' +
  '        </td>\n' +
  '        <td class="btn-td">\n' +
  '          <a class="btn-a" href="{{SITE_URL}}/jelovnik"\n' +
  '             style="display:inline-block;background-color:#FAF7F2;color:#17140F;font-family:Arial,Helvetica,sans-serif;font-size:15px;font-weight:bold;line-height:1.2;padding:14px 26px;border:1px solid #8C7E69;">\n' +
  '            Pogledajte jelovnik\n' +
  '          </a>\n' +
  '        </td>\n' +
  '      </tr>\n' +
  '    </table>\n' +
  '  </td>\n' +
  '</tr>\n' +
  '\n' +
  '\n' +
  '    <!-- PODNOŽJE -->\n' +
  '    <tr>\n' +
  '      <td class="pad" style="background-color:#08221D;padding:28px 36px;">\n' +
  '        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">\n' +
  '          <tr>\n' +
  '            <td style="font-family:Arial,Helvetica,sans-serif;font-size:13px;line-height:1.6;color:#A8BEB7;">\n' +
  '              <div style="font-family:Consolas,\'Courier New\',monospace;font-size:10px;letter-spacing:0.14em;text-transform:uppercase;color:#A8BEB7;padding-bottom:10px;">Kontakt</div>\n' +
  '              <div class="x-auto" style="color:#EFE9DE;">\n' +
  '                {{COMPANY_ADDRESS}}<br>\n' +
  '                <a href="tel:{{PHONE1_TEL}}" style="color:#EFE9DE;text-decoration:none;">{{PHONE1}}</a><br>\n' +
  '                <a href="mailto:{{COMPANY_EMAIL}}" style="color:#EFE9DE;text-decoration:underline;">{{COMPANY_EMAIL}}</a>\n' +
  '              </div>\n' +
  '            </td>\n' +
  '          </tr>\n' +
  '          <tr>\n' +
  '            <td style="padding-top:20px;border-top:1px solid #64726A;margin-top:20px;">\n' +
  '              <div style="font-family:Arial,Helvetica,sans-serif;font-size:11px;line-height:1.6;color:#A8BEB7;padding-top:18px;">\n' +
  '                {{FOOTER_NOTE}}\n' +
  '              </div>\n' +
  '            </td>\n' +
  '          </tr>\n' +
  '        </table>\n' +
  '      </td>\n' +
  '    </tr>\n' +
  '\n' +
  '  </table>\n' +
  '\n' +
  '</td>\n' +
  '</tr>\n' +
  '</table>\n' +
  '\n' +
  '</body>\n' +
  '</html>\n' +
  '';

/** Zamenjuje {{KLJUC}} vrednostima iz mape. */
function fillTemplate_(tpl, vars) {
  return Object.keys(vars).reduce(function (acc, key) {
    var safe = vars[key] == null ? '' : String(vars[key]);
    return acc.split('{{' + key + '}}').join(safe);
  }, tpl);
}

/** Escape za HTML. Sve što dolazi iz forme mora proći kroz ovo. */
function esc_(v) {
  return String(v == null ? '' : v)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** Jedan red tabele „labela → vrednost". */
function tplRow_(label, value) {
  return '<tr>' +
    '<td class="lbl" width="150" valign="top" style="width:150px;padding:9px 12px 9px 0;border-bottom:1px solid #D5CCBE;font-family:Consolas,\'Courier New\',monospace;font-size:11px;letter-spacing:0.08em;text-transform:uppercase;color:#4A4238;">' + label + '</td>' +
    '<td class="val" valign="top" style="padding:9px 0;border-bottom:1px solid #D5CCBE;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.5;color:#17140F;">' + value + '</td>' +
    '</tr>';
}

/** Datum u srpskom formatu, beogradska zona. */
function fmtDate_(d) {
  return Utilities.formatDate(d, 'Europe/Belgrade', 'dd.MM.yyyy.') +
    ' u ' + Utilities.formatDate(d, 'Europe/Belgrade', 'HH:mm');
}

/** Datum iz <input type="date"> (YYYY-MM-DD) u dd.MM.yyyy. */
function fmtDateOnly_(iso) {
  if (!iso) return '';
  var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  return m ? m[3] + '.' + m[2] + '.' + m[1] + '.' : iso;
}

function commonVars_(company) {
  return {
    COMPANY_ADDRESS: esc_(company.address),
    COMPANY_EMAIL: esc_(company.email),
    PHONE1_LABEL: esc_(company.phones[0].label),
    PHONE1: esc_(company.phones[0].display),
    PHONE1_TEL: esc_(company.phones[0].tel),
    PHONE2_LABEL: esc_(company.phones[1].label),
    PHONE2: esc_(company.phones[1].display),
    PHONE2_TEL: esc_(company.phones[1].tel),
    SITE_URL: esc_(company.site)
  };
}

/** Telefon očišćen za tel: link. */
function telHref_(v) {
  var digits = String(v || '').replace(/[^\d+]/g, '');
  if (digits.indexOf('+') !== 0 && digits.indexOf('0') === 0) {
    digits = '+381' + digits.slice(1);
  }
  return digits;
}

// ---------------------------------------------------------------------------
//  ADMIN — obaveštenje firmi
// ---------------------------------------------------------------------------

function renderAdminEmail(clean, reference, company) {
  var rows = [];
  rows.push(tplRow_('Ime i prezime', esc_(clean.ime)));
  rows.push(tplRow_('Ustanova', esc_(clean.ustanova)));
  rows.push(tplRow_('Email',
    '<a href="mailto:' + esc_(clean.email) + '" style="color:#A32A2E;text-decoration:underline;">' + esc_(clean.email) + '</a>'));
  rows.push(tplRow_('Telefon',
    '<a href="tel:' + esc_(telHref_(clean.telefon)) + '" style="color:#A32A2E;text-decoration:underline;">' + esc_(clean.telefon) + '</a>'));
  rows.push(tplRow_('Usluga', esc_(clean._uslugaLabel)));
  if (clean.brojKorisnika) rows.push(tplRow_('Broj korisnika', esc_(clean.brojKorisnika)));
  if (clean.pocetak) rows.push(tplRow_('Željeni početak', esc_(fmtDateOnly_(clean.pocetak))));
  rows.push(tplRow_('Saglasnost', esc_(clean.saglasnost)));

  var vars = commonVars_(company);
  vars.SUBJECT = '[UPIT] ' + esc_(clean.ustanova);
  vars.PREHEADER = esc_(clean.ime) + ' \u00b7 ' + esc_(clean._uslugaLabel) +
    (clean.brojKorisnika ? ' \u00b7 ' + esc_(clean.brojKorisnika) + ' korisnika' : '');
  vars.HEADER_TAG = 'Upit sa sajta';
  vars.USTANOVA = esc_(clean.ustanova);
  vars.IME = esc_(clean.ime);
  vars.USLUGA = esc_(clean._uslugaLabel);
  vars.TELEFON = esc_(clean.telefon);
  vars.TELEFON_TEL = esc_(telHref_(clean.telefon));
  vars.EMAIL = esc_(clean.email);
  vars.REPLY_SUBJECT = encodeURIComponent('Odgovor na Vaš upit | Dr Cooker');
  vars.ROWS = rows.join('');
  vars.PORUKA = esc_(clean.poruka).replace(/\r?\n/g, '<br>');
  vars.REFERENCE = esc_(reference);
  vars.PRIMLJENO = fmtDate_(new Date());
  vars.IZVOR = esc_(clean._source || '—');
  vars.FOOTER_NOTE = 'Ovaj email je automatski poslat sa sajta. Odgovor na ovu poruku ide direktno pošiljaocu upita.';

  return fillTemplate_(TPL_ADMIN, vars);
}

// ---------------------------------------------------------------------------
//  KORISNIK — potvrda prijema
// ---------------------------------------------------------------------------

function renderUserEmail(clean, reference, company) {
  var rows = [];
  rows.push(tplRow_('Ustanova', esc_(clean.ustanova)));
  rows.push(tplRow_('Usluga', esc_(clean._uslugaLabel)));
  if (clean.brojKorisnika) rows.push(tplRow_('Broj korisnika', esc_(clean.brojKorisnika)));
  if (clean.pocetak) rows.push(tplRow_('Željeni početak', esc_(fmtDateOnly_(clean.pocetak))));
  rows.push(tplRow_('Broj upita', esc_(reference)));

  var vars = commonVars_(company);
  vars.SUBJECT = 'Primili smo Vaš upit | Dr Cooker';
  vars.PREHEADER = 'Vaš upit je stigao. Javićemo Vam se na ostavljene kontakt podatke.';
  vars.HEADER_TAG = 'Potvrda';
  vars.IME = esc_(clean.ime);
  vars.ROWS = rows.join('');

  // ROK_BLOK ostaje prazan dok klijent ne potvrdi stvaran rok odgovora.
  // Kada ga potvrdi, postavi CONFIG.RESPONSE_TIME u Code.gs i biće ubačen.
  var rok = (typeof CONFIG !== 'undefined' && CONFIG.RESPONSE_TIME) ? CONFIG.RESPONSE_TIME : '';
  vars.ROK_BLOK = rok ? ' ' + esc_(rok) : '';

  vars.FOOTER_NOTE = 'Ovaj email je potvrda prijema upita poslatog preko sajta. Ako niste Vi poslali upit, slobodno zanemarite ovu poruku.';

  return fillTemplate_(TPL_USER, vars);
}
