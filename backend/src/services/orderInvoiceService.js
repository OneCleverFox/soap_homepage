const Order = require('../models/Order');
const InvoiceTemplate = require('../models/InvoiceTemplate');
const invoiceController = require('../controllers/invoiceController');
const nodemailer = require('nodemailer');
const path = require('path');

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
      const order = await Order.findById(orderId)
        .populate('customer')
        .populate('items.product');

      if (!order) {
        throw new Error('Bestellung nicht gefunden');
      }

      // AKTUELLES Standard-Template aus Datenbank laden
      const template = await InvoiceTemplate.findOne({ isDefault: true });
      if (!template) {
        throw new Error('Kein Standard-Template in der Datenbank gefunden');
      }
      
      console.log('🎨 OrderInvoice Template:', template.name);
      console.log('💰 OrderInvoice USt:', template.companyInfo?.isSmallBusiness ? 'Kleinunternehmer' : 'USt-pflichtig');

      // Rechnungsnummer generieren
      const invoiceNumber = await this.generateInvoiceNumber();
      
      // Bestellung mit Rechnungsinformationen aktualisieren
      order.invoiceNumber = invoiceNumber;
      order.invoiceDate = new Date();
      await order.save();

      // Daten für PDFService vorbereiten
      const bestellungData = {
        bestellnummer: invoiceNumber,
        bestelldatum: order.createdAt.toISOString(),
        faelligkeitsdatum: null,
        kundennummer: order._id.toString().slice(-6),
        besteller: {
          vorname: customer.firstName || '',
          nachname: customer.lastName || '',
          firma: customer.company || '',
          email: customer.email || '',
          adresse: {
            strasse: customer.address?.street || '',
            plz: customer.address?.postalCode || '',
            stadt: customer.address?.city || ''
          }
        },
        rechnungsadresse: {
          vorname: customer.firstName || '',
          nachname: customer.lastName || '',
          firma: customer.company || '',
          strasse: (customer.address?.street || '').split(' ')[0] || '',
          hausnummer: (customer.address?.street || '').split(' ').slice(1).join(' ') || '',
          plz: customer.address?.postalCode || '',
          stadt: customer.address?.city || '',
          land: 'Deutschland'
        },
        artikel: order.items.map(item => ({
          name: item.product?.name || item.name || 'Produktname nicht verfügbar',
          beschreibung: item.product?.description || item.description || 'Keine Beschreibung verfügbar',
          menge: item.quantity || 1,
          preis: item.price || 0,
          einzelpreis: item.price || 0,
          gesamtpreis: (item.quantity || 1) * (item.price || 0)
        })),
        gesamtsumme: order.totalPrice,
        nettosumme: order.netPrice || order.totalPrice,
        mwst: order.vatAmount || 0,
        zahlungsmethode: order.paymentMethod || 'Überweisung'
      };

      console.log('🧾 Generiere PDF für Bestellung:', invoiceNumber);
      console.log('📦 Artikel:', bestellungData.artikel.length);

      // PDF mit Template generieren
      const PDFService = require('./PDFService');
      const pdfBuffer = await PDFService.generateInvoicePDF(bestellungData, template);

      return {
        invoiceNumber,
        pdf: pdfBuffer,
        filename: `Rechnung-${invoiceNumber}.pdf`
      };

    } catch (error) {
      console.error('Fehler bei der Rechnungsgenerierung:', error);
      throw error;
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