const mongoose = require('mongoose');
const Order = require('../src/models/Order');
const Inquiry = require('../src/models/Inquiry');
require('dotenv').config({ path: '../.env.development' });

// MongoDB Verbindung aus Environment
const MONGODB_URI = process.env.MONGODB_URI;

async function fixConvertedOrders() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('🔗 MongoDB verbunden');

    // Finde alle Bestellungen aus umgewandelten Anfragen
    const convertedOrders = await Order.find({ 
      source: 'inquiry',
      $or: [
        { artikel: { $size: 0 } },
        { artikel: { $exists: false } },
        { 'preise.gesamtsumme': 0 }
      ]
    });

    console.log(`📦 Gefundene defekte umgewandelte Bestellungen: ${convertedOrders.length}`);

    for (const order of convertedOrders) {
      console.log(`\n🔧 Repariere Bestellung: ${order.bestellnummer}`);
      
      // Finde die ursprüngliche Anfrage
      const inquiry = await Inquiry.findOne({ 
        convertedOrderId: order._id 
      });

      if (!inquiry) {
        console.log(`❌ Keine ursprüngliche Anfrage gefunden für ${order.bestellnummer}`);
        continue;
      }

      console.log(`📋 Ursprüngliche Anfrage gefunden: ${inquiry.inquiryId}`);
      console.log(`📊 Items: ${inquiry.items?.length || 0}, Total: ${inquiry.total}`);

      // Items von Anfrage-Format zu Bestellungs-Format konvertieren
      const fixedArtikel = inquiry.items.map(item => ({
        productId: item.productId,
        produktSnapshot: {
          name: item.name,
          bild: item.image
        },
        menge: item.quantity,
        einzelpreis: item.price,
        gesamtpreis: item.quantity * item.price
      }));

      // Preise korrigieren
      const fixedPreise = {
        zwischensumme: inquiry.total,
        versandkosten: 0,
        mwst: {
          satz: 19,
          betrag: inquiry.total * 0.19 / 1.19
        },
        rabatt: {
          betrag: 0,
          code: '',
          grund: '',
          prozent: 0
        },
        gesamtsumme: inquiry.total
      };

      // Bestellung aktualisieren
      await Order.findByIdAndUpdate(order._id, {
        artikel: fixedArtikel,
        preise: fixedPreise
      });

      console.log(`✅ Bestellung ${order.bestellnummer} repariert:`);
      console.log(`   - Artikel: ${fixedArtikel.length}`);
      console.log(`   - Gesamtsumme: ${inquiry.total}€`);
    }

    console.log(`\n🎉 Migration abgeschlossen! ${convertedOrders.length} Bestellungen repariert.`);

  } catch (error) {
    console.error('❌ Fehler bei Migration:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 MongoDB Verbindung geschlossen');
  }
}

// Script ausführen
fixConvertedOrders();