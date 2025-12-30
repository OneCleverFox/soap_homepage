// ===== ZUSÄTZLICHE METHODEN FÜR BESTELLRECHNUNGEN =====

// Hilfsfunktionen für Rechnungsgenerierung
generateProductTableHTML(products, isFirstPage = true) {
  if (!products || products.length === 0) return '';
  
  return `
    <!-- ===== PRODUCTS TABLE ===== -->
    <div class="products-section avoid-page-break">
      ${isFirstPage ? '<h3>Positionen</h3>' : ''}
      <table class="products-table">
        <thead class="table-header-repeat">
          <tr>
            <th>Pos.</th>
            <th>Artikel</th>
            <th>Beschreibung</th>
            <th>Menge</th>
            <th>Einzelpreis</th>
            <th>Gesamt</th>
          </tr>
        </thead>
        <tbody>
          ${products.map((product, index) => `
            <tr class="avoid-page-break">
              <td>${index + 1}</td>
              <td>
                <strong>${product.name || 'Artikel'}</strong>
                ${product.sku ? `<br><small>Art.-Nr.: ${product.sku}</small>` : ''}
              </td>
              <td>${product.description || ''}</td>
              <td>${product.quantity || 1}</td>
              <td>${(product.unitPrice || 0).toFixed(2)} €</td>
              <td><strong>${(product.total || 0).toFixed(2)} €</strong></td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;
}

generateTotalsHTML(data) {
  const netTotal = data.order?.netTotal || 0;
  const shippingCost = data.order?.shipping?.cost || 0;
  const grandTotal = netTotal + shippingCost;
  
  return `
    <!-- ===== TOTALS SECTION ===== -->
    <div class="totals-section avoid-page-break">
      <table class="totals-table">
        <tr>
          <td>Nettobetrag:</td>
          <td>${netTotal.toFixed(2)} €</td>
        </tr>
        ${shippingCost > 0 ? `
          <tr>
            <td>Versandkosten:</td>
            <td>${shippingCost.toFixed(2)} €</td>
          </tr>
        ` : ''}
        <tr class="grand-total">
          <td><strong>Gesamtbetrag:</strong></td>
          <td><strong>${grandTotal.toFixed(2)} €</strong></td>
        </tr>
      </table>
    </div>
  `;
}

generateLegalNoticesHTML(data) {
  return `
    <!-- ===== LEGAL NOTICES ===== -->
    <div class="legal-section">
      ${data.legal?.isSmallBusiness ? `
        <div class="tax-notice">
          <strong>Steuerbefreiung:</strong> ${data.legal.vatExemptionNote || 'Gemäß §19 UStG wird keine Umsatzsteuer ausgewiesen.'}
        </div>
      ` : ''}
      
      <div class="payment-terms">
        <strong>Zahlungshinweise:</strong><br>
        ${data.invoice?.paymentTerms || 'Zahlung bei Erhalt der Ware'}<br>
        Fälligkeit: ${data.invoice?.dueDate || 'sofort'}
      </div>
      
      <div class="legal-notice">
        ${data.invoice?.legalNotice || ''}
      </div>
    </div>
  `;
}

