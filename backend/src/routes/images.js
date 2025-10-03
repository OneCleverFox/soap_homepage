const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const Portfolio = require('../models/Portfolio');
const router = express.Router();

// Multer-Konfiguration für Bildupload
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.join(__dirname, '../../uploads/products');
    // Verzeichnis erstellen falls es nicht existiert
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const filename = `product-${uniqueSuffix}${path.extname(file.originalname)}`;
    cb(null, filename);
  }
});

const fileFilter = (req, file, cb) => {
  // Nur Bildformate erlauben
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
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB Limit
  }
});

// POST: Einzelnes Bild für ein Produkt hochladen
router.post('/upload/:productId', upload.single('image'), async (req, res) => {
  try {
    const { productId } = req.params;
    const { alt_text, isHauptbild } = req.body;
    
    if (!req.file) {
      return res.status(400).json({
        error: 'Keine Datei hochgeladen'
      });
    }

    // Produkt finden
    const product = await Portfolio.findById(productId);
    if (!product) {
      // Datei wieder löschen wenn Produkt nicht gefunden
      fs.unlinkSync(req.file.path);
      return res.status(404).json({
        error: 'Produkt nicht gefunden'
      });
    }

    // Bilder-Objekt initialisieren falls nicht vorhanden
    if (!product.bilder) {
      product.bilder = {
        hauptbild: null,
        galerie: [],
        alt_text: ''
      };
    }

    const imageUrl = `/api/images/serve/${req.file.filename}`;

    if (isHauptbild === 'true') {
      // Altes Hauptbild löschen falls vorhanden
      if (product.bilder.hauptbild) {
        const oldImagePath = path.join(__dirname, '../../uploads/products', 
          path.basename(product.bilder.hauptbild));
        if (fs.existsSync(oldImagePath)) {
          fs.unlinkSync(oldImagePath);
        }
      }
      product.bilder.hauptbild = imageUrl;
      product.bilder.alt_text = alt_text || '';
    } else {
      // Zur Galerie hinzufügen
      product.bilder.galerie.push({
        url: imageUrl,
        alt_text: alt_text || ''
      });
    }

    await product.save();

    res.json({
      message: 'Bild erfolgreich hochgeladen',
      imageUrl: imageUrl,
      isHauptbild: isHauptbild === 'true'
    });

  } catch (error) {
    console.error('Fehler beim Hochladen:', error);
    // Datei löschen bei Fehler
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    res.status(500).json({ error: 'Fehler beim Hochladen des Bildes' });
  }
});

// POST: Mehrere Bilder gleichzeitig hochladen
router.post('/upload-multiple/:productId', upload.array('images', 10), async (req, res) => {
  try {
    const { productId } = req.params;
    
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        error: 'Keine Dateien hochgeladen'
      });
    }

    // Produkt finden
    const product = await Portfolio.findById(productId);
    if (!product) {
      // Alle Dateien wieder löschen wenn Produkt nicht gefunden
      req.files.forEach(file => {
        if (fs.existsSync(file.path)) {
          fs.unlinkSync(file.path);
        }
      });
      return res.status(404).json({
        error: 'Produkt nicht gefunden'
      });
    }

    // Bilder-Objekt initialisieren falls nicht vorhanden
    if (!product.bilder) {
      product.bilder = {
        hauptbild: null,
        galerie: [],
        alt_text: ''
      };
    }

    const uploadedImages = [];

    req.files.forEach(file => {
      const imageUrl = `/api/images/serve/${file.filename}`;
      product.bilder.galerie.push({
        url: imageUrl,
        alt_text: ''
      });
      uploadedImages.push(imageUrl);
    });

    await product.save();

    res.json({
      message: `${req.files.length} Bilder erfolgreich hochgeladen`,
      images: uploadedImages
    });

  } catch (error) {
    console.error('Fehler beim Hochladen:', error);
    // Alle Dateien löschen bei Fehler
    if (req.files) {
      req.files.forEach(file => {
        if (fs.existsSync(file.path)) {
          fs.unlinkSync(file.path);
        }
      });
    }
    res.status(500).json({ error: 'Fehler beim Hochladen der Bilder' });
  }
});

// GET: Bild servieren
router.get('/serve/:filename', (req, res) => {
  try {
    const filename = req.params.filename;
    const imagePath = path.join(__dirname, '../../uploads/products', filename);
    
    if (!fs.existsSync(imagePath)) {
      return res.status(404).json({ error: 'Bild nicht gefunden' });
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
    res.status(500).json({ error: 'Fehler beim Laden des Bildes' });
  }
});

// DELETE: Bild löschen
router.delete('/:productId/:imageType/:imageIndex?', async (req, res) => {
  try {
    const { productId, imageType, imageIndex } = req.params;

    const product = await Portfolio.findById(productId);
    if (!product) {
      return res.status(404).json({ error: 'Produkt nicht gefunden' });
    }

    if (!product.bilder) {
      return res.status(404).json({ error: 'Keine Bilder vorhanden' });
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
        return res.status(400).json({ error: 'Ungültiger Galerie-Index' });
      }
    } else {
      return res.status(400).json({ error: 'Ungültiger Bildtyp oder fehlender Index' });
    }

    // Datei von Festplatte löschen
    if (deletedImagePath && fs.existsSync(deletedImagePath)) {
      fs.unlinkSync(deletedImagePath);
    }

    await product.save();

    res.json({ message: 'Bild erfolgreich gelöscht' });

  } catch (error) {
    console.error('Fehler beim Löschen des Bildes:', error);
    res.status(500).json({ error: 'Fehler beim Löschen des Bildes' });
  }
});

// GET: Alle Bilder eines Produkts abrufen
router.get('/:productId', async (req, res) => {
  try {
    const { productId } = req.params;

    const product = await Portfolio.findById(productId);
    if (!product) {
      return res.status(404).json({ error: 'Produkt nicht gefunden' });
    }

    const bilder = product.bilder || {
      hauptbild: null,
      galerie: [],
      alt_text: ''
    };

    res.json(bilder);

  } catch (error) {
    console.error('Fehler beim Abrufen der Bilder:', error);
    res.status(500).json({ error: 'Fehler beim Abrufen der Bilder' });
  }
});

module.exports = router;