#!/usr/bin/env node

/**
 * Setup Script für Backend-Optimierungen
 * Führt alle kritischen Optimierungen aus:
 * - MongoDB Indizes erstellen
 * - Cache warmup
 * - Performance baselines setzen
 */

const mongoose = require('mongoose');
const path = require('path');

// Environment laden
require('dotenv').config({
  path: path.resolve(__dirname, '../../.env')
});

const DatabaseOptimizer = require('../src/utils/databaseOptimizer');
const { cacheManager } = require('../src/utils/cacheManager');
const logger = require('../src/utils/logger');

async function runOptimizationSetup() {
  try {
    logger.info('🔧 Starting Backend Optimization Setup...');
    
    // MongoDB verbinden
    logger.info('🔗 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI || process.env.MONGODB_URI_PROD, 
      DatabaseOptimizer.getOptimizedConnectionOptions()
    );
    logger.success('✅ MongoDB connected');
    
    // 1. Database Indizes erstellen
    logger.info('📊 Creating database indexes...');
    await DatabaseOptimizer.createRecommendedIndexes();
    logger.success('✅ Database indexes created');
    
    // 2. Slow Query Logging aktivieren
    logger.info('🐌 Enabling slow query logging...');
    DatabaseOptimizer.enableSlowQueryLogging();
    logger.success('✅ Slow query logging enabled');
    
    // 3. Cache Warmup
    logger.info('🔥 Starting cache warmup...');
    await cacheManager.warmupCache();
    logger.success('✅ Cache warmup completed');
    
    // 4. Performance baselines
    logger.info('📈 Checking performance baselines...');
    const collections = await mongoose.connection.db.listCollections().toArray();
    logger.info(`📚 Found ${collections.length} collections:`, 
      collections.map(c => c.name).join(', '));
    
    // Collection stats
    for (const collection of ['users', 'orders', 'portfolios', 'bestands', 'inquiries']) {
      try {
        const stats = await mongoose.connection.db.collection(collection).stats();
        logger.info(`📊 ${collection}: ${stats.count} documents, ${Math.round(stats.size / 1024)}KB`);
      } catch (err) {
        logger.warning(`⚠️ Could not get stats for ${collection}: ${err.message}`);
      }
    }
    
    logger.success('🎉 Backend optimization setup completed successfully!');
    logger.info('💡 Next steps:');
    logger.info('   - Restart your server to activate all optimizations');
    logger.info('   - Check logs/combined.log for detailed logging');
    logger.info('   - Monitor /api/health-extended for performance metrics');
    
  } catch (error) {
    logger.error('❌ Setup failed:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    logger.info('🔌 MongoDB disconnected');
    process.exit(0);
  }
}

// Script ausführen
runOptimizationSetup();