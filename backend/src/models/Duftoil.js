const mongoose = require('mongoose');

const duftoelSchema = new mongoose.Schema({
  bezeichnung: {
    type: String,
    required: true,
    unique: true, // Dies erstellt automatisch einen Index - entferne duplicaten schema.index()
    trim: true
  },
  gesamtInMl: {
    type: Number,
    required: true,
    min: 0,
    default: 15
  },
  ekPreis: {
    type: Number,
    required: true,
    min: 0
  },
  tropfenProMl: {
    type: Number,
    required: true,
    min: 0,
    default: 20
  },
  anzahlTropfen: {
    type: Number,
    required: true,
    min: 0
  },
  kostenProTropfen: {
    type: Number,
    required: true,
    min: 0
  },
  hersteller: {
    type: String,
    default: '',
    trim: true
  },
  
  produktlink: {
    type: String,
    default: '',
    trim: true
  },

  bild: {
    type: String,
    default: '',
    trim: true
  },

  // Zusätzliche Felder für Verwaltung
  verfuegbar: {
    type: Boolean,
    default: true
  },
  duftrichtung: {
    type: String,
    enum: ['blumig', 'frisch', 'holzig', 'süß', 'kräuterig', 'orientalisch', 'fruchtig'],
    default: 'blumig'
  },
  intensitaet: {
    type: String,
    enum: ['mild', 'mittel', 'stark'],
    default: 'mittel'
  },
  beschreibung: {
    type: String,
    default: '',
    trim: true
  },
  mindestbestand: {
    type: Number,
    default: 50 // Mindestanzahl Tropfen
  },
  aktuellVorrat: {
    type: Number,
    default: 300 // Aktuelle Anzahl Tropfen
  },
  // Anwendungshinweise
  empfohlungProSeife: {
    type: Number,
    default: 5, // Empfohlene Tropfenanzahl pro 100g Seife
    min: 1
  },
  maximalProSeife: {
    type: Number,
    default: 10, // Maximale Tropfenanzahl pro 100g Seife
    min: 1
  },
  // Lagerung
  haltbarkeitMonate: {
    type: Number,
    default: 24
  },
  lagertemperatur: {
    type: String,
    default: 'Raumtemperatur (15-25°C)'
  },
  // Metadaten
  letzteBeschaffung: {
    type: Date
  },
  naechsteBeschaffung: {
    type: Date
  }
}, {
  collection: 'duftoele',
  timestamps: true
});

// Berechnete Felder als virtuelle Properties
duftoelSchema.virtual('kostenPro5Tropfen').get(function() {
  return this.kostenProTropfen * 5;
});

duftoelSchema.virtual('kostenPro10Tropfen').get(function() {
  return this.kostenProTropfen * 10;
});

duftoelSchema.virtual('preisProMl').get(function() {
  return this.ekPreis / this.gesamtInMl;
});

duftoelSchema.virtual('vorratStatus').get(function() {
  if (this.aktuellVorrat <= this.mindestbestand) return 'kritisch';
  if (this.aktuellVorrat <= this.mindestbestand * 2) return 'niedrig';
  return 'ausreichend';
});

duftoelSchema.virtual('verfuegbarePortionen').get(function() {
  return Math.floor(this.aktuellVorrat / this.empfohlungProSeife);
});

// Neue Dosierungsberechnung: 1 Tropfen pro 50g Seife
duftoelSchema.virtual('tropfenProGramm').get(function() {
  return 1 / 50; // 1 Tropfen pro 50g = 0.02 Tropfen pro Gramm
});

// Berechnet Tropfenanzahl für beliebiges Seifengewicht
duftoelSchema.methods.berechneTropfenFuerGewicht = function(grammSeife) {
  const exakteTropfen = grammSeife * this.tropfenProGramm;
  return Math.ceil(exakteTropfen); // Aufrunden auf ganze Tropfen
};

// Berechnet Kosten für beliebiges Seifengewicht
duftoelSchema.methods.berechneKostenFuerGewicht = function(grammSeife) {
  const tropfenAnzahl = this.berechneTropfenFuerGewicht(grammSeife);
  return tropfenAnzahl * this.kostenProTropfen;
};

// Indizes für bessere Performance
// duftoelSchema.index({ bezeichnung: 1 }); // ENTFERNT - wird durch unique: true automatisch erstellt
duftoelSchema.index({ duftrichtung: 1 });
duftoelSchema.index({ verfuegbar: 1 });
duftoelSchema.index({ intensitaet: 1 });

// Vor dem Speichern automatische Berechnungen
duftoelSchema.pre('save', function(next) {
  // Anzahl Tropfen berechnen
  if (this.isModified('gesamtInMl') || this.isModified('tropfenProMl')) {
    this.anzahlTropfen = this.gesamtInMl * this.tropfenProMl;
  }
  
  // Kosten pro Tropfen berechnen
  if (this.isModified('ekPreis') || this.isModified('anzahlTropfen')) {
    this.kostenProTropfen = this.ekPreis / this.anzahlTropfen;
  }
  
  // Aktueller Vorrat initial setzen
  if (this.isNew && !this.aktuellVorrat) {
    this.aktuellVorrat = this.anzahlTropfen;
  }
  
  next();
});

module.exports = mongoose.model('Duftoil', duftoelSchema);