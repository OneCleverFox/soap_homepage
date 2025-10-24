const InvoiceTemplate = require('../models/InvoiceTemplate');
const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs').promises;

class InvoiceController {
  // Alle Templates abrufen
  async getAllTemplates(req, res) {
    try {
      const templates = await InvoiceTemplate.find().sort({ createdAt: -1 });
      res.json({
        success: true,
        data: templates
      });
    } catch (error) {
      console.error('Fehler beim Abrufen der Templates:', error);
      res.status(500).json({
        success: false,
        message: 'Fehler beim Abrufen der Templates',
        error: error.message
      });
    }
  }

  // Standard-Template abrufen
  async getDefaultTemplate(req, res) {
    try {
      let template = await InvoiceTemplate.findOne({ isDefault: true });
      
      if (!template) {
        // Erstelle Standard-Template falls keins existiert
        template = new InvoiceTemplate({
          name: 'Standard Rechnungsvorlage',
          isDefault: true,
          variables: {
            available: InvoiceTemplate.getDefaultVariables()
          }
        });
        await template.save();
      }

      res.json({
        success: true,
        data: template
      });
    } catch (error) {
      console.error('Fehler beim Abrufen des Standard-Templates:', error);
      res.status(500).json({
        success: false,
        message: 'Fehler beim Abrufen des Standard-Templates',
        error: error.message
      });
    }
  }

  // Template erstellen
  async createTemplate(req, res) {
    try {
      const templateData = {
        ...req.body,
        variables: {
          available: InvoiceTemplate.getDefaultVariables()
        }
      };

      const template = new InvoiceTemplate(templateData);
      await template.save();

      res.status(201).json({
        success: true,
        message: 'Template erfolgreich erstellt',
        data: template
      });
    } catch (error) {
      console.error('Fehler beim Erstellen des Templates:', error);
      res.status(500).json({
        success: false,
        message: 'Fehler beim Erstellen des Templates',
        error: error.message
      });
    }
  }

  // Template aktualisieren
  async updateTemplate(req, res) {
    try {
      const { id } = req.params;
      const updateData = { ...req.body, updatedAt: new Date() };

      const template = await InvoiceTemplate.findByIdAndUpdate(
        id,
        updateData,
        { new: true, runValidators: true }
      );

      if (!template) {
        return res.status(404).json({
          success: false,
          message: 'Template nicht gefunden'
        });
      }

      res.json({
        success: true,
        message: 'Template erfolgreich aktualisiert',
        data: template
      });
    } catch (error) {
      console.error('Fehler beim Aktualisieren des Templates:', error);
      res.status(500).json({
        success: false,
        message: 'Fehler beim Aktualisieren des Templates',
        error: error.message
      });
    }
  }

  // Template als Standard setzen
  async setDefaultTemplate(req, res) {
    try {
      const { id } = req.params;

      // Alle anderen Templates auf nicht-Standard setzen
      await InvoiceTemplate.updateMany({}, { isDefault: false });

      // Gewähltes Template als Standard setzen
      const template = await InvoiceTemplate.findByIdAndUpdate(
        id,
        { isDefault: true },
        { new: true }
      );

      if (!template) {
        return res.status(404).json({
          success: false,
          message: 'Template nicht gefunden'
        });
      }

      res.json({
        success: true,
        message: 'Template als Standard gesetzt',
        data: template
      });
    } catch (error) {
      console.error('Fehler beim Setzen des Standard-Templates:', error);
      res.status(500).json({
        success: false,
        message: 'Fehler beim Setzen des Standard-Templates',
        error: error.message
      });
    }
  }

  // Template löschen
  async deleteTemplate(req, res) {
    try {
      const { id } = req.params;

      const template = await InvoiceTemplate.findById(id);
      if (!template) {
        return res.status(404).json({
          success: false,
          message: 'Template nicht gefunden'
        });
      }

      if (template.isDefault) {
        return res.status(400).json({
          success: false,
          message: 'Standard-Template kann nicht gelöscht werden'
        });
      }

      await InvoiceTemplate.findByIdAndDelete(id);

      res.json({
        success: true,
        message: 'Template erfolgreich gelöscht'
      });
    } catch (error) {
      console.error('Fehler beim Löschen des Templates:', error);
      res.status(500).json({
        success: false,
        message: 'Fehler beim Löschen des Templates',
        error: error.message
      });
    }
  }

