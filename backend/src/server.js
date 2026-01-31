const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const compression = require('compression');

// Import Optimization Utilities
const logger = require('./utils/logger');
const startupLogger = require('./utils/startupLogger');
const DatabaseOptimizer = require('./utils/databaseOptimizer');
const DatabaseDebugger = require('./utils/databaseDebugger');
const { cacheManager } = require('./utils/cacheManager');
const { globalErrorHandler, notFoundHandler, asyncHandler } = require('./middleware/errorHandler');
const { performanceMonitor, trackRequest } = require('./utils/performanceMonitor');
const { IPAnonymizer } = require('./utils/ipAnonymizer');

// VERSION MARKER
const APP_VERSION = '2.0.0-optimized';

// Print Header
startupLogger.printHeader();

// Dotenv Configuration - nur für lokale Entwicklung
if (process.env.NODE_ENV !== 'production') {
  const fs = require('fs');
  const envPath = path.resolve(__dirname, '..');
  
  let envFile = '.env';
  if (!fs.existsSync(path.join(envPath, '.env')) && fs.existsSync(path.join(envPath, '.env.development'))) {
    envFile = '.env.development';
  }
  
  require('dotenv').config({
    path: path.resolve(envPath, envFile)
  });
  
  startupLogger.env('NODE_ENV', process.env.NODE_ENV);
  startupLogger.env('DATABASE_MODE', process.env.DATABASE_MODE);
  startupLogger.env('PAYPAL_SANDBOX_CLIENT_ID', !!process.env.PAYPAL_SANDBOX_CLIENT_ID);
  startupLogger.env('PAYPAL_LIVE_CLIENT_ID', !!process.env.PAYPAL_LIVE_CLIENT_ID);
} else {
  startupLogger.env('NODE_ENV', 'production');
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
const zusatzinhaltsstoffeRoutes = require('./routes/zusatzinhaltsstoffe');
const kundenRoutes = require('./routes/kunden');
const usersRoutes = require('./routes/users');
const cartRoutes = require('./routes/cart');
const warenberechnungRoutes = require('./routes/warenberechnung');
const lagerRoutes = require('./routes/lager');
const emailLogsRoutes = require('./routes/emailLogs');
const invoiceRoutes = require('./routes/invoice');
const invoicesRoutes = require('./routes/invoices');
const inquiriesRoutes = require('./routes/inquiries');
const companyInfoRoutes = require('./routes/companyInfo');
const dashboardRoutes = require('./routes/dashboard');
const debugRoutes = require('./routes/debug');
const galleryRoutes = require('./routes/gallery');

const app = express();

// Trust proxy fr Railway/Production - aber nur wenn explizit gesetzt
if (process.env.NODE_ENV === 'production' || process.env.TRUST_PROXY === 'true') {
  app.set('trust proxy', 1);
} else {
  app.set('trust proxy', false);
}

// Performance Optimizations - nur in Development
if (process.env.NODE_ENV !== 'production' && !process.env.RAILWAY_ENVIRONMENT) {
  app.use(compression());
  app.use(trackRequest);
  performanceMonitor.startMonitoring();
  startupLogger.service('Performance Monitoring', true);
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
    console.warn(` Blockierter CORS-Origin: ${requestOrigin} (${requestPath})`);
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

// Rate Limiting - vereinfacht fr Development
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 Minuten
  max: process.env.NODE_ENV === 'production' ? 500 : 1000, // Production: Erhht von 50 auf 500
  message: 'Zu viele Anfragen von dieser IP, bitte versuchen Sie es spter erneut.',
  standardHeaders: true,
  legacyHeaders: false,
  trustProxy: false, // Explizit auf false setzen fr localhost
  skip: (req) => {
    // Skip rate limiting fr localhost in development
    if (process.env.NODE_ENV !== 'production') {
      const isLocalhost = req.ip === '127.0.0.1' || req.ip === '::1' || req.ip === '::ffff:127.0.0.1';
      return isLocalhost;
    }
    return false;
  }
});

