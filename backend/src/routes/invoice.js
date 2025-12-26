const express = require('express');
const router = express.Router();
const invoiceController = require('../controllers/invoiceController');
const auth = require('../middleware/auth');
const emailService = require('../services/emailService');

// Alle Routen benötigen Admin-Authentifizierung
router.use(auth.authenticateToken);
router.use(auth.requireAdmin);

// Template-Verwaltung
router.get('/templates', invoiceController.getAllTemplates);
router.get('/templates/default', invoiceController.getDefaultTemplate);
router.post('/templates', invoiceController.createTemplate);
router.put('/templates/:id', invoiceController.updateTemplate);
router.put('/templates/:id/set-default', invoiceController.setDefaultTemplate);
router.delete('/templates/:id', invoiceController.deleteTemplate);

// Vorschau und Variablen
router.post('/preview', invoiceController.generatePreview);
router.get('/variables', invoiceController.getAvailableVariables);

// E-Mail-Test-Funktionen
router.post('/test-email/verification', async (req, res) => {
  try {
    const { email } = req.body;
    const targetEmail = email || req.user.email;
    const result = await emailService.sendVerificationEmail(
      targetEmail,
      'test-token-123',
      req.user.name || 'Test User'
    );
    
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
      req.user.name || 'Test User'
    );
    
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
      req.user.name || 'Test User'
    );
    
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
      gesamtpreis: 25.00,
      createdAt: new Date(),
      userId: req.user._id || null,
      kundeId: null
    };
    
    const result = await emailService.sendOrderConfirmationEmail(mockOrder);
    
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
      bestellnummer: 'TEST-2024-001',
      besteller: {
        vorname: 'Test',
        nachname: 'Kunde',
        email: 'test@example.com'
      },
      artikel: [
        {
          name: 'Test Produkt (ADMIN)',
          menge: 1,
          einzelpreis: 15.00,
          gesamtpreis: 15.00
        }
      ],
      gesamtpreis: 15.00,
      createdAt: new Date()
    };
    
    const result = await emailService.sendAdminOrderNotification(mockOrder);
    
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
    
    const result = await emailService.sendAdminInquiryNotification(mockInquiry);
    
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

module.exports = router;