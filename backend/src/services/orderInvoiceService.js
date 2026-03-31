const Order = require('../models/Order');
const InvoiceTemplate = require('../models/InvoiceTemplate');
const Portfolio = require('../models/Portfolio');
const invoiceController = require('../controllers/invoiceController');
const nodemailer = require('nodemailer');
const path = require('path');

// Hilfsfunktion zur Generierung einer Produktbeschreibung aus Portfolio-Daten
function generateProductDescription(portfolioData) {
  const parts = [];
  
  // Aroma hinzufügen (immer vorhanden)
  if (portfolioData.aroma && portfolioData.aroma !== 'keine Auswahl') {
    parts.push(portfolioData.aroma);
  }
  
  // Seifenform hinzufügen (immer vorhanden)
  if (portfolioData.seifenform && portfolioData.seifenform !== 'keine Auswahl') {
    parts.push(portfolioData.seifenform);
  }
  
  // Verpackung hinzufügen (immer vorhanden)
  if (portfolioData.verpackung && portfolioData.verpackung !== 'keine Auswahl') {
    parts.push(portfolioData.verpackung);
  }
  
  // Zusatz hinzufügen (optional)
  if (portfolioData.zusatz && portfolioData.zusatz.trim() !== '') {
    parts.push(portfolioData.zusatz);
  }
  
  // Optional-Feld hinzufügen (falls vorhanden)
  if (portfolioData.optional && portfolioData.optional.trim() !== '') {
    parts.push(portfolioData.optional);
  }
  
  // Teile mit "•" verknüpfen, oder Fallback wenn leer
  return parts.length > 0 ? parts.join(' • ') : 'Handgemachte Seife';
}

