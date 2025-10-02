const express = require('express');
const router = express.Router();
const Product = require('../models/Product');
const Order = require('../models/Order');
const { auth, checkPermission } = require('../middleware/auth');

// @route   GET /api/inventory/overview
// @desc    Lagerbestand-Übersicht
// @access  Private (inventory.read)
router.get('/overview', auth, checkPermission('inventory.read'), async (req, res) => {
  try {
    // Gesamtstatistiken
    const totalProducts = await Product.countDocuments({ isActive: true });
    const inStockProducts = await Product.countDocuments({ 
      isActive: true, 
      'stock.quantity': { $gt: 0 } 
    });
    const outOfStockProducts = await Product.countDocuments({ 
      isActive: true, 
      'stock.quantity': 0 
    });
    const lowStockProducts = await Product.countDocuments({
      isActive: true,
      $expr: { 
        $and: [
          { $gt: ['$stock.quantity', 0] },
          { $lte: ['$stock.quantity', '$stock.lowStockThreshold'] }
        ]
      }
    });

    // Gesamtwert des Lagerbestands
    const inventoryValue = await Product.aggregate([
      { $match: { isActive: true } },
      { 
        $group: { 
          _id: null, 
          totalValue: { 
            $sum: { $multiply: ['$price', '$stock.quantity'] } 
          },
          totalQuantity: { $sum: '$stock.quantity' }
        } 
      }
    ]);

    // Kategoriestatistiken
    const categoryStats = await Product.aggregate([
      { $match: { isActive: true } },
      {
        $group: {
          _id: '$category',
          totalProducts: { $sum: 1 },
          totalQuantity: { $sum: '$stock.quantity' },
          totalValue: { $sum: { $multiply: ['$price', '$stock.quantity'] } },
          inStock: {
            $sum: {
              $cond: [{ $gt: ['$stock.quantity', 0] }, 1, 0]
            }
          },
          lowStock: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $gt: ['$stock.quantity', 0] },
                    { $lte: ['$stock.quantity', '$stock.lowStockThreshold'] }
                  ]
                },
                1,
                0
              ]
            }
          }
        }
      },
      { $sort: { totalValue: -1 } }
    ]);

    res.json({
      success: true,
      data: {
        overview: {
          totalProducts,
          inStockProducts,
          outOfStockProducts,
          lowStockProducts,
          totalValue: inventoryValue[0]?.totalValue || 0,
          totalQuantity: inventoryValue[0]?.totalQuantity || 0
        },
        categoryStats
      }
    });

  } catch (error) {
    console.error('Fehler beim Abrufen der Lagerbestand-Übersicht:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Abrufen der Lagerbestand-Übersicht',
      error: error.message
    });
  }
});

// @route   GET /api/inventory/low-stock
// @desc    Produkte mit niedrigem Lagerbestand
// @access  Private (inventory.read)
router.get('/low-stock', auth, checkPermission('inventory.read'), async (req, res) => {
  try {
    const products = await Product.find({
      isActive: true,
      $expr: { 
        $and: [
          { $gt: ['$stock.quantity', 0] },
          { $lte: ['$stock.quantity', '$stock.lowStockThreshold'] }
        ]
      }
    })
    .sort({ 'stock.quantity': 1 })
    .select('name category stock price images');

    res.json({
      success: true,
      data: products
    });

  } catch (error) {
    console.error('Fehler beim Abrufen der Produkte mit niedrigem Lagerbestand:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Abrufen der Produkte mit niedrigem Lagerbestand',
      error: error.message
    });
  }
});

// @route   GET /api/inventory/out-of-stock
// @desc    Produkte ohne Lagerbestand
// @access  Private (inventory.read)
router.get('/out-of-stock', auth, checkPermission('inventory.read'), async (req, res) => {
  try {
    const products = await Product.find({
      isActive: true,
      'stock.quantity': 0
    })
    .sort({ updatedAt: -1 })
    .select('name category stock price images salesCount');

    res.json({
      success: true,
      data: products
    });

  } catch (error) {
    console.error('Fehler beim Abrufen der Produkte ohne Lagerbestand:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Abrufen der Produkte ohne Lagerbestand',
      error: error.message
    });
  }
});