// HTML für mehrseitige Rechnung mit echten Bestelldaten generieren
generateMultiPageInvoiceHTML(template, data) {
  const companyInfo = template.companyInfo || {};
  const products = data.order?.products || [];
  
  // Produkte für Seitenumbruch aufteilen (ca. 15-20 Artikel pro Seite)
  const itemsPerPage = 15;
  const productPages = [];
  for (let i = 0; i < products.length; i += itemsPerPage) {
    productPages.push(products.slice(i, i + itemsPerPage));
  }
  
  // CSS für mehrseitige Rechnungen
  const multiPageCSS = this.getInvoiceCSS() + `
    /* ===== ADDITIONAL MULTI-PAGE STYLES ===== */
    .invoice-header-minimal {
      border-bottom: 1px solid #dee2e6;
      padding-bottom: 10px;
      margin-bottom: 20px;
    }
    
    .invoice-header-minimal h2 {
      font-size: 14pt;
      color: #0066cc;
      margin: 0;
    }
    
    .page-info {
      font-size: 9pt;
      color: #6c757d;
      text-align: right;
      margin-bottom: 20px;
    }
    
    .continued-table {
      margin-top: 0;
    }
    
    .page-totals {
      margin-top: 20px;
      font-size: 9pt;
      color: #495057;
      text-align: right;
    }
  `;
  
  // Basis-HTML-Struktur
  let html = `
    <!DOCTYPE html>
    <html lang="de">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Rechnung ${data.invoice?.number || ''}</title>
      <style>${multiPageCSS}</style>
    </head>
    <body>
  `;
  
  // Erste Seite mit vollständigem Header
  html += `
    <div class="invoice-wrapper">
      <div class="invoice-container">
        
        <!-- ===== HEADER SECTION ===== -->
        <div class="invoice-header">
          <div class="company-info">
            ${companyInfo.logo?.enabled ? `<img src="${companyInfo.logo.url}" alt="${data.company?.name || 'Logo'}" class="company-logo" />` : ''}
            <h1>${data.company?.name || 'Glücksmomente Manufaktur'}</h1>
            <div class="contact-details">
              ${data.company?.address?.street || ''}<br>
              ${data.company?.address?.postalCode || ''} ${data.company?.address?.city || ''}<br>
              Tel: ${data.company?.contact?.phone || ''}<br>
              E-Mail: ${data.company?.contact?.email || ''}
            </div>
          </div>
          
          <div class="invoice-details">
            <h2>Rechnung</h2>
            <table class="invoice-meta">
              <tr><td>Rechnungsnummer:</td><td><strong>${data.invoice?.number || ''}</strong></td></tr>
              <tr><td>Rechnungsdatum:</td><td>${data.invoice?.date || ''}</td></tr>
              <tr><td>Bestellnummer:</td><td>${data.order?.number || ''}</td></tr>
              <tr><td>Leistungsdatum:</td><td>${data.invoice?.performanceDate || ''}</td></tr>
            </table>
          </div>
        </div>
        
        <!-- ===== CUSTOMER SECTION ===== -->
        <div class="customer-section">
          <h3>Rechnungsempfänger</h3>
          <div class="customer-address">
            <strong>${data.customer?.name || ''}</strong><br>
            ${data.customer?.address?.street || ''}<br>
            ${data.customer?.address?.postalCode || ''} ${data.customer?.address?.city || ''}<br>
            <br>
            Kundennummer: ${data.customer?.customerNumber || ''}
          </div>
        </div>
  `;
  
  // Erste Seite mit Produkten
  if (productPages.length > 0) {
    html += this.generateProductTableHTML(productPages[0], true);
    
    if (productPages.length > 1) {
      // Seiteninfo wenn weitere Seiten folgen
      html += `<div class="page-totals">Fortsetzung auf Seite 2 - ${productPages.length}</div>`;
    }
  }
  
  // Wenn nur eine Seite: Summen und Footer hinzufügen
  if (productPages.length <= 1) {
    html += this.generateTotalsHTML(data);
    html += this.generateLegalNoticesHTML(data);
  }
  
  html += `
      </div>
    </div>
  `;
  
  // Weitere Seiten für übrige Produkte
  for (let i = 1; i < productPages.length; i++) {
    const isLastPage = i === productPages.length - 1;
    
    html += `
      <div class="page-break"></div>
      <div class="invoice-wrapper">
        <div class="invoice-container">
          
          <!-- Header für Folgeseiten -->
          <div class="invoice-header-minimal">
            <h2>Rechnung ${data.invoice?.number || ''}</h2>
            <div class="page-info">Seite ${i + 1} von ${productPages.length}</div>
          </div>
          
          ${this.generateProductTableHTML(productPages[i], false)}
          
          ${!isLastPage ? `<div class="page-totals">Fortsetzung auf nächster Seite...</div>` : ''}
          
          ${isLastPage ? this.generateTotalsHTML(data) + this.generateLegalNoticesHTML(data) : ''}
          
        </div>
      </div>
    `;
  }
  
  // Footer für alle Seiten
  html += `
    <!-- ===== FOOTER ===== -->
    <div class="footer">
      <div style="text-align: center;">
        ${data.company?.name || 'Glücksmomente Manufaktur'} | 
        ${data.company?.contact?.email || ''} | 
        ${data.company?.taxInfo?.taxNumber || ''}
      </div>
    </div>
    
    </body>
    </html>
  `;
  
  return html;
}

