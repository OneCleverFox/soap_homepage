const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const Portfolio = require('../models/Portfolio');
const Bestand = require('../models/Bestand');
const Rohseife = require('../models/Rohseife');
const Verpackung = require('../models/Verpackung');
const Duftoil = require('../models/Duftoil');
const Giesswerkstoff = require('../models/Giesswerkstoff');
const Giessform = require('../models/Giessform');
const { auth } = require('../middleware/auth');
const logger = require('../utils/logger');
const { cacheManager } = require('../utils/cacheManager');
const { asyncHandler } = require('../middleware/errorHandler');

// ⚡ OPTIMIZED CACHE: Intelligente Cache-Strategie
let portfolioCache = global.portfolioCache || {
  data: null,
  timestamp: 0,
  ttl: 10 * 60 * 1000, // 10 Minuten (Balance zwischen Performance und Aktualität)
  lastHit: 0,
  hitCount: 0,
  version: 2 // 🆕 Version erhöht = Cache wird invalidiert
};

// Cache-Version-Check: Invalidiere bei Version-Mismatch
if (global.portfolioCache && global.portfolioCache.version !== portfolioCache.version) {
  logger.info('🔄 Cache version mismatch - invalidating old cache');
  portfolioCache.data = null;
  portfolioCache.timestamp = 0;
}

// Synchronisiere mit globalem Cache
global.portfolioCache = portfolioCache;

// Hilfsfunktion zum Cache-Invalidieren
function invalidatePortfolioCache() {
  portfolioCache.data = null;
  portfolioCache.timestamp = 0;
  global.portfolioCache = portfolioCache;
  cacheManager.invalidateProductCache();
  logger.info('🗑️ Portfolio cache invalidated');
}

const { optimizeMainImage } = require('../middleware/imageOptimization');

// Multer-Konfiguration für Produktbilder
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.join(__dirname, '../../uploads/products');
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, `product-${uniqueSuffix}${path.extname(file.originalname)}`);
  }
});

const fileFilter = (req, file, cb) => {
  const allowedMimes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/svg+xml'];
  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Nur JPEG, PNG, WebP und SVG Bilder sind erlaubt'), false);
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB (wird durch Optimierung reduziert)
});

const router = express.Router();

// 🆕 DEV: Cache manuell leeren
router.get('/dev/clear-cache', (req, res) => {
  invalidatePortfolioCache();
  res.json({ success: true, message: 'Portfolio cache cleared' });
});

