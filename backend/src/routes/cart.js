const express = require('express');
const router = express.Router();
const Cart = require('../models/Cart');
const Portfolio = require('../models/Portfolio');
const { authenticateToken } = require('../middleware/auth');
const mongoose = require('mongoose');

// Helper: Prüft ob User ein Kunde ist (kein Admin)
const isKunde = (user) => {
  // Alle eingeloggten Benutzer dürfen den Warenkorb nutzen
  // Sowohl Kunden als auch Admins können bestellen
  return true;
};

// GET /api/cart - Warenkorb des eingeloggten Benutzers abrufen
router.get('/', authenticateToken, async (req, res) => {
  try {
    const kundeId = req.user.id || req.user.userId;
    let cart = await Cart.findOne({ kundeId });
    
    if (!cart) {
      // Leeren Warenkorb erstellen, falls nicht vorhanden
      cart = new Cart({
        kundeId,
        artikel: []
      });
      await cart.save();
    }

    // Aktualisiere Bild-URLs aus Portfolio für alle Artikel
    const enrichedItems = await Promise.all(cart.artikel.map(async (item) => {
      try {
        // Hole aktuelles Produkt aus Portfolio
        const product = await Portfolio.findById(item.produktId);
        
        if (product && product.bilder && product.bilder.hauptbild) {
          // Aktualisiere Bild-URL mit aktueller URL aus Portfolio
          return {
            ...item.toObject(),
            bild: product.bilder.hauptbild
          };
        }
        
        // Fallback: behalte vorhandene Bild-URL
        return item.toObject();
      } catch (err) {
        console.error('Fehler beim Laden des Produkts:', item.produktId, err);
        // Bei Fehler: behalte Artikel wie er ist
        return item.toObject();
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
    console.error('Fehler beim Abrufen des Warenkorbs:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Abrufen des Warenkorbs',
      error: error.message
    });
  }
});

// POST /api/cart/add - Artikel zum Warenkorb hinzufügen
router.post('/add', authenticateToken, async (req, res) => {
  try {
    console.log('🛒 POST /cart/add - User:', {
      id: req.user?.id,
      userId: req.user?.userId,
      _id: req.user?._id,
      role: req.user?.role,
      email: req.user?.email
    });

    const { produktId, name, preis, menge, bild, gramm, seife } = req.body;

    console.log('🛒 Warenkorb hinzufügen - req.user:', req.user);
    console.log('🛒 User ID Felder:', {
      id: req.user?.id,
      userId: req.user?.userId,
      _id: req.user?._id
    });

    if (!produktId || !name || preis === undefined || !menge) {
      return res.status(400).json({
        success: false,
        message: 'Produktdaten unvollständig'
      });
    }

    // Produkt existiert prüfen
    const product = await Portfolio.findById(produktId);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Produkt nicht gefunden'
      });
    }

    const kundeId = req.user.id || req.user.userId || req.user._id;
    console.log('🛒 Verwendete kundeId:', kundeId);

    if (!kundeId) {
      return res.status(400).json({
        success: false,
        message: 'Benutzer-ID nicht gefunden',
        debug: { user: req.user }
      });
    }

    let cart = await Cart.findOne({ kundeId });

    if (!cart) {
      cart = new Cart({
        kundeId,
        artikel: []
      });
    }

    // Prüfen ob Artikel bereits im Warenkorb
    const existingItemIndex = cart.artikel.findIndex(
      item => item.produktId.toString() === produktId
    );

    if (existingItemIndex > -1) {
      // Menge erhöhen
      cart.artikel[existingItemIndex].menge += menge;
    } else {
      // Neuen Artikel hinzufügen
      cart.artikel.push({
        produktId,
        name,
        preis,
        menge,
        bild: bild || '',
        gramm,
        seife
      });
    }

    await cart.save();

    // Aktualisiere Bild-URLs aus Portfolio für alle Artikel
    const enrichedItems = await Promise.all(cart.artikel.map(async (item) => {
      try {
        // Hole aktuelles Produkt aus Portfolio
        const product = await Portfolio.findById(item.produktId);
        
        if (product && product.bilder && product.bilder.hauptbild) {
          // Aktualisiere Bild-URL mit aktueller URL aus Portfolio
          return {
            ...item.toObject(),
            bild: product.bilder.hauptbild
          };
        }
        
        // Fallback: behalte vorhandene Bild-URL
        return item.toObject();
      } catch (err) {
        console.error('Fehler beim Laden des Produkts:', item.produktId, err);
        // Bei Fehler: behalte Artikel wie er ist
        return item.toObject();
      }
    }));

    res.json({
      success: true,
      message: 'Artikel zum Warenkorb hinzugefügt',
      data: {
        items: enrichedItems,
        total: enrichedItems.reduce((sum, item) => sum + (item.preis * item.menge), 0),
        itemCount: enrichedItems.reduce((sum, item) => sum + item.menge, 0)
      }
    });
  } catch (error) {
    console.error('Fehler beim Hinzufügen zum Warenkorb:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Hinzufügen zum Warenkorb',
      error: error.message
    });
  }
});

