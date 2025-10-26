const express = require('express');
const router = express.Router();
const Inquiry = require('../models/Inquiry');
const Order = require('../models/Order');
const { auth, authenticateToken } = require('../middleware/auth');
const PayPalService = require('../services/PayPalService');

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

// 📊 GET: Admin-Statistiken
router.get('/admin/stats', auth, requireAdmin, async (req, res) => {
  try {
    console.log('🔍 Anfrage stats für Admin abrufen...');
    
    const totalInquiries = await Inquiry.countDocuments();
    const pendingInquiries = await Inquiry.countDocuments({ status: 'pending' });
    const acceptedInquiries = await Inquiry.countDocuments({ status: 'accepted' });
    const rejectedInquiries = await Inquiry.countDocuments({ status: 'rejected' });
    const convertedInquiries = await Inquiry.countDocuments({ status: 'converted_to_order' });
    
    res.json({
      success: true,
      data: {
        total: totalInquiries || 0,
        pending: pendingInquiries || 0,
        accepted: acceptedInquiries || 0,
        rejected: rejectedInquiries || 0,
        converted: convertedInquiries || 0
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
router.put('/admin/:inquiryId/accept', auth, async (req, res) => {
  try {
    const { inquiryId } = req.params;
    const { message } = req.body;
    
    console.log(`✅ Anfrage ${inquiryId} annehmen...`);
    
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
    
    // Status ändern zu "accepted" - KEINE automatische Bestellung!
    // Kunde muss erst bezahlen, bevor es eine Bestellung wird
    inquiry.status = 'accepted';
    inquiry.acceptedAt = new Date();
    
    await inquiry.save();
    
    console.log(`✅ Anfrage ${inquiryId} wurde angenommen - Kunde muss noch bezahlen`);
    
    res.json({
      success: true,
      message: 'Anfrage wurde angenommen. Kunde wird über Zahlungsmöglichkeit informiert.',
      inquiry: {
        ...inquiry.toObject(),
        statusLabel: 'Angenommen - Warten auf Zahlung',
        statusColor: 'warning'
      }
    });
    
  } catch (error) {
    console.error('Fehler beim Annehmen der Anfrage:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Annehmen der Anfrage'
    });
  }
});
      const Customer = require('../models/Kunde');
      const customer = await Customer.findById(inquiry.customer.id);
      if (!customer) {
        throw new Error('Kunde nicht gefunden');
      }
      
      // Debug: Prüfe lieferadresse-Wert
      console.log('🔍 Debug inquiry.lieferadresse:', inquiry.lieferadresse);
      console.log('🔍 Debug typeof:', typeof inquiry.lieferadresse);
      
      // Sichere Lieferadresse-Behandlung
      let lieferadresse;
      if (inquiry.lieferadresse && 
          typeof inquiry.lieferadresse === 'object' && 
          inquiry.lieferadresse !== null &&
          inquiry.lieferadresse.strasse) { // Prüfe, ob es echte Daten enthält
        lieferadresse = inquiry.lieferadresse;
      } else {
        lieferadresse = {
          verwendeRechnungsadresse: true,
          firma: '',
          strasse: '',
          hausnummer: '',
          zusatz: '',
          plz: '',
          stadt: '',
          land: 'Deutschland'
        };
      }
      
      console.log('🔍 Debug final lieferadresse:', lieferadresse);
      
      // Hole produktType für alle Items aus der Datenbank
      const Product = require('../models/Product');
      const Rohseife = require('../models/Rohseife');
      const Duftoil = require('../models/Duftoil');
      const Verpackung = require('../models/Verpackung');
      
      const artikelWithProductType = await Promise.all(
        inquiry.items.map(async (item) => {
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
            productId: item.productId,
            produktType: produktType,
            produktSnapshot: {
              name: item.name,
              bild: item.image
            },
            menge: item.quantity,
            einzelpreis: item.price,
            gesamtpreis: item.quantity * item.price
          };
        })
      );
      
      const order = new Order({
        orderId,
        bestellnummer: orderId, // Für Frontend-Kompatibilität
        // Kunde als ObjectId
        kunde: inquiry.customer.id,
        // Items von Anfrage-Format zu Bestellungs-Format konvertieren mit produktType
        artikel: artikelWithProductType,
        rechnungsadresse: inquiry.rechnungsadresse,
        lieferadresse: lieferadresse,
        // Preise korrekt strukturiert
        preise: {
          zwischensumme: inquiry.total,
          versandkosten: 0,
          mwst: {
            satz: 19,
            betrag: inquiry.total * 0.19 / 1.19
          },
          rabatt: {
            betrag: 0,
            code: '',
            grund: '',
            prozent: 0
          },
          gesamtsumme: inquiry.total
        },
        // Zahlungsinformationen
        zahlung: {
          methode: 'paypal', // Standard für Anfragen
          status: 'ausstehend', // Korrekte Enum-Werte verwenden
          transaktionId: '',
          paypalOrderId: '',
          bezahltAm: null,
          betrag: inquiry.total
        },
        // Besteller-Informationen
        besteller: {
          vorname: customer.vorname || customer.name?.split(' ')[0] || '',
          nachname: customer.nachname || customer.name?.split(' ')[1] || customer.name || '',
          email: customer.email,
          telefon: customer.telefon || '',
          kundennummer: customer.kundennummer // Wichtig für "Meine Bestellungen" API
        },
        status: 'neu', // Status 'neu' damit sie in "zu bearbeiten" erscheint
        paymentStatus: 'pending',
        source: 'inquiry',
        sourceInquiryId: inquiry.inquiryId,
        customerNote: inquiry.customerNote
      });
      
      await order.save();
      
      inquiry.status = 'converted_to_order';
      inquiry.convertedOrderId = order._id;
      
      console.log(`✅ Anfrage ${inquiryId} in Bestellung ${order._id} konvertiert`);
    } else {
      inquiry.status = 'accepted';
    }
    
    await inquiry.save();
    
    res.json({
      success: true,
      message: convertToOrder ? 'Anfrage angenommen und in Bestellung konvertiert' : 'Anfrage angenommen',
      inquiry,
      ...(convertToOrder && { orderId: inquiry.convertedOrderId })
    });
    
  } catch (error) {
    console.error('❌ Fehler beim Annehmen der Anfrage:', error);
    res.status(500).json({
      success: false,
      message: 'Anfrage konnte nicht angenommen werden'
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
router.get('/admin/stats', auth, async (req, res) => {
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

    console.log(`✅ ${inquiries.length} Anfragen für Kunde ${customerId} gefunden`);

    res.json({
      success: true,
      inquiries: inquiries.map(inquiry => ({
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

    console.log(`✅ Anfrage ${inquiryId} für Kunde ${customerId} gefunden`);

    res.json({
      success: true,
      inquiry: {
        ...inquiry,
        statusLabel: getStatusLabel(inquiry.status),
        statusColor: getStatusColor(inquiry.status),
        canCancel: inquiry.status === 'pending'
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

    // Prüfen, ob Anfrage angenommen wurde
    if (inquiry.status !== 'accepted' && inquiry.status !== 'converted_to_order') {
      return res.status(400).json({
        success: false,
        message: 'Zahlung nur für angenommene Anfragen möglich'
      });
    }

    // Prüfen, ob bereits bezahlt
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
          { orderId: inquiry.convertedOrderId },
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

    // Prüfen, ob Anfrage zu Bestellung konvertiert wurde
    if (inquiry.status !== 'converted_to_order' || !inquiry.convertedOrderId) {
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

    // Prüfen, ob bereits bezahlt
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