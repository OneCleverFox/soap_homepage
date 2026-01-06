const express = require("express");
const router = express.Router();
const Order = require("../models/Order");
const Kunde = require("../models/Kunde");
const Bestand = require("../models/Bestand");
const { reduceInventoryForProduct } = require("../utils/inventoryUtils");

router.get("/", async (req, res) => {
  try {
    const orders = await Order.find().sort({ bestelldatum: -1 }).limit(50);
    res.json({
      success: true,
      data: orders
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Fehler beim Abrufen der Bestellungen"
    });
  }
});

router.put("/:id/status", async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    
    const order = await Order.findById(id);
    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Bestellung nicht gefunden"
      });
    }
    
    order.status = status;
    await order.save();
    
    res.json({
      success: true,
      message: "Status aktualisiert"
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Fehler beim Status-Update"
    });
  }
});

// 🛒 Admin-Bestellung erstellen
router.post("/create-admin", async (req, res) => {
  try {
    const {
      besteller,
      rechnungsadresse,
      lieferadresse,
      artikel,
      notizen
    } = req.body;

    console.log('📝 Admin-Bestellung wird erstellt für:', besteller.email);

    // Kunde suchen oder erstellen
    let kunde = null;
    if (besteller.kundennummer) {
      kunde = await Kunde.findOne({ kundennummer: besteller.kundennummer });
    } else if (besteller.email) {
      kunde = await Kunde.findOne({ email: besteller.email.toLowerCase() });
    }

    // Neuen Kunden erstellen falls nicht vorhanden
    if (!kunde && besteller.email) {
      kunde = new Kunde({
        vorname: besteller.vorname,
        nachname: besteller.nachname,
        email: besteller.email.toLowerCase(),
        telefon: besteller.telefon,
        adresse: rechnungsadresse
      });
      await kunde.save();
      console.log('✅ Neuer Kunde erstellt:', kunde.kundennummer);
    }

    // Bestandsabgang durchführen - Neue Dual-Soap-fähige Logik
    const artikelMitBestand = [];
    for (const artikel_item of artikel) {
      try {
        // Verwende neue Inventar-Utility für Dual-Soap-Support
        if (artikel_item.produktType === 'portfolio') {
          const inventoryResult = await reduceInventoryForProduct(
            artikel_item.produktId, 
            artikel_item.menge
          );
          
          if (inventoryResult.success) {
            console.log(`✅ Bestand erfolgreich reduziert für: ${inventoryResult.produktName}`);
            if (inventoryResult.isDualSoap) {
              console.log(`   🔧 Dual-Soap Reduktion:`);
              inventoryResult.operations.forEach(op => {
                console.log(`      - ${op.rohseife}: -${op.reduzierung}g (${op.prozent}%)`);
              });
            }
          } else {
            console.warn(`⚠️ Bestandsreduktion fehlgeschlagen für: ${artikel_item.produktSnapshot.name}`);
            inventoryResult.operations.forEach(op => {
              if (!op.success) {
                console.warn(`      - ${op.rohseife}: ${op.error}`);
              }
            });
          }
        } else {
          // Fallback für andere Produkttypen (alte Logik)
          const bestand = await Bestand.findOne({
            artikelId: artikel_item.produktId,
            typ: artikel_item.produktType
          });

          if (bestand) {
            if (bestand.menge >= artikel_item.menge) {
              bestand.menge -= artikel_item.menge;
              await bestand.save();
              console.log(`📦 Bestand reduziert: ${artikel_item.produktSnapshot.name} (-${artikel_item.menge})`);
            } else {
              console.warn(`⚠️ Nicht genügend Bestand für: ${artikel_item.produktSnapshot.name} (verfügbar: ${bestand.menge}, benötigt: ${artikel_item.menge})`);
            }
          } else {
            console.warn(`⚠️ Kein Bestandseintrag gefunden für: ${artikel_item.produktSnapshot.name}`);
          }
        }

        artikelMitBestand.push(artikel_item);

      } catch (bestandError) {
        console.error('❌ Fehler beim Bestandsabgang:', bestandError);
        // Artikel trotzdem hinzufügen, aber Warnung loggen
        artikelMitBestand.push(artikel_item);
      }
    }

    // Preise berechnen (Deutsche Steuerbehandlung: Preise inkl. MwSt.)
    const zwischensumme = artikelMitBestand.reduce((sum, item) => sum + item.gesamtpreis, 0);
    const versandkosten = zwischensumme < 30 ? 5.99 : 0;
    const mwstSatz = 19;
    
    // In Deutschland sind Preise normalerweise INKLUSIVE MwSt.
    // Gesamtsumme = Zwischensumme (inkl. MwSt.) + Versandkosten (inkl. MwSt.)
    const gesamtsumme = zwischensumme + versandkosten;
    
    // MwSt.-Betrag aus dem Gesamtbetrag herausrechnen (nicht hinzufügen!)
    const nettoBetrag = gesamtsumme / (1 + mwstSatz / 100);
    const mwstBetrag = gesamtsumme - nettoBetrag;

    // Bestellung erstellen
    const neueBestellung = new Order({
      kunde: kunde ? kunde._id : null,
      besteller: {
        ...besteller,
        kundennummer: kunde ? kunde.kundennummer : null
      },
      rechnungsadresse,
      lieferadresse: lieferadresse || { verwendeRechnungsadresse: true },
      artikel: artikelMitBestand,
      preise: {
        zwischensumme,
        versandkosten,
        mwst: {
          satz: mwstSatz,
          betrag: mwstBetrag
        },
        gesamtsumme
      },
      zahlung: {
        methode: 'admin_bestellung',
        status: 'bezahlt', // Admin-Bestellungen sind direkt bezahlt
        bezahltAm: new Date()
      },
      versand: { methode: 'standard' },
      notizen: {
        ...notizen,
        admin: (notizen?.admin || '') + `\nAdmin-Bestellung erstellt am ${new Date().toLocaleString('de-DE')}`
      },
      status: 'bestätigt', // Admin-Bestellungen sind direkt bestätigt
      quelle: 'admin'
    });

    await neueBestellung.save();

    console.log(`✅ Admin-Bestellung erstellt: ${neueBestellung.bestellnummer}`);

    res.status(201).json({
      success: true,
      message: 'Admin-Bestellung erfolgreich erstellt',
      data: {
        bestellnummer: neueBestellung.bestellnummer,
        gesamtsumme: neueBestellung.preise.gesamtsumme,
        status: neueBestellung.status,
        kunde: kunde ? kunde.kundennummer : 'Gastkunde'
      }
    });

  } catch (error) {
    console.error('❌ Fehler beim Erstellen der Admin-Bestellung:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Erstellen der Admin-Bestellung: ' + error.message
    });
  }
});

module.exports = router;
