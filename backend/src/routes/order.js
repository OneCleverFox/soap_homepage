const express = require('express');
const router = express.Router();
const Order = require('../models/Order');
const Kunde = require('../models/Kunde');
const Portfolio = require('../models/Portfolio');
const PayPalService = require('../services/PayPalService');
const emailService = require('../services/emailService');
const orderInvoiceService = require('../services/orderInvoiceService');
const { validateCheckoutStatus, validatePayPalStatus } = require('../middleware/checkoutValidation');
const { createInquiryFromOrder } = require('../utils/inquiryHelper');
const { validateShippingData, generateTrackingUrl } = require('../utils/trackingValidation');

// 🎯 PayPal-Erfolg: Bestellung finalisieren
router.post('/paypal-success', validateCheckoutStatus, validatePayPalStatus, async (req, res) => {
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
    
    if (captureResult.success) {
      // Status automatisch auf "bezahlt" setzen wenn PayPal erfolgreich
      const bestellungStatus = 'bezahlt'; // Nicht mehr "neu"
      
      // Jetzt erst die Bestellung in der DB speichern mit Duplicate-Protection
      try {
        const neueBestellung = new Order({
          ...bestellungData,
          status: bestellungStatus, // Explizit "bezahlt" setzen
          zahlung: {
            ...bestellungData.zahlung,
            status: 'bezahlt',
            paypalOrderId: paypalOrderId,
            transactionId: captureResult.id
          },
          statusVerlauf: [
            {
              status: 'neu',
              zeitstempel: new Date(),
              notiz: 'Bestellung erstellt'
            },
            {
              status: 'bezahlt',
              zeitstempel: new Date(),
              notiz: `PayPal-Zahlung erfolgreich (${captureResult.id})`
            }
          ]
        });
        
        await neueBestellung.save();
        console.log('✅ Bestellung nach PayPal-Erfolg gespeichert mit Status "bezahlt":', bestellungData.bestellnummer);
        
        // ✅ Automatische Rechnungserstellung nach erfolgreicher Zahlung
        try {
          console.log('🧾 Automatische Rechnungserstellung für bezahlte Bestellung:', neueBestellung._id);
          const invoiceResult = await orderInvoiceService.generateInvoiceForOrder(neueBestellung._id);
          
          if (invoiceResult.success) {
            console.log('✅ Rechnung automatisch erstellt:', invoiceResult.invoiceNumber);
          } else {
            console.error('❌ Fehler bei automatischer Rechnungserstellung:', invoiceResult.error);
            // Bestellung trotzdem erfolgreich, nur Rechnung fehlgeschlagen
          }
        } catch (invoiceError) {
          console.error('❌ Fehler bei automatischer Rechnungserstellung:', invoiceError);
          // Bestellung trotzdem erfolgreich, nur Rechnung fehlgeschlagen
        }
        
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

// � PayPal-Zahlung für bestehende Bestellung initiieren
router.post('/payment', validateCheckoutStatus, validatePayPalStatus, async (req, res) => {
  try {
    console.log('💳 PayPal-Zahlung für bestehende Bestellung initiieren');
    
    const { orderId, amount, currency = 'EUR' } = req.body;
    
    if (!orderId || !amount) {
      return res.status(400).json({
        success: false,
        message: 'Bestellungs-ID und Betrag sind erforderlich'
      });
    }

    // Bestellung finden
    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Bestellung nicht gefunden'
      });
    }

    console.log('🔍 Bestellungsstatus prüfen:', {
      bestellnummer: order.bestellnummer,
      status: order.status,
      zahlungsstatus: order.zahlung?.status,
      artikelVorhanden: !!order.artikel,
      artikelAnzahl: order.artikel?.length || 0,
      source: order.source,
      sourceInquiryId: order.sourceInquiryId,
      kompletteDatenstruktur: JSON.stringify(order, null, 2)
    });

    // Prüfen ob Bestellung abgelehnt ist
    if (order.status?.toLowerCase() === 'abgelehnt') {
      return res.status(400).json({
        success: false,
        message: 'Diese Bestellung wurde abgelehnt und kann nicht bezahlt werden'
      });
    }

    // Prüfen ob Zahlung noch ausstehend
    if (order.zahlung?.status === 'bezahlt') {
      console.log('⚠️ Zahlung bereits abgeschlossen - kein PayPal nötig');
      return res.status(400).json({
        success: false,
        message: 'Diese Bestellung wurde bereits bezahlt'
      });
    }
    
    // Spezielle Behandlung für konvertierte Anfragen: 
    // Diese dürfen bezahlt werden, auch wenn sie bereits einen fortgeschrittenen Status haben
    const istKonvertierteAnfrage = order.source === 'inquiry' || order.sourceInquiryId;
    
    // Für normale Bestellungen: Nur bestimmte Status erlauben
    if (!istKonvertierteAnfrage) {
      const erlaubteStatus = ['neu', 'bestaetigt', 'bezahlt'];
      if (!erlaubteStatus.includes(order.status?.toLowerCase())) {
        return res.status(403).json({
          success: false,
          message: `Bestellung mit Status "${order.status}" kann nicht mehr bezahlt werden`
        });
      }
    } else {
      console.log('✅ Konvertierte Anfrage erkannt - PayPal-Zahlung erlaubt trotz Status:', order.status);
    }

    // PayPal-Zahlung erstellen
    // Flexibler Zugriff auf Artikel-Daten für verschiedene Datenstrukturen
    let artikel = order.artikel;
    
    // Fallback für konvertierte Anfragen
    if (!artikel || artikel.length === 0) {
      artikel = order.items || [];
      console.log('📦 Verwende items statt artikel:', artikel.length);
    }

    // Zusätzlicher Fallback für inquiry-konvertierte Bestellungen
    if (!artikel || artikel.length === 0) {
      console.log('⚠️ Keine Artikel gefunden, versuche Rekonstruktion aus Anfrage...');
      
      // Versuche aus sourceInquiryId zu rekonstruieren
      if (order.sourceInquiryId) {
        try {
          const Inquiry = require('../models/Inquiry');
          const sourceInquiry = await Inquiry.findById(order.sourceInquiryId);
          if (sourceInquiry && sourceInquiry.items) {
            artikel = sourceInquiry.items.map(item => ({
              name: item.produktname || item.name,
              description: item.beschreibung || '',
              quantity: item.quantity || item.menge || 1,
              price: item.price || item.einzelpreis || 0,
              produktSnapshot: {
                name: item.produktname || item.name,
                beschreibung: item.beschreibung || ''
              },
              menge: item.quantity || item.menge || 1,
              einzelpreis: item.price || item.einzelpreis || 0
            }));
            console.log('✅ Artikel aus Ursprungsanfrage rekonstruiert:', artikel.length);
          }
        } catch (error) {
          console.error('❌ Fehler beim Rekonstruieren der Artikel:', error);
        }
      }
    }

    if (!artikel || artikel.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Keine Artikel in der Bestellung gefunden. Diese Bestellung kann nicht über PayPal bezahlt werden.'
      });
    }

    const paypalData = {
      items: artikel.map(artikel => ({
        name: artikel.produktSnapshot?.name || artikel.name || artikel.produktname || 'Unbekanntes Produkt',
        description: artikel.produktSnapshot?.beschreibung || artikel.description || artikel.beschreibung || '',
        quantity: artikel.menge || artikel.quantity || 1,
        price: artikel.einzelpreis || artikel.price || 0,
        currency: currency
      })),
      artikel: artikel, // Für Rückwärtskompatibilität
      subtotal: order.preise?.zwischensumme || 0,
      shipping: order.preise?.versandkosten || 0,
      tax: order.preise?.mwst?.betrag || 0,
      total: amount,
      gesamtsumme: amount, // Alternative Bezeichnung
      currency: currency,
      description: `Zahlung für Bestellung ${order.bestellnummer}`,
      orderNumber: order.bestellnummer,
      bestellnummer: order.bestellnummer,
      // Adressdaten für PayPal hinzufügen
      lieferadresse: {
        vorname: order.besteller?.vorname || order.lieferadresse?.vorname || 'Kunde',
        nachname: order.besteller?.nachname || order.lieferadresse?.nachname || '',
        strasse: order.lieferadresse?.strasse || order.rechnungsadresse?.strasse || '',
        hausnummer: order.lieferadresse?.hausnummer || order.rechnungsadresse?.hausnummer || '',
        zusatz: order.lieferadresse?.zusatz || order.rechnungsadresse?.zusatz || '',
        plz: order.lieferadresse?.plz || order.rechnungsadresse?.plz || '',
        stadt: order.lieferadresse?.stadt || order.rechnungsadresse?.stadt || '',
        land: order.lieferadresse?.land || order.rechnungsadresse?.land || 'Deutschland'
      },
      returnUrl: `${process.env.FRONTEND_URL}/order-payment-success?orderNumber=${order.bestellnummer}`,
      cancelUrl: `${process.env.FRONTEND_URL}/profile?payment=cancelled`
    };

    console.log('🧪 DEBUG PayPal Data Structure:', {
      hasItems: !!paypalData.items,
      itemsLength: paypalData.items?.length || 0,
      hasArtikel: !!paypalData.artikel,
      artikelLength: paypalData.artikel?.length || 0,
      total: paypalData.total,
      currency: paypalData.currency,
      hasLieferadresse: !!paypalData.lieferadresse,
      lieferadresse: paypalData.lieferadresse
    });

    const paypalResult = await PayPalService.createPayment(paypalData);

    if (paypalResult.success) {
      console.log('✅ PayPal-Zahlung erstellt für Bestellung:', order.bestellnummer);
      
      res.json({
        success: true,
        message: 'PayPal-Zahlung erfolgreich erstellt',
        approvalUrl: paypalResult.approvalUrl,
        paypalOrderId: paypalResult.paypalOrderId,
        orderNumber: order.bestellnummer
      });
    } else {
      throw new Error(paypalResult.error || 'Fehler beim Erstellen der PayPal-Zahlung');
    }

  } catch (error) {
    console.error('❌ Fehler beim Erstellen der PayPal-Zahlung:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Erstellen der PayPal-Zahlung: ' + error.message
    });
  }
});

