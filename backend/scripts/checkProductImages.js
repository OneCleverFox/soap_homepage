/**
 * Script zum Prüfen der Bild-URLs in Portfolio-Produkten
 */

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

const Portfolio = require('../src/models/Portfolio');

const checkProductImages = async () => {
  try {
    console.log('🔧 Verbinde mit MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Verbunden mit MongoDB\n');

    // Alle aktiven Portfolio-Produkte laden
    const products = await Portfolio.find({ aktiv: true })
      .limit(5)
      .sort({ name: 1 });

    console.log(`📦 ${products.length} Produkte gefunden (zeige erste 5)\n`);
    console.log('='.repeat(80));

    for (const product of products) {
      console.log(`\n📌 ${product.name}`);
      console.log(`   ID: ${product._id}`);
      console.log(`   Seife: ${product.seife}`);
      console.log(`   Gramm: ${product.gramm}`);
      console.log(`   Preis: ${product.preis || 'nicht gesetzt'}€`);
      
      console.log(`\n   🖼️  BILDER:`);
      
      if (product.bilder) {
        console.log(`   Bilder-Objekt vorhanden: ✅`);
        
        if (product.bilder.hauptbild) {
          console.log(`   ✅ Hauptbild: ${product.bilder.hauptbild}`);
        } else {
          console.log(`   ❌ Hauptbild: NICHT VORHANDEN`);
        }
        
        if (product.bilder.galerie && product.bilder.galerie.length > 0) {
          console.log(`   ✅ Galerie: ${product.bilder.galerie.length} Bilder`);
          product.bilder.galerie.slice(0, 2).forEach((img, idx) => {
            const url = typeof img === 'string' ? img : img.url;
            console.log(`      ${idx + 1}. ${url}`);
          });
        } else {
          console.log(`   ⚠️  Galerie: LEER`);
        }
      } else {
        console.log(`   ❌ KEIN Bilder-Objekt vorhanden!`);
      }
      
      console.log('\n' + '-'.repeat(80));
    }

    console.log('\n' + '='.repeat(80));

  } catch (error) {
    console.error('❌ Fehler:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('\n👋 Verbindung geschlossen');
    process.exit(0);
  }
};

// Script ausführen
checkProductImages();
