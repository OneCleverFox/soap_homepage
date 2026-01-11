const mongoose = require('mongoose');

const portfolioSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true, // Dies erstellt automatisch einen Index - entferne duplicaten schema.index()
    trim: true
  },
  seife: {
    type: String,
    validate: {
      validator: function(v) {
        // Wenn es ein Werkstück ist, ist ein leerer String ok
        if (this.kategorie === 'werkstuck') return true;
        // Wenn es eine Seife ist, muss ein Wert vorhanden sein
        return this.kategorie === 'seife' ? !!v && v.trim().length > 0 : true;
      },
      message: 'Seife ist für Seifen-Kategorie erforderlich'
    },
    trim: true,
    default: ''
  },
  gramm: {
    type: Number,
    required: true,
    min: 1
  },
  // Erweiterte Konfiguration für Produkte mit zwei Rohseifen
  rohseifenKonfiguration: {
    verwendeZweiRohseifen: {
      type: Boolean,
      default: false
    },
    seife2: {
      type: String,
      default: '',
      trim: true
    },
    gewichtVerteilung: {
      seife1Prozent: {
        type: Number,
        default: 100,
        min: 0,
        max: 100
      },
      seife2Prozent: {
        type: Number,
        default: 0,
        min: 0,
        max: 100
      }
    }
  },
  aroma: {
    type: String,
    validate: {
      validator: function(v) {
        if (this.kategorie === 'werkstuck') return true;
        return this.kategorie === 'seife' ? !!v && v.trim().length > 0 : true;
      },
      message: 'Aroma ist für Seifen-Kategorie erforderlich'
    },
    trim: true,
    default: ''
  },
  // Produktkategorie für Filterung
  kategorie: {
    type: String,
    required: true,
    enum: ['seife', 'werkstuck'],
    default: 'seife',
    index: true // Index für bessere Performance bei Filterung
  },
  seifenform: {
    type: String,
    validate: {
      validator: function(v) {
        if (this.kategorie === 'werkstuck') return true;
        return this.kategorie === 'seife' ? !!v && v.trim().length > 0 : true;
      },
      message: 'Seifenform ist für Seifen-Kategorie erforderlich'
    },
    trim: true,
    default: ''
  },
  zusatz: {
    type: String,
    default: '',
    trim: true
  },
  optional: {
    type: String,
    default: '',
    trim: true
  },
  
  // Zusatzinhaltsstoffe-Konfiguration (NEU)
  zusatzinhaltsstoffe: [{
    inhaltsstoffName: {
      type: String,
      required: true,
      trim: true
    },
    menge: {
      type: Number,
      required: true,
      min: 0,
      max: 50 // Maximal 50g pro Zusatz bei 100g Seife
    },
    einheit: {
      type: String,
      enum: ['gramm', 'prozent'],
      default: 'gramm'
    },
    hinweise: {
      type: String,
      default: '',
      trim: true
    }
  }],
  
  verpackung: {
    type: String,
    validate: {
      validator: function(v) {
        if (this.kategorie === 'werkstuck') return true;
        return this.kategorie === 'seife' ? !!v && v.trim().length > 0 : true;
      },
      message: 'Verpackung ist für Seifen-Kategorie erforderlich'
    },
    trim: true,
    default: ''
  },
  
  // Werkstück-spezifische Felder
  giessform: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Giessform',
    required: function() { return this.kategorie === 'werkstuck'; }
  },
  giesswerkstoff: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Giesswerkstoff',
    required: function() { return this.kategorie === 'werkstuck'; }
  },
  
  // Abmessungen (für beide Kategorien nutzbar)
  abmessungen: {
    laenge: {
      type: Number,
      default: 0,
      min: 0
    },
    breite: {
      type: Number,
      default: 0,
      min: 0
    },
    hoehe: {
      type: Number,
      default: 0,
      min: 0
    },
    einheit: {
      type: String,
      default: 'cm',
      enum: ['mm', 'cm', 'm']
    }
  },
  
  // Preis
  preis: {
    type: Number,
    default: 0,
    min: 0
  },
  // Produktbeschreibung & Details
  beschreibung: {
    kurz: {
      type: String,
      default: '',
      trim: true,
      maxlength: 200
    },
    lang: {
      type: String,
      default: '',
      trim: true
    },
    inhaltsstoffe: {
      type: String,
      default: '',
      trim: true
    },
    anwendung: {
      type: String,
      default: '',
      trim: true
    },
    besonderheiten: {
      type: String,
      default: '',
      trim: true
    }
  },
  // Externer Weblink (z.B. Drive-Dokument)
  weblink: {
    type: String,
    default: '',
    trim: true,
    validate: {
      validator: function(v) {
        if (!v) return true; // Leerer String ist OK
        // Einfache URL-Validierung
        return /^https?:\/\/.+/.test(v);
      },
      message: 'Weblink muss eine gültige URL sein (http:// oder https://)'
    }
  },
  // Produktbilder (Base64 für Cloud-Deployment)
  bilder: {
    hauptbild: {
      type: String,
      default: '',
      trim: true
    },
    hauptbildData: {
      data: {
        type: String, // Base64-encoded image
        default: ''
      },
      contentType: {
        type: String, // MIME type (image/jpeg, image/png, etc.)
        default: ''
      }
    },
    galerie: [{
      url: {
        type: String,
        trim: true
      },
      data: {
        type: String, // Base64-encoded image
        default: ''
      },
      contentType: {
        type: String, // MIME type
        default: ''
      },
      alt_text: {
        type: String,
        default: '',
        trim: true
      }
    }],
    alt_text: {
      type: String,
      default: '',
      trim: true
    }
  },
  // Zusätzliche Metadaten
  aktiv: {
    type: Boolean,
    default: false // ✅ Neue Produkte standardmäßig inaktiv
  },
  reihenfolge: {
    type: Number,
    default: 0
  }
}, {
  collection: 'portfolio',
  timestamps: true // Erstellt automatisch createdAt und updatedAt
});

