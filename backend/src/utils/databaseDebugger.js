const mongoose = require('mongoose');

// Debug-Utility für MongoDB-Verbindungsstatus
class DatabaseDebugger {
  
  static getConnectionStatus() {
    const states = {
      0: 'disconnected',
      1: 'connected', 
      2: 'connecting',
      3: 'disconnecting'
    };
    
    return {
      readyState: mongoose.connection.readyState,
      status: states[mongoose.connection.readyState],
      isReady: mongoose.connection.readyState === 1,
      hasDb: !!mongoose.connection.db,
      dbName: mongoose.connection.db?.databaseName || 'not available',
      host: mongoose.connection.host || 'not available'
    };
  }
  
  static async waitForConnection(maxWaitMs = 10000) {
    const start = Date.now();
    
    while (Date.now() - start < maxWaitMs) {
      const status = this.getConnectionStatus();
      
      if (status.isReady && status.hasDb) {
        console.log('✅ Database connection ready');
        return true;
      }
      
      console.log(`⏳ Waiting for DB connection... Status: ${status.status}, hasDb: ${status.hasDb}`);
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    console.warn('⚠️ Database connection timeout');
    return false;
  }
  
  static async testCollectionAccess() {
    const status = this.getConnectionStatus();
    
    if (!status.isReady || !status.hasDb) {
      console.warn('⚠️ Database not ready for collection access');
      return false;
    }
    
    try {
      const collections = await mongoose.connection.db.listCollections().toArray();
      console.log(`✅ Database accessible, found ${collections.length} collections`);
      return true;
    } catch (error) {
      console.error('❌ Collection access failed:', error.message);
      return false;
    }
  }
  
  static logDetailedStatus() {
    const status = this.getConnectionStatus();
    console.log('🔍 MongoDB Connection Status:', {
      readyState: status.readyState,
      status: status.status,
      isReady: status.isReady,
      hasDb: status.hasDb,
      dbName: status.dbName,
      host: status.host
    });
  }
}

module.exports = DatabaseDebugger;