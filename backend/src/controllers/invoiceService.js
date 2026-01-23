const Invoice = require('../models/Invoice');
const Kunde = require('../models/Kunde');
const Product = require('../models/Product');
const InvoiceTemplate = require('../models/InvoiceTemplate');
const emailService = require('../services/emailService');
const PDFService = require('../services/PDFService');
const fs = require('fs').promises;
const path = require('path');

class InvoiceService {

  // Alle Rechnungen abrufen
  async getAllInvoices(req, res) {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 20;
      const skip = (page - 1) * limit;
      
      const filter = {};
      
      // Filter nach Status
      if (req.query.status && req.query.status !== 'all') {
        if (req.query.status === 'overdue') {
          // Spezialfilter für überfällige Rechnungen
          filter.status = 'sent';
          filter['dates.dueDate'] = { $lt: new Date() };
        } else {
          filter.status = req.query.status;
        }
      }
      
      // Filter nach Kunde (durchsuche customerData direkt)
      if (req.query.customer) {
        const customerSearch = req.query.customer;
        filter.$or = [
          { 'customer.customerData.firstName': new RegExp(customerSearch, 'i') },
          { 'customer.customerData.lastName': new RegExp(customerSearch, 'i') },
          { 'customer.customerData.company': new RegExp(customerSearch, 'i') },
          { 'customer.customerData.email': new RegExp(customerSearch, 'i') }
        ];
      }
      
      // Filter nach Rechnungsnummer
      if (req.query.invoiceNumber) {
        filter.invoiceNumber = new RegExp(req.query.invoiceNumber, 'i');
      }
      
      // Filter nach Zeitraum
      if (req.query.from || req.query.to) {
        filter['dates.invoiceDate'] = {};
        if (req.query.from) {
          filter['dates.invoiceDate'].$gte = new Date(req.query.from);
        }
        if (req.query.to) {
          filter['dates.invoiceDate'].$lte = new Date(req.query.to);
        }
      }

      console.log('📋 Invoice filter:', JSON.stringify(filter, null, 2));

      const invoices = await Invoice.find(filter)
        .populate('template', 'name')
        .select('invoiceNumber dates.invoiceDate dates.dueDate status amounts.total payment customer.customerData template sequenceNumber')
        .sort({ 'dates.invoiceDate': -1 })
        .limit(limit)
        .skip(skip);

      // Customer-Daten für die Response aufbereiten und überfällige Tage berechnen
      const invoicesWithCustomer = invoices.map(invoice => {
        const isOverdue = invoice.status === 'sent' && invoice.dates.dueDate < new Date();
        const overdueDays = isOverdue ? 
          Math.ceil((Date.now() - invoice.dates.dueDate.getTime()) / (1000 * 60 * 60 * 24)) : 0;

        return {
          ...invoice.toObject(),
          customerName: invoice.customer?.customerData ? 
            `${invoice.customer.customerData.firstName || ''} ${invoice.customer.customerData.lastName || ''}`.trim() || 
            invoice.customer.customerData.company || 'Unbekannt'
            : 'Unbekannt',
          customerEmail: invoice.customer?.customerData?.email || '',
          isOverdue,
          overdueDays
        };
      });

      const total = await Invoice.countDocuments(filter);

      console.log(`✅ ${invoices.length} Rechnungen gefunden (Filter: ${req.query.status || 'all'})`);

      res.json({
        success: true,
        data: {
          invoices: invoicesWithCustomer,
          totalCount: total,
          pagination: {
            current: page,
            pages: Math.ceil(total / limit),
            total,
            limit
          }
        }
      });
    } catch (error) {
      console.error('Fehler beim Abrufen der Rechnungen:', error);
      res.status(500).json({
        success: false,
        message: 'Fehler beim Abrufen der Rechnungen',
        error: error.message
      });
    }
  }

  // Rechnungsstatistiken abrufen
  async getInvoiceStats(req, res) {
    try {
      const totalInvoices = await Invoice.countDocuments();
      
      const aggregateResults = await Invoice.aggregate([
        {
          $group: {
            _id: null,
            totalAmount: { $sum: '$amounts.total' },
            pendingAmount: { 
              $sum: {
                $cond: [
                  {
                    $and: [
                      { $ne: ['$payment.status', 'paid'] },
                      { $eq: ['$payment.paidDate', null] }
                    ]
                  },
                  '$amounts.total',
                  0
                ]
              }
            },
            paidAmount: { 
              $sum: {
                $cond: [
                  {
                    $or: [
                      { $eq: ['$payment.status', 'paid'] },
                      { $ne: ['$payment.paidDate', null] }
                    ]
                  },
                  '$amounts.total',
                  0
                ]
              }
            }
          }
        }
      ]);

      const stats = aggregateResults[0] || {
        totalAmount: 0,
        pendingAmount: 0,
        paidAmount: 0
      };

      res.json({
        success: true,
        data: {
          totalInvoices,
          totalAmount: stats.totalAmount,
          pendingAmount: stats.pendingAmount,
          paidAmount: stats.paidAmount
        }
      });
    } catch (error) {
      console.error('Fehler beim Abrufen der Rechnungsstatistiken:', error);
      res.status(500).json({
        success: false,
        message: 'Fehler beim Abrufen der Rechnungsstatistiken',
        error: error.message
      });
    }
  }

  // Einzelne Rechnung abrufen
  async getInvoiceById(req, res) {
    try {
      const { id } = req.params;
      
      const invoice = await Invoice.findById(id)
        .populate('customer.customerId', 'vorname nachname firma email telefon')
        .populate('template', 'name');
      
      if (!invoice) {
        return res.status(404).json({
          success: false,
          message: 'Rechnung nicht gefunden'
        });
      }
      
      res.json({
        success: true,
        data: invoice
      });
    } catch (error) {
      console.error('Fehler beim Abrufen der Rechnung:', error);
      res.status(500).json({
        success: false,
        message: 'Fehler beim Abrufen der Rechnung',
        error: error.message
      });
    }
  }

  // Neue Rechnung erstellen
  async createInvoice(req, res) {
    try {
      const {
        customerId,
        customerData,
        items,
        shippingCost = 0,
        paymentMethod,
        deliveryDate,
        notes,
        templateId,
        sendEmailToCustomer = false
      } = req.body;

      // Validierung
      if (!items || !Array.isArray(items) || items.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Mindestens ein Artikel ist erforderlich'
        });
      }

      // Nächste Rechnungsnummer generieren
      const { invoiceNumber, sequenceNumber } = await Invoice.getNextInvoiceNumber();

      // Kunden-Informationen verarbeiten
      let customer = { customerData: {} };
      
      if (customerId) {
        // Bestehender Kunde
        const existingCustomer = await Kunde.findById(customerId);
        if (!existingCustomer) {
          return res.status(404).json({
            success: false,
            message: 'Kunde nicht gefunden'
          });
        }
        customer.customerId = customerId;
        customer.customerData = {
          salutation: existingCustomer.anrede,
          firstName: existingCustomer.vorname,
          lastName: existingCustomer.nachname,
          company: existingCustomer.firma,
          street: existingCustomer.adresse.strasse,
          postalCode: existingCustomer.adresse.plz,
          city: existingCustomer.adresse.stadt,
          country: existingCustomer.adresse.land || 'Deutschland',
          email: existingCustomer.email,
          phone: existingCustomer.telefon
        };
      } else if (customerData) {
        // Neue Kundendaten
        customer.customerData = {
          salutation: customerData.salutation || 'Herr',
          firstName: customerData.firstName || '',
          lastName: customerData.lastName || '',
          company: customerData.company || '',
          street: customerData.street,
          postalCode: customerData.postalCode,
          city: customerData.city,
          country: customerData.country || 'Deutschland',
          email: customerData.email || '',
          phone: customerData.phone || ''
        };
      } else {
        return res.status(400).json({
          success: false,
          message: 'Kunden-Informationen sind erforderlich'
        });
      }

      // Artikel verarbeiten
      const processedItems = [];
      for (const item of items) {
        let productData = {
          name: item.name || 'Unbekanntes Produkt',
          description: item.description || '',
          sku: item.sku || '',
          category: item.category || ''
        };

        // Falls Produkt-ID vorhanden, Daten aus DB laden
        if (item.productId) {
          const product = await Product.findById(item.productId);
          if (product) {
            productData = {
              name: product.name,
              description: product.beschreibung,
              sku: product.sku || product._id.toString(),
              category: product.kategorie
            };
          }
        }

        processedItems.push({
          productId: item.productId || null,
          productData,
          quantity: item.quantity,
          unitPrice: parseFloat(item.unitPrice),
          total: item.quantity * parseFloat(item.unitPrice)
        });
      }

      // Template laden für Steuer-Einstellungen
      let template = null;
      let isSmallBusiness = false;
      
      if (templateId) {
        template = await InvoiceTemplate.findById(templateId);
        if (template) {
          isSmallBusiness = template.companyInfo?.isSmallBusiness || false;
        }
      }

      // Beträge berechnen
      const subtotal = processedItems.reduce((sum, item) => sum + item.total, 0);
      const shippingCostNum = parseFloat(shippingCost) || 0;
      const vatAmount = isSmallBusiness ? 0 : (subtotal + shippingCostNum) * 0.19;
      const total = subtotal + shippingCostNum + vatAmount;
      
      // Fälligkeitsdatum berechnen (30 Tage nach Rechnungsdatum)
      const invoiceDate = new Date();
      const dueDate = new Date(invoiceDate);
      dueDate.setDate(dueDate.getDate() + 30);

      // Neue Rechnung erstellen
      const invoice = new Invoice({
        invoiceNumber,
        sequenceNumber,
        customer,
        items: processedItems,
        amounts: {
          subtotal: subtotal,
          shippingCost: shippingCostNum,
          vatAmount: vatAmount,
          vatRate: isSmallBusiness ? 0 : 19,
          total: total
        },
        dates: {
          invoiceDate: invoiceDate,
          dueDate: dueDate,
          deliveryDate: deliveryDate ? new Date(deliveryDate) : null
        },
        payment: {
          method: paymentMethod || 'pending'
        },
        template: templateId || null,
        tax: {
          isSmallBusiness
        },
        status: 'sent', // Manuell erstellte Rechnungen sind direkt 'versendet', nicht 'draft'
        notes: {
          internal: notes?.internal || '',
          customer: notes?.customer || ''
        }
      });

      // Speichern (automatische Berechnung erfolgt im pre-save Hook)
      await invoice.save();

      // Populate für Antwort
      const savedInvoice = await Invoice.findById(invoice._id)
        .populate('customer.customerId', 'vorname nachname firma')
        .populate('template', 'name');

      // E-Mail an Kunden versenden, falls gewünscht
      if (sendEmailToCustomer && customer.customerData.email) {
        try {
          console.log(`📧 Sende Rechnung ${invoiceNumber} per E-Mail an ${customer.customerData.email}`);
          
          // PDF der Rechnung generieren (verwende downloadInvoicePDF Logik)
          let pdfBuffer = null;
          try {
            // Template laden
            let template;
            if (savedInvoice.template && savedInvoice.template._id) {
              template = await InvoiceTemplate.findById(savedInvoice.template._id);
            }
            if (!template) {
              template = await InvoiceTemplate.findOne({ isDefault: true });
            }
            
            // Bestellung-Format für PDF-Service vorbereiten
            const bestellungData = {
              bestellnummer: savedInvoice.invoiceNumber,
              bestelldatum: savedInvoice.dates?.invoiceDate ? new Date(savedInvoice.dates.invoiceDate).toISOString() : new Date().toISOString(),
              faelligkeitsdatum: savedInvoice.dates?.dueDate ? new Date(savedInvoice.dates.dueDate).toISOString() : null,
              kundennummer: customer.customerId?.kundennummer || `K-${customer.customerId?._id?.toString().slice(-6) || 'MANUAL'}`,
              besteller: {
                vorname: customer.customerData.firstName || '',
                nachname: customer.customerData.lastName || '',
                firma: customer.customerData.company || '',
                email: customer.customerData.email || '',
                adresse: {
                  strasse: customer.customerData.street || '',
                  plz: customer.customerData.postalCode || '',
                  stadt: customer.customerData.city || ''
                }
              },
              rechnungsadresse: {
                vorname: customer.customerData.firstName || '',
                nachname: customer.customerData.lastName || '',
                firma: customer.customerData.company || '',
                strasse: (customer.customerData.street || '').split(' ')[0] || '',
                hausnummer: (customer.customerData.street || '').split(' ').slice(1).join(' ') || '',
                plz: customer.customerData.postalCode || '',
                stadt: customer.customerData.city || '',
                land: customer.customerData.country || 'Deutschland'
              },
              artikel: savedInvoice.items.map(item => ({
                name: item.productData?.name || item.name || 'Produktname fehlt',
                beschreibung: item.productData?.description || item.description || '',
                sku: item.productData?.sku || '',
                menge: item.quantity,
                preis: item.unitPrice,
                einzelpreis: item.unitPrice,
                gesamtpreis: item.total
              })),
              gesamtsumme: savedInvoice.amounts.total,
              zahlungsmethode: savedInvoice.payment.method || 'Überweisung'
            };

            // MwSt-Berechnung basierend auf Template
            const isSmallBusiness = template?.companyInfo?.isSmallBusiness || false;
            if (isSmallBusiness) {
              bestellungData.nettosumme = savedInvoice.amounts.total;
              bestellungData.mwst = 0;
            } else {
              bestellungData.nettosumme = savedInvoice.amounts.total / 1.19;
              bestellungData.mwst = savedInvoice.amounts.total - bestellungData.nettosumme;
            }

            pdfBuffer = await PDFService.generateInvoicePDF(bestellungData, template);
          } catch (pdfError) {
            console.warn('⚠️ PDF-Generierung fehlgeschlagen, E-Mail wird ohne PDF versendet:', pdfError.message);
          }

          // E-Mail versenden
          const emailResult = await emailService.sendInvoiceEmail(
            customer.customerData.email,
            savedInvoice,
            pdfBuffer
          );

          if (emailResult.success) {
            console.log(`✅ E-Mail erfolgreich versendet an ${customer.customerData.email}`);
          } else {
            console.warn(`⚠️ E-Mail-Versand fehlgeschlagen: ${emailResult.error}`);
          }
        } catch (emailError) {
          console.error('❌ Fehler beim E-Mail-Versand:', emailError);
          // Fehler beim E-Mail-Versand sollte die Rechnungserstellung nicht blockieren
        }
      }

      res.status(201).json({
        success: true,
        message: `Rechnung ${invoiceNumber} erfolgreich erstellt${sendEmailToCustomer && customer.customerData.email ? ' und per E-Mail versendet' : ''}`,
        data: savedInvoice
      });

    } catch (error) {
      console.error('Fehler beim Erstellen der Rechnung:', error);
      
      // Spezielle Behandlung für Duplikate
      if (error.code === 11000) {
        return res.status(409).json({
          success: false,
          message: 'Rechnungsnummer bereits vorhanden',
          error: 'Duplicate key error'
        });
      }

      res.status(500).json({
        success: false,
        message: 'Fehler beim Erstellen der Rechnung',
        error: error.message
      });
    }
  }

  // Rechnung abrufen
  async getInvoiceById(req, res) {
    try {
      const { id } = req.params;

      const invoice = await Invoice.findById(id)
        .populate('customer.customerId', 'vorname nachname firma email telefon')
        .populate('template', 'name companyInfo');

      if (!invoice) {
        return res.status(404).json({
          success: false,
          message: 'Rechnung nicht gefunden'
        });
      }

      res.json({
        success: true,
        data: invoice
      });

    } catch (error) {
      console.error('Fehler beim Abrufen der Rechnung:', error);
      res.status(500).json({
        success: false,
        message: 'Fehler beim Abrufen der Rechnung',
        error: error.message
      });
    }
  }

  // Rechnung aktualisieren
  async updateInvoice(req, res) {
    try {
      const { id } = req.params;
      const updateData = req.body;

      // Keine Änderung der Rechnungsnummer erlaubt
      delete updateData.invoiceNumber;
      delete updateData.sequenceNumber;

      const invoice = await Invoice.findByIdAndUpdate(
        id,
        updateData,
        { new: true, runValidators: true }
      ).populate('customer.customerId', 'vorname nachname firma')
       .populate('template', 'name');

      if (!invoice) {
        return res.status(404).json({
          success: false,
          message: 'Rechnung nicht gefunden'
        });
      }

      res.json({
        success: true,
        message: 'Rechnung erfolgreich aktualisiert',
        data: invoice
      });

    } catch (error) {
      console.error('Fehler beim Aktualisieren der Rechnung:', error);
      res.status(500).json({
        success: false,
        message: 'Fehler beim Aktualisieren der Rechnung',
        error: error.message
      });
    }
  }

  // Rechnung Status ändern
  async updateInvoiceStatus(req, res) {
    try {
      const { id } = req.params;
      const { status, paidDate, paidAmount, paymentReference } = req.body;

      const updateData = { status };

      // Zusätzliche Felder für bezahlt Status
      if (status === 'paid') {
        updateData['payment.paidDate'] = paidDate || new Date();
        if (paidAmount) updateData['payment.paidAmount'] = paidAmount;
        if (paymentReference) updateData['payment.paymentReference'] = paymentReference;
      }

      const invoice = await Invoice.findByIdAndUpdate(
        id,
        updateData,
        { new: true, runValidators: true }
      );

      if (!invoice) {
        return res.status(404).json({
          success: false,
          message: 'Rechnung nicht gefunden'
        });
      }

      // 🔄 Synchronisation: Wenn Rechnung als bezahlt markiert wird, auch Bestellung aktualisieren
      if (status === 'paid' && invoice.order?.orderId) {
        try {
          const Order = require('../models/Order');
          const order = await Order.findById(invoice.order.orderId);
          
          if (order) {
            console.log('💰 Rechnung als bezahlt markiert - aktualisiere Bestellung:', order.bestellnummer);
            
            // Bestellung nur aktualisieren wenn noch nicht bezahlt
            if (order.status !== 'bezahlt') {
              order.status = 'bezahlt';
              if (!order.zahlung) order.zahlung = {};
              order.zahlung.status = 'bezahlt';
              order.zahlung.bezahltAm = new Date();
              
              // Status-Verlauf hinzufügen
              if (!order.statusVerlauf) order.statusVerlauf = [];
              order.statusVerlauf.push({
                status: 'bezahlt',
                zeitpunkt: new Date(),
                notiz: 'Automatisch aktualisiert durch Rechnung als bezahlt markieren',
                bearbeiter: 'System'
              });
              
              await order.save();
              console.log('✅ Bestellung erfolgreich auf "bezahlt" gesetzt');
            }
          }
        } catch (orderError) {
          console.error('⚠️ Fehler beim Aktualisieren der Bestellung:', orderError);
          // Nicht abbrechen - Rechnung wurde bereits aktualisiert
        }
      }

      res.json({
        success: true,
        message: `Rechnung status auf "${status}" geändert`,
        data: invoice
      });

    } catch (error) {
      console.error('Fehler beim Ändern des Rechnung-Status:', error);
      res.status(500).json({
        success: false,
        message: 'Fehler beim Ändern des Rechnung-Status',
        error: error.message
      });
    }
  }

  // Dashboard Statistiken
  async getDashboardStats(req, res) {
    try {
      const currentYear = new Date().getFullYear();
      const currentMonth = new Date().getMonth();
      const startOfYear = new Date(currentYear, 0, 1);
      const startOfMonth = new Date(currentYear, currentMonth, 1);

      const [
        totalInvoices,
        yearInvoices,
        monthInvoices,
        totalRevenue,
        yearRevenue,
        monthRevenue,
        unpaidInvoices,
        overdueInvoices
      ] = await Promise.all([
        Invoice.countDocuments(),
        Invoice.countDocuments({ 'dates.invoiceDate': { $gte: startOfYear } }),
        Invoice.countDocuments({ 'dates.invoiceDate': { $gte: startOfMonth } }),
        Invoice.aggregate([
          { $group: { _id: null, total: { $sum: '$amounts.total' } } }
        ]),
        Invoice.aggregate([
          { $match: { 'dates.invoiceDate': { $gte: startOfYear } } },
          { $group: { _id: null, total: { $sum: '$amounts.total' } } }
        ]),
        Invoice.aggregate([
          { $match: { 'dates.invoiceDate': { $gte: startOfMonth } } },
          { $group: { _id: null, total: { $sum: '$amounts.total' } } }
        ]),
        Invoice.countDocuments({ status: { $in: ['sent', 'overdue'] } }),
        Invoice.countDocuments({ 
          status: { $ne: 'paid' }, 
          'dates.dueDate': { $lt: new Date() } 
        })
      ]);

      res.json({
        success: true,
        data: {
          invoices: {
            total: totalInvoices,
            thisYear: yearInvoices,
            thisMonth: monthInvoices,
            unpaid: unpaidInvoices,
            overdue: overdueInvoices
          },
          revenue: {
            total: totalRevenue[0]?.total || 0,
            thisYear: yearRevenue[0]?.total || 0,
            thisMonth: monthRevenue[0]?.total || 0
          }
        }
      });

    } catch (error) {
      console.error('Fehler beim Abrufen der Dashboard-Statistiken:', error);
      res.status(500).json({
        success: false,
        message: 'Fehler beim Abrufen der Dashboard-Statistiken',
        error: error.message
      });
    }
  }

  // Rechnung löschen (Admin-Berechtigung erforderlich)
  async deleteInvoice(req, res) {
    try {
      const { id } = req.params;

      const invoice = await Invoice.findById(id);
      if (!invoice) {
        return res.status(404).json({
          success: false,
          message: 'Rechnung nicht gefunden'
        });
      }

      // Admin kann alle Rechnungen löschen
      // Warnung für bereits versendete Rechnungen
      let warningMessage = '';
      if (invoice.status !== 'draft') {
        warningMessage = ' (Achtung: Diese Rechnung war bereits versendet!)';
      }

      await Invoice.findByIdAndDelete(id);

      res.json({
        success: true,
        message: `Rechnung erfolgreich gelöscht${warningMessage}`
      });

    } catch (error) {
      console.error('Fehler beim Löschen der Rechnung:', error);
      res.status(500).json({
        success: false,
        message: 'Fehler beim Löschen der Rechnung',
        error: error.message
      });
    }
  }

  // PDF für Rechnung herunterladen
  async downloadInvoicePDF(req, res) {
    try {
      const { id } = req.params;
      
      const invoice = await Invoice.findById(id)
        .populate('customer.customerId', 'vorname nachname firma email telefon kundennummer adresse')
        .populate('template', 'name');
      
      if (!invoice) {
        return res.status(404).json({
          success: false,
          message: 'Rechnung nicht gefunden'
        });
      }

      // Daten für PDF-Service vorbereiten (PDFService erwartet bestellung-Format)
      const bestellungData = {
        bestellnummer: invoice.invoiceNumber,
        bestelldatum: invoice.dates?.invoiceDate ? new Date(invoice.dates.invoiceDate).toISOString() : new Date().toISOString(),
        faelligkeitsdatum: invoice.dates?.dueDate ? new Date(invoice.dates.dueDate).toISOString() : null,
        kundennummer: `K-${invoice._id.toString().slice(-6).toUpperCase()}`,
        besteller: {
          vorname: invoice.customer.customerData?.firstName || '',
          nachname: invoice.customer.customerData?.lastName || '',
          firma: invoice.customer.customerData?.company || '',
          email: invoice.customer.customerData?.email || '',
          adresse: {
            strasse: invoice.customer.customerData?.street || '',
            plz: invoice.customer.customerData?.postalCode || '',
            stadt: invoice.customer.customerData?.city || ''
          }
        },
        rechnungsadresse: {
          vorname: invoice.customer.customerData?.firstName || '',
          nachname: invoice.customer.customerData?.lastName || '',
          firma: invoice.customer.customerData?.company || '',
          strasse: (invoice.customer.customerData?.street || '').split(' ')[0] || '',
          hausnummer: (invoice.customer.customerData?.street || '').split(' ').slice(1).join(' ') || '',
          plz: invoice.customer.customerData?.postalCode || '',
          stadt: invoice.customer.customerData?.city || '',
          land: invoice.customer.customerData?.country || 'Deutschland'
        },
        artikel: invoice.items.map(item => ({
          name: item.productData?.name || item.name || 'Produktname fehlt',
          beschreibung: item.productData?.description || item.description || '',
          sku: item.productData?.sku || '',
          menge: item.quantity,
          preis: item.unitPrice,
          einzelpreis: item.unitPrice,
          gesamtpreis: item.total
        })),
        gesamtsumme: invoice.amounts.total,
        versandkosten: invoice.amounts.shippingCost || 0, // ✅ Versandkosten hinzufügen
        zahlungsmethode: invoice.payment.method || 'Überweisung'
      };

      // AKTUELLES Template aus Datenbank laden für konsistente Einstellungen
      let template;
      if (invoice.template && invoice.template._id) {
        template = await InvoiceTemplate.findById(invoice.template._id);
      }
      if (!template) {
        template = await InvoiceTemplate.findOne({ isDefault: true });
      }
      
      if (!template) {
        console.warn('⚠️ Kein Template gefunden, verwende Minimal-Fallback');
        template = {
          companyInfo: {
            name: 'Glücksmomente Manufaktur',
            isSmallBusiness: true
          }
        };
      }
      
      // MwSt-Berechnung basierend auf Template
      const isSmallBusiness = template.companyInfo?.isSmallBusiness || false;
      const productTotal = invoice.amounts.subtotal || (invoice.amounts.total - (invoice.amounts.shippingCost || 0));
      const shippingCost = invoice.amounts.shippingCost || 0;
      
      if (isSmallBusiness) {
        bestellungData.nettosumme = productTotal;
        bestellungData.mwst = 0;
      } else {
        // Bei USt-pflichtigen Unternehmen: Netto = Brutto / 1.19, MwSt = Brutto - Netto
        // Aber Versandkosten separat behandeln (meist auch USt-pflichtig)
        const totalIncludingShipping = productTotal + shippingCost;
        bestellungData.nettosumme = totalIncludingShipping / 1.19;
        bestellungData.mwst = totalIncludingShipping - bestellungData.nettosumme;
      }
      
      console.log('🎨 PDF-Template:', template.name || 'Unnamed');
      console.log('💰 USt-Behandlung:', template.companyInfo?.isSmallBusiness ? 'Kleinunternehmer' : 'USt-pflichtig');
      console.log('💰 MwSt-Berechnung:');
      console.log('  - Kleinunternehmer:', isSmallBusiness);
      console.log('  - Gesamtsumme:', bestellungData.gesamtsumme.toFixed(2), '€');
      console.log('  - Versandkosten:', bestellungData.versandkosten.toFixed(2), '€');
      console.log('  - Nettosumme:', bestellungData.nettosumme.toFixed(2), '€');
      console.log('  - MwSt-Betrag:', bestellungData.mwst.toFixed(2), '€');
      console.log('🧾 Bestellung-Daten für PDF:');
      console.log('  - Kundennummer:', bestellungData.kundennummer);
      console.log('  - Artikel-Count:', bestellungData.artikel.length);
      console.log('  - Artikel-Namen:', bestellungData.artikel.map(a => a.name).join(', '));
      console.log('  - Kunde:', bestellungData.besteller.vorname, bestellungData.besteller.nachname);
      console.log('  - Rechnungsadresse:', bestellungData.rechnungsadresse.vorname, bestellungData.rechnungsadresse.nachname, bestellungData.rechnungsadresse.stadt);
      console.log('  - Customer populated:', !!invoice.customer.customerData);
      console.log('  - Customer Adresse:', invoice.customer.customerData?.street);
      console.log('  - Customer PLZ:', invoice.customer.customerData?.postalCode);
      
      // PDF mit AKTUELLEM Template generieren
      console.log('🧾 Generiere PDF für Invoice:', invoice.invoiceNumber);
      const pdfBuffer = await PDFService.generateInvoicePDF(bestellungData, template);
      console.log('✅ PDF Buffer Größe:', pdfBuffer.length, 'bytes');
      
      // Check if it's a preview request
      const isPreview = req.query.preview === 'true';
      
      // PDF Headers setzen
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Length', pdfBuffer.length);
      if (isPreview) {
        // Für Vorschau: PDF im Browser anzeigen
        res.setHeader('Content-Disposition', `inline; filename="Rechnung_${invoice.invoiceNumber}.pdf"`);
      } else {
        // Für Download: PDF herunterladen
        res.setHeader('Content-Disposition', `attachment; filename="Rechnung_${invoice.invoiceNumber}.pdf"`);
      }
      
      // PDF als Buffer senden (nicht als JSON)
      res.end(pdfBuffer);
      
    } catch (error) {
      console.error('Fehler beim PDF-Download:', error);
      res.status(500).json({
        success: false,
        message: 'Fehler beim Erstellen der PDF',
        error: error.message
      });
    }
  }
}

module.exports = new InvoiceService();