const mongoose = require('mongoose');
require('dotenv').config();

mongoose.connect(process.env.MONGODB_URI).then(async () => {
  const db = mongoose.connection.db;
  
  console.log('🔍 Suche nach 2026-Rechnung...');
  const invoice = await db.collection('invoices').findOne({ invoiceNumber: '2026-000001' });
  
  if (invoice) {
    console.log('📄 Gefundene Rechnung:');
    console.log('  Nr:', invoice.invoiceNumber);
    console.log('  Status:', invoice.status);
    console.log('  Payment vor Update:', JSON.stringify(invoice.payment, null, 2));
    
    // Payment Status auf 'paid' setzen
    const updateResult = await db.collection('invoices').updateOne(
      { _id: invoice._id },
      { 
        $set: { 
          'payment.status': 'paid',
          'payment.paidDate': new Date(),
          'payment.method': 'bar'
        }
      }
    );
    
    console.log('✅ Update result:', updateResult);
    
    const updatedInvoice = await db.collection('invoices').findOne({ _id: invoice._id });
    console.log('📄 Aktualisierte Rechnung Payment:', JSON.stringify(updatedInvoice.payment, null, 2));
  } else {
    console.log('❌ Rechnung nicht gefunden');
  }
  
  process.exit(0);
}).catch(console.error);