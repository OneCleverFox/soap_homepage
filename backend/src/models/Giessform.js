const mongoose = require('mongoose');

const giessformSchema = new mongoose.Schema({
  inventarnummer: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    uppercase: true // Automatisch in Großbuchstaben für Konsistenz
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  form: {
    type: String,
    required: true,
    enum: ['rund', 'oval', 'quadratisch', 'rechteckig', 'herz', 'stern', 'blume', 'tier', 'figur', 'abstrakt', 'sonstiges'],
    default: 'sonstiges'
  },
  // Volumen und Abmessungen
  volumenMl: {
    type: Number,
    required: true,
    min: 1
  },
  tiefeMm: {
    type: Number,
    required: true,
    min: 1
  },
  laengeMm: {
    type: Number,
    required: false,
    min: 1
  },
  breiteMm: {
    type: Number,
    required: false,
    min: 1
  },
  durchmesserMm: {
    type: Number,
    required: false,
    min: 1
  },
  
  // Material und Eigenschaften
  material: {
    type: String,
    required: true,
    enum: ['silikon', 'kunststoff', 'gummi', 'metall', 'keramik', 'gips', 'sonstiges'],
    default: 'silikon'
  },
  qualitaet: {
    type: String,
    enum: ['professionell', 'hobby', 'einweg'],
    default: 'hobby'
  },
  flexibilitaet: {
    type: String,
    enum: ['sehr_flexibel', 'flexibel', 'starr'],
    default: 'flexibel'
  },
  
  // Wirtschaftliche Daten
  anschaffungskosten: {
    type: Number,
    required: true,
    min: 0
  },
  anschaffungsdatum: {
    type: Date,
    default: Date.now
  },
  inventarisiertAm: {
    type: Date,
    required: true,
    default: Date.now
  },
  lieferant: {
    type: String,
    trim: true,
    default: ''
  },
  produktlink: {
    type: String,
    trim: true,
    default: ''
  },
  bild: {
    type: String, // base64 encoded image
    default: ''
  },
  
  // Zustand und Verfügbarkeit (immer neu bei Anschaffung)
  zustand: {
    type: String,
    default: 'neu',
    immutable: true // Kann nach Erstellung nicht mehr geändert werden
  },
  verfuegbar: {
    type: Boolean,
    default: true
  },
  ausgeliehen: {
    type: Boolean,
    default: false
  },
  ausleiher: {
    type: String,
    trim: true,
    default: ''
  },
  
  // Verwendungsstatistik
  verwendungsanzahl: {
    type: Number,
    default: 0,
    min: 0
  },
  maxVerwendungen: {
    type: Number,
    default: 1000, // Geschätzte Lebensdauer
    min: 1
  },
  
  // Kategorisierung und Suchoptimierung
  kategorie: {
    type: String,
    enum: ['dekoration', 'geschenke', 'schmuck', 'figuren', 'praktisch', 'saisonal', 'sonstiges'],
    default: 'dekoration'
  },
  tags: [{
    type: String,
    trim: true
  }],
  
  // Pflege und Wartung
  pflegehinweise: {
    type: String,
    default: '',
    trim: true
  },
  letzteReinigung: {
    type: Date
  },
  wartungsintervall: {
    type: Number,
    default: 30, // Tage
    min: 1
  },
  
  // Lagerung
  lagerort: {
    type: String,
    default: '',
    trim: true
  },
  lagerregal: {
    type: String,
    default: '',
    trim: true
  },
  
  // Notizen und Beschreibung
  beschreibung: {
    type: String,
    default: '',
    trim: true
  },
  besonderheiten: {
    type: String,
    default: '',
    trim: true
  },
  notizen: {
    type: String,
    default: '',
    trim: true
  }
}, {
  timestamps: true, // Erstellt automatisch createdAt und updatedAt
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtuelle Felder für berechnete Werte
giessformSchema.virtual('kostenProVerwendung').get(function() {
  return this.verwendungsanzahl > 0 ? (this.anschaffungskosten / this.verwendungsanzahl).toFixed(4) : this.anschaffungskosten;
});

giessformSchema.virtual('restlebensdauer').get(function() {
  return Math.max(0, this.maxVerwendungen - this.verwendungsanzahl);
});

giessformSchema.virtual('abnutzungsProzent').get(function() {
  return this.maxVerwendungen > 0 ? ((this.verwendungsanzahl / this.maxVerwendungen) * 100).toFixed(1) : 0;
});

giessformSchema.virtual('alterInTagen').get(function() {
  const heute = new Date();
  const differenz = heute - this.inventarisiertAm;
  return Math.floor(differenz / (1000 * 60 * 60 * 24));
});

giessformSchema.virtual('inventarnummerFormatiert').get(function() {
  return this.inventarnummer.replace(/(\w{2})(\d{3})/, '$1-$2'); // z.B. GF-001
});

// Indices für bessere Performance
giessformSchema.index({ verfuegbar: 1, ausgeliehen: 1 });
giessformSchema.index({ form: 1, kategorie: 1 });
giessformSchema.index({ volumenMl: 1 });
giessformSchema.index({ tags: 1 });

// Pre-save Middleware für Datenvalidierung
giessformSchema.pre('save', function(next) {
  // Inventarnummer formatieren
  this.inventarnummer = this.inventarnummer.toUpperCase().replace(/[^A-Z0-9]/g, '');
  
  // Tags bereinigen
  if (this.tags) {
    this.tags = this.tags.map(tag => tag.toLowerCase().trim()).filter(tag => tag.length > 0);
  }
  
  // Verwendungsanzahl nicht größer als Maximum
  if (this.verwendungsanzahl > this.maxVerwendungen) {
    this.verwendungsanzahl = this.maxVerwendungen;
  }
  
  // Inventarisierungsdatum gleich Anschaffungsdatum setzen falls nicht explizit gesetzt
  if (!this.inventarisiertAm && this.anschaffungsdatum) {
    this.inventarisiertAm = this.anschaffungsdatum;
  }
  
  next();
});

// Statische Methoden
giessformSchema.statics.findVerfuegbare = function() {
  return this.find({ verfuegbar: true, ausgeliehen: false }).lean();
};

giessformSchema.statics.findByVolumen = function(minVol, maxVol) {
  return this.find({
    volumenMl: { $gte: minVol, $lte: maxVol },
    verfuegbar: true,
    ausgeliehen: false
  }).lean();
};

giessformSchema.statics.findByForm = function(formType) {
  return this.find({ form: formType, verfuegbar: true, ausgeliehen: false }).lean();
};

// Instance-Methoden
giessformSchema.methods.verwendungHinzufuegen = function() {
  this.verwendungsanzahl += 1;
  return this.save();
};

giessformSchema.methods.ausleihen = function(ausleiherName) {
  this.ausgeliehen = true;
  this.ausleiher = ausleiherName;
  return this.save();
};

giessformSchema.methods.zurueckgeben = function() {
  this.ausgeliehen = false;
  this.ausleiher = '';
  return this.save();
};

giessformSchema.methods.reinigen = function() {
  this.letzteReinigung = new Date();
  return this.save();
};

module.exports = mongoose.model('Giessform', giessformSchema);