const express = require('express');
const router = express.Router();
const Inquiry = require('../models/Inquiry');
const Order = require('../models/Order');
const AdminSettings = require('../models/AdminSettings');
const { auth, authenticateToken } = require('../middleware/auth');
const PayPalService = require('../services/PayPalService');
const { cacheManager } = require('../utils/cacheManager');
const { reduceInventoryForProduct } = require('../utils/inventoryUtils');

// Hilfsfunktion zum Portfolio-Cache-Invalidieren
function invalidatePortfolioCache() {
  // Referenz auf den Portfolio-Cache aus der Portfolio-Route
  // Da der Portfolio-Cache als lokale Variable in portfolio.js definiert ist,
  // setzen wir eine globale Variable für die Cache-Invalidierung
  global.portfolioCache = { data: null, timestamp: 0 };
  cacheManager.invalidateProductCache();
  console.log('🗑️ Portfolio cache invalidated due to inventory change');
}

async function calculateShippingFromSettings(subtotal) {
  const normalizedSubtotal = Number(subtotal || 0);

  try {
    const settings = await AdminSettings.getInstance();
    const shippingEnabled = settings.checkout?.shippingEnabled !== false;
    const shippingCost = Number(settings.checkout?.shippingCost ?? 5.99);
    const freeShippingThreshold = Number(settings.checkout?.freeShippingThreshold ?? 30);

    const resolvedShippingCost = Number.isFinite(shippingCost) ? shippingCost : 5.99;
    const resolvedThreshold = Number.isFinite(freeShippingThreshold) ? freeShippingThreshold : 30;
    const versandkosten = shippingEnabled && normalizedSubtotal < resolvedThreshold ? resolvedShippingCost : 0;

    return {
      versandkosten,
      shippingEnabled,
      shippingCost: resolvedShippingCost,
      freeShippingThreshold: resolvedThreshold
    };
  } catch (error) {
    console.warn('⚠️ Konnte AdminSettings fuer Versandkosten nicht laden, verwende Fallback:', error.message);
    return {
      versandkosten: normalizedSubtotal < 30 ? 5.99 : 0,
      shippingEnabled: true,
      shippingCost: 5.99,
      freeShippingThreshold: 30
    };
  }
}

// Middleware: Admin-Berechtigung prüfen
const requireAdmin = (req, res, next) => {
  if (!req.user || !req.user.permissions?.includes('admin')) {
    return res.status(403).json({
      success: false,
      message: 'Admin-Berechtigung erforderlich'
    });
  }
  next();
};

function syncInquiryWithLinkedOrder(inquiry, linkedOrder) {
  if (!linkedOrder) {
    return inquiry;
  }

  const orderStatus = String(linkedOrder.status || '').toLowerCase();
  const paymentStatus = String(linkedOrder.zahlung?.status || '').toLowerCase();

  const isPaid =
    orderStatus === 'bezahlt' ||
    orderStatus === 'verpackt' ||
    orderStatus === 'verschickt' ||
    orderStatus === 'zugestellt' ||
    paymentStatus === 'bezahlt' ||
    paymentStatus === 'paid' ||
    paymentStatus === 'completed';

  let mappedStatus = inquiry.status;
  if (orderStatus === 'verpackt') {
    mappedStatus = 'verpackt';
  } else if (orderStatus === 'verschickt' || orderStatus === 'versendet') {
    mappedStatus = 'verschickt';
  } else if (orderStatus === 'zugestellt' || orderStatus === 'delivered') {
    mappedStatus = 'zugestellt';
  } else if (isPaid) {
    mappedStatus = 'paid';
  }

  const syncedInquiry = {
    ...inquiry,
    status: mappedStatus,
    orderStatus,
    payment: {
      ...(inquiry.payment || {}),
      status: isPaid ? 'completed' : (inquiry.payment?.status || 'not_required'),
      paidAt: isPaid
        ? (inquiry.payment?.paidAt || linkedOrder.zahlung?.bezahltAm || inquiry.updatedAt || new Date())
        : inquiry.payment?.paidAt
    }
  };

  // ✅ Versanddaten für Kunde sichtbar machen wenn versendet
  if (mappedStatus === 'verschickt' || mappedStatus === 'zugestellt') {
    syncedInquiry.shipping = {
      sendungsnummer: linkedOrder.versand?.sendungsnummer || '',
      trackingUrl: linkedOrder.versand?.trackingUrl || '',
      anbieter: linkedOrder.versand?.anbieter || 'dhl',
      versendetAm: linkedOrder.versand?.versendetAm,
      zugestelltAm: linkedOrder.versand?.zugestelltAm
    };
  }

  return syncedInquiry;
}

// 📊 GET: Admin-Statistiken
router.get('/admin/stats', auth, async (req, res) => {
  try {
    console.log('🔍 Anfrage stats für Admin abrufen... [VERSION: v2-totalValue]');
    
    // Basis-Zählungen
    const totalInquiries = await Inquiry.countDocuments();
    const pendingInquiries = await Inquiry.countDocuments({ status: 'pending' });
    const acceptedInquiries = await Inquiry.countDocuments({ status: 'accepted' });
    const rejectedInquiries = await Inquiry.countDocuments({ status: 'rejected' });
    const convertedInquiries = await Inquiry.countDocuments({ status: 'converted_to_order' });
    
    // Gesamtwert aller Anfragen berechnen
    console.log('🔍 Starte totalValue Aggregation...');
    const totalValueResult = await Inquiry.aggregate([
      {
        $group: {
          _id: null,
          totalValue: { $sum: '$total' }
        }
      }
    ]);
    
    const totalValue = totalValueResult.length > 0 ? totalValueResult[0].totalValue : 0;
    console.log('💰 TotalValue Aggregation Ergebnis:', { totalValueResult, totalValue });
    
    console.log('📊 Admin-Statistiken:', {
      total: totalInquiries,
      pending: pendingInquiries,
      totalValue: totalValue
    });
    
    res.json({
      success: true,
      data: {
        total: totalInquiries || 0,
        pending: pendingInquiries || 0,
        accepted: acceptedInquiries || 0,
        rejected: rejectedInquiries || 0,
        converted: convertedInquiries || 0,
        totalValue: totalValue || 0
      }
    });
  } catch (error) {
    console.error('❌ Fehler beim Laden der Admin-Statistiken:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Laden der Statistiken'
    });
  }
});

