const express = require('express');
const { loginAdmin, validateToken, logout, registerUser, verifyEmail, resendVerification, forgotPassword, resetPassword, getProfile, updateProfile, deleteAccount } = require('../controllers/authController');
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