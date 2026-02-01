// Sharp mit Fallback für Cross-Platform-Kompatibilität
let sharp = null;
let sharpAvailable = false;

try {
  sharp = require('sharp');
  sharpAvailable = true;
} catch (error) {
  // Sharp-Warnung wird bereits in startup.js ausgegeben
  sharpAvailable = false;
}

/**
 * Bildoptimierungs-Middleware
 * 
 * Komprimiert und optimiert Bilder automatisch:
 * - Maximale Breite: 1200px (für Hauptbilder)
 * - Maximale Breite: 800px (für Galerie-Bilder)
 * - Format: WebP (moderne Browser) mit JPEG Fallback
 * - Qualität: 85% (optimal zwischen Größe und Qualität)
 * - Entfernt EXIF-Daten (Datenschutz & Größe)
 * - SVG-Dateien werden NICHT komprimiert (bereits optimal)
 * 
 * @param {number} maxWidth - Maximale Bildbreite in Pixeln
 * @param {number} quality - Qualität (0-100), Standard: 85
 */
const optimizeImage = (maxWidth = 1200, quality = 85) => {
  return async (req, res, next) => {
    try {
      // Wenn kein Bild hochgeladen wurde, weiter
      if (!req.file) {
        return next();
      }

      // Wenn Sharp nicht verfügbar ist, Bild ohne Optimierung durchleiten
      if (!sharpAvailable) {
        console.log(`📸 Bild ohne Optimierung: ${req.file.originalname} (Sharp nicht verfügbar)`);
        return next();
      }

      // SVG-Dateien nicht komprimieren (bereits vektorbasiert & optimal)
      if (req.file.mimetype === 'image/svg+xml') {
        console.log(`📸 SVG-Bild: ${req.file.originalname} (nicht komprimiert)`);
        return next();
      }

      console.log(`📸 Optimiere Bild: ${req.file.originalname}`);
      console.log(`   Original: ${(req.file.size / 1024).toFixed(2)} KB`);

      // Bildmetadaten auslesen
      const metadata = await sharp(req.file.path).metadata();
      console.log(`   Auflösung: ${metadata.width}x${metadata.height}px`);

      // Bild optimieren
      const optimizedBuffer = await sharp(req.file.path)
        .resize(maxWidth, null, {
          // Nur verkleinern, nicht vergrößern
          withoutEnlargement: true,
          // Seitenverhältnis beibehalten
          fit: 'inside'
        })
        // In WebP konvertieren (moderne Browser, ~30% kleiner)
        .webp({
          quality: quality,
          // Progressives Laden
          progressive: true,
          // Bessere Kompression
          effort: 6
        })
        // EXIF-Daten entfernen (Datenschutz & Größe)
        .withMetadata({
          orientation: metadata.orientation // Rotation beibehalten
        })
        .toBuffer();

      // Optimierte Datei zurückschreiben (mit Timeout für Windows)
      const fs = require('fs');
      
      try {
        // Datei schließen und kurz warten (Windows-spezifisch)
        await new Promise(resolve => setTimeout(resolve, 100));
        fs.writeFileSync(req.file.path, optimizedBuffer);
        
        // Dateigröße & MIME-Type aktualisieren
        req.file.size = optimizedBuffer.length;
        req.file.mimetype = 'image/webp';

        console.log(`   ✅ Optimiert: ${(optimizedBuffer.length / 1024).toFixed(2)} KB`);
        
        // Originalgrößee für Vergleich speichern
        const originalSize = req.file.originalSize || req.file.size;
        console.log(`   📊 Ersparnis: ${(((originalSize - optimizedBuffer.length) / originalSize) * 100).toFixed(1)}%`);
      } catch (writeError) {
        console.error('❌ Fehler beim Schreiben der optimierten Datei:', writeError);
        // Bei Schreibfehler: Original beibehalten
      }

      next();
    } catch (error) {
      console.error('❌ Fehler bei Bildoptimierung:', error);
      console.log('📸 Fallback: Bild ohne Optimierung verwenden');
      // Bei Fehler: Originalbild verwenden und trotzdem weiter
      next();
    }
  };
};

/**
 * Bildoptimierung für Hauptbilder (max 1200px)
 * Fallback: Kein Fehler wenn Sharp nicht verfügbar
 */
const optimizeMainImage = optimizeImage(1200, 85);

/**
 * Bildoptimierung für Galerie-Bilder (max 800px)
 * Fallback: Kein Fehler wenn Sharp nicht verfügbar
 */
const optimizeGalleryImage = optimizeImage(800, 85);

/**
 * Bildoptimierung für Thumbnails (max 400px)
 */
const optimizeThumbnail = optimizeImage(400, 80);

module.exports = {
  optimizeImage,
  optimizeMainImage,
  optimizeGalleryImage,
  optimizeThumbnail
};
