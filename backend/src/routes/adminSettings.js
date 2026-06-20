const express = require('express');
const router = express.Router();
const AdminSettings = require('../models/AdminSettings');
const { auth } = require('../middleware/auth');
const emailService = require('../services/emailService');

// Middleware: Nur Admin-Zugriff
const requireAdmin = (req, res, next) => {
  if (!req.user || !req.user.permissions?.includes('admin')) {
    return res.status(403).json({
      success: false,
      message: 'Admin-Berechtigung erforderlich'
    });
  }
  next();
};

// 🔧 GET: Aktuelle Admin-Einstellungen abrufen
router.get('/settings', auth, requireAdmin, async (req, res) => {
  try {
    console.log('🔧 Admin Settings abrufen');
    
    const settings = await AdminSettings.getInstance();
    
    // Environment-Variablen für PayPal abrufen (echte Werte für Admin-Panel)
    const envPayPalConfig = {
      sandbox: {
        clientId: process.env.PAYPAL_SANDBOX_CLIENT_ID || '',
        clientSecret: process.env.PAYPAL_SANDBOX_CLIENT_SECRET || '',
        configured: !!(process.env.PAYPAL_SANDBOX_CLIENT_ID && process.env.PAYPAL_SANDBOX_CLIENT_SECRET)
      },
      live: {
        clientId: process.env.PAYPAL_LIVE_CLIENT_ID || '',
        clientSecret: process.env.PAYPAL_LIVE_CLIENT_SECRET || '',
        configured: !!(process.env.PAYPAL_LIVE_CLIENT_ID && process.env.PAYPAL_LIVE_CLIENT_SECRET)
      }
    };
    
    // Admin-Settings für Anzeige zusammenstellen
    const checkoutSettings = {
      enabled: settings.checkout?.enabled ?? true,
      mode: settings.checkout?.mode || 'full',
      maintenanceMessage: settings.checkout?.maintenanceMessage || 'Checkout vorübergehend deaktiviert. Bitte kontaktieren Sie uns für Anfragen.',
      shippingEnabled: settings.checkout?.shippingEnabled !== false,
      shippingCost: Number(settings.checkout?.shippingCost ?? 5.99),
      freeShippingThreshold: Number(settings.checkout?.freeShippingThreshold ?? 30)
    };

    const adminSettings = {
      paypal: {
        mode: settings.paypal.mode,
        environment: {
          nodeEnv: process.env.NODE_ENV,
          isDevelopment: process.env.NODE_ENV !== 'production'
        },
        current: envPayPalConfig, // Echte Environment-Werte
        database: {
          // Datenbank-Werte (für Vergleich)
          sandbox: {
            clientId: settings.paypal.sandbox.clientId || '',
            clientSecret: settings.paypal.sandbox.clientSecret || '',
            configured: !!(settings.paypal.sandbox.clientId && settings.paypal.sandbox.clientSecret)
          },
          live: {
            clientId: settings.paypal.live.clientId || '',
            clientSecret: settings.paypal.live.clientSecret || '',
            configured: !!(settings.paypal.live.clientId && settings.paypal.live.clientSecret)
          }
        }
      },
      checkout: checkoutSettings,
      shop: settings.shop,
      lastUpdated: settings.lastUpdated,
      updatedBy: settings.updatedBy
    };
    
    console.log('📊 PayPal Config Status:', {
      mode: settings.paypal.mode,
      sandboxConfigured: envPayPalConfig.sandbox.configured,
      liveConfigured: envPayPalConfig.live.configured,
      environment: process.env.NODE_ENV
    });
    
    res.json({
      success: true,
      settings: adminSettings
    });
    
  } catch (error) {
    console.error('❌ Fehler beim Abrufen der Admin-Einstellungen:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Abrufen der Einstellungen'
    });
  }
});