// � GET: PayPal-Status prüfen
router.get('/paypal-status', async (req, res) => {
  try {
    const isEnabled = await PayPalService.isEnabled();
    
    res.json({
      success: true,
      paypalEnabled: isEnabled
    });
  } catch (error) {
    console.error('❌ Fehler beim Prüfen des PayPal-Status:', error);
    res.json({
      success: true,
      paypalEnabled: false
    });
  }
});

// 📋 GET: Anfragen abrufen (je nach Benutzertyp)
router.get('/', authenticateToken, async (req, res) => {
  try {
    console.log(`📋 Anfragen für User ${req.user.email} abrufen...`);
    
    let inquiries;
    
    // Prüfe ob Admin
    const userRole = req.user.rolle || req.user.role;
    if (userRole === 'admin' || (req.user.permissions?.includes('admin'))) {
      console.log('👑 Admin-Zugriff: Alle Anfragen laden');
      inquiries = await Inquiry.find({})
        .sort({ createdAt: -1 });
    } else {
      console.log('👤 Kunden-Zugriff: Nur eigene Anfragen laden');
      const userId = req.user.id || req.user.kundeId || req.user.userId;
      inquiries = await Inquiry.find({ 'customer.id': userId })
        .sort({ createdAt: -1 });
    }
    
    console.log(`📊 ${inquiries.length} Anfragen gefunden`);
    
    res.json({
      success: true,
      data: inquiries,
      count: inquiries.length
    });
    
  } catch (error) {
    console.error('❌ Fehler beim Laden der Anfragen:', error);
    res.status(500).json({
      success: false,
      message: 'Anfragen konnten nicht geladen werden'
    });
  }
});

// �📝 POST: Neue Anfrage erstellen (Kunde - Auth erforderlich)
router.post('/create', authenticateToken, async (req, res) => {
  try {
    console.log('📝 Neue Anfrage erstellen...');
    console.log('🔍 Request User:', req.user);
    
    const { items, total, rechnungsadresse, lieferadresse, customerNote } = req.body;
    
    // Validierung
    if (!items || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Keine Artikel in der Anfrage'
      });
    }
    
    if (!total || total <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Ungültiger Gesamtbetrag'
      });
    }
    
    if (!rechnungsadresse || !rechnungsadresse.vorname || !rechnungsadresse.nachname) {
      return res.status(400).json({
        success: false,
        message: 'Rechnungsadresse unvollständig'
      });
    }
    
    // Anfrage-ID generieren
    const inquiryId = Inquiry.generateInquiryId();
    
    // Neue Anfrage erstellen
    const customerId = req.user.userId || req.user.id || req.user.kundeId;
    console.log('🔍 Customer ID:', customerId);
    console.log('🔍 Request User Object:', JSON.stringify(req.user, null, 2));
    
    if (!customerId) {
      return res.status(400).json({
        success: false,
        message: 'Benutzer-ID nicht gefunden'
      });
    }
    
    // Kundendaten aus der Datenbank laden
    const Kunde = require('../models/Kunde');
    const kunde = await Kunde.findById(customerId);
    
    if (!kunde) {
      return res.status(404).json({
        success: false,
        message: 'Kunde nicht gefunden'
      });
    }
    
    console.log('👤 Kunde gefunden:', { name: kunde.name, email: kunde.email });
    
    // Stelle sicher, dass alle Items ein produktType haben
    const Product = require('../models/Product');
    const Rohseife = require('../models/Rohseife');
    const Duftoil = require('../models/Duftoil');
    const Verpackung = require('../models/Verpackung');
    
    const itemsWithProductType = await Promise.all(
      items.map(async (item) => {
        let produktType = item.produktType;
        
        // Falls produktType nicht vorhanden, aus Datenbank ermitteln
        if (!produktType) {
          try {
            // Versuche alle Modelle
            let product = await Product.findById(item.productId);
            if (product) {
              produktType = 'standard';
            } else {
              product = await Rohseife.findById(item.productId);
              if (product) {
                produktType = 'rohseife';
              } else {
                product = await Duftoil.findById(item.productId);
                if (product) {
                  produktType = 'duftoil';
                } else {
                  product = await Verpackung.findById(item.productId);
                  if (product) {
                    produktType = 'verpackung';
                  } else {
                    produktType = 'rohseife'; // Fallback
                  }
                }
              }
            }
          } catch (error) {
            console.log(`⚠️ Warnung: produktType für Item ${item.productId} nicht ermittelbar, verwende Fallback`);
            produktType = 'rohseife';
          }
        }
        
        return {
          ...item,
          produktType: produktType
        };
      })
    );

    const inquiry = new Inquiry({
      inquiryId,
      customer: {
        id: customerId,
        name: kunde.name || `${kunde.vorname || ''} ${kunde.nachname || ''}`.trim() || 'Unbekannt',
        email: kunde.email
      },
      items: itemsWithProductType,
      total,
      rechnungsadresse,
      lieferadresse,
      customerNote: customerNote || ''
    });
    
    await inquiry.save();
    
    console.log(`✅ Anfrage ${inquiryId} erstellt für Kunde ${kunde.email}`);
    
    // Admin-E-Mail-Benachrichtigung senden
    try {
      const emailService = require('../services/emailService');
      await emailService.sendAdminInquiryNotification(inquiry);
      console.log('✅ Admin-Benachrichtigung für Anfrage gesendet');
    } catch (emailError) {
      console.error('❌ Fehler beim Senden der Admin-Benachrichtigung:', emailError);
      // Anfrage trotzdem speichern, auch wenn E-Mail fehlschlägt
    }

    res.status(201).json({
      success: true,
      message: 'Anfrage erfolgreich erstellt',
      inquiry: {
        inquiryId: inquiry.inquiryId,
        status: inquiry.status,
        total: inquiry.total,
        createdAt: inquiry.createdAt
      }
    });
    
  } catch (error) {
    console.error('❌ Fehler beim Erstellen der Anfrage:', error);
    res.status(500).json({
      success: false,
      message: 'Anfrage konnte nicht erstellt werden',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// 📋 GET: Anfragen für Kunden abrufen
router.get('/my-inquiries', auth, async (req, res) => {
  try {
    console.log(`📋 Anfragen für Kunde ${req.user.email} abrufen...`);
    
    const inquiries = await Inquiry.find({ 'customer.id': req.user.id })
      .sort({ createdAt: -1 })
      .select('-__v');
    
    res.json({
      success: true,
      inquiries
    });
    
  } catch (error) {
    console.error('❌ Fehler beim Abrufen der Anfragen:', error);
    res.status(500).json({
      success: false,
      message: 'Anfragen konnten nicht abgerufen werden'
    });
  }
});

// 📋 GET: Alle Anfragen für Admin abrufen
router.get('/admin/all', auth, async (req, res) => {
  try {
    console.log('📋 Alle Anfragen für Admin abrufen...');
    
    const { status, limit = 50, page = 1 } = req.query;
    
    const filter = {};
    if (status && status !== 'all') {
      // Unterstütze mehrere Status durch Komma getrennt
      const statusList = status.split(',').map(s => s.trim());
      if (statusList.length > 1) {
        filter.status = { $in: statusList };
      } else {
        filter.status = status;
      }
    }
    
    const skip = (page - 1) * limit;
    
    const inquiries = await Inquiry.find(filter)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip(skip)
      .select('-__v');
    
    const total = await Inquiry.countDocuments(filter);
    
    // Statistiken
    const stats = await Inquiry.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);
    
    const statusStats = {
      pending: 0,
      accepted: 0,
      rejected: 0,
      converted_to_order: 0
    };
    
    stats.forEach(stat => {
      statusStats[stat._id] = stat.count;
    });
    
    res.json({
      success: true,
      inquiries,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / limit)
      },
      stats: statusStats
    });
    
  } catch (error) {
    console.error('❌ Fehler beim Abrufen aller Anfragen:', error);
    res.status(500).json({
      success: false,
      message: 'Anfragen konnten nicht abgerufen werden'
    });
  }
});

