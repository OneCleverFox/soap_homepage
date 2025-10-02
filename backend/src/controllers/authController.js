const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

// Admin-Benutzer aus Umgebungsvariablen
const getAdminUser = () => ({
  email: process.env.ADMIN_EMAIL,
  password: process.env.ADMIN_PASSWORD,
  name: 'Ralf Jacob',
  role: 'admin',
  permissions: ['read', 'write', 'delete', 'admin']
});

// @desc    Admin Login
// @route   POST /api/auth/login
// @access  Public
const loginAdmin = async (req, res) => {
  try {
    const { email, password } = req.body;

    console.log('🔐 Login-Versuch:', email);

    // Validierung
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'E-Mail und Passwort sind erforderlich'
      });
    }

    // Admin-Benutzer aus Umgebungsvariablen abrufen
    const ADMIN_USER = getAdminUser();

    // Admin-Benutzer prüfen
    if (email.toLowerCase() !== ADMIN_USER.email.toLowerCase()) {
      console.log('❌ Unbekannte E-Mail:', email);
      return res.status(401).json({
        success: false,
        message: 'Ungültige Anmeldedaten'
      });
    }

    if (password !== ADMIN_USER.password) {
      console.log('❌ Falsches Passwort für:', email);
      return res.status(401).json({
        success: false,
        message: 'Ungültige Anmeldedaten'
      });
    }

    // JWT Token erstellen
    const token = jwt.sign(
      {
        id: 'admin-ralf',
        email: ADMIN_USER.email,
        role: ADMIN_USER.role,
        permissions: ADMIN_USER.permissions
      },
      process.env.JWT_SECRET || 'fallback-secret-key',
      { expiresIn: '24h' }
    );

    console.log('✅ Erfolgreicher Admin-Login:', email);

    res.status(200).json({
      success: true,
      message: 'Erfolgreich angemeldet',
      token,
      user: {
        id: 'admin-ralf',
        email: ADMIN_USER.email,
        name: ADMIN_USER.name,
        role: ADMIN_USER.role,
        permissions: ADMIN_USER.permissions
      }
    });

  } catch (error) {
    console.error('Auth Error:', error);
    res.status(500).json({
      success: false,
      message: 'Server-Fehler bei der Anmeldung'
    });
  }
};

// @desc    Token validieren
// @route   GET /api/auth/validate
// @access  Private
const validateToken = async (req, res) => {
  try {
    // Token wurde bereits durch Middleware validiert
    res.status(200).json({
      success: true,
      user: req.user
    });
  } catch (error) {
    console.error('Token Validation Error:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler bei Token-Validierung'
    });
  }
};

// @desc    Logout (Client-seitig)
// @route   POST /api/auth/logout
// @access  Private
const logout = async (req, res) => {
  try {
    console.log('🚪 Admin-Logout:', req.user?.email);
    
    res.status(200).json({
      success: true,
      message: 'Erfolgreich abgemeldet'
    });
  } catch (error) {
    console.error('Logout Error:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Abmelden'
    });
  }
};

module.exports = {
  loginAdmin,
  validateToken,
  logout
};