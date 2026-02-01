const mongoose = require('mongoose');

/**
 * Bewegung-Schema für Lagerbewegungen (Audit Trail)
 * Protokolliert alle Bestandsänderungen für Nachvollziehbarkeit
 */
const bewegungSchema = new mongoose.Schema({
  // Typ der Bewegung
  typ: {
    type: String,
    enum: ['eingang', 'ausgang', 'inventur', 'produktion', 'korrektur', 'retoure'],
    required: true
    // index: true entfernt - wird über Compound-Index abgedeckt
  },
  
  // Betroffener Bestand
  bestandId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Bestand',
    required: false // Nicht required, da Rohstoffe kein Bestand-Dokument haben
    // index: true entfernt - wird über Compound-Index abgedeckt
  },
  
  // Artikel-Info (für schnelleren Zugriff)
  artikel: {
    typ: {
      type: String,
      enum: ['rohseife', 'duftoil', 'verpackung', 'produkt', 'fertigprodukt', 'giesswerkstoff'],
      required: true
    },
    artikelId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true
    },
    name: String
  },
  
  // Mengenbewegung
  menge: {
    type: Number,
    required: true
  },
  
  // Einheit
  einheit: {
    type: String,
    required: true,
    enum: ['kg', 'g', 'ml', 'l', 'stück', 'Stück', 'tropfen', 'Tropfen'] // Klein- und Großschreibung
  },
  
  // Bestand vorher/nachher
  bestandVorher: {
    type: Number,
    required: true
  },
  
  bestandNachher: {
    type: Number,
    required: true
  },
  
  // Grund der Bewegung
  grund: {
    type: String,
    required: true
  },
  
  // Referenz (z.B. Bestellnummer, Produktionsnummer)
  referenz: {
    typ: String, // 'bestellung', 'produktion', 'inventur'
    id: mongoose.Schema.Types.ObjectId
  },
  
  // Notizen
  notizen: String,
  
  // Benutzer der die Bewegung durchgeführt hat
  userId: {
    type: String, // Geändert zu String, da JWT userId ein String ist
    ref: 'User'
  }
}, {
  timestamps: true
});

// Indexes für Reporting
bewegungSchema.index({ typ: 1, createdAt: -1 });
bewegungSchema.index({ 'artikel.typ': 1, 'artikel.artikelId': 1, createdAt: -1 });
bewegungSchema.index({ bestandId: 1, createdAt: -1 });

// Static: Erstelle Bewegung
bewegungSchema.statics.erstelle = async function(data) {
  const bewegung = new this(data);
  await bewegung.save();
  return bewegung;
};

// Static: Hole Bewegungshistorie für Artikel
bewegungSchema.statics.holeHistorie = function(artikelTyp, artikelId, limit = 50) {
  return this.find({
    'artikel.typ': artikelTyp,
    'artikel.artikelId': artikelId
  })
    .sort({ createdAt: -1 })
    .limit(limit)
    .populate('userId', 'email name');
};

const Bewegung = mongoose.model('Bewegung', bewegungSchema);

module.exports = Bewegung;
