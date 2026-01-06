const mongoose = require('mongoose');
const Portfolio = require('./src/models/Portfolio');
const Rohseife = require('./src/models/Rohseife');
const Duftoil = require('./src/models/Duftoil');
const Verpackung = require('./src/models/Verpackung');
const Bestand = require('./src/models/Bestand');

require('dotenv').config();

async function debugInventur() {
  try {
    // Verbinde zur Datenbank
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Mit Datenbank verbunden');

    // Finde alle Produkte und zeige sie an
    console.log('\n📦 Alle verfügbaren Produkte:');
    const alleProdukte = await Portfolio.find({}).select('name seife gramm aroma verpackung rohseifenKonfiguration');
    alleProdukte.forEach(p => {
      console.log(`- "${p.name}" (${p.seife}, ${p.gramm}g, ${p.aroma}, ${p.verpackung})`);
    });

    // Finde das Honigseife-Produkt
    const honigseife = alleProdukte.find(p => p.name.toLowerCase().includes('honig'));
    console.log('\n📦 Honigseife-Produkt:');
    if (honigseife) {
      console.log('ID:', honigseife?._id);
      console.log('Name:', honigseife?.name);
      console.log('Seife:', honigseife?.seife);
      console.log('Gramm:', honigseife?.gramm);
      console.log('Aroma:', honigseife?.aroma);
      console.log('Verpackung:', honigseife?.verpackung);
      console.log('Rohseifenkonfiguration:', honigseife?.rohseifenKonfiguration);
    } else {
      console.log('⚠️ Kein Honigseife-Produkt gefunden');
    }

    // Prüfe aktuelle Rohstoff-Bestände
    console.log('\n🧼 Aktuelle Rohstoff-Bestände:');
    
    if (honigseife?.seife) {
      const rohseife = await Rohseife.findOne({ bezeichnung: honigseife.seife });
      console.log(`Rohseife "${honigseife.seife}":`, rohseife?.aktuellVorrat || 'NICHT GEFUNDEN');
    }
    
    if (honigseife?.aroma && honigseife.aroma !== 'Keine' && honigseife.aroma !== '-') {
      const duftoel = await Duftoil.findOne({ bezeichnung: honigseife.aroma });
      console.log(`Duftöl "${honigseife.aroma}":`, duftoel?.aktuellVorrat || 'NICHT GEFUNDEN');
    }
    
    if (honigseife?.verpackung) {
      const verpackung = await Verpackung.findOne({ bezeichnung: honigseife.verpackung });
      console.log(`Verpackung "${honigseife.verpackung}":`, verpackung?.aktuellVorrat || 'NICHT GEFUNDEN');
    }

    // Prüfe Fertigprodukt-Bestand
    console.log('\n📊 Fertigprodukt-Bestand:');
    if (honigseife) {
      const bestand = await Bestand.findOne({ 
        typ: 'produkt', 
        artikelId: honigseife._id 
      });
      console.log('Bestand-Eintrag:', bestand?.menge || 'NICHT GEFUNDEN');
    } else {
      console.log('⚠️ Kein Honigseife-Produkt gefunden, kann Bestand nicht prüfen');
    }

    // Liste alle Rohseifen auf
    console.log('\n🗂️ Alle verfügbaren Rohseifen:');
    const allRohseifen = await Rohseife.find({}).select('bezeichnung aktuellVorrat');
    allRohseifen.forEach(r => {
      console.log(`- "${r.bezeichnung}": ${r.aktuellVorrat}g`);
    });

    console.log('\n🗂️ Alle verfügbaren Duftöle:');
    const allDuftöle = await Duftoil.find({}).select('bezeichnung aktuellVorrat');
    allDuftöle.forEach(d => {
      console.log(`- "${d.bezeichnung}": ${d.aktuellVorrat}ml`);
    });

    console.log('\n🗂️ Alle verfügbaren Verpackungen:');
    const allVerpackungen = await Verpackung.find({}).select('bezeichnung aktuellVorrat');
    allVerpackungen.forEach(v => {
      console.log(`- "${v.bezeichnung}": ${v.aktuellVorrat} Stück`);
    });

  } catch (error) {
    console.error('❌ Fehler:', error);
  } finally {
    mongoose.disconnect();
  }
}

debugInventur();