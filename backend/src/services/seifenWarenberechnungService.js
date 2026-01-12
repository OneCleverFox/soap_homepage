const Rohseife = require('../models/Rohseife');
const Duftoil = require('../models/Duftoil');
const Verpackung = require('../models/Verpackung');
const ZusatzInhaltsstoff = require('../models/ZusatzInhaltsstoff');
const ZusatzinhaltsstoffeService = require('./zusatzinhaltsstoffeService');

/**
 * Service für Seifen-spezifische Warenberechnungen
 */
class SeifenWarenberechnungService {
  
  /**
   * Erstellt eine Warenberechnung für ein Seifen-Portfolio-Produkt
   */
  static async erstelleSeifenWarenberechnung(portfolio) {
    console.log('🧼 Berechne Kosten für Seife...');
    
    const rohseifeList = await Rohseife.find();
    const rohseife = rohseifeList.find(r => r.bezeichnung === portfolio.seife);
    
    if (!rohseife) {
      throw new Error(`Rohseife "${portfolio.seife}" nicht gefunden`);
    }
    
    // Zweite Rohseife laden falls konfiguriert
    let rohseife2 = null;
    let rohseife2Kosten = 0;
    let rohseife1Gramm = portfolio.gewichtInGramm;
    let rohseife2Gramm = 0;
    
    if (portfolio.rohseifenKonfiguration?.verwendeZweiRohseifen) {
      rohseife2 = rohseifeList.find(r => r.bezeichnung === portfolio.rohseifenKonfiguration.rohseife2Name);
      if (rohseife2) {
        rohseife1Gramm = portfolio.rohseifenKonfiguration.gewichtVerteilung?.rohseife1Gramm || 0;
        rohseife2Gramm = portfolio.rohseifenKonfiguration.gewichtVerteilung?.rohseife2Gramm || 0;
        rohseife2Kosten = rohseife2Gramm * rohseife2.preisProGramm;
      }
    }
    
    // Rohseifekosten berechnen
    const rohseifeKosten = rohseife1Gramm * rohseife.preisProGramm;
    
    // Duftölkosten berechnen
    let duftoelKosten = 0;
    if (portfolio.aroma && portfolio.aroma !== 'Neutral' && portfolio.aroma !== '') {
      const duftoilList = await Duftoil.find();
      const duftoil = duftoilList.find(d => d.bezeichnung === portfolio.aroma);
      
      if (duftoil) {
        const tropfenProSeife = Math.round(portfolio.gewichtInGramm / 50);
        duftoelKosten = tropfenProSeife * duftoil.kostenProTropfen;
      }
    }
    
    // Verpackungskosten berechnen
    const verpackungList = await Verpackung.find();
    const verpackung = verpackungList.find(v => v.bezeichnung === portfolio.verpackung);
    const verpackungKosten = verpackung ? verpackung.kostenProStueck : 0;
    
    // Warenberechnung-Daten zurückgeben
    return {
      kategorie: 'seife',
      rohseifeName: rohseife.bezeichnung,
      rohseifenKonfiguration: portfolio.rohseifenKonfiguration || {
        verwendeZweiRohseifen: false,
        rohseife2Name: '',
        gewichtVerteilung: {
          rohseife1Gramm: portfolio.gewichtInGramm,
          rohseife2Gramm: 0
        }
      },
      duftoelName: portfolio.aroma || '',
      verpackungName: portfolio.verpackung,
      gewichtInGramm: portfolio.gewichtInGramm,
      rohseifeKosten,
      rohseife2Kosten,
      duftoelKosten,
      verpackungKosten,
      energieKosten: 0,
      zusatzKosten: 0,
      gewinnProzent: 0,
      rabattProzent: 0,
      pauschaleFaktor: 3,
      rundungsOption: '0.50'
    };
  }
  
  /**
   * Aktualisiert Zusatzinhaltsstoffe für eine Seifenberechnung
   */
  static async aktualisiereZusatzinhaltsstoffe(portfolioId, berechnung) {
    try {
      const zusatzErgebnis = await ZusatzinhaltsstoffeService.aktualisiereWarenberechnung(portfolioId);
      if (zusatzErgebnis.success) {
        console.log(`✅ Zusatzinhaltsstoffe-Kosten hinzugefügt: ${(zusatzErgebnis.warenberechnung.zusatzinhaltsstoffeKostenGesamt || 0).toFixed(4)}€`);
        return zusatzErgebnis.warenberechnung;
      } else {
        console.warn(`⚠️ Fehler bei Zusatzinhaltsstoffe-Berechnung: ${zusatzErgebnis.error}`);
        return berechnung;
      }
    } catch (zusatzError) {
      console.error('❌ Fehler bei Zusatzinhaltsstoffe-Berechnung:', zusatzError);
      return berechnung;
    }
  }
}

module.exports = SeifenWarenberechnungService;