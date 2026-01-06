const mongoose = require('mongoose');
const Portfolio = require('./src/models/Portfolio');
const Rohseife = require('./src/models/Rohseife');
const Duftoil = require('./src/models/Duftoil');
const Verpackung = require('./src/models/Verpackung');
const Bestand = require('./src/models/Bestand');

require('dotenv').config();

async function testInventur() {
  try {
    // Verbinde zur Datenbank
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Mit Datenbank verbunden');

    // Finde das "freche Biene" Produkt
    const frescheBiene = await Portfolio.findOne({ name: 'freche Biene' });
    console.log('\n📦 Freche Biene-Produkt:', frescheBiene);

    if (!frescheBiene) {
      console.log('❌ Produkt nicht gefunden!');
      return;
    }

    // Zeige aktuelle Rohstoff-Bestände VOR der Inventur
    console.log('\n🧼 Rohstoff-Bestände VOR Inventur:');
    const rohseifeVorher = await Rohseife.findOne({ bezeichnung: frescheBiene.seife });
    const duftölVorher = await Duftoil.findOne({ bezeichnung: frescheBiene.aroma });
    const verpackungVorher = await Verpackung.findOne({ bezeichnung: frescheBiene.verpackung });

    console.log(`Rohseife "${frescheBiene.seife}": ${rohseifeVorher?.aktuellVorrat}g`);
    console.log(`Duftöl "${frescheBiene.aroma}": ${duftölVorher?.aktuellVorrat}ml`);
    console.log(`Verpackung "${frescheBiene.verpackung}": ${verpackungVorher?.aktuellVorrat} Stück`);

    // Aktuelle Fertigprodukt-Bestand
    const bestandVorher = await Bestand.findOne({ 
      typ: 'produkt', 
      artikelId: frescheBiene._id 
    });
    console.log(`Fertigprodukt-Bestand: ${bestandVorher?.menge || 0} Stück`);

    // Simuliere Inventur: 2 neue Stück
    console.log('\n🔄 Simuliere Inventur: +2 freche Biene Seifen...');

    // Simulierte API-Call-Daten
    const inventurData = {
      typ: 'fertigprodukt',
      artikelId: frescheBiene._id.toString(),
      neuerBestand: (bestandVorher?.menge || 0) + 2, // +2 Stück
      notizen: 'Test-Inventur'
    };

    console.log('📋 Inventur-Daten:', inventurData);
    console.log(`📊 Erwartete Rohstoff-Subtraktion:
    - Rohseife "${frescheBiene.seife}": -${frescheBiene.gramm * 2}g (2x${frescheBiene.gramm}g)
    - Duftöl "${frescheBiene.aroma}": -2ml (2x1ml)  
    - Verpackung "${frescheBiene.verpackung}": -2 Stück`);

    // Test der automatischen Rohstoff-Subtraktion
    const buchungsAnzahl = 2;
    console.log('\n🔄 Test der automatischen Rohstoff-Subtraktion...');

    // 1. Rohseife
    if (frescheBiene.seife && frescheBiene.gramm) {
      const rohseifeDoc = await Rohseife.findOne({ bezeichnung: frescheBiene.seife });
      if (rohseifeDoc) {
        const benoetigt = frescheBiene.gramm * buchungsAnzahl;
        console.log(`✓ Rohseife gefunden: ${rohseifeDoc.bezeichnung} (${rohseifeDoc.aktuellVorrat}g verfügbar)`);
        console.log(`✓ Benötigt: ${benoetigt}g für ${buchungsAnzahl} Stück`);
        console.log(`✓ Ausreichend? ${rohseifeDoc.aktuellVorrat >= benoetigt ? 'JA' : 'NEIN'}`);
      } else {
        console.log(`❌ Rohseife "${frescheBiene.seife}" nicht gefunden`);
      }
    }

    // 2. Duftöl
    if (frescheBiene.aroma && frescheBiene.aroma !== 'Keine' && frescheBiene.aroma !== '-') {
      const duftoel = await Duftoil.findOne({ bezeichnung: frescheBiene.aroma });
      if (duftoel) {
        const benoetigt = 1 * buchungsAnzahl; // 1ml pro Seife
        console.log(`✓ Duftöl gefunden: ${duftoel.bezeichnung} (${duftoel.aktuellVorrat}ml verfügbar)`);
        console.log(`✓ Benötigt: ${benoetigt}ml für ${buchungsAnzahl} Stück`);
        console.log(`✓ Ausreichend? ${duftoel.aktuellVorrat >= benoetigt ? 'JA' : 'NEIN'}`);
      } else {
        console.log(`❌ Duftöl "${frescheBiene.aroma}" nicht gefunden`);
      }
    }

    // 3. Verpackung
    if (frescheBiene.verpackung) {
      const verpackung = await Verpackung.findOne({ bezeichnung: frescheBiene.verpackung });
      if (verpackung) {
        const benoetigt = 1 * buchungsAnzahl; // 1 pro Seife
        console.log(`✓ Verpackung gefunden: ${verpackung.bezeichnung} (${verpackung.aktuellVorrat} Stück verfügbar)`);
        console.log(`✓ Benötigt: ${benoetigt} Stück für ${buchungsAnzahl} Stück`);
        console.log(`✓ Ausreichend? ${verpackung.aktuellVorrat >= benoetigt ? 'JA' : 'NEIN'}`);
      } else {
        console.log(`❌ Verpackung "${frescheBiene.verpackung}" nicht gefunden`);
      }
    }

    console.log('\n✨ Test beendet. Keine tatsächlichen Änderungen gemacht.');

  } catch (error) {
    console.error('❌ Fehler:', error);
  } finally {
    mongoose.disconnect();
  }
}

testInventur();