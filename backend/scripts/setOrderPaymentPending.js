const mongoose = require('mongoose');
const Order = require('../src/models/Order');
const Inquiry = require('../src/models/Inquiry');
require('dotenv').config({ path: '.env.development' });

// MongoDB Verbindung aus Environment
const MONGODB_URI = process.env.MONGODB_URI || process.env.MONGO_URI;

async function setOrderPaymentPending() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('🔗 MongoDB verbunden');

    // Bestellung mit der Nummer ORDER-1767719431919 suchen
    const bestellnummer = 'ORDER-1767719431919';
    const order = await Order.findOne({ bestellnummer });

    if (!order) {
      console.error(`❌ Bestellung ${bestellnummer} nicht gefunden`);
      return;
    }

    console.log(`✅ Bestellung gefunden: ${order.bestellnummer}`);
    console.log(`📊 Aktueller Status: ${order.status}`);
    console.log(`📊 Aktueller Zahlungsstatus: ${order.zahlung?.status}`);
    console.log(`📊 Gesamtsumme: ${order.preise?.gesamtsumme}€`);

    // Bestellung auf Zahlungsaufforderung setzen
    order.status = 'bestaetigt'; // Bestellung bestätigt, warten auf Zahlung
    order.zahlung = {
      status: 'ausstehend',
      methode: 'ueberweisung'
    };
    
    await order.save();
    console.log(`✅ Bestellung Status aktualisiert auf: ${order.status}`);
    console.log(`✅ Zahlungsstatus aktualisiert auf: ${order.zahlung.status}`);

    // Zugehörige Inquiry finden und aktualisieren
    let inquiry = await Inquiry.findById(order.sourceInquiryId);
    
    if (!inquiry) {
      console.log('⚠️ Inquiry nicht über sourceInquiryId gefunden, versuche über inquiryId...');
      // Fallback: Suche über inquiryId
      inquiry = await Inquiry.findOne({ inquiryId: 'INQ-MK2TCXHQ-IQTG8' });
    }
    
    if (!inquiry) {
      console.error('❌ Zugehörige Inquiry nicht gefunden');
      return;
    }

    console.log(`✅ Inquiry gefunden: ${inquiry.inquiryId}`);
    console.log(`📊 Aktueller Inquiry Status: ${inquiry.status}`);
    console.log(`📊 Aktueller Payment Status: ${inquiry.payment?.status}`);

    // Inquiry Status so setzen, dass Kunde Zahlung sieht
    inquiry.status = 'converted_to_order'; // Status bleibt converted_to_order
    inquiry.payment = {
      status: 'pending', // Zahlung ausstehend - so erkennt Frontend dass Zahlung erforderlich ist
      method: 'bank_transfer',
      amount: order.preise?.gesamtsumme || 0
    };
    
    // Zusätzliche Felder für bessere Nachverfolgung
    inquiry.paymentRequired = true;
    inquiry.paymentDueDate = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000); // 14 Tage Zahlungsfrist
    
    await inquiry.save();
    console.log(`✅ Inquiry Payment Status aktualisiert auf: ${inquiry.payment.status}`);
    console.log(`📅 Zahlungsfrist gesetzt auf: ${inquiry.paymentDueDate?.toLocaleDateString('de-DE')}`);

    console.log(`\n🎯 Zusammenfassung:`);
    console.log(`   - Bestellung: ${order.bestellnummer}`);
    console.log(`   - Bestellstatus: ${order.status}`);
    console.log(`   - Zahlungsstatus Bestellung: ${order.zahlung.status}`);
    console.log(`   - Inquiry: ${inquiry.inquiryId}`);
    console.log(`   - Inquiry Status: ${inquiry.status}`);
    console.log(`   - Payment Status: ${inquiry.payment.status}`);
    console.log(`   - Gesamtsumme: ${order.preise?.gesamtsumme}€`);
    console.log(`   - Zahlungsfrist: ${inquiry.paymentDueDate?.toLocaleDateString('de-DE')}`);

    console.log(`\n✅ Der Kunde kann jetzt im Anfragen-Manager die Zahlungsaufforderung sehen!`);

  } catch (error) {
    console.error('❌ Fehler beim Aktualisieren der Zahlungsaufforderung:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔗 MongoDB Verbindung geschlossen');
  }
}

// Script ausführen
setOrderPaymentPending().catch(console.error);