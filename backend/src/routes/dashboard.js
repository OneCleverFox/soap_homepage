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
const ZusatzInhaltsstoff = require('../models/ZusatzInhaltsstoff');
const Giesswerkstoff = require('../models/Giesswerkstoff');
const Giessform = require('../models/Giessform');

// @route   GET /api/dashboard/overview
// @desc    Haupt-Dashboard Übersicht mit allen wichtigen KPIs
// @access  Private (Admin only)
router.get('/overview', authenticateToken, requireAdmin, async (req, res) => {
  try {
    console.log('📊 Dashboard Overview wird generiert...');
    const startTime = performance.now();
    
    // ⚡ PERFORMANCE PROFILING: Zeit jede Funktion
    // ⚡ KRITISCHE OPTIMIERUNG: Portfolio & Bestand nur EINMAL laden (statt 2x!)
    // ⚡ ULTRA-KRITISCH: Bilder ausschließen! (34s → <1s bei 35 Produkten)
    // Base64-Bilder können 500KB-2MB pro Produkt sein = 17.5MB+ Übertragung!
    console.time('⏱️  0. Gemeinsame Portfolio & Bestand Daten');
    const [portfolioItems, alleBestaende] = await Promise.all([
      Portfolio.find({ aktiv: true })
        .select('-bilder -hauptbildData -galleriebilder') // ⚡ KEINE BILDER!
        .lean(),
      Bestand.find({ typ: 'produkt' }).lean()
    ]);
    console.timeEnd('⏱️  0. Gemeinsame Portfolio & Bestand Daten');
    
    console.time('⏱️  1. getFertigprodukteOhneBestand');
    const fertigprodukteOhneBestand = getFertigprodukteOhneBestandSync(portfolioItems, alleBestaende);
    console.timeEnd('⏱️  1. getFertigprodukteOhneBestand');
    
    console.time('⏱️  2. getRohstoffeUnterMindestbestand');
    const rohstoffeUnterMindestbestand = await getRohstoffeUnterMindestbestand();
    console.timeEnd('⏱️  2. getRohstoffeUnterMindestbestand');
    
    console.time('⏱️  3. getMeistverkaufteProdukte');
    const meistverkaufteProdukte = await getMeistverkaufteProdukte();
    console.timeEnd('⏱️  3. getMeistverkaufteProdukte');
    
    console.time('⏱️  4. getFertigprodukteNiedrigerBestand');
    const fertigprodukteNiedrigerBestand = getFertigprodukteNiedrigerBestandSync(portfolioItems, alleBestaende);
    console.timeEnd('⏱️  4. getFertigprodukteNiedrigerBestand');
    
    console.time('⏱️  5. getBestellungsStatistiken');
    const bestellungsStatistiken = await getBestellungsStatistiken();
    console.timeEnd('⏱️  5. getBestellungsStatistiken');
    
    console.time('⏱️  6. getRechnungsStatistiken');
    const rechnungsStatistiken = await getRechnungsStatistiken();
    console.timeEnd('⏱️  6. getRechnungsStatistiken');
    
    console.time('⏱️  7. getInquiryStatistiken');
    const inquiryStatistiken = await getInquiryStatistiken();
    console.timeEnd('⏱️  7. getInquiryStatistiken');
    
    console.time('⏱️  8. getRohstoffStatistiken');
    const rohstoffStatistiken = await getRohstoffStatistiken();
    console.timeEnd('⏱️  8. getRohstoffStatistiken');
    
    console.time('⏱️  9. getGesamtStatistiken');
    const gesamtStatistiken = await getGesamtStatistiken();
    console.timeEnd('⏱️  9. getGesamtStatistiken');
    
    const totalTime = performance.now() - startTime;
    console.log(`⚡ Alle Dashboard-Daten geladen in ${totalTime.toFixed(0)}ms`);

    const dashboardData = {
      // Kritische Warnungen
      warnungen: {
        fertigprodukteOhneBestand: fertigprodukteOhneBestand.length,
        rohstoffeUnterMindestbestand: rohstoffStatistiken.unterMindestbestand
      },
      
      // Produktionspriorität
      produktion: {
        produkteZurProduktion: await getProdukteZurProduktionSchnell(portfolioItems, alleBestaende),
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

// DEBUG ROUTE - Invoice Filter Test
router.get('/debug-invoices', authenticateToken, requireAdmin, async (req, res) => {
  try {
    console.log('🔍 DEBUG: Analysiere Rechnungen für Dashboard...');
    
    const heute = new Date();
    const einMonatZurueck = new Date(heute.getTime() - 30 * 24 * 60 * 60 * 1000);
    
    // Alle Rechnungen abrufen
    const alleRechnungen = await Invoice.find({}).sort({ 'dates.invoiceDate': -1 });
    
    console.log('\n=== ALLE RECHNUNGEN ===');
    const rechnungsDetails = alleRechnungen.map(inv => {
      const invoiceDate = inv.dates.invoiceDate;
      const isInLast30Days = invoiceDate >= einMonatZurueck;
      
      const details = {
        nummer: inv.invoiceNumber,
        betrag: inv.amounts.total,
        status: inv.status,
        datum: invoiceDate.toISOString().split('T')[0],
        inLetzten30Tagen: isInLast30Days,
        paymentMethod: inv.payment?.method || 'none',
        paidAmount: inv.payment?.paidAmount || 0,
        paidDate: inv.payment?.paidDate || null
      };
      
      console.log(`${details.nummer}: ${details.betrag}€ - Status: ${details.status} - In 30d: ${details.inLetzten30Tagen}`);
      return details;
    });
    
    // Dashboard-Filter testen
    const umsatzFilter = {
      'dates.invoiceDate': { $gte: einMonatZurueck },
      ...getRevenueRelevantInvoicesFilter()
    };
    
    const umsatzRechnungen = await Invoice.find(umsatzFilter);
    
    console.log('\n=== RECHNUNGEN IM UMSATZ-FILTER ===');
    let gesamtUmsatz = 0;
    const erfassteRechnungen = umsatzRechnungen.map(inv => {
      console.log(`${inv.invoiceNumber}: ${inv.amounts.total}€ (Status: ${inv.status})`);
      gesamtUmsatz += inv.amounts.total;
      return {
        nummer: inv.invoiceNumber,
        betrag: inv.amounts.total,
        status: inv.status
      };
    });
    
    console.log(`\nGESAMTUMSATZ: ${gesamtUmsatz}€`);
    
    res.json({
      success: true,
      data: {
        alleRechnungen: rechnungsDetails,
        erfassteRechnungen: erfassteRechnungen,
        gesamtUmsatz: gesamtUmsatz,
        filter: {
          zeitraum: '30 Tage',
          stichtag: einMonatZurueck.toISOString().split('T')[0]
        }
      }
    });
    
  } catch (error) {
    console.error('❌ Debug Invoices Error:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Debug der Rechnungen',
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

// ⚡ OPTIMIERT: Synchrone Funktion nimmt bereits geladene Daten als Parameter
function getFertigprodukteOhneBestandSync(portfolioItems, alleBestaende) {
  // Bestand-Map erstellen für O(1) Lookup
  const bestandMap = new Map();
  alleBestaende.forEach(b => {
    bestandMap.set(b.artikelId.toString(), b);
  });
  
  // Produkte ohne Bestand filtern
  const produkteOhneBestand = portfolioItems
    .filter(item => {
      const bestand = bestandMap.get(item._id.toString());
      return !bestand || bestand.menge === 0;
    })
    .map(item => {
      const bestand = bestandMap.get(item._id.toString());
      
      // Seife-Beschreibung für Dual-Soap erweitern
      let seifeBeschreibung = item.seife;
      const istDualSeife = item.rohseifenKonfiguration?.verwendeZweiRohseifen;
      
      if (istDualSeife && item.rohseifenKonfiguration.seife2) {
        const gewichtVerteilung = item.rohseifenKonfiguration.gewichtVerteilung || 
                                  { seife1Prozent: 50, seife2Prozent: 50 };
        seifeBeschreibung = `${item.seife} (${gewichtVerteilung.seife1Prozent}%) + ${item.rohseifenKonfiguration.seife2} (${gewichtVerteilung.seife2Prozent}%)`;
      }
      
      return {
        _id: item._id,
        name: item.name,
        seife: seifeBeschreibung,
        aroma: item.aroma,
        gramm: item.gramm,
        preis: item.preis,
        aktuellerBestand: bestand ? bestand.menge : 0,
        mindestbestand: bestand ? bestand.mindestbestand : 0,
        einheit: bestand ? bestand.einheit : 'Stück'
      };
    });
  
  // console.log(`📊 ${produkteOhneBestand.length} Fertigprodukte ohne Bestand gefunden`);
  return produkteOhneBestand;
}

// ⚡ Async Wrapper für Endpoint-Kompatibilität
async function getFertigprodukteOhneBestand() {
  const [portfolioItems, alleBestaende] = await Promise.all([
    Portfolio.find({ aktiv: true })
      .select('-bilder -hauptbildData -galleriebilder') // ⚡ KEINE BILDER!
      .lean(),
    Bestand.find({ typ: 'produkt' }).lean()
  ]);
  return getFertigprodukteOhneBestandSync(portfolioItems, alleBestaende);
}

async function getRohstoffeUnterMindestbestand() {
  // console.log('🔍 Lade Rohstoffe unter Mindestbestand...');
  
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
  
  // console.log(`📊 ${rohstoffeUnterMindest.length} Rohstoffe unter Mindestbestand gefunden`);
  
  return rohstoffeUnterMindest;
}

async function getMeistverkaufteProdukte() {
  // console.log('🔍 Lade meistverkaufte Produkte aus Rechnungen...');
  
  // ⚡ OPTIMIERT: Nur aktuelles Jahr statt 2 Jahre
  const currentYear = new Date().getFullYear();
  const yearStart = new Date(currentYear, 0, 1);
  
  // Verkaufsdaten aus Rechnungen aggregieren
  const verkaufsDaten = await Invoice.aggregate([
    {
      $match: {
        status: { $in: ['sent', 'paid', 'pending'] }, // Vereinfacht: nur einfache Status
        'dates.invoiceDate': { $gte: yearStart }
      }
    },
    {
      $unwind: '$items'
    },
    {
      $group: {
        _id: '$items.productData.name',
        produktName: { $first: '$items.productData.name' },
        verkaufteMenge: { $sum: '$items.quantity' },
        verkaufsWert: { $sum: '$items.total' },
        anzahlRechnungen: { $sum: 1 }
      }
    },
    {
      $sort: { verkaufteMenge: -1 }
    },
    {
      $limit: 10 // Top 10 für Dropdown-Filter
    }
  ]);
  
  // Jahr hinzufügen damit Frontend filtern kann
  return verkaufsDaten.map(item => ({
    ...item,
    jahr: currentYear
  }));
}

async function getProdukteZurProduktion() {
  // console.log('🔍 Berechne Produkte zur Produktion (Bestellungen + Rechnungen)...');
  
  try {
    const last90Days = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
  
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
        $or: [
          // Reguläre Rechnungen (sent, paid, pending)
          { status: { $in: ['sent', 'paid', 'pending'] } },
          // Bezahlte Entwürfe (auch wenn payment.paidDate/paidAmount nicht gesetzt sind)
          { 
            status: 'draft', 
            $or: [
              { 'payment.paidAmount': { $gt: 0 } },
              { 'payment.paidDate': { $exists: true } },
              { 'payment.method': { $in: ['bar', 'paypal', 'bank_transfer'] } }
            ]
          }
        ],
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

  // console.log(`📊 Verkaufsdaten aus ${verkaufsDataOrders.length} Bestellungen und ${verkaufsDataInvoices.length} Rechnungen gesammelt`);

  // ⚡ OPTIMIERT: Alle Portfolio-Items und Bestände einmal laden statt N+1 Queries
  const [allePortfolioItems, alleBestaende] = await Promise.all([
    Portfolio.find({ aktiv: true }).lean(),
    Bestand.find({ typ: 'produkt' }).lean()
  ]);
  
  // Maps für O(1) Lookup erstellen
  const portfolioMapById = new Map(allePortfolioItems.map(p => [p._id.toString(), p]));
  const portfolioMapByName = new Map(allePortfolioItems.map(p => [p.name.toLowerCase(), p]));
  const bestandMap = new Map(alleBestaende.map(b => [b.artikelId.toString(), b]));
  
  // Kombiniere beide Datenquellen
  const allVerkaufsdaten = [...verkaufsDataOrders];
  
  // Füge Rechnungsdaten hinzu, matche über den Namen mit Portfolio
  for (const invoiceData of verkaufsDataInvoices) {
    const portfolio = portfolioMapByName.get(invoiceData.produktName.toLowerCase());
    
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

  // console.log(`📊 ${allVerkaufsdaten.length} Produkte mit Verkaufsdaten gefunden`);

  // Kombiniere mit Bestandsdaten und berechne Priorität (ohne zusätzliche DB-Queries)
  const produktionsPriorität = allVerkaufsdaten
    .filter(verkaufsdaten => verkaufsdaten._id)
    .map(verkaufsdaten => {
      const portfolio = portfolioMapById.get(verkaufsdaten._id.toString());
      if (!portfolio) return null;
      
      const bestand = bestandMap.get(verkaufsdaten._id.toString());
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

      // Seife-Beschreibung für Dual-Soap erweitern
      let seifeBeschreibung = portfolio.seife;
      const istDualSeife = portfolio.rohseifenKonfiguration?.verwendeZweiRohseifen;
      
      if (istDualSeife && portfolio.rohseifenKonfiguration.seife2) {
        const gewichtVerteilung = portfolio.rohseifenKonfiguration.gewichtVerteilung || 
                                  { seife1Prozent: 50, seife2Prozent: 50 };
        seifeBeschreibung = `${portfolio.seife} (${gewichtVerteilung.seife1Prozent}%) + ${portfolio.rohseifenKonfiguration.seife2} (${gewichtVerteilung.seife2Prozent}%)`;
      }

      return {
        _id: verkaufsdaten._id,
        produktName: verkaufsdaten.produktName || portfolio.name,
        portfolio: {
          name: portfolio.name,
          seife: seifeBeschreibung,
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
      };
    })
    .filter(Boolean); // Entferne null-Werte

  // Sortiere nach Prioritätsscore
  produktionsPriorität.sort((a,b) => b.prioritaetsScore - a.prioritaetsScore);
  const topProdukte = produktionsPriorität.slice(0, 15);

  // console.log(`📊 ${produktionsPriorität.length} Produkte für Produktionsplanung analysiert`);
  // topProdukte.forEach((item, i) => {
  //   console.log(`   ${i+1}. ${item.produktName} - Verkauft: ${item.verkaufteMenge90Tage} - Bestand: ${item.aktuellerBestand} - Score: ${item.prioritaetsScore} - Quellen: ${item.quelle?.join(', ')}`);
  // });
  
  return topProdukte;
  
  } catch (error) {
    console.error('❌ Fehler in getProdukteZurProduktion:', error);
    return [];
  }
}

async function getRechnungsStatistiken() {
  // console.log('🔍 Lade Rechnungsstatistiken...');
  
  const heute = new Date();
  const einMonatZurueck = new Date(heute.getTime() - 30 * 24 * 60 * 60 * 1000);
  const dreiMonateZurueck = new Date(heute.getTime() - 90 * 24 * 60 * 60 * 1000);
  const jahresbeginn = new Date(heute.getFullYear(), 0, 1); // 1. Januar aktuelles Jahr
  
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
        letzter90Tage: [
          { $match: { 'dates.invoiceDate': { $gte: dreiMonateZurueck } } },
          { $count: "total" }
        ],
        aktuellesJahr: [
          { $match: { 'dates.invoiceDate': { $gte: jahresbeginn } } },
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
              status: { $in: ['sent', 'paid', 'pending'] }
            }
          },
          {
            $group: {
              _id: null,
              gesamtumsatz: { $sum: '$amounts.total' },
              anzahlRechnungen: { $sum: 1 }
            }
          }
        ],
        umsatzLetzter90Tage: [
          {
            $match: {
              'dates.invoiceDate': { $gte: dreiMonateZurueck },
              status: { $in: ['sent', 'paid', 'pending'] }
            }
          },
          {
            $group: {
              _id: null,
              gesamtumsatz: { $sum: '$amounts.total' },
              anzahlRechnungen: { $sum: 1 }
            }
          }
        ],
        umsatzAktuellesJahr: [
          {
            $match: {
              'dates.invoiceDate': { $gte: jahresbeginn },
              status: { $in: ['sent', 'paid', 'pending'] }
            }
          },
          {
            $group: {
              _id: null,
              gesamtumsatz: { $sum: '$amounts.total' },
              anzahlRechnungen: { $sum: 1 }
            }
          }
        ],
        gesamtUmsatz: [
          {
            $match: {
              status: { $in: ['sent', 'paid', 'pending'] }
            }
          },
          {
            $group: {
              _id: null,
              gesamtumsatz: { $sum: '$amounts.total' }
            }
          }
        ],
        gesamtBezahlt: [
          {
            $match: {
              status: 'paid'
            }
          },
          {
            $group: {
              _id: null,
              gesamtbezahlt: { $sum: '$amounts.total' }
            }
          }
        ],
        // Neue Statistik: Überfällige Rechnungen
        overdue: [
          {
            $match: {
              status: 'sent',
              'dates.dueDate': { $lt: new Date() }
            }
          },
          { $count: "total" }
        ]
      }
    }
  ]);
  
  return {
    // Gesamtübersicht
    gesamtRechnungen: stats[0].gesamt[0]?.total || 0,
    gesamtUmsatz: stats[0].gesamtUmsatz[0]?.gesamtumsatz || 0,
    gesamtBezahlt: stats[0].gesamtBezahlt[0]?.gesamtbezahlt || 0,
    // Aktuelles Kalenderjahr
    rechnungenAktuellesJahr: stats[0].aktuellesJahr[0]?.total || 0,
    umsatzAktuellesJahr: stats[0].umsatzAktuellesJahr[0]?.gesamtumsatz || 0,
    rechnungenMitUmsatzJahr: stats[0].umsatzAktuellesJahr[0]?.anzahlRechnungen || 0,
    // 90 Tage Kennzahlen
    rechnungenLetzter90Tage: stats[0].letzter90Tage[0]?.total || 0,
    umsatzLetzter90Tage: stats[0].umsatzLetzter90Tage[0]?.gesamtumsatz || 0,
    rechnungenMitUmsatz90Tage: stats[0].umsatzLetzter90Tage[0]?.anzahlRechnungen || 0,
    // Legacy 30 Tage (optional behalten)
    rechnungenLetzter30Tage: stats[0].letzter30Tage[0]?.total || 0,
    umsatzLetzter30Tage: stats[0].umsatzLetzter30Tage[0]?.gesamtumsatz || 0,
    rechnungenMitUmsatz: stats[0].umsatzLetzter30Tage[0]?.anzahlRechnungen || 0,
    // Status & Overdue
    nachStatus: stats[0].nachStatus,
    overdue: stats[0].overdue[0]?.total || 0
  };
}

async function getBestellungsStatistiken() {
  // console.log('🔍 Lade Bestellungsstatistiken...');
  
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
              gesamtwert: { $sum: '$preise.gesamtsumme' }
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
              gesamtumsatz: { $sum: '$preise.gesamtsumme' },
              anzahlBestellungen: { $sum: 1 }
            }
          }
        ],
        // Neue Statistik: Bestellungen die verpackt werden müssen
        zuVerpacken: [
          { 
            $match: { 
              status: { $in: ['bezahlt'] }, // Bezahlte Bestellungen die verpackt werden müssen
              $or: [
                { 'zahlung.status': { $in: ['bezahlt', 'completed'] } },
                { status: 'bezahlt' }
              ]
            } 
          },
          { 
            $project: {
              bestellnummer: 1,
              besteller: 1,
              rechnungsadresse: 1,
              artikel: 1,
              preise: 1,
              status: 1,
              createdAt: 1,
              zahlung: 1
            }
          },
          { $sort: { createdAt: -1 } },
          { $limit: 5 }
        ],
        // Neue Statistik: Bestellungen die versendet werden müssen
        zuVersenden: [
          { 
            $match: { 
              status: { $in: ['verpackt'] }, // Verpackte Bestellungen die verschickt werden müssen
              $or: [
                { 'zahlung.status': { $in: ['bezahlt', 'completed'] } }, // Bezahlte Bestellungen
                { 'zahlung.status': 'ausstehend', 'payment.status': 'completed' }, // Alternative Zahlungsfelder
                { status: 'verpackt' } // Direkt als verpackt markierte Bestellungen
              ]
            } 
          },
          { 
            $project: {
              bestellnummer: 1,
              besteller: 1,
              rechnungsadresse: 1,
              artikel: 1,
              preise: 1,
              status: 1,
              createdAt: 1,
              zahlung: 1
            }
          },
          { $sort: { createdAt: -1 } },
          { $limit: 5 } // Top 5 neueste
        ],
        // Neue Statistik: Bestellungen aus Anfragen die bestätigt werden müssen  
        zuBestaetigen: [
          { 
            $match: { 
              status: { $in: ['neu'] }, // Neue Bestellungen
              sourceInquiryId: { $exists: true, $ne: null } // Nur Bestellungen die aus Anfragen entstanden sind
            } 
          },
          { 
            $project: {
              bestellnummer: 1,
              besteller: 1,
              rechnungsadresse: 1,
              artikel: 1,
              preise: 1,
              status: 1,
              createdAt: 1,
              zahlung: 1,
              sourceInquiryId: 1
            }
          },
          { $sort: { createdAt: -1 } },
          { $limit: 5 } // Top 5 neueste
        ]
      }
    }
  ]);

  // Standalone-Rechnungen als zusätzliche Bestellungen berücksichtigen
  const standaloneInvoiceStats = await Invoice.aggregate([
    {
      $match: {
        $and: [
          {
            $or: [
              { 'order.orderId': { $exists: false } },
              { 'order.orderId': null }
            ]
          },
          {
            $or: [
              { originalOrder: { $exists: false } },
              { originalOrder: null }
            ]
          }
        ]
      }
    },
    {
      $facet: {
        gesamt: [
          { $count: 'total' }
        ],
        letzter30Tage: [
          { $match: { 'dates.invoiceDate': { $gte: einMonatZurueck } } },
          { $count: 'total' }
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
              anzahlBestellungen: { $sum: 1 }
            }
          }
        ]
      }
    }
  ]);

  const standaloneGesamt = standaloneInvoiceStats[0]?.gesamt?.[0]?.total || 0;
  const standaloneLetzter30Tage = standaloneInvoiceStats[0]?.letzter30Tage?.[0]?.total || 0;
  const standaloneUmsatz30Tage = standaloneInvoiceStats[0]?.umsatzLetzter30Tage?.[0]?.gesamtumsatz || 0;
  const standaloneMitUmsatz = standaloneInvoiceStats[0]?.umsatzLetzter30Tage?.[0]?.anzahlBestellungen || 0;
  
  return {
    gesamtBestellungen: (stats[0].gesamt[0]?.total || 0) + standaloneGesamt,
    bestellungenLetzter30Tage: (stats[0].letzter30Tage[0]?.total || 0) + standaloneLetzter30Tage,
    nachStatus: stats[0].nachStatus,
    umsatzLetzter30Tage: (stats[0].umsatzLetzter30Tage[0]?.gesamtumsatz || 0) + standaloneUmsatz30Tage,
    bestellungenMitUmsatz: (stats[0].umsatzLetzter30Tage[0]?.anzahlBestellungen || 0) + standaloneMitUmsatz,
    zuVerpacken: stats[0].zuVerpacken || [],
    zuVersenden: stats[0].zuVersenden || [],
    zuBestaetigen: stats[0].zuBestaetigen || []
  };
}