// �🛒 Neue Bestellung erstellen
router.post('/create', validateCheckoutStatus, async (req, res) => {
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

    // Anfrage-Modus: Bestellung als Anfrage behandeln
    if (req.isInquiryMode) {
      const inquiryResult = await createInquiryFromOrder(
        req, validierteArtikel, besteller, rechnungsadresse, 
        lieferadresse, preise, notizen, quelle, bestellnummer
      );
      return res.json(inquiryResult);
    }

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
    
    // Flexible Ermittlung der Kundendaten
    const kundennummer = decoded.kundennummer;
    const kundeId = decoded.kundeId || decoded.userId || decoded.id;
    const email = decoded.email;

    console.log('🔐 Token decoded:', { kundennummer, kundeId, email });

    if (!kundennummer && !kundeId && !email) {
      return res.status(400).json({
        success: false,
        message: 'Keine Kundenidentifikation im Token gefunden'
      });
    }

    console.log('📋 Lade Bestellungen für Kunde:', kundennummer);
    console.log('🔍 Suche auch nach Kunden-ID:', kundeId);
    console.log('🔍 E-Mail:', email);

    // Erweiterte Suche für alle möglichen Bestellungstypen
    const searchQuery = { 
      $or: []
    };
    
    // Verschiedene Suchkriterien hinzufügen
    if (kundennummer) {
      searchQuery.$or.push({ 'besteller.kundennummer': kundennummer });
    }
    if (kundeId) {
      // Prüfe ob kundeId ein gültiger ObjectId ist, bevor wir es verwenden
      const mongoose = require('mongoose');
      if (mongoose.Types.ObjectId.isValid(kundeId)) {
        searchQuery.$or.push({ 'kunde': kundeId });
      }
      // Suche auch in String-Feldern nach der Kunden-ID
      searchQuery.$or.push({ 'besteller.kundeId': kundeId });
      searchQuery.$or.push({ 'kundeId': kundeId });
    }
    if (email) {
      searchQuery.$or.push({ 'besteller.email': email });
    }

    // Mindestens ein Suchkriterium muss vorhanden sein
    if (searchQuery.$or.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Keine gültigen Suchkriterien gefunden'
      });
    }

    const bestellungen = await Order.find(searchQuery).sort({ createdAt: -1 }); // Neueste zuerst
    
    console.log('📊 Gefundene Bestellungen:');
    bestellungen.forEach((b, i) => {
      console.log(`  ${i+1}. ${b.bestellnummer || b.orderId} - Status: ${b.status} - Quelle: ${b.source || 'normal'}`);
      console.log(`      Artikel: ${b.artikel?.length || 0}, Preise: ${b.preise?.gesamtsumme || 0}€`);
      console.log(`      SourceInquiry: ${b.sourceInquiryId || 'none'}`);
    });
    
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
    
    // DEBUG: Vollständige Bestellungsdaten für erste Bestellung loggen
    if (bestellungen.length > 0) {
      console.log('🔍 VOLLSTÄNDIGE DATEN der ersten Bestellung für Frontend:');
      console.log(JSON.stringify({
        bestellnummer: bestellungen[0].bestellnummer,
        preise: bestellungen[0].preise,
        artikel: bestellungen[0].artikel,
        items: bestellungen[0].items,
        source: bestellungen[0].source,
        sourceInquiryId: bestellungen[0].sourceInquiryId
      }, null, 2));
    }
    
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

// � Admin: Bestellungen abrufen mit Query-Parametern (für AdminOrdersManagement)
router.get('/admin', async (req, res) => {
  try {
    const { status, sort = 'oldest', limit = 100 } = req.query;
    
    console.log('🔍 Admin orders request:', { status, sort, limit });
    
    // Filter für Status
    let statusArray = ['neu', 'bezahlt', 'bestaetigt', 'verpackt']; // Default
    
    if (status) {
      // Status kann ein comma-separated string oder einzelner wert sein
      statusArray = status.includes(',') ? status.split(',') : [status];
    }
    
    console.log('📊 Status Filter Array:', statusArray);
    
    const filter = {
      status: { 
        $in: statusArray 
      }
    };
    
    // Sortierung
    let sortOrder = {};
    switch (sort) {
      case 'oldest':
        sortOrder = { erstelltAm: 1 }; // Älteste zuerst
        break;
      case 'newest':
        sortOrder = { erstelltAm: -1 }; // Neueste zuerst
        break;
      case 'value':
        sortOrder = { 'preise.gesamtsumme': -1 }; // Höchster Wert zuerst
        break;
      default:
        sortOrder = { erstelltAm: 1 }; // Default: älteste zuerst
    }
    
    const orders = await Order.find(filter)
      .sort(sortOrder)
      .limit(parseInt(limit))
      .lean();
    
    console.log(`📦 ${orders.length} Admin-Bestellungen gefunden`);
    
    res.json({
      success: true,
      orders: orders
    });
  } catch (error) {
    console.error('❌ Fehler beim Laden der Admin-Bestellungen:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Laden der Bestellungen: ' + error.message
    });
  }
});

