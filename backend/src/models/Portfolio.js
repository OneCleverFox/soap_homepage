const mongoose = require('mongoose');

const portfolioSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  seife: {
    type: String,
    required: true,
    trim: true
  },
  gramm: {
    type: Number,
    required: true,
    min: 1
  },
  aroma: {
    type: String,
    required: true,
    trim: true
  },
  seifenform: {
    type: String,
    required: true,
    trim: true
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
  verpackung: {
    type: String,
    required: true,
    trim: true
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
  // Produktbilder
  bilder: {
    hauptbild: {
      type: String,
      default: '',
      trim: true
    },
    galerie: [{
      url: {
        type: String,
        trim: true
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
    default: true
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
portfolioSchema.index({ name: 1 });
portfolioSchema.index({ seife: 1 });
portfolioSchema.index({ aroma: 1 });
portfolioSchema.index({ reihenfolge: 1 });

module.exports = mongoose.model('Portfolio', portfolioSchema);