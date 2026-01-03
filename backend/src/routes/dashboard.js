const express = require('express');
const router = express.Router();
const { authenticateToken, requireAdmin } = require('../middleware/auth');

// Models
const Portfolio = require('../models/Portfolio');
const Bestand = require('../models/Bestand');
const Order = require('../models/Order');
const Inquiry = require('../models/Inquiry');
const Rohseife = require('../models/Rohseife');
const Duftoil = require('../models/Duftoil');
const Verpackung = require('../models/Verpackung');
const Invoice = require('../models/Invoice');

// @route   GET /api/dashboard/overview
// @desc    Haupt-Dashboard Übersicht mit allen wichtigen KPIs
// @access  Private (Admin only)
router.get('/overview', authenticateToken, requireAdmin, async (req, res) => {
  try {
    console.log('📊 Dashboard Overview wird generiert...');
    
    // Paralles Laden aller Dashboard-Daten für optimale Performance
    const [
      fertigprodukteOhneBestand,
      rohstoffeUnterMindestbestand,
      meistverkaufteProdukte,
      produkteZurProduktion,
      fertigprodukteNiedrigerBestand,
      bestellungsStatistiken,
      rechnungsStatistiken,
      inquiryStatistiken,
      rohstoffStatistiken,
      gesamtStatistiken
    ] = await Promise.all([
      getFertigprodukteOhneBestand(),
      getRohstoffeUnterMindestbestand(),
      getMeistverkaufteProdukte(),
      getProdukteZurProduktion(),
      getFertigprodukteNiedrigerBestand(),
      getBestellungsStatistiken(),
      getRechnungsStatistiken(),
      getInquiryStatistiken(),
      getRohstoffStatistiken(),
      getGesamtStatistiken()
    ]);

    const dashboardData = {
      // Kritische Warnungen
      warnungen: {
        fertigprodukteOhneBestand: fertigprodukteOhneBestand.length,
        rohstoffeUnterMindestbestand: rohstoffStatistiken.unterMindestbestand
      },
      
      // Produktionspriorität
      produktion: {
        produkteZurProduktion: produkteZurProduktion.slice(0, 10), // Top 10
        rohstoffeBenoetigt: rohstoffeUnterMindestbestand, // Alle Rohstoffe unter Mindestbestand
        fertigprodukteNiedrigerBestand: fertigprodukteNiedrigerBestand.slice(0, 3) // Top 3 mit niedrigstem Bestand
      },
      
      // Verkaufsstatistiken
      verkauf: {
        meistverkaufte: meistverkaufteProdukte,
        bestellungen: bestellungsStatistiken,
        rechnungen: rechnungsStatistiken,
        anfragen: inquiryStatistiken
      },
      
      // Lager-Übersicht
      lager: {
        rohstoffe: rohstoffStatistiken,
        fertigprodukte: {
          gesamt: gesamtStatistiken.portfolioGesamt,
          ohneBestand: fertigprodukteOhneBestand.length,
          aufLager: gesamtStatistiken.portfolioAufLager
        }
      },
      
      // Gesamtübersicht
      overview: gesamtStatistiken
    };

    console.log('✅ Dashboard Overview erfolgreich generiert');
    
    res.json({
      success: true,
      data: dashboardData,
      generatedAt: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Dashboard Overview Error:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Laden der Dashboard-Daten',
      error: error.message
    });
  }
});

// @route   GET /api/dashboard/fertigprodukte-ohne-bestand
// @desc    Fertigprodukte mit 0 Bestand
// @access  Private (Admin only)
router.get('/fertigprodukte-ohne-bestand', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const produkteOhneBestand = await getFertigprodukteOhneBestand();
    
    res.json({
      success: true,
      data: produkteOhneBestand,
      count: produkteOhneBestand.length
    });
  } catch (error) {
    console.error('❌ Fertigprodukte ohne Bestand Error:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Laden der Fertigprodukte ohne Bestand'
    });
  }
});

