const mongoose = require('mongoose');
const crypto = require('crypto');

const AdminDocumentSchema = new mongoose.Schema(
  {
    document_id: {
      type: String,
      unique: true,
      default: () => crypto.randomUUID()
    },
    document_type: {
      type: String,
      required: true,
      index: true
    },
    title: {
      type: String,
      required: true,
      trim: true
    },
    version: {
      type: String,
      required: true,
      default: '1.0'
    },
    status: {
      type: String,
      enum: ['blanko', 'filled'],
      required: true,
      index: true
    },
    content_json: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    },
    rendered_html: {
      type: String,
      default: ''
    },
    rendered_pdf_url: {
      type: String,
      default: ''
    },
    applicable_product_groups: {
      type: [String],
      enum: ['seife', 'werkstuck', 'schmuck', 'kosmetik'],
      default: ['seife', 'werkstuck', 'schmuck']
    },
    applicability_note: {
      type: String,
      default: ''
    },
    created_by: {
      type: String,
      required: true,
      index: true
    },
    is_template: {
      type: Boolean,
      default: false,
      index: true
    },
    is_editable: {
      type: Boolean,
      default: true
    },
    base_template_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'AdminDocument',
      default: null
    }
  },
  {
    timestamps: {
      createdAt: 'created_at',
      updatedAt: 'updated_at'
    }
  }
);

AdminDocumentSchema.index({ document_type: 1, status: 1, created_at: -1 });
AdminDocumentSchema.index({ status: 1, updated_at: -1 });
AdminDocumentSchema.index({ status: 1, applicable_product_groups: 1, updated_at: -1 });

module.exports = mongoose.model('AdminDocument', AdminDocumentSchema, 'admin_documents');