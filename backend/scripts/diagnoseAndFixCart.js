/**
 * VOLLSTÄNDIGE DIAGNOSE UND FIX FÜR WARENKORB-BILDER
 * 
 * Dieses Script:
 * 1. Prüft alle Warenkorb-Einträge
 * 2. Prüft welche Bild-URLs in der DB gespeichert sind
 * 3. Korrigiert alle URLs zu korrektem Format: /api/portfolio/image/FILENAME
 * 4. Prüft ob die Bilddateien tatsächlich existieren
 */

const mongoose = require('mongoose');
const path = require('path');
const fs = require('fs');

// Dotenv Configuration
if (process.env.DOTENV_KEY) {
  require('dotenv-vault/config');
} else {
  require('dotenv').config({
    path: path.resolve(__dirname, '../..', '.env')
  });
}

const Cart = require('../src/models/Cart');
const Portfolio = require('../src/models/Portfolio');

const UPLOADS_DIR = path.join(__dirname, '../../uploads/products');

const diagnoseAndFixCart = async () => {
  try {
    console.log('\n' + '='.repeat(80));
    console.log('🔧 WARENKORB BILDER - VOLLSTÄNDIGE DIAGNOSE & FIX');
    console.log('='.repeat(80) + '\n');

    console.log('📡 Verbinde mit MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Verbunden mit MongoDB\n');

    // 1. ALLE WARENKÖRBE PRÜFEN
    console.log('1️⃣  WARENKORB-EINTRÄGE PRÜFEN');
    console.log('-'.repeat(80));
    
    const carts = await Cart.find({});
    console.log(`📦 ${carts.length} Warenkorb(e) gefunden\n`);

    let totalItems = 0;
    let itemsWithImages = 0;
    let itemsWithoutImages = 0;
    let itemsFixed = 0;
    let missingFiles = [];

    for (const cart of carts) {
      console.log(`\n🛒 Warenkorb für Kunde: ${cart.kundeId}`);
      console.log(`   Artikel im Warenkorb: ${cart.artikel.length}`);

      let cartModified = false;

      for (const item of cart.artikel) {
        totalItems++;
        console.log(`\n   📦 ${item.name}`);
        console.log(`      Preis: €${item.preis}`);
        console.log(`      Menge: ${item.menge}`);
        console.log(`      Bild (aktuell): ${item.bild || 'NICHT GESETZT'}`);

        // Fall 1: Kein Bild gesetzt
        if (!item.bild) {
          itemsWithoutImages++;
          console.log(`      ⚠️  KEIN BILD - Suche im Portfolio...`);
          
          // Versuche Bild aus Portfolio zu holen
          try {
            const portfolioItem = await Portfolio.findById(item.produktId);
            if (portfolioItem && portfolioItem.bilder?.hauptbild) {
              item.bild = portfolioItem.bilder.hauptbild;
              cartModified = true;
              itemsFixed++;
              console.log(`      ✅ Bild aus Portfolio geholt: ${item.bild}`);
            } else {
              console.log(`      ❌ Auch im Portfolio kein Bild gefunden!`);
            }
          } catch (err) {
            console.log(`      ❌ Fehler beim Portfolio-Lookup: ${err.message}`);
          }
          continue;
        }

        itemsWithImages++;
        let originalUrl = item.bild;
        let fixedUrl = originalUrl;
        let needsFix = false;

        // Fall 2: URL hat falsche Prefixe
        if (fixedUrl.includes('http://localhost:5000/api/api/')) {
          fixedUrl = fixedUrl.replace('http://localhost:5000/api/api/', '/api/');
          needsFix = true;
          console.log(`      🔧 FIX: Entferne doppeltes /api/api/`);
        } else if (fixedUrl.startsWith('http://localhost:5000/api/')) {
          fixedUrl = fixedUrl.replace('http://localhost:5000', '');
          needsFix = true;
          console.log(`      🔧 FIX: Entferne localhost Prefix`);
        } else if (fixedUrl.startsWith('http://localhost:5000/')) {
          fixedUrl = fixedUrl.replace('http://localhost:5000/', '/api/');
          needsFix = true;
          console.log(`      🔧 FIX: Korrigiere zu /api/`);
        } else if (!fixedUrl.startsWith('/api/')) {
          // URL ist relativ aber ohne /api prefix
          if (fixedUrl.startsWith('/')) {
            fixedUrl = `/api${fixedUrl}`;
          } else {
            fixedUrl = `/api/portfolio/image/${fixedUrl}`;
          }
          needsFix = true;
          console.log(`      🔧 FIX: Füge /api prefix hinzu`);
        }

        if (needsFix) {
          item.bild = fixedUrl;
          cartModified = true;
          itemsFixed++;
          console.log(`      ✅ Korrigiert zu: ${fixedUrl}`);
        } else {
          console.log(`      ✅ URL bereits korrekt`);
        }

        // Fall 3: Prüfe ob Datei existiert
        // Extrahiere Dateiname aus URL: /api/portfolio/image/FILENAME
        const matches = fixedUrl.match(/\/image\/(.+)$/);
        if (matches && matches[1]) {
          const filename = matches[1];
          const filepath = path.join(UPLOADS_DIR, filename);
          
          if (fs.existsSync(filepath)) {
            console.log(`      ✅ Datei existiert: ${filename}`);
          } else {
            console.log(`      ❌ DATEI FEHLT: ${filename}`);
            missingFiles.push({ name: item.name, file: filename, url: fixedUrl });
          }
        }
      }

      // Warenkorb speichern wenn geändert
      if (cartModified) {
        await cart.save();
        console.log(`\n   💾 Warenkorb gespeichert`);
      }
    }

    // 2. ZUSAMMENFASSUNG
    console.log('\n\n' + '='.repeat(80));
    console.log('📊 ZUSAMMENFASSUNG');
    console.log('='.repeat(80));
    console.log(`Warenkörbe geprüft:        ${carts.length}`);
    console.log(`Artikel gesamt:             ${totalItems}`);
    console.log(`Artikel mit Bildern:        ${itemsWithImages}`);
    console.log(`Artikel ohne Bilder:        ${itemsWithoutImages}`);
    console.log(`Artikel korrigiert:         ${itemsFixed}`);
    console.log(`Fehlende Bilddateien:       ${missingFiles.length}`);

    if (missingFiles.length > 0) {
      console.log('\n⚠️  FEHLENDE BILDDATEIEN:');
      missingFiles.forEach((item, idx) => {
        console.log(`   ${idx + 1}. ${item.name}: ${item.file}`);
      });
    }

    console.log('\n' + '='.repeat(80));
    console.log('✅ DIAGNOSE UND FIX ABGESCHLOSSEN');
    console.log('='.repeat(80) + '\n');

  } catch (error) {
    console.error('\n❌ FEHLER:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('👋 Verbindung geschlossen\n');
    process.exit(0);
  }
};

// Script ausführen
diagnoseAndFixCart();
