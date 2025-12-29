const express = require('express');
const invoiceService = require('../../controllers/invoiceService');

const router = express.Router();

// @route   GET /api/admin/invoices
// @desc    Get all invoices with pagination and filtering
// @access  Private (Admin)
router.get('/', invoiceService.getAllInvoices);

// @route   POST /api/admin/invoices
// @desc    Create new invoice
// @access  Private (Admin)
router.post('/', invoiceService.createInvoice);

// @route   GET /api/admin/invoices/stats
// @desc    Get invoice statistics
// @access  Private (Admin)
router.get('/stats', invoiceService.getInvoiceStats);

// @route   GET /api/admin/invoices/:id
// @desc    Get invoice by ID
// @access  Private (Admin)
router.get('/:id', invoiceService.getInvoiceById);

// @route   GET /api/admin/invoices/:id/pdf
// @desc    Download invoice PDF
// @access  Private (Admin)
router.get('/:id/pdf', invoiceService.downloadInvoicePDF);

// @route   PUT /api/admin/invoices/:id
// @desc    Update invoice
// @access  Private (Admin)
router.put('/:id', invoiceService.updateInvoice);

// @route   PATCH /api/admin/invoices/:id/status
// @desc    Update invoice status
// @access  Private (Admin)
router.patch('/:id/status', invoiceService.updateInvoiceStatus);

// @route   DELETE /api/admin/invoices/:id
// @desc    Delete invoice (only drafts)
// @access  Private (Admin)
router.delete('/:id', invoiceService.deleteInvoice);

module.exports = router;