async function getInquiryStatistiken() {
  // console.log('🔍 Lade Inquiry-Statistiken...');
  
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
        ],
        // Neue Statistik: Anfragen die Admin-Handlung benötigen
        benoetigtGenehmigung: [
          { $match: { status: 'pending' } }, // Pending Anfragen müssen genehmigt werden
          { 
            $project: {
              inquiryId: 1,
              customer: 1,
              items: 1,
              total: 1,
              createdAt: 1
            }
          },
          { $sort: { createdAt: -1 } },
          { $limit: 5 } // Top 5 neueste
        ]
      }
    }
  ]);
  
  return {
    gesamtInquiries: stats[0].gesamt[0]?.total || 0,
    nachStatus: stats[0].nachStatus,
    offeneAnfragen: stats[0].offeneAnfragen[0]?.total || 0,
    benoetigtGenehmigung: stats[0].benoetigtGenehmigung || []
  };
}

async function getRohstoffStatistiken() {
  // console.log('🔍 Lade Rohstoff-Statistiken...');
  
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
  
  // console.log('🔍 DEBUG - Rohstoff-Statistiken:');
  // console.log(`   Rohseifen unter Mindestbestand: ${rohseifeUnterMindest}`);
  // console.log(`   Duftöle unter Mindestbestand: ${duftoilUnterMindest}`);
  // console.log(`   Verpackungen unter Mindestbestand: ${verpackungUnterMindest}`);
  // console.log(`   GESAMT unter Mindestbestand: ${unterMindestbestandGesamt}`);
  
  return {
    rohseifeAnzahl: rohseifeCount,
    duftoilAnzahl: duftoilCount,
    verpackungAnzahl: verpackungCount,
    gesamtRohstoffe: rohseifeCount + duftoilCount + verpackungCount,
    unterMindestbestand: unterMindestbestandGesamt
  };
}