// 👑 Admin: Alle Bestellungen abrufen (sortiert nach Datum)
router.get('/admin/all', async (req, res) => {
  try {
    console.log('👑 Admin ruft alle Bestellungen ab');
    
    const orders = await Order.find({})
      .sort({ bestelldatum: 1 }) // Älteste zuerst
      .lean();
    
    console.log(`📦 ${orders.length} Bestellungen gefunden`);
    
    res.json({
      success: true,
      orders: orders
    });
  } catch (error) {
    console.error('❌ Fehler beim Laden der Admin-Bestellungen:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Laden der Bestellungen: ' + error.message
    });
  }
});

// 👑 Admin: Offene Bestellungen laden (nach Alter sortiert, arbeitsrelevant)
router.get('/admin/pending', async (req, res) => {
  try {
    const { status, sortBy = 'oldest', limit = 50 } = req.query;
    
    console.log('🔍 Admin pending orders request:', { status, sortBy, limit });
    
    // Filter für zu bearbeitende Bestellungen (inkl. abgelehnt für Rückerstattung)
    let statusArray = ['neu', 'bezahlt', 'bestaetigt', 'verpackt', 'abgelehnt']; // Default
    
    if (status) {
      // Status kann ein comma-separated string oder einzelner wert sein
      statusArray = status.includes(',') ? status.split(',') : [status];
    }
    
    console.log('📊 Status Filter Array:', statusArray);
    
    const filter = {
      status: { 
        $in: statusArray 
      }
    };
    
    // Abgelehnte Bestellungen mit erfolgreich abgeschlossener Rückerstattung nur bei "zu bearbeiten" ausschließen
    // Aber bei spezifischem "abgelehnt" Filter alle abgelehnten Bestellungen anzeigen
    if (statusArray.includes('abgelehnt') && statusArray.length > 1) {
      // Multi-Status Filter (z.B. "zu bearbeiten") - erledigte Rückerstattungen ausschließen
      filter.$or = [
        { status: { $in: statusArray.filter(s => s !== 'abgelehnt') } },
        { 
          status: 'abgelehnt', 
          $or: [
            { 'rueckerstattung.status': { $ne: 'erfolgreich' } },
            { rueckerstattung: { $exists: false } },
            { rueckerstattungErledigt: false } // Fallback für altes Format
          ]
        }
      ];
      delete filter.status; // Remove simple status filter as we use $or now
    }
    // Wenn nur "abgelehnt" Filter: alle abgelehnten Bestellungen anzeigen (auch erledigte)
    
    // Sortierung
    let sortOrder = {};
    switch (sortBy) {
      case 'oldest':
        sortOrder = { erstelltAm: 1 }; // Älteste zuerst
        break;
      case 'newest':
        sortOrder = { erstelltAm: -1 }; // Neueste zuerst
        break;
      case 'value':
        sortOrder = { 'preise.gesamtsumme': -1 }; // Höchster Wert zuerst
        break;
      default:
        sortOrder = { erstelltAm: 1 }; // Default: älteste zuerst
    }
    
    // Abfrage ausführen
    const orders = await Order.find(filter)
      .sort(sortOrder)
      .limit(parseInt(limit))
      .lean();
    
    console.log(`📦 ${orders.length} offene Bestellungen gefunden`);
    
    res.json({
      success: true,
      orders: orders
    });
  } catch (error) {
    console.error('❌ Fehler beim Laden der offenen Bestellungen:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Laden der Bestellungen: ' + error.message
    });
  }
});

// �📋 Alle Bestellungen für einen Kunden abrufen
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

// 👑 Admin: Bestellungen abrufen mit Query-Parametern (für AdminOrdersManagement)
router.get('/admin', async (req, res) => {
  try {
    const { status, sort = 'oldest', limit = 100 } = req.query;
    
    console.log('🔍 Admin orders request:', { status, sort, limit });
    
    // Filter für Status
    let statusArray = ['neu', 'bezahlt', 'bestaetigt', 'verpackt']; // Default
    
    if (status) {
      // Status kann ein comma-separated string oder einzelner wert sein
      statusArray = status.includes(',') ? status.split(',') : [status];
    }
    
    console.log('📊 Status Filter Array:', statusArray);
    
    const filter = {
      status: { 
        $in: statusArray 
      }
    };
    
    // Sortierung
    let sortOrder = {};
    switch (sort) {
      case 'oldest':
        sortOrder = { erstelltAm: 1 }; // Älteste zuerst
        break;
      case 'newest':
        sortOrder = { erstelltAm: -1 }; // Neueste zuerst
        break;
      case 'value':
        sortOrder = { 'preise.gesamtsumme': -1 }; // Höchster Wert zuerst
        break;
      default:
        sortOrder = { erstelltAm: 1 }; // Default: älteste zuerst
    }
    
    const orders = await Order.find(filter)
      .sort(sortOrder)
      .limit(parseInt(limit))
      .lean();
    
    console.log(`📦 ${orders.length} Admin-Bestellungen gefunden`);
    
    res.json({
      success: true,
      orders: orders
    });
  } catch (error) {
    console.error('❌ Fehler beim Laden der Admin-Bestellungen:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Laden der Bestellungen: ' + error.message
    });
  }
});

// 👑 Admin: Alle Bestellungen abrufen (sortiert nach Datum)
router.get('/admin/all', async (req, res) => {
  try {
    console.log('👑 Admin ruft alle Bestellungen ab');
    
    const orders = await Order.find({})
      .sort({ bestelldatum: 1 }) // Älteste zuerst
      .lean();
    
    console.log(`📦 ${orders.length} Bestellungen gefunden`);
    
    res.json({
      success: true,
      orders: orders
    });
  } catch (error) {
    console.error('❌ Fehler beim Laden der Admin-Bestellungen:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Laden der Bestellungen: ' + error.message
    });
  }
});