// Indizes für bessere Performance
// portfolioSchema.index({ name: 1 }); // ENTFERNT - wird durch unique: true automatisch erstellt
portfolioSchema.index({ seife: 1 });
portfolioSchema.index({ aroma: 1 });
portfolioSchema.index({ reihenfolge: 1 });

// ⚡ PERFORMANCE BOOST: Index für aktive Produkte (kritisch für /with-prices)
portfolioSchema.index({ aktiv: 1 });
portfolioSchema.index({ aktiv: 1, reihenfolge: 1 }); // Compound für sortierte Abfrage

// Pre-save Hook für Datenvalidierung
portfolioSchema.pre('save', function(next) {
  // Validierung für Zwei-Rohseifen-Konfiguration
  if (this.rohseifenKonfiguration.verwendeZweiRohseifen) {
    // Prüfe dass zweite Seife angegeben ist
    if (!this.rohseifenKonfiguration.seife2 || this.rohseifenKonfiguration.seife2.trim() === '') {
      return next(new Error('Bei Verwendung von zwei Rohseifen muss die zweite Seife angegeben werden'));
    }
    
    // Prüfe dass Gewichtsverteilung korrekt ist
    const seife1Prozent = this.rohseifenKonfiguration.gewichtVerteilung.seife1Prozent;
    const seife2Prozent = this.rohseifenKonfiguration.gewichtVerteilung.seife2Prozent;
    
    if (Math.abs(seife1Prozent + seife2Prozent - 100) > 0.01) {
      return next(new Error('Gewichtsverteilung muss genau 100% ergeben'));
    }
    
    // Setze seife2Prozent automatisch wenn nicht gesetzt
    if (seife2Prozent === 0 && seife1Prozent !== 100) {
      this.rohseifenKonfiguration.gewichtVerteilung.seife2Prozent = 100 - seife1Prozent;
    }
  } else {
    // Bei einer Rohseife: Setze Defaults zurück
    this.rohseifenKonfiguration.seife2 = '';
    this.rohseifenKonfiguration.gewichtVerteilung.seife1Prozent = 100;
    this.rohseifenKonfiguration.gewichtVerteilung.seife2Prozent = 0;
  }
  
  next();
});

module.exports = mongoose.model('Portfolio', portfolioSchema);