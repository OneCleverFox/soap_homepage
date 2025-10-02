const express = require('express');
const router = express.Router();
const {
  getProducts,
  getProduct,
  createProduct,
  updateProduct,
  deleteProduct,
  getFeaturedProducts,
  updateStock,
  getLowStockProducts,
  getCategories
} = require('../controllers/productController');
const { auth, checkPermission } = require('../middleware/auth');
const { validateProduct, validateId, validatePagination, validateSearch } = require('../middleware/validation');

// Öffentliche Routes (für Frontend/Shop)
// @route   GET /api/products
// @desc    Alle Produkte abrufen (mit Filter und Paginierung)
// @access  Public
router.get('/', validatePagination, validateSearch, getProducts);

// @route   GET /api/products/featured
// @desc    Featured Produkte abrufen
// @access  Public
router.get('/featured', getFeaturedProducts);

// @route   GET /api/products/categories
// @desc    Produktkategorien abrufen
// @access  Public
router.get('/categories', getCategories);

// @route   GET /api/products/:id
// @desc    Einzelnes Produkt abrufen
// @access  Public
router.get('/:id', validateId, getProduct);

// Private Routes (für Admin-Bereich)
// @route   POST /api/products
// @desc    Neues Produkt erstellen
// @access  Private (products.write)
router.post('/', auth, checkPermission('products.write'), validateProduct, createProduct);

// @route   PUT /api/products/:id
// @desc    Produkt aktualisieren
// @access  Private (products.write)
router.put('/:id', auth, checkPermission('products.write'), validateId, validateProduct, updateProduct);

// @route   DELETE /api/products/:id
// @desc    Produkt löschen (deaktivieren)
// @access  Private (products.delete)
router.delete('/:id', auth, checkPermission('products.delete'), validateId, deleteProduct);

// @route   PUT /api/products/:id/stock
// @desc    Lagerbestand aktualisieren
// @access  Private (inventory.write)
router.put('/:id/stock', auth, checkPermission('inventory.write'), validateId, updateStock);

// @route   GET /api/products/admin/low-stock
// @desc    Produkte mit niedrigem Lagerbestand
// @access  Private (inventory.read)
router.get('/admin/low-stock', auth, checkPermission('inventory.read'), getLowStockProducts);

module.exports = router;