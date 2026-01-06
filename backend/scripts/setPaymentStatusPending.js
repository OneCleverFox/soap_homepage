const mongoose = require('mongoose');
const Order = require('../src/models/Order');
require('dotenv').config({ path: '.env.development' });

// MongoDB Verbindung aus Environment
const MONGODB_URI = process.env.MONGODB_URI || process.env.MONGO_URI;

async function setPaymentStatusPending() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('🔗 MongoDB verbunden');

    // Bestellung ORDER-1767719431919 suchen und paymentStatus korrigieren
    const order = await Order.findOne({ bestellnummer: 'ORDER-1767719431919' });
    
    if (!order) {
      console.error('❌ Bestellung nicht gefunden');
      return;
    }

    console.log(`✅ Bestellung gefunden: ${order.bestellnummer}`);
    console.log(`   - Aktueller PaymentStatus: ${order.paymentStatus || 'nicht gesetzt'}`);
    
    // PaymentStatus explizit setzen
    order.paymentStatus = 'pending';
    
    await order.save();
    
    console.log(`✅ PaymentStatus gesetzt: ${order.paymentStatus}`);
    console.log('\n📋 Jetzt ist alles korrekt:');
    console.log(`   - Status: ${order.status} (Bestellung eingegangen)`);
    console.log(`   - PaymentStatus: ${order.paymentStatus} (Zahlung ausstehend)`);

  } catch (error) {
    console.error('❌ Fehler beim Setzen des PaymentStatus:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔗 MongoDB Verbindung geschlossen');
  }
}

// Script ausführen
setPaymentStatusPending().catch(console.error);