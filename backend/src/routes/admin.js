const express = require('express');
const Portfolio = require('../models/Portfolio');
const {
  getAllData,
  createProduct,
  updateProduct,
  deleteProduct,
  updateOrderStatus
} = require('../controllers/adminController');
const { auth, requireAdmin } = require('../middleware/auth');
const { optimizeMainImage } = require('../middleware/imageOptimization');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const router = express.Router();

// Multer-Konfiguration für Bild-Uploads
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
    fileSize: 10 * 1024 * 1024 // 10MB Limit (wird durch Optimierung auf ~200KB reduziert)
  }
});

// Alle Routen erfordern Admin-Authentifizierung
router.use(auth);
router.use(requireAdmin);

// @route   GET /api/admin/data
// @desc    Alle Daten abrufen (Dashboard)
// @access  Private (Admin)
router.get('/data', getAllData);

// Produkt-Management
// @route   POST /api/admin/products
// @desc    Neues Produkt erstellen
// @access  Private (Admin)
router.post('/products', createProduct);

// @route   PUT /api/admin/products/:id
// @desc    Produkt aktualisieren
// @access  Private (Admin)
router.put('/products/:id', updateProduct);

// @route   DELETE /api/admin/products/:id
// @desc    Produkt löschen
// @access  Private (Admin)
router.delete('/products/:id', deleteProduct);

// Bestellungs-Management
// @route   PUT /api/admin/orders/:id
// @desc    Bestellstatus aktualisieren
// @access  Private (Admin)
router.put('/orders/:id', updateOrderStatus);

// ===== Portfolio-Management =====

