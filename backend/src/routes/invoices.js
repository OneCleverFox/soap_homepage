const express = require('express');
const router = express.Router();
const invoiceController = require('../controllers/invoiceController');
const auth = require('../middleware/auth');

// Admin-Authentifizierung für Rechnungsmanagement
router.use(auth.authenticateToken);
router.use(auth.requireAdmin);

// ===== NEUE ROUTEN FÜR ECHTE BESTELLRECHNUNGEN =====

// Rechnung aus echter Bestellung generieren
router.get('/order/:orderId/generate', async (req, res) => {
  try {
    await invoiceController.generateInvoiceFromOrder(req, res);
  } catch (error) {
    console.error('Fehler bei Rechnungsgenerierung:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler bei der Rechnungsgenerierung'
    });
  }
});

// Gespeicherte Rechnung einer Bestellung abrufen
router.get('/order/:orderId/stored', async (req, res) => {
  try {
    await invoiceController.getStoredInvoice(req, res);
  } catch (error) {
    console.error('Fehler beim Abrufen der Rechnung:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Abrufen der Rechnung'
    });
  }
});

// PDF für Invoice-Rechnung generieren
router.get('/:invoiceId/pdf', async (req, res) => {
  try {
    await invoiceController.generateInvoicePDF(req, res);
  } catch (error) {
    console.error('Fehler bei PDF-Generierung:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler bei der PDF-Generierung'
    });
  }
});

// Liste aller Bestellungen mit Rechnungen
router.get('/orders-with-invoices', async (req, res) => {
  try {
    const Order = require('../models/Order');
    const orders = await Order.find({ 
      'invoice.number': { $exists: true } 
    })
    .select('_id invoice.number invoice.generatedAt status kunde')
    .populate('kunde', 'vorname nachname email')
    .sort({ 'invoice.generatedAt': -1 })
    .limit(100);

    res.json({
      success: true,
      data: orders.map(order => ({
        id: order._id,
        invoiceNumber: order.invoice.number,
        generatedAt: order.invoice.generatedAt,
        orderStatus: order.status,
        customer: order.kunde ? {
          name: `${order.kunde.vorname || ''} ${order.kunde.nachname || ''}`.trim(),
          email: order.kunde.email
        } : null
      }))
    });
  } catch (error) {
    console.error('Fehler beim Abrufen der Rechnungsliste:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Abrufen der Rechnungsliste'
    });
  }
});

module.exports = router;