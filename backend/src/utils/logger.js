const winston = require('winston');
const fs = require('fs');
const path = require('path');

// Prüfe Environment - kein Logging in Production/Railway
const isProduction = process.env.NODE_ENV === 'production' || process.env.RAILWAY_ENVIRONMENT;
const isDevelopment = !isProduction;

// Erstelle logs Verzeichnis nur in Development
if (isDevelopment) {
  const logsDir = path.join(__dirname, '../../../logs');
  if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
  }
}

// Logger-Konfiguration nur für Development
const logger = winston.createLogger({
  // Deaktiviere Logging in Production komplett
  silent: isProduction,
  level: isDevelopment ? (process.env.LOG_LEVEL || 'info') : 'error',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'soap-backend' },
  // Nur in Development File-Logging
  transports: isDevelopment ? [
    new winston.transports.File({ 
      filename: path.join(__dirname, '../../../logs/error.log'), 
      level: 'error' 
    }),
    new winston.transports.File({ 
      filename: path.join(__dirname, '../../../logs/combined.log') 
    })
  ] : [],
});

// Console-Logging nur in Development
if (isDevelopment) {
  logger.add(new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.simple()
    )
  }));
}

// Custom Methods für bessere Lesbarkeit - nur in Development aktiv
if (isDevelopment) {
  logger.success = (message, meta = {}) => logger.info(`✅ ${message}`, meta);
  logger.warning = (message, meta = {}) => logger.warn(`⚠️ ${message}`, meta);
  logger.critical = (message, meta = {}) => logger.error(`🚨 ${message}`, meta);
} else {
  // In Production: No-op functions (tun nichts)
  logger.success = () => {};
  logger.warning = () => {};
  logger.critical = () => {};
  logger.info = () => {};
  logger.warn = () => {};
  logger.error = () => {};
}

// Development-Flag für andere Module
logger.isDevelopment = isDevelopment;
logger.isProduction = isProduction;

module.exports = logger;