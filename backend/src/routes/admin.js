const express = require('express');
const {
  getAllData,
  createProduct,
  updateProduct,
  deleteProduct,
  updateOrderStatus
} = require('../controllers/adminController');
const { auth, requireAdmin } = require('../middleware/auth');

const router = express.Router();

// Alle Routen erfordern Admin-Authentifizierung
router.use(auth);
router.use(requireAdmin);

// @route   GET /api/admin/data
// @desc    Alle Daten abrufen (Dashboard)
// @access  Private (Admin)
router.get('/data', getAllData);

// Produkt-Management
// @route   POST /api/admin/products
// @desc    Neues Produkt erstellen
// @access  Private (Admin)
router.post('/products', createProduct);

// @route   PUT /api/admin/products/:id
// @desc    Produkt aktualisieren
// @access  Private (Admin)
router.put('/products/:id', updateProduct);

// @route   DELETE /api/admin/products/:id
// @desc    Produkt löschen
// @access  Private (Admin)
router.delete('/products/:id', deleteProduct);

// Bestellungs-Management
// @route   PUT /api/admin/orders/:id
// @desc    Bestellstatus aktualisieren
// @access  Private (Admin)
router.put('/orders/:id', updateOrderStatus);

module.exports = router;