const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Widerruf = require('../models/Widerruf');
const Order = require('../models/Order');
const { authenticateToken } = require('../middleware/auth');
const { getEligibleOrders } = require('../services/widerrufService');
const emailService = require('../services/emailService');
const WiderrufPDFService = require('../services/widerrufPDFService');
const InvoiceTemplate = require('../models/InvoiceTemplate');
const rateLimit = require('express-rate-limit');

// Eigenes Rate-Limit für Widerruf-Submit (schützt vor Missbrauch)
const widerrufLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 Stunde
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => process.env.NODE_ENV !== 'production',
  message: { success: false, message: 'Zu viele Widerrufe von dieser IP. Bitte versuchen Sie es später erneut.' }
});

/**
 * GET /api/widerruf/eligible-orders
 * Gibt widerrufbare Bestellungen des eingeloggten Kunden zurück.
 * Authentifizierung optional: ohne Login leeres Array.
 */
router.get('/eligible-orders', authenticateToken, async (req, res) => {
  try {
    const userId = req.user?.id || req.user?._id;
    if (!userId) {
      return res.json({ success: true, data: [] });
    }

    const orders = await Order.find({
      $or: [
        { 'besteller.email': req.user.email },
        { kunde: userId }
      ]
    })
      .select('bestellnummer orderNumber besteller createdAt status versand preise artikel')
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();

    const eligible = getEligibleOrders(orders);

    res.json({ success: true, data: eligible });
  } catch (error) {
    console.error('❌ [Widerruf] Fehler bei eligible-orders:', error);
    res.status(500).json({ success: false, message: 'Fehler beim Laden der Bestellungen' });
  }
});

/**
 * POST /api/widerruf/submit
 * Übermittelt einen Widerruf.
 * Funktioniert für eingeloggte und nicht-eingeloggte Kunden.
 */
router.post('/submit', widerrufLimiter, async (req, res) => {
  try {
    // Optionalen Auth-Token lesen ohne zu blocken
    let userId = null;
    const authHeader = req.headers.authorization;
    if (authHeader?.startsWith('Bearer ')) {
      try {
        const jwt = require('jsonwebtoken');
        const decoded = jwt.verify(authHeader.replace('Bearer ', ''), process.env.JWT_SECRET);
        userId = decoded.id || decoded._id || null;
      } catch (_) {
        // kein gültiger Token – Gast-Widerruf
      }
    }

    const {
      customerName,
      customerEmail,
      customerAddress,
      orderNumber,
      contractRef,
      orderId,
      itemsScope,
      statementText,
      consentAck
    } = req.body;

    // --- Validierung ---
    const errors = [];
    if (!customerName?.trim()) errors.push('Name ist erforderlich');
    if (!customerEmail?.trim() || !/^\S+@\S+\.\S+$/.test(customerEmail.trim())) {
      errors.push('Gültige E-Mail ist erforderlich');
    }
    if (!orderNumber?.trim() && !contractRef?.trim()) {
      errors.push('Bestellnummer oder Vertrags-ID ist erforderlich');
    }
    if (!consentAck) {
      errors.push('Bitte bestätigen Sie die Datenschutzhinweise');
    }

    if (errors.length > 0) {
      return res.status(400).json({ success: false, message: errors.join('; '), errors });
    }

    // Ordnungsgemäße orderId finden (wenn angegeben)
    let resolvedOrderId = null;
    if (orderId && mongoose.Types.ObjectId.isValid(orderId)) {
      resolvedOrderId = new mongoose.Types.ObjectId(orderId);
    } else if (orderNumber?.trim()) {
      const foundOrder = await Order.findOne({ bestellnummer: orderNumber.trim() })
        .select('_id')
        .lean();
      resolvedOrderId = foundOrder?._id || null;
    }

    // Widerruf speichern
    const widerruf = new Widerruf({
      channel: 'online',
      customerId: userId,
      customerName: customerName.trim(),
      customerEmail: customerEmail.trim().toLowerCase(),
      customerAddress: customerAddress?.trim() || '',
      orderNumber: orderNumber?.trim() || '',
      contractRef: contractRef?.trim() || '',
      orderId: resolvedOrderId,
      itemsScope: itemsScope || 'whole_order',
      statementText: statementText?.trim() || '',
      consentAck: true,
      status: 'received',
      rawPayload: req.body
    });

    await widerruf.save();

    // Bestätigungs-E-Mail senden
    let confirmationSent = false;
    try {
      await emailService.sendWiderrufBestaetigung(widerruf);
      widerruf.confirmationSentAt = new Date();
      widerruf.status = 'confirmed';
      await widerruf.save();
      confirmationSent = true;
    } catch (mailErr) {
      console.error('❌ [Widerruf] Bestätigungs-E-Mail fehlgeschlagen:', mailErr.message);
    }

    res.status(201).json({
      success: true,
      message: 'Ihr Widerruf wurde erfolgreich eingereicht.',
      widerrufId: widerruf._id,
      confirmationSent,
      createdAt: widerruf.createdAt
    });
  } catch (error) {
    console.error('❌ [Widerruf] Fehler beim Submit:', error);
    res.status(500).json({ success: false, message: 'Widerruf konnte nicht gespeichert werden. Bitte versuchen Sie es erneut.' });
  }
});

