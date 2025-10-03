# Glücksmomente - MERN Stack E-Commerce Platform# Glücksmomente - MERN Stack E-Commerce Platform# Glücksmomente - MERN Stack E-Commerce Platform



Eine moderne, vollständige E-Commerce-Lösung für handgemachte Naturkosmetik und Seifen. Entwickelt mit dem MERN Stack (MongoDB, Express.js, React, Node.js).



## 🚀 Live DemoEine moderne, vollständige E-Commerce-Lösung für handgemachte Naturkosmetik und Seifen. Entwickelt mit dem MERN Stack (MongoDB, Express.js, React, Node.js).Eine moderne, vollständige E-Commerce-Lösung für handgemachte Naturkosmetik und Seifen. Entwickelt mit dem MERN Stack (MongoDB, Express.js, React, Node.js).



- **Website**: [Ihre Domain URL]

- **Admin Panel**: [Ihre Domain URL]/admin

## 🚀 Live Demo## 🚀 Live Demo

## ✨ Features



### 🛒 Shop-Features

- ✅ Responsive Online-Shop mit Produktkatalog- **Website**: [Ihre Domain URL]- **Website**: [Ihre Domain URL]

- ✅ Warenkorb und sicherer Checkout-Prozess

- ✅ Benutzerregistrierung und Anmeldung- **Admin Panel**: [Ihre Domain URL]/admin- **Admin Panel**: [Ihre Domain URL]/admin

- ✅ Bestellverfolgung und Historie

- ✅ Mobile-optimiert und barrierefrei



### 👨‍💼 Admin-Panel## ✨ Features## ✨ Features

- ✅ Vollständiges Produktmanagement (CRUD)

- ✅ Bestellverwaltung und Status-Updates

- ✅ Lagerverwaltung mit Bestandstracking

- ✅ Benutzerverwaltung mit Rollen-System### 🛒 Shop-Features### 🛒 Shop-Features

- ✅ Analytics Dashboard mit Verkaufsstatistiken

- ✅ Responsive Online-Shop mit Produktkatalog- ✅ Responsive Online-Shop mit Produktkatalog

### 🔒 Sicherheit & Performance

- ✅ JWT Authentifizierung- ✅ Warenkorb und sicherer Checkout-Prozess- ✅ Warenkorb und sicherer Checkout-Prozess

- ✅ Passwort-Hashing mit bcrypt

- ✅ Rate Limiting und CORS Protection- ✅ Benutzerregistrierung und Anmeldung- ✅ Benutzerregistrierung und Anmeldung

- ✅ Input-Validierung und Security Headers

- ✅ SEO-optimiert und Performance-optimiert- ✅ Bestellverfolgung und Historie- ✅ Bestellverfolgung und Historie



## 🛠️ Technologie Stack- ✅ Mobile-optimiert und barrierefrei- ✅ Mobile-optimiert und barrierefrei



### Backend

- **Node.js** & **Express.js** - Server Framework

- **MongoDB** mit **Mongoose ODM** - Datenbank### 👨‍💼 Admin-Panel### 👨‍💼 Admin-Panel

- **JWT** - Authentication & Authorization

- **bcrypt** - Password Hashing- ✅ Vollständiges Produktmanagement (CRUD)- ✅ Vollständiges Produktmanagement (CRUD)

- **Helmet** - Security Middleware

- ✅ Bestellverwaltung und Status-Updates- ✅ Bestellverwaltung und Status-Updates

### Frontend

- **React 18** - UI Framework- ✅ Lagerverwaltung mit Bestandstracking- ✅ Lagerverwaltung mit Bestandstracking

- **Material-UI (MUI)** - Design System

- **React Router** - Navigation- ✅ Benutzerverwaltung mit Rollen-System- ✅ Benutzerverwaltung mit Rollen-System

- **Context API** - State Management

- **Axios** - HTTP Client- ✅ Analytics Dashboard mit Verkaufsstatistiken- ✅ Analytics Dashboard mit Verkaufsstatistiken



## 📦 Installation



### Voraussetzungen### 🔒 Sicherheit & Performance### 🔒 Sicherheit & Performance

- Node.js (>= 18.0.0)

- MongoDB (lokal oder Atlas)- ✅ JWT Authentifizierung- ✅ JWT Authentifizierung

- npm oder yarn

- ✅ Passwort-Hashing mit bcrypt- ✅ Passwort-Hashing mit bcrypt

