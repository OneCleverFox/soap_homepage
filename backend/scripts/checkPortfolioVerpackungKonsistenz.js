/**
 * DATENBEREINIGUNG: Portfolio-Verpackungs-Konsistenz-Check
 * 
 * Dieses Script überprüft alle Portfolio-Produkte auf veraltete oder 
 * nicht-existierende Verpackungsreferenzen und bietet Korrekturmöglichkeiten.
 * 
 * VERWENDUNG:
 * node scripts/checkPortfolioVerpackungKonsistenz.js
 */

// Dotenv-Konfiguration zuerst laden
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const mongoose = require('mongoose');
const Portfolio = require('../src/models/Portfolio');
const Verpackung = require('../src/models/Verpackung');
const logger = require('../src/utils/logger');

// Datenbankverbindung (verwende gleiche Logik wie server.js)
const connectDB = async () => {
  try {
    const mongoURI = process.env.MONGODB_URI || 'mongodb+srv://ralf:kN7uNRXN5aWRZBtR@soap.eybn71b.mongodb.net/gluecksmomente?retryWrites=true&w=majority&appName=soap';
    await mongoose.connect(mongoURI);
    console.log('✅ MongoDB verbunden');
  } catch (error) {
    console.error('❌ MongoDB Verbindungsfehler:', error);
    process.exit(1);
  }
};

