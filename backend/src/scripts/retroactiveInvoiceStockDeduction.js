/**
 * Script zum nachträglichen Ausbuchen von Artikeln aus bereits erstellten Rechnungen
 * 
 * Verwendung:
 * node backend/src/scripts/retroactiveInvoiceStockDeduction.js [RECHNUNGS-NUMMER]
 * 
 * Beispiel:
 * node backend/src/scripts/retroactiveInvoiceStockDeduction.js 2026-000003
 */

const mongoose = require('mongoose');
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI || process.env.DATABASE_URL;

async function deductStockForInvoice(invoiceNumber) {
  try {
    console.log('🔗 Verbinde mit MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Mit MongoDB verbunden\n');

    const Invoice = require('../models/Invoice');
    const Bestand = require('../models/Bestand');
    const Bewegung = require('../models/Bewegung');

    // Rechnung finden
    console.log(`🔍 Suche Rechnung: ${invoiceNumber}...`);
    const invoice = await Invoice.findOne({ invoiceNumber: invoiceNumber });

    if (!invoice) {
      console.error(`❌ Rechnung ${invoiceNumber} nicht gefunden!`);
      process.exit(1);
    }

    console.log(`✅ Rechnung gefunden: ${invoice.invoiceNumber}`);
    console.log(`📋 Status: ${invoice.status}`);
    console.log(`📅 Erstellt am: ${invoice.createdAt}`);
    console.log(`👤 Kunde: ${invoice.customer.customerData.firstName} ${invoice.customer.customerData.lastName}\n`);

    console.log(`📦 Artikel auf der Rechnung:`);
    invoice.items.forEach((item, index) => {
      console.log(`   ${index + 1}. ${item.productData.name} - Menge: ${item.quantity} - Preis: €${item.unitPrice}`);
    });
    console.log('');

    // Prüfen, ob bereits ausgebucht wurde
    const existingMovements = await Bewegung.find({
      'referenz.typ': 'rechnung',
      'referenz.nummer': invoiceNumber
    });

    if (existingMovements.length > 0) {
      console.log(`⚠️  WARNUNG: Es wurden bereits ${existingMovements.length} Bewegungen für diese Rechnung gefunden!`);
      console.log(`   Möglicherweise wurde der Bestand bereits ausgebucht.\n`);
      
      existingMovements.forEach((mov, idx) => {
        console.log(`   Bewegung ${idx + 1}:`);
        console.log(`      - Typ: ${mov.typ}`);
        console.log(`      - Menge: ${mov.menge}`);
        console.log(`      - Datum: ${mov.createdAt}`);
        console.log(`      - Notiz: ${mov.notizen}`);
      });
      
      console.log(`\n❓ Soll trotzdem fortgefahren werden? (Dies würde DOPPELT ausbuchen!)`);
      console.log(`   Abbruch mit Ctrl+C, oder Script anpassen um fortzufahren.\n`);
      process.exit(0);
    }

    console.log(`📦 Starte Bestandsausbuchung...\n`);

    let successCount = 0;
    let errorCount = 0;
    let warningCount = 0;

    for (const item of invoice.items) {
      if (!item.productId) {
        console.log(`⚠️  ${item.productData.name}: Keine Produkt-ID - überspringe`);
        warningCount++;
        continue;
      }

      try {
        // Bestand finden
        const bestand = await Bestand.findOne({
          artikelId: item.productId,
          typ: 'produkt'
        });

        if (!bestand) {
          console.log(`⚠️  ${item.productData.name}: Kein Bestand in Datenbank gefunden`);
          warningCount++;
          continue;
        }

        const alteMenge = bestand.menge;
        const neueMenge = Math.max(0, alteMenge - item.quantity);

        // Bestand aktualisieren
        bestand.menge = neueMenge;
        bestand.letzteAenderung = new Date();
        await bestand.save();

        // Bewegung protokollieren
        const bewegung = new Bewegung({
          typ: 'ausgang',
          bestandId: bestand._id,
          artikel: {
            typ: 'produkt',
            artikelId: item.productId,
            name: item.productData.name
          },
          menge: item.quantity,
          einheit: bestand.einheit || 'Stück',
          bestandVorher: alteMenge,
          bestandNachher: neueMenge,
          grund: 'Verkauf (Rechnung - Nachträgliche Ausbuchung)',
          referenz: {
            typ: 'rechnung',
            id: invoice._id
          },
          notizen: `Nachträglich ausgebucht für Rechnung ${invoiceNumber} - ${item.productData.name}`,
          userId: 'Script'
        });
        await bewegung.save();

        console.log(`✅ ${item.productData.name}:`);
        console.log(`   Bestand: ${alteMenge} → ${neueMenge} (${item.quantity} ausgebucht)`);
        console.log(`   Bewegungs-ID: ${bewegung._id}`);
        successCount++;

      } catch (error) {
        console.error(`❌ Fehler bei ${item.productData.name}:`, error.message);
        errorCount++;
      }
    }

    console.log(`\n${'='.repeat(60)}`);
    console.log(`📊 ZUSAMMENFASSUNG für Rechnung ${invoiceNumber}:`);
    console.log(`${'='.repeat(60)}`);
    console.log(`✅ Erfolgreich ausgebucht: ${successCount}`);
    console.log(`⚠️  Warnungen: ${warningCount}`);
    console.log(`❌ Fehler: ${errorCount}`);
    console.log(`${'='.repeat(60)}\n`);

  } catch (error) {
    console.error('❌ Fehler beim Ausbuchen:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Von MongoDB getrennt\n');
    process.exit(0);
  }
}

// Script ausführen
const invoiceNumber = process.argv[2];

if (!invoiceNumber) {
  console.error('❌ Fehler: Keine Rechnungsnummer angegeben!');
  console.log('\nVerwendung:');
  console.log('  node backend/src/scripts/retroactiveInvoiceStockDeduction.js [RECHNUNGS-NUMMER]');
  console.log('\nBeispiel:');
  console.log('  node backend/src/scripts/retroactiveInvoiceStockDeduction.js 2026-000003\n');
  process.exit(1);
}

deductStockForInvoice(invoiceNumber);
