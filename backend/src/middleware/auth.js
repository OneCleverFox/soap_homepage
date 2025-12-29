const jwt = require('jsonwebtoken');
const logger = require('../utils/logger');
const { AuthenticationError, AuthorizationError } = require('./errorHandler');

// Generische Authentifizierung für alle eingeloggten Benutzer
const authenticateToken = async (req, res, next) => {
  try {
    // Token aus Header oder Query-Parameter extrahieren
    let token = req.header('Authorization')?.replace('Bearer ', '');
    
    // Fallback: Token aus Query-Parameter für PDF-Vorschau
    if (!token && req.query.token) {
      token = req.query.token;
    }
    
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Kein Token gefunden'
      });
    }

    if (!process.env.JWT_SECRET) {
      console.error('🚨 CRITICAL: JWT_SECRET not set!');
      return res.status(500).json({
        success: false,
        message: 'Server-Konfigurationsfehler'
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    // Logging nur in Development
    if (process.env.NODE_ENV !== 'production') {
      logger.info('🔐 Decoded JWT Token:', { userId: decoded.id, role: decoded.rolle || decoded.role });
    }
    req.user = decoded;
    next();

  } catch (error) {
    logger.warning('Auth Error:', { message: error.message, ip: req.ip });
    return res.status(401).json({
      success: false,
      message: 'Token ungültig',
      error: 'AUTH_ERROR'
    });
  }
};

// Admin-only Authentifizierung (alte auth Funktion)
const auth = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Kein Token gefunden'
      });
    }

    if (!process.env.JWT_SECRET) {
      logger.critical('🚨 CRITICAL: JWT_SECRET not set in admin auth!');
      return res.status(500).json({
        success: false,
        message: 'Server-Konfigurationsfehler'
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Unterstütze sowohl 'role' (Admin-User) als auch 'rolle' (Kunde)
    const userRole = decoded.rolle || decoded.role;
    
    if (userRole === 'admin') {
      req.user = decoded;
      next();
    } else {
      return res.status(401).json({
        success: false,
        message: 'Keine Admin-Berechtigung'
      });
    }

  } catch (error) {
    console.error('Auth Error:', error.message);
    res.status(401).json({
      success: false,
      message: 'Token ungültig'
    });
  }
};

const requireAdmin = (req, res, next) => {
  // Unterstütze sowohl 'role' (Admin-User) als auch 'rolle' (Kunde)
  const userRole = req.user?.rolle || req.user?.role;
  
  if (userRole !== 'admin') {
    return res.status(403).json({
      success: false,
      message: 'Admin-Berechtigung erforderlich'
    });
  }
  next();
};

const checkPermission = (permission) => {
  return (req, res, next) => {
    if (!req.user?.permissions?.includes(permission)) {
      return res.status(403).json({
        success: false,
        message: `Berechtigung erforderlich`
      });
    }
    next();
  };
};

module.exports = {
  auth,
  authenticateToken,
  requireAdmin,
  checkPermission
};