// 📧 GET: Mail-Diagnose für Admin-Einstellungsseite
router.get('/email-diagnostics', auth, requireAdmin, async (req, res) => {
  try {
    res.json({
      success: true,
      data: {
        environment: process.env.NODE_ENV || 'development',
        resendConfigured: Boolean(process.env.RESEND_API_KEY),
        resendFallbackEnabled: Boolean(emailService.enableResendFallback),
        resendRuntimeAvailable: Boolean(emailService.resend),
        smtpConfigured: Boolean(emailService.smtpUserConfigured && emailService.smtpPassConfigured),
        smtpRuntimeAvailable: Boolean(emailService.smtpTransport),
        smtpHost: process.env.SMTP_HOST || 'smtp.gmail.com',
        smtpPort: Number(process.env.SMTP_PORT || 465),
        emailServiceDisabled: Boolean(emailService.isDisabled),
        fromEmail: emailService.fromEmail || process.env.EMAIL_FROM || '',
        fromName: emailService.fromName || 'Gluecksmomente Manufaktur',
        adminEmail: process.env.ADMIN_EMAIL || '',
        adminAlertEmail: process.env.ADMIN_ALERT_EMAIL || process.env.ADMIN_EMAIL || '',
        notificationEmail: emailService.notificationEmail || process.env.ADMIN_ALERT_EMAIL || process.env.ADMIN_EMAIL || ''
      }
    });
  } catch (error) {
    console.error('❌ Fehler bei Mail-Diagnose:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Abrufen der Mail-Diagnose',
      error: error.message
    });
  }
});

// 📧 POST: Test-Admin-Benachrichtigung versenden
router.post('/test-email-notification', auth, requireAdmin, async (req, res) => {
  try {
    const { type = 'inquiry' } = req.body || {};
    let result;

    if (type === 'order') {
      result = await emailService.sendAdminOrderNotification({
        bestellung: {
          _id: 'test-order-admin-settings',
          bestellnummer: `TEST-${Date.now()}`,
          bestelldatum: new Date(),
          kontakt: { email: 'kunde@example.com' },
          artikel: [{ name: 'Testprodukt', typ: 'Test', menge: 1, preis: 12.34 }],
          rechnungsadresse: {
            vorname: 'Max',
            nachname: 'Muster',
            strasse: 'Teststrasse',
            hausnummer: '1',
            plz: '12345',
            stadt: 'Teststadt'
          },
          lieferadresse: {
            vorname: 'Max',
            nachname: 'Muster',
            strasse: 'Teststrasse',
            hausnummer: '1',
            plz: '12345',
            stadt: 'Teststadt'
          },
          zahlung: { transaktionsId: 'TEST-TX-ADMIN' },
          notizen: { kunde: 'Test-Bestellung aus Admin-Einstellungen' }
        },
        kundenname: 'Max Muster',
        gesamtbetrag: 12.34
      });
    } else {
      result = await emailService.sendAdminInquiryNotification({
        _id: 'test-inquiry-admin-settings',
        customer: {
          name: 'Test Kunde',
          email: 'kunde@example.com',
          phone: '0123456789'
        },
        customerNote: 'Test-Anfrage aus Admin-Einstellungen',
        createdAt: new Date()
      });
    }

    if (!result?.success) {
      return res.status(400).json({
        success: false,
        message: result?.error || 'Test-Benachrichtigung fehlgeschlagen',
        data: result || null
      });
    }

    res.json({
      success: true,
      message: `Test-${type === 'order' ? 'Bestell' : 'Anfrage'}-Benachrichtigung wurde versendet`,
      data: result
    });
  } catch (error) {
    console.error('❌ Fehler beim Senden der Test-Benachrichtigung:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Senden der Test-Benachrichtigung',
      error: error.message
    });
  }
});

