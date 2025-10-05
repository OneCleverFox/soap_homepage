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
    fileSize: 5 * 1024 * 1024 // 5MB Limit
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
      aktiv: aktiv !== undefined ? aktiv : true,
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
// @desc    Bild für Portfolio-Produkt hochladen (Base64)
// @access  Private (Admin only)
router.post('/portfolio/:id/upload-image', upload.single('image'), async (req, res) => {
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
        hauptbild: '',
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
        isHauptbild: isHauptbild === 'true',
        product: product
      }
    });

  } catch (error) {
    console.error('Admin Image Upload Error:', error);
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

module.exports = router;