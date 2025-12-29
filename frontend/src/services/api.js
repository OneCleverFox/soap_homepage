import axios from 'axios';
import toast from 'react-hot-toast';

// API Base URL
// Im Development-Modus verwenden wir die volle URL (Proxy funktioniert nicht immer zuverlässig)
// In Production kommt die vollständige URL aus der Environment-Variable
const API_BASE_URL = process.env.NODE_ENV === 'development' 
  ? 'http://localhost:5000/api' 
  : (process.env.REACT_APP_API_URL || 'https://soap-homepage-backend-production.up.railway.app/api');

// Export für direkten Zugriff
export const API_URL = API_BASE_URL;

// Debug: Log API URL only in development
if (process.env.NODE_ENV === 'development') {
  console.log('🔧 API Base URL:', API_BASE_URL);
  console.log('🔧 REACT_APP_API_URL:', process.env.REACT_APP_API_URL);
}

// Axios Instance erstellen
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000, // 15 Sekunden Timeout (erhöht für Railway)
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request Interceptor für Token und Performance-Monitoring
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    // Performance-Tracking
    config.metadata = { startTime: performance.now() };
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response Interceptor für Error Handling und Performance-Monitoring
api.interceptors.response.use(
  (response) => {
    // Performance-Tracking
    if (response.config.metadata) {
      const duration = performance.now() - response.config.metadata.startTime;
      const url = response.config.url;
      
      if (duration > 2000) {
        console.warn(`⚠️ Slow API call: ${url} took ${Math.round(duration)}ms`);
      } else {
        console.log(`✅ API call: ${url} took ${Math.round(duration)}ms`);
      }
    }
    
    return response;
  },
  (error) => {
    // Performance-Tracking auch bei Fehlern
    if (error.config && error.config.metadata) {
      const duration = performance.now() - error.config.metadata.startTime;
      console.error(`❌ Failed API call: ${error.config.url} after ${Math.round(duration)}ms`);
    }
    
    const { response } = error;
    
    if (response) {
      switch (response.status) {
        case 401:
          // Bei bestimmten nicht-kritischen Endpunkten nicht automatisch ausloggen
          const url = error.config.url;
          const nonCriticalEndpoints = ['/inquiries', '/orders'];
          const isNonCritical = nonCriticalEndpoints.some(endpoint => url.includes(endpoint));
          
          if (isNonCritical) {
            console.warn(`401 bei nicht-kritischem Endpoint: ${url}`);
            // Fehler weiterwerfen, aber nicht ausloggen
            break;
          }
          
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          window.location.href = '/login';
          toast.error('Sitzung abgelaufen. Bitte erneut anmelden.');
          break;
        case 403:
          toast.error('Keine Berechtigung für diese Aktion.');
          break;
        case 404:
          // 404-Fehler nur loggen, aber keinen Toast zeigen
          // Wird oft für nicht-kritische Endpunkte verwendet
          console.warn(`404: ${error.config.url} nicht gefunden`);
          break;
        case 429:
          toast.error('Zu viele Anfragen. Bitte versuchen Sie es später erneut.');
          break;
        case 500:
          toast.error('Serverfehler. Bitte versuchen Sie es später erneut.');
          break;
        case 503:
          // Service unavailable - meist Datenbankprobleme
          const errorData = response.data;
          if (errorData?.error === 'DATABASE_UNAVAILABLE') {
            toast.error('Datenbank ist momentan nicht verfügbar. Bitte versuchen Sie es später erneut.');
          } else {
            toast.error('Dienst momentan nicht verfügbar. Bitte versuchen Sie es später erneut.');
          }
          break;
        default:
          toast.error(response.data?.message || 'Ein Fehler ist aufgetreten.');
      }
    } else if (error.code === 'ECONNABORTED') {
      toast.error('Anfrage-Timeout. Bitte überprüfen Sie Ihre Internetverbindung.');
    } else {
      toast.error('Netzwerkfehler. Bitte überprüfen Sie Ihre Internetverbindung.');
    }
    
    return Promise.reject(error);
  }
);

