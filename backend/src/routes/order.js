const express = require('express');
const router = express.Router();
const Order = require('../models/Order');
const Kunde = require('../models/Kunde');
const Portfolio = require('../models/Portfolio');
const PayPalService = require('../services/PayPalService');

// 🎯 PayPal-Erfolg: Bestellung finalisieren
router.post('/paypal-success', async (req, res) => {
  try {
    const { paypalOrderId, bestellungData } = req.body;
    
    // Prüfe, ob Bestellung bereits existiert (wegen React StrictMode doppelte Aufrufe)
    const existierendeBestellung = await Order.findOne({ 
      bestellnummer: bestellungData.bestellnummer 
    });
    
    if (existierendeBestellung) {
      console.log('ℹ️ Bestellung bereits vorhanden:', bestellungData.bestellnummer);
      return res.json({
        success: true,
        message: 'Bestellung bereits abgeschlossen',
        data: {
          orderId: existierendeBestellung._id,
          bestellnummer: existierendeBestellung.bestellnummer
        }
      });
    }
    
    // PayPal-Zahlung erfassen
    console.log('💰 PayPal-Zahlung erfasst:', paypalOrderId);
    const captureResult = await PayPalService.capturePayment(paypalOrderId);
    
    if (captureResult.status === 'COMPLETED') {
      // Jetzt erst die Bestellung in der DB speichern mit Duplicate-Protection
      try {
        const neueBestellung = new Order({
          ...bestellungData,
          zahlung: {
            ...bestellungData.zahlung,
            status: 'bezahlt',
            paypalOrderId: paypalOrderId,
            transactionId: captureResult.id
          }
        });
        
        await neueBestellung.save();
        console.log('✅ Bestellung nach PayPal-Erfolg gespeichert:', bestellungData.bestellnummer);
        
        res.json({
          success: true,
          message: 'Bestellung erfolgreich abgeschlossen',
          data: neueBestellung
        });
      } catch (dbError) {
        // Duplicate-Key-Error behandeln (React StrictMode führt zu mehrfachen Aufrufen)
        if (dbError.code === 11000 && dbError.keyValue?.orderNumber) {
          console.log('🔄 Duplicate-Key-Error abgefangen, Bestellung bereits vorhanden:', bestellungData.bestellnummer);
          
          // Existierende Bestellung finden und zurückgeben
          const existierendeBestellung = await Order.findOne({ 
            bestellnummer: bestellungData.bestellnummer 
          });
          
          return res.json({
            success: true,
            message: 'Bestellung bereits erfolgreich abgeschlossen',
            data: existierendeBestellung
          });
        }
        // Andere DB-Fehler weiterwerfen
        throw dbError;
      }
    } else {
      res.status(400).json({
        success: false,
        message: 'PayPal-Zahlung wurde nicht erfolgreich abgeschlossen'
      });
    }
    
  } catch (error) {
    console.error('❌ Fehler beim Abschließen der Bestellung:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Abschließen der Bestellung: ' + error.message
    });
  }
});

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

    // Bestellnummer generieren (eindeutig mit Zeitstempel + Random)
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    const bestellnummer = `BE${timestamp}${random}`;
    
    console.log('🔢 Generierte Bestellnummer:', bestellnummer);

    // ⚠️ NEUER FLOW: Bestellung NICHT sofort in DB speichern!
    // Erst PayPal erstellen, dann nach Erfolg speichern
    
    // Bestellungsdaten für später vorbereiten
    const bestellungData = {
      orderNumber: bestellnummer,
      bestellnummer,
      bestelldatum: new Date(),
      artikel: validierteArtikel,
      besteller: {
        email: besteller.email,
        vorname: besteller.vorname,
        nachname: besteller.nachname,
        telefon: besteller.telefon || '',
        kundennummer: besteller.kundennummer || ''
      },
      rechnungsadresse: {
        strasse: rechnungsadresse.strasse,
        hausnummer: rechnungsadresse.hausnummer,
        zusatz: rechnungsadresse.zusatz || '',
        plz: rechnungsadresse.plz,
        stadt: rechnungsadresse.stadt,
        land: rechnungsadresse.land || 'Deutschland'
      },
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
      preise: {
        zwischensumme: preise.zwischensumme,
        versandkosten: preise.versandkosten,
        mwst: {
          satz: preise.mwst.satz,
          betrag: preise.mwst.betrag
        },
        gesamtsumme: preise.gesamtsumme
      },
      zahlung: {
        methode: zahlung.methode,
        status: 'ausstehend'
      },
      notizen: {
        kunde: notizen?.kunde || ''
      },
      quelle: quelle || 'website'
    };

    console.log('� Erstelle PayPal-Payment (ohne DB-Speicherung)...');
    
    // Formatiere Artikel für PayPal Service
    const paypalArtikel = validierteArtikel.map(artikel => ({
      name: artikel.produktSnapshot.name,
      beschreibung: artikel.produktSnapshot.beschreibung || '',
      preis: artikel.einzelpreis,
      menge: artikel.menge
    }));

    console.log('🔍 PayPal Artikel vor Übertragung:', JSON.stringify(paypalArtikel, null, 2));

    // Bestimme Lieferadresse (bei "verwendeRechnungsadresse" nutze Rechnungsadresse)
    const lieferadresseData = lieferadresse.verwendeRechnungsadresse ? {
      vorname: besteller.vorname,
      nachname: besteller.nachname,
      strasse: rechnungsadresse.strasse,
      hausnummer: rechnungsadresse.hausnummer,
      zusatz: rechnungsadresse.zusatz || '',
      plz: rechnungsadresse.plz,
      stadt: rechnungsadresse.stadt,
      land: rechnungsadresse.land || 'Deutschland'
    } : {
      vorname: besteller.vorname, // Fallback zu Besteller-Namen wenn Lieferadresse keine Namen hat
      nachname: besteller.nachname,
      strasse: lieferadresse.strasse,
      hausnummer: lieferadresse.hausnummer,
      zusatz: lieferadresse.zusatz || '',
      plz: lieferadresse.plz,
      stadt: lieferadresse.stadt,
      land: lieferadresse.land || 'Deutschland'
    };

    const paypalOrderData = {
      bestellnummer: bestellnummer,
      artikel: paypalArtikel,
      versandkosten: preise.versandkosten,
      gesamt: {
        netto: preise.zwischensumme,
        mwst: preise.mwst.betrag,
        brutto: preise.gesamtsumme
      },
      lieferadresse: lieferadresseData,
      bestellnummer: bestellnummer // Wichtig für PayPal-Referenz
    };

    const paypalResult = await PayPalService.createPayment(paypalOrderData);

    console.log('🔗 PayPal Result erstellt:', paypalResult);

    res.json({
      success: true,
      message: 'PayPal-Zahlung vorbereitet - Bestellung wird nach Erfolg gespeichert',
      data: {
        bestellnummer: bestellnummer,
        paypalUrl: paypalResult.approvalUrl,
        paypalOrderId: paypalResult.paypalOrderId,
        bestellungData: bestellungData // Für später
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

// 📋 Meine Bestellungen für authentifizierten Kunden (Frontend-API)
router.get('/meine-bestellungen', async (req, res) => {
  try {
    // Authentifizierung prüfen (Token aus Header)
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Authentifizierung erforderlich'
      });
    }

    // Token dekodieren um Kundennummer zu erhalten
    const token = authHeader.split(' ')[1];
    const jwt = require('jsonwebtoken');
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const kundennummer = decoded.kundennummer;

    if (!kundennummer) {
      return res.status(400).json({
        success: false,
        message: 'Kundennummer nicht gefunden'
      });
    }

    console.log('📋 Lade Bestellungen für Kunde:', kundennummer);

    const bestellungen = await Order.find({ 
      'besteller.kundennummer': kundennummer 
    }).sort({ createdAt: -1 }); // Neueste zuerst
    
    console.log('✅ Bestellungen gefunden:', bestellungen.length);
    console.log('🔍 Erste Bestellung:', bestellungen[0] ? {
      bestellnummer: bestellungen[0].bestellnummer,
      kundennummer: bestellungen[0].besteller?.kundennummer,
      bestelldatum: bestellungen[0].bestelldatum
    } : 'Keine Bestellungen');

    res.json({
      success: true,
      data: {
        bestellungen: bestellungen
      }
    });
    
  } catch (error) {
    console.error('❌ Fehler beim Laden der Bestellungen:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Laden der Bestellungen',
      error: error.message
    });
  }
});

