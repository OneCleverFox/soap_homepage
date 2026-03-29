import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import { cartAPI } from '../services/api';
import { useAuth } from './AuthContext';
import stockEventService from '../services/stockEventService';
import toast from 'react-hot-toast';
import cookieManager from '../utils/cookieManager';

const CartContext = createContext();

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};

export const CartProvider = ({ children }) => {
  const [items, setItems] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [lastLoadTime, setLastLoadTime] = useState(0);
  const { user } = useAuth();

  // Load cart from backend when user logs in (with caching)
  const loadCart = useCallback(async (force = false) => {
    const token = cookieManager.getItem('token', 'necessary');
    if (!token) {
      setItems([]);
      return;
    }

    // Cache-Logik: Nur neu laden wenn mehr als 30 Sekunden vergangen sind
    const now = Date.now();
    const cacheTimeout = 30000; // 30 Sekunden
    
    if (!force && lastLoadTime && (now - lastLoadTime) < cacheTimeout) {
      console.log('📦 Warenkorb-Cache noch gültig, überspringe Anfrage');
      return;
    }

    try {
      setLoading(true);
      
      // Verwende Admin-Cart-API für Admin-User
      const response = user?.role === 'admin' 
        ? await cartAPI.getAdminCart()
        : await cartAPI.getCart();
        
      console.log('📦 Raw Cart Data:', response.data);
      
      setLastLoadTime(now); // Cache-Zeit aktualisieren
      
      const cartItems = (response.data.data?.items || []).map(item => {
        console.log('📦 Cart Item:', {
          name: item.name,
          bildUrl: item.bildUrl || item.bild,
          produktId: item.produktId,
          bestand: item.bestand,
          aktiv: item.aktiv,
          menge: item.menge,
          quantity: item.quantity,
          fullItem: item
        });
        
        // Normalisiere Quantity-Feld (Admin-Cart verwendet 'menge', normale Cart 'quantity')
        const itemQuantity = item.menge || item.quantity || 0;
        
        // Verfügbarkeitsprüfung basierend auf aktiv Status und Bestandsmenge
        // aktiv ist verfügbar wenn true oder undefined (Fallback für alte Daten)
        const isAvailable = (item.aktiv !== false) && (item.bestand?.menge || 0) > 0;
        
        // Automatische Mengenkorrektur bei Bestandsüberschreitung
        let correctedQuantity = itemQuantity;
        let needsBackendUpdate = false;
        let shouldRemoveItem = false;
        
        if (!isAvailable) {
          // Artikel nicht verfügbar - NICHT entfernen, sondern als nicht verfügbar markieren
          console.log(`📦 Artikel nicht verfügbar, bleibt im Warenkorb: ${item.name}`);
          // Menge auf 0 setzen für Berechnungen, aber Item behalten
          correctedQuantity = 0;
        } else if (itemQuantity > (item.bestand?.menge || 0)) {
          // Bestandsüberschreitung - Menge korrigieren
          correctedQuantity = item.bestand.menge;
          needsBackendUpdate = true;
          console.log(`📦 Automatische Mengenkorrektur für ${item.name}: ${item.menge} → ${correctedQuantity}`);
        }
        
        const cartItem = {
          id: item.produktId,
          produktId: item.produktId, // Für Backend-Calls
          name: item.name,
          price: item.preis, // Einheitlicher Preisname
          preis: item.preis, // Backup für Kompatibilität
          sale: item.sale || { isOnSale: false, discountPercent: 0, discountAmount: 0, basispreis: item.preis || 0 },
          quantity: correctedQuantity, // Korrigierte Menge verwenden
          image: item.bild,
          gramm: item.gramm,
          seife: item.seife,
          // Verfügbarkeitsinformationen hinzufügen
          bestand: item.bestand,
          isAvailable: isAvailable,
          hasEnoughStock: isAvailable && correctedQuantity <= (item.bestand?.menge || 0),
          needsBackendUpdate: needsBackendUpdate,
          shouldRemoveItem: shouldRemoveItem
        };
        
        return cartItem;
      });
      
      console.log('📦 Mapped Cart Items:', cartItems);
      
      // Prüfe auf nicht verfügbare Artikel und zeige Warnung
      const unavailableItems = cartItems.filter(item => !item.isAvailable);
      
      if (unavailableItems.length > 0) {
        console.log('📦 Nicht verfügbare Artikel im Warenkorb:', unavailableItems.map(item => item.name));
        toast(`⚠️ ${unavailableItems.length} Artikel sind nicht mehr verfügbar`, {
          icon: '⚠️',
          style: {
            background: '#fff3cd',
            border: '1px solid #ffeaa7',
            color: '#856404',
          },
        });
      }
      
      // Alle Artikel im Warenkorb behalten (auch nicht verfügbare)
      setItems(cartItems);
      
      // Backend-Updates für korrigierte Mengen (nur für verfügbare Artikel)
      const itemsNeedingUpdate = cartItems.filter(item => item.needsBackendUpdate && item.isAvailable);
      if (itemsNeedingUpdate.length > 0) {
        console.log('📦 Führe Backend-Updates für korrigierte Mengen durch...');
        
        for (const item of itemsNeedingUpdate) {
          try {
            await cartAPI.updateQuantity(item.produktId, item.quantity);
            console.log(`✅ Backend-Update erfolgreich für ${item.name}`);
          } catch (updateError) {
            console.error(`❌ Fehler bei Backend-Update für ${item.name}:`, updateError);
          }
        }
      }
    } catch (error) {
      console.error('❌ Fehler beim Laden des Warenkorbs:', error);
      console.error('Error details:', {
        status: error.response?.status,
        message: error.message,
        data: error.response?.data
      });
      
      // Nur bei 401/403 Warenkorb leeren, bei anderen Fehlern behalten
      if (error.response?.status === 401 || error.response?.status === 403) {
        console.log('🚫 Authentifizierungsfehler - Warenkorb wird geleert');
        setItems([]);
      } else {
        console.log('⚠️ Warenkorb konnte nicht geladen werden, behalte vorherige Daten');
        // Bei Netzwerkfehlern etc. die vorhandenen Items behalten
      }
    } finally {
      setLoading(false);
    }
  }, [lastLoadTime, user?.role]);

  // Load cart on component mount if user is logged in
  useEffect(() => {
    let isMounted = true;
    
    const token = cookieManager.getItem('token', 'necessary');
    console.log('🔑 Token beim Mount:', token ? 'VORHANDEN' : 'NICHT VORHANDEN');
    
    // 🚀 PERFORMANCE: Cart nicht auf Admin-Seiten laden
    const isAdminPage = window.location.pathname.startsWith('/admin');
    if (isAdminPage) {
      console.log('🚀 Admin-Seite erkannt - überspringe Warenkorb-Load für bessere Performance');
      return;
    }
    
    if (token && isMounted) {
      console.log('📦 Lade Warenkorb beim Mount...');
      loadCart();
    } else {
      console.log('⚠️ Kein Token - Warenkorb wird nicht geladen');
      console.log('💡 Hinweis: Warenkorb wird geladen sobald Benutzer sich anmeldet');
    }

    // Registriere Stock Event Listener für reaktive Updates
    const unsubscribe = stockEventService.subscribe((productId, newStock) => {
      console.log('🛒 Customer Cart received stock update:', { productId, newStock });
      
      if (productId === null) {
        // Globales Update - kompletten Warenkorb neu laden
        const currentToken = cookieManager.getItem('token', 'necessary');
        if (currentToken) {
          loadCart();
        }
      } else {
        // Spezifisches Produkt - Benachrichtigung über Bestandsänderung
        setItems(currentItems => {
          const affectedItem = currentItems.find(item => item.id === productId);
          if (affectedItem) {
            const isStillAvailable = (affectedItem.aktiv !== false) && (newStock?.menge || 0) >= affectedItem.quantity;
            
            if (!isStillAvailable) {
              toast(`${affectedItem.name}: Bestand geändert - bitte Warenkorb prüfen`, {
                icon: '⚠️',
                style: {
                  background: '#fff3cd',
                  border: '1px solid #ffeaa7',
                  color: '#856404',
                },
              });
            }
            
            // Warenkorb neu laden für aktuelle Verfügbarkeitsdaten
            loadCart(true); // Force reload für Stock-Updates
          }
          return currentItems;
        });
      }
    });

    // Cleanup function für StrictMode
    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, [loadCart]); // loadCart als Abhängigkeit hinzufügen

  // Listen for custom login event (wird gefeuert wenn User sich einloggt)
  useEffect(() => {
    const handleLogin = () => {
      console.log('🔐 Login-Event empfangen - Lade Warenkorb...');
      loadCart();
    };

    const handleLogout = () => {
      console.log('🚪 Logout-Event empfangen - Leere Warenkorb...');
      setItems([]);
    };

    window.addEventListener('userLoggedIn', handleLogin);
    window.addEventListener('userLoggedOut', handleLogout);

    return () => {
      window.removeEventListener('userLoggedIn', handleLogin);
      window.removeEventListener('userLoggedOut', handleLogout);
    };
  }, [loadCart]);  // Listen for storage changes (login/logout events from other tabs)
  useEffect(() => {
    const handleStorageChange = (e) => {
      if (e.key === 'token') {
        if (e.newValue) {
          // User logged in
          console.log('🔐 Token-Änderung erkannt - Lade Warenkorb...');
          loadCart();
        } else {
          // User logged out
          console.log('🚪 Logout erkannt - Leere Warenkorb...');
          setItems([]);
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [loadCart]);

  const addToCart = async (product, quantity = 1) => {
    const token = cookieManager.getItem('token', 'necessary');
    if (!token) {
      toast.error('Bitte melden Sie sich an, um Produkte in den Warenkorb zu legen');
      return;
    }

    try {
      const cartItem = {
        produktId: product.id,
        name: product.name,
        preis: product.price,
        sale: product.sale || { isOnSale: false, discountPercent: 0 },
        menge: quantity,
        bild: product.image || '',
        gramm: product.gramm,
        seife: product.seife
      };

      // Optimistische UI-Update - sofort zum lokalen State hinzufügen/aktualisieren
      setItems(prevItems => {
        const existingItemIndex = prevItems.findIndex(item => item.id === product.id);
        
        if (existingItemIndex >= 0) {
          // Item bereits vorhanden - Menge erhöhen
          return prevItems.map((item, index) => 
            index === existingItemIndex 
              ? { ...item, quantity: item.quantity + quantity }
              : item
          );
        } else {
          // Neues Item hinzufügen
          return [...prevItems, {
            id: product.id,
            name: product.name,
            price: product.price,
            sale: product.sale || { isOnSale: false, discountPercent: 0 },
            quantity: quantity,
            image: product.image || '',
            gramm: product.gramm,
            seife: product.seife
          }];
        }
      });

      // Backend-Update
      await cartAPI.addToCart(cartItem);
      
      toast.success('Artikel hinzugefügt');
    } catch (error) {
      console.error('Fehler beim Hinzufügen zum Warenkorb:', error);
      toast.error('Fehler beim Hinzufügen zum Warenkorb');
      // Bei Fehler: Warenkorb neu laden
      loadCart();
    }
  };

  const removeFromCart = async (productId) => {
    const token = cookieManager.getItem('token', 'necessary');
    if (!token) {
      return;
    }

    try {
      // Finde das Item um die korrekte produktId zu bekommen
      // Suche sowohl nach item.id als auch item.produktId
      const item = items.find(item => item.id === productId || item.produktId === productId);
      const backendProduktId = item?.produktId || productId;

      console.log('🗑️ Removing item:', {
        frontendId: productId,
        backendProduktId: backendProduktId,
        foundItem: !!item
      });

      // Optimistische UI-Update - sofort aus lokalem State entfernen
      setItems(prevItems => prevItems.filter(item => 
        item.id !== productId && item.produktId !== productId
      ));
      
      // Backend-Update mit korrekter produktId
      await cartAPI.removeItem(backendProduktId);
      
      toast.success('Artikel entfernt');
    } catch (error) {
      console.error('Fehler beim Entfernen aus Warenkorb:', error);
      toast.error('Fehler beim Entfernen aus Warenkorb');
      // Bei Fehler: Warenkorb neu laden
      loadCart();
    }
  };

  const updateQuantity = async (productId, quantity) => {
    const token = cookieManager.getItem('token', 'necessary');
    if (!token) {
      return;
    }

    if (quantity <= 0) {
      removeFromCart(productId);
      return;
    }

    try {
      // Finde das Item um die korrekte produktId zu bekommen
      // Suche sowohl nach item.id als auch item.produktId
      const item = items.find(item => item.id === productId || item.produktId === productId);
      const backendProduktId = item?.produktId || productId;

      // Bestandsprüfung
      const maxAvailable = item?.bestand?.menge || 0;
      const isAvailable = (item?.aktiv !== false) && (item?.bestand?.menge || 0) > 0;
      
      if (!isAvailable) {
        toast('⚠️ Artikel ist nicht mehr verfügbar', {
          icon: '⚠️',
          style: {
            background: '#fff3cd',
            border: '1px solid #ffeaa7',
            color: '#856404',
          },
        });
        return;
      }
      
      if (quantity > maxAvailable) {
        toast(`⚠️ Nur ${maxAvailable} Stück verfügbar`, {
          icon: '⚠️',
          style: {
            background: '#fff3cd',
            border: '1px solid #ffeaa7',
            color: '#856404',
          },
        });
        quantity = maxAvailable; // Auf verfügbare Menge begrenzen
      }

      console.log('🔄 Updating quantity:', {
        frontendId: productId,
        backendProduktId: backendProduktId,
        quantity: quantity,
        maxAvailable: maxAvailable,
        foundItem: !!item
      });

      // Optimistische UI-Update - sofort lokales State aktualisieren
      setItems(prevItems => prevItems.map(item => 
        (item.id === productId || item.produktId === productId)
          ? { ...item, quantity: quantity }
          : item
      ));
      
      // Backend-Update mit korrekter produktId
      await cartAPI.updateQuantity(backendProduktId, quantity);
      
    } catch (error) {
      console.error('Fehler beim Aktualisieren des Warenkorbs:', error);
      toast.error('Fehler beim Aktualisieren des Warenkorbs');
      // Bei Fehler: Warenkorb neu laden
      loadCart();
    }
  };

  const clearCart = async () => {
    const token = cookieManager.getItem('token', 'necessary');
    if (!token) {
      setItems([]);
      return;
    }

    try {
      // Optimistische UI-Update - sofort leeren
      setItems([]);
      
      // Backend-Update
      await cartAPI.clearCart();
      toast.success('Warenkorb geleert');
    } catch (error) {
      console.error('Fehler beim Leeren des Warenkorbs:', error);
      toast.error('Fehler beim Leeren des Warenkorbs');
      // Bei Fehler: Warenkorb neu laden
      loadCart();
    }
  };

  const getCartTotal = () => {
    return items.reduce((total, item) => {
      // Debugging für Preisprobleme
      const itemPrice = item.price || item.preis || 0;
      console.log('💰 Preisberechnung:', {
        name: item.name,
        price: item.price,
        preis: item.preis,
        finalPrice: itemPrice,
        quantity: item.quantity,
        subtotal: itemPrice * item.quantity
      });
      
      return total + (itemPrice * item.quantity);
    }, 0);
  };

  const getCartItemsCount = () => {
    return items.reduce((total, item) => total + item.quantity, 0);
  };

  // Berechne nur verfügbare Items
  const getAvailableCartTotal = () => {
    return items
      .filter(item => item.isAvailable && item.hasEnoughStock)
      .reduce((total, item) => {
        const itemPrice = item.price || item.preis || 0;
        return total + (itemPrice * item.quantity);
      }, 0);
  };

  // Funktion zum Entfernen nur der verfügbaren (bestellbaren) Artikel
  const clearAvailableItems = async () => {
    try {
      const availableItemIds = items
        .filter(item => item.hasEnoughStock === true)
        .map(item => item.id);
      
      console.log('🛒 Clearing available items:', availableItemIds);
      
      // Entferne verfügbare Artikel einzeln
      for (const itemId of availableItemIds) {
        await removeFromCart(itemId);
      }
      
      console.log('✅ Available items cleared from cart');
    } catch (error) {
      console.error('❌ Error clearing available items:', error);
      toast.error('Fehler beim Leeren der bestellten Artikel');
    }
  };

  const toggleCart = () => {
    setIsOpen(!isOpen);
  };

  const value = {
    items,
    addToCart,
    removeFromCart,
    updateQuantity,
    clearCart,
    clearAvailableItems,
    getCartTotal,
    getAvailableCartTotal,
    getCartItemsCount,
    isOpen,
    toggleCart,
    setIsOpen,
    loading,
    loadCart
  };

  return (
    <CartContext.Provider value={value}>
      {children}
    </CartContext.Provider>
  );
};

export default CartContext;