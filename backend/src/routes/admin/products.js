const express = require('express');
const {
  getAllData,
  createProduct,
  updateProduct,
  deleteProduct,
  updateOrderStatus
} = require('../../controllers/adminController');

const router = express.Router();

// @route   GET /api/admin/data
// @desc    Alle Daten abrufen (Dashboard)
// @access  Private (Admin)
router.get('/data', getAllData);

// @route   GET /api/admin/products
// @desc    Alle Produkte aus Portfolio abrufen
// @access  Private (Admin)
router.get('/products', async (req, res) => {
  console.log('🔍 [PRODUCTS API] Anfrage erhalten');
  try {
    // Zuerst Portfolio versuchen
    const Portfolio = require('../../models/Portfolio');
    console.log('🔍 [PRODUCTS API] Lade Produkte aus Portfolio...');
    const portfolioProducts = await Portfolio.find({ 
      $or: [
        { isActive: true }, 
        { aktiv: true }
      ]
    })
      .sort({ reihenfolge: 1, name: 1 })
      .select('name beschreibung preis sku kategorie isActive aktiv gramm images')
      .lean();

    console.log('🔍 [PRODUCTS API] Portfolio-Produkte gefunden:', portfolioProducts.length);

    // Falls Portfolio leer ist, versuche Product-Collection
    let products = portfolioProducts;
    if (portfolioProducts.length === 0) {
      const Product = require('../../models/Product');
      console.log('🔍 [PRODUCTS API] Portfolio leer, lade aus Product-Collection...');
      const productProducts = await Product.find({ isActive: true })
        .sort({ createdAt: -1, name: 1 })
        .select('name description price sku category isActive images')
        .lean();
      
      console.log('🔍 [PRODUCTS API] Product-Collection Produkte gefunden:', productProducts.length);
      
      // Product-Format zu Portfolio-Format konvertieren
      products = productProducts.map(product => ({
        _id: product._id,
        name: product.name,
        beschreibung: product.description || '',
        preis: product.price || 0,
        sku: product.sku || '',
        kategorie: product.category || '',
        isActive: product.isActive,
        gramm: 0, // Default für Product-Collection
        images: product.images || []
      }));
    }

    // Daten für Invoice-Frontend formatieren
    const formattedProducts = products.map(product => ({
      _id: product._id,
      name: product.name,
      description: product.beschreibung || '',
      beschreibung: product.beschreibung || '',
      price: product.preis || 0,
      preis: product.preis || 0,
      sku: product.sku || '',
      category: product.kategorie || '',
      kategorie: product.kategorie || '',
      gramm: product.gramm || 0,
      isActive: product.isActive || product.aktiv || false,
      images: product.images || []
    }));

    console.log('🔍 [PRODUCTS API] Formatierte Produkte:', formattedProducts.length);
    console.log('🔍 [PRODUCTS API] Erstes Produkt:', formattedProducts[0] || 'Keine Produkte');

    res.json({
      success: true,
      data: formattedProducts,
      count: formattedProducts.length,
      source: portfolioProducts.length > 0 ? 'portfolio' : 'products'
    });

  } catch (error) {
    console.error('❌ Fehler beim Laden der Produkte:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Laden der Produkte',
      error: error.message
    });
  }
});

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

// @route   PUT /api/admin/orders/:id
// @desc    Bestellstatus aktualisieren
// @access  Private (Admin)
router.put('/orders/:id', updateOrderStatus);

// @route   GET /api/admin/cart
// @desc    Admin Warenkorb abrufen
// @access  Private (Admin)
router.get('/cart', async (req, res) => {
  try {
    const Cart = require('../../models/Cart');
    const kundeId = req.user.id || req.user.userId;
    
    let cart = await Cart.findOne({ kundeId });
    
    if (!cart) {
      cart = new Cart({
        kundeId,
        artikel: []
      });
      await cart.save();
    }

    // Portfolio und Bestand für Artikel laden
    const Portfolio = require('../../models/Portfolio');
    const Bestand = require('../../models/Bestand');
    
    const enrichedItems = await Promise.all(cart.artikel.map(async (item) => {
      try {
        const product = await Portfolio.findById(item.produktId);
        let bestandInfo = null;
        
        if (product) {
          bestandInfo = await Bestand.findOne({ 
            artikelId: item.produktId,
            typ: 'produkt'
          });
        }
        
        if (product && product.bilder && product.bilder.hauptbild) {
          return {
            ...item.toObject(),
            bild: product.bilder.hauptbild,
            aktiv: product.aktiv,
            bestand: bestandInfo ? {
              verfuegbar: (bestandInfo.menge || 0) > 0,
              menge: bestandInfo.menge || 0,
              einheit: bestandInfo.einheit || 'Stück'
            } : {
              verfuegbar: product.aktiv !== false,
              menge: 5,
              einheit: 'Stück'
            }
          };
        }
        
        return {
          ...item.toObject(),
          aktiv: product?.aktiv || false,
          bestand: bestandInfo ? {
            verfuegbar: (bestandInfo.menge || 0) > 0,
            menge: bestandInfo.menge || 0,
            einheit: bestandInfo.einheit || 'Stück'
          } : {
            verfuegbar: false,
            menge: 0,
            einheit: 'Stück'
          }
        };
      } catch (err) {
        console.error('Fehler beim Laden des Produkts:', item.produktId, err);
        return {
          ...item.toObject(),
          bestand: {
            verfuegbar: false,
            menge: 0,
            einheit: 'Stück'
          }
        };
      }
    }));

    res.json({
      success: true,
      data: {
        items: enrichedItems,
        total: enrichedItems.reduce((sum, item) => sum + (item.preis * item.menge), 0),
        itemCount: enrichedItems.reduce((sum, item) => sum + item.menge, 0)
      }
    });
  } catch (error) {
    console.error('Admin Cart Load Error:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Laden des Admin-Warenkorbs'
    });
  }
});

module.exports = router;