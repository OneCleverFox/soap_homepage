# Gluecksmomente - Handgemachte Naturkosmetik# Gluecksmomente - MERN Stack Homepage



Eine moderne E-Commerce-Website für handgemachte Naturkosmetik und Seifen.Eine vollständige E-Commerce Lösung für Kleinunternehmen mit Frontend (React), Backend (Node.js/Express), und MongoDB Datenbank.



## 🚀 Technologie-Stack## 🚀 Features



- **Frontend:** React.js mit Material-UI### Frontend (React)

- **Backend:** Node.js mit Express- ✅ Responsive Design mit Material-UI

- **Datenbank:** MongoDB Atlas- ✅ Online Shop mit Produktkatalog

- **Authentifizierung:** JWT- ✅ Warenkorb und Checkout-Prozess

- **Styling:** Material-UI Theme System- ✅ Bestellverfolgung

- ✅ SEO-optimiert

## 📱 Features- ✅ Performance-optimiert

- ✅ Barrierefreie Bedienung

- ✅ Vollständig mobile-optimiert

- ✅ Admin-Panel für Produktverwaltung### Backend (Node.js/Express)

- ✅ Sichere Authentifizierung- ✅ REST API mit Express.js

- ✅ MongoDB Atlas Integration- ✅ MongoDB Integration mit Mongoose

- ✅ Responsive Design- ✅ JWT Authentifizierung

- ✅ Production-ready- ✅ Benutzerrollen und Berechtigungen

- ✅ Input-Validierung

## 🛠️ Installation- ✅ Rate Limiting

- ✅ Security Middleware (Helmet, CORS)

### Backend starten:

```bash### Admin-Panel

cd backend- ✅ Produktverwaltung

npm install- ✅ Bestellabwicklung

npm start- ✅ Lagerverwaltung

```- ✅ Benutzerverwaltung

- ✅ Analytics Dashboard

### Frontend starten:- ✅ Lagerbestand-Tracking

```bash

cd frontend### Datenbank (MongoDB)

npm install- ✅ Produktverwaltung

npm start- ✅ Bestellsystem

```- ✅ Benutzerverwaltung

- ✅ Lagerverwaltung

## 🔐 Admin-Zugang

## 📁 Projektstruktur

- **URL:** `/login`

- **E-Mail:** `Ralle.jacob84@googlemail.com````

- **Passwort:** `Ralle1984`soap_homepage/

├── backend/                 # Node.js/Express Server

## 📂 Projektstruktur│   ├── src/

│   │   ├── controllers/     # Route Controller

```│   │   ├── middleware/      # Custom Middleware

├── frontend/          # React.js Frontend│   │   ├── models/          # MongoDB Models

├── backend/           # Node.js Backend│   │   ├── routes/          # API Routes

├── docs/             # Projektdokumentation│   │   └── server.js        # Server Entry Point

└── README.md         # Diese Datei│   ├── package.json