// API Service Funktionen

// Auth API
export const authAPI = {
  login: (credentials) => api.post('/auth/login', credentials),
  register: (userData) => api.post('/auth/register', userData),
  verifyEmail: (token) => api.get(`/auth/verify-email/${token}`),
  resendVerification: (email) => api.post('/auth/resend-verification', { email }),
  getProfile: () => api.get('/auth/me'),
  updateProfile: (profileData) => api.put('/auth/profile', profileData),
  changePassword: (passwordData) => api.put('/auth/password', passwordData),
  logout: () => api.post('/auth/logout'),
  verify: () => api.get('/auth/verify'),
};

// Products API
export const productsAPI = {
  getProducts: (params = {}) => api.get('/products', { params }),
  getProduct: (id) => api.get(`/products/${id}`),
  createProduct: (productData) => api.post('/products', productData),
  updateProduct: (id, productData) => api.put(`/products/${id}`, productData),
  deleteProduct: (id) => api.delete(`/products/${id}`),
  getFeaturedProducts: () => api.get('/products/featured'),
  getCategories: () => api.get('/products/categories'),
  updateStock: (id, stockData) => api.put(`/products/${id}/stock`, stockData),
  getLowStockProducts: () => api.get('/products/admin/low-stock'),
};

// Orders API
export const ordersAPI = {
  // Admin Order Functions
  createOrder: (orderData) => api.post('/orders', orderData),
  getOrders: (params = {}) => api.get('/orders', { params }),
  getOrder: (id) => api.get(`/orders/${id}`),
  updateOrderStatus: (id, statusData) => api.put(`/orders/${id}/status`, statusData),
  trackOrder: (orderNumber, email) => api.get(`/orders/public/${orderNumber}?email=${email}`),
  
  // Customer Order Functions (from bestellungenAPI.js)
  getCustomerOrders: (filters = {}) => {
    const params = new URLSearchParams();
    if (filters.status) params.append('status', filters.status);
    if (filters.limit) params.append('limit', filters.limit);
    if (filters.skip) params.append('skip', filters.skip);
    if (filters.sortBy) params.append('sortBy', filters.sortBy);
    if (filters.sortOrder) params.append('sortOrder', filters.sortOrder);
    
    const queryString = params.toString() ? '?' + params.toString() : '';
    return api.get(`/orders/meine-bestellungen${queryString}`);
  },
  
  getCustomerOrder: (bestellungId) => api.get(`/orders/meine-bestellungen/${bestellungId}`),
  
  downloadCustomerInvoice: async (bestellungId) => {
    const response = await api.get(`/orders/meine-bestellungen/${bestellungId}/rechnung`, {
      responseType: 'blob'
    });
    
    if (response.data.type === 'application/json') {
      const text = await response.data.text();
      const error = JSON.parse(text);
      throw new Error(error.message || 'Rechnung nicht verfügbar');
    }
    
    return response.data;
  },
  
  // Statistics calculation (from bestellungenAPI.js)
  calculateStats: (bestellungen) => {
    if (!bestellungen || bestellungen.length === 0) {
      return {
        gesamtsumme: 0,
        anzahlBestellungen: 0,
        durchschnittswert: 0,
        statusVerteilung: {}
      };
    }
    
    const gesamtsumme = bestellungen.reduce((sum, b) => sum + (b.gesamt?.brutto || 0), 0);
    const anzahlBestellungen = bestellungen.length;
    const durchschnittswert = gesamtsumme / anzahlBestellungen;
    
    const statusVerteilung = bestellungen.reduce((acc, b) => {
      acc[b.status] = (acc[b.status] || 0) + 1;
      return acc;
    }, {});
    
    return {
      gesamtsumme,
      anzahlBestellungen,
      durchschnittswert,
      statusVerteilung
    };
  },
  
  // Utility functions (from bestellungenAPI.js)
  formatStatus: (status) => {
    const statusMap = {
      'ausstehend': { text: 'Ausstehend', color: '#ff9800', icon: '⏳' },
      'bestätigt': { text: 'Bestätigt', color: '#2196f3', icon: '✅' },
      'in_bearbeitung': { text: 'In Bearbeitung', color: '#9c27b0', icon: '🔄' },
      'versendet': { text: 'Versendet', color: '#4caf50', icon: '📦' },
      'geliefert': { text: 'Geliefert', color: '#4caf50', icon: '✅' },
      'storniert': { text: 'Storniert', color: '#f44336', icon: '❌' }
    };

    return statusMap[status] || { text: status, color: '#666', icon: '❓' };
  },
  
  formatPrice: (price) => {
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: 'EUR'
    }).format(price || 0);
  },
  
  formatDate: (date) => {
    if (!date) return '-';
    
    return new Intl.DateTimeFormat('de-DE', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(new Date(date));
  }
};

