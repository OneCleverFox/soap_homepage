// Inquiry creation logic for checkout inquiry mode
const createInquiryFromOrder = async (req, validierteArtikel, besteller, rechnungsadresse, lieferadresse, preise, notizen, quelle, bestellnummer) => {
  console.log('📝 Anfrage-Modus: Erstelle Anfrage statt Bestellung');
  
  // Bestellung als Anfrage in Inquiry-Collection speichern
  const Inquiry = require('../models/Inquiry');
  
  const inquiryData = {
    status: 'pending',
    type: 'product_order',
    customer: {
      email: besteller.email,
      vorname: besteller.vorname,
      nachname: besteller.nachname,
      telefon: besteller.telefon || ''
    },
    items: validierteArtikel.map(artikel => ({
      produktId: artikel.produktId,
      name: artikel.produktSnapshot.name,
      menge: artikel.menge,
      einzelpreis: artikel.einzelpreis,
      gesamtpreis: artikel.gesamtpreis
    })),
    addresses: {
      billing: rechnungsadresse,
      shipping: lieferadresse.verwendeRechnungsadresse ? rechnungsadresse : lieferadresse
    },
    pricing: preise,
    notes: notizen?.kunde || '',
    source: quelle || 'website',
    requestedOrderNumber: bestellnummer,
    submittedAt: new Date()
  };
  
  const neueAnfrage = new Inquiry(inquiryData);
  await neueAnfrage.save();
  
  console.log('✅ Anfrage erstellt:', neueAnfrage._id);
  
  return {
    success: true,
    message: 'Ihre Anfrage wurde erfolgreich übermittelt',
    type: 'inquiry',
    data: {
      inquiryId: neueAnfrage._id,
      requestedOrderNumber: bestellnummer,
      status: 'pending'
    }
  };
};

module.exports = { createInquiryFromOrder };