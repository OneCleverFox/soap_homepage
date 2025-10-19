const express = require('express');
const router = express.Router();
const Order = require('../models/Order');
const Kunde = require('../models/Kunde');
const Portfolio = require('../models/Portfolio');
const Rohseife = require('../models/Rohseife');
const Duftoil = require('../models/Duftoil');
const Verpackung = require('../models/Verpackung');
const Bestand = require('../models/Bestand');
const Bewegung = require('../models/Bewegung');
const { authenticateToken } = require('../middleware/auth');
const PDFService = require('../services/PDFService');
const PayPalService = require('../services/PayPalService');
const emailService = require('../services/emailService');

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

    // Kunde ermitteln (falls angemeldet)
    let kunde = null;
    
    if (req.user && req.user.kundeId) {
      kunde = await Kunde.findById(req.user.kundeId);
    }

    // Artikel validieren und Preise aus Datenbank laden
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
      kunde: kunde?._id,
      
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
        strasse: lieferadresse.strasse,
        hausnummer: lieferadresse.hausnummer,
        zusatz: lieferadresse.zusatz || '',
        plz: lieferadresse.plz,
        stadt: lieferadresse.stadt,
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
      
      // Kontaktdaten
      kontakt: {
        email: kunde?.email || rechnungsadresse.email,
        telefon: kunde?.telefon || rechnungsadresse.telefon
      },
      
      // Adressen
      rechnungsadresse: {
        vorname: rechnungsadresse.vorname,
        nachname: rechnungsadresse.nachname,
        strasse: rechnungsadresse.strasse,
        hausnummer: rechnungsadresse.hausnummer,
        zusatz: rechnungsadresse.zusatz,
        plz: rechnungsadresse.plz,
        stadt: rechnungsadresse.stadt,
        land: rechnungsadresse.land || 'Deutschland'
      },
      
      lieferadresse: {
        vorname: lieferadresse.vorname,
        nachname: lieferadresse.nachname,
        strasse: lieferadresse.strasse,
        hausnummer: lieferadresse.hausnummer,
        zusatz: lieferadresse.zusatz,
        plz: lieferadresse.plz,
        stadt: lieferadresse.stadt,
        land: lieferadresse.land || 'Deutschland'
      },
      
      // Artikel
      artikel: validierteArtikel,
      
      // Preise
      versandkosten,
      gesamt: {
        netto: netto,
        mwst: mwst,
        mwstSatz: 19,
        brutto: brutto
      },
      
      // Status
      status: 'ausstehend',
      
      // Notizen
      notizen: {
        kunde: notizen?.kunde || '',
        intern: ''
      },
      
      // Zahlungsdaten (wird später von PayPal aktualisiert)
      zahlung: {
        methode: 'paypal',
        status: 'ausstehend'
      }
    });

    // Bestandsabgang durchführen vor dem Speichern
    console.log('📦 Führe Bestandsabgang durch...');
    for (const artikel_item of validierteArtikel) {
      try {
        const bestand = await Bestand.findOne({
          artikelId: artikel_item.produktId,
          typ: artikel_item.produktType === 'portfolio' ? 'produkt' : artikel_item.produktType
        });

        if (bestand) {
          if (bestand.menge >= artikel_item.menge) {
            bestand.menge -= artikel_item.menge;
            await bestand.save();
            console.log(`📦 Bestand reduziert: ${artikel_item.name} (-${artikel_item.menge})`);
            
            // Bewegung dokumentieren
            try {
              const bewegung = new Bewegung({
                bestandId: bestand._id,
                typ: 'ausgang',
                menge: artikel_item.menge,
                grund: 'bestellung',
                referenzId: null, // Wird nach Speichern der Bestellung gesetzt
                bemerkung: `Bestellung: ${artikel_item.name}`
              });
              await bewegung.save();
            } catch (bewegungError) {
              console.warn('Warnung: Bewegung konnte nicht gespeichert werden:', bewegungError);
            }
          } else {
            console.warn(`⚠️ Nicht genügend Bestand für: ${artikel_item.name} (verfügbar: ${bestand.menge}, benötigt: ${artikel_item.menge})`);
          }
        } else {
          console.warn(`⚠️ Kein Bestandseintrag gefunden für: ${artikel_item.name}`);
        }
      } catch (bestandError) {
        console.error('Fehler beim Bestandsabgang für:', artikel_item.name, bestandError);
      }
    }

    // Bestellung speichern
    const gespeicherteBestellung = await neueBestellung.save();
    console.log('✅ Bestellung gespeichert:', gespeicherteBestellung.bestellnummer);

    // PayPal-Zahlung erstellen
    try {
      const paypalResult = await PayPalService.createPayment(gespeicherteBestellung);
      
      // PayPal-Daten in Bestellung speichern
      gespeicherteBestellung.zahlung.paypalOrderId = paypalResult.paypalOrderId;
      gespeicherteBestellung.zahlung.status = 'paypal_erstellt';
      await gespeicherteBestellung.save();
      
      console.log('💳 PayPal-Zahlung erstellt:', paypalResult.paypalOrderId);
      
      res.status(201).json({
        success: true,
        message: 'Bestellung erstellt - Weiterleitung zu PayPal',
        data: {
          bestellungId: gespeicherteBestellung._id,
          bestellnummer: gespeicherteBestellung.bestellnummer,
          paypalUrl: paypalResult.approvalUrl,
          paypalOrderId: paypalResult.paypalOrderId
        }
      });
      
    } catch (paypalError) {
      console.error('❌ PayPal-Fehler:', paypalError);
      
      // Bestellung als fehlgeschlagen markieren
      gespeicherteBestellung.status = 'fehler';
      gespeicherteBestellung.notizen.intern = 'PayPal-Fehler: ' + paypalError.message;
      await gespeicherteBestellung.save();
      
      res.status(500).json({
        success: false,
        message: 'Fehler bei PayPal-Integration: ' + paypalError.message
      });
    }

  } catch (error) {
    console.error('❌ Fehler beim Erstellen der Bestellung:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Erstellen der Bestellung: ' + error.message
    });
  }
});