// Inventory API
export const inventoryAPI = {
  getOverview: () => api.get('/inventory/overview'),
  getLowStock: () => api.get('/inventory/low-stock'),
  getOutOfStock: () => api.get('/inventory/out-of-stock'),
  restock: (restockData) => api.post('/inventory/restock', restockData),
  getMovements: (params = {}) => api.get('/inventory/movements', { params }),
  getAnalytics: (params = {}) => api.get('/inventory/analytics', { params }),
};

// Users API (Admin only)
export const usersAPI = {
  getUsers: (params = {}) => api.get('/users', { params }),
  getUser: (id) => api.get(`/users/${id}`),
  createUser: (userData) => api.post('/users', userData),
  updateUser: (id, userData) => api.put(`/users/${id}`, userData),
  deleteUser: (id) => api.delete(`/users/${id}`),
  updatePassword: (id, passwordData) => api.put(`/users/${id}/password`, passwordData),
  blockUser: (id) => api.put(`/users/${id}/block`),
  unblockUser: (id) => api.put(`/users/${id}/unblock`),
  getStats: () => api.get('/users/stats/overview'),
};

// Kunden API (Customers)
export const kundenAPI = {
  getKunden: (params = {}) => api.get('/kunden', { params }),
  getKunde: (id) => api.get(`/kunden/${id}`),
  updateKunde: (id, kundeData) => api.put(`/kunden/${id}`, kundeData),
  getStats: () => api.get('/kunden/stats/overview'),
  
  // Profil-Management für angemeldete Kunden
  getProfile: () => api.get('/kunden/profil'),
  updateProfile: (profileData) => api.put('/kunden/profil', profileData),
};

// Analytics API
export const analyticsAPI = {
  getDashboardStats: () => api.get('/analytics/dashboard'),
  getSalesReport: (params = {}) => api.get('/analytics/sales', { params }),
  getProductAnalytics: (params = {}) => api.get('/analytics/products', { params }),
  getCustomerAnalytics: (params = {}) => api.get('/analytics/customers', { params }),
};

// Portfolio API
export const portfolioAPI = {
  getAll: () => api.get('/portfolio'),
  getWithPrices: () => api.get('/portfolio/with-prices'),
  getById: (id) => api.get(`/portfolio/${id}`),
  create: (portfolioData) => api.post('/portfolio', portfolioData),
  update: (id, portfolioData) => api.put(`/portfolio/${id}`, portfolioData),
  delete: (id) => api.delete(`/portfolio/${id}`),
};

// Cart API
export const cartAPI = {
  getCart: () => api.get('/cart'),
  getAdminCart: () => api.get('/admin/cart'),
  addToCart: (cartItem) => api.post('/cart/add', cartItem),
  updateQuantity: (produktId, menge) => api.put('/cart/update', { produktId, menge }),
  removeItem: (produktId) => api.delete(`/cart/remove/${produktId}`),
  clearCart: () => api.delete('/cart/clear'),
};

// Health Check
export const healthAPI = {
  check: () => api.get('/health'),
};

export default api;