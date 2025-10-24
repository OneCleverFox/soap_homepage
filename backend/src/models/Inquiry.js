const mongoose = require('mongoose');

const inquirySchema = new mongoose.Schema({
  // Eindeutige Anfrage-ID
  inquiryId: {
    type: String,
    required: true,
    unique: true
  },
  
  // Kundendaten
  customer: {
    id: {
      type: String,
      required: true
    },
    name: {
      type: String,
      required: true
    },
    email: {
      type: String,
      required: true
    }
  },
  
  // Artikel in der Anfrage
  items: [{
    productId: {
      type: String,
      required: true
    },
    produktType: {
      type: String,
      enum: ['rohseife', 'duftoil', 'verpackung', 'standard'],
      default: 'rohseife'
    },
    name: {
      type: String,
      required: true
    },
    quantity: {
      type: Number,
      required: true,
      min: 1
    },
    price: {
      type: Number,
      required: true
    },
    image: String
  }],
  
  // Gesamtsumme
  total: {
    type: Number,
    required: true
  },
  
  // Adressen
  rechnungsadresse: {
    vorname: String,
    nachname: String,
    strasse: String,
    hausnummer: String,
    zusatz: String,
    plz: String,
    stadt: String,
    land: { type: String, default: 'Deutschland' }
  },
  
  lieferadresse: {
    anders: { type: Boolean, default: false },
    vorname: String,
    nachname: String,
    strasse: String,
    hausnummer: String,
    zusatz: String,
    plz: String,
    stadt: String,
    land: { type: String, default: 'Deutschland' }
  },
  
  // Notizen vom Kunden
  customerNote: {
    type: String,
    maxlength: 1000
  },
  
  // Status der Anfrage
  status: {
    type: String,
    enum: ['pending', 'accepted', 'rejected', 'converted_to_order', 'payment_pending', 'paid'],
    default: 'pending'
  },
  
  // Zahlungsinformationen
  payment: {
    status: {
      type: String,
      enum: ['not_required', 'pending', 'completed', 'failed'],
      default: 'not_required'
    },
    paypalOrderId: String,
    paidAt: Date,
    amount: Number
  },
  
  // Admin-Antwort
  adminResponse: {
    message: String,
    respondedBy: String,
    respondedAt: Date
  },
  
  // Wenn angenommen, wird zur Bestellung konvertiert
  convertedOrderId: String,
  
  // Zeitstempel
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

// Index für bessere Performance
inquirySchema.index({ 'customer.id': 1 });
inquirySchema.index({ status: 1 });
inquirySchema.index({ createdAt: -1 });

// Virtuelle Felder
inquirySchema.virtual('isPending').get(function() {
  return this.status === 'pending';
});

inquirySchema.virtual('isProcessed').get(function() {
  return ['accepted', 'rejected', 'converted_to_order'].includes(this.status);
});

// Middleware für updatedAt
inquirySchema.pre('save', function() {
  this.updatedAt = new Date();
});

// Statische Methode für Inquiry-ID Generation
inquirySchema.statics.generateInquiryId = function() {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substr(2, 5);
  return `INQ-${timestamp}-${random}`.toUpperCase();
};

module.exports = mongoose.model('Inquiry', inquirySchema);