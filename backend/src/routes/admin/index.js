const express = require('express');
const { auth, requireAdmin } = require('../../middleware/auth');

// Import aller Admin-Module
const portfolioRoutes = require('./portfolio');
const productsRoutes = require('./products');
const invoiceRoutes = require('./invoice');
const invoicesRoutes = require('./invoices');
const emailRoutes = require('./email');
const kundenRoutes = require('./kunden');
const usersRoutes = require('./users');
const rohstoffeRoutes = require('./rohstoffe');
const documentsRoutes = require('./documents');

const router = express.Router();

// Globale Admin-Authentifizierung
router.use([auth, requireAdmin]);

// Route-Module einbinden
router.use('/portfolio', portfolioRoutes);
router.use('/', productsRoutes); // Für /data, /products, /orders, /cart
router.use('/invoice', invoiceRoutes);
router.use('/invoices', invoicesRoutes);
router.use('/email', emailRoutes); // Für /email-config, /email-templates
router.use('/kunden', kundenRoutes);
router.use('/users', usersRoutes);
router.use('/rohstoffe', rohstoffeRoutes);
router.use('/documents', documentsRoutes);

// Legacy-Kompatibilität für E-Mail-Konfiguration
router.use('/email-config', emailRoutes); // Direkte Weiterleitung 
router.use('/email-templates', emailRoutes);

module.exports = router;