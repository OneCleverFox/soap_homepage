const express = require('express');
const router = express.Router();
const Bestand = require('../models/Bestand');
const Bewegung = require('../models/Bewegung');
const Portfolio = require('../models/Portfolio');
const Rohseife = require('../models/Rohseife');
const Duftoil = require('../models/Duftoil');
const Verpackung = require('../models/Verpackung');
const { authenticateToken } = require('../middleware/auth');

// Middleware: Nur Admin darf Lager verwalten
const requireAdmin = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      message: 'Nur Administratoren dürfen das Lager verwalten'
    });
  }
  next();
};

// GET /api/lager/bestand - Alle Bestände abrufen
router.get('/bestand', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { typ } = req.query;
    
    const filter = typ ? { typ } : {};
    
    const bestaende = await Bestand.find(filter)
      .populate('artikelId')
      .sort({ typ: 1, createdAt: -1 });
    
    // Gruppiere nach Typ
    const grouped = {
      rohseifen: [],
      duftoele: [],
      verpackungen: [],
      produkte: []
    };
    
    bestaende.forEach(bestand => {
      const item = {
        _id: bestand._id,
        artikelId: bestand.artikelId._id,
        name: bestand.artikelId.name || bestand.artikelId.titel,
        menge: bestand.menge,
        einheit: bestand.einheit,
        mindestbestand: bestand.mindestbestand,
        unterMindestbestand: bestand.istUnterMindestbestand(),
        letzteAenderung: bestand.letzteAenderung,
        notizen: bestand.notizen
      };
      
      switch (bestand.typ) {
        case 'rohseife':
          grouped.rohseifen.push(item);
          break;
        case 'duftoil':
          grouped.duftoele.push(item);
          break;
        case 'verpackung':
          grouped.verpackungen.push(item);
          break;
        case 'produkt':
          grouped.produkte.push(item);
          break;
      }
    });
    
    res.json({
      success: true,
      data: grouped
    });
  } catch (error) {
    console.error('Fehler beim Abrufen der Bestände:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Abrufen der Bestände',
      error: error.message
    });
  }
});

// GET /api/lager/warnungen - Artikel unter Mindestbestand
router.get('/warnungen', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const warnungen = await Bestand.findeUnterMindestbestand();
    
    const formatted = warnungen.map(bestand => ({
      _id: bestand._id,
      typ: bestand.typ,
      name: bestand.artikelId?.name || bestand.artikelId?.titel || 'Unbekannt',
      menge: bestand.menge,
      mindestbestand: bestand.mindestbestand,
      einheit: bestand.einheit,
      differenz: bestand.mindestbestand - bestand.menge
    }));
    
    res.json({
      success: true,
      data: formatted
    });
  } catch (error) {
    console.error('Fehler beim Abrufen der Warnungen:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Abrufen der Warnungen',
      error: error.message
    });
  }
});

// POST /api/lager/inventur - Inventur durchführen
router.post('/inventur', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { typ, artikelId, menge, einheit, mindestbestand, notizen } = req.body;
    
    if (!typ || !artikelId || menge === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Typ, ArtikelId und Menge sind erforderlich'
      });
    }
    
    // Finde oder erstelle Bestand
    let bestand = await Bestand.findeOderErstelle(typ, artikelId, einheit || 'stück');
    
    const vorher = bestand.menge;
    
    // Setze neuen Bestand
    bestand.menge = menge;
    if (mindestbestand !== undefined) {
      bestand.mindestbestand = mindestbestand;
    }
    bestand.letzteAenderung = {
      datum: new Date(),
      grund: 'inventur',
      menge: menge - vorher,
      vorher,
      nachher: menge
    };
    if (notizen) {
      bestand.notizen = notizen;
    }
    
    await bestand.save();
    
    // Erstelle Bewegungs-Log
    const artikel = await bestand.populate('artikelId');
    await Bewegung.erstelle({
      typ: 'inventur',
      bestandId: bestand._id,
      artikel: {
        typ: bestand.typ,
        artikelId: bestand.artikelId._id,
        name: artikel.artikelId?.name || artikel.artikelId?.titel
      },
      menge: menge - vorher,
      einheit: bestand.einheit,
      bestandVorher: vorher,
      bestandNachher: menge,
      grund: 'Manuelle Inventur',
      notizen,
      userId: req.user.id || req.user.userId
    });
    
    res.json({
      success: true,
      message: 'Inventur erfolgreich durchgeführt',
      data: {
        bestand: {
          _id: bestand._id,
          menge: bestand.menge,
          einheit: bestand.einheit,
          aenderung: menge - vorher
        }
      }
    });
  } catch (error) {
    console.error('Fehler bei Inventur:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler bei Inventur',
      error: error.message
    });
  }
});

