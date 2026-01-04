const express = require('express');
const Warenberechnung = require('../models/Warenberechnung');
const Portfolio = require('../models/Portfolio');
const Rohseife = require('../models/Rohseife');
const Duftoil = require('../models/Duftoil');
const Verpackung = require('../models/Verpackung');
const { auth } = require('../middleware/auth');

const router = express.Router();

// GET alle Warenberechnungen
router.get('/', auth, async (req, res) => {
  try {
    const berechnungen = await Warenberechnung.find()
      .populate('portfolioProdukt')
      .sort({ produktName: 1 });
    res.json(berechnungen);
  } catch (error) {
    console.error('Fehler beim Laden der Warenberechnungen:', error);
    res.status(500).json({ message: error.message });
  }
});

// GET Warenberechnung für ein Portfolio-Produkt
router.get('/portfolio/:portfolioId', auth, async (req, res) => {
  try {
    let berechnung = await Warenberechnung.findOne({ 
      portfolioProdukt: req.params.portfolioId 
    }).populate('portfolioProdukt');
    
    // Wenn keine Berechnung existiert, erstelle eine neue
    if (!berechnung) {
      const portfolio = await Portfolio.findById(req.params.portfolioId);
      if (!portfolio) {
        return res.status(404).json({ message: 'Portfolio-Produkt nicht gefunden' });
      }
      
      // Rohstoffe laden für initiale Berechnung
      const rohseifeList = await Rohseife.find();
      const rohseife = rohseifeList.find(r => r.bezeichnung === portfolio.seife);
      
      // Zweite Rohseife laden falls konfiguriert
      let rohseife2 = null;
      if (portfolio.rohseifenKonfiguration?.verwendeZweiRohseifen && portfolio.rohseifenKonfiguration.seife2) {
        rohseife2 = rohseifeList.find(r => r.bezeichnung === portfolio.rohseifenKonfiguration.seife2);
      }
      
      let duftoil = null;
      if (portfolio.aroma && portfolio.aroma !== 'Neutral' && portfolio.aroma !== '') {
        const duftoilList = await Duftoil.find();
        duftoil = duftoilList.find(d => d.bezeichnung === portfolio.aroma);
      }
      
      // ✅ KONSISTENTE DATENQUELLE: Nur verfügbare Verpackungen laden
      const verpackungList = await Verpackung.find({ verfuegbar: true });
      const verpackung = verpackungList.find(v => v.bezeichnung === portfolio.verpackung);
      
      // ⚠️ Warnung wenn Verpackung nicht gefunden
      if (!verpackung && portfolio.verpackung) {
        console.warn(`⚠️ Verpackung "${portfolio.verpackung}" für Portfolio "${portfolio.name}" nicht in DB gefunden`);
        console.warn('Portfolio sollte aktualisiert oder Verpackung in Verpackungen-Verwaltung angelegt werden.');
      }
      
      // Kosten berechnen mit verbessertem Logging
      const gewichtInGramm = portfolio.gramm || 50;
      
      // Gewichtsverteilung für Rohseifen berechnen
      let rohseife1Gramm = gewichtInGramm;
      let rohseife2Gramm = 0;
      let rohseife2Kosten = 0;
      
      if (portfolio.rohseifenKonfiguration?.verwendeZweiRohseifen) {
        const seife1Prozent = portfolio.rohseifenKonfiguration.gewichtVerteilung?.seife1Prozent || 50;
        const seife2Prozent = portfolio.rohseifenKonfiguration.gewichtVerteilung?.seife2Prozent || 50;
        
        rohseife1Gramm = Math.round(gewichtInGramm * (seife1Prozent / 100));
        rohseife2Gramm = Math.round(gewichtInGramm * (seife2Prozent / 100));
        
        rohseife2Kosten = rohseife2 ? (rohseife2Gramm * rohseife2.preisProGramm) : 0;
        
        console.log(`🧮 Dual-Soap-Berechnung für "${portfolio.name}":`);
        console.log(`   - Seife1: ${portfolio.seife} = ${rohseife1Gramm}g (${seife1Prozent}%) → ${rohseife ? (rohseife1Gramm * rohseife.preisProGramm).toFixed(4) : 0}€`);
        console.log(`   - Seife2: ${portfolio.rohseifenKonfiguration.seife2} = ${rohseife2Gramm}g (${seife2Prozent}%) → ${rohseife2Kosten.toFixed(4)}€`);
        console.log(`   - Rohseife2 gefunden: ${rohseife2 ? 'JA' : 'NEIN'}`);
        if (rohseife2) {
          console.log(`   - Rohseife2 Preis/g: ${rohseife2.preisProGramm}€`);
        }
      }
      
      const rohseifeKosten = rohseife ? (rohseife1Gramm * rohseife.preisProGramm) : 0;
      
      // Logging für Nachvollziehbarkeit
      if (!rohseife && portfolio.seife) {
        console.warn(`⚠️ Rohseife "${portfolio.seife}" für Portfolio "${portfolio.name}" nicht gefunden`);
      }
      
      let duftoelKosten = 0;
      if (duftoil) {
        const tropfenProSeife = Math.round(gewichtInGramm / 50);
        duftoelKosten = tropfenProSeife * duftoil.kostenProTropfen;
      }
      
      const verpackungKosten = verpackung ? verpackung.kostenProStueck : 0;
      
      // Neue Berechnung erstellen
      berechnung = new Warenberechnung({
        portfolioProdukt: portfolio._id,
        produktName: portfolio.name,
        rohseifeName: portfolio.seife,
        rohseifenKonfiguration: {
          verwendeZweiRohseifen: portfolio.rohseifenKonfiguration?.verwendeZweiRohseifen || false,
          rohseife2Name: portfolio.rohseifenKonfiguration?.seife2 || '',
          gewichtVerteilung: {
            rohseife1Gramm: rohseife1Gramm,
            rohseife2Gramm: rohseife2Gramm
          }
        },
        duftoelName: portfolio.aroma || '',
        verpackungName: portfolio.verpackung,
        gewichtInGramm,
        rohseifeKosten,
        rohseife2Kosten,
        duftoelKosten,
        verpackungKosten,
        energieKosten: 0,
        zusatzKosten: 0,
        gewinnProzent: 0,
        rabattProzent: 0,
        pauschaleFaktor: 3,
        rundungsOption: '0.50' // Standard: auf 50 Cent aufrunden
      });
      
      await berechnung.save();
      berechnung = await Warenberechnung.findById(berechnung._id).populate('portfolioProdukt');
    }
    
    res.json(berechnung);
  } catch (error) {
    console.error('Fehler beim Laden der Warenberechnung:', error);
    res.status(500).json({ message: error.message });
  }
});