// ✅ PayPal-Zahlung bestätigen (Success-Callback)
router.post('/paypal/success', async (req, res) => {
  try {
    const { paypalOrderId, orderId } = req.body;
    
    console.log('✅ PayPal Success-Callback:', { paypalOrderId, orderId });
    
    // Bestellung finden
    const bestellung = await Order.findById(orderId);
    if (!bestellung) {
      return res.status(404).json({
        success: false,
        message: 'Bestellung nicht gefunden'
      });
    }
    
    // PayPal-Zahlung erfassen
    const captureResult = await PayPalService.capturePayment(paypalOrderId);
    
    // Bestellung aktualisieren
    bestellung.status = 'bestätigt';
    bestellung.zahlung.status = 'bezahlt';
    bestellung.zahlung.transaktionsId = captureResult.transactionId;
    bestellung.zahlung.datum = new Date();
    bestellung.zahlung.betrag = captureResult.amount;
    
    await bestellung.save();
    
    console.log('💰 Zahlung erfolgreich - Bestellung bestätigt:', bestellung.bestellnummer);
    
    // E-Mails versenden
    try {
      await sendOrderEmails(bestellung);
    } catch (emailError) {
      console.error('📧 E-Mail-Versand fehlgeschlagen:', emailError);
      // Bestellung trotzdem als erfolgreich markieren
    }
    
    res.status(200).json({
      success: true,
      message: 'Zahlung erfolgreich - Bestellung bestätigt',
      data: {
        bestellnummer: bestellung.bestellnummer,
        status: bestellung.status
      }
    });
    
  } catch (error) {
    console.error('❌ Fehler bei PayPal-Success:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler bei Zahlungsbestätigung: ' + error.message
    });
  }
});

// 💳 PayPal-Zahlung erfassen (Frontend Success-Page)
router.post('/capture-payment', async (req, res) => {
  try {
    const { paypalOrderId, orderId } = req.body;
    
    console.log('💳 Erfasse PayPal-Zahlung:', { paypalOrderId, orderId });
    
    // Bestellung finden
    const bestellung = await Order.findById(orderId);
    if (!bestellung) {
      return res.status(404).json({
        success: false,
        message: 'Bestellung nicht gefunden'
      });
    }
    
    // PayPal-Zahlung erfassen
    const paypalService = new PayPalService();
    const captureResult = await paypalService.capturePayment(paypalOrderId);
    
    // Bestellung aktualisieren
    bestellung.status = 'bezahlt';
    bestellung.zahlung.status = 'bezahlt';
    bestellung.zahlung.transactionId = captureResult.transactionId;
    bestellung.zahlung.datum = new Date();
    bestellung.zahlung.betrag = captureResult.amount;
    
    await bestellung.save();
    
    console.log('✅ Zahlung erfolgreich erfasst:', bestellung.bestellnummer);
    
    // E-Mails versenden
    try {
      await sendOrderEmails(bestellung);
    } catch (emailError) {
      console.error('⚠️ Fehler beim E-Mail-Versand:', emailError);
      // Zahlung trotzdem als erfolgreich behandeln
    }
    
    res.status(200).json({
      success: true,
      message: 'Zahlung erfolgreich abgeschlossen',
      data: {
        bestellnummer: bestellung.bestellnummer,
        status: bestellung.status,
        gesamt: bestellung.gesamt,
        zahlung: {
          transactionId: bestellung.zahlung.transactionId,
          status: bestellung.zahlung.status,
          datum: bestellung.zahlung.datum
        }
      }
    });
    
  } catch (error) {
    console.error('❌ Fehler beim Erfassen der Zahlung:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Erfassen der Zahlung: ' + error.message
    });
  }
});

