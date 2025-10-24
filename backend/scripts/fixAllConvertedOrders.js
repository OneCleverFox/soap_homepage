const mongoose = require('mongoose');
const Order = require('../src/models/Order');
const Inquiry = require('../src/models/Inquiry');
require('dotenv').config({ path: '.env.development' });

// MongoDB Verbindung aus Environment
const MONGODB_URI = process.env.MONGODB_URI || process.env.MONGO_URI;

async function fixAllConvertedOrders() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('🔗 MongoDB verbunden');

    // 1. Finde alle Anfragen, die convertedOrderId haben
    const convertedInquiries = await Inquiry.find({ 
      convertedOrderId: { $exists: true, $ne: null }
    });

    console.log(`📋 Gefundene umgewandelte Anfragen: ${convertedInquiries.length}`);

    for (const inquiry of convertedInquiries) {
      console.log(`\n🔧 Verarbeite Anfrage: ${inquiry.inquiryId}`);
      console.log(`📦 Zugeordnete Bestellung: ${inquiry.convertedOrderId}`);
      
      // Finde die zugehörige Bestellung - versuche sowohl ObjectId als auch Bestellnummer
      let order = null;
      
      // Versuche zuerst mit ObjectId (falls convertedOrderId korrekt gespeichert)
      try {
        if (mongoose.Types.ObjectId.isValid(inquiry.convertedOrderId)) {
          order = await Order.findById(inquiry.convertedOrderId);
        }
      } catch (e) {
        console.log(`⚠️ ObjectId-Lookup fehlgeschlagen: ${e.message}`);
      }
      
      // Falls nicht gefunden, versuche als Bestellnummer
      if (!order) {
        order = await Order.findOne({ bestellnummer: inquiry.convertedOrderId });
      }

      if (!order) {
        console.log(`❌ Bestellung nicht gefunden für Anfrage ${inquiry.inquiryId}`);
        continue;
      }

      console.log(`📊 Bestellung: ${order.bestellnummer}`);
      console.log(`📊 Aktuelle Artikel: ${order.artikel?.length || 0}`);
      console.log(`📊 Inquiry Items: ${inquiry.items?.length || 0}, Total: ${inquiry.total}`);

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

      // Bestellung aktualisieren mit korrekten Daten UND source-Markierung
      await Order.findByIdAndUpdate(order._id, {
        artikel: fixedArtikel,
        preise: fixedPreise,
        source: 'inquiry', // Wichtig: Als umgewandelte Anfrage markieren
        sourceInquiryId: inquiry._id
      });

      console.log(`✅ Bestellung ${order.bestellnummer} vollständig repariert:`);
      console.log(`   - Source: inquiry`);
      console.log(`   - Artikel: ${fixedArtikel.length}`);
      console.log(`   - Gesamtsumme: ${inquiry.total}€`);
    }

    // 2. Zusätzlich: Finde Bestellungen ohne source aber mit leerem artikel Array
    console.log(`\n🔍 Suche nach weiteren problematischen Bestellungen...`);
    
    const suspiciousOrders = await Order.find({
      $and: [
        { source: { $in: [null, undefined] } },
        { 
          $or: [
            { artikel: { $size: 0 } },
            { artikel: { $exists: false } },
            { 'preise.gesamtsumme': 0 }
          ]
        }
      ]
    });

    console.log(`⚠️ Verdächtige Bestellungen ohne source: ${suspiciousOrders.length}`);

    for (const order of suspiciousOrders) {
      // Versuche die ursprüngliche Anfrage über die Bestellnummer zu finden
      // (manchmal wird die Bestellnummer als inquiryId verwendet)
      const relatedInquiry = await Inquiry.findOne({
        $or: [
          { convertedOrderId: order._id },
          { inquiryId: order.bestellnummer }
        ]
      });

      if (relatedInquiry) {
        console.log(`\n🔧 Repariere verdächtige Bestellung: ${order.bestellnummer}`);
        
        const fixedArtikel = relatedInquiry.items.map(item => ({
          productId: item.productId,
          produktSnapshot: {
            name: item.name,
            bild: item.image
          },
          menge: item.quantity,
          einzelpreis: item.price,
          gesamtpreis: item.quantity * item.price
        }));

        const fixedPreise = {
          zwischensumme: relatedInquiry.total,
          versandkosten: 0,
          mwst: {
            satz: 19,
            betrag: relatedInquiry.total * 0.19 / 1.19
          },
          rabatt: {
            betrag: 0,
            code: '',
            grund: '',
            prozent: 0
          },
          gesamtsumme: relatedInquiry.total
        };

        await Order.findByIdAndUpdate(order._id, {
          artikel: fixedArtikel,
          preise: fixedPreise,
          source: 'inquiry',
          sourceInquiryId: relatedInquiry._id
        });

        // Auch die Anfrage aktualisieren
        if (!relatedInquiry.convertedOrderId) {
          await Inquiry.findByIdAndUpdate(relatedInquiry._id, {
            convertedOrderId: order._id
          });
        }

        console.log(`✅ Verdächtige Bestellung ${order.bestellnummer} repariert`);
      } else {
        console.log(`⚠️ Keine zugehörige Anfrage für Bestellung ${order.bestellnummer} gefunden`);
      }
    }

    console.log(`\n🎉 Migration abgeschlossen!`);
    console.log(`📊 Umgewandelte Anfragen verarbeitet: ${convertedInquiries.length}`);
    console.log(`📊 Verdächtige Bestellungen verarbeitet: ${suspiciousOrders.length}`);

  } catch (error) {
    console.error('❌ Fehler bei Migration:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 MongoDB Verbindung geschlossen');
  }
}

// Script ausführen
fixAllConvertedOrders();