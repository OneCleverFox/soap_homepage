const express = require('express');
const { loginAdmin, validateToken, logout } = require('../controllers/authController');
const { auth } = require('../middleware/auth');

const router = express.Router();

// CORS-Middleware für alle Auth-Routen (NOTFALL-FIX)
router.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

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