/**
 * GET /api/widerruf/formular.pdf
 * Liefert das vorausgefüllte Widerrufsformular als PDF.
 * Optional: ?customerFirstName=John&customerLastName=Doe zum Vorausfüllen von Kundendaten
 */
router.get('/formular.pdf', async (req, res) => {
  try {
    const { customerFirstName, customerLastName } = req.query;
    const customerName = [customerFirstName, customerLastName].filter(Boolean).join(' ') || '';

    const template = await InvoiceTemplate.findOne({ isDefault: true }).lean()
      || await InvoiceTemplate.findOne().sort({ createdAt: -1 }).lean();

    const companyInfo = template?.companyInfo || {};
    const pdfBuffer = await WiderrufPDFService.generateFormularPDF(companyInfo, customerName);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="widerrufsformular.pdf"');
    res.setHeader('Content-Length', pdfBuffer.length);
    res.end(pdfBuffer);
  } catch (error) {
    console.error('❌ [Widerruf] PDF-Generierung fehlgeschlagen:', error);
    res.status(500).json({ success: false, message: 'PDF konnte nicht erstellt werden' });
  }
});

// ============================================================
// Admin-Endpunkte (nur für Admins zugänglich)
// ============================================================

const { auth: adminAuth } = require('../middleware/auth');

/**
 * GET /api/widerruf/admin/list
 * Alle Widerrufe auflisten (paginiert).
 */
router.get('/admin/list', adminAuth, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = Math.min(parseInt(req.query.limit) || 20, 100);
    const skip = (page - 1) * limit;
    const statusFilter = req.query.status;

    const filter = {};
    if (statusFilter) filter.status = statusFilter;

    const [widerrufe, total] = await Promise.all([
      Widerruf.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      Widerruf.countDocuments(filter)
    ]);

    res.json({
      success: true,
      data: widerrufe,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * PATCH /api/widerruf/admin/:id/status
 * Status eines Widerrufs aktualisieren.
 */
router.patch('/admin/:id/status', adminAuth, async (req, res) => {
  try {
    const { status, adminNote } = req.body;
    const allowed = ['received', 'confirmed', 'processed', 'rejected'];
    if (!allowed.includes(status)) {
      return res.status(400).json({ success: false, message: 'Ungültiger Status' });
    }

    const widerruf = await Widerruf.findByIdAndUpdate(
      req.params.id,
      { status, ...(adminNote !== undefined ? { adminNote } : {}) },
      { new: true }
    );

    if (!widerruf) return res.status(404).json({ success: false, message: 'Widerruf nicht gefunden' });
    res.json({ success: true, data: widerruf });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * POST /api/widerruf/admin/manual
 * Postalischen Widerruf manuell erfassen.
 */
router.post('/admin/manual', adminAuth, async (req, res) => {
  try {
    const {
      customerName, customerEmail, customerAddress,
      orderNumber, contractRef, statementText, adminNote
    } = req.body;

    if (!customerName?.trim()) {
      return res.status(400).json({ success: false, message: 'Name ist erforderlich' });
    }

    const widerruf = new Widerruf({
      channel: 'postal',
      customerName: customerName.trim(),
      customerEmail: (customerEmail || '').trim().toLowerCase(),
      customerAddress: (customerAddress || '').trim(),
      orderNumber: (orderNumber || '').trim(),
      contractRef: (contractRef || '').trim(),
      statementText: (statementText || '').trim(),
      adminNote: (adminNote || '').trim(),
      consentAck: true,
      status: 'received',
      rawPayload: req.body
    });

    await widerruf.save();
    res.status(201).json({ success: true, data: widerruf });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
