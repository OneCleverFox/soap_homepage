const mongoose = require('mongoose');
const logger = require('./logger');

// Database Performance Optimization Utility
class DatabaseOptimizer {
  
  // MongoDB Index-Empfehlungen basierend auf häufigen Queries
  static async createRecommendedIndexes() {
    // Nur in Development Indizes erstellen
    if (!logger.isDevelopment) {
      return;
    }

    // Warte auf vollständige DB-Verbindung
    if (mongoose.connection.readyState !== 1) {
      console.log('⏳ Waiting for database connection...');
      return;
    }

    // Prüfe ob db verfügbar ist
    if (!mongoose.connection.db) {
      console.log('⏳ Database not ready yet, skipping index creation...');
      return;
    }
    const collections = {
      // User Collection
      users: [
        { email: 1 }, // Login queries
        { username: 1 }, // Username uniqueness
        { rolle: 1 }, // Admin filtering
        { isVerified: 1, createdAt: -1 } // Verification status + newest first
      ],
      
      // Order Collection
      orders: [
        { bestellnummer: 1 }, // Order lookup
        { 'besteller.email': 1 }, // Customer orders
        { status: 1, createdAt: -1 }, // Status filtering + sorting
        { createdAt: -1 }, // Recent orders
        { source: 1 }, // Inquiry vs direct orders
        { 'zahlungsmethode.status': 1 } // Payment status
      ],
      
      // Portfolio Collection
      portfolios: [
        { name: 1 }, // Product search
        { seife: 1, aroma: 1 }, // Product filtering
        { isActive: 1 }, // Active products only
        { gramm: 1 } // Weight-based queries
      ],
      
      // Bestand Collection
      bestands: [
        { artikelId: 1, typ: 1 }, // Inventory lookup
        { menge: 1 }, // Stock level queries
        { typ: 1, menge: 1 } // Low stock alerts
      ],
      
      // Inquiry Collection
      inquiries: [
        { 'kundenDaten.email': 1 }, // Customer inquiries
        { status: 1, createdAt: -1 }, // Status + date sorting
        { createdAt: -1 } // Recent inquiries
      ]
    };
    
    for (const [collectionName, indexes] of Object.entries(collections)) {
      try {
        const collection = mongoose.connection.db.collection(collectionName);
        
        // Hole existierende Indizes
        const existingIndexes = await collection.indexes();
        const existingIndexNames = existingIndexes.map(idx => idx.name);
        
        for (const index of indexes) {
          try {
            const indexName = Object.keys(index).map(key => 
              `${key}_${index[key]}`
            ).join('_');
            
            // Überspringe wenn Index bereits existiert
            if (existingIndexNames.includes(indexName)) {
              console.log(`⏭️ Index already exists: ${collectionName} - ${indexName}`);
              continue;
            }
            
            await collection.createIndex(index, { background: true });
            console.log(`✅ Index created: ${collectionName} - ${JSON.stringify(index)}`);
          } catch (indexError) {
            if (indexError.code === 86) { // IndexKeySpecsConflict
              console.log(`⏭️ Index exists (conflict): ${collectionName} - ${JSON.stringify(index)}`);
            } else {
              console.error(`❌ Failed to create specific index for ${collectionName}:`, indexError.message);
            }
          }
        }
      } catch (error) {
        console.error(`❌ Failed to access collection ${collectionName}:`, error.message);
      }
    }
  }
  
  // Query Performance Monitoring
  static enableSlowQueryLogging() {
    // Slow Query Logging nur in Development
    if (logger.isDevelopment) {
      mongoose.set('debug', (collectionName, method, query, doc, options) => {
        console.log(`🔍 MongoDB Query: ${collectionName}.${method}`, {
          query: JSON.stringify(query),
          options: JSON.stringify(options)
        });
      });
    }
  }
  
  // Connection Pool Optimization
  static getOptimizedConnectionOptions() {
    return {
      maxPoolSize: process.env.NODE_ENV === 'production' ? 20 : 10,
      minPoolSize: 2,
      maxIdleTimeMS: 30000,
      serverSelectionTimeoutMS: 15000,
      socketTimeoutMS: 45000,
      bufferCommands: false, // Disable mongoose buffering
      // Compression für große Dokumente
      compressors: 'snappy,zlib'
    };
  }
  
  // Aggregation Pipeline Helper für komplexe Queries
  static createOrderStatsPipeline(filters = {}) {
    return [
      { $match: filters },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          totalValue: { $sum: '$gesamtsumme' },
          avgValue: { $avg: '$gesamtsumme' }
        }
      },
      { $sort: { count: -1 } }
    ];
  }
  
  // Cache-Helper für häufige Queries
  static createQueryCache() {
    const cache = new Map();
    const TTL = 5 * 60 * 1000; // 5 Minuten
    
    return {
      get: (key) => {
        const item = cache.get(key);
        if (!item) return null;
        
        if (Date.now() > item.expiry) {
          cache.delete(key);
          return null;
        }
        
        return item.data;
      },
      
      set: (key, data) => {
        cache.set(key, {
          data,
          expiry: Date.now() + TTL
        });
      },
      
      clear: () => cache.clear(),
      size: () => cache.size
    };
  }
}

module.exports = DatabaseOptimizer;