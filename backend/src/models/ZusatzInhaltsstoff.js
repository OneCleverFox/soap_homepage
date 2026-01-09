const mongoose = require('mongoose');

/**
 * ZusatzInhaltsstoff-Schema für zusätzliche Inhaltsstoffe wie Aktivkohle, Peeling-Stoffe, etc.
 */
const zusatzInhaltsstoffSchema = new mongoose.Schema({
  bezeichnung: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  
  // Typ des Zusatzstoffs
  typ: {
    type: String,
    enum: ['aktivkohle', 'peeling', 'farbe', 'duftstoff', 'pflegend', 'sonstiges'],
    required: true
  },
  
  // Beschreibung und Wirkung
  beschreibung: {
    type: String,
    default: '',
    trim: true
  },
  
  wirkung: {
    type: String,
    default: '',
    trim: true
  },
  
  // Preisstruktur
  ekPreis: {
    type: Number,
    required: true,
    min: 0
  },
  
  // Gebindegröße (Referenzmenge)
  gesamtInGramm: {
    type: Number,
    required: true,
    min: 0,
    default: 100 // Standard 100g Packung
  },
  
  // Berechnete Preise
  preisProGramm: {
    type: Number,
    required: true,
    min: 0
  },
  
  preisPro10Gramm: {
    type: Number,
    required: true,
    min: 0
  },
  
  // Anwendungsrichtlinien
  dosierung: {
    empfohleneProzentzahl: {
      type: Number,
      default: 5, // Standard 5% vom Gesamtgewicht
      min: 0,
      max: 100
    },
    maximaleMenge: {
      type: Number,
      default: 10, // Max 10g pro 100g Seife
      min: 0
    },
    hinweise: {
      type: String,
      default: '',
      trim: true
    }
  },
  
  // Neue Dosierungsfelder (in Gramm pro 10g Seife)
  minDosierung: {
    type: Number,
    default: 0.1,
    min: 0
  },
  
  empfohleneDosierung: {
    type: Number,
    default: 0.5,
    min: 0
  },
  
  maxDosierung: {
    type: Number,
    default: 1.0,
    min: 0
  },
  
  // Physische Eigenschaften
  eigenschaften: {
    farbe: {
      type: String,
      default: '',
      trim: true
    },
    textur: {
      type: String,
      enum: ['pulver', 'granulat', 'flocken', 'flüssig', 'paste', 'sonstiges'],
      default: 'pulver'
    },
    wasserlöslichkeit: {
      type: String,
      enum: ['wasserlöslich', 'fettlöslich', 'unlöslich', 'teilweise'],
      default: 'unlöslich'
    },
    korngroesse: {
      type: String,
      default: '', // z.B. "0,1-0,5mm" für Peelings
      trim: true
    }
  },
  
  // Lagerung und Haltbarkeit
  lagerung: {
    temperatur: {
      type: String,
      default: 'Raumtemperatur',
      trim: true
    },
    lichtschutz: {
      type: Boolean,
      default: false
    },
    luftdicht: {
      type: Boolean,
      default: true
    },
    haltbarkeitMonate: {
      type: Number,
      default: 24,
      min: 1
    }
  },
  
  // Lieferanteninformationen
  lieferant: {
    type: String,
    default: '',
    trim: true
  },
  
  produktlink: {
    type: String,
    default: '',
    trim: true
  },
  
  // Mindestbestand für Warnungen
  mindestbestand: {
    type: Number,
    default: 50, // 50g
    min: 0
  },
  
  // Verfügbarkeit
  verfuegbar: {
    type: Boolean,
    default: true
  },
  
  // Sicherheitshinweise
  sicherheit: {
    allergenhinweise: {
      type: String,
      default: '',
      trim: true
    },
    hautvertraeglichkeit: {
      type: String,
      enum: ['sehr gut', 'gut', 'mäßig', 'unbekannt'],
      default: 'unbekannt'
    },
    besondereHinweise: {
      type: String,
      default: '',
      trim: true
    }
  },
  
  // Kategorien für Filterung
  kategorien: [{
    type: String,
    trim: true
  }],
  
  // Metadaten
  erstelltAm: {
    type: Date,
    default: Date.now
  },
  
  aktualisiertAm: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Pre-save Middleware für automatische Preisberechnung
zusatzInhaltsstoffSchema.pre('save', function(next) {
  if (this.isModified('ekPreis') || this.isModified('gesamtInGramm')) {
    this.preisProGramm = this.ekPreis / this.gesamtInGramm;
    this.preisPro10Gramm = (this.ekPreis / this.gesamtInGramm) * 10;
  }
  this.aktualisiertAm = new Date();
  next();
});

// Virtuelle Felder
zusatzInhaltsstoffSchema.virtual('kostenProProzent').get(function() {
  // Berechnet Kosten für 1% Zusatz bei 100g Seife
  return this.preisProGramm * 1; // 1g = 1% bei 100g Seife
});

// Indexe für Performance
zusatzInhaltsstoffSchema.index({ typ: 1, verfuegbar: 1 });
zusatzInhaltsstoffSchema.index({ bezeichnung: 'text', beschreibung: 'text' });

// Instanzmethoden
zusatzInhaltsstoffSchema.methods.berechneMenge = function(seifeGewichtGramm, prozentSatz) {
  return (seifeGewichtGramm * prozentSatz) / 100;
};

zusatzInhaltsstoffSchema.methods.berechneKosten = function(seifeGewichtGramm, prozentSatz) {
  const menge = this.berechneMenge(seifeGewichtGramm, prozentSatz);
  return menge * this.preisProGramm;
};

const ZusatzInhaltsstoff = mongoose.model('ZusatzInhaltsstoff', zusatzInhaltsstoffSchema);

module.exports = ZusatzInhaltsstoff;