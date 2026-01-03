const mongoose = require('mongoose');
const path = require('path');

// Modell laden
const Invoice = require('./backend/src/models/Invoice');

async function testInvoices() {
  try {
    // Verbindung zur DB
    const mongoUri = process.env.MONGODB_URI || 'mongodb+srv://ralfjacob84:sV6bDNT7CChBJkOD@soap.eybn71b.mongodb.net/gluecksmomente?retryWrites=true&w=majority&appName=soap';
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to Database');
    
    // Alle Rechnungen von 2026
    const invoices2026 = await Invoice.find({
      'dates.invoiceDate': {
        $gte: new Date('2026-01-01'),
        $lte: new Date('2026-12-31')
      }
    });
    
    console.log('\n=== Rechnungen 2026 ===');
    console.log(`Gefunden: ${invoices2026.length} Rechnungen`);
    
    invoices2026.forEach(inv => {
      console.log(`Nummer: ${inv.invoiceNumber}`);
      console.log(`Status: ${inv.status}`);
      console.log(`Datum: ${inv.dates.invoiceDate}`);
      console.log(`Betrag: ${inv.amounts.total}€`);
      console.log(`Payment: ${JSON.stringify(inv.payment)}`);
      console.log('---');
    });
    
    // Prüfe Filter für Dashboard (letzte 30 Tage)
    const last30Days = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    console.log(`\n30 Tage zurück: ${last30Days.toISOString()}`);
    console.log(`Heute: ${new Date().toISOString()}`);
    
    const recentInvoices = await Invoice.find({
      'dates.invoiceDate': { $gte: last30Days }
    });
    
    console.log('\n=== Rechnungen letzte 30 Tage ===');
    console.log(`Gefunden: ${recentInvoices.length} Rechnungen`);
    
    recentInvoices.forEach(inv => {
      console.log(`Nummer: ${inv.invoiceNumber}, Status: ${inv.status}, Datum: ${inv.dates.invoiceDate}, Betrag: ${inv.amounts.total}€`);
    });
    
    // Test Revenue-Filter
    console.log('\n=== Revenue-relevante Rechnungen (letzte 30 Tage) ===');
    
    const revenueInvoices = await Invoice.find({
      'dates.invoiceDate': { $gte: last30Days },
      $or: [
        // Reguläre Rechnungen (sent, paid, pending)
        { status: { $in: ['sent', 'paid', 'pending'] } },
        // Bezahlte Entwürfe
        { 
          status: 'draft', 
          $or: [
            { 'payment.paidAmount': { $gt: 0 } },
            { 'payment.paidDate': { $exists: true } },
            { 'payment.method': { $in: ['bar', 'paypal', 'bank_transfer'] } }
          ]
        }
      ]
    });
    
    console.log(`Gefunden: ${revenueInvoices.length} revenue-relevante Rechnungen`);
    
    revenueInvoices.forEach(inv => {
      console.log(`Nummer: ${inv.invoiceNumber}, Status: ${inv.status}, Datum: ${inv.dates.invoiceDate}, Betrag: ${inv.amounts.total}€`);
    });
    
    await mongoose.disconnect();
    console.log('\n✅ Test completed');
    
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

testInvoices();