// Rechnung aus echter Bestellung generieren
async generateInvoiceFromOrder(req, res) {
  try {
    logger.info('📄 Generating invoice from order');
    const { orderId } = req.params;
    const { format = 'pdf' } = req.query;

    // Bestellung aus Datenbank laden
    const Order = require('../models/Order');
    const order = await Order.findById(orderId).populate('items.produktSnapshot kunde');
    
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Bestellung nicht gefunden'
      });
    }

    // Template laden
    let template = await InvoiceTemplate.findOne({ isDefault: true });
    if (!template) {
      template = await this.createDefaultTemplate();
    }

    // Firmeninformationen aus Template
    const companyData = template.companyInfo || {};

    // Bestelldaten strukturieren
    const invoiceData = {
      company: {
        name: companyData.name || 'Glücksmomente Manufaktur',
        address: companyData.address || {},
        contact: companyData.contact || {},
        taxInfo: companyData.taxInfo || {},
        bankDetails: companyData.bankDetails || {},
        logo: companyData.logo || { enabled: false }
      },
      customer: {
        name: order.kunde ? `${order.kunde.vorname || ''} ${order.kunde.nachname || ''}`.trim() : 'Kunde',
        email: order.kunde?.email || '',
        address: order.kunde?.adresse || {},
        customerNumber: order.kunde?._id?.toString()?.slice(-8)?.toUpperCase() || 'KD-001'
      },
      order: {
        number: order._id?.toString()?.slice(-8)?.toUpperCase() || 'ORD-001',
        date: order.createdAt ? new Date(order.createdAt).toLocaleDateString('de-DE') : new Date().toLocaleDateString('de-DE'),
        products: order.items?.map((item, index) => ({
          name: item.produktSnapshot?.name || 'Artikel',
          description: item.produktSnapshot?.beschreibung || '',
          quantity: item.menge || 1,
          unitPrice: item.einzelpreis || 0,
          total: item.gesamtpreis || 0,
          sku: `SKU${String(index + 1).padStart(3, '0')}`
        })) || [],
        netTotal: order.gesamtsumme || 0,
        shipping: {
          cost: order.versandkosten || 0
        },
        grandTotal: (order.gesamtsumme || 0) + (order.versandkosten || 0),
        paymentMethod: order.payment?.zahlungsart || 'PayPal',
        paymentStatus: order.payment?.status || 'pending'
      },
      invoice: {
        number: `RE-${new Date().getFullYear()}-${order._id?.toString()?.slice(-6)?.toUpperCase() || '001'}`,
        date: new Date().toLocaleDateString('de-DE'),
        dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toLocaleDateString('de-DE'),
        performanceDate: order.createdAt ? new Date(order.createdAt).toLocaleDateString('de-DE') : new Date().toLocaleDateString('de-DE'),
        paymentTerms: order.payment?.zahlungsart === 'cash' ? 'Barzahlung bei Abholung' : 'Zahlung über PayPal',
        legalNotice: 'Gerichtsstand ist ' + (companyData.address?.city || 'Musterstadt') + '. Es gilt deutsches Recht.'
      },
      legal: {
        isSmallBusiness: true,
        vatExemptionNote: 'Gemäß §19 UStG wird keine Umsatzsteuer ausgewiesen.'
      }
    };

    logger.info('📋 Generating multi-page invoice HTML from order data');
    const html = this.generateMultiPageInvoiceHTML(template, invoiceData);
    
    // Rechnung in Datenbank speichern
    order.invoice = {
      number: invoiceData.invoice.number,
      html: html,
      generatedAt: new Date(),
      data: invoiceData
    };
    await order.save();
    
    if (format === 'html') {
      res.set({ 'Content-Type': 'text/html; charset=utf-8' });
      res.send(html);
      return;
    }
    
    // PDF generieren
    try {
      const pdf = await this.generatePDFFromHTML(html);
      res.set({
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename=rechnung-${invoiceData.invoice.number}.pdf`
      });
      res.send(pdf);
    } catch (pdfError) {
      logger.warn('⚠️ PDF generation failed, using HTML fallback');
      const htmlWithStyles = this.generateEnhancedHTMLPreview(html, invoiceData);
      res.set({ 'Content-Type': 'text/html; charset=utf-8' });
      res.send(htmlWithStyles);
    }
  } catch (error) {
    logger.error('❌ Fehler bei der Rechnungsgenerierung:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler bei der Rechnungsgenerierung',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
}

// Gespeicherte Rechnung abrufen
async getStoredInvoice(req, res) {
  try {
    const { orderId } = req.params;
    const { format = 'pdf' } = req.query;
    
    const Order = require('../models/Order');
    const order = await Order.findById(orderId);
    
    if (!order || !order.invoice) {
      return res.status(404).json({
        success: false,
        message: 'Rechnung nicht gefunden'
      });
    }
    
    if (format === 'html') {
      res.set({ 'Content-Type': 'text/html; charset=utf-8' });
      res.send(order.invoice.html);
      return;
    }
    
    // PDF aus gespeichertem HTML generieren
    try {
      const pdf = await this.generatePDFFromHTML(order.invoice.html);
      res.set({
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename=rechnung-${order.invoice.number}.pdf`
      });
      res.send(pdf);
    } catch (pdfError) {
      // Fallback zu HTML
      const htmlWithStyles = this.generateEnhancedHTMLPreview(order.invoice.html, order.invoice.data);
      res.set({ 'Content-Type': 'text/html; charset=utf-8' });
      res.send(htmlWithStyles);
    }
  } catch (error) {
    logger.error('❌ Fehler beim Abrufen der Rechnung:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Abrufen der Rechnung'
    });
  }
}

module.exports = {
  generateProductTableHTML,
  generateTotalsHTML,
  generateLegalNoticesHTML,
  generateMultiPageInvoiceHTML,
  generateInvoiceFromOrder,
  getStoredInvoice
};