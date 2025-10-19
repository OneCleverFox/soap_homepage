const express = require('express');
const router = express.Router();
const Order = require('../models/Order');
const Kunde = require('../models/Kunde');
const Portfolio = require('../models/Portfolio');
const PayPalService = require('../services/PayPalService');

// 🛒 Neue Bestellung erstellen
router.post('/create', async (req, res) => {
  try {
    console.log('🛒 Neue Bestellung wird erstellt');
    console.log('📦 Request Body:', JSON.stringify(req.body, null, 2));
    
    const {
      artikel,
      besteller,
      rechnungsadresse,
      lieferadresse,
      preise,
      zahlung,
      notizen,
      status,
      quelle
    } = req.body;

    // Validierung
    if (!artikel || artikel.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Keine Artikel in der Bestellung'
      });
    }

    if (!besteller || !besteller.vorname || !besteller.nachname) {
      return res.status(400).json({
        success: false,
        message: 'Bestellerdaten unvollständig'
      });
    }

    if (!rechnungsadresse || !rechnungsadresse.strasse || !rechnungsadresse.plz) {
      return res.status(400).json({
        success: false,
        message: 'Rechnungsadresse unvollständig'
      });
    }

    // Artikel validieren
    const validierteArtikel = [];

    for (const artikelItem of artikel) {
      // Artikel aus Datenbank laden
      const dbArtikel = await Portfolio.findById(artikelItem.produktId);
      
      if (!dbArtikel) {
        return res.status(400).json({
          success: false,
          message: `Artikel ${artikelItem.produktSnapshot?.name || 'Unbekannt'} nicht gefunden`
        });
      }

      // Validierter Artikel für Order-Schema
      validierteArtikel.push({
        produktType: artikelItem.produktType || 'portfolio',
        produktId: dbArtikel._id,
        produktSnapshot: {
          name: dbArtikel.name,
          beschreibung: dbArtikel.beschreibung || '',
          kategorie: dbArtikel.kategorie || '',
          bild: dbArtikel.bild || '',
          gewicht: dbArtikel.gewicht,
          inhaltsstoffe: dbArtikel.inhaltsstoffe || []
        },
        menge: artikelItem.menge,
        einzelpreis: dbArtikel.preis,
        gesamtpreis: dbArtikel.preis * artikelItem.menge
      });
    }

    // Bestellnummer generieren
    const bestellnummer = `BE${Date.now()}`;

    // Bestellung erstellen nach Order-Schema
    const neueBestellung = new Order({
      bestellnummer,
      bestelldatum: new Date(),
      
      // Besteller-Informationen
      besteller: {
        email: besteller.email,
        vorname: besteller.vorname,
        nachname: besteller.nachname,
        telefon: besteller.telefon || '',
        kundennummer: besteller.kundennummer || ''
      },
      
      // Rechnungsadresse
      rechnungsadresse: {
        strasse: rechnungsadresse.strasse,
        hausnummer: rechnungsadresse.hausnummer,
        zusatz: rechnungsadresse.zusatz || '',
        plz: rechnungsadresse.plz,
        stadt: rechnungsadresse.stadt,
        land: rechnungsadresse.land || 'Deutschland'
      },
      
      // Lieferadresse
      lieferadresse: lieferadresse.verwendeRechnungsadresse ? {
        verwendeRechnungsadresse: true
      } : {
        verwendeRechnungsadresse: false,
        strasse: lieferadresse.strasse || '',
        hausnummer: lieferadresse.hausnummer || '',
        zusatz: lieferadresse.zusatz || '',
        plz: lieferadresse.plz || '',
        stadt: lieferadresse.stadt || '',
        land: lieferadresse.land || 'Deutschland'
      },
      
      // Artikel
      artikel: validierteArtikel,
      
      // Preise
      preise: {
        zwischensumme: preise.zwischensumme,
        versandkosten: preise.versandkosten,
        mwst: {
          satz: preise.mwst.satz,
          betrag: preise.mwst.betrag
        },
        gesamtsumme: preise.gesamtsumme
      },
      
      // Status
      status: status || 'neu',
      
      // Zahlung
      zahlung: {
        methode: zahlung.methode,
        status: 'ausstehend'
      },
      
      // Notizen
      notizen: {
        kunde: notizen?.kunde || ''
      },
      
      // Quelle
      quelle: quelle || 'website'
    });

    console.log('💾 Speichere Bestellung:', bestellnummer);
    await neueBestellung.save();
    console.log('✅ Bestellung gespeichert');

    // PayPal-Payment erstellen
    console.log('💰 Erstelle PayPal-Payment...');
    const paypalUrl = await PayPalService.createPayment({
      amount: preise.gesamtsumme,
      description: `Bestellung ${bestellnummer}`,
      orderId: neueBestellung._id
    });

    console.log('🔗 PayPal URL erstellt:', paypalUrl);

    res.json({
      success: true,
      message: 'Bestellung erfolgreich erstellt',
      data: {
        orderId: neueBestellung._id,
        bestellnummer: neueBestellung.bestellnummer,
        paypalUrl: paypalUrl
      }
    });

  } catch (error) {
    console.error('❌ Fehler beim Erstellen der Bestellung:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Erstellen der Bestellung',
      error: error.message
    });
  }
});

module.exports = router;