### 1. Repository klonen

```bash- ✅ Rate Limiting und CORS Protection- ✅ Rate Limiting und CORS Protection

git clone [Ihre Repository URL]

cd soap_homepage- ✅ Input-Validierung und Security Headers- ✅ Input-Validierung und Security Headers

```

- ✅ SEO-optimiert und Performance-optimiert- ✅ SEO-optimiert und Performance-optimiert

### 2. Backend Setup

```bash

cd backend

npm install## 🛠️ Technologie Stack## 🛠️ Technologie Stack



# Environment Variables konfigurieren

# Bearbeiten Sie .env mit Ihren Werten

```### Backend### Backend



### 3. Frontend Setup- **Node.js** & **Express.js** - Server Framework- **Node.js** & **Express.js** - Server Framework

```bash

cd ../frontend- **MongoDB** mit **Mongoose ODM** - Datenbank- **MongoDB** mit **Mongoose ODM** - Datenbank

npm install

```- **JWT** - Authentication & Authorization- **JWT** - Authentication & Authorization



### 4. Anwendung starten- **bcrypt** - Password Hashing- **bcrypt** - Password Hashing

```bash

# Terminal 1 - Backend- **Helmet** - Security Middleware- **Helmet** - Security Middleware

cd backend

npm start



# Terminal 2 - Frontend  ### Frontend### Frontend

cd frontend

npm start- **React 18** - UI Framework- **React 18** - UI Framework

```

- **Material-UI (MUI)** - Design System- **Material-UI (MUI)** - Design System

## 🔐 Admin-Zugang

- **React Router** - Navigation- **React Router** - Navigation

Die Admin-Zugangsdaten werden über Umgebungsvariablen (.env) verwaltet:

- **ADMIN_EMAIL** - E-Mail-Adresse des Administrators  - **Context API** - State Management- **Context API** - State Management

- **ADMIN_PASSWORD** - Passwort des Administrators

- **Axios** - HTTP Client- **Axios** - HTTP Client

⚠️ **Wichtig:** Ändern Sie die Standard-Zugangsdaten vor dem Produktiveinsatz!



## 📁 Projektstruktur

## 📦 Installation## 📦 Installation

```

soap_homepage/

├── backend/                 # Node.js/Express Backend

│   ├── src/### Voraussetzungen### Voraussetzungen

│   │   ├── controllers/     # Route Controllers

│   │   ├── middleware/      # Auth & Validation Middleware- Node.js (>= 18.0.0)- Node.js (>= 18.0.0)

│   │   ├── models/          # MongoDB Models

│   │   ├── routes/          # API Routes- MongoDB (lokal oder Atlas)- MongoDB (lokal oder Atlas)

│   │   └── server.js        # Server Entry Point

│   ├── .env                 # Umgebungsvariablen- npm oder yarn- npm oder yarn

│   └── package.json

├── frontend/                # React Frontend

│   ├── public/              # Statische Dateien

│   ├── src/### 1. Repository klonen### 1. Repository klonen

│   │   ├── components/      # React Komponenten

│   │   ├── pages/           # Seiten-Komponenten```bash```bash

│   │   ├── admin/           # Admin-Panel

│   │   ├── context/         # React Contextgit clone [Ihre Repository URL]git clone [Ihre Repository URL]

│   │   ├── services/        # API Services

│   │   └── App.js           # Main App Componentcd soap_homepagecd soap_homepage

│   └── package.json

└── README.md                # Diese Datei``````

```



## 🌐 Deployment

### 2. Backend Setup### 2. Backend Setup

### Production Ports

- **Frontend:** Port 3001```bash```bash

- **Backend:** Port 5000  

- **Datenbank:** MongoDB Atlas (Cloud)cd backendcd backend



### Quick Deploymentnpm installnpm install

1. **MongoDB Atlas** - Kostenlose Cloud-Datenbank

2. **Railway/Heroku** - Backend Hosting

3. **Vercel/Netlify** - Frontend Hosting

# Environment Variables konfigurieren# Environment Variables konfigurieren

## 🔧 API Endpoints

# Bearbeiten Sie .env mit Ihren Werten# Bearbeiten Sie .env mit Ihren Werten

### Authentication

`````````

POST /api/auth/login        # Admin-Anmeldung

GET  /api/auth/me          # Aktuellen Benutzer abrufen

```

