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
   * Validiert alle Konfigurationen und gibt validationErrors zurück wenn etwas fehlt
   */
  static async erstelleSeifenWarenberechnung(portfolio) {
    try {
      console.log('🧼 Berechne Kosten für Seife...');
      
      const validationErrors = [];

      // Prüfe Portfolio-Grunddaten
      if (!portfolio.name) {
        validationErrors.push({
          field: 'name',
          label: '📝 Produktname',
          message: `Erforderlich: Der Produktname ist nicht gesetzt`,
          solution: `Trage einen Namen für das Produkt ein`,
          configLink: '/admin/portfolio',
          configLinkLabel: 'Zur Portfolio-Verwaltung'
        });
      }
      
      if (!portfolio.gewichtInGramm || portfolio.gewichtInGramm <= 0) {
        validationErrors.push({
          field: 'gewichtInGramm',
          label: '⚖️ Gewicht in Gramm',
          message: `Erforderlich: Das Gewicht ist nicht gesetzt (aktuell: ${portfolio.gewichtInGramm || '(leer)'})`,
          solution: `Trage ein Gewicht in Gramm ein (z.B. 100 für 100g Seife)`,
          configLink: '/admin/portfolio',
          configLinkLabel: 'Zur Portfolio-Verwaltung'
        });
      }

      // Prüfe Rohseife
      const rohseife = await Rohseife.findOne({ bezeichnung: portfolio.seife })
        .select('bezeichnung preisProGramm')
        .lean();
      
      console.log(`🔍 Rohseife "${portfolio.seife}" Suche:`, {
        gefunden: !!rohseife,
        preisProGramm: rohseife?.preisProGramm,
        isNaN: isNaN(rohseife?.preisProGramm),
        typ: typeof rohseife?.preisProGramm
      });
      
      if (!rohseife) {
        validationErrors.push({
          field: 'seife',
          label: '🧼 Rohseife',
          message: `Nicht gefunden: Die Rohseife "${portfolio.seife}" existiert nicht in der Datenbank`,
          solution: `Wähle ein verfügbares Seifenprodukt aus der Dropdown-Liste oder erstelle es unter Rohseifen-Verwaltung`,
          configLink: '/admin/portfolio',
          configLinkLabel: 'Zur Portfolio-Verwaltung'
        });
        console.warn(`⚠️ Rohseife "${portfolio.seife}" für Produkt "${portfolio.name}" nicht gefunden`);
      } else if (!rohseife.preisProGramm || isNaN(rohseife.preisProGramm)) {
        validationErrors.push({
          field: 'seife',
          label: '🧼 Rohseife',
          message: `Konfiguration unvollständig: Die Rohseife "${portfolio.seife}" hat keine Kostendaten (preisProGramm=${rohseife.preisProGramm})`,
          solution: `Bearbeite die Rohseife und trage einen Preis pro Gramm ein`,
          configLink: '/admin/rohseifen',
          configLinkLabel: 'Zur Rohseifen-Verwaltung'
        });
        console.warn(`⚠️ Rohseife "${portfolio.seife}" hat keine Kostendaten`);
      }

      // Prüfe Verpackung
      const verpackung = await Verpackung.findOne({ bezeichnung: portfolio.verpackung })
        .select('kostenProStueck')
        .lean();
      
      console.log(`🔍 Verpackung "${portfolio.verpackung}" Suche:`, {
        gefunden: !!verpackung,
        kostenProStueck: verpackung?.kostenProStueck,
        isNaN: isNaN(verpackung?.kostenProStueck),
        typ: typeof verpackung?.kostenProStueck
      });
      
      if (!verpackung) {
        validationErrors.push({
          field: 'verpackung',
          label: '📦 Verpackung',
          message: `Nicht gefunden: Die Verpackung "${portfolio.verpackung}" existiert nicht in der Datenbank`,
          solution: `Wähle eine verfügbare Verpackung aus der Dropdown-Liste oder erstelle sie unter Verpackungs-Verwaltung`,
          configLink: '/admin/portfolio',
          configLinkLabel: 'Zur Portfolio-Verwaltung'
        });
        console.warn(`⚠️ Verpackung "${portfolio.verpackung}" für Produkt "${portfolio.name}" nicht gefunden`);
      } else if (!verpackung.kostenProStueck || isNaN(verpackung.kostenProStueck)) {
        validationErrors.push({
          field: 'verpackung',
          label: '📦 Verpackung',
          message: `Konfiguration unvollständig: Die Verpackung "${portfolio.verpackung}" hat keine Kostendaten (kostenProStueck=${verpackung.kostenProStueck})`,
          solution: `Bearbeite die Verpackung und trage Kosten pro Stück ein`,
          configLink: '/admin/verpackungen',
          configLinkLabel: 'Zur Verpackungs-Verwaltung'
        });
        console.warn(`⚠️ Verpackung "${portfolio.verpackung}" hat keine Kostendaten`);
      }

      // Falls kritische Fehler, wirfe Error mit validationErrors
      if (validationErrors.length > 0) {
        console.error(`❌ Creating validation error with ${validationErrors.length} issues:`, validationErrors);
        const error = new Error(`❌ Produktkonfiguration unvollständig – ${validationErrors.length} kritische Fehler`);
        error.status = 400;
        error.validationErrors = validationErrors;
        error.incomplete = true;
        console.error('Error object before throw:', {
          message: error.message,
          hasValidationErrors: !!error.validationErrors,
          validationErrorsLength: error.validationErrors.length,
          status: error.status
        });
        throw error;
      }
      
      let rohseife1Gramm = portfolio.gewichtInGramm;
      let rohseife2Gramm = 0;
      let rohseife2 = null;
      let rohseife2Kosten = 0;
      
      if (portfolio.rohseifenKonfiguration?.verwendeZweiRohseifen) {
        rohseife2 = await Rohseife.findOne({ bezeichnung: portfolio.rohseifenKonfiguration.rohseife2Name })
          .select('bezeichnung preisProGramm')
          .lean();
        if (rohseife2) {
          rohseife1Gramm = portfolio.rohseifenKonfiguration.gewichtVerteilung?.rohseife1Gramm || 0;
          rohseife2Gramm = portfolio.rohseifenKonfiguration.gewichtVerteilung?.rohseife2Gramm || 0;
          rohseife2Kosten = rohseife2Gramm * rohseife2.preisProGramm;
          console.log(`💰 Rohseife2 Kosten: ${rohseife2Gramm}g * ${rohseife2.preisProGramm}€/g = ${rohseife2Kosten}€ (isNaN: ${isNaN(rohseife2Kosten)})`);
          
          if (isNaN(rohseife2Kosten)) {
            validationErrors.push({
              field: 'rohseifenKonfiguration',
              label: '🧼 Rohseife 2 (Mischung)',
              message: `Berechnung fehlgeschlagen: ungültige Daten für Rohseife-Mischung`,
              solution: `Überprüfe die Rohseife-Mischungs-Konfiguration und stelle sicher, dass beide Rohseifen gültige Kostendaten haben`,
              configLink: '/admin/portfolio',
              configLinkLabel: 'Zur Portfolio-Verwaltung'
            });
            const error = new Error(`Portfolio \"${portfolio.name}\" hat Konfigurationsfehler bei der Berechnung`);
            error.status = 400;
            error.validationErrors = validationErrors;
            error.incomplete = true;
            throw error;
          }
        }
      }
      
      // Rohseifekosten berechnen
      const rohseifeKosten = rohseife1Gramm * rohseife.preisProGramm;
      console.log(`💰 Rohseife Kosten: ${rohseife1Gramm}g * ${rohseife.preisProGramm}€/g = ${rohseifeKosten}€ (isNaN: ${isNaN(rohseifeKosten)})`);
      
      if (isNaN(rohseifeKosten)) {
        validationErrors.push({
          field: 'gewichtInGramm',
          label: '⚖️ Gewicht in Gramm',
          message: `Berechnung fehlgeschlagen: ungültiges Gewicht oder fehlende Kostendaten`,
          solution: `Stelle sicher, dass ein gültiges Gewicht in Gramm eingetragen ist und die Rohseife Kostendaten hat`,
          configLink: '/admin/portfolio',
          configLinkLabel: 'Zur Portfolio-Verwaltung'
        });
        const error = new Error(`Portfolio \"${portfolio.name}\" hat Konfigurationsfehler bei der Berechnung`);
        error.status = 400;
        error.validationErrors = validationErrors;
        error.incomplete = true;
        throw error;
      }
      
      // Duftölkosten berechnen
      let duftoelKosten = 0;
      if (portfolio.aroma && portfolio.aroma !== 'Neutral' && portfolio.aroma !== '') {
        const duftoil = await Duftoil.findOne({ bezeichnung: portfolio.aroma })
          .select('kostenProTropfen')
          .lean();

        if (!duftoil) {
          console.warn(`⚠️ Duftoil "${portfolio.aroma}" für Produkt "${portfolio.name}" nicht gefunden`);
        }

        if (duftoil) {
          const tropfenProSeife = Math.round(portfolio.gewichtInGramm / 50);
          duftoelKosten = tropfenProSeife * duftoil.kostenProTropfen;
          console.log(`💰 Duftoil Kosten: ${tropfenProSeife} Tropfen * ${duftoil.kostenProTropfen}€ = ${duftoelKosten}€ (isNaN: ${isNaN(duftoelKosten)})`);
          
          if (isNaN(duftoelKosten)) {
            validationErrors.push({
              field: 'aroma',
              label: '🌸 Aroma/Duftoil',
              message: `Berechnung fehlgeschlagen: fehlende oder ungültige Kostendaten für Duftoil "${portfolio.aroma}"`,
              solution: `Überprüfe die Duftoil-Konfiguration und stelle sicher, dass Kostendaten vorhanden sind`,
              configLink: '/admin/duftöle',
              configLinkLabel: 'Zur Duftoil-Verwaltung'
            });
            const error = new Error(`Portfolio \"${portfolio.name}\" hat Konfigurationsfehler bei der Berechnung`);
            error.status = 400;
            error.validationErrors = validationErrors;
            error.incomplete = true;
            throw error;
          }
        }
      }
      
      // Verpackungskosten berechnen
      const verpackungKosten = verpackung ? verpackung.kostenProStueck : 0;
      console.log(`💰 Verpackung Kosten: ${verpackungKosten}€ (isNaN: ${isNaN(verpackungKosten)})`);
      
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
    } catch (err) {
      console.error('❌ Exception in erstelleSeifenWarenberechnung:', {
        message: err.message,
        hasValidationErrors: !!err.validationErrors,
        isOurError: !!(err.validationErrors && err.status),
        stack: err.stack?.split('\n').slice(0, 3).join('\n')
      });
      // Re-throw damit die Route es abfangen kann
      throw err;
    }
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