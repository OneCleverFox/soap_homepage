const mongoose = require('mongoose');
const path = require('path');

// Dotenv Configuration
if (process.env.DOTENV_KEY) {
  require('dotenv-vault/config');
} else {
  require('dotenv').config({
    path: path.resolve(__dirname, '../..', '.env')
  });
}

const Warenberechnung = require('../src/models/Warenberechnung');

async function recalculateAll() {
  try {
    // Verbinde mit MongoDB
    console.log('🔄 Verbinde mit MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ MongoDB verbunden');

    // Lade alle Warenberechnungen
    const berechnungen = await Warenberechnung.find();
    console.log(`📦 ${berechnungen.length} Warenberechnungen gefunden`);

    for (const berechnung of berechnungen) {
      console.log(`\n🔍 Neuberechnung: ${berechnung.produktName}`);
      console.log(`   Rundungsoption: ${berechnung.rundungsOption || 'nicht gesetzt'}`);
      
      // Setze Standard-Rundung falls nicht vorhanden
      if (!berechnung.rundungsOption) {
        berechnung.rundungsOption = '0.50';
      }
      
      // Save triggert Pre-Save Hook und berechnet alles neu
      await berechnung.save();
      
      console.log(`   VK Preis (exakt): ${berechnung.vkPreis.toFixed(2)} €`);
      console.log(`   VK Preis (gerundet): ${berechnung.vkPreisGerundet.toFixed(2)} €`);
      console.log(`   ✅ Aktualisiert`);
    }

    console.log('\n🎉 Alle Berechnungen aktualisiert!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Fehler:', error);
    process.exit(1);
  }
}

recalculateAll();