// Verschrftes Rate Limiting fr Auth-Endpunkte  
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 Minuten
  max: process.env.NODE_ENV === 'production' ? 50 : 100, // Auth bleibt bei 50 fr Sicherheit
  message: 'Zu viele Login-Versuche. Bitte warten Sie 15 Minuten.',
  standardHeaders: true,
  legacyHeaders: false,
  trustProxy: false, // Explizit auf false setzen fr localhost
  skip: (req) => {
    // Skip auth rate limiting fr localhost in development
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

// Ensure upload directories exist
const ensureUploadDirectories = () => {
  const fs = require('fs');
  const uploadsPath = path.resolve(__dirname, 'uploads');
  const productsPath = path.resolve(__dirname, 'uploads/products');
  
  try {
    if (!fs.existsSync(uploadsPath)) {
      fs.mkdirSync(uploadsPath, { recursive: true });
    }
    if (!fs.existsSync(productsPath)) {
      fs.mkdirSync(productsPath, { recursive: true });
    }
    startupLogger.ok('Upload Directories');
  } catch (error) {
    startupLogger.error('Upload Directories', error.message);
  }
};

ensureUploadDirectories();

// Static Files (fr Produktbilder etc.)
app.use('/uploads', express.static('uploads'));

// Kritische Environment Variables prüfen
function validateCriticalEnvVars() {
  const critical = [
    'JWT_SECRET',
    'MONGODB_URI'
  ];
  
  const missing = critical.filter(key => !process.env[key]);
  
  if (missing.length > 0) {
    missing.forEach(key => startupLogger.error(`ENV: ${key}`, 'MISSING - CRITICAL'));
    console.error('\n⛔ SERVER START ABORTED - Critical environment variables missing\n');
    process.exit(1);
  }
  
  startupLogger.env('JWT_SECRET', !!process.env.JWT_SECRET, true);
  startupLogger.env('MONGODB_URI', !!process.env.MONGODB_URI, true);
  startupLogger.env('RESEND_API_KEY', !!process.env.RESEND_API_KEY);
  
  if (process.env.JWT_SECRET && process.env.JWT_SECRET.length < 32) {
    startupLogger.warn('JWT_SECRET', 'Too short (< 32 characters)');
  }
}

validateCriticalEnvVars();
const DATABASE_MODE = process.env.DATABASE_MODE || 'production';

// IMMER MongoDB Atlas URI aus Environment Variables verwenden
const MONGODB_URI = process.env.MONGODB_URI || process.env.MONGODB_URI_PROD;

if (!MONGODB_URI) {
  startupLogger.error('MongoDB URI', 'Not configured in environment');
  process.exit(1);
}

// MongoDB Connection mit Retry-Logik
async function connectToMongoDB(retries = 5, delay = 5000) {
  if (!MONGODB_URI) {
    startupLogger.error('MongoDB URI', 'Not configured');
    return;
  }
  
  // Optimierte Mongoose Verbindungsoptionen
  const mongooseOptions = DatabaseOptimizer.getOptimizedConnectionOptions();
  
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      await mongoose.connect(MONGODB_URI, mongooseOptions);
      
      startupLogger.ok('MongoDB Connection', `${mongoose.connection.db ? mongoose.connection.db.databaseName : 'connected'} @ ${mongoose.connection.host}`);
      
      // Database Optimization Setup - nur in Development
      if (process.env.NODE_ENV !== 'production' && !process.env.RAILWAY_ENVIRONMENT) {
        try {
          const isReady = await DatabaseDebugger.waitForConnection(5000);
          
          if (isReady) {
            await DatabaseDebugger.testCollectionAccess();
            await DatabaseOptimizer.createRecommendedIndexes();
            DatabaseOptimizer.enableSlowQueryLogging();
            await cacheManager.warmupCache();
            startupLogger.ok('Database Optimization');
          }
        } catch (optimizationError) {
          startupLogger.warn('Database Optimization', optimizationError.message);
        }
      }
      
      return;
    } catch (err) {
      if (attempt === retries) {
        startupLogger.error('MongoDB Connection', `Failed after ${retries} attempts`);
      }
      
      if (attempt < retries) {
        const waitTime = delay * attempt;
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
    }
  }
}

// Starte MongoDB Verbindung
connectToMongoDB();

// MongoDB Verbindungsevents überwachen - stille Überwachung
mongoose.connection.on('connected', () => {
  if (!startupLogger.checks.find(c => c.name.includes('MongoDB'))) {
    startupLogger.ok('MongoDB Connected');
  }
});