// POST - Neue Warenberechnung erstellen oder aktualisieren
router.post('/', auth, async (req, res) => {
  try {
    const { portfolioProdukt, ...berechnungData } = req.body;
    
    // Prüfe ob bereits eine Berechnung für dieses Produkt existiert
    let berechnung = await Warenberechnung.findOne({ portfolioProdukt });
    
    if (berechnung) {
      // Update existing
      Object.assign(berechnung, berechnungData);
      await berechnung.save();
    } else {
      // Create new
      berechnung = new Warenberechnung(req.body);
      await berechnung.save();
    }
    
    berechnung = await Warenberechnung.findById(berechnung._id).populate('portfolioProdukt');
    res.status(201).json(berechnung);
  } catch (error) {
    console.error('Fehler beim Erstellen der Warenberechnung:', error);
    res.status(400).json({ message: error.message });
  }
});

// PUT - Warenberechnung aktualisieren
router.put('/:id', auth, async (req, res) => {
  try {
    console.log('📝 PUT /api/warenberechnung/:id aufgerufen');
    console.log('   ID:', req.params.id);
    console.log('   Body:', JSON.stringify(req.body, null, 2));
    
    // Finde Dokument
    const berechnung = await Warenberechnung.findById(req.params.id);
    
    if (!berechnung) {
      return res.status(404).json({ message: 'Warenberechnung nicht gefunden' });
    }
    
    // Update Felder
    Object.keys(req.body).forEach(key => {
      berechnung[key] = req.body[key];
    });
    
    // Save (triggert Pre-Save Hook für Neuberechnung!)
    await berechnung.save();
    
    // Populate und zurückgeben
    await berechnung.populate('portfolioProdukt');
    
    console.log('   ✅ Aktualisiert:', berechnung.produktName);
    console.log('   💰 Neuer VK-Preis:', berechnung.vkPreis.toFixed(2), '€');
    res.json(berechnung);
  } catch (error) {
    console.error('❌ Fehler beim Aktualisieren der Warenberechnung:', error);
    console.error('   Error Name:', error.name);
    console.error('   Error Message:', error.message);
    res.status(400).json({ message: error.message });
  }
});

