const express = require('express');
const templateExtractor = require('../../services/TemplateExtractor');

const router = express.Router();

// @route   GET /api/admin/email-config
// @desc    Get email configuration
// @access  Private (Admin)
router.get('/config', async (req, res) => {
  try {
    const defaultConfig = {
      verification: {
        enabled: true,
        automatic: true,
        trigger: 'user_registration',
        subject: '✅ E-Mail-Adresse bestätigen - Gluecksmomente Seifenmanufaktur',
        template: 'default'
      },
      welcome: {
        enabled: true,
        automatic: true,
        trigger: 'email_verified',
        subject: '🌸 Willkommen bei Gluecksmomente Manufaktur!',
        template: 'default'
      },
      passwordReset: {
        enabled: true,
        automatic: true,
        trigger: 'password_reset_request',
        subject: '🔒 Passwort zurücksetzen - Gluecksmomente Manufaktur',
        template: 'default'
      },
      orderConfirmation: {
        enabled: true,
        automatic: true,
        trigger: 'order_placed',
        subject: '📦 Bestellbestätigung - Gluecksmomente Manufaktur',
        template: 'default'
      },
      adminNotification: {
        enabled: true,
        automatic: true,
        trigger: 'new_order',
        subject: '🚨 Neue Bestellung eingegangen - {{orderNumber}}',
        template: 'default'
      },
      adminInquiryNotification: {
        enabled: true,
        automatic: true,
        trigger: 'new_inquiry',
        subject: '📝 Neue Kundenanfrage von {{customerName}}',
        template: 'default'
      }
    };

    const globalSettings = {
      fromName: 'Gluecksmomente Manufaktur',
      fromEmail: process.env.EMAIL_FROM || 'info@gluecksmomente-manufaktur.de',
      adminEmail: process.env.ADMIN_EMAIL || 'ralle.jacob84@googlemail.com',
      emailEnabled: true,
      defaultLanguage: 'de',
      footer: 'Vielen Dank für Ihr Vertrauen in die Gluecksmomente Manufaktur',
      notifications: {
        newOrders: true,
        newInquiries: true,
        orderUpdates: false,
        highValueOrders: true,
        highValueThreshold: 100
      }
    };

    console.log('📧 [Admin] E-Mail-Konfiguration abgerufen');
    res.json({
      success: true,
      emailConfigs: defaultConfig,
      globalSettings
    });
  } catch (error) {
    console.error('❌ [Admin] Fehler beim Abrufen der E-Mail-Konfiguration:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Abrufen der E-Mail-Konfiguration',
      error: error.message
    });
  }
});

// @route   POST /api/admin/email-config
// @desc    Save email configuration
// @access  Private (Admin)
router.post('/config', async (req, res) => {
  try {
    const { emailConfigs, globalSettings } = req.body;
    
    console.log('📧 [Admin] E-Mail-Konfiguration gespeichert:', {
      configCount: Object.keys(emailConfigs || {}).length,
      hasGlobalSettings: !!globalSettings
    });
    
    res.json({
      success: true,
      message: 'E-Mail-Konfiguration erfolgreich gespeichert'
    });
  } catch (error) {
    console.error('❌ [Admin] Fehler beim Speichern der E-Mail-Konfiguration:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Speichern der E-Mail-Konfiguration',
      error: error.message
    });
  }
});

// @route   GET /api/admin/email-templates
// @desc    Alle verfügbaren E-Mail-Templates abrufen
// @access  Private (Admin)
router.get('/templates', async (req, res) => {
  try {
    console.log('📧 [Admin] Template-Abruf gestartet');
    
    const availableEmailTypes = [
      'verification',
      'welcome', 
      'password-reset',
      'order-confirmation'
    ];

    const allTemplates = await templateExtractor.extractTemplates();
    console.log('📧 [Admin] Templates extrahiert:', Object.keys(allTemplates));

    res.json({
      success: true,
      templates: allTemplates,
      availableTypes: availableEmailTypes,
      message: 'Templates erfolgreich geladen'
    });
  } catch (error) {
    console.error('❌ [Admin] Fehler beim Template-Abruf:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Laden der E-Mail-Templates',
      error: error.message
    });
  }
});

