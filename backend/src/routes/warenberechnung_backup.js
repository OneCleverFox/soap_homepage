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
    
    let berechnung = await Warenberechnung.findOne({ 
      portfolioProdukt: portfolioId 
    }).populate('portfolioProdukt');
    
    // Wenn keine Berechnung existiert, erstelle eine neue
    if (!berechnung) {
      const portfolio = await Portfolio.findById(req.params.portfolioId);
      if (!portfolio) {
        return res.status(404).json({ message: 'Portfolio-Produkt nicht gefunden' });
      }
      
      // Rohstoffe laden für initiale Berechnung
      console.log(`📊 Erstelle Warenberechnung für ${portfolio.kategorie === 'werkstuck' ? 'Werkstück' : 'Seife'}: ${portfolio.name}`);
      
      if (portfolio.kategorie === 'werkstuck') {
        // === WERKSTÜCK-BERECHNUNG ===
        console.log('🏺 Berechne Kosten für Werkstück...');
        
        let giesswerkstoffKosten = 0;
        let giesszusatzstoffeKosten = 0;
        let gewichtInGramm = 0;
        
        // Gießwerkstoff laden
        if (portfolio.giesswerkstoff && portfolio.giessform) {
          const giesswerkstoff = await Giesswerkstoff.findById(portfolio.giesswerkstoff);
          const giessform = await Giessform.findById(portfolio.giessform);
          
          if (giesswerkstoff && giessform) {
            // Berechnung wie in der Produktions-API
            const config = giesswerkstoff.mischkonfiguration || {};
            const berechnungsFaktor = config.berechnungsFaktor || 1.5;
            const schwundProzent = config.schwundProzent || 5;
            const fuellvolumenMl = giessform.volumenMl;
            
            // Benötigte Gießwerkstoff-Menge pro Stück
            const grundMenge = fuellvolumenMl * berechnungsFaktor;
            const mitSchwund = grundMenge * (1 + schwundProzent / 100);
            gewichtInGramm = Math.round(mitSchwund);
            
            giesswerkstoffKosten = (mitSchwund / 1000) * (giesswerkstoff.kostenProKg || 0); // g -> kg
            
            console.log(`  🧱 Gießwerkstoff: ${mitSchwund.toFixed(1)}g à ${giesswerkstoff.kostenProKg || 0}€/kg = ${giesswerkstoffKosten.toFixed(4)}€`);
            
            // Gießzusatzstoffe berechnen (falls konfiguriert)
            const giesszusatzstoffeKonfiguration = [];
            if (portfolio.giesszusatzstoffe && portfolio.giesszusatzstoffe.length > 0) {
              for (const zusatzKonfig of portfolio.giesszusatzstoffe) {
                const zusatzstoff = await Giesszusatzstoff.findById(zusatzKonfig.zusatzstoffId);
                
                if (zusatzstoff) {
                  let benoetigteMenge = 0;
                  
                  if (zusatzKonfig.einheit === 'prozent') {
                    benoetigteMenge = (mitSchwund * zusatzKonfig.mischverhaeltnis) / 100;
                  } else {
                    benoetigteMenge = zusatzKonfig.mischverhaeltnis;
                  }
                  
                  let kosten = 0;
                  // Nur wenn nicht unbegrenzt (Wasser etc.)
                  if (!zusatzstoff.unbegrenzterVorrat) {
                    kosten = (benoetigteMenge / 1000) * (zusatzstoff.kostenProKg || 0);
                    giesszusatzstoffeKosten += kosten;
                    console.log(`  💧 Gießzusatzstoff ${zusatzstoff.bezeichnung}: ${benoetigteMenge.toFixed(1)}ml à ${zusatzstoff.kostenProKg || 0}€/kg = ${kosten.toFixed(4)}€`);
                  } else {
                    console.log(`  💧 Gießzusatzstoff ${zusatzstoff.bezeichnung}: ${benoetigteMenge.toFixed(1)}ml (unbegrenzt, keine Kosten)`);
                  }
                  
                  // Konfiguration für Frontend speichern
                  giesszusatzstoffeKonfiguration.push({
                    giesszusatzstoffName: zusatzstoff.bezeichnung,
                    menge: benoetigteMenge,
                    einheit: 'ml',
                    kostenProEinheit: zusatzstoff.kostenProKg ? zusatzstoff.kostenProKg / 1000 : 0, // Pro ml
                    gesamtKosten: kosten
                  });
                }
              }
            }
          }
        }
        
        // Gießform-Kosten berechnen
        let giessformKosten = 0;
        let giessformVerwendungen = 50; // Standard-Annahme
        if (portfolio.giessform) {
          const giessform = await Giessform.findById(portfolio.giessform);
          if (giessform) {
            giessformVerwendungen = giessform.erwarteteVerwendungen || 50;
            giessformKosten = (giessform.kostenProStueck || 0.10) / giessformVerwendungen;
          }
        } else {
          giessformKosten = 0.10 / giessformVerwendungen; // Standard Gießform
        }
        
        // Werkstück-Warenberechnung erstellen
        berechnung = new Warenberechnung({
          portfolioProdukt: portfolio._id,
          produktName: portfolio.name,
          kategorie: 'werkstuck',
          giesswerkstoffName: portfolio.giesswerkstoff ? (await Giesswerkstoff.findById(portfolio.giesswerkstoff))?.bezeichnung : '',
          giessformName: portfolio.giessform ? (await Giessform.findById(portfolio.giessform))?.name : '',
          gewichtInGramm,
          giesswerkstoffKosten,
          giesszusatzstoffeKosten,
          giessformKosten,
          giessformVerwendungen,
          giesszusatzstoffeKonfiguration,
          energieKosten: 0,
          zusatzKosten: 0,
          gewinnProzent: 0,
          rabattProzent: 0,
          pauschaleFaktor: 3,
          rundungsOption: '0.50'
        });
        
        await berechnung.save();
        console.log(`✅ Werkstück-Warenberechnung erstellt: Gießwerkstoff ${giesswerkstoffKosten.toFixed(4)}€ + Zusätze ${giesszusatzstoffeKosten.toFixed(4)}€ + Gießform ${giessformKosten.toFixed(4)}€`);
        
      } else {
        // === SEIFEN-BERECHNUNG (bestehende Logik) ===
        console.log('🧼 Berechne Kosten für Seife...');
      }
      
      const rohseifeList = await Rohseife.find();
      
      if (portfolio.kategorie !== 'werkstuck') {
        // === SEIFEN-BERECHNUNG (bestehende Logik) ===
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
          
            console.log(`🧠 Dual-Soap-Berechnung für "${portfolio.name}":`);
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
          kategorie: 'seife',
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
      
        // 🧪 Zusatzinhaltsstoffe-Kosten berechnen (NEU)
        console.log(`🧪 Berechne Zusatzinhaltsstoffe-Kosten für "${portfolio.name}"...`);
        if (portfolio.zusatzinhaltsstoffe && portfolio.zusatzinhaltsstoffe.length > 0) {
          try {
            const zusatzErgebnis = await ZusatzinhaltsstoffeService.aktualisiereWarenberechnung(portfolio._id);
            if (zusatzErgebnis.success) {
              console.log(`✅ Zusatzinhaltsstoffe-Kosten hinzugefügt: ${(zusatzErgebnis.warenberechnung.zusatzinhaltsstoffeKostenGesamt || 0).toFixed(4)}€`);
              berechnung = zusatzErgebnis.warenberechnung;
            } else {
              console.warn(`⚠️ Fehler bei Zusatzinhaltsstoffe-Berechnung: ${zusatzErgebnis.error}`);
            }
          } catch (zusatzError) {
            console.error('❌ Fehler bei Zusatzinhaltsstoffe-Berechnung:', zusatzError);
          }
        } else {
          console.log(`ℹ️ Keine Zusatzinhaltsstoffe für "${portfolio.name}" definiert`);
        }
      } // Ende der Seifen-spezifischen Berechnung
      
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
    // Validiere Portfolio-ID
    const portfolioId = req.params.portfolioId;
    if (!portfolioId || portfolioId === 'undefined' || portfolioId === 'null') {
      console.warn(`⚠️ DELETE: Ungültige Portfolio-ID erhalten: "${portfolioId}"`);
      return res.status(400).json({ message: 'Ungültige Portfolio-ID' });
    }
    
    const berechnung = await Warenberechnung.findOneAndDelete({ 
      portfolioProdukt: portfolioId 
    });
    
    if (!berechnung) {
      return res.status(404).json({ message: 'Warenberechnung für Portfolio nicht gefunden' });
    }
    
    console.log(`✅ Warenberechnung für Portfolio ${portfolioId} gelöscht - wird bei nächstem Aufruf neu erstellt`);
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
    
    // Zusatzinhaltsstoffe-Kosten berechnen (NEU)
    const zusatzErgebnis = await ZusatzinhaltsstoffeService.aktualisiereWarenberechnung(berechnung.portfolioProdukt._id);
    if (zusatzErgebnis.success) {
      console.log(`✅ Zusatzinhaltsstoffe-Kosten aktualisiert für ${berechnung.produktName}`);
      berechnung = zusatzErgebnis.warenberechnung;
    } else {
      console.warn(`⚠️ Fehler bei Zusatzinhaltsstoffe-Berechnung: ${zusatzErgebnis.error}`);
      await berechnung.save();
    }
    
    const updatedBerechnung = await Warenberechnung.findById(berechnung._id).populate('portfolioProdukt');
    res.json(updatedBerechnung);
  } catch (error) {
    console.error('Fehler beim Neuberechnen:', error);
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
