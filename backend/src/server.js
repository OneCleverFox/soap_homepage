const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

// Route Imports
const authRoutes = require('./routes/auth');
const productRoutes = require('./routes/products');
const orderRoutes = require('./routes/orders');
const inventoryRoutes = require('./routes/inventory');
const adminRoutes = require('./routes/admin');

const app = express();

// Security Middleware
app.use(helmet());

// Rate Limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 Minuten
  max: 100, // Limit auf 100 Requests pro windowMs
  message: 'Zu viele Anfragen von dieser IP, bitte versuchen Sie es später erneut.'
});
app.use('/api/', limiter);

// CORS Konfiguration
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));

// Body Parser Middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Static Files (für Produktbilder etc.)
app.use('/uploads', express.static('uploads'));

// Database Connection
const DATABASE_MODE = process.env.DATABASE_MODE || 'local';
const MONGODB_URI = DATABASE_MODE === 'production' 
  ? process.env.MONGODB_URI_PROD 
  : process.env.MONGODB_URI || 'mongodb://localhost:27017/gluecksmomente';

console.log('🔄 Verbinde mit MongoDB:', MONGODB_URI.replace(/\/\/.*@/, '//***:***@'));
console.log(`📊 Database Mode: ${DATABASE_MODE.toUpperCase()}`);

mongoose.connect(MONGODB_URI)
.then(() => console.log('✅ MongoDB erfolgreich verbunden'))
.catch(err => {
  console.error('❌ MongoDB Verbindungsfehler:', err.message);
  console.error('💡 Tipp: Stellen Sie sicher, dass MongoDB läuft oder verwenden Sie MongoDB Atlas');
  console.error('💡 Aktuelle URI:', MONGODB_URI.replace(/\/\/.*@/, '//***:***@'));
  console.warn('⚠️ Backend läuft ohne Datenbankverbindung weiter...');
  // Nicht beenden, sondern weiter ohne DB laufen lassen
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/admin', adminRoutes);

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