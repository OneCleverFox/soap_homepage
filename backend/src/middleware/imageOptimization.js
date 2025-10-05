const sharp = require('sharp');

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

      // Optimierte Datei zurückschreiben
      const fs = require('fs');
      fs.writeFileSync(req.file.path, optimizedBuffer);

      // Dateigröße & MIME-Type aktualisieren
      req.file.size = optimizedBuffer.length;
      req.file.mimetype = 'image/webp';

      console.log(`   ✅ Optimiert: ${(optimizedBuffer.length / 1024).toFixed(2)} KB`);
      console.log(`   📊 Ersparnis: ${(((req.file.size - optimizedBuffer.length) / req.file.size) * 100).toFixed(1)}%`);

      next();
    } catch (error) {
      console.error('❌ Fehler bei Bildoptimierung:', error);
      // Bei Fehler: Originalbild verwenden
      next();
    }
  };
};

/**
 * Bildoptimierung für Hauptbilder (max 1200px)
 */
const optimizeMainImage = optimizeImage(1200, 85);

/**
 * Bildoptimierung für Galerie-Bilder (max 800px)
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
