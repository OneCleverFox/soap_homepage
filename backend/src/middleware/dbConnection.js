const mongoose = require('mongoose');

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Middleware um zu prüfen ob MongoDB verfügbar ist
const checkDatabaseConnection = async (req, res, next) => {
  const states = {
    0: 'disconnected',
    1: 'connected',
    2: 'connecting',
    3: 'disconnecting'
  };

  // Fast path: bereits verbunden
  if (mongoose.connection.readyState === 1) {
    return next();
  }

  // Wenn Verbindungsaufbau läuft, kurz warten statt sofort Fehler zu werfen
  if (mongoose.connection.readyState === 2) {
    const timeoutMs = 8000;
    const intervalMs = 100;
    const maxTries = Math.ceil(timeoutMs / intervalMs);

    for (let i = 0; i < maxTries; i++) {
      if (mongoose.connection.readyState === 1) {
        return next();
      }
      await sleep(intervalMs);
    }
  }

  // Nach Wartezeit weiterhin nicht verbunden
  return res.status(503).json({
    success: false,
    error: 'DATABASE_UNAVAILABLE',
    message: 'Datenbank ist momentan nicht verfügbar. Bitte versuchen Sie es später erneut.',
    details: {
      connectionState: mongoose.connection.readyState,
      states
    }
  });
};

module.exports = {
  checkDatabaseConnection
};