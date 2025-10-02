const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Produktname ist erforderlich'],
    trim: true,
    maxlength: [100, 'Produktname darf maximal 100 Zeichen lang sein']
  },
  description: {
    type: String,
    required: [true, 'Produktbeschreibung ist erforderlich'],
    maxlength: [1000, 'Beschreibung darf maximal 1000 Zeichen lang sein']
  },
  shortDescription: {
    type: String,
    maxlength: [200, 'Kurzbeschreibung darf maximal 200 Zeichen lang sein']
  },
  price: {
    type: Number,
    required: [true, 'Preis ist erforderlich'],
    min: [0, 'Preis muss positiv sein']
  },
  originalPrice: {
    type: Number,
    min: [0, 'Originalpreis muss positiv sein']
  },
  category: {
    type: String,
    required: [true, 'Kategorie ist erforderlich'],
    enum: {
      values: ['seifen', 'cremes', 'oele', 'geschenksets', 'zubehoer', 'sonstiges'],
      message: 'Ungültige Kategorie'
    }
  },
  images: [{
    url: String,
    alt: String,
    isPrimary: {
      type: Boolean,
      default: false
    }
  }],
  stock: {
    quantity: {
      type: Number,
      required: [true, 'Lagerbestand ist erforderlich'],
      min: [0, 'Lagerbestand kann nicht negativ sein']
    },
    lowStockThreshold: {
      type: Number,
      default: 5,
      min: [0, 'Mindestbestand kann nicht negativ sein']
    }
  },
  attributes: {
    weight: Number, // in Gramm
    dimensions: {
      length: Number,
      width: Number,
      height: Number
    },
    ingredients: [String],
    skinType: {
      type: [String],
      enum: ['normal', 'trocken', 'fettig', 'empfindlich', 'mischhaut']
    },
    fragrance: String,
    isVegan: {
      type: Boolean,
      default: false
    },
    isOrganic: {
      type: Boolean,
      default: false
    }
  },
  seo: {
    metaTitle: String,
    metaDescription: String,
    keywords: [String]
  },
  isActive: {
    type: Boolean,
    default: true
  },
  isFeatured: {
    type: Boolean,
    default: false
  },
  salesCount: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

// Index für Suche
productSchema.index({ name: 'text', description: 'text', category: 'text' });
productSchema.index({ category: 1, isActive: 1 });
productSchema.index({ isFeatured: 1, isActive: 1 });

// Virtual für "Auf Lager" Status
productSchema.virtual('inStock').get(function() {
  return this.stock.quantity > 0;
});

// Virtual für "Wenig auf Lager" Status
productSchema.virtual('lowStock').get(function() {
  return this.stock.quantity <= this.stock.lowStockThreshold && this.stock.quantity > 0;
});

// Methode für Lagerbestand reduzieren
productSchema.methods.reduceStock = function(quantity) {
  if (this.stock.quantity < quantity) {
    throw new Error('Nicht genügend Lagerbestand verfügbar');
  }
  this.stock.quantity -= quantity;
  return this.save();
};

// Methode für Lagerbestand erhöhen
productSchema.methods.increaseStock = function(quantity) {
  this.stock.quantity += quantity;
  return this.save();
};

module.exports = mongoose.model('Product', productSchema);