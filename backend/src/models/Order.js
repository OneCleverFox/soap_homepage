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
    beschreibung: mongoose.Schema.Types.Mixed, // Unterstützt sowohl String als auch Object
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
    unique: true // Dies erstellt automatisch einen Index - entferne duplicaten schema.index()
  },
  // Alias für bestehenden MongoDB Index - kein extra Index da bereits in DB vorhanden
  orderNumber: {
    type: String,
    required: false
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
      values: ['neu', 'bestaetigt', 'bezahlt', 'verpackt', 'verschickt', 'zugestellt', 'storniert', 'abgelehnt', 'rueckerstattung'],
      message: 'Ungültiger Bestellstatus'
    },
    default: 'neu'
  },
  
  // Rückerstattungsstatus für abgelehnte Bestellungen
  rueckerstattungErledigt: {
    type: Boolean,
    default: false,
    index: true // Für effiziente Filterung
  },
  rueckerstattungDatum: {
    type: Date // Wann die Rückerstattung erledigt wurde
  },
  rueckerstattungNotiz: {
    type: String,
    trim: true,
    default: '' // Notiz zur Rückerstattung
  },
  
  // Detaillierte Rückerstattungsinformationen
  rueckerstattung: {
    refundId: {
      type: String,
      trim: true // PayPal Refund ID oder andere Referenz
    },
    status: {
      type: String,
      enum: ['erfolgreich', 'ausstehend', 'fehlgeschlagen', 'fehler'],
      default: 'ausstehend'
    },
    betrag: {
      currency_code: {
        type: String,
        default: 'EUR'
      },
      value: {
        type: String // PayPal verwendet Strings für Beträge
      }
    },
    zeitpunkt: {
      type: Date,
      default: Date.now
    },
    methode: {
      type: String,
      enum: ['paypal_automatisch', 'paypal_manuell', 'ueberweisung', 'sonstige'],
      default: 'paypal_automatisch'
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
    },
    fehler: {
      type: String,
      trim: true // Bei fehlgeschlagenen Rückerstattungen
    }
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
      enum: ['dhl', 'hermes', 'ups', 'dpd', 'gls', 'fedex', 'selbstabholung'],
      default: 'dhl'
    },
    sendungsnummer: {
      type: String,
      trim: true,
      default: '',
      index: true // Für schnelle Suche nach Sendungsnummer
    },
    trackingUrl: {
      type: String,
      trim: true,
      default: '' // Vollständige DHL-Tracking-URL
    },
    versendetAm: {
      type: Date,
      index: true // Für Sortierung nach Versanddatum
    },
    voraussichtlicheLieferung: {
      type: Date
    },
    zugestelltAm: {
      type: Date
    },
    verschickt: {
      type: Boolean,
      default: false,
      index: true // Für Filterung nach Versandstatus
    },
    zugestellt: {
      type: Boolean,
      default: false,
      index: true // Für Filterung nach Zustellstatus
    },
    // DHL-spezifische Tracking-Informationen
    tracking: {
      letzterStatus: {
        type: String,
        trim: true,
        default: ''
      },
      letzteAktualisierung: {
        type: Date
      },
      statusDetails: {
        type: String,
        trim: true,
        default: ''
      },
      standort: {
        type: String,
        trim: true,
        default: ''
      },
      // Tracking-Verlauf für detaillierte Nachverfolgung
      verlauf: [{
        zeitpunkt: {
          type: Date,
          required: true
        },
        status: {
          type: String,
          required: true,
          trim: true
        },
        beschreibung: {
          type: String,
          trim: true,
          default: ''
        },
        ort: {
          type: String,
          trim: true,
          default: ''
        }
      }]
    },
    // Versandkosten und Details
    kosten: {
      betrag: {
        type: Number,
        default: 0,
        min: [0, 'Versandkosten müssen positiv sein']
      },
      kostenlos: {
        type: Boolean,
        default: false
      },
      grund: {
        type: String,
        trim: true,
        default: '' // Grund für kostenlosen Versand
      }
    },
    // Paket-Informationen
    paket: {
      gewicht: {
        type: Number,
        min: [0, 'Paketgewicht muss positiv sein'],
        default: 0
      },
      abmessungen: {
        laenge: Number,
        breite: Number,
        hoehe: Number
      },
      inhalt: {
        type: String,
        trim: true,
        default: '' // Kurzbeschreibung des Paketinhalts
      },
      versichert: {
        type: Boolean,
        default: false
      },
      versicherungswert: {
        type: Number,
        default: 0,
        min: [0, 'Versicherungswert muss positiv sein']
      }
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
      enum: ['email', 'telefon', 'sms', 'notiz', 'system'],
      required: true
    },
    richtung: {
      type: String,
      enum: ['eingehend', 'ausgehend', 'intern'],
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
    },
    // E-Mail spezifische Felder
    emailData: {
      messageId: String,
      empfaenger: String,
      status: {
        type: String,
        enum: ['gesendet', 'zugestellt', 'geoeffnet', 'geklickt', 'fehlgeschlagen'],
        default: 'gesendet'
      },
      emailType: {
        type: String,
        enum: ['order_confirmation', 'order_rejection', 'shipping_notification', 'general']
      }
    }
  }],
  
  // Zusätzliche Felder
  bestelldatum: {
    type: Date,
    default: () => {
      // CET/CEST Timezone für Deutschland
      const now = new Date();
      const cet = new Date(now.toLocaleString("en-US", {timeZone: "Europe/Berlin"}));
      return cet;
    }
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
  },
  
  // 📄 RECHNUNGS-INFORMATIONEN
  rechnung: {
    nummer: {
      type: String,
      unique: true,
      sparse: true // Erlaubt null/undefined Werte
    },
    datum: {
      type: Date
    },
    faelligkeitsdatum: {
      type: Date
    },
    status: {
      type: String,
      enum: ['erstellt', 'versendet', 'bezahlt', 'ueberfaellig', 'storniert'],
      default: 'erstellt'
    },
    emailVersendet: {
      type: Boolean,
      default: false
    },
    emailVersendetAm: {
      type: Date
    },
    vorlage: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'InvoiceTemplate'
    },
    dateipfad: {
      type: String // Pfad zur gespeicherten PDF-Datei (optional)
    }
  },
  
  // Kompatibilität mit alten Feldern (falls bereits verwendet)
  invoiceNumber: {
    type: String
  },
  invoiceDate: {
    type: Date
  },
  invoiceEmailSent: {
    type: Boolean,
    default: false
  },
  invoiceEmailSentAt: {
    type: Date
  }
}, {
  collection: 'orders',
  timestamps: true,
  autoIndex: false // Automatische Index-Erstellung deaktivieren
});

