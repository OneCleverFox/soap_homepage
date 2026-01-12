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
    required: false,  // Optional für Werkstücke
    default: ''
  },
  // Werkstück-spezifische Felder
  kategorie: {
    type: String,
    enum: ['seife', 'werkstuck'],
    default: 'seife'
  },
  giesswerkstoff: {
    type: String,
    required: false
  },
  giesswerkstoffName: {
    type: String,
    required: false
  },
  giessform: {
    type: String, 
    required: false
  },
  giessformName: {
    type: String,
    required: false
  }
}, { _id: false });

const cartSchema = new mongoose.Schema({
  kundeId: {
    type: String, // Geändert von ObjectId zu String für JWT-basierte User-IDs
    required: true,
    unique: true // Dies erstellt automatisch einen Index - entferne duplicaten schema.index()
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
// cartSchema.index({ kundeId: 1 }); // ENTFERNT - wird durch unique: true automatisch erstellt

// Middleware um aktualisiertAm zu aktualisieren
cartSchema.pre('save', function(next) {
  this.aktualisiertAm = new Date();
  next();
});

module.exports = mongoose.model('Cart', cartSchema, 'warenkorb');
