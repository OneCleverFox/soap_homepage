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
const Warenberechnung = require('../src/models/Warenberechnung');
const Rohseife = require('../src/models/Rohseife');
const Duftoil = require('../src/models/Duftoil');
const Verpackung = require('../src/models/Verpackung');

async function createWarenberechnungen() {
  try {
    // Verbinde mit MongoDB
    console.log('🔄 Verbinde mit MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ MongoDB verbunden');

    // Lade alle Portfolio-Produkte
    const portfolioProducts = await Portfolio.find();
    console.log(`📦 ${portfolioProducts.length} Portfolio-Produkte gefunden`);

    for (const portfolio of portfolioProducts) {
      console.log(`\n🔍 Verarbeite: ${portfolio.name}`);

      // Prüfe ob bereits Berechnung existiert
      const existingBerechnung = await Warenberechnung.findOne({ 
        portfolioProdukt: portfolio._id 
      });

      if (existingBerechnung) {
        console.log(`  ⏭️  Berechnung existiert bereits`);
        continue;
      }

      // Rohstoffe laden
      const rohseifeList = await Rohseife.find();
      const rohseife = rohseifeList.find(r => r.bezeichnung === portfolio.seife);
      
      let duftoil = null;
      if (portfolio.aroma && portfolio.aroma !== 'Neutral' && portfolio.aroma !== '') {
        const duftoilList = await Duftoil.find();
        duftoil = duftoilList.find(d => d.bezeichnung === portfolio.aroma);
      }
      
      const verpackungList = await Verpackung.find();
      const verpackung = verpackungList.find(v => v.bezeichnung === portfolio.verpackung);
      
      if (!rohseife) {
        console.log(`  ❌ Rohseife "${portfolio.seife}" nicht gefunden`);
        continue;
      }

      if (!verpackung) {
        console.log(`  ❌ Verpackung "${portfolio.verpackung}" nicht gefunden`);
        continue;
      }

      // Kosten berechnen
      const gewichtInGramm = portfolio.gramm || 50;
      const rohseifeKosten = gewichtInGramm * rohseife.preisProGramm;
      
      let duftoelKosten = 0;
      if (duftoil) {
        const tropfenProSeife = Math.round(gewichtInGramm / 50);
        duftoelKosten = tropfenProSeife * duftoil.kostenProTropfen;
      }
      
      const verpackungKosten = verpackung.kostenProStueck;
      
      // Neue Berechnung erstellen
      const berechnung = new Warenberechnung({
        portfolioProdukt: portfolio._id,
        produktName: portfolio.name,
        rohseifeName: portfolio.seife,
        duftoelName: portfolio.aroma || '',
        verpackungName: portfolio.verpackung,
        gewichtInGramm,
        rohseifeKosten,
        duftoelKosten,
        verpackungKosten,
        energieKosten: 0,
        zusatzKosten: 0,
        gewinnProzent: 0,
        rabattProzent: 0,
        pauschaleFaktor: 3
      });
      
      await berechnung.save();
      console.log(`  ✅ Berechnung erstellt - VK: ${berechnung.vkPreis.toFixed(2)} €`);
    }

    console.log('\n🎉 Fertig!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Fehler:', error);
    process.exit(1);
  }
}

createWarenberechnungen();
