const GalleryImage = require('../models/Gallery');
const AdminSettings = require('../models/AdminSettings');

// Sharp optional laden (falls nicht verfügbar, läuft es ohne Optimierung)
let sharp;
try {
  sharp = require('sharp');
} catch (err) {
  // Sharp-Warnung wird bereits in startup.js ausgegeben
}

/**
 * Alle Galerie-Bilder abrufen (öffentlich)
 */
exports.getAllImages = async (req, res) => {
  try {
    const images = await GalleryImage.getActiveImages();
    const settings = await AdminSettings.getInstance();
    
    res.json({
      success: true,
      images: images,
      settings: {
        autoPlayInterval: settings.gallery?.autoPlayInterval || 5000,
        autoPlayEnabled: settings.gallery?.autoPlayEnabled !== false
      }
    });
  } catch (error) {
    console.error('Fehler beim Abrufen der Galerie-Bilder:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Laden der Galerie',
      error: error.message
    });
  }
};

/**
 * Alle Galerie-Bilder für Admin abrufen (inkl. inaktive)
 */
exports.getAllImagesAdmin = async (req, res) => {
  try {
    const images = await GalleryImage.find().sort({ order: 1 });
    
    res.json({
      success: true,
      images: images
    });
  } catch (error) {
    console.error('Fehler beim Abrufen der Admin-Galerie-Bilder:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Laden der Galerie',
      error: error.message
    });
  }
};

/**
 * Einzelnes Galerie-Bild abrufen
 */
exports.getImageById = async (req, res) => {
  try {
    const image = await GalleryImage.findById(req.params.id);
    
    if (!image) {
      return res.status(404).json({
        success: false,
        message: 'Bild nicht gefunden'
      });
    }
    
    res.json({
      success: true,
      image: image
    });
  } catch (error) {
    console.error('Fehler beim Abrufen des Bildes:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Laden des Bildes',
      error: error.message
    });
  }
};

/**
 * Neues Galerie-Bild hochladen
 */
exports.uploadImage = async (req, res) => {
  try {
    const { title, description, imageData, imageType } = req.body;
    
    if (!imageData) {
      return res.status(400).json({
        success: false,
        message: 'Kein Bild bereitgestellt'
      });
    }
    
    // Bildoptimierung mit Sharp (falls verfügbar)
    let optimizedImage = imageData;
    
    // Wenn es ein Base64-Bild ist und Sharp verfügbar, optimieren
    if (sharp && imageData.startsWith('data:image')) {
      try {
        const base64Data = imageData.split(',')[1];
        const buffer = Buffer.from(base64Data, 'base64');
        
        // Bild optimieren (max 1920px Breite, 85% Qualität)
        const optimizedBuffer = await sharp(buffer)
          .resize(1920, null, { 
            withoutEnlargement: true,
            fit: 'inside'
          })
          .jpeg({ quality: 85 })
          .toBuffer();
        
        optimizedImage = `data:image/jpeg;base64,${optimizedBuffer.toString('base64')}`;
      } catch (optimizeError) {
        console.warn('Bildoptimierung fehlgeschlagen, verwende Original:', optimizeError.message);
      }
    }
    
    // Höchste aktuelle order-Nummer finden
    const lastImage = await GalleryImage.findOne().sort({ order: -1 });
    const nextOrder = lastImage ? lastImage.order + 1 : 0;
    
    const newImage = new GalleryImage({
      title: title || '',
      description: description || '',
      imageData: optimizedImage,
      imageType: imageType || 'image/jpeg',
      order: nextOrder,
      uploadedBy: req.user?.username || 'Admin',
      uploadedAt: new Date()
    });
    
    await newImage.save();
    
    res.status(201).json({
      success: true,
      message: 'Bild erfolgreich hochgeladen',
      image: newImage
    });
  } catch (error) {
    console.error('Fehler beim Hochladen des Bildes:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Hochladen des Bildes',
      error: error.message
    });
  }
};

/**
 * Galerie-Bild aktualisieren
 */
