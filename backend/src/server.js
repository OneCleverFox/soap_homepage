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
  // Lokal: Lade .env (Fallback zu .env.development)
  const fs = require('fs');
  const envPath = path.resolve(__dirname, '..');
  
  let envFile = '.env';
  if (!fs.existsSync(path.join(envPath, '.env')) && fs.existsSync(path.join(envPath, '.env.development'))) {
    envFile = '.env.development';
  }
  
  require('dotenv').config({
    path: path.resolve(envPath, envFile)
  });
  
  console.log(`🔧 Loaded environment from: ${envFile}`);
  console.log(`🌍 NODE_ENV: ${process.env.NODE_ENV}`);
  console.log(`🔌 PORT: ${process.env.PORT}`);
  console.log(`🗄️  DATABASE_MODE: ${process.env.DATABASE_MODE}`);
  
  // PayPal Debug Info
  console.log(`💳 PAYPAL_SANDBOX_CLIENT_ID: ${process.env.PAYPAL_SANDBOX_CLIENT_ID ? 'SET' : 'NOT SET'}`);
  console.log(`💳 PAYPAL_LIVE_CLIENT_ID: ${process.env.PAYPAL_LIVE_CLIENT_ID ? 'SET' : 'NOT SET'}`);
} else {
  // Production (Railway): Nutzt Environment Variables direkt
  console.log('🔧 Production Mode: Using Railway Environment Variables');
  console.log(`🌍 NODE_ENV: ${process.env.NODE_ENV}`);
  console.log(`🔌 PORT: ${process.env.PORT}`);
}

// Route Imports
const authRoutes = require('./routes/auth');
const productRoutes = require('./routes/products');
const orderRoutes = require('./routes/order');
const inventoryRoutes = require('./routes/inventory');
const adminRoutes = require('./routes/admin');
const adminSettingsRoutes = require('./routes/adminSettings');
const portfolioRoutes = require('./routes/portfolio');
const rohseifeRoutes = require('./routes/rohseife');
const duftoeleRoutes = require('./routes/duftoele');
const verpackungenRoutes = require('./routes/verpackungen');
const kundenRoutes = require('./routes/kunden');
const usersRoutes = require('./routes/users');
const cartRoutes = require('./routes/cart');
const warenberechnungRoutes = require('./routes/warenberechnung');
const lagerRoutes = require('./routes/lager');
const emailLogsRoutes = require('./routes/emailLogs');
const invoiceRoutes = require('./routes/invoice');
const inquiriesRoutes = require('./routes/inquiries');

const app = express();

// Trust proxy für Railway/Production - aber nur wenn explizit gesetzt
if (process.env.NODE_ENV === 'production' || process.env.TRUST_PROXY === 'true') {
  app.set('trust proxy', 1);
} else {
  app.set('trust proxy', false);
}

// CORS-Konfiguration
const envOrigins = process.env.FRONTEND_URL
  ? process.env.FRONTEND_URL.split(',').map(origin => origin.trim()).filter(Boolean)
  : [];

const allowedOrigins = [
  ...envOrigins,
  // Production domains
  'https://gluecksmomente-manufaktur.vercel.app',
  'https://www.gluecksmomente-manufaktur.vercel.app',
  'https://soap-homepage-frontend.vercel.app',
  new RegExp('^https://gluecksmomente-manufaktur(?:-[a-z0-9-]+)?\\.vercel\\.app$'),
  // Development - nur wenn NODE_ENV !== production
  ...(process.env.NODE_ENV !== 'production' ? [
    'http://localhost:3000',
    'http://localhost:3001',
    'http://localhost:5000',
    'http://127.0.0.1:3000',
    'http://127.0.0.1:3001',
    'http://127.0.0.1:5000'
  ] : [])
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

  // CORS-Logging nur in Development
  if (process.env.NODE_ENV !== 'production' && process.env.NODE_ENV !== 'test') {
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
  crossOriginEmbedderPolicy: false,
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
}));

// Rate Limiting - vereinfacht für Development
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 Minuten
  max: process.env.NODE_ENV === 'production' ? 50 : 1000, // Development: Sehr hoch
  message: 'Zu viele Anfragen von dieser IP, bitte versuchen Sie es später erneut.',
  standardHeaders: true,
  legacyHeaders: false,
  trustProxy: false, // Explizit auf false setzen für localhost
  skip: (req) => {
    // Skip rate limiting für localhost in development
    if (process.env.NODE_ENV !== 'production') {
      const isLocalhost = req.ip === '127.0.0.1' || req.ip === '::1' || req.ip === '::ffff:127.0.0.1';
      return isLocalhost;
    }
    return false;
  }
});

