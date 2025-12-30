const mongoose = require('mongoose');

const adminSettingsSchema = new mongoose.Schema({
  // PayPal Konfiguration
  paypal: {
    // Aktueller Modus
    mode: {
      type: String,
      enum: ['sandbox', 'live', 'disabled'],
      default: 'sandbox'
    },
    
    // Sandbox Konfiguration (deprecated - aus ENV lesen)
    sandbox: {
      clientId: {
        type: String,
        default: ''
      },
      clientSecret: {
        type: String,
        default: ''
      }
    },
    
    // Live Konfiguration (deprecated - aus ENV lesen)
    live: {
      clientId: {
        type: String,
        default: ''
      },
      clientSecret: {
        type: String,
        default: ''
      }
    }
  },
  
  // Checkout-System Konfiguration
  checkout: {
    enabled: {
      type: Boolean,
      default: true
    },
    mode: {
      type: String,
      enum: ['full', 'inquiry', 'disabled'], // full = normale Bestellung, inquiry = nur Anfragen, disabled = checkout deaktiviert
      default: 'full'
    },
    maintenanceMessage: {
      type: String,
      default: 'Checkout vorübergehend deaktiviert. Bitte kontaktieren Sie uns für Anfragen.'
    }
  },
  
  // Shop Status
  shop: {
    status: {
      type: String,
      enum: ['open', 'maintenance', 'vacation', 'closed'],
      default: 'open'
    },
    statusMessage: {
      type: String,
      default: ''
    },
    vacationMode: {
      startDate: Date,
      endDate: Date,
      autoMessage: {
        type: String,
        default: 'Wir befinden uns im Urlaubsmodus. Bestellungen werden nach unserer Rückkehr bearbeitet.'
      }
    }
  },
  
  // User Management Einstellungen
  userManagement: {
    requireEmailVerification: {
      type: Boolean,
      default: true
    },
    allowSelfRegistration: {
      type: Boolean,
      default: true
    },
    defaultUserRole: {
      type: String,
      enum: ['user', 'customer'],
      default: 'customer'
    }
  },
  
  // Metadaten
  lastUpdated: {
    type: Date,
    default: Date.now
  },
  updatedBy: {
    type: String,
    default: 'System'
  }
}, {
  timestamps: true
});

// Singleton Pattern - nur eine Konfiguration erlaubt
adminSettingsSchema.statics.getInstance = async function() {
  let settings = await this.findOne();
  if (!settings) {
    // Neue Settings mit PayPal-Konfiguration aus Environment-Variablen erstellen
    settings = new this({
      paypal: {
        mode: 'sandbox', // Default
        sandbox: {
          clientId: process.env.PAYPAL_SANDBOX_CLIENT_ID || '',
          clientSecret: process.env.PAYPAL_SANDBOX_CLIENT_SECRET || ''
        },
        live: {
          clientId: process.env.PAYPAL_LIVE_CLIENT_ID || '',
          clientSecret: process.env.PAYPAL_LIVE_CLIENT_SECRET || ''
        }
      }
    });
    await settings.save();
    console.log('✅ AdminSettings erstellt mit PayPal-Konfiguration aus Environment-Variablen');
  } else {
    // Bestehende Settings mit aktuellen ENV-Variablen aktualisieren
    let needsUpdate = false;
    
    // Sandbox-Konfiguration aktualisieren
    if (process.env.PAYPAL_SANDBOX_CLIENT_ID && settings.paypal.sandbox.clientId !== process.env.PAYPAL_SANDBOX_CLIENT_ID) {
      settings.paypal.sandbox.clientId = process.env.PAYPAL_SANDBOX_CLIENT_ID;
      needsUpdate = true;
    }
    if (process.env.PAYPAL_SANDBOX_CLIENT_SECRET && settings.paypal.sandbox.clientSecret !== process.env.PAYPAL_SANDBOX_CLIENT_SECRET) {
      settings.paypal.sandbox.clientSecret = process.env.PAYPAL_SANDBOX_CLIENT_SECRET;
      needsUpdate = true;
    }
    
    // Live-Konfiguration aktualisieren
    if (process.env.PAYPAL_LIVE_CLIENT_ID && settings.paypal.live.clientId !== process.env.PAYPAL_LIVE_CLIENT_ID) {
      settings.paypal.live.clientId = process.env.PAYPAL_LIVE_CLIENT_ID;
      needsUpdate = true;
    }
    if (process.env.PAYPAL_LIVE_CLIENT_SECRET && settings.paypal.live.clientSecret !== process.env.PAYPAL_LIVE_CLIENT_SECRET) {
      settings.paypal.live.clientSecret = process.env.PAYPAL_LIVE_CLIENT_SECRET;
      needsUpdate = true;
    }
    
    if (needsUpdate) {
      await settings.save();
      console.log('✅ AdminSettings mit aktuellen Environment-Variablen aktualisiert');
    }
  }
  return settings;
};

// Update Methode
adminSettingsSchema.methods.updateSettings = async function(updates, updatedBy = 'Admin') {
  Object.assign(this, updates);
  this.lastUpdated = new Date();
  this.updatedBy = updatedBy;
  return await this.save();
};

// PayPal Konfiguration abrufen
adminSettingsSchema.methods.getPayPalConfig = function() {
  const mode = this.paypal.mode;
  
  if (mode === 'disabled') {
    return { enabled: false };
  }
  
  const config = mode === 'live' ? this.paypal.live : this.paypal.sandbox;
  
  return {
    enabled: true,
    mode: mode,
    clientId: config.clientId,
    clientSecret: config.clientSecret,
    baseUrl: mode === 'live' 
      ? 'https://api.paypal.com' 
      : 'https://api.sandbox.paypal.com'
  };
};

module.exports = mongoose.model('AdminSettings', adminSettingsSchema);