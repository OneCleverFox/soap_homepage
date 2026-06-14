/**
 * Invoice Currency Converter API
 * Endpoints zum Konvertieren von Dollar-Rechnungen in Euro
 */

const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const {
  processPDF,
  extractMoneyAmounts,
  convertToEuro
} = require('../scripts/convertInvoiceCurrency');

const router = express.Router();

// Multer-Konfiguration für PDF-Upload
const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      const uploadDir = path.join(__dirname, '../uploads/invoices');
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }
      cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      cb(null, 'invoice-' + uniqueSuffix + '.pdf');
    }
  }),
  fileFilter: (req, file, cb) => {
    if (file.mimetype !== 'application/pdf') {
      return cb(new Error('Nur PDF-Dateien erlaubt'), false);
    }
    cb(null, true);
  },
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB
  }
});

/**
 * POST /api/convert-invoice
 * Lädt eine PDF-Rechnung hoch und konvertiert Dollar in Euro
 */
router.post('/convert-invoice', upload.single('invoice'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        error: 'Keine Datei hochgeladen',
        success: false
      });
    }

    const exchangeRate = req.body.exchangeRate || 0.92;
    const filePath = req.file.path;

    // Verarbeite PDF
    const result = await processPDF(filePath, parseFloat(exchangeRate));

    res.json({
      success: true,
      data: result,
      message: 'Rechnung erfolgreich konvertiert'
    });

    // Cleanup - lösche hochgeladene Datei nach Verarbeitung
    setTimeout(() => {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }, 1000);

  } catch (error) {
    console.error('Fehler beim Konvertieren der Rechnung:', error);
    res.status(500).json({
      error: error.message,
      success: false
    });
  }
});

/**
 * POST /api/convert-amount
 * Konvertiert einfach einen Dollar-Betrag in Euro
 * Body: { usdAmount: 100.50, exchangeRate: 0.92 }
 */
router.post('/convert-amount', (req, res) => {
  try {
    const { usdAmount, exchangeRate = 0.92 } = req.body;

    if (!usdAmount || isNaN(usdAmount)) {
      return res.status(400).json({
        error: 'USD-Betrag erforderlich und muss eine Zahl sein',
        success: false
      });
    }

    const eurAmount = convertToEuro(usdAmount, exchangeRate);

    res.json({
      success: true,
      data: {
        usd: parseFloat(usdAmount),
        eur: parseFloat(eurAmount),
        exchangeRate: exchangeRate,
        convertedAt: new Date().toISOString()
      }
    });
  } catch (error) {
    res.status(500).json({
      error: error.message,
      success: false
    });
  }
});

/**
 * GET /api/exchange-rate
 * Gibt den aktuellen Wechselkurs USD->EUR zurück
 */
router.get('/exchange-rate', async (req, res) => {
  try {
    // Für Production könnten Sie hier eine externe API aufrufen
    // z.B. https://api.exchangerate-api.com/v4/latest/USD
    const rate = 0.92; // Fallback-Wert
    
    res.json({
      success: true,
      data: {
        from: 'USD',
        to: 'EUR',
        rate: rate,
        date: new Date().toISOString()
      }
    });
  } catch (error) {
    res.status(500).json({
      error: error.message,
      success: false
    });
  }
});

module.exports = router;