// 👑 Admin: Offene Bestellungen laden (nach Alter sortiert, arbeitsrelevant)
router.get('/admin/pending', async (req, res) => {
  try {
    const { status, sortBy = 'oldest', limit = 50 } = req.query;
    
    console.log('🔍 Admin pending orders request:', { status, sortBy, limit });
    
    // Filter für zu bearbeitende Bestellungen (inkl. abgelehnt für Rückerstattung)
    let statusArray = ['neu', 'bezahlt', 'bestaetigt', 'verpackt', 'abgelehnt']; // Default
    
    if (status) {
      // Status kann ein comma-separated string oder einzelner wert sein
      statusArray = status.includes(',') ? status.split(',') : [status];
    }
    
    console.log('📊 Status Filter Array:', statusArray);
    
    const filter = {
      status: { 
        $in: statusArray 
      }
    };
    
    // Abgelehnte Bestellungen mit erfolgreich abgeschlossener Rückerstattung nur bei "zu bearbeiten" ausschließen
    // Aber bei spezifischem "abgelehnt" Filter alle abgelehnten Bestellungen anzeigen
    if (statusArray.includes('abgelehnt') && statusArray.length > 1) {
      // Multi-Status Filter (z.B. "zu bearbeiten") - erledigte Rückerstattungen ausschließen
      filter.$or = [
        { status: { $in: statusArray.filter(s => s !== 'abgelehnt') } },
        { 
          status: 'abgelehnt', 
          $or: [
            { 'rueckerstattung.status': { $ne: 'erfolgreich' } },
            { rueckerstattung: { $exists: false } },
            { rueckerstattungErledigt: false } // Fallback für altes Format
          ]
        }
      ];
      delete filter.status; // Remove simple status filter as we use $or now
    }
    // Wenn nur "abgelehnt" Filter: alle abgelehnten Bestellungen anzeigen (auch erledigte)
    
    // Sortierung
    let sortOrder = {};
    switch (sortBy) {
      case 'oldest':
        sortOrder = { erstelltAm: 1 }; // Älteste zuerst
        break;
      case 'newest':
        sortOrder = { erstelltAm: -1 }; // Neueste zuerst
        break;
      case 'value':
        sortOrder = { 'preise.gesamtsumme': -1 }; // Höchster Wert zuerst
        break;
      case 'status':
        sortOrder = { status: 1, erstelltAm: 1 }; // Nach Status, dann Alter
        break;
      default:
        sortOrder = { erstelltAm: 1 };
    }
    
    console.log('🔍 MongoDB Filter:', JSON.stringify(filter, null, 2));
    console.log('📊 Sort Order:', sortOrder);
    
    const orders = await Order.find(filter)
      .sort(sortOrder)
      .limit(parseInt(limit))
      .select('bestellnummer erstelltAm besteller preise status versand artikel notizen statusVerlauf')
      .lean();
    
    console.log(`📦 Raw orders found: ${orders.length}`);
    if (orders.length > 0) {
      console.log('📝 First order sample:', {
        bestellnummer: orders[0].bestellnummer,
        status: orders[0].status,
        erstelltAm: orders[0].erstelltAm
      });
    }
    
    // Statistiken für Dashboard
    const stats = await Order.aggregate([
      { $match: filter },
      { 
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          totalValue: { $sum: '$preise.gesamtsumme' }
        }
      }
    ]);
    
    console.log('📊 Stats:', stats);
    console.log(`✅ Admin: ${orders.length} offene Bestellungen geladen`);
    
    res.json({
      success: true,
      data: {
        orders,
        stats,
        total: orders.length
      }
    });
    
  } catch (error) {
    console.error('❌ Fehler beim Laden offener Bestellungen:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Laden der Bestellungen: ' + error.message
    });
  }
});

// 👑 Admin: Bestellstatus aktualisieren
router.put('/:orderId/status', async (req, res) => {
  try {
    const { orderId } = req.params;
    const { status, notiz = '', bearbeiter = 'Admin', versand = null } = req.body;
    
    console.log(`👑 Admin aktualisiert Status für Bestellung ${orderId} auf "${status}"`);
    if (versand) {
      console.log('📦 Versanddaten:', versand);
    }
    
    // Validierung
    const validStatuses = ['neu', 'bezahlt', 'bestaetigt', 'verpackt', 'verschickt', 'zugestellt', 'storniert', 'abgelehnt'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Ungültiger Status'
      });
    }
    
    // Für verschickt Status: Sendungsnummer erforderlich und validieren
    if (status === 'verschickt') {
      if (!versand || !versand.sendungsnummer) {
        return res.status(400).json({
          success: false,
          message: 'Für den Status "Verschickt" ist eine Sendungsnummer erforderlich'
        });
      }
      
      // Validiere Versanddaten
      const shippingValidation = validateShippingData(versand);
      if (!shippingValidation.valid) {
        return res.status(400).json({
          success: false,
          message: 'Ungültige Versanddaten',
          errors: shippingValidation.errors
        });
      }
    }
    
    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Bestellung nicht gefunden'
      });
    }
    
    // Status aktualisieren und Status-Verlauf hinzufügen
    order.status = status;
    
    // Status-Verlauf aktualisieren
    if (!order.statusVerlauf) {
      order.statusVerlauf = [];
    }
    
    let statusNotiz = notiz || `Status geändert zu ${status}`;
    if (status === 'verschickt' && versand?.sendungsnummer) {
      statusNotiz += ` - Sendungsnummer: ${versand.sendungsnummer}`;
    }
    
    order.statusVerlauf.push({
      status: status,
      zeitpunkt: new Date(),
      notiz: statusNotiz,
      bearbeiter: bearbeiter
    });
    
    // Versanddaten aktualisieren wenn vorhanden
    if (versand) {
      if (!order.versand) {
        order.versand = {};
      }
      
      // Versanddaten setzen
      if (versand.sendungsnummer) {
        order.versand.sendungsnummer = versand.sendungsnummer.replace(/[\s-]/g, ''); // Bereinige Tracking-Nummer
      }
      if (versand.anbieter) {
        order.versand.anbieter = versand.anbieter;
      }
      
      // Automatische Tracking-URL-Generierung
      if (versand.anbieter && versand.sendungsnummer) {
        const trackingUrl = generateTrackingUrl(versand.anbieter, versand.sendungsnummer);
        if (trackingUrl) {
          order.versand.trackingUrl = trackingUrl;
        }
      }
      
      // Manuelle Tracking-URL falls gewünscht
      if (versand.trackingUrl) {
        order.versand.trackingUrl = versand.trackingUrl;
      }
      
      if (versand.versendetAm) {
        order.versand.versendetAm = new Date(versand.versendetAm);
      }
    }
    
    // Automatische Aktionen basierend auf Status
    if (status === 'verschickt') {
      order.versand.verschickt = true;
      if (!order.versand.versendetAm) {
        order.versand.versendetAm = new Date();
      }
    } else if (status === 'zugestellt') {
      order.versand.zugestellt = true;
      if (!order.versand.zugestelltAm) {
        order.versand.zugestelltAm = new Date();
      }
    }

    // Fehlende produktType Felder in Artikeln korrigieren (für ältere Bestellungen)
    if (order.artikel && Array.isArray(order.artikel)) {
      order.artikel.forEach(artikel => {
        if (!artikel.produktType) {
          // Setze einen Standard-produktType basierend auf verfügbaren Daten
          if (artikel.produktSnapshot?.kategorie) {
            artikel.produktType = artikel.produktSnapshot.kategorie.toLowerCase();
          } else if (artikel.produktSnapshot?.name?.toLowerCase().includes('seife')) {
            artikel.produktType = 'rohseife';
          } else if (artikel.produktSnapshot?.name?.toLowerCase().includes('duft')) {
            artikel.produktType = 'duftoele';
          } else {
            artikel.produktType = 'custom'; // Fallback
          }
        }
      });
    }

    await order.save();    console.log(`✅ Status erfolgreich aktualisiert: ${order.bestellnummer} -> ${status}`);
    
    res.json({
      success: true,
      message: 'Status erfolgreich aktualisiert',
      order: order
    });
    
  } catch (error) {
    console.error('❌ Fehler beim Aktualisieren des Status:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Aktualisieren des Status: ' + error.message
    });
  }
});