class OrderInvoiceService {
  constructor() {
    // E-Mail-Transporter konfigurieren
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: process.env.SMTP_PORT || 587,
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    });
  }

  // Rechnung für Bestellung generieren
  async generateInvoiceForOrder(orderId) {
    try {
      // Bestellung laden
      const order = await Order.findById(orderId);

      if (!order) {
        throw new Error('Bestellung nicht gefunden');
      }

      console.log('🧾 OrderInvoiceService - Generiere Rechnung für Bestellung:', order.bestellnummer);
      console.log('📦 OrderInvoiceService - Artikel in Bestellung:', order.artikel ? order.artikel.length : 0);

      // AKTUELLES Standard-Template aus Datenbank laden
      // Duplikatprüfung: Falls Rechnung bereits existiert, nicht nochmal erstellen
      const Invoice = require('../models/Invoice');
      const escapeRegex = (v = '') => String(v).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const lookups = [{ 'order.orderId': order._id }, { originalOrder: order._id }];
      if (order.bestellnummer) {
        lookups.push({ 'notes.internal': { $regex: escapeRegex(order.bestellnummer), $options: 'i' } });
      }
      const existingInvoice = await Invoice.findOne({ $or: lookups });
      if (existingInvoice) {
        console.log('ℹ️ Rechnung bereits vorhanden, keine Doppelerstellung:', existingInvoice.invoiceNumber);
        return {
          success: true,
          invoiceNumber: existingInvoice.invoiceNumber,
          dbInvoiceNumber: existingInvoice.invoiceNumber,
          alreadyExists: true
        };
      }

      const InvoiceTemplate = require('../models/InvoiceTemplate');
      const template = await InvoiceTemplate.findOne({ isDefault: true });
      if (!template) {
        throw new Error('Kein Standard-Template in der Datenbank gefunden');
      }
      
      console.log('🎨 OrderInvoice Template:', template.name);

      // Rechnungsnummer generieren
      const invoiceNumber = await this.generateInvoiceNumber();
      
      // Bestellung mit Rechnungsinformationen aktualisieren
      order.invoiceNumber = invoiceNumber;
      order.invoiceDate = new Date();
      await order.save();

      // Kundendaten aus Bestellung extrahieren
      const rechnungsadresse = order.rechnungsadresse;
      const kunde = order.besteller; // ✅ Korrekt: Order hat 'besteller', nicht 'kunde'

      console.log('🔍 Bestelldaten:', {
        bestellnummer: order.bestellnummer,
        bestellerVorname: kunde?.vorname,
        bestellerNachname: kunde?.nachname,
        bestellerEmail: kunde?.email,
        rechnungsadresseStrasse: rechnungsadresse?.strasse,
        rechnungsadresseStadt: rechnungsadresse?.stadt
      });

      // Daten für PDFService vorbereiten (angepasst an Order-Modell)
      const bestellungData = {
        bestellnummer: invoiceNumber,
        bestelldatum: order.createdAt.toISOString(),
        faelligkeitsdatum: null,
        kundennummer: kunde?.kundennummer || `K-${order._id.toString().slice(-6).toUpperCase()}`, // ✅ Kundennummer generieren
        besteller: {
          vorname: kunde?.vorname || '',
          nachname: kunde?.nachname || '',
          firma: rechnungsadresse?.firma || '',
          email: kunde?.email || '',
          adresse: {
            strasse: rechnungsadresse?.strasse || '',
            plz: rechnungsadresse?.plz || '',
            stadt: rechnungsadresse?.stadt || ''
          }
        },
        rechnungsadresse: {
          vorname: rechnungsadresse?.vorname || '',
          nachname: rechnungsadresse?.nachname || '',
          firma: rechnungsadresse?.firma || '',
          strasse: rechnungsadresse?.strasse || '',
          hausnummer: rechnungsadresse?.hausnummer || '',
          plz: rechnungsadresse?.plz || '',
          stadt: rechnungsadresse?.stadt || '',
          land: rechnungsadresse?.land || 'Deutschland'
        },
        artikel: await Promise.all(order.artikel?.map(async (item, index) => {
          let beschreibung = '';
          
          if (item.produktSnapshot) {
            const snapshot = item.produktSnapshot;
            
            // 1. Direkt aus snapshot.beschreibung
            if (snapshot.beschreibung) {
              if (typeof snapshot.beschreibung === 'string' && snapshot.beschreibung.trim()) {
                beschreibung = snapshot.beschreibung;
              } else if (typeof snapshot.beschreibung === 'object' && snapshot.beschreibung !== null) {
                beschreibung = snapshot.beschreibung.kurz?.trim() || snapshot.beschreibung.lang?.trim() || '';
              }
            }
            
            // 2. Für Seifen: Aus Strukturdaten generieren
            if (!beschreibung && (snapshot.aroma || snapshot.seifenform || snapshot.verpackung)) {
              beschreibung = generateProductDescription({
                aroma: snapshot.aroma,
                seifenform: snapshot.seifenform,
                verpackung: snapshot.verpackung,
                zusatz: snapshot.zusatz,
                optional: snapshot.optional
              });
            }
            
            // 3. Live-Laden von Portfolio (für beide: Seifen und Werkstücke)
            if (!beschreibung && snapshot.name) {
              try {
                const portfolioItem = await Portfolio.findOne({
                  name: { $regex: new RegExp(`^${snapshot.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') }
                }).lean();
                
                if (portfolioItem) {
                  // Beschreibung aus Portfolio-Objekt extrahieren
                  if (portfolioItem.beschreibung && typeof portfolioItem.beschreibung === 'object') {
                    const kurzText = portfolioItem.beschreibung.kurz?.trim();
                    const langText = portfolioItem.beschreibung.lang?.trim();
                    beschreibung = kurzText || langText || '';
                  }
                  
                  // Für Seifen: Aus Struktur generieren falls keine Beschreibung
                  if (!beschreibung && portfolioItem.kategorie === 'seife' && 
                      (portfolioItem.aroma || portfolioItem.seifenform || portfolioItem.verpackung)) {
                    beschreibung = generateProductDescription({
                      aroma: portfolioItem.aroma,
                      seifenform: portfolioItem.seifenform,
                      verpackung: portfolioItem.verpackung,
                      zusatz: portfolioItem.zusatz,
                      optional: portfolioItem.optional
                    });
                  }
                  
                  // Für Werkstücke ohne Beschreibung: Generiere sinnvolle Beschreibung
                  if (!beschreibung && portfolioItem.kategorie === 'werkstuck') {
                    // Versuche aus Giessform-Namen eine Beschreibung zu erstellen
                    if (portfolioItem.giessform) {
                      beschreibung = `Handgefertigtes ${portfolioItem.name} aus Gips`;
                    } else {
                      beschreibung = `Handgefertigtes ${portfolioItem.name}`;
                    }
                  }
                  
                  // Letzter Fallback auf Name (sollte eigentlich nie erreicht werden)
                  if (!beschreibung) {
                    beschreibung = portfolioItem.name;
                  }
                }
              } catch (error) {
                console.warn(`⚠️ Fehler beim Live-Laden Portfolio für ${snapshot.name}:`, error);
              }
            }
            
            // 4. Fallback auf snapshot.name
            if (!beschreibung && snapshot.name) {
              beschreibung = snapshot.name;
            }
          }
          
          // 5. Absoluter Fallback
          if (!beschreibung) {
            beschreibung = 'Handgefertigtes Produkt';
          }
          
          // Beschreibung auf 120 Zeichen begrenzen
          if (beschreibung.length > 120) {
            beschreibung = beschreibung.substring(0, 117) + '...';
          }
          
          return {
            artikelnummer: `ART-${(index + 1).toString().padStart(3, '0')}`,
            name: item.produktSnapshot?.name || 'Produktname nicht verfügbar',
            beschreibung,
            menge: item.menge || 1,
            preis: item.einzelpreis || 0,
            einzelpreis: item.einzelpreis || 0,
            gesamtpreis: item.gesamtpreis || 0
          };
        }) || []),
        gesamtsumme: order.preise?.gesamtsumme || 0,
        nettosumme: order.preise?.zwischensumme || 0,
        versandkosten: order.preise?.versandkosten || 0, // ✅ Versandkosten hinzufügen
        mwst: order.preise?.mwst?.betrag || 0,
        zahlungsmethode: order.zahlung?.methode || 'Überweisung',
        notes: {
          customer: order.notizen?.oeffentlich || order.notizen?.kunde || '',
          internal: order.notizen?.intern || ''
        }
      };

      console.log('🧾 Generiere PDF für Bestellung:', invoiceNumber);
      console.log('📦 Artikel:', bestellungData.artikel.length);

      // PDF mit Template generieren
      const PDFService = require('./PDFService');
      const pdfBuffer = await PDFService.generateInvoicePDF(bestellungData, template);

      // ✅ Rechnung auch in Invoice-DB speichern für Admin-Liste (mit Retry-Logic)
      try {
        const Invoice = require('../models/Invoice');
        
        // Retry-Logic für Race-Condition-sichere Invoice-Erstellung
        let dbSaveSuccess = false;
        let attempts = 0;
        const maxAttempts = 5;
        
        while (!dbSaveSuccess && attempts < maxAttempts) {
          try {
            attempts++;
            
            // Nächste Sequenznummer für Invoice-System ermitteln
            const { invoiceNumber: dbInvoiceNumber, sequenceNumber } = await Invoice.getNextInvoiceNumber();
            
            console.log(`🔄 Versuch ${attempts}/${maxAttempts} - DB-Invoice: ${dbInvoiceNumber}, Sequenz: ${sequenceNumber}`);
            
            const orderIsPaid =
              String(order?.status || '').toLowerCase() === 'bezahlt' ||
              String(order?.zahlung?.status || '').toLowerCase() === 'bezahlt';

            const savedInvoice = new Invoice({
              invoiceNumber: dbInvoiceNumber, // Verwende die DB-generierte Nummer für Eindeutigkeit
              sequenceNumber: sequenceNumber,
              customer: {
                customerId: null, // Keine direkte Kunden-ID verfügbar
                customerData: {
                  salutation: 'Herr',
                  firstName: kunde?.vorname || '',
                  lastName: kunde?.nachname || '',
                  company: rechnungsadresse?.firma || '',
                  street: `${rechnungsadresse?.strasse || ''} ${rechnungsadresse?.hausnummer || ''}`.trim(),
                  postalCode: rechnungsadresse?.plz || '',
                  city: rechnungsadresse?.stadt || '',
                  country: rechnungsadresse?.land || 'Deutschland',
                  email: kunde?.email || '',
                  phone: kunde?.telefon || ''
                }
              },
              items: bestellungData.artikel.map((item, index) => ({
                productId: null,
                productData: {
                  name: item.name,
                  description: item.beschreibung, // Bereits korrekt verarbeitet
                  sku: item.artikelnummer, // ✅ Verwende generierte Artikelnummer
                  category: 'Seife'
                },
                quantity: item.menge,
                unitPrice: item.einzelpreis,
                total: item.gesamtpreis
              })),
              amounts: {
                subtotal: bestellungData.nettosumme,
                shippingCost: order.preise?.versandkosten || 0,
                vatAmount: bestellungData.mwst,
                vatRate: template.companyInfo?.isSmallBusiness ? 0 : 19,
                total: bestellungData.gesamtsumme
              },
              dates: {
                invoiceDate: new Date(),
                deliveryDate: order.lieferdatum || null,
                dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000) // 14 Tage Zahlungsziel
              },
              payment: {
                method: bestellungData.zahlungsmethode === 'ueberweisung' ? 'bank_transfer' : 'pending',
                status: orderIsPaid ? 'paid' : 'pending',
                paidDate: orderIsPaid ? (order?.zahlung?.bezahltAm || new Date()) : undefined,
                paidAmount: orderIsPaid ? Number(bestellungData.gesamtsumme || 0) : 0,
                paymentReference: orderIsPaid ? `Automatisch aus Bestellung ${order.bestellnummer} uebernommen` : undefined
              },
              template: template._id,
              tax: {
                isSmallBusiness: template.companyInfo?.isSmallBusiness || false
              },
              status: orderIsPaid ? 'paid' : 'sent',
              notes: {
                internal: `Automatisch generiert für Bestellung ${order.bestellnummer}`,
                customer: bestellungData.notes?.customer || order.notizen?.oeffentlich || order.notizen?.kunde || ''
              },
              // Verknüpfung zur ursprünglichen Bestellung
              order: {
                orderId: order._id,
                bestellnummer: order.bestellnummer
              },
              originalOrder: order._id,
              source: 'auto-payment'
            });

            await savedInvoice.save();
            dbSaveSuccess = true;
            console.log('✅ Rechnung auch im Invoice-System gespeichert:', dbInvoiceNumber, `(nach ${attempts} Versuchen)`);
            
          } catch (retryError) {
            console.log(`⚠️ DB-Speicherung Versuch ${attempts} fehlgeschlagen:`, retryError.message);
            
            if (retryError.code === 11000) {
              // Duplicate Key Error - nochmal versuchen mit neuer Sequenz
              console.log('🔄 Duplicate Key Error - versuche mit neuer Sequenznummer...');
              await new Promise(resolve => setTimeout(resolve, 50 * attempts)); // Kurze Pause
            } else {
              throw retryError; // Andere Fehler nicht wiederholen
            }
          }
        }
        
        if (!dbSaveSuccess) {
          console.error('❌ DB-Speicherung nach allen Versuchen fehlgeschlagen');
        }
        
      } catch (dbError) {
        console.error('⚠️ Rechnung PDF erstellt, aber DB-Speicherung fehlgeschlagen:', dbError);
        // PDF trotzdem erfolgreich erstellt, also nicht abbrechen
      }

      return {
        success: true,
        invoiceNumber,
        pdf: pdfBuffer,
        filename: `Rechnung-${invoiceNumber}.pdf`
      };

    } catch (error) {
      console.error('❌ OrderInvoiceService - Fehler bei der Rechnungsgenerierung:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Rechnungsdaten vorbereiten
  prepareInvoiceData(order, template) {
    const customer = order.customer;
    const companyInfo = template.companyInfo;

    // Produkte formatieren
    const products = order.items.map((item, index) => ({
      position: index + 1,
      name: item.product?.name || item.name,
      description: item.product?.description || item.description,
      quantity: item.quantity,
      unitPrice: item.price,
      total: item.quantity * item.price
    }));

    // Gesamtsummen berechnen
    const subtotal = products.reduce((sum, product) => sum + product.total, 0);
    const taxRate = 0.19; // 19% MwSt
    const tax = subtotal * taxRate;
    const shipping = order.shippingCost || 0;
    const total = subtotal + tax + shipping;

    return {
      company: companyInfo,
      customer: {
        name: customer.firstName && customer.lastName 
          ? `${customer.firstName} ${customer.lastName}`
          : customer.name || customer.email,
        email: customer.email,
        address: {
          street: customer.address?.street || 'Nicht angegeben',
          city: customer.address?.city || 'Nicht angegeben',
          postalCode: customer.address?.postalCode || '',
          country: customer.address?.country || 'Deutschland'
        }
      },
      order: {
        number: order.orderNumber || order._id.toString().slice(-8),
        date: order.createdAt.toLocaleDateString('de-DE'),
        products,
        subtotal,
        tax,
        shipping,
        total
      },
      invoice: {
        number: order.invoiceNumber,
        date: order.invoiceDate ? order.invoiceDate.toLocaleDateString('de-DE') : new Date().toLocaleDateString('de-DE'),
        dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toLocaleDateString('de-DE') // 14 Tage Zahlungsziel
      }
    };
  }

  // Eindeutige Rechnungsnummer generieren
  async generateInvoiceNumber() {
    const year = new Date().getFullYear();
    const month = String(new Date().getMonth() + 1).padStart(2, '0');
    
    // Zähle existierende Rechnungen für diesen Monat
    const count = await Order.countDocuments({
      invoiceNumber: { $regex: `^RE-${year}${month}` }
    });

    const sequenceNumber = String(count + 1).padStart(4, '0');
    return `RE-${year}${month}-${sequenceNumber}`;
  }

  // E-Mail mit Rechnung versenden
  async sendInvoiceEmail(orderId, invoiceData) {
    try {
      const order = await Order.findById(orderId).populate('customer');
      const customer = order.customer;

      const mailOptions = {
        from: `"${invoiceData.company.name}" <${invoiceData.company.contact.email}>`,
        to: customer.email,
        subject: `Ihre Rechnung ${invoiceData.invoice.number} - ${invoiceData.company.name}`,
        html: this.generateEmailHTML(invoiceData, order),
        attachments: [
          {
            filename: `Rechnung-${invoiceData.invoice.number}.pdf`,
            content: invoiceData.pdf,
            contentType: 'application/pdf'
          }
        ]
      };

      const result = await this.transporter.sendMail(mailOptions);
      console.log('Rechnungs-E-Mail gesendet:', result.messageId);

      // E-Mail-Status in Bestellung speichern
      order.invoiceEmailSent = true;
      order.invoiceEmailSentAt = new Date();
      await order.save();

      return result;

    } catch (error) {
      console.error('Fehler beim E-Mail-Versand:', error);
      throw error;
    }
  }

  // E-Mail-HTML generieren
  generateEmailHTML(invoiceData, order) {
    const { company, customer, invoice } = invoiceData;

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #8b4a8b; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background-color: #f9f9f9; }
          .footer { padding: 15px; text-align: center; font-size: 12px; color: #666; }
          .highlight { background-color: #fff; padding: 15px; border-left: 4px solid #8b4a8b; margin: 15px 0; }
          .button { display: inline-block; background-color: #8b4a8b; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; margin: 10px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>${company.name}</h1>
            <p>Ihre Rechnung ist bereit</p>
          </div>
          
          <div class="content">
            <h2>Liebe/r ${customer.name},</h2>
            
            <p>vielen Dank für Ihren Einkauf bei ${company.name}! Im Anhang finden Sie Ihre Rechnung für die Bestellung.</p>
            
            <div class="highlight">
              <strong>Rechnungsdetails:</strong><br>
              📄 Rechnungsnummer: ${invoice.number}<br>
              📅 Rechnungsdatum: ${invoice.date}<br>
              💰 Gesamtsumme: ${invoiceData.order.total.toFixed(2)} €<br>
              ⏰ Zahlungsziel: ${invoice.dueDate}
            </div>
            
            <p>Bitte überweisen Sie den Rechnungsbetrag innerhalb von 14 Tagen auf unser Konto. Die Kontodaten finden Sie in der angehängten PDF-Rechnung.</p>
            
            <p>Bei Fragen zu Ihrer Bestellung oder Rechnung stehen wir Ihnen gerne zur Verfügung:</p>
            
            <div class="highlight">
              📧 E-Mail: ${company.contact.email}<br>
              📞 Telefon: ${company.contact.phone}<br>
              🌐 Website: ${company.contact.website}
            </div>
            
            <p>Wir danken Ihnen für Ihr Vertrauen und freuen uns auf Ihren nächsten Besuch!</p>
            
            <p>Mit freundlichen Grüßen<br>
            Ihr Team von ${company.name}</p>
          </div>
          
          <div class="footer">
            <p>${company.name} | ${company.address.street} | ${company.address.city}</p>
            <p>E-Mail: ${company.contact.email} | Website: ${company.contact.website}</p>
            <p>${company.taxInfo.vatId}</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  // Alle Rechnungen für Admin abrufen
  async getInvoiceList(filters = {}) {
    try {
      const query = { invoiceNumber: { $exists: true } };
      
      // Filter anwenden
      if (filters.startDate) {
        query.invoiceDate = { $gte: new Date(filters.startDate) };
      }
      if (filters.endDate) {
        query.invoiceDate = { ...query.invoiceDate, $lte: new Date(filters.endDate) };
      }
      if (filters.customerEmail) {
        const customers = await User.find({ 
          email: { $regex: filters.customerEmail, $options: 'i' } 
        });
        query.customer = { $in: customers.map(c => c._id) };
      }

      const invoices = await Order.find(query)
        .populate('customer', 'firstName lastName email')
        .sort({ invoiceDate: -1 })
        .limit(filters.limit || 100);

      return invoices.map(order => ({
        _id: order._id,
        invoiceNumber: order.invoiceNumber,
        invoiceDate: order.invoiceDate,
        orderNumber: order.orderNumber,
        customerName: order.customer.firstName && order.customer.lastName 
          ? `${order.customer.firstName} ${order.customer.lastName}`
          : order.customer.email,
        customerEmail: order.customer.email,
        total: order.totalPrice,
        status: order.status,
        invoiceEmailSent: order.invoiceEmailSent || false,
        createdAt: order.createdAt
      }));

    } catch (error) {
      console.error('Fehler beim Abrufen der Rechnungsliste:', error);
      throw error;
    }
  }

  // Rechnung erneut versenden
  async resendInvoice(orderId) {
    try {
      const invoiceData = await this.generateInvoiceForOrder(orderId);
      await this.sendInvoiceEmail(orderId, invoiceData);
      return { success: true, message: 'Rechnung erfolgreich versendet' };
    } catch (error) {
      console.error('Fehler beim erneuten Versenden:', error);
      throw error;
    }
  }

  // Rechnung-PDF direkt abrufen
  async getInvoicePDF(orderId) {
    try {
      const order = await Order.findById(orderId);
      if (!order || !order.invoiceNumber) {
        throw new Error('Rechnung nicht gefunden');
      }

      const invoiceData = await this.generateInvoiceForOrder(orderId);
      return invoiceData.pdf;

    } catch (error) {
      console.error('Fehler beim Abrufen der PDF:', error);
      throw error;
    }
  }
}

module.exports = new OrderInvoiceService();