async function getGesamtStatistiken() {
  // console.log('🔍 Lade Gesamtstatistiken...');
  
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

// ⚡ OPTIMIERT: Synchrone Funktion nimmt bereits geladene Daten als Parameter
function getFertigprodukteNiedrigerBestandSync(portfolioItems, alleBestaende) {
  // Bestand-Map erstellen für O(1) Lookup
  const bestandMap = new Map();
  alleBestaende.forEach(b => {
    bestandMap.set(b.artikelId.toString(), b);
  });
  
  // Produkte mit Bestand verarbeiten
  const produkteMitBestand = portfolioItems
    .map(item => {
      const bestand = bestandMap.get(item._id.toString());
      const aktuelleMenge = bestand?.menge || 0;
      const mindestbestand = bestand?.mindestbestand || 2;
      
      // Nur Produkte mit Bestand > 0 (aber niedrig) einschließen
      if (aktuelleMenge === 0) return null;
      
      // Seife-Beschreibung für Dual-Soap erweitern
      let seifeBeschreibung = item.seife;
      const istDualSeife = item.rohseifenKonfiguration?.verwendeZweiRohseifen;
      
      if (istDualSeife && item.rohseifenKonfiguration.seife2) {
        const gewichtVerteilung = item.rohseifenKonfiguration.gewichtVerteilung || 
                                  { seife1Prozent: 50, seife2Prozent: 50 };
        seifeBeschreibung = `${item.seife} (${gewichtVerteilung.seife1Prozent}%) + ${item.rohseifenKonfiguration.seife2} (${gewichtVerteilung.seife2Prozent}%)`;
      }
      
      return {
        _id: item._id,
        name: item.name,
        seife: seifeBeschreibung,
        aroma: item.aroma,
        gramm: item.gramm,
        aktuelleMenge: aktuelleMenge,
        mindestbestand: mindestbestand,
        bestandsRatio: aktuelleMenge / Math.max(mindestbestand, 1), // Verhältnis zum Mindestbestand
        istNiedrig: aktuelleMenge <= mindestbestand * 1.5 // 50% Puffer über Mindestbestand
      };
    })
    .filter(Boolean) // Entferne null-Werte (Produkte ohne Bestand)
    .sort((a, b) => {
      if (a.aktuelleMenge !== b.aktuelleMenge) {
        return a.aktuelleMenge - b.aktuelleMenge; // Niedrigste Menge zuerst
      }
      return a.bestandsRatio - b.bestandsRatio; // Dann nach Bestandsratio
    });
  
  // console.log(`📊 ${produkteMitBestand.length} Fertigprodukte analysiert, Top 3 mit niedrigstem Bestand:`);
  // produkteMitBestand.slice(0, 3).forEach((produkt, i) => {
  //   console.log(`   ${i+1}. ${produkt.name}: ${produkt.aktuelleMenge} Stück (Mindest: ${produkt.mindestbestand})`);
  // });
  
  return produkteMitBestand;
}

// ⚡ Async Wrapper für Endpoint-Kompatibilität
async function getFertigprodukteNiedrigerBestand() {
  const [portfolioItems, alleBestaende] = await Promise.all([
    Portfolio.find({ aktiv: true })
      .select('-bilder -hauptbildData -galleriebilder') // ⚡ KEINE BILDER!
      .lean(),
    Bestand.find({ typ: 'produkt' }).lean()
  ]);
  return getFertigprodukteNiedrigerBestandSync(portfolioItems, alleBestaende);
}

// ⚡ NEUE SCHNELLE VERSION: Produktionspriorität OHNE Regex-Suchen
// Analysiert Verkaufskennzahlen der letzten 90 Tage für Produktionsentscheidungen
async function getProdukteZurProduktionSchnell(portfolioItems, alleBestaende) {
  try {
    const last90Days = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
    
    // Bestand-Map erstellen
    const bestandMap = new Map();
    alleBestaende.forEach(b => {
      bestandMap.set(b.artikelId.toString(), b);
    });
    
    // Portfolio-Name-Map für schnelles Lookup (statt Regex!)
    const portfolioNameMap = new Map();
    portfolioItems.forEach(p => {
      portfolioNameMap.set(p.name.toLowerCase().trim(), p);
    });
    
    // Verkaufsdaten aus Rechnungen holen (nur Produktnamen) - LETZTE 90 TAGE
    const verkaufsDaten = await Invoice.aggregate([
      {
        $match: {
          status: { $in: ['sent', 'paid', 'pending'] },
          'dates.invoiceDate': { $gte: last90Days }
        }
      },
      { $unwind: '$items' },
      {
        $group: {
          _id: '$items.productData.name',
          verkaufteMenge: { $sum: '$items.quantity' }
        }
      }
    ]);
    
    // Verkaufs-Map erstellen
    const verkaufsMap = new Map();
    verkaufsDaten.forEach(v => {
      verkaufsMap.set(v._id.toLowerCase().trim(), v.verkaufteMenge);
    });
    
    // Produkte mit Priorität berechnen
    const produktePriorität = portfolioItems
      .map(portfolio => {
        const bestand = bestandMap.get(portfolio._id.toString());
        const aktuellerBestand = bestand?.menge || 0;
        const mindestbestand = bestand?.mindestbestand || 2;
        const verkaufteMenge90Tage = verkaufsMap.get(portfolio.name.toLowerCase().trim()) || 0;
        
        // Reichweite berechnen (Tage bis Bestand aufgebraucht)
        const durchschnittVerkaufProTag = verkaufteMenge90Tage / 90;
        const voraussichtlicheReichweite = durchschnittVerkaufProTag > 0 
          ? Math.floor(aktuellerBestand / durchschnittVerkaufProTag)
          : 999;
        
        // Prioritäts-Score berechnen (höher = dringender)
        let prioritaetsScore = 0;
        
        if (aktuellerBestand === 0) {
          prioritaetsScore = 50; // Keine Stück = höchste Priorität
        } else if (aktuellerBestand <= mindestbestand) {
          prioritaetsScore = 30 + (mindestbestand - aktuellerBestand);
        } else if (voraussichtlicheReichweite < 30) {
          prioritaetsScore = 20 + Math.floor((30 - voraussichtlicheReichweite) / 3);
        } else if (voraussichtlicheReichweite < 60) {
          prioritaetsScore = 10 + Math.floor((60 - voraussichtlicheReichweite) / 6);
        }
        
        // Bonus für hohe Verkaufszahlen
        if (verkaufteMenge90Tage > 10) prioritaetsScore += 5;
        if (verkaufteMenge90Tage > 20) prioritaetsScore += 5;
        
        return {
          _id: portfolio._id,
          produktName: portfolio.name,
          kategorie: portfolio.kategorie || 'seife', // NEU: Kategorie hinzufügen
          portfolio: {
            name: portfolio.name,
            seife: portfolio.seife,
            aroma: portfolio.aroma,
            kategorie: portfolio.kategorie || 'seife' // NEU
          },
          aktuellerBestand,
          mindestbestand,
          verkaufteMenge90Tage,
          voraussichtlicheReichweite,
          prioritaetsScore
        };
      })
      .filter(p => p.verkaufteMenge90Tage > 0) // ⚡ NUR Produkte mit TATSÄCHLICHEN Verkäufen (Kundennachfrage!)
      .sort((a, b) => b.prioritaetsScore - a.prioritaetsScore) // Höchste Priorität zuerst
      .slice(0, 10); // Top 10
    
    return produktePriorität;
  } catch (error) {
    console.error('❌ Fehler bei getProdukteZurProduktionSchnell:', error);
    return [];
  }
}

// Hilfsfunktion: Ermittelt alle relevanten Rechnungen für Umsatz-Berechnungen
// Berücksichtigt: sent, paid, pending und alle Entwürfe mit "Bezahlt"-Status
function getRevenueRelevantInvoicesFilter() {
  return {
    $or: [
      // Reguläre Rechnungen (sent, paid, pending)
      { status: { $in: ['sent', 'paid', 'pending'] } },
      // Entwürfe, die als bezahlt markiert sind oder Zahlungsdetails haben
      { 
        status: 'draft', 
        $or: [
          { 'payment.paidAmount': { $gt: 0 } },
          { 'payment.paidDate': { $exists: true } },
          { 'payment.method': { $in: ['bar', 'paypal', 'bank_transfer'] } },
          // Neue Bedingung: Entwürfe mit Bezahlstatus "Bezahlt"
          { 'payment.status': 'paid' }
        ]
      }
    ]
  };
}

// Cache für production-capacity (5 Minuten)
let productionCapacityCache = null;
let productionCapacityCacheTime = null;
const PRODUCTION_CACHE_TTL = 5 * 60 * 1000; // 5 Minuten

// Cache-Invalidierungsfunktion
function invalidateProductionCapacityCache() {
  productionCapacityCache = null;
  productionCapacityCacheTime = null;
  console.log('🗑️ Production Capacity Cache invalidiert');
}

// GET /api/dashboard/production-capacity - Produktionskapazitäts-Analyse
router.get('/production-capacity', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const now = Date.now();
    
    // Cache-Check
    if (productionCapacityCache && productionCapacityCacheTime && (now - productionCapacityCacheTime < PRODUCTION_CACHE_TTL)) {
      console.log('📦 Verwende gecachte Produktionskapazitäts-Daten');
      return res.json({
        success: true,
        data: productionCapacityCache,
        cached: true
      });
    }
    
    console.log('📊 Starte Produktionskapazitäts-Analyse...');
    const kapazitaetsAnalyse = await getProduktionsKapazitaetsAnalyse();
    
    // Cache speichern
    productionCapacityCache = kapazitaetsAnalyse;
    productionCapacityCacheTime = now;
    
    res.json({
      success: true,
      data: kapazitaetsAnalyse
    });
  } catch (error) {
    console.error('❌ Fehler bei Produktionskapazitäts-Analyse:', error);
    res.status(500).json({ 
      success: false,
      message: 'Fehler bei der Produktionskapazitäts-Analyse',
      error: error.message 
    });
  }
});

