const mongoose = require('mongoose');
const Order = require('../src/models/Order');
const Inquiry = require('../src/models/Inquiry');
const Bestand = require('../src/models/Bestand');
require('dotenv').config({ path: '.env.development' });

// MongoDB Verbindung aus Environment
const MONGODB_URI = process.env.MONGODB_URI || process.env.MONGO_URI;

async function createOrderFromInquiry() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('🔗 MongoDB verbunden');

    // Inquiry mit der ID INQ-MK2TCXHQ-IQTG8 suchen
    const inquiryId = 'INQ-MK2TCXHQ-IQTG8';
    const inquiry = await Inquiry.findOne({ inquiryId });

    if (!inquiry) {
      console.error(`❌ Inquiry ${inquiryId} nicht gefunden`);
      return;
    }

    console.log(`✅ Inquiry gefunden: ${inquiry.inquiryId}`);
    console.log(`📊 Status: ${inquiry.status}`);
    console.log(`📊 Artikel: ${inquiry.items?.length || 0}`);
    console.log(`📊 Total: ${inquiry.total}€`);

    // Prüfen ob bereits eine Bestellung existiert
    if (inquiry.convertedOrderId) {
      let existingOrder = await Order.findById(inquiry.convertedOrderId);
      
      // Falls nicht mit ObjectId gefunden, mit Bestellnummer versuchen
      if (!existingOrder && typeof inquiry.convertedOrderId === 'string') {
        existingOrder = await Order.findOne({ bestellnummer: inquiry.convertedOrderId });
      }
      
      if (existingOrder) {
        console.log(`⚠️ Bestellung existiert bereits: ${existingOrder.bestellnummer}`);
        
        // Automatische Rechnungserstellung für existierende Bestellung
        try {
          const orderInvoiceService = require('../src/services/orderInvoiceService');
          console.log('🧾 Erstelle Rechnung für existierende Bestellung:', existingOrder._id);
          const invoiceResult = await orderInvoiceService.generateInvoiceForOrder(existingOrder._id);
          
          if (invoiceResult.success) {
            console.log('✅ Rechnung automatisch erstellt:', invoiceResult.invoiceNumber);
          } else {
            console.error('❌ Fehler bei automatischer Rechnungserstellung:', invoiceResult.error);
          }
        } catch (invoiceError) {
          console.error('❌ Fehler bei automatischer Rechnungserstellung:', invoiceError);
        }
        
        return;
      }
    }

    // Prüfen ob inquiry.status korrekt ist
    if (inquiry.status !== 'accepted') {
      console.log(`⚠️ Inquiry Status ist ${inquiry.status}, setze auf 'accepted'`);
      inquiry.status = 'accepted';
      await inquiry.save();
    }

    // Artikel für Bestellung formatieren
    const artikelMitBestand = [];
    for (const item of inquiry.items) {
      artikelMitBestand.push({
        produktId: item.productId,
        produktType: item.produktType || 'rohseife',
        produktSnapshot: {
          name: item.name,
          beschreibung: '',
          bild: item.image || ''
        },
        menge: item.quantity,
        einzelpreis: item.price,
        gesamtpreis: item.quantity * item.price
      });
    }

    // Bestellnummer generieren
    const bestellnummer = `ORDER-${Date.now()}`;
    
    // Neue Bestellung erstellen
    const neueBestellung = new Order({
      bestellnummer: bestellnummer,
      besteller: {
        vorname: inquiry.rechnungsadresse?.vorname || inquiry.customer.name?.split(' ')[0] || 'Unbekannt',
        nachname: inquiry.rechnungsadresse?.nachname || inquiry.customer.name?.split(' ').slice(1).join(' ') || '',
        email: inquiry.customer.email,
        telefon: ''
      },
      rechnungsadresse: inquiry.rechnungsadresse || {
        strasse: 'Unbekannt',
        hausnummer: '0',
        plz: '00000',
        stadt: 'Unbekannt',
        land: 'Deutschland'
      },
      lieferadresse: {
        verwendeRechnungsadresse: true,
        firma: '',
        strasse: '',
        hausnummer: '',
        zusatz: '',
        plz: '',
        stadt: '',
        land: 'Deutschland'
      },
      artikel: artikelMitBestand,
      preise: {
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
      },
      status: 'bestaetigt',
      zahlungsart: 'rechnung',
      zahlung: {
        status: 'ausstehend',
        methode: 'ueberweisung'
      },
      source: 'inquiry',
      sourceInquiryId: inquiry._id,
      createdAt: inquiry.createdAt,
      updatedAt: inquiry.updatedAt
    });

    await neueBestellung.save();
    console.log(`✅ Bestellung ${bestellnummer} aus Anfrage erstellt`);

    // Automatische Rechnungserstellung
    try {
      const orderInvoiceService = require('../src/services/orderInvoiceService');
      console.log('🧾 Erstelle Rechnung für konvertierte Bestellung:', neueBestellung._id);
      const invoiceResult = await orderInvoiceService.generateInvoiceForOrder(neueBestellung._id);
      
      if (invoiceResult.success) {
        console.log('✅ Rechnung automatisch erstellt:', invoiceResult.invoiceNumber);
      } else {
        console.error('❌ Fehler bei automatischer Rechnungserstellung:', invoiceResult.error);
      }
    } catch (invoiceError) {
      console.error('❌ Fehler bei automatischer Rechnungserstellung:', invoiceError);
    }

    // Inquiry als konvertiert markieren
    inquiry.status = 'converted_to_order';
    inquiry.convertedOrderId = neueBestellung._id;
    await inquiry.save();

    console.log(`✅ Inquiry erfolgreich zu Bestellung konvertiert:`);
    console.log(`   - Inquiry ID: ${inquiry.inquiryId}`);
    console.log(`   - Bestellung: ${neueBestellung.bestellnummer}`);
    console.log(`   - Status: ${inquiry.status}`);
    console.log(`   - Total: ${neueBestellung.preise.gesamtsumme}€`);

  } catch (error) {
    console.error('❌ Fehler beim Erstellen der Bestellung:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔗 MongoDB Verbindung geschlossen');
  }
}

// Script ausführen
createOrderFromInquiry().catch(console.error);