import React, { createContext, useContext, useReducer, useEffect } from 'react';
import toast from 'react-hot-toast';

// Initial State
const initialState = {
  items: [],
  totalItems: 0,
  totalPrice: 0,
  isLoading: false,
};

// Action Types
const CART_ACTIONS = {
  LOAD_CART: 'LOAD_CART',
  ADD_ITEM: 'ADD_ITEM',
  REMOVE_ITEM: 'REMOVE_ITEM',
  UPDATE_QUANTITY: 'UPDATE_QUANTITY',
  CLEAR_CART: 'CLEAR_CART',
  SET_LOADING: 'SET_LOADING',
};

// Reducer
const cartReducer = (state, action) => {
  switch (action.type) {
    case CART_ACTIONS.LOAD_CART:
      return {
        ...state,
        ...action.payload,
      };

    case CART_ACTIONS.ADD_ITEM: {
      const existingItemIndex = state.items.findIndex(
        item => item.productId === action.payload.productId
      );

      let newItems;
      if (existingItemIndex >= 0) {
        // Item exists, update quantity
        newItems = state.items.map((item, index) =>
          index === existingItemIndex
            ? { ...item, quantity: item.quantity + action.payload.quantity }
            : item
        );
      } else {
        // New item
        newItems = [...state.items, action.payload];
      }

      const totalItems = newItems.reduce((sum, item) => sum + item.quantity, 0);
      const totalPrice = newItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);

      return {
        ...state,
        items: newItems,
        totalItems,
        totalPrice,
      };
    }

    case CART_ACTIONS.REMOVE_ITEM: {
      const newItems = state.items.filter(item => item.productId !== action.payload);
      const totalItems = newItems.reduce((sum, item) => sum + item.quantity, 0);
      const totalPrice = newItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);

      return {
        ...state,
        items: newItems,
        totalItems,
        totalPrice,
      };
    }

    case CART_ACTIONS.UPDATE_QUANTITY: {
      const { productId, quantity } = action.payload;
      
      if (quantity <= 0) {
        // Remove item if quantity is 0 or less
        const newItems = state.items.filter(item => item.productId !== productId);
        const totalItems = newItems.reduce((sum, item) => sum + item.quantity, 0);
        const totalPrice = newItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);

        return {
          ...state,
          items: newItems,
          totalItems,
          totalPrice,
        };
      }

      const newItems = state.items.map(item =>
        item.productId === productId
          ? { ...item, quantity }
          : item
      );

      const totalItems = newItems.reduce((sum, item) => sum + item.quantity, 0);
      const totalPrice = newItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);

      return {
        ...state,
        items: newItems,
        totalItems,
        totalPrice,
      };
    }

    case CART_ACTIONS.CLEAR_CART:
      return {
        ...state,
        items: [],
        totalItems: 0,
        totalPrice: 0,
      };

    case CART_ACTIONS.SET_LOADING:
      return {
        ...state,
        isLoading: action.payload,
      };

    default:
      return state;
  }
};

// Context
const CartContext = createContext();

// Provider Component
export const CartProvider = ({ children }) => {
  const [state, dispatch] = useReducer(cartReducer, initialState);

  // Load cart from localStorage on mount
  useEffect(() => {
    const savedCart = localStorage.getItem('cart');
    if (savedCart) {
      try {
        const cartData = JSON.parse(savedCart);
        dispatch({
          type: CART_ACTIONS.LOAD_CART,
          payload: cartData,
        });
      } catch (error) {
        console.error('Error loading cart from localStorage:', error);
        localStorage.removeItem('cart');
      }
    }
  }, []);

  // Save cart to localStorage whenever it changes
  useEffect(() => {
    if (state.items.length > 0 || state.totalItems > 0) {
      localStorage.setItem('cart', JSON.stringify(state));
    } else {
      localStorage.removeItem('cart');
    }
  }, [state]);

  // Add item to cart
  const addItem = (product, quantity = 1) => {
    const cartItem = {
      productId: product._id,
      name: product.name,
      price: product.price,
      image: product.images?.[0]?.url || '',
      quantity: quantity,
      maxStock: product.stock?.quantity || 0,
    };

    // Check if adding this quantity would exceed stock
    const existingItem = state.items.find(item => item.productId === product._id);
    const currentQuantity = existingItem ? existingItem.quantity : 0;
    const newTotalQuantity = currentQuantity + quantity;

    if (newTotalQuantity > cartItem.maxStock) {
      toast.error(`Nur ${cartItem.maxStock} Stück verfügbar`);
      return false;
    }

    dispatch({
      type: CART_ACTIONS.ADD_ITEM,
      payload: cartItem,
    });

    toast.success(`${product.name} zum Warenkorb hinzugefügt`);
    return true;
  };

  // Remove item from cart
  const removeItem = (productId) => {
    dispatch({
      type: CART_ACTIONS.REMOVE_ITEM,
      payload: productId,
    });

    toast.success('Artikel aus Warenkorb entfernt');
  };

  // Update item quantity
  const updateQuantity = (productId, quantity) => {
    const item = state.items.find(item => item.productId === productId);
    
    if (!item) return false;

    // Check stock limit
    if (quantity > item.maxStock) {
      toast.error(`Nur ${item.maxStock} Stück verfügbar`);
      return false;
    }

    dispatch({
      type: CART_ACTIONS.UPDATE_QUANTITY,
      payload: { productId, quantity },
    });

    return true;
  };

  // Clear entire cart
  const clearCart = () => {
    dispatch({ type: CART_ACTIONS.CLEAR_CART });
    toast.success('Warenkorb geleert');
  };

  // Get item by product ID
  const getItem = (productId) => {
    return state.items.find(item => item.productId === productId);
  };

  // Check if item is in cart
  const isInCart = (productId) => {
    return state.items.some(item => item.productId === productId);
  };

  // Get cart summary for checkout
  const getCartSummary = () => {
    const subtotal = state.totalPrice;
    const shippingCost = subtotal >= 50 ? 0 : 4.99; // Free shipping over €50
    const taxRate = 0.19; // 19% VAT
    const taxAmount = subtotal * taxRate;
    const total = subtotal + shippingCost + taxAmount;

    return {
      subtotal: Number(subtotal.toFixed(2)),
      shippingCost: Number(shippingCost.toFixed(2)),
      taxAmount: Number(taxAmount.toFixed(2)),
      total: Number(total.toFixed(2)),
      itemCount: state.totalItems,
    };
  };

  // Validate cart items (check stock, prices)
  const validateCart = async () => {
    // This would typically make API calls to validate current prices and stock
    // For now, we'll just return true
    return { isValid: true, errors: [] };
  };

  const value = {
    // State
    items: state.items,
    totalItems: state.totalItems,
    totalPrice: state.totalPrice,
    isLoading: state.isLoading,
    
    // Actions
    addItem,
    removeItem,
    updateQuantity,
    clearCart,
    getItem,
    isInCart,
    getCartSummary,
    validateCart,
  };

  return (
    <CartContext.Provider value={value}>
      {children}
    </CartContext.Provider>
  );
};

// Custom Hook
export const useCart = () => {
  const context = useContext(CartContext);
  
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  
  return context;
};