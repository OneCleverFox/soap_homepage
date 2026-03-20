const Giesswerkstoff = require('../models/Giesswerkstoff');
const Giessform = require('../models/Giessform');
const Giesszusatzstoff = require('../models/Giesszusatzstoff');

/**
 * Service für Werkstück-spezifische Warenberechnungen
 */
class WerkstuckWarenberechnungService {
  
  /**
   * Erstellt eine Warenberechnung für ein Werkstück-Portfolio-Produkt
   */
  static async erstelleWerkstuckWarenberechnung(portfolio) {
    try {
      console.log('🏺 Berechne Kosten für Werkstück...');
    console.log('🔍 Portfolio Debug:', {
      name: portfolio.name,
      kategorie: portfolio.kategorie,
      giesswerkstoff: portfolio.giesswerkstoff,
      giessform: portfolio.giessform,
      gramm: portfolio.gramm,
      giesswerkstoffKonfiguration: portfolio.giesswerkstoffKonfiguration
    });
    
    let giesswerkstoffKosten = 0;
    let giesszusatzstoffeKosten = 0;
    let gewichtInGramm = 0;
    let giesswerkstoffName = '';
    let giessformName = '';
    let giessformKosten = 0;
    let giessformVerwendungen = 50;
    
    // Gießwerkstoff laden - mit Fallbacks für fehlende Daten und fehlende Objekte
    if (portfolio.giesswerkstoff && portfolio.giessform) {
      console.log('🔍 Suche Gießwerkstoff:', portfolio.giesswerkstoff);
      console.log('🔍 Suche Gießform:', portfolio.giessform);
      
      const [giesswerkstoff, giessform] = await Promise.all([
        Giesswerkstoff.findById(portfolio.giesswerkstoff)
          .select('bezeichnung kostenProKg typ')
          .lean(),
        Giessform.findById(portfolio.giessform)
          .select('name volumenMl kostenProStueck erwarteteVerwendungen')
          .lean()
      ]);
      
      console.log('🔍 Gefundene Objekte:', {
        giesswerkstoff: giesswerkstoff ? {
          id: giesswerkstoff._id,
          bezeichnung: giesswerkstoff.bezeichnung,
          kostenProKg: giesswerkstoff.kostenProKg,
          typ: giesswerkstoff.typ
        } : null,
        giessform: giessform ? {
          id: giessform._id,
          name: giessform.name,
          volumenMl: giessform.volumenMl,
          kostenProStueck: giessform.kostenProStueck,
          erwarteteVerwendungen: giessform.erwarteteVerwendungen
        } : null
      });
      
      // Auch bei fehlenden Objekten: Verwende Standardwerte und Portfolio-Daten
      giesswerkstoffName = giesswerkstoff ? (giesswerkstoff.bezeichnung || 'Standard Gießwerkstoff') : 'Standard Gießwerkstoff';
      giessformName = giessform ? (giessform.name || 'Standard Gießform') : 'Standard Gießform';
      
      // Berechnungskonfiguration laden
      const config = portfolio.giesswerkstoffKonfiguration || {};
      const berechnungsFaktor = config.berechnungsFaktor || 1.5;
      const schwundProzent = config.schwundProzent || 5;
      
      // Volumen bestimmen: Gießform -> Portfolio.gramm -> 100ml default
      const fuellvolumenMl = (giessform && giessform.volumenMl) ? 
        giessform.volumenMl : 
        (portfolio.gramm || 100); // Verwende Portfolio-Gramm als Fallback
      
      // Benötigte Gießwerkstoff-Menge pro Stück
      const grundMenge = fuellvolumenMl * berechnungsFaktor;
      const mitSchwund = grundMenge * (1 + schwundProzent / 100);
      gewichtInGramm = Math.round(mitSchwund);
      
      // Standard-Kosten falls Gießwerkstoff nicht existiert oder keine Kosten hat
      const kostenProKg = (giesswerkstoff && giesswerkstoff.kostenProKg) ? 
        giesswerkstoff.kostenProKg : 
        5.00; // 5€/kg als Standard
        
      giesswerkstoffKosten = (mitSchwund / 1000) * kostenProKg; // g -> kg
      
      // Gießform-Kosten berechnen  
      giessformVerwendungen = (giessform && giessform.erwarteteVerwendungen) ? 
        giessform.erwarteteVerwendungen : 
        50;
      const formKostenProStueck = (giessform && giessform.kostenProStueck) ? 
        giessform.kostenProStueck : 
        5.00; // 5€ als Standard
      giessformKosten = formKostenProStueck / giessformVerwendungen;
      
      console.log(`  ✅ Erfolgreich berechnet mit Fallbacks:`);
      console.log(`  🧱 Gießwerkstoff: ${giesswerkstoffName} (${mitSchwund.toFixed(1)}g à ${kostenProKg}€/kg = ${giesswerkstoffKosten.toFixed(4)}€)`);
      console.log(`  🍱 Gießform: ${giessformName} (${giessformKosten.toFixed(4)}€ pro Verwendung von ${formKostenProStueck}€ / ${giessformVerwendungen} Verwendungen)`);
      console.log(`  📐 Volumen: ${fuellvolumenMl}ml * ${berechnungsFaktor} Faktor + ${schwundProzent}% Schwund = ${gewichtInGramm}g`);
      console.log(`  📊 Objekte gefunden: Gießwerkstoff=${!!giesswerkstoff}, Gießform=${!!giessform}`);
      
    } else {
      console.log('⚠️ Keine Gießwerkstoff- oder Gießform-ID im Portfolio gefunden');
      console.log('   Portfolio Gießwerkstoff:', portfolio.giesswerkstoff);
      console.log('   Portfolio Gießform:', portfolio.giessform);
      
      // Auch ohne Referenzen: Verwende Portfolio-Daten für grundlegende Berechnung
      giesswerkstoffName = 'Standard Gießwerkstoff';
      giessformName = 'Standard Gießform';
      
      const config = portfolio.giesswerkstoffKonfiguration || {};
      const berechnungsFaktor = config.berechnungsFaktor || 1.5;
      const schwundProzent = config.schwundProzent || 5;
      const fuellvolumenMl = portfolio.gramm || 100;
      
      const grundMenge = fuellvolumenMl * berechnungsFaktor;
      const mitSchwund = grundMenge * (1 + schwundProzent / 100);
      gewichtInGramm = Math.round(mitSchwund);
      
      giesswerkstoffKosten = (mitSchwund / 1000) * 5.00; // Standard 5€/kg
      giessformVerwendungen = 50;
      giessformKosten = 5.00 / 50; // Standard 5€ / 50 Verwendungen
      
      console.log(`  ✅ Fallback-Berechnung ohne DB-Objekte:`);
      console.log(`  🧱 Standard Gießwerkstoff: ${mitSchwund.toFixed(1)}g à 5.00€/kg = ${giesswerkstoffKosten.toFixed(4)}€`);
      console.log(`  🍱 Standard Gießform: ${giessformKosten.toFixed(4)}€ pro Verwendung`);
      console.log(`  📐 Volumen: ${fuellvolumenMl}ml (Portfolio.gramm) * ${berechnungsFaktor} Faktor + ${schwundProzent}% Schwund = ${gewichtInGramm}g`);
    }
    
    // Gießzusatzstoffe berechnen
    const giesszusatzstoffeKonfiguration = await this.berechneGiesszusatzstoffe(portfolio, gewichtInGramm);
    giesszusatzstoffeKosten = giesszusatzstoffeKonfiguration.reduce((sum, config) => sum + config.gesamtKosten, 0);
    
    return {
      kategorie: 'werkstuck',
      giesswerkstoffName,
      giessformName,
      gewichtInGramm,
      giesswerkstoffKosten,
      giesszusatzstoffeKosten,
      giessformKosten,
      giessformVerwendungen,
      giesszusatzstoffeKonfiguration,
      energieKosten: 0,
      zusatzKosten: 0,
      gewinnProzent: 0,
      rabattProzent: 0,
      pauschaleFaktor: 3,
      rundungsOption: '0.50'
    };
    } catch (err) {
      console.error('❌ Exception in erstelleWerkstuckWarenberechnung:', {
        message: err.message,
        stack: err.stack?.split('\n').slice(0, 3).join('\n')
      });
      // Re-throw damit die Route es abfangen kann
      throw err;
    }
  }
  
