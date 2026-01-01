const mongoose = require('mongoose');

// MongoDB Schema für ausgehende E-Mails
const emailOutSchema = new mongoose.Schema({
  // E-Mail Identifikation
  messageId: {
    type: String,
    index: true
  },
  
  // E-Mail Kategorien
  emailType: {
    type: String,
    required: true,
    enum: [
      'password_reset',
      'email_verification', 
      'welcome_email',
      'profile_update_notification',
      'account_deletion_confirmation',
      'order_confirmation',
      'order_rejection',
      'order_status_update',
      'newsletter',
      'promotional',
      'system_notification',
      'invoice'
    ],
    index: true
  },
  
  // Empfänger Informationen
  recipient: {
    email: {
      type: String,
      required: true,
      index: true
    },
    name: String,
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      index: true
    },
    kundeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Kunde',
      index: true
    }
  },
  
  // Absender Informationen
  sender: {
    email: {
      type: String,
      required: true
    },
    name: String
  },
  
  // E-Mail Inhalt
  content: {
    subject: {
      type: String,
      required: true
    },
    htmlBody: String,
    textBody: String,
    attachments: [{
      filename: String,
      contentType: String,
      size: Number
    }]
  },
  
  // Versand Informationen
  delivery: {
    status: {
      type: String,
      enum: ['pending', 'sent', 'delivered', 'failed', 'bounced'],
      default: 'pending',
      index: true
    },
    sentAt: Date,
    deliveredAt: Date,
    failedAt: Date,
    attempts: {
      type: Number,
      default: 0
    },
    lastAttemptAt: Date,
    errorMessage: String,
    provider: {
      type: String,
      enum: ['resend', 'sendgrid', 'ses', 'smtp'],
      default: 'resend'
    },
    providerMessageId: String,
    providerResponse: mongoose.Schema.Types.Mixed
  },
  
  // Kontext Daten (spezifisch für E-Mail-Typ)
  contextData: {
    // Für password_reset
    resetToken: String,
    resetUrl: String,
    resetExpiresAt: Date,
    
    // Für email_verification
    verificationToken: String,
    verificationUrl: String,
    verificationExpiresAt: Date,
    
    // Für profile_update_notification
    changedFields: [String],
    
    // Für order_confirmation
    orderId: String,
    orderNumber: String,
    totalAmount: Number,
    
    // Allgemeine Daten
    metadata: mongoose.Schema.Types.Mixed
  },
  
  // Tracking Informationen
  tracking: {
    opened: {
      type: Boolean,
      default: false
    },
    openedAt: Date,
    openCount: {
      type: Number,
      default: 0
    },
    clicked: {
      type: Boolean,
      default: false
    },
    clickedAt: Date,
    clickCount: {
      type: Number,
      default: 0
    },
    unsubscribed: {
      type: Boolean,
      default: false
    },
    unsubscribedAt: Date
  },
  
  // Environment & System
  environment: {
    type: String,
    enum: ['development', 'staging', 'production'],
    required: true,
    index: true
  },
  
  // System Informationen
  system: {
    // DSGVO-HINWEIS: IP-Adressen dürfen nur anonymisiert gespeichert werden!
    // Verwende IPAnonymizer.anonymizeIP() vor dem Speichern
    ipAddress: String,
    // DSGVO-HINWEIS: User-Agent kann zur Profilierung verwendet werden - nur wenn notwendig speichern
    userAgent: String,
    sourceApplication: {
      type: String,
      default: 'soap_homepage'
    },
    version: String
  }
  
}, {
  timestamps: true, // createdAt, updatedAt
  collection: 'email_out'
});

// Indizes für Performance
emailOutSchema.index({ 'recipient.email': 1, emailType: 1 });
emailOutSchema.index({ createdAt: -1 });
emailOutSchema.index({ 'delivery.status': 1, createdAt: -1 });
emailOutSchema.index({ emailType: 1, createdAt: -1 });
emailOutSchema.index({ environment: 1, 'delivery.status': 1 });

// Virtuelle Felder
emailOutSchema.virtual('isSuccessful').get(function() {
  return ['sent', 'delivered'].includes(this.delivery.status);
});

emailOutSchema.virtual('isFailed').get(function() {
  return ['failed', 'bounced'].includes(this.delivery.status);
});

// Methoden
emailOutSchema.methods.markAsSent = function(providerResponse) {
  this.delivery.status = 'sent';
  this.delivery.sentAt = new Date();
  this.delivery.providerResponse = providerResponse;
  this.delivery.providerMessageId = providerResponse?.data?.id || providerResponse?.id;
  return this.save();
};

emailOutSchema.methods.markAsDelivered = function() {
  this.delivery.status = 'delivered';
  this.delivery.deliveredAt = new Date();
  return this.save();
};

emailOutSchema.methods.markAsFailed = function(errorMessage, providerResponse = null) {
  this.delivery.status = 'failed';
  this.delivery.failedAt = new Date();
  this.delivery.errorMessage = errorMessage;
  if (providerResponse) {
    this.delivery.providerResponse = providerResponse;
  }
  this.delivery.attempts += 1;
  this.delivery.lastAttemptAt = new Date();
  return this.save();
};

// Statische Methoden
emailOutSchema.statics.findByRecipient = function(email) {
  return this.find({ 'recipient.email': email }).sort({ createdAt: -1 });
};

emailOutSchema.statics.findByType = function(emailType, limit = 50) {
  return this.find({ emailType }).sort({ createdAt: -1 }).limit(limit);
};

emailOutSchema.statics.getStatsByType = function() {
  return this.aggregate([
    {
      $group: {
        _id: {
          emailType: '$emailType',
          status: '$delivery.status'
        },
        count: { $sum: 1 }
      }
    },
    {
      $group: {
        _id: '$_id.emailType',
        statusCounts: {
          $push: {
            status: '$_id.status',
            count: '$count'
          }
        },
        totalCount: { $sum: '$count' }
      }
    }
  ]);
};

module.exports = mongoose.model('EmailOut', emailOutSchema);