// @route   GET /api/admin/portfolio
// @desc    Alle Portfolio-Produkte für Admin abrufen
// @access  Private (Admin only)
router.get('/portfolio', async (req, res) => {
  try {
    const products = await Portfolio.find({}).sort({ reihenfolge: 1, createdAt: -1 });
    
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
router.post('/portfolio', async (req, res) => {
  try {
    const {
      name,
      seife,
      gramm,
      aroma,
      seifenform,
      zusatz,
      optional,
      verpackung,
      aktiv,
      reihenfolge
    } = req.body;

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
      name,
      seife,
      gramm: parseInt(gramm),
      aroma,
      seifenform,
      zusatz: zusatz || '',
      optional: optional || '',
      verpackung,
      aktiv: aktiv !== undefined ? aktiv : false, // ✅ Neue Produkte standardmäßig inaktiv
      reihenfolge: parseInt(reihenfolge) || 0,
      bilder: {
        hauptbild: '',
        galerie: [],
        alt_text: ''
      }
    });

    const savedProduct = await newProduct.save();

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
router.put('/portfolio/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    // Produkt finden
    const product = await Portfolio.findById(id);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Produkt nicht gefunden'
      });
    }

    // Name-Duplikat prüfen (außer bei gleichem Produkt)
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

    // Daten aktualisieren (ohne bilder zu überschreiben)
    const allowedFields = [
      'name', 'seife', 'gramm', 'aroma', 'seifenform', 
      'zusatz', 'optional', 'verpackung', 'aktiv', 'reihenfolge', 'preis'
    ];

    allowedFields.forEach(field => {
      if (updateData[field] !== undefined) {
        if (field === 'gramm' || field === 'reihenfolge') {
          product[field] = parseInt(updateData[field]);
        } else if (field === 'preis') {
          product[field] = parseFloat(updateData[field]);
        } else {
          product[field] = updateData[field];
        }
      }
    });

    const updatedProduct = await product.save();

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
router.delete('/portfolio/:id', async (req, res) => {
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
      // Hauptbild löschen
      if (product.bilder.hauptbild) {
        const hauptbildPath = path.join(__dirname, '../../uploads/products', 
          path.basename(product.bilder.hauptbild));
        if (fs.existsSync(hauptbildPath)) {
          fs.unlinkSync(hauptbildPath);
        }
      }

      // Galerie-Bilder löschen
      if (product.bilder.galerie && product.bilder.galerie.length > 0) {
        product.bilder.galerie.forEach(img => {
          const imagePath = path.join(__dirname, '../../uploads/products', 
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
// @desc    Bild für Portfolio-Produkt hochladen (Base64) mit automatischer Optimierung
// @access  Private (Admin only)
router.post('/portfolio/:id/upload-image', upload.single('image'), optimizeMainImage, async (req, res) => {
  console.log('🔄 Admin Image Upload started for product:', req.params.id);
  console.log('📄 Request body keys:', Object.keys(req.body));
  console.log('📁 File present:', !!req.file);
  console.log('👤 User from auth middleware:', req.user ? 'Present' : 'Missing');
  
  try {
    const { id } = req.params;
    const { alt_text, isHauptbild } = req.body;

    if (!req.file) {
      console.log('❌ No file uploaded');
      return res.status(400).json({
        success: false,
        message: 'Keine Bilddatei hochgeladen'
      });
    }

    console.log('🔍 Looking for product with ID:', id);
    const product = await Portfolio.findById(id);
    if (!product) {
      console.log('❌ Product not found:', id);
      // Datei löschen wenn Produkt nicht gefunden
      fs.unlinkSync(req.file.path);
      return res.status(404).json({
        success: false,
        message: 'Produkt nicht gefunden'
      });
    }

    console.log('✅ Product found:', product.name);

    // Bild als Base64 einlesen
    const imageBuffer = fs.readFileSync(req.file.path);
    const base64Image = imageBuffer.toString('base64');
    const contentType = req.file.mimetype;

    console.log('📸 Image processed, size:', base64Image.length, 'chars');

    // Temporäre Datei sicher löschen (mit Retry für Windows)
    try {
      // Kurz warten bevor Löschen (Windows file locking)
      await new Promise(resolve => setTimeout(resolve, 100));
      if (fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
        console.log('🗑️ Temporary file deleted successfully');
      }
    } catch (unlinkError) {
      console.warn('⚠️ Could not delete temporary file (will be cleaned up later):', unlinkError.message);
      // Nicht kritisch - Datei wird später bereinigt
    }

    // Bilder-Objekt initialisieren falls nicht vorhanden
    if (!product.bilder) {
      product.bilder = {
        hauptbild: '',
        hauptbildData: { data: '', contentType: '' },
        galerie: [],
        alt_text: ''
      };
    }

    if (isHauptbild === 'true') {
      console.log('📷 Setting as main image');
      // Hauptbild als Base64 speichern
      product.bilder.hauptbild = `data:${contentType};base64,${base64Image}`;
      product.bilder.hauptbildData = {
        data: base64Image,
        contentType: contentType
      };
      product.bilder.alt_text = alt_text || '';
    } else {
      console.log('🖼️ Adding to gallery');
      // Zur Galerie hinzufügen
      product.bilder.galerie.push({
        url: `data:${contentType};base64,${base64Image}`,
        data: base64Image,
        contentType: contentType,
        alt_text: alt_text || ''
      });
    }

    console.log('💾 Saving product...');
    await product.save();
    console.log('✅ Product saved successfully');

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
    console.error('❌ Stack trace:', error.stack);
    
    // Datei sicher löschen bei Fehler (mit Retry)
    if (req.file && req.file.path) {
      try {
        await new Promise(resolve => setTimeout(resolve, 100));
        if (fs.existsSync(req.file.path)) {
          fs.unlinkSync(req.file.path);
          console.log('🗑️ Temporary file cleaned up after error');
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
router.delete('/portfolio/:id/image/:imageType/:imageIndex?', async (req, res) => {
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
        product.bilder.hauptbild = '';
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
// @desc    Portfolio-Statistiken für Admin abrufen
// @access  Private (Admin only)
router.get('/portfolio/stats', async (req, res) => {
  try {
    const totalProducts = await Portfolio.countDocuments();
    const activeProducts = await Portfolio.countDocuments({ aktiv: true });
    const inactiveProducts = await Portfolio.countDocuments({ aktiv: false });
    
    const seifenTypes = await Portfolio.aggregate([
      { $group: { _id: '$seife', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);

    const aromaTypes = await Portfolio.aggregate([
      { $group: { _id: '$aroma', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);

    const productsWithImages = await Portfolio.countDocuments({
      $or: [
        { 'bilder.hauptbild': { $ne: '', $exists: true } },
        { 'bilder.galerie.0': { $exists: true } }
      ]
    });

    const productsWithoutImages = totalProducts - productsWithImages;

    res.json({
      success: true,
      data: {
        totalProducts,
        activeProducts,
        inactiveProducts,
        productsWithImages,
        productsWithoutImages,
        seifenTypes,
        aromaTypes
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

// @route   GET /api/admin/cart
// @desc    Admin Warenkorb abrufen
// @access  Private (Admin)
router.get('/cart', async (req, res) => {
  try {
    const Cart = require('../models/Cart');
    const kundeId = req.user.id || req.user.userId;
    
    let cart = await Cart.findOne({ kundeId });
    
    if (!cart) {
      // Leeren Warenkorb erstellen, falls nicht vorhanden
      cart = new Cart({
        kundeId,
        artikel: []
      });
      await cart.save();
    }

    // Aktualisiere Bild-URLs und Verfügbarkeitsinformationen aus Portfolio für alle Artikel
    const Portfolio = require('../models/Portfolio');
    const Bestand = require('../models/Bestand');
    
    const enrichedItems = await Promise.all(cart.artikel.map(async (item) => {
      try {
        // Hole aktuelles Produkt aus Portfolio
        const product = await Portfolio.findById(item.produktId);
        let bestandInfo = null;
        
        // Lade Bestandsinformationen
        if (product) {
          bestandInfo = await Bestand.findOne({ 
            artikelId: item.produktId,
            typ: 'produkt'
          });
          console.log('🔍 Admin Cart - Checking bestand for:', {
            produktId: item.produktId,
            productName: product.name,
            bestandFound: !!bestandInfo,
            bestandMenge: bestandInfo?.menge,
            bestandVerfuegbar: bestandInfo?.verfuegbar
          });
        }
        
        if (product && product.bilder && product.bilder.hauptbild) {
          // Aktualisiere mit Portfolio-Daten und Verfügbarkeitsstatus
          return {
            ...item.toObject(),
            bild: product.bilder.hauptbild,
            aktiv: product.aktiv, // Produktstatus direkt hinzufügen
            bestand: bestandInfo ? {
              verfuegbar: (bestandInfo.menge || 0) > 0,
              menge: bestandInfo.menge || 0,
              einheit: bestandInfo.einheit || 'Stück'
            } : {
              // Fallback: Wenn kein Bestand-Eintrag, aber Produkt aktiv
              verfuegbar: product.aktiv !== false, // Standard: verfügbar außer explizit deaktiviert
              menge: 5, // Standard-Menge
              einheit: 'Stück'
            }
          };
        }
        
        // Fallback: behalte vorhandene Daten aber füge Bestandsinfo hinzu
        return {
          ...item.toObject(),
          aktiv: product?.aktiv || false, // Produktstatus direkt hinzufügen
          bestand: bestandInfo ? {
            verfuegbar: (bestandInfo.menge || 0) > 0,
            menge: bestandInfo.menge || 0,
            einheit: bestandInfo.einheit || 'Stück'
          } : {
            // Fallback: Wenn kein Bestand-Eintrag und kein Produkt gefunden
            verfuegbar: false,
            menge: 0,
            einheit: 'Stück'
          }
        };
      } catch (err) {
        console.error('Fehler beim Laden des Produkts:', item.produktId, err);
        // Bei Fehler: behalte Artikel mit "nicht verfügbar" Status
        return {
          ...item.toObject(),
          bestand: {
            verfuegbar: false,
            menge: 0,
            einheit: 'Stück'
          }
        };
      }
    }));

    res.json({
      success: true,
      data: {
        items: enrichedItems,
        total: enrichedItems.reduce((sum, item) => sum + (item.preis * item.menge), 0),
        itemCount: enrichedItems.reduce((sum, item) => sum + item.menge, 0)
      }
    });
  } catch (error) {
    console.error('Admin Cart Load Error:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Laden des Admin-Warenkorbs'
    });
  }
});

// ===== INVOICE MANAGEMENT =====
const invoiceController = require('../controllers/invoiceController');

// @route   GET /api/admin/invoice/templates
// @desc    Get all invoice templates
// @access  Private (Admin)
router.get('/invoice/templates', invoiceController.getAllTemplates);

// @route   POST /api/admin/invoice/templates
// @desc    Create new invoice template
// @access  Private (Admin)
router.post('/invoice/templates', invoiceController.createTemplate);

// @route   PUT /api/admin/invoice/templates/:id
// @desc    Update invoice template
// @access  Private (Admin)
router.put('/invoice/templates/:id', invoiceController.updateTemplate);

// @route   DELETE /api/admin/invoice/templates/:id
// @desc    Delete invoice template
// @access  Private (Admin)
router.delete('/invoice/templates/:id', invoiceController.deleteTemplate);

// @route   POST /api/admin/invoice/templates/:id/activate
// @desc    Activate invoice template
// @access  Private (Admin)
router.post('/invoice/templates/:id/activate', invoiceController.setDefaultTemplate);

// @route   POST /api/admin/invoice/preview
// @desc    Preview invoice template
// @access  Private (Admin)
router.post('/invoice/preview', invoiceController.generatePreview);

// @route   GET /api/admin/invoice/variables
// @desc    Get available variables for invoice
// @access  Private (Admin)
router.get('/invoice/variables', invoiceController.getAvailableVariables);

// @route   POST /api/admin/invoice/generate/:orderId
// @desc    Generate invoice for order
// @access  Private (Admin)
router.post('/invoice/generate/:orderId', invoiceController.generateInvoiceForOrder);

// @route   POST /api/admin/invoice/send/:orderId
// @desc    Send invoice email for order
// @access  Private (Admin)
router.post('/invoice/send/:orderId', invoiceController.sendInvoiceForOrder);

// @route   GET /api/admin/invoice/download/:orderId
// @desc    Download invoice PDF for order
// @access  Private (Admin)
router.get('/invoice/download/:orderId', invoiceController.downloadInvoiceForOrder);

module.exports = router;