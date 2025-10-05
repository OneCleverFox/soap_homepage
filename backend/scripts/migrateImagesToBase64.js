const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const Portfolio = require('../src/models/Portfolio');

// Environment setup
require('dotenv').config({
  path: path.resolve(__dirname, '..', '.env.development')
});

async function migrateImagesToBase64() {
  try {
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🖼️  BILD-MIGRATION: Datei-Pfade → Base64 in MongoDB');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    // MongoDB verbinden
    const MONGODB_URI = process.env.MONGODB_URI_DEV || process.env.MONGODB_URI;
    console.log('🔌 Verbinde mit MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ MongoDB verbunden\n');

    // Alle Produkte mit Bildern finden
    const products = await Portfolio.find({
      $or: [
        { 'bilder.hauptbild': { $exists: true, $ne: '' } },
        { 'bilder.galerie': { $exists: true, $ne: [] } }
      ]
    });

    console.log(`📊 Gefunden: ${products.length} Produkte mit Bildern\n`);

    let migratedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;

    for (const product of products) {
      console.log(`\n🔄 Verarbeite: ${product.name} (${product._id})`);

      try {
        let modified = false;

        // Hauptbild migrieren
        if (product.bilder.hauptbild && !product.bilder.hauptbild.startsWith('data:image/')) {
          const filename = path.basename(product.bilder.hauptbild);
          const filepath = path.join(__dirname, '../uploads/products', filename);

          if (fs.existsSync(filepath)) {
            const imageBuffer = fs.readFileSync(filepath);
            const base64 = imageBuffer.toString('base64');
            
            // MIME-Type aus Dateiendung ermitteln
            const ext = path.extname(filename).toLowerCase();
            let contentType = 'image/jpeg';
            if (ext === '.png') contentType = 'image/png';
            else if (ext === '.webp') contentType = 'image/webp';
            else if (ext === '.svg') contentType = 'image/svg+xml';

            product.bilder.hauptbild = `data:${contentType};base64,${base64}`;
            
            // Neue Felder setzen
            if (!product.bilder.hauptbildData) {
              product.bilder.hauptbildData = {};
            }
            product.bilder.hauptbildData.data = base64;
            product.bilder.hauptbildData.contentType = contentType;

            console.log(`  ✅ Hauptbild migriert: ${filename} (${(imageBuffer.length / 1024).toFixed(2)} KB)`);
            modified = true;
          } else {
            console.log(`  ⚠️  Hauptbild-Datei nicht gefunden: ${filename}`);
            errorCount++;
          }
        } else if (product.bilder.hauptbild && product.bilder.hauptbild.startsWith('data:image/')) {
          console.log(`  ⏭️  Hauptbild bereits Base64, übersprungen`);
          skippedCount++;
        }

        // Galerie-Bilder migrieren
        if (product.bilder.galerie && product.bilder.galerie.length > 0) {
          for (let i = 0; i < product.bilder.galerie.length; i++) {
            const galerieItem = product.bilder.galerie[i];
            
            if (galerieItem.url && !galerieItem.url.startsWith('data:image/')) {
              const filename = path.basename(galerieItem.url);
              const filepath = path.join(__dirname, '../uploads/products', filename);

              if (fs.existsSync(filepath)) {
                const imageBuffer = fs.readFileSync(filepath);
                const base64 = imageBuffer.toString('base64');
                
                const ext = path.extname(filename).toLowerCase();
                let contentType = 'image/jpeg';
                if (ext === '.png') contentType = 'image/png';
                else if (ext === '.webp') contentType = 'image/webp';
                else if (ext === '.svg') contentType = 'image/svg+xml';

                product.bilder.galerie[i].url = `data:${contentType};base64,${base64}`;
                product.bilder.galerie[i].data = base64;
                product.bilder.galerie[i].contentType = contentType;

                console.log(`  ✅ Galerie-Bild ${i + 1} migriert: ${filename} (${(imageBuffer.length / 1024).toFixed(2)} KB)`);
                modified = true;
              } else {
                console.log(`  ⚠️  Galerie-Bild-Datei nicht gefunden: ${filename}`);
                errorCount++;
              }
            }
          }
        }

        // Speichern wenn Änderungen vorgenommen wurden
        if (modified) {
          await product.save();
          migratedCount++;
          console.log(`  💾 Produkt gespeichert`);
        } else {
          console.log(`  ⏭️  Keine Änderungen nötig`);
        }

      } catch (error) {
        console.error(`  ❌ Fehler bei ${product.name}:`, error.message);
        errorCount++;
      }
    }

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📊 MIGRATION ABGESCHLOSSEN');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log(`✅ Erfolgreich migriert: ${migratedCount} Produkte`);
    console.log(`⏭️  Übersprungen (bereits Base64): ${skippedCount} Produkte`);
    console.log(`❌ Fehler: ${errorCount} Probleme\n`);

    if (migratedCount > 0) {
      console.log('🎉 Bilder sind jetzt persistent und überleben Railway Deployments!\n');
    }

  } catch (error) {
    console.error('❌ Kritischer Fehler:', error);
  } finally {
    await mongoose.connection.close();
    console.log('🔌 MongoDB Verbindung geschlossen\n');
    process.exit(0);
  }
}

// Script ausführen
migrateImagesToBase64();