// ❌ PayPal-Zahlung abgebrochen (Cancel-Callback)
router.post('/paypal/cancel', async (req, res) => {
  try {
    const { orderId } = req.body;
    
    console.log('❌ PayPal Cancel-Callback:', orderId);
    
    // Bestellung finden und als storniert markieren
    const bestellung = await Order.findById(orderId);
    if (bestellung) {
      bestellung.status = 'storniert';
      bestellung.zahlung.status = 'abgebrochen';
      bestellung.notizen.intern = 'Zahlung vom Kunden abgebrochen';
      await bestellung.save();
    }
    
    res.status(200).json({
      success: true,
      message: 'Zahlung abgebrochen'
    });
    
  } catch (error) {
    console.error('❌ Fehler bei PayPal-Cancel:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Abbrechen: ' + error.message
    });
  }
});

// 📧 E-Mails für Bestellung versenden
async function sendOrderEmails(bestellung) {
  try {
    console.log('📧 Versende E-Mails für Bestellung:', bestellung.bestellnummer);
    
    // PDF-Rechnung generieren
    const pdfBuffer = await PDFService.generateInvoicePDF(bestellung);
    
    // E-Mail an Kunden
    if (bestellung.kontakt?.email) {
      const kundenname = `${bestellung.rechnungsadresse.vorname} ${bestellung.rechnungsadresse.nachname}`;
      
      await emailService.sendOrderConfirmation(
        bestellung.kontakt.email,
        { bestellung, kundenname },
        pdfBuffer
      );
      
      console.log('✅ Bestätigungs-E-Mail an Kunde versendet');
    }
    
    // E-Mail an Admin
    const adminOrderData = {
      bestellung,
      kundenname: `${bestellung.rechnungsadresse.vorname} ${bestellung.rechnungsadresse.nachname}`,
      gesamtbetrag: bestellung.gesamt.brutto
    };
    
    await emailService.sendAdminOrderNotification(adminOrderData, pdfBuffer);
    console.log('✅ Benachrichtigungs-E-Mail an Admin versendet');
    
  } catch (error) {
    console.error('❌ Fehler beim E-Mail-Versand:', error);
    throw error;
  }
}

// 🛒 Eigene Bestellungen abrufen (für angemeldete Kunden)
router.get('/meine-bestellungen', authenticateToken, async (req, res) => {
  try {
    console.log('📦 Lade Bestellungen für Kunde ID:', req.user?.kundeId);
    
    // Prüfen ob es ein angemeldeter Kunde ist
    if (!req.user || !req.user.kundeId) {
      return res.status(401).json({
        success: false,
        message: 'Nur für angemeldete Kunden zugänglich'
      });
    }

    const {
      status,
      limit = 20,
      skip = 0,
      sortBy = 'bestelldatum',
      sortOrder = 'desc'
    } = req.query;

    // Filter für eigene Bestellungen
    const filter = {
      kunde: req.user.kundeId
    };

    if (status) {
      filter.status = status;
    }

    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;

    const bestellungen = await Order.find(filter)
      .sort(sortOptions)
      .limit(parseInt(limit))
      .skip(parseInt(skip))
      .select('-zahlung.transaktionsId -notizen.intern') // Sensible Daten ausschließen
      .lean();

    const total = await Order.countDocuments(filter);

    console.log(`✅ ${bestellungen.length} Bestellungen für Kunde ${req.user.email} gefunden`);

    res.status(200).json({
      success: true,
      message: 'Bestellungen erfolgreich abgerufen',
      data: {
        bestellungen,
        pagination: {
          total,
          limit: parseInt(limit),
          skip: parseInt(skip),
          hasMore: (parseInt(skip) + parseInt(limit)) < total
        }
      }
    });

  } catch (error) {
    console.error('❌ Fehler beim Abrufen der Bestellungen:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Abrufen der Bestellungen'
    });
  }
});

