const mongoose = require('mongoose');

const orderItemSchema = new mongoose.Schema({
  // Referenz zu Portfolio, Rohseife oder anderen Produkten
  produktType: {
    type: String,
    enum: ['portfolio', 'rohseife', 'duftoele', 'verpackung', 'custom'],
    required: true
  },
  produktId: {
    type: mongoose.Schema.Types.ObjectId,
    required: false // Für custom-Produkte nicht erforderlich
  },
  // Produktdaten zum Zeitpunkt der Bestellung (für historische Zwecke)
  produktSnapshot: {
    name: {
      type: String,
      required: true
    },
    beschreibung: String,
    kategorie: String,
    bild: String,
    // Spezifische Felder je nach Produkttyp
    gewicht: Number, // für Seifen
    duftrichtung: String, // für Duftöle
    form: String, // für Verpackungen
    inhaltsstoffe: [String]
  },
  menge: {
    type: Number,
    required: true,
    min: [1, 'Menge muss mindestens 1 sein']
  },
  einzelpreis: {
    type: Number,
    required: true,
    min: [0, 'Einzelpreis muss positiv sein']
  },
  gesamtpreis: {
    type: Number,
    required: true,
    min: [0, 'Gesamtpreis muss positiv sein']
  },
  // Spezielle Konfiguration (z.B. individuelle Duftmischung)
  konfiguration: {
    duftmischung: [{
      duftoel: String,
      tropfen: Number
    }],
    personalisierung: String,
    sonderuswuensche: String
  }
});

