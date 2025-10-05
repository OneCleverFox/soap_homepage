# 🧼 Glücksmomente - MERN Stack E-Commerce Platform

Eine moderne, vollständige E-Commerce-Lösung für handgemachte Naturkosmetik und Seifen. Entwickelt mit dem MERN Stack (MongoDB, Express.js, React, Node.js).

## 🚀 Live Demo

- **Frontend**: https://gluecksmomente-manufaktur.vercel.app
- **Backend API**: https://soap-homepage-backend-production.up.railway.app/api
- **Admin Panel**: https://gluecksmomente-manufaktur.vercel.app/admin

## 📚 Dokumentation

Für detaillierte Informationen zu Setup und Deployment, siehe:

- **[QUICKSTART.md](./QUICKSTART.md)** - Schnellstart für lokale Entwicklung (5 Minuten)
- **[DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md)** - Umfassende Deployment-Anleitung (Railway + Vercel)
- **[DEPLOYMENT_CHECKLIST.md](./DEPLOYMENT_CHECKLIST.md)** - Schritt-für-Schritt Checkliste

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

### 🔒 Sicherheit & Performance

- ✅ JWT Authentifizierung mit dualer Rollenverwaltung
- ✅ Passwort-Hashing mit bcrypt
- ✅ Rate Limiting und CORS Protection
- ✅ Input-Validierung und Security Headers
- ✅ SEO-optimiert und Performance-optimiert

## 🛠️ Technologie Stack

### Backend
- **Node.js** & **Express.js** - Server Framework
- **MongoDB Atlas** mit **Mongoose ODM** - Cloud-Datenbank
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

# Environment File erstellen (siehe QUICKSTART.md)
# Erstelle backend/.env.development mit MongoDB URI, JWT Secret, etc.

npm start  # Backend startet auf Port 5000

# 3. Frontend Setup (neues Terminal)
cd ../frontend
npm install

# Environment File erstellen
# Erstelle frontend/.env.development

npm start  # Frontend startet auf Port 3001
```

**Detaillierte Anleitung**: Siehe [QUICKSTART.md](./QUICKSTART.md)

## 🚀 Deployment

Das Projekt ist optimiert für **Railway (Backend)** und **Vercel (Frontend)**.

### Automatisches Deployment

1. **GitHub Repository** verbinden
2. **Railway**: Backend automatisch deployen
3. **Vercel**: Frontend automatisch deployen
4. **Environment Variables** in beiden Plattformen setzen

**Vollständige Anleitung**: Siehe [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md)

## 📁 Projekt-Struktur

```
soap_homepage/
├── backend/                    # Node.js/Express Backend
│   ├── src/
│   │   ├── server.js          # Server Entry Point
│   │   ├── models/            # MongoDB Schemas
│   │   ├── routes/            # API Routes
│   │   ├── controllers/       # Business Logic
│   │   └── middleware/        # Auth & Validation
│   ├── .env.development       # Lokale Config (nicht in Git)
│   ├── .env.production        # Deployment Referenz (in Git)
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
│   ├── .env.development       # Lokale Config (nicht in Git)
│   ├── .env.production        # Deployment Referenz (in Git)
│   └── package.json
│
├── QUICKSTART.md              # Schnellstart Guide
├── DEPLOYMENT_GUIDE.md        # Deployment Dokumentation
├── DEPLOYMENT_CHECKLIST.md    # Deployment Checkliste
└── README.md                  # Diese Datei
```

## 🔑 Test Accounts

### Admin-User
- Email: `ralle.jacob84@googlemail.com`
- Password: `Jonas2014`
- Typ: Admin-User (voller Zugriff)

### Admin-Kunde
- Email: `sandraseeling@web.de`
- Typ: Kunde mit Admin-Rolle
- Kundennummer: `KD25106383`

## 🌍 Environment Variables

### Backend (Railway)

```bash
NODE_ENV=production
PORT=5000
MONGODB_URI=mongodb+srv://...
JWT_SECRET=your-secure-secret
FRONTEND_URL=https://your-vercel-domain.vercel.app
```

### Frontend (Vercel)

```bash
REACT_APP_API_URL=https://your-railway-domain.railway.app/api
REACT_APP_FRONTEND_URL=https://your-vercel-domain.vercel.app
GENERATE_SOURCEMAP=false
```

**Vollständige Liste**: Siehe [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md)

## 🛣️ API Endpoints

### Public Routes
- `GET /api/products` - Alle Produkte
- `GET /api/products/:id` - Einzelnes Produkt
- `POST /api/auth/login` - Login
- `POST /api/kunden/register` - Kundenregistrierung

### Protected Routes (JWT required)
- `GET /api/cart` - Warenkorb abrufen
- `POST /api/cart/add` - Produkt hinzufügen
- `POST /api/orders` - Bestellung erstellen

### Admin Routes (Admin role required)
- `GET /api/admin/portfolio` - Portfolio verwalten
- `GET /api/rohseife` - Rohstoffe verwalten
- `GET /api/kunden` - Kunden verwalten
- `GET /api/warenberechnung` - Warenberechnung

**Vollständige API Dokumentation**: Siehe Backend Code

## 🤝 Mitwirken

Contributions sind willkommen! Bitte erstelle einen Pull Request.

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

---

**Status**: In Production ✅  
**Version**: 1.0.1  
**Last Updated**: 5. Oktober 2025
