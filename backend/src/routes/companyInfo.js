const express = require('express');
const InvoiceTemplate = require('../models/InvoiceTemplate');

const router = express.Router();

// @route   GET /api/company-info
// @desc    Get public company information from default invoice template
// @access  Public
router.get('/', async (req, res) => {
  try {
    // Hole das Standard-Template mit den Firmendaten
    let template = await InvoiceTemplate.findOne({ isDefault: true });
    
    if (!template) {
      // Falls kein Default-Template existiert, nimm das erste verfügbare
      template = await InvoiceTemplate.findOne().sort({ createdAt: -1 });
    }
    
    if (!template) {
      return res.status(404).json({
        success: false,
        message: 'Keine Firmendaten gefunden'
      });
    }

    // Extrahiere nur öffentliche Firmendaten (keine sensiblen Daten)
    const companyInfo = {
      name: template.companyInfo.name,
      address: template.companyInfo.address,
      contact: {
        phone: template.companyInfo.contact.phone,
        email: template.companyInfo.contact.email,
        website: template.companyInfo.contact.website
      },
      // Nur für Rechnungslegung relevante USt-IdNr, keine Steuernummer
      vatId: template.companyInfo.taxInfo.vatId,
      ceo: template.companyInfo.taxInfo.ceo,
      legalForm: template.companyInfo.taxInfo.legalForm
    };

    res.json({
      success: true,
      data: companyInfo
    });

  } catch (error) {
    console.error('Fehler beim Abrufen der Firmendaten:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Abrufen der Firmendaten',
      error: error.message
    });
  }
});

module.exports = router;