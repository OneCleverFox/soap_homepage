// 📦 Admin Orders API Service

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

class AdminOrdersService {
  
  // 📋 Alle Bestellungen abrufen
  async getOrders(options = {}) {
    const {
      status,
      email,
      kundennummer,
      von,
      bis,
      limit = 50,
      skip = 0,
      sortBy = 'bestelldatum',
      sortOrder = 'desc'
    } = options;

    const params = new URLSearchParams();
    if (status) params.append('status', status);
    if (email) params.append('email', email);
    if (kundennummer) params.append('kundennummer', kundennummer);
    if (von) params.append('von', von);
    if (bis) params.append('bis', bis);
    params.append('limit', limit);
    params.append('skip', skip);
    params.append('sortBy', sortBy);
    params.append('sortOrder', sortOrder);

    try {
      console.log('🔍 Lade Bestellungen mit Optionen:', options);
      
      const response = await fetch(`${API_URL}/api/orders?${params}`, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Fehler beim Laden der Bestellungen');
      }

      console.log(`✅ ${data.data.length} Bestellungen geladen`);
      return data;

    } catch (error) {
      console.error('❌ Fehler beim Laden der Bestellungen:', error);
      throw error;
    }
  }

  // 🔍 Einzelne Bestellung abrufen
  async getOrder(id) {
    try {
      console.log(`🔍 Lade Bestellung: ${id}`);
      
      const response = await fetch(`${API_URL}/api/orders/${id}`, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Bestellung nicht gefunden');
      }

      console.log(`✅ Bestellung geladen: ${data.data.bestellnummer}`);
      return data.data;

    } catch (error) {
      console.error('❌ Fehler beim Laden der Bestellung:', error);
      throw error;
    }
  }

  // 📝 Bestellstatus aktualisieren
  async updateOrderStatus(id, status, notiz) {
    try {
      console.log(`📝 Aktualisiere Status für Bestellung ${id}:`, { status, notiz });
      
      const response = await fetch(`${API_URL}/api/orders/${id}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ status, notiz })
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Fehler beim Status-Update');
      }

      console.log(`✅ Status aktualisiert: ${data.data.bestellnummer} -> ${status}`);
      return data;

    } catch (error) {
      console.error('❌ Fehler beim Status-Update:', error);
      throw error;
    }
  }

  // 🔍 Bestellungen suchen
  async searchOrders(suchbegriff) {
    try {
      console.log(`🔍 Suche Bestellungen: ${suchbegriff}`);
      
      const response = await fetch(`${API_URL}/api/orders/search/${encodeURIComponent(suchbegriff)}`, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Fehler bei der Suche');
      }

      console.log(`✅ ${data.anzahl} Bestellungen gefunden`);
      return data.data;

    } catch (error) {
      console.error('❌ Fehler bei der Suche:', error);
      throw error;
    }
  }

  // 📊 Dashboard-Statistiken abrufen
  async getDashboardStats(zeitraum = '30') {
    try {
      console.log(`📊 Lade Dashboard-Statistiken für ${zeitraum} Tage`);
      
      const response = await fetch(`${API_URL}/api/orders/stats/dashboard?zeitraum=${zeitraum}`, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Fehler beim Laden der Statistiken');
      }

      console.log('✅ Dashboard-Statistiken geladen');
      return data.data;

    } catch (error) {
      console.error('❌ Fehler beim Laden der Statistiken:', error);
      throw error;
    }
  }

  // 🎯 Verfügbare Status-Optionen
  getStatusOptions() {
    return [
      { value: 'ausstehend', label: 'Ausstehend', color: '#ff9800', icon: '⏳' },
      { value: 'bezahlt', label: 'Bezahlt', color: '#4caf50', icon: '💳' },
      { value: 'in_bearbeitung', label: 'In Bearbeitung', color: '#2196f3', icon: '⚙️' },
      { value: 'versendet', label: 'Versendet', color: '#9c27b0', icon: '📦' },
      { value: 'geliefert', label: 'Geliefert', color: '#8bc34a', icon: '✅' },
      { value: 'storniert', label: 'Storniert', color: '#f44336', icon: '❌' },
      { value: 'erstattet', label: 'Erstattet', color: '#607d8b', icon: '💸' }
    ];
  }

  // 🎨 Status-Styling
  getStatusStyling(status) {
    const statusOptions = this.getStatusOptions();
    const statusOption = statusOptions.find(opt => opt.value === status);
    
    return statusOption || { 
      value: status, 
      label: status, 
      color: '#757575', 
      icon: '❓' 
    };
  }

  // 📅 Datum formatieren
  formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  // 💰 Preis formatieren
  formatPrice(price) {
    if (typeof price !== 'number') {
      price = parseFloat(price) || 0;
    }
    
    return price.toLocaleString('de-DE', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 2
    });
  }

  // 📊 Bestellungen nach Status gruppieren
  groupOrdersByStatus(orders) {
    const grouped = {};
    
    this.getStatusOptions().forEach(status => {
      grouped[status.value] = {
        ...status,
        orders: orders.filter(order => order.status === status.value),
        count: orders.filter(order => order.status === status.value).length
      };
    });

    return grouped;
  }

  // 🔢 Statistiken berechnen
  calculateStats(orders) {
    const stats = {
      total: orders.length,
      totalRevenue: 0,
      averageOrderValue: 0,
      statusCounts: {}
    };

    // Gesamtumsatz berechnen
    stats.totalRevenue = orders.reduce((sum, order) => {
      return sum + (order.preise?.gesamtsumme || 0);
    }, 0);

    // Durchschnittlicher Bestellwert
    if (orders.length > 0) {
      stats.averageOrderValue = stats.totalRevenue / orders.length;
    }

    // Status-Verteilung
    orders.forEach(order => {
      const status = order.status || 'unbekannt';
      stats.statusCounts[status] = (stats.statusCounts[status] || 0) + 1;
    });

    return stats;
  }
}

export default new AdminOrdersService();