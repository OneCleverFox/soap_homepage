/**
 * Demo-Daten für Admin Orders Management Testing
 * Dieses Skript erstellt Testbestellungen in verschiedenen Status
 */

const mongoose = require('mongoose');
const Order = require('../src/models/Order');

// Environment-Variablen laden
require('dotenv').config({ path: '.env.development' });

// MongoDB Verbindung
const MONGO_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/soap_homepage';

async function createDemoOrders() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('🔗 Mit MongoDB verbunden');

    // Lösche existierende Demo-Bestellungen (falls vorhanden)
    await Order.deleteMany({ 'besteller.email': { $regex: /demo@/ } });

    const demoOrders = [
      {
        bestellnummer: 'BE1730876400001',
        erstelltAm: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000), // 4 Tage alt
        besteller: {
          email: 'demo@kunde1.de',
          vorname: 'Anna',
          nachname: 'Mustermann',
          telefon: '+49 123 456789',
          kundennummer: 'K001'
        },
        rechnungsadresse: {
          strasse: 'Musterstraße',
          hausnummer: '123',
          plz: '12345',
          stadt: 'Musterstadt',
          land: 'Deutschland'
        },
        zahlung: {
          methode: 'ueberweisung',
          status: 'ausstehend'
        },
        artikel: [
          {
            produktType: 'rohseife',
            produktSnapshot: {
              name: 'Lavendel Naturseife',
              beschreibung: 'Beruhigende Seife mit echtem Lavendelöl',
              kategorie: 'Naturseife'
            },
            menge: 2,
            einzelpreis: 8.50,
            gesamtpreis: 17.00
          },
          {
            produktType: 'duftoele',
            produktSnapshot: {
              name: 'Rosenöl Premium',
              beschreibung: 'Hochwertiges Rosenöl aus Bulgarien'
            },
            menge: 1,
            einzelpreis: 24.90,
            gesamtpreis: 24.90
          }
        ],
        preise: {
          zwischensumme: 41.90,
          versand: { betrag: 4.90, kostenlos: false },
          mwst: { betrag: 7.33 },
          gesamtsumme: 46.80
        },
        status: 'neu',
        versand: {
          anbieter: 'dhl',
          methode: 'standard'
        },
        statusVerlauf: [{
          status: 'neu',
          zeitpunkt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000),
          notiz: 'Bestellung eingegangen',
          bearbeiter: 'System'
        }],
        notizen: {
          kunde: 'Bitte sorgfältig verpacken, es ist ein Geschenk!',
          intern: 'Prioritätskunde - schnelle Bearbeitung'
        }
      },
      {
        bestellnummer: 'BE1730876400002',
        erstelltAm: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 Tage alt
        besteller: {
          email: 'demo@kunde2.de',
          vorname: 'Max',
          nachname: 'Schmidt',
          telefon: '+49 987 654321',
          kundennummer: 'K002'
        },
        rechnungsadresse: {
          strasse: 'Testweg',
          hausnummer: '456',
          plz: '54321',
          stadt: 'Teststadt',
          land: 'Deutschland'
        },
        zahlung: {
          methode: 'paypal',
          status: 'bezahlt',
          transaktionsId: 'PAYID-DEMO123'
        },
        artikel: [
          {
            produktType: 'portfolio',
            produktSnapshot: {
              name: 'Wellness-Paket Deluxe',
              beschreibung: 'Komplettes Verwöhnpaket mit Seifen und Ölen'
            },
            menge: 1,
            einzelpreis: 49.90,
            gesamtpreis: 49.90
          }
        ],
        preise: {
          zwischensumme: 49.90,
          versand: { betrag: 0.00, kostenlos: true },
          mwst: { betrag: 7.98 },
          gesamtsumme: 49.90
        },
        status: 'bezahlt',

        versand: {
          anbieter: 'dhl',
          methode: 'standard'
        },
        statusVerlauf: [
          {
            status: 'neu',
            zeitpunkt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
            notiz: 'Bestellung eingegangen',
            bearbeiter: 'System'
          },
          {
            status: 'bezahlt',
            zeitpunkt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000 + 30 * 60 * 1000),
            notiz: 'PayPal-Zahlung erhalten',
            bearbeiter: 'System'
          }
        ]
      },
      {
        bestellnummer: 'BE1730876400003',
        erstelltAm: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // 1 Tag alt
        besteller: {
          email: 'demo@kunde3.de',
          vorname: 'Lisa',
          nachname: 'Weber',
          telefon: '+49 555 123456',
          kundennummer: 'K003'
        },
        rechnungsadresse: {
          strasse: 'Demoallee',
          hausnummer: '789',
          plz: '98765',
          stadt: 'Demostadt',
          land: 'Deutschland'
        },
        zahlung: {
          methode: 'ueberweisung',
          status: 'bezahlt'
        },
        artikel: [
          {
            produktType: 'rohseife',
            produktSnapshot: {
              name: 'Olivenöl Seife',
              beschreibung: 'Milde Seife mit kaltgepresstem Olivenöl'
            },
            menge: 3,
            einzelpreis: 6.90,
            gesamtpreis: 20.70
          }
        ],
        preise: {
          zwischensumme: 20.70,
          versand: { betrag: 4.90, kostenlos: false },
          mwst: { betrag: 4.11 },
          gesamtsumme: 25.60
        },
        status: 'bestaetigt',
        versand: {
          anbieter: 'dhl',
          methode: 'standard'
        },
        statusVerlauf: [
          {
            status: 'neu',
            zeitpunkt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
            notiz: 'Bestellung eingegangen',
            bearbeiter: 'System'
          },
          {
            status: 'bezahlt',
            zeitpunkt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000 + 45 * 60 * 1000),
            notiz: 'Überweisung erhalten',
            bearbeiter: 'Admin'
          },
          {
            status: 'bestaetigt',
            zeitpunkt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000 + 60 * 60 * 1000),
            notiz: 'Bestellung bestätigt und zur Bearbeitung freigegeben',
            bearbeiter: 'Admin'
          }
        ]
      },
      {
        bestellnummer: 'BE1730876400004',
        erstelltAm: new Date(Date.now() - 6 * 60 * 60 * 1000), // 6 Stunden alt
        besteller: {
          email: 'demo@kunde4.de',
          vorname: 'Thomas',
          nachname: 'Müller',
          telefon: '+49 444 987654',
          kundennummer: 'K004'
        },
        rechnungsadresse: {
          strasse: 'Beispielstraße',
          hausnummer: '42',
          plz: '11111',
          stadt: 'Beispielstadt',
          land: 'Deutschland'
        },
        zahlung: {
          methode: 'kreditkarte',
          status: 'bezahlt'
        },
        artikel: [
          {
            produktType: 'portfolio',
            produktSnapshot: {
              name: 'Starter-Set Seifenherstellung',
              beschreibung: 'Alles was Sie brauchen um eigene Seifen herzustellen'
            },
            menge: 1,
            einzelpreis: 89.90,
            gesamtpreis: 89.90
          }
        ],
        preise: {
          zwischensumme: 89.90,
          versand: { betrag: 0.00, kostenlos: true },
          mwst: { betrag: 14.38 },
          gesamtsumme: 89.90
        },
        status: 'verpackt',
        versand: {
          anbieter: 'dhl',
          methode: 'express',
          paket: {
            gewicht: 2.5,
            inhalt: 'Seifenherstellung-Set',
            versichert: true,
            versicherungswert: 89.90
          }
        },
        statusVerlauf: [
          {
            status: 'neu',
            zeitpunkt: new Date(Date.now() - 6 * 60 * 60 * 1000),
            notiz: 'Bestellung eingegangen',
            bearbeiter: 'System'
          },
          {
            status: 'bezahlt',
            zeitpunkt: new Date(Date.now() - 6 * 60 * 60 * 1000 + 15 * 60 * 1000),
            notiz: 'Kreditkarten-Zahlung erhalten',
            bearbeiter: 'System'
          },
          {
            status: 'bestaetigt',
            zeitpunkt: new Date(Date.now() - 5 * 60 * 60 * 1000),
            notiz: 'Express-Bestellung bestätigt',
            bearbeiter: 'Admin'
          },
          {
            status: 'verpackt',
            zeitpunkt: new Date(Date.now() - 1 * 60 * 60 * 1000),
            notiz: 'Bestellung verpackt und versandfertig',
            bearbeiter: 'Admin'
          }
        ],
        notizen: {
          versand: 'Express-Versand - bis 12:00 Uhr verpackt für Versand am selben Tag'
        }
      },
      {
        bestellnummer: 'BE1730876400005',
        erstelltAm: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 Stunden alt
        besteller: {
          email: 'demo@kunde5.de',
          vorname: 'Sarah',
          nachname: 'Klein',
          telefon: '+49 777 555333',
          kundennummer: 'K005'
        },
        rechnungsadresse: {
          strasse: 'Sampleweg',
          hausnummer: '999',
          plz: '22222',
          stadt: 'Samplestadt',
          land: 'Deutschland'
        },
        zahlung: {
          methode: 'sofortueberweisung',
          status: 'bezahlt'
        },
        artikel: [
          {
            produktType: 'duftoele',
            produktSnapshot: {
              name: 'Ätherische Öle Set',
              beschreibung: '5 verschiedene ätherische Öle im praktischen Set'
            },
            menge: 1,
            einzelpreis: 34.50,
            gesamtpreis: 34.50
          }
        ],
        preise: {
          zwischensumme: 34.50,
          versand: { betrag: 4.90, kostenlos: false },
          mwst: { betrag: 6.29 },
          gesamtsumme: 39.40
        },
        status: 'verschickt',
        versand: {
          anbieter: 'dhl',
          methode: 'standard',
          sendungsnummer: '1234567890123456789',
          trackingUrl: 'https://www.dhl.de/de/privatkunden/pakete-empfangen/verfolgen.html?lang=de&idc=1234567890123456789',
          versendetAm: new Date(Date.now() - 30 * 60 * 1000),
          verschickt: true,
          tracking: {
            letzterStatus: 'In Zustellung',
            letzteAktualisierung: new Date(Date.now() - 15 * 60 * 1000),
            statusDetails: 'Das Paket wird heute zugestellt',
            standort: 'Zustellbasis Musterstadt'
          }
        },
        statusVerlauf: [
          {
            status: 'neu',
            zeitpunkt: new Date(Date.now() - 2 * 60 * 60 * 1000),
            notiz: 'Bestellung eingegangen',
            bearbeiter: 'System'
          },
          {
            status: 'bezahlt',
            zeitpunkt: new Date(Date.now() - 2 * 60 * 60 * 1000 + 10 * 60 * 1000),
            notiz: 'SOFORT-Überweisung erhalten',
            bearbeiter: 'System'
          },
          {
            status: 'bestaetigt',
            zeitpunkt: new Date(Date.now() - 90 * 60 * 1000),
            notiz: 'Bestellung bestätigt',
            bearbeiter: 'Admin'
          },
          {
            status: 'verpackt',
            zeitpunkt: new Date(Date.now() - 60 * 60 * 1000),
            notiz: 'Bestellung verpackt',
            bearbeiter: 'Admin'
          },
          {
            status: 'verschickt',
            zeitpunkt: new Date(Date.now() - 30 * 60 * 1000),
            notiz: 'Sendung verschickt mit DHL: 1234567890123456789',
            bearbeiter: 'Admin'
          }
        ]
      }
    ];

    // Bestellungen erstellen
    for (const orderData of demoOrders) {
      const order = new Order(orderData);
      await order.save();
      console.log(`✅ Demo-Bestellung erstellt: ${order.bestellnummer} (Status: ${order.status})`);
    }

    console.log(`🎉 ${demoOrders.length} Demo-Bestellungen erfolgreich erstellt!`);
    
    // Statistiken anzeigen
    const statusStats = await Order.aggregate([
      { $match: { 'besteller.email': { $regex: /demo@/ } } },
      { $group: { _id: '$status', count: { $sum: 1 }, totalValue: { $sum: '$preise.gesamtsumme' } } }
    ]);
    
    console.log('\n📊 Status-Übersicht:');
    statusStats.forEach(stat => {
      console.log(`   ${stat._id}: ${stat.count} Bestellungen (${stat.totalValue.toFixed(2)}€)`);
    });

  } catch (error) {
    console.error('❌ Fehler beim Erstellen der Demo-Bestellungen:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 MongoDB-Verbindung geschlossen');
  }
}

// Skript ausführen
if (require.main === module) {
  createDemoOrders();
}

module.exports = { createDemoOrders };