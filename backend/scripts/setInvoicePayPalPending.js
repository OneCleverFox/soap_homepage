const mongoose = require('mongoose');
const Invoice = require('../src/models/Invoice');
require('dotenv').config({ path: '.env.development' });

// MongoDB Verbindung aus Environment
const MONGODB_URI = process.env.MONGODB_URI || process.env.MONGO_URI;

async function setInvoicePayPalPending() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('🔗 MongoDB verbunden');

    // Rechnung 2026-000002 finden
    const invoice = await Invoice.findOne({ invoiceNumber: '2026-000002' });
    if (!invoice) {
      console.error('❌ Rechnung 2026-000002 nicht gefunden');
      return;
    }

    console.log('✅ Rechnung 2026-000002 gefunden');
    console.log(`   - Aktueller Status: ${invoice.status}`);
    console.log(`   - Aktuelle Zahlungsmethode: ${invoice.payment.method}`);
    console.log(`   - Gesamtsumme: ${invoice.amounts.total}€`);

    // Status und Zahlungsmethode für PayPal-Zahlung setzen
    invoice.status = 'sent'; // Rechnung versendet, Zahlung ausstehend
    invoice.payment.method = 'paypal'; // PayPal als Zahlungsmethode
    invoice.payment.paidDate = null; // Noch nicht bezahlt
    invoice.payment.paidAmount = 0; // Noch kein Betrag erhalten
    invoice.payment.paymentReference = null; // Keine PayPal-Transaktions-ID

    // Notizen für den Kunden hinzufügen
    invoice.notes.customer = 'Bitte bezahlen Sie diese Rechnung über PayPal. Sie erhalten eine separate PayPal-Zahlungsaufforderung.';
    
    // Interne Notiz für Admin
    invoice.notes.internal = `PayPal-Zahlung ausstehend. Kunde muss noch über PayPal bezahlen. Keine Gutschrift erhalten (Stand: ${new Date().toLocaleDateString('de-DE')}).`;

    await invoice.save();

    console.log('\n✅ Rechnung erfolgreich für PayPal-Zahlung konfiguriert:');
    console.log(`   - Status: ${invoice.status} (Rechnung versendet, Zahlung über PayPal ausstehend)`);
    console.log(`   - Zahlungsmethode: ${invoice.payment.method}`);
    console.log(`   - Zahlungsstatus: Noch nicht bezahlt`);
    console.log(`   - Kundennotiz: "${invoice.notes.customer}"`);
    console.log(`   - Gesamtsumme: ${invoice.amounts.total}€`);
    console.log(`   - Fälligkeitsdatum: ${invoice.dates.dueDate.toLocaleDateString('de-DE')}`);
    
    console.log('\n📋 Für den Kunden sichtbar:');
    console.log('   ✅ Status "sent" = Rechnung erhalten, Zahlung erforderlich');
    console.log('   ✅ Zahlungsmethode "PayPal" = Zahlung über PayPal erforderlich');
    console.log('   ✅ Kundennotiz erklärt PayPal-Zahlungsverfahren');
    console.log('   ✅ Offener Betrag ist klar ersichtlich');

  } catch (error) {
    console.error('❌ Fehler beim Konfigurieren der PayPal-Zahlung:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔗 MongoDB Verbindung geschlossen');
  }
}

// Script ausführen
setInvoicePayPalPending().catch(console.error);