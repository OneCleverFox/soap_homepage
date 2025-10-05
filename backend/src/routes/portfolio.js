const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const Portfolio = require('../models/Portfolio');
const Rohseife = require('../models/Rohseife');
const Verpackung = require('../models/Verpackung');
const Duftoil = require('../models/Duftoil');
const { auth } = require('../middleware/auth');

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
  const allowedMimes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Nur JPEG, PNG und WebP Bilder sind erlaubt'), false);
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB
});

const router = express.Router();

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
      details.rohseife = rohseife.preisProGramm * portfolioItem.gramm;
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
        details.duftoele = benoetigteTropfen * duftoil.preisProTropfen;
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
// @access  Public
router.get('/', async (req, res) => {
  try {
    const portfolioItems = await Portfolio.find({ aktiv: true })
      .sort({ reihenfolge: 1, name: 1 });

    res.status(200).json({
      success: true,
      count: portfolioItems.length,
      data: portfolioItems
    });
  } catch (error) {
    console.error('Portfolio Fetch Error:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Abrufen der Portfolio-Daten'
    });
  }
});

// @route   GET /api/portfolio/with-prices
// @desc    Alle Portfolio-Einträge mit berechneten Preisen abrufen
// @access  Public
router.get('/with-prices', async (req, res) => {
  try {
    const portfolioItems = await Portfolio.find({ aktiv: true })
      .sort({ reihenfolge: 1, name: 1 });

    // Preise für jedes Portfolio-Element berechnen
    const portfolioWithPrices = await Promise.all(
      portfolioItems.map(async (item) => {
        try {
          const priceData = await calculatePortfolioPrice(item);
          
          // Bilder-URLs hinzufügen
          const imageData = {
            hauptbild: null,
            galerie: []
          };
          
          if (item.bilder?.hauptbild) {
            imageData.hauptbild = item.bilder.hauptbild; // URL bereits komplett
          }
          
          if (item.bilder?.galerie && item.bilder.galerie.length > 0) {
            imageData.galerie = item.bilder.galerie.map(imageObj => 
              typeof imageObj === 'string' ? imageObj : imageObj.url
            );
          }
          
          return {
            ...item.toObject(),
            berechneterPreis: priceData.gesamtpreis,
            preisDetails: priceData.details,
            verkaufspreis: Math.ceil(priceData.gesamtpreis * 1.5), // 50% Marge
            bilder: {
              ...item.bilder?.toObject(),
              ...imageData
            }
          };
        } catch (priceError) {
          console.warn(`Preisberechnung für ${item.name} fehlgeschlagen:`, priceError.message);
          
          // Bilder auch bei Preisfehler hinzufügen
          const imageData = {
            hauptbild: null,
            galerie: []
          };
          
          if (item.bilder?.hauptbild) {
            imageData.hauptbild = item.bilder.hauptbild; // URL bereits komplett
          }
          
          if (item.bilder?.galerie && item.bilder.galerie.length > 0) {
            imageData.galerie = item.bilder.galerie.map(imageObj => 
              typeof imageObj === 'string' ? imageObj : imageObj.url
            );
          }
          
          return {
            ...item.toObject(),
            berechneterPreis: 0,
            preisDetails: { error: 'Preisberechnung nicht möglich' },
            verkaufspreis: 0,
            bilder: {
              ...item.bilder?.toObject(),
              ...imageData
            }
          };
        }
      })
    );

    res.status(200).json({
      success: true,
      count: portfolioWithPrices.length,
      data: portfolioWithPrices
    });
  } catch (error) {
    console.error('Portfolio with Prices Fetch Error:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Abrufen der Portfolio-Daten mit Preisen'
    });
  }
});

// @route   GET /api/portfolio/:id
// @desc    Einzelnen Portfolio-Eintrag abrufen
// @access  Public
router.get('/:id', async (req, res) => {
  try {
    const portfolioItem = await Portfolio.findById(req.params.id);

    if (!portfolioItem) {
      return res.status(404).json({
        success: false,
        message: 'Portfolio-Eintrag nicht gefunden'
      });
    }

    res.status(200).json({
      success: true,
      data: portfolioItem
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
// @desc    Bild für ein Portfolio-Produkt hochladen (Base64)
// @access  Private
router.post('/:id/upload-image', auth, upload.single('image'), async (req, res) => {
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
    res.setHeader('Cache-Control', 'public, max-age=31536000'); // 1 Jahr Cache
    
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