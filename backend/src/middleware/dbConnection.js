const mongoose = require('mongoose');

// Middleware um zu prüfen ob MongoDB verfügbar ist
const checkDatabaseConnection = (req, res, next) => {
  // Prüfe ob mongoose verbunden ist
  if (mongoose.connection.readyState !== 1) {
    return res.status(503).json({
      success: false,
      error: 'DATABASE_UNAVAILABLE',
      message: 'Datenbank ist momentan nicht verfügbar. Bitte versuchen Sie es später erneut.',
      details: {
        connectionState: mongoose.connection.readyState,
        states: {
          0: 'disconnected',
          1: 'connected',
          2: 'connecting',
          3: 'disconnecting'
        }
      }
    });
  }
  
  next();
};

module.exports = {
  checkDatabaseConnection
};