// 💾 PUT: Admin-Einstellungen aktualisieren
router.put('/settings', auth, requireAdmin, async (req, res) => {
  try {
    const { section, updates } = req.body;
    const updatedBy = req.user?.email || 'Admin';
    
    console.log(`🔧 Admin Settings Update - Section: ${section}`, updates);
    
    const settings = await AdminSettings.getInstance();
    
    // Validierung basierend auf Sektion
    switch (section) {
      case 'paypal':
        if (updates.mode && !['sandbox', 'live', 'disabled'].includes(updates.mode)) {
          return res.status(400).json({
            success: false,
            message: 'Ungültiger PayPal-Modus'
          });
        }
        
        // PayPal Konfiguration aktualisieren
        if (updates.mode) settings.paypal.mode = updates.mode;
        
        if (updates.sandbox) {
          if (updates.sandbox.clientId) settings.paypal.sandbox.clientId = updates.sandbox.clientId;
          if (updates.sandbox.clientSecret) settings.paypal.sandbox.clientSecret = updates.sandbox.clientSecret;
        }
        
        if (updates.live) {
          if (updates.live.clientId) settings.paypal.live.clientId = updates.live.clientId;
          if (updates.live.clientSecret) settings.paypal.live.clientSecret = updates.live.clientSecret;
        }
        break;
        
      case 'checkout':
        if (!settings.checkout) {
          settings.checkout = {};
        }

        const nextCheckout = {
          enabled: settings.checkout.enabled ?? true,
          mode: settings.checkout.mode || 'full',
          maintenanceMessage: settings.checkout.maintenanceMessage || 'Checkout vorübergehend deaktiviert. Bitte kontaktieren Sie uns für Anfragen.',
          shippingEnabled: settings.checkout.shippingEnabled !== false,
          shippingCost: Number(settings.checkout.shippingCost ?? 5.99),
          freeShippingThreshold: Number(settings.checkout.freeShippingThreshold ?? 30)
        };

        if (typeof updates.enabled === 'boolean') nextCheckout.enabled = updates.enabled;
        if (updates.mode && ['full', 'inquiry', 'disabled'].includes(updates.mode)) {
          nextCheckout.mode = updates.mode;
        }
        if (updates.maintenanceMessage !== undefined) nextCheckout.maintenanceMessage = updates.maintenanceMessage;
        if (typeof updates.shippingEnabled === 'boolean') nextCheckout.shippingEnabled = updates.shippingEnabled;
        if (updates.shippingCost !== undefined) {
          const shippingCost = Number(updates.shippingCost);
          if (!Number.isFinite(shippingCost) || shippingCost < 0) {
            return res.status(400).json({
              success: false,
              message: 'Ungültige Versandkosten'
            });
          }
          nextCheckout.shippingCost = shippingCost;
        }
        if (updates.freeShippingThreshold !== undefined) {
          const freeShippingThreshold = Number(updates.freeShippingThreshold);
          if (!Number.isFinite(freeShippingThreshold) || freeShippingThreshold < 0) {
            return res.status(400).json({
              success: false,
              message: 'Ungültiger Mindestbestellwert für kostenlosen Versand'
            });
          }
          nextCheckout.freeShippingThreshold = freeShippingThreshold;
        }

        settings.checkout = nextCheckout;
        settings.markModified('checkout');
        break;
        
      case 'shop':
        if (updates.status && ['open', 'maintenance', 'vacation', 'closed'].includes(updates.status)) {
          settings.shop.status = updates.status;
        }
        if (updates.statusMessage !== undefined) settings.shop.statusMessage = updates.statusMessage;
        if (updates.vacationMode) {
          Object.assign(settings.shop.vacationMode, updates.vacationMode);
        }
        break;
        
      default:
        return res.status(400).json({
          success: false,
          message: 'Unbekannte Sektion'
        });
    }
    
    // Speichern
    settings.lastUpdated = new Date();
    settings.updatedBy = updatedBy;
    await settings.save();
    
    console.log(`✅ Admin Settings aktualisiert - Section: ${section}`);
    
    res.json({
      success: true,
      message: 'Einstellungen erfolgreich aktualisiert',
      settings: await settings.getPayPalConfig()
    });
    
  } catch (error) {
    console.error('❌ Fehler beim Aktualisieren der Admin-Einstellungen:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Speichern der Einstellungen'
    });
  }
});