// 👑 Admin: Bestellung bestätigen mit E-Mail
router.post('/:orderId/confirm', async (req, res) => {
  try {
    const { orderId } = req.params;
    const { notiz = '', bearbeiter = 'Admin' } = req.body;
    
    console.log(`✅ Admin bestätigt Bestellung ${orderId}`);
    
    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Bestellung nicht gefunden'
      });
    }
    
    // Status auf "bestätigt" setzen
    order.status = 'bestaetigt';
    
    // Status-Verlauf aktualisieren
    if (!order.statusVerlauf) {
      order.statusVerlauf = [];
    }
    
    order.statusVerlauf.push({
      status: 'bestaetigt',
      zeitpunkt: new Date(),
      notiz: notiz || 'Bestellung vom Admin bestätigt',
      bearbeiter: bearbeiter
    });
    
    await order.save();
    
    // E-Mail senden
    try {
      const emailResult = await emailService.sendOrderConfirmationEmail(order);
      if (emailResult.success) {
        console.log(`📧 Bestätigungs-E-Mail gesendet für Bestellung ${order.bestellnummer}`);
        
        // E-Mail in der Bestellung speichern
        if (!order.kommunikation) {
          order.kommunikation = [];
        }
        
        order.kommunikation.push({
          typ: 'email',
          richtung: 'ausgehend',
          betreff: `✅ Bestellung bestätigt #${order.bestellnummer}`,
          inhalt: 'Bestellbestätigungs-E-Mail wurde erfolgreich versendet',
          zeitpunkt: new Date(),
          bearbeiter: bearbeiter,
          emailData: {
            messageId: emailResult.messageId,
            empfaenger: order.besteller.email,
            status: 'gesendet',
            emailType: 'order_confirmation'
          }
        });
        
        await order.save();
      } else {
        console.warn(`⚠️ E-Mail-Versand fehlgeschlagen für Bestellung ${order.bestellnummer}:`, emailResult.error);
      }
    } catch (emailError) {
      console.error('❌ E-Mail-Fehler:', emailError);
    }
    
    res.json({
      success: true,
      message: 'Bestellung erfolgreich bestätigt',
      order: order
    });
    
  } catch (error) {
    console.error('❌ Fehler beim Bestätigen der Bestellung:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Bestätigen der Bestellung: ' + error.message
    });
  }
});

// 👑 Admin: Bestellung ablehnen mit E-Mail
router.post('/:orderId/reject', async (req, res) => {
  try {
    const { orderId } = req.params;
    const { notiz = '', bearbeiter = 'Admin', reason = null } = req.body;
    
    console.log(`❌ Admin lehnt Bestellung ${orderId} ab`);
    
    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Bestellung nicht gefunden'
      });
    }
    
    // Status auf "abgelehnt" setzen
    order.status = 'abgelehnt';
    
    // Status-Verlauf aktualisieren
    if (!order.statusVerlauf) {
      order.statusVerlauf = [];
    }
    
    order.statusVerlauf.push({
      status: 'abgelehnt',
      zeitpunkt: new Date(),
      notiz: notiz || (reason ? `Bestellung abgelehnt: ${reason}` : 'Bestellung vom Admin abgelehnt'),
      bearbeiter: bearbeiter
    });
    
    // 💰 Automatische PayPal-Rückerstattung wenn bezahlt
    let refundResult = null;
    if (order.zahlung?.status === 'bezahlt' && order.zahlung?.methode === 'paypal' && order.zahlung?.paypalOrderId) {
      console.log('💰 Starte automatische PayPal-Rückerstattung für Bestellung:', order.bestellnummer);
      
      try {
        const PayPalService = require('../services/PayPalService');
        refundResult = await PayPalService.refundPayment(
          order.zahlung.paypalOrderId, 
          null, // Vollrückerstattung
          reason || 'Bestellung storniert - Rückerstattung erfolgt automatisch'
        );
        
        if (refundResult.success) {
          console.log('✅ PayPal-Rückerstattung erfolgreich:', refundResult.refundId);
          
          // Rückerstattung in Bestellung speichern
          order.rueckerstattung = {
            refundId: refundResult.refundId,
            status: refundResult.status,
            betrag: refundResult.amount,
            zeitpunkt: new Date(),
            methode: 'paypal_automatisch',
            notiz: 'Automatische PayPal-Rückerstattung bei Ablehnung'
          };
          
          // Status-Verlauf ergänzen
          order.statusVerlauf.push({
            status: 'abgelehnt',
            zeitpunkt: new Date(),
            notiz: `PayPal-Rückerstattung erfolgreich (${refundResult.refundId})`,
            bearbeiter: 'System'
          });
          
        } else {
          console.error('❌ PayPal-Rückerstattung fehlgeschlagen:', refundResult.error);
          
          // Fehlschlag dokumentieren
          order.rueckerstattung = {
            status: 'fehlgeschlagen',
            fehler: refundResult.error,
            zeitpunkt: new Date(),
            methode: 'paypal_automatisch',
            notiz: 'Automatische PayPal-Rückerstattung fehlgeschlagen - manuelle Bearbeitung erforderlich'
          };
          
          order.statusVerlauf.push({
            status: 'abgelehnt',
            zeitpunkt: new Date(),
            notiz: `PayPal-Rückerstattung fehlgeschlagen: ${refundResult.error}`,
            bearbeiter: 'System'
          });
        }
      } catch (refundError) {
        console.error('❌ Fehler bei automatischer PayPal-Rückerstattung:', refundError);
        
        order.rueckerstattung = {
          status: 'fehler',
          fehler: refundError.message,
          zeitpunkt: new Date(),
          methode: 'paypal_automatisch',
          notiz: 'Fehler bei automatischer PayPal-Rückerstattung - manuelle Bearbeitung erforderlich'
        };
        
        order.statusVerlauf.push({
          status: 'abgelehnt',
          zeitpunkt: new Date(),
          notiz: `Rückerstattungsfehler: ${refundError.message}`,
          bearbeiter: 'System'
        });
      }
    }
    
    await order.save();
    
    // E-Mail senden
    try {
      const emailResult = await emailService.sendOrderRejectionEmail(order, reason);
      if (emailResult.success) {
        console.log(`📧 Ablehnungs-E-Mail gesendet für Bestellung ${order.bestellnummer}`);
        
        // E-Mail in der Bestellung speichern
        if (!order.kommunikation) {
          order.kommunikation = [];
        }
        
        order.kommunikation.push({
          typ: 'email',
          richtung: 'ausgehend',
          betreff: `😔 Bestellung #${order.bestellnummer} storniert`,
          inhalt: `Ablehnungs-E-Mail wurde erfolgreich versendet. Grund: ${reason || 'Lieferschwierigkeiten'}`,
          zeitpunkt: new Date(),
          bearbeiter: bearbeiter,
          emailData: {
            messageId: emailResult.messageId,
            empfaenger: order.besteller.email,
            status: 'gesendet',
            emailType: 'order_rejection'
          }
        });
        
        await order.save();
      } else {
        console.warn(`⚠️ E-Mail-Versand fehlgeschlagen für Bestellung ${order.bestellnummer}:`, emailResult.error);
      }
    } catch (emailError) {
      console.error('❌ E-Mail-Fehler:', emailError);
    }
    
    res.json({
      success: true,
      message: 'Bestellung erfolgreich abgelehnt',
      order: order,
      refund: refundResult // PayPal-Rückerstattungsinfo für Frontend
    });
    
  } catch (error) {
    console.error('❌ Fehler beim Ablehnen der Bestellung:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Ablehnen der Bestellung: ' + error.message
    });
  }
});