const orderSchema = new mongoose.Schema({
  bestellnummer: {
    type: String,
    required: false, // Wird im pre-save Hook automatisch generiert
    unique: true
  },
  // Verknüpfung mit unserem Kunden-System
  kunde: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Kunde',
    required: false // Optional, für Gast-Bestellungen
  },
  besteller: {
    email: {
      type: String,
      required: [true, 'E-Mail ist erforderlich'],
      lowercase: true,
      trim: true
    },
    vorname: {
      type: String,
      required: [true, 'Vorname ist erforderlich'],
      trim: true
    },
    nachname: {
      type: String,
      required: [true, 'Nachname ist erforderlich'],
      trim: true
    },
    telefon: {
      type: String,
      trim: true
    },
    kundennummer: {
      type: String,
      trim: true // Aus unserem Kunden-System
    }
  },
  
  // Adressen
  rechnungsadresse: {
    strasse: {
      type: String,
      required: [true, 'Straße ist erforderlich'],
      trim: true
    },
    hausnummer: {
      type: String,
      required: [true, 'Hausnummer ist erforderlich'],
      trim: true
    },
    zusatz: {
      type: String,
      trim: true,
      default: ''
    },
    plz: {
      type: String,
      required: [true, 'PLZ ist erforderlich'],
      trim: true,
      match: [/^\d{5}$/, 'PLZ muss 5-stellig sein']
    },
    stadt: {
      type: String,
      required: [true, 'Stadt ist erforderlich'],
      trim: true
    },
    land: {
      type: String,
      required: [true, 'Land ist erforderlich'],
      default: 'Deutschland',
      trim: true
    }
  },
  
  lieferadresse: {
    verwendeRechnungsadresse: {
      type: Boolean,
      default: true
    },
    // Nur gefüllt wenn verwendeRechnungsadresse = false
    firma: {
      type: String,
      trim: true,
      default: ''
    },
    strasse: {
      type: String,
      trim: true,
      default: ''
    },
    hausnummer: {
      type: String,
      trim: true,
      default: ''
    },
    zusatz: {
      type: String,
      trim: true,
      default: ''
    },
    plz: {
      type: String,
      trim: true,
      default: ''
    },
    stadt: {
      type: String,
      trim: true,
      default: ''
    },
    land: {
      type: String,
      trim: true,
      default: 'Deutschland'
    }
  },
  
  // Bestellte Artikel
  artikel: [orderItemSchema],
  
  // Preisberechnung
  preise: {
    zwischensumme: {
      type: Number,
      required: true,
      min: [0, 'Zwischensumme muss positiv sein']
    },
    versandkosten: {
      type: Number,
      default: 0,
      min: [0, 'Versandkosten müssen positiv sein']
    },
    mwst: {
      satz: {
        type: Number,
        default: 19, // 19% MwSt
        min: 0,
        max: 100
      },
      betrag: {
        type: Number,
        default: 0,
        min: [0, 'MwSt-Betrag muss positiv sein']
      }
    },
    rabatt: {
      betrag: {
        type: Number,
        default: 0,
        min: [0, 'Rabattbetrag muss positiv sein']
      },
      code: {
        type: String,
        trim: true,
        default: ''
      },
      grund: {
        type: String,
        trim: true,
        default: ''
      },
      prozent: {
        type: Number,
        default: 0,
        min: 0,
        max: 100
      }
    },
    gesamtsumme: {
      type: Number,
      required: true,
      min: [0, 'Gesamtsumme muss positiv sein']
    }
  },
  
  // Bestellstatus
  status: {
    type: String,
    enum: {
      values: ['neu', 'bestaetigt', 'bezahlt', 'verpackt', 'verschickt', 'zugestellt', 'storniert', 'rueckerstattung'],
      message: 'Ungültiger Bestellstatus'
    },
    default: 'neu'
  },
  
  // Zahlungsinformationen
  zahlung: {
    methode: {
      type: String,
      enum: ['paypal', 'ueberweisung', 'kreditkarte', 'nachnahme', 'klarna', 'sofortueberweisung'],
      required: true
    },
    status: {
      type: String,
      enum: ['ausstehend', 'bezahlt', 'fehlgeschlagen', 'rueckerstattet', 'teilweise_rueckerstattet'],
      default: 'ausstehend'
    },
    transaktionsId: {
      type: String,
      trim: true,
      default: ''
    },
    bezahltAm: {
      type: Date
    },
    zahlungsziel: {
      type: Date
    }
  },
  
  // Versandinformationen
  versand: {
    methode: {
      type: String,
      enum: ['standard', 'express', 'abholung', 'nachnahme'],
      default: 'standard'
    },
    anbieter: {
      type: String,
      enum: ['dhl', 'hermes', 'ups', 'dpd', 'selbstabholung'],
      default: 'dhl'
    },
    sendungsnummer: {
      type: String,
      trim: true,
      default: ''
    },
    voraussichtlicheLieferung: {
      type: Date
    },
    versendetAm: {
      type: Date
    },
    zugestelltAm: {
      type: Date
    },
    verschickt: {
      type: Boolean,
      default: false
    },
    zugestellt: {
      type: Boolean,
      default: false
    }
  },
  
  // Notizen und Kommunikation
  notizen: {
    kunde: {
      type: String,
      trim: true,
      default: '' // Kundennotizen zur Bestellung
    },
    intern: {
      type: String,
      trim: true,
      default: '' // Interne Notizen für Mitarbeiter
    },
    versand: {
      type: String,
      trim: true,
      default: '' // Spezielle Versandhinweise
    }
  },
  
  // Status-Historie für Nachverfolgung
  statusVerlauf: [{
    status: {
      type: String,
      required: true
    },
    zeitpunkt: {
      type: Date,
      default: Date.now
    },
    notiz: {
      type: String,
      trim: true,
      default: ''
    },
    bearbeiter: {
      type: String,
      trim: true,
      default: 'System'
    }
  }],
  
  // Kommunikations-Log
  kommunikation: [{
    typ: {
      type: String,
      enum: ['email', 'telefon', 'sms', 'notiz'],
      required: true
    },
    richtung: {
      type: String,
      enum: ['eingehend', 'ausgehend'],
      required: true
    },
    betreff: {
      type: String,
      trim: true
    },
    inhalt: {
      type: String,
      trim: true
    },
    zeitpunkt: {
      type: Date,
      default: Date.now
    },
    bearbeiter: {
      type: String,
      trim: true,
      default: 'System'
    }
  }],
  
  // Zusätzliche Felder
  bestelldatum: {
    type: Date,
    default: Date.now
  },
  gewuenschterLiefertermin: {
    type: Date
  },
  istGeschenk: {
    type: Boolean,
    default: false
  },
  geschenkNachricht: {
    type: String,
    trim: true,
    default: ''
  },
  quelle: {
    type: String,
    enum: ['website', 'telefon', 'email', 'markt', 'empfehlung'],
    default: 'website'
  }
}, {
  collection: 'orders',
  timestamps: true,
  autoIndex: false // Automatische Index-Erstellung deaktivieren
});

// Nur die Indizes erstellen, die wir brauchen
orderSchema.index({ bestellnummer: 1 }, { unique: true });
orderSchema.index({ 'besteller.email': 1 });
orderSchema.index({ kunde: 1 });
orderSchema.index({ status: 1 });
orderSchema.index({ bestelldatum: -1 });

// Virtuelle Felder
orderSchema.virtual('besteller.vollname').get(function() {
  return `${this.besteller.vorname} ${this.besteller.nachname}`;
});