// 🧪 POST: PayPal-Verbindung testen
router.post('/test-paypal', auth, requireAdmin, async (req, res) => {
  try {
    const { mode } = req.body; // 'sandbox' oder 'live'
    
    console.log(`🧪 PayPal-Verbindung testen - Modus: ${mode}`);
    
    // Direkt aus Environment-Variablen lesen für genaueren Test
    let clientId, clientSecret;
    
    if (mode === 'live') {
      clientId = process.env.PAYPAL_LIVE_CLIENT_ID;
      clientSecret = process.env.PAYPAL_LIVE_CLIENT_SECRET;
    } else if (mode === 'sandbox') {
      clientId = process.env.PAYPAL_SANDBOX_CLIENT_ID;
      clientSecret = process.env.PAYPAL_SANDBOX_CLIENT_SECRET;
    } else {
      return res.status(400).json({
        success: false,
        message: 'Ungültiger Modus. Verwenden Sie "sandbox" oder "live"'
      });
    }
    
    console.log(`🔍 PayPal ${mode} Credentials check:`, {
      clientId: clientId ? `${clientId.substring(0, 10)}...` : 'NICHT GESETZT',
      clientSecret: clientSecret ? `${clientSecret.substring(0, 10)}...` : 'NICHT GESETZT'
    });
    
    if (!clientId || !clientSecret) {
      return res.status(400).json({
        success: false,
        message: `PayPal ${mode} Konfiguration unvollständig - Environment-Variablen fehlen`,
        details: {
          missingVars: [
            !clientId ? `PAYPAL_${mode.toUpperCase()}_CLIENT_ID` : null,
            !clientSecret ? `PAYPAL_${mode.toUpperCase()}_CLIENT_SECRET` : null
          ].filter(Boolean)
        }
      });
    }
    
    // PayPal OAuth Test
    const baseUrl = mode === 'live' 
      ? 'https://api.paypal.com' 
      : 'https://api.sandbox.paypal.com';
      
    console.log(`🌐 PayPal API URL: ${baseUrl}`);
      
    const authResponse = await fetch(`${baseUrl}/v1/oauth2/token`, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Accept-Language': 'en_US',
        'Authorization': `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`
      },
      body: 'grant_type=client_credentials'
    });
    
    const authData = await authResponse.json();
    
    if (authResponse.ok && authData.access_token) {
      console.log(`✅ PayPal ${mode} Verbindung erfolgreich`);
      res.json({
        success: true,
        message: `PayPal ${mode} Verbindung erfolgreich`,
        details: {
          tokenType: authData.token_type,
          expiresIn: authData.expires_in,
          baseUrl: baseUrl
        }
      });
    } else {
      console.log(`❌ PayPal ${mode} Verbindung fehlgeschlagen:`, authData);
      res.status(400).json({
        success: false,
        message: `PayPal ${mode} Verbindung fehlgeschlagen`,
        error: authData.error_description || authData.error
      });
    }
    
  } catch (error) {
    console.error('❌ Fehler beim Testen der PayPal-Verbindung:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Testen der PayPal-Verbindung'
    });
  }
});

