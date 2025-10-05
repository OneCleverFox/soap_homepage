const jwt = require('jsonwebtoken');

// Generische Authentifizierung für alle eingeloggten Benutzer
const authenticateToken = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Kein Token gefunden'
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret-key');
    console.log('🔐 Decoded JWT Token:', decoded);
    req.user = decoded;
    next();

  } catch (error) {
    console.error('Auth Error:', error.message);
    res.status(401).json({
      success: false,
      message: 'Token ungültig'
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

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret-key');
    
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