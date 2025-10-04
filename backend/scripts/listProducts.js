/**
 * Script zum Abrufen aller Produktnamen aus der Datenbank
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });
const mongoose = require('mongoose');
const Portfolio = require('../src/models/Portfolio');

async function listProducts() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ MongoDB verbunden!\n');

    const products = await Portfolio.find({});
    
    console.log('📋 Alle Produkte in der Datenbank:\n');
    products.forEach((p, i) => {
      console.log(`${i + 1}. ${p.name}`);
      console.log(`   ID: ${p._id}`);
      console.log(`   Seife: ${p.seife}`);
      console.log(`   Aroma: ${p.aroma}`);
      console.log(`   Gramm: ${p.gramm}g`);
      console.log(`   Beschreibung vorhanden: ${p.beschreibung?.kurz ? '✅' : '❌'}`);
      console.log('');
    });

    console.log(`\nGesamt: ${products.length} Produkte`);

  } catch (error) {
    console.error('❌ Fehler:', error);
  } finally {
    await mongoose.connection.close();
  }
}

listProducts();