### 3. Frontend Setup### 3. Frontend Setup

### Products

``````bash```bash

GET    /api/products        # Alle Produkte abrufen

GET    /api/products/:id    # Einzelnes Produkt abrufencd ../frontendcd ../frontend

POST   /api/products        # Neues Produkt erstellen (Admin)

PUT    /api/products/:id    # Produkt aktualisieren (Admin)npm installnpm install

DELETE /api/products/:id    # Produkt löschen (Admin)

`````````



### Orders

```

GET  /api/orders           # Alle Bestellungen abrufen### 4. Anwendung starten### 4. Anwendung starten

POST /api/orders           # Neue Bestellung erstellen

GET  /api/orders/:id       # Einzelne Bestellung abrufen```bash```bash

PUT  /api/orders/:id       # Bestellstatus aktualisieren (Admin)

```# Terminal 1 - Backend# Terminal 1 - Backend



### Inventorycd backendcd backend

```

GET  /api/inventory        # Lagerbestand abrufen (Admin)npm startnpm start

PUT  /api/inventory/:id    # Lagerbestand aktualisieren (Admin)

```



## ⚙️ Konfiguration# Terminal 2 - Frontend  # Terminal 2 - Frontend  



### Backend (.env)cd frontendcd frontend

```env

# Databasenpm startnpm start

MONGODB_URI=your_mongodb_connection_string

MONGODB_URI_PROD=your_production_mongodb_uri``````



# Server

PORT=5000

NODE_ENV=production## 🔐 Standard-Zugangsdaten## 🔐 Standard-Zugangsdaten



# Security

JWT_SECRET=your_secure_jwt_secret

### Admin Account### Admin Account

# Admin (WICHTIG: Ändern Sie diese Werte!)

ADMIN_EMAIL=your_admin_email

ADMIN_PASSWORD=your_secure_admin_password

# Frontend

FRONTEND_URL=your_frontend_urlsoap_homepage/

```

⚠️ **Wichtig:** Ändern Sie diese Zugangsdaten nach der ersten Anmeldung!

## 📈 Monitoring

├── backend/                 # Node.js/Express Server

### Health Checks

- **Backend:** `http://localhost:5000/api/health`## 📁 Projektstruktur

- **Frontend:** `http://localhost:3001`

## 📂 Projektstruktur│   ├── src/

### Production

- **Backend:** `https://your-backend.railway.app/api/health````

- **Frontend:** `https://your-frontend.vercel.app`

soap_homepage/│   │   ├── controllers/     # Route Controller

## 🔒 Sicherheit

├── backend/                 # Node.js/Express Backend

Das System implementiert mehrere Sicherheitsmaßnahmen:

│   ├── src/```│   │   ├── middleware/      # Custom Middleware

- **JWT Authentifizierung** für sichere API-Zugriffe

- **Bcrypt** für Passwort-Hashing│   │   ├── controllers/     # Route Controllers

- **Helmet** für HTTP Security Headers

- **Rate Limiting** gegen DDoS-Angriffe│   │   ├── middleware/      # Auth & Validation Middleware├── frontend/          # React.js Frontend│   │   ├── models/          # MongoDB Models

- **Input Validierung** mit express-validator

- **CORS** Konfiguration│   │   ├── models/          # MongoDB Models

- **Rollen-basierte Berechtigungen**

│   │   ├── routes/          # API Routes├── backend/           # Node.js Backend│   │   ├── routes/          # API Routes

## 🤝 Contributing

│   │   └── server.js        # Server Entry Point

1. Fork das Repository

2. Erstellen Sie einen Feature Branch (`git checkout -b feature/amazing-feature`)│   ├── .env                 # Umgebungsvariablen├── docs/             # Projektdokumentation│   │   └── server.js        # Server Entry Point

3. Committen Sie Ihre Änderungen (`git commit -m 'Add amazing feature'`)

4. Pushen Sie zum Branch (`git push origin feature/amazing-feature`)│   └── package.json

5. Öffnen Sie eine Pull Request

├── frontend/                # React Frontend└── README.md         # Diese Datei│   ├── package.json

## 📄 Lizenz

│   ├── public/              # Statische Dateien

Dieses Projekt ist unter der MIT-Lizenz lizenziert.

│   ├── src/```│   ├── .env                 # Umgebungsvariablen

## 📞 Support

│   │   ├── components/      # React Komponenten

