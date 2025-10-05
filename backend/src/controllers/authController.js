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

    // Prüfen ob es der Admin ist
    if (email.toLowerCase() === ADMIN_USER.email.toLowerCase()) {
      // Admin-Login
      if (password !== ADMIN_USER.password) {
        console.log('❌ Falsches Passwort für Admin:', email);
        return res.status(401).json({
          success: false,
          message: 'Ungültige Anmeldedaten'
        });
      }

      // JWT Token für Admin erstellen
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

      return res.status(200).json({
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
    }

    // Nicht der Admin - prüfen ob Kunde existiert
    const Kunde = require('../models/Kunde');
    
    console.log('🔍 Suche Kunde mit E-Mail:', email.toLowerCase().trim());
    const kunde = await Kunde.findOne({ email: email.toLowerCase().trim() });
    
    if (!kunde) {
      // Debug: Alle Kunden-E-Mails anzeigen
      const alleKunden = await Kunde.find({}).select('email vorname nachname').limit(5);
      console.log('📋 Erste 5 Kunden in DB:', alleKunden.map(k => ({ email: k.email, name: `${k.vorname} ${k.nachname}` })));
      
      console.log('❌ Unbekannte E-Mail:', email);
      return res.status(401).json({
        success: false,
        message: 'Ungültige Anmeldedaten'
      });
    }
    
    console.log('✅ Kunde gefunden:', { id: kunde._id, email: kunde.email, name: `${kunde.vorname} ${kunde.nachname}` });

    // Account-Status prüfen
    if (!kunde.status.aktiv || kunde.status.gesperrt) {
      console.log('❌ Account inaktiv oder gesperrt:', email);
      return res.status(401).json({
        success: false,
        message: 'Account ist deaktiviert oder gesperrt'
      });
    }

    // Passwort vergleichen
    const istPasswortKorrekt = await kunde.vergleichePasswort(password);
    if (!istPasswortKorrekt) {
      kunde.anmeldeversuche = (kunde.anmeldeversuche || 0) + 1;
      await kunde.save();
      
      console.log('❌ Falsches Passwort für Kunde:', email);
      return res.status(401).json({
        success: false,
        message: 'Ungültige Anmeldedaten'
      });
    }

    // Erfolgreiche Kunden-Anmeldung
    kunde.letzteAnmeldung = new Date();
    kunde.anmeldeversuche = 0;
    await kunde.save();

    // JWT Token für Kunde erstellen
    const token = jwt.sign(
      { 
        id: kunde._id.toString(),
        kundeId: kunde._id,
        email: kunde.email,
        kundennummer: kunde.kundennummer,
        rolle: kunde.rolle || 'kunde'  // Verwende kunde.rolle statt hartcodiert 'kunde'
      },
      process.env.JWT_SECRET || 'fallback-secret-key',
      { expiresIn: '24h' }
    );

    console.log('✅ Erfolgreicher Kunden-Login:', email);

    // Passwort aus Response entfernen
    const kundeOhnePasswort = kunde.toObject();
    delete kundeOhnePasswort.passwort;

    res.status(200).json({
      success: true,
      message: 'Erfolgreich angemeldet',
      token,
      user: {
        id: kunde._id.toString(),
        email: kunde.email,
        name: `${kunde.vorname} ${kunde.nachname}`,
        rolle: kunde.rolle || 'kunde',  // Verwende kunde.rolle statt hartcodiert 'kunde'
        kundennummer: kunde.kundennummer
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