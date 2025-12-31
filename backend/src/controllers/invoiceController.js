const InvoiceTemplate = require('../models/InvoiceTemplate');
const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs').promises;
const logger = require('../utils/logger');
const { asyncHandler } = require('../middleware/errorHandler');

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
        template = await this.createDefaultTemplate();
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

  // Rechnung für echte Bestellung generieren (wird in DB gespeichert)
  async generateInvoiceForOrder(req, res) {
    try {
      const { orderId } = req.params;
      const { templateId, saveToDatabase = true } = req.body;

      console.log('🧾 Generiere Rechnung für Bestellung:', orderId);

      // Bestellung aus der Datenbank laden
      const order = await this.loadOrderFromDatabase(orderId);
      if (!order) {
        return res.status(404).json({
          success: false,
          message: 'Bestellung nicht gefunden'
        });
      }

      // Template laden
      const template = await this.loadTemplateFromDatabase(templateId);
      if (!template) {
        return res.status(404).json({
          success: false,
          message: 'Rechnungsvorlage nicht gefunden'
        });
      }

      // Rechnung in Datenbank speichern (falls gewünscht)
      let savedInvoice = null;
      if (saveToDatabase) {
        const Invoice = require('../models/Invoice');
        
        // Nächste Rechnungsnummer generieren
        const { invoiceNumber, sequenceNumber } = await Invoice.getNextInvoiceNumber();

        savedInvoice = new Invoice({
          invoiceNumber,
          sequenceNumber,
          customer: {
            customerId: order.kunde ? order.kunde._id : null,
            customerData: order.shippingAddress || order.billingAddress
          },
          items: order.items.map(item => ({
            productId: item.productId || null,
            productData: {
              name: item.name,
              description: item.description || '',
              sku: item.sku || '',
              category: item.category || ''
            },
            quantity: item.quantity,
            unitPrice: item.price,
            total: item.quantity * item.price
          })),
          amounts: {
            subtotal: order.netTotal || order.total,
            shippingCost: order.shipping?.cost || 0,
            vatRate: 19,
            total: order.grandTotal || order.total
          },
          dates: {
            invoiceDate: new Date(),
            deliveryDate: order.deliveryDate
          },
          payment: {
            method: order.paymentMethod || 'pending'
          },
          template: templateId,
          tax: {
            isSmallBusiness: template.companyInfo?.isSmallBusiness || false
          },
          status: 'sent'
        });

        await savedInvoice.save();
        console.log(`✅ Rechnung ${invoiceNumber} in Datenbank gespeichert`);
      }

      // HTML-Rechnung generieren
      const invoiceData = {
        invoice: {
          number: savedInvoice?.invoiceNumber || 'PREVIEW',
          date: new Date().toLocaleDateString('de-DE'),
          dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toLocaleDateString('de-DE'),
        },
        customer: order.kunde || order.shippingAddress || order.billingAddress,
        order,
        template
      };

      const htmlContent = this.buildInvoiceHTML(invoiceData);

      res.json({
        success: true,
        message: savedInvoice ? `Rechnung ${savedInvoice.invoiceNumber} erfolgreich erstellt` : 'Vorschau generiert',
        data: {
          html: htmlContent,
          invoice: savedInvoice,
          invoiceNumber: savedInvoice?.invoiceNumber
        }
      });

    } catch (error) {
      console.error('Fehler bei Rechnungsgenerierung:', error);
      res.status(500).json({
        success: false,
        message: 'Fehler bei der Rechnungsgenerierung',
        error: error.message
      });
    }
  }

  // Hilfsmethode: Bestellung aus Datenbank laden
  async loadOrderFromDatabase(orderId) {
    try {
      const Order = require('../models/Order');
      const order = await Order.findById(orderId)
        .populate('kunde', 'vorname nachname firma email telefon adresse')
        .populate('items.productId', 'name beschreibung sku kategorie');
      
      return order;
    } catch (error) {
      console.error('Fehler beim Laden der Bestellung:', error);
      return null;
    }
  }

  // Hilfsmethode: Template aus Datenbank laden
  async loadTemplateFromDatabase(templateId) {
    try {
      const InvoiceTemplate = require('../models/InvoiceTemplate');
      let template;
      
      if (templateId) {
        template = await InvoiceTemplate.findById(templateId);
      }
      
      if (!template) {
        template = await InvoiceTemplate.findOne({ isDefault: true });
      }
      
      if (!template) {
        template = await InvoiceTemplate.findOne();
      }
      
      return template;
    } catch (error) {
      console.error('Fehler beim Laden der Vorlage:', error);
      return null;
    }
  }
  async createTemplate(req, res) {
    try {
      const template = new InvoiceTemplate(req.body);
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
      logger.info('📄 Generating invoice preview');
      const { templateData, sampleData, format } = req.body;

      // Hole AKTUELLES Default-Template aus der DB für einheitliche Einstellungen
      let template = await InvoiceTemplate.findOne({ isDefault: true });
      if (!template) {
        template = await this.createDefaultTemplate();
      }
      
      console.log('🎨 Preview Template:', template.name);
      console.log('💰 Preview USt-Status:', template.companyInfo?.isSmallBusiness ? 'Kleinunternehmer (keine USt)' : 'USt-pflichtig (19%)');
      
      // Verwende IMMER das Template aus templateData wenn vorhanden (Admin-Eingaben)
      if (templateData && templateData.companyInfo) {
        template = { 
          ...template, 
          ...templateData,
          companyInfo: {
            ...template.companyInfo,
            ...templateData.companyInfo
          }
        };
      }

      // Firmeninformationen aus Template übernehmen
      const companyData = template.companyInfo || {};

      // Sample-Daten für Vorschau mit Template-Firmeninformationen
      const defaultSampleData = {
        company: {
          name: companyData.name || 'Glücksmomente Manufaktur',
          address: {
            street: companyData.address?.street || 'Musterstraße 123',
            postalCode: companyData.address?.postalCode || '64673',
            city: companyData.address?.city || 'Musterstadt',
            country: companyData.address?.country || 'Deutschland'
          },
          contact: {
            phone: companyData.contact?.phone || '+49 123 456789',
            email: companyData.contact?.email || 'info@gluecksmomente-manufaktur.de',
            website: companyData.contact?.website || 'www.gluecksmomente-manufaktur.de'
          },
          taxInfo: {
            taxNumber: companyData.taxInfo?.taxNumber || 'Steuernummer: 123/456/78910',
            vatId: companyData.taxInfo?.vatId || 'USt-IdNr.: DE123456789',
            ceo: companyData.taxInfo?.ceo || 'Max Mustermann',
            legalForm: companyData.taxInfo?.legalForm || 'Einzelunternehmen',
            registrationCourt: companyData.taxInfo?.registrationCourt || 'Amtsgericht Musterstadt',
            registrationNumber: companyData.taxInfo?.registrationNumber || 'HRB 123456'
          },
          bankDetails: {
            bankName: companyData.bankDetails?.bankName || 'Musterbank',
            iban: companyData.bankDetails?.iban || 'DE89 3704 0044 0532 0130 00',
            bic: companyData.bankDetails?.bic || 'COBADEFF'
          },
          logo: companyData.logo || { enabled: false, url: '' }
        },
        customer: {
          name: 'Max Mustermann',
          email: 'max@example.com',
          address: {
            street: 'Beispielstraße 456',
            postalCode: '98765',
            city: 'Beispielstadt',
            country: 'Deutschland'
          },
          customerNumber: 'K-2025-001'
        },
        order: {
          number: '2025-000001',
          date: new Date().toLocaleDateString('de-DE'),
          products: [
            {
              name: 'Lavendel Handseife',
              description: 'Natürliche Handseife mit Lavendelduft, 100g',
              quantity: 2,
              unitPrice: 8.99,
              vatRate: 19,
              total: 17.98,
              netTotal: 15.11,
              vatAmount: 2.87
            },
            {
              name: 'Rosenseife Premium',
              description: 'Luxuriöse Seife mit Rosenöl, 150g',
              quantity: 1,
              unitPrice: 12.99,
              vatRate: 19,
              total: 12.99,
              netTotal: 10.92,
              vatAmount: 2.07
            }
          ],
          netTotal: 26.03,
          vatTotal: 4.94,
          shipping: {
            cost: 4.99,
            netCost: 4.19,
            vatAmount: 0.80,
            vatRate: 19
          },
          grandTotal: 35.96
        },
        invoice: {
          number: 'RE-2025-001',
          date: new Date().toLocaleDateString('de-DE'),
          dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toLocaleDateString('de-DE'),
          paymentTerms: 'Zahlbar innerhalb 14 Tagen ohne Abzug.',
          deliveryDate: new Date().toLocaleDateString('de-DE'),
          performanceDate: new Date().toLocaleDateString('de-DE'),
          reversalNote: 'Diese Rechnung entspricht den gesetzlichen Anforderungen der Kleinunternehmerregelung gemäß §19 UStG.',
          legalNotice: 'Gerichtsstand ist Musterstadt. Es gilt deutsches Recht.'
        },
        legal: {
          isSmallBusiness: true,
          vatExemptionNote: 'Gemäß §19 UStG wird keine Umsatzsteuer ausgewiesen.',
          requiredFields: [
            'Rechnungsnummer',
            'Rechnungsdatum', 
            'Lieferdatum/Leistungsdatum',
            'Name und Anschrift des Unternehmens',
            'Name und Anschrift des Kunden',
            'Steuernummer',
            'Menge und Art der Leistung',
            'Entgelt und Zeitpunkt'
          ]
        }
      };

      const data = { ...defaultSampleData, ...sampleData };
      
      logger.info('📋 Generating HTML with PDFService template system for consistency');
      
      // Verwende das PDFService Template-System für einheitliches Design
      const PDFService = require('../services/PDFService');
      
      // Konvertiere data zu bestellung-Format für PDFService
      const bestellungData = {
        bestellnummer: data.invoice?.number || 'RE-PREVIEW-001',
        bestelldatum: new Date().toISOString(),
        kundennummer: data.customer?.customerNumber || 'K-PREVIEW-001',
        rechnungsadresse: {
          vorname: data.customer?.name?.split(' ')[0] || 'Max',
          nachname: data.customer?.name?.split(' ').slice(1).join(' ') || 'Mustermann',
          strasse: data.customer?.address?.street?.split(' ')[0] || 'Beispielstraße',
          hausnummer: data.customer?.address?.street?.split(' ').slice(1).join(' ') || '456',
          plz: data.customer?.address?.postalCode || '12345',
          stadt: data.customer?.address?.city || 'Musterstadt',
          land: data.customer?.address?.country || 'Deutschland'
        },
        artikel: (data.order?.products || []).map(product => ({
          name: product.name || 'Produktname',
          beschreibung: product.description || 'Produktbeschreibung',
          menge: product.quantity || 1,
          preis: product.unitPrice || 0,
          einzelpreis: product.unitPrice || 0,
          gesamtpreis: product.total || (product.quantity || 1) * (product.unitPrice || 0)
        })),
        nettosumme: data.order?.netTotal || 0,
        mwst: template.companyInfo?.isSmallBusiness ? 0 : (data.order?.vatTotal || 0),
        gesamtsumme: data.order?.grandTotal || 0,
        zahlungsmethode: 'Überweisung'
      };
      
      // Verwende PDFService HTML-Generierung für einheitliches Design
      const html = PDFService.generateTemplateBasedHTML(bestellungData, template);
      
      console.log('🔍 NEW DEBUG: Generated HTML length:', html.length);
      console.log('🔍 NEW DEBUG: HTML contains invoice-footer?', html.includes('invoice-footer'));
      console.log('🔍 NEW DEBUG: HTML contains footer-grid?', html.includes('footer-grid'));
      
      // Prüfe ob HTML-Vorschau gewünscht ist oder PDF-Generation verfügbar
      if (format === 'html') {
        res.set({
          'Content-Type': 'text/html; charset=utf-8'
        });
        res.send(html);
        return;
      }
      
      // Versuche PDF-Generierung - Fallback zu HTML bei Fehlern
      logger.info('📄 Converting HTML to PDF');
      
      try {
        const pdf = await this.generatePDFFromHTML(html);

        res.set({
          'Content-Type': 'application/pdf',
          'Content-Disposition': 'inline; filename=invoice-preview.pdf',
          'Content-Length': pdf.length
        });

        logger.success('✅ PDF invoice preview generated successfully');
        res.send(pdf);
        
      } catch (pdfError) {
        // Log der ursprüngliche PDF-Fehler
        logger.warn('⚠️ PDF generation failed, using HTML fallback:', {
          error: pdfError.message,
          isPuppeteerError: pdfError.isPuppeteerError,
          originalError: pdfError.originalError?.message
        });
        
        // Sofortiger Fallback zu HTML ohne weitere Versuche
        res.set({
          'Content-Type': 'text/html; charset=utf-8',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'X-PDF-Fallback': 'true'
        });
        
        logger.info('✅ HTML fallback preview sent successfully');
        res.send(html);
      }
    } catch (error) {
      logger.error('❌ Fehler bei der PDF-Vorschau:', {
        message: error.message,
        stack: error.stack,
        requestBody: req.body
      });
      
      res.status(500).json({
        success: false,
        message: 'Fehler bei der PDF-Generierung',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  }

  // Standard-Template erstellen falls keins existiert
  async createDefaultTemplate() {
    logger.info('🎨 Creating default invoice template');
    
    const defaultTemplate = {
      name: 'Standard Rechnungsvorlage (Gesetzeskonform)',
      description: 'Standard-Rechnungsvorlage mit allen gesetzlichen Pflichtangaben',
      isDefault: true,
      layout: {
        pageFormat: 'A4',
        margin: { top: 20, right: 20, bottom: 20, left: 20 },
        fontSize: 11,
        fontFamily: 'Arial, sans-serif'
      },
      sections: {
        header: {
          enabled: true,
          position: 1,
          content: {
            logo: { enabled: true, position: 'left', maxHeight: 80 },
            company: {
              name: '{{company.name}}',
              address: '{{company.address.street}}, {{company.address.postalCode}} {{company.address.city}}',
              contact: 'Tel: {{company.contact.phone}} | E-Mail: {{company.contact.email}}',
              website: '{{company.contact.website}}'
            }
          }
        },
        legalInfo: {
          enabled: true,
          position: 2,
          content: {
            taxNumber: '{{company.taxInfo.taxNumber}}',
            vatId: '{{company.taxInfo.vatId}}',
            ceo: 'Inhaber: {{company.taxInfo.ceo}}',
            court: '{{company.taxInfo.registrationCourt}} {{company.taxInfo.registrationNumber}}'
          }
        },
        customer: {
          enabled: true,
          position: 3,
          content: {
            title: 'Rechnung an:',
            name: '{{customer.name}}',
            address: '{{customer.address.street}}\\n{{customer.address.postalCode}} {{customer.address.city}}',
            customerNumber: 'Kundennummer: {{customer.customerNumber}}'
          }
        },
        invoiceDetails: {
          enabled: true,
          position: 4,
          content: {
            invoiceNumber: 'Rechnungsnummer: {{invoice.number}}',
            invoiceDate: 'Rechnungsdatum: {{invoice.date}}',
            dueDate: 'Fällig bis: {{invoice.dueDate}}',
            deliveryDate: 'Lieferdatum: {{invoice.deliveryDate}}',
            performanceDate: 'Leistungsdatum: {{invoice.performanceDate}}'
          }
        },
        items: {
          enabled: true,
          position: 5,
          showHeaders: true,
          headers: ['Pos.', 'Artikel', 'Beschreibung', 'Menge', 'Einzelpreis', 'Gesamt'],
          template: '{{loop:order.products}}{{@index+1}} | {{name}} | {{description}} | {{quantity}} Stück | {{unitPrice}}€ | {{total}}€{{/loop}}'
        },
        totals: {
          enabled: true,
          position: 6,
          content: {
            netTotal: 'Nettobetrag: {{order.netTotal}}€',
            shipping: 'Versandkosten: {{order.shipping.cost}}€',
            vatTotal: 'MwSt. ({{order.products.0.vatRate}}%): {{order.vatTotal}}€',
            grandTotal: 'Gesamtbetrag: {{order.grandTotal}}€'
          }
        },
        paymentInfo: {
          enabled: true,
          position: 7,
          content: {
            terms: '{{invoice.paymentTerms}}',
            bankDetails: 'Bank: {{company.bankDetails.bankName}}\\nIBAN: {{company.bankDetails.iban}}\\nBIC: {{company.bankDetails.bic}}'
          }
        },
        footer: {
          enabled: true,
          position: 8,
          content: {
            legalNotice: '{{invoice.legalNotice}}',
            vatNote: '{{legal.vatExemptionNote}}'
          }
        }
      },
      variables: {
        available: this.getAvailableVariablesList()
      }
    };
    
    const template = new InvoiceTemplate(defaultTemplate);
    await template.save();
    
    logger.success('✅ Default template created');
    return template;
  }

  // Liste verfügbarer Variablen für Template-Editor
  getAvailableVariablesList() {
    return {
      company: {
        name: 'Firmenname',
        'address.street': 'Straße',
        'address.postalCode': 'PLZ',
        'address.city': 'Stadt',
        'contact.phone': 'Telefon',
        'contact.email': 'E-Mail',
        'contact.website': 'Website',
        'taxInfo.taxNumber': 'Steuernummer',
        'taxInfo.vatId': 'USt-IdNr',
        'taxInfo.ceo': 'Geschäftsführer',
        'bankDetails.bankName': 'Bank',
        'bankDetails.iban': 'IBAN',
        'bankDetails.bic': 'BIC'
      },
      customer: {
        name: 'Kundenname',
        email: 'Kunden-E-Mail',
        'address.street': 'Kundenstraße',
        'address.postalCode': 'Kunden-PLZ',
        'address.city': 'Kundenstadt',
        customerNumber: 'Kundennummer'
      },
      invoice: {
        number: 'Rechnungsnummer',
        date: 'Rechnungsdatum',
        dueDate: 'Fälligkeitsdatum',
        deliveryDate: 'Lieferdatum',
        performanceDate: 'Leistungsdatum',
        paymentTerms: 'Zahlungsbedingungen'
      },
      order: {
        number: 'Bestellnummer',
        date: 'Bestelldatum',
        netTotal: 'Nettosumme',
        vatTotal: 'MwSt-Betrag',
        grandTotal: 'Gesamtbetrag',
        'shipping.cost': 'Versandkosten'
      },
      products: {
        'name': 'Produktname',
        'description': 'Produktbeschreibung',
        'quantity': 'Menge',
        'unitPrice': 'Einzelpreis',
        'total': 'Gesamtpreis',
        'vatRate': 'MwSt-Satz'
      },
      legal: {
        vatExemptionNote: 'MwSt-Befreiungshinweis',
        isSmallBusiness: 'Kleinunternehmer'
      }
    };
  }

  // HTML für Rechnung generieren
  generateInvoiceHTML(template, data) {
    try {
      logger.info('🔨 Generating HTML from template data');

      // Fallback zu Standard-HTML falls Template nicht strukturiert ist
      if (!template.sections || Object.keys(template.sections).length === 0) {
        return this.generateFallbackHTML(data);
      }

      const { layout = {}, sections = {} } = template;
      
      let html = `
        <!DOCTYPE html>
        <html lang="de">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Rechnung ${data.invoice?.number || ''}</title>
          <style>
            body {
              font-family: ${layout.fontFamily || 'Arial, sans-serif'};
              font-size: ${layout.fontSize || 11}px;
              margin: ${layout.margin?.top || 20}mm ${layout.margin?.right || 20}mm ${layout.margin?.bottom || 20}mm ${layout.margin?.left || 20}mm;
              line-height: 1.4;
              color: #333;
            }
            .header {
              margin-bottom: 30px;
              display: flex;
              justify-content: space-between;
              align-items: flex-start;
            }
            .company-info {
              flex: 1;
            }
            .logo {
              max-height: 80px;
              margin-bottom: 10px;
            }
            .legal-info {
              font-size: 10px;
              margin: 20px 0;
              color: #666;
            }
            .customer-address {
              margin: 30px 0;
              border: 1px solid #ddd;
              padding: 15px;
              background: #f9f9f9;
            }
            .invoice-details {
              margin: 20px 0;
              display: flex;
              justify-content: space-between;
            }
            .invoice-table {
              width: 100%;
              border-collapse: collapse;
              margin: 20px 0;
            }
            .invoice-table th,
            .invoice-table td {
              border: 1px solid #ddd;
              padding: 8px;
              text-align: left;
            }
            .invoice-table th {
              background-color: #f5f5f5;
              font-weight: bold;
            }
            .totals {
              margin-top: 20px;
              text-align: right;
            }
            .payment-info {
              margin: 30px 0;
              padding: 15px;
              background: #f0f8ff;
              border-left: 4px solid #007acc;
            }
            .footer {
              margin-top: 50px;
              font-size: 10px;
              color: #666;
              border-top: 1px solid #ddd;
              padding-top: 20px;
            }
            .section {
              margin: 15px 0;
            }
          </style>
        </head>
        <body>`;

      // Sortiere Sektionen nach Position und erstelle HTML
      const sortedSections = Object.entries(sections)
        .filter(([, section]) => section.enabled)
        .sort(([, a], [, b]) => (a.position || 0) - (b.position || 0));

      for (const [sectionType, section] of sortedSections) {
        html += this.renderSection(sectionType, section, data);
      }

      html += `
        </body>
        </html>`;

      logger.success('✅ HTML template generated successfully');
      return html;
    } catch (error) {
      logger.error('❌ Error generating HTML:', error);
      throw error;
    }
  }

  // Einzelne Sektion rendern
  renderSection(sectionType, section, data) {
    const content = section.content || {};
    
    switch (sectionType) {
      case 'header':
        return `
          <div class="header section">
            <div class="company-info">
              <div style="font-size: 18px; font-weight: bold; margin-bottom: 10px;">
                ${this.replaceVariables(content.company?.name || '{{company.name}}', data)}
              </div>
              <div>${this.replaceVariables(content.company?.address || '{{company.address.street}}, {{company.address.postalCode}} {{company.address.city}}', data)}</div>
              <div>${this.replaceVariables(content.company?.contact || 'Tel: {{company.contact.phone}} | E-Mail: {{company.contact.email}}', data)}</div>
              ${content.company?.website ? `<div>${this.replaceVariables(content.company.website, data)}</div>` : ''}
            </div>
          </div>`;

      case 'legalInfo':
        return `
          <div class="legal-info section">
            <div>${this.replaceVariables(content.taxNumber || '{{company.taxInfo.taxNumber}}', data)}</div>
            <div>${this.replaceVariables(content.vatId || '{{company.taxInfo.vatId}}', data)}</div>
            ${content.ceo ? `<div>${this.replaceVariables(content.ceo, data)}</div>` : ''}
            ${content.court ? `<div>${this.replaceVariables(content.court, data)}</div>` : ''}
          </div>`;

      case 'customer':
        return `
          <div class="customer-address section">
            ${content.title ? `<div style="font-weight: bold; margin-bottom: 10px;">${content.title}</div>` : ''}
            <div style="font-weight: bold;">${this.replaceVariables(content.name || '{{customer.name}}', data)}</div>
            <div style="white-space: pre-line;">${this.replaceVariables(content.address || '{{customer.address.street}}\n{{customer.address.postalCode}} {{customer.address.city}}', data)}</div>
            ${content.customerNumber ? `<div style="margin-top: 10px;">${this.replaceVariables(content.customerNumber, data)}</div>` : ''}
          </div>`;

      case 'invoiceDetails':
        return `
          <div class="invoice-details section">
            <div>
              ${content.invoiceNumber ? `<div><strong>${this.replaceVariables(content.invoiceNumber, data)}</strong></div>` : ''}
              ${content.invoiceDate ? `<div>${this.replaceVariables(content.invoiceDate, data)}</div>` : ''}
              ${content.dueDate ? `<div>${this.replaceVariables(content.dueDate, data)}</div>` : ''}
            </div>
            <div>
              ${content.deliveryDate ? `<div>${this.replaceVariables(content.deliveryDate, data)}</div>` : ''}
              ${content.performanceDate ? `<div>${this.replaceVariables(content.performanceDate, data)}</div>` : ''}
            </div>
          </div>`;

      case 'items':
        let itemsHtml = '<table class="invoice-table">';
        
        if (content.showHeaders && content.headers) {
          itemsHtml += '<thead><tr>';
          content.headers.forEach(header => {
            itemsHtml += `<th>${header}</th>`;
          });
          itemsHtml += '</tr></thead>';
        }
        
        itemsHtml += '<tbody>';
        
        if (data.order?.products) {
          data.order.products.forEach((product, index) => {
            itemsHtml += `<tr>
              <td>${index + 1}</td>
              <td>${product.name}</td>
              <td>${product.description || ''}</td>
              <td>${product.quantity} Stück</td>
              <td>${product.unitPrice?.toFixed(2) || '0.00'}€</td>
              <td>${product.total?.toFixed(2) || '0.00'}€</td>
            </tr>`;
          });
        }
        
        itemsHtml += '</tbody></table>';
        return itemsHtml;

      case 'totals':
        return `
          <div class="totals section">
            ${content.netTotal ? `<div>${this.replaceVariables(content.netTotal, data)}</div>` : ''}
            ${content.shipping ? `<div>${this.replaceVariables(content.shipping, data)}</div>` : ''}
            ${content.vatTotal ? `<div>${this.replaceVariables(content.vatTotal, data)}</div>` : ''}
            ${content.grandTotal ? `<div style="font-weight: bold; border-top: 2px solid #333; padding-top: 10px; margin-top: 10px;">${this.replaceVariables(content.grandTotal, data)}</div>` : ''}
          </div>`;

      case 'paymentInfo':
        return `
          <div class="payment-info section">
            ${content.terms ? `<div style="margin-bottom: 10px;">${this.replaceVariables(content.terms, data)}</div>` : ''}
            ${content.bankDetails ? `<div style="white-space: pre-line; font-family: monospace; font-size: 10px;">${this.replaceVariables(content.bankDetails, data)}</div>` : ''}
          </div>`;

      case 'footer':
        return `
          <div class="footer section">
            ${content.legalNotice ? `<div style="margin-bottom: 10px;">${this.replaceVariables(content.legalNotice, data)}</div>` : ''}
            ${content.vatNote ? `<div style="font-style: italic;">${this.replaceVariables(content.vatNote, data)}</div>` : ''}
          </div>`;

      default:
        return `<div class="section">${JSON.stringify(content)}</div>`;
    }
  }

  // Variablen in Text ersetzen
  replaceVariables(text, data) {
    if (!text || typeof text !== 'string') return text;
    
    return text.replace(/\{\{([^}]+)\}\}/g, (match, path) => {
      const keys = path.trim().split('.');
      let value = data;
      
      for (const key of keys) {
        if (value && typeof value === 'object' && key in value) {
          value = value[key];
        } else {
          return match; // Variable nicht gefunden, ursprünglichen Text beibehalten
        }
      }
      
      return value != null ? value : match;
    });
  }

  // Fallback HTML für ältere Templates
  generateFallbackHTML(data) {
    logger.info('🔧 Generating fallback HTML template');
    
    return `
      <!DOCTYPE html>
      <html lang="de">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Rechnung ${data.invoice?.number || ''}</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 20mm; line-height: 1.4; }
          .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #333; padding-bottom: 20px; }
          .company { font-size: 18px; font-weight: bold; margin-bottom: 10px; }
          .customer { background: #f5f5f5; padding: 15px; margin: 20px 0; }
          table { width: 100%; border-collapse: collapse; margin: 20px 0; }
          th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
          th { background: #f5f5f5; font-weight: bold; }
          .totals { text-align: right; margin-top: 20px; }
          .footer { margin-top: 50px; font-size: 10px; color: #666; border-top: 1px solid #ddd; padding-top: 20px; }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="company">${data.company?.name || 'Glücksmomente Manufaktur'}</div>
          <div>${data.company?.address?.street || 'Musterstraße 123'}</div>
          <div>${data.company?.address?.postalCode || '64673'} ${data.company?.address?.city || 'Zwingenberg'}</div>
        </div>
        
        <div class="customer">
          <strong>Rechnung an:</strong><br>
          ${data.customer?.name || 'Max Mustermann'}<br>
          ${data.customer?.address?.street || 'Beispielstraße 456'}<br>
          ${data.customer?.address?.postalCode || '98765'} ${data.customer?.address?.city || 'Beispielstadt'}
        </div>
        
        <div style="margin: 20px 0;">
          <strong>Rechnungsnummer:</strong> ${data.invoice?.number || 'RE-2025-001'}<br>
          <strong>Rechnungsdatum:</strong> ${data.invoice?.date || new Date().toLocaleDateString('de-DE')}<br>
          <strong>Fälligkeitsdatum:</strong> ${data.invoice?.dueDate || new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toLocaleDateString('de-DE')}
        </div>
        
        <table>
          <thead>
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
            ${(data.order?.products || []).map((product, index) => `
              <tr>
                <td>${index + 1}</td>
                <td>${product.name}</td>
                <td>${product.description || ''}</td>
                <td>${product.quantity} Stück</td>
                <td>${(product.unitPrice || 0).toFixed(2)}€</td>
                <td>${(product.total || 0).toFixed(2)}€</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
        
        <div class="totals">
          <div><strong>Nettobetrag:</strong> ${(data.order?.netTotal || 0).toFixed(2)}€</div>
          <div><strong>Versandkosten:</strong> ${(data.order?.shipping?.cost || 0).toFixed(2)}€</div>
          <div><strong>MwSt.:</strong> ${(data.order?.vatTotal || 0).toFixed(2)}€</div>
          <div style="border-top: 2px solid #333; padding-top: 10px; margin-top: 10px; font-size: 16px;">
            <strong>Gesamtbetrag: ${(data.order?.grandTotal || 0).toFixed(2)}€</strong>
          </div>
        </div>
        
        <div style="margin: 30px 0; padding: 15px; background: #f0f8ff; border-left: 4px solid #007acc;">
          <div><strong>Zahlungsbedingungen:</strong> ${data.invoice?.paymentTerms || 'Zahlbar innerhalb 14 Tagen ohne Abzug.'}</div>
          <div style="margin-top: 10px; font-family: monospace; font-size: 10px;">
            <strong>Bankverbindung:</strong><br>
            Bank: ${data.company?.bankDetails?.bankName || 'Musterbank'}<br>
            IBAN: ${data.company?.bankDetails?.iban || 'DE89 3704 0044 0532 0130 00'}<br>
            BIC: ${data.company?.bankDetails?.bic || 'COBADEFF'}
          </div>
        </div>
        
      </body>
      </html>`;
  }

  // PDF aus HTML generieren mit Puppeteer
  async generatePDFFromHTML(html) {
    let browser;
    let page;
    
    try {
      logger.info('🌐 Starting Puppeteer browser');
      
      // Erweiterte Browser-Konfiguration für Windows-Kompatibilität
      const isWindows = process.platform === 'win32';
      const browserOptions = {
        headless: 'new',
        timeout: 60000,
        protocolTimeout: 60000,
        ignoreHTTPSErrors: true,
        devtools: false,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-gpu',
          '--no-first-run',
          '--disable-background-timer-throttling',
          '--disable-backgrounding-occluded-windows',
          '--disable-renderer-backgrounding',
          '--disable-web-security',
          '--disable-features=VizDisplayCompositor',
          '--disable-ipc-flooding-protection',
          '--disable-extensions',
          '--disable-default-apps',
          '--disable-component-update',
          '--disable-sync',
          '--disable-translate',
          '--disable-plugins',
          '--disable-images',
          '--disable-javascript'
        ]
      };

      // Windows-spezifische Optimierungen
      if (isWindows) {
        browserOptions.args.push(
          '--no-zygote',
          '--single-process',
          '--disable-accelerated-2d-canvas',
          '--disable-accelerated-jpeg-decoding',
          '--disable-accelerated-mjpeg-decode',
          '--disable-accelerated-video-decode'
        );
      }

      if (process.env.CHROME_PATH) {
        browserOptions.executablePath = process.env.CHROME_PATH;
      }

      browser = await puppeteer.launch(browserOptions);

      // Überwache Browser-Events
      browser.on('disconnected', () => {
        logger.warn('⚠️ Browser disconnected unexpectedly');
      });

      page = await browser.newPage();
      
      // Erweiterte Konfiguration für robuste PDF-Generierung
      await page.setViewport({ width: 1200, height: 1600 });
      await page.setDefaultNavigationTimeout(60000);
      await page.setDefaultTimeout(60000);
      
      // Deaktiviere JavaScript und Ressourcen-Loading für bessere Stabilität
      await page.setJavaScriptEnabled(false);
      await page.setRequestInterception(true);
      
      page.on('request', (request) => {
        // Nur HTML und CSS erlauben
        if (request.resourceType() === 'document' || request.resourceType() === 'stylesheet') {
          request.continue();
        } else {
          request.abort();
        }
      });
      
      logger.info('📄 Setting page content');
      await page.setContent(html, { 
        waitUntil: 'domcontentloaded', // Weniger strikt als networkidle0
        timeout: 30000
      });

      // Erweiterte Wartezeit für vollständiges Rendering
      await page.waitForFunction(() => {
        return document.readyState === 'complete' && 
               window.getComputedStyle(document.body).getPropertyValue('font-family') !== '';
      }, { timeout: 5000 });
      
      // Zusätzliche Wartezeit für CSS-Rendering
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Prüfe ob Page noch verfügbar ist vor PDF-Generierung
      if (page.isClosed()) {
        throw new Error('Page was closed before PDF generation');
      }

      logger.info('🎨 Generating PDF');
      const pdf = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: {
          top: '15mm',
          right: '15mm',
          bottom: '15mm',
          left: '15mm'
        },
        timeout: 45000,
        preferCSSPageSize: false,
        displayHeaderFooter: false
      });

      logger.success('✅ PDF generated successfully');
      return pdf;
    } catch (error) {
      logger.error('❌ PDF generation error:', {
        message: error.message,
        name: error.name,
        stack: error.stack
      });
      
      // Spezifische Fehlerbehandlung für bekannte Puppeteer-Probleme
      let errorMessage = error.message;
      if (error.name === 'TargetCloseError' || error.message.includes('Target closed')) {
        errorMessage = 'Browser tab was closed unexpectedly during PDF generation';
      } else if (error.message.includes('Protocol error')) {
        errorMessage = 'Browser protocol error during PDF generation';
      } else if (error.message.includes('timeout')) {
        errorMessage = 'PDF generation timed out';
      }
      
      const pdfError = new Error(`PDF generation failed: ${errorMessage}`);
      pdfError.originalError = error;
      pdfError.isPuppeteerError = true;
      throw pdfError;
    } finally {
      // Robusteres Cleanup
      try {
        if (page && !page.isClosed()) {
          logger.info('📄 Closing page');
          await Promise.race([
            page.close(),
            new Promise((_, reject) => setTimeout(() => reject(new Error('Page close timeout')), 5000))
          ]);
        }
      } catch (pageCloseError) {
        logger.warn('Warning: Error closing page:', pageCloseError.message);
      }

      try {
        if (browser && browser.isConnected()) {
          logger.info('🔒 Closing browser');
          await Promise.race([
            browser.close(),
            new Promise((_, reject) => setTimeout(() => reject(new Error('Browser close timeout')), 10000))
          ]);
        }
      } catch (browserCloseError) {
        logger.warn('Warning: Error closing browser:', browserCloseError.message);
        // Force kill browser process falls nötig
        try {
          if (browser && browser.process()) {
            browser.process().kill('SIGKILL');
          }
        } catch (killError) {
          logger.warn('Warning: Could not force kill browser process:', killError.message);
        }
      }
    }
  }

  // Variablen in Text ersetzen
  replaceVariables(template, data) {
    if (!template || typeof template !== 'string') {
      return template || '';
    }

    return template.replace(/\{\{([^}]+)\}\}/g, (match, variable) => {
      const keys = variable.trim().split('.');
      let value = data;

      // Navigiere durch das Datenobjekt basierend auf den Schlüsseln
      for (const key of keys) {
        if (value && typeof value === 'object' && key in value) {
          value = value[key];
        } else {
          // Wenn der Pfad nicht gefunden wird, gib den ursprünglichen Platzhalter zurück
          return match;
        }
      }

      // Werte formatieren
      if (typeof value === 'number') {
        return value.toFixed(2);
      } else if (value instanceof Date) {
        return value.toLocaleDateString('de-DE');
      } else if (value === null || value === undefined) {
        return match; // Originalen Platzhalter behalten
      }

      return String(value);
    });
  }

  // Liste der verfügbaren Variablen
  getAvailableVariablesList() {
    return [
      // Firmeninformationen
      { name: 'company.name', description: 'Firmenname', category: 'company' },
      { name: 'company.address.street', description: 'Straße', category: 'company' },
      { name: 'company.address.postalCode', description: 'PLZ', category: 'company' },
      { name: 'company.address.city', description: 'Stadt', category: 'company' },
      { name: 'company.address.country', description: 'Land', category: 'company' },
      { name: 'company.contact.phone', description: 'Telefon', category: 'company' },
      { name: 'company.contact.email', description: 'E-Mail', category: 'company' },
      { name: 'company.contact.website', description: 'Website', category: 'company' },
      { name: 'company.taxInfo.taxNumber', description: 'Steuernummer', category: 'company' },
      { name: 'company.taxInfo.vatId', description: 'USt-IdNr', category: 'company' },
      { name: 'company.taxInfo.ceo', description: 'Geschäftsführer', category: 'company' },
      { name: 'company.taxInfo.legalForm', description: 'Rechtsform', category: 'company' },
      { name: 'company.bankDetails.bankName', description: 'Bankname', category: 'company' },
      { name: 'company.bankDetails.iban', description: 'IBAN', category: 'company' },
      { name: 'company.bankDetails.bic', description: 'BIC', category: 'company' },

      // Kundeninformationen
      { name: 'customer.name', description: 'Kundenname', category: 'customer' },
      { name: 'customer.email', description: 'Kunden-E-Mail', category: 'customer' },
      { name: 'customer.address.street', description: 'Kunden-Straße', category: 'customer' },
      { name: 'customer.address.postalCode', description: 'Kunden-PLZ', category: 'customer' },
      { name: 'customer.address.city', description: 'Kunden-Stadt', category: 'customer' },
      { name: 'customer.customerNumber', description: 'Kundennummer', category: 'customer' },

      // Bestellinformationen
      { name: 'order.number', description: 'Bestellnummer', category: 'order' },
      { name: 'order.date', description: 'Bestelldatum', category: 'order' },
      { name: 'order.netTotal', description: 'Nettosumme', category: 'order' },
      { name: 'order.vatTotal', description: 'MwSt.-Betrag', category: 'order' },
      { name: 'order.grandTotal', description: 'Gesamtsumme', category: 'order' },
      { name: 'order.shipping.cost', description: 'Versandkosten', category: 'order' },

      // Rechnungsinformationen
      { name: 'invoice.number', description: 'Rechnungsnummer', category: 'invoice' },
      { name: 'invoice.date', description: 'Rechnungsdatum', category: 'date' },
      { name: 'invoice.dueDate', description: 'Fälligkeitsdatum', category: 'date' },
      { name: 'invoice.deliveryDate', description: 'Lieferdatum', category: 'date' },
      { name: 'invoice.performanceDate', description: 'Leistungsdatum', category: 'date' },
      { name: 'invoice.paymentTerms', description: 'Zahlungsbedingungen', category: 'invoice' }
    ];
  }

  // Verfügbare Variablen abrufen
  async getAvailableVariables(req, res) {
    try {
      const variables = this.getAvailableVariablesList();
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

  // Firmenangaben aus Standard-Template abrufen (für Frontend)
  async getCompanyInfo(req, res) {
    try {
      let template = await InvoiceTemplate.findOne({ isDefault: true });
      
      if (!template) {
        // Erstelle Standard-Template falls keins existiert
        template = await this.createDefaultTemplate();
      }

      const companyInfo = template.companyInfo || {};

      res.json({
        success: true,
        data: {
          name: companyInfo.name || 'Glücksmomente Manufaktur',
          address: {
            street: companyInfo.address?.street || '',
            postalCode: companyInfo.address?.postalCode || '',
            city: companyInfo.address?.city || '',
            country: companyInfo.address?.country || 'Deutschland'
          },
          contact: {
            phone: companyInfo.contact?.phone || '',
            email: companyInfo.contact?.email || '',
            website: companyInfo.contact?.website || ''
          },
          taxInfo: {
            taxNumber: companyInfo.taxInfo?.taxNumber || '',
            vatId: companyInfo.taxInfo?.vatId || '',
            ceo: companyInfo.taxInfo?.ceo || '',
            legalForm: companyInfo.taxInfo?.legalForm || '',
            taxOffice: companyInfo.taxInfo?.taxOffice || '',
            registrationCourt: companyInfo.taxInfo?.registrationCourt || ''
          },
          bankDetails: {
            bankName: companyInfo.bankDetails?.bankName || '',
            iban: companyInfo.bankDetails?.iban || '',
            bic: companyInfo.bankDetails?.bic || ''
          }
        }
      });
    } catch (error) {
      console.error('Fehler beim Abrufen der Firmenangaben:', error);
      res.status(500).json({
        success: false,
        message: 'Fehler beim Abrufen der Firmenangaben',
        error: error.message
      });
    }
  }

  // ===== NEUE KONSOLIDIERTE RECHNUNGSGENERIERUNG =====
  
  // Standard Header-Konfiguration
  getDefaultHeaderConfig() {
    return {
      companyName: 'Glücksmomente Manufaktur',
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
      logo: {
        enabled: false,
        url: ''
      }
    };
  }

  // Standard Footer-Konfiguration (Deutsche Rechtspflichtangaben)
  getDefaultFooterConfig() {
    return {
      taxInfo: {
        taxNumber: '11548484',
        vatId: 'DE123456789',
        taxOffice: 'Bensheim'
      },
      owner: {
        name: 'Ralf Jacob'
      },
      legal: {
        registrationCourt: 'Darmstadt',
        legalForm: 'Einzelunternehmen',
        jurisdiction: 'Zwingenberg'
      },
      bankDetails: {
        bankName: 'Sparkasse Bensheim',
        iban: 'DE85 5085 2651 0346 0592 50',
        bic: 'HELADEF1DAD'
      },
      businessHours: 'Mo-Fr: 9:00-17:00 Uhr',
      isSmallBusiness: true, // § 19 UStG
      paymentTerms: 14 // Tage
    };
  }

  // Komplette CSS-Styles für DIN A4 Rechnung
  getInvoiceStyles() {
    return `
      <style>
        @page {
          size: A4;
          margin: 15mm 20mm 15mm 20mm;
        }
        
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        
        html, body {
          height: 100%;
          margin: 0;
          padding: 0;
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
        
        .invoice-page {
          width: 100%;
          min-height: 267mm; /* 297mm - 2*15mm margins */
          max-height: 267mm;
          display: flex;
          flex-direction: column;
          page-break-after: always;
        }
        
        .invoice-page:last-child {
          page-break-after: avoid;
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
        
        /* ===== PAGE BREAKS ===== */
        .page-break {
          page-break-before: always;
        }
        
        .no-break {
          page-break-inside: avoid;
          break-inside: avoid;
        }
        
        /* ===== PRINT OPTIMIZATIONS ===== */
        @media print {
          .invoice-container {
            margin: 0;
            box-shadow: none;
            width: 100%;
            max-width: none;
          }
          
          .invoice-page {
            margin: 0;
            box-shadow: none;
            width: 100%;
            max-width: none;
          }
          
          .invoice-footer {
            background: #f8f9fa !important;
            border: 1px solid #dee2e6 !important;
          }
          
          body {
            margin: 0;
            padding: 0;
            background: white;
          }
        }
        
        /* ===== RESPONSIVE FÜR BILDSCHIRM ===== */
        @media screen {
          .invoice-container {
            box-shadow: 0 0 10mm rgba(0,0,0,0.1);
            margin: 10mm auto;
          }
          
          .invoice-page {
            background: white;
          }
        }
      </style>
    `;
  }

  // Neue Haupt-Rechnungsgenerierung (ersetzt alle alten Methoden)
  generateCompleteInvoice(template, data) {
    const headerConfig = { ...this.getDefaultHeaderConfig(), ...(template.companyInfo || {}) };
    const footerConfig = { ...this.getDefaultFooterConfig(), ...(template.footerInfo || {}) };
    
    const html = this.buildInvoiceHTML(headerConfig, footerConfig, data);
    
    console.log('🔍 NEW DEBUG: Complete Invoice generated with length:', html.length);
    console.log('🔍 NEW DEBUG: Contains footer?', html.includes('invoice-footer'));
    
    return html;
  }

  // HTML-Struktur für DIN A4 mehrseitige Rechnung aufbauen
  buildInvoiceHTML(headerConfig, footerConfig, data) {
    const products = data.order?.products || [];
    const itemsPerPage = 8; // Weniger Artikel pro Seite für DIN A4
    
    let html = `
      <!DOCTYPE html>
      <html lang="de">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Rechnung ${data.invoice?.number || ''} - ${headerConfig.companyName}</title>
        ${this.getInvoiceStyles()}
      </head>
      <body>
    `;

    if (products.length === 0) {
      // Leere Rechnung - alles auf eine Seite
      html += `
        <div class="invoice-container">
          <div class="invoice-page">
            ${this.buildPageHeader(headerConfig, data, true)}
            ${this.buildCustomerSection(data)}
            ${this.buildProductsTable([], 1, true)}
            ${this.buildTotalsSection(data)}
            ${this.buildFooterSection(footerConfig, data)}
          </div>
        </div>
      `;
    } else {
      // Produktseiten berechnen
      const totalPages = Math.ceil(products.length / itemsPerPage);
      
      for (let page = 0; page < totalPages; page++) {
        const startIndex = page * itemsPerPage;
        const endIndex = Math.min(startIndex + itemsPerPage, products.length);
        const pageProducts = products.slice(startIndex, endIndex);
        const isFirstPage = page === 0;
        const isLastPage = page === totalPages - 1;
        
        html += `
          <div class="invoice-container">
            <div class="invoice-page">
              ${this.buildPageHeader(headerConfig, data, isFirstPage, page + 1, totalPages)}
              ${isFirstPage ? this.buildCustomerSection(data) : ''}
              ${this.buildProductsTable(pageProducts, page + 1, isFirstPage, startIndex + 1)}
              ${isLastPage ? this.buildTotalsSection(data) : ''}
              ${this.buildFooterSection(footerConfig, data)}
            </div>
          </div>
        `;
      }
    }
    
    html += `
      </body>
      </html>
    `;
    
    return html;
  }

  // Header für jede Seite (DIN A4 optimiert)
  buildPageHeader(headerConfig, data, isFirstPage = true, pageNumber = 1, totalPages = 1) {
    if (isFirstPage) {
      return `
        <div class="invoice-header no-break">
          <div class="company-info">
            <div class="company-name">${headerConfig.companyName}</div>
            <div class="company-address">
              ${headerConfig.address.street}<br>
              ${headerConfig.address.postalCode} ${headerConfig.address.city}<br>
              ${headerConfig.address.country}
            </div>
            <div class="company-contact">
              Tel: ${headerConfig.contact.phone}<br>
              E-Mail: ${headerConfig.contact.email}<br>
              Web: ${headerConfig.contact.website}
            </div>
          </div>
          
          <div class="invoice-title-section">
            <div class="invoice-title">Rechnung</div>
            <div class="invoice-meta">
              <div><span>Rechnungsnr.:</span> <strong>${data.invoice?.number || 'RE-2025-001'}</strong></div>
              <div><span>Rechnungsdatum:</span> <strong>${data.invoice?.date || new Date().toLocaleDateString('de-DE')}</strong></div>
              <div><span>Bestellnummer:</span> <strong>${data.order?.number || 'ORD-2025-001'}</strong></div>
              <div><span>Leistungsdatum:</span> <strong>${data.invoice?.performanceDate || new Date().toLocaleDateString('de-DE')}</strong></div>
            </div>
          </div>
        </div>
      `;
    } else {
      return `
        <div class="invoice-header no-break" style="margin-bottom: 10mm;">
          <div class="company-info">
            <div class="company-name">${headerConfig.companyName}</div>
          </div>
          <div class="invoice-title-section">
            <div class="invoice-title">Rechnung ${data.invoice?.number || ''}</div>
            <div style="font-size: 8pt; color: #7f8c8d; margin-top: 2mm;">Seite ${pageNumber} von ${totalPages}</div>
          </div>
        </div>
      `;
    }
  }

  // Kundenbereich
  buildCustomerSection(data) {
    return `
      <div class="customer-section no-break">
        <div class="customer-label">Rechnung an:</div>
        <div class="customer-address">
          <div class="customer-name">${data.customer?.name || 'Max Mustermann'}</div>
          <div>
            ${data.customer?.address?.street || 'Beispielstraße 456'}<br>
            ${data.customer?.address?.postalCode || '98765'} ${data.customer?.address?.city || 'Beispielstadt'}<br>
            ${data.customer?.address?.country || 'Deutschland'}
          </div>
          <div style="margin-top: 8px;">
            <strong>Kundennummer:</strong> ${data.customer?.customerNumber || 'KD-2025-001'}
          </div>
        </div>
      </div>
    `;
  }

  // Produkttabelle (DIN A4 optimiert)
  buildProductsTable(products, pageNumber, showHeader = true, startPosition = 1) {
    if (products.length === 0 && showHeader) {
      return `
        <div class="products-section">
          <div class="products-title">Artikel</div>
          <div style="text-align: center; padding: 20mm 0; color: #7f8c8d; font-style: italic;">
            Keine Artikel vorhanden
          </div>
        </div>
      `;
    }

    let html = `
      <div class="products-section">
        ${showHeader ? '<div class="products-title">Artikel</div>' : ''}
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
    `;

    products.forEach((product, index) => {
      const position = startPosition + index;
      html += `
        <tr>
          <td class="text-center">${position}</td>
          <td>
            <div class="product-name">${product.name || 'Unbekannter Artikel'}</div>
            <div class="product-sku">Art.-Nr.: ${product.sku || 'SKU' + String(position).padStart(3, '0')}</div>
          </td>
          <td>
            <div class="product-description">${product.description || 'Keine Beschreibung verfügbar'}</div>
          </td>
          <td class="text-center">${product.quantity || 1} Stück</td>
          <td class="text-right">${(product.unitPrice || 0).toFixed(2)}€</td>
          <td class="text-right"><strong>${(product.total || 0).toFixed(2)}€</strong></td>
        </tr>
      `;
    });

    html += `
          </tbody>
        </table>
      </div>
    `;

    return html;
  }

  // Summenbereich
  buildTotalsSection(data) {
    const order = data.order || {};
    const shipping = order.shipping || {};
    const template = data.template || {};
    const isSmallBusiness = template.companyInfo?.isSmallBusiness || false;
    
    return `
      <div class="totals-section no-break">
        <table class="totals-table">
          <tr>
            <td class="total-label">Nettobetrag:</td>
            <td class="total-amount">${(order.netTotal || 0).toFixed(2)}€</td>
          </tr>
          <tr>
            <td class="total-label">Versandkosten:</td>
            <td class="total-amount">${(shipping.cost || 0).toFixed(2)}€</td>
          </tr>
          ${!isSmallBusiness && order.vatTotal ? `
          <tr>
            <td class="total-label">MwSt. (${shipping.vatRate || 19}%):</td>
            <td class="total-amount">${(order.vatTotal || 0).toFixed(2)}€</td>
          </tr>
          ` : ''}
          ${isSmallBusiness ? `
          <tr>
            <td class="total-label small-business">Keine MwSt. (§ 19 UStG):</td>
            <td class="total-amount">0,00€</td>
          </tr>
          ` : ''}
          <tr class="grand-total">
            <td class="total-label">Gesamtbetrag:</td>
            <td class="total-amount">${(order.grandTotal || 0).toFixed(2)}€</td>
          </tr>
        </table>
      </div>
    `;
  }

  // Footer-Bereich (Deutsche Rechtspflichtangaben)
  buildFooterSection(footerConfig, data) {
    const template = data.template || {};
    const isSmallBusiness = template.companyInfo?.isSmallBusiness || false;
    const paymentMethod = template.companyInfo?.paymentMethod || 'sofort';
    
    const vatText = isSmallBusiness 
      ? 'Kleinunternehmer-Regelung: Gemäß § 19 UStG wird keine Umsatzsteuer ausgewiesen.'
      : 'Steuerpflichtige Lieferung: Diese Rechnung enthält ausgewiesene Umsatzsteuer (§ 14 UStG).';
    
    const paymentText = paymentMethod === 'sofort'
      ? 'Zahlung sofort fällig: Bar bei Abholung oder via PayPal'
      : 'Überweisung nur in Ausnahmefällen';

    return `
      <div class="invoice-footer no-break">
        <div class="footer-grid">
          ${template.layout?.footer?.showContactInfo !== false ? `
          <!-- Kontakt & Service -->
          <div class="footer-column">
            <h4>📞 Kontakt & Service</h4>
            <p><strong>Telefon:</strong> ${footerConfig.contact?.phone || '+49 6251 1234567'}</p>
            <p><strong>E-Mail:</strong> ${footerConfig.contact?.email || 'ralle.jacob84@googlemail.com'}</p>
            <p><strong>Web:</strong> ${footerConfig.contact?.website || 'www.glücksmomente-manufaktur.vercel.app'}</p>
            <p><strong>Erreichbarkeit:</strong><br>Nach Vereinbarung (Nebengewerbe)</p>
          </div>
          ` : ''}
          
          ${template.layout?.footer?.showTaxInfo !== false ? `
          <!-- Steuerliche Angaben -->
          <div class="footer-column footer-center">
            <h4>🏛️ Steuerliche Angaben</h4>
            <p><strong>Steuernummer:</strong> ${footerConfig.taxInfo.taxNumber}</p>
            ${footerConfig.taxInfo.vatId ? `<p><strong>USt-IdNr.:</strong> ${footerConfig.taxInfo.vatId}</p>` : ''}
            <p><strong>Inhaber:</strong> ${footerConfig.owner.name}</p>
            <p><strong>Finanzamt:</strong> ${footerConfig.taxInfo.taxOffice}</p>
          </div>
          ` : ''}
          
          ${template.layout?.footer?.showLegalInfo !== false ? `
          <!-- Rechtliche Angaben -->
          <div class="footer-column footer-right">
            <h4>⚖️ Rechtliche Angaben</h4>
            <p><strong>Amtsgericht:</strong> ${footerConfig.legal.registrationCourt}</p>
            <p><strong>Rechtsform:</strong> ${footerConfig.legal.legalForm}</p>
            <p><strong>Gerichtsstand:</strong> ${footerConfig.legal.jurisdiction}</p>
            <p><strong>Verantwortlich:</strong> ${footerConfig.owner.name}</p>
          </div>
          ` : ''}
        </div>
        
        <!-- Zahlungsmodalitäten -->
        <div class="footer-bank">
          <div class="footer-bank-item">
            <strong>💵 Zahlung</strong>
            <span>${paymentText}</span>
          </div>
          ${paymentMethod === 'sofort' ? `
          <div class="footer-bank-item">
            <strong>📱 PayPal</strong>
            <span>Sicher & schnell</span>
          </div>
          <div class="footer-bank-item">
            <strong>💰 Bar</strong>
            <span>Bei Abholung</span>
          </div>
          ` : ''}
          ${(template.companyInfo?.bankDetails?.iban && template.layout?.footer?.showBankDetails === true) ? `
          <div class="footer-bank-item">
            <strong>🏦 Notfall-Überweisung</strong>
            <span>${footerConfig.bankDetails.bankName}</span>
          </div>
          <div class="footer-bank-item">
            <strong>💳 IBAN</strong>
            <span>${footerConfig.bankDetails.iban}</span>
          </div>
          <div class="footer-bank-item">
            <strong>🔗 BIC</strong>
            <span>${footerConfig.bankDetails.bic}</span>
          </div>
          ` : ''}
        </div>
        
        <!-- Rechtliche Hinweise -->
        <div class="footer-legal">
          <strong>${vatText}</strong><br>
          Diese Rechnung entspricht den gesetzlichen Anforderungen nach § 14 UStG. 
          Es gilt deutsches Recht. Erfüllungsort und Gerichtsstand ist ${footerConfig.legal.jurisdiction}.
        </div>
      </div>
    `;
  }

  // Standard Header-Konfiguration (wurde zur besseren Konsolidierung bereits oben definiert)

  // CSS für Rechnungen generieren
  getInvoiceCSS() {
    return `
      @page {
        size: A4;
        margin: 1cm 1.5cm 1.5cm 1.5cm;
      }
      
      * {
        margin: 0;
        padding: 0;
        box-sizing: border-box;
      }
      
      body {
        font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
        font-size: 9pt;
            line-height: 1.3;
            color: #1a1a1a;
            background: #f8f9fa;
          }
          
          .invoice-wrapper {
            background: white;
            max-width: 210mm;
            margin: 10px auto;
            box-shadow: 0 4px 16px rgba(0,0,0,0.08);
            border-radius: 4px;
            overflow: hidden;
          }
          
          .invoice-container {
            width: 100%;
            background: white;
            position: relative;
            min-height: 297mm;
            padding: 1.5cm;
          }
          
          /* ===== HEADER SECTION ===== */
          .header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            margin-bottom: 25px;
            padding-bottom: 15px;
            border-bottom: 2px solid #e8ecef;
          }
          
          .company-info {
            flex: 1;
          }
          
          .company-name {
            font-size: 16pt;
            font-weight: 700;
            color: #1a1a1a;
            margin-bottom: 6px;
            letter-spacing: -0.2px;
          }
          
          .company-address {
            color: #495057;
            line-height: 1.4;
            font-size: 9pt;
          }
          
          .logo-container {
            width: 120px;
            height: 70px;
            display: flex;
            align-items: center;
            justify-content: center;
            border-radius: 4px;
            overflow: hidden;
          }
          
          .company-logo {
            max-width: 100%;
            max-height: 100%;
            object-fit: contain;
            border-radius: 4px;
          }
          
          .logo-placeholder {
            width: 100%;
            height: 100%;
            background: linear-gradient(135deg, #0066cc 0%, #004499 100%);
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-weight: 600;
            font-size: 11pt;
            text-shadow: 0 1px 2px rgba(0,0,0,0.3);
            border-radius: 4px;
          }
          
          /* ===== CUSTOMER SECTION ===== */
          .customer-section {
            margin: 25px 0;
          }
          
          .recipient-label {
            font-size: 8pt;
            color: #495057;
            text-transform: uppercase;
            letter-spacing: 0.6px;
            margin-bottom: 6px;
            font-weight: 500;
          }
          
          .customer-address {
            background: #f1f3f4;
            padding: 15px;
            border-left: 3px solid #0066cc;
            border-radius: 3px;
            margin-bottom: 20px;
          }
          
          .customer-name {
            font-weight: 700;
            font-size: 11pt;
            margin-bottom: 6px;
            color: #1a1a1a;
          }
          
          .customer-details {
            color: #343a40;
            line-height: 1.4;
          }
          
          /* ===== INVOICE DETAILS ===== */
          .invoice-details {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 25px;
            margin: 25px 0;
            background: linear-gradient(135deg, #f1f3f4 0%, #e9ecef 100%);
            padding: 20px;
            border-radius: 4px;
            border: 1px solid #dee2e6;
          }
          
          .detail-group h3 {
            font-size: 10pt;
            font-weight: 600;
            margin-bottom: 10px;
            color: #1a1a1a;
            border-bottom: 2px solid #0066cc;
            padding-bottom: 4px;
          }
          
          .detail-item {
            margin-bottom: 6px;
            display: flex;
            justify-content: space-between;
          }
          
          .detail-label {
            font-weight: 500;
            color: #495057;
            font-size: 8.5pt;
          }
          
          .detail-value {
            font-weight: 600;
            color: #1a1a1a;
          }
          
          /* ===== PRODUCTS TABLE ===== */
          .products-table {
            width: 100%;
            border-collapse: collapse;
            margin: 20px 0;
            background: white;
            border-radius: 4px;
            overflow: hidden;
            box-shadow: 0 1px 4px rgba(0,0,0,0.04);
          }
          
          .products-table thead {
            background: linear-gradient(135deg, #1a1a1a 0%, #343a40 100%);
            color: white;
          }
          
          .products-table th {
            padding: 12px 10px;
            text-align: left;
            font-weight: 600;
            font-size: 8.5pt;
            text-transform: uppercase;
            letter-spacing: 0.4px;
          }
          
          .products-table td {
            padding: 10px;
            border-bottom: 1px solid #f1f3f4;
            vertical-align: top;
            font-size: 9pt;
          }
          
          .products-table tbody tr:nth-child(even) {
            background: #fafbfc;
          }
          
          .products-table tbody tr:hover {
            background: #f1f3f4;
          }
          
          .text-right { text-align: right; }
          .text-center { text-align: center; }
          
          .product-name {
            font-weight: 600;
            color: #1a1a1a;
            margin-bottom: 3px;
          }
          
          .product-description {
            font-size: 8pt;
            color: #495057;
            line-height: 1.3;
          }
          
          .product-sku {
            font-size: 7.5pt;
            color: #6c757d;
            margin-top: 2px;
            font-style: italic;
          }
          
          /* ===== TOTALS SECTION ===== */
          .totals-section {
            width: 300px;
            margin-left: auto;
            margin-top: 20px;
          }
          
          .totals-table {
            width: 100%;
            border-collapse: collapse;
            background: white;
            border-radius: 4px;
            overflow: hidden;
            box-shadow: 0 1px 4px rgba(0,0,0,0.06);
          }
          
          .totals-table td {
            padding: 8px 12px;
            border-bottom: 1px solid #f1f3f4;
            font-size: 9pt;
          }
          
          .total-label {
            font-weight: 500;
            color: #343a40;
            text-align: left;
          }
          
          .total-amount {
            text-align: right;
            font-weight: 600;
            color: #1a1a1a;
          }
          
          .grand-total {
            background: linear-gradient(135deg, #28a745 0%, #20c997 100%);
            color: white;
            font-size: 13pt;
            font-weight: 700;
          }
          
          .grand-total td {
            padding: 15px 12px;
            border: none;
            text-shadow: 0 1px 2px rgba(0,0,0,0.3);
          }
          
          /* ===== FOOTER SECTION ===== */
          .footer {
            position: fixed;
            bottom: 1cm;
            left: 1.5cm;
            right: 1.5cm;
            border-top: 1px solid #dee2e6;
            padding-top: 15px;
            font-size: 7.5pt;
            color: #495057;
            clear: both;
            background: white;
            z-index: 10;
          }
          
          /* ===== PAGE BREAK SYSTEM ===== */
          .page-break {
            page-break-before: always;
            break-before: page;
          }
          
          .avoid-page-break {
            page-break-inside: avoid;
            break-inside: avoid;
          }
          
          .products-table {
            width: 100%;
            border-collapse: collapse;
            margin: 20px 0;
            background: white;
            border-radius: 4px;
            overflow: hidden;
            box-shadow: 0 1px 4px rgba(0,0,0,0.04);
            page-break-inside: auto;
          }
          
          .products-table tbody tr {
            page-break-inside: avoid;
            break-inside: avoid;
          }
          
          /* Separate table headers for new pages */
          .table-header-repeat {
            display: table-header-group;
          }
          
          .footer-content {
            display: grid;
            grid-template-columns: 1fr 1fr 1fr;
            gap: 20px;
            margin-bottom: 15px;
          }
          
          .footer-section h4 {
            font-size: 8pt;
            font-weight: 600;
            margin-bottom: 8px;
            color: #343a40;
            border-bottom: 1px solid #dee2e6;
            padding-bottom: 3px;
          }
          
          .footer-section div {
            margin-bottom: 3px;
            line-height: 1.3;
          }
          
          .bank-info {
            margin-top: 10px;
            padding-top: 10px;
            border-top: 1px solid #f1f3f4;
          }
          
          .bank-info h5 {
            font-size: 7.5pt;
            font-weight: 600;
            margin-bottom: 5px;
            color: #495057;
          }
          
          .bank-data {
            display: grid;
            grid-template-columns: 1fr 1fr 1fr;
            gap: 15px;
            font-size: 7pt;
          }
          
          .bank-data div {
            font-family: 'Courier New', monospace;
          }
          
          .legal-notice {
            text-align: center;
            border-top: 1px solid #dee2e6;
            padding-top: 10px;
            font-style: italic;
            color: #6c757d;
            font-size: 7pt;
            line-height: 1.4;
          }
          
          /* ===== PRINT OPTIMIZATIONS ===== */
          @media print {
            body {
              background: white;
              font-size: 9pt;
              margin: 0;
              padding: 0;
            }
            
            .invoice-wrapper {
              box-shadow: none;
              border-radius: 0;
              margin: 0;
              max-width: none;
              page-break-after: auto;
            }
            
            .invoice-container {
              padding: 0;
              min-height: auto;
              page-break-after: auto;
            }
            
            /* Footer für Print-Ausgabe optimiert */
            .footer-section {
              margin-top: auto;
              page-break-inside: avoid;
              break-inside: avoid;
            }
            
            .footer-pflichtangaben {
              grid-template-columns: 1fr 1fr 1fr;
              gap: 15px;
            }
            
            .footer-bank {
              gap: 20px;
            }
            
            .products-table {
              page-break-inside: auto;
            }
            
            .products-table thead {
              display: table-header-group;
            }
            
            .products-table tbody tr {
              page-break-inside: avoid;
            }
            
            .totals-section {
              page-break-inside: avoid;
              margin-top: 20px;
            }
            
            /* Hide payment section completely in print */
            .payment-section {
              display: none;
            }
            
            .page-break {
              page-break-before: always;
            }
          }
          
          /* ===== RESPONSIVE DESIGN ===== */
          @media (max-width: 768px) {
            .invoice-wrapper {
              margin: 10px;
              border-radius: 0;
            }
            
            .invoice-container {
              padding: 20px;
              min-height: auto;
            }
            
            .header {
              flex-direction: column;
              gap: 20px;
              text-align: center;
            }
            
            .invoice-details {
              grid-template-columns: 1fr;
              gap: 20px;
            }
            
            .bank-details {
              grid-template-columns: 1fr;
            }
            
            .footer-content {
              grid-template-columns: 1fr;
              gap: 15px;
            }
            
            .footer {
              position: static;
              margin-top: 40px;
            }
            
            .products-table {
              font-size: 8pt;
            }
            
            .products-table th,
            .products-table td {
              padding: 8px 6px;
            }
          }
        </style>
      </head>
      <body>
        <div class="invoice-wrapper">
          <div class="invoice-container">
            
            <!-- ===== HEADER SECTION ===== -->
            <div class="header">
              <div class="company-info">
                <div class="company-name">${data.company?.name || 'Glücksmomente Manufaktur'}</div>
                <div class="company-address">
                  ${data.company?.address?.street || 'Musterstraße 123'}<br>
                  ${data.company?.address?.postalCode || '12345'} ${data.company?.address?.city || 'Musterstadt'}<br>
                  ${data.company?.address?.country || 'Deutschland'}
                </div>
              </div>
              <div class="logo-container">
                ${data.company?.logo?.enabled && data.company?.logo?.url ? 
                  `<img src="${data.company.logo.url}" alt="${data.company?.name || 'Logo'}" class="company-logo">` :
                  '<div class="logo-placeholder">LOGO</div>'
                }
              </div>
            </div>
            
            <!-- ===== CUSTOMER SECTION ===== -->
            <div class="customer-section">
              <div class="recipient-label">Rechnung an:</div>
              <div class="customer-address">
                <div class="customer-name">${data.customer?.name || 'Max Mustermann'}</div>
                <div class="customer-details">
                  ${data.customer?.address?.street || 'Beispielstraße 456'}<br>
                  ${data.customer?.address?.postalCode || '98765'} ${data.customer?.address?.city || 'Beispielstadt'}<br>
                  ${data.customer?.address?.country || 'Deutschland'}
                </div>
              </div>
            </div>
            
            <!-- ===== INVOICE DETAILS ===== -->
            <div class="invoice-details">
              <div class="detail-group">
                <h3>Rechnungsangaben</h3>
                <div class="detail-item">
                  <span class="detail-label">Rechnungsnummer:</span>
                  <span class="detail-value">${data.invoice?.number || 'RE-2025-001'}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">Rechnungsdatum:</span>
                  <span class="detail-value">${data.invoice?.date || new Date().toLocaleDateString('de-DE')}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">Fälligkeitsdatum:</span>
                  <span class="detail-value">${data.invoice?.dueDate || new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toLocaleDateString('de-DE')}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">Bestellnummer:</span>
                  <span class="detail-value">${data.order?.number || 'ORD-2025-001'}</span>
                </div>
              </div>
              
              <div class="detail-group">
                <h3>Kundendaten</h3>
                <div class="detail-item">
                  <span class="detail-label">Kundennummer:</span>
                  <span class="detail-value">${data.customer?.customerNumber || 'KD-2025-001'}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">E-Mail:</span>
                  <span class="detail-value">${data.customer?.email || 'kunde@email.de'}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">Leistungsdatum:</span>
                  <span class="detail-value">${data.invoice?.performanceDate || new Date().toLocaleDateString('de-DE')}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">Zahlungsart:</span>
                  <span class="detail-value">${data.order?.paymentMethod || 'PayPal'}</span>
                </div>
              </div>
            </div>
            
            <!-- ===== PRODUCTS TABLE ===== -->
            <table class="products-table">
              <thead>
                <tr>
                  <th style="width: 40px;">Pos.</th>
                  <th style="width: auto;">Artikel</th>
                  <th style="width: 300px;">Beschreibung</th>
                  <th style="width: 80px;" class="text-center">Menge</th>
                  <th style="width: 100px;" class="text-right">Einzelpreis</th>
                  <th style="width: 100px;" class="text-right">Gesamt</th>
                </tr>
              </thead>
              <tbody>
                ${(data.order?.products || []).map((product, index) => `
                  <tr>
                    <td class="text-center">${index + 1}</td>
                    <td>
                      <div class="product-name">${product.name || 'Produktname'}</div>
                      <div class="product-sku">Art.-Nr.: ${product.sku || 'SKU' + String(index + 1).padStart(3, '0')}</div>
                    </td>
                    <td>
                      <div class="product-description">${product.description || 'Produktbeschreibung'}</div>
                    </td>
                    <td class="text-center">${product.quantity || 1} Stück</td>
                    <td class="text-right">${(product.unitPrice || 0).toFixed(2)}€</td>
                    <td class="text-right"><strong>${(product.total || 0).toFixed(2)}€</strong></td>
                  </tr>
                `).join('')}
                
                ${(data.order?.products || []).length === 0 ? `
                  <tr>
                    <td class="text-center">1</td>
                    <td>
                      <div class="product-name">Lavendel Handseife</div>
                      <div class="product-sku">Art.-Nr.: SKU001</div>
                    </td>
                    <td>
                      <div class="product-description">Natürliche Handseife mit Lavendelduft, 100g</div>
                    </td>
                    <td class="text-center">2 Stück</td>
                    <td class="text-right">8,99€</td>
                    <td class="text-right"><strong>17,98€</strong></td>
                  </tr>
                  <tr>
                    <td class="text-center">2</td>
                    <td>
                      <div class="product-name">Rosenseife Premium</div>
                      <div class="product-sku">Art.-Nr.: SKU002</div>
                    </td>
                    <td>
                      <div class="product-description">Luxuriöse Seife mit Rosenöl, 150g</div>
                    </td>
                    <td class="text-center">1 Stück</td>
                    <td class="text-right">12,99€</td>
                    <td class="text-right"><strong>12,99€</strong></td>
                  </tr>
                ` : ''}
              </tbody>
            </table>
            
            <!-- ===== TOTALS SECTION ===== -->
            <div class="totals-section">
              <table class="totals-table">
                <tr>
                  <td class="total-label">Nettobetrag:</td>
                  <td class="total-amount">${(data.order?.netTotal || 26.03).toFixed(2)}€</td>
                </tr>
                <tr>
                  <td class="total-label">Versandkosten:</td>
                  <td class="total-amount">${(data.order?.shipping?.cost || 4.99).toFixed(2)}€</td>
                </tr>
                <tr class="grand-total">
                  <td class="total-label">Gesamtbetrag:</td>
                  <td class="total-amount">${(data.order?.grandTotal || 30.97).toFixed(2)}€</td>
                </tr>
              </table>
            </div>
            
            <!-- ===== FOOTER SECTION - Deutsche Rechtspflichtangaben ===== -->
            <div class="invoice-footer">
              <div class="footer-grid">
                <div class="footer-column">
                  <h4>📞 Kontakt</h4>
                  <p><strong>Tel:</strong> +49 6251 1234567</p>
                  <p><strong>E-Mail:</strong> ralle.jacob84@googlemail.com</p>
                </div>
                <div class="footer-column footer-center">
                  <h4>🏛️ Steuerliche Angaben</h4>
                  <p><strong>Steuernr.:</strong> 11548484</p>
                </div>
                <div class="footer-column footer-right">
                  <h4>⚖️ Rechtliches</h4>
                  <p><strong>Gerichtsstand:</strong> Zwingenberg</p>
                </div>
              </div>
            </div>
            
          </div>
        </div>
      </body>
      </html>
    `;
  }

  // CSS für Rechnungen generieren
  getInvoiceCSS() {
    return `
      @page {
        size: A4;
        margin: 1cm 1.5cm 1.5cm 1.5cm;
      }
      
      * {
        margin: 0;
        padding: 0;
        box-sizing: border-box;
      }
      
      body {
        font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
        font-size: 9pt;
        line-height: 1.3;
        color: #1a1a1a;
        background: #f8f9fa;
      }
      
      .invoice-wrapper {
        background: white;
        max-width: 210mm;
        margin: 10px auto;
        box-shadow: 0 4px 16px rgba(0,0,0,0.08);
        border-radius: 4px;
        overflow: hidden;
      }
      
      .invoice-container {
        width: 100%;
        background: white;
        position: relative;
        min-height: 297mm;
        padding: 1.5cm;
      }
      
      /* ===== HEADER SECTION ===== */
      .invoice-header {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        margin-bottom: 25px;
        padding-bottom: 15px;
        border-bottom: 2px solid #e8ecef;
      }
      
      .company-info {
        flex: 1;
      }
      
      .company-info h1 {
        font-size: 16pt;
        font-weight: 700;
        color: #1a1a1a;
        margin-bottom: 6px;
        letter-spacing: -0.2px;
      }
      
      .contact-details {
        color: #495057;
        line-height: 1.4;
        font-size: 9pt;
      }
      
      .company-logo {
        max-width: 120px;
        max-height: 70px;
        object-fit: contain;
        border-radius: 4px;
      }
      
      .invoice-details {
        width: 200px;
        text-align: right;
      }
      
      .invoice-details h2 {
        font-size: 14pt;
        color: #0066cc;
        margin-bottom: 10px;
      }
      
      .invoice-meta {
        width: 100%;
        border-collapse: collapse;
      }
      
      .invoice-meta td {
        padding: 3px 0;
        font-size: 9pt;
      }
      
      .invoice-meta td:first-child {
        color: #495057;
        text-align: left;
      }
      
      .invoice-meta td:last-child {
        font-weight: 600;
        text-align: right;
      }
      
      /* ===== CUSTOMER SECTION ===== */
      .customer-section {
        margin: 25px 0;
      }
      
      .customer-section h3 {
        font-size: 10pt;
        color: #495057;
        text-transform: uppercase;
        letter-spacing: 0.6px;
        margin-bottom: 6px;
        font-weight: 500;
      }
      
      .customer-address {
        background: #f1f3f4;
        padding: 15px;
        border-left: 3px solid #0066cc;
        border-radius: 3px;
        margin-bottom: 20px;
      }
      
      .customer-address strong {
        font-weight: 700;
        font-size: 11pt;
        margin-bottom: 6px;
        color: #1a1a1a;
        display: block;
      }
      
      /* ===== PRODUCTS TABLE ===== */
      .products-section {
        margin: 20px 0;
      }
      
      .products-section h3 {
        font-size: 12pt;
        font-weight: 600;
        margin-bottom: 15px;
        color: #1a1a1a;
        border-bottom: 2px solid #0066cc;
        padding-bottom: 5px;
      }
      
      .products-table {
        width: 100%;
        border-collapse: collapse;
        margin: 20px 0;
        background: white;
        border-radius: 4px;
        overflow: hidden;
        box-shadow: 0 1px 4px rgba(0,0,0,0.04);
        page-break-inside: auto;
      }
      
      .products-table thead {
        background: linear-gradient(135deg, #1a1a1a 0%, #343a40 100%);
        color: white;
        display: table-header-group;
      }
      
      .products-table th {
        padding: 12px 10px;
        text-align: left;
        font-weight: 600;
        font-size: 8.5pt;
        text-transform: uppercase;
        letter-spacing: 0.4px;
      }
      
      .products-table td {
        padding: 10px;
        border-bottom: 1px solid #f1f3f4;
        vertical-align: top;
        font-size: 9pt;
      }
      
      .products-table tbody tr:nth-child(even) {
        background: #fafbfc;
      }
      
      .products-table tbody tr:hover {
        background: #f1f3f4;
      }
      
      .products-table tbody tr {
        page-break-inside: avoid;
        break-inside: avoid;
      }
      
      /* ===== TOTALS SECTION ===== */
      .totals-section {
        width: 300px;
        margin-left: auto;
        margin-top: 20px;
        page-break-inside: avoid;
        break-inside: avoid;
      }
      
      .totals-table {
        width: 100%;
        border-collapse: collapse;
        background: white;
        border-radius: 4px;
        overflow: hidden;
        box-shadow: 0 1px 4px rgba(0,0,0,0.06);
      }
      
      .totals-table td {
        padding: 8px 12px;
        border-bottom: 1px solid #f1f3f4;
        font-size: 9pt;
      }
      
      .totals-table td:first-child {
        font-weight: 500;
        color: #343a40;
        text-align: left;
      }
      
      .totals-table td:last-child {
        text-align: right;
        font-weight: 600;
        color: #1a1a1a;
      }
      
      .total-label.small-business {
        color: #e74c3c;
        font-style: italic;
        font-size: 9pt;
      }
      
      .grand-total {
        background: linear-gradient(135deg, #28a745 0%, #20c997 100%);
        color: white;
        font-size: 11pt;
        font-weight: 700;
      }
      
      .grand-total td {
        padding: 15px 12px;
        border: none;
        text-shadow: 0 1px 2px rgba(0,0,0,0.3);
      }
      
      /* ===== LEGAL SECTION ===== */
      .legal-section {
        margin-top: 30px;
        padding: 15px;
        background: #f8f9fa;
        border-radius: 4px;
        border: 1px solid #dee2e6;
      }
      
      .tax-notice {
        font-size: 9pt;
        color: #495057;
        margin-bottom: 10px;
        padding: 8px;
        background: #fff3cd;
        border: 1px solid #ffeaa7;
        border-radius: 3px;
      }
      
      .payment-terms {
        font-size: 9pt;
        color: #495057;
        margin-bottom: 10px;
        line-height: 1.4;
      }
      
      .legal-notice {
        font-size: 8pt;
        color: #6c757d;
        font-style: italic;
        text-align: center;
      }
      
      /* ===== FOOTER SECTION - Deutsche Rechtspflichtangaben ===== */
      .invoice-page {
        min-height: 29.7cm;
        width: 21cm;
        margin: 0 auto;
        background: white;
        box-sizing: border-box;
        padding: 2cm; /* Normale Seitenränder ohne Extra-Platz für absolute Footer */
        display: flex;
        flex-direction: column;
      }
      
      .footer-section {
        margin-top: 30px;
        padding: 20px 15px 15px 15px;
        background: #f8f9fa;
        border-radius: 6px;
        border: 1px solid #dee2e6;
        border-top: 3px solid #007bff;
        page-break-inside: avoid; /* Footer zusammenhalten */
        break-inside: avoid;
      }
      
      /* Pflichtangaben Grid - 3 Spalten für deutsche Rechtspflichtangaben */
      .footer-pflichtangaben {
        display: grid;
        grid-template-columns: 1fr 1fr 1fr;
        gap: 20px;
        margin-bottom: 15px;
      }
      
      .footer-column {
        padding: 0 10px;
      }
      
      .footer-column h4 {
        font-size: 9pt;
        color: #007bff;
        margin: 0 0 8px 0;
        font-weight: bold;
        display: flex;
        align-items: center;
        gap: 6px;
      }
      
      .footer-column .footer-info {
        font-size: 8pt;
        line-height: 1.3;
        color: #495057;
      }
      
      .footer-column .footer-info p {
        margin: 0 0 3px 0;
      }
      
      .footer-column .footer-info strong {
        color: #212529;
      }
      
      /* Zentrale Säule */
      .footer-center {
        text-align: center;
        border-left: 1px solid #dee2e6;
        border-right: 1px solid #dee2e6;
      }
      
      /* Rechte Säule */
      .footer-right {
        text-align: right;
      }
      
      /* Bankverbindung - Deutsche Pflichtangaben für Zahlungen */
      .footer-bank {
        display: flex;
        justify-content: center;
        align-items: center;
        gap: 25px;
        padding: 12px;
        background: white;
        border-radius: 4px;
        margin-bottom: 12px;
        font-size: 8pt;
        color: #495057;
        border: 1px solid #e9ecef;
        flex-wrap: wrap;
      }
      
      .footer-bank-item {
        display: flex;
        flex-direction: column;
        align-items: center;
        min-width: 110px;
      }
      
      .footer-bank-item strong {
        color: #007bff;
        font-size: 7pt;
        text-transform: uppercase;
        margin-bottom: 2px;
        font-weight: bold;
      }
      
      .footer-bank-item span {
        font-size: 8pt;
        color: #495057;
        font-weight: 500;
      }
      
      /* Rechtliche Hinweise nach § 14 UStG */
      .footer-legal {
        text-align: center;
        font-size: 7pt;
        color: #6c757d;
        font-style: italic;
        margin-top: 10px;
        padding-top: 10px;
        border-top: 1px solid #e9ecef;
        line-height: 1.2;
      }
      
      .footer-legal strong {
        color: #495057;
        font-weight: 600;
      }
      
      @media screen {
        font-size: 7pt;
      }
      
      /* Container für korrekte DIN A4 Höhe */
      .invoice-container {
        width: 100%;
        background: white;
        position: relative;
      }
      
      /* ===== PAGE BREAK SYSTEM ===== */
      .page-break {
        page-break-before: always;
        break-before: page;
      }
      
      .avoid-page-break {
        page-break-inside: avoid;
        break-inside: avoid;
      }
      
      .table-header-repeat {
        display: table-header-group;
      }
      
      /* ===== FOOTER STYLES ===== */
      .invoice-footer {
        margin-top: 40px;
        padding: 20px;
        background: #f8f9fa;
        border-radius: 8px;
        border: 1px solid #dee2e6;
        border-top: 4px solid #3498db;
        page-break-inside: avoid;
        font-size: 8pt;
      }
      
      .footer-grid {
        display: grid;
        gap: 20px;
      }
      
      /* Dynamische Spalten je nach angezeigten Bereichen */
      .footer-grid:has(.footer-column:nth-child(1):nth-last-child(1)) {
        grid-template-columns: 1fr; /* 1 Spalte */
      }
      
      .footer-grid:has(.footer-column:nth-child(2):nth-last-child(1)) {
        grid-template-columns: 1fr 1fr; /* 2 Spalten */
      }
      
      .footer-grid:has(.footer-column:nth-child(3):nth-last-child(1)) {
        grid-template-columns: 1fr 1fr 1fr; /* 3 Spalten */
      }
      
      /* Fallback für ältere Browser */
      .footer-grid {
        grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      }
      
      .footer-column {
        padding: 0 10px;
      }
      
      .footer-column h4 {
        font-size: 9pt;
        color: #3498db;
        margin-bottom: 8px;
        font-weight: 700;
      }
      
      .footer-column p {
        margin: 0 0 4px 0;
        line-height: 1.3;
        color: #34495e;
      }
      
      .footer-center {
        text-align: center;
        border-left: 1px solid #dee2e6;
        border-right: 1px solid #dee2e6;
      }
      
      .footer-right {
        text-align: right;
      }
      
      /* ===== PRINT OPTIMIZATIONS ===== */
      @media print {
        body {
          background: white;
          font-size: 9pt;
          margin: 0;
          padding: 0;
        }
        
        .invoice-wrapper {
          box-shadow: none;
          border-radius: 0;
          margin: 0;
          max-width: none;
          page-break-after: auto;
        }
        
        .invoice-container {
          padding: 0;
          min-height: auto;
          page-break-after: auto;
        }
        
        /* Footer für Print optimiert */
        .footer-section {
          margin-top: auto;
          page-break-inside: avoid;
          break-inside: avoid;
          padding: 15px 0;
        }
        
        .footer-pflichtangaben {
          grid-template-columns: 1fr 1fr 1fr;
          gap: 15px;
        }
        
        .footer-column {
          font-size: 7pt;
          padding: 0 8px;
        }
        
        .footer-column .footer-info {
          font-size: 6.5pt;
        }
        
        .footer-bank {
          gap: 15px;
          font-size: 6.5pt;
          margin: 10px 0;
        }
        
        .footer-legal {
          font-size: 6pt;
        }
        
        .products-table {
          page-break-inside: auto;
        }
        
        .products-table thead {
          display: table-header-group;
        }
        
        .products-table tbody tr {
          page-break-inside: avoid;
        }
        
        .totals-section {
          page-break-inside: avoid;
          margin-top: 20px;
        }
        
        .page-break {
          page-break-before: always;
        }
      }
      
      /* ===== RESPONSIVE DESIGN - Mobile Optimierung ===== */
      @media (max-width: 768px) {
        .invoice-wrapper {
          margin: 10px;
          border-radius: 0;
        }
        
        .invoice-container {
          padding: 20px;
          min-height: auto;
        }
        
        .invoice-header {
          flex-direction: column;
          gap: 20px;
          text-align: center;
        }
        
        /* Footer mobile Optimierung */
        .footer-section {
          margin-top: 20px;
          padding: 15px 5px;
        }
        
        .footer-pflichtangaben {
          grid-template-columns: 1fr;
          gap: 15px;
        }
        
        .footer-column {
          padding: 10px 0;
          text-align: left !important;
          border-bottom: 1px solid #eee;
        }
        
        .footer-center {
          border-left: none;
          border-right: none;
          border-top: 1px solid #dee2e6;
          border-bottom: 1px solid #dee2e6;
          padding: 15px 0;
        }
        
        .footer-bank {
          flex-direction: column;
          gap: 10px;
          text-align: center;
        }
        
        .footer-bank-item {
          min-width: auto;
        }
        
        .products-table {
          font-size: 8pt;
        }
        
        .products-table th,
        .products-table td {
          padding: 8px 6px;
        }
      }
    `;
  }

  // HTML für Rechnung mit Seitenumbruch-System generieren
  generateInvoiceHTML(template, data) {
    const companyInfo = template.companyInfo || {};
    const products = data.order?.products || [];
    
    // Produkte für Seitenumbruch aufteilen (ca. 15-20 Artikel pro Seite)
    const itemsPerPage = 15;
    const productPages = [];
    for (let i = 0; i < products.length; i += itemsPerPage) {
      productPages.push(products.slice(i, i + itemsPerPage));
    }
    
    // Basis-HTML-Struktur
    let html = `
      <!DOCTYPE html>
      <html lang="de">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Rechnung ${data.invoice?.number || ''}</title>
        <style>
          ${this.getInvoiceCSS()}
        </style>
      </head>
      <body>
        <div class="invoice-wrapper">
          <div class="invoice-page">
    `;
    
    // Erste Seite mit Header
    html += `
      <div class="invoice-wrapper">
        <div class="invoice-container">
          <div class="invoice-content">
          
          <!-- ===== HEADER SECTION ===== -->
          <div class="invoice-header">
            <div class="company-info">
              ${companyInfo.logo?.enabled ? `<img src="${companyInfo.logo.url}" alt="${data.company?.name || 'Logo'}" class="company-logo" />` : ''}
              <h1>${data.company?.name || 'Glückmomente Manufaktur'}</h1>
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
    }
    
    // Wenn nur eine Seite: Summen und Footer hinzufügen
    if (productPages.length <= 1) {
      html += this.generateTotalsHTML(data);
      html += this.generateLegalNoticesHTML(data);
      html += this.generateFooterHTML(data); // Footer als normale Sektion hinzufügen
      
      // Content-Bereich schließen
      html += `
            </div>
          </div>
        </div>
      </body>
      </html>
      `;
      return html;
    }
    
    // Weitere Seiten für übrige Produkte
    for (let i = 1; i < productPages.length; i++) {
      html += `
        <div class="page-break"></div>
        <div class="invoice-wrapper">
          <div class="invoice-container">
            
            <!-- Header für Folgeseiten -->
            <div class="invoice-header-minimal">
              <h2>Rechnung ${data.invoice?.number || ''} - Seite ${i + 1}</h2>
            </div>
            
            ${this.generateProductTableHTML(productPages[i], false)}
            
            ${i === productPages.length - 1 ? this.generateTotalsHTML(data) + this.generateLegalNoticesHTML(data) + this.generateFooterHTML(data) : ''}
            
          </div>
        </div>
      `;
    }
    
    // Schließe die Container
    html += `
          </div>
        </div>
      </body>
      </html>
    `;
    
    return html;
  }

  // HTML für Produkttabelle generieren
  generateProductTableHTML(products, isFirstPage = true) {
    if (!products || products.length === 0) {
      return `
        <div class="products-section">
          <h3>Artikel</h3>
          <p style="text-align: center; color: #6c757d; padding: 40px;">Keine Artikel gefunden</p>
        </div>
      `;
    }

    let tableHTML = `
      <div class="products-section">
        <h3>Artikel</h3>
        <table class="products-table">
          <thead>
            <tr>
              <th style="width: 8%;">Pos.</th>
              <th style="width: 35%;">Artikelbezeichnung</th>
              <th style="width: 25%;">Beschreibung</th>
              <th style="width: 8%;">Menge</th>
              <th style="width: 12%;">Einzelpreis</th>
              <th style="width: 12%;">Gesamtpreis</th>
            </tr>
          </thead>
          <tbody>
    `;

    products.forEach((product, index) => {
      const position = isFirstPage ? index + 1 : index + 1;
      const name = product.name || product.artikelbezeichnung || 'Unbenannter Artikel';
      const description = product.description || product.beschreibung || '';
      const quantity = product.quantity || product.menge || 1;
      const unitPrice = product.price || product.einzelpreis || 0;
      const totalPrice = quantity * unitPrice;

      tableHTML += `
        <tr>
          <td style="text-align: center; font-weight: 600;">${position}</td>
          <td style="font-weight: 600; color: #1a1a1a;">${name}</td>
          <td style="color: #495057; font-size: 8.5pt;">${description}</td>
          <td style="text-align: center;">${quantity}x</td>
          <td style="text-align: right;">${unitPrice.toFixed(2)} €</td>
          <td style="text-align: right; font-weight: 600;">${totalPrice.toFixed(2)} €</td>
        </tr>
      `;
    });

    tableHTML += `
          </tbody>
        </table>
      </div>
    `;

    return tableHTML;
  }

  // HTML für Summen-Sektion generieren
  generateTotalsHTML(data) {
    const order = data.order || {};
    const subtotal = order.subtotal || order.zwischensumme || 0;
    const tax = order.tax || order.steuer || 0;
    const total = order.total || order.gesamtsumme || subtotal + tax;

    // Steuerrate berechnen
    const taxRate = subtotal > 0 ? (tax / subtotal * 100) : 19;

    return `
      <div class="totals-section">
        <table class="totals-table">
          <tr>
            <td>Zwischensumme (netto):</td>
            <td>${subtotal.toFixed(2)} €</td>
          </tr>
          <tr>
            <td>MwSt. (${taxRate.toFixed(0)}%):</td>
            <td>${tax.toFixed(2)} €</td>
          </tr>
          <tr class="grand-total">
            <td><strong>Gesamtsumme (brutto):</strong></td>
            <td><strong>${total.toFixed(2)} €</strong></td>
          </tr>
        </table>
      </div>
    `;
  }

  // HTML für rechtliche Hinweise generieren
  generateLegalNoticesHTML(data) {
    const company = data.company || {};
    const taxInfo = company.taxInfo || {};

    return `
      <div class="legal-section">
        ${taxInfo.vatId ? `
          <div class="tax-notice">
            <strong>Steuerpflichtige Lieferung:</strong> 
            Diese Rechnung enthält ausgewiesene Umsatzsteuer. USt-IdNr.: ${taxInfo.vatId}
          </div>
        ` : `
          <div class="tax-notice">
            <strong>Kleinunternehmer-Regelung:</strong> 
            Gemäß § 19 UStG wird keine Umsatzsteuer ausgewiesen.
          </div>
        `}
        
        <div class="payment-terms">
          <strong>Zahlungsbedingungen:</strong><br>
          Der Rechnungsbetrag ist innerhalb von 14 Tagen nach Rechnungsdatum ohne Abzug zu begleichen.
          Bei Zahlungsverzug werden Verzugszinsen in Höhe von 9 Prozentpunkten über dem Basiszinssatz berechnet.
        </div>

        <div class="legal-notice">
          Vielen Dank für Ihren Einkauf bei ${company.name || 'Glücksmomente Manufaktur'}!<br>
          Diese Rechnung wurde automatisch generiert und ist ohne Unterschrift gültig.
        </div>
      </div>
    `;
  }

  // HTML für Footer generieren - Deutsche Rechtspflichtangaben nach § 14 UStG
  generateFooterHTML(data) {
    const company = data.company || {};
    const customer = data.customer || {};
    
    console.log('🔍 DEBUG: generateFooterHTML called with data:', JSON.stringify(data, null, 2));
    
    return `
      <div class="footer-section" style="border: 2px solid red; background: yellow; padding: 20px; margin-top: 30px;">
        <h2 style="color: red; font-size: 24pt;">DEBUG: FOOTER FUNKTIONIERT!</h2>
        
        <!-- Pflichtangaben in drei Spalten nach deutschem Recht -->
        <div class="footer-pflichtangaben">
          
          <!-- Kontakt & Service -->
          <div class="footer-column">
            <h4>📞 Kontakt & Service</h4>
            <div class="footer-info">
              <p><strong>Tel:</strong> ${company?.contact?.phone || '+49 6251 1234567'}</p>
              <p><strong>E-Mail:</strong> ${company?.contact?.email || 'ralle.jacob84@googlemail.com'}</p>
              <p><strong>Web:</strong> ${company?.contact?.website || 'www.glücksmomente-manufaktur.vercel.app'}</p>
              <p><strong>Geschäftszeiten:</strong><br>Mo-Fr: 9:00-17:00 Uhr</p>
            </div>
          </div>
          
          <!-- Steuerliche Pflichtangaben (nach § 14 UStG) -->
          <div class="footer-column footer-center">
            <h4>🏛️ Steuerliche Angaben</h4>
            <div class="footer-info">
              <p><strong>Steuernummer:</strong> ${company?.taxInfo?.taxNumber || '11548484'}</p>
              <p><strong>USt-IdNr.:</strong> ${company?.taxInfo?.vatId || 'DE123456789'}</p>
              <p><strong>Inhaber:</strong> ${company?.owner?.name || 'Ralf Jacob'}</p>
              <p><strong>Finanzamt:</strong> ${company?.taxInfo?.taxOffice || 'Bensheim'}</p>
            </div>
          </div>
          
          <!-- Rechtliche Pflichtangaben -->
          <div class="footer-column footer-right">
            <h4>⚖️ Rechtliche Angaben</h4>
            <div class="footer-info">
              <p><strong>Amtsgericht:</strong> ${company?.legal?.registrationCourt || 'Darmstadt'}</p>
              <p><strong>Rechtsform:</strong> ${company?.legal?.legalForm || 'Einzelunternehmen'}</p>
              <p><strong>Gerichtsstand:</strong> ${company?.address?.city || 'Zwingenberg'}</p>
              <p><strong>Verantwortlich:</strong> ${company?.owner?.name || 'Ralf Jacob'}</p>
            </div>
          </div>
          
        </div>
        
        <!-- Bankverbindung für Zahlungen (Pflichtangabe bei Rechnungen) -->
        <div class="footer-bank">
          <div class="footer-bank-item">
            <strong>🏦 Bank</strong>
            <span>${company?.bankDetails?.bankName || 'Sparkasse Bensheim'}</span>
          </div>
          <div class="footer-bank-item">
            <strong>💳 IBAN</strong>
            <span>${company?.bankDetails?.iban || 'DE85 5085 2651 0346 0592 50'}</span>
          </div>
          <div class="footer-bank-item">
            <strong>🔗 BIC</strong>
            <span>${company?.bankDetails?.bic || 'HELADEF1DAD'}</span>
          </div>
          <div class="footer-bank-item">
            <strong>⏰ Zahlungsziel</strong>
            <span>${data.paymentTerms?.days || '14'} Tage netto</span>
          </div>
        </div>
        
        <!-- Rechtliche Hinweise (§ 19 UStG Kleinunternehmer) -->
        <div class="footer-legal">
          ${company?.taxInfo?.vatId ? `
            <strong>Steuerpflichtige Lieferung:</strong> Diese Rechnung enthält ausgewiesene Umsatzsteuer (§ 14 UStG).
          ` : `
            <strong>Kleinunternehmer-Regelung:</strong> Gemäß § 19 UStG wird keine Umsatzsteuer ausgewiesen.
          `}
          Diese Rechnung entspricht den gesetzlichen Anforderungen nach § 14 UStG. 
          Es gilt deutsches Recht. Erfüllungsort und Gerichtsstand ist ${company?.address?.city || 'Zwingenberg'}.
        </div>
        
      </div>
    `;
  }

  // Rechnung aus echter Bestellung generieren
  async generateInvoiceFromOrder(req, res) {
    try {
      logger.info('📄 Generating invoice from order');
      const { orderId } = req.params;
      const { format = 'pdf' } = req.query;

      // Bestellung aus Datenbank laden
      const Order = require('../models/Order');
      const order = await Order.findById(orderId).populate('products customer');
      
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
          name: `${order.customer?.firstName || ''} ${order.customer?.lastName || ''}`.trim(),
          email: order.customer?.email || '',
          address: order.customer?.address || {},
          customerNumber: order.customer?._id?.toString()?.slice(-8)?.toUpperCase() || 'KD-001'
        },
        order: {
          number: order._id?.toString()?.slice(-8)?.toUpperCase() || 'ORD-001',
          date: order.createdAt ? new Date(order.createdAt).toLocaleDateString('de-DE') : new Date().toLocaleDateString('de-DE'),
          products: order.products?.map(item => ({
            name: item.product?.name || item.name || 'Artikel',
            description: item.product?.description || item.description || '',
            quantity: item.quantity || 1,
            unitPrice: item.price || item.product?.price || 0,
            total: (item.quantity || 1) * (item.price || item.product?.price || 0),
            sku: item.product?.sku || `SKU${Math.random().toString(36).substr(2, 6).toUpperCase()}`
          })) || [],
          netTotal: order.total || 0,
          shipping: {
            cost: order.shipping?.cost || 0
          },
          grandTotal: (order.total || 0) + (order.shipping?.cost || 0),
          paymentMethod: order.payment?.method || 'PayPal',
          paymentStatus: order.payment?.status || 'pending'
        },
        invoice: {
          number: `RE-${new Date().getFullYear()}-${order._id?.toString()?.slice(-6)?.toUpperCase() || '001'}`,
          date: new Date().toLocaleDateString('de-DE'),
          dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toLocaleDateString('de-DE'),
          performanceDate: order.createdAt ? new Date(order.createdAt).toLocaleDateString('de-DE') : new Date().toLocaleDateString('de-DE'),
          paymentTerms: order.payment?.method === 'cash' ? 'Barzahlung bei Abholung' : 'Zahlung über PayPal',
          legalNotice: 'Gerichtsstand ist Musterstadt. Es gilt deutsches Recht.'
        },
        legal: {
          isSmallBusiness: true,
          vatExemptionNote: 'Gemäß §19 UStG wird keine Umsatzsteuer ausgewiesen.'
        }
      };

      logger.info('📋 Generating invoice HTML from order data');
      const html = this.generateInvoiceHTML(template, invoiceData);
      
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
        res.set({ 'Content-Type': 'text/html; charset=utf-8' });
        res.send(html);
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
        res.set({ 'Content-Type': 'text/html; charset=utf-8' });
        res.send(order.invoice.html);
      }
    } catch (error) {
      logger.error('❌ Fehler beim Abrufen der Rechnung:', error);
      res.status(500).json({
        success: false,
        message: 'Fehler beim Abrufen der Rechnung'
      });
    }
  }

  // PDF für gespeicherte Rechnung generieren
  async generateInvoicePDF(req, res) {
    try {
      const { invoiceId } = req.params;

      const Invoice = require('../models/Invoice');
      const invoice = await Invoice.findById(invoiceId);
      // KEIN POPULATE nötig - Customer-Daten sind direkt in invoice.customer.customerData gespeichert

      if (!invoice) {
        return res.status(404).json({
          success: false,
          message: 'Rechnung nicht gefunden'
        });
      }

      console.log('🔍 Invoice gefunden:', {
        invoiceNumber: invoice.invoiceNumber,
        customerId: invoice.customer?.customerId,
        hasCustomerData: !!invoice.customer?.customerData,
        customerName: `${invoice.customer?.customerData?.firstName || ''} ${invoice.customer?.customerData?.lastName || ''}`.trim(),
        customerEmail: invoice.customer?.customerData?.email
      });

      const template = await this.loadTemplateFromDatabase(invoice.template);
      if (!template) {
        // Verwende immer das aktuelle Default-Template
        const defaultTemplate = await InvoiceTemplate.findOne({ isDefault: true });
        if (!defaultTemplate) {
          return res.status(404).json({
            success: false,
            message: 'Kein Rechnungstemplate verfügbar'
          });
        }
        template = defaultTemplate;
      }

      console.log('🎨 InvoiceController Template:', template.name);
      console.log('💰 InvoiceController USt:', template.companyInfo?.isSmallBusiness ? 'Kleinunternehmer' : 'USt-pflichtig');

      console.log('🧾 Bestellung-Daten für PDF:');
      console.log('  - Kundennummer:', `K-${invoice._id.toString().slice(-6).toUpperCase()}`);
      console.log('  - Artikel-Count:', invoice.items?.length || 0);
      console.log('  - Artikel-Namen:', invoice.items?.map(i => i.productData?.name || i.name).join(', ') || 'keine');
      console.log('  - Kunde:', invoice.customer?.customerData?.firstName, invoice.customer?.customerData?.lastName);
      console.log('  - Rechnungsadresse:', invoice.customer?.customerData?.street, invoice.customer?.customerData?.city);
      console.log('  - Customer populated:', !!invoice.customer);
      console.log('  - Customer Adresse:', invoice.customer?.customerData?.street);
      console.log('  - Customer PLZ:', invoice.customer?.customerData?.postalCode);
      console.log('🔍 DEBUG: Full customer object:', JSON.stringify(invoice.customer, null, 2));

      // Daten für PDFService vorbereiten - KORRIGIERT: Verwende customer.customerData statt direktes customerData
      const bestellungData = {
        bestellnummer: invoice.invoiceNumber,
        bestelldatum: invoice.dates?.invoiceDate?.toISOString() || new Date().toISOString(),
        faelligkeitsdatum: invoice.dates?.dueDate?.toISOString() || null,
        kundennummer: `K-${invoice._id.toString().slice(-6).toUpperCase()}`,
        besteller: {
          vorname: invoice.customer?.customerData?.firstName || '',
          nachname: invoice.customer?.customerData?.lastName || '',
          firma: invoice.customer?.customerData?.company || '',
          email: invoice.customer?.customerData?.email || '',
          adresse: {
            strasse: invoice.customer?.customerData?.street || '',
            plz: invoice.customer?.customerData?.postalCode || '',
            stadt: invoice.customer?.customerData?.city || ''
          }
        },
        rechnungsadresse: {
          vorname: invoice.customer?.customerData?.firstName || '',
          nachname: invoice.customer?.customerData?.lastName || '',
          firma: invoice.customer?.customerData?.company || '',
          strasse: (invoice.customer?.customerData?.street || '').split(' ')[0] || '',
          hausnummer: (invoice.customer?.customerData?.street || '').split(' ').slice(1).join(' ') || '',
          plz: invoice.customer?.customerData?.postalCode || '',
          stadt: invoice.customer?.customerData?.city || '',
          land: invoice.customer?.customerData?.country || 'Deutschland'
        },
        artikel: invoice.items.map(item => ({
          name: item.productData?.name || 'Produktname nicht verfügbar',
          beschreibung: item.productData?.description || 'Keine Beschreibung verfügbar',
          sku: item.productData?.sku || '',
          menge: item.quantity || 1,
          preis: item.unitPrice || 0,
          einzelpreis: item.unitPrice || 0,
          gesamtpreis: item.total || ((item.quantity || 1) * (item.unitPrice || 0))
        })),
        gesamtsumme: invoice.amounts?.total || 0,
        zahlungsmethode: invoice.payment?.method || 'Überweisung',
        nettosumme: invoice.amounts?.subtotal || 0,
        mwst: invoice.amounts?.vatAmount || 0
      };

      console.log('🧾 Generiere PDF für gespeicherte Rechnung:', invoice.invoiceNumber);
      
      // PDF mit PDFService und Template generieren
      const PDFService = require('../services/PDFService');
      const pdf = await PDFService.generateInvoicePDF(bestellungData, template);

      res.set({
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="Rechnung-${invoice.invoiceNumber}.pdf"`
      });
      res.send(pdf);

    } catch (error) {
      console.error('Fehler bei PDF-Generierung für Rechnung:', error);
      res.status(500).json({
        success: false,
        message: 'Fehler bei der PDF-Generierung',
        error: error.message
      });
    }
  }

  // HTML-Content aus gespeicherten Invoice-Daten generieren
  async generateInvoiceFromStoredData(invoice, template) {
    try {
      // Konvertiere Invoice-Format zu Order-ähnlichem Format für HTML-Generator
      const orderLikeData = {
        _id: invoice._id,
        bestellnummer: invoice.invoiceNumber,
        kunde: invoice.customerId || {
          vorname: invoice.customerData.firstName,
          nachname: invoice.customerData.lastName,
          firma: invoice.customerData.company,
          email: invoice.customerData.email,
          telefon: invoice.customerData.phone,
          adresse: {
            strasse: invoice.customerData.street,
            plz: invoice.customerData.postalCode,
            ort: invoice.customerData.city
          }
        },
        items: invoice.items.map(item => ({
          productId: {
            name: item.name,
            beschreibung: item.description || '',
            sku: item.sku || '',
            kategorie: item.category || ''
          },
          menge: item.quantity,
          einzelpreis: item.unitPrice,
          gesamtpreis: item.quantity * item.unitPrice
        })),
        versandkosten: invoice.shippingCost || 0,
        gesamtpreis: invoice.totalAmount,
        bestelldatum: invoice.invoiceDate,
        notizen: invoice.notes || {},
        status: invoice.status
      };

      return await this.generateInvoiceHTML(orderLikeData, template);

    } catch (error) {
      console.error('Fehler beim Generieren des HTML aus Invoice-Daten:', error);
      throw error;
    }
  }
}

module.exports = new InvoiceController();