exports.updateImage = async (req, res) => {
  try {
    const { title, description, imageData, imageType, isActive } = req.body;
    const image = await GalleryImage.findById(req.params.id);
    
    if (!image) {
      return res.status(404).json({
        success: false,
        message: 'Bild nicht gefunden'
      });
    }
    
    // Nur bereitgestellte Felder aktualisieren
    if (title !== undefined) image.title = title;
    if (description !== undefined) image.description = description;
    if (isActive !== undefined) image.isActive = isActive;
    
    // Wenn neues Bild bereitgestellt, optimieren und aktualisieren
    if (imageData) {
      let optimizedImage = imageData;
      
      if (sharp && imageData.startsWith('data:image')) {
        try {
          const base64Data = imageData.split(',')[1];
          const buffer = Buffer.from(base64Data, 'base64');
          
          const optimizedBuffer = await sharp(buffer)
            .resize(1920, null, { 
              withoutEnlargement: true,
              fit: 'inside'
            })
            .jpeg({ quality: 85 })
            .toBuffer();
          
          optimizedImage = `data:image/jpeg;base64,${optimizedBuffer.toString('base64')}`;
        } catch (optimizeError) {
          console.warn('Bildoptimierung fehlgeschlagen:', optimizeError.message);
        }
      }
      
      image.imageData = optimizedImage;
      image.imageType = imageType || 'image/jpeg';
    }
    
    await image.save();
    
    res.json({
      success: true,
      message: 'Bild erfolgreich aktualisiert',
      image: image
    });
  } catch (error) {
    console.error('Fehler beim Aktualisieren des Bildes:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Aktualisieren des Bildes',
      error: error.message
    });
  }
};

/**
 * Galerie-Bild löschen
 */
exports.deleteImage = async (req, res) => {
  try {
    const image = await GalleryImage.findByIdAndDelete(req.params.id);
    
    if (!image) {
      return res.status(404).json({
        success: false,
        message: 'Bild nicht gefunden'
      });
    }
    
    res.json({
      success: true,
      message: 'Bild erfolgreich gelöscht'
    });
  } catch (error) {
    console.error('Fehler beim Löschen des Bildes:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Löschen des Bildes',
      error: error.message
    });
  }
};

/**
 * Reihenfolge der Bilder neu ordnen
 */
exports.reorderImages = async (req, res) => {
  try {
    const { imageIds } = req.body;
    
    if (!Array.isArray(imageIds) || imageIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Ungültige Bildliste'
      });
    }
    
    await GalleryImage.reorderImages(imageIds);
    
    res.json({
      success: true,
      message: 'Reihenfolge erfolgreich aktualisiert'
    });
  } catch (error) {
    console.error('Fehler beim Neuordnen der Bilder:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Neuordnen der Bilder',
      error: error.message
    });
  }
};

/**
 * Galerie-Einstellungen abrufen
 */
exports.getSettings = async (req, res) => {
  try {
    const settings = await AdminSettings.getInstance();
    
    res.json({
      success: true,
      settings: {
        autoPlayInterval: settings.gallery?.autoPlayInterval || 5000,
        autoPlayEnabled: settings.gallery?.autoPlayEnabled !== false
      }
    });
  } catch (error) {
    console.error('Fehler beim Abrufen der Galerie-Einstellungen:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Laden der Einstellungen',
      error: error.message
    });
  }
};

/**
 * Galerie-Einstellungen aktualisieren
 */
exports.updateSettings = async (req, res) => {
  try {
    const { autoPlayInterval, autoPlayEnabled } = req.body;
    const settings = await AdminSettings.getInstance();
    
    if (!settings.gallery) {
      settings.gallery = {};
    }
    
    if (autoPlayInterval !== undefined) {
      // Validierung: zwischen 1 und 30 Sekunden
      const interval = parseInt(autoPlayInterval);
      if (interval < 1000 || interval > 30000) {
        return res.status(400).json({
          success: false,
          message: 'Auto-Play Intervall muss zwischen 1 und 30 Sekunden liegen'
        });
      }
      settings.gallery.autoPlayInterval = interval;
    }
    
    if (autoPlayEnabled !== undefined) {
      settings.gallery.autoPlayEnabled = autoPlayEnabled;
    }
    
    await settings.save();
    
    res.json({
      success: true,
      message: 'Einstellungen erfolgreich aktualisiert',
      settings: {
        autoPlayInterval: settings.gallery.autoPlayInterval,
        autoPlayEnabled: settings.gallery.autoPlayEnabled
      }
    });
  } catch (error) {
    console.error('Fehler beim Aktualisieren der Galerie-Einstellungen:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Aktualisieren der Einstellungen',
      error: error.message
    });
  }
};