```│   ├── .env                 # Umgebungsvariablen

│   └── .gitignore

## 🌐 Deployment├── frontend/                # React Frontend

│   ├── public/              # Statische Dateien

- **Frontend:** Port 3001│   ├── src/

- **Backend:** Port 5000│   │   ├── components/      # React Komponenten

- **Datenbank:** MongoDB Atlas (Production)│   │   ├── pages/           # Seiten-Komponenten

│   │   ├── admin/           # Admin-Panel

---│   │   ├── context/         # React Context

│   │   ├── hooks/           # Custom Hooks

*Entwickelt für Gluecksmomente Manufaktur*│   │   ├── services/        # API Services
│   │   └── utils/           # Utility Funktionen
│   ├── package.json
│   └── .gitignore
└── # 🌟 Glücksmomente - MERN Stack E-Commerce Platform

Eine vollständige E-Commerce-Lösung für Kleinunternehmen, entwickelt mit dem MERN Stack (MongoDB, Express.js, React, Node.js).

## 🚀 Live Demo

- **Frontend**: [Ihre Vercel URL]
- **Backend API**: [Ihre Railway URL]
- **Admin Panel**: [Ihre Vercel URL]/admin (Demo: admin@test.com / admin123)

## ✨ Features

### 🛒 Kundenfunktionen
- **Produktkatalog** mit Suchfunktion und Kategorien
- **Warenkorb** mit persistenter Speicherung
- **Benutzerregistrierung** und Anmeldung
- **Bestellverfolgung** und Historie
- **Responsive Design** für alle Geräte

### 👨‍💼 Admin-Funktionen
- **Produktverwaltung** (CRUD Operationen)
- **Bestandsverwaltung** mit Lagerstand-Tracking
- **Bestellverwaltung** und Status-Updates
- **Benutzerverwaltung** mit Rollen-System
- **Dashboard** mit Verkaufsstatistiken

### 🔒 Sicherheit
- **JWT Authentication** mit sicherer Token-Verwaltung
- **Rollen-basierte Berechtigung** (Admin/User)
- **Password Hashing** mit bcrypt
- **Rate Limiting** gegen DDoS-Attacken
- **CORS Protection** und Security Headers

## 🛠️ Technologie Stack

### Backend
- **Node.js** & **Express.js** - Server Framework
- **MongoDB** mit **Mongoose ODM** - Datenbank
- **JWT** - Authentication
- **bcrypt** - Password Hashing
- **Helmet** - Security Middleware
- **express-rate-limit** - Rate Limiting

### Frontend
- **React 18** - UI Framework
- **Material-UI (MUI)** - Design System
- **React Router** - Navigation
- **Context API** - State Management
- **React Hot Toast** - Notifications
- **Axios** - HTTP Client

## 📦 Installation

### Voraussetzungen
- Node.js (>= 18.0.0)
- MongoDB (lokal oder Atlas)
- npm oder yarn

### 1. Repository klonen
```bash
git clone https://github.com/ihr-username/gluecksmomente.git
cd gluecksmomente
```

### 2. Backend Setup
```bash
cd backend
npm install

# Environment Variables erstellen
cp .env.example .env
# Bearbeiten Sie .env mit Ihren Werten
```

### 3. Frontend Setup
```bash
cd ../frontend
npm install

# Environment Variables erstellen
cp .env.example .env.local
# Bearbeiten Sie .env.local mit Ihren Werten
```

### 4. Datenbank Setup
```bash
# MongoDB lokal starten oder Atlas Connection String verwenden
# Die Anwendung erstellt automatisch die benötigten Collections
```

### 5. Anwendung starten
```bash
# Terminal 1 - Backend
cd backend
npm run dev

# Terminal 2 - Frontend
cd frontend
npm start
```

## 🌐 Deployment

Für eine komplette Deployment-Anleitung siehe: [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md)

### Schnell-Deployment (Kostenlos)
1. **MongoDB Atlas** - Datenbank (kostenlos bis 512MB)
2. **Railway** - Backend Hosting ($5 Startguthaben)
3. **Vercel** - Frontend Hosting (kostenlos für Hobby-Projekte)

## 📁 Projektstruktur

```
gluecksmomente/
├── backend/                 # Node.js/Express Backend
│   ├── src/
│   │   ├── controllers/     # Route Controllers
│   │   ├── middleware/      # Custom Middleware
│   │   ├── models/         # MongoDB Models
│   │   ├── routes/         # API Routes
│   │   └── server.js       # Server Entry Point
│   ├── .env.example        # Environment Template
│   └── package.json
├── frontend/               # React Frontend
│   ├── public/
│   ├── src/
│   │   ├── components/     # React Components
│   │   ├── contexts/       # Context Providers
│   │   ├── pages/          # Page Components
│   │   ├── services/       # API Services
│   │   └── App.js         # Main App Component
│   ├── .env.example       # Environment Template
│   └── package.json
└── DEPLOYMENT_GUIDE.md    # Deployment Anleitung
```

## 🔧 API Dokumentation

### Authentication Endpoints
```
POST /api/auth/register     # Benutzer registrieren
POST /api/auth/login        # Benutzer anmelden
GET  /api/auth/me          # Aktuellen Benutzer abrufen
```

### Products Endpoints
```
GET    /api/products        # Alle Produkte abrufen
GET    /api/products/:id    # Einzelnes Produkt abrufen
POST   /api/products        # Neues Produkt erstellen (Admin)
PUT    /api/products/:id    # Produkt aktualisieren (Admin)
DELETE /api/products/:id    # Produkt löschen (Admin)
```

### Orders Endpoints
```
GET  /api/orders           # Alle Bestellungen abrufen
POST /api/orders           # Neue Bestellung erstellen
GET  /api/orders/:id       # Einzelne Bestellung abrufen
PUT  /api/orders/:id       # Bestellstatus aktualisieren (Admin)
```

### Inventory Endpoints
```
GET  /api/inventory        # Lagerbestand abrufen (Admin)
PUT  /api/inventory/:id    # Lagerbestand aktualisieren (Admin)
```

## 🔐 Standard-Zugangsdaten

### Admin Account (Entwicklung)
- **Email**: admin@gluecksmomente.de
- **Passwort**: admin123

### Test Customer
- **Email**: kunde@test.de
- **Passwort**: kunde123

⚠️ **Wichtig**: Ändern Sie diese Zugangsdaten in der Produktion!

## 🧪 Tests

```bash
# Backend Tests
cd backend
npm test

