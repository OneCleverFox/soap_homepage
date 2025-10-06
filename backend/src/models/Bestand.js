const mongoose = require('mongoose');

/**
 * Bestand-Schema für Lagerverwaltung
 * Verwaltet Rohstoffe (Rohseifen, Duftöle, Verpackungen) und Fertigprodukte
 */
const bestandSchema = new mongoose.Schema({
  // Typ des Lagerartikels
  typ: {
    type: String,
    enum: ['rohseife', 'duftoil', 'verpackung', 'produkt'],
    required: true,
    index: true
  },
  
  // Referenz zur Produkt-/Rohstoff-ID
  artikelId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    refPath: 'artikelModell',
    index: true
  },
  
  // Dynamische Referenz je nach Typ
  artikelModell: {
    type: String,
    required: true,
    enum: ['Rohseife', 'Duftoil', 'Verpackung', 'Portfolio']
  },
  
  // Aktueller Lagerbestand
  menge: {
    type: Number,
    required: true,
    default: 0,
    min: 0
  },
  
  // Einheit (kg, ml, Stück, etc.)
  einheit: {
    type: String,
    required: true,
    enum: ['kg', 'g', 'ml', 'l', 'stück'],
    default: 'stück'
  },
  
  // Mindestbestand für Warnungen
  mindestbestand: {
    type: Number,
    default: 0,
    min: 0
  },
  
  // Optionale Zusatzinformationen
  notizen: {
    type: String,
    default: ''
  },
  
  // Letzte Änderung
  letzteAenderung: {
    datum: {
      type: Date,
      default: Date.now
    },
    grund: {
      type: String,
      enum: ['inventur', 'produktion', 'bestellung', 'korrektur', 'retoure'],
      default: 'inventur'
    },
    menge: Number, // Änderungsmenge (+/-)
    vorher: Number, // Bestand vorher
    nachher: Number // Bestand nachher
  }
}, {
  timestamps: true
});

// Compound Index für schnelle Suche nach Artikel
bestandSchema.index({ typ: 1, artikelId: 1 }, { unique: true });

// Virtuals für Populate
bestandSchema.virtual('artikel', {
  refPath: 'artikelModell',
  localField: 'artikelId',
  foreignField: '_id',
  justOne: true
});

// Methode: Bestand erhöhen
bestandSchema.methods.erhoeheBestand = function(menge, grund = 'inventur') {
  const vorher = this.menge;
  this.menge += menge;
  this.letzteAenderung = {
    datum: new Date(),
    grund,
    menge: menge,
    vorher,
    nachher: this.menge
  };
  return this.save();
};

// Methode: Bestand verringern
bestandSchema.methods.verringereBestand = function(menge, grund = 'bestellung') {
  const vorher = this.menge;
  this.menge = Math.max(0, this.menge - menge);
  this.letzteAenderung = {
    datum: new Date(),
    grund,
    menge: -menge,
    vorher,
    nachher: this.menge
  };
  return this.save();
};

// Methode: Bestand setzen (für Inventur)
bestandSchema.methods.setzeBestand = function(neueMenge, notiz = '') {
  const vorher = this.menge;
  this.menge = neueMenge;
  this.letzteAenderung = {
    datum: new Date(),
    grund: 'inventur',
    menge: neueMenge - vorher,
    vorher,
    nachher: neueMenge
  };
  if (notiz) {
    this.notizen = notiz;
  }
  return this.save();
};

// Methode: Prüfe ob Mindestbestand unterschritten
bestandSchema.methods.istUnterMindestbestand = function() {
  return this.menge < this.mindestbestand;
};

// Static: Finde alle Artikel unter Mindestbestand
bestandSchema.statics.findeUnterMindestbestand = function() {
  return this.find({
    $expr: { $lt: ['$menge', '$mindestbestand'] }
  }).populate('artikel');
};

// Static: Finde oder erstelle Bestand für Artikel
bestandSchema.statics.findeOderErstelle = async function(typ, artikelId, einheit = 'stück') {
  let bestand = await this.findOne({ typ, artikelId });
  
  if (!bestand) {
    // Bestimme Modellname basierend auf Typ
    const modellMap = {
      rohseife: 'Rohseife',
      duftoil: 'Duftoil',
      verpackung: 'Verpackung',
      produkt: 'Portfolio'
    };
    
    bestand = new this({
      typ,
      artikelId,
      artikelModell: modellMap[typ],
      menge: 0,
      einheit
    });
    await bestand.save();
  }
  
  return bestand;
};

const Bestand = mongoose.model('Bestand', bestandSchema);

module.exports = Bestand;
