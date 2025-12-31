const express = require('express');
const multer = require('multer');
const path = require('path');
const invoiceController = require('../../controllers/invoiceController');

// Multer-Konfiguration für Logo-Upload
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '../../uploads/logos'));
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'logo-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 2 * 1024 * 1024 // 2MB Limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Nur Bilddateien sind erlaubt'));
    }
  }
});

const router = express.Router();

// @route   GET /api/admin/invoice/templates
// @desc    Get all invoice templates
// @access  Private (Admin)
router.get('/templates', invoiceController.getAllTemplates);

// @route   POST /api/admin/invoice/templates
// @desc    Create new invoice template
// @access  Private (Admin)
router.post('/templates', invoiceController.createTemplate);

// @route   PUT /api/admin/invoice/templates/:id
// @desc    Update invoice template
// @access  Private (Admin)
router.put('/templates/:id', invoiceController.updateTemplate);

// @route   DELETE /api/admin/invoice/templates/:id
// @desc    Delete invoice template
// @access  Private (Admin)
router.delete('/templates/:id', invoiceController.deleteTemplate);

// @route   POST /api/admin/invoice/templates/:id/activate
// @desc    Activate invoice template
// @access  Private (Admin)
router.post('/templates/:id/activate', invoiceController.setDefaultTemplate);

// @route   POST /api/admin/invoice/preview
// @desc    Preview invoice template
// @access  Private (Admin)
router.post('/preview', (req, res) => invoiceController.generatePreview(req, res));

// @route   GET /api/admin/invoice/variables
// @desc    Get available variables for invoice
// @access  Private (Admin)
router.get('/variables', (req, res) => invoiceController.getAvailableVariables(req, res));

// @route   GET /api/admin/invoice/company-info
// @desc    Get company information from default template
// @access  Public
router.get('/company-info', (req, res) => invoiceController.getCompanyInfo(req, res));

// @route   POST /api/admin/invoice/upload-logo
// @desc    Upload company logo
// @access  Private (Admin)
router.post('/upload-logo', upload.single('logo'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Keine Datei hochgeladen'
      });
    }

    const logoUrl = `/uploads/logos/${req.file.filename}`;
    
    res.json({
      success: true,
      message: 'Logo erfolgreich hochgeladen',
      logoUrl: logoUrl
    });
  } catch (error) {
    console.error('Logo-Upload Fehler:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Upload des Logos'
    });
  }
});

// @route   POST /api/admin/invoice/generate/:orderId
// @desc    Generate invoice for order
// @access  Private (Admin)
// router.post('/generate/:orderId', (req, res) => invoiceController.generateInvoiceForOrder(req, res));

// @route   POST /api/admin/invoice/send/:orderId
// @desc    Send invoice email for order
// @access  Private (Admin)
// router.post('/send/:orderId', (req, res) => invoiceController.sendInvoiceForOrder(req, res));

// @route   GET /api/admin/invoice/download/:orderId
// @desc    Download invoice PDF for order
// @access  Private (Admin)
// router.get('/download/:orderId', (req, res) => invoiceController.downloadInvoiceForOrder(req, res));

module.exports = router;