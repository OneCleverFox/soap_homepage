const express = require('express');
const router = express.Router();
const invoiceController = require('../controllers/invoiceController');
const auth = require('../middleware/auth');

// Alle Routen benötigen Admin-Authentifizierung
router.use(auth.authenticateToken);
router.use(auth.requireAdmin);

// Template-Verwaltung
router.get('/templates', invoiceController.getAllTemplates);
router.get('/templates/default', invoiceController.getDefaultTemplate);
router.post('/templates', invoiceController.createTemplate);
router.put('/templates/:id', invoiceController.updateTemplate);
router.put('/templates/:id/set-default', invoiceController.setDefaultTemplate);
router.delete('/templates/:id', invoiceController.deleteTemplate);

// Vorschau und Variablen
router.post('/preview', invoiceController.generatePreview);
router.get('/variables', invoiceController.getAvailableVariables);

module.exports = router;