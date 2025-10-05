# 🧼 Glücksmomente - MERN Stack E-Commerce Platform

Eine moderne, vollständige E-Commerce-Lösung für handgemachte Naturkosmetik und Seifen. Entwickelt mit dem MERN Stack (MongoDB, Express.js, React, Node.js).

## 🚀 Live Demo

- **Frontend**: https://gluecksmomente-manufaktur.vercel.app
- **Backend API**: https://soap-homepage-backend-production.up.railway.app/api
- **Admin Panel**: https://gluecksmomente-manufaktur.vercel.app/admin

## 📚 Dokumentation

- **[ARCHITECTURE.md](./ARCHITECTURE.md)** - Systemarchitektur und technische Details
- **[BILDOPTIMIERUNG.md](./BILDOPTIMIERUNG.md)** - Automatische Bildkomprimierung & Migration

## ✨ Features

### 🛒 Shop-Features

- ✅ Responsive Online-Shop mit Produktkatalog
- ✅ Warenkorb mit Echtzeit-Synchronisation
- ✅ Sicherer Checkout-Prozess
- ✅ Kundenregistrierung und Anmeldung
- ✅ Bestellverfolgung und Historie
- ✅ Mobile-optimiert und barrierefrei

### 👨‍💼 Admin-Panel

- ✅ Vollständiges Produktmanagement (CRUD)
- ✅ Bestellverwaltung und Status-Updates
- ✅ Lagerverwaltung mit Bestandstracking
- ✅ **Duales Rollensystem** (Admin-User + Admin-Kunde)
- ✅ Analytics Dashboard mit Verkaufsstatistiken
- ✅ Portfolio-Verwaltung
- ✅ Rohstoff-Verwaltung (Rohseife, Duftöle, Verpackungen)
- ✅ Warenberechnung für Produktionsplanung
- ✅ **Automatischer Bild-Upload mit Optimierung**

### 🔒 Sicherheit & Performance

- ✅ JWT Authentifizierung mit dualer Rollenverwaltung
- ✅ Passwort-Hashing mit bcrypt
- ✅ Rate Limiting und CORS Protection
- ✅ Input-Validierung und Security Headers
- ✅ **MongoDB Retry Mechanism** (5 Versuche, Exponential Backoff)
- ✅ **Automatische Bildoptimierung** (Sharp, WebP, ~95% kleiner)
- ✅ **Base64-Bilder in MongoDB** (persistent, überlebt Deployments)
- ✅ SEO-optimiert und Performance-optimiert

## 🛠️ Technologie Stack

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
├── ARCHITECTURE.md            # Architektur-Dokumentation
├── BILDOPTIMIERUNG.md         # Bildoptimierung & Migration
└── README.md                  # Diese Datei
```

## 🎨 Bildoptimierung

Das System optimiert **alle** hochgeladenen Bilder automatisch:

- 📐 **Auto-Resize**: Max. 1200px Breite
- 🎨 **WebP-Konvertierung**: ~30% kleiner als JPEG
- 💾 **Base64 in MongoDB**: Persistent, überlebt Deployments
- 🔒 **EXIF-Daten entfernt**: Datenschutz & Sicherheit
- ⚡ **~95% Größenreduktion**: 3 MB → ~300 KB typisch

**Details**: Siehe [BILDOPTIMIERUNG.md](./BILDOPTIMIERUNG.md)

## 🔑 Test Accounts

### Admin-User
- Email: `ralle.jacob84@googlemail.com`
- Password: `Jonas2014`
- Typ: Admin-User (voller Zugriff)

### Admin-Kunde
- Email: `sandraseeling@web.de`
- Typ: Kunde mit Admin-Rolle
- Kundennummer: `KD25106383`

## 🛣️ API Endpoints

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

**Vollständige API Dokumentation**: Siehe [ARCHITECTURE.md](./ARCHITECTURE.md)

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

### Version 2.0.0 (2025-10-05)
- ✨ Automatische Bildoptimierung mit Sharp
- ✨ Base64-Speicherung in MongoDB
- ✨ MongoDB Retry Mechanism (5 Versuche)
- ✨ WebP-Konvertierung für moderne Browser
- ✨ EXIF-Daten Entfernung (Datenschutz)
- ✨ Migration-Script für bestehende Bilder
- 🐛 Dual Role System Bug-Fix (Admin-Kunde Warenberechnung)
- 📚 Konsolidierte Dokumentation

### Version 1.0.0 (2025-09-01)
- 🎉 Initial Release
- ✅ MERN Stack E-Commerce Platform
- ✅ Admin-Panel & Kundenregistrierung
- ✅ Warenkorb & Checkout
- ✅ Portfolio-Verwaltung
- ✅ Rohstoff-Verwaltung

## 🤝 Mitwirken

Contributions sind willkommen! Bitte erstelle einen Pull Request.

1. Fork das Repository
2. Erstelle einen Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit deine Änderungen (`git commit -m 'Add some AmazingFeature'`)
4. Push zum Branch (`git push origin feature/AmazingFeature`)
5. Öffne einen Pull Request

## 📝 Lizenz

MIT License - siehe LICENSE Datei

## 👨‍💻 Autor

**Glücksmomente Manufaktur**
- Website: https://gluecksmomente-manufaktur.vercel.app
- GitHub: [@OneCleverFox](https://github.com/OneCleverFox)

## 🙏 Danksagungen

- Material-UI für das Design System
- MongoDB Atlas für die Cloud-Datenbank
- Railway für Backend Hosting
- Vercel für Frontend Hosting
- Sharp für Bildoptimierung

---

**Status**: In Production ✅  
**Version**: 2.0.0  
**Last Updated**: 5. Oktober 2025  
**Features**: MongoDB Retry Mechanism • Automatische Bildoptimierung • Base64-Speicherung • Dual Role System
