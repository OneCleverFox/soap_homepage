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