// 📊 GET: Shop-Status für öffentliche API
router.get('/shop-status', async (req, res) => {
  try {
    const settings = await AdminSettings.getInstance();
    
    const response = {
      success: true,
      status: {
        shop: settings.shop.status,
        checkout: settings.checkout.enabled,
        checkoutMode: settings.checkout.mode,
        shippingEnabled: settings.checkout.shippingEnabled !== false,
        shippingCost: Number(settings.checkout.shippingCost ?? 5.99),
        freeShippingThreshold: Number(settings.checkout.freeShippingThreshold ?? 30),
        message: settings.shop.statusMessage || settings.checkout.maintenanceMessage,
        paypal: {
          available: settings.paypal.mode !== 'disabled',
          mode: settings.paypal.mode
        }
      }
    };

    // Urlaubs-Datumsinformationen hinzufügen wenn im Urlaubs-Modus
    if (settings.shop.status === 'vacation' && settings.shop.vacationMode) {
      response.status.vacation = {
        startDate: settings.shop.vacationMode.startDate,
        endDate: settings.shop.vacationMode.endDate,
        autoMessage: settings.shop.vacationMode.autoMessage
      };
    }
    
    res.json(response);
    
  } catch (error) {
    console.error('❌ Fehler beim Abrufen des Shop-Status:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Abrufen des Shop-Status'
    });
  }
});

// 🔧 POST: Environment-Variablen aktualisieren (nur Development)
router.post('/update-env-vars', auth, requireAdmin, async (req, res) => {
  try {
    // Nur in Development-Umgebung erlauben
    if (process.env.NODE_ENV === 'production') {
      return res.status(403).json({
        success: false,
        message: 'Environment-Variable-Updates sind nur in der Development-Umgebung erlaubt'
      });
    }

    const { paypal } = req.body;
    
    console.log('🔧 Environment-Variablen Update angefordert');
    
    // .env-Datei Pfad
    const path = require('path');
    const fs = require('fs');
    const envPath = path.resolve(__dirname, '..', '..', '.env');
    
    if (!fs.existsSync(envPath)) {
      return res.status(404).json({
        success: false,
        message: '.env-Datei nicht gefunden'
      });
    }
    
    // Aktuelle .env-Datei lesen
    let envContent = fs.readFileSync(envPath, 'utf8');
    
    // PayPal-Variablen aktualisieren
    if (paypal) {
      if (paypal.sandbox) {
        if (paypal.sandbox.clientId !== undefined) {
          envContent = updateEnvVariable(envContent, 'PAYPAL_SANDBOX_CLIENT_ID', paypal.sandbox.clientId);
        }
        if (paypal.sandbox.clientSecret !== undefined) {
          envContent = updateEnvVariable(envContent, 'PAYPAL_SANDBOX_CLIENT_SECRET', paypal.sandbox.clientSecret);
        }
      }
      
      if (paypal.live) {
        if (paypal.live.clientId !== undefined) {
          envContent = updateEnvVariable(envContent, 'PAYPAL_LIVE_CLIENT_ID', paypal.live.clientId);
        }
        if (paypal.live.clientSecret !== undefined) {
          envContent = updateEnvVariable(envContent, 'PAYPAL_LIVE_CLIENT_SECRET', paypal.live.clientSecret);
        }
      }
    }
    
    // .env-Datei speichern
    fs.writeFileSync(envPath, envContent);
    
    // Process-Environment aktualisieren
    if (paypal?.sandbox?.clientId !== undefined) {
      process.env.PAYPAL_SANDBOX_CLIENT_ID = paypal.sandbox.clientId;
    }
    if (paypal?.sandbox?.clientSecret !== undefined) {
      process.env.PAYPAL_SANDBOX_CLIENT_SECRET = paypal.sandbox.clientSecret;
    }
    if (paypal?.live?.clientId !== undefined) {
      process.env.PAYPAL_LIVE_CLIENT_ID = paypal.live.clientId;
    }
    if (paypal?.live?.clientSecret !== undefined) {
      process.env.PAYPAL_LIVE_CLIENT_SECRET = paypal.live.clientSecret;
    }
    
    console.log('✅ Environment-Variablen erfolgreich aktualisiert');
    
    res.json({
      success: true,
      message: 'Environment-Variablen erfolgreich aktualisiert',
      note: 'Für vollständige Aktivierung sollte der Server neu gestartet werden'
    });
    
  } catch (error) {
    console.error('❌ Fehler beim Aktualisieren der Environment-Variablen:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Aktualisieren der Environment-Variablen'
    });
  }
});

