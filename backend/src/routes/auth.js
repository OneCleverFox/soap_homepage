const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { auth } = require('../middleware/auth');
const { validateLogin, validateUser } = require('../middleware/validation');

const router = express.Router();

// @route   POST /api/auth/login
// @desc    Benutzer anmelden
// @access  Public
router.post('/login', validateLogin, async (req, res) => {
  try {
    const { username, password } = req.body;

    // Benutzer finden (Username oder E-Mail)
    const user = await User.findOne({
      $or: [
        { username: username.toLowerCase() },
        { email: username.toLowerCase() }
      ]
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Ungültige Anmeldedaten'
      });
    }

    // Account Status prüfen
    if (!user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Benutzerkonto ist deaktiviert'
      });
    }

    if (user.isLocked) {
      return res.status(401).json({
        success: false,
        message: 'Benutzerkonto ist gesperrt. Versuchen Sie es später erneut.'
      });
    }

    // Passwort prüfen
    const isMatch = await user.comparePassword(password);

    if (!isMatch) {
      await user.incLoginAttempts();
      return res.status(401).json({
        success: false,
        message: 'Ungültige Anmeldedaten'
      });
    }

    // Login erfolgreich - Reset der Versuche
    await user.resetLoginAttempts();

    // JWT Token erstellen
    const payload = {
      id: user._id,
      username: user.username,
      role: user.role
    };

    const token = jwt.sign(payload, process.env.JWT_SECRET, {
      expiresIn: '24h'
    });

    res.json({
      success: true,
      message: 'Erfolgreich angemeldet',
      data: {
        token,
        user: {
          id: user._id,
          username: user.username,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
          permissions: user.permissions
        }
      }
    });

  } catch (error) {
    console.error('Login Fehler:', error);
    res.status(500).json({
      success: false,
      message: 'Serverfehler beim Anmelden'
    });
  }
});

// @route   POST /api/auth/register
// @desc    Neuen Benutzer registrieren (Admin only)
// @access  Private (Admin)
router.post('/register', auth, validateUser, async (req, res) => {
  try {
    // Nur Admins können neue Benutzer erstellen
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Nur Administratoren können neue Benutzer erstellen'
      });
    }

    const { username, email, password, firstName, lastName, role } = req.body;

    // Prüfen ob Benutzer bereits existiert
    const existingUser = await User.findOne({
      $or: [{ username }, { email }]
    });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'Benutzername oder E-Mail bereits vergeben'
      });
    }

    // Neuen Benutzer erstellen
    const user = new User({
      username,
      email,
      password,
      firstName,
      lastName,
      role: role || 'employee'
    });

    await user.save();

    res.status(201).json({
      success: true,
      message: 'Benutzer erfolgreich erstellt',
      data: {
        id: user._id,
        username: user.username,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role
      }
    });

  } catch (error) {
    console.error('Registrierung Fehler:', error);
    
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(e => e.message);
      return res.status(400).json({
        success: false,
        message: 'Validierungsfehler',
        errors
      });
    }

    res.status(500).json({
      success: false,
      message: 'Serverfehler bei der Registrierung'
    });
  }
});

// @route   GET /api/auth/me
// @desc    Aktuellen Benutzer abrufen
// @access  Private
router.get('/me', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    
    res.json({
      success: true,
      data: user
    });
  } catch (error) {
    console.error('Fehler beim Abrufen der Benutzerdaten:', error);
    res.status(500).json({
      success: false,
      message: 'Serverfehler beim Abrufen der Benutzerdaten'
    });
  }
});

// @route   PUT /api/auth/profile
// @desc    Benutzerprofil aktualisieren
// @access  Private
router.put('/profile', auth, async (req, res) => {
  try {
    const { firstName, lastName, email, phone } = req.body;

    const user = await User.findByIdAndUpdate(
      req.user.id,
      {
        firstName,
        lastName,
        email,
        'profile.phone': phone
      },
      { new: true, runValidators: true }
    ).select('-password');

    res.json({
      success: true,
      message: 'Profil erfolgreich aktualisiert',
      data: user
    });

  } catch (error) {
    console.error('Fehler beim Aktualisieren des Profils:', error);
    
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'E-Mail bereits vergeben'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Serverfehler beim Aktualisieren des Profils'
    });
  }
});

// @route   PUT /api/auth/password
// @desc    Passwort ändern
// @access  Private
router.put('/password', auth, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    const user = await User.findById(req.user.id);

    // Aktuelles Passwort prüfen
    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      return res.status(400).json({
        success: false,
        message: 'Aktuelles Passwort ist falsch'
      });
    }

    // Neues Passwort validieren
    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Neues Passwort muss mindestens 6 Zeichen lang sein'
      });
    }

    user.password = newPassword;
    await user.save();

    res.json({
      success: true,
      message: 'Passwort erfolgreich geändert'
    });

  } catch (error) {
    console.error('Fehler beim Ändern des Passworts:', error);
    res.status(500).json({
      success: false,
      message: 'Serverfehler beim Ändern des Passworts'
    });
  }
});

// @route   POST /api/auth/logout
// @desc    Benutzer abmelden (Token invalidieren)
// @access  Private
router.post('/logout', auth, (req, res) => {
  // Da wir stateless JWTs verwenden, wird der Token client-seitig gelöscht
  // Hier könnten wir eine Blacklist implementieren wenn nötig
  res.json({
    success: true,
    message: 'Erfolgreich abgemeldet'
  });
});

// @route   GET /api/auth/verify
// @desc    Token verifizieren
// @access  Private
router.get('/verify', auth, (req, res) => {
  res.json({
    success: true,
    message: 'Token ist gültig',
    data: {
      id: req.user._id,
      username: req.user.username,
      role: req.user.role
    }
  });
});

module.exports = router;