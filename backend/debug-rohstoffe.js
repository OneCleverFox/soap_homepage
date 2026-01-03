const mongoose = require('mongoose');
const Rohseife = require('./src/models/Rohseife');
const Duftoil = require('./src/models/Duftoil');
const Verpackung = require('./src/models/Verpackung');

require('dotenv').config();

async function debugRohstoffStructure() {
  try {
    // MongoDB Verbindung
    const mongoURI = 'mongodb+srv://gluecksmomente-admin:Lieblingsmensch@soap.eybn71b.mongodb.net/gluecksmomente?retryWrites=true&w=majority&appName=soap';
    
    await mongoose.connect(mongoURI);
    console.log('✅ MongoDB verbunden');

    // Alle Rohseifen anzeigen
    console.log('\n📦 === ROHSEIFEN ===');
    const rohseifen = await Rohseife.find({}).limit(5);
    console.log(`Anzahl Rohseifen: ${await Rohseife.countDocuments()}`);
    rohseifen.forEach((item, i) => {
      console.log(`${i+1}. Structure:`, {
        id: item._id,
        felder: Object.keys(item.toObject()),
        bezeichnung: item.bezeichnung || item.name || item.title,
        bestand: item.bestand,
        mindestbestand: item.mindestbestand
      });
    });

    // Rohseifen unter Mindestbestand
    console.log('\n🔴 Rohseifen unter Mindestbestand:');
    const rohseifenUnter = await Rohseife.find({
      $expr: { $lt: ['$bestand', '$mindestbestand'] }
    });
    console.log(`Anzahl: ${rohseifenUnter.length}`);
    rohseifenUnter.forEach((item, i) => {
      console.log(`${i+1}. ${item.bezeichnung || item.name || 'UNBEKANNT'}: ${item.bestand} < ${item.mindestbestand}`);
    });

    // Alle Duftöle anzeigen
    console.log('\n🌸 === DUFTÖLE ===');
    const duftoele = await Duftoil.find({}).limit(5);
    console.log(`Anzahl Duftöle: ${await Duftoil.countDocuments()}`);
    duftoele.forEach((item, i) => {
      console.log(`${i+1}. Structure:`, {
        id: item._id,
        felder: Object.keys(item.toObject()),
        bezeichnung: item.bezeichnung || item.name || item.title,
        bestand: item.bestand,
        mindestbestand: item.mindestbestand
      });
    });

    // Duftöle unter Mindestbestand
    console.log('\n🔴 Duftöle unter Mindestbestand:');
    const duftoeleUnter = await Duftoil.find({
      $expr: { $lt: ['$bestand', '$mindestbestand'] }
    });
    console.log(`Anzahl: ${duftoeleUnter.length}`);
    duftoeleUnter.forEach((item, i) => {
      console.log(`${i+1}. ${item.bezeichnung || item.name || 'UNBEKANNT'}: ${item.bestand} < ${item.mindestbestand}`);
    });

    // Alle Verpackungen anzeigen
    console.log('\n📦 === VERPACKUNGEN ===');
    const verpackungen = await Verpackung.find({}).limit(5);
    console.log(`Anzahl Verpackungen: ${await Verpackung.countDocuments()}`);
    verpackungen.forEach((item, i) => {
      console.log(`${i+1}. Structure:`, {
        id: item._id,
        felder: Object.keys(item.toObject()),
        bezeichnung: item.bezeichnung || item.name || item.title,
        bestand: item.bestand,
        mindestbestand: item.mindestbestand
      });
    });

    // Verpackungen unter Mindestbestand
    console.log('\n🔴 Verpackungen unter Mindestbestand:');
    const verpackungenUnter = await Verpackung.find({
      $expr: { $lt: ['$bestand', '$mindestbestand'] }
    });
    console.log(`Anzahl: ${verpackungenUnter.length}`);
    verpackungenUnter.forEach((item, i) => {
      console.log(`${i+1}. ${item.bezeichnung || item.name || 'UNBEKANNT'}: ${item.bestand} < ${item.mindestbestand}`);
    });

    const totalUnter = rohseifenUnter.length + duftoeleUnter.length + verpackungenUnter.length;
    console.log(`\n📊 GESAMT: ${totalUnter} Rohstoffe unter Mindestbestand`);
    console.log(`   - Rohseifen: ${rohseifenUnter.length}`);
    console.log(`   - Duftöle: ${duftoeleUnter.length}`);
    console.log(`   - Verpackungen: ${verpackungenUnter.length}`);

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    mongoose.connection.close();
  }
}

debugRohstoffStructure();