  // Vorschau-PDF generieren
  async generatePreview(req, res) {
    try {
      const { templateData, sampleData } = req.body;

      // Sample-Daten für Vorschau
      const defaultSampleData = {
        company: {
          name: 'Glücksmomente Manufaktur',
          address: {
            street: 'Musterstraße 123',
            city: '12345 Musterstadt',
            country: 'Deutschland'
          },
          contact: {
            phone: '+49 123 456789',
            email: 'info@gluecksmomente-manufaktur.de',
            website: 'www.gluecksmomente-manufaktur.de'
          },
          taxInfo: {
            taxNumber: 'DE123456789',
            vatId: 'USt-IdNr.: DE123456789'
          }
        },
        customer: {
          name: 'Max Mustermann',
          email: 'max@example.com',
          address: {
            street: 'Beispielstraße 456',
            city: '98765 Beispielstadt',
            country: 'Deutschland'
          }
        },
        order: {
          number: 'ORD-2025-001',
          date: new Date().toLocaleDateString('de-DE'),
          products: [
            {
              name: 'Lavendel Handseife',
              description: 'Natürliche Handseife mit Lavendelduft',
              quantity: 2,
              unitPrice: 8.99,
              total: 17.98
            },
            {
              name: 'Rosenseife Premium',
              description: 'Luxuriöse Seife mit Rosenöl',
              quantity: 1,
              unitPrice: 12.99,
              total: 12.99
            }
          ],
          subtotal: 30.97,
          tax: 5.88,
          shipping: 4.99,
          total: 41.84
        },
        invoice: {
          number: 'RE-2025-001',
          date: new Date().toLocaleDateString('de-DE'),
          dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toLocaleDateString('de-DE')
        }
      };

      const data = { ...defaultSampleData, ...sampleData };
      const template = templateData || await InvoiceTemplate.findOne({ isDefault: true });

      const html = this.generateInvoiceHTML(template, data);
      const pdf = await this.generatePDFFromHTML(html);

      res.set({
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'inline; filename=invoice-preview.pdf',
        'Content-Length': pdf.length
      });

      res.send(pdf);
    } catch (error) {
      console.error('Fehler bei der PDF-Vorschau:', error);
      res.status(500).json({
        success: false,
        message: 'Fehler bei der PDF-Generierung',
        error: error.message
      });
    }
  }

  // HTML für Rechnung generieren
  generateInvoiceHTML(template, data) {
    const { companyInfo, layout, sections } = template;

    // Variablen ersetzen
    const replaceVariables = (text, data) => {
      if (!text) return '';
      return text.replace(/\{\{([^}]+)\}\}/g, (match, path) => {
        const value = this.getNestedValue(data, path.trim());
        return value !== undefined ? value : match;
      });
    };

    // Sortiere Sections nach Position
    const sortedSections = Object.entries(sections)
      .filter(([_, section]) => section.enabled)
      .sort(([_, a], [__, b]) => a.position - b.position);

