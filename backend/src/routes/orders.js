const express = require('express');
const router = express.Router();
const Order = require('../models/Order');
const Product = require('../models/Product');
const { auth, checkPermission } = require('../middleware/auth');
const { validateOrder, validateId, validatePagination } = require('../middleware/validation');

// @route   POST /api/orders
// @desc    Neue Bestellung erstellen
// @access  Public
router.post('/', validateOrder, async (req, res) => {
  try {
    const orderData = req.body;
    
    // Produkte und Preise validieren
    for (const item of orderData.items) {
      const product = await Product.findById(item.product);
      
      if (!product) {
        return res.status(400).json({
          success: false,
          message: `Produkt mit ID ${item.product} nicht gefunden`
        });
      }
      
      if (!product.isActive) {
        return res.status(400).json({
          success: false,
          message: `Produkt "${product.name}" ist nicht verfügbar`
        });
      }
      
      if (product.stock.quantity < item.quantity) {
        return res.status(400).json({
          success: false,
          message: `Nicht genügend Lagerbestand für "${product.name}". Verfügbar: ${product.stock.quantity}`
        });
      }
      
      // Aktuellen Preis setzen
      item.price = product.price;
      
      // Produkt-Snapshot für historische Zwecke
      item.productSnapshot = {
        name: product.name,
        description: product.shortDescription || product.description.substring(0, 200),
        category: product.category,
        image: product.images.find(img => img.isPrimary)?.url || product.images[0]?.url
      };
    }
    
    // Preise berechnen
    const subtotal = orderData.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const shippingCost = subtotal >= 50 ? 0 : 4.99; // Kostenloser Versand ab 50€
    const taxRate = 0.19; // 19% MwSt
    const taxAmount = subtotal * taxRate;
    const total = subtotal + shippingCost + taxAmount;
    
    orderData.pricing = {
      subtotal,
      shippingCost,
      taxAmount,
      discount: orderData.pricing?.discount || { amount: 0 },
      total: total - (orderData.pricing?.discount?.amount || 0)
    };
    
    // Bestellung erstellen
    const order = new Order(orderData);
    await order.save();
    
    // Lagerbestand reduzieren
    for (const item of orderData.items) {
      await Product.findByIdAndUpdate(
        item.product,
        { $inc: { 'stock.quantity': -item.quantity, salesCount: item.quantity } }
      );
    }
    
    res.status(201).json({
      success: true,
      message: 'Bestellung erfolgreich erstellt',
      data: {
        orderNumber: order.orderNumber,
        total: order.pricing.total,
        status: order.status
      }
    });
    
  } catch (error) {
    console.error('Fehler beim Erstellen der Bestellung:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Erstellen der Bestellung',
      error: error.message
    });
  }
});

// @route   GET /api/orders
// @desc    Alle Bestellungen abrufen (Admin)
// @access  Private (orders.read)
router.get('/', auth, checkPermission('orders.read'), validatePagination, async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      status,
      startDate,
      endDate,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    // Filter aufbauen
    const filter = {};
    
    if (status) {
      filter.status = status;
    }
    
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) filter.createdAt.$lte = new Date(endDate);
    }

    // Sortierung
    const sort = {};
    sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

    // Paginierung
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Bestellungen abrufen
    const orders = await Order.find(filter)
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit))
      .populate('items.product', 'name images')
      .select('-__v');

    const total = await Order.countDocuments(filter);
    const totalPages = Math.ceil(total / parseInt(limit));

    res.json({
      success: true,
      data: {
        orders,
        pagination: {
          currentPage: parseInt(page),
          totalPages,
          totalItems: total,
          itemsPerPage: parseInt(limit),
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1
        }
      }
    });
    
  } catch (error) {
    console.error('Fehler beim Abrufen der Bestellungen:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Abrufen der Bestellungen',
      error: error.message
    });
  }
});

// @route   GET /api/orders/:id
// @desc    Einzelne Bestellung abrufen
// @access  Private (orders.read)
router.get('/:id', auth, checkPermission('orders.read'), validateId, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate('items.product', 'name images category')
      .select('-__v');
    
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Bestellung nicht gefunden'
      });
    }

    res.json({
      success: true,
      data: order
    });
    
  } catch (error) {
    console.error('Fehler beim Abrufen der Bestellung:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Abrufen der Bestellung',
      error: error.message
    });
  }
});

// @route   PUT /api/orders/:id/status
// @desc    Bestellstatus aktualisieren
// @access  Private (orders.write)
router.put('/:id/status', auth, checkPermission('orders.write'), validateId, async (req, res) => {
  try {
    const { status, note } = req.body;
    
    const validStatuses = ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded'];
    
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Ungültiger Status'
      });
    }
    
    const order = await Order.findById(req.params.id);
    
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Bestellung nicht gefunden'
      });
    }
    
    await order.updateStatus(status, note, req.user.username);
    
    res.json({
      success: true,
      message: 'Bestellstatus erfolgreich aktualisiert',
      data: {
        orderNumber: order.orderNumber,
        status: order.status
      }
    });
    
  } catch (error) {
    console.error('Fehler beim Aktualisieren des Bestellstatus:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Aktualisieren des Bestellstatus',
      error: error.message
    });
  }
});

// @route   GET /api/orders/public/:orderNumber
// @desc    Bestellung öffentlich per Bestellnummer abrufen
// @access  Public
router.get('/public/:orderNumber', async (req, res) => {
  try {
    const { orderNumber } = req.params;
    const { email } = req.query;
    
    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'E-Mail-Adresse erforderlich'
      });
    }
    
    const order = await Order.findOne({
      orderNumber,
      'customer.email': email.toLowerCase()
    })
    .populate('items.product', 'name images')
    .select('orderNumber status items pricing createdAt shipping customer.firstName customer.lastName');
    
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Bestellung nicht gefunden oder E-Mail stimmt nicht überein'
      });
    }

    res.json({
      success: true,
      data: order
    });
    
  } catch (error) {
    console.error('Fehler beim Abrufen der öffentlichen Bestellung:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Abrufen der Bestellung',
      error: error.message
    });
  }
});

module.exports = router;