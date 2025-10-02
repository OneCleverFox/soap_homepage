const express = require('express');
const { loginAdmin, validateToken, logout } = require('../controllers/authController');
const { auth } = require('../middleware/auth');

const router = express.Router();

// @route   POST /api/auth/login
// @desc    Admin anmelden
// @access  Public
router.post('/login', loginAdmin);

// @route   GET /api/auth/validate
// @desc    Token validieren
// @access  Private
router.get('/validate', auth, validateToken);

// @route   POST /api/auth/logout
// @desc    Admin abmelden
// @access  Private
router.post('/logout', auth, logout);

module.exports = router;