const puppeteer = require('puppeteer');
const path = require('path');

class PDFService {
  // 🧾 Rechnung als PDF generieren
  static async generateInvoicePDF(bestellung) {
    let browser;
    
    try {
      console.log('🧾 Generiere PDF für Bestellung:', bestellung.bestellnummer);
      
      // Browser starten
      browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      });
      
      const page = await browser.newPage();
      
      // PDF-Layout
      await page.setContent(this.generateInvoiceHTML(bestellung), {
        waitUntil: 'networkidle0'
      });
      
      // PDF generieren
      const pdfBuffer = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: {
          top: '1cm',
          right: '1cm',
          bottom: '1cm',
          left: '1cm'
        }
      });
      
      console.log('✅ PDF erfolgreich generiert');
      return pdfBuffer;
      
    } catch (error) {
      console.error('❌ Fehler bei PDF-Generierung:', error);
      throw new Error('PDF konnte nicht generiert werden: ' + error.message);
      
    } finally {
      if (browser) {
        await browser.close();
      }
    }
  }

  // 📄 HTML für Rechnung generieren
  static generateInvoiceHTML(bestellung) {
    const formatPrice = (price) => {
      return new Intl.NumberFormat('de-DE', {
        style: 'currency',
        currency: 'EUR'
      }).format(price || 0);
    };

    const formatDate = (date) => {
      return new Intl.DateTimeFormat('de-DE', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      }).format(new Date(date));
    };

    return `
    <!DOCTYPE html>
    <html lang="de">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Rechnung ${bestellung.bestellnummer}</title>
      <style>
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        
        body {
          font-family: 'Arial', sans-serif;
          font-size: 12px;
          line-height: 1.4;
          color: #333;
        }
        
        .invoice-container {
          max-width: 800px;
          margin: 0 auto;
          padding: 20px;
        }
        
        .header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 40px;
          border-bottom: 2px solid #007bff;
          padding-bottom: 20px;
        }
        
        .company-info {
          flex: 1;
        }
        
        .company-name {
          font-size: 24px;
          font-weight: bold;
          color: #007bff;
          margin-bottom: 10px;
        }
        
        .company-details {
          font-size: 11px;
          line-height: 1.3;
        }
        
        .invoice-info {
          text-align: right;
          flex: 1;
        }
        
        .invoice-title {
          font-size: 28px;
          font-weight: bold;
          color: #007bff;
          margin-bottom: 10px;
        }
        
        .invoice-details {
          font-size: 11px;
        }
        
        .addresses {
          display: flex;
          justify-content: space-between;
          margin-bottom: 40px;
        }
        
        .address-block {
          flex: 1;
          margin-right: 20px;
        }
        
        .address-block:last-child {
          margin-right: 0;
        }
        
        .address-title {
          font-weight: bold;
          font-size: 14px;
          margin-bottom: 10px;
          color: #007bff;
        }
        
        .address-content {
          line-height: 1.4;
        }
        
        .items-table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 30px;
        }
        
        .items-table th {
          background-color: #007bff;
          color: white;
          padding: 12px 8px;
          text-align: left;
          font-weight: bold;
        }
        
        .items-table th:last-child,
        .items-table td:last-child {
          text-align: right;
        }
        
        .items-table td {
          padding: 10px 8px;
          border-bottom: 1px solid #ddd;
        }
        
        .items-table tr:nth-child(even) {
          background-color: #f8f9fa;
        }
        
        .totals {
          margin-left: auto;
          width: 300px;
        }
        
        .totals-table {
          width: 100%;
          border-collapse: collapse;
        }
        
        .totals-table td {
          padding: 8px 12px;
          border-bottom: 1px solid #ddd;
        }
        
        .totals-table .total-row {
          font-weight: bold;
          font-size: 14px;
          background-color: #007bff;
          color: white;
        }
        
        .footer {
          margin-top: 50px;
          padding-top: 20px;
          border-top: 1px solid #ddd;
          font-size: 10px;
          color: #666;
        }
        
        .footer-columns {
          display: flex;
          justify-content: space-between;
        }
        
        .footer-column {
          flex: 1;
          margin-right: 20px;
        }
        
        .footer-column:last-child {
          margin-right: 0;
        }
        
        .footer-title {
          font-weight: bold;
          margin-bottom: 5px;
        }
      </style>
    </head>
    <body>
      <div class="invoice-container">
        <!-- Header -->
        <div class="header">
          <div class="company-info">
            <div class="company-name">Soap Homepage</div>
            <div class="company-details">
              Musterstraße 123<br>
              12345 Musterstadt<br>
              Deutschland<br><br>
              Tel: +49 123 456789<br>
              E-Mail: info@soap-homepage.de<br>
              Web: www.soap-homepage.de
            </div>
          </div>
          <div class="invoice-info">
            <div class="invoice-title">RECHNUNG</div>
            <div class="invoice-details">
              <strong>Rechnungsnummer:</strong> ${bestellung.bestellnummer}<br>
              <strong>Rechnungsdatum:</strong> ${formatDate(bestellung.bestelldatum)}<br>
              <strong>Kundennummer:</strong> ${bestellung.kundennummer || 'N/A'}
            </div>
          </div>
        </div>

        <!-- Adressen -->
        <div class="addresses">
          <div class="address-block">
            <div class="address-title">Rechnungsadresse</div>
            <div class="address-content">
              ${bestellung.rechnungsadresse?.vorname || ''} ${bestellung.rechnungsadresse?.nachname || ''}<br>
              ${bestellung.rechnungsadresse?.strasse || ''} ${bestellung.rechnungsadresse?.hausnummer || ''}<br>
              ${bestellung.rechnungsadresse?.zusatz ? bestellung.rechnungsadresse.zusatz + '<br>' : ''}
              ${bestellung.rechnungsadresse?.plz || ''} ${bestellung.rechnungsadresse?.stadt || ''}<br>
              ${bestellung.rechnungsadresse?.land || 'Deutschland'}
            </div>
          </div>
          
          ${bestellung.lieferadresse && bestellung.lieferadresse.strasse ? `
          <div class="address-block">
            <div class="address-title">Lieferadresse</div>
            <div class="address-content">
              ${bestellung.lieferadresse?.vorname || ''} ${bestellung.lieferadresse?.nachname || ''}<br>
              ${bestellung.lieferadresse?.strasse || ''} ${bestellung.lieferadresse?.hausnummer || ''}<br>
              ${bestellung.lieferadresse?.zusatz ? bestellung.lieferadresse.zusatz + '<br>' : ''}
              ${bestellung.lieferadresse?.plz || ''} ${bestellung.lieferadresse?.stadt || ''}<br>
              ${bestellung.lieferadresse?.land || 'Deutschland'}
            </div>
          </div>
          ` : ''}
        </div>

        <!-- Artikel-Tabelle -->
        <table class="items-table">
          <thead>
            <tr>
              <th>Pos.</th>
              <th>Artikel</th>
              <th>Menge</th>
              <th>Einzelpreis</th>
              <th>Gesamtpreis</th>
            </tr>
          </thead>
          <tbody>
            ${bestellung.artikel?.map((artikel, index) => `
            <tr>
              <td>${index + 1}</td>
              <td>
                ${artikel.name || 'Unbekannter Artikel'}<br>
                <small style="color: #666;">${artikel.beschreibung || ''}</small>
              </td>
              <td>${artikel.menge || 1}</td>
              <td>${formatPrice(artikel.preis)}</td>
              <td>${formatPrice((artikel.menge || 1) * (artikel.preis || 0))}</td>
            </tr>
            `).join('') || ''}
          </tbody>
        </table>

        <!-- Summen -->
        <div class="totals">
          <table class="totals-table">
            <tr>
              <td>Zwischensumme (netto):</td>
              <td style="text-align: right;">${formatPrice(bestellung.gesamt?.netto || 0)}</td>
            </tr>
            <tr>
              <td>MwSt. (${bestellung.gesamt?.mwstSatz || 19}%):</td>
              <td style="text-align: right;">${formatPrice(bestellung.gesamt?.mwst || 0)}</td>
            </tr>
            ${bestellung.versandkosten ? `
            <tr>
              <td>Versandkosten:</td>
              <td style="text-align: right;">${formatPrice(bestellung.versandkosten)}</td>
            </tr>
            ` : ''}
            <tr class="total-row">
              <td><strong>Gesamtbetrag:</strong></td>
              <td style="text-align: right;"><strong>${formatPrice(bestellung.gesamt?.brutto || 0)}</strong></td>
            </tr>
          </table>
        </div>

        <!-- Zahlungsinformationen -->
        ${bestellung.zahlung ? `
        <div style="margin-top: 30px; padding: 15px; background-color: #f8f9fa; border-left: 4px solid #007bff;">
          <strong>Zahlungsinformationen:</strong><br>
          Zahlungsart: ${bestellung.zahlung.methode || 'N/A'}<br>
          ${bestellung.zahlung.status ? `Status: ${bestellung.zahlung.status}<br>` : ''}
          ${bestellung.zahlung.datum ? `Zahlungsdatum: ${formatDate(bestellung.zahlung.datum)}<br>` : ''}
        </div>
        ` : ''}

        <!-- Footer -->
        <div class="footer">
          <div class="footer-columns">
            <div class="footer-column">
              <div class="footer-title">Bankverbindung</div>
              IBAN: DE12 3456 7890 1234 5678 90<br>
              BIC: ABCDDE33XXX<br>
              Bank: Musterhausen Bank
            </div>
            <div class="footer-column">
              <div class="footer-title">Geschäftsführer</div>
              Max Mustermann<br>
              Handelsregister: HRB 12345<br>
              Amtsgericht Musterstadt
            </div>
            <div class="footer-column">
              <div class="footer-title">Steuern</div>
              USt-IdNr.: DE123456789<br>
              Steuer-Nr.: 123/456/78901
            </div>
          </div>
          
          <div style="text-align: center; margin-top: 20px; font-size: 9px;">
            Vielen Dank für Ihren Einkauf bei Soap Homepage!
          </div>
        </div>
      </div>
    </body>
    </html>
    `;
  }
}

module.exports = PDFService;