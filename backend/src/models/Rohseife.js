const mongoose = require('mongoose');

const rohseifeSchema = new mongoose.Schema({
  bezeichnung: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  gesamtInGramm: {
    type: Number,
    required: true,
    min: 0,
    default: 1000
  },
  ekPreis: {
    type: Number,
    required: true,
    min: 0
  },
  preisPro10Gramm: {
    type: Number,
    required: true,
    min: 0
  },
  preisProGramm: {
    type: Number,
    required: true,
    min: 0
  },
  // Zusätzliche Felder für Verwaltung
  verfuegbar: {
    type: Boolean,
    default: true
  },
  farbe: {
    type: String,
    trim: true
  },
  beschreibung: {
    type: String,
    default: '',
    trim: true
  },
  lieferant: {
    type: String,
    default: '',
    trim: true
  },
  mindestbestand: {
    type: Number,
    default: 100
  },
  aktuellVorrat: {
    type: Number,
    default: 1000
  },
  // Metadaten
  letzteBeschaffung: {
    type: Date
  },
  naechsteBeschaffung: {
    type: Date
  }
}, {
  collection: 'rohseife',
  timestamps: true
});

// Berechnete Felder als virtuelle Properties
rohseifeSchema.virtual('kostenPro50g').get(function() {
  return this.preisPro10Gramm * 5;
});

rohseifeSchema.virtual('kostenPro100g').get(function() {
  return this.preisPro10Gramm * 10;
});

rohseifeSchema.virtual('vorratStatus').get(function() {
  if (this.aktuellVorrat <= this.mindestbestand) return 'kritisch';
  if (this.aktuellVorrat <= this.mindestbestand * 2) return 'niedrig';
  return 'ausreichend';
});

// Indizes für bessere Performance
rohseifeSchema.index({ bezeichnung: 1 });
rohseifeSchema.index({ ekPreis: 1 });
rohseifeSchema.index({ verfuegbar: 1 });

// Vor dem Speichern Preise automatisch berechnen
rohseifeSchema.pre('save', function(next) {
  if (this.isModified('ekPreis') || this.isModified('gesamtInGramm')) {
    this.preisProGramm = this.ekPreis / this.gesamtInGramm;
    this.preisPro10Gramm = this.preisProGramm * 10;
  }
  next();
});

module.exports = mongoose.model('Rohseife', rohseifeSchema);