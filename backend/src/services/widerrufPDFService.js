const puppeteer = require('puppeteer');

/**
 * Generiert das Widerrufsformular als druckbares DIN-A4-PDF.
 * Händlerdaten werden vorausgefüllt; Kundendaten bleiben leer
 * (der Kunde trägt sie handschriftlich ein).
 */
class WiderrufPDFService {
  static async generateFormularPDF(companyInfo = {}, customerName = '') {
    const shopName = companyInfo.name || 'Glücksmomente Manufaktur';
    const addr = companyInfo.address || {};
    const contact = companyInfo.contact || {};

    const shopAdresse = [
      addr.street || 'Wasserwerkstraße 15',
      [addr.postalCode || '68642', addr.city || 'Bürstadt'].filter(Boolean).join(' '),
      addr.country || 'Deutschland'
    ]
      .filter(Boolean)
      .join(', ');

    const shopEmail = contact.email || 'info@gluecksmomente-manufaktur.de';
    const shopWebsite = contact.website || 'www.gluecksmomente-manufaktur.de';
    const shopPhone = contact.phone || '';

    const today = new Date().toLocaleDateString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });

    const html = `<!DOCTYPE html>
<html lang="de">
<head>
<meta charset="UTF-8">
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: Arial, Helvetica, sans-serif;
    font-size: 10pt;
    color: #1a1a1a;
    background: #fff;
    padding: 18mm 18mm 14mm 18mm;
    line-height: 1.4;
  }
  h1 {
    font-size: 14pt;
    font-weight: bold;
    border-bottom: 2px solid #7b3f7b;
    padding-bottom: 4px;
    margin-bottom: 10px;
    color: #4a1f4a;
  }
  h2 {
    font-size: 10pt;
    font-weight: bold;
    color: #4a1f4a;
    margin: 12px 0 4px 0;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }
  .header-row {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 12px;
  }
  .shop-block {
    background: #f7f0f7;
    border-left: 3px solid #7b3f7b;
    padding: 8px 12px;
    font-size: 9pt;
    min-width: 200px;
    max-width: 260px;
  }
  .shop-block strong { font-size: 10pt; color: #4a1f4a; }
  .title-block { flex: 1; padding-right: 20px; }
  .legal-box {
    background: #fdf6e3;
    border: 1px solid #e0c97f;
    border-radius: 4px;
    padding: 7px 10px;
    font-size: 8.5pt;
    margin-bottom: 12px;
    color: #5a4a00;
  }
  .section {
    border: 1px solid #ccc;
    border-radius: 4px;
    padding: 7px 10px;
    margin-bottom: 8px;
  }
  .field-row {
    display: flex;
    align-items: baseline;
    gap: 6px;
    margin-bottom: 5px;
    font-size: 9.5pt;
  }
  .field-label {
    min-width: 110px;
    font-weight: bold;
    color: #333;
    font-size: 9pt;
    flex-shrink: 0;
  }
  .field-line {
    flex: 1;
    border-bottom: 1px solid #888;
    min-height: 14px;
  }
  .field-line.tall {
    min-height: 28px;
    margin-bottom: 3px;
  }
  .two-col {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 8px;
  }
  .checkbox-row {
    display: flex;
    align-items: flex-start;
    gap: 8px;
    font-size: 9pt;
    margin-top: 6px;
  }
  .checkbox-box {
    width: 13px;
    height: 13px;
    border: 1.5px solid #444;
    flex-shrink: 0;
    margin-top: 1px;
  }
  .footer {
    margin-top: 10px;
    border-top: 1px solid #ccc;
    padding-top: 7px;
    font-size: 8pt;
    color: #666;
    display: flex;
    justify-content: space-between;
  }
  .optional-label {
    font-size: 8pt;
    color: #888;
    font-style: italic;
    margin-left: 4px;
  }
  .hint {
    font-size: 8pt;
    color: #555;
    margin-top: 3px;
    font-style: italic;
  }
  @media print {
    body { padding: 0; }
    @page { size: A4; margin: 18mm 18mm 14mm 18mm; }
  }
</style>
</head>
<body>

<!-- Header -->
<div class="header-row">
  <div class="title-block">
    <h1>📋 Widerrufsformular</h1>
    <p style="font-size:8.5pt;color:#555;margin-top:3px;">
      Gemäß § 355 BGB – Muster-Widerrufsformular (Anlage 2 zu Art. 246a § 1 Abs. 2 S. 1 Nr. 1 EGBGB)
    </p>
  </div>
  <div class="shop-block">
    <strong>${shopName}</strong><br>
    ${shopAdresse}<br>
    ${shopEmail ? `✉ ${shopEmail}` : ''}${shopPhone ? `<br>☎ ${shopPhone}` : ''}
    ${shopWebsite ? `<br>🌐 ${shopWebsite}` : ''}
  </div>
</div>

<!-- Hinweis -->
<div class="legal-box">
  ℹ️ <strong>Hinweis:</strong> Wenn Sie den Vertrag widerrufen wollen, füllen Sie bitte dieses Formular aus und senden Sie es zurück.
  Die Widerrufsfrist beträgt <strong>14 Tage</strong> ab Erhalt der Ware. Zur Wahrung der Frist genügt die rechtzeitige Absendung.
  Sie können das Formular auch per E-Mail senden an: <strong>${shopEmail}</strong>
</div>

<!-- Empfänger (vorausgefüllt) -->
<h2>An: Händler (Empfänger des Widerrufs)</h2>
<div class="section">
  <div class="field-row">
    <span class="field-label">Unternehmen:</span>
    <span style="font-weight:bold;">${shopName}</span>
  </div>
  <div class="field-row">
    <span class="field-label">Anschrift:</span>
    <span>${shopAdresse}</span>
  </div>
  <div class="field-row">
    <span class="field-label">E-Mail:</span>
    <span>${shopEmail}</span>
  </div>
  ${shopWebsite ? `<div class="field-row"><span class="field-label">Website:</span><span>${shopWebsite}</span></div>` : ''}
</div>

<!-- Hiermit-Erklärung -->
<h2>Widerrufserklärung (bitte ausfüllen)</h2>
<div class="section">
  <p style="font-size:9.5pt;margin-bottom:8px;">
    Hiermit widerrufe(n) ich/wir den von mir/uns abgeschlossenen Vertrag über den Kauf der folgenden Waren:
  </p>

  <!-- Bestelldaten -->
  <div class="two-col">
    <div>
      <div class="field-row">
        <span class="field-label">Bestellnummer:</span>
      </div>
      <div class="field-line" style="margin-top:2px;"></div>
    </div>
    <div>
      <div class="field-row">
        <span class="field-label">Bestelldatum:</span>
      </div>
      <div class="field-line" style="margin-top:2px;"></div>
    </div>
  </div>

  <div class="field-row" style="margin-top:7px;">
    <span class="field-label">Artikel / Beschreibung:</span>
    <span class="optional-label">(optional)</span>
  </div>
  <div class="field-line tall"></div>
  <div class="field-line tall" style="margin-top:3px;"></div>

  <div class="field-row" style="margin-top:7px;">
    <span class="field-label">Eingegangen am:</span>
    <span class="field-line"></span>
  </div>
</div>

<!-- Kundendaten -->
<h2>Kundendaten</h2>
<div class="section">
  <div class="field-row">
    <span class="field-label">Vor- und Nachname:</span>
    ${customerName ? `<span style="font-weight: 500;">${customerName}</span>` : '<span class="field-line"></span>'}
  </div>
  <div class="field-row">
    <span class="field-label">Straße, Nr.:</span>
    <span class="field-line"></span>
  </div>
  <div class="two-col" style="margin-top:5px;">
    <div class="field-row">
      <span class="field-label">PLZ:</span>
      <span class="field-line"></span>
    </div>
    <div class="field-row">
      <span class="field-label">Ort:</span>
      <span class="field-line"></span>
    </div>
  </div>
  <div class="field-row" style="margin-top:5px;">
    <span class="field-label">E-Mail:</span>
    <span class="field-line"></span>
    <span class="optional-label">(für Eingangsbestätigung empfohlen)</span>
  </div>
</div>

<!-- Grund (optional) -->
<h2>Widerrufsgrund <span class="optional-label">(freiwillig – kein Pflichtfeld)</span></h2>
<div class="section">
  <div class="field-line tall"></div>
  <div class="field-line tall" style="margin-top:4px;"></div>
  <p class="hint">Ein Widerrufsgrund muss nicht angegeben werden. Die Angabe hilft uns optional bei der Qualitätsverbesserung.</p>
</div>

<!-- Unterschrift -->
<div class="section" style="margin-top:6px;">
  <div class="two-col">
    <div>
      <div class="field-row">
        <span class="field-label">Ort, Datum:</span>
      </div>
      <div class="field-line" style="margin-top:2px;"></div>
    </div>
    <div>
      <div class="field-row">
        <span class="field-label">Unterschrift:</span>
        <span class="optional-label">(nur bei Papierform)</span>
      </div>
      <div class="field-line" style="margin-top:2px;min-height:28px;"></div>
    </div>
  </div>
</div>

<!-- Footer -->
<div class="footer">
  <span>Stand: ${today} · Muster-Widerrufsformular gem. Anlage 2 zu Art. 246a § 1 Abs. 2 S. 1 Nr. 1 EGBGB</span>
  <span>${shopName} · ${shopEmail}</span>
</div>

</body>
</html>`;

    let browser;
    try {
      browser = await puppeteer.launch({
        headless: 'new',
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
      });
      const page = await browser.newPage();
      await page.setContent(html, { waitUntil: 'networkidle0' });
      const pdfBuffer = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: { top: '18mm', right: '18mm', bottom: '14mm', left: '18mm' }
      });
      return Buffer.from(pdfBuffer);
    } finally {
      if (browser) await browser.close();
    }
  }
}

module.exports = WiderrufPDFService;
