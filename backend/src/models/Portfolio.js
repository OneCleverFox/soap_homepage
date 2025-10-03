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