// @route   GET /api/dashboard/rohstoffe-unter-mindestbestand
// @desc    Rohstoffe unter Mindestbestand
// @access  Private (Admin only)
router.get('/rohstoffe-unter-mindestbestand', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const rohstoffeUnterMindest = await getRohstoffeUnterMindestbestand();
    
    res.json({
      success: true,
      data: rohstoffeUnterMindest,
      count: rohstoffeUnterMindest.length
    });
  } catch (error) {
    console.error('❌ Rohstoffe unter Mindestbestand Error:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Laden der Rohstoffe unter Mindestbestand'
    });
  }
});

// @route   GET /api/dashboard/meistverkaufte-produkte
// @desc    Ranking der meistverkauften Produkte
// @access  Private (Admin only)
router.get('/meistverkaufte-produkte', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const meistverkaufte = await getMeistverkaufteProdukte();
    
    res.json({
      success: true,
      data: meistverkaufte
    });
  } catch (error) {
    console.error('❌ Meistverkaufte Produkte Error:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Laden der meistverkauften Produkte'
    });
  }
});

// @route   GET /api/dashboard/produkte-zur-produktion
// @desc    Produkte die als nächstes produziert werden sollen
// @access  Private (Admin only)
router.get('/produkte-zur-produktion', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const produkteZurProduktion = await getProdukteZurProduktion();
    
    res.json({
      success: true,
      data: produkteZurProduktion
    });
  } catch (error) {
    console.error('❌ Produkte zur Produktion Error:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Laden der Produkte zur Produktion'
    });
  }
});

// Hilfsfunktionen für Dashboard-Daten

async function getFertigprodukteOhneBestand() {
  console.log('🔍 Lade Fertigprodukte ohne Bestand...');
  
  // Alle aktiven Portfolio-Items laden
  const portfolioItems = await Portfolio.find({ aktiv: true }).lean();
  
  // Für jedes Portfolio-Item den Bestand prüfen
  const produkteOhneBestand = [];
  
  for (const item of portfolioItems) {
    const bestand = await Bestand.findOne({
      artikelId: item._id,
      typ: 'produkt'
    });
    
    // Produkt hat keinen Bestand oder Bestand ist 0
    if (!bestand || bestand.menge === 0) {
      produkteOhneBestand.push({
        _id: item._id,
        name: item.name,
        seife: item.seife,
        aroma: item.aroma,
        gramm: item.gramm,
        preis: item.preis,
        aktuellerBestand: bestand ? bestand.menge : 0,
        mindestbestand: bestand ? bestand.mindestbestand : 0,
        einheit: bestand ? bestand.einheit : 'Stück'
      });
    }
  }
  
  console.log(`📊 ${produkteOhneBestand.length} Fertigprodukte ohne Bestand gefunden`);
  return produkteOhneBestand;
}

