const mongoose = require('mongoose');
const Order = require('../src/models/Order');
const Inquiry = require('../src/models/Inquiry');

require('dotenv').config();

async function diagnoseProblemOrder() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('🔗 Verbunden mit MongoDB');

    // Finde Bestellung mit Nummer BE1760943427868345
    const orderNumber = 'BE1760943427868345';
    const order = await Order.findOne({ bestellnummer: orderNumber });

    if (!order) {
      console.log('❌ Bestellung nicht gefunden:', orderNumber);
      return;
    }

    console.log('\n📋 BESTELLUNGSANALYSE:');
    console.log('='.repeat(50));
    console.log('🆔 ID:', order._id);
    console.log('📝 Bestellnummer:', order.bestellnummer);
    console.log('📊 Status:', order.status);
    console.log('💳 Zahlungsstatus:', order.zahlung?.status);
    console.log('📦 Artikel-Array vorhanden:', !!order.artikel);
    console.log('📦 Artikel-Anzahl:', order.artikel?.length || 0);
    console.log('📦 Items-Array vorhanden:', !!order.items);
    console.log('📦 Items-Anzahl:', order.items?.length || 0);
    console.log('🔗 Source:', order.source);
    console.log('🔗 Source Inquiry ID:', order.sourceInquiryId);

    if (order.artikel && order.artikel.length > 0) {
      console.log('\n📦 ARTIKEL-DATEN:');
      order.artikel.forEach((artikel, index) => {
        console.log(`  Artikel ${index}:`, {
          name: artikel.produktSnapshot?.name || artikel.name || artikel.produktname,
          menge: artikel.menge,
          preis: artikel.einzelpreis
        });
      });
    }

    if (order.items && order.items.length > 0) {
      console.log('\n📦 ITEMS-DATEN:');
      order.items.forEach((item, index) => {
        console.log(`  Item ${index}:`, {
          name: item.name || item.produktname,
          menge: item.menge || item.quantity,
          preis: item.preis || item.price || item.einzelpreis
        });
      });
    }

    // Wenn es eine konvertierte Anfrage ist, schaue nach der Ursprungsanfrage
    if (order.sourceInquiryId) {
      console.log('\n🔍 URSPRUNGSANFRAGE PRÜFEN:');
      console.log('='.repeat(50));
      
      const sourceInquiry = await Inquiry.findById(order.sourceInquiryId);
      if (sourceInquiry) {
        console.log('📝 Anfrage ID:', sourceInquiry._id);
        console.log('📊 Anfrage Status:', sourceInquiry.status);
        console.log('📦 Anfrage Items:', sourceInquiry.items?.length || 0);
        
        if (sourceInquiry.items && sourceInquiry.items.length > 0) {
          console.log('\n📦 ANFRAGE ITEMS-DATEN:');
          sourceInquiry.items.forEach((item, index) => {
            console.log(`  Item ${index}:`, {
              name: item.produktname || item.name,
              menge: item.quantity || item.menge,
              preis: item.price || item.einzelpreis
            });
          });
        }

        // Repariere die Bestellung falls notwendig
        if ((!order.artikel || order.artikel.length === 0) && sourceInquiry.items && sourceInquiry.items.length > 0) {
          console.log('\n🔧 REPARATUR ERFORDERLICH:');
          console.log('='.repeat(50));
          
          const reparierteArtikel = sourceInquiry.items.map(item => ({
            produktSnapshot: {
              name: item.produktname || item.name || 'Unbekanntes Produkt',
              beschreibung: item.beschreibung || ''
            },
            menge: item.quantity || item.menge || 1,
            einzelpreis: item.price || item.einzelpreis || 0
          }));

          order.artikel = reparierteArtikel;
          
          // Auch den Status korrigieren falls notwendig
          if (order.status === 'abgelehnt' && order.zahlung?.status === 'bezahlt') {
            console.log('⚠️ Inkonsistenter Status erkannt - korrigiere...');
            order.status = 'bestätigt';
          }

          await order.save();
          console.log('✅ Bestellung repariert!');
          console.log('📦 Neue Artikel-Anzahl:', order.artikel.length);
          console.log('📊 Neuer Status:', order.status);
        }
      } else {
        console.log('❌ Ursprungsanfrage nicht gefunden');
      }
    }

    console.log('\n✅ Diagnose abgeschlossen');

  } catch (error) {
    console.error('❌ Fehler bei der Diagnose:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Verbindung getrennt');
  }
}

diagnoseProblemOrder();