Bei Fragen oder Problemen:

- E-Mail: support@gluecksmomente.de│   │   ├── pages/           # Seiten-Komponenten│   └── .gitignore

- GitHub Issues: [Repository Issues](https://github.com/OneCleverFox/soap_homepage/issues)

│   │   ├── admin/           # Admin-Panel

## 🚀 Roadmap

│   │   ├── context/         # React Context## 🌐 Deployment├── frontend/                # React Frontend

- [ ] PayPal/Stripe Integration

- [ ] E-Mail Benachrichtigungen│   │   ├── services/        # API Services

- [ ] Produktbewertungen

- [ ] Gutschein-System│   │   └── App.js           # Main App Component│   ├── public/              # Statische Dateien

- [ ] Multi-Sprachen Support

- [ ] PWA Features│   └── package.json

- [ ] Analytics Dashboard

└── README.md                # Diese Datei- **Frontend:** Port 3001│   ├── src/

---

```

**Entwickelt mit ❤️ für Glücksmomente Manufaktur**
- **Backend:** Port 5000│   │   ├── components/      # React Komponenten

## 🌐 Deployment

- **Datenbank:** MongoDB Atlas (Production)│   │   ├── pages/           # Seiten-Komponenten

### Production Ports

- **Frontend:** Port 3001│   │   ├── admin/           # Admin-Panel

- **Backend:** Port 5000  

- **Datenbank:** MongoDB Atlas (Cloud)---│   │   ├── context/         # React Context



### Quick Deployment│   │   ├── hooks/           # Custom Hooks

1. **MongoDB Atlas** - Kostenlose Cloud-Datenbank

2. **Railway/Heroku** - Backend Hosting*Entwickelt für Gluecksmomente Manufaktur*│   │   ├── services/        # API Services

3. **Vercel/Netlify** - Frontend Hosting│   │   └── utils/           # Utility Funktionen

│   ├── package.json

## 🔧 API Endpoints│   └── .gitignore

└── # 🌟 Glücksmomente - MERN Stack E-Commerce Platform

### Authentication

```Eine vollständige E-Commerce-Lösung für Kleinunternehmen, entwickelt mit dem MERN Stack (MongoDB, Express.js, React, Node.js).

POST /api/auth/register     # Benutzer registrieren  

POST /api/auth/login        # Benutzer anmelden## 🚀 Live Demo

GET  /api/auth/me          # Aktuellen Benutzer abrufen

```- **Frontend**: [Ihre Vercel URL]

- **Backend API**: [Ihre Railway URL]

- **Admin Panel**: [Ihre Vercel URL]/admin (Demo: Verwenden Sie Ihre .env Konfiguration)

```

GET    /api/products        # Alle Produkte abrufen## ✨ Features

GET    /api/products/:id    # Einzelnes Produkt abrufen

POST   /api/products        # Neues Produkt erstellen (Admin)### 🛒 Kundenfunktionen

PUT    /api/products/:id    # Produkt aktualisieren (Admin)- **Produktkatalog** mit Suchfunktion und Kategorien

DELETE /api/products/:id    # Produkt löschen (Admin)- **Warenkorb** mit persistenter Speicherung

```- **Benutzerregistrierung** und Anmeldung

- **Bestellverfolgung** und Historie

### Orders- **Responsive Design** für alle Geräte

```

GET  /api/orders           # Alle Bestellungen abrufen### 👨‍💼 Admin-Funktionen

POST /api/orders           # Neue Bestellung erstellen- **Produktverwaltung** (CRUD Operationen)

GET  /api/orders/:id       # Einzelne Bestellung abrufen- **Bestandsverwaltung** mit Lagerstand-Tracking

PUT  /api/orders/:id       # Bestellstatus aktualisieren (Admin)- **Bestellverwaltung** und Status-Updates

```- **Benutzerverwaltung** mit Rollen-System

- **Dashboard** mit Verkaufsstatistiken

### Inventory

```### 🔒 Sicherheit

GET  /api/inventory        # Lagerbestand abrufen (Admin)- **JWT Authentication** mit sicherer Token-Verwaltung

PUT  /api/inventory/:id    # Lagerbestand aktualisieren (Admin)- **Rollen-basierte Berechtigung** (Admin/User)

```- **Password Hashing** mit bcrypt

- **Rate Limiting** gegen DDoS-Attacken

## ⚙️ Konfiguration- **CORS Protection** und Security Headers



### Backend (.env)## 🛠️ Technologie Stack

```env

# Database### Backend

MONGODB_URI=your_mongodb_connection_string- **Node.js** & **Express.js** - Server Framework

MONGODB_URI_PROD=your_production_mongodb_uri- **MongoDB** mit **Mongoose ODM** - Datenbank

- **JWT** - Authentication

# Server- **bcrypt** - Password Hashing

PORT=5000- **Helmet** - Security Middleware

NODE_ENV=production- **express-rate-limit** - Rate Limiting



# Security### Frontend

JWT_SECRET=your_secure_jwt_secret- **React 18** - UI Framework

- **Material-UI (MUI)** - Design System

# Admin- **React Router** - Navigation

ADMIN_EMAIL=your_admin_email- **Context API** - State Management

ADMIN_PASSWORD=your_admin_password- **React Hot Toast** - Notifications

- **Axios** - HTTP Client

# Frontend

FRONTEND_URL=your_frontend_url## 📦 Installation

```

### Voraussetzungen

## 📈 Monitoring- Node.js (>= 18.0.0)

- MongoDB (lokal oder Atlas)

### Health Checks- npm oder yarn

- **Backend:** `http://localhost:5000/api/health`

- **Frontend:** `http://localhost:3001`### 1. Repository klonen

```bash

### Productiongit clone https://github.com/ihr-username/gluecksmomente.git

- **Backend:** `https://your-backend.railway.app/api/health`cd gluecksmomente

- **Frontend:** `https://your-frontend.vercel.app````



## 🔒 Sicherheit### 2. Backend Setup

```bash

Das System implementiert mehrere Sicherheitsmaßnahmen:cd backend

npm install

- **JWT Authentifizierung** für sichere API-Zugriffe

- **Bcrypt** für Passwort-Hashing# Environment Variables erstellen

- **Helmet** für HTTP Security Headerscp .env.example .env

- **Rate Limiting** gegen DDoS-Angriffe# Bearbeiten Sie .env mit Ihren Werten

- **Input Validierung** mit express-validator```

- **CORS** Konfiguration

- **Rollen-basierte Berechtigungen**### 3. Frontend Setup

```bash

## 🤝 Contributingcd ../frontend

npm install

1. Fork das Repository

2. Erstellen Sie einen Feature Branch (`git checkout -b feature/amazing-feature`)# Environment Variables erstellen

3. Committen Sie Ihre Änderungen (`git commit -m 'Add amazing feature'`)cp .env.example .env.local

4. Pushen Sie zum Branch (`git push origin feature/amazing-feature`)# Bearbeiten Sie .env.local mit Ihren Werten

5. Öffnen Sie eine Pull Request```



## 📄 Lizenz### 4. Datenbank Setup

```bash

Dieses Projekt ist unter der MIT-Lizenz lizenziert.# MongoDB lokal starten oder Atlas Connection String verwenden

# Die Anwendung erstellt automatisch die benötigten Collections

## 📞 Support```



Bei Fragen oder Problemen:### 5. Anwendung starten

- E-Mail: support@gluecksmomente.de```bash

- GitHub Issues: [Repository Issues](https://github.com/OneCleverFox/soap_homepage/issues)# Terminal 1 - Backend

cd backend

## 🚀 Roadmapnpm run dev



- [ ] PayPal/Stripe Integration# Terminal 2 - Frontend

- [ ] E-Mail Benachrichtigungencd frontend

- [ ] Produktbewertungennpm start

- [ ] Gutschein-System```

- [ ] Multi-Sprachen Support

- [ ] PWA Features## 🌐 Deployment

- [ ] Analytics Dashboard

Für eine komplette Deployment-Anleitung siehe: [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md)

---

### Schnell-Deployment (Kostenlos)

**Entwickelt mit ❤️ für Glücksmomente Manufaktur**1. **MongoDB Atlas** - Datenbank (kostenlos bis 512MB)
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
- **Email**: Konfiguriert über ADMIN_EMAIL in .env
- **Passwort**: Konfiguriert über ADMIN_PASSWORD in .env

### Test Customer
- **Email**: kunde@test.de
- **Passwort**: kunde123

⚠️ **Wichtig**: Verwenden Sie sichere Zugangsdaten in der Produktion!

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
  "email": "ihre-admin@email.de",
  "password": "IhrSicheresPasswort123",
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
