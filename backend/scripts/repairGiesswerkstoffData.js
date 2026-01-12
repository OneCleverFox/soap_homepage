/**
 * Script zur Reparatur korrupter Gießwerkstoff-Daten
 * Führt eine einmalige Migration durch um leere/ungültige mischkonfiguration-Werte zu reparieren
 */

const mongoose = require('mongoose');
require('dotenv').config();

// Datenbankverbindung
async function connectDB() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ MongoDB verbunden');
  } catch (error) {
    console.error('❌ MongoDB Verbindungsfehler:', error.message);
    process.exit(1);
  }
}

// Einfaches Gießwerkstoff Schema ohne Hooks für Reparatur
const simpleGiesswerkstoffSchema = new mongoose.Schema({}, { 
  collection: 'giesswerkstoffs',
  strict: false 
});

const SimpleGiesswerkstoff = mongoose.model('SimpleGiesswerkstoff', simpleGiesswerkstoffSchema);

async function repairGiesswerkstoffData() {
  try {
    console.log('🔧 Starte Gießwerkstoff-Datenreparatur...');
    
    // Finde alle Gießwerkstoffe mit korrupter mischkonfiguration
    const corruptedDocs = await SimpleGiesswerkstoff.find({
      $or: [
        { mischkonfiguration: "" },
        { mischkonfiguration: { $exists: false } },
        { mischkonfiguration: null }
      ]
    });
    
    console.log(`🔍 Gefundene korrupte Einträge: ${corruptedDocs.length}`);
    
    if (corruptedDocs.length === 0) {
      console.log('✅ Keine korrupten Daten gefunden - alles ist in Ordnung!');
      return;
    }
    
    // Repariere jeden korrupten Eintrag
    let repairedCount = 0;
    for (const doc of corruptedDocs) {
      console.log(`🔧 Repariere Eintrag: ${doc.bezeichnung || doc._id}`);
      
      await SimpleGiesswerkstoff.updateOne(
        { _id: doc._id },
        {
          $set: {
            mischkonfiguration: {
              berechnungsFaktor: 1.5,
              schwundProzent: 5,
              zusaetzlichesMaterial: []
            }
          }
        }
      );
      
      repairedCount++;
    }
    
    console.log(`✅ Erfolgreich ${repairedCount} Einträge repariert!`);
    
    // Verifikation - nochmal prüfen
    const stillCorrupted = await SimpleGiesswerkstoff.find({
      $or: [
        { mischkonfiguration: "" },
        { mischkonfiguration: { $exists: false } },
        { mischkonfiguration: null }
      ]
    });
    
    if (stillCorrupted.length === 0) {
      console.log('✅ Verifikation erfolgreich - alle Daten sind jetzt korrekt!');
    } else {
      console.warn(`⚠️  Noch ${stillCorrupted.length} korrupte Einträge gefunden`);
    }
    
  } catch (error) {
    console.error('❌ Fehler bei der Datenreparatur:', error);
  }
}

async function main() {
  await connectDB();
  await repairGiesswerkstoffData();
  await mongoose.disconnect();
  console.log('🏁 Reparaturscript beendet');
  process.exit(0);
}

if (require.main === module) {
  main();
}