// API Endpoints Konfiguration
const API_BASE_URL = process.env.NODE_ENV === 'development' 
  ? 'http://localhost:5000/api' 
  : (process.env.REACT_APP_API_URL || 'https://soap-homepage-backend-production.up.railway.app/api');

export const API_ENDPOINTS = {
  // Authentifizierung
  auth: `${API_BASE_URL}/auth`,
  
  // Produkte
  products: `${API_BASE_URL}/products`,
  portfolio: `${API_BASE_URL}/portfolio`,
  
  // Rohstoffe
  rohseife: `${API_BASE_URL}/rohseife`,
  duftoele: `${API_BASE_URL}/duftoele`,
  verpackungen: `${API_BASE_URL}/verpackungen`,
  zusatzinhaltsstoffe: `${API_BASE_URL}/zusatzinhaltsstoffe`, // NEU
  
  // Lager und Bestand
  inventory: `${API_BASE_URL}/inventory`,
  lager: `${API_BASE_URL}/lager`,
  
  // Warenberechnung
  warenberechnung: `${API_BASE_URL}/warenberechnung`,
  
  // Bestellungen
  orders: `${API_BASE_URL}/orders`,
  cart: `${API_BASE_URL}/cart`,
  
  // Kunden
  kunden: `${API_BASE_URL}/kunden`,
  
  // Admin
  admin: `${API_BASE_URL}/admin`,
  adminSettings: `${API_BASE_URL}/admin-settings`,
  dashboard: `${API_BASE_URL}/dashboard`,
  
  // Anfragen
  inquiries: `${API_BASE_URL}/inquiries`,
  
  // Rechnungen
  invoices: `${API_BASE_URL}/invoices`,
  invoice: `${API_BASE_URL}/invoice`,
  
  // Logs und Debug
  emailLogs: `${API_BASE_URL}/email-logs`,
  debug: `${API_BASE_URL}/debug`
};

export default API_ENDPOINTS;