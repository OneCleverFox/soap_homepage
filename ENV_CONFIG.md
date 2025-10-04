# Environment-Konfiguration

## Übersicht

Die Anwendung nutzt **getrennte Environment-Files** für lokale Entwicklung und Produktion:

```
📂 Projekt
├── .env (ROOT - Backend Prod-DB, wird NICHT committed)
├── backend/
│   └── src/server.js (lädt Root-.env oder Dotenv Vault)
└── frontend/
    ├── .env (lokal: localhost:5000, wird NICHT committed)
    ├── .env.example (Template für lokale Entwicklung)
    └── .env.production (Railway Backend, WIRD committed für Vercel)
```

---

## 🖥️ Lokale Entwicklung

### Backend
Das Backend lädt automatisch die `.env` aus dem **Projekt-Root**:

```bash
# .env (im Root-Verzeichnis)
MONGODB_URI_PROD=mongodb+srv://...
MONGODB_URI=mongodb+srv://...
JWT_SECRET=...
ADMIN_PASSWORD=...
```

**Start:**
```bash
cd backend
npm run dev  # lädt automatisch Root-.env
```

### Frontend
Erstelle `frontend/.env` basierend auf `.env.example`:

```bash
# frontend/.env (wird NICHT committed)
PORT=3001
REACT_APP_API_URL=http://localhost:5000/api
REACT_APP_FRONTEND_URL=http://localhost:3001
GENERATE_SOURCEMAP=false
```

**Start:**
```bash
cd frontend
npm start  # nutzt lokale .env → zeigt auf localhost:5000
```

---

## 🚀 Produktion (Railway/Vercel)

### Backend (Railway)
Railway nutzt entweder:
- **Dotenv Vault** (wenn `DOTENV_KEY` gesetzt ist)
- **Railway Environment Variables** (direkt in Railway UI konfiguriert)

### Frontend (Vercel)
Vercel nutzt automatisch **`.env.production`** beim Build:

```bash
# frontend/.env.production (WIRD committed)
REACT_APP_API_URL=https://soap-homepage-backend-production.up.railway.app/api
REACT_APP_FRONTEND_URL=https://gluecksmomente-manufaktur.vercel.app
GENERATE_SOURCEMAP=false
```

**Zusätzlich** können in der **Vercel UI** Environment Variables überschrieben werden (optional).

---

## 🔐 CORS-Konfiguration

Das Backend erlaubt folgende Origins:

**Lokal:**
- `http://localhost:3000`
- `http://localhost:3001`
- `http://127.0.0.1:3000`
- `http://127.0.0.1:3001`

**Produktiv:**
- `https://gluecksmomente-manufaktur.vercel.app`
- `https://www.gluecksmomente-manufaktur.vercel.app`
- `https://soap-homepage-frontend.vercel.app`
- Regex: `https://gluecksmomente-manufaktur-*.vercel.app` (Preview-Deployments)

---

## ⚙️ Wie es funktioniert

### Create-React-App Environment Priority

CRA (Create-React-App) lädt Env-Files in folgender Priorität:

1. **Development** (`npm start`):
   - `.env.development.local`
   - `.env.local`
   - `.env.development`
   - **`.env`** ← wird genutzt

2. **Production** (`npm run build`):
   - `.env.production.local`
   - `.env.local`
   - **`.env.production`** ← wird genutzt
   - `.env`

### Git Tracking

**NICHT committed** (in `.gitignore`):
- `.env` (Root)
- `frontend/.env`
- `backend/.env`
- Alle `.env.local`-Dateien

**WIRD committed**:
- `frontend/.env.production` (Railway-URL für Vercel)
- `frontend/.env.example` (Template)
- `.env.vault` (Dotenv Vault verschlüsselt)

---

## 🛠️ Lokales Setup (Erstmalig)

1. **Root `.env` erstellen:**
   ```bash
   cp .env.example .env
   # Trage MongoDB-URI, JWT_SECRET, etc. ein
   ```

2. **Frontend `.env` erstellen:**
   ```bash
   cd frontend
   cp .env.example .env
   # Bereits vorkonfiguriert für localhost:5000
   ```

3. **Backend starten:**
   ```bash
   cd backend
   npm install
   npm run dev
   ```

4. **Frontend starten:**
   ```bash
   cd frontend
   npm install
   npm start
   ```

5. **Browser öffnen:**
   - Frontend: http://localhost:3001
   - Backend Health: http://localhost:5000/api/health

---

## 🔄 Wechsel zwischen Lokal/Produktiv

### Option 1: Env-Files behalten
- **Lokal entwickeln**: `frontend/.env` → `localhost:5000`
- **Build für Production**: `npm run build` nutzt automatisch `.env.production` → Railway

### Option 2: Manuell wechseln (NICHT empfohlen)
```bash
# Nur wenn du lokal gegen Railway testen willst:
cd frontend
mv .env .env.local.backup
cp .env.production .env
npm start
# ⚠️ Nicht vergessen zurückzuwechseln!
```

---

## ✅ Verifikation

### Lokale Entwicklung prüfen:
```bash
# Backend
curl http://localhost:5000/api/health

# Frontend (im Browser DevTools → Console)
console.log(process.env.REACT_APP_API_URL)
# Sollte ausgeben: http://localhost:5000/api
```

### Produktiv prüfen (nach Vercel-Deployment):
```bash
curl https://gluecksmomente-manufaktur.vercel.app/api/health
# Sollte Railway-Backend antworten
```

---

## 📌 Wichtige Hinweise

1. **Niemals `.env` mit sensiblen Daten committen!**
2. **Railway-Secrets** nur über Railway UI oder Dotenv Vault verwalten.
3. **Vercel-Secrets** können zusätzlich in Vercel UI überschrieben werden.
4. **CORS-Fehler?** → Prüfe, ob Backend den Frontend-Origin erlaubt (siehe `backend/src/server.js`).
5. **Lokale Änderungen an `.env.production`** committen, wenn Railway-URL sich ändert.

---

## 🐛 Troubleshooting

### Frontend zeigt keine Daten
1. Prüfe `frontend/.env`: `REACT_APP_API_URL=http://localhost:5000/api`
2. Prüfe Backend läuft: `curl http://localhost:5000/api/health`
3. Öffne Browser DevTools → Network → Prüfe CORS-Header

### CORS-Fehler lokal
- Backend muss `http://localhost:3001` in CORS-Whitelist haben (bereits konfiguriert)
- Frontend muss neu gestartet werden nach `.env`-Änderung (`Ctrl+C` → `npm start`)

### Production zeigt 404/500
- Prüfe Vercel Environment Variables: `REACT_APP_API_URL` muss Railway-URL enthalten
- Prüfe Railway Backend läuft: `https://soap-homepage-backend-production.up.railway.app/api/health`