    let html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body {
          font-family: ${layout.fonts.primary};
          font-size: ${layout.fonts.size.body}px;
          color: ${layout.colors.text};
          line-height: ${layout.spacing.lineHeight};
          margin: ${layout.spacing.margin}px;
        }
        .header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 30px;
          padding-bottom: 20px;
          border-bottom: 2px solid ${layout.colors.primary};
        }
        .logo {
          ${layout.header.logoPosition === 'center' ? 'margin: 0 auto;' : ''}
          ${layout.header.logoPosition === 'right' ? 'margin-left: auto;' : ''}
        }
        .company-info {
          text-align: ${layout.header.companyInfoPosition};
          ${layout.header.companyInfoPosition === 'right' ? 'margin-left: auto;' : ''}
        }
        .company-name {
          font-size: ${layout.fonts.size.heading}px;
          font-weight: bold;
          color: ${layout.colors.primary};
          margin-bottom: 10px;
        }
        .section {
          margin-bottom: 25px;
        }
        .section-title {
          font-size: ${layout.fonts.size.subheading}px;
          font-weight: bold;
          color: ${layout.colors.primary};
          margin-bottom: 15px;
          text-transform: uppercase;
        }
        .invoice-info {
          display: flex;
          justify-content: space-between;
          margin-bottom: 30px;
        }
        .invoice-details {
          background: ${layout.colors.secondary};
          padding: 15px;
          border-radius: 5px;
        }
        .customer-info {
          background: ${layout.colors.secondary};
          padding: 15px;
          border-radius: 5px;
          margin-bottom: 20px;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 20px;
        }
        th, td {
          padding: 10px;
          text-align: left;
          border-bottom: 1px solid #ddd;
        }
        th {
          background-color: ${layout.colors.primary};
          color: white;
          font-weight: bold;
        }
        ${sections.productTable.alternateRowColors ? `
        tr:nth-child(even) {
          background-color: ${layout.colors.secondary};
        }
        ` : ''}
        .totals {
          ${sections.totals.alignment === 'right' ? 'margin-left: auto;' : ''}
          width: 300px;
          background: ${layout.colors.secondary};
          padding: 15px;
          border-radius: 5px;
        }
        .total-row {
          display: flex;
          justify-content: space-between;
          margin-bottom: 5px;
        }
        .total-final {
          border-top: 2px solid ${layout.colors.primary};
          padding-top: 10px;
          margin-top: 10px;
          font-weight: bold;
          font-size: ${layout.fonts.size.subheading}px;
        }
        .footer {
          margin-top: 40px;
          padding-top: 20px;
          border-top: 1px solid #ddd;
          text-align: center;
          color: #666;
          font-size: ${layout.fonts.size.small}px;
        }
      </style>
    </head>
    <body>
    `;

    // Header
    if (layout.header.showLogo || layout.header.showCompanyInfo) {
      html += `<div class="header">`;
      
      if (layout.header.showLogo) {
        html += `<div class="logo">
          <div style="width: 100px; height: 60px; background: ${layout.colors.primary}; color: white; display: flex; align-items: center; justify-content: center; border-radius: 5px;">
            LOGO
          </div>
        </div>`;
      }
      
      if (layout.header.showCompanyInfo) {
        html += `<div class="company-info">
          <div class="company-name">${companyInfo.name}</div>
          <div>${companyInfo.address.street}</div>
          <div>${companyInfo.address.city}</div>
          <div>${companyInfo.contact.phone}</div>
          <div>${companyInfo.contact.email}</div>
        </div>`;
      }
      
      html += `</div>`;
    }

    // Sections dynamisch generieren
    sortedSections.forEach(([sectionName, section]) => {
      switch (sectionName) {
        case 'invoiceInfo':
          html += `<div class="section">
            <div class="section-title">${section.title}</div>
            <div class="invoice-info">
              <div class="invoice-details">
                ${section.showInvoiceNumber ? `<div><strong>Rechnungsnummer:</strong> ${data.invoice.number}</div>` : ''}
                ${section.showInvoiceDate ? `<div><strong>Rechnungsdatum:</strong> ${data.invoice.date}</div>` : ''}
                ${section.showDueDate ? `<div><strong>Fälligkeitsdatum:</strong> ${data.invoice.dueDate}</div>` : ''}
                ${section.showOrderNumber ? `<div><strong>Bestellnummer:</strong> ${data.order.number}</div>` : ''}
              </div>
            </div>
          </div>`;
          break;

        case 'customerInfo':
          html += `<div class="section">
            ${section.showTitle ? `<div class="section-title">${section.title}</div>` : ''}
            <div class="customer-info">
              <div><strong>${data.customer.name}</strong></div>
              <div>${data.customer.address.street}</div>
              <div>${data.customer.address.city}</div>
              <div>${data.customer.address.country}</div>
            </div>
          </div>`;
          break;

        case 'productTable':
          html += `<div class="section">
            <table>
              ${section.showHeaders ? `<thead><tr>
                ${section.columns.position.enabled ? `<th style="width: ${section.columns.position.width}%">Pos.</th>` : ''}
                ${section.columns.description.enabled ? `<th style="width: ${section.columns.description.width}%">Beschreibung</th>` : ''}
                ${section.columns.quantity.enabled ? `<th style="width: ${section.columns.quantity.width}%">Menge</th>` : ''}
                ${section.columns.unitPrice.enabled ? `<th style="width: ${section.columns.unitPrice.width}%">Einzelpreis</th>` : ''}
                ${section.columns.total.enabled ? `<th style="width: ${section.columns.total.width}%">Gesamt</th>` : ''}
              </tr></thead>` : ''}
              <tbody>
                ${data.order.products.map((product, index) => `
                  <tr>
                    ${section.columns.position.enabled ? `<td>${index + 1}</td>` : ''}
                    ${section.columns.description.enabled ? `<td>
                      <strong>${product.name}</strong><br>
                      <small>${product.description}</small>
                    </td>` : ''}
                    ${section.columns.quantity.enabled ? `<td>${product.quantity}</td>` : ''}
                    ${section.columns.unitPrice.enabled ? `<td>${product.unitPrice.toFixed(2)} €</td>` : ''}
                    ${section.columns.total.enabled ? `<td>${product.total.toFixed(2)} €</td>` : ''}
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>`;
          break;

        case 'totals':
          html += `<div class="section">
            <div class="totals">
              ${section.showSubtotal ? `<div class="total-row">
                <span>Zwischensumme:</span>
                <span>${data.order.subtotal.toFixed(2)} €</span>
              </div>` : ''}
              ${section.showTax ? `<div class="total-row">
                <span>MwSt. (19%):</span>
                <span>${data.order.tax.toFixed(2)} €</span>
              </div>` : ''}
              ${section.showShipping ? `<div class="total-row">
                <span>Versandkosten:</span>
                <span>${data.order.shipping.toFixed(2)} €</span>
              </div>` : ''}
              ${section.showTotal ? `<div class="total-row total-final">
                <span>Gesamtsumme:</span>
                <span>${data.order.total.toFixed(2)} €</span>
              </div>` : ''}
            </div>
          </div>`;
          break;

        case 'footer':
          html += `<div class="footer">
            ${replaceVariables(section.customText, data)}
            ${section.showPaymentInfo ? `<br><br>Zahlungshinweise: Bitte überweisen Sie den Betrag innerhalb von 14 Tagen.` : ''}
            ${section.showReturnPolicy ? `<br>Rückgaberecht: 14 Tage Widerrufsrecht.` : ''}
          </div>`;
          break;
      }
    });

    html += `</body></html>`;
    return html;
  }

  // PDF aus HTML generieren
  async generatePDFFromHTML(html) {
    const browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    try {
      const page = await browser.newPage();
      await page.setContent(html, { waitUntil: 'networkidle0' });
      
      const pdf = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: {
          top: '20mm',
          right: '15mm',
          bottom: '20mm',
          left: '15mm'
        }
      });

      return pdf;
    } finally {
      await browser.close();
    }
  }

  // Hilfsfunktion für verschachtelte Objektwerte
  getNestedValue(obj, path) {
    return path.split('.').reduce((current, key) => {
      return current && current[key] !== undefined ? current[key] : undefined;
    }, obj);
  }

  // Verfügbare Variablen abrufen
  async getAvailableVariables(req, res) {
    try {
      const variables = InvoiceTemplate.getDefaultVariables();
      res.json({
        success: true,
        data: variables
      });
    } catch (error) {
      console.error('Fehler beim Abrufen der Variablen:', error);
      res.status(500).json({
        success: false,
        message: 'Fehler beim Abrufen der Variablen',
        error: error.message
      });
    }
  }

  // Rechnung für Bestellung generieren
  async generateInvoiceForOrder(req, res) {
    try {
      const { orderId } = req.params;
      const OrderInvoiceService = require('../services/orderInvoiceService');
      const orderInvoiceService = new OrderInvoiceService();
      
      const result = await orderInvoiceService.generateInvoiceForOrder(orderId);
      
      res.json({
        success: true,
        message: 'Rechnung erfolgreich generiert',
        data: result
      });
    } catch (error) {
      console.error('Fehler beim Generieren der Rechnung für Bestellung:', error);
      res.status(500).json({
        success: false,
        message: 'Fehler beim Generieren der Rechnung',
        error: error.message
      });
    }
  }

  // Rechnung per E-Mail senden
  async sendInvoiceForOrder(req, res) {
    try {
      const { orderId } = req.params;
      const OrderInvoiceService = require('../services/orderInvoiceService');
      const orderInvoiceService = new OrderInvoiceService();
      
      const result = await orderInvoiceService.sendInvoiceEmail(orderId);
      
      res.json({
        success: true,
        message: 'Rechnung erfolgreich versendet',
        data: result
      });
    } catch (error) {
      console.error('Fehler beim Versenden der Rechnung:', error);
      res.status(500).json({
        success: false,
        message: 'Fehler beim Versenden der Rechnung',
        error: error.message
      });
    }
  }

  // Rechnung herunterladen
  async downloadInvoiceForOrder(req, res) {
    try {
      const { orderId } = req.params;
      const Order = require('../models/Order');
      
      const order = await Order.findById(orderId);
      if (!order) {
        return res.status(404).json({
          success: false,
          message: 'Bestellung nicht gefunden'
        });
      }

      if (!order.invoicePdf) {
        // Rechnung generieren falls noch nicht vorhanden
        const OrderInvoiceService = require('../services/orderInvoiceService');
        const orderInvoiceService = new OrderInvoiceService();
        await orderInvoiceService.generateInvoiceForOrder(orderId);
        
        // Aktualisierte Bestellung laden
        const updatedOrder = await Order.findById(orderId);
        if (!updatedOrder.invoicePdf) {
          return res.status(404).json({
            success: false,
            message: 'Rechnung konnte nicht generiert werden'
          });
        }
        order.invoicePdf = updatedOrder.invoicePdf;
      }

      // PDF als Base64 decodieren und senden
      const pdfBuffer = Buffer.from(order.invoicePdf, 'base64');
      
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="Rechnung_${order.invoiceNumber || order._id}.pdf"`);
      res.send(pdfBuffer);
      
    } catch (error) {
      console.error('Fehler beim Herunterladen der Rechnung:', error);
      res.status(500).json({
        success: false,
        message: 'Fehler beim Herunterladen der Rechnung',
        error: error.message
      });
    }
  }
}

module.exports = new InvoiceController();