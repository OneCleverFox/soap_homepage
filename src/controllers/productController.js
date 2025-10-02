const Product = require('../models/Product');
const mongoose = require('mongoose');

// Alle Produkte abrufen (mit Filter und Paginierung)
const getProducts = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      category,
      search,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      isActive = true,
      inStock
    } = req.query;

    // Filter aufbauen
    const filter = { isActive: isActive === 'true' };
    
    if (category) {
      filter.category = category;
    }
    
    if (inStock === 'true') {
      filter['stock.quantity'] = { $gt: 0 };
    }
    
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { 'attributes.ingredients': { $regex: search, $options: 'i' } }
      ];
    }

    // Sortierung
    const sort = {};
    sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

    // Paginierung
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Produkte abrufen
    const products = await Product.find(filter)
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit))
      .select('-__v');

    // Gesamtanzahl für Paginierung
    const total = await Product.countDocuments(filter);
    const totalPages = Math.ceil(total / parseInt(limit));

    res.json({
      success: true,
      data: {
        products,
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
    console.error('Fehler beim Abrufen der Produkte:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Abrufen der Produkte',
      error: error.message
    });
  }
};

// Einzelnes Produkt abrufen
const getProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Produkt nicht gefunden'
      });
    }

    res.json({
      success: true,
      data: product
    });
  } catch (error) {
    console.error('Fehler beim Abrufen des Produkts:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Abrufen des Produkts',
      error: error.message
    });
  }
};

// Neues Produkt erstellen
const createProduct = async (req, res) => {
  try {
    const product = new Product(req.body);
    await product.save();

    res.status(201).json({
      success: true,
      message: 'Produkt erfolgreich erstellt',
      data: product
    });
  } catch (error) {
    console.error('Fehler beim Erstellen des Produkts:', error);
    
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(e => e.message);
      return res.status(400).json({
        success: false,
        message: 'Validierungsfehler',
        errors
      });
    }

    res.status(500).json({
      success: false,
      message: 'Fehler beim Erstellen des Produkts',
      error: error.message
    });
  }
};

// Produkt aktualisieren
const updateProduct = async (req, res) => {
  try {
    const product = await Product.findByIdAndUpdate(
      req.params.id,
      req.body,
      { 
        new: true, 
        runValidators: true 
      }
    );

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Produkt nicht gefunden'
      });
    }

    res.json({
      success: true,
      message: 'Produkt erfolgreich aktualisiert',
      data: product
    });
  } catch (error) {
    console.error('Fehler beim Aktualisieren des Produkts:', error);
    
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(e => e.message);
      return res.status(400).json({
        success: false,
        message: 'Validierungsfehler',
        errors
      });
    }

    res.status(500).json({
      success: false,
      message: 'Fehler beim Aktualisieren des Produkts',
      error: error.message
    });
  }
};

// Produkt löschen (Soft Delete - nur deaktivieren)
const deleteProduct = async (req, res) => {
  try {
    const product = await Product.findByIdAndUpdate(
      req.params.id,
      { isActive: false },
      { new: true }
    );

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Produkt nicht gefunden'
      });
    }

    res.json({
      success: true,
      message: 'Produkt erfolgreich deaktiviert'
    });
  } catch (error) {
    console.error('Fehler beim Löschen des Produkts:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Löschen des Produkts',
      error: error.message
    });
  }
};

// Featured Produkte abrufen
const getFeaturedProducts = async (req, res) => {
  try {
    const products = await Product.find({
      isFeatured: true,
      isActive: true,
      'stock.quantity': { $gt: 0 }
    })
    .sort({ salesCount: -1 })
    .limit(8)
    .select('-__v');

    res.json({
      success: true,
      data: products
    });
  } catch (error) {
    console.error('Fehler beim Abrufen der Featured Produkte:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Abrufen der Featured Produkte',
      error: error.message
    });
  }
};

// Lagerbestand aktualisieren
const updateStock = async (req, res) => {
  try {
    const { quantity, operation = 'set' } = req.body;
    const product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Produkt nicht gefunden'
      });
    }

    switch (operation) {
      case 'add':
        product.stock.quantity += quantity;
        break;
      case 'subtract':
        if (product.stock.quantity < quantity) {
          return res.status(400).json({
            success: false,
            message: 'Nicht genügend Lagerbestand verfügbar'
          });
        }
        product.stock.quantity -= quantity;
        break;
      case 'set':
      default:
        product.stock.quantity = quantity;
        break;
    }

    await product.save();

    res.json({
      success: true,
      message: 'Lagerbestand erfolgreich aktualisiert',
      data: {
        productId: product._id,
        newQuantity: product.stock.quantity
      }
    });
  } catch (error) {
    console.error('Fehler beim Aktualisieren des Lagerbestands:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Aktualisieren des Lagerbestands',
      error: error.message
    });
  }
};

// Produkte mit niedrigem Lagerbestand
const getLowStockProducts = async (req, res) => {
  try {
    const products = await Product.find({
      isActive: true,
      $expr: { $lte: ['$stock.quantity', '$stock.lowStockThreshold'] }
    })
    .sort({ 'stock.quantity': 1 })
    .select('name stock category');

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
};

// Produktkategorien abrufen
const getCategories = async (req, res) => {
  try {
    const categories = await Product.aggregate([
      { $match: { isActive: true } },
      { $group: { _id: '$category', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);

    res.json({
      success: true,
      data: categories.map(cat => ({
        name: cat._id,
        count: cat.count
      }))
    });
  } catch (error) {
    console.error('Fehler beim Abrufen der Kategorien:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Abrufen der Kategorien',
      error: error.message
    });
  }
};

module.exports = {
  getProducts,
  getProduct,
  createProduct,
  updateProduct,
  deleteProduct,
  getFeaturedProducts,
  updateStock,
  getLowStockProducts,
  getCategories
};