// Hauptfunktion für Produktionskapazitäts-Analyse
async function getProduktionsKapazitaetsAnalyse() {
  console.log('🔍 Analysiere Produktionskapazität basierend auf Rohstoffen...');
  
  // 1. Alle aktiven Portfolio-Produkte laden (nur benötigte Felder)
  const portfolioProdukte = await Portfolio.find({ aktiv: { $ne: false } })
    .select('name seife aroma verpackung gramm kategorie rohseifenKonfiguration zusatzinhaltsstoffe giessform giesswerkstoff giesswerkstoffKonfiguration')
    .populate('giessform', 'name inventarnummer zustand volumenMl')
    .populate('giesswerkstoff', 'bezeichnung aktuellerBestand einheit')
    .lean();
  console.log(`📦 ${portfolioProdukte.length} aktive Portfolio-Produkte gefunden`);
  
  // 2. Alle Rohstoffe parallel laden (nur benötigte Felder)
  const [rohseifen, duftoele, verpackungen, zusatzinhaltsstoffe, giesswerkstoffe, giessformen] = await Promise.all([
    Rohseife.find({ verfuegbar: true }).select('bezeichnung aktuellVorrat').lean(),
    Duftoil.find({ verfuegbar: true }).select('bezeichnung aktuellVorrat').lean(),
    Verpackung.find({ verfuegbar: true }).select('bezeichnung aktuellVorrat').lean(),
    ZusatzInhaltsstoff.find().select('bezeichnung').lean(),
    Giesswerkstoff.find().select('bezeichnung aktuellerBestand einheit').lean(),
    Giessform.find({ zustand: { $in: ['neu', 'gut', 'gebraucht'] } }).select('name inventarnummer zustand volumenMl').lean()
  ]);
  
  console.log(`🧱 Rohstoffe geladen: ${rohseifen.length} Rohseifen, ${duftoele.length} Duftöle, ${verpackungen.length} Verpackungen, ${zusatzinhaltsstoffe.length} Zusatzinhaltsstoffe, ${giesswerkstoffe.length} Gießwerkstoffe, ${giessformen.length} Gießformen`);
  
  // 3. Bestände für Fertigprodukte UND Zusatzinhaltsstoffe abrufen (nur benötigte Felder)
  const [fertigproduktBestaende, zusatzstoffBestaende] = await Promise.all([
    Bestand.find({ typ: 'produkt' }).select('artikelId menge').lean(),
    Bestand.find({ typ: 'zusatzinhaltsstoff' }).select('artikelId menge').lean()
  ]);
  
  const bestandsMap = new Map();
  fertigproduktBestaende.forEach(bestand => {
    if (bestand.artikelId) {
      bestandsMap.set(bestand.artikelId.toString(), bestand.menge || 0);
    }
  });
  
  const zusatzstoffBestandsMap = new Map();
  zusatzstoffBestaende.forEach(bestand => {
    if (bestand.artikelId) {
      zusatzstoffBestandsMap.set(bestand.artikelId.toString(), bestand.menge || 0);
    }
  });
  
  console.log(`📊 ${bestandsMap.size} Fertigprodukt-Bestände und ${zusatzstoffBestandsMap.size} Zusatzstoff-Bestände geladen`);
  
  // 4. Maps für schnellere Lookups erstellen
  const rohseifenMap = new Map(rohseifen.map(r => [r.bezeichnung.toLowerCase(), r]));
  const duftoeleMap = new Map(duftoele.map(d => [d.bezeichnung.toLowerCase(), d]));
  const verpackungenMap = new Map(verpackungen.map(v => [v.bezeichnung.toLowerCase(), v]));
  const zusatzstoffeMap = new Map(zusatzinhaltsstoffe.map(z => [z.bezeichnung.toLowerCase(), z]));
  const giesswerkstoffMap = new Map(giesswerkstoffe.map(g => [g._id.toString(), g]));
  const giessformMap = new Map(giessformen.map(gf => [gf._id.toString(), gf]));
  
  // 5. Für jedes Produkt die maximale Produktionsmenge basierend auf Rohstoffen berechnen
  const produktionsAnalyse = [];
  
  for (const produkt of portfolioProdukte) {
    const analyse = analysiereProduktionskapazitaet(
      produkt, 
      rohseifenMap, 
      duftoeleMap, 
      verpackungenMap,
      zusatzstoffeMap,
      zusatzstoffBestandsMap,
      giesswerkstoffMap,
      giessformMap,
      bestandsMap
    );
    // Aktuellen Fertigproduktbestand hinzufügen
    analyse.aktuellerBestand = bestandsMap.get(produkt._id.toString()) || 0;
    produktionsAnalyse.push(analyse);
  }
  
  // 6. Nach limitierendem Faktor sortieren (niedrigste Produktionsmenge zuerst)
  produktionsAnalyse.sort((a, b) => a.maxProduktion - b.maxProduktion);
  
  // 7. Zusammenfassung erstellen
  const zusammenfassung = erstelleProduktionsZusammenfassung(produktionsAnalyse);
  
  console.log('✅ Produktionskapazitäts-Analyse abgeschlossen');
  
  return {
    produkte: produktionsAnalyse,
    zusammenfassung: zusammenfassung,
    generiert: new Date()
  };
}

