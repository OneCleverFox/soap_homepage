const mongoose = require('mongoose');

const verpackungSchema = new mongoose.Schema({
  bezeichnung: {
    type: String,
    required: true,
    unique: true, // Dies erstellt automatisch einen Index - entferne duplicaten schema.index()
    trim: true
  },
  menge: {
    type: Number,
    required: true,
    min: 1
  },
  kostenInEuro: {
    type: Number,
    required: true,
    min: 0
  },
  kostenProStueck: {
    type: Number,
    required: true,
    min: 0
  },
  hersteller: {
    type: String,
    default: '',
    trim: true
  },
  // Zusätzliche Felder für bessere Verwaltung
  verfuegbar: {
    type: Boolean,
    default: true
  },
  aktuellVorrat: {
    type: Number,
    default: 0, // Aktuell verfügbare Stückzahl
    min: 0
  },
  mindestbestand: {
    type: Number,
    default: 10, // Mindestbestand für Warnung
    min: 0
  },
  // Verpackungsdetails
  form: {
    type: String,
    enum: ['viereck', 'länglich', 'tüte', 'dose', 'schachtel', 'beutel', 'sonstiges'],
    default: 'sonstiges'
  },
  groesse: {
    type: String,
    default: '', // z.B. "9x13", "100g", etc.
    trim: true
  },
  material: {
    type: String,
    enum: ['karton', 'plastik', 'papier', 'glas', 'metall', 'stoff', 'sonstiges'],
    default: 'sonstiges'
  },
  farbe: {
    type: String,
    default: '',
    trim: true
  },
  // Lagerung und Verwaltung
  lagerort: {
    type: String,
    default: '',
    trim: true
  },
  letzteBeschaffung: {
    type: Date
  },
  naechsteBeschaffung: {
    type: Date
  },
  lieferant: {
    type: String,
    default: '',
    trim: true
  },
  bestellnummer: {
    type: String,
    default: '',
    trim: true
  },
  // Verwendungshinweise
  geeignetFuer: {
    type: [String], // Array von Produkttypen
    default: []
  },
  maximalGewicht: {
    type: Number, // Maximales Seifengewicht in Gramm
    default: 0
  },
  notizen: {
    type: String,
    default: '',
    trim: true
  }
}, {
  collection: 'verpackungen',
  timestamps: true
});

// Berechnete Felder als virtuelle Properties
verpackungSchema.virtual('kostenProEinheit').get(function() {
  return this.kostenProStueck;
});

verpackungSchema.virtual('gesamtwert').get(function() {
  return this.aktuellVorrat * this.kostenProStueck;
});

verpackungSchema.virtual('vorratStatus').get(function() {
  if (this.aktuellVorrat <= 0) return 'leer';
  if (this.aktuellVorrat <= this.mindestbestand) return 'kritisch';
  if (this.aktuellVorrat <= this.mindestbestand * 2) return 'niedrig';
  return 'ausreichend';
});

verpackungSchema.virtual('verfuegbareStueck').get(function() {
  return this.aktuellVorrat;
});

// Methoden für Berechnungen
verpackungSchema.methods.berechneKostenFuerAnzahl = function(anzahl) {
  return anzahl * this.kostenProStueck;
};

verpackungSchema.methods.kannLiefern = function(benoetigteAnzahl) {
  return this.aktuellVorrat >= benoetigteAnzahl && this.verfuegbar;
};

verpackungSchema.methods.reduziereVorrat = function(anzahl) {
  if (this.aktuellVorrat >= anzahl) {
    this.aktuellVorrat -= anzahl;
    return true;
  }
  return false;
};

verpackungSchema.methods.erhoeheVorrat = function(anzahl) {
  this.aktuellVorrat += anzahl;
  if (anzahl > 0) {
    this.letzteBeschaffung = new Date();
  }
};

// Indizes für bessere Performance
// verpackungSchema.index({ bezeichnung: 1 }); // ENTFERNT - wird durch unique: true automatisch erstellt
verpackungSchema.index({ form: 1 });
verpackungSchema.index({ verfuegbar: 1 });
verpackungSchema.index({ vorratStatus: 1 });

// Vor dem Speichern automatische Berechnungen
verpackungSchema.pre('save', function(next) {
  // Kosten pro Stück berechnen falls nicht vorhanden
  if (this.isModified('kostenInEuro') || this.isModified('menge')) {
    if (this.menge > 0) {
      this.kostenProStueck = parseFloat((this.kostenInEuro / this.menge).toFixed(4));
    }
  }
  
  // Form aus Bezeichnung ableiten falls nicht gesetzt
  if (this.isModified('bezeichnung') && this.form === 'sonstiges') {
    const bez = this.bezeichnung.toLowerCase();
    if (bez.includes('viereck')) this.form = 'viereck';
    else if (bez.includes('länglich')) this.form = 'länglich';
    else if (bez.includes('tüte')) this.form = 'tüte';
    else if (bez.includes('dose')) this.form = 'dose';
    else if (bez.includes('schachtel')) this.form = 'schachtel';
  }
  
  // Größe aus Bezeichnung extrahieren falls nicht gesetzt
  if (this.isModified('bezeichnung') && !this.groesse) {
    const sizeMatch = this.bezeichnung.match(/(\d+[x×]\d+|\d+g|\d+ml)/i);
    if (sizeMatch) {
      this.groesse = sizeMatch[1];
    }
  }
  
  next();
});

module.exports = mongoose.model('Verpackung', verpackungSchema);