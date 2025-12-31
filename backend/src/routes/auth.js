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

// @route   POST /api/auth/fix-lieferadresse/:email
// @desc    Fehlende Lieferadresse aus Rechnungsadresse ergänzen
// @access  Public (temporär für Fix)
router.post('/fix-lieferadresse/:email', async (req, res) => {
  try {
    const email = req.params.email.toLowerCase();
    console.log(`🔧 Fix Lieferadresse für: ${email}`);
    
    const Kunde = require('../models/Kunde');
    
    const kunde = await Kunde.findOne({ email });
    if (!kunde) {
      return res.status(404).json({
        success: false,
        message: 'Kunde nicht gefunden'
      });
    }
    
    // Prüfe, ob Lieferadresse bereits korrekt gesetzt ist
    if (kunde.lieferadresse?.verwendet && kunde.lieferadresse?.strasse) {
      return res.json({
        success: true,
        message: 'Lieferadresse ist bereits korrekt gesetzt'
      });
    }
    
    // Setze Lieferadresse basierend auf Rechnungsadresse
    kunde.lieferadresse = {
      verwendet: true,
      firmenname: '',
      vorname: kunde.vorname,
      nachname: kunde.nachname,
      strasse: kunde.adresse?.strasse || '',
      hausnummer: kunde.adresse?.hausnummer || '',
      zusatz: kunde.adresse?.zusatz || '',
      plz: kunde.adresse?.plz || '',
      stadt: kunde.adresse?.stadt || '',
      land: kunde.adresse?.land || 'Deutschland'
    };
    
    await kunde.save();
    
    console.log(`✅ Lieferadresse für ${email} ergänzt`);
    
    res.json({
      success: true,
      message: 'Lieferadresse erfolgreich ergänzt',
      lieferadresse: kunde.lieferadresse
    });

  } catch (error) {
    console.error('❌ Fix-Lieferadresse-Fehler:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Fix der Lieferadresse'
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