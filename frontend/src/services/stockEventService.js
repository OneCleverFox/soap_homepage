// Stock Event Service für reaktive Warenkorb-Updates
class StockEventService {
  constructor() {
    this.listeners = new Set();
  }

  // Registriere einen Listener für Bestandsänderungen
  subscribe(callback) {
    this.listeners.add(callback);
    
    // Return unsubscribe function
    return () => {
      this.listeners.delete(callback);
    };
  }

  // Benachrichtige alle Listeners über Bestandsänderungen
  notifyStockChange(productId, newStock) {
    console.log('📦 Stock change notification:', { productId, newStock });
    
    this.listeners.forEach(callback => {
      try {
        callback(productId, newStock);
      } catch (error) {
        console.error('Error in stock change listener:', error);
      }
    });
  }

  // Globale Bestandsänderung (alle Warenkörbe neu laden)
  notifyGlobalStockUpdate() {
    console.log('🔄 Global stock update notification');
    
    this.listeners.forEach(callback => {
      try {
        callback(null, null); // null signalisiert globales Update
      } catch (error) {
        console.error('Error in global stock update listener:', error);
      }
    });
  }
}

// Singleton Instance
const stockEventService = new StockEventService();

export default stockEventService;