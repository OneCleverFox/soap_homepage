const mongoose = require('mongoose');

const cartItemSchema = new mongoose.Schema({
  produktId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Portfolio',
    required: true
  },
  name: {
    type: String,
    required: true
  },
  preis: {
    type: Number,
    required: true,
    min: 0
  },
  menge: {
    type: Number,
    required: true,
    min: 1,
    default: 1
  },
  bild: {
    type: String,
    default: ''
  },
  gramm: {
    type: Number,
    required: true
  },
  seife: {
    type: String,
    required: true
  }
}, { _id: false });

const cartSchema = new mongoose.Schema({
  kundeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Kunde',
    required: true,
    unique: true
  },
  artikel: [cartItemSchema],
  aktualisiertAm: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Index für schnellere Abfragen
cartSchema.index({ kundeId: 1 });

// Middleware um aktualisiertAm zu aktualisieren
cartSchema.pre('save', function(next) {
  this.aktualisiertAm = new Date();
  next();
});

module.exports = mongoose.model('Cart', cartSchema, 'warenkorb');
