const jwt = require('jsonwebtoken');

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
    
    if (decoded.role === 'admin' && decoded.email === 'Ralle.jacob84@googlemail.com') {
      req.user = decoded;
      next();
    } else {
      return res.status(401).json({
        success: false,
        message: 'Ungültiger Benutzer'
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
  if (req.user?.role !== 'admin') {
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
  requireAdmin,
  checkPermission
};