// Analysiert die Produktionskapazität für ein einzelnes Produkt
function analysiereProduktionskapazitaet(produkt, rohseifenMap, duftoeleMap, verpackungenMap, zusatzstoffeMap, zusatzstoffBestandsMap, giesswerkstoffMap, giessformMap, bestandsMap) {
  // Seife-Beschreibung für Dual-Soap erweitern
  let seifeBeschreibung = produkt.seife;
  const istDualSeife = produkt.rohseifenKonfiguration?.verwendeZweiRohseifen;
  
  if (istDualSeife && produkt.rohseifenKonfiguration.seife2) {
    const gewichtVerteilung = produkt.rohseifenKonfiguration.gewichtVerteilung || 
                              { seife1Prozent: 50, seife2Prozent: 50 };
    seifeBeschreibung = `${produkt.seife} (${gewichtVerteilung.seife1Prozent}%) + ${produkt.rohseifenKonfiguration.seife2} (${gewichtVerteilung.seife2Prozent}%)`;
  }
  
  const analyse = {
    produktId: produkt._id,
    produktName: produkt.name,
    kategorie: produkt.kategorie || 'seife', // 'seife' oder 'werkstuck'
    seife: seifeBeschreibung,
    aroma: produkt.aroma,
    verpackung: produkt.verpackung,
    grammProEinheit: produkt.gramm,
    rohstoffBedarf: [],
    limitierenderFaktor: null,
    maxProduktion: 0,
    probleme: []
  };
  
  let minProduktion = Infinity;
  
  // ========== WERKSTÜCK-LOGIK ==========
  if (produkt.kategorie === 'werkstuck') {
    // 1. Gießwerkstoff analysieren
    let giesswerkstoffGefunden = false;
    
    // populate() gibt das volle Objekt zurück, nicht nur die ID
    if (produkt.giesswerkstoff) {
      const giesswerkstoffObj = produkt.giesswerkstoff; // populate() Objekt
      const giesswerkstoffId = giesswerkstoffObj._id || giesswerkstoffObj;
      
      // BERECHNUNG: Volumen × Berechnungsfaktor = Benötigte Menge
      // Nutze Gießform-Volumen (ml) und Berechnungsfaktor aus Portfolio-Konfiguration
      const giessformObj = produkt.giessform || {};
      const volumenMl = giessformObj.volumenMl || produkt.gramm; // Fallback: gramm-Feld
      const berechnungsFaktor = produkt.giesswerkstoffKonfiguration?.berechnungsFaktor || 1.0;
      const benoetigt = volumenMl * berechnungsFaktor; // Tatsächlicher Materialbedarf
      
      console.log(`🏺 WERKSTÜCK "${produkt.name}": volumenMl=${volumenMl}, berechnungsFaktor=${berechnungsFaktor}, benötigt=${benoetigt}g`);
      
      // Versuche zuerst aus dem populate()-Objekt zu lesen
      if (giesswerkstoffObj.bezeichnung && giesswerkstoffObj.aktuellerBestand !== undefined) {
        const verfuegbar = giesswerkstoffObj.aktuellerBestand;
        const maxProduktionGiesswerkstoff = Math.floor(verfuegbar / benoetigt);
        
        console.log(`   ✅ Gießwerkstoff: ${giesswerkstoffObj.bezeichnung}, verfügbar=${verfuegbar}g → Max.Produktion=${maxProduktionGiesswerkstoff}`);
        
        analyse.rohstoffBedarf.push({
          typ: 'giesswerkstoff',
          name: giesswerkstoffObj.bezeichnung,
          benoetigt: benoetigt,
          einheit: giesswerkstoffObj.einheit || 'g',
          verfuegbar: verfuegbar,
          maxProduktion: maxProduktionGiesswerkstoff,
          ausreichend: verfuegbar >= benoetigt
        });
        
        if (maxProduktionGiesswerkstoff < minProduktion) {
          minProduktion = maxProduktionGiesswerkstoff;
          analyse.limitierenderFaktor = 'giesswerkstoff';
        }
        giesswerkstoffGefunden = true;
      } else {
        // Fallback: Versuche aus Map zu holen
        const giesswerkstoff = giesswerkstoffMap.get(giesswerkstoffId.toString());
        
        if (giesswerkstoff) {
          const verfuegbar = giesswerkstoff.aktuellerBestand;
          const maxProduktionGiesswerkstoff = Math.floor(verfuegbar / benoetigt);
          
          console.log(`   ✅ Gießwerkstoff (Map): ${giesswerkstoff.bezeichnung}, verfügbar=${verfuegbar}g → Max.Produktion=${maxProduktionGiesswerkstoff}`);
          
          analyse.rohstoffBedarf.push({
            typ: 'giesswerkstoff',
            name: giesswerkstoff.bezeichnung,
            benoetigt: benoetigt,
            einheit: giesswerkstoff.einheit || 'g',
            verfuegbar: verfuegbar,
            maxProduktion: maxProduktionGiesswerkstoff,
            ausreichend: verfuegbar >= benoetigt
          });
          
          if (maxProduktionGiesswerkstoff < minProduktion) {
            minProduktion = maxProduktionGiesswerkstoff;
            analyse.limitierenderFaktor = 'giesswerkstoff';
          }
          giesswerkstoffGefunden = true;
        } else {
          console.log(`   ⚠️ Gießwerkstoff nicht gefunden (ID: ${giesswerkstoffId}) → Fallback zu Bestand`);
          analyse.probleme.push(`⚠️ Gießwerkstoff-ID existiert, aber Material nicht gefunden`);
        }
      }
    }
    
    // FALLBACK: Kein Gießwerkstoff ODER nicht gefunden
    if (!giesswerkstoffGefunden) {
      // Für Werkstücke ohne Gießwerkstoff-Konfiguration: Nimm aktuellen Fertigprodukt-Bestand
      // Der Bestand repräsentiert bereits produzierte Werkstücke, die auf Lager sind
      const aktuellerBestand = bestandsMap.get(produkt._id.toString()) || 0;
      
      console.log(`🏺 WERKSTÜCK "${produkt.name}": ⚠️ KEIN Gießwerkstoff → Zeige Bestand (${aktuellerBestand} Stück)`);
      
      if (!analyse.probleme.find(p => p.includes('Gießwerkstoff'))) {
        analyse.probleme.push('⚠️ Gießwerkstoff nicht konfiguriert - Zeige aktuellen Bestand');
      }
      
      analyse.rohstoffBedarf.push({
        typ: 'bestand',
        name: 'Aktuelle Fertigware (auf Lager)',
        benoetigt: 0,
        einheit: 'Stück',
        verfuegbar: aktuellerBestand,
        maxProduktion: aktuellerBestand,
        ausreichend: aktuellerBestand > 0,
        hinweis: 'Gießwerkstoff nicht konfiguriert - Bestand als Referenz'
      });
      
      // Setze Produktion auf Bestand (keine neue Produktion möglich ohne Gießwerkstoff-Daten)
      minProduktion = aktuellerBestand;
      analyse.limitierenderFaktor = 'bestand';
    }
    
    // 2. Gießform analysieren (optional - kann mehrfach verwendet werden)
    if (produkt.giessform) {
      const giessformObj = produkt.giessform; // populate() Objekt
      const giessformId = giessformObj._id || giessformObj;
      
      // Versuche zuerst aus dem populate()-Objekt zu lesen
      if (giessformObj.name) {
        analyse.rohstoffBedarf.push({
          typ: 'giessform',
          name: giessformObj.name,
          benoetigt: 1,
          einheit: 'Stück (wiederverwendbar)',
          verfuegbar: 1,
          maxProduktion: Infinity, // Unbegrenzt wiederverwendbar
          ausreichend: true,
          inventarnummer: giessformObj.inventarnummer,
          zustand: giessformObj.zustand,
          volumenMl: giessformObj.volumenMl
        });
      } else {
        // Fallback: Versuche aus Map zu holen
        const giessform = giessformMap.get(giessformId.toString());
        
        if (giessform) {
          analyse.rohstoffBedarf.push({
            typ: 'giessform',
            name: giessform.name,
            benoetigt: 1,
            einheit: 'Stück (wiederverwendbar)',
            verfuegbar: 1,
            maxProduktion: Infinity,
            ausreichend: true,
            inventarnummer: giessform.inventarnummer,
            zustand: giessform.zustand,
            volumenMl: giessform.volumenMl
          });
        }
      }
    }
    
    // 3. Verpackung analysieren (wie bei Seifen)
    if (produkt.verpackung) {
      const verpackung = verpackungenMap.get(produkt.verpackung.toLowerCase());
      
      if (verpackung) {
        const verfuegbareVerpackungen = verpackung.aktuellVorrat;
        const maxProduktionVerpackung = verfuegbareVerpackungen;
        
        analyse.rohstoffBedarf.push({
          typ: 'verpackung',
          name: verpackung.bezeichnung,
          benoetigt: 1,
          einheit: 'Stück',
          verfuegbar: verfuegbareVerpackungen,
          maxProduktion: maxProduktionVerpackung,
          ausreichend: verfuegbareVerpackungen >= 1
        });
        
        if (maxProduktionVerpackung < minProduktion) {
          minProduktion = maxProduktionVerpackung;
          analyse.limitierenderFaktor = 'verpackung';
        }
      } else {
        analyse.probleme.push(`Verpackung "${produkt.verpackung}" nicht gefunden`);
        minProduktion = 0;
      }
    }
    
    // Finale Produktionsmenge für Werkstück
    analyse.maxProduktion = minProduktion === Infinity ? 0 : minProduktion;
    return analyse;
  }
  
  // ========== SEIFEN-LOGIK (wie bisher) ==========
  // 1. Rohseifen analysieren (DUAL-SOAP Support)
  const istweiRohseifen = produkt.rohseifenKonfiguration?.verwendeZweiRohseifen;
  
  if (istweiRohseifen) {
    // DUAL-SOAP: Zwei Rohseifen analysieren
    console.log(`🔍 Dual-Soap Analyse für ${produkt.name}: ${produkt.seife} + ${produkt.rohseifenKonfiguration.seife2}`);
    
    const gewichtVerteilung = produkt.rohseifenKonfiguration.gewichtVerteilung || 
                              { seife1Prozent: 50, seife2Prozent: 50 };
    
    // Seife 1 (Hauptseife) - Map-Lookup
    const rohseife1 = rohseifenMap.get(produkt.seife.toLowerCase());
    
    if (rohseife1) {
      const benoetigt1 = Math.round(produkt.gramm * (gewichtVerteilung.seife1Prozent / 100));
      const verfuegbar1 = rohseife1.aktuellVorrat;
      const maxProduktion1 = Math.floor(verfuegbar1 / benoetigt1);
      
      analyse.rohstoffBedarf.push({
        typ: 'rohseife',
        name: `${rohseife1.bezeichnung} (${gewichtVerteilung.seife1Prozent}%)`,
        benoetigt: benoetigt1,
        einheit: 'g',
        verfuegbar: verfuegbar1,
        maxProduktion: maxProduktion1,
        ausreichend: verfuegbar1 >= benoetigt1
      });
      
      if (maxProduktion1 < minProduktion) {
        minProduktion = maxProduktion1;
        analyse.limitierenderFaktor = 'rohseife-1';
      }
    } else {
      analyse.probleme.push(`Rohseife "${produkt.seife}" nicht gefunden`);
      minProduktion = 0;
    }
    
    // Seife 2 (zweite Rohseife) - Map-Lookup
    const rohseife2 = rohseifenMap.get(produkt.rohseifenKonfiguration.seife2.toLowerCase());
    
    if (rohseife2) {
      const benoetigt2 = Math.round(produkt.gramm * (gewichtVerteilung.seife2Prozent / 100));
      const verfuegbar2 = rohseife2.aktuellVorrat;
      const maxProduktion2 = Math.floor(verfuegbar2 / benoetigt2);
      
      analyse.rohstoffBedarf.push({
        typ: 'rohseife',
        name: `${rohseife2.bezeichnung} (${gewichtVerteilung.seife2Prozent}%)`,
        benoetigt: benoetigt2,
        einheit: 'g',
        verfuegbar: verfuegbar2,
        maxProduktion: maxProduktion2,
        ausreichend: verfuegbar2 >= benoetigt2
      });
      
      if (maxProduktion2 < minProduktion) {
        minProduktion = maxProduktion2;
        analyse.limitierenderFaktor = 'rohseife-2';
      }
    } else {
      analyse.probleme.push(`Rohseife "${produkt.rohseifenKonfiguration.seife2}" nicht gefunden`);
      minProduktion = 0;
    }
    
  } else {
    // STANDARD: Eine Rohseife analysieren - Map-Lookup
    const rohseife = rohseifenMap.get(produkt.seife.toLowerCase());
    
    if (rohseife) {
      const benoetigt = produkt.gramm; // Gramm pro Produkt
      const verfuegbar = rohseife.aktuellVorrat;
      const maxProduktionRohseife = Math.floor(verfuegbar / benoetigt);
      
      analyse.rohstoffBedarf.push({
        typ: 'rohseife',
        name: rohseife.bezeichnung,
        benoetigt: benoetigt,
        einheit: 'g',
        verfuegbar: verfuegbar,
        maxProduktion: maxProduktionRohseife,
        ausreichend: verfuegbar >= benoetigt
      });
      
      if (maxProduktionRohseife < minProduktion) {
        minProduktion = maxProduktionRohseife;
        analyse.limitierenderFaktor = 'rohseife';
      }
    } else {
      analyse.probleme.push(`Rohseife "${produkt.seife}" nicht gefunden`);
      minProduktion = 0;
    }
  }
  
  // 2. Duftöl analysieren (falls erforderlich) - Map-Lookup
  if (produkt.aroma && produkt.aroma !== 'Neutral' && produkt.aroma !== '' && produkt.aroma !== 'Keine') {
    const duftoel = duftoeleMap.get(produkt.aroma.toLowerCase());
    
    if (duftoel) {
      // Dosierung: 1 Tropfen pro 50g Seife
      const tropfenProEinheit = Math.ceil(produkt.gramm / 50);
      const verfuegbareTropfen = duftoel.aktuellVorrat;
      const maxProduktionDuftoel = Math.floor(verfuegbareTropfen / tropfenProEinheit);
      
      analyse.rohstoffBedarf.push({
        typ: 'duftoel',
        name: duftoel.bezeichnung,
        benoetigt: tropfenProEinheit,
        einheit: 'Tropfen',
        verfuegbar: verfuegbareTropfen,
        maxProduktion: maxProduktionDuftoel,
        ausreichend: verfuegbareTropfen >= tropfenProEinheit,
        dosierung: '1 Tropfen pro 50g'
      });
      
      if (maxProduktionDuftoel < minProduktion) {
        minProduktion = maxProduktionDuftoel;
        analyse.limitierenderFaktor = 'duftoel';
      }
    } else {
      analyse.probleme.push(`Duftöl "${produkt.aroma}" nicht gefunden`);
      // Duftöl ist optional - setze minProduktion nur auf 0 wenn bereits 0
      if (minProduktion === Infinity) minProduktion = 0;
    }
  }
  
  // 3. Verpackung analysieren - Map-Lookup
  const verpackung = verpackungenMap.get(produkt.verpackung.toLowerCase());
  
  if (verpackung) {
    const verfuegbareVerpackungen = verpackung.aktuellVorrat;
    const maxProduktionVerpackung = verfuegbareVerpackungen; // 1 Verpackung pro Produkt
    
    analyse.rohstoffBedarf.push({
      typ: 'verpackung',
      name: verpackung.bezeichnung,
      benoetigt: 1,
      einheit: 'Stück',
      verfuegbar: verfuegbareVerpackungen,
      maxProduktion: maxProduktionVerpackung,
      ausreichend: verfuegbareVerpackungen >= 1
    });
    
    if (maxProduktionVerpackung < minProduktion) {
      minProduktion = maxProduktionVerpackung;
      analyse.limitierenderFaktor = 'verpackung';
    }
  } else {
    analyse.probleme.push(`Verpackung "${produkt.verpackung}" nicht gefunden`);
    minProduktion = 0;
  }
  
  // 4. Zusatzinhaltsstoffe analysieren
  // console.log(`🧪 [DEBUG] Produkt ${produkt.name}: zusatzinhaltsstoffe Array:`, produkt.zusatzinhaltsstoffe);
  if (produkt.zusatzinhaltsstoffe && Array.isArray(produkt.zusatzinhaltsstoffe) && produkt.zusatzinhaltsstoffe.length > 0) {
    // console.log(`🧪 [DEBUG] Starte Zusatzinhaltsstoffe-Analyse für ${produkt.name}: ${produkt.zusatzinhaltsstoffe.length} Stoffe`);
    for (const zusatz of produkt.zusatzinhaltsstoffe) {
      // console.log(`🧪 [DEBUG] Prüfe Zusatz:`, zusatz);
      if (zusatz && zusatz.inhaltsstoffName && typeof zusatz.inhaltsstoffName === 'string' && zusatz.inhaltsstoffName.trim() !== '') {
        // console.log(`🧪 [DEBUG] Suche Bestand für Zusatz: ${zusatz.inhaltsstoffName}, ID: ${zusatz.id || zusatz._id}`);
        
        // Map-Lookup statt DB-Query
        const zusatzinhaltsstoff = zusatzstoffeMap.get(zusatz.inhaltsstoffName.toLowerCase());
        
        if (zusatzinhaltsstoff) {
          // console.log(`🧪 [DEBUG] ZusatzInhaltsstoff gefunden:`, zusatzinhaltsstoff.bezeichnung, zusatzinhaltsstoff._id);
          
          // Bestand aus der vorgeladenen Map holen statt DB-Query
          const bestandMenge = zusatzstoffBestandsMap.get(zusatzinhaltsstoff._id.toString()) || 0;
            // Berechne die benötigte Menge basierend auf der Portfolio-Konfiguration
            let benoetigt = 0;
            if (zusatz.menge && typeof zusatz.menge === 'number' && zusatz.menge > 0) {
              if (zusatz.einheit === 'gramm') {
                // Direkte Grammangabe - für 50g Seife skalieren
                benoetigt = Math.round((zusatz.menge * produkt.gramm) / 50);
              } else if (zusatz.einheit === 'prozent') {
                // Prozentuale Angabe
                benoetigt = Math.round((produkt.gramm * zusatz.menge) / 100);
              } else {
                // Fallback: als Gramm interpretieren
                benoetigt = Math.round((zusatz.menge * produkt.gramm) / 50);
              }
            } else if (zusatzinhaltsstoff.empfohleneDosierung && typeof zusatzinhaltsstoff.empfohleneDosierung === 'number' && zusatzinhaltsstoff.empfohleneDosierung > 0) {
              // Fallback zur empfohlenen Dosierung aus ZusatzInhaltsstoff
              benoetigt = Math.round((produkt.gramm * zusatzinhaltsstoff.empfohleneDosierung) / 100);
            } else {
              // Fallback: 1% des Produktgewichts
              benoetigt = Math.round(produkt.gramm * 0.01);
            }
            
            const verfuegbar = bestandMenge;
            const maxProduktionZusatz = benoetigt > 0 ? Math.floor(verfuegbar / benoetigt) : 0;
            
            // console.log(`🧪 [DEBUG] ${zusatz.inhaltsstoffName}: benötigt=${benoetigt}g, verfügbar=${verfuegbar}g, maxProduktion=${maxProduktionZusatz}`);
            
            analyse.rohstoffBedarf.push({
              typ: 'zusatzinhaltsstoff',
              name: zusatz.inhaltsstoffName,
              benoetigt: benoetigt,
              einheit: 'g',
              verfuegbar: verfuegbar,
              maxProduktion: maxProduktionZusatz,
              ausreichend: verfuegbar >= benoetigt,
              dosierung: zusatz.einheit === 'gramm' ? `${zusatz.menge}g/50g Seife` : 
                        zusatz.einheit === 'prozent' ? `${zusatz.menge}%` :
                        zusatzinhaltsstoff.empfohleneDosierung ? `${zusatzinhaltsstoff.empfohleneDosierung}% (empfohlen)` : '1% (Standard)'
            });
            
            if (maxProduktionZusatz < minProduktion) {
              // console.log(`🧪 [DEBUG] Neuer limitierender Faktor: zusatzinhaltsstoff (${maxProduktionZusatz} < ${minProduktion})`);
              minProduktion = maxProduktionZusatz;
              analyse.limitierenderFaktor = 'zusatzinhaltsstoff';
            }
        } else {
          // console.log(`🧪 [DEBUG] ZusatzInhaltsstoff "${zusatz.inhaltsstoffName}" nicht in Datenbank gefunden`);
          analyse.probleme.push(`Zusatzinhaltsstoff "${zusatz.inhaltsstoffName}" nicht definiert`);
          minProduktion = 0;
        }
      } else {
        // console.log(`🧪 [DEBUG] Überspringe ungültigen Zusatz:`, zusatz);
      }
    }
  } else {
    // console.log(`🧪 [DEBUG] Produkt ${produkt.name}: Keine Zusatzinhaltsstoffe definiert`);
  }
  
  // Endgültige maximale Produktion setzen
  analyse.maxProduktion = minProduktion === Infinity ? 0 : minProduktion;
  
  return analyse;
}