orderSchema.virtual('lieferadresse.vollstaendig').get(function() {
  if (this.lieferadresse.verwendeRechnungsadresse) {
    return `${this.rechnungsadresse.strasse} ${this.rechnungsadresse.hausnummer}, ${this.rechnungsadresse.plz} ${this.rechnungsadresse.stadt}`;
  } else {
    return `${this.lieferadresse.strasse} ${this.lieferadresse.hausnummer}, ${this.lieferadresse.plz} ${this.lieferadresse.stadt}`;
  }
});

orderSchema.virtual('gesamtArtikelAnzahl').get(function() {
  return this.artikel.reduce((sum, artikel) => sum + artikel.menge, 0);
});

// Methoden
orderSchema.methods.generiereBestellnummer = function() {
  const datum = new Date();
  const jahr = datum.getFullYear().toString().slice(-2);
  const monat = (datum.getMonth() + 1).toString().padStart(2, '0');
  const tag = datum.getDate().toString().padStart(2, '0');
  const stunde = datum.getHours().toString().padStart(2, '0');
  const minute = datum.getMinutes().toString().padStart(2, '0');
  const random = Math.floor(Math.random() * 99).toString().padStart(2, '0');
  
  return `GM${jahr}${monat}${tag}${stunde}${minute}${random}`;
};

orderSchema.methods.aktualisiereStatus = function(neuerStatus, notiz = '', bearbeiter = 'System') {
  // Status-Historie hinzufügen
  this.statusVerlauf.push({
    status: this.status,
    notiz: notiz,
    bearbeiter: bearbeiter
  });
  
  this.status = neuerStatus;
  
  // Automatische Aktionen basierend auf Status
  switch (neuerStatus) {
    case 'bezahlt':
      if (!this.zahlung.bezahltAm) {
        this.zahlung.bezahltAm = new Date();
        this.zahlung.status = 'bezahlt';
      }
      break;
      
    case 'verschickt':
      if (!this.versand.versendetAm) {
        this.versand.versendetAm = new Date();
        this.versand.verschickt = true;
      }
      break;
      
    case 'zugestellt':
      if (!this.versand.zugestelltAm) {
        this.versand.zugestelltAm = new Date();
        this.versand.zugestellt = true;
      }
      break;
  }
  
  return this.save();
};

orderSchema.methods.berechneGesamtsumme = function() {
  // Zwischensumme berechnen
  const zwischensumme = this.artikel.reduce((sum, artikel) => {
    artikel.gesamtpreis = artikel.einzelpreis * artikel.menge;
    return sum + artikel.gesamtpreis;
  }, 0);
  
  this.preise.zwischensumme = zwischensumme;
  
  // MwSt berechnen
  this.preise.mwst.betrag = (zwischensumme + this.preise.versandkosten) * (this.preise.mwst.satz / 100);
  
  // Gesamtsumme berechnen
  this.preise.gesamtsumme = zwischensumme + 
                            this.preise.versandkosten + 
                            this.preise.mwst.betrag - 
                            this.preise.rabatt.betrag;
  
  // Stelle sicher, dass Gesamtsumme nicht negativ ist
  this.preise.gesamtsumme = Math.max(0, this.preise.gesamtsumme);
  
  return this.preise.gesamtsumme;
};

orderSchema.methods.hinzufuegenKommunikation = function(typ, richtung, betreff, inhalt, bearbeiter = 'System') {
  this.kommunikation.push({
    typ: typ,
    richtung: richtung,
    betreff: betreff,
    inhalt: inhalt,
    bearbeiter: bearbeiter
  });
  
  return this.save();
};

// Pre-save Hooks
orderSchema.pre('save', async function(next) {
  // Bestellnummer generieren falls nicht vorhanden
  if (this.isNew && !this.bestellnummer) {
    let eindeutig = false;
    let versuche = 0;
    
    while (!eindeutig && versuche < 10) {
      const neueBestellnummer = this.generiereBestellnummer();
      const existierende = await mongoose.model('Order').findOne({ bestellnummer: neueBestellnummer });
      
      if (!existierende) {
        this.bestellnummer = neueBestellnummer;
        eindeutig = true;
      }
      versuche++;
    }
    
    if (!eindeutig) {
      this.bestellnummer = `GM${Date.now()}`;
    }
  }
  
  // Gesamtsumme automatisch berechnen
  if (this.isModified('artikel') || this.isModified('preise.versandkosten') || this.isModified('preise.rabatt')) {
    this.berechneGesamtsumme();
  }
  
  // Initial Status-Historie hinzufügen
  if (this.isNew) {
    this.statusVerlauf.push({
      status: 'neu',
      notiz: 'Bestellung erstellt',
      bearbeiter: 'System'
    });
  }
  
  next();
});

module.exports = mongoose.model('Order', orderSchema);