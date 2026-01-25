const express = require('express');
const Portfolio = require('../../models/Portfolio');
const { optimizeMainImage } = require('../../middleware/imageOptimization');
const { authenticateToken } = require('../../middleware/auth');
const ZusatzinhaltsstoffeService = require('../../services/zusatzinhaltsstoffeService');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const router = express.Router();

// Multer-Konfiguration für Portfolio-Uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.join(__dirname, '../../../uploads/products');
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'product-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Nur Bilddateien sind erlaubt!'), false);
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB Limit
  }
});

// @route   GET /api/admin/portfolio
// @desc    Alle Portfolio-Produkte für Admin abrufen
// @access  Private (Admin only)
router.get('/', async (req, res) => {
  try {
    const products = await Portfolio.find({})
      .populate('giessform', 'inventarnummer name form material verfuegbar laengeMm breiteMm tiefeMm')
      .populate('giesswerkstoff', 'bezeichnung typ konsistenz verfuegbar')
      .sort({ reihenfolge: 1, createdAt: -1 });
    
    res.json({
      success: true,
      count: products.length,
      data: products
    });
  } catch (error) {
    console.error('Admin Portfolio Load Error:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Laden der Portfolio-Daten'
    });
  }
});

// @route   POST /api/admin/portfolio
// @desc    Neues Portfolio-Produkt erstellen
// @access  Private (Admin only)
router.post('/', async (req, res) => {
  try {
    const {
      kategorie,
      name,
      seife,
      gramm,
      aroma,
      seifenform,
      zusatz,
      optional,
      verpackung,
      giessform,
      giesswerkstoff,
      aktiv,
      reihenfolge,
      preis,
      beschreibung,
      zusatzinhaltsstoffe,
      rohseifenKonfiguration,
      abmessungen
    } = req.body;

    console.log('🔍 Portfolio Create Request:', { kategorie, name, giessform, giesswerkstoff });

    // Prüfen ob Name bereits existiert
    const existingProduct = await Portfolio.findOne({ name });
    if (existingProduct) {
      return res.status(400).json({
        success: false,
        message: 'Ein Produkt mit diesem Namen existiert bereits'
      });
    }

    // Neues Produkt erstellen
    const newProduct = new Portfolio({
      kategorie: kategorie || 'seife',
      name,
      seife: seife || '',
      gramm: parseInt(gramm),
      aroma: aroma || '',
      seifenform: seifenform || '',
      zusatz: zusatz || '',
      optional: optional || '',
      verpackung: verpackung || '',
      giessform: giessform || null,
      giesswerkstoff: giesswerkstoff || null,
      preis: parseFloat(preis) || 0,
      aktiv: aktiv !== undefined ? aktiv : false,
      reihenfolge: parseInt(reihenfolge) || 0,
      abmessungen: abmessungen || { laenge: 0, breite: 0, hoehe: 0, einheit: 'cm' },
      beschreibung: beschreibung || {
        kurz: '',
        lang: '',
        inhaltsstoffe: '',
        anwendung: '',
        besonderheiten: ''
      },
      zusatzinhaltsstoffe: zusatzinhaltsstoffe || [],
      rohseifenKonfiguration: rohseifenKonfiguration || {
        verwendeZweiRohseifen: false,
        seife2: '',
        gewichtVerteilung: {
          seife1Prozent: 100,
          seife2Prozent: 0
        }
      },
      bilder: {
        hauptbild: '',
        galerie: [],
        alt_text: ''
      }
    });

    const savedProduct = await newProduct.save();
    
    // Warenberechnung mit Zusatzinhaltsstoffen aktualisieren
    if (zusatzinhaltsstoffe && zusatzinhaltsstoffe.length > 0) {
      try {
        await ZusatzinhaltsstoffeService.aktualisiereWarenberechnung(savedProduct._id);
        console.log('✅ Warenberechnung mit Zusatzinhaltsstoffen aktualisiert für:', savedProduct.name);
      } catch (error) {
        console.warn('⚠️ Warenberechnung-Update fehlgeschlagen:', error.message);
      }
    }

    res.status(201).json({
      success: true,
      message: 'Produkt erfolgreich erstellt',
      data: savedProduct
    });

  } catch (error) {
    console.error('Admin Portfolio Create Error:', error);
    
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        message: 'Validierungsfehler',
        errors: errors
      });
    }

    res.status(500).json({
      success: false,
      message: 'Fehler beim Erstellen des Produkts'
    });
  }
});