// Verschärftes Rate Limiting für Auth-Endpunkte  
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 Minuten
  max: process.env.NODE_ENV === 'production' ? 5 : 100, // Development: Sehr hoch
  message: 'Zu viele Login-Versuche. Bitte warten Sie 15 Minuten.',
  standardHeaders: true,
  legacyHeaders: false,
  trustProxy: false, // Explizit auf false setzen für localhost
  skip: (req) => {
    // Skip auth rate limiting für localhost in development
    if (process.env.NODE_ENV !== 'production') {
      const isLocalhost = req.ip === '127.0.0.1' || req.ip === '::1' || req.ip === '::ffff:127.0.0.1';
      return isLocalhost;
    }
    return false;
  }
});

app.use('/api/', limiter);
app.use('/api/auth/', authLimiter);

// Body Parser Middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Static Files (für Produktbilder etc.)
app.use('/uploads', express.static('uploads'));

// Kritische Environment Variables prüfen
function validateCriticalEnvVars() {
  const critical = [
    'JWT_SECRET',
    'MONGODB_URI',
    'RESEND_API_KEY'
  ];
  
  const missing = critical.filter(key => !process.env[key]);
  
  if (missing.length > 0) {
    console.error('🚨 KRITISCHE SICHERHEITSLÜCKE:');
    console.error('❌ Fehlende Environment Variables:', missing);
    console.error('🛑 SERVER WIRD NICHT GESTARTET');
    process.exit(1);
  }
  
  // Warnung bei schwachen JWT Secrets
  if (process.env.JWT_SECRET && process.env.JWT_SECRET.length < 32) {
    console.warn('⚠️ JWT_SECRET ist zu kurz (< 32 Zeichen)');
  }
  
  console.log('✅ Kritische Environment Variables validiert');
}

validateCriticalEnvVars();
const DATABASE_MODE = process.env.DATABASE_MODE || 'production';

// IMMER MongoDB Atlas URI aus Environment Variables verwenden - NIEMALS Hardcoded!
const MONGODB_URI = process.env.MONGODB_URI || process.env.MONGODB_URI_PROD;

if (!MONGODB_URI) {
  console.error('🚨 KRITISCHER FEHLER: MONGODB_URI nicht in Environment Variables gefunden!');
  console.error('💡 Prüfen Sie Ihre .env Datei');
  process.exit(1);
}

console.log('🔧 DOTENV_KEY Status:', process.env.DOTENV_KEY ? 'GESETZT' : 'NICHT GESETZT');
console.log('📊 Database Mode:', DATABASE_MODE.toUpperCase());
console.log('🌍 Umgebung: IMMER PRODUKTIVE MONGODB ATLAS DATENBANK');
console.log('🔗 MongoDB URI verwendet:', MONGODB_URI.replace(/\/\/.*@/, '//***:***@'));

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
  // In Development: Weniger aggressive Wiederverbindung
  if (mongoose.connection.readyState === 0 && process.env.NODE_ENV === 'development') {
    console.log('🔄 Versuche Wiederverbindung in 10 Sekunden...');
    setTimeout(async () => {
      try {
        await connectToMongoDB();
        console.log('✅ Wiederverbindung erfolgreich');
      } catch (err) {
        console.error('❌ Wiederverbindung fehlgeschlagen:', err.message);
      }
    }, 10000); // 10 Sekunden warten
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
app.use('/api/admin-settings', adminSettingsRoutes);
app.use('/api/inquiries', checkDatabaseConnection, inquiriesRoutes);
app.use('/api/portfolio', checkDatabaseConnection, portfolioRoutes);
app.use('/api/rohseife', checkDatabaseConnection, rohseifeRoutes);
app.use('/api/duftoele', checkDatabaseConnection, duftoeleRoutes);
app.use('/api/verpackungen', checkDatabaseConnection, verpackungenRoutes);
app.use('/api/kunden', checkDatabaseConnection, kundenRoutes);
app.use('/api/users', checkDatabaseConnection, usersRoutes);
app.use('/api/cart', checkDatabaseConnection, cartRoutes);
app.use('/api/warenberechnung', checkDatabaseConnection, warenberechnungRoutes);
app.use('/api/lager', checkDatabaseConnection, lagerRoutes);
app.use('/api/email-logs', checkDatabaseConnection, emailLogsRoutes);
app.use('/api/invoice', checkDatabaseConnection, invoiceRoutes);
app.use('/api/images', require('./routes/images'));

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
  
  // Upload-Cleanup starten
  require('./utils/uploadCleanup');
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