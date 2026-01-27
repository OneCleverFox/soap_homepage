const mongoose = require('mongoose');
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI || process.env.DATABASE_URL;

async function createPortfolioIndexes() {
  try {
    console.log('🔗 Verbinde mit MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Mit MongoDB verbunden');

    const db = mongoose.connection.db;
    const portfolioCollection = db.collection('portfolio');

    console.log('\n📊 Erstelle Indizes für Portfolio Collection...\n');

    // Index für aktive Produkte
    try {
      await portfolioCollection.createIndex({ isActive: 1 });
      console.log('✅ Index erstellt: { isActive: 1 }');
    } catch (err) {
      console.log('⏭️  Index existiert bereits: { isActive: 1 }');
    }

    try {
      await portfolioCollection.createIndex({ aktiv: 1 });
      console.log('✅ Index erstellt: { aktiv: 1 }');
    } catch (err) {
      console.log('⏭️  Index existiert bereits: { aktiv: 1 }');
    }

    // Index für Reihenfolge (für lokale Sortierung optimiert)
    try {
      await portfolioCollection.createIndex({ reihenfolge: 1 });
      console.log('✅ Index erstellt: { reihenfolge: 1 }');
    } catch (err) {
      console.log('⏭️  Index existiert bereits: { reihenfolge: 1 }');
    }

    // Index für createdAt
    try {
      await portfolioCollection.createIndex({ createdAt: -1 });
      console.log('✅ Index erstellt: { createdAt: -1 }');
    } catch (err) {
      console.log('⏭️  Index existiert bereits: { createdAt: -1 }');
    }

    // Compound Index für optimierte Abfragen
    try {
      await portfolioCollection.createIndex({ isActive: 1, reihenfolge: 1 });
      console.log('✅ Index erstellt: { isActive: 1, reihenfolge: 1 }');
    } catch (err) {
      console.log('⏭️  Index existiert bereits: { isActive: 1, reihenfolge: 1 }');
    }

    try {
      await portfolioCollection.createIndex({ aktiv: 1, reihenfolge: 1 });
      console.log('✅ Index erstellt: { aktiv: 1, reihenfolge: 1 }');
    } catch (err) {
      console.log('⏭️  Index existiert bereits: { aktiv: 1, reihenfolge: 1 }');
    }

    // Index für Produktname (für Suchen)
    try {
      await portfolioCollection.createIndex({ name: 1 });
      console.log('✅ Index erstellt: { name: 1 }');
    } catch (err) {
      console.log('⏭️  Index existiert bereits: { name: 1 }');
    }

    // Index für Gramm (für Filterung)
    try {
      await portfolioCollection.createIndex({ gramm: 1 });
      console.log('✅ Index erstellt: { gramm: 1 }');
    } catch (err) {
      console.log('⏭️  Index existiert bereits: { gramm: 1 }');
    }

    console.log('\n✅ Alle Portfolio-Indizes erfolgreich erstellt/überprüft!\n');

    // Liste alle Indizes auf
    const indexes = await portfolioCollection.indexes();
    console.log('📋 Aktuelle Indizes:');
    indexes.forEach(index => {
      console.log(`   - ${JSON.stringify(index.key)}`);
    });

  } catch (error) {
    console.error('❌ Fehler beim Erstellen der Indizes:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Von MongoDB getrennt');
    process.exit(0);
  }
}

createPortfolioIndexes();
