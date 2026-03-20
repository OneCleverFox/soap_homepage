const express = require('express');
const Warenberechnung = require('../models/Warenberechnung');
const Portfolio = require('../models/Portfolio');
const Rohseife = require('../models/Rohseife');
const Duftoil = require('../models/Duftoil');
const Verpackung = require('../models/Verpackung');
const ZusatzInhaltsstoff = require('../models/ZusatzInhaltsstoff');
const Giesswerkstoff = require('../models/Giesswerkstoff');
const Giessform = require('../models/Giessform');
const Giesszusatzstoff = require('../models/Giesszusatzstoff');
const ZusatzinhaltsstoffeService = require('../services/zusatzinhaltsstoffeService');
const SeifenWarenberechnungService = require('../services/seifenWarenberechnungService');
const WerkstuckWarenberechnungService = require('../services/werkstuckWarenberechnungService');
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
    // Validiere Portfolio-ID
    const portfolioId = req.params.portfolioId;
    if (!portfolioId || portfolioId === 'undefined' || portfolioId === 'null') {
      console.warn(`⚠️ Ungültige Portfolio-ID erhalten: "${portfolioId}"`);
      return res.status(400).json({ message: 'Ungültige Portfolio-ID' });
    }
    
    const startTime = Date.now();
    
    let berechnung = await Warenberechnung.findOne({
      portfolioProdukt: portfolioId
    }).populate('portfolioProdukt', 'name kategorie aktiv isActive preis gramm gewichtInGramm seife aroma verpackung giessform giesswerkstoff');
    
    // Wenn keine Berechnung existiert, erstelle eine neue
    if (!berechnung) {
      const portfolio = await Portfolio.findById(portfolioId)
        .select('name kategorie seife rohseifenKonfiguration gewichtInGramm aroma verpackung giesswerkstoff giessform gramm giesswerkstoffKonfiguration giesszusatzstoffe zusatzinhaltsstoffe');
      if (!portfolio) {
        return res.status(404).json({ message: 'Portfolio-Produkt nicht gefunden' });
      }
      
      console.log(`📊 Erstelle Warenberechnung für ${portfolio.kategorie === 'werkstuck' ? 'Werkstück' : 'Seife'}: ${portfolio.name}`);
      
      let berechnungsDaten;
      
      if (portfolio.kategorie === 'werkstuck') {
        // Werkstück-Berechnung mit Service
        berechnungsDaten = await WerkstuckWarenberechnungService.erstelleWerkstuckWarenberechnung(portfolio);
      } else {
        // Seifen-Berechnung mit Service
        berechnungsDaten = await SeifenWarenberechnungService.erstelleSeifenWarenberechnung(portfolio);
      }
      
      // Warenberechnung erstellen
      berechnung = new Warenberechnung({
        portfolioProdukt: portfolio._id,
        produktName: portfolio.name,
        ...berechnungsDaten
      });
      
      await berechnung.save();
      
      // Zusatzinhaltsstoffe für Seifen nachträglich hinzufügen
      if (portfolio.kategorie === 'seife' && portfolio.zusatzinhaltsstoffe && portfolio.zusatzinhaltsstoffe.length > 0) {
        berechnung = await SeifenWarenberechnungService.aktualisiereZusatzinhaltsstoffe(portfolio._id, berechnung);
      }
      
      console.log(`✅ ${portfolio.kategorie === 'werkstuck' ? 'Werkstück' : 'Seifen'}-Warenberechnung erstellt`);
      berechnung = await Warenberechnung.findById(berechnung._id)
        .populate('portfolioProdukt', 'name kategorie aktiv isActive preis gramm gewichtInGramm seife aroma verpackung giessform giesswerkstoff');
    }
    
    res.json(berechnung);
  } catch (error) {
    console.error('❌ Error caught:', {
      message: error.message,
      hasValidationErrors: !!error.validationErrors,
      validationErrorsLength: error.validationErrors?.length || 0,
      status: error.status,
      errorStack: error.stack?.split('\n').slice(0, 3).join('\n')
    });
    
    // Validierungsfehler als normale Antwort liefern, damit Frontend keine roten Netzfehler loggt
    if (error.validationErrors && Array.isArray(error.validationErrors)) {
      console.log(`✅ Returning validationErrors: ${error.validationErrors.length} errors`);
      return res.json({
        message: error.message,
        validationErrors: error.validationErrors,
        incomplete: true,
        calculation: null
      });
    }
    
    console.log(`❌ Returning 500 error: ${error.message}`);
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
      return res.status(404).json({ message: 'Warenberechnung für dieses Produkt nicht gefunden' });
    }
    
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
    
    // Je nach Kategorie unterschiedliche Neuberechnung
    if (berechnung.kategorie === 'werkstuck') {
      // Werkstück-Kosten neu berechnen
      const portfolio = await Portfolio.findById(berechnung.portfolioProdukt).populate('giesswerkstoff giessform');
      const neueBerechnungsDaten = await WerkstuckWarenberechnungService.erstelleWerkstuckWarenberechnung(portfolio);
      Object.assign(berechnung, neueBerechnungsDaten);
    } else {
      // Seifen-Kosten neu berechnen (bestehende Logik)
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
    }
    
    await berechnung.save();
    await berechnung.populate('portfolioProdukt');
    
    res.json(berechnung);
  } catch (error) {
    console.error('Fehler bei Neuberechnung:', error);
    res.status(500).json({ message: error.message });
  }
});

// POST Route für Neuberechnung aller Zusatzinhaltsstoffe nach Preisänderung
router.post('/zusatzinhaltsstoffe/:inhaltsstoffId/neuberechnen', auth, async (req, res) => {
  try {
    const ergebnis = await ZusatzinhaltsstoffeService.aktualisiereAlleBetroffenenWarenberechnungen(req.params.inhaltsstoffId);
    
    if (ergebnis.success) {
      res.json({
        message: `${ergebnis.erfolgreichAktualisiert} Warenberechnungen erfolgreich aktualisiert`,
        betroffeneProdukte: ergebnis.betroffeneProdukte,
        erfolgreichAktualisiert: ergebnis.erfolgreichAktualisiert,
        fehlerBeiAktualisierung: ergebnis.fehlerBeiAktualisierung
      });
    } else {
      res.status(500).json({
        message: 'Fehler bei der Massen-Aktualisierung',
        error: ergebnis.error
      });
    }
  } catch (error) {
    console.error('Fehler bei Massen-Neuberechnung:', error);
    res.status(500).json({ message: error.message });
  }
});

// GET Route für Zusatzinhaltsstoffe-Validierung
router.post('/zusatzinhaltsstoffe/validieren', auth, async (req, res) => {
  try {
    const { zusatzinhaltsstoffe, maxGewicht } = req.body;
    
    const validierung = await ZusatzinhaltsstoffeService.validiereZusatzinhaltsstoffe(zusatzinhaltsstoffe, maxGewicht);
    
    res.json(validierung);
  } catch (error) {
    console.error('Fehler bei Zusatzinhaltsstoffe-Validierung:', error);
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;