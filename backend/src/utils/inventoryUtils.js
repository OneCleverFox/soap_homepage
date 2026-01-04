const Bestand = require('../models/Bestand');
const Portfolio = require('../models/Portfolio');
const Rohseife = require('../models/Rohseife');

/**
 * Reduziert den Lagerbestand für ein Produkt (mit einem oder zwei Rohseifen)
 * @param {string} produktId - ID des Produkts
 * @param {number} verkaufteMenge - Anzahl der verkauften Produkte  
 * @param {Object} options - Optionen
 * @param {boolean} options.dryRun - Nur prüfen, nicht ändern
 * @returns {Object} - Ergebnis der Operation
 */
async function reduceInventoryForProduct(produktId, verkaufteMenge, options = {}) {
  const { dryRun = false } = options;
  
  try {
    console.log(`🔍 Inventar-Reduktion für Produkt ${produktId}, Menge: ${verkaufteMenge}${dryRun ? ' (DRY RUN)' : ''}`);
    
    // 1. Portfolio-Produkt laden um Rohseifen-Konfiguration zu erhalten
    const produkt = await Portfolio.findById(produktId).lean();
    if (!produkt) {
      throw new Error(`Produkt mit ID ${produktId} nicht gefunden`);
    }
    
    // 2. Bestandseinträge sammeln die reduziert werden müssen
    const inventoryOperations = [];
    
    if (produkt.rohseifenKonfiguration?.verwendeZweiRohseifen) {
      console.log(`🔧 Dual-Soap-Produkt erkannt: ${produkt.name}`);
      console.log(`   - Seife 1: ${produkt.seife} (${produkt.rohseifenKonfiguration.gewichtVerteilung.seife1Prozent}%)`);
      console.log(`   - Seife 2: ${produkt.rohseifenKonfiguration.seife2} (${produkt.rohseifenKonfiguration.gewichtVerteilung.seife2Prozent}%)`);
      
      // Berechne benötigte Mengen für beide Rohseifen
      const totalGramm = produkt.gramm * verkaufteMenge;
      const seife1Gramm = Math.round(totalGramm * (produkt.rohseifenKonfiguration.gewichtVerteilung.seife1Prozent / 100));
      const seife2Gramm = Math.round(totalGramm * (produkt.rohseifenKonfiguration.gewichtVerteilung.seife2Prozent / 100));
      
      console.log(`   - Benötigte Menge Seife 1: ${seife1Gramm}g`);
      console.log(`   - Benötigte Menge Seife 2: ${seife2Gramm}g`);
      
      // Operation für erste Seife
      inventoryOperations.push({
        rohseifeName: produkt.seife,
        benoetigteMenge: seife1Gramm,
        prozent: produkt.rohseifenKonfiguration.gewichtVerteilung.seife1Prozent
      });
      
      // Operation für zweite Seife
      inventoryOperations.push({
        rohseifeName: produkt.rohseifenKonfiguration.seife2,
        benoetigteMenge: seife2Gramm,
        prozent: produkt.rohseifenKonfiguration.gewichtVerteilung.seife2Prozent
      });
      
    } else {
      console.log(`🔧 Single-Soap-Produkt: ${produkt.name}`);
      console.log(`   - Seife: ${produkt.seife}`);
      
      // Bei nur einer Rohseife: gesamte Produktmenge
      const benoetigteMenge = produkt.gramm * verkaufteMenge;
      
      inventoryOperations.push({
        rohseifeName: produkt.seife,
        benoetigteMenge: benoetigteMenge,
        prozent: 100
      });
    }
    
    // 3. Bestandsprüfung und Reduktion durchführen
    const results = [];
    
    for (const operation of inventoryOperations) {
      try {
        // Bestand für diese Rohseife suchen
        // 1. Rohseife-Record aus der Rohseife-Collection finden
        const rohseifeRecord = await Rohseife.findOne({ 
          bezeichnung: operation.rohseifeName
        }).lean();
        
        if (!rohseifeRecord) {
          console.warn(`⚠️ Rohseife "${operation.rohseifeName}" nicht in Rohseife-Collection gefunden`);
          results.push({
            rohseife: operation.rohseifeName,
            success: false,
            error: 'Rohseife nicht in Datenbank gefunden',
            benoetigteMenge: operation.benoetigteMenge,
            verfuegbareMenge: 0
          });
          continue;
        }
        
        // 2. Bestand für diese Rohseife-ID suchen
        const bestand = await Bestand.findOne({
          artikelId: rohseifeRecord._id,
          typ: 'rohseife'
        });
        
        if (!bestand) {
          console.warn(`⚠️ Kein Bestandseintrag für Rohseife: ${operation.rohseifeName}`);
          results.push({
            rohseife: operation.rohseifeName,
            success: false,
            error: 'Kein Bestandseintrag gefunden',
            benoetigteMenge: operation.benoetigteMenge,
            verfuegbareMenge: 0
          });
          continue;
        }
        
        // Prüfe ob genügend Bestand vorhanden
        if (bestand.menge < operation.benoetigteMenge) {
          console.warn(`⚠️ Nicht genügend Bestand für ${operation.rohseifeName}: verfügbar ${bestand.menge}g, benötigt ${operation.benoetigteMenge}g`);
          results.push({
            rohseife: operation.rohseifeName,
            success: false,
            error: 'Nicht genügend Bestand',
            benoetigteMenge: operation.benoetigteMenge,
            verfuegbareMenge: bestand.menge
          });
          continue;
        }
        
        // Bestand reduzieren (wenn nicht DryRun)
        if (!dryRun) {
          bestand.menge -= operation.benoetigteMenge;
          await bestand.save();
        }
        
        console.log(`✅ Bestand für ${operation.rohseifeName} ${dryRun ? 'würde reduziert werden' : 'reduziert'}: -${operation.benoetigteMenge}g (${operation.prozent}%), Restbestand: ${bestand.menge - (dryRun ? 0 : operation.benoetigteMenge)}g`);
        
        results.push({
          rohseife: operation.rohseifeName,
          success: true,
          reduzierung: operation.benoetigteMenge,
          prozent: operation.prozent,
          neuerBestand: dryRun ? bestand.menge : bestand.menge,
          verfuegbareMenge: bestand.menge + (dryRun ? 0 : operation.benoetigteMenge)
        });
        
      } catch (operationError) {
        console.error(`❌ Fehler bei Bestandsreduktion für ${operation.rohseifeName}:`, operationError);
        results.push({
          rohseife: operation.rohseifeName,
          success: false,
          error: operationError.message,
          benoetigteMenge: operation.benoetigteMenge
        });
      }
    }
    
    // 4. Gesamtergebnis zusammenfassen
    const allSuccessful = results.every(r => r.success);
    const partialSuccess = results.some(r => r.success);
    
    const summary = {
      success: allSuccessful,
      partialSuccess: partialSuccess && !allSuccessful,
      produktName: produkt.name,
      verkaufteMenge: verkaufteMenge,
      isDualSoap: produkt.rohseifenKonfiguration?.verwendeZweiRohseifen,
      operations: results,
      dryRun: dryRun
    };
    
    if (allSuccessful) {
      console.log(`✅ Inventar-Reduktion für ${produkt.name} erfolgreich abgeschlossen`);
    } else {
      console.warn(`⚠️ Inventar-Reduktion für ${produkt.name} teilweise oder vollständig fehlgeschlagen`);
    }
    
    return summary;
    
  } catch (error) {
    console.error(`❌ Fehler bei Inventar-Reduktion für Produkt ${produktId}:`, error);
    throw error;
  }
}

/**
 * Prüft ob genügend Bestand für ein Produkt vorhanden ist
 * @param {string} produktId - ID des Produkts
 * @param {number} benoetigteMenge - Benötigte Menge
 * @returns {Object} - Bestandsprüfung-Ergebnis
 */
async function checkInventoryForProduct(produktId, benoetigteMenge) {
  return await reduceInventoryForProduct(produktId, benoetigteMenge, { dryRun: true });
}

module.exports = {
  reduceInventoryForProduct,
  checkInventoryForProduct
};