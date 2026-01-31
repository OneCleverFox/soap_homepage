const mongoose = require('mongoose');

const galleryImageSchema = new mongoose.Schema({
  // Bildtitel (optional)
  title: {
    type: String,
    default: ''
  },
  
  // Bildbeschreibung (optional)
  description: {
    type: String,
    default: ''
  },
  
  // Bild als Base64 oder URL
  imageData: {
    type: String,
    required: true
  },
  
  // Bildformat (MIME-Type)
  imageType: {
    type: String,
    default: 'image/jpeg'
  },
  
  // Reihenfolge für die Anzeige (niedrigere Nummer = früher angezeigt)
  order: {
    type: Number,
    required: true,
    default: 0
  },
  
  // Sichtbarkeit
  isActive: {
    type: Boolean,
    default: true
  },
  
  // Metadaten
  uploadedBy: {
    type: String,
    default: 'Admin'
  },
  
  uploadedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Index für schnelles Sortieren nach Reihenfolge
galleryImageSchema.index({ order: 1, isActive: 1 });

// Methode zum Abrufen aller aktiven Bilder sortiert nach Reihenfolge
galleryImageSchema.statics.getActiveImages = async function() {
  return await this.find({ isActive: true }).sort({ order: 1 });
};

// Methode zum Neuordnen der Bilder
galleryImageSchema.statics.reorderImages = async function(imageIds) {
  const updates = imageIds.map((id, index) => ({
    updateOne: {
      filter: { _id: id },
      update: { $set: { order: index } }
    }
  }));
  
  return await this.bulkWrite(updates);
};

module.exports = mongoose.model('GalleryImage', galleryImageSchema);