// Nur die Indizes erstellen, die wir brauchen
// orderSchema.index({ bestellnummer: 1 }, { unique: true }); // ENTFERNT - wird durch unique: true automatisch erstellt
// orderNumber Index bereits in MongoDB vorhanden - nicht erneut erstellen
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
  if (this.isNew && !this.bestellnummer && !this.orderNumber) {
    let eindeutig = false;
    let versuche = 0;
    
    while (!eindeutig && versuche < 10) {
      const neueBestellnummer = this.generiereBestellnummer();
      const existierende = await mongoose.model('Order').findOne({ 
        $or: [
          { bestellnummer: neueBestellnummer },
          { orderNumber: neueBestellnummer }
        ]
      });
      
      if (!existierende) {
        this.bestellnummer = neueBestellnummer;
        this.orderNumber = neueBestellnummer; // Setze beide Felder
        eindeutig = true;
      }
      versuche++;
    }
    
    if (!eindeutig) {
      const fallbackNumber = `GM${Date.now()}`;
      this.bestellnummer = fallbackNumber;
      this.orderNumber = fallbackNumber; // Setze beide Felder
    }
  }
  
  // Synchronisiere beide Felder falls nur eins gesetzt ist
  if (this.isNew) {
    if (this.bestellnummer && !this.orderNumber) {
      this.orderNumber = this.bestellnummer;
    } else if (this.orderNumber && !this.bestellnummer) {
      this.bestellnummer = this.orderNumber;
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