const NodeCache = require('node-cache');
const logger = require('./logger');

// Multi-Level Caching System
class CacheManager {
  constructor() {
    // Caching nur in Development aktivieren
    this.isActive = logger.isDevelopment;
    
    if (!this.isActive) {
      // In Production: No-op Cache - alle Methoden tun nichts
      this.getProducts = async () => null;
      this.setUserSession = () => {};
      this.getUserSession = () => null;
      this.setCart = () => {};
      this.getCart = () => null;
      this.invalidateCart = () => {};
      this.getOrderStats = async () => null;
      this.set = () => {};
      this.get = () => null;
      this.del = () => {};
      this.invalidateProductCache = () => {};
      this.invalidateOrderCache = () => {};
      this.getStats = () => ({ short: {}, medium: {}, long: {} });
      this.warmupCache = async () => {};
      this.flush = () => {};
      return;
    }
    // Short-term cache (5 minutes)
    this.shortCache = new NodeCache({ 
      stdTTL: 300,
      checkperiod: 60,
      useClones: false
    });
    
    // Medium-term cache (1 hour)
    this.mediumCache = new NodeCache({ 
      stdTTL: 3600,
      checkperiod: 600,
      useClones: false
    });
    
    // Long-term cache (24 hours)
    this.longCache = new NodeCache({ 
      stdTTL: 86400,
      checkperiod: 7200,
      useClones: false
    });
    
    this.setupEventListeners();
  }
  
  setupEventListeners() {
    // Cache statistics
    this.shortCache.on('set', (key, value) => {
      console.log(`📦 Short Cache SET: ${key}`);
    });
    
    this.shortCache.on('expired', (key, value) => {
      console.log(`⏰ Short Cache EXPIRED: ${key}`);
    });
  }
  
  // Cache Strategies
  
  // 1. Product Cache (Medium-term)
  async getProducts(forceRefresh = false) {
    const key = 'all_products';
    
    if (!forceRefresh) {
      const cached = this.mediumCache.get(key);
      if (cached) return cached;
    }
    
    try {
      // Wenn nicht gecached, aus DB laden
      const Portfolio = require('../models/Portfolio');
      
      // Prüfe DB-Verbindung
      const mongoose = require('mongoose');
      if (mongoose.connection.readyState !== 1) {
        console.warn('⚠️ Database not ready for product loading');
        return [];
      }
      
      const products = await Portfolio.find({ isActive: true })
        .select('name seife aroma gramm preis beschreibung bilder')
        .lean();
        
      this.mediumCache.set(key, products);
      return products;
    } catch (error) {
      console.warn('⚠️ Failed to load products for cache:', error.message);
      return [];
    }
  }
  
  // 2. User Session Cache (Short-term)
  setUserSession(userId, sessionData) {
    const key = `user_session_${userId}`;
    this.shortCache.set(key, sessionData);
  }
  
  getUserSession(userId) {
    const key = `user_session_${userId}`;
    return this.shortCache.get(key);
  }
  
  // 3. Cart Cache (Short-term)
  setCart(userId, cartData) {
    const key = `cart_${userId}`;
    this.shortCache.set(key, cartData);
  }
  
  getCart(userId) {
    const key = `cart_${userId}`;
    return this.shortCache.get(key);
  }
  
  invalidateCart(userId) {
    const key = `cart_${userId}`;
    this.shortCache.del(key);
  }
  
  // 4. Order Statistics Cache (Long-term)
  async getOrderStats(forceRefresh = false) {
    const key = 'order_statistics';
    
    if (!forceRefresh) {
      const cached = this.longCache.get(key);
      if (cached) return cached;
    }
    
    try {
      // Prüfe DB-Verbindung
      const mongoose = require('mongoose');
      if (mongoose.connection.readyState !== 1) {
        console.warn('⚠️ Database not ready for order stats');
        return [];
      }
      
      const Order = require('../models/Order');
      const stats = await Order.aggregate([
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 },
            totalValue: { $sum: '$gesamtsumme' }
          }
        }
      ]);
      
      this.longCache.set(key, stats);
      return stats;
    } catch (error) {
      console.warn('⚠️ Failed to load order stats for cache:', error.message);
      return [];
    }
  }
  
  // 5. Generic Cache Methods
  set(key, value, ttl = null) {
    if (ttl) {
      this.shortCache.set(key, value, ttl);
    } else {
      this.shortCache.set(key, value);
    }
  }
  
  get(key) {
    return this.shortCache.get(key) || 
           this.mediumCache.get(key) || 
           this.longCache.get(key);
  }
  
  del(key) {
    this.shortCache.del(key);
    this.mediumCache.del(key);
    this.longCache.del(key);
  }
  
  // Cache Invalidation
  invalidateProductCache() {
    this.mediumCache.del('all_products');
    console.log('🗑️ Product cache invalidated');
  }
  
  invalidateOrderCache() {
    this.longCache.del('order_statistics');
    console.log('🗑️ Order statistics cache invalidated');
  }
  
  // Cache Statistics
  getStats() {
    return {
      short: {
        keys: this.shortCache.keys().length,
        hits: this.shortCache.getStats().hits,
        misses: this.shortCache.getStats().misses
      },
      medium: {
        keys: this.mediumCache.keys().length,
        hits: this.mediumCache.getStats().hits,
        misses: this.mediumCache.getStats().misses
      },
      long: {
        keys: this.longCache.keys().length,
        hits: this.longCache.getStats().hits,
        misses: this.longCache.getStats().misses
      }
    };
  }
  
  // Cache Warming
  async warmupCache() {
    if (!this.isActive) {
      return;
    }
    
    // Prüfe DB-Verbindung vor Cache-Operationen
    const mongoose = require('mongoose');
    if (mongoose.connection.readyState !== 1) {
      console.log('⏳ Database not ready for cache warmup, skipping...');
      return;
    }
    
    console.log('🔥 Starting cache warmup...');
    
    try {
      // Pre-load frequently accessed data mit Timeout
      await Promise.race([
        this.getProducts(),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Cache warmup timeout')), 5000)
        )
      ]);
      
      await Promise.race([
        this.getOrderStats(),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Cache warmup timeout')), 5000)
        )
      ]);
      
      console.log('✅ Cache warmup completed');
    } catch (error) {
      console.warn('⚠️ Cache warmup failed (non-critical):', error.message);
    }
  }
  
  // Clear all caches
  flush() {
    this.shortCache.flushAll();
    this.mediumCache.flushAll();
    this.longCache.flushAll();
    console.log('🧹 All caches cleared');
  }
}

// Export singleton instance
const cacheManager = new CacheManager();

// Cache Middleware
const cacheMiddleware = (cacheName, ttl = 300) => {
  return (req, res, next) => {
    const key = `${cacheName}_${req.originalUrl}_${JSON.stringify(req.query)}`;
    const cached = cacheManager.get(key);
    
    if (cached) {
      console.log(`📦 Cache HIT: ${key}`);
      return res.json(cached);
    }
    
    // Override res.json to cache the response
    const originalJson = res.json;
    res.json = function(body) {
      cacheManager.set(key, body, ttl);
      console.log(`📦 Cache SET: ${key}`);
      return originalJson.call(this, body);
    };
    
    next();
  };
};

module.exports = {
  cacheManager,
  cacheMiddleware
};