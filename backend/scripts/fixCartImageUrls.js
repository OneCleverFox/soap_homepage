/**
 * Script zum Korrigieren der Bild-URLs in Warenkorb-Einträgen
 * 
 * Problem: Alte Einträge haben URLs mit doppeltem /api/api/ Prefix
 * Lösung: Korrigiert URLs zu relativem Pfad /api/portfolio/image/...
 */

const mongoose = require('mongoose');
const path = require('path');

// Dotenv-Vault Configuration
if (process.env.DOTENV_KEY) {
  require('dotenv-vault/config');
} else {
  require('dotenv').config({
    path: path.resolve(__dirname, '../..', '.env')
  });
}

const Cart = require('../src/models/Cart');

const fixCartImageUrls = async () => {
  try {
    console.log('🔧 Verbinde mit MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Verbunden mit MongoDB');

    // Alle Warenkorb-Einträge laden
    const carts = await Cart.find({});
    console.log(`\n📦 ${carts.length} Warenkörbe gefunden`);

    let totalFixed = 0;
    let totalItems = 0;

    for (const cart of carts) {
      let cartModified = false;

      for (const item of cart.artikel) {
        totalItems++;
        
        if (!item.bild) {
          console.log(`  ⚠️  Item "${item.name}" hat kein Bild`);
          continue;
        }

        const originalUrl = item.bild;
        let fixedUrl = originalUrl;

        // Fall 1: URL beginnt mit http://localhost:5000/api/api/
        if (fixedUrl.includes('http://localhost:5000/api/api/')) {
          fixedUrl = fixedUrl.replace('http://localhost:5000/api/api/', '/api/');
          console.log(`  🔧 Fix doppeltes /api/api/: ${item.name}`);
          cartModified = true;
          totalFixed++;
        }
        // Fall 2: URL beginnt mit http://localhost:5000/api/
        else if (fixedUrl.startsWith('http://localhost:5000/api/')) {
          fixedUrl = fixedUrl.replace('http://localhost:5000', '');
          console.log(`  🔧 Entferne localhost Prefix: ${item.name}`);
          cartModified = true;
          totalFixed++;
        }
        // Fall 3: URL beginnt mit http://localhost:5000/
        else if (fixedUrl.startsWith('http://localhost:5000/')) {
          fixedUrl = fixedUrl.replace('http://localhost:5000/', '/api/');
          console.log(`  🔧 Korrigiere zu /api/: ${item.name}`);
          cartModified = true;
          totalFixed++;
        }
        // Fall 4: URL ist bereits relativ und korrekt
        else if (fixedUrl.startsWith('/api/')) {
          console.log(`  ✅ Bereits korrekt: ${item.name}`);
        }
        // Fall 5: URL ist relativ aber ohne /api prefix
        else if (fixedUrl.startsWith('/')) {
          fixedUrl = `/api${fixedUrl}`;
          console.log(`  🔧 Füge /api prefix hinzu: ${item.name}`);
          cartModified = true;
          totalFixed++;
        }
        // Fall 6: Unbekanntes Format
        else {
          console.log(`  ❓ Unbekanntes URL-Format für ${item.name}: ${fixedUrl}`);
        }

        // URL im Item aktualisieren
        item.bild = fixedUrl;
      }

      // Warenkorb speichern wenn geändert
      if (cartModified) {
        await cart.save();
        console.log(`  💾 Warenkorb gespeichert (${cart.artikel.length} Artikel)`);
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log(`✅ Fertig!`);
    console.log(`   Warenkörbe geprüft: ${carts.length}`);
    console.log(`   Artikel geprüft: ${totalItems}`);
    console.log(`   Artikel korrigiert: ${totalFixed}`);
    console.log('='.repeat(60));

  } catch (error) {
    console.error('❌ Fehler beim Korrigieren der Bild-URLs:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('\n👋 Verbindung geschlossen');
    process.exit(0);
  }
};

// Script ausführen
fixCartImageUrls();
