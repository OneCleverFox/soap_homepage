import { API_URL } from './api';

const BASE = `${API_URL}/admin/documents`;

function authHeaders(extra = {}) {
  const token = localStorage.getItem('token');
  return {
    Authorization: `Bearer ${token}`,
    ...extra
  };
}

async function handleJson(response, fallbackMessage) {
  const data = await response.json();
  if (!response.ok || data.success === false) {
    throw new Error(data.message || fallbackMessage);
  }
  return data.data;
}

export const adminDocumentsService = {
  getTypes: async () => {
    const response = await fetch(`${BASE}/types`, { headers: authHeaders() });
    return handleJson(response, 'Dokumenttypen konnten nicht geladen werden');
  },

  getBlanko: async () => {
    const response = await fetch(`${BASE}/blanko`, { headers: authHeaders() });
    return handleJson(response, 'Blanko-Dokumente konnten nicht geladen werden');
  },

  getFilled: async () => {
    const response = await fetch(`${BASE}/filled`, { headers: authHeaders() });
    return handleJson(response, 'Dokumente konnten nicht geladen werden');
  },

  getById: async (id) => {
    const response = await fetch(`${BASE}/${id}`, { headers: authHeaders() });
    return handleJson(response, 'Dokument konnte nicht geladen werden');
  },

  createFilledFromType: async (documentType, payload = {}) => {
    const response = await fetch(`${BASE}/filled/${documentType}`, {
      method: 'POST',
      headers: authHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify(payload)
    });
    return handleJson(response, 'Dokument konnte nicht erstellt werden');
  },

  updateFilled: async (id, payload) => {
    const response = await fetch(`${BASE}/${id}`, {
      method: 'PUT',
      headers: authHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify(payload)
    });
    return handleJson(response, 'Dokument konnte nicht aktualisiert werden');
  },

  deleteFilled: async (id) => {
    const response = await fetch(`${BASE}/${id}`, {
      method: 'DELETE',
      headers: authHeaders()
    });
    return handleJson(response, 'Dokument konnte nicht geloescht werden');
  },

  createNewVersion: async (id) => {
    const response = await fetch(`${BASE}/${id}/new-version`, {
      method: 'POST',
      headers: authHeaders()
    });
    return handleJson(response, 'Neue Version konnte nicht erstellt werden');
  },

  getRenderedHtml: async (id) => {
    const response = await fetch(`${BASE}/${id}/html`, { headers: authHeaders() });
    return handleJson(response, 'Vorschau konnte nicht geladen werden');
  },

  downloadPdf: async (id, fileName = 'dokument.pdf') => {
    const response = await fetch(`${BASE}/${id}/pdf`, { headers: authHeaders() });
    if (!response.ok) {
      throw new Error('PDF konnte nicht heruntergeladen werden');
    }

    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  }
};