# Frontend Tests
cd frontend
npm test
```

## 📈 Monitoring

### Entwicklung
- Backend Health Check: `http://localhost:5000/api/health`
- Frontend Dev Server: `http://localhost:3000`

### Produktion
- Backend Health Check: `https://ihr-backend.railway.app/api/health`
- Frontend: `https://ihr-frontend.vercel.app`

## 🤝 Contributing

1. Fork das Repository
2. Erstellen Sie einen Feature Branch (`git checkout -b feature/amazing-feature`)
3. Committen Sie Ihre Änderungen (`git commit -m 'Add amazing feature'`)
4. Pushen Sie zum Branch (`git push origin feature/amazing-feature`)
5. Öffnen Sie eine Pull Request

## 📝 Lizenz

Dieses Projekt ist unter der MIT-Lizenz lizenziert. Siehe [LICENSE](LICENSE) für Details.

## 📞 Support

Bei Fragen oder Problemen:
- Öffnen Sie ein [Issue](https://github.com/ihr-username/gluecksmomente/issues)
- E-Mail: support@gluecksmomente.de

## 🚀 Roadmap

- [ ] PayPal/Stripe Integration
- [ ] E-Mail Benachrichtigungen
- [ ] Produktbewertungen
- [ ] Gutschein-System
- [ ] Multi-Sprachen Support
- [ ] PWA Features
- [ ] Analytics Dashboard

---

**Entwickelt mit ❤️ für Glücksmomente**               # Diese Datei
```

## 🛠 Installation & Setup

### Voraussetzungen

Stellen Sie sicher, dass folgende Software installiert ist:
- [Node.js](https://nodejs.org/) (Version 16 oder höher)
- [MongoDB](https://www.mongodb.com/try/download/community) (lokal oder Atlas Cloud)
- [Git](https://git-scm.com/)

### Schritt 1: Repository klonen

```bash
git clone https://github.com/IhrUsername/soap_homepage.git
cd soap_homepage
```

### Schritt 2: Backend Setup

```bash
# In das Backend-Verzeichnis wechseln
cd backend

# Dependencies installieren
npm install

# Umgebungsvariablen konfigurieren
# Öffnen Sie .env und passen Sie die Werte an:
# - MONGODB_URI (Ihre MongoDB Verbindung)
# - JWT_SECRET (Sicheres Secret für JWT)
# - PORT (Server Port, default: 5000)

# MongoDB starten (falls lokal installiert)
# mongod

# Server starten
npm run dev
```

Der Backend-Server läuft nun auf `http://localhost:5000`

### Schritt 3: Frontend Setup

```bash
# In einem neuen Terminal-Fenster
cd frontend

# Dependencies installieren
npm install

# Entwicklungsserver starten
npm start
```

Das Frontend läuft nun auf `http://localhost:3000`

## 🗄 Datenbank Setup

### MongoDB lokal

1. MongoDB installieren und starten
2. Eine neue Datenbank erstellen
3. Die Verbindungsstring in der `.env` Datei anpassen

### MongoDB Atlas (Cloud)

1. Account bei [MongoDB Atlas](https://www.mongodb.com/atlas) erstellen
2. Cluster erstellen
3. Verbindungsstring kopieren und in `.env` eintragen

### Beispiel-Daten

Erstellen Sie einen Admin-Benutzer über die API:

```bash
POST http://localhost:5000/api/auth/register
Content-Type: application/json

{
  "username": "admin",
  "email": "admin@gluecksmomente.de",
  "password": "AdminPasswort123",
  "firstName": "Admin",
  "lastName": "User",
  "role": "admin"
}
```

## 🔧 Konfiguration

### Backend (.env)

```env
# Datenbankverbindung
MONGODB_URI=mongodb://localhost:27017/gluecksmomente

# Server Konfiguration
PORT=5000
NODE_ENV=development

# JWT Secret
JWT_SECRET=IhrSuperSicheresJWTSecret

# Frontend URL
FRONTEND_URL=http://localhost:3000
```

### Frontend Proxy

Das Frontend ist bereits so konfiguriert, dass API-Aufrufe an das Backend weitergeleitet werden.

## 📝 API Dokumentation

### Authentifizierung
- `POST /api/auth/login` - Benutzer anmelden
- `POST /api/auth/register` - Neuen Benutzer registrieren (Admin only)
- `GET /api/auth/me` - Aktuellen Benutzer abrufen
- `PUT /api/auth/profile` - Profil aktualisieren

### Produkte
- `GET /api/products` - Alle Produkte (mit Filter)
- `GET /api/products/:id` - Einzelnes Produkt
- `POST /api/products` - Neues Produkt erstellen
- `PUT /api/products/:id` - Produkt aktualisieren
- `DELETE /api/products/:id` - Produkt löschen

### Bestellungen
- `POST /api/orders` - Neue Bestellung erstellen
- `GET /api/orders` - Alle Bestellungen (Admin)
- `GET /api/orders/:id` - Einzelne Bestellung
- `PUT /api/orders/:id/status` - Bestellstatus aktualisieren

### Lager
- `GET /api/inventory/overview` - Lagerbestand-Übersicht
- `GET /api/inventory/low-stock` - Produkte mit niedrigem Lagerbestand
- `POST /api/inventory/restock` - Lagerbestand auffüllen

## 🚀 Deployment

### Backend (Node.js)

1. **Heroku Deployment:**
```bash
# Heroku CLI installieren
# Im backend/ Verzeichnis:
heroku create gluecksmomente-backend
heroku config:set NODE_ENV=production
heroku config:set MONGODB_URI=your_production_db_uri
heroku config:set JWT_SECRET=your_production_jwt_secret
git add .
git commit -m "Deploy backend"
git push heroku main
```

2. **VPS/Server Deployment:**
```bash
# Server vorbereiten
sudo apt update
sudo apt install nodejs npm nginx
sudo npm install -g pm2

# Code hochladen und Dependencies installieren
git clone your-repo
cd soap_homepage/backend
npm install --production

# Mit PM2 starten
pm2 start src/server.js --name "gluecksmomente-backend"
pm2 startup
pm2 save
```

### Frontend (React)

1. **Netlify/Vercel:**
```bash
# Build erstellen
npm run build

# Bei Netlify/Vercel hochladen oder GitHub verbinden
```

2. **Apache/Nginx:**
```bash
# Build erstellen
npm run build

# Build-Ordner auf Server kopieren
scp -r build/* user@server:/var/www/html/
```

### Datenbank (MongoDB)

Für Production MongoDB Atlas verwenden oder eigenen MongoDB Server einrichten.

## 🔒 Sicherheit

Das System implementiert mehrere Sicherheitsmaßnahmen:

- **JWT Authentifizierung** für sichere API-Zugriffe
- **Bcrypt** für Passwort-Hashing
- **Helmet** für HTTP Security Headers
- **Rate Limiting** gegen DDoS-Angriffe
- **Input Validierung** mit express-validator
- **CORS** Konfiguration
- **Rollen-basierte Berechtigungen**

## 🧪 Testing

```bash
# Backend Tests
cd backend
npm test

# Frontend Tests
cd frontend
npm test
```

## 🤝 Contributing

1. Fork das Repository
2. Erstellen Sie einen Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Committen Sie Ihre Änderungen (`git commit -m 'Add some AmazingFeature'`)
4. Pushen Sie zum Branch (`git push origin feature/AmazingFeature`)
5. Öffnen Sie einen Pull Request

## 📄 Lizenz

Dieses Projekt steht unter der MIT Lizenz - siehe [LICENSE](LICENSE) Datei für Details.

## 📞 Support

Bei Fragen oder Problemen:
- Email: info@gluecksmomente.de
- GitHub Issues: [Issues](https://github.com/IhrUsername/soap_homepage/issues)

## 🚀 Nächste Schritte

1. **Backend starten:** `cd backend && npm install && npm run dev`
2. **Frontend starten:** `cd frontend && npm install && npm start`
3. **Admin-Benutzer erstellen** über die API
4. **Erste Produkte hinzufügen** im Admin-Panel
5. **Website anpassen** und Design personalisieren

---

**Hinweis:** Vergessen Sie nicht, Ihre eigenen Umgebungsvariablen zu setzen und Sicherheitskeys zu generieren!