// PUT /api/cart/update - Artikelmenge aktualisieren
router.put('/update', authenticateToken, async (req, res) => {
  try {
    const { produktId, menge } = req.body;

    if (!produktId || menge === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Produkt-ID und Menge erforderlich'
      });
    }

    const kundeId = req.user.id || req.user.userId;
    const cart = await Cart.findOne({ kundeId });

    if (!cart) {
      return res.status(404).json({
        success: false,
        message: 'Warenkorb nicht gefunden'
      });
    }

    const itemIndex = cart.artikel.findIndex(
      item => item.produktId.toString() === produktId
    );

    if (itemIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'Artikel nicht im Warenkorb'
      });
    }

    if (menge <= 0) {
      // Artikel entfernen
      cart.artikel.splice(itemIndex, 1);
    } else {
      // Menge aktualisieren
      cart.artikel[itemIndex].menge = menge;
    }

    await cart.save();

    // Aktualisiere Bild-URLs aus Portfolio für alle Artikel
    const enrichedItems = await Promise.all(cart.artikel.map(async (item) => {
      try {
        // Hole aktuelles Produkt aus Portfolio
        const product = await Portfolio.findById(item.produktId);
        
        if (product && product.bilder && product.bilder.hauptbild) {
          // Aktualisiere Bild-URL mit aktueller URL aus Portfolio
          return {
            ...item.toObject(),
            bild: product.bilder.hauptbild
          };
        }
        
        // Fallback: behalte vorhandene Bild-URL
        return item.toObject();
      } catch (err) {
        console.error('Fehler beim Laden des Produkts:', item.produktId, err);
        // Bei Fehler: behalte Artikel wie er ist
        return item.toObject();
      }
    }));

    res.json({
      success: true,
      message: 'Warenkorb aktualisiert',
      data: {
        items: enrichedItems,
        total: enrichedItems.reduce((sum, item) => sum + (item.preis * item.menge), 0),
        itemCount: enrichedItems.reduce((sum, item) => sum + item.menge, 0)
      }
    });
  } catch (error) {
    console.error('Fehler beim Aktualisieren des Warenkorbs:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Aktualisieren des Warenkorbs',
      error: error.message
    });
  }
});

// DELETE /api/cart/remove/:produktId - Artikel aus Warenkorb entfernen
router.delete('/remove/:produktId', authenticateToken, async (req, res) => {
  try {
    const { produktId } = req.params;

    const kundeId = req.user.id || req.user.userId;
    const cart = await Cart.findOne({ kundeId });

    if (!cart) {
      return res.status(404).json({
        success: false,
        message: 'Warenkorb nicht gefunden'
      });
    }

    cart.artikel = cart.artikel.filter(
      item => item.produktId.toString() !== produktId
    );

    await cart.save();

    // Aktualisiere Bild-URLs aus Portfolio für alle verbleibenden Artikel
    const enrichedItems = await Promise.all(cart.artikel.map(async (item) => {
      try {
        // Hole aktuelles Produkt aus Portfolio
        const product = await Portfolio.findById(item.produktId);
        
        if (product && product.bilder && product.bilder.hauptbild) {
          // Aktualisiere Bild-URL mit aktueller URL aus Portfolio
          return {
            ...item.toObject(),
            bild: product.bilder.hauptbild
          };
        }
        
        // Fallback: behalte vorhandene Bild-URL
        return item.toObject();
      } catch (err) {
        console.error('Fehler beim Laden des Produkts:', item.produktId, err);
        // Bei Fehler: behalte Artikel wie er ist
        return item.toObject();
      }
    }));

    res.json({
      success: true,
      message: 'Artikel entfernt',
      data: {
        items: enrichedItems,
        total: enrichedItems.reduce((sum, item) => sum + (item.preis * item.menge), 0),
        itemCount: enrichedItems.reduce((sum, item) => sum + item.menge, 0)
      }
    });
  } catch (error) {
    console.error('Fehler beim Entfernen aus Warenkorb:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Entfernen aus Warenkorb',
      error: error.message
    });
  }
});

// DELETE /api/cart/clear - Warenkorb leeren
router.delete('/clear', authenticateToken, async (req, res) => {
  try {
    const kundeId = req.user.id || req.user.userId;
    const cart = await Cart.findOne({ kundeId });

    if (!cart) {
      return res.status(404).json({
        success: false,
        message: 'Warenkorb nicht gefunden'
      });
    }

    cart.artikel = [];
    await cart.save();

    res.json({
      success: true,
      message: 'Warenkorb geleert',
      data: {
        items: [],
        total: 0,
        itemCount: 0
      }
    });
  } catch (error) {
    console.error('Fehler beim Leeren des Warenkorbs:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Leeren des Warenkorbs',
      error: error.message
    });
  }
});

module.exports = router;
