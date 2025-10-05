const mongoose = require('mongoose');

const warenberechnungSchema = new mongoose.Schema({
  // Referenz zum Portfolio-Produkt
  portfolioProdukt: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Portfolio',
    required: true,
    unique: true
  },
  produktName: {
    type: String,
    required: true
  },
  
  // Rohstoff-Referenzen (Namen)
  rohseifeName: {
    type: String,
    required: true
  },
  duftoelName: {
    type: String,
    default: ''
  },
  verpackungName: {
    type: String,
    required: true
  },
  
  // Gewicht und Mengen
  gewichtInGramm: {
    type: Number,
    required: true,
    default: 50
  },
  
  // Fixe Kosten (berechnet aus Rohstoffen)
  rohseifeKosten: {
    type: Number,
    default: 0
  },
  duftoelKosten: {
    type: Number,
    default: 0
  },
  verpackungKosten: {
    type: Number,
    default: 0
  },
  
  // Bearbeitbare Kosten
  energieKosten: {
    type: Number,
    default: 0,
    min: 0
  },
  zusatzKosten: {
    type: Number,
    default: 0
  },
  
  // Bearbeitbare Kalkulations-Parameter
  gewinnProzent: {
    type: Number,
    default: 0,
    min: 0,
    max: 200  // Erhöht von 100 auf 200 für flexible Kalkulation
  },
  rabattProzent: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },
  
  // Pauschale (Standard: EK * 3)
  pauschaleFaktor: {
    type: Number,
    default: 3,
    min: 1
  },
  
  // Berechnete Werte
  zwischensummeEK: {
    type: Number,
    default: 0
  },
  pauschale: {
    type: Number,
    default: 0
  },
  gewinnBetrag: {
    type: Number,
    default: 0
  },
  zwischensummeVorRabatt: {
    type: Number,
    default: 0
  },
  rabattBetrag: {
    type: Number,
    default: 0
  },
  vkPreis: {
    type: Number,
    default: 0
  },
  vkPreisGerundet: {
    type: Number,
    default: 0
  },
  
  // Rundungsoption
  rundungsOption: {
    type: String,
    enum: ['keine', '0.10', '0.50', '1.00', '0.99'],
    default: '0.50'
  },
  
  // Notizen
  notizen: {
    type: String,
    default: ''
  }
}, {
  timestamps: true
});

// Pre-save Hook: Berechnungen durchführen
warenberechnungSchema.pre('save', function(next) {
  // Zwischensumme EK
  this.zwischensummeEK = 
    this.rohseifeKosten + 
    this.duftoelKosten + 
    this.verpackungKosten + 
    this.energieKosten;
  
  // Pauschale (EK * Faktor)
  this.pauschale = this.zwischensummeEK * this.pauschaleFaktor;
  
  // Gewinn
  this.gewinnBetrag = (this.pauschale * this.gewinnProzent) / 100;
  
  // Zwischensumme vor Rabatt
  this.zwischensummeVorRabatt = this.pauschale + this.gewinnBetrag;
  
  // Rabatt
  this.rabattBetrag = (this.zwischensummeVorRabatt * this.rabattProzent) / 100;
  
  // VK Preis (exakt)
  this.vkPreis = this.zwischensummeVorRabatt - this.rabattBetrag + this.zusatzKosten;
  
  // VK Preis gerundet
  this.vkPreisGerundet = roundPrice(this.vkPreis, this.rundungsOption);
  
  next();
});

// Hilfsfunktion: Preis runden
function roundPrice(price, option) {
  switch (option) {
    case 'keine':
      return Math.round(price * 100) / 100; // Auf 2 Dezimalstellen
      
    case '0.10':
      // Auf 10 Cent aufrunden: =AUFRUNDEN(Preis*10;0)/10
      return Math.ceil(price * 10) / 10;
      
    case '0.50':
      // Auf 50 Cent aufrunden: =AUFRUNDEN(Preis*2;0)/2
      return Math.ceil(price * 2) / 2;
      
    case '1.00':
      // Auf volle Euro aufrunden: =AUFRUNDEN(Preis;0)
      return Math.ceil(price);
      
    case '0.99':
      // Psychologische Preisgestaltung: z.B. 6,47 € -> 6,99 €
      const rounded = Math.ceil(price);
      return rounded - 0.01;
      
    default:
      return Math.ceil(price * 2) / 2; // Default: 0.50
  }
}

module.exports = mongoose.model('Warenberechnung', warenberechnungSchema);
