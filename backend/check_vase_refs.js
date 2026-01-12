const mongoose = require('mongoose');
require('dotenv').config();

async function checkVaseReferences() {
  try {
    console.log('Verbinde mit MongoDB...');
    await mongoose.connect('mongodb+srv://soap-user:***REMOVED_DB_PASSWORD***@soap.eybn71b.mongodb.net/gluecksmomente?retryWrites=true&w=majority&appName=soap');
    console.log('✅ Connected');
    
    // Prüfe verfügbare Gießwerkstoffe
    const giesswerkstoffSchema = new mongoose.Schema({}, { collection: 'giesswerkstoffs', strict: false });
    const Giesswerkstoff = mongoose.model('TempGiesswerkstoff', giesswerkstoffSchema);
    
    const giesswerkstoffCount = await Giesswerkstoff.countDocuments();
    console.log('📊 Anzahl Gießwerkstoffe in DB:', giesswerkstoffCount);
    
    if (giesswerkstoffCount > 0) {
      const beispielGiesswerkstoff = await Giesswerkstoff.findOne();
      console.log('🧱 Beispiel Gießwerkstoff:', {
        id: beispielGiesswerkstoff._id,
        bezeichnung: beispielGiesswerkstoff.bezeichnung,
        kostenProKg: beispielGiesswerkstoff.kostenProKg
      });
      
      // Alle Gießwerkstoffe anzeigen
      const alleGiesswerkstoff = await Giesswerkstoff.find();
      console.log('\n🧱 Alle Gießwerkstoffe:');
      alleGiesswerkstoff.forEach(g => {
        console.log(`  - ${g._id}: ${g.bezeichnung} (${g.kostenProKg}€/kg)`);
      });
    }
    
    // Prüfe verfügbare Gießformen
    const giessformSchema = new mongoose.Schema({}, { collection: 'giessforms', strict: false });
    const Giessform = mongoose.model('TempGiessform', giessformSchema);
    
    const giessformCount = await Giessform.countDocuments();
    console.log('\n📊 Anzahl Gießformen in DB:', giessformCount);
    
    if (giessformCount > 0) {
      const beispielGiessform = await Giessform.findOne();
      console.log('🍱 Beispiel Gießform:', {
        id: beispielGiessform._id,
        name: beispielGiessform.name,
        volumenMl: beispielGiessform.volumenMl,
        kostenProStueck: beispielGiessform.kostenProStueck
      });
      
      // Alle Gießformen anzeigen
      const alleGiessformen = await Giessform.find();
      console.log('\n🍱 Alle Gießformen:');
      alleGiessformen.forEach(g => {
        console.log(`  - ${g._id}: ${g.name} (${g.volumenMl}ml, ${g.kostenProStueck}€)`);
      });
    }
    
    // Prüfe die spezifischen IDs der Vase
    console.log('\n🔍 Prüfe Vase-Referenzen...');
    const vaseGiesswerkstoff = await Giesswerkstoff.findById('6963ecf61714aadd59ee777e');
    const vaseGiessform = await Giessform.findById('6963e44a4115f46990c53109');
    
    console.log('Vase Gießwerkstoff gefunden:', vaseGiesswerkstoff ? 'JA' : 'NEIN');
    console.log('Vase Gießform gefunden:', vaseGiessform ? 'JA' : 'NEIN');
    
    // Portfolio Vase aktualisieren mit korrekten IDs
    if (giesswerkstoffCount > 0 && giessformCount > 0) {
      console.log('\n🔧 Aktualisiere Vase mit korrekten Referenzen...');
      
      const portfolioSchema = new mongoose.Schema({}, { collection: 'portfolio', strict: false });
      const Portfolio = mongoose.model('TempPortfolio', portfolioSchema);
      
      const ersterGiesswerkstoff = await Giesswerkstoff.findOne();
      const ersteGiessform = await Giessform.findOne();
      
      const result = await Portfolio.findOneAndUpdate(
        { _id: new mongoose.Types.ObjectId('6963ffef9e7f4bc403efb830') },
        {
          $set: {
            giesswerkstoff: ersterGiesswerkstoff._id,
            giessform: ersteGiessform._id,
            giesswerkstoffKonfiguration: {
              berechnungsFaktor: 1.5,
              schwundProzent: 5
            }
          }
        },
        { new: true }
      );
      
      console.log('✅ Vase Portfolio aktualisiert:');
      console.log(`  - Gießwerkstoff: ${ersterGiesswerkstoff._id} (${ersterGiesswerkstoff.bezeichnung})`);
      console.log(`  - Gießform: ${ersteGiessform._id} (${ersteGiessform.name})`);
    }
    
    await mongoose.disconnect();
    console.log('\n✅ Fertig');
    
  } catch (err) {
    console.error('❌ Fehler:', err.message);
  }
}

checkVaseReferences();