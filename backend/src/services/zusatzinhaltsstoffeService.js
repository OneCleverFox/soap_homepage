const Portfolio = require('../models/Portfolio');
const Warenberechnung = require('../models/Warenberechnung');
const ZusatzInhaltsstoff = require('../models/ZusatzInhaltsstoff');

class ZusatzinhaltsstoffeService {
  
  /**
   * Berechnet die Kosten für Zusatzinhaltsstoffe eines Produkts
   * @param {String} portfolioId - ID des Portfolio-Produkts
   * @param {Array} zusatzinhaltsstoffe - Array mit Zusatzinhaltsstoffen aus Portfolio
   * @param {Number} gewichtInGramm - Gesamtgewicht des Produkts
   * @returns {Object} Berechnungsergebnis
   */
  static async berechneZusatzinhaltsstoffeKosten(portfolioId, zusatzinhaltsstoffe, gewichtInGramm) {
    try {
      let gesamtKosten = 0;
      const konfiguration = [];
      
      for (const zusatz of zusatzinhaltsstoffe) {
        // Zusatzinhaltsstoff aus Datenbank laden
        const inhaltsstoff = await ZusatzInhaltsstoff.findOne({
          bezeichnung: zusatz.inhaltsstoffName,
          verfuegbar: true
        });
        
        if (!inhaltsstoff) {
          console.warn(`Zusatzinhaltsstoff '${zusatz.inhaltsstoffName}' nicht gefunden oder nicht verfügbar`);
          continue;
        }
        
        // Menge berechnen
        let mengeInGramm;
        if (zusatz.einheit === 'prozent') {
          mengeInGramm = (gewichtInGramm * zusatz.menge) / 100;
        } else {
          mengeInGramm = zusatz.menge;
        }
        
        // Kosten berechnen
        const kosten = mengeInGramm * inhaltsstoff.preisProGramm;
        gesamtKosten += kosten;
        
        // Konfiguration speichern
        konfiguration.push({
          inhaltsstoffName: zusatz.inhaltsstoffName,
          menge: mengeInGramm,
          einheit: 'gramm',
          kostenProEinheit: inhaltsstoff.preisProGramm,
          gesamtKosten: kosten
        });
      }
      
      return {
        success: true,
        gesamtKosten: Math.round(gesamtKosten * 10000) / 10000, // 4 Nachkommastellen
        konfiguration
      };
      
    } catch (error) {
      console.error('Fehler bei Zusatzinhaltsstoffe-Kostenberechnung:', error);
      return {
        success: false,
        error: error.message,
        gesamtKosten: 0,
        konfiguration: []
      };
    }
  }
  