// @route   PUT /api/admin/portfolio/:id
// @desc    Portfolio-Produkt bearbeiten
// @access  Private (Admin only)
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    console.log('📥 PORTFOLIO UPDATE - Komplette Request Body:', JSON.stringify(updateData, null, 2));
    console.log('📥 PORTFOLIO UPDATE - Preis-Wert:', updateData.preis, 'Type:', typeof updateData.preis);

    const product = await Portfolio.findById(id);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Produkt nicht gefunden'
      });
    }

    // Name-Duplikat prüfen
    if (updateData.name && updateData.name !== product.name) {
      const existingProduct = await Portfolio.findOne({ 
        name: updateData.name,
        _id: { $ne: id }
      });
      if (existingProduct) {
        return res.status(400).json({
          success: false,
          message: 'Ein Produkt mit diesem Namen existiert bereits'
        });
      }
    }

    // Daten aktualisieren
    const allowedFields = [
      'name', 'seife', 'gramm', 'aroma', 'seifenform', 
      'zusatz', 'optional', 'verpackung', 'aktiv', 'reihenfolge', 'preis',
      'giesswerkstoff', 'giessform', 'kategorie'
    ];

    allowedFields.forEach(field => {
      if (updateData[field] !== undefined) {
        if (field === 'gramm' || field === 'reihenfolge') {
          const numValue = parseInt(updateData[field]);
          if (!isNaN(numValue)) {
            product[field] = numValue;
          }
        } else if (field === 'preis') {
          const preisValue = parseFloat(updateData[field]);
          if (!isNaN(preisValue)) {
            product[field] = preisValue;
          }
          // Wenn NaN, behalte den alten Wert - setze nichts
        } else if (field === 'giesswerkstoff' || field === 'giessform') {
          // Für Werkstück-Felder: null/undefined-Werte explizit setzen
          product[field] = updateData[field] || undefined;
        } else {
          product[field] = updateData[field];
        }
      }
    });

    // Abmessungen separat handhaben
    if (updateData.abmessungen) {
      product.abmessungen = {
        laenge: parseFloat(updateData.abmessungen.laenge) || 0,
        breite: parseFloat(updateData.abmessungen.breite) || 0,
        hoehe: parseFloat(updateData.abmessungen.hoehe) || 0,
        durchmesser: parseFloat(updateData.abmessungen.durchmesser) || 0,
        einheit: updateData.abmessungen.einheit || 'cm'
      };
    }

    // Beschreibungsfelder separat handhaben
    if (updateData.beschreibung) {
      product.beschreibung = {
        kurz: updateData.beschreibung.kurz || '',
        lang: updateData.beschreibung.lang || '',
        inhaltsstoffe: updateData.beschreibung.inhaltsstoffe || '',
        anwendung: updateData.beschreibung.anwendung || '',
        besonderheiten: updateData.beschreibung.besonderheiten || ''
      };
    }

    // Rohseifen-Konfiguration separat handhaben
    if (updateData.rohseifenKonfiguration) {
      console.log('🔧 PORTFOLIO UPDATE - Erhalte Rohseifen-Konfiguration:', updateData.rohseifenKonfiguration);
      product.rohseifenKonfiguration = {
        verwendeZweiRohseifen: updateData.rohseifenKonfiguration.verwendeZweiRohseifen || false,
        seife2: updateData.rohseifenKonfiguration.seife2 || '',
        gewichtVerteilung: {
          seife1Prozent: updateData.rohseifenKonfiguration.gewichtVerteilung?.seife1Prozent || 100,
          seife2Prozent: updateData.rohseifenKonfiguration.gewichtVerteilung?.seife2Prozent || 0
        }
      };
      console.log('🔧 PORTFOLIO UPDATE - Setze Rohseifen-Konfiguration:', product.rohseifenKonfiguration);
    }

    // Zusatzinhaltsstoffe separat handhaben
    if (updateData.zusatzinhaltsstoffe) {
      console.log('🗺 PORTFOLIO UPDATE - Erhalte Zusatzinhaltsstoffe:', updateData.zusatzinhaltsstoffe);
      product.zusatzinhaltsstoffe = updateData.zusatzinhaltsstoffe;
      console.log('🗺 PORTFOLIO UPDATE - Setze Zusatzinhaltsstoffe:', product.zusatzinhaltsstoffe);
    }

    // Gießwerkstoff-Konfiguration separat handhaben
    if (updateData.giesswerkstoffKonfiguration) {
      console.log('🏺 PORTFOLIO UPDATE - Erhalte Gießwerkstoff-Konfiguration:', updateData.giesswerkstoffKonfiguration);
      product.giesswerkstoffKonfiguration = {
        berechnungsFaktor: updateData.giesswerkstoffKonfiguration.berechnungsFaktor || 1.5,
        schwundProzent: updateData.giesswerkstoffKonfiguration.schwundProzent || 5
      };
      console.log('🏺 PORTFOLIO UPDATE - Setze Gießwerkstoff-Konfiguration:', product.giesswerkstoffKonfiguration);
    }

    const updatedProduct = await product.save();

    // Warenberechnung mit Zusatzinhaltsstoffen aktualisieren
    if (updateData.zusatzinhaltsstoffe !== undefined) {
      try {
        await ZusatzinhaltsstoffeService.aktualisiereWarenberechnung(updatedProduct._id);
        console.log('✅ Warenberechnung mit Zusatzinhaltsstoffen aktualisiert für:', updatedProduct.name);
      } catch (error) {
        console.warn('⚠️ Warenberechnung-Update fehlgeschlagen:', error.message);
      }
    }

    res.json({
      success: true,
      message: 'Produkt erfolgreich aktualisiert',
      data: updatedProduct
    });

  } catch (error) {
    console.error('Admin Portfolio Update Error:', error);
    
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        message: 'Validierungsfehler',
        errors: errors
      });
    }

    res.status(500).json({
      success: false,
      message: 'Fehler beim Aktualisieren des Produkts'
    });
  }
});

