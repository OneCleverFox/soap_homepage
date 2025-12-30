const mongoose = require('mongoose');

const invoiceTemplateSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  isDefault: {
    type: Boolean,
    default: false
  },
  companyInfo: {
    name: {
      type: String,
      required: true,
      default: 'Glücksmomente Manufaktur'
    },
    address: {
      street: { type: String, default: 'Musterstraße 123' },
      postalCode: { type: String, default: '64673' },
      city: { type: String, default: 'Zwingenberg' },
      country: { type: String, default: 'Deutschland' }
    },
    contact: {
      phone: { type: String, default: '+49 123 456789' },
      email: { type: String, default: 'info@gluecksmomente-manufaktur.de' },
      website: { type: String, default: 'www.gluecksmomente-manufaktur.de' }
    },
    taxInfo: {
      taxNumber: { type: String, default: 'DE123456789' },
      vatId: { type: String, default: 'USt-IdNr.: DE123456789' },
      ceo: { type: String, default: '' },
      legalForm: { type: String, default: '' },
      taxOffice: { type: String, default: '' },
      registrationCourt: { type: String, default: '' }
    },
    bankDetails: {
      bankName: { type: String, default: '' },
      iban: { type: String, default: '' },
      bic: { type: String, default: '' }
    },
    logo: {
      enabled: { type: Boolean, default: false },
      url: { type: String, default: '' },
      width: { type: Number, default: 120 },
      height: { type: Number, default: 60 }
    },
    isSmallBusiness: { type: Boolean, default: false },
    paymentMethod: { type: String, default: 'sofort' },
    paymentTerms: { type: Number, default: 14 }
  },
  layout: {
    header: {
      showLogo: { type: Boolean, default: true },
      logoPosition: { type: String, enum: ['left', 'center', 'right'], default: 'left' },
      logoSize: { type: String, enum: ['small', 'medium', 'large'], default: 'medium' },
      showCompanyInfo: { type: Boolean, default: true },
      companyInfoPosition: { type: String, enum: ['left', 'right'], default: 'right' },
      style: { type: String, enum: ['standard', 'compact', 'detailed'], default: 'standard' },
      alignment: { type: String, enum: ['left', 'center', 'right'], default: 'left' },
      height: { type: Number, default: 100 },
      showBorder: { type: Boolean, default: false }
    },
    footer: {
      layout: { type: String, enum: ['columns', 'rows', 'compact'], default: 'columns' },
      columns: { type: Number, default: 3 },
      showContactInfo: { type: Boolean, default: true },
      showTaxInfo: { type: Boolean, default: true },
      showBankDetails: { type: Boolean, default: false },
      showLegalInfo: { type: Boolean, default: true },
      height: { type: Number, default: 80 },
      showBorder: { type: Boolean, default: true },
      fontSize: { type: Number, default: 8 }
    },
    colors: {
      primary: { type: String, default: '#8b4a8b' },
      secondary: { type: String, default: '#f5f5f5' },
      text: { type: String, default: '#333333' },
      accent: { type: String, default: '#4caf50' }
    },
    fonts: {
      primary: { type: String, default: 'Arial, sans-serif' },
      size: {
        heading: { type: Number, default: 24 },
        subheading: { type: Number, default: 18 },
        body: { type: Number, default: 12 },
        small: { type: Number, default: 10 }
      }
    },
    spacing: {
      margin: { type: Number, default: 20 },
      lineHeight: { type: Number, default: 1.4 }
    }
  },
  sections: {
    invoiceInfo: {
      enabled: { type: Boolean, default: true },
      position: { type: Number, default: 1 },
      title: { type: String, default: 'RECHNUNG' },
      showInvoiceNumber: { type: Boolean, default: true },
      showInvoiceDate: { type: Boolean, default: true },
      showDueDate: { type: Boolean, default: true },
      showOrderNumber: { type: Boolean, default: true }
    },
    customerInfo: {
      enabled: { type: Boolean, default: true },
      position: { type: Number, default: 2 },
      title: { type: String, default: 'Rechnungsadresse' },
      showTitle: { type: Boolean, default: true }
    },
    productTable: {
      enabled: { type: Boolean, default: true },
      position: { type: Number, default: 3 },
      columns: {
        position: { enabled: { type: Boolean, default: true }, width: { type: Number, default: 8 } },
        description: { enabled: { type: Boolean, default: true }, width: { type: Number, default: 40 } },
        quantity: { enabled: { type: Boolean, default: true }, width: { type: Number, default: 12 } },
        unitPrice: { enabled: { type: Boolean, default: true }, width: { type: Number, default: 15 } },
        total: { enabled: { type: Boolean, default: true }, width: { type: Number, default: 15 } }
      },
      showHeaders: { type: Boolean, default: true },
      alternateRowColors: { type: Boolean, default: true }
    },
    totals: {
      enabled: { type: Boolean, default: true },
      position: { type: Number, default: 4 },
      showSubtotal: { type: Boolean, default: true },
      showTax: { type: Boolean, default: true },
      showShipping: { type: Boolean, default: true },
      showTotal: { type: Boolean, default: true },
      alignment: { type: String, enum: ['left', 'right'], default: 'right' }
    },
    footer: {
      enabled: { type: Boolean, default: true },
      position: { type: Number, default: 5 },
      customText: { 
        type: String, 
        default: 'Vielen Dank für Ihren Einkauf bei Glücksmomente Manufaktur!' 
      },
      showPaymentInfo: { type: Boolean, default: true },
      showReturnPolicy: { type: Boolean, default: true }
    }
  },
  customFields: [{
    name: { type: String, required: true },
    label: { type: String, required: true },
    type: { type: String, enum: ['text', 'number', 'date', 'boolean'], default: 'text' },
    defaultValue: { type: String, default: '' },
    position: { type: Number, default: 0 },
    section: { type: String, enum: ['header', 'customer', 'products', 'totals', 'footer'], default: 'footer' }
  }],
  variables: {
    available: [{
      name: { type: String, required: true },
      description: { type: String, required: true },
      category: { type: String, enum: ['company', 'customer', 'order', 'product', 'date', 'invoice'], required: true }
    }]
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Stelle sicher, dass nur ein Template als Standard markiert ist
invoiceTemplateSchema.pre('save', async function(next) {
  if (this.isDefault) {
    await this.constructor.updateMany(
      { _id: { $ne: this._id } },
      { isDefault: false }
    );
  }
  next();
});

// Standard-Variablen definieren
invoiceTemplateSchema.statics.getDefaultVariables = function() {
  return [
    { name: 'company.name', description: 'Firmenname', category: 'company' },
    { name: 'company.address.street', description: 'Firmen-Straße', category: 'company' },
    { name: 'company.address.city', description: 'Firmen-Stadt', category: 'company' },
    { name: 'company.contact.phone', description: 'Firmen-Telefon', category: 'company' },
    { name: 'company.contact.email', description: 'Firmen-E-Mail', category: 'company' },
    { name: 'customer.name', description: 'Kundenname', category: 'customer' },
    { name: 'customer.email', description: 'Kunden-E-Mail', category: 'customer' },
    { name: 'customer.address.street', description: 'Kunden-Straße', category: 'customer' },
    { name: 'customer.address.city', description: 'Kunden-Stadt', category: 'customer' },
    { name: 'order.number', description: 'Bestellnummer', category: 'order' },
    { name: 'order.date', description: 'Bestelldatum', category: 'date' },
    { name: 'order.total', description: 'Gesamtsumme', category: 'order' },
    { name: 'order.subtotal', description: 'Zwischensumme', category: 'order' },
    { name: 'order.tax', description: 'Steuern', category: 'order' },
    { name: 'order.shipping', description: 'Versandkosten', category: 'order' },
    { name: 'invoice.number', description: 'Rechnungsnummer', category: 'order' },
    { name: 'invoice.date', description: 'Rechnungsdatum', category: 'date' },
    { name: 'invoice.dueDate', description: 'Fälligkeitsdatum', category: 'date' },
    { name: 'products', description: 'Produktliste', category: 'product' }
  ];
};

module.exports = mongoose.model('InvoiceTemplate', invoiceTemplateSchema);