// DELETE - Warenberechnung löschen
router.delete('/:id', auth, async (req, res) => {
  try {
    const berechnung = await Warenberechnung.findByIdAndDelete(req.params.id);
    
    if (!berechnung) {
      return res.status(404).json({ message: 'Warenberechnung nicht gefunden' });
    }
    
    res.json({ message: 'Warenberechnung gelöscht' });
  } catch (error) {
    console.error('Fehler beim Löschen der Warenberechnung:', error);
    res.status(500).json({ message: error.message });
  }
});

// DELETE - Warenberechnung für Portfolio-Produkt löschen
router.delete('/portfolio/:portfolioId', auth, async (req, res) => {
  try {
    const berechnung = await Warenberechnung.findOneAndDelete({ 
      portfolioProdukt: req.params.portfolioId 
    });
    
    if (!berechnung) {
      return res.status(404).json({ message: 'Warenberechnung für Portfolio nicht gefunden' });
    }
    
    console.log(`✅ Warenberechnung für Portfolio ${req.params.portfolioId} gelöscht - wird bei nächstem Aufruf neu erstellt`);
    res.json({ message: 'Warenberechnung gelöscht' });
  } catch (error) {
    console.error('Fehler beim Löschen der Warenberechnung:', error);
    res.status(500).json({ message: error.message });
  }
});

// POST - Rohstoffkosten neu berechnen
router.post('/:id/recalculate', auth, async (req, res) => {
  try {
    const berechnung = await Warenberechnung.findById(req.params.id);
    if (!berechnung) {
      return res.status(404).json({ message: 'Warenberechnung nicht gefunden' });
    }
    
    // Rohstoffe neu laden
    const rohseifeList = await Rohseife.find();
    const rohseife = rohseifeList.find(r => r.bezeichnung === berechnung.rohseifeName);
    
    let duftoil = null;
    if (berechnung.duftoelName && berechnung.duftoelName !== 'Neutral' && berechnung.duftoelName !== '') {
      const duftoilList = await Duftoil.find();
      duftoil = duftoilList.find(d => d.bezeichnung === berechnung.duftoelName);
    }
    
    const verpackungList = await Verpackung.find();
    const verpackung = verpackungList.find(v => v.bezeichnung === berechnung.verpackungName);
    
    // Kosten neu berechnen
    berechnung.rohseifeKosten = rohseife ? (berechnung.gewichtInGramm * rohseife.preisProGramm) : 0;
    
    if (duftoil) {
      const tropfenProSeife = Math.round(berechnung.gewichtInGramm / 50);
      berechnung.duftoelKosten = tropfenProSeife * duftoil.kostenProTropfen;
    } else {
      berechnung.duftoelKosten = 0;
    }
    
    berechnung.verpackungKosten = verpackung ? verpackung.kostenProStueck : 0;
    
    await berechnung.save();
    
    const updatedBerechnung = await Warenberechnung.findById(berechnung._id).populate('portfolioProdukt');
    res.json(updatedBerechnung);
  } catch (error) {
    console.error('Fehler beim Neuberechnen:', error);
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