async function checkPortfolioVerpackungKonsistenz() {
  console.log('\n🔍 PORTFOLIO-VERPACKUNG KONSISTENZ-CHECK\n');
  
  try {
    // 1. Lade alle verfügbaren Verpackungen
    const verfuegbareVerpackungen = await Verpackung.find({ verfuegbar: true });
    const verfuegbareNamen = verfuegbareVerpackungen.map(v => v.bezeichnung);
    console.log(`✅ ${verfuegbareVerpackungen.length} verfügbare Verpackungen gefunden:`);
    verfuegbareNamen.forEach(name => console.log(`   - ${name}`));
    
    // 2. Lade alle nicht-verfügbaren Verpackungen
    const nichtverfuegbareVerpackungen = await Verpackung.find({ verfuegbar: false });
    const nichtverfuegbareNamen = nichtverfuegbareVerpackungen.map(v => v.bezeichnung);
    if (nichtverfuegbareVerpackungen.length > 0) {
      console.log(`\n⚠️ ${nichtverfuegbareVerpackungen.length} deaktivierte Verpackungen gefunden:`);
      nichtverfuegbareNamen.forEach(name => console.log(`   - ${name}`));
    }
    
    // 3. Lade alle Portfolio-Produkte
    const portfolioProdukte = await Portfolio.find({});
    console.log(`\n📦 ${portfolioProdukte.length} Portfolio-Produkte überprüfen...\n`);
    
    // 4. Analysiere Verpackungs-Konsistenz
    const probleme = {
      nichtGefunden: [],      // Verpackung existiert gar nicht in DB
      deaktiviert: [],        // Verpackung existiert, ist aber deaktiviert
      korrekt: []             // Verpackung ist verfügbar
    };
    
    portfolioProdukte.forEach(produkt => {
      const verpackungName = produkt.verpackung;
      
      if (verfuegbareNamen.includes(verpackungName)) {
        probleme.korrekt.push({
          produktName: produkt.name,
          verpackung: verpackungName,
          status: 'korrekt'
        });
      } else if (nichtverfuegbareNamen.includes(verpackungName)) {
        probleme.deaktiviert.push({
          produktName: produkt.name,
          verpackung: verpackungName,
          produktId: produkt._id,
          status: 'deaktiviert'
        });
      } else {
        probleme.nichtGefunden.push({
          produktName: produkt.name,
          verpackung: verpackungName,
          produktId: produkt._id,
          status: 'nicht_gefunden'
        });
      }
    });
    
    // 5. Ergebnisse ausgeben
    console.log('📊 KONSISTENZ-ANALYSE:');
    console.log(`✅ Korrekte Produkte: ${probleme.korrekt.length}`);
    console.log(`⚠️ Deaktivierte Verpackungen: ${probleme.deaktiviert.length}`);
    console.log(`❌ Nicht gefundene Verpackungen: ${probleme.nichtGefunden.length}\n`);
    
    // 6. Details zu Problemen
    if (probleme.deaktiviert.length > 0) {
      console.log('⚠️ PRODUKTE MIT DEAKTIVIERTEN VERPACKUNGEN:');
      probleme.deaktiviert.forEach(p => {
        console.log(`   - "${p.produktName}" → "${p.verpackung}" (deaktiviert)`);
      });
      console.log('   💡 LÖSUNG: Verpackungen reaktivieren oder Produktverpackung ändern\n');
    }
    
    if (probleme.nichtGefunden.length > 0) {
      console.log('❌ PRODUKTE MIT NICHT-EXISTIERENDEN VERPACKUNGEN:');
      probleme.nichtGefunden.forEach(p => {
        console.log(`   - "${p.produktName}" → "${p.verpackung}" (nicht in DB)`);
      });
      console.log('   💡 LÖSUNG: Verpackung in Verpackungen-Verwaltung anlegen oder Produktverpackung ändern\n');
    }
    
    // 7. Auto-Fix Optionen
    if (probleme.nichtGefunden.length > 0 || probleme.deaktiviert.length > 0) {
      console.log('🔧 AUTO-FIX OPTIONEN:\n');
      
      if (probleme.nichtGefunden.length > 0) {
        console.log('1. FEHLENDE VERPACKUNGEN ERSTELLEN:');
        const uniqueFehlende = [...new Set(probleme.nichtGefunden.map(p => p.verpackung))];
        uniqueFehlende.forEach(name => {
          console.log(`   Verpackung.create({ bezeichnung: "${name}", menge: 1, kostenInEuro: 0.50, kostenProStueck: 0.50 })`);
        });
      }
      
      if (probleme.deaktiviert.length > 0) {
        console.log('\n2. DEAKTIVIERTE VERPACKUNGEN REAKTIVIEREN:');
        const uniqueDeaktiviert = [...new Set(probleme.deaktiviert.map(p => p.verpackung))];
        uniqueDeaktiviert.forEach(name => {
          console.log(`   Verpackung.updateOne({ bezeichnung: "${name}" }, { verfuegbar: true })`);
        });
      }
    }
    
    // 8. Zusammenfassung
    console.log('\n📈 ZUSAMMENFASSUNG:');
    const gesamtProbleme = probleme.deaktiviert.length + probleme.nichtGefunden.length;
    if (gesamtProbleme === 0) {
      console.log('✅ Alle Portfolio-Produkte verwenden verfügbare Verpackungen!');
    } else {
      console.log(`⚠️ ${gesamtProbleme} Inkonsistenzen gefunden - manuelle Korrektur empfohlen`);
    }
    
    return {
      verfuegbare: verfuegbareVerpackungen.length,
      nichtverfuegbare: nichtverfuegbareVerpackungen.length,
      portfolioProdukte: portfolioProdukte.length,
      probleme: gesamtProbleme,
      details: probleme
    };
    
  } catch (error) {
    console.error('❌ Fehler bei Konsistenz-Check:', error);
    throw error;
  }
}

// Hauptfunktion
async function main() {
  await connectDB();
  
  try {
    const result = await checkPortfolioVerpackungKonsistenz();
    console.log('\n🏁 Check abgeschlossen');
  } catch (error) {
    console.error('❌ Script-Fehler:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 MongoDB Verbindung getrennt');
  }
}

// Script ausführen wenn direkt aufgerufen
if (require.main === module) {
  main();
}

module.exports = { checkPortfolioVerpackungKonsistenz };