const mongoose = require('mongoose');

const GuVRechnungSchema = new mongoose.Schema({
  // Basisinformationen
  datum: {
    type: Date,
    required: [true, 'Datum ist erforderlich'],
    default: new Date()
  },

  // Transaktionstyp: einnahme, einkauf, material, arbeit, sonstiges
  typ: {
    type: String,
    enum: ['einnahme', 'einkauf', 'material', 'arbeit', 'sonstiges'],
    required: [true, 'Transaktionstyp ist erforderlich'],
    index: true
  },

  // Beschreibung der Transaktion
  beschreibung: {
    type: String,
    required: [true, 'Beschreibung ist erforderlich'],
    maxlength: [500, 'Beschreibung darf maximal 500 Zeichen lang sein']
  },

  // Betrag in EUR
  betrag: {
    type: Number,
    required: [true, 'Betrag ist erforderlich'],
    min: [0, 'Betrag muss positiv sein']
  },

  // Einzelpositionen aus Scan/OCR (editierbar im Preview)
  positionen: {
    type: [
      {
        beschreibung: {
          type: String,
          required: true,
          trim: true,
          maxlength: [300, 'Positionsbeschreibung darf maximal 300 Zeichen lang sein']
        },
        betrag: {
          type: Number,
          required: true,
          min: [0, 'Positionsbetrag muss positiv sein']
        }
      }
    ],
    default: []
  },

  // Optionale Referenznummer (Rechnungsnummer, Bestellnummer, etc.)
  referenznummer: {
    type: String,
    default: null
  },

  // Fortlaufende Steuer-Referenznummer (pro Jahr separat für Einnahmen/Ausgaben)
  steuerlaufnummer: {
    type: String,
    default: null
  },

  steuerlaufnummerWert: {
    type: Number,
    default: null
  },

  steuerlaufnummerTyp: {
    type: String,
    enum: ['E', 'A', null],
    default: null
  },

  steuerlaufnummerJahr: {
    type: Number,
    default: null
  },

  // Rechnungssteller/Lieferant aus OCR/PDF-Analyse
  rechnungsteller: {
    type: String,
    default: null,
    maxlength: [200, 'Rechnungssteller darf maximal 200 Zeichen lang sein']
  },

  // Optionale Bankdaten aus Rechnung (IBAN/BIC etc.)
  bankdaten: {
    type: String,
    default: null,
    maxlength: [1200, 'Bankdaten dürfen maximal 1200 Zeichen lang sein']
  },

  // Quelle des Eintrags
  quelle: {
    type: String,
    enum: ['einzeln', 'rechnung', 'bildanalyse'],
    default: 'einzeln'
  },

  // Verbindung zu einer Rechnung (falls aus Rechnung importiert)
  invoiceId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Invoice',
    default: null
  },

  // Bild der Rechnung (falls hochgeladen)
  image_url: {
    type: String,
    default: null
  },

  // Geschäftsjahr für Bilanzierung
  geschaeftsjahr: {
    type: Number,
    default: function() {
      const datum = new Date(this.datum);
      return datum.getFullYear();
    }
  },

  // Notizen
  notizen: {
    type: String,
    default: '',
    maxlength: [1000, 'Notizen dürfen maximal 1000 Zeichen lang sein']
  },

  // Attachment/Dokument URL
  dokument_url: {
    type: String,
    default: null
  },

  // Benutzer, der diesen Eintrag erstellt hat
  erstelltVon: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },

  // Timestamps
  createdAt: {
    type: Date,
    default: Date.now
  },

  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true,
  collection: 'guv_rechnungen'
});

// Index für häufige Abfragen
GuVRechnungSchema.index({ typ: 1, datum: -1 });
GuVRechnungSchema.index({ geschaeftsjahr: 1, typ: 1 });
GuVRechnungSchema.index({ datum: -1 });
GuVRechnungSchema.index({ steuerlaufnummerJahr: 1, steuerlaufnummerTyp: 1, steuerlaufnummerWert: 1 });

// Middleware: Geschäftsjahr automatisch setzen
GuVRechnungSchema.pre('save', function(next) {
  if (!this.geschaeftsjahr) {
    const datum = new Date(this.datum);
    this.geschaeftsjahr = datum.getFullYear();
  }
  next();
});

// Virtuelle Properties für Reporting
GuVRechnungSchema.virtual('monat').get(function() {
  const datum = new Date(this.datum);
  return datum.getMonth() + 1; // 1-12
});

GuVRechnungSchema.virtual('woche').get(function() {
  const datum = new Date(this.datum);
  const start = new Date(datum.getFullYear(), 0, 1);
  const diff = datum - start;
  const oneWeek = 1000 * 60 * 60 * 24 * 7;
  return Math.floor(diff / oneWeek) + 1;
});

GuVRechnungSchema.set('toJSON', { virtuals: true });
GuVRechnungSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('GuVRechnung', GuVRechnungSchema);
