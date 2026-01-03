const mongoose = require('mongoose');
const Invoice = require('./backend/src/models/Invoice');

mongoose.connect('mongodb+srv://admin:74QjdxxtZe3rn7gy@cluster0.utdvz.mongodb.net/soaps_database?retryWrites=true&w=majority&tlsAllowInvalidCertificates=true')
  .then(async () => {
    console.log('✅ MongoDB verbunden');
    
    const heute = new Date();
    const einMonatZurueck = new Date(heute.getTime() - 30 * 24 * 60 * 60 * 1000);
    
    console.log('\n=== ALLE RECHNUNGEN ===');
    const alleRechnungen = await Invoice.find({}).sort({ 'dates.invoiceDate': -1 });
    
    alleRechnungen.forEach(inv => {
      const invoiceDate = inv.dates.invoiceDate;
      const isInLast30Days = invoiceDate >= einMonatZurueck;
      
      console.log(`${inv.invoiceNumber}:`);
      console.log(`  - Betrag: ${inv.amounts.total}€`);
      console.log(`  - Status: ${inv.status}`);
      console.log(`  - Datum: ${invoiceDate.toISOString().split('T')[0]} (in letzten 30 Tagen: ${isInLast30Days})`);
      console.log(`  - PaymentMethod: ${inv.payment?.method || 'none'}`);
      console.log(`  - PaidAmount: ${inv.payment?.paidAmount || 0}`);
      console.log(`  - PaidDate: ${inv.payment?.paidDate || 'none'}`);
      console.log('');
    });
    
    console.log('\n=== DASHBOARD FILTER TEST ===');
    console.log(`30-Tage Grenze: ${einMonatZurueck.toISOString().split('T')[0]}`);
    
    // Test des aktuellen Dashboard-Filters
    const umsatzFilter = {
      'dates.invoiceDate': { $gte: einMonatZurueck },
      $or: [
        { status: { $in: ['sent', 'paid', 'pending'] } },
        { 
          status: 'draft', 
          $or: [
            { 'payment.paidAmount': { $gt: 0 } },
            { 'payment.paidDate': { $exists: true } },
            { 'payment.method': { $in: ['bar', 'paypal', 'bank_transfer'] } }
          ]
        }
      ]
    };
    
    const umsatzRechnungen = await Invoice.find(umsatzFilter);
    
    console.log('\n=== RECHNUNGEN IM UMSATZ-FILTER ===');
    let gesamtUmsatz = 0;
    umsatzRechnungen.forEach(inv => {
      console.log(`${inv.invoiceNumber}: ${inv.amounts.total}€ (Status: ${inv.status}, Method: ${inv.payment?.method})`);
      gesamtUmsatz += inv.amounts.total;
    });
    
    console.log(`\nGESAMTUMSATZ: ${gesamtUmsatz}€`);
    console.log(`ERWARTETER UMSATZ: 23.50€`);
    
    if (gesamtUmsatz !== 23.50) {
      console.log('\n=== PROBLEM GEFUNDEN ===');
      console.log('Eine oder beide Rechnungen werden nicht korrekt erfasst!');
    }
    
    process.exit(0);
  })
  .catch(console.error);