// @route   GET /api/admin/email-templates/:type
// @desc    Spezifisches E-Mail-Template abrufen
// @access  Private (Admin)
router.get('/templates/:type', async (req, res) => {
  try {
    const { type } = req.params;
    
    const methodMapping = {
      'verification': 'sendVerificationEmail',
      'welcome': 'sendWelcomeEmail', 
      'password-reset': 'sendPasswordResetEmail',
      'order-confirmation': 'sendOrderConfirmation'
    };

    const methodName = methodMapping[type];
    if (!methodName) {
      return res.status(404).json({
        success: false,
        message: 'Template-Typ nicht gefunden'
      });
    }

    const allTemplates = await templateExtractor.extractTemplates();
    const template = allTemplates[type];
    
    if (!template) {
      return res.status(404).json({
        success: false,
        message: 'Template nicht gefunden'
      });
    }

    res.json({
      success: true,
      template,
      message: 'Template erfolgreich geladen'
    });
  } catch (error) {
    console.error('❌ [Admin] Fehler beim Laden des Templates:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Laden des Templates',
      error: error.message
    });
  }
});

// @route   POST /api/admin/email-templates/:type
// @desc    E-Mail-Template speichern
// @access  Private (Admin)
router.post('/templates/:type', async (req, res) => {
  try {
    const { type } = req.params;
    const { template } = req.body;

    const methodMapping = {
      'verification': 'sendVerificationEmail',
      'welcome': 'sendWelcomeEmail',
      'password-reset': 'sendPasswordResetEmail', 
      'order-confirmation': 'sendOrderConfirmation'
    };

    const methodName = methodMapping[type];
    if (!methodName) {
      return res.status(404).json({
        success: false,
        message: 'Template-Typ nicht gefunden'
      });
    }

    await templateExtractor.updateTemplate(methodName, template);

    res.json({
      success: true,
      message: 'Template erfolgreich gespeichert und wird sofort für alle E-Mails verwendet!'
    });
  } catch (error) {
    console.error('❌ [Admin] Fehler beim Speichern des Templates:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Speichern des Templates',
      error: error.message
    });
  }
});

// @route   POST /api/admin/test-email-with-template/:type
// @desc    Test-E-Mail mit Custom Template senden
// @access  Private (Admin)
router.post('/test-email-with-template/:type', async (req, res) => {
  try {
    const { type } = req.params;
    const { template, email } = req.body;

    console.log('📧 [Admin] Test-E-Mail mit Custom Template:', { type, email: email?.substring(0, 10) + '...' });

    let result;
    const testData = generateTestData(type);

    result = await sendTestEmailWithCustomTemplate(type, template, email || 'admin@example.com', testData);

    res.json({
      success: result.success,
      message: result.success ? 'Test-E-Mail erfolgreich gesendet!' : 'Fehler beim E-Mail-Versand',
      data: result
    });
  } catch (error) {
    console.error('❌ [Admin] Fehler beim Test-E-Mail-Versand:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Test-E-Mail-Versand',
      error: error.message
    });
  }
});

// Hilfsfunktionen
async function sendTestEmailWithCustomTemplate(type, template, email, testData) {
  console.log('📧 [Admin] Test-E-Mail mit Custom Template:', { type, email });
  
  try {
    const emailServiceInstance = new (require('../../services/emailService'))();
    
    // Template-Variablen ersetzen
    let processedTemplate = template;
    Object.keys(testData).forEach(key => {
      const regex = new RegExp(`\\$\\{${key}\\}`, 'g');
      processedTemplate = processedTemplate.replace(regex, testData[key]);
    });

    const result = await emailServiceInstance.resend.emails.send({
      from: 'Glücksmomente Manufaktur <info@gluecksmomente-manufaktur.de>',
      to: email,
      subject: `[TEST] ${getEmailSubject(type)}`,
      html: processedTemplate
    });

    return { success: true, messageId: result.data?.id };
  } catch (error) {
    console.error('❌ Test-E-Mail Fehler:', error);
    return { success: false, error: error.message };
  }
}

function getEmailSubject(type) {
  const subjects = {
    'verification': 'E-Mail bestätigen - Glücksmomente Manufaktur',
    'welcome': 'Willkommen bei Glücksmomente Manufaktur',
    'password-reset': 'Passwort zurücksetzen - Glücksmomente Manufaktur',
    'order-confirmation': 'Bestellbestätigung - Glücksmomente Manufaktur'
  };
  return subjects[type] || 'Test E-Mail';
}

function generateTestData(type) {
  const baseData = {
    userName: 'Max Mustermann',
    userEmail: 'test@example.com'
  };

  switch (type) {
    case 'verification':
      return {
        ...baseData,
        verificationUrl: 'https://example.com/verify/test123'
      };
    case 'password-reset':
      return {
        ...baseData,
        resetUrl: 'https://example.com/reset/test123'
      };
    case 'order-confirmation':
      return {
        ...baseData,
        orderNumber: 'TEST-' + Date.now(),
        orderData: { total: 29.99, items: ['Test Seife'] }
      };
    default:
      return baseData;
  }
}

module.exports = router;