// @route   DELETE /api/admin/portfolio/:id
// @desc    Portfolio-Produkt löschen
// @access  Private (Admin only)
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const product = await Portfolio.findById(id);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Produkt nicht gefunden'
      });
    }

    // Bilder löschen
    if (product.bilder) {
      if (product.bilder.hauptbild) {
        const hauptbildPath = path.join(__dirname, '../../../uploads/products', 
          path.basename(product.bilder.hauptbild));
        if (fs.existsSync(hauptbildPath)) {
          fs.unlinkSync(hauptbildPath);
        }
      }

      if (product.bilder.galerie && product.bilder.galerie.length > 0) {
        product.bilder.galerie.forEach(img => {
          const imagePath = path.join(__dirname, '../../../uploads/products', 
            path.basename(img.url));
          if (fs.existsSync(imagePath)) {
            fs.unlinkSync(imagePath);
          }
        });
      }
    }

    await Portfolio.findByIdAndDelete(id);

    res.json({
      success: true,
      message: 'Produkt erfolgreich gelöscht'
    });

  } catch (error) {
    console.error('Admin Portfolio Delete Error:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Löschen des Produkts'
    });
  }
});

// @route   POST /api/admin/portfolio/:id/upload-image
// @desc    Bild für Portfolio-Produkt hochladen
// @access  Private (Admin only)
router.post('/:id/upload-image', upload.single('image'), optimizeMainImage, async (req, res) => {
  console.log('🔄 Admin Image Upload started for product:', req.params.id);
  
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

    // Temporäre Datei löschen
    try {
      await new Promise(resolve => setTimeout(resolve, 100));
      if (fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
    } catch (unlinkError) {
      console.warn('⚠️ Could not delete temporary file:', unlinkError.message);
    }

    // Bilder-Objekt initialisieren
    if (!product.bilder) {
      product.bilder = {
        hauptbild: '',
        hauptbildData: { data: '', contentType: '' },
        galerie: [],
        alt_text: ''
      };
    }

    if (isHauptbild === 'true') {
      product.bilder.hauptbild = `data:${contentType};base64,${base64Image}`;
      product.bilder.hauptbildData = {
        data: base64Image,
        contentType: contentType
      };
      product.bilder.alt_text = alt_text || '';
    } else {
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
        isHauptbild: isHauptbild === 'true',
        product: product
      }
    });

  } catch (error) {
    console.error('❌ Admin Image Upload Error:', error);
    
    if (req.file && req.file.path) {
      try {
        await new Promise(resolve => setTimeout(resolve, 100));
        if (fs.existsSync(req.file.path)) {
          fs.unlinkSync(req.file.path);
        }
      } catch (cleanupError) {
        console.warn('⚠️ Could not clean up temporary file:', cleanupError.message);
      }
    }
    
    res.status(500).json({
      success: false,
      message: 'Fehler beim Hochladen des Bildes',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// @route   DELETE /api/admin/portfolio/:id/image/:imageType/:imageIndex?
// @desc    Bild von Portfolio-Produkt löschen
// @access  Private (Admin only)
router.delete('/:id/image/:imageType/:imageIndex?', async (req, res) => {
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
        deletedImagePath = path.join(__dirname, '../../../uploads/products', 
          path.basename(product.bilder.hauptbild));
        product.bilder.hauptbild = '';
        product.bilder.alt_text = '';
      }
    } else if (imageType === 'galerie' && imageIndex !== undefined) {
      const index = parseInt(imageIndex);
      if (index >= 0 && index < product.bilder.galerie.length) {
        const galerieImage = product.bilder.galerie[index];
        deletedImagePath = path.join(__dirname, '../../../uploads/products', 
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

    if (deletedImagePath && fs.existsSync(deletedImagePath)) {
      fs.unlinkSync(deletedImagePath);
    }

    await product.save();

    res.json({
      success: true,
      message: 'Bild erfolgreich gelöscht',
      data: product
    });

  } catch (error) {
    console.error('Admin Image Delete Error:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Löschen des Bildes'
    });
  }
});

// @route   GET /api/admin/portfolio/stats  
// @desc    Portfolio-Statistiken abrufen (optimiert)
// @access  Private (Admin only)
router.get('/stats', async (req, res) => {
  try {
    console.log('📊 Loading portfolio stats...');
    const startTime = Date.now();
    
    // 🚀 PERFORMANCE: Alle Stats in einer einzigen Aggregation
    const stats = await Portfolio.aggregate([
      {
        $facet: {
          // Grundzählungen
          counts: [
            {
              $group: {
                _id: null,
                total: { $sum: 1 },
                active: { $sum: { $cond: [{ $eq: ['$aktiv', true] }, 1, 0] } },
                inactive: { $sum: { $cond: [{ $eq: ['$aktiv', false] }, 1, 0] } },
                withImages: {
                  $sum: {
                    $cond: [
                      {
                        $or: [
                          { $and: [{ $ne: ['$bilder.hauptbild', null] }, { $ne: ['$bilder.hauptbild', ''] }] },
                          { $gt: [{ $size: { $ifNull: ['$bilder.galerie', []] } }, 0] }
                        ]
                      },
                      1, 0
                    ]
                  }
                }
              }
            }
          ],
          // Seifentypen
          seifenTypes: [
            { $group: { _id: '$seife', count: { $sum: 1 } } },
            { $sort: { count: -1 } }
          ],
          // Aromatypen
          aromaTypes: [
            { $group: { _id: '$aroma', count: { $sum: 1 } } },
            { $sort: { count: -1 } }
          ]
        }
      }
    ]);
    
    const result = stats[0];
    const counts = result.counts[0] || { total: 0, active: 0, inactive: 0, withImages: 0 };
    
    const duration = Date.now() - startTime;
    console.log(`📊 Portfolio stats loaded in ${duration}ms`);

    res.json({
      success: true,
      data: {
        totalProducts: counts.total,
        activeProducts: counts.active,  
        inactiveProducts: counts.inactive,
        productsWithImages: counts.withImages,
        productsWithoutImages: counts.total - counts.withImages,
        seifenTypes: result.seifenTypes,
        aromaTypes: result.aromaTypes
      }
    });
  } catch (error) {
    console.error('Admin Portfolio Stats Error:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Abrufen der Portfolio-Statistiken'
    });
  }
});

// @route   GET /api/admin/portfolio/options
// @desc    Alle Optionen für Portfolio-Verwaltung (Rohseifen, Verpackungen, Duftoele)
// @access  Private (Admin only)  
router.get('/options', async (req, res) => {
  try {
    console.log('📋 Loading portfolio options...');
    const startTime = Date.now();
    
    // Alle Optionen parallel laden
    const [rohseifeData, verpackungData, duftoelData] = await Promise.all([
      require('../../models/Rohseife').find({}),
      require('../../models/Verpackung').find({}),
      require('../../models/Duftoil').find({})
    ]);
    
    const duration = Date.now() - startTime;
    console.log(`📋 Portfolio options loaded in ${duration}ms`);
    
    res.json({
      success: true,
      data: {
        rohseifen: rohseifeData,
        verpackungen: verpackungData,
        duftoele: duftoelData
      }
    });
  } catch (error) {
    console.error('Admin Portfolio Options Error:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Laden der Portfolio-Optionen'
    });
  }
});

// @route   GET /api/admin/portfolio/:id
// @desc    Einzelnes Portfolio-Produkt abrufen
// @access  Private (Admin only)
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    console.log('🔍 Loading single portfolio item:', id);
    
    const product = await Portfolio.findById(id);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Produkt nicht gefunden'
      });
    }
    
    console.log('✅ Portfolio item loaded:', product.name);
    res.json({
      success: true,
      data: product
    });
  } catch (error) {
    console.error('Admin Portfolio Item Load Error:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Laden des Portfolio-Produkts'
    });
  }
});

module.exports = router;