// Hilfsfunktion zum Aktualisieren von Environment-Variablen in .env-String
function updateEnvVariable(envContent, varName, newValue) {
  const regex = new RegExp(`^${varName}=.*$`, 'm');
  const newLine = `${varName}=${newValue}`;
  
  if (regex.test(envContent)) {
    // Variable existiert - ersetzen
    return envContent.replace(regex, newLine);
  } else {
    // Variable existiert nicht - hinzufügen
    return envContent + `\n${newLine}`;
  }
}

// 📧 EMAIL CONFIG ENDPOINTS
const EmailConfig = require('../models/EmailConfig');

const emailTriggerOptions = {
  verification: ['user_registration', 'manual'],
  welcome: ['email_verified', 'user_registration', 'manual'],
  passwordreset: ['manual'],
  passwordchanged: ['manual'],
  orderconfirmation: ['manual'],
  orderrejection: ['manual'],
  adminordernotification: ['manual'],
  admininquirynotification: ['manual']
};

const legacyTriggerMap = {
  registration: 'user_registration',
  'after-verification': 'email_verified',
  auto: 'manual',
  order_placed: 'manual',
  'order-placed': 'manual',
  order_rejected: 'manual',
  'order-rejected': 'manual',
  new_order: 'manual',
  new_inquiry: 'manual',
  'inquiry-submitted': 'manual',
  password_reset_request: 'manual'
};

function normalizeEmailTrigger(configKey, triggerValue) {
  const allowedTriggers = emailTriggerOptions[configKey] || ['manual'];
  const mappedTrigger = legacyTriggerMap[triggerValue] || triggerValue;

  if (allowedTriggers.includes(mappedTrigger)) {
    return mappedTrigger;
  }

  return allowedTriggers[0] || 'manual';
}

function normalizeEmailConfigSet(emailConfigs = {}) {
  return Object.fromEntries(
    Object.entries(emailConfigs).map(([key, config]) => [
      key,
      {
        ...config,
        trigger: normalizeEmailTrigger(key, config?.trigger)
      }
    ])
  );
}

// GET: E-Mail-Konfiguration abrufen
router.get('/email/config', auth, requireAdmin, async (req, res) => {
  try {
    const emailConfig = await EmailConfig.getInstance();
    
    // Globale Settings zusammenstellen
    const globalSettings = {
      emailEnabled: emailConfig.emailEnabled,
      fromEmail: emailConfig.fromEmail,
      fromName: emailConfig.fromName,
      replyToEmail: emailConfig.replyToEmail,
      adminEmail: emailConfig.adminEmail
    };
    
    // Email-Typ-Konfigurationen zusammenstellen
    const emailConfigs = normalizeEmailConfigSet({
      verification: emailConfig.verification,
      welcome: emailConfig.welcome,
      passwordreset: emailConfig.passwordreset,
      passwordchanged: emailConfig.passwordchanged,
      orderconfirmation: emailConfig.orderconfirmation,
      orderrejection: emailConfig.orderrejection,
      adminordernotification: emailConfig.adminordernotification,
      admininquirynotification: emailConfig.admininquirynotification
    });
    
    console.log('📧 E-Mail-Konfiguration abgerufen');
    
    res.json({
      success: true,
      globalSettings,
      emailConfigs,
      configCount: Object.keys(emailConfigs).length,
      hasGlobalSettings: !!globalSettings.emailEnabled
    });
    
  } catch (error) {
    console.error('❌ Fehler beim Abrufen der E-Mail-Konfiguration:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Abrufen der E-Mail-Konfiguration',
      error: error.message
    });
  }
});