// 📋 Einzelne Bestellung für authentifizierten Kunden abrufen
router.get('/meine-bestellungen/:id', async (req, res) => {
  try {
    // Authentifizierung prüfen
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Authentifizierung erforderlich'
      });
    }

    // Token dekodieren um Kundennummer zu erhalten
    const token = authHeader.split(' ')[1];
    const jwt = require('jsonwebtoken');
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const kundennummer = decoded.kundennummer;

    const { id } = req.params;
    console.log('📋 Lade Bestellung:', id, 'für Kunde:', kundennummer);

    const bestellung = await Order.findOne({ 
      _id: id,
      'besteller.kundennummer': kundennummer 
    });
    
    if (!bestellung) {
      return res.status(404).json({
        success: false,
        message: 'Bestellung nicht gefunden'
      });
    }

    console.log('✅ Bestellung gefunden:', bestellung.bestellnummer);

    res.json({
      success: true,
      data: bestellung
    });
    
  } catch (error) {
    console.error('❌ Fehler beim Laden der Bestellung:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Laden der Bestellung',
      error: error.message
    });
  }
});

// 📋 Alle Bestellungen für einen Kunden abrufen
router.get('/customer/:kundennummer', async (req, res) => {
  try {
    const { kundennummer } = req.params;
    
    const bestellungen = await Order.find({ 
      'besteller.kundennummer': kundennummer 
    }).sort({ erstelltAm: -1 }); // Neueste zuerst
    
    res.json({
      success: true,
      data: bestellungen
    });
    
  } catch (error) {
    console.error('❌ Fehler beim Laden der Kundenbestellungen:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Laden der Bestellungen',
      error: error.message
    });
  }
});

// 📋 Bestelldetails abrufen
router.get('/:bestellnummer', async (req, res) => {
  try {
    const { bestellnummer } = req.params;
    
    const bestellung = await Order.findOne({ 
      bestellnummer: bestellnummer 
    });
    
    if (!bestellung) {
      return res.status(404).json({
        success: false,
        message: 'Bestellung nicht gefunden'
      });
    }
    
    res.json({
      success: true,
      data: bestellung
    });
    
  } catch (error) {
    console.error('❌ Fehler beim Laden der Bestellung:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Laden der Bestellung',
      error: error.message
    });
  }
});

module.exports = router;