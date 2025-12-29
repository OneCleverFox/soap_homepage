const puppeteer = require('puppeteer');
const path = require('path');
const InvoiceTemplate = require('../models/InvoiceTemplate');

class PDFService {
  // 🧾 Rechnung als PDF generieren
  static async generateInvoicePDF(bestellung, providedTemplate = null) {
    let browser;
    
    try {
      console.log('🧾 Generiere PDF für Bestellung:', bestellung.bestellnummer);
      console.log('🔍 Bestelldaten:', JSON.stringify(bestellung, null, 2));
      
      // IMMER das aktuelle Default-Template aus der Datenbank laden
      // um sicherzustellen dass aktuelle Einstellungen verwendet werden
      let template = await InvoiceTemplate.findOne({ isDefault: true });
      
      if (providedTemplate && providedTemplate._id) {
        // Überschreibe nur wenn explizit Template-ID gegeben
        const explicitTemplate = await InvoiceTemplate.findById(providedTemplate._id);
        if (explicitTemplate) {
          template = explicitTemplate;
        }
      }
      
      if (!template) {
        console.warn('⚠️ Kein Template gefunden - verwende Minimal-Fallback');
        template = {
          name: 'Minimal Template',
          companyInfo: {
            name: 'Glücksmomente Manufaktur',
            isSmallBusiness: true // Fallback immer Kleinunternehmer
          }
        };
      }
      
      console.log('🎨 Verwende Template:', template.name);
      console.log('💰 USt-Status:', template.companyInfo?.isSmallBusiness ? 'Kleinunternehmer (keine USt)' : 'USt-pflichtig (19%)');
      console.log('📋 Template companyInfo:', JSON.stringify(template.companyInfo, null, 2));
      
      // Browser starten
      browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      });
      
      const page = await browser.newPage();
      
      // PDF-Layout mit Template-Daten
      const htmlContent = PDFService.generateTemplateBasedHTML(bestellung, template);
      console.log('📄 Generated HTML length:', htmlContent.length);
      
      await page.setContent(htmlContent, {
        waitUntil: 'networkidle0'
      });

      // Company Info für Header/Footer extrahieren
      const fallbackCompany = {
        name: 'Glücksmomente Manufaktur',
        contact: { email: 'info@gluecksmomente-manufaktur.de' }
      };
      const companyInfo = {
        ...fallbackCompany,
        ...(template?.companyInfo || {})
      };
      
