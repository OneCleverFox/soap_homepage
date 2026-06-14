/**
 * INTEGRATIONSANLEITUNG: Invoice Currency Converter
 * 
 * So integrierst du das Currency Converter System in deinen Server
 */

// ============================================================================
// SCHRITT 1: Route in src/server.js registrieren
// ============================================================================

// Füge diese Zeilen in server.js hinzu (nach den anderen Route-Registrierungen):

/*
// Currency Converter Routes
const invoiceCurrencyRouter = require('./routes/invoiceCurrencyConverter');
app.use('/api', invoiceCurrencyRouter);
*/

// Beispiel mit vollständigem Kontext:
/*
const express = require('express');
const app = express();

// ... andere Middleware ...

// Currency Converter
const invoiceCurrencyRouter = require('./routes/invoiceCurrencyConverter');
app.use('/api', invoiceCurrencyRouter);

// ... weitere Routes ...

app.listen(3000, () => {
  console.log('Server läuft auf Port 3000');
});
*/

// ============================================================================
// SCHRITT 2: Package-Script hinzufügen (optional)
// ============================================================================

// In backend/package.json im "scripts" Objekt:
/*
{
  "scripts": {
    "convert-invoice": "node scripts/convertInvoiceCurrency.js",
    "test-converter": "node scripts/testCurrencyConverter.js"
  }
}
*/

// Dann kannst du ausführen:
// npm run convert-invoice invoice.pdf 0.92
// npm run test-converter

// ============================================================================
// SCHRITT 3: Frontend Integration
// ============================================================================

// In einer React-Komponente (z.B. Admin-Panel):

/*
import InvoiceConverter from '../components/InvoiceConverter';

function AdminPanel() {
  return (
    <div>
      <h1>Admin Dashboard</h1>
      <InvoiceConverter />
    </div>
  );
}

export default AdminPanel;
*/

// ============================================================================
// SCHRITT 4: Programmatische Nutzung in anderen Scripts
// ============================================================================

// In einem anderen Script (z.B. payment-processing.js):

/*
const { processPDF, convertToEuro } = require('../scripts/convertInvoiceCurrency');

async function processInvoicePayment(invoicePath, exchangeRate = 0.92) {
  try {
    const result = await processPDF(invoicePath, exchangeRate);
    console.log('Rechnung konvertiert:', result.totals.totalEUR, 'EUR');
    return result;
  } catch (error) {
    console.error('Fehler:', error);
  }
}
*/

// ============================================================================
// SCHRITT 5: Datenbank-Integration (optional)
// ============================================================================

// Mongoose Schema für konvertierte Rechnungen:

/*
const mongoose = require('mongoose');

const invoiceConversionSchema = new mongoose.Schema({
  originalFile: String,
  invoiceNumber: String,
  amounts: [{
    usd: Number,
    eur: Number
  }],
  totals: {
    totalUSD: Number,
    totalEUR: Number
  },
  exchangeRate: Number,
  processedAt: { type: Date, default: Date.now },
  processedBy: String // userId
});

module.exports = mongoose.model('InvoiceConversion', invoiceConversionSchema);

// In der API-Route:
const InvoiceConversion = require('../models/InvoiceConversion');

router.post('/convert-invoice', upload.single('invoice'), async (req, res) => {
  try {
    // ... PDF verarbeiten ...
    
    // Speichere in Datenbank
    const conversion = new InvoiceConversion({
      ...result,
      processedBy: req.user?._id
    });
    await conversion.save();
    
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
*/

// ============================================================================
// SCHRITT 6: Error Handling verbessernd
// ============================================================================

// In der invoiceCurrencyConverter.js Route:

/*
router.post('/convert-invoice', upload.single('invoice'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'Keine Datei hochgeladen'
      });
    }

    const { exchangeRate = 0.92 } = req.body;

    // Validierung
    if (isNaN(exchangeRate) || exchangeRate <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Ungültiger Wechselkurs'
      });
    }

    const result = await processPDF(req.file.path, parseFloat(exchangeRate));

    // Cleanup
    fs.unlinkSync(req.file.path);

    res.json({
      success: true,
      data: result,
      message: 'Rechnung erfolgreich konvertiert'
    });

  } catch (error) {
    console.error('Konvertierungsfehler:', error);
    
    // Cleanup im Fehlerfall
    if (req.file?.path && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }

    res.status(500).json({
      success: false,
      error: error.message || 'Fehler beim Konvertieren'
    });
  }
});
*/

