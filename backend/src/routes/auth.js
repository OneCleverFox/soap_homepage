const express = require('express');
const { loginAdmin, validateToken, logout, registerUser, debugRegister, verifyEmail, resendVerification, forgotPassword, resetPassword, getProfile, updateProfile, deleteAccount } = require('../controllers/authController');
const { auth, authenticateToken } = require('../middleware/auth');

const router = express.Router();

// @route   POST /api/auth/login
// @desc    Admin anmelden
// @access  Public
router.post('/login', loginAdmin);

// @route   POST /api/auth/register
// @desc    Neuen Benutzer registrieren
// @access  Public
router.post('/register', registerUser);

// @route   POST /api/auth/debug-register
// @desc    Debug-Route für Registrierung
// @access  Public
router.post('/debug-register', debugRegister);

// @route   POST /api/auth/cleanup-email/:email
// @desc    E-Mail aus beiden Collections bereinigen
// @access  Public (temporär für Debugging)
router.post('/cleanup-email/:email', async (req, res) => {
  try {
    const email = req.params.email.toLowerCase();
    console.log(`🧹 Cleanup für E-Mail: ${email}`);
    
    const User = require('../models/User');
    const Kunde = require('../models/Kunde');
    
    // Prüfe und lösche aus User Collection
    const userInUserCollection = await User.findOne({ email });
    let userDeleted = false;
    if (userInUserCollection) {
      await User.findByIdAndDelete(userInUserCollection._id);
      userDeleted = true;
      console.log(`🗑️ User ${email} aus User-Collection gelöscht`);
    }
    
    // Prüfe und lösche aus Kunde Collection
    const userInKundeCollection = await Kunde.findOne({ email });
    let kundeDeleted = false;
    if (userInKundeCollection) {
      await Kunde.findByIdAndDelete(userInKundeCollection._id);
      kundeDeleted = true;
      console.log(`🗑️ Kunde ${email} aus Kunde-Collection gelöscht`);
    }
    
    res.json({
      success: true,
      message: `E-Mail ${email} bereinigt`,
      cleaned: {
        userDeleted,
        kundeDeleted,
        email
      }
    });
    
  } catch (error) {
    console.error('❌ Cleanup-Fehler:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Fehler bei E-Mail-Bereinigung',
      error: error.message
    });
  }
});

// @route   GET /api/auth/verify-email/:token
// @desc    E-Mail-Adresse verifizieren
// @access  Public
router.get('/verify-email/:token', verifyEmail);

// @route   POST /api/auth/resend-verification
// @desc    Verifizierungs-E-Mail erneut senden
// @access  Public
router.post('/resend-verification', resendVerification);

// @route   POST /api/auth/forgot-password
// @desc    Passwort-Reset-E-Mail senden
// @access  Public
router.post('/forgot-password', forgotPassword);

// @route   POST /api/auth/reset-password/:token
// @desc    Passwort mit Token zurücksetzen
// @access  Public
router.post('/reset-password/:token', resetPassword);

// @route   GET /api/auth/validate
// @desc    Token validieren
// @access  Private
router.get('/validate', authenticateToken, validateToken);

// @route   GET /api/auth/profile
// @desc    Benutzer-Profil abrufen
// @access  Private - Alle authentifizierten Benutzer
router.get('/profile', authenticateToken, getProfile);

// @route   PUT /api/auth/profile
// @desc    Benutzer-Profil aktualisieren
// @access  Private - Alle authentifizierten Benutzer
router.put('/profile', authenticateToken, updateProfile);

// @route   DELETE /api/auth/account
// @desc    Benutzer-Account löschen
// @access  Private - Alle authentifizierten Benutzer
router.delete('/account', authenticateToken, deleteAccount);

// @route   POST /api/auth/logout
// @desc    Admin abmelden
// @access  Private
router.post('/logout', auth, logout);

module.exports = router;