// 📋 Einzelne Bestellung abrufen (für angemeldete Kunden)
router.get('/meine-bestellungen/:id', authenticateToken, async (req, res) => {
  try {
    console.log('📦 Lade Bestellung ID:', req.params.id, 'für Kunde:', req.user?.kundeId);
    
    // Prüfen ob es ein angemeldeter Kunde ist
    if (!req.user || !req.user.kundeId) {
      return res.status(401).json({
        success: false,
        message: 'Nur für angemeldete Kunden zugänglich'
      });
    }

    const bestellung = await Order.findOne({
      _id: req.params.id,
      kunde: req.user.kundeId // Nur eigene Bestellungen
    })
    .select('-zahlung.transaktionsId -notizen.intern') // Sensible Daten ausschließen
    .lean();

    if (!bestellung) {
      return res.status(404).json({
        success: false,
        message: 'Bestellung nicht gefunden oder keine Berechtigung'
      });
    }

    console.log(`✅ Bestellung ${bestellung.bestellnummer} für Kunde ${req.user.email} gefunden`);

    res.status(200).json({
      success: true,
      message: 'Bestellung erfolgreich abgerufen',
      data: bestellung
    });

  } catch (error) {
    console.error('❌ Fehler beim Abrufen der Bestellung:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Abrufen der Bestellung'
    });
  }
});

