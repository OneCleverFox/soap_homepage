// 📦 API Service für Kundenbestellungen
const API_BASE_URL = process.env.REACT_APP_API_URL || '/api';

class BestellungenAPI {
  // 🛒 Eigene Bestellungen abrufen
  static async getBestellungen(filters = {}) {
    try {
      const params = new URLSearchParams();
      
      // Filter und Paginierung
      if (filters.status) params.append('status', filters.status);
      if (filters.limit) params.append('limit', filters.limit);
      if (filters.skip) params.append('skip', filters.skip);
      if (filters.sortBy) params.append('sortBy', filters.sortBy);
      if (filters.sortOrder) params.append('sortOrder', filters.sortOrder);

      const url = `${API_BASE_URL}/orders/meine-bestellungen${params.toString() ? '?' + params.toString() : ''}`;
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Fehler beim Laden der Bestellungen');
      }

      return data;

    } catch (error) {
      console.error('❌ Fehler beim Abrufen der Bestellungen:', error);
      throw error;
    }
  }

  // 📋 Einzelne Bestellung abrufen
  static async getBestellung(bestellungId) {
    try {
      const response = await fetch(`${API_BASE_URL}/orders/meine-bestellungen/${bestellungId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Fehler beim Laden der Bestellung');
      }

      return data;

    } catch (error) {
      console.error('❌ Fehler beim Abrufen der Bestellung:', error);
      throw error;
    }
  }

  // 🧾 Rechnung herunterladen
  static async downloadRechnung(bestellungId) {
    try {
      const response = await fetch(`${API_BASE_URL}/orders/meine-bestellungen/${bestellungId}/rechnung`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) {
        // Prüfen ob es ein JSON-Fehler ist
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          const data = await response.json();
          throw new Error(data.message || 'Fehler beim Generieren der Rechnung');
        } else {
          throw new Error('Fehler beim Generieren der Rechnung');
        }
      }

      // PDF Download
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = `Rechnung_${bestellungId}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      console.log('✅ Rechnung erfolgreich heruntergeladen');

    } catch (error) {
      console.error('❌ Fehler beim Herunterladen der Rechnung:', error);
      throw error;
    }
  }

  // 📊 Bestellstatus formatieren
  static formatStatus(status) {
    const statusMap = {
      'ausstehend': { text: 'Ausstehend', color: '#ff9800', icon: '⏳' },
      'bestätigt': { text: 'Bestätigt', color: '#2196f3', icon: '✅' },
      'in_bearbeitung': { text: 'In Bearbeitung', color: '#9c27b0', icon: '🔄' },
      'versendet': { text: 'Versendet', color: '#4caf50', icon: '📦' },
      'geliefert': { text: 'Geliefert', color: '#4caf50', icon: '✅' },
      'storniert': { text: 'Storniert', color: '#f44336', icon: '❌' }
    };

    return statusMap[status] || { text: status, color: '#666', icon: '❓' };
  }

  // 💰 Preis formatieren
  static formatPrice(price) {
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: 'EUR'
    }).format(price || 0);
  }

  // 📅 Datum formatieren
  static formatDate(date) {
    if (!date) return '-';
    
    return new Intl.DateTimeFormat('de-DE', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(new Date(date));
  }

  // 📊 Bestellungsstatistiken berechnen
  static calculateStats(bestellungen) {
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
  }
}

export default BestellungenAPI;