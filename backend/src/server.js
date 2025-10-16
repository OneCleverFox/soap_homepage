const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

// VERSION MARKER - Railway Deployment Check
const APP_VERSION = '2.0.0-retry-mechanism';
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log(`🚀 BACKEND VERSION: ${APP_VERSION}`);
console.log('📅 BUILD DATE:', new Date().toISOString());
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

// Dotenv Configuration - nur für lokale Entwicklung
if (process.env.NODE_ENV !== 'production') {
  // Lokal: Lade .env.development
  const envFile = '.env.development';
  
  require('dotenv').config({
    path: path.resolve(__dirname, '..', envFile)
  });
  
  console.log(`🔧 Loaded environment from: ${envFile}`);
  console.log(`🌍 NODE_ENV: ${process.env.NODE_ENV}`);
  console.log(`🔌 PORT: ${process.env.PORT}`);
  console.log(`🗄️  DATABASE_MODE: ${process.env.DATABASE_MODE}`);
} else {
  // Production (Railway): Nutzt Environment Variables direkt
  console.log('🔧 Production Mode: Using Railway Environment Variables');
  console.log(`🌍 NODE_ENV: ${process.env.NODE_ENV}`);
  console.log(`🔌 PORT: ${process.env.PORT}`);
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
const usersRoutes = require('./routes/users');
const cartRoutes = require('./routes/cart');
const warenberechnungRoutes = require('./routes/warenberechnung');
const lagerRoutes = require('./routes/lager');

const app = express();

// CORS-Konfiguration
const envOrigins = process.env.FRONTEND_URL
  ? process.env.FRONTEND_URL.split(',').map(origin => origin.trim()).filter(Boolean)
  : [];

const allowedOrigins = [
  ...envOrigins,
  'https://gluecksmomente-manufaktur.vercel.app',
  'https://www.gluecksmomente-manufaktur.vercel.app',
  'https://soap-homepage-frontend.vercel.app',
  new RegExp('^https://gluecksmomente-manufaktur(?:-[a-z0-9-]+)?\\.vercel\\.app$'),
  'http://localhost:3000',
  'http://localhost:3001',
  'http://localhost:5000',
  'http://127.0.0.1:3000',
  'http://127.0.0.1:3001',
  'http://127.0.0.1:5000'
];

const normalizeOrigin = (origin) => {
  if (!origin) return '';
  try {
    const url = new URL(origin);
    return `${url.protocol}//${url.host}`.toLowerCase();
  } catch (error) {
    return origin.replace(/\/$/, '').toLowerCase();
  }
};

app.use((req, res, next) => {
  const requestOrigin = req.headers.origin;

  if (!requestOrigin) {
    return next();
  }

  const requestPath = `${req.method} ${req.originalUrl}`;

  // Debug-Logging für CORS-Verhalten
  if (process.env.NODE_ENV !== 'test') {
    console.log(`[CORS] Anfrage von ${requestOrigin} -> ${requestPath}`);
  }

  const normalizedOrigin = normalizeOrigin(requestOrigin);

  const isAllowedOrigin = allowedOrigins.some((allowedOrigin) => {
    if (!allowedOrigin) return false;
    if (allowedOrigin instanceof RegExp) {
      return allowedOrigin.test(requestOrigin);
    }
    return normalizeOrigin(allowedOrigin) === normalizedOrigin;
  });

  if (!isAllowedOrigin) {
    console.warn(`🚫 Blockierter CORS-Origin: ${requestOrigin} (${requestPath})`);
  }

  // CORS-Header IMMER setzen, auch wenn Origin nicht erlaubt ist
  // Das verhindert CORS-Preflight-Fehler
  res.header('Access-Control-Allow-Origin', requestOrigin);
  res.header('Vary', 'Origin');
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  res.header('Access-Control-Max-Age', '86400');

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

// MongoDB Connection mit Retry-Logik für Railway
async function connectToMongoDB(retries = 5, delay = 5000) {
  if (!MONGODB_URI) {
    console.error('❌ MONGODB_URI ist nicht definiert!');
    console.error('💡 Prüfen Sie Ihre Environment Variables:');
    console.error('   - DOTENV_KEY:', process.env.DOTENV_KEY ? 'GESETZT' : 'NICHT GESETZT');
    console.error('   - MONGODB_URI:', process.env.MONGODB_URI ? 'GESETZT' : 'NICHT GESETZT');
    console.error('   - MONGODB_URI_PROD:', process.env.MONGODB_URI_PROD ? 'GESETZT' : 'NICHT GESETZT');
    return;
  }

  console.log('🔄 Verbinde mit MongoDB:', MONGODB_URI.replace(/\/\/.*@/, '//***:***@'));
  
  // Debug: Zeige aktuelle IP-Adresse für Whitelist-Check
  try {
    const fetch = require('node-fetch');
    const response = await fetch('https://api.ipify.org?format=json');
    const { ip } = await response.json();
    console.log('🌐 Aktuelle öffentliche IP-Adresse:', ip);
    console.log('💡 Diese IP muss in MongoDB Atlas Whitelist stehen!');
  } catch (ipError) {
    console.warn('⚠️ Konnte aktuelle IP nicht ermitteln:', ipError.message);
  }
  
  // Mongoose Verbindungsoptionen für Railway + MongoDB Atlas - vereinfacht
  const mongooseOptions = {
    serverSelectionTimeoutMS: 30000,
    socketTimeoutMS: 45000,
    connectTimeoutMS: 30000,
    maxPoolSize: 10,
    retryWrites: true
  };
  
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      await mongoose.connect(MONGODB_URI, mongooseOptions);
      console.log('✅ MongoDB erfolgreich verbunden');
      console.log('📊 Database:', mongoose.connection.db ? mongoose.connection.db.databaseName : 'connecting...');
      console.log('🏢 Host:', mongoose.connection.host || 'connecting...');
      console.log('🎯 Verbindung hergestellt nach', attempt, 'Versuch(en)');
      return; // Erfolg - beende Funktion
    } catch (err) {
      console.error(`❌ MongoDB Verbindungsfehler (Versuch ${attempt}/${retries}):`, err.message);
      console.error('� Error Name:', err.name);
      
      if (attempt < retries) {
        const waitTime = delay * attempt; // Exponential backoff
        console.warn(`⏳ Warte ${waitTime/1000} Sekunden vor nächstem Versuch...`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
      } else {
        console.error('💡 Aktuelle URI:', MONGODB_URI.replace(/\/\/.*@/, '//***:***@'));
        console.error('⚠️ Alle Verbindungsversuche fehlgeschlagen!');
        console.warn('⚠️ Backend läuft ohne Datenbankverbindung weiter...');
      }
    }
  }
}

// Starte MongoDB Verbindung
connectToMongoDB();

// MongoDB Verbindungsevents überwachen
mongoose.connection.on('connected', () => {
  console.log('🔗 Mongoose Verbindung hergestellt');
});

mongoose.connection.on('error', (err) => {
  console.error('❌ Mongoose Verbindungsfehler:', err);
});

mongoose.connection.on('disconnected', () => {
  console.warn('🔌 Mongoose Verbindung getrennt');
  // Versuche automatisch wieder zu verbinden, aber nur wenn nicht bereits am verbinden
  if (mongoose.connection.readyState === 0) {
    console.log('🔄 Versuche Wiederverbindung...');
    setTimeout(() => {
      mongoose.connect(MONGODB_URI, mongooseOptions)
        .then(() => console.log('✅ Wiederverbindung erfolgreich'))
        .catch(err => console.error('❌ Wiederverbindung fehlgeschlagen:', err.message));
    }, 5000);
  }
});

// Graceful Shutdown
process.on('SIGINT', async () => {
  console.log('SIGINT erhalten, schließe Server...');
  await mongoose.connection.close();
  console.log('MongoDB Verbindung geschlossen.');
  process.exit(0);
});
connectToMongoDB();

// Routes
const { checkDatabaseConnection } = require('./middleware/dbConnection');

app.use('/api/auth', authRoutes);
app.use('/api/products', checkDatabaseConnection, productRoutes);
app.use('/api/orders', checkDatabaseConnection, orderRoutes);
app.use('/api/inventory', checkDatabaseConnection, inventoryRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/portfolio', checkDatabaseConnection, portfolioRoutes);
app.use('/api/rohseife', checkDatabaseConnection, rohseifeRoutes);
app.use('/api/duftoele', checkDatabaseConnection, duftoeleRoutes);
app.use('/api/verpackungen', checkDatabaseConnection, verpackungenRoutes);
app.use('/api/kunden', checkDatabaseConnection, kundenRoutes);
app.use('/api/users', checkDatabaseConnection, usersRoutes);
app.use('/api/cart', checkDatabaseConnection, cartRoutes);
app.use('/api/warenberechnung', checkDatabaseConnection, warenberechnungRoutes);
app.use('/api/lager', checkDatabaseConnection, lagerRoutes);
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
  const dbStatus = mongoose.connection.readyState;
  const dbStatusMap = {
    0: 'disconnected',
    1: 'connected',
    2: 'connecting',
    3: 'disconnecting'
  };
  
  // Bestimme den HTTP-Status basierend auf der Datenbankverbindung
  const httpStatus = dbStatus === 1 ? 200 : 503;
  
  res.status(httpStatus).json({
    status: dbStatus === 1 ? 'OK' : 'DEGRADED',
    message: dbStatus === 1 
      ? 'Gluecksmomente Backend läuft' 
      : 'Backend läuft, aber Datenbank ist nicht verfügbar',
    version: APP_VERSION,
    database: {
      status: dbStatusMap[dbStatus] || 'unknown',
      readyState: dbStatus,
      host: mongoose.connection.host || 'not connected',
      name: mongoose.connection.db ? mongoose.connection.db.databaseName : 'not connected',
      isConnected: dbStatus === 1
    },
    timestamp: new Date().toISOString(),
    ipAddress: req.ip || 'unknown'
  });
});

// Version Check Route
app.get('/api/version', (req, res) => {
  res.status(200).json({
    version: APP_VERSION,
    buildDate: new Date().toISOString(),
    nodeEnv: process.env.NODE_ENV,
    retryMechanism: true,
    mongooseOptions: {
      serverSelectionTimeoutMS: 30000,
      socketTimeoutMS: 45000,
      family: 4
    }
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