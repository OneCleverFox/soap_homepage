const mongoose = require('mongoose');

const serviceLeistungSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120
    },
    description: {
      type: String,
      trim: true,
      default: ''
    },
    sku: {
      type: String,
      trim: true,
      uppercase: true,
      default: ''
    },
    serviceType: {
      type: String,
      // Legacy-Werte bleiben erlaubt, werden aber beim Speichern auf 'standard' normalisiert.
      enum: ['standard', 'service', 'leistung', 'geschenkservice', 'plotterarbeiten'],
      default: 'standard'
    },
    unit: {
      type: String,
      trim: true,
      default: 'Stück'
    },
    defaultPrice: {
      type: Number,
      required: true,
      min: 0,
      default: 0
    },
    taxRate: {
      type: Number,
      min: 0,
      max: 100,
      default: 19
    },
    invoiceNote: {
      type: String,
      trim: true,
      default: ''
    },
    plotterBasePricePerSqm: {
      type: Number,
      min: 0,
      default: 0
    },
    plotterMaterialCostPerSqm: {
      type: Number,
      min: 0,
      default: 0
    },
    plotterLaborCostPerSqm: {
      type: Number,
      min: 0,
      default: 0
    },
    plotterOverheadFactor: {
      type: Number,
      min: 0,
      default: 3
    },
    plotterMinimumPrice: {
      type: Number,
      min: 0,
      default: 0
    },
    sizeProfiles: [
      {
        label: {
          type: String,
          trim: true,
          required: true
        },
        widthCm: {
          type: Number,
          min: 0,
          required: true
        },
        heightCm: {
          type: Number,
          min: 0,
          required: true
        },
        salePrice: {
          type: Number,
          min: 0,
          required: true
        },
        materialCost: {
          type: Number,
          min: 0,
          default: 0
        },
        laborCost: {
          type: Number,
          min: 0,
          default: 0
        },
        isDefault: {
          type: Boolean,
          default: false
        }
      }
    ],
    sortOrder: {
      type: Number,
      default: 0
    },
    isActive: {
      type: Boolean,
      default: true
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  },
  {
    timestamps: true
  }
);

serviceLeistungSchema.index({ name: 1 });
serviceLeistungSchema.index({ sku: 1 });
serviceLeistungSchema.index({ isActive: 1, sortOrder: 1, name: 1 });

module.exports = mongoose.model('ServiceLeistung', serviceLeistungSchema);
