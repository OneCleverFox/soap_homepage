import React, { createContext, useState, useContext, useEffect } from 'react';
import { cartAPI } from '../services/api';
import toast from 'react-hot-toast';

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

  // Load cart from backend when user logs in
  const loadCart = async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      setItems([]);
      return;
    }

    try {
      setLoading(true);
      const response = await cartAPI.getCart();
      console.log('📦 Raw Cart Data:', response.data.data);
      
      const cartItems = response.data.data.items.map(item => {
        console.log('📦 Cart Item:', {
          name: item.name,
          bildUrl: item.bild,
          produktId: item.produktId
        });
        return {
          id: item.produktId,
          name: item.name,
          price: item.preis,
          quantity: item.menge,
          image: item.bild,
          gramm: item.gramm,
          seife: item.seife
        };
      });
      
      console.log('📦 Mapped Cart Items:', cartItems);
      setItems(cartItems);
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
  };

  // Load cart on component mount if user is logged in
  useEffect(() => {
    const token = localStorage.getItem('token');
    console.log('🔑 Token beim Mount:', token ? 'VORHANDEN' : 'NICHT VORHANDEN');
    
    if (token) {
      console.log('📦 Lade Warenkorb beim Mount...');
      loadCart();
    } else {
      console.log('⚠️ Kein Token - Warenkorb wird nicht geladen');
    }
  }, []); // Nur einmal beim Mount laden

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
  }, []);

  // Listen for storage changes (login/logout events from other tabs)
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
  }, []);

  const addToCart = async (product, quantity = 1) => {
    const token = localStorage.getItem('token');
    if (!token) {
      toast.error('Bitte melden Sie sich an, um Produkte in den Warenkorb zu legen');
      return;
    }

    try {
      const cartItem = {
        produktId: product.id,
        name: product.name,
        preis: product.price,
        menge: quantity,
        bild: product.image || '',
        gramm: product.gramm,
        seife: product.seife
      };

      const response = await cartAPI.addToCart(cartItem);
      const cartItems = response.data.data.items.map(item => ({
        id: item.produktId,
        name: item.name,
        price: item.preis,
        quantity: item.menge,
        image: item.bild,
        gramm: item.gramm,
        seife: item.seife
      }));
      setItems(cartItems);
    } catch (error) {
      console.error('Fehler beim Hinzufügen zum Warenkorb:', error);
      toast.error('Fehler beim Hinzufügen zum Warenkorb');
    }
  };

  const removeFromCart = async (productId) => {
    const token = localStorage.getItem('token');
    if (!token) {
      return;
    }

    try {
      const response = await cartAPI.removeItem(productId);
      const cartItems = response.data.data.items.map(item => ({
        id: item.produktId,
        name: item.name,
        price: item.preis,
        quantity: item.menge,
        image: item.bild,
        gramm: item.gramm,
        seife: item.seife
      }));
      setItems(cartItems);
    } catch (error) {
      console.error('Fehler beim Entfernen aus Warenkorb:', error);
      toast.error('Fehler beim Entfernen aus Warenkorb');
    }
  };

  const updateQuantity = async (productId, quantity) => {
    const token = localStorage.getItem('token');
    if (!token) {
      return;
    }

    try {
      const response = await cartAPI.updateQuantity(productId, quantity);
      const cartItems = response.data.data.items.map(item => ({
        id: item.produktId,
        name: item.name,
        price: item.preis,
        quantity: item.menge,
        image: item.bild,
        gramm: item.gramm,
        seife: item.seife
      }));
      setItems(cartItems);
    } catch (error) {
      console.error('Fehler beim Aktualisieren des Warenkorbs:', error);
      toast.error('Fehler beim Aktualisieren des Warenkorbs');
    }
  };

  const clearCart = async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      setItems([]);
      return;
    }

    try {
      await cartAPI.clearCart();
      setItems([]);
    } catch (error) {
      console.error('Fehler beim Leeren des Warenkorbs:', error);
      toast.error('Fehler beim Leeren des Warenkorbs');
    }
  };

  const getCartTotal = () => {
    return items.reduce((total, item) => {
      const itemPrice = item.price || item.preis || 0;
      return total + (itemPrice * item.quantity);
    }, 0);
  };

  const getCartItemsCount = () => {
    return items.reduce((total, item) => total + item.quantity, 0);
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
    getCartTotal,
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