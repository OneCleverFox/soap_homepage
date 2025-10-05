const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

// Dotenv Configuration - lädt die richtige .env Datei basierend auf NODE_ENV
if (process.env.DOTENV_KEY) {
  // Railway verwendet dotenv-vault
  require('dotenv-vault/config');
} else {
  // Lokal: Lade .env.development oder .env.production
  const envFile = process.env.NODE_ENV === 'production' 
    ? '.env.production' 
    : '.env.development';
  
  require('dotenv').config({
    path: path.resolve(__dirname, '..', envFile)
  });
  
  console.log(`🔧 Loaded environment from: ${envFile}`);
  console.log(`🌍 NODE_ENV: ${process.env.NODE_ENV}`);
  console.log(`🔌 PORT: ${process.env.PORT}`);
  console.log(`🗄️  DATABASE_MODE: ${process.env.DATABASE_MODE}`);
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
  'http://127.0.0.1:3000',
  'http://127.0.0.1:3001'
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
  
  // Mongoose Verbindungsoptionen für Railway + MongoDB Atlas
  const mongooseOptions = {
    serverSelectionTimeoutMS: 30000, // 30 Sekunden für Server Selection
    socketTimeoutMS: 45000, // 45 Sekunden für Socket Operations
    family: 4 // Force IPv4 (Railway hat manchmal IPv6 Probleme)
  };
  
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      await mongoose.connect(MONGODB_URI, mongooseOptions);
      console.log('✅ MongoDB erfolgreich verbunden');
      console.log('📊 Database:', mongoose.connection.db.databaseName);
      console.log('🏢 Host:', mongoose.connection.host);
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
app.use('/api/users', usersRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/warenberechnung', warenberechnungRoutes);
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