// 🔍 GET: Einzelne Anfrage für Admin abrufen
router.get('/admin/:inquiryId', auth, async (req, res) => {
  try {
    const { inquiryId } = req.params;
    console.log(`🔍 Anfrage ${inquiryId} für Admin abrufen...`);
    
    const inquiry = await Inquiry.findOne({ inquiryId });
    
    if (!inquiry) {
      return res.status(404).json({
        success: false,
        message: 'Anfrage nicht gefunden'
      });
    }
    
    res.json({
      success: true,
      inquiry
    });
    
  } catch (error) {
    console.error('❌ Fehler beim Abrufen der Anfrage:', error);
    res.status(500).json({
      success: false,
      message: 'Anfrage konnte nicht abgerufen werden'
    });
  }
});

// ✅ PUT: Anfrage annehmen (Admin)
router.put('/admin/:inquiryId/accept', auth, requireAdmin, async (req, res) => {
  try {
    const { inquiryId } = req.params;
    const { message, convertToOrder } = req.body;
    
    console.log(`✅ Anfrage ${inquiryId} annehmen... Konvertieren: ${convertToOrder}`);
    
    const inquiry = await Inquiry.findOne({ inquiryId });
    
    if (!inquiry) {
      return res.status(404).json({
        success: false,
        message: 'Anfrage nicht gefunden'
      });
    }
    
    if (inquiry.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: 'Anfrage wurde bereits bearbeitet'
      });
    }
    
    // Admin-Antwort speichern
    inquiry.adminResponse = {
      message: message || 'Anfrage wurde angenommen',
      respondedBy: req.user.email,
      respondedAt: new Date()
    };
    
    // ⚡ BESTAND IMMER REDUZIEREN beim Annehmen einer Anfrage - Neue Dual-Soap-fähige Logik
    const Bestand = require('../models/Bestand');
    
    console.log('🔄 Bestandsreduzierung für angenommene Anfrage...');
    for (const item of inquiry.items) {
      try {
        // Verwende neue Inventar-Utility für Dual-Soap-Support bei Portfolio-Produkten
        const mengeZuReduzieren = item.quantity || item.menge;
        
        // Prüfe ob es ein Portfolio-Produkt ist
        if (item.produktType === 'Portfolio' || item.type === 'portfolio') {
          const inventoryResult = await reduceInventoryForProduct(
            item.produktId || item.productId, 
            mengeZuReduzieren
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
            console.warn(`⚠️ Bestandsreduktion fehlgeschlagen für: ${item.name}`);
            inventoryResult.operations.forEach(op => {
              if (!op.success) {
                console.warn(`      - ${op.rohseife}: ${op.error}`);
              }
            });
          }
        } else {
          // Fallback für andere Produkttypen - alte Logik beibehalten
          let bestand = await Bestand.findOne({
            artikelId: item.produktId || item.productId,
            typ: 'Portfolio' // Korrekter Typ für Portfolio-Produkte
          });
          
          // Falls nicht gefunden, versuche andere Typ-Bezeichnungen
          if (!bestand) {
            bestand = await Bestand.findOne({
              artikelId: item.produktId || item.productId,
              typ: 'produkt'
            });
          }
          
          if (!bestand) {
            bestand = await Bestand.findOne({
              artikelId: item.produktId || item.productId,
              typ: 'portfolio'
            });
          }

          if (bestand) {
            if (bestand.menge >= mengeZuReduzieren) {
              bestand.menge -= mengeZuReduzieren;
              await bestand.save();
              console.log(`📦 Bestand reduziert: ${item.name} (-${mengeZuReduzieren}), Restbestand: ${bestand.menge}`);
            } else {
              console.warn(`⚠️ Nicht genügend Bestand für: ${item.name} (verfügbar: ${bestand.menge}, benötigt: ${mengeZuReduzieren})`);
            }
          } else {
            console.warn(`⚠️ Kein Bestandseintrag gefunden für: ${item.name}`);
          }
        }
      } catch (bestandError) {
        console.error('❌ Fehler beim Bestandsabgang:', bestandError);
      }
    }
    
    // ✅ CACHE-INVALIDIERUNG: Portfolio-Cache nach Bestandsänderungen invalidieren
    invalidatePortfolioCache();
    console.log('🔄 Portfolio-Cache invalidiert nach Bestandsreduzierung');

    const shippingConfig = await calculateShippingFromSettings(inquiry.total);
    const versandkosten = shippingConfig.versandkosten;
    const gesamtsumme = Number(inquiry.total || 0) + versandkosten;

    console.log('🚚 Versandkonfiguration für Inquiry-Konvertierung:', {
      shippingEnabled: shippingConfig.shippingEnabled,
      shippingCost: shippingConfig.shippingCost,
      freeShippingThreshold: shippingConfig.freeShippingThreshold,
      inquiryTotal: inquiry.total,
      calculatedShipping: versandkosten
    });
    
    if (convertToOrder) {
      // Direkt in Bestellung umwandeln (Bestand bereits reduziert)
      const Order = require('../models/Order');
      
      console.log('🔄 Konvertiere Anfrage zu Bestellung...');
      
      // Artikel für Bestellung formatieren (ohne nochmalige Bestandsreduzierung)
      const artikelMitBestand = [];
      for (const item of inquiry.items) {
        artikelMitBestand.push({
          produktId: item.produktId || item.productId,
          produktSnapshot: {
            name: item.name,
            beschreibung: item.description || '',
            bild: item.image || ''
          },
          menge: item.quantity || item.menge,
          einzelpreis: item.price || item.einzelpreis,
          gesamtpreis: (item.quantity || item.menge) * (item.price || item.einzelpreis)
        });
      }

      // Bestellung erstellen
      const bestellnummer = `ORDER-${Date.now()}`;
      const neueBestellung = new Order({
        orderId: bestellnummer,
        bestellnummer: bestellnummer,
        besteller: {
          vorname: inquiry.customer.name ? inquiry.customer.name.split(' ')[0] : 'Unbekannt',
          nachname: inquiry.customer.name ? inquiry.customer.name.split(' ').slice(1).join(' ') : '',
          email: inquiry.customer.email,
          telefon: '',
          kundennummer: inquiry.customer.id // ✅ Verwende customer.id als kundennummer
        },
        rechnungsadresse: (inquiry.rechnungsadresse && inquiry.rechnungsadresse !== null) ? inquiry.rechnungsadresse : {
          strasse: 'Unbekannt',
          hausnummer: '0',
          plz: '00000',
          stadt: 'Unbekannt',
          land: 'Deutschland'
        },
        lieferadresse: {
          verwendeRechnungsadresse: true,
          firma: '',
          strasse: '',
          hausnummer: '',
          zusatz: '',
          plz: '',
          stadt: '',
          land: 'Deutschland'
        },
        artikel: artikelMitBestand.map(artikel => ({
          ...artikel,
          produktType: artikel.produktType || 'portfolio'
        })),
        preise: {
          zwischensumme: Number(inquiry.total || 0),
          versandkosten: versandkosten, // ✅ Korrekte Versandkostenberechnung
          mwst: {
            satz: 19,
            betrag: gesamtsumme * 0.19 / 1.19
          },
          rabatt: {
            betrag: 0,
            code: '',
            grund: '',
            prozent: 0
          },
          gesamtsumme: gesamtsumme // ✅ Gesamtsumme inkl. Versandkosten
        },
        status: 'bestaetigt',
        zahlungsart: 'rechnung',
        zahlung: {
          status: 'ausstehend',
          methode: 'ueberweisung'
        },
        source: 'inquiry',
        sourceInquiryId: inquiry._id
      });

      await neueBestellung.save();
      console.log(`✅ Bestellung ${bestellnummer} aus Anfrage erstellt`);

      // ✅ Automatische Rechnungserstellung für konvertierte Bestellung
      try {
        const orderInvoiceService = require('../services/orderInvoiceService');
        console.log('🧾 Erstelle Rechnung für konvertierte Bestellung:', neueBestellung._id);
        const invoiceResult = await orderInvoiceService.generateInvoiceForOrder(neueBestellung._id);
        
        if (invoiceResult.success) {
          console.log('✅ Rechnung automatisch erstellt für konvertierte Bestellung:', invoiceResult.invoiceNumber);
        } else {
          console.error('❌ Fehler bei automatischer Rechnungserstellung für konvertierte Bestellung:', invoiceResult.error);
          // Konvertierung trotzdem erfolgreich, nur Rechnung fehlgeschlagen
        }
      } catch (invoiceError) {
        console.error('❌ Fehler bei automatischer Rechnungserstellung für konvertierte Bestellung:', invoiceError);
        // Konvertierung trotzdem erfolgreich, nur Rechnung fehlgeschlagen
      }

      // Anfrage als konvertiert markieren
      inquiry.status = 'converted_to_order';
      inquiry.convertedOrderId = neueBestellung._id;
      
      await inquiry.save();

      res.json({
        success: true,
        message: 'Anfrage wurde angenommen und in Bestellung umgewandelt',
        inquiry: inquiry,
        order: {
          orderId: neueBestellung._id,
          bestellnummer: neueBestellung.bestellnummer
        }
      });

    } else {
      // Anfrage annehmen und automatisch Bestellung + Rechnung erstellen
      console.log('🔄 Erstelle automatisch Bestellung für angenommene Anfrage...');
      
      // Artikel konvertieren von Inquiry-Format zu Order-Format
      const konvertierteArtikel = inquiry.items.map(item => ({
        produktId: item.productId || item.produktId,
        produktSnapshot: {
          name: item.name,
          beschreibung: item.description || '',
          bild: item.image || '',
          kategorie: item.produktType || 'portfolio'
        },
        produktType: item.produktType || 'portfolio',
        menge: item.quantity || item.menge || 1,
        einzelpreis: item.price || item.einzelpreis || 0,
        gesamtpreis: (item.quantity || item.menge || 1) * (item.price || item.einzelpreis || 0)
      }));
      
      console.log('📦 Konvertierte Artikel:', konvertierteArtikel.length);
      
      // Konvertiere Anfrage zu Bestellung
      const neueBestellung = new Order({
        // bestellnummer wird automatisch generiert durch pre-save hook
        kundenId: inquiry.customer?.id || inquiry.kundenId || null,
        besteller: {
          vorname: inquiry.customer?.name ? inquiry.customer.name.split(' ')[0] : (inquiry.vorname || ''),
          nachname: inquiry.customer?.name ? inquiry.customer.name.split(' ').slice(1).join(' ') : (inquiry.nachname || ''),
          email: inquiry.customer?.email || inquiry.email,
          telefon: inquiry.telefon || '',
          kundennummer: inquiry.customer?.id || inquiry.kundennummer || null
        },
        artikel: konvertierteArtikel,
        bestellsumme: Number(inquiry.total || 0),
        versandkosten: versandkosten,
        gesamtsumme: gesamtsumme,
        preise: {
          zwischensumme: Number(inquiry.total || 0),
          versandkosten: versandkosten,
          gesamtsumme: gesamtsumme,
          mwst: {
            satz: 0,
            betrag: 0
          }
        },
        rechnungsadresse: {
          vorname: inquiry.vorname || '',
          nachname: inquiry.nachname || '',
          strasse: inquiry.adresse?.strasse || '',
          hausnummer: inquiry.adresse?.hausnummer || '',
          plz: inquiry.adresse?.plz || '',
          ort: inquiry.adresse?.ort || inquiry.adresse?.stadt || '',
          land: inquiry.adresse?.land || 'Deutschland',
          email: inquiry.email
        },
        lieferadresse: inquiry.lieferadresse || {
          vorname: inquiry.vorname || '',
          nachname: inquiry.nachname || '',
          strasse: inquiry.adresse?.strasse || '',
          hausnummer: inquiry.adresse?.hausnummer || '',
          plz: inquiry.adresse?.plz || '',
          ort: inquiry.adresse?.ort || inquiry.adresse?.stadt || '',
          land: inquiry.adresse?.land || 'Deutschland'
        },
        status: 'neu', // Warten auf Bezahlung - erst nach Zahlungseingang 'bezahlt' setzen
        source: 'inquiry_accepted',
        sourceInquiryId: inquiry._id,
        notizen: inquiry.message || '',
        bestelldatum: new Date(),
        paymentStatus: 'pending'
      });

      await neueBestellung.save();
      console.log(`✅ Bestellung erstellt: ${neueBestellung.bestellnummer}`);

      // Automatisch Rechnung erstellen
      try {
        const orderInvoiceService = require('../services/orderInvoiceService');
        const invoiceResult = await orderInvoiceService.generateInvoiceForOrder(neueBestellung._id);
        console.log('✅ Rechnung automatisch erstellt:', invoiceResult.invoiceNumber);
      } catch (invoiceError) {
        console.warn('⚠️ Warnung: Rechnung konnte nicht automatisch erstellt werden:', invoiceError.message);
        // Nicht abbrechen, falls Rechnungserstellung fehlschlägt
      }

      // Anfrage als konvertiert markieren
      inquiry.status = 'converted_to_order';
      inquiry.acceptedAt = new Date();
      inquiry.convertedOrderId = neueBestellung._id;
      
      await inquiry.save();
      
      res.json({
        success: true,
        message: 'Anfrage wurde angenommen. Bestellung und Rechnung wurden automatisch erstellt.',
        inquiry: inquiry,
        order: {
          orderId: neueBestellung._id,
          bestellnummer: neueBestellung.bestellnummer,
          status: neueBestellung.status
        }
      });
    }
    
  } catch (error) {
    console.error('Fehler beim Annehmen der Anfrage:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Annehmen der Anfrage'
    });
  }
});