async function getRohstoffeUnterMindestbestand() {
  console.log('🔍 Lade Rohstoffe unter Mindestbestand...');
  
  const rohstoffeUnterMindest = [];
  
  // 1. Rohseifen prüfen - direkt aus Rohseife Collection
  const rohseifen = await Rohseife.find({
    $expr: { $lt: ['$aktuellVorrat', '$mindestbestand'] }
  });
  
  rohseifen.forEach(item => {
    rohstoffeUnterMindest.push({
      typ: 'rohseife',
      bezeichnung: item.bezeichnung,
      menge: item.aktuellVorrat || 0,
      mindestbestand: item.mindestbestand,
      einheit: 'g',
      differenz: item.mindestbestand - (item.aktuellVorrat || 0),
      prozentUnterschreitung: item.mindestbestand > 0 ? ((item.mindestbestand - (item.aktuellVorrat || 0)) / item.mindestbestand) * 100 : 0
    });
  });
  
  // 2. Duftöle prüfen - direkt aus Duftoil Collection  
  const duftoele = await Duftoil.find({
    $expr: { $lt: ['$aktuellVorrat', '$mindestbestand'] }
  });
  
  duftoele.forEach(item => {
    rohstoffeUnterMindest.push({
      typ: 'duftoil',
      bezeichnung: item.bezeichnung,
      menge: item.aktuellVorrat || 0,
      mindestbestand: item.mindestbestand,
      einheit: 'ml',
      differenz: item.mindestbestand - (item.aktuellVorrat || 0),
      prozentUnterschreitung: item.mindestbestand > 0 ? ((item.mindestbestand - (item.aktuellVorrat || 0)) / item.mindestbestand) * 100 : 0
    });
  });
  
  // 3. Verpackungen prüfen - direkt aus Verpackung Collection
  const verpackungen = await Verpackung.find({
    $expr: { $lt: ['$aktuellVorrat', '$mindestbestand'] }
  });
  
  verpackungen.forEach(item => {
    rohstoffeUnterMindest.push({
      typ: 'verpackung',
      bezeichnung: item.bezeichnung,
      menge: item.aktuellVorrat || 0,
      mindestbestand: item.mindestbestand,
      einheit: 'Stück',
      differenz: item.mindestbestand - (item.aktuellVorrat || 0),
      prozentUnterschreitung: item.mindestbestand > 0 ? ((item.mindestbestand - (item.aktuellVorrat || 0)) / item.mindestbestand) * 100 : 0
    });
  });
  
  // Sortieren nach größter Differenz
  rohstoffeUnterMindest.sort((a, b) => b.differenz - a.differenz);
  
  console.log(`📊 ${rohstoffeUnterMindest.length} Rohstoffe unter Mindestbestand gefunden`);
  rohstoffeUnterMindest.forEach((item, i) => {
    console.log(`   ${i+1}. ${item.bezeichnung} (${item.typ}): ${item.menge} < ${item.mindestbestand} ${item.einheit}`);
  });
  
  return rohstoffeUnterMindest;
}

async function getMeistverkaufteProdukte() {
  console.log('🔍 Lade meistverkaufte Produkte aus Rechnungen...');
  
  // Aktuelles Jahr und letztes Jahr für mehr Daten
  const currentYear = new Date().getFullYear();
  const lastYear = currentYear - 1;
  
  console.log(`🔍 Suche in Jahren: ${currentYear} und ${lastYear}`);
  
  // Verkaufsdaten aus Rechnungen aggregieren (erweitert um beide Jahre)
  const verkaufsDaten = await Invoice.aggregate([
    {
      $match: {
        ...getRevenueRelevantInvoicesFilter(),
        'dates.invoiceDate': {
          $gte: new Date(lastYear, 0, 1),
          $lte: new Date(currentYear, 11, 31, 23, 59, 59)
        }
      }
    },
    {
      $unwind: '$items'
    },
    {
      $group: {
        _id: {
          productName: '$items.productData.name',
          year: { $year: '$dates.invoiceDate' }
        },
        produktName: { $first: '$items.productData.name' },
        verkaufteMenge: { $sum: '$items.quantity' },
        verkaufsWert: { $sum: '$items.total' },
        anzahlRechnungen: { $sum: 1 },
        jahr: { $first: { $year: '$dates.invoiceDate' } }
      }
    },
    {
      $sort: { verkaufteMenge: -1 }
    },
    {
      $limit: 10
    }
  ]);
  
  console.log(`📊 ${verkaufsDaten.length} meistverkaufte Produkte aus Rechnungen ${lastYear}-${currentYear} analysiert`);
  verkaufsDaten.forEach((item, i) => {
    console.log(`   ${i+1}. ${item.produktName} (${item.jahr}): ${item.verkaufteMenge} Stück (${item.verkaufsWert.toFixed(2)}€)`);
  });
  
  return verkaufsDaten.slice(0, 3); // Nur Top 3 zurückgeben
}

