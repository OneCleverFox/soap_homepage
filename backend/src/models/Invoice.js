const mongoose = require('mongoose');

const invoiceSchema = new mongoose.Schema({
  // Fortlaufende Rechnungsnummer (wichtig für Finanzamt)
  invoiceNumber: {
    type: String,
    required: true,
    unique: true
  },
  
  // Interne Nummer für Sequenz
  sequenceNumber: {
    type: Number,
    required: true,
    unique: true
  },
  
  // Kundendaten - entweder Referenz oder direkte Eingabe
  customer: {
    // Referenz zu bestehendem Kunden (optional)
    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Kunde'
    },
    
    // Kunde Daten (falls kein bestehender Kunde)
    customerData: {
      salutation: { type: String, enum: ['Herr', 'Frau', 'Firma'], default: 'Herr' },
      firstName: { type: String },
      lastName: { type: String },
      company: { type: String },
      street: { type: String, required: true },
      postalCode: { type: String, required: true },
      city: { type: String, required: true },
      country: { type: String, default: 'Deutschland' },
      email: { type: String },
      phone: { type: String }
    }
  },
  
  // Rechnungsprodukte
  items: [{
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product'
    },
    
    // Produktdaten zum Zeitpunkt der Rechnung (Snapshot)
    productData: {
      name: { type: String, required: true },
      description: { type: String },
      sku: { type: String },
      category: { type: String }
    },
    
    quantity: { type: Number, required: true, min: 1 },
    unitPrice: { type: Number, required: true, min: 0 },
    total: { type: Number, required: true, min: 0 }
  }],
  
  // Rechnungsbeträge
  amounts: {
    subtotal: { type: Number, required: true, min: 0 },
    shippingCost: { type: Number, default: 0, min: 0 },
    vatAmount: { type: Number, default: 0, min: 0 },
    vatRate: { type: Number, default: 19, min: 0, max: 100 },
    total: { type: Number, required: true, min: 0 }
  },
  
  // Rechnungsdaten
  dates: {
    invoiceDate: { type: Date, required: true, default: Date.now },
    dueDate: { type: Date, required: true },
    deliveryDate: { type: Date }
  },
  
  // Status der Rechnung
  status: {
    type: String,
    enum: ['draft', 'sent', 'paid', 'cancelled', 'overdue'],
    default: 'draft'
  },
  
  // Zahlungsinformationen
  payment: {
    method: { 
      type: String, 
      enum: ['bar', 'paypal', 'bank_transfer', 'pending'], 
      default: 'pending' 
    },
    paidDate: { type: Date },
    paidAmount: { type: Number, default: 0 },
    paymentReference: { type: String }
  },
  
  // Template das verwendet wurde
  template: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'InvoiceTemplate'
  },
  
  // Steuerliche Informationen
  tax: {
    isSmallBusiness: { type: Boolean, default: false },
    vatExempt: { type: Boolean, default: false }
  },
  
  // Zusätzliche Informationen
  notes: {
    internal: { type: String }, // Interne Notizen
    customer: { type: String }   // Notizen für Kunde
  },
  
  // Versandinformationen
  shipping: {
    method: { type: String },
    trackingNumber: { type: String },
    shippedDate: { type: Date }
  },
  
  // PDF-Dateipfad (falls gespeichert)
  pdfPath: { type: String },
  
  // Email-Versand
  emailSent: {
    sent: { type: Boolean, default: false },
    sentDate: { type: Date },
    sentTo: { type: String }
  }
  
}, {
  timestamps: true
});

// Index für bessere Performance - invoiceNumber und sequenceNumber werden automatisch durch unique: true erstellt
invoiceSchema.index({ 'customer.customerId': 1 });
invoiceSchema.index({ status: 1 });
invoiceSchema.index({ 'dates.invoiceDate': -1 });

// Automatische Berechnung der Summen vor dem Speichern
invoiceSchema.pre('save', function(next) {
  // Berechne Zwischensumme
  this.amounts.subtotal = this.items.reduce((sum, item) => {
    item.total = item.quantity * item.unitPrice;
    return sum + item.total;
  }, 0);
  
  // Berechne MwSt. (nur wenn kein Kleinunternehmer)
  if (!this.tax.isSmallBusiness && !this.tax.vatExempt) {
    this.amounts.vatAmount = (this.amounts.subtotal + this.amounts.shippingCost) * (this.amounts.vatRate / 100);
  } else {
    this.amounts.vatAmount = 0;
  }
  
  // Berechne Gesamtsumme
  this.amounts.total = this.amounts.subtotal + this.amounts.shippingCost + this.amounts.vatAmount;
  
  // Fälligkeitsdatum setzen (falls nicht gesetzt)
  if (!this.dates.dueDate) {
    const dueDate = new Date(this.dates.invoiceDate);
    dueDate.setDate(dueDate.getDate() + 14); // 14 Tage Standard
    this.dates.dueDate = dueDate;
  }
  
  next();
});

// Statische Methode für nächste Rechnungsnummer (fortlaufend mit Lücken-Auffüllung)
invoiceSchema.statics.getNextInvoiceNumber = async function(year) {
  const currentYear = year || new Date().getFullYear();
  
  // Finde alle existierenden Rechnungsnummern für das Jahr, sortiert
  const existingInvoices = await this.find({
    invoiceNumber: new RegExp(`^${currentYear}-`)
  }).sort({ sequenceNumber: 1 }).select('sequenceNumber invoiceNumber');
  
  const existingNumbers = existingInvoices.map(inv => inv.sequenceNumber);
  
  console.log('🔍 Existierende Rechnungsnummern:', existingNumbers);
  
  // Suche nach der ersten Lücke in der Sequenz
  let nextSequence = 1;
  for (let i = 0; i < existingNumbers.length; i++) {
    if (existingNumbers[i] !== nextSequence) {
      // Gefunden: Lücke bei nextSequence
      break;
    }
    nextSequence++;
  }
  
  const invoiceNumber = `${currentYear}-${String(nextSequence).padStart(6, '0')}`;
  
  console.log('📋 Nächste Rechnungsnummer:', invoiceNumber, '(Sequenz:', nextSequence + ')');
  
  return {
    invoiceNumber,
    sequenceNumber: nextSequence
  };
};

// Virtuelle Felder
invoiceSchema.virtual('customerName').get(function() {
  if (this.customer.customerData.company) {
    return this.customer.customerData.company;
  }
  return `${this.customer.customerData.firstName || ''} ${this.customer.customerData.lastName || ''}`.trim();
});

invoiceSchema.virtual('isOverdue').get(function() {
  return this.status !== 'paid' && new Date() > this.dates.dueDate;
});

invoiceSchema.virtual('daysPastDue').get(function() {
  if (this.status === 'paid' || new Date() <= this.dates.dueDate) return 0;
  return Math.ceil((new Date() - this.dates.dueDate) / (1000 * 60 * 60 * 24));
});

// Tostring für bessere Darstellung
invoiceSchema.methods.toString = function() {
  return `Invoice ${this.invoiceNumber} - ${this.customerName} - ${this.amounts.total.toFixed(2)}€`;
};

module.exports = mongoose.model('Invoice', invoiceSchema);