// Test für Zwei-Rohseifen-Inventur (Glücksmoment)
const mongoose = require('mongoose');
const Portfolio = require('./src/models/Portfolio');
const Rohseife = require('./src/models/Rohseife');
const Duftoil = require('./src/models/Duftoil');
const Verpackung = require('./src/models/Verpackung');
const Bestand = require('./src/models/Bestand');

require('dotenv').config();

async function testZweiRohseifen() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Mit Datenbank verbunden');

    // Finde Glücksmoment-Produkt
    const glucksmoment = await Portfolio.findById('69528a41b38587139ec95f53');
    
    if (!glucksmoment) {
      console.log('❌ Glücksmoment nicht gefunden');
      return;
    }

    console.log('\n📦 Glücksmoment-Produkt:');
    console.log('Name:', glucksmoment.name);
    console.log('Verwendet zwei Rohseifen:', glucksmoment.rohseifenKonfiguration?.verwendeZweiRohseifen);
    console.log('Seife 1:', glucksmoment.seife, `(${glucksmoment.rohseifenKonfiguration?.gewichtVerteilung?.seife1Prozent}%)`);
    console.log('Seife 2:', glucksmoment.rohseifenKonfiguration?.seife2, `(${glucksmoment.rohseifenKonfiguration?.gewichtVerteilung?.seife2Prozent}%)`);
    console.log('Gramm pro Stück:', glucksmoment.gramm);
    console.log('Aroma:', glucksmoment.aroma);
    console.log('Verpackung:', glucksmoment.verpackung);

    // Aktuelle Rohstoff-Bestände VOR Test
    console.log('\n🧼 Rohstoff-Bestände VOR Simulation:');
    
    const sheabutter = await Rohseife.findOne({ bezeichnung: glucksmoment.seife });
    const honigseife = await Rohseife.findOne({ bezeichnung: glucksmoment.rohseifenKonfiguration.seife2 });
    const duftoel = await Duftoil.findOne({ bezeichnung: glucksmoment.aroma });
    const verpackung = await Verpackung.findOne({ bezeichnung: glucksmoment.verpackung });

    console.log(`Sheabutter (Seife 1): ${sheabutter?.aktuellVorrat || 'NICHT GEFUNDEN'}g`);
    console.log(`Honigseife (Seife 2): ${honigseife?.aktuellVorrat || 'NICHT GEFUNDEN'}g`);
    console.log(`Duftöl "${glucksmoment.aroma}": ${duftoel?.aktuellVorrat || 'NICHT GEFUNDEN'}ml`);
    console.log(`Verpackung "${glucksmoment.verpackung}": ${verpackung?.aktuellVorrat || 'NICHT GEFUNDEN'} Stück`);

    // Aktueller Fertigprodukt-Bestand
    const bestand = await Bestand.findOne({ 
      typ: 'produkt', 
      artikelId: glucksmoment._id 
    });
    console.log(`Fertigprodukt-Bestand: ${bestand?.menge || 0} Stück`);

    // Simuliere: +1 Glücksmoment einbuchen
    const testAnzahl = 1;
    console.log(`\n🧪 Simuliere Inventur: +${testAnzahl} Glücksmoment...`);

    // Berechne erwartete Rohstoff-Subtraktionen
    const seife1Gewicht = Math.round(glucksmoment.gramm * (glucksmoment.rohseifenKonfiguration.gewichtVerteilung.seife1Prozent / 100));
    const seife2Gewicht = Math.round(glucksmoment.gramm * (glucksmoment.rohseifenKonfiguration.gewichtVerteilung.seife2Prozent / 100));
    
    console.log(`📊 Erwartete Rohstoff-Subtraktion für ${testAnzahl} Stück:`);
    console.log(`- Sheabutter: -${seife1Gewicht * testAnzahl}g (${glucksmoment.rohseifenKonfiguration.gewichtVerteilung.seife1Prozent}% von ${glucksmoment.gramm}g = ${seife1Gewicht}g)`);
    console.log(`- Honigseife: -${seife2Gewicht * testAnzahl}g (${glucksmoment.rohseifenKonfiguration.gewichtVerteilung.seife2Prozent}% von ${glucksmoment.gramm}g = ${seife2Gewicht}g)`);
    console.log(`- Duftöl: -${testAnzahl}ml (1ml pro Stück)`);
    console.log(`- Verpackung: -${testAnzahl} Stück`);

    console.log('\n✅ Verfügbarkeits-Check:');
    let kannProduzieren = true;
    
    if (!sheabutter || sheabutter.aktuellVorrat < seife1Gewicht * testAnzahl) {
      console.log(`❌ Nicht genug Sheabutter! Benötigt: ${seife1Gewicht * testAnzahl}g, Verfügbar: ${sheabutter?.aktuellVorrat || 0}g`);
      kannProduzieren = false;
    } else {
      console.log(`✅ Sheabutter: Ausreichend (${sheabutter.aktuellVorrat}g >= ${seife1Gewicht * testAnzahl}g)`);
    }
    
    if (!honigseife || honigseife.aktuellVorrat < seife2Gewicht * testAnzahl) {
      console.log(`❌ Nicht genug Honigseife! Benötigt: ${seife2Gewicht * testAnzahl}g, Verfügbar: ${honigseife?.aktuellVorrat || 0}g`);
      kannProduzieren = false;
    } else {
      console.log(`✅ Honigseife: Ausreichend (${honigseife.aktuellVorrat}g >= ${seife2Gewicht * testAnzahl}g)`);
    }

    if (glucksmoment.aroma && glucksmoment.aroma !== 'Keine' && glucksmoment.aroma !== '-') {
      if (!duftoel || duftoel.aktuellVorrat < testAnzahl) {
        console.log(`❌ Nicht genug Duftöl! Benötigt: ${testAnzahl}ml, Verfügbar: ${duftoel?.aktuellVorrat || 0}ml`);
        kannProduzieren = false;
      } else {
        console.log(`✅ Duftöl: Ausreichend (${duftoel.aktuellVorrat}ml >= ${testAnzahl}ml)`);
      }
    } else {
      console.log(`ℹ️ Duftöl: Kein Duftöl benötigt (Aroma: "${glucksmoment.aroma}")`);
    }

    if (!verpackung || verpackung.aktuellVorrat < testAnzahl) {
      console.log(`❌ Nicht genug Verpackung! Benötigt: ${testAnzahl}, Verfügbar: ${verpackung?.aktuellVorrat || 0} Stück`);
      kannProduzieren = false;
    } else {
      console.log(`✅ Verpackung: Ausreichend (${verpackung.aktuellVorrat} >= ${testAnzahl} Stück)`);
    }

    console.log(`\n🎯 Fazit: ${kannProduzieren ? '✅ PRODUKTION MÖGLICH' : '❌ PRODUKTION NICHT MÖGLICH'}`);

    if (kannProduzieren) {
      console.log('\n💡 Die automatische Rohstoff-Subtraktion sollte funktionieren!');
    } else {
      console.log('\n⚠️ Rohstoffe auffüllen bevor Inventur durchgeführt wird!');
    }

  } catch (error) {
    console.error('❌ Fehler:', error);
  } finally {
    mongoose.disconnect();
  }
}

testZweiRohseifen();