async function getProdukteZurProduktion() {
  console.log('🔍 Berechne Produkte zur Produktion (Bestellungen + Rechnungen)...');
  
  try {
    const last90Days = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
    
    // Prüfe sowohl Bestellungen als auch Rechnungen
    const totalOrders = await Order.countDocuments({});
    const totalInvoices = await Invoice.countDocuments({});
    console.log(`📊 Total Bestellungen in DB: ${totalOrders}`);
    console.log(`📊 Total Rechnungen in DB: ${totalInvoices}`);
    
    const recentInvoices = await Invoice.countDocuments({
      'dates.invoiceDate': { $gte: last90Days }
    });
    console.log(`📊 Rechnungen letzte 90 Tage: ${recentInvoices}`);
  
  // Sammle Verkaufsdaten aus Bestellungen
  const verkaufsDataOrders = await Order.aggregate([
    {
      $match: {
        status: { $exists: true },
        createdAt: { $gte: last90Days }
      }
    },
    {
      $unwind: '$items'
    },
    {
      $match: {
        'items.produktType': 'portfolio'
      }
    },
    {
      $group: {
        _id: '$items.produktId',
        produktName: { $first: '$items.produktSnapshot.name' },
        verkaufteMenge90Tage: { $sum: '$items.menge' },
        anzahlTransaktionen: { $sum: 1 },
        quelle: { $addToSet: 'bestellung' }
      }
    }
  ]);

  // Sammle Verkaufsdaten aus Rechnungen  
  const verkaufsDataInvoices = await Invoice.aggregate([
    {
      $match: {
        ...getRevenueRelevantInvoicesFilter(),
        'dates.invoiceDate': { $gte: last90Days }
      }
    },
    {
      $unwind: '$items'
    },
    {
      $group: {
        _id: '$items.productData.name', // Bei Rechnungen verwenden wir den Namen als Schlüssel
        produktName: { $first: '$items.productData.name' },
        verkaufteMenge90Tage: { $sum: '$items.quantity' },
        anzahlTransaktionen: { $sum: 1 },
        quelle: { $addToSet: 'rechnung' }
      }
    }
  ]);

  console.log(`📊 Verkaufsdaten aus ${verkaufsDataOrders.length} Bestellungen und ${verkaufsDataInvoices.length} Rechnungen gesammelt`);

  // Kombiniere beide Datenquellen und matche mit Portfolio
  const allVerkaufsdaten = [...verkaufsDataOrders];
  
  // Füge Rechnungsdaten hinzu, matche über den Namen mit Portfolio
  for (const invoiceData of verkaufsDataInvoices) {
    const portfolio = await Portfolio.findOne({ 
      name: { $regex: new RegExp(invoiceData.produktName, 'i') },
      aktiv: true 
    }).lean();
    
    if (portfolio) {
      const existingOrder = allVerkaufsdaten.find(order => 
        order._id && order._id.toString() === portfolio._id.toString()
      );
      
      if (existingOrder) {
        // Kombiniere Daten wenn Produkt bereits aus Bestellung existiert
        existingOrder.verkaufteMenge90Tage += invoiceData.verkaufteMenge90Tage;
        existingOrder.anzahlTransaktionen += invoiceData.anzahlTransaktionen;
        existingOrder.quelle.push(...invoiceData.quelle);
      } else {
        // Füge neues Produkt aus Rechnung hinzu
        allVerkaufsdaten.push({
          _id: portfolio._id,
          produktName: invoiceData.produktName,
          verkaufteMenge90Tage: invoiceData.verkaufteMenge90Tage,
          anzahlTransaktionen: invoiceData.anzahlTransaktionen,
          quelle: invoiceData.quelle
        });
      }
    }
  }

  console.log(`📊 ${allVerkaufsdaten.length} Produkte mit Verkaufsdaten gefunden`);

  // Kombiniere mit Bestandsdaten und berechne Priorität
  const produktionsPriorität = [];

  for (const verkaufsdaten of allVerkaufsdaten) {
    if (!verkaufsdaten._id) continue;

    // Lade Portfolio-Details
    const portfolio = await Portfolio.findById(verkaufsdaten._id).lean();
    if (!portfolio || !portfolio.aktiv) continue;

    // Lade Bestandsdaten
    const bestand = await Bestand.findOne({
      artikelId: verkaufsdaten._id,
      typ: 'produkt'
    }).lean();

    const aktuellerBestand = bestand?.menge || 0;
    const mindestbestand = bestand?.mindestbestand || 2;
    const verkaufsrateProTag = verkaufsdaten.verkaufteMenge90Tage / 90;
    
    const voraussichtlicheReichweite = verkaufsrateProTag > 0 ? 
      aktuellerBestand / verkaufsrateProTag : 999;

    // Berechne Prioritätsscore
    const prioritaetsScore = 
      (10 - aktuellerBestand) * 2 +           // Niedrigerer Bestand = höhere Priorität
      verkaufsrateProTag * 5 +                // Höhere Verkaufsrate = höhere Priorität  
      (aktuellerBestand <= mindestbestand ? 10 : 0); // Bonus wenn unter Mindestbestand

    produktionsPriorität.push({
      _id: verkaufsdaten._id,
      produktName: verkaufsdaten.produktName || portfolio.name,
      portfolio: {
        name: portfolio.name,
        seife: portfolio.seife,
        aroma: portfolio.aroma,
        gramm: portfolio.gramm
      },
      aktuellerBestand,
      mindestbestand,
      verkaufteMenge90Tage: verkaufsdaten.verkaufteMenge90Tage,
      verkaufsrateProTag: Math.round(verkaufsrateProTag * 100) / 100,
      voraussichtlicheReichweite: Math.round(voraussichtlicheReichweite),
      prioritaetsScore: Math.round(prioritaetsScore * 10) / 10,
      anzahlTransaktionen: verkaufsdaten.anzahlTransaktionen,
      quelle: verkaufsdaten.quelle
    });
  }

  // Sortiere nach Prioritätsscore
  produktionsPriorität.sort((a, b) => b.prioritaetsScore - a.prioritaetsScore);
  const topProdukte = produktionsPriorität.slice(0, 15);

  console.log(`📊 ${produktionsPriorität.length} Produkte für Produktionsplanung analysiert`);
  topProdukte.forEach((item, i) => {
    console.log(`   ${i+1}. ${item.produktName} - Verkauft: ${item.verkaufteMenge90Tage} - Bestand: ${item.aktuellerBestand} - Score: ${item.prioritaetsScore} - Quellen: ${item.quelle?.join(', ')}`);
  });
  
  return topProdukte;
  
  } catch (error) {
    console.error('❌ Fehler in getProdukteZurProduktion:', error);
    return [];
  }
}

