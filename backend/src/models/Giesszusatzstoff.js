const mongoose = require('mongoose');

const giesszusatzstoffSchema = new mongoose.Schema({
  bezeichnung: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  typ: {
    type: String,
    required: true,
    enum: ['wasser', 'verduenner', 'haertungsagent', 'pigment', 'additiv', 'release_agent', 'stabilisator', 'sonstiges'],
    default: 'sonstiges'
  },
  kategorie: {
    type: String,
    enum: ['fluessig', 'pulver', 'pastoes', 'granulat'],
    default: 'fluessig'
  },
  
  // Beschreibung und Verwendung
  beschreibung: {
    type: String,
    trim: true,
    default: ''
  },
  verwendungszweck: {
    type: String,
    trim: true,
    default: ''
  },
  
  // Lager- und Bestandsdaten
  aktuellerBestand: {
    type: Number,
    required: true,
    default: 0,
    min: 0
  },
  einheit: {
    type: String,
    required: true,
    enum: ['kg', 'g', 'l', 'ml', 'm3', 'stueck', 'packung'],
    default: 'ml'
  },
  mindestbestand: {
    type: Number,
    default: 0,
    min: 0
  },
  maximalbestand: {
    type: Number,
    default: null,
    min: 0
  },
  
  // Spezial-Flag für unbegrenzte Ressourcen wie Wasser
  unbegrenzterVorrat: {
    type: Boolean,
    default: false
  },
  
  // Preise
  preis_pro_einheit: {
    type: Number,
    default: 0,
    min: 0
  },
  waehrung: {
    type: String,
    default: 'EUR'
  },
  
  // Lieferant und Artikel-Details
  lieferant: {
    type: String,
    trim: true,
    default: ''
  },
  artikelnummer: {
    type: String,
    trim: true,
    default: ''
  },
  chargenNr: {
    type: String,
    trim: true,
    default: ''
  },
  
  // Lager-Eigenschaften
  lagerort: {
    type: String,
    trim: true,
    default: ''
  },
  haltbarkeitsdatum: {
    type: Date,
    default: null
  },
  gefahrenstoff: {
    type: Boolean,
    default: false
  },
  lagerungshinweise: {
    type: String,
    trim: true,
    default: ''
  },
  
  // Status und Meta
  verfuegbar: {
    type: Boolean,
    default: true
  },
  notizen: {
    type: String,
    trim: true,
    default: ''
  },
  
  // Timestamps
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

// Virtuelle Felder
giesszusatzstoffSchema.virtual('istKnapp').get(function() {
  return this.aktuellerBestand <= this.mindestbestand;
});

giesszusatzstoffSchema.virtual('wert').get(function() {
  return this.aktuellerBestand * this.preis_pro_einheit;
});

// Middleware für Aktualisierung des updatedAt-Feldes
giesszusatzstoffSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Index für bessere Performance
giesszusatzstoffSchema.index({ typ: 1 });
giesszusatzstoffSchema.index({ verfuegbar: 1 });
giesszusatzstoffSchema.index({ aktuellerBestand: 1 });

module.exports = mongoose.model('Giesszusatzstoff', giesszusatzstoffSchema);