const express = require('express');
const router = express.Router();
const Cart = require('../models/Cart');
const Portfolio = require('../models/Portfolio');
const Bestand = require('../models/Bestand');
const { authenticateToken } = require('../middleware/auth');
const mongoose = require('mongoose');
const { calculateEffectivePrice } = require('../utils/pricing');

const normalizeCartImage = (imageData) => {
  if (!imageData) {
    return '';
  }

  if (typeof imageData === 'string') {
    return imageData;
  }

  if (typeof imageData === 'object' && typeof imageData.url === 'string') {
    return imageData.url;
  }

  return '';
};

const sanitizeCartItemsBeforeSave = (cart) => {
  if (!cart || !Array.isArray(cart.artikel)) {
    return;
  }

  cart.artikel.forEach((item) => {
    item.bild = normalizeCartImage(item?.bild);

    const normalizedMenge = Number(item?.menge);
    item.menge = Number.isFinite(normalizedMenge) && normalizedMenge > 0 ? normalizedMenge : 1;

    const normalizedPreis = Number(item?.preis);
    item.preis = Number.isFinite(normalizedPreis) && normalizedPreis >= 0 ? normalizedPreis : 0;

    const normalizedGramm = Number(item?.gramm);
    item.gramm = Number.isFinite(normalizedGramm) && normalizedGramm > 0 ? normalizedGramm : 1;
  });
};

const normalizeCartCategory = (category) => {
  const normalized = typeof category === 'string' ? category.toLowerCase() : '';
  if (normalized === 'werkstuck') {
    return 'werkstuck';
  }
  if (normalized === 'schmuck') {
    return 'schmuck';
  }
  return 'seife';
};

const buildPortfolioImageUrl = (produktId) => {
  if (!produktId) {
    return '';
  }
  return `/api/portfolio/${produktId.toString()}/image/main`;
};

const toObjectId = (id) => {
  if (!id) {
    return null;
  }

  return mongoose.Types.ObjectId.isValid(id) ? new mongoose.Types.ObjectId(id) : null;
};

const getStockForProduct = async (produktId) => {
  const objectId = toObjectId(produktId);

  const query = objectId
    ? {
        $or: [
          { artikelId: objectId, typ: 'produkt' },
          { artikelId: objectId, artikelModell: 'Portfolio' }
        ]
      }
    : {
        $or: [
          { artikelId: produktId, typ: 'produkt' },
          { artikelId: produktId, artikelModell: 'Portfolio' }
        ]
      };

  const stockRecords = await Bestand.find(query)
    .sort({ typ: -1, createdAt: -1 })
    .lean();

  return stockRecords[0] || null;
};

