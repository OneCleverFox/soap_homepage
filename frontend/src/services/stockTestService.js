// Test-Service für Stock-Updates (nur für Entwicklung)
import stockEventService from './stockEventService';

class StockTestService {
  // Simuliert eine Bestandsänderung für Testzwecke
  simulateStockChange(productId, newStock) {
    console.log('🧪 Simulating stock change for testing:', { productId, newStock });
    stockEventService.notifyStockChange(productId, newStock);
  }

  // Simuliert ein globales Stock-Update
  simulateGlobalStockUpdate() {
    console.log('🧪 Simulating global stock update for testing');
    stockEventService.notifyGlobalStockUpdate();
  }

  // Macht Stock-Service global verfügbar für Browser-Console-Tests
  exposeToWindow() {
    if (typeof window !== 'undefined') {
      window.stockTest = {
        simulateStockChange: this.simulateStockChange,
        simulateGlobalUpdate: this.simulateGlobalStockUpdate,
        
        // Hilfsfunktion für häufige Tests
        makeUnavailable: (productId) => {
          this.simulateStockChange(productId, {
            verfuegbar: false,
            menge: 0,
            einheit: 'Stück'
          });
        },
        
        makeLowStock: (productId, amount = 1) => {
          this.simulateStockChange(productId, {
            verfuegbar: true,
            menge: amount,
            einheit: 'Stück'
          });
        },
        
        makeAvailable: (productId, amount = 10) => {
          this.simulateStockChange(productId, {
            verfuegbar: true,
            menge: amount,
            einheit: 'Stück'
          });
        }
      };
      
      console.log('🧪 Stock test functions available in window.stockTest:');
      console.log('  - makeUnavailable(productId)');
      console.log('  - makeLowStock(productId, amount)');
      console.log('  - makeAvailable(productId, amount)');
      console.log('  - simulateGlobalUpdate()');
    }
  }
}

const stockTestService = new StockTestService();

// Automatisch in Entwicklungsumgebung verfügbar machen
if (process.env.NODE_ENV === 'development') {
  stockTestService.exposeToWindow();
}

export default stockTestService;