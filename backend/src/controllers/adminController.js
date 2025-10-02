const mongoose = require('mongoose');

// Temporäre In-Memory-Datenbank für Tests
let memoryDB = {
  products: [
    {
      id: '1',
      name: 'Lavendel-Seife',
      description: 'Handgemachte Seife mit natürlichem Lavendelöl',
      price: 12.50,
      category: 'seife',
      creator: 'Ralf',
      stock: 15,
      createdAt: new Date().toISOString()
    },
    {
      id: '2',
      name: 'Silberkette mit Anhänger',
      description: 'Handgefertigte Halskette von Jonas',
      price: 25.00,
      category: 'schmuck',
      creator: 'Jonas',
      stock: 3,
      createdAt: new Date().toISOString()
    },
    {
      id: '3',
      name: 'Rosmarin-Seife',
      description: 'Natürliche Seife mit Rosmarin-Extrakt',
      price: 11.00,
      category: 'seife',
      creator: 'Ralf',
      stock: 8,
      createdAt: new Date().toISOString()
    }
  ],
  orders: [
    {
      id: '1',
      customerName: 'Anna Müller',
      customerEmail: 'anna@example.com',
      items: [
        { productId: '1', quantity: 2, price: 12.50 },
        { productId: '2', quantity: 1, price: 25.00 }
      ],
      total: 50.00,
      status: 'pending',
      createdAt: new Date().toISOString()
    }
  ],
  customers: [
    {
      id: '1',
      name: 'Anna Müller',
      email: 'anna@example.com',
      phone: '+49 123 456789',
      address: 'Musterstraße 123, 12345 Berlin',
      totalOrders: 1,
      createdAt: new Date().toISOString()
    }
  ]
};

// @desc    Alle Daten abrufen
// @route   GET /api/admin/data
// @access  Private (Admin)
const getAllData = async (req, res) => {
  try {
    console.log('📊 Admin ruft alle Daten ab:', req.user.email);

    // Wenn MongoDB verfügbar ist, aus DB abrufen, sonst Memory-DB
    const isMongoConnected = mongoose.connection.readyState === 1;
    
    if (isMongoConnected) {
      // TODO: Echte DB-Abfragen implementieren
      console.log('📊 Daten aus MongoDB abrufen...');
    }

    res.status(200).json({
      success: true,
      data: {
        products: memoryDB.products,
        orders: memoryDB.orders,
        customers: memoryDB.customers,
        stats: {
          totalProducts: memoryDB.products.length,
          totalOrders: memoryDB.orders.length,
          totalCustomers: memoryDB.customers.length,
          totalRevenue: memoryDB.orders.reduce((sum, order) => sum + order.total, 0)
        }
      },
      source: isMongoConnected ? 'mongodb' : 'memory',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Data Fetch Error:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Abrufen der Daten'
    });
  }
};

// @desc    Produkt erstellen
// @route   POST /api/admin/products
// @access  Private (Admin)
const createProduct = async (req, res) => {
  try {
    const { name, description, price, category, creator, stock } = req.body;

    console.log('➕ Neues Produkt erstellen:', name);

    const newProduct = {
      id: Date.now().toString(),
      name,
      description,
      price: parseFloat(price),
      category,
      creator,
      stock: parseInt(stock),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    memoryDB.products.push(newProduct);

    res.status(201).json({
      success: true,
      message: 'Produkt erfolgreich erstellt',
      product: newProduct
    });

  } catch (error) {
    console.error('Product Creation Error:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Erstellen des Produkts'
    });
  }
};

// @desc    Produkt aktualisieren
// @route   PUT /api/admin/products/:id
// @access  Private (Admin)
const updateProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    console.log('✏️ Produkt aktualisieren:', id);

    const productIndex = memoryDB.products.findIndex(p => p.id === id);
    if (productIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'Produkt nicht gefunden'
      });
    }

    memoryDB.products[productIndex] = {
      ...memoryDB.products[productIndex],
      ...updates,
      updatedAt: new Date().toISOString()
    };

    res.status(200).json({
      success: true,
      message: 'Produkt erfolgreich aktualisiert',
      product: memoryDB.products[productIndex]
    });

  } catch (error) {
    console.error('Product Update Error:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Aktualisieren des Produkts'
    });
  }
};

// @desc    Produkt löschen
// @route   DELETE /api/admin/products/:id
// @access  Private (Admin)
const deleteProduct = async (req, res) => {
  try {
    const { id } = req.params;

    console.log('🗑️ Produkt löschen:', id);

    const productIndex = memoryDB.products.findIndex(p => p.id === id);
    if (productIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'Produkt nicht gefunden'
      });
    }

    const deletedProduct = memoryDB.products.splice(productIndex, 1)[0];

    res.status(200).json({
      success: true,
      message: 'Produkt erfolgreich gelöscht',
      product: deletedProduct
    });

  } catch (error) {
    console.error('Product Delete Error:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Löschen des Produkts'
    });
  }
};

// @desc    Bestellung-Status aktualisieren
// @route   PUT /api/admin/orders/:id
// @access  Private (Admin)
const updateOrderStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    console.log('📦 Bestellstatus aktualisieren:', id, status);

    const orderIndex = memoryDB.orders.findIndex(o => o.id === id);
    if (orderIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'Bestellung nicht gefunden'
      });
    }

    memoryDB.orders[orderIndex].status = status;
    memoryDB.orders[orderIndex].updatedAt = new Date().toISOString();

    res.status(200).json({
      success: true,
      message: 'Bestellstatus erfolgreich aktualisiert',
      order: memoryDB.orders[orderIndex]
    });

  } catch (error) {
    console.error('Order Update Error:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Aktualisieren der Bestellung'
    });
  }
};

module.exports = {
  getAllData,
  createProduct,
  updateProduct,
  deleteProduct,
  updateOrderStatus
};