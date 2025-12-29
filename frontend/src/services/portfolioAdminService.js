/**
 * Zentraler Portfolio-Service für Admin-Operationen
 * Reduziert Code-Duplikation in Portfolio-Komponenten
 */

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

// Auth-Header Helper
const getAuthHeaders = () => ({
  'Authorization': `Bearer ${localStorage.getItem('token')}`,
  'Content-Type': 'application/json'
});

const getAuthHeadersFormData = () => ({
  'Authorization': `Bearer ${localStorage.getItem('token')}`
});

export const portfolioAdminService = {
  // Portfolio CRUD
  async getAll() {
    const response = await fetch(`${API_BASE}/admin/portfolio`, {
      headers: getAuthHeaders()
    });
    return response.json();
  },

  async create(productData) {
    const response = await fetch(`${API_BASE}/admin/portfolio`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(productData)
    });
    return response.json();
  },

  async update(id, productData) {
    const response = await fetch(`${API_BASE}/admin/portfolio/${id}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(productData)
    });
    return response.json();
  },

  async delete(id) {
    const response = await fetch(`${API_BASE}/admin/portfolio/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders()
    });
    return response.json();
  },

  // Statistiken
  async getStats() {
    const response = await fetch(`${API_BASE}/admin/portfolio/stats`, {
      headers: getAuthHeaders()
    });
    return response.json();
  },

  // Image Upload
  async uploadImage(productId, formData) {
    const response = await fetch(`${API_BASE}/admin/portfolio/${productId}/upload-image`, {
      method: 'POST',
      headers: getAuthHeadersFormData(),
      body: formData
    });
    return response.json();
  },

  // Image Delete
  async deleteImage(productId, imageType, imageIndex = '') {
    const url = `${API_BASE}/admin/portfolio/${productId}/image/${imageType}${imageIndex ? `/${imageIndex}` : ''}`;
    const response = await fetch(url, {
      method: 'DELETE',
      headers: getAuthHeaders()
    });
    return response.json();
  },

  // Dynamic Options Loading
  async getSeifenOptions() {
    const response = await fetch(`${API_BASE}/rohseife`, {
      headers: getAuthHeaders()
    });
    const data = await response.json();
    return data.success ? data.data.map(item => item.name) : [];
  },

  async getSeifenformOptions() {
    const response = await fetch(`${API_BASE}/rohseife`, {
      headers: getAuthHeaders()
    });
    const data = await response.json();
    if (data.success) {
      const formen = data.data.map(item => item.form).filter(form => form);
      return [...new Set(formen)]; // Duplikate entfernen
    }
    return [];
  },

  async getVerpackungOptions() {
    const response = await fetch(`${API_BASE}/verpackungen`, {
      headers: getAuthHeaders()
    });
    const data = await response.json();
    return data.success ? data.data.map(item => item.name) : [];
  },

  // Helper Methoden
  calculateNextOrder(products) {
    if (products.length === 0) return 1;
    const maxOrder = Math.max(...products.map(p => p.reihenfolge || 0));
    return maxOrder + 1;
  },

  validateProduct(formData) {
    const errors = [];
    if (!formData.name?.trim()) errors.push('Name ist erforderlich');
    if (!formData.seife?.trim()) errors.push('Seife ist erforderlich');
    if (!formData.aroma?.trim()) errors.push('Aroma ist erforderlich');
    if (!formData.gramm || formData.gramm <= 0) errors.push('Gramm muss größer als 0 sein');
    return errors;
  }
};

export default portfolioAdminService;