// ============================================================================
// SCHRITT 7: Tests schreiben
// ============================================================================

/*
const request = require('supertest');
const app = require('../src/server');

describe('Invoice Currency Converter', () => {
  test('POST /api/convert-amount konvertiert USD zu EUR', async () => {
    const response = await request(app)
      .post('/api/convert-amount')
      .send({
        usdAmount: 100,
        exchangeRate: 0.92
      });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.eur).toBe(92);
  });

  test('GET /api/exchange-rate gibt Wechselkurs zurück', async () => {
    const response = await request(app)
      .get('/api/exchange-rate');

    expect(response.status).toBe(200);
    expect(response.body.data.rate).toBeDefined();
  });
});
*/

// ============================================================================
// SCHRITT 8: Logging hinzufügen
// ============================================================================

/*
const winston = require('winston');

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [
    new winston.transports.File({ filename: 'logs/invoice-converter.log' })
  ]
});

// In der Route:
router.post('/convert-invoice', async (req, res) => {
  try {
    logger.info('Invoice conversion started', {
      file: req.file?.filename,
      rate: req.body.exchangeRate
    });
    
    // ... Verarbeitung ...
    
    logger.info('Invoice conversion completed', {
      file: req.file?.filename,
      totalEUR: result.totals.totalEUR
    });
    
    res.json({ success: true, data: result });
  } catch (error) {
    logger.error('Invoice conversion failed', { error: error.message });
    res.status(500).json({ error: error.message });
  }
});
*/

// ============================================================================
// SCHRITT 9: Admin-Seite erstellen
// ============================================================================

/*
// In frontend/src/pages/AdminInvoiceConverter.js:

import React from 'react';
import InvoiceConverter from '../components/InvoiceConverter';

function AdminInvoiceConverter() {
  return (
    <div className="admin-page">
      <h1>🧾 Rechnungsverwaltung</h1>
      <div className="admin-content">
        <InvoiceConverter />
        {/* Weitere Admin-Features */}
      </div>
    </div>
  );
}

export default AdminInvoiceConverter;
*/

// ============================================================================
// SCHRITT 10: Checkliste für vollständige Integration
// ============================================================================

/*
INTEGRATIONS-CHECKLISTE:

Backend:
☐ Route in server.js registriert
☐ Multer-Upload-Verzeichnis erstellt
☐ Error-Handling implementiert
☐ Logging eingerichtet
☐ Rate-Limiting geprüft (optional)
☐ Datenbank-Speicherung eingebaut (optional)

Frontend:
☐ InvoiceConverter-Komponente importiert
☐ CSS eingebunden
☐ Axios konfiguriert
☐ Error-Handling gezeigt
☐ Loading-States angezeigt

Testing:
☐ Manual Upload-Test durchgeführt
☐ CLI-Script getestet
☐ API-Endpoints getestet
☐ Frontend-Komponente getestet

Production:
☐ Wechselkurs-Update-Strategie festgelegt
☐ File-Size-Limits gesetzt
☐ Temp-File-Cleanup konfiguriert
☐ Monitoring eingerichtet
☐ Backup-Strategie geplant
*/

// ============================================================================
// BEFEHLSREFERENZ
// ============================================================================

// CLI-Befehle:
// node backend/scripts/convertInvoiceCurrency.js invoice.pdf
// node backend/scripts/convertInvoiceCurrency.js invoice.pdf 0.95
// npm run test-converter

// API-Befehle:
// curl -F "invoice=@invoice.pdf" http://localhost:3000/api/convert-invoice
// curl -X POST -H "Content-Type: application/json" \
//   -d '{"usdAmount":100,"exchangeRate":0.92}' \
//   http://localhost:3000/api/convert-amount
// curl http://localhost:3000/api/exchange-rate

module.exports = {};