// ❌ PUT: Anfrage ablehnen (Admin)
router.put('/admin/:inquiryId/reject', auth, async (req, res) => {
  try {
    const { inquiryId } = req.params;
    const { message } = req.body;
    
    console.log(`❌ Anfrage ${inquiryId} ablehnen...`);
    
    const inquiry = await Inquiry.findOne({ inquiryId });
    
    if (!inquiry) {
      return res.status(404).json({
        success: false,
        message: 'Anfrage nicht gefunden'
      });
    }
    
    if (inquiry.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: 'Anfrage wurde bereits bearbeitet'
      });
    }
    
    // Admin-Antwort speichern
    inquiry.adminResponse = {
      message: message || 'Anfrage wurde abgelehnt',
      respondedBy: req.user.email,
      respondedAt: new Date()
    };
    
    inquiry.status = 'rejected';
    await inquiry.save();
    
    console.log(`❌ Anfrage ${inquiryId} abgelehnt`);
    
    res.json({
      success: true,
      message: 'Anfrage wurde abgelehnt',
      inquiry
    });
    
  } catch (error) {
    console.error('❌ Fehler beim Erstellen der Anfrage:', error);
    console.error('❌ Error Stack:', error.stack);
    console.error('❌ Request User:', req.user);
    console.error('❌ Request Body Keys:', Object.keys(req.body));
    
    res.status(500).json({
      success: false,
      message: 'Anfrage konnte nicht erstellt werden',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// 📊 GET: Anfragen-Statistiken für Admin
router.get('/admin/stats-DISABLED', auth, async (req, res) => {
  try {
    console.log('� Anfrage stats für Admin abrufen...');
    
    const stats = await Inquiry.aggregate([
      {
        $group: {
          _id: null,
          totalInquiries: { $sum: 1 },
          pendingCount: {
            $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] }
          },
          acceptedCount: {
            $sum: { $cond: [{ $eq: ['$status', 'accepted'] }, 1, 0] }
          },
          rejectedCount: {
            $sum: { $cond: [{ $eq: ['$status', 'rejected'] }, 1, 0] }
          },
          convertedCount: {
            $sum: { $cond: [{ $eq: ['$status', 'converted_to_order'] }, 1, 0] }
          },
          totalValue: { $sum: '$total' }
        }
      }
    ]);
    
    const result = stats[0] || {
      totalInquiries: 0,
      pendingCount: 0,
      acceptedCount: 0,
      rejectedCount: 0,
      convertedCount: 0,
      totalValue: 0
    };
    
    res.json({
      success: true,
      stats: result
    });
    
  } catch (error) {
    console.error('❌ Fehler beim Abrufen der Statistiken:', error);
    res.status(500).json({
      success: false,
      message: 'Statistiken konnten nicht abgerufen werden'
    });
  }
});

// 👤 GET: Kunden-Anfragen abrufen (für eingeloggte Kunden)
router.get('/customer/my-inquiries', authenticateToken, async (req, res) => {
  try {
    console.log('👤 Kunden-Anfragen abrufen...');
    
    const customerId = req.user.userId || req.user.id || req.user.kundeId;
    console.log('🔍 Customer ID für Anfragen:', customerId);
    
    if (!customerId) {
      return res.status(400).json({
        success: false,
        message: 'Benutzer-ID nicht gefunden'
      });
    }

    // Anfragen des Kunden abrufen, sortiert nach Erstellungsdatum (neueste zuerst)
    const inquiries = await Inquiry.find({ 'customer.id': customerId })
      .sort({ createdAt: -1 })
      .lean();

    // Zahlungsstatus aus verknuepften Bestellungen ableiten (fuer Legacy-Daten und manuelle Admin-Updates)
    const convertedOrderIds = inquiries
      .map((inquiry) => inquiry.convertedOrderId)
      .filter(Boolean);

    let orderMap = new Map();
    if (convertedOrderIds.length > 0) {
      const linkedOrders = await Order.find({
        _id: { $in: convertedOrderIds }
      })
        .select('_id status zahlung versand')
        .lean();

      orderMap = new Map(linkedOrders.map((order) => [String(order._id), order]));
    }

    const syncedInquiries = inquiries.map((inquiry) => {
      const linkedOrder = inquiry.convertedOrderId ? orderMap.get(String(inquiry.convertedOrderId)) : null;
      return syncInquiryWithLinkedOrder(inquiry, linkedOrder);
    });

    console.log(`✅ ${inquiries.length} Anfragen für Kunde ${customerId} gefunden`);

    res.json({
      success: true,
      inquiries: syncedInquiries.map(inquiry => ({
        ...inquiry,
        // Zusätzliche computed properties für Frontend
        statusLabel: getStatusLabel(inquiry.status),
        statusColor: getStatusColor(inquiry.status),
        canCancel: inquiry.status === 'pending'
      }))
    });

  } catch (error) {
    console.error('❌ Fehler beim Abrufen der Kunden-Anfragen:', error);
    res.status(500).json({
      success: false,
      message: 'Anfragen konnten nicht abgerufen werden'
    });
  }
});

// 👤 GET: Einzelne Anfrage-Details für Kunde
router.get('/customer/:inquiryId', authenticateToken, async (req, res) => {
  try {
    console.log('👤 Anfrage-Details abrufen...');
    
    const { inquiryId } = req.params;
    const customerId = req.user.userId || req.user.id || req.user.kundeId;
    
    if (!customerId) {
      return res.status(400).json({
        success: false,
        message: 'Benutzer-ID nicht gefunden'
      });
    }

    // Anfrage abrufen und prüfen, ob sie dem Kunden gehört
    const inquiry = await Inquiry.findOne({ 
      inquiryId: inquiryId,
      'customer.id': customerId 
    }).lean();

    if (!inquiry) {
      return res.status(404).json({
        success: false,
        message: 'Anfrage nicht gefunden'
      });
    }

    let syncedInquiry = inquiry;
    if (inquiry.convertedOrderId) {
      const linkedOrder = await Order.findById(inquiry.convertedOrderId)
        .select('_id status zahlung versand')
        .lean();
      syncedInquiry = syncInquiryWithLinkedOrder(inquiry, linkedOrder);
    }

    console.log(`✅ Anfrage ${inquiryId} für Kunde ${customerId} gefunden`);

    res.json({
      success: true,
      inquiry: {
        ...syncedInquiry,
        statusLabel: getStatusLabel(syncedInquiry.status),
        statusColor: getStatusColor(syncedInquiry.status),
        canCancel: syncedInquiry.status === 'pending'
      }
    });

  } catch (error) {
    console.error('❌ Fehler beim Abrufen der Anfrage-Details:', error);
    res.status(500).json({
      success: false,
      message: 'Anfrage-Details konnten nicht abgerufen werden'
    });
  }
});

// Hilfsfunktionen für Status-Labels und -Farben
function getStatusLabel(status) {
  switch (status) {
    case 'pending': return 'Ausstehend';
    case 'accepted': return 'Angenommen';
    case 'rejected': return 'Abgelehnt';
    case 'converted_to_order': return 'Zu Bestellung umgewandelt';
    case 'payment_pending': return 'Zahlung ausstehend';
    case 'paid': return 'Bezahlt';
    case 'verpackt': return 'Verpackt';
    case 'verschickt': return 'Verschickt';
    case 'zugestellt': return 'Zugestellt';
    default: return status;
  }
}

function getStatusColor(status) {
  switch (status) {
    case 'pending': return 'warning';
    case 'accepted': return 'success';
    case 'rejected': return 'error';
    case 'converted_to_order': return 'primary';
    case 'payment_pending': return 'info';
    case 'paid': return 'success';
    case 'verpackt': return 'info';
    case 'verschickt': return 'secondary';
    case 'zugestellt': return 'success';
    default: return 'default';
  }
}

// 💳 POST: PayPal-Zahlung für akzeptierte Anfrage erstellen
router.post('/:inquiryId/create-payment', authenticateToken, async (req, res) => {
  try {
    const { inquiryId } = req.params;
    const customerId = req.user.userId || req.user.id || req.user.kundeId;
    
    console.log(`💳 PayPal-Zahlung für Anfrage ${inquiryId} erstellen...`);
    
    // Anfrage finden und Berechtigung prüfen
    const inquiry = await Inquiry.findOne({ 
      inquiryId: inquiryId,
      'customer.id': customerId 
    });

    if (!inquiry) {
      return res.status(404).json({
        success: false,
        message: 'Anfrage nicht gefunden'
      });
    }

    // Prüfen, ob Anfrage angenommen wurde oder Zahlung ausstehend ist
    if (inquiry.status !== 'accepted' && 
        inquiry.status !== 'converted_to_order' && 
        inquiry.status !== 'payment_pending') {
      return res.status(400).json({
        success: false,
        message: 'Zahlung nur für angenommene Anfragen möglich'
      });
    }

    // Prüfen, ob bereits erfolgreich bezahlt (nicht bei "pending" blockieren)
    if (inquiry.payment.status === 'completed') {
      return res.status(400).json({
        success: false,
        message: 'Anfrage wurde bereits bezahlt'
      });
    }

    // PayPal-Order erstellen (verwende bestehende PayPal-Logik)
    
    const orderData = {
      bestellnummer: inquiryId,
      artikel: inquiry.items.map(item => ({
        name: item.name,
        preis: item.price || (inquiry.total / inquiry.items.length), // Fallback wenn item.price fehlt
        menge: item.quantity,
        beschreibung: item.description || ''
      })),
      gesamtbetrag: inquiry.total,
      successUrl: `${process.env.FRONTEND_URL}/inquiry-payment-success?inquiryId=${inquiryId}`,
      cancelUrl: `${process.env.FRONTEND_URL}/inquiry-payment-cancel?inquiryId=${inquiryId}`
    };

    const paypalOrder = await PayPalService.createPayment(orderData);
    
    // Zahlungsstatus in Anfrage aktualisieren
    inquiry.payment.status = 'pending';
    inquiry.payment.paypalOrderId = paypalOrder.id;
    inquiry.payment.amount = inquiry.total;
    inquiry.status = 'payment_pending';
    await inquiry.save();

    console.log(`✅ PayPal-Order ${paypalOrder.id} für Anfrage ${inquiryId} erstellt`);

    res.json({
      success: true,
      paypalOrderId: paypalOrder.id,
      approvalUrl: paypalOrder.approvalUrl || paypalOrder.links?.find(link => link.rel === 'approve')?.href
    });

  } catch (error) {
    console.error('❌ Fehler beim Erstellen der PayPal-Zahlung:', error);
    res.status(500).json({
      success: false,
      message: 'PayPal-Zahlung konnte nicht erstellt werden'
    });
  }
});

// ✅ POST: PayPal-Zahlung für Anfrage abschließen
router.post('/:inquiryId/capture-payment', authenticateToken, async (req, res) => {
  try {
    const { inquiryId } = req.params;
    const { paypalOrderId } = req.body;
    const customerId = req.user.userId || req.user.id || req.user.kundeId;
    
    console.log(`✅ PayPal-Zahlung für Anfrage ${inquiryId} abschließen...`);
    
    // Anfrage finden
    const inquiry = await Inquiry.findOne({ 
      inquiryId: inquiryId,
      'customer.id': customerId 
    });

    if (!inquiry) {
      return res.status(404).json({
        success: false,
        message: 'Anfrage nicht gefunden'
      });
    }

    // PayPal-Order erfassen
    const captureResult = await PayPalService.captureOrder(paypalOrderId);
    
    if (captureResult.status === 'COMPLETED') {
      // Zahlungsstatus aktualisieren
      inquiry.payment.status = 'completed';
      inquiry.payment.paidAt = new Date();
      inquiry.status = 'paid';
      await inquiry.save();

      // Wenn konvertierte Bestellung existiert, auch dort Zahlungsstatus aktualisieren
      if (inquiry.convertedOrderId) {
        const Order = require('../models/Order');
        await Order.updateOne(
          { _id: inquiry.convertedOrderId },
          { 
            'zahlung.status': 'bezahlt',
            'zahlung.bezahltAm': new Date(),
            'zahlung.transaktionId': captureResult.id,
            'zahlung.paypalOrderId': paypalOrderId,
            paymentStatus: 'completed'
          }
        );
      }

      console.log(`✅ Zahlung für Anfrage ${inquiryId} abgeschlossen`);

      res.json({
        success: true,
        message: 'Zahlung erfolgreich abgeschlossen',
        transactionId: captureResult.id
      });
    } else {
      throw new Error('PayPal-Zahlung konnte nicht abgeschlossen werden');
    }

  } catch (error) {
    console.error('❌ Fehler beim Abschließen der PayPal-Zahlung:', error);
    res.status(500).json({
      success: false,
      message: 'Zahlung konnte nicht abgeschlossen werden'
    });
  }
});

// 💳 POST: PayPal-Zahlung für konvertierte Bestellung erstellen
router.post('/:inquiryId/create-order-payment', authenticateToken, async (req, res) => {
  try {
    const { inquiryId } = req.params;
    const customerId = req.user.userId || req.user.id || req.user.kundeId;
    
    console.log(`💳 PayPal-Zahlung für konvertierte Bestellung (Anfrage ${inquiryId}) erstellen...`);
    
    // Anfrage finden und prüfen, ob sie zu einer Bestellung konvertiert wurde
    const inquiry = await Inquiry.findOne({ 
      inquiryId: inquiryId,
      'customer.id': customerId 
    });

    if (!inquiry) {
      return res.status(404).json({
        success: false,
        message: 'Anfrage nicht gefunden'
      });
    }

    // Prüfen, ob Anfrage zu Bestellung konvertiert wurde (oder Zahlung ausstehend)
    if ((inquiry.status !== 'converted_to_order' && 
         inquiry.status !== 'payment_pending') || 
        !inquiry.convertedOrderId) {
      return res.status(400).json({
        success: false,
        message: 'Zahlung nur für konvertierte Bestellungen möglich'
      });
    }

    // Konvertierte Bestellung laden
    const Order = require('../models/Order');
    const order = await Order.findById(inquiry.convertedOrderId);
    
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Konvertierte Bestellung nicht gefunden'
      });
    }

    // Prüfen, ob bereits erfolgreich bezahlt (nicht bei ausstehend blockieren)
    if (order.zahlung.status === 'bezahlt') {
      return res.status(400).json({
        success: false,
        message: 'Bestellung wurde bereits bezahlt'
      });
    }

    // PayPal-Order erstellen für die Bestellung
    
    const orderData = {
      bestellnummer: order.bestellnummer,
      artikel: order.artikel.map(item => ({
        name: item.produktSnapshot.name,
        preis: item.einzelpreis,
        menge: item.menge,
        beschreibung: item.produktSnapshot.beschreibung || ''
      })),
      versandkosten: order.preise.versandkosten || 0,
      gesamt: {
        netto: order.preise.zwischensumme,
        mwst: order.preise.mwst.betrag,
        brutto: order.preise.gesamtsumme
      },
      successUrl: `${process.env.FRONTEND_URL}/inquiry-payment-success?inquiryId=${inquiryId}&orderId=${order._id}`,
      cancelUrl: `${process.env.FRONTEND_URL}/inquiry-payment-cancel?inquiryId=${inquiryId}&orderId=${order._id}`
    };

    const paypalOrder = await PayPalService.createPayment(orderData);
    
    // Zahlungsstatus in Bestellung aktualisieren
    order.zahlung.paypalOrderId = paypalOrder.id;
    order.paymentStatus = 'pending';
    await order.save();
    
    // Auch in Anfrage aktualisieren
    inquiry.payment.status = 'pending';
    inquiry.payment.paypalOrderId = paypalOrder.id;
    inquiry.payment.amount = order.preise.gesamtsumme;
    inquiry.status = 'payment_pending';
    await inquiry.save();

    console.log(`✅ PayPal-Order ${paypalOrder.id} für konvertierte Bestellung ${order.bestellnummer} erstellt`);

    res.json({
      success: true,
      paypalOrderId: paypalOrder.id,
      approvalUrl: paypalOrder.approvalUrl || paypalOrder.links?.find(link => link.rel === 'approve')?.href,
      orderNumber: order.bestellnummer
    });

  } catch (error) {
    console.error('❌ Fehler beim Erstellen der PayPal-Zahlung für Bestellung:', error);
    res.status(500).json({
      success: false,
      message: 'PayPal-Zahlung konnte nicht erstellt werden'
    });
  }
});

