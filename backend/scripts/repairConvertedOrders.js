// Script zum Reparieren von konvertierten Bestellungen
const mongoose = require('mongoose');
const Order = require('../src/models/Order');
const Inquiry = require('../src/models/Inquiry');
const Kunde = require('../src/models/Kunde');

require('dotenv').config({ path: '.env.development' });

async function repairConvertedOrders() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('🔗 Mit MongoDB verbunden');

    // Finde alle Bestellungen (erst mal alle anzeigen)
    const allOrders = await Order.find({});
    
    console.log('\n📋 Alle Bestellungen:');
    allOrders.forEach((order, i) => {
      console.log(`${i+1}. ${order.bestellnummer || order.orderId || 'NO_NUMBER'} - Status: ${order.status} - Source: ${order.source || 'undefined'} - Kunde: ${order.besteller?.email || 'NO_EMAIL'}`);
    });

    // Finde alle Bestellungen, die aus Anfragen konvertiert wurden ODER Status bestätigt haben
    const convertedOrders = await Order.find({ 
      $or: [
        { source: 'inquiry' },
        { sourceInquiryId: { $exists: true } },
        { status: 'bestaetigt' } // Wahrscheinlich konvertierte Bestellungen
      ]
    });

    console.log(`📦 Gefunden: ${convertedOrders.length} konvertierte Bestellungen`);

    for (const order of convertedOrders) {
      console.log(`\n🔧 Repariere Bestellung: ${order.orderId}`);
      
      let needsUpdate = false;
      const updates = {};

      // 1. Bestellnummer hinzufügen falls fehlt
      if (!order.bestellnummer) {
        updates.bestellnummer = order.orderId;
        needsUpdate = true;
        console.log('   ✅ Bestellnummer hinzugefügt');
      }

      // 2. Status prüfen und korrigieren
      if (order.status !== 'bestaetigt') {
        updates.status = 'bestaetigt';
        needsUpdate = true;
        console.log(`   ✅ Status korrigiert: ${order.status} → bestaetigt`);
      }

      // 3. Zahlung-Status prüfen
      if (!order.zahlung || order.zahlung.status !== 'ausstehend') {
        updates.zahlung = {
          ...order.zahlung,
          status: 'ausstehend',
          methode: 'paypal'
        };
        needsUpdate = true;
        console.log('   ✅ Zahlung-Status korrigiert');
      }

      // 4. Kundennummer im besteller hinzufügen
      if (order.kunde && (!order.besteller || !order.besteller.kundennummer)) {
        const kunde = await Kunde.findById(order.kunde);
        if (kunde) {
          updates.besteller = {
            ...order.besteller,
            kundennummer: kunde.kundennummer,
            vorname: kunde.vorname || kunde.name?.split(' ')[0] || '',
            nachname: kunde.nachname || kunde.name?.split(' ')[1] || '',
            email: kunde.email,
            telefon: kunde.telefon || ''
          };
          needsUpdate = true;
          console.log(`   ✅ Besteller-Daten ergänzt (Kundennummer: ${kunde.kundennummer})`);
        }
      }

      // Update durchführen
      if (needsUpdate) {
        await Order.findByIdAndUpdate(order._id, updates);
        console.log('   💾 Bestellung aktualisiert');
      } else {
        console.log('   ✨ Bestellung bereits korrekt');
      }
    }

    console.log('\n🎉 Reparatur abgeschlossen!');
    process.exit(0);

  } catch (error) {
    console.error('❌ Fehler beim Reparieren:', error);
    process.exit(1);
  }
}

repairConvertedOrders();