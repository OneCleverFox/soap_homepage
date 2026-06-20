const mongoose = require('mongoose');

const emailConfigSchema = new mongoose.Schema({
  // Global Email Settings
  emailEnabled: {
    type: Boolean,
    default: true,
    description: 'Hauptschalter für E-Mail-Versand'
  },
  fromEmail: {
    type: String,
    default: 'info.gluecksmomente.manufaktur@gmail.com',
    description: 'Absender-E-Mail-Adresse'
  },
  fromName: {
    type: String,
    default: 'Gluecksmomente Manufaktur',
    description: 'Absender-Name'
  },
  replyToEmail: {
    type: String,
    description: 'Reply-To E-Mail-Adresse'
  },
  adminEmail: {
    type: String,
    description: 'Admin Kontakt-E-Mail'
  },

  // Email Type Configurations
  verification: {
    enabled: { type: Boolean, default: true },
    subject: { type: String, default: 'E-Mail-Verifizierung erforderlich' },
    trigger: { type: String, default: 'user_registration' }
  },
  welcome: {
    enabled: { type: Boolean, default: true },
    subject: { type: String, default: 'Willkommen bei Gluecksmomente!' },
    trigger: { type: String, default: 'email_verified' }
  },
  passwordreset: {
    enabled: { type: Boolean, default: true },
    subject: { type: String, default: 'Passwort zurücksetzen' },
    trigger: { type: String, default: 'manual' }
  },
  passwordchanged: {
    enabled: { type: Boolean, default: true },
    subject: { type: String, default: 'Passwort wurde geändert' },
    trigger: { type: String, default: 'manual' }
  },
  orderconfirmation: {
    enabled: { type: Boolean, default: true },
    subject: { type: String, default: 'Bestellbestätigung' },
    trigger: { type: String, default: 'manual' }
  },
  orderrejection: {
    enabled: { type: Boolean, default: true },
    subject: { type: String, default: 'Bestellung nicht verarbeitet' },
    trigger: { type: String, default: 'manual' }
  },
  adminordernotification: {
    enabled: { type: Boolean, default: true },
    subject: { type: String, default: 'Neue Bestellung eingegangen' },
    trigger: { type: String, default: 'manual' }
  },
  admininquirynotification: {
    enabled: { type: Boolean, default: true },
    subject: { type: String, default: 'Neue Kundenanfrage' },
    trigger: { type: String, default: 'manual' }
  },

  // Email Templates (als Raw HTML)
  templates: {
    type: Map,
    of: String,
    default: new Map(),
    description: 'Gespeicherte HTML-Templates für E-Mail-Typen'
  },

  // Metadata
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
  updatedBy: { type: String, description: 'Admin, der die Einstellungen zuletzt aktualisiert hat' }
});

// Singleton Pattern - nur eine EmailConfig sollte existieren
emailConfigSchema.statics.getInstance = async function() {
  let config = await this.findOne();
  if (!config) {
    config = new this();
    await config.save();
  }
  return config;
};

// Pre-save Hook
emailConfigSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('EmailConfig', emailConfigSchema);
