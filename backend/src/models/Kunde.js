const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const kundenSchema = new mongoose.Schema({
  // Persönliche Daten
  vorname: {
    type: String,
    required: [true, 'Vorname ist erforderlich'],
    trim: true,
    minlength: [2, 'Vorname muss mindestens 2 Zeichen lang sein'],
    maxlength: [50, 'Vorname darf maximal 50 Zeichen lang sein']
  },
  nachname: {
    type: String,
    required: [true, 'Nachname ist erforderlich'],
    trim: true,
    minlength: [2, 'Nachname muss mindestens 2 Zeichen lang sein'],
    maxlength: [50, 'Nachname darf maximal 50 Zeichen lang sein']
  },
  email: {
    type: String,
    required: [true, 'E-Mail ist erforderlich'],
    unique: true, // Dies erstellt automatisch einen Index - entferne duplicaten schema.index()
    lowercase: true,
    trim: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Bitte geben Sie eine gültige E-Mail-Adresse ein']
  },
  telefon: {
    type: String,
    trim: true,
    validate: {
      validator: function(v) {
        // Nur validieren wenn Telefon tatsächlich angegeben wurde
        if (!v || v === '') return true;
        return /^[\d\s\-\+\(\)\/]{10,20}$/.test(v);
      },
      message: 'Bitte geben Sie eine gültige Telefonnummer ein'
    }
  },
  passwort: {
    type: String,
    required: [true, 'Passwort ist erforderlich'],
    minlength: [8, 'Passwort muss mindestens 8 Zeichen lang sein']
  },
  
  // Adressdaten
  adresse: {
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
      trim: true, // z.B. "c/o", "2. Stock", etc.
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
      default: 'Deutschland',
      trim: true
    }
  },
  
  // Abweichende Lieferadresse (optional)
  lieferadresse: {
    verwendet: {
      type: Boolean,
      default: false
    },
    firmenname: {
      type: String,
      trim: true,
      default: ''
    },
    vorname: {
      type: String,
      trim: true,
      default: ''
    },
    nachname: {
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
  
  // Kundenprofil
  geburtsdatum: {
    type: Date
  },
  geschlecht: {
    type: String,
    enum: ['männlich', 'weiblich', 'divers', 'keine Angabe'],
    default: 'keine Angabe'
  },
  kundennummer: {
    type: String,
    unique: true, // Dies erstellt automatisch einen Index - entferne duplicaten schema.index()
    trim: true
  },
  
  // Präferenzen und Einstellungen
  praeferenzen: {
    newsletter: {
      type: Boolean,
      default: false
    },
    werbung: {
      type: Boolean,
      default: false
    },
    sms: {
      type: Boolean,
      default: false
    },
    datenschutz: {
      type: Boolean,
      required: [true, 'Datenschutzerklärung muss akzeptiert werden'],
      default: false
    },
    agb: {
      type: Boolean,
      required: [true, 'AGB müssen akzeptiert werden'],
      default: false
    }
  },
  
  // Kaufverhalten und Interessen
  interessen: {
    duftrichtungen: [{
      type: String,
      enum: ['blumig', 'frisch', 'holzig', 'süß', 'kräuterig', 'orientalisch', 'fruchtig']
    }],
    produkttypen: [{
      type: String,
      enum: ['naturseifen', 'duschseifen', 'haarseife', 'rasierseife', 'peelingseifen', 'geschenksets']
    }],
    hauttyp: {
      type: String,
      enum: ['normal', 'trocken', 'fettig', 'sensibel', 'gemischt', 'keine Angabe'],
      default: 'keine Angabe'
    },
    allergien: [{
      type: String,
      trim: true
    }]
  },
  
  // Account-Status
  status: {
    aktiv: {
      type: Boolean,
      default: true
    },
    emailVerifiziert: {
      type: Boolean,
      default: false
    },
    telefonVerifiziert: {
      type: Boolean,
      default: false
    },
    gesperrt: {
      type: Boolean,
      default: false
    },
    sperrgrund: {
      type: String,
      trim: true,
      default: ''
    }
  },
  
  // Tracking und Statistiken
  statistiken: {
    anzahlBestellungen: {
      type: Number,
      default: 0
    },
    gesamtumsatz: {
      type: Number,
      default: 0
    },
    letzteBestellung: {
      type: Date
    },
    erstbestellung: {
      type: Date
    },
    lieblingsprodukte: [{
      produktName: String,
      anzahlKaeufe: Number
    }]
  },
  
  // Kommunikation
  kommunikation: {
    bevorzugteKontaktart: {
      type: String,
      enum: ['email', 'telefon', 'post', 'sms'],
      default: 'email'
    },
    sprache: {
      type: String,
      default: 'deutsch'
    },
    timezone: {
      type: String,
      default: 'Europe/Berlin'
    }
  },
  
  // Metadaten
  rolle: {
    type: String,
    enum: ['kunde', 'admin'],
    default: 'kunde'
  },
  erstelltVon: {
    type: String,
    default: 'kunde' // 'kunde', 'admin', 'import'
  },
  letzteAnmeldung: {
    type: Date
  },
  anmeldeversuche: {
    type: Number,
    default: 0
  },
  anzahlAnmeldungen: {
    type: Number,
    default: 0
  },
  notizen: {
    type: String,
    trim: true,
    default: ''
  }
}, {
  collection: 'kundendaten',
  timestamps: true
});

// Virtuelle Felder
kundenSchema.virtual('vollname').get(function() {
  return `${this.vorname} ${this.nachname}`;
});

kundenSchema.virtual('vollstadresse').get(function() {
  return `${this.adresse.strasse} ${this.adresse.hausnummer}, ${this.adresse.plz} ${this.adresse.stadt}`;
});

kundenSchema.virtual('kundenalter').get(function() {
  if (!this.geburtsdatum) return null;
  const heute = new Date();
  const alter = heute.getFullYear() - this.geburtsdatum.getFullYear();
  return alter;
});

// Methoden
kundenSchema.methods.generiereKundennummer = function() {
  const datum = new Date();
  const jahr = datum.getFullYear().toString().slice(-2);
  const monat = (datum.getMonth() + 1).toString().padStart(2, '0');
  const random = Math.floor(Math.random() * 9999).toString().padStart(4, '0');
  return `KD${jahr}${monat}${random}`;
};

kundenSchema.methods.vergleichePasswort = async function(eingabePasswort) {
  // Sicherheitscheck: Wenn kein Passwort gesetzt ist, Login verweigern
  if (!this.passwort) {
    console.log('❌ Kein Passwort für Benutzer:', this.email);
    return false;
  }
  
  return await bcrypt.compare(eingabePasswort, this.passwort);
};

kundenSchema.methods.aktualisiereStatistiken = function(bestellwert) {
  this.statistiken.anzahlBestellungen += 1;
  this.statistiken.gesamtumsatz += bestellwert;
  this.statistiken.letzteBestellung = new Date();
  
  if (this.statistiken.anzahlBestellungen === 1) {
    this.statistiken.erstbestellung = new Date();
  }
};

// Hooks
kundenSchema.pre('save', async function(next) {
  // Passwort hashen
  if (this.isModified('passwort')) {
    const salt = await bcrypt.genSalt(12);
    this.passwort = await bcrypt.hash(this.passwort, salt);
  }
  
  // Kundennummer generieren falls nicht vorhanden
  if (this.isNew && !this.kundennummer) {
    let eindeutig = false;
    let versuche = 0;
    
    while (!eindeutig && versuche < 10) {
      const neueKundennummer = this.generiereKundennummer();
      const existierender = await mongoose.model('Kunde').findOne({ kundennummer: neueKundennummer });
      
      if (!existierender) {
        this.kundennummer = neueKundennummer;
        eindeutig = true;
      }
      versuche++;
    }
    
    if (!eindeutig) {
      // Fallback mit Timestamp
      this.kundennummer = `KD${Date.now()}`;
    }
  }
  
  // E-Mail zur Kleinschreibung
  if (this.isModified('email')) {
    this.email = this.email.toLowerCase().trim();
  }
  
  next();
});

// Indizes - email index wird automatisch durch unique: true erstellt
// kundenSchema.index({ kundennummer: 1 }, { unique: true }); // ENTFERNT - wird durch unique: true automatisch erstellt
kundenSchema.index({ 'adresse.plz': 1 });
kundenSchema.index({ 'statistiken.gesamtumsatz': -1 });
kundenSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Kunde', kundenSchema, 'kundendaten');