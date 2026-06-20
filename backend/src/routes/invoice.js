const express = require('express');
const router = express.Router();
const invoiceController = require('../controllers/invoiceController');
const auth = require('../middleware/auth');
const emailService = require('../services/emailService');

// Alle Routen benötigen Admin-Authentifizierung (außer öffentliche Designer-Routen)
router.use((req, res, next) => {
  // Öffentliche Routen für Designer-Tool
  const publicRoutes = [
    { path: '/preview', method: 'POST' },
    { path: '/sample-data', method: 'GET' },
    { path: '/variables', method: 'GET' },
    { path: '/company-info', method: 'GET' }
  ];
  
  const isPublicRoute = publicRoutes.some(route => 
    req.path === route.path && req.method === route.method
  );
  
  if (isPublicRoute) {
    return next();
  }
  
  // Alle anderen Routen benötigen Authentifizierung
  auth.authenticateToken(req, res, () => {
    auth.requireAdmin(req, res, next);
  });
});

// Template-Verwaltung
router.get('/templates', (req, res) => invoiceController.getAllTemplates(req, res));
router.get('/templates/default', (req, res) => invoiceController.getDefaultTemplate(req, res));
router.post('/templates', (req, res) => invoiceController.createTemplate(req, res));
router.put('/templates/:id', (req, res) => invoiceController.updateTemplate(req, res));
router.put('/templates/:id/set-default', (req, res) => invoiceController.setDefaultTemplate(req, res));
router.delete('/templates/:id', (req, res) => invoiceController.deleteTemplate(req, res));

// Vorschau und Variablen (öffentlich für Designer-Tool)
router.post('/preview', (req, res) => invoiceController.generatePreview(req, res));
router.get('/variables', (req, res) => invoiceController.getAvailableVariables(req, res));
router.get('/company-info', (req, res) => invoiceController.getCompanyInfo(req, res));

// 🎨 Neue Designer-spezifische Routen
router.get('/sample-data', (req, res) => {
  const sampleData = {
    company: {
      name: 'Glücksmomente Manufaktur',
      address: {
        street: 'Musterstraße 123',
        postalCode: '12345',
        city: 'Musterstadt',
        country: 'Deutschland'
      },
      contact: {
        phone: '+49 123 456789',
        email: 'info.gluecksmomente.manufaktur@gmail.com',
        website: 'www.gluecksmomente-manufaktur.de'
      },
      taxInfo: {
        taxNumber: 'Steuernummer: 123/456/78910',
        vatId: 'USt-IdNr.: DE123456789',
        ceo: 'Max Mustermann',
        registrationCourt: 'Amtsgericht Musterstadt',
        registrationNumber: 'HRB 123456'
      },
      bankDetails: {
        bankName: 'Musterbank',
        iban: 'DE89 3704 0044 0532 0130 00',
        bic: 'COBADEFF'
      }
    },
    customer: {
      name: 'Max Mustermann',
      email: 'max@example.com',
      address: {
        street: 'Beispielstraße 456',
        postalCode: '98765',
        city: 'Beispielstadt',
        country: 'Deutschland'
      },
      customerNumber: 'KD-2025-001'
    },
    order: {
      number: 'ORD-2025-001',
      date: new Date().toLocaleDateString('de-DE'),
      products: [
        {
          name: 'Lavendel Handseife',
          description: 'Natürliche Handseife mit Lavendelduft, 100g',
          quantity: 2,
          unitPrice: 8.99,
          vatRate: 19,
          total: 17.98
        }
      ],
      netTotal: 26.03,
      vatTotal: 4.94,
      shipping: { cost: 5.99 },
      grandTotal: 35.96
    },
    invoice: {
      number: 'RE-2025-001',
      date: new Date().toLocaleDateString('de-DE'),
      dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toLocaleDateString('de-DE'),
      paymentTerms: 'Zahlbar innerhalb 14 Tagen ohne Abzug.',
      deliveryDate: new Date().toLocaleDateString('de-DE'),
      performanceDate: new Date().toLocaleDateString('de-DE'),
      legalNotice: 'Gerichtsstand ist Musterstadt. Es gilt deutsches Recht.'
    },
    legal: {
      isSmallBusiness: true,
      vatExemptionNote: 'Gemäß §19 UStG wird keine Umsatzsteuer ausgewiesen.'
    }
  };

  res.json({
    success: true,
    data: sampleData
  });
});

// E-Mail-Test-Funktionen
const createTestEmailMeta = (type) => ({
  isTest: true,
  type,
  timestamp: new Date().toISOString()
});

router.post('/test-email/verification', async (req, res) => {
  try {
    const { email } = req.body;
    const targetEmail = email || req.user.email;
    const result = await emailService.sendVerificationEmail(
      targetEmail,
      'test-token-123',
      req.user.name || 'Test User',
      createTestEmailMeta('verification')
    );

    if (!result?.success) {
      throw new Error(result?.error || 'Versand fehlgeschlagen');
    }
    
    console.log('✅ [Admin] E-Mail-Verifizierungs-Test gesendet:', {
      to: targetEmail,
      success: result.success,
      messageId: result.messageId
    });
    
    res.json({ 
      success: true, 
      message: `Test-E-Mail erfolgreich an ${targetEmail} gesendet`, 
      data: result 
    });
  } catch (error) {
    console.error('❌ [Admin] E-Mail-Test fehlgeschlagen:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Fehler beim E-Mail-Versand', 
      error: error.message 
    });
  }
});