      // PDF generieren
      const pdfBuffer = await page.pdf({
        format: 'A4',
        printBackground: true,
        displayHeaderFooter: true,
        headerTemplate: `
          <div style="font-size: 8px; margin: 0 20px; width: 100%; border-bottom: 1px solid #ddd; padding-bottom: 2px;">
            <span style="float: left;">${companyInfo.name || 'Rechnung'}</span>
            <span style="float: right;">Seite <span class="pageNumber"></span> von <span class="totalPages"></span></span>
          </div>
        `,
        footerTemplate: `
          <div style="font-size: 8px; margin: 0 20px; width: 100%; text-align: center; border-top: 1px solid #ddd; padding-top: 2px;">
            <span>${companyInfo.name} | ${companyInfo.contact?.email || ''}</span>
          </div>
        `,
        margin: {
          top: '30mm',
          right: '20mm',
          bottom: '25mm',
          left: '20mm'
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

  // 🎨 Template-basierte HTML Generierung (Admin-kompatibel)
  static generateTemplateBasedHTML(bestellung, template) {
    const formatPrice = (price) => {
      return new Intl.NumberFormat('de-DE', {
        style: 'currency',
        currency: 'EUR'
      }).format(price || 0);
    };

    const formatDate = (date) => {
      if (!date) return new Date().toLocaleDateString('de-DE');
      return new Intl.DateTimeFormat('de-DE', {
        year: 'numeric',
        month: 'long', 
        day: 'numeric'
      }).format(new Date(date));
    };

    // Template-basierte Company-Info mit korrekter USt-Behandlung
    const defaultCompany = {
      name: 'Glücksmomente Manufaktur',
      address: {
        street: 'Musterstraße 123',
        postalCode: '64673',
        city: 'Zwingenberg',
        country: 'Deutschland'
      },
      contact: {
        phone: '+49 6251 1234567',
        email: 'ralle.jacob84@googlemail.com',
        website: 'www.glücksmomente-manufaktur.vercel.app'
      },
      taxInfo: {
        taxNumber: '11548484',
        vatId: 'DE123456789',
        ceo: 'Ralf Jacob',
        registrationCourt: 'Amtsgericht Darmstadt'
      },
      bankDetails: {
        bankName: 'Sparkasse Bensheim', 
        iban: 'DE85 5085 2651 0346 0592 50',
        bic: 'HELADEF1DAD'
      },
      isSmallBusiness: true // Default Fallback
    };
    
    // Merge Template mit Default-Werten - Template hat ABSOLUTE Priorität
    const companyInfo = {
      ...defaultCompany,
      ...(template?.companyInfo || {}),
      address: {
        ...defaultCompany.address,
        ...(template?.companyInfo?.address || {})
      },
      contact: {
        ...defaultCompany.contact,
        ...(template?.companyInfo?.contact || {})
      },
      taxInfo: {
        ...defaultCompany.taxInfo,
        ...(template?.companyInfo?.taxInfo || {})
      },
      bankDetails: {
        ...defaultCompany.bankDetails,
        ...(template?.companyInfo?.bankDetails || {})
      },
      // USt-Status: Template-Einstellung hat ABSOLUTE Priorität
      isSmallBusiness: template?.companyInfo?.isSmallBusiness !== undefined 
                      ? template.companyInfo.isSmallBusiness 
                      : defaultCompany.isSmallBusiness
    };

    console.log('🏢 Company Info:', JSON.stringify(companyInfo, null, 2));
    
    // Artikel-Daten prüfen und aufbereiten
    const artikel = Array.isArray(bestellung.artikel) ? bestellung.artikel : [];
    console.log('📦 Artikel Anzahl:', artikel.length);
    artikel.forEach((item, index) => {
      console.log(`📦 Artikel ${index + 1}:`, JSON.stringify(item, null, 2));
    });

    return `
    <!DOCTYPE html>
    <html lang="de">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Rechnung ${bestellung.bestellnummer} - ${companyInfo.name}</title>
      <style>
        @page {
          size: A4;
          margin: 25mm 20mm 25mm 20mm;
        }
        
        @page :first {
          margin-top: 15mm;
        }
        
        /* Running Headers/Footers für mehrseitige Dokumente */
        .page-header {
          position: running(pageHeader);
          width: 100%;
          border-bottom: 1px solid #3498db;
          padding-bottom: 2mm;
          margin-bottom: 2mm;
          font-size: 8pt;
          color: #7f8c8d;
        }
        
        .page-footer {
          position: running(pageFooter);
          width: 100%;
          border-top: 1px solid #e0e0e0;
          padding-top: 2mm;
          margin-top: 2mm;
          font-size: 8pt;
          text-align: center;
          color: #7f8c8d;
        }
        
        @page {
          @top-center {
            content: element(pageHeader);
          }
          @bottom-center {
            content: element(pageFooter);
          }
        }
        
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        
        body {
          font-family: 'Segoe UI', -apple-system, BlinkMacSystemFont, 'Roboto', sans-serif;
          font-size: 9pt;
          line-height: 1.3;
          color: #2c3e50;
          background: white;
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }
        
        .invoice-container {
          width: 210mm;
          min-height: 297mm;
          max-width: 210mm;
          margin: 0 auto;
          padding: 15mm 20mm;
          background: white;
          position: relative;
          display: flex;
          flex-direction: column;
        }
        
        /* ===== HEADER STYLES ===== */
        .invoice-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 20mm;
          padding-bottom: 5mm;
          border-bottom: 2px solid #3498db;
          page-break-inside: avoid;
          min-height: 25mm;
        }
        
        .company-info {
          flex: 1;
          max-width: 60%;
        }
        
        .company-name {
          font-size: 14pt;
          font-weight: 700;
          color: #2c3e50;
          margin-bottom: 3mm;
          letter-spacing: -0.2px;
        }
        
        .company-address {
          font-size: 8pt;
          color: #34495e;
          line-height: 1.2;
          margin-bottom: 2mm;
        }
        
        .company-contact {
          font-size: 8pt;
          color: #34495e;
          line-height: 1.2;
        }
        
        .invoice-title-section {
          text-align: right;
          max-width: 35%;
          min-width: 60mm;
        }
        
        .invoice-title {
          font-size: 16pt;
          font-weight: 700;
          color: #3498db;
          margin-bottom: 5mm;
        }
        
        .invoice-meta {
          font-size: 8pt;
          color: #34495e;
          text-align: right;
        }
        
        .invoice-meta div {
          margin-bottom: 1mm;
          display: flex;
          justify-content: space-between;
          min-width: 50mm;
        }
        
        .invoice-meta strong {
          color: #2c3e50;
          margin-left: 5mm;
        }
        
        /* ===== CUSTOMER SECTION ===== */
        .customer-section {
          margin-bottom: 15mm;
          page-break-inside: avoid;
          min-height: 20mm;
        }
        
        .customer-label {
          font-size: 8pt;
          color: #7f8c8d;
          margin-bottom: 2mm;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        
        .customer-address {
          font-size: 9pt;
          color: #2c3e50;
          line-height: 1.3;
          max-width: 80mm;
        }
        
        .customer-name {
          font-weight: 600;
          margin-bottom: 1mm;
        }
        
        /* ===== PRODUCTS TABLE ===== */
        .products-section {
          flex: 1;
          margin-bottom: 10mm;
        }
        
        .products-title {
          font-size: 10pt;
          font-weight: 600;
          color: #2c3e50;
          margin-bottom: 5mm;
          padding-bottom: 2mm;
          border-bottom: 1px solid #bdc3c7;
        }
        
        .products-table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 5mm;
          font-size: 8pt;
        }
        
        .products-table th {
          background: #ecf0f1;
          color: #2c3e50;
          padding: 3mm 2mm;
          text-align: left;
          font-weight: 600;
          border: 1px solid #bdc3c7;
          font-size: 7pt;
        }
        
        .products-table td {
          padding: 2mm;
          border: 1px solid #ecf0f1;
          vertical-align: top;
          line-height: 1.2;
        }
        
        .products-table tr:nth-child(even) {
          background: #fafbfc;
        }
        
        .text-right { text-align: right; }
        .text-center { text-align: center; }
        
        .product-name {
          font-weight: 600;
          color: #2c3e50;
          margin-bottom: 1mm;
          font-size: 8pt;
        }
        
        .product-sku {
          font-size: 7pt;
          color: #7f8c8d;
        }
        
        .product-description {
          font-size: 7pt;
          color: #34495e;
          line-height: 1.2;
        }
        
        /* ===== TOTALS SECTION ===== */
        .totals-section {
          margin-top: 5mm;
          margin-bottom: 10mm;
          display: flex;
          justify-content: flex-end;
          page-break-inside: avoid;
        }
        
        .totals-table {
          width: 60mm;
          font-size: 8pt;
          border-collapse: collapse;
        }
        
        .totals-table td {
          padding: 2mm 3mm;
          border-bottom: 1px solid #ecf0f1;
        }
        
        .totals-table .total-label {
          text-align: left;
          color: #34495e;
        }
        
        .totals-table .total-amount {
          text-align: right;
          font-weight: 600;
          color: #2c3e50;
        }
        
        .grand-total td {
          border-top: 2px solid #3498db;
          border-bottom: 2px solid #3498db;
          background: #ecf0f1;
          font-weight: 700;
          font-size: 9pt;
          color: #2c3e50;
        }
        
        /* ===== FOOTER SECTION ===== */
        .invoice-footer {
          margin-top: auto;
          padding: 5mm 4mm;
          background: #f8f9fa;
          border-radius: 2mm;
          border: 1px solid #dee2e6;
          border-top: 2px solid #3498db;
          page-break-inside: avoid;
          font-size: 7pt;
          min-height: 25mm;
        }
        
        .footer-grid {
          display: grid;
          grid-template-columns: 1fr 1fr 1fr;
          gap: 5mm;
          margin-bottom: 3mm;
        }
        
        .footer-column {
          padding: 0 2mm;
        }
        
        .footer-column h4 {
          font-size: 8pt;
          color: #3498db;
          margin-bottom: 2mm;
          font-weight: 700;
          display: flex;
          align-items: center;
          gap: 1mm;
        }
        
        .footer-column p {
          margin: 0 0 1mm 0;
          line-height: 1.2;
          color: #34495e;
        }
        
        .footer-column strong {
          color: #2c3e50;
        }
        
        .footer-center {
          text-align: center;
          border-left: 1px solid #dee2e6;
          border-right: 1px solid #dee2e6;
        }
        
        .footer-right {
          text-align: right;
        }
        
        .footer-bank {
          display: flex;
          justify-content: center;
          align-items: center;
          gap: 5mm;
          padding: 3mm;
          background: white;
          border-radius: 2mm;
          margin-bottom: 3mm;
          border: 1px solid #e9ecef;
          flex-wrap: wrap;
        }
        
        .footer-bank-item {
          display: flex;
          flex-direction: column;
          align-items: center;
          min-width: 25mm;
        }
        
        .footer-bank-item strong {
          color: #3498db;
          font-size: 6pt;
          text-transform: uppercase;
          margin-bottom: 1mm;
          font-weight: 700;
        }
        
        .footer-bank-item span {
          font-size: 7pt;
          color: #34495e;
          font-weight: 500;
        }
        
        .footer-legal {
          text-align: center;
          font-size: 6pt;
          color: #7f8c8d;
          font-style: italic;
          margin-top: 3mm;
          padding-top: 2mm;
          border-top: 1px solid #e9ecef;
          line-height: 1.1;
        }
        
        .footer-legal strong {
          color: #34495e;
          font-weight: 600;
        }
      </style>
    </head>
    <body>
      <div class="invoice-container">
        
        <!-- ===== HEADER SECTION ===== -->
        <div class="invoice-header">
          <div class="company-info">
            <div class="company-name">${companyInfo.name}</div>
            <div class="company-address">
              ${companyInfo.address.street}<br>
              ${companyInfo.address.postalCode} ${companyInfo.address.city}<br>
              ${companyInfo.address.country}
            </div>
            <div class="company-contact">
              Tel: ${companyInfo.contact.phone}<br>
              E-Mail: ${companyInfo.contact.email}<br>
              Web: ${companyInfo.contact.website}
            </div>
          </div>
          
          <div class="invoice-title-section">
            <div class="invoice-title">RECHNUNG</div>
            <div class="invoice-meta">
              <div><span>Rechnungsnr.:</span> <strong>${bestellung.bestellnummer}</strong></div>
              <div><span>Rechnungsdatum:</span> <strong>${formatDate(bestellung.bestelldatum)}</strong></div>
              <div><span>Kundennummer:</span> <strong>${bestellung.kundennummer || 'N/A'}</strong></div>
            </div>
          </div>
        </div>

        <!-- ===== CUSTOMER SECTION ===== -->
        <div class="customer-section">
          <div class="customer-label">Rechnungsadresse</div>
          <div class="customer-address">
            <div class="customer-name">
              ${bestellung.rechnungsadresse?.vorname || ''} ${bestellung.rechnungsadresse?.nachname || ''}
              ${bestellung.rechnungsadresse?.firma ? '<br>' + bestellung.rechnungsadresse.firma : ''}
            </div>
            <div>
              ${bestellung.rechnungsadresse?.strasse || ''} ${bestellung.rechnungsadresse?.hausnummer || ''}<br>
              ${bestellung.rechnungsadresse?.zusatz ? bestellung.rechnungsadresse.zusatz + '<br>' : ''}
              ${bestellung.rechnungsadresse?.plz || ''} ${bestellung.rechnungsadresse?.stadt || ''}<br>
              ${bestellung.rechnungsadresse?.land || 'Deutschland'}
            </div>
          </div>
        </div>

        <!-- ===== PRODUCTS SECTION ===== -->
        <div class="products-section">
          <div class="products-title">Artikel</div>
          <table class="products-table">
            <thead>
              <tr>
                <th style="width: 8%;">Pos.</th>
                <th style="width: 38%;">Artikel</th>
                <th style="width: 28%;">Beschreibung</th>
                <th style="width: 8%;">Menge</th>
                <th style="width: 9%;">Einzelpreis</th>
                <th style="width: 9%;">Gesamtpreis</th>
              </tr>
            </thead>
            <tbody>
              ${artikel.length > 0 ? artikel.map((item, index) => `
                <tr>
                  <td class="text-center">${index + 1}</td>
                  <td>
                    <div class="product-name">${item.name || 'Produktname nicht verfügbar'}</div>
                    ${item.sku ? `<div class="product-sku">Art.-Nr.: ${item.sku}</div>` : ''}
                  </td>
                  <td>
                    <div class="product-description">${item.beschreibung || item.description || 'Keine Beschreibung verfügbar'}</div>
                  </td>
                  <td class="text-center">${item.menge || 1} Stück</td>
                  <td class="text-right">${formatPrice(item.preis || item.unitPrice || 0)}</td>
                  <td class="text-right"><strong>${formatPrice((item.menge || 1) * (item.preis || item.unitPrice || 0))}</strong></td>
                </tr>
              `).join('') : `
                <tr>
                  <td colspan="6" style="text-align: center; padding: 20px; color: #7f8c8d; font-style: italic;">
                    Keine Artikel gefunden
                  </td>
                </tr>
              `}
            </tbody>
          </table>
        </div>

        <!-- ===== TOTALS SECTION ===== -->
        <div class="totals-section">
          <table class="totals-table">
            <tr>
              <td class="total-label">Zwischensumme (netto):</td>
              <td class="total-amount">${formatPrice(bestellung.nettosumme || bestellung.gesamt?.netto || 0)}</td>
            </tr>
            ${(!companyInfo.isSmallBusiness) ? `
            <tr>
              <td class="total-label">MwSt. (19%):</td>
              <td class="total-amount">${formatPrice(bestellung.mwst || bestellung.gesamt?.mwst || 0)}</td>
            </tr>
            ` : `
            <tr>
              <td class="total-label small-business">Keine USt (§ 19 UStG):</td>
              <td class="total-amount">0,00€</td>
            </tr>
            `}
            ${bestellung.versandkosten ? `
            <tr>
              <td class="total-label">Versandkosten:</td>
              <td class="total-amount">${formatPrice(bestellung.versandkosten)}</td>
            </tr>
            ` : ''}
            <tr class="grand-total">
              <td class="total-label"><strong>Gesamtbetrag:</strong></td>
              <td class="total-amount"><strong>${formatPrice(bestellung.gesamtsumme || bestellung.gesamt?.brutto || 0)}</strong></td>
            </tr>
          </table>
        </div>

        <!-- ===== FOOTER SECTION ===== -->
        <div class="invoice-footer">
          <div class="footer-grid">
            <!-- Kontakt & Service -->
            <div class="footer-column">
              <h4>📞 Kontakt & Service</h4>
              <p><strong>Telefon:</strong> ${companyInfo.contact.phone}</p>
              <p><strong>E-Mail:</strong> ${companyInfo.contact.email}</p>
              <p><strong>Web:</strong> ${companyInfo.contact.website}</p>
              <p><strong>Erreichbarkeit:</strong><br>Nach Vereinbarung</p>
            </div>
            
            <!-- Steuerliche Angaben -->
            <div class="footer-column footer-center">
              <h4>🏛️ Steuerliche Angaben</h4>
              <p><strong>Steuernummer:</strong> ${companyInfo.taxInfo.taxNumber}</p>
              ${companyInfo.taxInfo.vatId ? `<p><strong>USt-IdNr.:</strong> ${companyInfo.taxInfo.vatId}</p>` : ''}
              <p><strong>Inhaber:</strong> ${companyInfo.taxInfo.ceo}</p>
            </div>
            
            <!-- Rechtliche Angaben -->
            <div class="footer-column footer-right">
              <h4>⚖️ Rechtliche Angaben</h4>
              <p><strong>Amtsgericht:</strong> ${companyInfo.taxInfo.registrationCourt}</p>
              <p><strong>Rechtsform:</strong> Einzelunternehmen</p>
              <p><strong>Gerichtsstand:</strong> Zwingenberg</p>
            </div>
          </div>
          
          <!-- Zahlungsmodalitäten -->
          <div class="footer-bank">
            <div class="footer-bank-item">
              <strong>💵 Zahlung</strong>
              <span>Sofort fällig</span>
            </div>
            <div class="footer-bank-item">
              <strong>📱 PayPal</strong>
              <span>Bevorzugt</span>
            </div>
            <div class="footer-bank-item">
              <strong>💰 Bar</strong>
              <span>Bei Abholung</span>
            </div>
            ${((!companyInfo.isSmallBusiness && companyInfo.taxInfo?.useVat !== false) || template?.layout?.footer?.showBankDetails) ? `
            <div class="footer-bank-item">
              <strong>🏦 Bank</strong>
              <span>${companyInfo.bankDetails.bankName}</span>
            </div>
            <div class="footer-bank-item">
              <strong>💳 IBAN</strong>
              <span>${companyInfo.bankDetails.iban}</span>
            </div>
            ` : ''}
          </div>
          
          <!-- Rechtliche Hinweise -->
          <div class="footer-legal">
            <strong>
              ${companyInfo.isSmallBusiness 
                ? 'Kleinunternehmer-Regelung: Gemäß § 19 UStG wird keine Umsatzsteuer ausgewiesen.' 
                : 'Steuerpflichtige Lieferung: Diese Rechnung enthält ausgewiesene Umsatzsteuer (§ 14 UStG).'
              }
            </strong><br>
            Diese Rechnung entspricht den gesetzlichen Anforderungen nach § 14 UStG. 
            Es gilt deutsches Recht. Erfüllungsort und Gerichtsstand ist Zwingenberg.
          </div>
        </div>
        
      </div>
    </body>
    </html>
    `;
  }

  // 📄 Alte HTML-Generierung als Fallback (falls Template nicht verfügbar)
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