async function getRechnungsStatistiken() {
  console.log('🔍 Lade Rechnungsstatistiken...');
  
  const heute = new Date();
  const einMonatZurueck = new Date(heute.getTime() - 30 * 24 * 60 * 60 * 1000);
  
  const stats = await Invoice.aggregate([
    {
      $facet: {
        gesamt: [
          { $match: {} },
          { $count: "total" }
        ],
        letzter30Tage: [
          { $match: { 'dates.invoiceDate': { $gte: einMonatZurueck } } },
          { $count: "total" }
        ],
        nachStatus: [
          {
            $group: {
              _id: '$status',
              anzahl: { $sum: 1 },
              gesamtwert: { $sum: '$amounts.total' }
            }
          }
        ],
        umsatzLetzter30Tage: [
          {
            $match: {
              'dates.invoiceDate': { $gte: einMonatZurueck },
              ...getRevenueRelevantInvoicesFilter()
            }
          },
          {
            $group: {
              _id: null,
              gesamtumsatz: { $sum: '$amounts.total' },
              anzahlRechnungen: { $sum: 1 }
            }
          }
        ]
      }
    }
  ]);
  
  return {
    gesamtRechnungen: stats[0].gesamt[0]?.total || 0,
    rechnungenLetzter30Tage: stats[0].letzter30Tage[0]?.total || 0,
    nachStatus: stats[0].nachStatus,
    umsatzLetzter30Tage: stats[0].umsatzLetzter30Tage[0]?.gesamtumsatz || 0,
    rechnungenMitUmsatz: stats[0].umsatzLetzter30Tage[0]?.anzahlRechnungen || 0
  };
}

