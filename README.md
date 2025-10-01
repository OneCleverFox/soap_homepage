# Gluecksmomente - MERN Stack Homepage

Eine vollständige E-Commerce Lösung für Kleinunternehmen mit Frontend (React), Backend (Node.js/Express), und MongoDB Datenbank.

## 🚀 Features

### Frontend (React)
- ✅ Responsive Design mit Material-UI
- ✅ Online Shop mit Produktkatalog
- ✅ Warenkorb und Checkout-Prozess
- ✅ Bestellverfolgung
- ✅ SEO-optimiert
- ✅ Performance-optimiert
- ✅ Barrierefreie Bedienung

### Backend (Node.js/Express)
- ✅ REST API mit Express.js
- ✅ MongoDB Integration mit Mongoose
- ✅ JWT Authentifizierung
- ✅ Benutzerrollen und Berechtigungen
- ✅ Input-Validierung
- ✅ Rate Limiting
- ✅ Security Middleware (Helmet, CORS)

### Admin-Panel
- ✅ Produktverwaltung
- ✅ Bestellabwicklung
- ✅ Lagerverwaltung
- ✅ Benutzerverwaltung
- ✅ Analytics Dashboard
- ✅ Lagerbestand-Tracking

### Datenbank (MongoDB)
- ✅ Produktverwaltung
- ✅ Bestellsystem
- ✅ Benutzerverwaltung
- ✅ Lagerverwaltung

## 📁 Projektstruktur

```
soap_homepage/
├── backend/                 # Node.js/Express Server
│   ├── src/
│   │   ├── controllers/     # Route Controller
│   │   ├── middleware/      # Custom Middleware
│   │   ├── models/          # MongoDB Models
│   │   ├── routes/          # API Routes
│   │   └── server.js        # Server Entry Point
│   ├── package.json
│   ├── .env                 # Umgebungsvariablen
│   └── .gitignore
├── frontend/                # React Frontend
│   ├── public/              # Statische Dateien
│   ├── src/
│   │   ├── components/      # React Komponenten
│   │   ├── pages/           # Seiten-Komponenten
│   │   ├── admin/           # Admin-Panel
│   │   ├── context/         # React Context
│   │   ├── hooks/           # Custom Hooks
│   │   ├── services/        # API Services
│   │   └── utils/           # Utility Funktionen
│   ├── package.json
│   └── .gitignore
└── README.md               # Diese Datei
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