const getStockMapForProducts = async (produktIds) => {
  const validIds = produktIds
    .map((id) => toObjectId(id))
    .filter(Boolean);

  if (validIds.length === 0) {
    return new Map();
  }

  const stockRecords = await Bestand.find({
    artikelId: { $in: validIds },
    $or: [{ typ: 'produkt' }, { artikelModell: 'Portfolio' }]
  })
    .sort({ typ: -1, createdAt: -1 })
    .lean();

  const stockMap = new Map();

  stockRecords.forEach((record) => {
    const key = record.artikelId?.toString();
    if (!key || stockMap.has(key)) {
      return;
    }
    stockMap.set(key, record);
  });

  return stockMap;
};

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
      sanitizeCartItemsBeforeSave(cart);
      await cart.save();
    }

    // Aktualisiere Bild-URLs und Verfügbarkeitsinformationen aus Portfolio für alle Artikel
    // Optimierung: Batch-Abfragen statt einzelne Abfragen pro Artikel
    const produktIds = cart.artikel.map(item => item.produktId);
    
    // Produkte und Bestandsinformationen parallel laden.
    const [products, bestandMap] = await Promise.all([
      Portfolio.find({
        _id: { $in: produktIds }
      })
        .select('_id aktiv preis sale')
        .lean(),
      getStockMapForProducts(produktIds)
    ]);
    
    // Maps für schnellen Zugriff erstellen
    const productMap = new Map(products.map(p => [p._id.toString(), p]));
    
    
    const enrichedItems = cart.artikel.map((item) => {
      try {
        const product = productMap.get(item.produktId.toString());
        const bestandInfo = bestandMap.get(item.produktId.toString());

        if (product) {
          const pricing = calculateEffectivePrice(product);
          // Aktualisiere mit Portfolio-Daten und Verfügbarkeitsstatus
          const enrichedItem = {
            ...item.toObject(),
            bild: buildPortfolioImageUrl(item.produktId),
            preis: pricing.effectivePrice,
            sale: {
              isOnSale: pricing.isOnSale,
              discountPercent: pricing.discountPercent,
              discountAmount: pricing.discountAmount,
              basispreis: pricing.basePrice
            },
            aktiv: product.aktiv, // Produktstatus direkt hinzufügen
            bestand: bestandInfo ? {
              menge: bestandInfo.menge || 0,
              einheit: bestandInfo.einheit || 'Stück'
            } : {
              menge: product.aktiv !== false ? 5 : 0, // Standard-Menge nur wenn aktiv
              einheit: 'Stück'
            }
          };

          return enrichedItem;
        }
        
        // Fallback: behalte vorhandene Daten aber füge Bestandsinfo hinzu
        const fallbackPricing = product ? calculateEffectivePrice(product) : null;
        const fallbackItem = {
          ...item.toObject(),
          preis: fallbackPricing ? fallbackPricing.effectivePrice : item.preis,
          sale: fallbackPricing ? {
            isOnSale: fallbackPricing.isOnSale,
            discountPercent: fallbackPricing.discountPercent,
            discountAmount: fallbackPricing.discountAmount,
            basispreis: fallbackPricing.basePrice
          } : item.sale,
          aktiv: product?.aktiv || false, // Produktstatus direkt hinzufügen
          bestand: bestandInfo ? {
            menge: bestandInfo.menge || 0,
            einheit: bestandInfo.einheit || 'Stück'
          } : {
            // Fallback: Wenn kein Bestand-Eintrag und kein Produkt gefunden
            menge: 0,
            einheit: 'Stück'
          }
        };
        
        return fallbackItem;
      } catch (err) {
        console.error('Fehler beim Laden des Produkts:', item.produktId, err);
        // Bei Fehler: behalte Artikel mit "nicht verfügbar" Status
        return {
          ...item.toObject(),
          aktiv: false, // Bei Fehler als inaktiv markieren
          bestand: {
            menge: 0,
            einheit: 'Stück'
          }
        };
      }
    });

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

    if (!produktId || !name || preis === undefined || preis === null || !menge) {
      return res.status(400).json({
        success: false,
        message: 'Produktdaten unvollständig',
        debug: { produktId, name, preis, menge }
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

    // Prüfe ob Produkt aktiv ist
    if (product.aktiv === false) {
      return res.status(400).json({
        success: false,
        message: 'Produkt ist nicht mehr verfügbar',
        errorType: 'PRODUCT_INACTIVE'
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

    // Bestandsprüfung vor dem Hinzufügen
    const bestandInfo = await getStockForProduct(produktId);
    
    console.log('📦 Stock check for add:', {
      produktId,
      requestedQuantity: menge,
      availableStock: bestandInfo?.menge || 0,
      productActive: product.aktiv,
      hasStock: (bestandInfo?.menge || 0) > 0
    });
    
    if (!bestandInfo || (bestandInfo.menge || 0) <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Artikel ist nicht verfügbar',
        errorType: 'NOT_AVAILABLE'
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

    let totalRequestedQuantity = menge;
    if (existingItemIndex > -1) {
      // Wenn bereits im Warenkorb, addiere zur vorhandenen Menge
      totalRequestedQuantity += cart.artikel[existingItemIndex].menge;
    }
    
    // Prüfe ob genug Bestand für die Gesamtmenge vorhanden ist
    if (totalRequestedQuantity > bestandInfo.menge) {
      return res.status(400).json({
        success: false,
        message: `Nur ${bestandInfo.menge} Stück verfügbar`,
        errorType: 'INSUFFICIENT_STOCK',
        availableQuantity: bestandInfo.menge,
        currentInCart: existingItemIndex > -1 ? cart.artikel[existingItemIndex].menge : 0
      });
    }

    if (existingItemIndex > -1) {
      // Menge erhöhen
      cart.artikel[existingItemIndex].menge += menge;
    } else {
      // Neuen Artikel hinzufügen - kategorie-spezifische Daten
      const cartItem = {
        produktId,
        name,
        preis: calculateEffectivePrice(product).effectivePrice,
        menge,
        bild: product?.bilder?.hauptbild ? buildPortfolioImageUrl(produktId) : normalizeCartImage(bild || product?.bilder?.hauptbild),
        gramm: (() => {
          const requestGramm = Number(gramm);
          if (Number.isFinite(requestGramm) && requestGramm > 0) {
            return requestGramm;
          }

          const productGramm = Number(product?.gramm);
          if (Number.isFinite(productGramm) && productGramm > 0) {
            return productGramm;
          }

          return 1;
        })(),
        kategorie: normalizeCartCategory(product.kategorie)
      };

      // Kategorie-spezifische Felder hinzufügen
      if (normalizeCartCategory(product.kategorie) === 'werkstuck') {
        cartItem.giesswerkstoff = product.giesswerkstoff || '';
        cartItem.giesswerkstoffName = product.giesswerkstoffName || 'Standard';
        cartItem.giessform = product.giessform || '';
        cartItem.giessformName = product.giessformName || 'Standard';
      } else {
        cartItem.seife = seife || product.seife || '';
      }

      cart.artikel.push(cartItem);
    }

    sanitizeCartItemsBeforeSave(cart);
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
                bild: buildPortfolioImageUrl(item.produktId),
                preis: calculateEffectivePrice(product).effectivePrice
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

    if (!produktId || menge === undefined || menge === null) {
      return res.status(400).json({
        success: false,
        message: 'Produkt-ID und Menge erforderlich'
      });
    }

    if (typeof menge !== 'number' || menge < 0) {
      return res.status(400).json({
        success: false,
        message: 'Menge muss eine positive Zahl sein'
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
      item => item.produktId.toString() === produktId.toString()
    );

    if (itemIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'Artikel nicht im Warenkorb'
      });
    }

    if (menge <= 0) {
      // Artikel atomar entfernen, um Versionskonflikte bei parallelen Updates zu vermeiden.
      await Cart.updateOne(
        { kundeId },
        { $pull: { artikel: { produktId } } }
      );
    } else {
      // Produktstatus prüfen
      const product = await Portfolio.findById(produktId);
      if (!product || product.aktiv === false) {
        return res.status(400).json({
          success: false,
          message: 'Produkt ist nicht mehr verfügbar',
          errorType: 'PRODUCT_INACTIVE'
        });
      }
      
      // Bestandsprüfung vor Update
      const bestandInfo = await getStockForProduct(produktId);
      
      if (!bestandInfo || (bestandInfo.menge || 0) <= 0) {
        return res.status(400).json({
          success: false,
          message: 'Artikel ist nicht mehr verfügbar',
          errorType: 'NOT_AVAILABLE'
        });
      }
      
      if (menge > bestandInfo.menge) {
        return res.status(400).json({
          success: false,
          message: `Nur ${bestandInfo.menge} Stück verfügbar`,
          errorType: 'INSUFFICIENT_STOCK',
          availableQuantity: bestandInfo.menge
        });
      }

      // Menge atomar setzen, um VersionError bei konkurrierenden Requests zu verhindern.
      await Cart.updateOne(
        { kundeId, 'artikel.produktId': produktId },
        { $set: { 'artikel.$.menge': menge } }
      );
    }

    const updatedCart = await Cart.findOne({ kundeId });
    if (!updatedCart) {
      return res.status(404).json({
        success: false,
        message: 'Warenkorb nicht gefunden'
      });
    }

    const produktIds = updatedCart.artikel.map(item => item.produktId);
    const [products, bestandMap] = await Promise.all([
      Portfolio.find({ _id: { $in: produktIds } })
        .select('_id aktiv preis sale')
        .lean(),
      getStockMapForProducts(produktIds)
    ]);

    const productMap = new Map(products.map(p => [p._id.toString(), p]));

    const enrichedItems = updatedCart.artikel.map((item) => {
      const product = productMap.get(item.produktId.toString());
      const bestandInfo = bestandMap.get(item.produktId.toString());
      const pricing = product ? calculateEffectivePrice(product) : null;

      return {
        ...item.toObject(),
        bild: buildPortfolioImageUrl(item.produktId),
        preis: pricing ? pricing.effectivePrice : item.preis,
        sale: pricing ? {
          isOnSale: pricing.isOnSale,
          discountPercent: pricing.discountPercent,
          discountAmount: pricing.discountAmount,
          basispreis: pricing.basePrice
        } : item.sale,
        aktiv: product?.aktiv ?? false,
        bestand: bestandInfo ? {
          menge: bestandInfo.menge || 0,
          einheit: bestandInfo.einheit || 'Stück'
        } : {
          menge: 0,
          einheit: 'Stück'
        }
      };
    });

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

    sanitizeCartItemsBeforeSave(cart);
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
            bild: buildPortfolioImageUrl(item.produktId)
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