// Erstellt eine Zusammenfassung der Produktionsanalyse
function erstelleProduktionsZusammenfassung(produktionsAnalyse) {
  const gesamt = produktionsAnalyse.length;
  const produzierbar = produktionsAnalyse.filter(p => p.maxProduktion > 0).length;
  const nichtProduzierbar = gesamt - produzierbar;
  
  // Limitierende Faktoren zählen
  const limitierungGruende = {};
  produktionsAnalyse.forEach(p => {
    if (p.limitierenderFaktor) {
      limitierungGruende[p.limitierenderFaktor] = (limitierungGruende[p.limitierenderFaktor] || 0) + 1;
    }
  });
  
  // Top 5 Produkte mit höchster Produktionskapazität
  const topProduktion = produktionsAnalyse
    .filter(p => p.maxProduktion > 0)
    .sort((a, b) => b.maxProduktion - a.maxProduktion)
    .slice(0, 5)
    .map(p => ({
      name: p.produktName,
      maxProduktion: p.maxProduktion,
      limitierenderFaktor: p.limitierenderFaktor
    }));
  
  // Kritische Produkte (nicht produzierbar oder sehr niedrige Kapazität)
  const kritisch = produktionsAnalyse
    .filter(p => p.maxProduktion <= 5)
    .map(p => ({
      name: p.produktName,
      maxProduktion: p.maxProduktion,
      probleme: p.probleme,
      limitierenderFaktor: p.limitierenderFaktor
    }));
  
  return {
    uebersicht: {
      gesamtProdukte: gesamt,
      produzierbar: produzierbar,
      nichtProduzierbar: nichtProduzierbar,
      produktionsrate: Math.round((produzierbar / gesamt) * 100)
    },
    limitierungen: limitierungGruende,
    topProduktion: topProduktion,
    kritischeProdukte: kritisch
  };
}

module.exports = router;
module.exports.invalidateProductionCapacityCache = invalidateProductionCapacityCache;