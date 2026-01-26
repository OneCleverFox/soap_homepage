/**
 * Zentrale Bildverarbeitungs-Utilities
 * Optimiert für die neue URL-basierte Bildarchitektur
 */

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001/api';

/**
 * Konvertiert Bild-Daten (URL-Objekt oder Legacy Base64) zu einer verwendbaren URL
 * @param {Object|string} imageData - Bild-Daten (neues Format: {url, type} oder Legacy: Base64-String)
 * @returns {string|null} - Absolute URL zum Bild
 */
export const getImageUrl = (imageData) => {
  if (!imageData) return null;
  
  // Neue Struktur: { url: '/api/portfolio/:id/image/main', type: 'image/jpeg' }
  if (typeof imageData === 'object' && imageData.url) {
    const url = imageData.url;
    
    // Wenn die URL bereits mit /api beginnt, Backend-Host hinzufügen
    if (url.startsWith('/api')) {
      return `${API_BASE_URL.replace('/api', '')}${url}`;
    }
    
    // Wenn es bereits eine absolute URL ist
    if (url.startsWith('http://') || url.startsWith('https://')) {
      return url;
    }
    
    return url;
  }
  
  // Legacy: String-URLs (Base64 oder externe URLs)
  const imageUrl = imageData;
  
  // Wenn es ein Base64-Bild ist (data:image/...), direkt zurückgeben
  if (typeof imageUrl === 'string' && imageUrl.startsWith('data:image/')) {
    return imageUrl;
  }
  
  // Wenn die URL bereits mit http/https beginnt, direkt zurückgeben
  if (typeof imageUrl === 'string' && (imageUrl.startsWith('http://') || imageUrl.startsWith('https://'))) {
    return imageUrl;
  }
  
  // Legacy: Wenn die URL mit /api beginnt, Backend-Host hinzufügen
  if (typeof imageUrl === 'string' && imageUrl.startsWith('/api')) {
    return `${API_BASE_URL.replace('/api', '')}${imageUrl}`;
  }
  
  // Fallback: Unbekanntes Format
  return null;
};

/**
 * Extrahiert die rohe URL aus Bild-Daten (für Vergleiche)
 * @param {Object|string} imageData - Bild-Daten
 * @returns {string|null} - Rohe URL oder Base64-String
 */
export const getRawImageUrl = (imageData) => {
  if (!imageData) return null;
  
  // Neue Struktur: Extrahiere URL
  if (typeof imageData === 'object' && imageData.url) {
    return imageData.url;
  }
  
  // Legacy: String direkt zurückgeben
  return imageData;
};

/**
 * Generiert einen Platzhalter für fehlende Bilder
 * @param {string} text - Text für den Platzhalter (z.B. Produktname)
 * @returns {string} - Base64-codiertes SVG als Data-URL
 */
export const getPlaceholderImage = (text = 'Kein Bild') => {
  const svg = `
    <svg width="300" height="200" xmlns="http://www.w3.org/2000/svg">
      <rect width="100%" height="100%" fill="#f5f5f5"/>
      <text x="50%" y="50%" font-family="Arial, sans-serif" font-size="14" 
            fill="#999999" text-anchor="middle" dy=".3em">${text}</text>
    </svg>
  `;
  return `data:image/svg+xml;base64,${btoa(svg)}`;
};

/**
 * Prüft ob es sich um ein gültiges Bild handelt
 * @param {Object|string} imageData - Bild-Daten
 * @returns {boolean} - True wenn gültig
 */
export const isValidImage = (imageData) => {
  if (!imageData) return false;
  
  // Neue Struktur
  if (typeof imageData === 'object' && imageData.url) {
    return true;
  }
  
  // Legacy: Base64 oder URL
  if (typeof imageData === 'string' && imageData.trim().length > 0) {
    return true;
  }
  
  return false;
};