// @route   POST /api/inventory/restock
// @desc    Lagerbestand auffüllen
// @access  Private (inventory.write)
router.post('/restock', auth, checkPermission('inventory.write'), async (req, res) => {
  try {
    const { productId, quantity, note } = req.body;

    if (!productId || !quantity || quantity <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Produkt-ID und positive Menge erforderlich'
      });
    }

    const product = await Product.findById(productId);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Produkt nicht gefunden'
      });
    }

    const oldQuantity = product.stock.quantity;
    product.stock.quantity += parseInt(quantity);
    await product.save();

    // Log der Lagerbestand-Änderung (könnte in separates Model)
    const logEntry = {
      productId: product._id,
      productName: product.name,
      action: 'restock',
      oldQuantity,
      newQuantity: product.stock.quantity,
      quantityChange: parseInt(quantity),
      note,
      user: req.user.username,
      timestamp: new Date()
    };

    // Hier würde normalerweise ein InventoryLog Model verwendet
    console.log('Lagerbestand-Log:', logEntry);

    res.json({
      success: true,
      message: 'Lagerbestand erfolgreich aufgefüllt',
      data: {
        productId: product._id,
        productName: product.name,
        oldQuantity,
        newQuantity: product.stock.quantity,
        quantityAdded: parseInt(quantity)
      }
    });

  } catch (error) {
    console.error('Fehler beim Auffüllen des Lagerbestands:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Auffüllen des Lagerbestands',
      error: error.message
    });
  }
});

// @route   GET /api/inventory/movements
// @desc    Lagerbestand-Bewegungen (vereinfacht)
// @access  Private (inventory.read)
router.get('/movements', auth, checkPermission('inventory.read'), async (req, res) => {
  try {
    const { startDate, endDate, productId } = req.query;

    // Vereinfachte Bewegungen basierend auf Bestellungen
    const matchStage = {};
    
    if (startDate || endDate) {
      matchStage.createdAt = {};
      if (startDate) matchStage.createdAt.$gte = new Date(startDate);
      if (endDate) matchStage.createdAt.$lte = new Date(endDate);
    }

    let pipeline = [
      { $match: matchStage },
      { $unwind: '$items' },
      {
        $lookup: {
          from: 'products',
          localField: 'items.product',
          foreignField: '_id',
          as: 'productInfo'
        }
      },
      { $unwind: '$productInfo' },
      {
        $project: {
          orderNumber: 1,
          productId: '$items.product',
          productName: '$productInfo.name',
          quantity: '$items.quantity',
          type: 'sale',
          status: 1,
          createdAt: 1
        }
      }
    ];

    if (productId) {
      pipeline.splice(1, 0, { 
        $match: { 'items.product': mongoose.Types.ObjectId(productId) } 
      });
    }

    pipeline.push({ $sort: { createdAt: -1 } });
    pipeline.push({ $limit: 100 });

    const movements = await Order.aggregate(pipeline);

    res.json({
      success: true,
      data: movements
    });

  } catch (error) {
    console.error('Fehler beim Abrufen der Lagerbestand-Bewegungen:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Abrufen der Lagerbestand-Bewegungen',
      error: error.message
    });
  }
});

// @route   GET /api/inventory/analytics
// @desc    Lagerbestand-Analytik
// @access  Private (analytics.read)
router.get('/analytics', auth, checkPermission('analytics.read'), async (req, res) => {
  try {
    const { period = '30' } = req.query;
    const days = parseInt(period);
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Top verkaufte Produkte
    const topProducts = await Order.aggregate([
      { $match: { createdAt: { $gte: startDate } } },
      { $unwind: '$items' },
      {
        $group: {
          _id: '$items.product',
          totalSold: { $sum: '$items.quantity' },
          totalRevenue: { $sum: { $multiply: ['$items.quantity', '$items.price'] } }
        }
      },
      {
        $lookup: {
          from: 'products',
          localField: '_id',
          foreignField: '_id',
          as: 'product'
        }
      },
      { $unwind: '$product' },
      {
        $project: {
          productName: '$product.name',
          category: '$product.category',
          currentStock: '$product.stock.quantity',
          totalSold: 1,
          totalRevenue: 1
        }
      },
      { $sort: { totalSold: -1 } },
      { $limit: 10 }
    ]);

    // Kategorie-Performance
    const categoryPerformance = await Order.aggregate([
      { $match: { createdAt: { $gte: startDate } } },
      { $unwind: '$items' },
      {
        $lookup: {
          from: 'products',
          localField: 'items.product',
          foreignField: '_id',
          as: 'product'
        }
      },
      { $unwind: '$product' },
      {
        $group: {
          _id: '$product.category',
          totalSold: { $sum: '$items.quantity' },
          totalRevenue: { $sum: { $multiply: ['$items.quantity', '$items.price'] } },
          orderCount: { $sum: 1 }
        }
      },
      { $sort: { totalRevenue: -1 } }
    ]);

    res.json({
      success: true,
      data: {
        period: `${days} Tage`,
        topProducts,
        categoryPerformance
      }
    });

  } catch (error) {
    console.error('Fehler beim Abrufen der Lagerbestand-Analytik:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Abrufen der Lagerbestand-Analytik',
      error: error.message
    });
  }
});

module.exports = router;