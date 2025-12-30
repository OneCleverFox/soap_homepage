const mongoose = require('mongoose');
const Portfolio = require('../src/models/Portfolio');
const Bestand = require('../src/models/Bestand');

const createMissingBestand = async () => {
  try {
    console.log('🔗 Connecting to MongoDB...');
    await mongoose.connect('mongodb://localhost:27017/soap_homepage');
    console.log('✅ Connected to MongoDB');

    // Hole alle Portfolio-Produkte
    const products = await Portfolio.find({});
    console.log(`📦 Found ${products.length} portfolio products`);

    let created = 0;
    let existing = 0;

    for (const product of products) {
      // Prüfe ob Bestand bereits existiert
      const existingBestand = await Bestand.findOne({
        artikelId: product._id,
        typ: 'produkt'
      });

      if (!existingBestand) {
        // Erstelle neuen Bestand-Eintrag
        const newBestand = new Bestand({
          typ: 'produkt',
          artikelId: product._id,
          artikelModell: 'Portfolio',
          menge: 10, // Standard-Menge
          einheit: 'Stück',
          mindestbestand: 1
        });

        await newBestand.save();
        console.log(`✅ Created bestand for: ${product.name} (ID: ${product._id})`);
        created++;
      } else {
        console.log(`⏭️  Bestand already exists for: ${product.name} (Menge: ${existingBestand.menge})`);
        existing++;
      }
    }

    console.log(`\n📊 Summary:`);
    console.log(`   Created: ${created} new bestand entries`);
    console.log(`   Existing: ${existing} bestand entries`);
    console.log(`   Total products: ${products.length}`);

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.connection.close();
    console.log('🔚 Connection closed');
  }
};

// Nur ausführen wenn direkt aufgerufen
if (require.main === module) {
  createMissingBestand();
}

module.exports = createMissingBestand;