  /**
   * Aktualisiert die Warenberechnung mit Zusatzinhaltsstoff-Kosten
   * @param {String} portfolioId - ID des Portfolio-Produkts
   * @returns {Object} Aktualisierungsergebnis
   */
  static async aktualisiereWarenberechnung(portfolioId) {
    try {
      // Portfolio-Produkt laden
      const portfolio = await Portfolio.findById(portfolioId);
      if (!portfolio) {
        throw new Error('Portfolio-Produkt nicht gefunden');
      }
      
      // Warenberechnung laden
      let warenberechnung = await Warenberechnung.findOne({
        portfolioProdukt: portfolioId
      });
      
      if (!warenberechnung) {
        throw new Error('Warenberechnung nicht gefunden');
      }
      
      // Zusatzinhaltsstoffe-Kosten berechnen
      if (portfolio.zusatzinhaltsstoffe && portfolio.zusatzinhaltsstoffe.length > 0) {
        const berechnungsergebnis = await this.berechneZusatzinhaltsstoffeKosten(
          portfolioId,
          portfolio.zusatzinhaltsstoffe,
          warenberechnung.gewichtInGramm
        );
        
        if (berechnungsergebnis.success) {
          warenberechnung.zusatzinhaltsstoffeKonfiguration = berechnungsergebnis.konfiguration;
          warenberechnung.zusatzinhaltsstoffeKostenGesamt = berechnungsergebnis.gesamtKosten;
        } else {
          console.error('Fehler bei Zusatzinhaltsstoffe-Berechnung:', berechnungsergebnis.error);
        }
      } else {
        // Keine Zusatzinhaltsstoffe - Reset
        warenberechnung.zusatzinhaltsstoffeKonfiguration = [];
        warenberechnung.zusatzinhaltsstoffeKostenGesamt = 0;
      }
      
      // Gesamtkalkulation neu berechnen
      await this.neuBerechnenGesamtKosten(warenberechnung);
      
      // Speichern
      await warenberechnung.save();
      
      return {
        success: true,
        warenberechnung
      };
      
    } catch (error) {
      console.error('Fehler bei Warenberechnung-Update:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
  
  /**
   * Neuberechnung der Gesamtkosten inklusive Zusatzinhaltsstoffe
   * @param {Object} warenberechnung - Warenberechnung-Dokument
   */
  static async neuBerechnenGesamtKosten(warenberechnung) {
    try {
      // Zwischensumme EK (inkl. Zusatzinhaltsstoffe)
      warenberechnung.zwischensummeEK = 
        warenberechnung.rohseifeKosten +
        warenberechnung.rohseife2Kosten +
        warenberechnung.duftoelKosten +
        warenberechnung.verpackungKosten +
        warenberechnung.zusatzinhaltsstoffeKostenGesamt +
        warenberechnung.energieKosten +
        warenberechnung.zusatzKosten;
      
      // Pauschale (EK * Faktor)
      warenberechnung.pauschale = warenberechnung.zwischensummeEK * warenberechnung.pauschaleFaktor;
      
      // Gewinn berechnen
      warenberechnung.gewinnBetrag = warenberechnung.pauschale * (warenberechnung.gewinnProzent / 100);
      
      // Zwischensumme vor Rabatt
      warenberechnung.zwischensummeVorRabatt = warenberechnung.pauschale + warenberechnung.gewinnBetrag;
      
      // Rabatt berechnen
      warenberechnung.rabattBetrag = warenberechnung.zwischensummeVorRabatt * (warenberechnung.rabattProzent / 100);
      
      // VK-Preis
      warenberechnung.vkPreis = warenberechnung.zwischensummeVorRabatt - warenberechnung.rabattBetrag;
      
      // Rundung anwenden
      warenberechnung.vkPreisGerundet = this.rundePreis(warenberechnung.vkPreis, warenberechnung.rundungsOption);
      
    } catch (error) {
      console.error('Fehler bei Gesamtkostenberechnung:', error);
      throw error;
    }
  }
  
  /**
   * Preis-Rundung basierend auf Rundungsoption
   * @param {Number} preis - Ursprünglicher Preis
   * @param {String} rundungsOption - Rundungsoption
   * @returns {Number} Gerundeter Preis
   */
  static rundePreis(preis, rundungsOption) {
    switch (rundungsOption) {
      case '0.10':
        return Math.round(preis * 10) / 10;
      case '0.50':
        return Math.round(preis * 2) / 2;
      case '1.00':
        return Math.round(preis);
      case '0.99':
        return Math.floor(preis) + 0.99;
      default:
        return Math.round(preis * 100) / 100; // 2 Dezimalstellen
    }
  }
  
  /**
   * Prüft und aktualisiert alle Warenberechnungen bei Preisänderungen
   * @param {String} inhaltsstoffId - ID des geänderten Zusatzinhaltsstoffs
   */
  static async aktualisiereAlleBetroffenenWarenberechnungen(inhaltsstoffId) {
    try {
      const inhaltsstoff = await ZusatzInhaltsstoff.findById(inhaltsstoffId);
      if (!inhaltsstoff) {
        throw new Error('Zusatzinhaltsstoff nicht gefunden');
      }
      
      // Alle Portfolio-Produkte finden, die diesen Inhaltsstoff verwenden
      const betroffenePortfolios = await Portfolio.find({
        'zusatzinhaltsstoffe.inhaltsstoffName': inhaltsstoff.bezeichnung
      });
      
      let erfolgreichAktualisiert = 0;
      let fehlerBeiAktualisierung = 0;
      
      for (const portfolio of betroffenePortfolios) {
        const ergebnis = await this.aktualisiereWarenberechnung(portfolio._id);
        if (ergebnis.success) {
          erfolgreichAktualisiert++;
        } else {
          fehlerBeiAktualisierung++;
          console.error(`Fehler bei Aktualisierung von Portfolio ${portfolio.name}:`, ergebnis.error);
        }
      }
      
      return {
        success: true,
        betroffeneProdukte: betroffenePortfolios.length,
        erfolgreichAktualisiert,
        fehlerBeiAktualisierung
      };
      
    } catch (error) {
      console.error('Fehler bei Massen-Aktualisierung:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
  
  /**
   * Validiert Zusatzinhaltsstoffe-Konfiguration
   * @param {Array} zusatzinhaltsstoffe - Array mit Zusatzinhaltsstoffen
   * @param {Number} maxGewicht - Maximales Produktgewicht in Gramm
   * @returns {Object} Validierungsergebnis
   */
  static async validiereZusatzinhaltsstoffe(zusatzinhaltsstoffe, maxGewicht = 200) {
    const fehler = [];
    const warnungen = [];
    let gesamtMengeGramm = 0;
    
    for (const zusatz of zusatzinhaltsstoffe) {
      // Zusatzinhaltsstoff existiert?
      const inhaltsstoff = await ZusatzInhaltsstoff.findOne({
        bezeichnung: zusatz.inhaltsstoffName
      });
      
      if (!inhaltsstoff) {
        fehler.push(`Zusatzinhaltsstoff '${zusatz.inhaltsstoffName}' existiert nicht`);
        continue;
      }
      
      if (!inhaltsstoff.verfuegbar) {
        warnungen.push(`Zusatzinhaltsstoff '${zusatz.inhaltsstoffName}' ist nicht verfügbar`);
      }
      
      // Mengenberechnung für Validierung
      let mengeInGramm;
      if (zusatz.einheit === 'prozent') {
        if (zusatz.menge > inhaltsstoff.dosierung.empfohleneProzentzahl * 2) {
          warnungen.push(`${zusatz.inhaltsstoffName}: ${zusatz.menge}% übersteigt die empfohlene Dosierung von ${inhaltsstoff.dosierung.empfohleneProzentzahl}%`);
        }
        mengeInGramm = (maxGewicht * zusatz.menge) / 100;
      } else {
        mengeInGramm = zusatz.menge;
        if (mengeInGramm > inhaltsstoff.dosierung.maximaleMenge) {
          warnungen.push(`${zusatz.inhaltsstoffName}: ${mengeInGramm}g übersteigt die maximale Menge von ${inhaltsstoff.dosierung.maximaleMenge}g`);
        }
      }
      
      gesamtMengeGramm += mengeInGramm;
    }
    
    // Gesamtmenge prüfen (sollte nicht mehr als 20% des Produktgewichts sein)
    if (gesamtMengeGramm > maxGewicht * 0.2) {
      warnungen.push(`Gesamtmenge der Zusatzinhaltsstoffe (${gesamtMengeGramm.toFixed(1)}g) übersteigt 20% des Produktgewichts`);
    }
    
    return {
      isValid: fehler.length === 0,
      fehler,
      warnungen,
      gesamtMengeGramm: Math.round(gesamtMengeGramm * 10) / 10
    };
  }
  
}

module.exports = ZusatzinhaltsstoffeService;