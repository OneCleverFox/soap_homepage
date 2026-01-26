const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

const Portfolio = require('../src/models/Portfolio');

async function fixKategorien() {
  try {
    console.log('🔧 Verbinde mit MongoDB...');
    console.log('📍 MongoDB URI gefunden:', process.env.MONGODB_URI ? 'Ja' : 'Nein');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Verbindung hergestellt\n');

    // 1. Alle Produkte ohne kategorie finden
    const produkteOhneKategorie = await Portfolio.find({
      $or: [
        { kategorie: { $exists: false } },
        { kategorie: null },
        { kategorie: '' }
      ]
    }).select('_id name seife giessform kategorie');

    console.log(`📋 Gefunden: ${produkteOhneKategorie.length} Produkte ohne Kategorie\n`);

    if (produkteOhneKategorie.length === 0) {
      console.log('✅ Alle Produkte haben bereits eine Kategorie!');
      await mongoose.disconnect();
      return;
    }

    // 2. Kategorie basierend auf seife/giessform setzen
    for (const produkt of produkteOhneKategorie) {
      let neueKategorie;
      
      // Wenn seife-Feld ausgefüllt ist → seife
      if (produkt.seife && produkt.seife.trim() !== '') {
        neueKategorie = 'seife';
      }
      // Wenn giessform gesetzt ist → werkstuck
      else if (produkt.giessform) {
        neueKategorie = 'werkstuck';
      }
      // Fallback: seife
      else {
        neueKategorie = 'seife';
      }

      await Portfolio.updateOne(
        { _id: produkt._id },
        { $set: { kategorie: neueKategorie } }
      );

      console.log(`✅ ${produkt.name}: kategorie → "${neueKategorie}"`);
    }

    console.log(`\n✅ Migration abgeschlossen: ${produkteOhneKategorie.length} Produkte aktualisiert`);

    await mongoose.disconnect();
    console.log('🔌 MongoDB Verbindung geschlossen');
    process.exit(0);

  } catch (error) {
    console.error('❌ Fehler:', error);
    await mongoose.disconnect();
    process.exit(1);
  }
}

fixKategorien();
