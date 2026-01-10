const mongoose = require('mongoose');

const giesswerkstoffSchema = new mongoose.Schema({
  bezeichnung: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  typ: {
    type: String,
    required: true,
    enum: ['gips', 'beton', 'epoxidharz', 'polyurethan', 'silikon', 'wachs', 'ton', 'keramikschlicker', 'sonstiges'],
    default: 'gips'
  },
  kategorie: {
    type: String,
    enum: ['rohstoff', 'fertigmischung', 'zusatzstoff', 'haertungsagent', 'pigment', 'release_agent'],
    default: 'rohstoff'
  },
  
  // Physikalische Eigenschaften
  konsistenz: {
    type: String,
    enum: ['pulver', 'fluessig', 'pastoes', 'fest', 'gel'],
    default: 'pulver'
  },
  farbe: {
    type: String,
    default: 'weiß',
    trim: true
  },
  dichte: {
    type: Number,
    min: 0,
    default: null // g/cm³
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
    enum: ['kg', 'g', 'l', 'ml', 'stueck', 'packung'],
    default: 'kg'
  },
  mindestbestand: {
    type: Number,
    required: true,
    default: 1,
    min: 0
  },
  maximalbestand: {
    type: Number,
    default: 100,
    min: 0
  },
  
  // Wirtschaftliche Daten
  einkaufspreis: {
    type: Number,
    required: true,
    min: 0
  },
  preisProEinheit: {
    type: Number,
    required: true,
    min: 0
  },
  waehrung: {
    type: String,
    default: 'EUR',
    enum: ['EUR', 'USD', 'CHF', 'GBP']
  },
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
  
  // Mischungseigenschaften
  mischverhaeltnisse: [{
    partnerStoff: {
      type: String,
      trim: true
    },
    verhaeltnisBasis: {
      type: Number,
      min: 0,
      default: 1
    },
    verhaeltnisPartner: {
      type: Number, 
      min: 0,
      default: 1
    },
    bemerkung: {
      type: String,
      trim: true,
      default: ''
    }
  }],
  
  // Standard-Mischverhältnis (häufigste Verwendung)
  standardMischung: {
    wasserVerhaeltnis: {
      type: Number,
      min: 0,
      default: null // z.B. 0.5 für 1:0.5 Verhältnis
    },
    zusatzstoffe: [{
      bezeichnung: {
        type: String,
        trim: true
      },
      anteil: {
        type: Number,
        min: 0 // Anteil in Prozent
      },
      einheit: {
        type: String,
        enum: ['prozent', 'gramm_pro_kg', 'ml_pro_l'],
        default: 'prozent'
      }
    }]
  },
  
  // Verarbeitungszeiten
  verarbeitungszeit: {
    topfzeit: {
      type: Number,
      default: null // Minuten
    },
    haertungszeit: {
      type: Number,
      default: null // Minuten bis entformbar
    },
    vollhaertung: {
      type: Number,
      default: null // Stunden bis vollständig ausgehärtet
    }
  },
  
  // Qualitätseigenschaften
  eigenschaften: {
    haerte: {
      type: String,
      enum: ['sehr_weich', 'weich', 'mittel', 'hart', 'sehr_hart'],
      default: 'mittel'
    },
    oberflaeche: {
      type: String,
      enum: ['glatt', 'rau', 'poroes', 'strukturiert'],
      default: 'glatt'
    },
    schrumpf: {
      type: Number,
      default: null // Prozent Schrumpfung
    },
    wasserfest: {
      type: Boolean,
      default: false
    },
    uv_bestaendig: {
      type: Boolean,
      default: false
    }
  },
  
  // Lagerung und Haltbarkeit
  lagerung: {
    temperaturMin: {
      type: Number,
      default: null // °C
    },
    temperaturMax: {
      type: Number,
      default: null // °C
    },
    luftfeuchtigkeit: {
      type: String,
      default: '',
      trim: true
    },
    haltbarkeitMonate: {
      type: Number,
      default: 12,
      min: 1
    },
    lagerort: {
      type: String,
      default: '',
      trim: true
    }
  },
  
  // Sicherheit und Gesundheit
  sicherheit: {
    gefahrenstoff: {
      type: Boolean,
      default: false
    },
    hPictogramme: [{
      type: String,
      enum: ['GHS01', 'GHS02', 'GHS03', 'GHS04', 'GHS05', 'GHS06', 'GHS07', 'GHS08', 'GHS09']
    }],
    rSaetze: [{
      type: String,
      trim: true
    }],
    sSaetze: [{
      type: String,
      trim: true
    }],
    schutzausruestung: {
      type: String,
      default: '',
      trim: true
    }
  },
  
  // Verfügbarkeit und Status
  verfuegbar: {
    type: Boolean,
    default: true
  },
  qualitaetsgeprueft: {
    type: Boolean,
    default: true
  },
  chargeNummer: {
    type: String,
    default: '',
    trim: true
  },
  ablaufdatum: {
    type: Date,
    default: null
  },
  
  // Verwendungsstatistik
  verbrauchsstatistik: {
    letzteVerwendung: {
      type: Date,
      default: null
    },
    verwendungenGesamt: {
      type: Number,
      default: 0,
      min: 0
    },
    durchschnittProVerwendung: {
      type: Number,
      default: 0,
      min: 0 // Durchschnittsverbrauch pro Verwendung
    }
  },
  
  // Beschreibung und Notizen
  beschreibung: {
    type: String,
    default: '',
    trim: true
  },
  anwendungshinweise: {
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
  },
  
  // Tags für bessere Suchbarkeit
  tags: [{
    type: String,
    trim: true
  }]
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtuelle Felder für berechnete Werte
giesswerkstoffSchema.virtual('bestandsStatus').get(function() {
  if (this.aktuellerBestand <= 0) return 'leer';
  if (this.aktuellerBestand <= this.mindestbestand) return 'niedrig';
  if (this.aktuellerBestand >= this.maximalbestand) return 'uebervoll';
  return 'normal';
});

giesswerkstoffSchema.virtual('kostenAktuellerBestand').get(function() {
  return (this.aktuellerBestand * this.preisProEinheit).toFixed(2);
});

giesswerkstoffSchema.virtual('istAbgelaufen').get(function() {
  return this.ablaufdatum ? new Date() > this.ablaufdatum : false;
});

giesswerkstoffSchema.virtual('tageHaltbar').get(function() {
  if (!this.ablaufdatum) return null;
  const heute = new Date();
  const differenz = this.ablaufdatum - heute;
  return Math.ceil(differenz / (1000 * 60 * 60 * 24));
});

giesswerkstoffSchema.virtual('bestellmenge').get(function() {
  const fehlmenge = this.maximalbestand - this.aktuellerBestand;
  return Math.max(0, fehlmenge);
});

// Indices für Performance
giesswerkstoffSchema.index({ bezeichnung: 1 }, { unique: true });
giesswerkstoffSchema.index({ typ: 1, kategorie: 1 });
giesswerkstoffSchema.index({ verfuegbar: 1, aktuellerBestand: 1 });
giesswerkstoffSchema.index({ lieferant: 1, artikelnummer: 1 });
giesswerkstoffSchema.index({ tags: 1 });
giesswerkstoffSchema.index({ ablaufdatum: 1 });

// Pre-save Middleware
giesswerkstoffSchema.pre('save', function(next) {
  // Tags bereinigen
  if (this.tags) {
    this.tags = this.tags.map(tag => tag.toLowerCase().trim()).filter(tag => tag.length > 0);
  }
  
  // Preisberechnung aktualisieren
  if (this.einkaufspreis && this.aktuellerBestand > 0) {
    // Hier könnte komplexere Logik stehen
  }
  
  // Ablaufdatum setzen wenn nicht vorhanden
  if (!this.ablaufdatum && this.lagerung.haltbarkeitMonate) {
    const heute = new Date();
    this.ablaufdatum = new Date(heute.setMonth(heute.getMonth() + this.lagerung.haltbarkeitMonate));
  }
  
  next();
});

// Statische Methoden
giesswerkstoffSchema.statics.findVerfuegbare = function() {
  return this.find({ verfuegbar: true, aktuellerBestand: { $gt: 0 } });
};

giesswerkstoffSchema.statics.findNiedrigerBestand = function() {
  return this.find({ 
    $where: 'this.aktuellerBestand <= this.mindestbestand',
    verfuegbar: true 
  });
};

giesswerkstoffSchema.statics.findByTyp = function(typ) {
  return this.find({ typ: typ, verfuegbar: true });
};

giesswerkstoffSchema.statics.findAbgelaufen = function() {
  return this.find({ 
    ablaufdatum: { $lt: new Date() },
    verfuegbar: true 
  });
};

giesswerkstoffSchema.statics.findBaldAbgelaufen = function(tage = 30) {
  const checkDate = new Date();
  checkDate.setDate(checkDate.getDate() + tage);
  return this.find({ 
    ablaufdatum: { $lte: checkDate, $gte: new Date() },
    verfuegbar: true 
  });
};

// Instance-Methoden
giesswerkstoffSchema.methods.verbrauchHinzufuegen = function(menge, zweck = '') {
  this.aktuellerBestand = Math.max(0, this.aktuellerBestand - menge);
  this.verbrauchsstatistik.letzteVerwendung = new Date();
  this.verbrauchsstatistik.verwendungenGesamt += 1;
  
  // Durchschnitt neu berechnen
  const gesamtVerbrauch = this.verbrauchsstatistik.durchschnittProVerwendung * (this.verbrauchsstatistik.verwendungenGesamt - 1) + menge;
  this.verbrauchsstatistik.durchschnittProVerwendung = gesamtVerbrauch / this.verbrauchsstatistik.verwendungenGesamt;
  
  return this.save();
};

giesswerkstoffSchema.methods.bestandAuffuellen = function(menge, neuerPreis = null) {
  this.aktuellerBestand += menge;
  if (neuerPreis !== null) {
    this.preisProEinheit = neuerPreis;
  }
  return this.save();
};

giesswerkstoffSchema.methods.getMischungsInfo = function(gewuenschteMenge = 1) {
  const info = {
    basis: this.bezeichnung,
    menge: gewuenschteMenge,
    einheit: this.einheit
  };
  
  if (this.standardMischung.wasserVerhaeltnis) {
    info.wasser = {
      menge: gewuenschteMenge * this.standardMischung.wasserVerhaeltnis,
      einheit: this.einheit === 'kg' ? 'l' : 'ml'
    };
  }
  
  if (this.standardMischung.zusatzstoffe && this.standardMischung.zusatzstoffe.length > 0) {
    info.zusatzstoffe = this.standardMischung.zusatzstoffe.map(zusatz => ({
      name: zusatz.bezeichnung,
      menge: this.berechneMengeFuerZusatz(gewuenschteMenge, zusatz),
      einheit: zusatz.einheit
    }));
  }
  
  return info;
};

giesswerkstoffSchema.methods.berechneMengeFuerZusatz = function(basisMenge, zusatz) {
  switch (zusatz.einheit) {
    case 'prozent':
      return (basisMenge * zusatz.anteil) / 100;
    case 'gramm_pro_kg':
      return zusatz.anteil * (this.einheit === 'kg' ? basisMenge : basisMenge / 1000);
    case 'ml_pro_l':
      return zusatz.anteil * (this.einheit === 'l' ? basisMenge : basisMenge / 1000);
    default:
      return zusatz.anteil;
  }
};

module.exports = mongoose.model('Giesswerkstoff', giesswerkstoffSchema);