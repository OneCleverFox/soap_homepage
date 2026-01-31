const logger = require('./logger');
const { IPAnonymizer } = require('./ipAnonymizer');

// Performance Monitoring nur in Development
class PerformanceMonitor {
  constructor() {
    // Performance Monitoring nur in Development aktivieren
    this.isActive = logger.isDevelopment;
    
    if (!this.isActive) {
      // In Production: No-op functions
      this.trackRequest = (req, res, next) => next();
      this.trackDatabaseQuery = () => {};
      this.trackCacheOperation = () => {};
      this.updateMetric = () => {};
      this.checkMemoryUsage = () => ({ percentage: 0 });
      this.checkCpuUsage = () => ({ user: 0, system: 0 });
      this.getHealthMetrics = () => ({ memory: {}, requests: {}, database: {}, cache: {} });
      this.getRequestStats = () => ({});
      this.getDatabaseStats = () => ({});
      this.getCacheStats = () => ({});
      this.startMonitoring = () => {};
      return;
    }
    this.metrics = {
      requests: new Map(),
      database: new Map(),
      cache: new Map()
    };
    
    this.thresholds = {
      slowRequest: 1000, // 1 second
      slowDatabase: 500,  // 500ms
      criticalMemory: 0.8 // 80% memory usage
    };
  }
  
  // Request Performance Tracking
  trackRequest(req, res, next) {
    if (!this.isActive) {
      return next();
    }
    
    const start = Date.now();
    const route = `${req.method} ${req.route?.path || req.path}`;
    
    res.on('finish', () => {
      const duration = Date.now() - start;
      const statusCode = res.statusCode;
      
      // Store metrics
      this.updateMetric('requests', route, {
        duration,
        statusCode,
        timestamp: new Date()
      });
      
      // Log slow requests
      if (duration > this.thresholds.slowRequest) {
        logger.warning(`Slow request detected: ${route} took ${duration}ms`, {
          route,
          duration,
          statusCode,
          // DSGVO-konforme IP-Anonymisierung für Logs
          ip: IPAnonymizer.anonymizeIP(req.ip, true)
        });
      }
    });
    
    next();
  }
  
  // Database Query Performance
  trackDatabaseQuery(operation, duration, collection) {
    const key = `${collection}.${operation}`;
    
    this.updateMetric('database', key, {
      duration,
      timestamp: new Date()
    });
    
    if (duration > this.thresholds.slowDatabase) {
      logger.warning(`Slow database query: ${key} took ${duration}ms`, {
        operation,
        collection,
        duration
      });
    }
  }
  
  // Cache Performance
  trackCacheOperation(operation, key, hit = false) {
    const cacheKey = `${operation}_${hit ? 'hit' : 'miss'}`;
    
    this.updateMetric('cache', cacheKey, {
      key,
      timestamp: new Date()
    });
  }
  
  // Update metrics helper
  updateMetric(type, key, data) {
    if (!this.metrics[type].has(key)) {
      this.metrics[type].set(key, []);
    }
    
    const metrics = this.metrics[type].get(key);
    metrics.push(data);
    
    // Keep only last 100 entries
    if (metrics.length > 100) {
      metrics.shift();
    }
  }
  
  // Memory Monitoring
  checkMemoryUsage() {
    const usage = process.memoryUsage();
    const totalMemory = require('os').totalmem();
    const usedMemory = usage.rss;
    const memoryPercent = usedMemory / totalMemory;
    
    if (memoryPercent > this.thresholds.criticalMemory) {
      logger.critical(`High memory usage detected: ${(memoryPercent * 100).toFixed(2)}%`, {
        rss: `${Math.round(usage.rss / 1024 / 1024)}MB`,
        heapTotal: `${Math.round(usage.heapTotal / 1024 / 1024)}MB`,
        heapUsed: `${Math.round(usage.heapUsed / 1024 / 1024)}MB`,
        external: `${Math.round(usage.external / 1024 / 1024)}MB`
      });
    }
    
    return {
      rss: usage.rss,
      heapTotal: usage.heapTotal,
      heapUsed: usage.heapUsed,
      external: usage.external,
      percentage: memoryPercent
    };
  }
  
  // CPU Monitoring
  checkCpuUsage() {
    const usage = process.cpuUsage();
    return {
      user: usage.user,
      system: usage.system
    };
  }
  
  // Health Check Endpoint Data
  getHealthMetrics() {
    const memory = this.checkMemoryUsage();
    const cpu = this.checkCpuUsage();
    
    return {
      memory: {
        rss: `${Math.round(memory.rss / 1024 / 1024)}MB`,
        heapUsed: `${Math.round(memory.heapUsed / 1024 / 1024)}MB`,
        percentage: `${(memory.percentage * 100).toFixed(2)}%`,
        status: memory.percentage > this.thresholds.criticalMemory ? 'WARNING' : 'OK'
      },
      requests: this.getRequestStats(),
      database: this.getDatabaseStats(),
      cache: this.getCacheStats()
    };
  }
  
  // Request Statistics
  getRequestStats() {
    const stats = {};
    
    for (const [route, metrics] of this.metrics.requests) {
      const durations = metrics.map(m => m.duration);
      const statusCodes = metrics.map(m => m.statusCode);
      
      stats[route] = {
        count: metrics.length,
        avgDuration: durations.reduce((a, b) => a + b, 0) / durations.length || 0,
        maxDuration: Math.max(...durations) || 0,
        errors: statusCodes.filter(code => code >= 400).length
      };
    }
    
    return stats;
  }
  
  // Database Statistics
  getDatabaseStats() {
    const stats = {};
    
    for (const [operation, metrics] of this.metrics.database) {
      const durations = metrics.map(m => m.duration);
      
      stats[operation] = {
        count: metrics.length,
        avgDuration: durations.reduce((a, b) => a + b, 0) / durations.length || 0,
        maxDuration: Math.max(...durations) || 0
      };
    }
    
    return stats;
  }
  
  // Cache Statistics
  getCacheStats() {
    const stats = {};
    
    for (const [operation, metrics] of this.metrics.cache) {
      stats[operation] = {
        count: metrics.length
      };
    }
    
    // Calculate hit rate
    const hits = stats.get_hit?.count || 0;
    const misses = stats.get_miss?.count || 0;
    const total = hits + misses;
    
    return {
      ...stats,
      hitRate: total > 0 ? `${((hits / total) * 100).toFixed(2)}%` : '0%'
    };
  }
  
  // Start automatic monitoring
  startMonitoring() {
    // Check memory every 30 seconds
    setInterval(() => {
      this.checkMemoryUsage();
    }, 30000);
    
    // Log performance summary every 5 minutes
    setInterval(() => {
      logger.info('Performance Summary', this.getHealthMetrics());
    }, 300000);
    
    // Stilles Monitoring - keine Startup-Logs
  }
}

// Export singleton
const performanceMonitor = new PerformanceMonitor();

module.exports = {
  performanceMonitor,
  trackRequest: (req, res, next) => performanceMonitor.trackRequest(req, res, next)
};