async function getBestellungsStatistiken() {
  console.log('🔍 Lade Bestellungsstatistiken...');
  
  const heute = new Date();
  const einMonatZurueck = new Date(heute.getTime() - 30 * 24 * 60 * 60 * 1000);
  
  const stats = await Order.aggregate([
    {
      $facet: {
        gesamt: [
          { $match: {} },
          { $count: "total" }
        ],
        letzter30Tage: [
          { $match: { createdAt: { $gte: einMonatZurueck } } },
          { $count: "total" }
        ],
        nachStatus: [
          {
            $group: {
              _id: '$status',
              anzahl: { $sum: 1 },
              gesamtwert: { $sum: '$total' }
            }
          }
        ],
        umsatzLetzter30Tage: [
          {
            $match: {
              createdAt: { $gte: einMonatZurueck },
              status: { $in: ['completed', 'shipped', 'delivered'] }
            }
          },
          {
            $group: {
              _id: null,
              gesamtumsatz: { $sum: '$total' },
              anzahlBestellungen: { $sum: 1 }
            }
          }
        ]
      }
    }
  ]);
  
  return {
    gesamtBestellungen: stats[0].gesamt[0]?.total || 0,
    bestellungenLetzter30Tage: stats[0].letzter30Tage[0]?.total || 0,
    nachStatus: stats[0].nachStatus,
    umsatzLetzter30Tage: stats[0].umsatzLetzter30Tage[0]?.gesamtumsatz || 0,
    bestellungenMitUmsatz: stats[0].umsatzLetzter30Tage[0]?.anzahlBestellungen || 0
  };
}

async function getInquiryStatistiken() {
  console.log('🔍 Lade Inquiry-Statistiken...');
  
  const stats = await Inquiry.aggregate([
    {
      $facet: {
        gesamt: [
          { $match: {} },
          { $count: "total" }
        ],
        nachStatus: [
          {
            $group: {
              _id: '$status',
              anzahl: { $sum: 1 },
              gesamtwert: { $sum: '$total' }
            }
          }
        ],
        offeneAnfragen: [
          { $match: { status: 'pending' } },
          { $count: "total" }
        ]
      }
    }
  ]);
  
  return {
    gesamtInquiries: stats[0].gesamt[0]?.total || 0,
    nachStatus: stats[0].nachStatus,
    offeneAnfragen: stats[0].offeneAnfragen[0]?.total || 0
  };
}

async function getRohstoffStatistiken() {
  console.log('🔍 Lade Rohstoff-Statistiken...');
  
  // Zähle Rohstoffe unter Mindestbestand direkt aus den Collections
  const [
    rohseifeCount, 
    duftoilCount, 
    verpackungCount,
    rohseifeUnterMindest,
    duftoilUnterMindest, 
    verpackungUnterMindest
  ] = await Promise.all([
    Rohseife.countDocuments({}),
    Duftoil.countDocuments({}),
    Verpackung.countDocuments({}),
    Rohseife.countDocuments({ $expr: { $lt: ['$aktuellVorrat', '$mindestbestand'] } }),
    Duftoil.countDocuments({ $expr: { $lt: ['$aktuellVorrat', '$mindestbestand'] } }),
    Verpackung.countDocuments({ $expr: { $lt: ['$aktuellVorrat', '$mindestbestand'] } })
  ]);
  
  const unterMindestbestandGesamt = rohseifeUnterMindest + duftoilUnterMindest + verpackungUnterMindest;
  
  console.log('🔍 DEBUG - Rohstoff-Statistiken:');
  console.log(`   Rohseifen unter Mindestbestand: ${rohseifeUnterMindest}`);
  console.log(`   Duftöle unter Mindestbestand: ${duftoilUnterMindest}`);
  console.log(`   Verpackungen unter Mindestbestand: ${verpackungUnterMindest}`);
  console.log(`   GESAMT unter Mindestbestand: ${unterMindestbestandGesamt}`);
  
  return {
    rohseifeAnzahl: rohseifeCount,
    duftoilAnzahl: duftoilCount,
    verpackungAnzahl: verpackungCount,
    gesamtRohstoffe: rohseifeCount + duftoilCount + verpackungCount,
    unterMindestbestand: unterMindestbestandGesamt
  };
}

