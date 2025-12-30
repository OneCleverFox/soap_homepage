const mongoose = require('mongoose');
const Portfolio = require('../src/models/Portfolio');
const Bestand = require('../src/models/Bestand');

// Prüfe Verbindungsstrings
const checkConnection = async () => {
  try {
    // Versuche verschiedene MongoDB-Verbindungen
    const connections = [
      'mongodb://127.0.0.1:27017/soap_homepage',
      'mongodb://localhost:27017/soap_homepage'
    ];

    for (const connStr of connections) {
      try {
        console.log(`🔗 Trying to connect to: ${connStr}`);
        await mongoose.connect(connStr, { 
          serverSelectionTimeoutMS: 5000,
          socketTimeoutMS: 45000,
        });
        console.log(`✅ Connected successfully to: ${connStr}`);
        
        // Test database access
        const portfolioCount = await Portfolio.countDocuments();
        const bestandCount = await Bestand.countDocuments();
        
        console.log(`📊 Database content:`);
        console.log(`   Portfolio entries: ${portfolioCount}`);
        console.log(`   Bestand entries: ${bestandCount}`);
        
        if (portfolioCount > 0) {
          const firstProduct = await Portfolio.findOne({}).select('_id name');
          console.log(`   Sample product: ${firstProduct?.name} (${firstProduct?._id})`);
          
          // Check if this product has bestand
          if (firstProduct) {
            const bestand = await Bestand.findOne({ 
              artikelId: firstProduct._id, 
              typ: 'produkt' 
            });
            console.log(`   Has bestand: ${!!bestand} ${bestand ? `(menge: ${bestand.menge})` : ''}`);
          }
        }
        
        break; // Success - exit loop
      } catch (err) {
        console.log(`❌ Failed to connect to: ${connStr}`);
        console.log(`   Error: ${err.message}`);
        await mongoose.disconnect();
      }
    }
    
  } catch (error) {
    console.error('❌ Overall Error:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('🔚 Disconnected');
  }
};

checkConnection();