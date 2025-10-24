const express = require('express');
const router = express.Router();
const AdminSettings = require('../models/AdminSettings');
const { auth } = require('../middleware/auth');

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
      checkout: settings.checkout,
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
        if (typeof updates.enabled === 'boolean') settings.checkout.enabled = updates.enabled;
        if (updates.mode && ['full', 'inquiry', 'disabled'].includes(updates.mode)) {
          settings.checkout.mode = updates.mode;
        }
        if (updates.maintenanceMessage !== undefined) settings.checkout.maintenanceMessage = updates.maintenanceMessage;
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

module.exports = router;