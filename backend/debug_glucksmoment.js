// Debug-Script um das "Glücksmoment" Produkt und dessen Bestand zu überprüfen
const mongoose = require('mongoose');
const Portfolio = require('./src/models/Portfolio');
const Bestand = require('./src/models/Bestand');

require('dotenv').config();

async function debugGlucksmoment() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Mit Datenbank verbunden');

    // Finde das Glücksmoment-Produkt
    const glucksmoment = await Portfolio.findOne({ name: /glücksmoment/i });
    
    console.log('\n📦 Glücksmoment-Produkt:');
    if (glucksmoment) {
      console.log('ID:', glucksmoment._id);
      console.log('Name:', glucksmoment.name);
      console.log('Aktiv:', glucksmoment.aktiv || glucksmoment.isActive);
      console.log('Seife:', glucksmoment.seife);
      console.log('Gramm:', glucksmoment.gramm);
      console.log('Rohseifenkonfiguration:', {
        verwendeZweiRohseifen: glucksmoment.rohseifenKonfiguration?.verwendeZweiRohseifen,
        seife2: glucksmoment.rohseifenKonfiguration?.seife2,
        seife1Prozent: glucksmoment.rohseifenKonfiguration?.gewichtVerteilung?.seife1Prozent,
        seife2Prozent: glucksmoment.rohseifenKonfiguration?.gewichtVerteilung?.seife2Prozent
      });

      // Bestand prüfen
      const bestand = await Bestand.findOne({ 
        typ: 'produkt', 
        artikelId: glucksmoment._id 
      });
      
      console.log('\n📊 Fertigprodukt-Bestand:');
      if (bestand) {
        console.log('Bestand-Menge:', bestand.menge, 'Stück');
        console.log('Letzte Änderung:', bestand.letzteAenderung);
        console.log('Mindestbestand:', bestand.mindestbestand);
      } else {
        console.log('❌ Kein Bestand-Eintrag gefunden');
      }

      // Portfolio direkt prüfen (falls verfugbareMenge im Portfolio gespeichert ist)
      console.log('\n📊 Portfolio-Eigenschaften:');
      console.log('verfugbareMenge:', glucksmoment.verfugbareMenge);
      console.log('bestand:', glucksmoment.bestand);
      console.log('menge:', glucksmoment.menge);
      console.log('Alle Eigenschaften:', Object.keys(glucksmoment.toObject()));

    } else {
      console.log('❌ Glücksmoment-Produkt nicht gefunden');
    }

  } catch (error) {
    console.error('❌ Fehler:', error);
  } finally {
    mongoose.disconnect();
  }
}

debugGlucksmoment();