// 👑 Admin: Manuelle PayPal-Rückerstattung
router.post('/:orderId/paypal-refund', async (req, res) => {
  try {
    const { orderId } = req.params;
    const { amount = null, reason = 'Manuelle Rückerstattung', bearbeiter = 'Admin' } = req.body;
    
    console.log(`💰 Admin startet manuelle PayPal-Rückerstattung für Bestellung ${orderId}`);
    
    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Bestellung nicht gefunden'
      });
    }
    
    // Prüfen ob PayPal-Zahlung vorhanden
    if (!order.zahlung?.paypalOrderId) {
      return res.status(400).json({
        success: false,
        message: 'Diese Bestellung hat keine PayPal-Zahlung oder PayPal-ID ist nicht verfügbar'
      });
    }
    
    // Prüfen ob bereits bezahlt
    if (order.zahlung?.status !== 'bezahlt') {
      return res.status(400).json({
        success: false,
        message: 'Rückerstattung nur für bezahlte Bestellungen möglich'
      });
    }
    
    try {
      const PayPalService = require('../services/PayPalService');
      const refundResult = await PayPalService.refundPayment(
        order.zahlung.paypalOrderId,
        amount,
        reason
      );
      
      if (refundResult.success) {
        console.log('✅ Manuelle PayPal-Rückerstattung erfolgreich:', refundResult.refundId);
        
        // Rückerstattung in Bestellung speichern
        order.rueckerstattung = {
          refundId: refundResult.refundId,
          status: refundResult.status,
          betrag: refundResult.amount,
          zeitpunkt: new Date(),
          methode: 'paypal_manuell',
          notiz: reason,
          bearbeiter: bearbeiter
        };
        
        // Status-Verlauf aktualisieren
        if (!order.statusVerlauf) {
          order.statusVerlauf = [];
        }
        
        order.statusVerlauf.push({
          status: order.status || 'abgelehnt',
          zeitpunkt: new Date(),
          notiz: `Manuelle PayPal-Rückerstattung erfolgreich (${refundResult.refundId})`,
          bearbeiter: bearbeiter
        });
        
        await order.save();
        
        res.json({
          success: true,
          message: 'PayPal-Rückerstattung erfolgreich durchgeführt',
          refund: refundResult,
          order: order
        });
        
      } else {
        console.error('❌ Manuelle PayPal-Rückerstattung fehlgeschlagen:', refundResult.error);
        
        res.status(400).json({
          success: false,
          message: 'PayPal-Rückerstattung fehlgeschlagen: ' + refundResult.error,
          error: refundResult.error
        });
      }
      
    } catch (refundError) {
      console.error('❌ Fehler bei manueller PayPal-Rückerstattung:', refundError);
      
      res.status(500).json({
        success: false,
        message: 'Fehler bei PayPal-Rückerstattung: ' + refundError.message,
        error: refundError.message
      });
    }
    
  } catch (error) {
    console.error('❌ Fehler bei PayPal-Rückerstattung:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler bei PayPal-Rückerstattung: ' + error.message
    });
  }
});

// 👑 Admin: Rückerstattung als erledigt markieren
router.post('/:orderId/refund-completed', async (req, res) => {
  try {
    const { orderId } = req.params;
    const { notiz = '', bearbeiter = 'Admin' } = req.body;
    
    console.log(`💰 Admin markiert Rückerstattung als erledigt für Bestellung ${orderId}`);
    
    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Bestellung nicht gefunden'
      });
    }
    
    if (order.status !== 'abgelehnt') {
      return res.status(400).json({
        success: false,
        message: 'Nur abgelehnte Bestellungen können als rückerstattet markiert werden'
      });
    }
    
    // Rückerstattung als erledigt markieren
    order.rueckerstattungErledigt = true;
    order.rueckerstattungDatum = new Date();
    order.rueckerstattungNotiz = notiz;
    
    // Status-Verlauf aktualisieren
    if (!order.statusVerlauf) {
      order.statusVerlauf = [];
    }
    
    order.statusVerlauf.push({
      status: 'abgelehnt',
      zeitpunkt: new Date(),
      notiz: `Rückerstattung erledigt: ${notiz || 'Keine Notiz'}`,
      bearbeiter: bearbeiter
    });
    
    // Kommunikation hinzufügen
    if (!order.kommunikation) {
      order.kommunikation = [];
    }
    
    order.kommunikation.push({
      typ: 'notiz',
      richtung: 'intern',
      betreff: 'Rückerstattung erledigt',
      inhalt: notiz || 'Rückerstattung wurde verarbeitet',
      zeitpunkt: new Date(),
      bearbeiter: bearbeiter
    });
    
    await order.save();
    
    res.json({
      success: true,
      message: 'Rückerstattung erfolgreich als erledigt markiert',
      order: order
    });
    
  } catch (error) {
    console.error('❌ Fehler beim Markieren der Rückerstattung:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Markieren der Rückerstattung: ' + error.message
    });
  }
});

// 👑 Admin: PayPal-Rückerstattung manuell bestätigen
router.post('/:orderId/paypal-refund-confirm', async (req, res) => {
  try {
    const { orderId } = req.params;
    const { amount, transactionId = 'Manuell bestätigt', bearbeiter = 'Admin' } = req.body;
    
    console.log(`💰 Admin bestätigt PayPal-Rückerstattung für Bestellung ${orderId}`);
    
    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Bestellung nicht gefunden'
      });
    }
    
    // Rückerstattung in Bestellung speichern
    order.rueckerstattung = {
      refundId: transactionId,
      status: 'erfolgreich',
      betrag: {
        currency_code: 'EUR',
        value: amount.toString()
      },
      zeitpunkt: new Date(),
      methode: 'paypal_manuell_bestätigt',
      notiz: 'Manuell über PayPal versendet und bestätigt',
      bearbeiter: bearbeiter
    };
    
    // Status-Verlauf aktualisieren
    if (!order.statusVerlauf) {
      order.statusVerlauf = [];
    }
    
    order.statusVerlauf.push({
      status: order.status || 'abgelehnt',
      zeitpunkt: new Date(),
      notiz: `PayPal-Rückerstattung manuell bestätigt (${transactionId})`,
      bearbeiter: bearbeiter
    });
    
    await order.save();
    
    res.json({
      success: true,
      message: 'PayPal-Rückerstattung erfolgreich bestätigt',
      order: order
    });
    
  } catch (error) {
    console.error('❌ Fehler bei PayPal-Rückerstattungsbestätigung:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler bei PayPal-Rückerstattungsbestätigung: ' + error.message
    });
  }
});