  /**
   * Berechnet Gießzusatzstoffe-Kosten und -Konfiguration
   */
  static async berechneGiesszusatzstoffe(portfolio, grundMenge) {
    const giesszusatzstoffeKonfiguration = [];
    
    if (portfolio.giesszusatzstoffe && portfolio.giesszusatzstoffe.length > 0) {
      const zusatzstoffe = await Promise.all(
        portfolio.giesszusatzstoffe.map((zusatzKonfig) =>
          Giesszusatzstoff.findById(zusatzKonfig.zusatzstoffId)
            .select('bezeichnung unbegrenzterVorrat kostenProKg')
            .lean()
        )
      );

      for (let i = 0; i < portfolio.giesszusatzstoffe.length; i++) {
        const zusatzKonfig = portfolio.giesszusatzstoffe[i];
        const zusatzstoff = zusatzstoffe[i];
        
        if (zusatzstoff) {
          let benoetigteMenge = 0;
          
          if (zusatzKonfig.einheit === 'prozent') {
            benoetigteMenge = (grundMenge * zusatzKonfig.mischverhaeltnis) / 100;
          } else {
            benoetigteMenge = zusatzKonfig.mischverhaeltnis;
          }
          
          let kosten = 0;
          // Nur wenn nicht unbegrenzt (Wasser etc.)
          if (!zusatzstoff.unbegrenzterVorrat) {
            kosten = (benoetigteMenge / 1000) * (zusatzstoff.kostenProKg || 0);
            console.log(`  💧 Gießzusatzstoff ${zusatzstoff.bezeichnung}: ${benoetigteMenge.toFixed(1)}ml à ${zusatzstoff.kostenProKg || 0}€/kg = ${kosten.toFixed(4)}€`);
          } else {
            console.log(`  💧 Gießzusatzstoff ${zusatzstoff.bezeichnung}: ${benoetigteMenge.toFixed(1)}ml (unbegrenzt, keine Kosten)`);
          }
          
          // Konfiguration für Frontend speichern
          giesszusatzstoffeKonfiguration.push({
            giesszusatzstoffName: zusatzstoff.bezeichnung,
            menge: benoetigteMenge,
            einheit: 'ml',
            kostenProEinheit: zusatzstoff.kostenProKg ? zusatzstoff.kostenProKg / 1000 : 0, // Pro ml
            gesamtKosten: kosten
          });
        }
      }
    }
    
    return giesszusatzstoffeKonfiguration;
  }
}

module.exports = WerkstuckWarenberechnungService;