// POST: E-Mail-Konfiguration speichern
router.post('/email/config', auth, requireAdmin, async (req, res) => {
  try {
    const { globalSettings, emailConfigs } = req.body;
    const emailConfig = await EmailConfig.getInstance();
    const updatedBy = req.user?.email || 'Admin';
    
    console.log('📧 E-Mail-Konfiguration speichern...');
    
    // Globale Settings aktualisieren
    if (globalSettings) {
      if (globalSettings.emailEnabled !== undefined) emailConfig.emailEnabled = globalSettings.emailEnabled;
      if (globalSettings.fromEmail) emailConfig.fromEmail = globalSettings.fromEmail;
      if (globalSettings.fromName) emailConfig.fromName = globalSettings.fromName;
      if (globalSettings.replyToEmail) emailConfig.replyToEmail = globalSettings.replyToEmail;
      if (globalSettings.adminEmail) emailConfig.adminEmail = globalSettings.adminEmail;
    }
    
    // Email-Typ-Konfigurationen aktualisieren
    if (emailConfigs) {
      const emailTypeKeys = ['verification', 'welcome', 'passwordreset', 'passwordchanged', 
                            'orderconfirmation', 'orderrejection', 'adminordernotification', 
                            'admininquirynotification'];
      
      for (const key of emailTypeKeys) {
        if (emailConfigs[key]) {
          emailConfig[key] = {
            enabled: emailConfigs[key].enabled !== false,
            subject: emailConfigs[key].subject || emailConfig[key]?.subject,
            trigger: normalizeEmailTrigger(key, emailConfigs[key].trigger || emailConfig[key]?.trigger)
          };
        }
      }
    }
    
    // Metadata
    emailConfig.updatedBy = updatedBy;
    
    // Speichern
    await emailConfig.save();
    
    console.log('✅ [Admin] E-Mail-Konfiguration gespeichert:', { 
      configCount: Object.keys(emailConfigs || {}).length,
      hasGlobalSettings: !!globalSettings?.emailEnabled 
    });
    
    res.json({
      success: true,
      message: 'E-Mail-Konfiguration erfolgreich gespeichert',
      config: emailConfig
    });
    
  } catch (error) {
    console.error('❌ Fehler beim Speichern der E-Mail-Konfiguration:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Speichern der E-Mail-Konfiguration',
      error: error.message
    });
  }
});

// GET: E-Mail-Template abrufen
router.get('/email/templates/:type', auth, requireAdmin, async (req, res) => {
  try {
    const { type } = req.params;
    const emailConfig = await EmailConfig.getInstance();
    
    const template = emailConfig.templates?.get(type);
    
    if (!template) {
      const defaultTemplates = {
        verification:               '<p>Hallo {{userName}},</p><p>bitte bestätigen Sie Ihre E-Mail-Adresse: <a href="{{verificationUrl}}">Hier klicken</a></p>',
        welcome:                    '<p>Hallo {{userName}},</p><p>herzlich willkommen bei Glücksmomente Manufaktur! Ihr Konto ist jetzt aktiv.</p>',
        passwordreset:              '<p>Hallo {{userName}},</p><p>zum Zurücksetzen Ihres Passworts klicken Sie hier: <a href="{{resetUrl}}">Passwort zurücksetzen</a></p>',
        passwordchanged:            '<p>Hallo {{userName}},</p><p>Ihr Passwort wurde erfolgreich geändert. Falls Sie das nicht waren, kontaktieren Sie uns bitte sofort.</p>',
        orderconfirmation:          '<p>Hallo {{userName}},</p><p>Ihre Bestellung {{orderNumber}} wurde erfolgreich aufgenommen. Vielen Dank!</p>',
        orderrejection:             '<p>Hallo {{userName}},</p><p>leider können wir Ihre Bestellung {{orderNumber}} nicht bearbeiten.</p>',
        adminordernotification:     '<p>Neue Bestellung eingegangen: {{orderNumber}}</p><p>Kunde: {{customerName}}</p><p>Betrag: {{totalAmount}} €</p>',
        admininquirynotification:   '<p>Neue Anfrage von: {{customerName}} ({{customerEmail}})</p><p>Telefon: {{customerPhone}}</p><p>Nachricht:</p><p>{{message}}</p>'
      };
      return res.json({
        success: true,
        type,
        template: defaultTemplates[type] || `<p>Kein Template für "${type}" hinterlegt. Hier können Sie Ihr eigenes HTML eingeben.</p>`,
        isDefault: true
      });
    }
    
    res.json({
      success: true,
      type,
      template,
      isDefault: false
    });
    
  } catch (error) {
    console.error('❌ Fehler beim Abrufen des E-Mail-Templates:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Abrufen des E-Mail-Templates',
      error: error.message
    });
  }
});