// 👑 Admin: DHL-Tracking hinzufügen/aktualisieren
router.put('/:orderId/tracking', async (req, res) => {
  try {
    const { orderId } = req.params;
    const { 
      sendungsnummer, 
      anbieter = 'dhl', 
      notiz = '', 
      bearbeiter = 'Admin',
      trackingUrl = ''
    } = req.body;
    
    console.log(`📦 Admin fügt Tracking hinzu für Bestellung ${orderId}: ${sendungsnummer}`);
    
    if (!sendungsnummer) {
      return res.status(400).json({
        success: false,
        message: 'Sendungsnummer ist erforderlich'
      });
    }
    
    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Bestellung nicht gefunden'
      });
    }
    
    // Versand-Informationen aktualisieren - nur die spezifischen Felder
    order.versand.sendungsnummer = sendungsnummer;
    order.versand.anbieter = anbieter;
    order.versand.trackingUrl = trackingUrl || generateTrackingUrl(anbieter, sendungsnummer);
    order.versand.verschickt = true;
    order.versand.versendetAm = order.versand.versendetAm || new Date();
    
    // Stelle sicher, dass die Objekt-Felder korrekt initialisiert sind
    if (!order.versand.tracking) {
      order.versand.tracking = {
        letzterStatus: '',
        letzteAktualisierung: new Date(),
        statusDetails: '',
        standort: '',
        verlauf: []
      };
    }
    
    if (!order.versand.kosten) {
      order.versand.kosten = {
        betrag: order.preise?.versandkosten || 0,
        kostenlos: (order.preise?.versandkosten || 0) === 0,
        grund: ''
      };
    }
    
    if (!order.versand.paket) {
      order.versand.paket = {
        gewicht: 0,
        abmessungen: {
          laenge: 0,
          breite: 0,
          hoehe: 0
        },
        inhalt: '',
        versichert: false,
        versicherungswert: 0
      };
    }
    
    // Status automatisch auf "verschickt" setzen wenn noch nicht gesetzt
    if (order.status !== 'verschickt' && order.status !== 'zugestellt') {
      order.status = 'verschickt';
      
      // Status-Verlauf hinzufügen
      if (!order.statusVerlauf) {
        order.statusVerlauf = [];
      }
      
      order.statusVerlauf.push({
        status: 'verschickt',
        zeitpunkt: new Date(),
        notiz: `Sendung verschickt mit ${anbieter.toUpperCase()}: ${sendungsnummer}${notiz ? ' - ' + notiz : ''}`,
        bearbeiter: bearbeiter
      });
    }
    
    await order.save();
    
    console.log(`✅ Tracking erfolgreich hinzugefügt: ${order.bestellnummer} -> ${sendungsnummer}`);
    
    res.json({
      success: true,
      message: 'Tracking-Informationen erfolgreich aktualisiert',
      order: order
    });
    
  } catch (error) {
    console.error('❌ Fehler beim Hinzufügen des Trackings:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Hinzufügen der Tracking-Informationen: ' + error.message
    });
  }
});

// 👑 Admin: Bestelldetails vollständig aktualisieren
router.put('/:orderId/details', async (req, res) => {
  try {
    const { orderId } = req.params;
    const { 
      notizen,
      versand,
      bearbeiter = 'Admin',
      updateNote = ''
    } = req.body;
    
    console.log(`📝 Admin aktualisiert Details für Bestellung ${orderId}`);
    
    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Bestellung nicht gefunden'
      });
    }
    
    // Notizen aktualisieren
    if (notizen) {
      order.notizen = { ...order.notizen, ...notizen };
    }
    
    // Versandinformationen aktualisieren
    if (versand) {
      order.versand = { ...order.versand, ...versand };
    }
    
    // Änderung im Status-Verlauf dokumentieren
    if (updateNote) {
      if (!order.statusVerlauf) {
        order.statusVerlauf = [];
      }
      
      order.statusVerlauf.push({
        status: order.status,
        zeitpunkt: new Date(),
        notiz: updateNote,
        bearbeiter: bearbeiter
      });
    }
    
    await order.save();
    
    console.log(`✅ Details erfolgreich aktualisiert: ${order.bestellnummer}`);
    
    res.json({
      success: true,
      message: 'Bestelldetails erfolgreich aktualisiert',
      order: order
    });
    
  } catch (error) {
    console.error('❌ Fehler beim Aktualisieren der Details:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Aktualisieren der Bestelldetails: ' + error.message
    });
  }
});

// � Admin: Alle Bestellungen abrufen (für Vollansicht)
router.get('/admin/all', async (req, res) => {
  try {
    const { sortBy = 'newest', limit = 200, searchTerm } = req.query;
    console.log('👑 Admin ruft alle Bestellungen ab');

    let filter = {}; // Kein Status-Filter für "alle"
    
    // Erweiterte Suche wenn searchTerm vorhanden
    if (searchTerm && searchTerm.trim()) {
      const searchRegex = new RegExp(searchTerm.trim(), 'i');
      filter = {
        $or: [
          { bestellnummer: searchRegex },
          { 'besteller.vorname': searchRegex },
          { 'besteller.nachname': searchRegex },
          { 'besteller.email': searchRegex },
          { 'lieferadresse.strasse': searchRegex },
          { 'lieferadresse.stadt': searchRegex },
          { 'lieferadresse.plz': searchRegex },
          { 'versand.sendungsnummer': searchRegex }
        ]
      };
    }

    // Sortierung
    let sortOrder = {};
    switch (sortBy) {
      case 'newest':
        sortOrder = { erstelltAm: -1 };
        break;
      case 'oldest':
        sortOrder = { erstelltAm: 1 };
        break;
      case 'value':
        sortOrder = { 'preise.gesamtsumme': -1 };
        break;
      case 'status':
        sortOrder = { status: 1, erstelltAm: -1 };
        break;
      default:
        sortOrder = { erstelltAm: -1 };
    }

    console.log('📊 Sort Order:', sortOrder);

    const orders = await Order.find(filter)
      .lean()
      .sort(sortOrder)
      .limit(parseInt(limit))
      .exec();

    console.log('📦 Raw orders found:', orders.length);

    // Statistiken für alle Status berechnen
    const stats = await Order.aggregate([
      { 
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          totalValue: { $sum: '$preise.gesamtsumme' }
        }
      }
    ]);

    console.log('📊 Stats:', stats);
    console.log(`📦 ${orders.length} Bestellungen gefunden`);

    res.json({
      success: true,
      data: {
        orders,
        stats,
        total: orders.length,
        searchTerm: searchTerm || null
      }
    });
  } catch (error) {
    console.error('❌ Fehler beim Laden aller Bestellungen:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Laden der Bestellungen: ' + error.message
    });
  }
});

// 📄 NEUE RECHNUNGS-ROUTEN

// Rechnung für Bestellung generieren
router.post('/:orderId/generate-invoice', async (req, res) => {
  try {
    const { orderId } = req.params;
    
    const invoiceData = await orderInvoiceService.generateInvoiceForOrder(orderId);
    
    res.json({
      success: true,
      message: 'Rechnung erfolgreich generiert',
      data: {
        invoiceNumber: invoiceData.invoiceNumber,
        filename: invoiceData.filename
      }
    });
  } catch (error) {
    console.error('Fehler bei Rechnungsgenerierung:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler bei der Rechnungsgenerierung',
      error: error.message
    });
  }
});

// Rechnung per E-Mail versenden
router.post('/:orderId/send-invoice', async (req, res) => {
  try {
    const { orderId } = req.params;
    
    // Rechnung generieren falls noch nicht vorhanden
    const invoiceData = await orderInvoiceService.generateInvoiceForOrder(orderId);
    
    // E-Mail versenden
    await orderInvoiceService.sendInvoiceEmail(orderId, invoiceData);
    
    res.json({
      success: true,
      message: 'Rechnung erfolgreich per E-Mail versendet'
    });
  } catch (error) {
    console.error('Fehler beim E-Mail-Versand:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim E-Mail-Versand',
      error: error.message
    });
  }
});

