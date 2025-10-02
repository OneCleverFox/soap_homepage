const jwt = require('jsonwebtoken');
const User = require('../models/User');

// JWT Token Middleware
const auth = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Kein Token gefunden, Zugang verweigert'
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select('-password');
    
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Token ungültig, Benutzer nicht gefunden'
      });
    }

    if (!user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Benutzerkonto ist deaktiviert'
      });
    }

    if (user.isLocked) {
      return res.status(401).json({
        success: false,
        message: 'Benutzerkonto ist gesperrt'
      });
    }

    req.user = user;
    next();
  } catch (error) {
    console.error('Auth Middleware Error:', error);
    res.status(401).json({
      success: false,
      message: 'Token ungültig'
    });
  }
};

// Berechtigung überprüfen
const checkPermission = (permission) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentifizierung erforderlich'
      });
    }

    if (!req.user.hasPermission(permission)) {
      return res.status(403).json({
        success: false,
        message: 'Unzureichende Berechtigung für diese Aktion'
      });
    }

    next();
  };
};

// Rolle überprüfen
const checkRole = (roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentifizierung erforderlich'
      });
    }

    const userRoles = Array.isArray(roles) ? roles : [roles];
    
    if (!userRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Unzureichende Rolle für diese Aktion'
      });
    }

    next();
  };
};

// Admin-Berechtigung
const adminOnly = checkRole(['admin']);

// Manager oder Admin
const managerOrAdmin = checkRole(['manager', 'admin']);

module.exports = {
  auth,
  checkPermission,
  checkRole,
  adminOnly,
  managerOrAdmin
};