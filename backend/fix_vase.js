const mongoose = require('mongoose');
require('dotenv').config();

async function fixVaseReferences() {
  try {
    console.log('🔧 Verbinde mit MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected');
    
    // Portfolio Schema laden
    const portfolioSchema = new mongoose.Schema({}, { collection: 'portfolio', strict: false });
    const Portfolio = mongoose.model('TempPortfolio', portfolioSchema);
    
    console.log('🔧 Setze Vase Gießwerkstoff und Gießform auf null...');
    
    const result = await Portfolio.findOneAndUpdate(
      { _id: new mongoose.Types.ObjectId('6963ffef9e7f4bc403efb830') },
      {
        $unset: {
          giesswerkstoff: "",
          giessform: ""
        },
        $set: {
          giesswerkstoffKonfiguration: {
            berechnungsFaktor: 1.5,
            schwundProzent: 5
          }
        }
      },
      { new: true }
    );
    
    console.log('✅ Vase Portfolio aktualisiert:');
    console.log(`   - Gießwerkstoff: ${result.giesswerkstoff || 'NULL (wird Fallback verwenden)'}`);
    console.log(`   - Gießform: ${result.giessform || 'NULL (wird Fallback verwenden)'}`);
    console.log(`   - Gramm: ${result.gramm}g (wird als Volumen verwendet)`);
    console.log(`   - Konfiguration:`, result.giesswerkstoffKonfiguration);
    
    await mongoose.disconnect();
    console.log('✅ Fertig - Vase sollte jetzt Fallback-Berechnung verwenden');
    
  } catch (err) {
    console.error('❌ Fehler:', err.message);
  }
}

fixVaseReferences();