router.post('/test-email/welcome', async (req, res) => {
  try {
    const { email } = req.body;
    const targetEmail = email || req.user.email;
    const result = await emailService.sendWelcomeEmail(
      targetEmail,
      req.user.name || 'Test User',
      createTestEmailMeta('welcome')
    );

    if (!result?.success) {
      throw new Error(result?.error || 'Versand fehlgeschlagen');
    }
    
    console.log('✅ [Admin] Willkommens-E-Mail-Test gesendet:', {
      to: targetEmail,
      success: result.success,
      messageId: result.messageId
    });
    
    res.json({ 
      success: true, 
      message: `Willkommens-E-Mail erfolgreich an ${targetEmail} gesendet`, 
      data: result 
    });
  } catch (error) {
    console.error('❌ [Admin] E-Mail-Test fehlgeschlagen:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Fehler beim E-Mail-Versand', 
      error: error.message 
    });
  }
});

router.post('/test-email/password-reset', async (req, res) => {
  try {
    const { email } = req.body;
    const targetEmail = email || req.user.email;
    const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=test-token-123`;
    const result = await emailService.sendPasswordResetEmail(
      targetEmail,
      resetUrl,
      req.user.name || 'Test User',
      null,
      null,
      createTestEmailMeta('password-reset')
    );

    if (!result?.success) {
      throw new Error(result?.error || 'Versand fehlgeschlagen');
    }
    
    console.log('✅ [Admin] Passwort-Reset-Test gesendet:', {
      to: targetEmail,
      success: result.success,
      messageId: result.messageId
    });
    
    res.json({ 
      success: true, 
      message: `Passwort-Reset-E-Mail erfolgreich an ${targetEmail} gesendet`, 
      data: result 
    });
  } catch (error) {
    console.error('❌ [Admin] E-Mail-Test fehlgeschlagen:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Fehler beim E-Mail-Versand', 
      error: error.message 
    });
  }
});

router.post('/test-email/order-confirmation', async (req, res) => {
  try {
    const { email } = req.body;
    const targetEmail = email || req.user.email;
    const mockOrder = {
      _id: 'test-order-123',
      bestellnummer: 'TEST-2024-001',
      erstelltAm: new Date(),
      besteller: {
        vorname: 'Test',
        nachname: 'Kunde',
        email: targetEmail
      },
      artikel: [
        {
          name: 'Lavendel Seife (TEST)',
          menge: 2,
          einzelpreis: 12.50,
          gesamtpreis: 25.00
        }
      ],
      preise: {
        gesamtsumme: 25.00
      },
      gesamtpreis: 25.00,
      createdAt: new Date(),
      userId: req.user._id || null,
      kundeId: null
    };
    
    const result = await emailService.sendOrderConfirmationEmail(
      mockOrder,
      createTestEmailMeta('order-confirmation')
    );

    if (!result?.success) {
      throw new Error(result?.error || 'Versand fehlgeschlagen');
    }
    
    console.log('✅ [Admin] Bestellbestätigungs-Test gesendet:', {
      to: targetEmail,
      orderNumber: mockOrder.bestellnummer,
      success: result.success,
      messageId: result.messageId
    });
    
    res.json({ 
      success: true, 
      message: `Bestellbestätigungs-E-Mail erfolgreich an ${targetEmail} gesendet`, 
      data: result 
    });
  } catch (error) {
    console.error('❌ [Admin] E-Mail-Test fehlgeschlagen:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Fehler beim E-Mail-Versand', 
      error: error.message 
    });
  }
});

router.post('/test-email/admin-notification', async (req, res) => {
  try {
    const mockOrder = {
      bestellung: {
        _id: 'test-order-admin-001',
        bestellnummer: 'TEST-2024-001',
        bestelldatum: new Date(),
        kontakt: {
          email: 'test@example.com'
        },
        artikel: [
          {
            name: 'Test Produkt (ADMIN)',
            menge: 1,
            preis: 15.00
          }
        ]
      },
      kundenname: 'Test Kunde',
      gesamtbetrag: 15.00
    };
    
    const result = await emailService.sendAdminOrderNotification(
      mockOrder,
      undefined,
      createTestEmailMeta('admin-notification')
    );

    if (!result?.success) {
      throw new Error(result?.error || 'Versand fehlgeschlagen');
    }
    
    console.log('✅ [Admin] Admin-Benachrichtigungs-Test gesendet:', {
      orderNumber: mockOrder.bestellnummer,
      success: result.success,
      messageId: result.messageId
    });
    
    res.json({ 
      success: true, 
      message: 'Admin-Benachrichtigung erfolgreich gesendet', 
      data: result 
    });
  } catch (error) {
    console.error('❌ [Admin] E-Mail-Test fehlgeschlagen:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Fehler beim E-Mail-Versand', 
      error: error.message 
    });
  }
});

router.post('/test-email/admin-inquiry-notification', async (req, res) => {
  try {
    const mockInquiry = {
      _id: 'test-inquiry-123',
      name: 'Max Mustermann',
      email: 'max.mustermann@example.com',
      phone: '+49 123 456789',
      message: 'Hallo, ich interessiere mich für Ihre handgemachten Seifen. Könnten Sie mir weitere Informationen zu Ihren Produkten zusenden? Besonders interessiert bin ich an Seifen für empfindliche Haut.\n\nVielen Dank und beste Grüße!',
      createdAt: new Date()
    };
    
    const result = await emailService.sendAdminInquiryNotification(
      mockInquiry,
      createTestEmailMeta('admin-inquiry-notification')
    );

    if (!result?.success) {
      throw new Error(result?.error || 'Versand fehlgeschlagen');
    }
    
    console.log('✅ [Admin] Admin-Anfrage-Benachrichtigungs-Test gesendet:', {
      inquiryId: mockInquiry._id,
      customerEmail: mockInquiry.email,
      success: result.success,
      messageId: result.messageId
    });
    
    res.json({ 
      success: true, 
      message: 'Admin-Anfrage-Benachrichtigung erfolgreich gesendet', 
      data: result 
    });
  } catch (error) {
    console.error('❌ [Admin] E-Mail-Test fehlgeschlagen:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Fehler beim E-Mail-Versand', 
      error: error.message 
    });
  }
});

router.post('/test-email/password-changed', async (req, res) => {
  try {
    const { email } = req.body;
    const targetEmail = email || (req.user && req.user.email) || process.env.ADMIN_EMAIL;
    const result = await emailService.sendPasswordResetSuccessEmail(
      targetEmail,
      (req.user && req.user.name) || 'Test User',
      createTestEmailMeta('password-changed')
    );
    if (!result?.success) {
      throw new Error(result?.error || 'Versand fehlgeschlagen');
    }
    res.json({ success: true, message: `Passwort-geändert-E-Mail erfolgreich an ${targetEmail} gesendet`, data: result });
  } catch (error) {
    console.error('❌ [Admin] E-Mail-Test fehlgeschlagen:', error);
    res.status(500).json({ success: false, message: 'Fehler beim E-Mail-Versand', error: error.message });
  }
});

router.post('/test-email/order-rejection', async (req, res) => {
  try {
    const { email } = req.body;
    const targetEmail = email || (req.user && req.user.email) || process.env.ADMIN_EMAIL;
    const mockOrder = {
      _id: 'test-order-456',
      bestellnummer: 'TEST-2024-002',
      erstelltAm: new Date(),
      besteller: { vorname: 'Test', nachname: 'Kunde', email: targetEmail },
      artikel: [{ name: 'Rosen-Seife (TEST)', menge: 1, einzelpreis: 10.00, gesamtpreis: 10.00 }],
      preise: { gesamtsumme: 10.00 },
      gesamtpreis: 10.00,
      createdAt: new Date()
    };
    const result = await emailService.sendOrderRejectionEmail(
      mockOrder,
      'Dies ist ein Test-Versand.',
      createTestEmailMeta('order-rejection')
    );
    if (!result?.success) {
      throw new Error(result?.error || 'Versand fehlgeschlagen');
    }
    res.json({ success: true, message: `Bestellablehnung-E-Mail erfolgreich an ${targetEmail} gesendet`, data: result });
  } catch (error) {
    console.error('❌ [Admin] E-Mail-Test fehlgeschlagen:', error);
    res.status(500).json({ success: false, message: 'Fehler beim E-Mail-Versand', error: error.message });
  }
});

// E-Mail-Logs für Admin abrufen
router.get('/email-logs', async (req, res) => {
  try {
    const {
      limit = 20,
      emailType,
      environment = 'test'
    } = req.query;

    // Filter für E-Mail-Logs
    const filter = {};
    if (emailType) filter.emailType = emailType;
    if (environment) filter.environment = environment;

    // E-Mail-Logs abrufen
    const EmailOut = require('../models/EmailOut');
    const emails = await EmailOut.find(filter)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .select('-content.htmlBody -content.textBody'); // Große Felder ausschließen

    const total = await EmailOut.countDocuments(filter);

    res.json({
      success: true,
      data: {
        emails,
        total,
        filter
      }
    });
  } catch (error) {
    console.error('Fehler beim Abrufen der E-Mail-Logs:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Abrufen der E-Mail-Logs',
      error: error.message
    });
  }
});

// ===== NEUE ROUTEN FÜR ECHTE BESTELLRECHNUNGEN =====
// Rechnung aus echter Bestellung generieren
router.get('/order/:orderId/generate', (req, res) => invoiceController.generateInvoiceFromOrder(req, res));

// Gespeicherte Rechnung einer Bestellung abrufen
router.get('/order/:orderId/stored', (req, res) => invoiceController.getStoredInvoice(req, res));

module.exports = router;