// 🧾 Rechnung als PDF herunterladen (für angemeldete Kunden)
router.get('/meine-bestellungen/:id/rechnung', authenticateToken, async (req, res) => {
  try {
    console.log('🧾 Generiere Rechnung für Bestellung ID:', req.params.id, 'für Kunde:', req.user?.kundeId);
    
    // Prüfen ob es ein angemeldeter Kunde ist
    if (!req.user || !req.user.kundeId) {
      return res.status(401).json({
        success: false,
        message: 'Nur für angemeldete Kunden zugänglich'
      });
    }

    const bestellung = await Order.findOne({
      _id: req.params.id,
      kunde: req.user.kundeId // Nur eigene Bestellungen
    }).lean();

    if (!bestellung) {
      return res.status(404).json({
        success: false,
        message: 'Bestellung nicht gefunden oder keine Berechtigung'
      });
    }

    // PDF generieren
    const pdfBuffer = await PDFService.generateInvoicePDF(bestellung);
    
    // PDF als Download senden
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="Rechnung_${bestellung.bestellnummer}.pdf"`);
    res.setHeader('Content-Length', pdfBuffer.length);
    
    res.send(pdfBuffer);
    
    console.log(`✅ PDF-Rechnung für Bestellung ${bestellung.bestellnummer} erfolgreich generiert`);

  } catch (error) {
    console.error('❌ Fehler beim Generieren der Rechnung:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Generieren der Rechnung: ' + error.message
    });
  }
});

// 🛒 Alle Bestellungen abrufen (mit Filteroptionen)
router.get('/', async (req, res) => {
  try {
    const {
      status,
      email,
      kundennummer,
      von,
      bis,
      limit = 50,
      skip = 0,
      sortBy = 'bestelldatum',
      sortOrder = 'desc'
    } = req.query;

    // Filter-Objekt erstellen
    const filter = {};

    if (status) {
      filter.status = status;
    }

    if (email) {
      filter['besteller.email'] = { $regex: email, $options: 'i' };
    }

    if (kundennummer) {
      filter['besteller.kundennummer'] = kundennummer;
    }

    if (von || bis) {
      filter.bestelldatum = {};
      if (von) filter.bestelldatum.$gte = new Date(von);
      if (bis) filter.bestelldatum.$lte = new Date(bis);
    }

    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;

    const orders = await Order.find(filter)
      .populate('kunde', 'kundennummer vorname nachname email')
      .sort(sortOptions)
      .limit(parseInt(limit))
      .skip(parseInt(skip));

    const total = await Order.countDocuments(filter);

    // Statistiken hinzufügen
    const stats = await Order.aggregate([
      { $match: filter },
      {
        $group: {
          _id: null,
          gesamtBestellungen: { $sum: 1 },
          gesamtUmsatz: { $sum: '$preise.gesamtsumme' },
          durchschnittBestellwert: { $avg: '$preise.gesamtsumme' },
          statusVerteilung: {
            $push: '$status'
          }
        }
      }
    ]);

    res.json({
      success: true,
      data: {
        orders,
        pagination: {
          total,
          limit: parseInt(limit),
          skip: parseInt(skip),
          hasMore: (parseInt(skip) + orders.length) < total
        },
        statistics: stats[0] || {}
      }
    });

  } catch (error) {
    console.error('Fehler beim Abrufen der Bestellungen:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Abrufen der Bestellungen',
      error: error.message
    });
  }
});

// 🆔 Einzelne Bestellung abrufen
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Suche nach ID oder Bestellnummer
    const query = id.match(/^[0-9a-fA-F]{24}$/) 
      ? { _id: id }
      : { bestellnummer: id };

    const order = await Order.findOne(query)
      .populate('kunde', 'kundennummer vorname nachname email telefon')
      .populate({
        path: 'artikel.produktId',
        select: 'name beschreibung preis bild'
      });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Bestellung nicht gefunden'
      });
    }

    res.json({
      success: true,
      data: order
    });

  } catch (error) {
    console.error('Fehler beim Abrufen der Bestellung:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Abrufen der Bestellung',
      error: error.message
    });
  }
});

// ➕ Neue Bestellung erstellen
router.post('/', async (req, res) => {
  try {
    const {
      besteller,
      rechnungsadresse,
      lieferadresse,
      artikel,
      zahlung,
      versand,
      notizen,
      istGeschenk,
      geschenkNachricht,
      quelle
    } = req.body;

    // Validierung der Artikel und Preisberechnung
    const validierteArtikel = [];
    let zwischensumme = 0;

    for (const artikel_item of artikel) {
      let produkt = null;
      let produktSnapshot = {};

      // Produkt je nach Typ laden
      switch (artikel_item.produktType) {
        case 'portfolio':
          produkt = await Portfolio.findById(artikel_item.produktId);
          if (produkt) {
            produktSnapshot = {
              name: produkt.name,
              beschreibung: produkt.beschreibung,
              kategorie: produkt.kategorie,
              bild: produkt.bild,
              gewicht: produkt.gewicht,
              inhaltsstoffe: produkt.inhaltsstoffe
            };
          }
          break;

        case 'rohseife':
          produkt = await Rohseife.findById(artikel_item.produktId);
          if (produkt) {
            produktSnapshot = {
              name: produkt.name,
              beschreibung: produkt.beschreibung,
              kategorie: 'Rohseife',
              gewicht: produkt.gewichtProStueck
            };
          }
          break;

        case 'duftoele':
          produkt = await Duftoil.findById(artikel_item.produktId);
          if (produkt) {
            produktSnapshot = {
              name: produkt.name,
              beschreibung: produkt.beschreibung,
              kategorie: 'Duftöl',
              duftrichtung: produkt.duftrichtung
            };
          }
          break;

        case 'verpackung':
          produkt = await Verpackung.findById(artikel_item.produktId);
          if (produkt) {
            produktSnapshot = {
              name: produkt.form,
              beschreibung: `Verpackung ${produkt.form}`,
              kategorie: 'Verpackung',
              form: produkt.form
            };
          }
          break;

        case 'custom':
          // Für custom-Produkte Snapshot direkt verwenden
          produktSnapshot = artikel_item.produktSnapshot;
          break;

        default:
          throw new Error(`Unbekannter Produkttyp: ${artikel_item.produktType}`);
      }

      // Preis validieren (außer bei custom-Produkten)
      let einzelpreis = artikel_item.einzelpreis;
      if (artikel_item.produktType !== 'custom' && produkt) {
        const originalPreis = produkt.preis || produkt.kostenProStueck || produkt.kostenProTropfen || 0;
        // Preisabweichung von mehr als 10% warnen
        if (Math.abs(einzelpreis - originalPreis) > originalPreis * 0.1) {
          console.warn(`Preisabweichung bei ${produktSnapshot.name}: ${einzelpreis} vs ${originalPreis}`);
        }
      }

      const gesamtpreis = einzelpreis * artikel_item.menge;
      zwischensumme += gesamtpreis;

      validierteArtikel.push({
        produktType: artikel_item.produktType,
        produktId: artikel_item.produktId,
        produktSnapshot,
        menge: artikel_item.menge,
        einzelpreis,
        gesamtpreis,
        konfiguration: artikel_item.konfiguration || {}
      });
    }

    // Kunde suchen falls E-Mail bekannt
    let kunde = null;
    if (besteller.email) {
      kunde = await Kunde.findOne({ email: besteller.email.toLowerCase() });
      if (kunde) {
        besteller.kundennummer = kunde.kundennummer;
      }
    }

    // Versandkosten berechnen (vereinfacht)
    let versandkosten = 0;
    if (zwischensumme < 50) {
      versandkosten = 4.99; // Standardversand
    }
    if (versand && versand.methode === 'express') {
      versandkosten += 5.00;
    }

    // MwSt berechnen
    const mwstSatz = 19; // 19%
    const nettoBetrag = zwischensumme + versandkosten;
    const mwstBetrag = nettoBetrag * (mwstSatz / 100);
    const gesamtsumme = nettoBetrag + mwstBetrag;

    // Neue Bestellung erstellen
    const neueBestellung = new Order({
      kunde: kunde ? kunde._id : null,
      besteller,
      rechnungsadresse,
      lieferadresse: lieferadresse || { verwendeRechnungsadresse: true },
      artikel: validierteArtikel,
      preise: {
        zwischensumme,
        versandkosten,
        mwst: {
          satz: mwstSatz,
          betrag: mwstBetrag
        },
        gesamtsumme
      },
      zahlung: zahlung || { methode: 'ueberweisung' },
      versand: versand || {},
      notizen: notizen || {},
      istGeschenk: istGeschenk || false,
      geschenkNachricht: geschenkNachricht || '',
      quelle: quelle || 'website'
    });

    await neueBestellung.save();

    // 📦 Lagerbestand aktualisieren für Portfolio-Produkte
    try {
      for (const artikel_item of validierteArtikel) {
        if (artikel_item.produktType === 'portfolio') {
          const bestand = await Bestand.findOne({
            typ: 'produkt',
            artikelId: artikel_item.produktId
          });
          
          if (bestand) {
            const vorher = bestand.menge;
            await bestand.verringereBestand(artikel_item.menge, 'bestellung');
            
            // Erstelle Bewegungs-Log
            await Bewegung.erstelle({
              typ: 'ausgang',
              bestandId: bestand._id,
              artikel: {
                typ: 'produkt',
                artikelId: artikel_item.produktId,
                name: artikel_item.produktSnapshot.name
              },
              menge: -artikel_item.menge,
              einheit: 'stück',
              bestandVorher: vorher,
              bestandNachher: bestand.menge,
              grund: `Bestellung ${neueBestellung.bestellnummer}`,
              referenz: {
                typ: 'bestellung',
                id: neueBestellung._id
              },
              notizen: `Kunde: ${besteller.email}`
            });
            
            console.log(`📦 Lagerbestand aktualisiert: ${artikel_item.produktSnapshot.name} -${artikel_item.menge} (Neuer Bestand: ${bestand.menge})`);
          } else {
            console.warn(`⚠️ Kein Lagerbestand für Produkt ${artikel_item.produktId} gefunden`);
          }
        }
      }
    } catch (lagerError) {
      console.error('Fehler bei Lageraktualisierung:', lagerError);
      // Bestellung ist trotzdem erfolgreich, nur Warnung loggen
    }

    // Bestätigung-E-Mail (hier nur Logging)
    console.log(`📧 Bestellbestätigung für ${besteller.email} - Bestellung ${neueBestellung.bestellnummer}`);

    res.status(201).json({
      success: true,
      message: 'Bestellung erfolgreich erstellt',
      data: {
        bestellnummer: neueBestellung.bestellnummer,
        gesamtsumme: neueBestellung.preise.gesamtsumme,
        status: neueBestellung.status,
        order: neueBestellung
      }
    });

  } catch (error) {
    console.error('Fehler beim Erstellen der Bestellung:', error);
    res.status(400).json({
      success: false,
      message: 'Fehler beim Erstellen der Bestellung',
      error: error.message
    });
  }
});

// 🔄 Bestellstatus aktualisieren
router.patch('/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status, notiz, bearbeiter } = req.body;

    // Suche nach ID oder Bestellnummer
    const query = id.match(/^[0-9a-fA-F]{24}$/) 
      ? { _id: id }
      : { bestellnummer: id };

    const order = await Order.findOne(query);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Bestellung nicht gefunden'
      });
    }

    // Status aktualisieren
    const alterStatus = order.status;
    await order.aktualisiereStatus(status, notiz, bearbeiter);

    // 📦 Bei Stornierung oder Retoure: Lagerbestand wieder erhöhen
    if ((status === 'storniert' || status === 'retourniert') && alterStatus !== status) {
      try {
        for (const artikel_item of order.artikel) {
          if (artikel_item.produktType === 'portfolio') {
            const bestand = await Bestand.findOne({
              typ: 'produkt',
              artikelId: artikel_item.produktId
            });
            
            if (bestand) {
              const vorher = bestand.menge;
              await bestand.erhoeheBestand(artikel_item.menge, 'retoure');
              
              // Erstelle Bewegungs-Log
              await Bewegung.erstelle({
                typ: 'eingang',
                bestandId: bestand._id,
                artikel: {
                  typ: 'produkt',
                  artikelId: artikel_item.produktId,
                  name: artikel_item.produktSnapshot.name
                },
                menge: artikel_item.menge,
                einheit: 'stück',
                bestandVorher: vorher,
                bestandNachher: bestand.menge,
                grund: `${status === 'storniert' ? 'Stornierung' : 'Retoure'} ${order.bestellnummer}`,
                referenz: {
                  typ: status === 'storniert' ? 'stornierung' : 'retoure',
                  id: order._id
                },
                notizen: notiz || ''
              });
              
              console.log(`📦 Lagerbestand erhöht (${status}): ${artikel_item.produktSnapshot.name} +${artikel_item.menge} (Neuer Bestand: ${bestand.menge})`);
            }
          }
        }
      } catch (lagerError) {
        console.error('Fehler bei Lageraktualisierung (Retoure):', lagerError);
      }
    }

    res.json({
      success: true,
      message: `Status erfolgreich zu "${status}" geändert`,
      data: {
        bestellnummer: order.bestellnummer,
        alterStatus,
        neuerStatus: status,
        statusVerlauf: order.statusVerlauf
      }
    });

  } catch (error) {
    console.error('Fehler beim Aktualisieren des Status:', error);
    res.status(400).json({
      success: false,
      message: 'Fehler beim Aktualisieren des Status',
      error: error.message
    });
  }
});

// 💰 Zahlung aktualisieren
router.patch('/:id/payment', async (req, res) => {
  try {
    const { id } = req.params;
    const { status, transaktionsId, methode } = req.body;

    const query = id.match(/^[0-9a-fA-F]{24}$/) 
      ? { _id: id }
      : { bestellnummer: id };

    const order = await Order.findOne(query);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Bestellung nicht gefunden'
      });
    }

    // Zahlungsinformationen aktualisieren
    if (status) order.zahlung.status = status;
    if (transaktionsId) order.zahlung.transaktionsId = transaktionsId;
    if (methode) order.zahlung.methode = methode;

    if (status === 'bezahlt' && !order.zahlung.bezahltAm) {
      order.zahlung.bezahltAm = new Date();
      // Bestellstatus automatisch auf "bezahlt" setzen
      await order.aktualisiereStatus('bezahlt', 'Zahlung eingegangen', 'System');
    }

    await order.save();

    res.json({
      success: true,
      message: 'Zahlungsinformationen erfolgreich aktualisiert',
      data: {
        bestellnummer: order.bestellnummer,
        zahlung: order.zahlung
      }
    });

  } catch (error) {
    console.error('Fehler beim Aktualisieren der Zahlung:', error);
    res.status(400).json({
      success: false,
      message: 'Fehler beim Aktualisieren der Zahlung',
      error: error.message
    });
  }
});

// 📦 Versand aktualisieren
router.patch('/:id/shipping', async (req, res) => {
  try {
    const { id } = req.params;
    const { 
      methode, 
      anbieter, 
      sendungsnummer, 
      voraussichtlicheLieferung,
      notiz 
    } = req.body;

    const query = id.match(/^[0-9a-fA-F]{24}$/) 
      ? { _id: id }
      : { bestellnummer: id };

    const order = await Order.findOne(query);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Bestellung nicht gefunden'
      });
    }

    // Versandinformationen aktualisieren
    if (methode) order.versand.methode = methode;
    if (anbieter) order.versand.anbieter = anbieter;
    if (sendungsnummer) {
      order.versand.sendungsnummer = sendungsnummer;
      // Automatisch als verschickt markieren
      if (!order.versand.verschickt) {
        await order.aktualisiereStatus('verschickt', notiz || 'Sendungsnummer hinzugefügt', 'System');
      }
    }
    if (voraussichtlicheLieferung) {
      order.versand.voraussichtlicheLieferung = new Date(voraussichtlicheLieferung);
    }

    await order.save();

    res.json({
      success: true,
      message: 'Versandinformationen erfolgreich aktualisiert',
      data: {
        bestellnummer: order.bestellnummer,
        versand: order.versand
      }
    });

  } catch (error) {
    console.error('Fehler beim Aktualisieren des Versands:', error);
    res.status(400).json({
      success: false,
      message: 'Fehler beim Aktualisieren des Versands',
      error: error.message
    });
  }
});

// 💬 Kommunikation hinzufügen
router.post('/:id/communication', async (req, res) => {
  try {
    const { id } = req.params;
    const { typ, richtung, betreff, inhalt, bearbeiter } = req.body;

    const query = id.match(/^[0-9a-fA-F]{24}$/) 
      ? { _id: id }
      : { bestellnummer: id };

    const order = await Order.findOne(query);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Bestellung nicht gefunden'
      });
    }

    await order.hinzufuegenKommunikation(typ, richtung, betreff, inhalt, bearbeiter);

    res.json({
      success: true,
      message: 'Kommunikation erfolgreich hinzugefügt',
      data: {
        bestellnummer: order.bestellnummer,
        letzteKommunikation: order.kommunikation[order.kommunikation.length - 1]
      }
    });

  } catch (error) {
    console.error('Fehler beim Hinzufügen der Kommunikation:', error);
    res.status(400).json({
      success: false,
      message: 'Fehler beim Hinzufügen der Kommunikation',
      error: error.message
    });
  }
});

// 📊 Dashboard-Statistiken
router.get('/stats/dashboard', async (req, res) => {
  try {
    const { zeitraum = '30' } = req.query; // Letzte 30 Tage
    const vonDatum = new Date();
    vonDatum.setDate(vonDatum.getDate() - parseInt(zeitraum));

    const stats = await Order.aggregate([
      {
        $match: {
          bestelldatum: { $gte: vonDatum }
        }
      },
      {
        $group: {
          _id: null,
          gesamtBestellungen: { $sum: 1 },
          gesamtUmsatz: { $sum: '$preise.gesamtsumme' },
          durchschnittBestellwert: { $avg: '$preise.gesamtsumme' },
          bestellungenProTag: {
            $push: {
              tag: { $dateToString: { format: "%Y-%m-%d", date: "$bestelldatum" } },
              betrag: '$preise.gesamtsumme'
            }
          },
          statusVerteilung: { $push: '$status' },
          beliebteProdukte: { $push: '$artikel' }
        }
      }
    ]);

    // Status-Verteilung berechnen
    const statusCount = {};
    if (stats[0]) {
      stats[0].statusVerteilung.forEach(status => {
        statusCount[status] = (statusCount[status] || 0) + 1;
      });
    }

    // Umsatz pro Tag
    const umsatzProTag = {};
    if (stats[0]) {
      stats[0].bestellungenProTag.forEach(item => {
        if (!umsatzProTag[item.tag]) {
          umsatzProTag[item.tag] = { bestellungen: 0, umsatz: 0 };
        }
        umsatzProTag[item.tag].bestellungen += 1;
        umsatzProTag[item.tag].umsatz += item.betrag;
      });
    }

    res.json({
      success: true,
      data: {
        zeitraum: `Letzte ${zeitraum} Tage`,
        übersicht: {
          gesamtBestellungen: stats[0]?.gesamtBestellungen || 0,
          gesamtUmsatz: stats[0]?.gesamtUmsatz || 0,
          durchschnittBestellwert: stats[0]?.durchschnittBestellwert || 0
        },
        statusVerteilung: statusCount,
        umsatzProTag,
        generiert: new Date()
      }
    });

  } catch (error) {
    console.error('Fehler beim Abrufen der Dashboard-Statistiken:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Abrufen der Dashboard-Statistiken',
      error: error.message
    });
  }
});

// 🔍 Bestellung suchen
router.get('/search/:suchbegriff', async (req, res) => {
  try {
    const { suchbegriff } = req.params;
    
    const orders = await Order.find({
      $or: [
        { bestellnummer: { $regex: suchbegriff, $options: 'i' } },
        { 'besteller.email': { $regex: suchbegriff, $options: 'i' } },
        { 'besteller.vorname': { $regex: suchbegriff, $options: 'i' } },
        { 'besteller.nachname': { $regex: suchbegriff, $options: 'i' } },
        { 'besteller.kundennummer': { $regex: suchbegriff, $options: 'i' } },
        { 'versand.sendungsnummer': { $regex: suchbegriff, $options: 'i' } }
      ]
    })
    .populate('kunde', 'kundennummer vorname nachname')
    .limit(20)
    .sort({ bestelldatum: -1 });

    res.json({
      success: true,
      data: orders,
      anzahl: orders.length
    });

  } catch (error) {
    console.error('Fehler bei der Suche:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler bei der Suche',
      error: error.message
    });
  }
});

module.exports = router;