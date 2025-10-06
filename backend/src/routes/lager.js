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
    
    // Hole Daten direkt aus den Rohstoff-Collections
    const [rohseifen, duftoele, verpackungen, produkte] = await Promise.all([
      Rohseife.find().select('_id bezeichnung aktuellVorrat mindestbestand').lean(),
      Duftoil.find().select('_id bezeichnung aktuellVorrat mindestbestand').lean(),
      Verpackung.find().select('_id bezeichnung aktuellVorrat mindestbestand').lean(),
      Portfolio.find().lean()
    ]);
    
    // Hole Produktbestände aus Bestand-Collection (nur für Fertigprodukte)
    const produktBestaende = await Bestand.find({ typ: 'produkt' }).populate('artikelId');
    
    // Formatiere Rohseifen
    const rohseifenFormatted = rohseifen.map(r => ({
      _id: r._id,
      artikelId: r._id,
      name: r.bezeichnung,
      menge: r.aktuellVorrat,
      einheit: 'g',
      mindestbestand: r.mindestbestand,
      unterMindestbestand: r.aktuellVorrat < r.mindestbestand,
      typ: 'rohseife'
    }));
    
    // Formatiere Duftöle
    const duftoeleFormatted = duftoele.map(d => ({
      _id: d._id,
      artikelId: d._id,
      name: d.bezeichnung,
      menge: d.aktuellVorrat,
      einheit: 'tropfen',
      mindestbestand: d.mindestbestand,
      unterMindestbestand: d.aktuellVorrat < d.mindestbestand,
      typ: 'duftoil'
    }));
    
    // Formatiere Verpackungen
    const verpackungenFormatted = verpackungen.map(v => ({
      _id: v._id,
      artikelId: v._id,
      name: v.bezeichnung,
      menge: v.aktuellVorrat,
      einheit: 'stück',
      mindestbestand: v.mindestbestand,
      unterMindestbestand: v.aktuellVorrat < v.mindestbestand,
      typ: 'verpackung'
    }));
    
    // Formatiere Produkte
    const produkteFormatted = produktBestaende.map(p => ({
      _id: p._id,
      artikelId: p.artikelId?._id,
      name: p.artikelId?.name,
      menge: p.menge,
      einheit: 'stück',
      mindestbestand: p.mindestbestand,
      unterMindestbestand: p.istUnterMindestbestand(),
      letzteAenderung: p.letzteAenderung,
      notizen: p.notizen,
      typ: 'produkt'
    }));
    
    res.json({
      success: true,
      data: {
        rohseifen: rohseifenFormatted,
        duftoele: duftoeleFormatted,
        verpackungen: verpackungenFormatted,
        produkte: produkteFormatted
      }
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
    const warnungen = [];
    
    // Rohseifen unter Mindestbestand
    const rohseifen = await Rohseife.find({
      $expr: { $lt: ['$aktuellVorrat', '$mindestbestand'] }
    });
    rohseifen.forEach(r => {
      warnungen.push({
        _id: r._id,
        typ: 'rohseife',
        name: r.bezeichnung,
        menge: r.aktuellVorrat,
        mindestbestand: r.mindestbestand,
        einheit: 'g',
        differenz: r.mindestbestand - r.aktuellVorrat
      });
    });
    
    // Duftöle unter Mindestbestand
    const duftoele = await Duftoil.find({
      $expr: { $lt: ['$aktuellVorrat', '$mindestbestand'] }
    });
    duftoele.forEach(d => {
      warnungen.push({
        _id: d._id,
        typ: 'duftoil',
        name: d.bezeichnung,
        menge: d.aktuellVorrat,
        mindestbestand: d.mindestbestand,
        einheit: 'tropfen',
        differenz: d.mindestbestand - d.aktuellVorrat
      });
    });
    
    // Verpackungen unter Mindestbestand
    const verpackungen = await Verpackung.find({
      $expr: { $lt: ['$aktuellVorrat', '$mindestbestand'] }
    });
    verpackungen.forEach(v => {
      warnungen.push({
        _id: v._id,
        typ: 'verpackung',
        name: v.bezeichnung,
        menge: v.aktuellVorrat,
        mindestbestand: v.mindestbestand,
        einheit: 'stück',
        differenz: v.mindestbestand - v.aktuellVorrat
      });
    });
    
    // Produkte unter Mindestbestand
    const produkte = await Bestand.findeUnterMindestbestand();
    produkte.forEach(p => {
      if (p.artikelId) {
        warnungen.push({
          _id: p._id,
          typ: 'produkt',
          name: p.artikelId.name,
          menge: p.menge,
          mindestbestand: p.mindestbestand,
          einheit: 'stück',
          differenz: p.mindestbestand - p.menge
        });
      }
    });
    
    res.json({
      success: true,
      data: warnungen
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
    const { typ, artikelId, menge, mindestbestand, notizen } = req.body;
    
    if (!typ || !artikelId || menge === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Typ, ArtikelId und Menge sind erforderlich'
      });
    }
    
    let artikel;
    let vorher;
    let einheit;
    
    // Je nach Typ den aktuellVorrat im entsprechenden Model aktualisieren
    switch (typ) {
      case 'rohseife':
        artikel = await Rohseife.findById(artikelId);
        if (!artikel) {
          return res.status(404).json({
            success: false,
            message: 'Rohseife nicht gefunden'
          });
        }
        vorher = artikel.aktuellVorrat;
        artikel.aktuellVorrat = menge;
        if (mindestbestand !== undefined) {
          artikel.mindestbestand = mindestbestand;
        }
        await artikel.save();
        einheit = 'g';
        
        // Log Bewegung
        await Bewegung.erstelle({
          typ: 'inventur',
          bestandId: null, // Kein Bestand-Eintrag, direkt in Rohstoff
          artikel: {
            typ: 'rohseife',
            artikelId: artikel._id,
            name: artikel.bezeichnung
          },
          menge: menge - vorher,
          einheit: 'g',
          bestandVorher: vorher,
          bestandNachher: menge,
          grund: 'Manuelle Inventur',
          notizen,
          userId: req.user.id || req.user.userId
        });
        break;
        
      case 'duftoil':
        artikel = await Duftoil.findById(artikelId);
        if (!artikel) {
          return res.status(404).json({
            success: false,
            message: 'Duftöl nicht gefunden'
          });
        }
        vorher = artikel.aktuellVorrat;
        artikel.aktuellVorrat = menge;
        if (mindestbestand !== undefined) {
          artikel.mindestbestand = mindestbestand;
        }
        await artikel.save();
        einheit = 'tropfen';
        
        // Log Bewegung
        await Bewegung.erstelle({
          typ: 'inventur',
          bestandId: null,
          artikel: {
            typ: 'duftoil',
            artikelId: artikel._id,
            name: artikel.bezeichnung
          },
          menge: menge - vorher,
          einheit: 'tropfen',
          bestandVorher: vorher,
          bestandNachher: menge,
          grund: 'Manuelle Inventur',
          notizen,
          userId: req.user.id || req.user.userId
        });
        break;
        
      case 'verpackung':
        artikel = await Verpackung.findById(artikelId);
        if (!artikel) {
          return res.status(404).json({
            success: false,
            message: 'Verpackung nicht gefunden'
          });
        }
        vorher = artikel.aktuellVorrat;
        artikel.aktuellVorrat = menge;
        if (mindestbestand !== undefined) {
          artikel.mindestbestand = mindestbestand;
        }
        await artikel.save();
        einheit = 'stück';
        
        // Log Bewegung
        await Bewegung.erstelle({
          typ: 'inventur',
          bestandId: null,
          artikel: {
            typ: 'verpackung',
            artikelId: artikel._id,
            name: artikel.bezeichnung
          },
          menge: menge - vorher,
          einheit: 'stück',
          bestandVorher: vorher,
          bestandNachher: menge,
          grund: 'Manuelle Inventur',
          notizen,
          userId: req.user.id || req.user.userId
        });
        break;
        
      case 'produkt':
        // Für Produkte verwenden wir weiterhin Bestand-Collection
        let bestand = await Bestand.findeOderErstelle('produkt', artikelId, 'stück');
        vorher = bestand.menge;
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
        
        const produktDoc = await Portfolio.findById(artikelId);
        await Bewegung.erstelle({
          typ: 'inventur',
          bestandId: bestand._id,
          artikel: {
            typ: 'produkt',
            artikelId: artikelId,
            name: produktDoc?.name
          },
          menge: menge - vorher,
          einheit: 'stück',
          bestandVorher: vorher,
          bestandNachher: menge,
          grund: 'Manuelle Inventur',
          notizen,
          userId: req.user.id || req.user.userId
        });
        einheit = 'stück';
        break;
        
      default:
        return res.status(400).json({
          success: false,
          message: 'Ungültiger Typ'
        });
    }
    
    res.json({
      success: true,
      message: 'Inventur erfolgreich durchgeführt',
      data: {
        bestand: {
          _id: artikel?._id || artikelId,
          menge,
          einheit,
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
    const { produktId, anzahl, notizen } = req.body;
    
    if (!produktId || !anzahl || anzahl <= 0) {
      return res.status(400).json({
        success: false,
        message: 'ProduktId und Anzahl (> 0) sind erforderlich'
      });
    }
    
    // Hole Produkt mit Rezept
    const produkt = await Portfolio.findById(produktId);
    
    if (!produkt) {
      return res.status(404).json({
        success: false,
        message: 'Produkt nicht gefunden'
      });
    }
    
    const bewegungen = [];
    const fehler = [];
    
    // 1. ROHSEIFE - Finde nach bezeichnung und ziehe aktuellVorrat ab
    if (produkt.seife && produkt.gramm) {
      const rohseifeDoc = await Rohseife.findOne({ bezeichnung: produkt.seife });
      
      if (!rohseifeDoc) {
        fehler.push(`Rohseife "${produkt.seife}" nicht in Datenbank gefunden`);
      } else {
        const benoetigt = produkt.gramm * anzahl; // in Gramm
        
        if (rohseifeDoc.aktuellVorrat < benoetigt) {
          fehler.push(`Nicht genug "${produkt.seife}" auf Lager. Benötigt: ${benoetigt}g, Verfügbar: ${rohseifeDoc.aktuellVorrat}g`);
        } else {
          const vorher = rohseifeDoc.aktuellVorrat;
          rohseifeDoc.aktuellVorrat -= benoetigt;
          await rohseifeDoc.save();
          
          bewegungen.push({
            typ: 'produktion',
            bestandId: null,
            artikel: {
              typ: 'rohseife',
              artikelId: rohseifeDoc._id,
              name: rohseifeDoc.bezeichnung
            },
            menge: -benoetigt,
            einheit: 'g',
            bestandVorher: vorher,
            bestandNachher: rohseifeDoc.aktuellVorrat,
            grund: `Produktion: ${anzahl}x ${produkt.name}`,
            notizen,
            userId: req.user.id || req.user.userId || req.user._id,
            referenz: {
              typ: 'produktion',
              produktId: produkt._id,
              produktName: produkt.name,
              anzahl
            }
          });
        }
      }
    }
    
    // 2. DUFTÖL - Finde nach bezeichnung (aroma)
    if (produkt.aroma && produkt.aroma !== 'Keine' && produkt.aroma !== '-') {
      const duftoel = await Duftoil.findOne({ bezeichnung: produkt.aroma });
      
      if (!duftoel) {
        fehler.push(`Duftöl "${produkt.aroma}" nicht in Datenbank gefunden`);
      } else {
        // Standard: 10 Tropfen pro Produkt (anpassbar)
        const tropfenProProdukt = 10;
        const benoetigt = anzahl * tropfenProProdukt;
        
        if (duftoel.aktuellVorrat < benoetigt) {
          fehler.push(`Nicht genug "${produkt.aroma}" auf Lager. Benötigt: ${benoetigt} Tropfen, Verfügbar: ${duftoel.aktuellVorrat} Tropfen`);
        } else {
          const vorher = duftoel.aktuellVorrat;
          duftoel.aktuellVorrat -= benoetigt;
          await duftoel.save();
          
          bewegungen.push({
            typ: 'produktion',
            bestandId: null,
            artikel: {
              typ: 'duftoil',
              artikelId: duftoel._id,
              name: duftoel.bezeichnung
            },
            menge: -benoetigt,
            einheit: 'tropfen',
            bestandVorher: vorher,
            bestandNachher: duftoel.aktuellVorrat,
            grund: `Produktion: ${anzahl}x ${produkt.name}`,
            notizen,
            userId: req.user.id || req.user.userId || req.user._id,
            referenz: {
              typ: 'produktion',
              produktId: produkt._id,
              produktName: produkt.name,
              anzahl
            }
          });
        }
      }
    }
    
    // 3. VERPACKUNG - Finde nach bezeichnung
    if (produkt.verpackung) {
      const verpackung = await Verpackung.findOne({ bezeichnung: produkt.verpackung });
      
      if (!verpackung) {
        fehler.push(`Verpackung "${produkt.verpackung}" nicht in Datenbank gefunden`);
      } else {
        const benoetigt = anzahl;
        
        if (verpackung.aktuellVorrat < benoetigt) {
          fehler.push(`Nicht genug "${produkt.verpackung}" auf Lager. Benötigt: ${benoetigt} Stück, Verfügbar: ${verpackung.aktuellVorrat} Stück`);
        } else {
          const vorher = verpackung.aktuellVorrat;
          verpackung.aktuellVorrat -= benoetigt;
          await verpackung.save();
          
          bewegungen.push({
            typ: 'produktion',
            bestandId: null,
            artikel: {
              typ: 'verpackung',
              artikelId: verpackung._id,
              name: verpackung.bezeichnung
            },
            menge: -benoetigt,
            einheit: 'stück',
            bestandVorher: vorher,
            bestandNachher: verpackung.aktuellVorrat,
            grund: `Produktion: ${anzahl}x ${produkt.name}`,
            notizen,
            userId: req.user.id || req.user.userId || req.user._id,
            referenz: {
              typ: 'produktion',
              produktId: produkt._id,
              produktName: produkt.name,
              anzahl
            }
          });
        }
      }
    }
    
    // Falls Fehler aufgetreten sind, keine Änderungen speichern
    if (fehler.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Produktion konnte nicht durchgeführt werden',
        fehler
      });
    }
    
    // Erstelle alle Bewegungs-Logs für Rohstoffe
    for (const bewegungData of bewegungen) {
      try {
        await Bewegung.erstelle(bewegungData);
      } catch (err) {
        console.error('Fehler beim Erstellen der Bewegung:', err);
        // Fahre fort auch wenn Bewegung-Log fehlschlägt
      }
    }
    
    // Buche Fertigprodukt ein (Bestand-Collection)
    const produktBestand = await Bestand.findeOderErstelle('produkt', produktId, 'stück');
    const vorherProdukt = produktBestand.menge;
    await produktBestand.erhoeheBestand(anzahl, 'Produktion abgeschlossen', notizen);
    
    // Erstelle Bewegungs-Log für Fertigprodukt
    try {
      await Bewegung.erstelle({
        typ: 'produktion',
        bestandId: produktBestand._id,
        artikel: {
          typ: 'produkt',
          artikelId: produktId,
          name: produkt.name
        },
        menge: anzahl,
        einheit: 'stück',
        bestandVorher: vorherProdukt,
        bestandNachher: produktBestand.menge,
        grund: 'Produktion abgeschlossen',
        notizen,
        userId: req.user.id || req.user.userId || req.user._id,
        referenz: {
          typ: 'produktion',
          produktId: produkt._id,
          produktName: produkt.name,
          anzahl
        }
      });
    } catch (err) {
      console.error('Fehler beim Erstellen der Produkt-Bewegung:', err);
      // Fahre fort auch wenn Bewegung-Log fehlschlägt
    }
    
    res.json({
      success: true,
      message: `${anzahl}x ${produkt.name} erfolgreich produziert`,
      data: {
        produkt: {
          _id: produkt._id,
          name: produkt.name,
          produziert: anzahl,
          neuerBestand: produktBestand.menge
        },
        verwendeteRohstoffe: bewegungen.map(b => ({
          name: b.artikel.name,
          typ: b.artikel.typ,
          menge: Math.abs(b.menge),
          einheit: b.einheit,
          neuerBestand: b.bestandNachher
        }))
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
    const { typ, artikelId, aenderung, notizen } = req.body;
    
    if (!typ || !artikelId || aenderung === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Typ, ArtikelId und Änderung sind erforderlich'
      });
    }
    
    let artikel;
    let vorher;
    let nachher;
    let einheit;
    
    // Je nach Typ den aktuellVorrat im entsprechenden Model korrigieren
    switch (typ) {
      case 'rohseife':
        artikel = await Rohseife.findById(artikelId);
        if (!artikel) {
          return res.status(404).json({
            success: false,
            message: 'Rohseife nicht gefunden'
          });
        }
        vorher = artikel.aktuellVorrat;
        nachher = Math.max(0, vorher + aenderung);
        artikel.aktuellVorrat = nachher;
        await artikel.save();
        einheit = 'g';
        
        // Log Bewegung
        await Bewegung.erstelle({
          typ: 'korrektur',
          bestandId: null,
          artikel: {
            typ: 'rohseife',
            artikelId: artikel._id,
            name: artikel.bezeichnung
          },
          menge: aenderung,
          einheit: 'g',
          bestandVorher: vorher,
          bestandNachher: nachher,
          grund: 'Manuelle Korrektur',
          notizen,
          userId: req.user.id || req.user.userId
        });
        break;
        
      case 'duftoil':
        artikel = await Duftoil.findById(artikelId);
        if (!artikel) {
          return res.status(404).json({
            success: false,
            message: 'Duftöl nicht gefunden'
          });
        }
        vorher = artikel.aktuellVorrat;
        nachher = Math.max(0, vorher + aenderung);
        artikel.aktuellVorrat = nachher;
        await artikel.save();
        einheit = 'tropfen';
        
        // Log Bewegung
        await Bewegung.erstelle({
          typ: 'korrektur',
          bestandId: null,
          artikel: {
            typ: 'duftoil',
            artikelId: artikel._id,
            name: artikel.bezeichnung
          },
          menge: aenderung,
          einheit: 'tropfen',
          bestandVorher: vorher,
          bestandNachher: nachher,
          grund: 'Manuelle Korrektur',
          notizen,
          userId: req.user.id || req.user.userId
        });
        break;
        
      case 'verpackung':
        artikel = await Verpackung.findById(artikelId);
        if (!artikel) {
          return res.status(404).json({
            success: false,
            message: 'Verpackung nicht gefunden'
          });
        }
        vorher = artikel.aktuellVorrat;
        nachher = Math.max(0, vorher + aenderung);
        artikel.aktuellVorrat = nachher;
        await artikel.save();
        einheit = 'stück';
        
        // Log Bewegung
        await Bewegung.erstelle({
          typ: 'korrektur',
          bestandId: null,
          artikel: {
            typ: 'verpackung',
            artikelId: artikel._id,
            name: artikel.bezeichnung
          },
          menge: aenderung,
          einheit: 'stück',
          bestandVorher: vorher,
          bestandNachher: nachher,
          grund: 'Manuelle Korrektur',
          notizen,
          userId: req.user.id || req.user.userId
        });
        break;
        
      case 'produkt':
        // Für Produkte verwenden wir weiterhin Bestand-Collection
        let bestand = await Bestand.findById(artikelId).populate('artikelId');
        if (!bestand) {
          return res.status(404).json({
            success: false,
            message: 'Bestand nicht gefunden'
          });
        }
        
        vorher = bestand.menge;
        nachher = Math.max(0, vorher + aenderung);
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
        einheit = bestand.einheit;
        
        // Log Bewegung
        await Bewegung.erstelle({
          typ: 'korrektur',
          bestandId: bestand._id,
          artikel: {
            typ: 'produkt',
            artikelId: bestand.artikelId._id,
            name: bestand.artikelId?.name
          },
          menge: aenderung,
          einheit: bestand.einheit,
          bestandVorher: vorher,
          bestandNachher: nachher,
          grund: 'Manuelle Korrektur',
          notizen,
          userId: req.user.id || req.user.userId
        });
        break;
        
      default:
        return res.status(400).json({
          success: false,
          message: 'Ungültiger Typ'
        });
    }
    
    res.json({
      success: true,
      message: 'Bestand erfolgreich korrigiert',
      data: {
        vorher,
        nachher,
        aenderung,
        einheit
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
      Rohseife.find().select('_id bezeichnung aktuellVorrat').lean(),
      Duftoil.find().select('_id bezeichnung aktuellVorrat').lean(),
      Verpackung.find().select('_id bezeichnung aktuellVorrat').lean(),
      Portfolio.find().select('_id name').lean()
    ]);
    
    res.json({
      success: true,
      data: {
        rohseifen: rohseifen.map(r => ({ 
          id: r._id, 
          name: r.bezeichnung,
          vorrat: r.aktuellVorrat 
        })),
        duftoele: duftoele.map(d => ({ 
          id: d._id, 
          name: d.bezeichnung,
          vorrat: d.aktuellVorrat
        })),
        verpackungen: verpackungen.map(v => ({ 
          id: v._id, 
          name: v.bezeichnung,
          vorrat: v.aktuellVorrat
        })),
        produkte: produkte.map(p => ({ id: p._id, name: p.name }))
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