// ✅ POST: PayPal-Zahlung für konvertierte Bestellung abschließen
router.post('/:inquiryId/capture-order-payment', authenticateToken, async (req, res) => {
  try {
    const { inquiryId } = req.params;
    const { paypalOrderId } = req.body;
    const customerId = req.user.userId || req.user.id || req.user.kundeId;
    
    console.log(`✅ PayPal-Zahlung für konvertierte Bestellung (Anfrage ${inquiryId}) abschließen...`);
    
    // Anfrage finden
    const inquiry = await Inquiry.findOne({ 
      inquiryId: inquiryId,
      'customer.id': customerId 
    });

    if (!inquiry || !inquiry.convertedOrderId) {
      return res.status(404).json({
        success: false,
        message: 'Anfrage oder konvertierte Bestellung nicht gefunden'
      });
    }

    // Bestellung laden
    const Order = require('../models/Order');
    const order = await Order.findById(inquiry.convertedOrderId);
    
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Konvertierte Bestellung nicht gefunden'
      });
    }

    // PayPal-Order erfassen
    const captureResult = await PayPalService.captureOrder(paypalOrderId);
    
    if (captureResult.status === 'COMPLETED') {
      // Bestellung als bezahlt markieren
      order.zahlung.status = 'bezahlt';
      order.zahlung.bezahltAm = new Date();
      order.zahlung.transaktionsId = captureResult.id;
      order.zahlung.paypalOrderId = paypalOrderId;
      order.paymentStatus = 'completed';
      order.status = 'bestaetigt'; // Bestellung bestätigt, kann bearbeitet werden
      await order.save();

      // Anfrage als bezahlt markieren
      inquiry.payment.status = 'completed';
      inquiry.payment.paidAt = new Date();
      inquiry.status = 'paid';
      await inquiry.save();

      console.log(`✅ Zahlung für konvertierte Bestellung ${order.bestellnummer} abgeschlossen`);

      // ✅ Automatische Rechnungserstellung nach erfolgreicher Zahlung
      try {
        const orderInvoiceService = require('../services/orderInvoiceService');
        console.log('🧾 Automatische Rechnungserstellung für bezahlte konvertierte Bestellung:', order._id);
        const invoiceResult = await orderInvoiceService.generateInvoiceForOrder(order._id);
        
        if (invoiceResult.success) {
          console.log('✅ Rechnung automatisch erstellt für konvertierte Bestellung:', invoiceResult.invoiceNumber);
        } else {
          console.error('❌ Fehler bei automatischer Rechnungserstellung (konvertierte Bestellung):', invoiceResult.error);
          // Zahlung trotzdem erfolgreich, nur Rechnung fehlgeschlagen
        }
      } catch (invoiceError) {
        console.error('❌ Fehler bei automatischer Rechnungserstellung (konvertierte Bestellung):', invoiceError);
        // Zahlung trotzdem erfolgreich, nur Rechnung fehlgeschlagen
      }

      res.json({
        success: true,
        message: 'Zahlung erfolgreich abgeschlossen',
        transactionId: captureResult.id,
        orderNumber: order.bestellnummer
      });
    } else {
      throw new Error('PayPal-Zahlung konnte nicht abgeschlossen werden');
    }

  } catch (error) {
    console.error('❌ Fehler beim Abschließen der PayPal-Zahlung für Bestellung:', error);
    res.status(500).json({
      success: false,
      message: 'Zahlung konnte nicht abgeschlossen werden'
    });
  }
});

module.exports = router;