// POST /api/lager/produktion - Produktion verbuchen
router.post('/produktion', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { produktId, anzahl } = req.body;
    
    if (!produktId || !anzahl || anzahl <= 0) {
      return res.status(400).json({
        success: false,
        message: 'ProduktId und Anzahl (> 0) sind erforderlich'
      });
    }
    
    // Hole Produkt mit Rezept
    const produkt = await Portfolio.findById(produktId)
      .populate('rohseife')
      .populate('duftoel')
      .populate('verpackung');
    
    if (!produkt) {
      return res.status(404).json({
        success: false,
        message: 'Produkt nicht gefunden'
      });
    }
    
    // Prüfe ob alle Rohstoffe vorhanden sind
    const rohstoffBedarf = [];
    const bewegungen = [];
    
    // Rohseife (in Gramm)
    if (produkt.rohseife && produkt.gramm) {
      const benoetigt = (produkt.gramm * anzahl) / 1000; // in kg
      const bestand = await Bestand.findeOderErstelle('rohseife', produkt.rohseife._id, 'kg');
      
      if (bestand.menge < benoetigt) {
        return res.status(400).json({
          success: false,
          message: `Nicht genug Rohseife auf Lager. Benötigt: ${benoetigt} kg, Verfügbar: ${bestand.menge} kg`
        });
      }
      
      rohstoffBedarf.push({
        typ: 'rohseife',
        bestand,
        menge: benoetigt,
        name: produkt.rohseife.name
      });
    }
    
    // Duftöl (in ml)
    if (produkt.duftoel) {
      const benoetigt = anzahl; // 1 ml pro Produkt (anpassen nach Bedarf)
      const bestand = await Bestand.findeOderErstelle('duftoil', produkt.duftoel._id, 'ml');
      
      if (bestand.menge < benoetigt) {
        return res.status(400).json({
          success: false,
          message: `Nicht genug Duftöl auf Lager. Benötigt: ${benoetigt} ml, Verfügbar: ${bestand.menge} ml`
        });
      }
      
      rohstoffBedarf.push({
        typ: 'duftoil',
        bestand,
        menge: benoetigt,
        name: produkt.duftoel.name
      });
    }
    
    // Verpackung (Stück)
    if (produkt.verpackung) {
      const benoetigt = anzahl;
      const bestand = await Bestand.findeOderErstelle('verpackung', produkt.verpackung._id, 'stück');
      
      if (bestand.menge < benoetigt) {
        return res.status(400).json({
          success: false,
          message: `Nicht genug Verpackung auf Lager. Benötigt: ${benoetigt} Stück, Verfügbar: ${bestand.menge} Stück`
        });
      }
      
      rohstoffBedarf.push({
        typ: 'verpackung',
        bestand,
        menge: benoetigt,
        name: produkt.verpackung.name
      });
    }
    
    // Buche Rohstoffe aus
    for (const rohstoff of rohstoffBedarf) {
      const vorher = rohstoff.bestand.menge;
      await rohstoff.bestand.verringereBestand(rohstoff.menge, 'produktion');
      
      // Erstelle Bewegungs-Log
      await Bewegung.erstelle({
        typ: 'ausgang',
        bestandId: rohstoff.bestand._id,
        artikel: {
          typ: rohstoff.typ,
          artikelId: rohstoff.bestand.artikelId,
          name: rohstoff.name
        },
        menge: -rohstoff.menge,
        einheit: rohstoff.bestand.einheit,
        bestandVorher: vorher,
        bestandNachher: rohstoff.bestand.menge,
        grund: `Produktion von ${anzahl}x ${produkt.titel}`,
        referenz: {
          typ: 'produktion',
          id: produktId
        },
        userId: req.user.id || req.user.userId
      });
      
      bewegungen.push({
        rohstoff: rohstoff.name,
        menge: rohstoff.menge,
        einheit: rohstoff.bestand.einheit,
        neuerBestand: rohstoff.bestand.menge
      });
    }
    
    // Buche Fertigprodukt ein
    const produktBestand = await Bestand.findeOderErstelle('produkt', produktId, 'stück');
    const vorherProdukt = produktBestand.menge;
    await produktBestand.erhoeheBestand(anzahl, 'produktion');
    
    // Erstelle Bewegungs-Log für Fertigprodukt
    await Bewegung.erstelle({
      typ: 'eingang',
      bestandId: produktBestand._id,
      artikel: {
        typ: 'produkt',
        artikelId: produktId,
        name: produkt.titel
      },
      menge: anzahl,
      einheit: 'stück',
      bestandVorher: vorherProdukt,
      bestandNachher: produktBestand.menge,
      grund: 'Produktion',
      userId: req.user.id || req.user.userId
    });
    
    res.json({
      success: true,
      message: `${anzahl}x ${produkt.titel} erfolgreich produziert`,
      data: {
        produkt: {
          name: produkt.titel,
          anzahl,
          neuerBestand: produktBestand.menge
        },
        rohstoffVerbrauch: bewegungen
      }
    });
  } catch (error) {
    console.error('Fehler bei Produktion:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler bei Produktion',
      error: error.message
    });
  }
});

