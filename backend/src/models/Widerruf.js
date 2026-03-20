const mongoose = require('mongoose');

const widerrufSchema = new mongoose.Schema(
  {
    // Kanal des Widerrufs
    channel: {
      type: String,
      enum: ['online', 'postal', 'unknown'],
      default: 'online',
      index: true
    },

    // Kundenbezug (nur bei eingeloggten Kunden)
    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true
    },

    // Kundendaten zum Zeitpunkt des Widerrufs
    customerName: {
      type: String,
      required: [true, 'Name ist erforderlich'],
      trim: true
    },
    customerEmail: {
      type: String,
      required: [true, 'E-Mail ist erforderlich'],
      trim: true,
      lowercase: true,
      match: [/^\S+@\S+\.\S+$/, 'Ungültige E-Mail-Adresse']
    },
    customerAddress: {
      type: String,
      trim: true,
      default: ''
    },

    // Vertragsidentifikation
    orderNumber: {
      type: String,
      trim: true,
      default: '',
      index: true
    },
    contractRef: {
      type: String,
      trim: true,
      default: ''
    },
    // Referenz auf die Order (falls online + eingeloggt und wir die ID haben)
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Order',
      default: null
    },

    // Umfang des Widerrufs
    itemsScope: {
      type: String,
      enum: ['whole_order', 'partial'],
      default: 'whole_order'
    },

    // Optionaler Freitext / Grund (NIEMALS Pflichtfeld)
    statementText: {
      type: String,
      trim: true,
      default: '',
      maxlength: [2000, 'Freitext darf maximal 2000 Zeichen lang sein']
    },

    // Datenschutz-Zustimmung (Pflicht)
    consentAck: {
      type: Boolean,
      required: [true, 'Zustimmung ist erforderlich'],
      validate: {
        validator: (v) => v === true,
        message: 'Zustimmung muss bestätigt werden'
      }
    },

    // Bestätigung per E-Mail wurde gesendet
    confirmationSentAt: {
      type: Date,
      default: null
    },

    // Bearbeitungsstatus
    status: {
      type: String,
      enum: ['received', 'confirmed', 'processed', 'rejected'],
      default: 'received',
      index: true
    },

    // Notizen durch Admin
    adminNote: {
      type: String,
      trim: true,
      default: ''
    },

    // Vollständige Payload für Revisionssicherheit
    rawPayload: {
      type: mongoose.Schema.Types.Mixed,
      default: null
    }
  },
  {
    timestamps: true, // createdAt, updatedAt
    collection: 'widerrufe'
  }
);

// Indizes
widerrufSchema.index({ createdAt: -1 });
widerrufSchema.index({ customerEmail: 1, createdAt: -1 });

module.exports = mongoose.model('Widerruf', widerrufSchema);