// Rechnung-PDF herunterladen
router.get('/:orderId/invoice/download', async (req, res) => {
  try {
    const { orderId } = req.params;
    
    const pdfBuffer = await orderInvoiceService.getInvoicePDF(orderId);
    const order = await Order.findById(orderId);
    
    if (!order || !order.invoiceNumber) {
      return res.status(404).json({
        success: false,
        message: 'Rechnung nicht gefunden'
      });
    }
    
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename=Rechnung-${order.invoiceNumber}.pdf`,
      'Content-Length': pdfBuffer.length
    });
    
    res.send(pdfBuffer);
  } catch (error) {
    console.error('Fehler beim PDF-Download:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim PDF-Download',
      error: error.message
    });
  }
});

// Alle Rechnungen auflisten (Admin)
router.get('/invoices/list', async (req, res) => {
  try {
    const filters = {
      startDate: req.query.startDate,
      endDate: req.query.endDate,
      customerEmail: req.query.customerEmail,
      limit: parseInt(req.query.limit) || 100
    };
    
    const invoices = await orderInvoiceService.getInvoiceList(filters);
    
    res.json({
      success: true,
      data: invoices
    });
  } catch (error) {
    console.error('Fehler beim Abrufen der Rechnungsliste:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Abrufen der Rechnungsliste',
      error: error.message
    });
  }
});

// Rechnung erneut versenden
router.post('/:orderId/resend-invoice', async (req, res) => {
  try {
    const { orderId } = req.params;
    
    await orderInvoiceService.resendInvoice(orderId);
    
    res.json({
      success: true,
      message: 'Rechnung erfolgreich erneut versendet'
    });
  } catch (error) {
    console.error('Fehler beim erneuten Versenden:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim erneuten Versenden',
      error: error.message
    });
  }
});

// 💰 PayPal-Zahlung für bestehende Bestellung erfassen
router.post('/payment/capture', async (req, res) => {
  try {
    console.log('💰 PayPal-Zahlung für bestehende Bestellung erfassen');
    
    const { paypalOrderId, orderNumber } = req.body;
    
    if (!paypalOrderId || !orderNumber) {
      return res.status(400).json({
        success: false,
        message: 'PayPal-Order-ID und Bestellnummer sind erforderlich'
      });
    }

    // Bestellung finden
    const order = await Order.findOne({ bestellnummer: orderNumber });
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Bestellung nicht gefunden'
      });
    }

    // PayPal-Zahlung erfassen
    const captureResult = await PayPalService.capturePayment(paypalOrderId);

    if (captureResult.success) {
      // Bestellung als bezahlt markieren
      order.zahlung = {
        ...order.zahlung,
        status: 'bezahlt',
        methode: 'paypal',
        transactionId: captureResult.id,
        paypalOrderId: paypalOrderId,
        zahlungsdatum: new Date()
      };
      
      order.status = 'bezahlt';
      
      await order.save();

      console.log('✅ Bestellung als bezahlt markiert:', orderNumber);

      // ✅ Automatische Rechnungserstellung nach erfolgreicher Zahlung
      try {
        console.log('🧾 Automatische Rechnungserstellung für bezahlte Bestellung:', order._id);
        const invoiceResult = await orderInvoiceService.generateInvoiceForOrder(order._id);
        
        if (invoiceResult.success) {
          console.log('✅ Rechnung automatisch erstellt für bestehende Bestellung:', invoiceResult.invoiceNumber);
        } else {
          console.error('❌ Fehler bei automatischer Rechnungserstellung (bestehende Bestellung):', invoiceResult.error);
          // Zahlung trotzdem erfolgreich, nur Rechnung fehlgeschlagen
        }
      } catch (invoiceError) {
        console.error('❌ Fehler bei automatischer Rechnungserstellung (bestehende Bestellung):', invoiceError);
        // Zahlung trotzdem erfolgreich, nur Rechnung fehlgeschlagen
      }

      res.json({
        success: true,
        message: 'Zahlung erfolgreich abgeschlossen',
        orderNumber: orderNumber,
        transactionId: captureResult.id
      });
    } else {
      throw new Error(captureResult.error || 'Fehler beim Erfassen der PayPal-Zahlung');
    }

  } catch (error) {
    console.error('❌ Fehler beim Erfassen der PayPal-Zahlung:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Erfassen der PayPal-Zahlung: ' + error.message
    });
  }
});

// 🔔 PayPal Webhook für Rückerstattungsbenachrichtigungen
router.post('/paypal-webhook', async (req, res) => {
  try {
    console.log('🔔 PayPal Webhook erhalten:', JSON.stringify(req.body, null, 2));
    
    const webhookEvent = req.body;
    
    // Prüfen ob es sich um eine Rückerstattung handelt
    if (webhookEvent.event_type === 'PAYMENT.CAPTURE.REFUNDED') {
      const refundData = webhookEvent.resource;
      const captureId = refundData.links?.find(link => link.rel === 'up')?.href?.split('/').pop();
      
      console.log('💰 PayPal-Rückerstattung erkannt:', {
        refundId: refundData.id,
        amount: refundData.amount,
        captureId: captureId
      });
      
      // Bestellung anhand der PayPal-Daten finden
      const order = await Order.findOne({
        $or: [
          { 'zahlung.transactionId': captureId },
          { 'zahlung.paypalOrderId': { $exists: true } }
        ]
      });
      
      if (order) {
        console.log('📋 Zugehörige Bestellung gefunden:', order.bestellnummer);
        
        // Rückerstattung in Bestellung speichern
        order.rueckerstattung = {
          refundId: refundData.id,
          status: 'erfolgreich',
          betrag: refundData.amount,
          zeitpunkt: new Date(),
          methode: 'paypal_webhook',
          notiz: 'Automatisch via PayPal-Webhook erfasst',
          bearbeiter: 'PayPal-System'
        };
        
        // Status-Verlauf aktualisieren
        if (!order.statusVerlauf) {
          order.statusVerlauf = [];
        }
        
        order.statusVerlauf.push({
          status: order.status,
          zeitpunkt: new Date(),
          notiz: `PayPal-Rückerstattung automatisch erfasst (${refundData.id})`,
          bearbeiter: 'PayPal-Webhook'
        });
        
        await order.save();
        
        console.log('✅ Rückerstattung automatisch in Bestellung gespeichert');
      } else {
        console.warn('⚠️ Keine passende Bestellung für PayPal-Rückerstattung gefunden');
      }
    }
    
    // PayPal-Webhook bestätigen
    res.status(200).json({ received: true });
    
  } catch (error) {
    console.error('❌ Fehler beim Verarbeiten des PayPal-Webhooks:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Verarbeiten des PayPal-Webhooks: ' + error.message
    });
  }
});

// @route   POST /api/orders/validate-tracking
// @desc    Validiert Tracking-Nummer für einen bestimmten Anbieter
// @access  Private (Admin)
router.post('/validate-tracking', async (req, res) => {
  try {
    const { anbieter, sendungsnummer } = req.body;
    
    if (!anbieter || !sendungsnummer) {
      return res.status(400).json({
        success: false,
        message: 'Anbieter und Sendungsnummer sind erforderlich'
      });
    }
    
    const validation = validateShippingData({ anbieter, sendungsnummer });
    
    if (validation.valid) {
      const trackingUrl = generateTrackingUrl(anbieter, sendungsnummer);
      
      res.json({
        success: true,
        message: 'Tracking-Nummer ist gültig',
        data: {
          valid: true,
          cleanedNumber: sendungsnummer.replace(/[\s-]/g, ''),
          trackingUrl: trackingUrl
        }
      });
    } else {
      res.status(400).json({
        success: false,
        message: 'Ungültige Tracking-Nummer',
        errors: validation.errors
      });
    }
    
  } catch (error) {
    console.error('❌ Fehler bei Tracking-Validierung:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler bei der Validierung'
    });
  }
});

module.exports = router;