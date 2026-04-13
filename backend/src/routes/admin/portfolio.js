const express = require('express');
const Portfolio = require('../../models/Portfolio');
const { optimizeMainImage } = require('../../middleware/imageOptimization');
const { authenticateToken } = require('../../middleware/auth');
const ZusatzinhaltsstoffeService = require('../../services/zusatzinhaltsstoffeService');
const { generateArticleNumber } = require('../../services/articleNumberService');
const { cacheManager } = require('../../utils/cacheManager');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const router = express.Router();

// Public-Portfolio-Cache invalidieren, damit /api/portfolio/with-prices sofort neue Daten liefert
function invalidatePublicPortfolioCache(reason = 'admin update') {
  const existing = global.portfolioCache || {};
  global.portfolioCache = {
    ...existing,
    data: null,
    timestamp: 0,
    version: Date.now()
  };
  cacheManager.invalidateProductCache();
  console.log(`🗑️ Public portfolio cache invalidated (${reason})`);
}

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
    const startTime = Date.now();
    console.log('📋 Admin Portfolio: Lade Produkte...');
    
    // 🚀 KRITISCHE OPTIMIERUNG: Aggregation um Bilder-Metadaten ohne Base64 zu laden
    const products = await Portfolio.aggregate([
      // Alle Produkte auswählen
      { $match: {} },
      
      // Felder projizieren - bilder.galerie nur mit Metadaten, ohne data-Feld
      { $project: {
        name: 1,
        article_number: 1,
        seife: 1,
        gramm: 1,
        aroma: 1,
        seifenform: 1,
        zusatz: 1,
        optional: 1,
        verpackung: 1,
        preis: 1,
        sale: 1,
        beschreibung: 1,
        weblink: 1,
        aktiv: 1,
        reihenfolge: 1,
        rohseifenKonfiguration: 1,
        zusatzinhaltsstoffe: 1,
        abmessungen: 1,
        giesswerkstoffKonfiguration: 1,
        giesszusatzstoffe: 1,
        schmuckDetails: 1,
        gpsr: 1,
        kategorie: 1,
        giessform: 1,
        giesswerkstoff: 1,
        createdAt: 1,
        updatedAt: 1,
        // Bilder-Struktur OHNE Base64-Daten
        'bilder.galerie': {
          $map: {
            input: { $ifNull: ['$bilder.galerie', []] },
            as: 'img',
            in: {
              contentType: '$$img.contentType',
              alt_text: '$$img.alt_text'
            }
          }
        }
      }},
      
      // Sortierung
      { $sort: { reihenfolge: 1, createdAt: -1 } }
    ]);
    
    // Populate nach Aggregation manuell
    await Portfolio.populate(products, [
      { path: 'giessform', select: 'inventarnummer name form material verfuegbar laengeMm breiteMm tiefeMm' },
      { path: 'giesswerkstoff', select: 'bezeichnung typ konsistenz verfuegbar' }
    ]);
    
    const dbDuration = Date.now() - startTime;
    console.log(`⚡ DB Query abgeschlossen: ${dbDuration}ms - ${products.length} Produkte (OHNE Bilder!)`);
    
    // 🚀 Bild-URLs generieren (ohne die echten Bilddaten zu haben)
    const optimizedProducts = products.map(product => {
      // Da wir .lean() verwenden, ist product bereits ein Plain Object
      
      if (!product.bilder) {
        product.bilder = {};
      }
      
      // Hauptbild-URL setzen mit Cache-Busting-Timestamp
      const timestamp = product.updatedAt ? new Date(product.updatedAt).getTime() : Date.now();
      product.bilder.hauptbild = {
        url: `/api/portfolio/${product._id}/image/main?t=${timestamp}`,
        type: 'image/jpeg'
      };
      
      // Galerie-URLs generieren (wenn galerie existiert)
      // Hinweis: galerie ist ein Array, aber ohne data-Felder wegen .select()
      if (product.bilder.galerie && Array.isArray(product.bilder.galerie)) {
        product.bilder.galerie = product.bilder.galerie.map((img, index) => ({
          url: `/api/portfolio/${product._id}/image/gallery/${index}?t=${timestamp}`,
          type: img.contentType || 'image/jpeg',
          alt_text: img.alt_text || ''
        }));
      } else {
        product.bilder.galerie = [];
      }
      
      return product;
    });
    
    const totalDuration = Date.now() - startTime;
    console.log(`✅ Admin Portfolio: Komplett in ${totalDuration}ms (DB: ${dbDuration}ms, Transform: ${totalDuration - dbDuration}ms)`);
    
    res.json({
      success: true,
      count: optimizedProducts.length,
      data: optimizedProducts
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
      sale,
      beschreibung,
      zusatzinhaltsstoffe,
      rohseifenKonfiguration,
      abmessungen,
      schmuckDetails,
      gpsr
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

    const resolvedCategory = kategorie || 'seife';
    const articleNumber = await generateArticleNumber({ category: resolvedCategory });

    // Neues Produkt erstellen
    const newProduct = new Portfolio({
      kategorie: resolvedCategory,
      article_number: articleNumber,
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
      sale: {
        isOnSale: !!sale?.isOnSale,
        discountPercent: Math.max(0, Math.min(100, Number(sale?.discountPercent) || 0)),
        startsAt: sale?.startsAt ? new Date(sale.startsAt) : null,
        endsAt: sale?.endsAt ? new Date(sale.endsAt) : null
      },
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
      schmuckDetails: schmuckDetails || {
        schmuckTyp: '',
        material: '',
        oberflaeche: '',
        ringgroesse: '',
        kettenlaenge: 0,
        nickelhaltig: false,
        steinbesatz: ''
      },
      gpsr: gpsr || {
        verwendungszweck: '',
        warnhinweise: '',
        zielgruppe: '',
        herstellerAbweichend: false,
        herstellerName: '',
        herstellerAnschrift: '',
        herstellerEmail: ''
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

    invalidatePublicPortfolioCache('admin create');

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

    if (updateData.sale !== undefined) {
      product.sale = {
        isOnSale: !!updateData.sale?.isOnSale,
        discountPercent: Math.max(0, Math.min(100, Number(updateData.sale?.discountPercent) || 0)),
        startsAt: updateData.sale?.startsAt ? new Date(updateData.sale.startsAt) : null,
        endsAt: updateData.sale?.endsAt ? new Date(updateData.sale.endsAt) : null
      };
    }

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

    // Schmuck-Details separat handhaben
    if (updateData.schmuckDetails) {
      product.schmuckDetails = {
        schmuckTyp: updateData.schmuckDetails.schmuckTyp || '',
        material: updateData.schmuckDetails.material || '',
        oberflaeche: updateData.schmuckDetails.oberflaeche || '',
        ringgroesse: updateData.schmuckDetails.ringgroesse || '',
        kettenlaenge: parseFloat(updateData.schmuckDetails.kettenlaenge) || 0,
        nickelhaltig: !!updateData.schmuckDetails.nickelhaltig,
        steinbesatz: updateData.schmuckDetails.steinbesatz || ''
      };
    }

    // GPSR-Felder separat handhaben
    if (updateData.gpsr) {
      product.gpsr = {
        verwendungszweck: updateData.gpsr.verwendungszweck || '',
        warnhinweise: updateData.gpsr.warnhinweise || '',
        zielgruppe: updateData.gpsr.zielgruppe || '',
        herstellerAbweichend: !!updateData.gpsr.herstellerAbweichend,
        herstellerName: updateData.gpsr.herstellerName || '',
        herstellerAnschrift: updateData.gpsr.herstellerAnschrift || '',
        herstellerEmail: updateData.gpsr.herstellerEmail || ''
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

    if (!product.article_number) {
      product.article_number = await generateArticleNumber({ category: product.kategorie || 'seife' });
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

    invalidatePublicPortfolioCache('admin update');

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

    invalidatePublicPortfolioCache('admin delete');

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
    } else if ((imageType === 'galerie' || imageType === 'gallery') && imageIndex !== undefined) {
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

// @route   GET /api/admin/portfolio/export/sumup-csv
// @desc    Alle Portfolio-Produkte als SumUp-Import-CSV exportieren
// @access  Private (Admin only)
router.get('/export/sumup-csv', authenticateToken, async (req, res) => {
  try {
    const includeInactive = req.query.all === '1';
    const includeImages = req.query.images === '1';
    const query = includeInactive ? {} : { aktiv: true };

    const products = await Portfolio.find(query)
      .select('name preis kategorie article_number beschreibung gramm seife aroma aktiv bilder.hauptbildData.contentType bilder.galerie.contentType')
      .sort({ kategorie: 1, name: 1 })
      .lean();

    const imageBaseUrl = `${req.protocol}://${req.get('host')}`;

    const sanitize = (v) => {
      if (v === null || v === undefined) return '';
      return String(v).replace(/\r?\n|\r/g, ' ').trim();
    };

    const csvEscape = (v) => `"${sanitize(v).replace(/"/g, '""')}"`;

    const formatPrice = (v) => {
      const n = Number(v || 0);
      return Number.isFinite(n) && n >= 0 ? n.toFixed(2) : '0.00';
    };

    const categoryLabel = (cat) => {
      const map = { seife: 'Seife', werkstuck: 'Werkstueck', schmuck: 'Schmuck' };
      return map[cat] || 'Allgemein';
    };

    const buildDescription = (p) => {
      const short = sanitize(p.beschreibung?.kurz);
      const details = [];
      if (p.gramm) details.push(`${p.gramm}g`);
      if (p.seife) details.push(p.seife);
      if (p.aroma) details.push(p.aroma);
      const base = short || sanitize(p.beschreibung?.lang);
      if (!base && details.length === 0) return '';
      if (!base) return details.join(' | ');
      if (details.length === 0) return base;
      return `${base} | ${details.join(' | ')}`;
    };

    const headers = includeImages
      ? ['Name', 'Price', 'Tax', 'SKU', 'Barcode', 'Category', 'Description', 'Image']
      : ['Name', 'Price', 'Tax', 'SKU', 'Barcode', 'Category', 'Description'];
    const lines = [headers.map(csvEscape).join(',')];

    for (const p of products) {
      const sku = sanitize(p.article_number) || String(p._id);
      const hasImage = !!p.bilder?.hauptbildData?.contentType;
      const imageUrl = includeImages
        ? (hasImage ? `${imageBaseUrl}/api/portfolio/${p._id}/hauptbild.jpg` : (p.bilder?.galerie?.[0]?.contentType ? `${imageBaseUrl}/api/portfolio/${p._id}/galerie/0.jpg` : ''))
        : '';
      lines.push([
        p.name,
        formatPrice(p.preis),
        '0',
        sku,
        '',
        categoryLabel(p.kategorie),
        buildDescription(p),
        ...(includeImages ? [imageUrl] : [])
      ].map(csvEscape).join(','));
    }

    const csv = lines.join('\r\n') + '\r\n';
    const filename = `sumup_produkte_${new Date().toISOString().slice(0, 10)}.csv`;

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send('\uFEFF' + csv); // BOM für Excel/Kompatibilität
  } catch (error) {
    console.error('SumUp CSV Export Error:', error);
    res.status(500).json({ success: false, message: 'Fehler beim CSV-Export' });
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
    
    // 🚀 OPTIMIERUNG: Konvertiere Base64-Bilder zu URLs
    const productObj = product.toObject();
    const imageData = { hauptbild: null, galerie: [] };
    
    if (productObj.bilder?.hauptbild) {
      if (productObj.bilder.hauptbild.startsWith('data:image/')) {
        const mimeMatch = productObj.bilder.hauptbild.match(/^data:(image\/\w+);base64,/);
        const mimeType = mimeMatch ? mimeMatch[1] : 'image/jpeg';
        imageData.hauptbild = {
          url: `/api/portfolio/${product._id}/image/main`,
          type: mimeType
        };
      } else {
        imageData.hauptbild = productObj.bilder.hauptbild;
      }
    }
    
    if (productObj.bilder?.galerie && productObj.bilder.galerie.length > 0) {
      imageData.galerie = productObj.bilder.galerie.map((img, index) => {
        if (typeof img === 'string' && img.startsWith('data:image/')) {
          const mimeMatch = img.match(/^data:(image\/\w+);base64,/);
          const mimeType = mimeMatch ? mimeMatch[1] : 'image/jpeg';
          return {
            url: `/api/portfolio/${product._id}/image/gallery/${index}`,
            type: mimeType
          };
        }
        return img;
      });
    }
    
    productObj.bilder = imageData;
    
    console.log('✅ Portfolio item loaded:', product.name);
    res.json({
      success: true,
      data: productObj
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