const mongoose = require('mongoose');
const Bestand = require('./src/models/Bestand');

async function analyzeBestand() {
  try {
    await mongoose.connect('mongodb+srv://soap:CuAl2As3Ba3Bi3Br3@soap.eybn71b.mongodb.net/gluecksmomente?retryWrites=true&w=majority&appName=soap');
    console.log('✅ Connected to database');
    
    // Zeige alle verschiedenen 'typ' Werte in der Bestand collection
    const types = await Bestand.distinct('typ');
    console.log('🔍 Gefundene typ-Werte in Bestand collection:', types);
    
    // Zeige alle Einträge mit menge < mindestbestand
    const unterMindest = await Bestand.find({
      $expr: { $lte: ['$menge', '$mindestbestand'] }
    }).limit(10);
    
    console.log('📊 Einträge unter Mindestbestand:');
    unterMindest.forEach((item, i) => {
      console.log(`${i + 1}. typ: '${item.typ}', menge: ${item.menge}, mindestbestand: ${item.mindestbestand}, artikelId: ${item.artikelId}`);
    });
    
    // Zeige ein paar Beispiel-Einträge
    const samples = await Bestand.find({}).limit(5);
    console.log('📊 Beispiel-Einträge:');
    samples.forEach((s, i) => {
      console.log(`${i + 1}. typ: '${s.typ}', menge: ${s.menge}, mindestbestand: ${s.mindestbestand}, artikelId: ${s.artikelId}`);
    });
    
    process.exit(0);
  } catch (err) {
    console.error('❌ Error:', err);
    process.exit(1);
  }
}

analyzeBestand();