// POST /api/lager/korrektur - Bestand manuell korrigieren
router.post('/korrektur', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { bestandId, aenderung, notizen } = req.body;
    
    if (!bestandId || aenderung === undefined) {
      return res.status(400).json({
        success: false,
        message: 'BestandId und Änderung sind erforderlich'
      });
    }
    
    const bestand = await Bestand.findById(bestandId).populate('artikelId');
    
    if (!bestand) {
      return res.status(404).json({
        success: false,
        message: 'Bestand nicht gefunden'
      });
    }
    
    const vorher = bestand.menge;
    const nachher = Math.max(0, vorher + aenderung);
    
    bestand.menge = nachher;
    bestand.letzteAenderung = {
      datum: new Date(),
      grund: 'korrektur',
      menge: aenderung,
      vorher,
      nachher
    };
    if (notizen) {
      bestand.notizen = notizen;
    }
    
    await bestand.save();
    
    // Erstelle Bewegungs-Log
    await Bewegung.erstelle({
      typ: 'korrektur',
      bestandId: bestand._id,
      artikel: {
        typ: bestand.typ,
        artikelId: bestand.artikelId._id,
        name: bestand.artikelId?.name || bestand.artikelId?.titel
      },
      menge: aenderung,
      einheit: bestand.einheit,
      bestandVorher: vorher,
      bestandNachher: nachher,
      grund: 'Manuelle Korrektur',
      notizen,
      userId: req.user.id || req.user.userId
    });
    
    res.json({
      success: true,
      message: 'Bestand erfolgreich korrigiert',
      data: {
        vorher,
        nachher,
        aenderung
      }
    });
  } catch (error) {
    console.error('Fehler bei Korrektur:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler bei Korrektur',
      error: error.message
    });
  }
});

// GET /api/lager/historie/:bestandId - Bewegungshistorie für einen Artikel
router.get('/historie/:bestandId', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { bestandId } = req.params;
    
    const bewegungen = await Bewegung.find({ bestandId })
      .sort({ createdAt: -1 })
      .limit(100)
      .populate('userId', 'email name');
    
    res.json({
      success: true,
      data: bewegungen
    });
  } catch (error) {
    console.error('Fehler beim Abrufen der Historie:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Abrufen der Historie',
      error: error.message
    });
  }
});

// GET /api/lager/artikel - Alle verfügbaren Artikel (für Dropdown)
router.get('/artikel', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const [rohseifen, duftoele, verpackungen, produkte] = await Promise.all([
      Rohseife.find().select('_id name').lean(),
      Duftoil.find().select('_id name').lean(),
      Verpackung.find().select('_id name').lean(),
      Portfolio.find().select('_id titel').lean()
    ]);
    
    res.json({
      success: true,
      data: {
        rohseifen: rohseifen.map(r => ({ id: r._id, name: r.name })),
        duftoele: duftoele.map(d => ({ id: d._id, name: d.name })),
        verpackungen: verpackungen.map(v => ({ id: v._id, name: v.name })),
        produkte: produkte.map(p => ({ id: p._id, name: p.titel }))
      }
    });
  } catch (error) {
    console.error('Fehler beim Abrufen der Artikel:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Abrufen der Artikel',
      error: error.message
    });
  }
});

module.exports = router;