// GET: Alle E-Mail-Templates abrufen
router.get('/email/templates', auth, requireAdmin, async (req, res) => {
  try {
    const emailConfig = await EmailConfig.getInstance();
    const templates = {};
    
    if (emailConfig.templates) {
      for (const [key, value] of emailConfig.templates) {
        templates[key] = value;
      }
    }
    
    res.json({
      success: true,
      templates,
      count: Object.keys(templates).length
    });
    
  } catch (error) {
    console.error('❌ Fehler beim Abrufen der E-Mail-Templates:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Abrufen der E-Mail-Templates',
      error: error.message
    });
  }
});

// POST: E-Mail-Template speichern
router.post('/email/templates/:type', auth, requireAdmin, async (req, res) => {
  try {
    const { type } = req.params;
    const { template } = req.body;
    const emailConfig = await EmailConfig.getInstance();
    const updatedBy = req.user?.email || 'Admin';
    
    if (!template) {
      return res.status(400).json({
        success: false,
        message: 'Template ist erforderlich'
      });
    }
    
    // Template als String speichern
    emailConfig.templates.set(type, template);
    emailConfig.updatedBy = updatedBy;
    
    await emailConfig.save();
    
    console.log(`✅ E-Mail-Template gespeichert: ${type}`);
    
    res.json({
      success: true,
      message: `Template für "${type}" erfolgreich gespeichert`,
      type,
      templateLength: template.length
    });
    
  } catch (error) {
    console.error('❌ Fehler beim Speichern des E-Mail-Templates:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Speichern des E-Mail-Templates',
      error: error.message
    });
  }
});

// POST: Test-Email mit aktuellem Template versenden
router.post('/email/test-email-with-template/:type', auth, requireAdmin, async (req, res) => {
  try {
    const { type } = req.params;
    const { recipientEmail } = req.body;
    const emailConfig = await EmailConfig.getInstance();
    
    const testEmail = recipientEmail || emailConfig.adminEmail;
    if (!testEmail) {
      return res.status(400).json({
        success: false,
        message: 'Keine Test-E-Mail-Adresse verfügbar'
      });
    }
    
    const template = emailConfig.templates?.get(type);
    if (!template) {
      return res.status(404).json({
        success: false,
        message: `Template für "${type}" nicht gefunden`
      });
    }
    
    // Test-Email versenden mit Resend API
    try {
      const result = await emailService.sendWithResendFallback({
        from: emailConfig.fromEmail,
        to: testEmail,
        subject: `[TEST] ${emailConfig[type]?.subject || `Test - ${type}`}`,
        html: template
      });
      
      if (!result?.success && result?.error) {
        return res.status(400).json({
          success: false,
          message: 'Test-E-Mail konnte nicht versendet werden',
          error: result.error
        });
      }
      
      console.log(`✅ Test-Email versendet: ${type} → ${testEmail}`);
      
      res.json({
        success: true,
        message: `Test-Email für "${type}" wurde versendet an ${testEmail}`,
        result: result
      });
      
    } catch (sendError) {
      console.error('❌ Fehler beim Versenden der Test-Email:', sendError);
      res.status(400).json({
        success: false,
        message: 'Test-E-Mail konnte nicht versendet werden',
        error: sendError.message
      });
    }
    
  } catch (error) {
    console.error('❌ Fehler beim Versenden der Test-Email:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Versenden der Test-Email',
      error: error.message
    });
  }
});

module.exports = router;