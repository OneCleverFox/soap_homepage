const express = require('express');
const mongoose = require('mongoose');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

// Dotenv-Vault Configuration
if (process.env.DOTENV_KEY) {
  require('dotenv-vault/config');
} else {
  require('dotenv').config();
}

// Route Imports
const authRoutes = require('./routes/auth');
const productRoutes = require('./routes/products');
const orderRoutes = require('./routes/orders');
const inventoryRoutes = require('./routes/inventory');
const adminRoutes = require('./routes/admin');
const portfolioRoutes = require('./routes/portfolio');
const rohseifeRoutes = require('./routes/rohseife');
const duftoeleRoutes = require('./routes/duftoele');
const verpackungenRoutes = require('./routes/verpackungen');
const kundenRoutes = require('./routes/kunden');

const app = express();

// CORS-Konfiguration
const envOrigins = process.env.FRONTEND_URL
  ? process.env.FRONTEND_URL.split(',').map(origin => origin.trim()).filter(Boolean)
  : [];

const allowedOrigins = [
  ...envOrigins,
  'https://gluecksmomente-manufaktur.vercel.app',
  'http://localhost:3000',
  'http://127.0.0.1:3000'
];

app.use((req, res, next) => {
  const requestOrigin = req.headers.origin;

  if (!requestOrigin) {
    return next();
  }

  const isAllowedOrigin = allowedOrigins.some((allowedOrigin) => {
    if (!allowedOrigin) return false;
    if (allowedOrigin instanceof RegExp) {
      return allowedOrigin.test(requestOrigin);
    }
    return allowedOrigin === requestOrigin;
  });

  if (!isAllowedOrigin) {
    console.warn('🚫 Blockierter CORS-Origin:', requestOrigin);
    if (req.method === 'OPTIONS') {
      return res.status(403).json({
        success: false,
        message: 'Origin nicht erlaubt'
      });
    }
    return res.status(403).json({
      success: false,
      message: 'Origin nicht erlaubt'
    });
  }

  res.header('Access-Control-Allow-Origin', requestOrigin);
  res.header('Vary', 'Origin');
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');

  if (req.method === 'OPTIONS') {
    return res.sendStatus(204);
  }

  next();
});

// Security Middleware - NACH CORS!
app.use(helmet({
  crossOriginResourcePolicy: false, // CORS nicht blockieren
  crossOriginOpenerPolicy: false,
  crossOriginEmbedderPolicy: false
}));

// Rate Limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 Minuten
  max: 100, // Limit auf 100 Requests pro windowMs
  message: 'Zu viele Anfragen von dieser IP, bitte versuchen Sie es später erneut.'
});
app.use('/api/', limiter);

// Body Parser Middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Static Files (für Produktbilder etc.)
app.use('/uploads', express.static('uploads'));

// Database Connection
const DATABASE_MODE = process.env.DATABASE_MODE || 'production';
const MONGODB_URI = process.env.MONGODB_URI_PROD || process.env.MONGODB_URI;

console.log('� DOTENV_KEY Status:', process.env.DOTENV_KEY ? 'GESETZT' : 'NICHT GESETZT');
console.log('📊 Database Mode:', DATABASE_MODE.toUpperCase());
console.log('🌍 Umgebung: PRODUKTIVE DATENBANK');

if (MONGODB_URI) {
  console.log('🔄 Verbinde mit MongoDB:', MONGODB_URI.replace(/\/\/.*@/, '//***:***@'));
  mongoose.connect(MONGODB_URI)
  .then(() => console.log('✅ MongoDB erfolgreich verbunden'))
  .catch(err => {
    console.error('❌ MongoDB Verbindungsfehler:', err.message);
    console.error('💡 Aktuelle URI:', MONGODB_URI.replace(/\/\/.*@/, '//***:***@'));
    console.warn('⚠️ Backend läuft ohne Datenbankverbindung weiter...');
  });
} else {
  console.error('❌ MONGODB_URI ist nicht definiert!');
  console.error('💡 Prüfen Sie Ihre Environment Variables:');
  console.error('   - DOTENV_KEY:', process.env.DOTENV_KEY ? 'GESETZT' : 'NICHT GESETZT');
  console.error('   - MONGODB_URI:', process.env.MONGODB_URI ? 'GESETZT' : 'NICHT GESETZT');
  console.error('   - MONGODB_URI_PROD:', process.env.MONGODB_URI_PROD ? 'GESETZT' : 'NICHT GESETZT');
}

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/portfolio', portfolioRoutes);
app.use('/api/rohseife', rohseifeRoutes);
app.use('/api/duftoele', duftoeleRoutes);
app.use('/api/verpackungen', verpackungenRoutes);
app.use('/api/kunden', kundenRoutes);
app.use('/api/images', require('./routes/images'));

// Test Route für Datenempfang
app.post('/api/test', (req, res) => {
  console.log('📨 Daten empfangen:', req.body);
  console.log('📨 Headers:', req.headers);
  console.log('📨 Timestamp:', new Date().toISOString());
  
  res.status(200).json({
    success: true,
    message: 'Daten erfolgreich empfangen!',
    receivedData: req.body,
    timestamp: new Date().toISOString()
  });
});

// Health Check Route
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    message: 'Gluecksmomente Backend läuft',
    timestamp: new Date().toISOString()
  });
});

// 404 Handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Endpoint nicht gefunden'
  });
});

// Error Handler
app.use((err, req, res, next) => {
  console.error('Server Error:', err);
  res.status(500).json({
    success: false,
    message: 'Interner Serverfehler',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

const PORT = process.env.PORT || 5000;

const server = app.listen(PORT, () => {
  console.log(`🚀 Server läuft auf Port ${PORT}`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔗 API verfügbar unter: http://localhost:${PORT}/api`);
  console.log(`🔗 Health Check: http://localhost:${PORT}/api/health`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM erhalten, schließe Server...');
  server.close(() => {
    console.log('Server geschlossen.');
    mongoose.connection.close();
    console.log('MongoDB Verbindung geschlossen.');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT erhalten, schließe Server...');
  server.close(() => {
    console.log('Server geschlossen.');
    mongoose.connection.close();
    console.log('MongoDB Verbindung geschlossen.');
    process.exit(0);
  });
});