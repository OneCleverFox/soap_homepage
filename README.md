# 🧼 Glücksmomente - E-Commerce Platform

![Build Status](https://img.shields.io/badge/build-passing-brightgreen)
![Version](https://img.shields.io/badge/version-2.1.0-blue)
![Node.js](https://img.shields.io/badge/node.js-18+-green)
![React](https://img.shields.io/badge/React-18+-blue)
![License](https://img.shields.io/badge/license-MIT-green)

Eine moderne, vollständige E-Commerce-Lösung für handgemachte Naturkosmetik und Seifen. Entwickelt mit MERN Stack und optimiert für Performance, Skalierbarkeit und Benutzerfreundlichkeit.

## 📖 Inhaltsverzeichnis

- [🚀 Überblick](#-überblick)
- [✨ Features](#-features)
- [🛠 Technologie Stack](#-technologie-stack)
- [🏗 Architektur](#-architektur)
- [📦 Installation](#-installation)
- [🔧 Konfiguration](#-konfiguration)
- [🚀 Deployment](#-deployment)
- [📚 API Dokumentation](#-api-dokumentation)
- [🔐 Sicherheit](#-sicherheit)
- [🧪 Testing](#-testing)
- [🤝 Contributing](#-contributing)

---

## 🚀 Überblick

Glücksmomente ist eine vollständige E-Commerce-Plattform, die speziell für handgemachte Naturkosmetik entwickelt wurde. Die Lösung bietet sowohl einen modernen Online-Shop als auch ein umfassendes Admin-Panel für die Geschäftsverwaltung.

### Hauptkomponenten
- **Frontend**: React-basierte Progressive Web App
- **Backend**: Node.js/Express.js API Server
- **Admin Panel**: Vollständiges Verwaltungssystem
- **Payment**: PayPal Integration
- **Database**: MongoDB mit Mongoose ODM

---

## ✨ Features

### 🛒 E-Commerce Kernfunktionen
- **Produktkatalog** mit erweiterten Kategorien und intelligenten Filtern
- **Responsive Produktsuche** mit Echtzeit-Ergebnissen
- **Intelligenter Warenkorb** mit persistenter Speicherung
- **Multi-Payment Checkout** (PayPal, zukünftig Kreditkarte)
- **Benutzerregistrierung** mit E-Mail-Verifizierung
- **Bestellverfolgung** mit automatischen Status-Updates
- **Kundenanfragen** System mit automatisierter Bearbeitung

### 🎨 Responsive Design & UX
- **Mobile-First** Progressive Web App (PWA)
- **Material-UI Design System** für konsistente Benutzererfahrung
- **Touch-optimierte** Bedienelemente für mobile Geräte
- **Offline-Funktionalität** mit Service Worker
- **Performance-optimiert** mit Lazy Loading und Code-Splitting
- **Dark/Light Mode** Support

### 🔧 Admin-Management System
- **📊 Analytics Dashboard** mit Verkaufsstatistiken und KPIs
- **🗃️ Produktverwaltung** (CRUD-Operationen, Batch-Updates)
- **📋 Bestellabwicklung** mit automatisierten Workflows
- **📦 Lagerverwaltung** mit Bestandsalarmen und Mindestmengen
- **👥 Kundenverwaltung** mit Segmentierung und Kommunikationshistorie
- **🎨 Portfolio-Verwaltung** für Produktpräsentationen
- **🧪 Rohstoff-Verwaltung** (Rohseife, Duftöle, Verpackungen)
- **📐 Warenberechnung** für Produktionsplanung und Kostenkalkulation
- **🧾 Rechnungssystem** mit PDF-Generierung und E-Mail-Versand
- **📧 E-Mail Management** mit Templates und Automatisierung
- **🖼️ Bildoptimierung** (WebP-Konvertierung, automatische Größenanpassung)

### 🧾 Professionelles Rechnungssystem
- **Rechnungsvorlagen-Designer** mit Drag & Drop Interface
- **Automatische PDF-Generierung** für alle Bestellungen
- **E-Mail-Rechnungsversand** mit anpassbaren Templates
- **Rechnungsverwaltung** mit Such- und Filterfunktionen
- **Firmenbranding** mit Logo-Upload und Corporate Design
- **Variable System** für dynamische Rechnungsinhalte
- **Rechtskonformität** mit allen erforderlichen Pflichtangaben

### 🚀 Performance & Security
- **JWT-basierte Authentifizierung** mit Refresh-Token-System
- **Role-based Access Control** (Admin/User)
- **Rate Limiting** und CORS-Schutz
- **Input Validation** und XSS-Schutz
- **Bildoptimierung** und intelligentes Caching
- **SSL/HTTPS** End-to-End Verschlüsselung
- **Database Security** mit MongoDB Atlas

---

## 🛠 Technologie Stack

### Frontend
```
React 18.2.0          # Modern UI Framework
Material-UI 5.15.0    # Design System & Components
React Router 6.8.0    # Client-side Routing
Axios 1.6.2           # HTTP Client
React Query 3.39.3    # Server State Management
Framer Motion 10.16.16 # Animations
React Hook Form 7.48.2 # Form Management
Recharts 2.15.4       # Analytics Charts
```

### Backend
```
Node.js 18+           # Runtime Environment
Express.js 4.18.2     # Web Framework
MongoDB/Mongoose 8.0.3 # Database & ODM
JWT 9.0.2             # Authentication
Multer 1.4.5          # File Upload
Nodemailer 7.0.9      # Email Service
Puppeteer 24.25.0     # PDF Generation
Sharp 0.34.4          # Image Processing
bcryptjs 2.4.3        # Password Hashing
```

### Development & Deployment
```
React Scripts 5.0.1   # Build Tools
Railway              # Backend Hosting
Vercel               # Frontend Deployment
MongoDB Atlas        # Cloud Database
GitHub Actions       # CI/CD Pipeline
```

---

## 🏗 Architektur

### Projekt-Struktur
```
soap_homepage/
├── frontend/                     # React Client Application
│   ├── public/                  # Static Assets & PWA Manifest
│   └── src/
│       ├── components/          # Reusable UI Components
│       │   ├── common/         # Shared Components
│       │   └── layout/         # Layout Components (Navbar, Footer)
│       ├── pages/              # Route-specific Pages
│       ├── admin/              # Admin Panel Components
│       │   ├── AdminDashboard.js
│       │   ├── AdminOrdersManagement.js
│       │   ├── CreateInvoice.js
│       │   ├── InvoiceList.js
│       │   └── AdminInvoiceDesigner.js
│       ├── hooks/              # Custom React Hooks
│       ├── services/           # API Services & Utilities
│       ├── contexts/           # React Context Providers
│       └── utils/              # Helper Functions
├── backend/                     # Node.js Server Application
│   └── src/
│       ├── controllers/        # Business Logic
│       ├── models/             # MongoDB Models
│       ├── routes/             # API Routes
│       │   ├── admin/         # Admin-specific Routes
│       │   ├── auth.js
│       │   ├── orders.js
│       │   └── inquiries.js
│       ├── middleware/         # Custom Middleware
│       ├── services/           # Business Services
│       │   ├── PDFService.js
│       │   ├── emailService.js
│       │   └── orderInvoiceService.js
│       └── utils/              # Helper Utilities
├── docs/                       # Project Documentation
├── logs/                       # Application Logs
└── uploads/                    # File Upload Storage
```

### Database Schema (MongoDB)
```
Collections:
├── users              # Customer & Admin Accounts
├── products           # Product Catalog
├── orders             # Order Management
├── inquiries          # Customer Inquiries
├── invoices           # Invoice System
├── invoiceTemplates   # Invoice Templates & Company Data
├── portfolio          # Product Portfolio
├── rohseife          # Raw Soap Materials
├── duftoil           # Fragrance Oils
├── verpackung        # Packaging Materials
└── bestand           # Inventory Management
```

---

## 📦 Installation

### Voraussetzungen
- **Node.js 18+** und **npm 8+**
- **MongoDB Atlas Account** oder lokale MongoDB-Installation
- **Git** für Repository-Cloning

### 1. Repository klonen
```bash
git clone <repository-url>
cd soap_homepage
```

### 2. Abhängigkeiten installieren
```bash
# Root-Level Dependencies (Backend Production)
npm install

# Frontend Dependencies
cd frontend
npm install

# Backend Development Dependencies
cd ../backend
npm install
```

### 3. Environment Variablen konfigurieren
```bash
# Root-Level .env erstellen
cp .env.example .env

# Frontend .env erstellen (falls erforderlich)
cd frontend
cp .env.example .env
```

---

## 🔧 Konfiguration

### Environment Variablen (.env)
```env
# Database
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/database

# JWT
JWT_SECRET=your-secure-jwt-secret-minimum-32-characters
JWT_REFRESH_SECRET=your-secure-refresh-secret

# PayPal
PAYPAL_CLIENT_ID=your-paypal-client-id
PAYPAL_CLIENT_SECRET=your-paypal-client-secret
PAYPAL_ENVIRONMENT=sandbox # oder production

# Email Service
EMAIL_SERVICE=gmail # oder smtp
EMAIL_USER=your-email@domain.com
EMAIL_PASSWORD=your-app-password

# Application
NODE_ENV=development # oder production
PORT=5000
FRONTEND_URL=http://localhost:3000

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# File Upload
MAX_FILE_SIZE=5242880 # 5MB in bytes
UPLOAD_PATH=./uploads
```

### Frontend Konfiguration
```env
# API Connection
REACT_APP_API_URL=http://localhost:5000/api

# PayPal
REACT_APP_PAYPAL_CLIENT_ID=your-paypal-client-id

# Application
REACT_APP_ENVIRONMENT=development
```

---

## 🚀 Deployment

### Development
```bash
# Backend starten
npm run dev

# Frontend starten (neues Terminal)
cd frontend
npm start
```

### Production Build
```bash
# Frontend Build
cd frontend
npm run build

# Backend Production
npm start
```

### Hosting-Plattformen

#### Railway (Backend)
1. **Repository mit Railway verbinden**
2. **Environment Variablen konfigurieren**
3. **Automatisches Deployment bei Git-Push**

#### Vercel (Frontend)
1. **Frontend-Ordner mit Vercel verbinden**
2. **Build-Settings konfigurieren**
3. **Domain-Konfiguration**

---

## 📚 API Dokumentation

### Authentication Endpoints
```
POST   /api/auth/register     # Benutzerregistrierung
POST   /api/auth/login        # Benutzeranmeldung
POST   /api/auth/refresh      # Token-Refresh
POST   /api/auth/logout       # Abmeldung
```

### Product Management
```
GET    /api/products          # Produktliste abrufen
GET    /api/products/:id      # Einzelnes Produkt
POST   /api/admin/products    # Produkt erstellen (Admin)
PUT    /api/admin/products/:id # Produkt aktualisieren (Admin)
DELETE /api/admin/products/:id # Produkt löschen (Admin)
```

### Order Management
```
GET    /api/orders            # Bestellungen abrufen
POST   /api/orders            # Neue Bestellung erstellen
GET    /api/orders/:id        # Bestelldetails
PUT    /api/admin/orders/:id  # Bestellstatus ändern (Admin)
```

### Invoice System
```
GET    /api/admin/invoices          # Alle Rechnungen (Admin)
POST   /api/admin/invoices          # Rechnung erstellen (Admin)
GET    /api/admin/invoices/:id/pdf  # PDF herunterladen (Admin)
POST   /api/admin/invoices/:id/send # Rechnung per E-Mail senden (Admin)
```

### Admin Dashboard
```
GET    /api/dashboard/overview # Dashboard-Statistiken
GET    /api/admin/users        # Benutzerverwaltung
GET    /api/admin/analytics    # Verkaufsanalytics
```

---

## 🔐 Sicherheit

### Implementierte Sicherheitsmaßnahmen
- **Helmet.js** für HTTP-Header-Sicherheit
- **CORS-Konfiguration** mit Whitelist
- **Rate Limiting** zum Schutz vor Brute-Force
- **Input Validation** mit express-validator
- **XSS-Schutz** durch Eingabe-Sanitization
- **SQL Injection Prevention** durch MongoDB/Mongoose
- **Password Hashing** mit bcryptjs (Salting)
- **JWT Security** mit sicheren Secrets und Expiration

### Authentifizierung & Autorisierung
```javascript
// JWT-Token-Struktur
{
  "userId": "user-id",
  "email": "user@example.com",
  "permissions": ["admin", "user"],
  "exp": 1234567890
}

// Role-based Access Control
const requireAdmin = (req, res, next) => {
  if (!req.user?.permissions?.includes('admin')) {
    return res.status(403).json({ message: 'Admin-Berechtigung erforderlich' });
  }
  next();
};
```

---

## 🧪 Testing

### Test-Umgebung einrichten
```bash
# Test-Dependencies installieren
npm install --save-dev jest supertest

# Tests ausführen
npm test
```

### API-Testing mit Postman
Eine Postman-Collection mit allen API-Endpoints ist verfügbar:
```
docs/api-collection.postman.json
```

---

## 🤝 Contributing

### Development Workflow
1. **Feature Branch** erstellen: `git checkout -b feature/neue-funktion`
2. **Änderungen implementieren** und committen
3. **Tests ausführen**: `npm test`
4. **Pull Request** erstellen mit ausführlicher Beschreibung

### Code Standards
- **ESLint** für JavaScript-Standards
- **Prettier** für Code-Formatierung
- **Kommentare** für komplexe Businesslogik
- **Commit Messages** nach Conventional Commits

### Branch-Strategie
- **main**: Production-ready Code
- **quality**: Testing/Staging Branch
- **feature/***: Feature-Development
- **bugfix/***: Bug-Fixes

---

## 📋 System Requirements

### Minimum Requirements
- **Node.js**: 18.0.0+
- **npm**: 8.0.0+
- **MongoDB**: 4.4+
- **RAM**: 2GB (Development), 4GB (Production)
- **Storage**: 10GB für Uploads und Logs

### Empfohlene Requirements
- **Node.js**: 20.0.0+
- **RAM**: 8GB+
- **Storage**: 50GB+ SSD
- **CPU**: 4+ Cores
- **Netzwerk**: Stabile Internetverbindung für MongoDB Atlas

---

## 📞 Support & Wartung

### Logs & Monitoring
```bash
# Backend-Logs anzeigen
npm run logs:view        # Combined Logs
npm run logs:errors      # Nur Fehler

# Cache leeren
npm run cache:clear
```

### Backup & Maintenance
- **Automatische MongoDB-Backups** durch MongoDB Atlas
- **Regelmäßige Dependency-Updates** empfohlen
- **Performance-Monitoring** durch Built-in Analytics

### Performance Optimierung
- **Bildoptimierung**: Automatische WebP-Konvertierung
- **Caching**: Redis-kompatible Cache-Layer
- **CDN**: Für statische Assets empfohlen
- **Database Indexing**: Optimiert für häufige Queries

---

## 📄 Lizenz

MIT License - Details siehe [LICENSE](LICENSE) Datei.

---

**Entwickelt mit ❤️ für handgemachte Naturkosmetik**

### 🚀 Performance & Security
- **Lazy Loading** und Code-Splitting
- **JWT-basierte Authentifizierung**
- **Rate Limiting** und CORS-Schutz
- **Bildoptimierung** und Caching
- **SSL/HTTPS** End-to-End Verschlüsselung

---

## 🛠 Technologie Stack

### Frontend
- **React 18** mit Hooks und Context API
- **Material-UI v5** für konsistentes Design
- **React Router v6** für Navigation
- **Axios** für HTTP-Requests
- **Custom Hooks** für State Management

### Backend
- **Node.js** mit Express.js Framework
- **MongoDB** mit Mongoose ODM
- **JWT** für Authentifizierung
- **Multer** für Datei-Uploads
- **Nodemailer** für E-Mail-Versand

### Development & Deployment
- **React Scripts** als Build-Tool
- **Railway** für Backend-Hosting
- **Vercel** für Frontend-Deployment
- **MongoDB Atlas** als Cloud-Datenbank

---

## 🏗 Architektur

### Projekt-Struktur
```
soap_homepage/
├── frontend/                 # React Client Application
│   ├── src/
│   │   ├── components/      # Wiederverwendbare UI-Komponenten
│   │   ├── pages/           # Route-spezifische Seiten
│   │   ├── hooks/           # Custom React Hooks
│   │   ├── services/        # API-Services und Utilities
│   │   ├── admin/           # Admin-spezifische Komponenten
│   │   └── utils/           # Hilfsfunktionen
│   └── public/              # Statische Assets
├── backend/                 # Node.js Server Application
│   ├── src/
│   │   ├── controllers/     # Request Handler
│   │   ├── models/          # Mongoose Data Models
│   │   ├── routes/          # Express Route Definitionen
│   │   ├── middleware/      # Custom Middleware
│   │   └── services/        # Business Logic Services
│   └── uploads/             # Datei-Upload Directory
```

### Hook-System (Frontend)
```
src/hooks/
├── useAdminState.js         # Admin State Management (loading, error, success)
├── useAdminSearch.js        # Search & Filter mit nested field support
├── useAdminPagination.js    # Pagination, Sorting, erweiterte Filter
├── useAdminDialog.js        # Dialog State Management + Confirmations
├── useFormValidation.js     # Einheitliche Form Validation
└── useResponsiveLayout.js   # Responsive Breakpoint Logic
```

### Komponentenbibliothek
```
src/components/
├── AdminPageTemplate.js    # Base Template für Admin-Seiten
├── AdminDialog.js          # Generische Dialog-Komponenten
├── responsive/             # Factory-basierte Responsive Components
└── common/                 # Gemeinsam genutzte UI-Komponenten
```

---

## 🚀 Installation

### Voraussetzungen
- **Node.js** v16 oder höher
- **npm** oder **yarn**
- **MongoDB** (lokal oder Atlas)

### 1. Repository klonen
```bash
git clone https://github.com/username/soap_homepage.git
cd soap_homepage
```

### 2. Dependencies installieren
```bash
# Backend Dependencies
cd backend && npm install

# Frontend Dependencies
cd ../frontend && npm install
```

### 3. Environment Variables
```bash
# Backend (.env)
PORT=5000
MONGODB_URI=mongodb://localhost:27017/gluecksmomente
JWT_SECRET=your-jwt-secret
PAYPAL_CLIENT_ID=your-paypal-client-id
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-email-password

# Frontend (.env)
REACT_APP_API_URL=http://localhost:5000/api
REACT_APP_PAYPAL_CLIENT_ID=your-paypal-client-id
```

### 4. Anwendung starten
```bash
# Backend (Port 5000)
cd backend && npm start

# Frontend (Port 3000)
cd frontend && npm start
```

---

## 🌐 Deployment

### Backend (Railway)
```bash
# Railway CLI Installation
npm install -g @railway/cli

# Deploy
railway login
railway deploy
```

### Frontend (Vercel)
```bash
# Vercel CLI Installation
npm install -g vercel

# Deploy
vercel --prod
```

### Environment Production
```bash
# Production Environment Variables
NODE_ENV=production
MONGODB_URI=mongodb+srv://...
CORS_ORIGIN=https://your-frontend-domain.com
```

---

## 📚 API Dokumentation

### Authentifizierung
```javascript
// Login
POST /api/auth/login
{
  "email": "user@example.com",
  "password": "password123"
}

// Registrierung
POST /api/auth/register
{
  "email": "user@example.com",
  "password": "password123",
  "firstName": "John",
  "lastName": "Doe"
}
```

### Produkte
```javascript
// Alle Produkte abrufen
GET /api/products?page=1&limit=10&search=seife

// Produkt erstellen (Admin)
POST /api/admin/products
Authorization: Bearer <token>
{
  "name": "Lavendel Seife",
  "price": 8.99,
  "description": "Handgemachte Naturseife",
  "category": "seife"
}
```

### Warenkorb
```javascript
// Warenkorb abrufen
GET /api/cart
Authorization: Bearer <token>

// Artikel hinzufügen
POST /api/cart/add
{
  "productId": "64f...",
  "quantity": 2
}
```

---

## 🔧 Development

### Code Style
- **ESLint** für JavaScript Linting
- **Prettier** für Code Formatting
- **Husky** für Pre-commit Hooks

### Testing
```bash
# Frontend Tests
cd frontend && npm test

# Backend Tests
cd backend && npm test
```

### Custom Hooks Verwendung
```javascript
// Admin Component mit Standard Hooks
const MyAdminComponent = () => {
  const { loading, error, handleAsyncOperation } = useAdminState();
  const { searchTerm, filteredItems } = useAdminSearch(data, ['name', 'email']);
  const { openCreateDialog, dialogs } = useAdminDialog();
  
  return (
    // Component JSX
  );
};
```

### Responsive Components
```javascript
// Factory Pattern für Responsive Components
const ResponsiveComponent = createResponsivePage(DesktopComponent, MobileComponent);
```

---

## 🤝 Contributing

### Git Workflow
1. **Fork** das Repository
2. **Branch** für Feature erstellen (`git checkout -b feature/amazing-feature`)
3. **Commit** Änderungen (`git commit -m 'Add amazing feature'`)
4. **Push** zu Branch (`git push origin feature/amazing-feature`)
5. **Pull Request** erstellen

### Development Guidelines
- **Komponenten** müssen wiederverwendbar sein
- **Hooks** für repetitive Logik verwenden
- **TypeScript** für neue Features bevorzugt
- **Tests** für kritische Funktionen schreiben
- **Performance** bei UI-Änderungen beachten

---

## 📝 Lizenz

Dieses Projekt ist unter der [MIT Lizenz](LICENSE) lizenziert.

---

## 📞 Support

- **Dokumentation**: [Wiki](https://github.com/username/soap_homepage/wiki)
- **Issues**: [GitHub Issues](https://github.com/username/soap_homepage/issues)
- **E-Mail**: developer@gluecksmomente-manufaktur.de

---

## 🎉 Danksagungen

Vielen Dank an alle Mitwirkenden und die Open-Source-Community für die verwendeten Libraries und Tools.
- 📦 **Bestellverfolgung** und Historie
- 📱 **Mobile-optimiert** und barrierefrei

### 👨‍💼 Admin-Dashboard
- 📊 **Analytics** mit Verkaufsstatistiken
- 🗃️ **Produktmanagement** (Create, Read, Update, Delete)
- 📋 **Bestellverwaltung** mit Status-Updates
- 📦 **Lagerverwaltung** mit Bestandstracking
- 🎨 **Portfolio-Verwaltung** für Produktpräsentation
- 🧪 **Rohstoff-Verwaltung** (Rohseife, Duftöle, Verpackungen)
- 📐 **Warenberechnung** für Produktionsplanung
- 🖼️ **Automatische Bildoptimierung** (WebP, 95% kleiner)

### 🔒 Sicherheit & Performance
- 🔐 **JWT Authentifizierung** mit sicheren Tokens
- 🔒 **Passwort-Hashing** mit bcrypt
- 🛡️ **Rate Limiting** und CORS Protection
- ✅ **Input-Validierung** und Security Headers
- 🔄 **MongoDB Retry Mechanism** (5 Versuche)
- ⚡ **Bildoptimierung** (Sharp, WebP, ~95% Reduktion)
- 🔍 **SEO-optimiert** für Suchmaschinen

## 🛠️ Technologie Stack

| Bereich | Technologie | Beschreibung |
|---------|-------------|--------------|
| **Frontend** | React 18 | Modern UI Framework mit Hooks |
| | Material-UI (MUI) | Enterprise Design System |
| | React Router v6 | Declarative Navigation |
| | Context API | State Management |
| **Backend** | Node.js + Express.js | RESTful API Server |
| | MongoDB Atlas | Cloud-Datenbank mit Replica Set |
| | Sharp | Bildoptimierung & WebP-Konvertierung |
| | JWT + bcrypt | Sichere Authentifizierung |
| **DevOps** | Vercel | Frontend CDN & Serverless |
| | Railway | Backend Container Platform |
| | GitHub Actions | CI/CD Pipeline |
| **Monitoring** | Health Checks | Automated System Monitoring |

## 🚀 Schnellstart

### Voraussetzungen

- **Node.js** (>= 18.0.0)
- **npm** oder **yarn**
- **MongoDB Atlas** Account (kostenlos)

### 📦 Installation

```bash
# 1. Repository klonen
git clone https://github.com/OneCleverFox/soap_homepage.git
cd soap_homepage

# 2. Backend Setup
cd backend
npm install

npm run dev  # Backend startet auf Port 5000

# 3. Frontend Setup (neues Terminal)
cd ../frontend
npm install
echo "REACT_APP_API_URL=http://localhost:5000/api" > .env.local
npm start  # Frontend startet auf Port 3000
```

### 🔧 Environment Setup

```bash
# Backend (.env)
NODE_ENV=development
PORT=5000
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/gluecksmomente
JWT_SECRET=your-super-secure-secret-key
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=secure-password

# Frontend (.env.local)
REACT_APP_API_URL=http://localhost:5000/api
```

### 🎯 Erste Schritte

1. **MongoDB Atlas** Setup (2 Minuten):
   - Account erstellen → mongodb.com
   - Cluster erstellen (M0 FREE)
   - Database User anlegen
   - Network Access: `0.0.0.0/0` hinzufügen

2. **Admin-Account** wird beim ersten Start automatisch erstellt

3. **Test-Produkte** über Admin-Panel hinzufügen: `/admin`

## 🚀 Deployment

### 🔧 Production Deployment

#### Railway (Backend)
1. **Repository verbinden** zu Railway
2. **Root Directory**: `/backend` 
3. **Environment Variables**:
```bash
NODE_ENV=production
MONGODB_URI=mongodb+srv://...
JWT_SECRET=production-secret-key
ADMIN_EMAIL=admin@yourdomain.com
FRONTEND_URL=https://yourdomain.vercel.app
```

#### Vercel (Frontend)  
1. **Repository verbinden** zu Vercel
2. **Root Directory**: `/frontend`
3. **Environment Variables**:
```bash
REACT_APP_API_URL=https://yourapp.railway.app/api
GENERATE_SOURCEMAP=false
```

### 🔄 Automatisches Deployment
```bash
git push origin main
# → Automatisches Deployment auf Railway + Vercel
```

## 📁 Projektstruktur

```
soap_homepage/
├── 📦 backend/                 # Node.js/Express API
│   ├── src/
│   │   ├── 🚀 server.js       # Entry Point
│   │   ├── 📊 models/         # MongoDB Schemas
│   │   ├── 🛣️ routes/          # API Endpoints
│   │   ├── 🎮 controllers/    # Business Logic
│   │   └── 🛡️ middleware/      # Auth, Validation, Optimization
│   └── 🖼️ uploads/            # Image Storage
├── 🎨 frontend/               # React SPA
│   ├── public/               # Static Assets
│   └── src/
│       ├── 🧩 components/    # Reusable UI Components
│       ├── 📄 pages/         # Route Components
│       ├── 🏪 contexts/      # State Management
│       ├── 📡 services/      # API Integration
│       └── 👨‍💼 admin/        # Admin Dashboard
└── 📚 docs/                  # Documentation
```

## 📜 API Dokumentation

### 🌐 Public Endpoints
| Method | Endpoint | Beschreibung |
|--------|----------|--------------|
| `GET` | `/api/health` | System Health Check |
| `GET` | `/api/products` | Produktkatalog abrufen |
| `POST` | `/api/auth/login` | Benutzer-Login |
| `POST` | `/api/users/register` | Neuregistrierung |

### 🔒 Protected Endpoints (JWT Required)
| Method | Endpoint | Beschreibung |
|--------|----------|--------------|
| `GET` | `/api/cart` | Warenkorb abrufen |
| `POST` | `/api/cart/add` | Produkt hinzufügen |
| `POST` | `/api/orders` | Bestellung erstellen |
| `GET` | `/api/orders/history` | Bestellhistorie |

### 👨‍💼 Admin Endpoints (Admin Role Required)
| Method | Endpoint | Beschreibung |
|--------|----------|--------------|
| `GET` | `/api/admin/orders` | Alle Bestellungen |
| `POST` | `/api/admin/products` | Produkt erstellen |
| `PUT` | `/api/admin/products/:id` | Produkt bearbeiten |
| `POST` | `/api/admin/products/:id/image` | Bild hochladen (auto-optimiert) |
| `GET` | `/api/admin/analytics` | Verkaufsstatistiken |

## 🎨 Features im Detail

### 📷 Automatische Bildoptimierung
- **WebP-Konvertierung**: ~30% kleiner als JPEG
- **Auto-Resize**: Max. 1200px Breite
- **Base64-Speicherung**: Persistent in MongoDB
- **EXIF-Entfernung**: Datenschutz-konform
- **95% Größenreduktion**: 3MB → ~300KB typisch

### 🔒 Sicherheitsfeatures
- **Rate Limiting**: 50 Requests/15min (Production)
- **CORS Protection**: Whitelisted Origins
- **Helmet.js**: Umfassende Security Headers
- **JWT Tokens**: Sichere Session-Verwaltung
- **Input Sanitization**: XSS & Injection Protection

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit changes (`git commit -m 'Add AmazingFeature'`)
4. Push to branch (`git push origin feature/AmazingFeature`)
5. Open Pull Request

## � License

This project is licensed under the MIT License.

## 📞 Support

For support and questions, please contact the development team.

---

**Entwickelt mit ❤️ für Glücksmomente-Manufaktur**

### Backend
- **Node.js** & **Express.js** - Server Framework
- **MongoDB Atlas** mit **Mongoose ODM** - Cloud-Datenbank
- **Sharp** - Bildoptimierung und -komprimierung
- **JWT** - Authentication & Authorization
- **bcrypt** - Password Hashing
- **Helmet** - Security Middleware
- **Railway** - Deployment Platform

### Frontend
- **React 18** - UI Framework
- **Material-UI (MUI)** - Design System
- **React Router v6** - Navigation
- **Context API** - State Management (Auth, Cart)
- **Axios** - HTTP Client
- **Vercel** - Deployment Platform

## 📦 Quick Start

### Voraussetzungen

- Node.js (>= 18.0.0)
- npm oder yarn
- MongoDB Atlas Account (kostenlos)

### Lokale Installation

```bash
# 1. Repository klonen
git clone https://github.com/OneCleverFox/soap_homepage.git
cd soap_homepage

# 2. Backend Setup
cd backend
npm install

# Environment File erstellen
cp .env.development.example .env.development
# Bearbeite .env.development mit deinen Daten:
# - MONGODB_URI (MongoDB Atlas Connection String)
# - JWT_SECRET (z.B. mit openssl rand -base64 64)
# - ADMIN_EMAIL & ADMIN_PASSWORD
# - FRONTEND_URL=http://localhost:3001

npm start  # Backend startet auf Port 5000

# 3. Frontend Setup (neues Terminal)
cd ../frontend
npm install

# Environment File erstellen
echo "REACT_APP_API_URL=http://localhost:5000/api" > .env.development

npm start  # Frontend startet auf Port 3001
```

### Erste Schritte

1. **MongoDB Atlas Setup**:
   - Erstelle kostenlosen Account auf mongodb.com
   - Erstelle Cluster und Database User
   - Füge `0.0.0.0/0` zu Network Access hinzu
   - Kopiere Connection String in `.env.development`

2. **Admin-Account**:
   - Wird automatisch beim ersten Start erstellt
   - Email & Passwort aus `.env.development`

3. **Test-Produkte**:
   - Admin-Panel öffnen: `http://localhost:3001/admin`
   - Portfolio → Produkt erstellen
   - Bild hochladen (wird automatisch optimiert!)

## 🚀 Deployment

### Railway (Backend)

1. **GitHub Repository verbinden**
2. **Create New Project** → Deploy from GitHub
3. **Root Directory**: `/backend`
4. **Environment Variables** setzen:
   ```
   NODE_ENV=production
   PORT=5000
   MONGODB_URI=mongodb+srv://...
   JWT_SECRET=your-secure-secret
   ADMIN_EMAIL=your@email.com
   ADMIN_PASSWORD=securepassword
   FRONTEND_URL=https://your-vercel-domain.vercel.app
   CORS_ORIGIN=*
   ```
5. **Deploy** klicken

### Vercel (Frontend)

1. **GitHub Repository verbinden**
2. **Root Directory**: `/frontend`
3. **Environment Variables** setzen:
   ```
   REACT_APP_API_URL=https://your-railway-domain.railway.app/api
   REACT_APP_FRONTEND_URL=https://your-vercel-domain.vercel.app
   GENERATE_SOURCEMAP=false
   ```
4. **Deploy** klicken

## 📁 Projekt-Struktur

```
soap_homepage/
├── backend/                    # Node.js/Express Backend
│   ├── src/
│   │   ├── server.js          # Server Entry Point
│   │   ├── models/            # MongoDB Schemas
│   │   ├── routes/            # API Routes
│   │   ├── controllers/       # Business Logic
│   │   ├── middleware/        # Auth, Validation & Image Optimization
│   │   │   ├── auth.js
│   │   │   ├── validation.js
│   │   │   └── imageOptimization.js  # Sharp Middleware
│   ├── scripts/               # Utility Scripts
│   │   └── migrateImagesToBase64.js
│   └── package.json
│
├── frontend/                   # React Frontend
│   ├── src/
│   │   ├── App.js             # Main App Component
│   │   ├── pages/             # Page Components
│   │   ├── components/        # Reusable Components
│   │   ├── contexts/          # Context Providers (Auth, Cart)
│   │   ├── services/          # API Services
│   │   └── admin/             # Admin Panel Components
│   └── package.json
│
├── ARCHITECTURE.md            # ✅ Konsolidiert in README
├── BILDOPTIMIERUNG.md         # ✅ Konsolidiert in README  
├── RECHNUNGSSYSTEM_HANDBUCH.md # ✅ Konsolidiert in README
├── PAYPAL_*.md                # ✅ Konsolidiert in README (alle PayPal-Dokumentationen)
└── README.md                  # 📚 Zentrale Dokumentation
```

## 🎨 Bildoptimierung

Das System optimiert **alle** hochgeladenen Bilder automatisch:

- 📐 **Auto-Resize**: Max. 1200px Breite
- 🎨 **WebP-Konvertierung**: ~30% kleiner als JPEG
- 💾 **Base64 in MongoDB**: Persistent, überlebt Deployments
- 🔒 **EXIF-Daten entfernt**: Datenschutz & Sicherheit
- ⚡ **~95% Größenreduktion**: 3 MB → ~300 KB typisch

**Details**: Siehe Automatische Bildoptimierung im Features-Bereich

## � PayPal Integration

### 🔧 Konfiguration

Das System unterstützt sowohl Sandbox- als auch Live-PayPal-Zahlungen mit automatischer Umgebungsauswahl:

**Environment Variables für Railway/Vercel:**
```bash
# Sandbox (Testing)
PAYPAL_SANDBOX_CLIENT_ID=your-sandbox-client-id
PAYPAL_SANDBOX_CLIENT_SECRET=your-sandbox-client-secret

# Live (Production)
PAYPAL_LIVE_CLIENT_ID=your-live-client-id
PAYPAL_LIVE_CLIENT_SECRET=your-live-client-secret

# Legacy Support
PAYPAL_CLIENT_ID=fallback-to-sandbox
PAYPAL_CLIENT_SECRET=fallback-to-sandbox
```

### 🚀 Umgebungsumschaltung

**Über Admin-Panel:**
1. Admin-Dashboard → PayPal-Einstellungen
2. Wähle zwischen "sandbox" und "live" Modus
3. System wählt automatisch die entsprechenden Credentials

**Automatische Auswahl:**
- `admin.paypal.mode = "sandbox"` → Verwendet `PAYPAL_SANDBOX_*` Credentials
- `admin.paypal.mode = "live"` → Verwendet `PAYPAL_LIVE_*` Credentials

### 🔒 Sicherheit

**✅ Korrekte Praxis:**
- Echte Credentials nur in `.env` (lokal, nicht in Git)
- Environment Variables für Production (Railway/Vercel)
- Platzhalter in `.env.example` und `.env.production`

**❌ Zu vermeiden:**
- Credentials in GitHub Repository
- Hardcoded Secrets im Code
- Production-Secrets in öffentlichen Dateien

### 🛠️ Implementierte Fixes

Das PayPal-System wurde umfassend debugged und repariert:

1. **Reduce-Fehler**: Flexible Artikel-Datenstrukturen (`items` vs `artikel`)
2. **Address-Fehler**: Intelligente Fallback-Logik für Adressdaten
3. **Amount-Mismatch**: Automatische Steuerbehandlung (inkl./exkl. MwSt.)
4. **Success-Flag**: Konsistente Response-Formate für alle PayPal-Operationen
5. **UI-Verbesserungen**: PayPal-Status-Prüfung und Deaktivierungs-Nachrichten

### 📋 Deployment-Checkliste

**Entwicklung:**
- [x] Sandbox-Credentials in `.env`
- [x] PayPal-Modus: "sandbox"
- [x] Test-Transaktionen

**Production:**
- [x] Live-Credentials in Railway/Vercel Environment Variables
- [x] PayPal-Modus: "live"
- [x] Webhook-URLs aktualisiert

## 📄 Rechnungssystem

### 🎯 Überblick

Vollständig konfigurierbares Rechnungssystem mit drag-and-drop Template-Designer:

- 🎨 **Template-Designer**: Visuelle Erstellung von Rechnungsvorlagen
- 📧 **Automatischer E-Mail-Versand**: PDF-Rechnungen an Kunden
- 🔧 **Variablen-System**: Dynamische Inhalte mit Platzhaltern
- 📱 **Admin-Interface**: Einfache Verwaltung über Web-Interface

### 🎛️ Admin-Interface

**Zugriff:** `http://localhost:3001/admin/rechnungen`

**Funktionen:**
- **Template-Verwaltung**: Erstellen, bearbeiten, aktivieren, löschen
- **Design-Anpassungen**: Farben, Logo, Layout, Typografie
- **Drag-and-Drop**: Sektionen einfach anordnen

### 🔧 Variablen-System

**Firmeninformationen:**
- `{{company.name}}`, `{{company.address}}`, `{{company.email}}`, `{{company.phone}}`

**Kundeninformationen:**
- `{{customer.name}}`, `{{customer.email}}`, `{{customer.address}}`

**Bestellinformationen:**
- `{{order.number}}`, `{{order.date}}`, `{{order.total}}`, `{{order.status}}`

**Produktinformationen:**
- `{{items}}`, `{{product.name}}`, `{{product.price}}`, `{{product.quantity}}`

**Rechnungsinformationen:**
- `{{invoice.number}}`, `{{invoice.date}}`, `{{invoice.dueDate}}`

### 📋 Workflow

1. **Template erstellen**: Admin-Interface nutzen
2. **Automatische Erstellung**: Bei Bestellabschluss
3. **PDF-Generierung**: Basierend auf aktivem Template
4. **E-Mail-Versand**: Automatisch an Kunden

## �🛣️ API Endpoints

### Public Routes
```
GET  /api/health                    # Health Check
GET  /api/version                   # Version Info
GET  /api/portfolio/with-prices     # Alle Produkte
POST /api/auth/login                # Login
POST /api/kunden/register           # Kundenregistrierung
```

### Protected Routes (JWT required)
```
GET  /api/cart                      # Warenkorb abrufen
POST /api/cart/add                  # Produkt hinzufügen
POST /api/orders                    # Bestellung erstellen
```

### Admin Routes (Admin role required)
```
GET  /api/admin/portfolio           # Portfolio verwalten
POST /api/admin/portfolio/:id/upload-image  # Bild hochladen (auto-optimiert!)
GET  /api/rohseife                  # Rohstoffe verwalten
GET  /api/kunden                    # Kunden verwalten
GET  /api/warenberechnung           # Warenberechnung
```

**Vollständige API Dokumentation**: Siehe API Dokumentation-Bereich oben

## 🏗️ Technische Highlights

### Backend Features
- ✅ **MongoDB Retry Mechanism**: 5 Versuche mit Exponential Backoff (5s → 25s)
- ✅ **Automatische Bildoptimierung**: Sharp-Middleware für alle Uploads
- ✅ **Base64-Speicherung**: Bilder direkt in MongoDB (persistent)
- ✅ **Dual Role System**: Admin-User + Admin-Kunde gleichzeitig
- ✅ **Security**: Helmet, Rate Limiting, JWT, bcrypt
- ✅ **WebP-Konvertierung**: Moderne Browser-Optimierung

### Frontend Features
- ✅ **Material-UI**: Professionelles Design System
- ✅ **Context API**: Zentrales State Management
- ✅ **Responsive Design**: Mobile-first Approach
- ✅ **SEO-optimiert**: Meta-Tags & Performance
- ✅ **Base64-Bilder Support**: Automatische Anzeige

## 📊 Performance

- ⚡ **Bildoptimierung**: ~95% Größenreduktion
- ⚡ **MongoDB**: Cloud-optimiert mit Retry Mechanism
- ⚡ **CDN**: Vercel Edge Network für Frontend
- ⚡ **Lazy Loading**: React.lazy() für Code-Splitting
- ⚡ **Caching**: Browser & Server-side Caching

## 🔄 Version History

### Version 2.1.0 (2025-10-22)
- ✨ **PayPal Integration vollständig überarbeitet**
  - Sandbox/Live Umgebungsumschaltung über Admin-Panel
  - Sichere Credential-Verwaltung mit Environment Variables
  - Umfassende Fehlerbehandlung (Reduce, Address, Amount, Success-Flag)
  - Intelligente Steuerbehandlung (inkl./exkl. MwSt.)
  - Benutzerfreundliche Deaktivierungs-Nachrichten
- 🔧 **Rechnungssystem implementiert**
  - Drag-and-Drop Template-Designer
  - Automatische PDF-Generierung
  - E-Mail-Versand mit Variablen-System
- 🔒 **Sicherheit verbessert**
  - PayPal Credentials niemals in Git
  - Fallback-Mechanismen für Deployment
  - Umfassende Input-Validierung
- 📚 **Dokumentation konsolidiert** - Alle .md Dateien in README zusammengefasst

### Version 2.0.0 (2025-10-20)
- ✨ Automatische Bildoptimierung mit Sharp
- ✨ Base64-Speicherung in MongoDB
- ✨ MongoDB Retry Mechanism (5 Versuche)
- ✨ WebP-Konvertierung für moderne Browser
- ✨ EXIF-Daten Entfernung (Datenschutz)
- ✨ Anfrage-System mit Admin-Integration
- ✨ Urlaubsbenachrichtigungen für Kunden
- � **Security Hardening** - Production-ready
- 🧹 **Code Cleanup** - Test-Code entfernt
- 📚 **Dokumentation** konsolidiert

### Version 1.0.0 (2025-09-01)
- 🎉 Initial Release
- ✅ MERN Stack E-Commerce Platform
- ✅ Admin-Panel & Kundenregistrierung
- ✅ Warenkorb & Checkout
- ✅ Portfolio-Verwaltung
- ✅ Rohstoff-Verwaltung

## 🤝 Contributing

Wir freuen uns über Beiträge! Bitte befolge diese Schritte:

1. **Fork** das Repository
2. **Branch erstellen**: `git checkout -b feature/amazing-feature`
3. **Änderungen committen**: `git commit -m 'Add amazing feature'`
4. **Push zum Branch**: `git push origin feature/amazing-feature`
5. **Pull Request öffnen**

### 🧪 Development Guidelines
- Code-Qualität mit ESLint
- Responsive Design testen
- Security-Best-Practices befolgen
- Performance-Impact berücksichtigen

---

## 🔄 Workflow & Status Management

### 📋 Rechnungsworkflow
Das System implementiert einen klaren Workflow-Prozess:

1. **📧 Anfrage** → Admin genehmigt → **🛒 Bestellung**
2. **💰 PayPal-Zahlung** → `payment.status = 'paid'`
3. **📦 Verpackung** → nur bei bezahlten Bestellungen möglich
4. **🚚 Versand** → finale Statusänderung

### 🎨 Status-Anzeige
- ✅ **"Bezahlt"** (Grün): Zahlung bestätigt (`payment.status='paid'` oder `payment.paidDate`)
- ⚠️ **"Versendet - Zahlung ausstehend"** (Orange): Rechnung versendet, wartet auf Zahlung
- 🔴 **"Überfällig"** (Rot): Zahlungsfrist überschritten
- 📝 **"Entwurf"** (Grau): Rechnung noch nicht versendet

### 🛡️ Validierung
- **Verpackung**: Nur bei bezahlten Bestellungen möglich (`zahlung.status = 'bezahlt'`)
- **Filter "zu bearbeiten"**: Zeigt nur Admin-handlungsrelevante Items
- **Statistiken**: Korrekte Berechnung offener Beträge (Gesamtumsatz - bezahlte Rechnungen)

### 📊 Dashboard Features
- **8 KPI-Karten** mit intelligenter Farbcodierung
- **Direkte Navigation** zu gefilterten Ansichten
- **Echtzeit-Handlungsaufforderungen** für Admin-Aufgaben
- **Auto-Refresh** alle 5 Minuten

---

## � Lizenz

Dieses Projekt steht unter der [MIT License](LICENSE).

## 👨‍💻 Team

**Glücksmomente Manufaktur**
- 🌐 Website: [gluecksmomente-manufaktur.vercel.app](https://gluecksmomente-manufaktur.vercel.app)
- 📧 GitHub: [@OneCleverFox](https://github.com/OneCleverFox)

## 🙏 Danksagungen

- [Material-UI](https://mui.com/) für das professionelle Design System
- [MongoDB Atlas](https://www.mongodb.com/atlas) für die Cloud-Datenbank
- [Railway](https://railway.app/) für Backend Hosting
- [Vercel](https://vercel.com/) für Frontend Hosting  
- [Sharp](https://sharp.pixelplumbing.com/) für Bildoptimierung

---

<div align="center">

**🏭 Status**: In Production ✅  
**📦 Version**: 2.0.0  
**📅 Last Updated**: 20. Oktober 2025

**Entwickelt mit ❤️ für Glücksmomente-Manufaktur**

![Made with Love](https://img.shields.io/badge/Made%20with-❤️-red)
![MongoDB](https://img.shields.io/badge/MongoDB-4EA94B?logo=mongodb&logoColor=white)
![React](https://img.shields.io/badge/React-20232A?logo=react&logoColor=61DAFB)
![Node.js](https://img.shields.io/badge/Node.js-43853D?logo=node.js&logoColor=white)

</div>
