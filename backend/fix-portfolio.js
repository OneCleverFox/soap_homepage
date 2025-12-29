const mongoose = require('mongoose');
require('dotenv').config();

mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true });

const portfolioSchema = new mongoose.Schema({}, { collection: 'portfolio' });
const Portfolio = mongoose.model('Portfolio', portfolioSchema);

async function checkAndFixPortfolio() {
  try {
    console.log('🔍 Verbinde mit MongoDB...');
    
    // Alle Produkte anzeigen
    const allProducts = await Portfolio.find({});
    console.log('🔍 Alle Produkte gefunden:', allProducts.length);
    
    // Aktive Produkte anzeigen
    const activeProducts = await Portfolio.find({ isActive: true });
    console.log('✅ Aktive Produkte gefunden:', activeProducts.length);
    
    if (allProducts.length > 0) {
      console.log('📋 Erstes Produkt:', JSON.stringify(allProducts[0], null, 2));
      
      // Aktiviere alle Produkte
      const result = await Portfolio.updateMany({}, { $set: { isActive: true } });
      console.log('🔧 Alle Produkte aktiviert:', result.modifiedCount);
    } else {
      console.log('❌ Keine Produkte in Portfolio-Collection gefunden!');
      
      // Erstelle Beispiel-Produkte
      const testProducts = [
        {
          name: "Lavendel Seife",
          beschreibung: "Beruhigende Seife mit Lavendelduft",
          preis: 8.50,
          kategorie: "Seife",
          isActive: true,
          gramm: 100
        },
        {
          name: "Rosen Seife", 
          beschreibung: "Luxuriöse Seife mit Rosenduft",
          preis: 12.90,
          kategorie: "Seife", 
          isActive: true,
          gramm: 120
        }
      ];
      
      await Portfolio.insertMany(testProducts);
      console.log('✅ Test-Produkte erstellt!');
    }
    
    // Prüfe erneut
    const finalActiveProducts = await Portfolio.find({ isActive: true });
    console.log('🎉 Final aktive Produkte:', finalActiveProducts.length);
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Fehler:', error);
    process.exit(1);
  }
}

checkAndFixPortfolio();