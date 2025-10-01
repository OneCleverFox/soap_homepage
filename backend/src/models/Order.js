const mongoose = require('mongoose');

const orderItemSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true
  },
  quantity: {
    type: Number,
    required: true,
    min: [1, 'Menge muss mindestens 1 sein']
  },
  price: {
    type: Number,
    required: true,
    min: [0, 'Preis muss positiv sein']
  },
  // Produktdaten zum Zeitpunkt der Bestellung (für historische Zwecke)
  productSnapshot: {
    name: String,
    description: String,
    category: String,
    image: String
  }
});

const orderSchema = new mongoose.Schema({
  orderNumber: {
    type: String,
    required: true
  },
  customer: {
    email: {
      type: String,
      required: [true, 'Kunden-E-Mail ist erforderlich'],
      lowercase: true
    },
    firstName: {
      type: String,
      required: [true, 'Vorname ist erforderlich'],
      trim: true
    },
    lastName: {
      type: String,
      required: [true, 'Nachname ist erforderlich'],
      trim: true
    },
    phone: {
      type: String,
      trim: true
    }
  },
  billingAddress: {
    street: {
      type: String,
      required: [true, 'Straße ist erforderlich']
    },
    houseNumber: {
      type: String,
      required: [true, 'Hausnummer ist erforderlich']
    },
    zipCode: {
      type: String,
      required: [true, 'PLZ ist erforderlich']
    },
    city: {
      type: String,
      required: [true, 'Stadt ist erforderlich']
    },
    country: {
      type: String,
      required: [true, 'Land ist erforderlich'],
      default: 'Deutschland'
    }
  },
  shippingAddress: {
    street: String,
    houseNumber: String,
    zipCode: String,
    city: String,
    country: String,
    // Falls abweichend von Rechnungsadresse
    isDifferent: {
      type: Boolean,
      default: false
    }
  },
  items: [orderItemSchema],
  pricing: {
    subtotal: {
      type: Number,
      required: true,
      min: [0, 'Zwischensumme muss positiv sein']
    },
    shippingCost: {
      type: Number,
      default: 0,
      min: [0, 'Versandkosten müssen positiv sein']
    },
    taxAmount: {
      type: Number,
      default: 0,
      min: [0, 'Steuerbetrag muss positiv sein']
    },
    discount: {
      amount: {
        type: Number,
        default: 0,
        min: [0, 'Rabattbetrag muss positiv sein']
      },
      code: String,
      reason: String
    },
    total: {
      type: Number,
      required: true,
      min: [0, 'Gesamtbetrag muss positiv sein']
    }
  },
  status: {
    type: String,
    enum: {
      values: ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded'],
      message: 'Ungültiger Bestellstatus'
    },
    default: 'pending'
  },
  payment: {
    method: {
      type: String,
      enum: ['paypal', 'stripe', 'bank_transfer', 'cash_on_delivery'],
      required: true
    },
    status: {
      type: String,
      enum: ['pending', 'completed', 'failed', 'refunded'],
      default: 'pending'
    },
    transactionId: String,
    paidAt: Date
  },
  shipping: {
    method: {
      type: String,
      enum: ['standard', 'express', 'pickup'],
      default: 'standard'
    },
    trackingNumber: String,
    estimatedDelivery: Date,
    shippedAt: Date,
    deliveredAt: Date
  },
  notes: {
    customer: String, // Kundennotizen
    internal: String  // Interne Notizen
  },
  statusHistory: [{
    status: String,
    timestamp: {
      type: Date,
      default: Date.now
    },
    note: String,
    updatedBy: String // Admin/System
  }]
}, {
  timestamps: true
});

// Unique Index für orderNumber
orderSchema.index({ orderNumber: 1 }, { unique: true });

// Virtual für Vollständiger Kundenname
orderSchema.virtual('customer.fullName').get(function() {
  return `${this.customer.firstName} ${this.customer.lastName}`;
});

// Pre-save Hook für Bestellnummer-Generierung
orderSchema.pre('save', async function(next) {
  if (this.isNew && !this.orderNumber) {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    
    // Zähle Bestellungen des heutigen Tages
    const todayStart = new Date(year, date.getMonth(), date.getDate());
    const todayEnd = new Date(year, date.getMonth(), date.getDate() + 1);
    
    const todayOrdersCount = await this.constructor.countDocuments({
      createdAt: { $gte: todayStart, $lt: todayEnd }
    });
    
    const orderCounter = String(todayOrdersCount + 1).padStart(3, '0');
    this.orderNumber = `GM-${year}${month}${day}-${orderCounter}`;
  }
  next();
});

// Methode für Status-Update mit History
orderSchema.methods.updateStatus = function(newStatus, note = '', updatedBy = 'System') {
  this.statusHistory.push({
    status: this.status,
    note: note,
    updatedBy: updatedBy
  });
  
  this.status = newStatus;
  
  // Spezielle Aktionen basierend auf Status
  if (newStatus === 'shipped' && !this.shipping.shippedAt) {
    this.shipping.shippedAt = new Date();
  }
  
  if (newStatus === 'delivered' && !this.shipping.deliveredAt) {
    this.shipping.deliveredAt = new Date();
  }
  
  if (newStatus === 'confirmed' && this.payment.status === 'pending') {
    this.payment.status = 'completed';
    this.payment.paidAt = new Date();
  }
  
  return this.save();
};

// Methode zur Berechnung der Gesamtsumme
orderSchema.methods.calculateTotal = function() {
  const subtotal = this.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const total = subtotal + this.pricing.shippingCost + this.pricing.taxAmount - this.pricing.discount.amount;
  
  this.pricing.subtotal = subtotal;
  this.pricing.total = Math.max(0, total); // Stelle sicher, dass Total nicht negativ ist
  
  return this.pricing.total;
};

module.exports = mongoose.model('Order', orderSchema);