mongoose.connection.on('error', (err) => {
  logger.error('MongoDB Error:', err);
});

mongoose.connection.on('disconnected', () => {
  if (mongoose.connection.readyState === 0 && process.env.NODE_ENV === 'development') {
    setTimeout(() => connectToMongoDB().catch(console.error), 10000);
  }
});

// Graceful Shutdown
process.on('SIGINT', async () => {
  console.log('SIGINT erhalten, schliee Server...');
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
app.use('/api/dashboard', checkDatabaseConnection, dashboardRoutes);
app.use('/api/debug', checkDatabaseConnection, debugRoutes);
app.use('/api/portfolio', checkDatabaseConnection, portfolioRoutes);
app.use('/api/rohseife', checkDatabaseConnection, rohseifeRoutes);
app.use('/api/duftoele', checkDatabaseConnection, duftoeleRoutes);
app.use('/api/verpackungen', checkDatabaseConnection, verpackungenRoutes);
app.use('/api/zusatzinhaltsstoffe', checkDatabaseConnection, zusatzinhaltsstoffeRoutes);
app.use('/api/kunden', checkDatabaseConnection, kundenRoutes);
app.use('/api/users', checkDatabaseConnection, usersRoutes);
app.use('/api/cart', checkDatabaseConnection, cartRoutes);
app.use('/api/warenberechnung', checkDatabaseConnection, warenberechnungRoutes);
app.use('/api/lager', checkDatabaseConnection, lagerRoutes);
app.use('/api/email-logs', checkDatabaseConnection, emailLogsRoutes);
app.use('/api/invoice', checkDatabaseConnection, invoiceRoutes);
app.use('/api/invoices', checkDatabaseConnection, invoicesRoutes);
app.use('/api/images', require('./routes/images'));
app.use('/api/company-info', checkDatabaseConnection, companyInfoRoutes);
app.use('/api/gallery', checkDatabaseConnection, galleryRoutes);

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
      ? 'Gluecksmomente Backend luft' 
      : 'Backend luft, aber Datenbank ist nicht verfgbar',
    version: APP_VERSION,
    database: {
      status: dbStatusMap[dbStatus] || 'unknown',
      readyState: dbStatus,
      host: mongoose.connection.host || 'not connected',
      name: mongoose.connection.db ? mongoose.connection.db.databaseName : 'not connected',
      isConnected: dbStatus === 1
    },
    timestamp: new Date().toISOString(),
    // DSGVO-konforme IP-Anonymisierung - keine Vollspeicherung von IPs
    ipAddress: IPAnonymizer.anonymizeIP(req.ip || 'unknown')
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

// Health Check mit Performance Metrics - nur in Development
if (process.env.NODE_ENV !== 'production' && !process.env.RAILWAY_ENVIRONMENT) {
  app.get('/api/health-extended', (req, res) => {
    const metrics = performanceMonitor.getHealthMetrics();
    const cacheStats = cacheManager.getStats();
    
    res.json({
      status: 'OK',
      version: APP_VERSION,
      timestamp: new Date().toISOString(),
      performance: metrics,
      cache: cacheStats
    });
  });
}

// 404 Handler
app.use(notFoundHandler);

// Global Error Handler
app.use(globalErrorHandler);

const PORT = process.env.PORT || 5000;

const server = app.listen(PORT, () => {
  startupLogger.printChecklist();
  startupLogger.printSummary(PORT);
  
  // Upload-Cleanup starten
  require('./utils/uploadCleanup');
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM erhalten, schliee Server...');
  server.close(() => {
    logger.info('Server geschlossen.');
    // Cache nur in Development flushen
    if (process.env.NODE_ENV !== 'production' && !process.env.RAILWAY_ENVIRONMENT) {
      cacheManager.flush();
    }
    mongoose.connection.close();
    logger.info('MongoDB Verbindung geschlossen.');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  logger.info('SIGINT erhalten, schliee Server...');
  server.close(() => {
    logger.info('Server geschlossen.');
    // Cache nur in Development flushen
    if (process.env.NODE_ENV !== 'production' && !process.env.RAILWAY_ENVIRONMENT) {
      cacheManager.flush();
    }
    mongoose.connection.close();
    logger.info('MongoDB Verbindung geschlossen.');
    process.exit(0);
  });
});