// DEBUG Route - Portfolio-Status prüfen
router.get('/debug/portfolio-status', async (req, res) => {
  try {
    const totalPortfolio = await Portfolio.countDocuments({});
    const activePortfolio = await Portfolio.countDocuments({ aktiv: true });
    const inactivePortfolio = await Portfolio.countDocuments({ aktiv: false });
    const undefinedActive = await Portfolio.countDocuments({ aktiv: { $exists: false } });
    
    const sampleItems = await Portfolio.find({}).limit(5).lean();
    
    logger.info('🔍 Portfolio Debug Info:');
    logger.info(`📊 Total Portfolio Items: ${totalPortfolio}`);
    logger.info(`✅ Active Portfolio Items: ${activePortfolio}`);
    logger.info(`❌ Inactive Portfolio Items: ${inactivePortfolio}`);
    logger.info(`❔ Undefined Active Status: ${undefinedActive}`);
    
    res.json({
      success: true,
      data: {
        total: totalPortfolio,
        active: activePortfolio,
        inactive: inactivePortfolio,
        undefinedActive: undefinedActive,
        sampleItems: sampleItems
      }
    });
  } catch (error) {
    logger.error('❌ Portfolio Debug Error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// DEBUG Route - Cache invalidierung erzwingen
router.get('/debug/invalidate-cache', async (req, res) => {
  try {
    console.log('🧹 MANUAL CACHE INVALIDATION triggered');
    invalidatePortfolioCache();
    res.json({
      success: true,
      message: 'Portfolio cache manually invalidated',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ Manual cache invalidation error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// DEBUG Route - alle Bestände anzeigen
router.get('/debug/bestaende', async (req, res) => {
  try {
    const alleBestaende = await Bestand.find({}).populate('artikelId');
    logger.info('🔍 Alle Bestände in der DB:', alleBestaende.length);
    
    const produktBestaende = alleBestaende.filter(b => b.typ === 'produkt');
    logger.info('📦 Produkt-Bestände:', produktBestaende.length);
    
    res.json({
      success: true,
      alleBestaende: alleBestaende.length,
      produktBestaende: produktBestaende.length,
      data: produktBestaende.map(b => ({
        id: b._id,
        typ: b.typ,
        artikelId: b.artikelId,
        artikelModell: b.artikelModell,
        menge: b.menge,
        einheit: b.einheit,
        produktName: b.artikelId?.name || 'UNBEKANNT'
      }))
    });
  } catch (error) {
    logger.error('Debug Error:', error);
    res.status(500).json({ error: error.message });
  }
});

// DEBUG Route - Bestand für ein Produkt erstellen
router.post('/debug/create-bestand/:id', async (req, res) => {
  try {
    const portfolioId = req.params.id;
    const portfolioItem = await Portfolio.findById(portfolioId);
    
    if (!portfolioItem) {
      return res.status(404).json({ error: 'Portfolio-Item nicht gefunden' });
    }

    // Prüfen ob bereits Bestand existiert
    let bestand = await Bestand.findOne({
      artikelId: portfolioId,
      typ: 'produkt'
    });

    if (bestand) {
      return res.json({
        success: true,
        message: 'Bestand existiert bereits',
        bestand
      });
    }

    // Neuen Bestand erstellen
    bestand = new Bestand({
      typ: 'produkt',
      artikelId: portfolioId,
      artikelModell: 'Portfolio',
      menge: req.body.menge || 10, // Standard 10 Stück
      einheit: 'Stück',
      mindestbestand: 2
    });

    await bestand.save();

    res.json({
      success: true,
      message: 'Bestand erstellt',
      bestand,
      portfolio: portfolioItem.name
    });
  } catch (error) {
    console.error('Bestand Create Error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Hilfsfunktion für Preisberechnung
async function calculatePortfolioPrice(portfolioItem) {
  const details = {
    rohseife: 0,
    verpackung: 0,
    duftoele: 0,
    zusaetze: 0
  };

  // 1. Rohseifen-Kosten berechnen
  try {
    const rohseife = await Rohseife.findOne({ 
      bezeichnung: { $regex: new RegExp(portfolioItem.seife, 'i') }
    });
    
    if (rohseife) {
      // Prüfe ob zwei Rohseifen verwendet werden
      if (portfolioItem.rohseifenKonfiguration?.verwendeZweiRohseifen) {
        const seife1Prozent = portfolioItem.rohseifenKonfiguration.gewichtVerteilung?.seife1Prozent || 50;
        const rohseife1Gramm = Math.round(portfolioItem.gramm * (seife1Prozent / 100));
        
        details.rohseife = rohseife.preisProGramm * rohseife1Gramm;
        
        // Zweite Rohseife laden und berechnen
        if (portfolioItem.rohseifenKonfiguration.seife2) {
          const rohseife2 = await Rohseife.findOne({ 
            bezeichnung: { $regex: new RegExp(portfolioItem.rohseifenKonfiguration.seife2, 'i') }
          });
          
          if (rohseife2) {
            const seife2Prozent = portfolioItem.rohseifenKonfiguration.gewichtVerteilung?.seife2Prozent || 50;
            const rohseife2Gramm = Math.round(portfolioItem.gramm * (seife2Prozent / 100));
            
            details.rohseife += rohseife2.preisProGramm * rohseife2Gramm;
          }
        }
      } else {
        // Standard: Eine Rohseife
        details.rohseife = rohseife.preisProGramm * portfolioItem.gramm;
      }
    } else {
      // Fallback: Schätzpreis basierend auf Durchschnittswerten
      details.rohseife = portfolioItem.gramm * 0.05; // 5 Cent pro Gramm
    }
  } catch (error) {
    details.rohseife = portfolioItem.gramm * 0.05;
  }

  // 2. Verpackungskosten berechnen
  try {
    const verpackung = await Verpackung.findOne({
      bezeichnung: { $regex: new RegExp(portfolioItem.verpackung, 'i') }
    });
    
    if (verpackung) {
      details.verpackung = verpackung.kostenProStueck;
    } else {
      // Fallback: Standardverpackungskosten
      details.verpackung = 0.5; // 50 Cent pro Verpackung
    }
  } catch (error) {
    details.verpackung = 0.5;
  }

  // 3. Duftöl-Kosten (falls vorhanden)
  if (portfolioItem.aroma && portfolioItem.aroma !== 'Neutral') {
    try {
      const duftoil = await Duftoil.findOne({
        bezeichnung: { $regex: new RegExp(portfolioItem.aroma, 'i') }
      });
      
      if (duftoil) {
        // Annahme: 2-3 Tropfen pro 100g Seife
        const tropfenProGramm = 0.025;
        const benoetigteTropfen = portfolioItem.gramm * tropfenProGramm;
        details.duftoele = benoetigteTropfen * (duftoil.preisProTropfen || duftoil.kostenProTropfen);
      } else {
        // Fallback: Schätzpreis für Duftöl
        details.duftoele = 0.3; // 30 Cent pro Duftung
      }
    } catch (error) {
      details.duftoele = 0.3;
    }
  }

  // 4. Zusatzkosten (falls zusätzliche Zutaten)
  if (portfolioItem.zusatz && portfolioItem.zusatz.trim() !== '') {
    details.zusaetze = 0.2; // 20 Cent für Zusätze
  }

  const gesamtpreis = details.rohseife + details.verpackung + details.duftoele + details.zusaetze;

  return {
    gesamtpreis: Math.round(gesamtpreis * 100) / 100, // Auf 2 Dezimalstellen runden
    details
  };
}

// @route   GET /api/portfolio
// @desc    Alle Portfolio-Einträge abrufen
// @access  Public (aktive), Admin (alle mit includeInactive=true)
router.get('/', async (req, res) => {
  try {
    console.log('🔍 [PORTFOLIO] Lade Produkte aus Portfolio...');
    
    const { includeInactive, includeUnavailable } = req.query;
    const shouldIncludeInactive = includeInactive === 'true' || includeUnavailable === 'true';
    
    // Filter-Query basierend auf Parameter
    let filter = {};
    if (!shouldIncludeInactive) {
      // Unterstütze beide Feldnamen: isActive und aktiv
      filter.$or = [
        { isActive: true },
        { aktiv: true }
      ];
    }
    
    const startTime = Date.now();
    
    // ⚡ LÖSUNG: Lade Daten OHNE Sortierung - verhindert MongoDB Memory Limit Fehler
    // Sortierung erfolgt lokal in Node.js (siehe unten)
    const portfolioItems = await Portfolio.find(filter)
      .select('-bilder.hauptbildData.data -bilder.galerie') // Schließe große Bild-Daten aus
      .lean() // Bessere Performance
      .exec();
    
    const queryTime = Date.now() - startTime;
    console.log(`📦 [PORTFOLIO] ${portfolioItems.length} Produkte aus DB geladen in ${queryTime}ms`);
    
    // 🔄 Lade Bestandsinformationen für alle Produkte
    const bestandStartTime = Date.now();
    const portfolioIds = portfolioItems.map(item => item._id);
    const bestaende = await Bestand.find({
      typ: 'produkt',
      artikelId: { $in: portfolioIds }
    }).lean();
    
    // Erstelle Map für schnellen Zugriff
    const bestandMap = new Map();
    bestaende.forEach(b => {
      bestandMap.set(b.artikelId.toString(), b);
    });
    
    const bestandTime = Date.now() - bestandStartTime;
    console.log(`📊 [PORTFOLIO] ${bestaende.length} Bestandseinträge geladen in ${bestandTime}ms`);
    
    // Füge Bestandsinformationen zu Produkten hinzu
    portfolioItems.forEach(item => {
      const bestand = bestandMap.get(item._id.toString());
      item.bestand = bestand || { menge: 0, einheit: 'Stück' };
      // Auch als hasHauptbild Flag setzen für Bildanzeige
      item.hasHauptbild = !!(item.bilder?.hauptbildData);
    });
    
    // ⚡ LOKALE SORTIERUNG in Node.js (kein MongoDB Memory Limit!)
    portfolioItems.sort((a, b) => {
      // Primäre Sortierung: reihenfolge (falls vorhanden)
      const orderA = a.reihenfolge || 999999;
      const orderB = b.reihenfolge || 999999;
      
      if (orderA !== orderB) {
        return orderA - orderB;
      }
      
      // Sekundäre Sortierung: createdAt (neueste zuerst)
      const dateA = a.createdAt ? new Date(a.createdAt) : new Date(0);
      const dateB = b.createdAt ? new Date(b.createdAt) : new Date(0);
      
      return dateB - dateA;
    });
    
    const sortTime = Date.now() - startTime - queryTime - bestandTime;
    console.log(`🔄 [PORTFOLIO] Lokal sortiert in ${sortTime}ms`);
    console.log(`✅ [PORTFOLIO] ${portfolioItems.length} Produkte fertig verarbeitet`);
    
    const totalTime = Date.now() - startTime;
    console.log(`⚡ [PORTFOLIO] Gesamt-Antwortzeit: ${totalTime}ms`);
    
    // Sende konsistente Response im success-Format
    res.json({
      success: true,
      data: portfolioItems
    });
    
  } catch (error) {
    console.error('❌ [PORTFOLIO] Fehler beim Laden der Produkte:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Laden der Produkte',
      error: error.message
    });
  }
});

// 🖼️ IMAGE SERVING: Hauptbild on-demand laden
router.get('/:id/hauptbild', async (req, res) => {
  try {
    const portfolioItem = await Portfolio.findById(req.params.id)
      .select('bilder.hauptbildData')
      .lean();
    
    if (!portfolioItem?.bilder?.hauptbildData?.data) {
      return res.status(404).json({ 
        success: false, 
        message: 'Hauptbild nicht gefunden' 
      });
    }
    
    const imageData = portfolioItem.bilder.hauptbildData;
    
    // Base64 zu Buffer konvertieren
    const base64Data = imageData.data.replace(/^data:image\/\w+;base64,/, '');
    const imageBuffer = Buffer.from(base64Data, 'base64');
    
    // Content-Type verwenden (oder Default)
    const mimeType = imageData.contentType || 'image/jpeg';
    
    // Cache-Header (1 Stunde)
    res.setHeader('Content-Type', mimeType);
    res.setHeader('Cache-Control', 'public, max-age=3600');
    res.send(imageBuffer);
  } catch (error) {
    console.error('Hauptbild Load Error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Fehler beim Laden des Hauptbildes' 
    });
  }
});

// 🖼️ IMAGE SERVING: Galerie-Bild on-demand laden
router.get('/:id/galerie/:index', async (req, res) => {
  try {
    const { id, index } = req.params;
    const imageIndex = parseInt(index, 10);
    
    const portfolioItem = await Portfolio.findById(id)
      .select('bilder.galerie')
      .lean();
    
    if (!portfolioItem?.bilder?.galerie || !portfolioItem.bilder.galerie[imageIndex]) {
      return res.status(404).json({ 
        success: false, 
        message: 'Galerie-Bild nicht gefunden' 
      });
    }
    
    const imageData = portfolioItem.bilder.galerie[imageIndex];
    
    // Base64 zu Buffer konvertieren
    const base64Data = imageData.data.replace(/^data:image\/\w+;base64,/, '');
    const imageBuffer = Buffer.from(base64Data, 'base64');
    
    // Content-Type verwenden
    const mimeType = imageData.contentType || 'image/jpeg';
    
    // Cache-Header (1 Stunde)
    res.setHeader('Content-Type', mimeType);
    res.setHeader('Cache-Control', 'public, max-age=3600');
    res.send(imageBuffer);
  } catch (error) {
    console.error('Galerie-Bild Load Error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Fehler beim Laden des Galerie-Bildes' 
    });
  }
});

// Optimierte Preisberechnung ohne Datenbankabfragen (nutzt gecachte Maps)
function calculatePortfolioPriceOptimized(portfolioItem, rohseifenMap, verpackungsMap, duftoelMap) {
  const details = {
    rohseife: 0,
    verpackung: 0,
    duftoele: 0,
    zusaetze: 0
  };

  // 1. Rohseifen-Kosten berechnen
  try {
    const rohseifeKey = portfolioItem.seife.toLowerCase();
    const rohseife = rohseifenMap.get(rohseifeKey);
    
    if (rohseife) {
      details.rohseife = rohseife.preisProGramm * portfolioItem.gramm;
    } else {
      // Suche mit partiellem Match
      for (const [key, value] of rohseifenMap.entries()) {
        if (key.includes(rohseifeKey) || rohseifeKey.includes(key)) {
          details.rohseife = value.preisProGramm * portfolioItem.gramm;
          break;
        }
      }
      // Fallback: Schätzpreis basierend auf Durchschnittswerten
      if (details.rohseife === 0) {
        details.rohseife = portfolioItem.gramm * 0.05; // 5 Cent pro Gramm
      }
    }
  } catch (error) {
    details.rohseife = portfolioItem.gramm * 0.05;
  }

  // 2. Verpackungskosten berechnen
  try {
    const verpackungKey = portfolioItem.verpackung.toLowerCase();
    const verpackung = verpackungsMap.get(verpackungKey);
    
    if (verpackung) {
      details.verpackung = verpackung.kostenProStueck;
    } else {
      // Suche mit partiellem Match
      for (const [key, value] of verpackungsMap.entries()) {
        if (key.includes(verpackungKey) || verpackungKey.includes(key)) {
          details.verpackung = value.kostenProStueck;
          break;
        }
      }
      // Fallback: Standardverpackungskosten
      if (details.verpackung === 0) {
        details.verpackung = 0.5; // 50 Cent pro Verpackung
      }
    }
  } catch (error) {
    details.verpackung = 0.5;
  }

  // 3. Duftöl-Kosten (falls vorhanden)
  if (portfolioItem.aroma && portfolioItem.aroma !== 'Neutral') {
    try {
      const duftoelKey = portfolioItem.aroma.toLowerCase();
      const duftoil = duftoelMap.get(duftoelKey);
      
      if (duftoil) {
        // Annahme: 2-3 Tropfen pro 100g Seife
        const tropfenProGramm = 0.025;
        const benoetigteTropfen = portfolioItem.gramm * tropfenProGramm;
        details.duftoele = benoetigteTropfen * (duftoil.preisProTropfen || duftoil.kostenProTropfen);
      } else {
        // Suche mit partiellem Match
        for (const [key, value] of duftoelMap.entries()) {
          if (key.includes(duftoelKey) || duftoelKey.includes(key)) {
            const tropfenProGramm = 0.025;
            const benoetigteTropfen = portfolioItem.gramm * tropfenProGramm;
            details.duftoele = benoetigteTropfen * (value.preisProTropfen || value.kostenProTropfen);
            break;
          }
        }
        // Fallback: Schätzpreis für Duftöl
        if (details.duftoele === 0) {
          details.duftoele = 0.3; // 30 Cent pro Duftung
        }
      }
    } catch (error) {
      details.duftoele = 0.3;
    }
  }

  // 4. Zusatzkosten (falls zusätzliche Zutaten)
  if (portfolioItem.zusatz && portfolioItem.zusatz.trim() !== '') {
    details.zusaetze = 0.2; // 20 Cent für Zusätze
  }

  const gesamtpreis = details.rohseife + details.verpackung + details.duftoele + details.zusaetze;

  return {
    gesamtpreis: Math.round(gesamtpreis * 100) / 100, // Auf 2 Dezimalstellen runden
    details
  };
}

// @route   GET /api/portfolio/with-prices
// @desc    Alle Portfolio-Einträge mit berechneten Preisen und Bestandsinformationen abrufen
// @access  Public
router.get('/with-prices', async (req, res) => {
  const startTime = Date.now();
  console.log('🚀 Portfolio with-prices request started');
  
  try {
    // ⚡ OPTIMIZED CACHE HEADERS: Intelligentes Browser-Caching
    res.set({
      'Cache-Control': 'public, max-age=600, stale-while-revalidate=900', // 10 Min Cache, 15 Min stale
      'ETag': `portfolio-${Date.now()}`,
      'Last-Modified': new Date().toUTCString()
    });
    
    // ⚡ ENHANCED CACHE-CHECK mit Metriken
    const now = Date.now();
    if (portfolioCache.data && (now - portfolioCache.timestamp) < portfolioCache.ttl) {
      portfolioCache.lastHit = now;
      portfolioCache.hitCount++;
      const cacheAge = now - portfolioCache.timestamp;
      console.log(`⚡ Cache hit #${portfolioCache.hitCount}! Returning cached data (${cacheAge}ms old)`);
      return res.status(200).json({
        success: true,
        count: portfolioCache.data.length,
        data: portfolioCache.data,
        cached: true,
        cacheAge: cacheAge,
        hitCount: portfolioCache.hitCount
      });
    }
    
    console.log('🔄 Cache miss or expired, fetching fresh data...');
    // 1. Portfolio Items laden (⚡ SORT FIRST, dann SELECT!)
    const portfolioStart = Date.now();
    const portfolioItems = await Portfolio.find({ aktiv: true })
      .sort({ reihenfolge: 1, name: 1 })  // ✅ ERST sortieren (nutzt Index)
      .select('-bilder')  // ✅ DANN Bilder ausschließen
      .lean(); // lean() für bessere Performance
    
    console.log(`📋 Portfolio items loaded (${portfolioItems.length}): ${Date.now() - portfolioStart}ms`);
    
    // Debug: Status der ersten 5 Items anzeigen
    if (portfolioItems.length > 0) {
      console.log(`🔍 DEBUG: Erste 5 Portfolio items:`, 
        portfolioItems.slice(0, 5).map(item => ({ 
          _id: item._id,
          name: item.name, 
          aktiv: item.aktiv,
          hasAktivProperty: item.hasOwnProperty('aktiv')
        }))
      );
    } else {
      console.log(`⚠️ WARNUNG: Keine Portfolio-Items in der Datenbank gefunden!`);
    }

    // 2. Alle benötigten Daten in Batch-Abfragen laden
    const batchStart = Date.now();
    
    // 2a. Bestand-Daten (nur für Produkte)
    const alleBestaende = await Bestand.find({ typ: 'produkt' })
      .select('artikelId menge')
      .lean();
    const bestandMap = new Map(
      alleBestaende.map(b => [b.artikelId.toString(), b])
    );
    
    // ⚡ OPTIMIERUNG: Nur benötigte Rohstoffe laden (statt ALLE)
    const uniqueRohseifen = [...new Set(portfolioItems.map(p => p.seife))];
    const uniqueVerpackungen = [...new Set(portfolioItems.map(p => p.verpackung))];
    const uniqueDuftoele = [...new Set(
      portfolioItems
        .map(p => p.aroma)
        .filter(aroma => aroma && aroma !== 'Neutral' && aroma !== '')
    )];
    
    console.log(`🎯 Loading selective data: ${uniqueRohseifen.length} Rohseifen, ${uniqueVerpackungen.length} Verpackungen, ${uniqueDuftoele.length} Duftöle`);
    
    // 2b. Nur benötigte Rohseifen laden
    const alleRohseifen = await Rohseife.find({ 
      bezeichnung: { $in: uniqueRohseifen },
      verfuegbar: true 
    })
    .select('bezeichnung preisProGramm')
    .lean();
    const rohseifenMap = new Map(
      alleRohseifen.map(r => [r.bezeichnung.toLowerCase(), r])
    );
    
    // 2c. Nur benötigte Verpackungen laden
    const alleVerpackungen = await Verpackung.find({ 
      bezeichnung: { $in: uniqueVerpackungen },
      verfuegbar: true 
    })
    .select('bezeichnung kostenProStueck')
    .lean();
    const verpackungsMap = new Map(
      alleVerpackungen.map(v => [v.bezeichnung.toLowerCase(), v])
    );
    
    // 2d. Nur benötigte Duftöle laden
    const alleDuftoele = await Duftoil.find({ 
      bezeichnung: { $in: uniqueDuftoele },
      verfuegbar: true 
    })
    .select('bezeichnung preisProTropfen kostenProTropfen')
    .lean();
    const duftoelMap = new Map(
      alleDuftoele.map(d => [d.bezeichnung.toLowerCase(), d])
    );
    
    console.log(`📦 Optimized batch data loaded: ${Date.now() - batchStart}ms`);

    // 3. Preise für jedes Portfolio-Element berechnen (parallel, aber mit gecachten Daten)
    const priceStart = Date.now();
    const portfolioWithPrices = portfolioItems.map((item) => {
      const itemStart = Date.now();
      try {
        const priceData = calculatePortfolioPriceOptimized(item, rohseifenMap, verpackungsMap, duftoelMap);
        
        // Bestandsinformationen hinzufügen
        const bestand = bestandMap.get(item._id.toString());
        const verfuegbareMenge = bestand ? bestand.menge : 0;
        // Verfügbarkeit: Produkt muss aktiv sein UND Bestand haben
        const istVerfuegbar = item.aktiv !== false && verfuegbareMenge > 0;
        
        // 🚀 OPTIMIERT: Bild-URLs generieren (auch wenn Bilder nicht geladen wurden)
        let imageData = { hauptbild: null, galerie: [] };
        
        // Da wir .select('-bilder') verwenden, haben wir die Bilddaten nicht
        // → Generiere URLs direkt basierend auf der Produkt-ID
        imageData.hauptbild = {
          url: `/api/portfolio/${item._id}/image/main`,
          type: 'image/jpeg'  // Default Typ
        };
        
        // Galerie-Bilder: Erstelle URLs für potenzielle Bilder (0-10)
        // Die tatsächliche Anzahl wird beim Abruf geprüft
        imageData.galerie = [];
        // Leer lassen - Galerie wird nur beim Einzelabruf geladen
        
        // Preis-Logik: Verwende gespeicherten Preis, falls vorhanden, sonst berechne automatisch
        const gespeicherterPreis = item.preis || 0;
        const automatischerPreis = Math.ceil(priceData.gesamtpreis * 1.5); // 50% Marge
        const verkaufspreis = gespeicherterPreis > 0 ? gespeicherterPreis : automatischerPreis;
        
        // Namen für Frontend-Anzeige hinzufügen
        let additionalNames = {};
        
        // Rohseifenname für Seifen
        if (item.kategorie !== 'werkstuck' && item.seife) {
          const rohseife = rohseifenMap.get(item.seife.toLowerCase());
          additionalNames.rohseifename = rohseife?.bezeichnung || item.seife;
        }
        
        // Gießwerkstoff- und Gießform-Namen für Werkstücke (synchron aus dem Item selbst)
        if (item.kategorie === 'werkstuck') {
          // Fallback-Namen verwenden bis wir die echten Namen laden können
          additionalNames.giesswerkstoffName = 'Standard';
          additionalNames.giessformName = 'Standard';
        }
        
        const result = {
          ...item,
          ...additionalNames,
          berechneterPreis: priceData.gesamtpreis,
          preisDetails: priceData.details,
          verkaufspreis: verkaufspreis,
          preis: verkaufspreis, // Alias für Frontend-Kompatibilität
          bestand: {
            verfuegbar: istVerfuegbar,
            menge: verfuegbareMenge,
            einheit: 'Stück'
          },
          bilder: imageData  // ✅ NUR optimierte Bild-URLs, keine Base64-Daten!
        };
        
        console.log(`✅ ${item.name}: ${Date.now() - itemStart}ms`);
        return result;
      } catch (priceError) {
        console.warn(`⚠️ Preisberechnung für ${item.name} fehlgeschlagen (${Date.now() - itemStart}ms):`, priceError.message);
        
        // Bestandsinformationen auch bei Preisfehler hinzufügen
        const bestand = bestandMap.get(item._id.toString());
        const verfuegbareMenge = bestand ? bestand.menge : 0;
        const istVerfuegbar = verfuegbareMenge > 0;
        
        // 🚀 OPTIMIERT: Bild-URLs auch im Fehlerfall (Bilder nicht geladen wegen .select('-bilder'))
        const imageData = { 
          hauptbild: {
            url: `/api/portfolio/${item._id}/image/main`,
            type: 'image/jpeg'
          },
          galerie: [] 
        };
        
        // Preis-Logik auch bei Fehlern: Verwende gespeicherten Preis, falls vorhanden
        const gespeicherterPreis = item.preis || 0;
        const verkaufspreis = gespeicherterPreis > 0 ? gespeicherterPreis : 0;
        
        return {
          ...item,
          berechneterPreis: 0,
          preisDetails: { error: 'Preisberechnung nicht möglich' },
          verkaufspreis: verkaufspreis,
          preis: verkaufspreis, // Alias für Frontend-Kompatibilität
          bestand: {
            verfuegbar: istVerfuegbar,
            menge: verfuegbareMenge,
            einheit: 'Stück'
          },
          bilder: imageData  // ✅ NUR optimierte Bild-URLs, keine Base64-Daten!
        };
      }
    });
    
    console.log(`🎯 Price calculation completed: ${Date.now() - priceStart}ms`);
    console.log(`🏁 Total portfolio with-prices time: ${Date.now() - startTime}ms`);

    // Cache aktualisieren
    portfolioCache.data = portfolioWithPrices;
    portfolioCache.timestamp = Date.now();
    console.log('💾 Portfolio data cached for 15 minutes');

    res.set('Cache-Control', 'public, max-age=120'); // 2 Minuten Browser-Cache
    res.status(200).json({
      success: true,
      count: portfolioWithPrices.length,
      data: portfolioWithPrices,
      cached: false,
      generationTime: Date.now() - startTime
    });
  } catch (error) {
    console.error('Portfolio with Prices Fetch Error:', error);
    
    // Unterschiedliche Error-Behandlung je nach Fehlertyp
    if (error.name === 'MongoNetworkError' || error.name === 'MongoTimeoutError') {
      res.status(503).json({
        success: false,
        error: 'DATABASE_UNAVAILABLE',
        message: 'Datenbank ist momentan nicht erreichbar. Bitte versuchen Sie es in wenigen Momenten erneut.',
        retryAfter: 30
      });
    } else if (error.name === 'MongoServerError') {
      res.status(503).json({
        success: false,
        error: 'DATABASE_ERROR',
        message: 'Datenbankfehler. Unser Team wurde benachrichtigt.',
        retryAfter: 60
      });
    } else {
      res.status(500).json({
        success: false,
        error: 'INTERNAL_ERROR',
        message: 'Fehler beim Abrufen der Portfolio-Daten. Bitte versuchen Sie es erneut.',
        retryAfter: 15
      });
    }
  }
});

// @route   GET /api/portfolio/:id
// @desc    Einzelnen Portfolio-Eintrag abrufen
// @access  Public
// @route   GET /api/portfolio/:id
// @desc    Einzelnen Portfolio-Eintrag mit Bestandsinformationen abrufen
// @access  Public
router.get('/:id', async (req, res) => {
  try {
    console.log('🔍 Portfolio-Einzelabruf für ID:', req.params.id);
    
    const portfolioItem = await Portfolio.findById(req.params.id);

    if (!portfolioItem) {
      console.log('❌ Portfolio-Item nicht gefunden:', req.params.id);
      return res.status(404).json({
        success: false,
        message: 'Portfolio-Eintrag nicht gefunden'
      });
    }

    console.log('✅ Portfolio-Item gefunden:', portfolioItem.name);

    // Für Werkstücke: Gießwerkstoff und Gießform-Namen laden
    let giesswerkstoffName = null;
    let giessformName = null;
    
    if (portfolioItem.kategorie === 'werkstuck') {
      if (portfolioItem.giesswerkstoff) {
        try {
          const giesswerkstoff = await Giesswerkstoff.findById(portfolioItem.giesswerkstoff);
          giesswerkstoffName = giesswerkstoff ? giesswerkstoff.bezeichnung : null;
          console.log('🧱 Gießwerkstoff Name:', giesswerkstoffName);
        } catch (gError) {
          console.warn('⚠️ Gießwerkstoff nicht gefunden:', portfolioItem.giesswerkstoff);
        }
      }
      
      if (portfolioItem.giessform) {
        try {
          const giessform = await Giessform.findById(portfolioItem.giessform);
          giessformName = giessform ? giessform.name : null;
          console.log('🍱 Gießform Name:', giessformName);
        } catch (gError) {
          console.warn('⚠️ Gießform nicht gefunden:', portfolioItem.giessform);
        }
      }
    }

    // Bestandsinformationen für dieses Portfolio-Item laden
    let bestand = null;
    try {
      console.log('🔍 Suche Bestand für Portfolio-ID:', portfolioItem._id);
      
      const bestandEntry = await Bestand.findOne({ 
        artikelId: portfolioItem._id,
        typ: 'produkt'
      });
      
      console.log('📊 Bestand-Eintrag gefunden:', bestandEntry ? {
        menge: bestandEntry.menge,
        einheit: bestandEntry.einheit,
        artikelId: bestandEntry.artikelId
      } : 'NICHT GEFUNDEN');
      
      if (bestandEntry) {
        bestand = {
          menge: bestandEntry.menge || 0,
          einheit: bestandEntry.einheit || 'Stück',
          verfuegbar: (bestandEntry.menge || 0) > 0
        };
      } else {
        // Fallback: Wenn kein Bestand-Eintrag gefunden wird
        bestand = {
          menge: 0,
          einheit: 'Stück',
          verfuegbar: false
        };
      }
    } catch (bestandError) {
      console.error('❌ Error loading bestand for portfolio item:', bestandError);
      bestand = {
        menge: 0,
        einheit: 'Stück',
        verfuegbar: false
      };
    }

    console.log('📦 Finaler Bestand:', bestand);

    // Portfolio-Item mit Bestandsinformationen und Werkstück-Namen zurückgeben
    const responseData = {
      ...portfolioItem.toObject(),
      bestand,
      // Werkstück-spezifische Namen hinzufügen
      giesswerkstoffName,
      giessformName
    };

    res.status(200).json({
      success: true,
      data: responseData
    });
  } catch (error) {
    console.error('Portfolio Item Fetch Error:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Abrufen des Portfolio-Eintrags'
    });
  }
});

// @route   POST /api/portfolio
// @desc    Neuen Portfolio-Eintrag erstellen
// @access  Private (Admin only)
router.post('/', auth, async (req, res) => {
  try {
    const portfolioItem = new Portfolio(req.body);
    const savedItem = await portfolioItem.save();

    // Cache invalidieren nach erfolgreichem Erstellen
    invalidatePortfolioCache();
    
    res.status(201).json({
      success: true,
      message: 'Portfolio-Eintrag erfolgreich erstellt',
      data: savedItem
    });
  } catch (error) {
    console.error('Portfolio Create Error:', error);
    
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Ein Portfolio-Eintrag mit diesem Namen existiert bereits'
      });
    }

    res.status(400).json({
      success: false,
      message: 'Fehler beim Erstellen des Portfolio-Eintrags',
      error: error.message
    });
  }
});

// @route   PUT /api/portfolio/:id
// @desc    Portfolio-Eintrag aktualisieren
// @access  Private (Admin only)
router.put('/:id', auth, async (req, res) => {
  try {
    // 🔍 DEBUG: Zeige Request-Body vor dem Speichern
    console.log('🔍 PORTFOLIO UPDATE - Request Body:', JSON.stringify(req.body, null, 2));
    console.log('🔍 PORTFOLIO UPDATE - Rohseifen-Konfiguration:', req.body.rohseifenKonfiguration);
    
    const portfolioItem = await Portfolio.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    if (!portfolioItem) {
      return res.status(404).json({
        success: false,
        message: 'Portfolio-Eintrag nicht gefunden'
      });
    }

    // 🔍 DEBUG: Zeige gespeicherte Daten
    console.log('🔍 PORTFOLIO UPDATE - Gespeicherte Daten:', JSON.stringify(portfolioItem.toObject(), null, 2));
    console.log('🔍 PORTFOLIO UPDATE - Gespeicherte Rohseifen-Konfiguration:', portfolioItem.rohseifenKonfiguration);

    // Cache SOFORT und AGGRESSIV invalidieren nach erfolgreichem Update
    portfolioCache.data = null;
    portfolioCache.timestamp = 0;
    global.portfolioCache = portfolioCache;
    cacheManager.invalidateProductCache();
    console.log('🗑️ IMMEDIATE Portfolio cache invalidation after update');
    
    // Zusätzliche Cache-Invalidierung
    invalidatePortfolioCache();
    
    res.status(200).json({
      success: true,
      message: 'Portfolio-Eintrag erfolgreich aktualisiert',
      data: portfolioItem
    });
  } catch (error) {
    console.error('Portfolio Update Error:', error);
    res.status(400).json({
      success: false,
      message: 'Fehler beim Aktualisieren des Portfolio-Eintrags',
      error: error.message
    });
  }
});

// @route   DELETE /api/portfolio/:id
// @desc    Portfolio-Eintrag löschen
// @access  Private (Admin only)
router.delete('/:id', auth, async (req, res) => {
  try {
    const portfolioItem = await Portfolio.findByIdAndDelete(req.params.id);

    if (!portfolioItem) {
      return res.status(404).json({
        success: false,
        message: 'Portfolio-Eintrag nicht gefunden'
      });
    }

    // Cache invalidieren nach erfolgreichem Löschen
    invalidatePortfolioCache();
    
    res.status(200).json({
      success: true,
      message: 'Portfolio-Eintrag erfolgreich gelöscht'
    });
  } catch (error) {
    console.error('Portfolio Delete Error:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Löschen des Portfolio-Eintrags'
    });
  }
});

// DEBUG Route - Cache manuell invalidieren
router.post('/debug/clear-cache', async (req, res) => {
  try {
    invalidatePortfolioCache();
    res.json({
      success: true,
      message: 'Portfolio cache cleared successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// @route   GET /api/portfolio/stats/overview
// @desc    Portfolio-Statistiken abrufen
// @access  Private (Admin only)
router.get('/stats/overview', auth, async (req, res) => {
  try {
    const totalItems = await Portfolio.countDocuments();
    const activeItems = await Portfolio.countDocuments({ aktiv: true });
    
    // Gruppierung nach Seifentyp
    const seifenTypes = await Portfolio.aggregate([
      { $group: { _id: '$seife', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);

    // Gruppierung nach Aroma
    const aromaTypes = await Portfolio.aggregate([
      { $group: { _id: '$aroma', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);

    res.status(200).json({
      success: true,
      data: {
        totalItems,
        activeItems,
        seifenTypes,
        aromaTypes
      }
    });
  } catch (error) {
    console.error('Portfolio Stats Error:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Abrufen der Portfolio-Statistiken'
    });
  }
});

// @route   POST /api/portfolio/:id/upload-image
// @desc    Bild für ein Portfolio-Produkt hochladen (Base64) mit automatischer Optimierung
// @access  Private
router.post('/:id/upload-image', auth, upload.single('image'), optimizeMainImage, async (req, res) => {
  try {
    const { id } = req.params;
    const { alt_text, isHauptbild } = req.body;

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Keine Bilddatei hochgeladen'
      });
    }

    const product = await Portfolio.findById(id);
    if (!product) {
      // Datei löschen wenn Produkt nicht gefunden
      fs.unlinkSync(req.file.path);
      return res.status(404).json({
        success: false,
        message: 'Produkt nicht gefunden'
      });
    }

    // Bild als Base64 einlesen
    const imageBuffer = fs.readFileSync(req.file.path);
    const base64Image = imageBuffer.toString('base64');
    const contentType = req.file.mimetype;

    // Temporäre Datei löschen (nicht mehr benötigt)
    fs.unlinkSync(req.file.path);

    // Bilder-Objekt initialisieren falls nicht vorhanden
    if (!product.bilder) {
      product.bilder = {
        hauptbild: null,
        hauptbildData: { data: '', contentType: '' },
        galerie: [],
        alt_text: ''
      };
    }

    if (isHauptbild === 'true') {
      // Hauptbild als Base64 speichern
      product.bilder.hauptbild = `data:${contentType};base64,${base64Image}`;
      product.bilder.hauptbildData = {
        data: base64Image,
        contentType: contentType
      };
      product.bilder.alt_text = alt_text || '';
    } else {
      // Zur Galerie hinzufügen
      product.bilder.galerie.push({
        url: `data:${contentType};base64,${base64Image}`,
        data: base64Image,
        contentType: contentType,
        alt_text: alt_text || ''
      });
    }

    await product.save();

    res.json({
      success: true,
      message: 'Bild erfolgreich hochgeladen',
      data: {
        imageUrl: isHauptbild === 'true' ? product.bilder.hauptbild : product.bilder.galerie[product.bilder.galerie.length - 1].url,
        isHauptbild: isHauptbild === 'true'
      }
    });

  } catch (error) {
    console.error('Fehler beim Hochladen:', error);
    // Datei löschen bei Fehler
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    res.status(500).json({
      success: false,
      message: 'Fehler beim Hochladen des Bildes'
    });
  }
});

// @route   GET /api/portfolio/:id/image/main
// @desc    Hauptbild für Portfolio-Produkt servieren (optimiert)
// @access  Public
router.get('/:id/image/main', async (req, res) => {
  try {
    const product = await Portfolio.findById(req.params.id).select('bilder').lean();
    
    if (!product || !product.bilder?.hauptbild) {
      return res.status(404).json({ success: false, message: 'Bild nicht gefunden' });
    }

    const base64Data = product.bilder.hauptbild;
    
    // Extrahiere MIME-Type und Base64-Daten
    const matches = base64Data.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
    if (!matches || matches.length !== 3) {
      return res.status(400).json({ success: false, message: 'Ungültiges Bildformat' });
    }

    const mimeType = matches[1];
    const imageBuffer = Buffer.from(matches[2], 'base64');

    // Cache-Header für Browser-Caching (1 Stunde - kürzere Zeit wegen Updates)
    res.set({
      'Content-Type': mimeType,
      'Cache-Control': 'public, max-age=3600',
      'Content-Length': imageBuffer.length
    });

    res.send(imageBuffer);
  } catch (error) {
    console.error('Fehler beim Laden des Hauptbildes:', error);
    res.status(500).json({ success: false, message: 'Fehler beim Laden des Bildes' });
  }
});

// @route   GET /api/portfolio/:id/image/gallery/:index
// @desc    Galeriebild für Portfolio-Produkt servieren (optimiert)
// @access  Public
router.get('/:id/image/gallery/:index', async (req, res) => {
  try {
    const product = await Portfolio.findById(req.params.id).select('bilder').lean();
    const index = parseInt(req.params.index);
    
    if (!product || !product.bilder?.galerie || !product.bilder.galerie[index]) {
      return res.status(404).json({ success: false, message: 'Bild nicht gefunden' });
    }

    const imageObj = product.bilder.galerie[index];
    const base64Data = typeof imageObj === 'string' ? imageObj : imageObj.url;
    
    // Extrahiere MIME-Type und Base64-Daten
    const matches = base64Data.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
    if (!matches || matches.length !== 3) {
      return res.status(400).json({ success: false, message: 'Ungültiges Bildformat' });
    }

    const mimeType = matches[1];
    const imageBuffer = Buffer.from(matches[2], 'base64');

    // Cache-Header für Browser-Caching (1 Stunde - kürzere Zeit wegen Updates)
    res.set({
      'Content-Type': mimeType,
      'Cache-Control': 'public, max-age=3600',
      'Content-Length': imageBuffer.length
    });

    res.send(imageBuffer);
  } catch (error) {
    console.error('Fehler beim Laden des Galeriebildes:', error);
    res.status(500).json({ success: false, message: 'Fehler beim Laden des Bildes' });
  }
});

// @route   GET /api/portfolio/image/:filename
// @desc    Produktbild servieren (wird nicht mehr benötigt, da Base64 verwendet wird)
// @access  Public
router.get('/image/:filename', (req, res) => {
  try {
    const filename = req.params.filename;
    const imagePath = path.join(__dirname, '../../uploads/products', filename);
    
    // Legacy support: Falls noch alte Dateien existieren
    if (!fs.existsSync(imagePath)) {
      return res.status(404).json({
        success: false,
        message: 'Bild nicht gefunden. Bilder werden jetzt direkt in der Datenbank gespeichert.'
      });
    }

    // MIME-Type basierend auf Dateiendung setzen
    const ext = path.extname(filename).toLowerCase();
    let contentType = 'image/jpeg';
    
    switch (ext) {
      case '.png':
        contentType = 'image/png';
        break;
      case '.webp':
        contentType = 'image/webp';
        break;
      case '.svg':
        contentType = 'image/svg+xml';
        break;
      case '.gif':
        contentType = 'image/gif';
        break;
      case '.jpg':
      case '.jpeg':
        contentType = 'image/jpeg';
        break;
    }

    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'public, max-age=3600'); // 1 Stunde Cache
    
    const stream = fs.createReadStream(imagePath);
    stream.pipe(res);

  } catch (error) {
    console.error('Fehler beim Servieren des Bildes:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Laden des Bildes'
    });
  }
});

// @route   DELETE /api/portfolio/:id/image/:imageType/:imageIndex?
// @desc    Produktbild löschen
// @access  Private
router.delete('/:id/image/:imageType/:imageIndex?', auth, async (req, res) => {
  try {
    const { id, imageType, imageIndex } = req.params;

    const product = await Portfolio.findById(id);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Produkt nicht gefunden'
      });
    }

    if (!product.bilder) {
      return res.status(404).json({
        success: false,
        message: 'Keine Bilder vorhanden'
      });
    }

    let deletedImagePath = null;

    if (imageType === 'hauptbild') {
      if (product.bilder.hauptbild) {
        deletedImagePath = path.join(__dirname, '../../uploads/products', 
          path.basename(product.bilder.hauptbild));
        product.bilder.hauptbild = null;
        product.bilder.alt_text = '';
      }
    } else if (imageType === 'galerie' && imageIndex !== undefined) {
      const index = parseInt(imageIndex);
      if (index >= 0 && index < product.bilder.galerie.length) {
        const galerieImage = product.bilder.galerie[index];
        deletedImagePath = path.join(__dirname, '../../uploads/products', 
          path.basename(galerieImage.url));
        product.bilder.galerie.splice(index, 1);
      } else {
        return res.status(400).json({
          success: false,
          message: 'Ungültiger Galerie-Index'
        });
      }
    } else {
      return res.status(400).json({
        success: false,
        message: 'Ungültiger Bildtyp oder fehlender Index'
      });
    }

    // Datei von Festplatte löschen
    if (deletedImagePath && fs.existsSync(deletedImagePath)) {
      fs.unlinkSync(deletedImagePath);
    }

    await product.save();

    res.json({
      success: true,
      message: 'Bild erfolgreich gelöscht'
    });

  } catch (error) {
    console.error('Fehler beim Löschen des Bildes:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Löschen des Bildes'
    });
  }
});

// @route   GET /api/portfolio/:id/images
// @desc    Alle Bilder eines Produkts abrufen
// @access  Public
router.get('/:id/images', async (req, res) => {
  try {
    const { id } = req.params;

    const product = await Portfolio.findById(id);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Produkt nicht gefunden'
      });
    }

    const bilder = product.bilder || {
      hauptbild: null,
      galerie: [],
      alt_text: ''
    };

    res.json({
      success: true,
      data: bilder
    });

  } catch (error) {
    console.error('Fehler beim Abrufen der Bilder:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Abrufen der Bilder'
    });
  }
});

module.exports = router;