async function getGesamtStatistiken() {
  console.log('🔍 Lade Gesamtstatistiken...');
  
  const [portfolioGesamt, portfolioAktiv, portfolioMitBestand] = await Promise.all([
    Portfolio.countDocuments({}),
    Portfolio.countDocuments({ aktiv: true }),
    Bestand.countDocuments({ typ: 'produkt', menge: { $gt: 0 } })
  ]);
  
  return {
    portfolioGesamt,
    portfolioAktiv,
    portfolioAufLager: portfolioMitBestand,
    portfolioOhneBestand: portfolioAktiv - portfolioMitBestand
  };
}

async function getFertigprodukteNiedrigerBestand() {
  console.log('🔍 Lade Fertigprodukte mit niedrigstem Bestand...');
  
  // Alle aktiven Portfolio-Items laden
  const portfolioItems = await Portfolio.find({ aktiv: true }).lean();
  
  // Für jedes Portfolio-Item den Bestand prüfen und mit Verkaufsdaten kombinieren
  const produkteMitBestand = [];
  
  for (const item of portfolioItems) {
    const bestand = await Bestand.findOne({
      artikelId: item._id,
      typ: 'produkt'
    }).lean();
    
    const aktuelleMenge = bestand?.menge || 0;
    const mindestbestand = bestand?.mindestbestand || 2;
    
    // Nur Produkte mit Bestand > 0 (aber niedrig) einschließen
    if (aktuelleMenge > 0) {
      produkteMitBestand.push({
        _id: item._id,
        name: item.name,
        seife: item.seife,
        aroma: item.aroma,
        gramm: item.gramm,
        aktuelleMenge: aktuelleMenge,
        mindestbestand: mindestbestand,
        bestandsRatio: aktuelleMenge / Math.max(mindestbestand, 1), // Verhältnis zum Mindestbestand
        istNiedrig: aktuelleMenge <= mindestbestand * 1.5 // 50% Puffer über Mindestbestand
      });
    }
  }
  
  // Sortieren nach niedrigstem Bestand (absolut), dann nach Bestandsratio
  produkteMitBestand.sort((a, b) => {
    if (a.aktuelleMenge !== b.aktuelleMenge) {
      return a.aktuelleMenge - b.aktuelleMenge; // Niedrigste Menge zuerst
    }
    return a.bestandsRatio - b.bestandsRatio; // Dann nach Bestandsratio
  });
  
  console.log(`📊 ${produkteMitBestand.length} Fertigprodukte analysiert, Top 3 mit niedrigstem Bestand:`);
  produkteMitBestand.slice(0, 3).forEach((produkt, i) => {
    console.log(`   ${i+1}. ${produkt.name}: ${produkt.aktuelleMenge} Stück (Mindest: ${produkt.mindestbestand})`);
  });
  
  return produkteMitBestand;
}

// Hilfsfunktion: Ermittelt alle relevanten Rechnungen für Umsatz-Berechnungen
// Berücksichtigt: sent, paid, pending und bezahlte Entwürfe
function getRevenueRelevantInvoicesFilter() {
  return {
    $or: [
      // Reguläre Rechnungen (sent, paid, pending)
      { status: { $in: ['sent', 'paid', 'pending'] } },
      // Bezahlte Entwürfe
      { 
        status: 'draft', 
        $or: [
          { 'payment.paidAmount': { $gt: 0 } },
          { 'payment.paidDate': { $exists: true } }
        ]
      }
    ]
  };
}

module.exports = router;