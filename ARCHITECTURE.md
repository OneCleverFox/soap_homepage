# 🗺️ Environment Architecture

## System Übersicht

```
┌─────────────────────────────────────────────────────────────────┐
│                     LOKALE ENTWICKLUNG                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Frontend (localhost:3001)         Backend (localhost:5000)     │
│  ┌─────────────────────┐            ┌────────────────────────┐  │
│  │  React App          │────────────│  Express Server        │  │
│  │                     │  Proxy     │                        │  │
│  │  /api/* requests    │───────────▶│  API Routes            │  │
│  │  werden geroutet    │            │                        │  │
│  │  zu localhost:5000  │            │  MongoDB Atlas ────────┼──┼──▶ Production DB
│  └─────────────────────┘            └────────────────────────┘  │
│                                                                  │
│  Environment:                        Environment:               │
│  .env.development                    .env.development           │
│  - REACT_APP_API_URL=/api            - NODE_ENV=development     │
│  - GENERATE_SOURCEMAP=true           - PORT=5000                │
│                                      - MONGODB_URI=Atlas        │
│                                      - FRONTEND_URL=:3001       │
└─────────────────────────────────────────────────────────────────┘


┌─────────────────────────────────────────────────────────────────┐
│                        PRODUCTION                                │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Vercel Frontend                    Railway Backend             │
│  ┌─────────────────────┐            ┌────────────────────────┐  │
│  │  Static Build       │            │  Docker Container      │  │
│  │  (React Bundle)     │            │                        │  │
│  │                     │  HTTPS     │  Express Server        │  │
│  │  API Calls zu ──────┼───────────▶│                        │  │
│  │  Railway Backend    │  CORS      │  API Routes            │  │
│  │                     │            │                        │  │
│  └─────────────────────┘            │  MongoDB Atlas ────────┼──┼──▶ Production DB
│                                     └────────────────────────┘  │
│  gluecksmomente-manufaktur           soap-homepage-backend      │
│  .vercel.app                         .up.railway.app            │
│                                                                  │
│  Environment (Vercel UI):            Environment (Railway UI):  │
│  - REACT_APP_API_URL=                - NODE_ENV=production      │
│    https://...railway.app/api        - PORT=5000                │
│  - GENERATE_SOURCEMAP=false          - MONGODB_URI=Atlas        │
│                                      - FRONTEND_URL=            │
│                                        https://...vercel.app    │
└─────────────────────────────────────────────────────────────────┘
```

## Environment Dateien Flow

```
┌──────────────────────────────────────────────────────────────────┐
│                        GIT REPOSITORY                             │
├──────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ✅ COMMITTED (in Git):                                          │
│  ├── backend/.env.production          (Referenz-Werte)           │
│  ├── frontend/.env.production         (Referenz-Werte)           │
│  ├── backend/.env.example             (Template)                 │
│  └── frontend/.env.example            (Template)                 │
│                                                                   │
│  ❌ IGNORED (nicht in Git):                                      │
│  ├── .env                             (alte Datei)               │
│  ├── backend/.env                     (alte Datei)               │
│  ├── backend/.env.development         (LOKALE Secrets!)          │
│  └── frontend/.env.development        (LOKALE Config)            │
│                                                                   │
└──────────────────────────────────────────────────────────────────┘
           │                                      │
           │ git push                             │ git push
           ▼                                      ▼
    ┌──────────────┐                      ┌──────────────┐
    │   RAILWAY    │                      │   VERCEL     │
    │              │                      │              │
    │ Ignoriert    │                      │ Ignoriert    │
    │ .env Dateien │                      │ .env Dateien │
    │              │                      │              │
    │ Nutzt:       │                      │ Nutzt:       │
    │ Variables    │                      │ Variables    │
    │ aus UI       │                      │ aus UI       │
    └──────────────┘                      └──────────────┘
```

## Datenfluss während Development

```
1. Developer startet Backend
   └─▶ server.js lädt .env.development
       └─▶ NODE_ENV=development
           └─▶ MongoDB Atlas verbinden
               └─▶ CORS: localhost:3001 erlauben
                   └─▶ Server läuft auf :5000

2. Developer startet Frontend
   └─▶ React lädt .env.development
       └─▶ REACT_APP_API_URL=/api
           └─▶ package.json Proxy: localhost:5000
               └─▶ Alle /api/* Calls zu Backend
                   └─▶ App läuft auf :3001

3. User öffnet localhost:3001
   └─▶ React App lädt im Browser
       └─▶ fetch('/api/products')
           └─▶ Proxy leitet um zu localhost:5000/api/products
               └─▶ Backend antwortet
                   └─▶ CORS Header OK (localhost:3001 erlaubt)
                       └─▶ Daten im Frontend
```

## Datenfluss während Production

```
1. Git Push zu GitHub
   └─▶ Railway webhook getriggert
       └─▶ Dockerfile Build
           └─▶ Environment aus Railway Variables
               └─▶ NODE_ENV=production
                   └─▶ MongoDB Atlas verbinden
                       └─▶ CORS: Vercel Domains erlauben
                           └─▶ Deploy zu *.railway.app

2. Git Push zu GitHub
   └─▶ Vercel webhook getriggert
       └─▶ npm run build
           └─▶ Environment aus Vercel Variables
               └─▶ REACT_APP_API_URL in Bundle eingebettet
                   └─▶ Static Build zu *.vercel.app

3. User öffnet vercel.app
   └─▶ Static HTML/JS/CSS vom CDN
       └─▶ fetch('https://...railway.app/api/products')
           └─▶ HTTPS Request zu Railway
               └─▶ Backend prüft CORS (Vercel Domain OK)
                   └─▶ Antwort mit CORS Headers
                       └─▶ Daten im Frontend
```

## Environment Variables Priorität

```
┌────────────────────────────────────────────────────────────┐
│                    LOKALE ENTWICKLUNG                       │
├────────────────────────────────────────────────────────────┤
│                                                             │
│  1. Process Env (Shell)         ← Höchste Priorität        │
│     export NODE_ENV=development                             │
│                                                             │
│  2. .env.development            ← Wird geladen             │
│     NODE_ENV=development                                    │
│     PORT=5000                                               │
│                                                             │
│  3. .env.production             ← Wird ignoriert           │
│                                                             │
│  4. Hardcoded Defaults          ← Fallback                 │
│     const PORT = process.env.PORT || 3000                   │
│                                                             │
└────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────┐
│                       RAILWAY BACKEND                       │
├────────────────────────────────────────────────────────────┤
│                                                             │
│  1. Railway Variables (UI)      ← Höchste Priorität        │
│     NODE_ENV=production                                     │
│     MONGODB_URI=...                                         │
│                                                             │
│  2. DOTENV_KEY (optional)       ← dotenv-vault             │
│                                                             │
│  3. .env.production             ← Fallback                 │
│     (nur wenn Railway Var fehlt)                            │
│                                                             │
│  4. Hardcoded Defaults          ← Letzter Fallback         │
│                                                             │
└────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────┐
│                       VERCEL FRONTEND                       │
├────────────────────────────────────────────────────────────┤
│                                                             │
│  1. Vercel Variables (UI)       ← Höchste Priorität        │
│     REACT_APP_API_URL=https://...                           │
│                                                             │
│  2. .env.production             ← Wird beim Build gelesen  │
│     (aber Vercel UI überschreibt!)                          │
│                                                             │
│  3. Hardcoded Defaults im Code  ← Fallback                 │
│     const API_URL = process.env.REACT_APP_API_URL || ''     │
│                                                             │
│  WICHTIG: React Variables werden beim BUILD eingebettet!    │
│  Änderungen erfordern Redeploy!                             │
│                                                             │
└────────────────────────────────────────────────────────────┘
```

## CORS Configuration

```
┌──────────────────────────────────────────────────────────────┐
│                    CORS Konfiguration                         │
├──────────────────────────────────────────────────────────────┤
│                                                               │
│  DEVELOPMENT:                                                 │
│  Backend (server.js):                                         │
│    origin: process.env.FRONTEND_URL                           │
│    → "http://localhost:3001"                                  │
│                                                               │
│  PRODUCTION:                                                  │
│  Backend (server.js):                                         │
│    origin: process.env.FRONTEND_URL.split(',')                │
│    → ["https://gluecksmomente-manufaktur.vercel.app",        │
│        "https://www.gluecksmomente-manufaktur.vercel.app"]    │
│                                                               │
│  Railway Environment Variable:                                │
│  FRONTEND_URL=https://gluecksmomente-manufaktur.vercel.app,\  │
│               https://www.gluecksmomente-manufaktur.vercel.app│
│                                                               │
└──────────────────────────────────────────────────────────────┘
```

## Proxy vs Direct API Calls

```
┌────────────────────────────────────────────────────────────┐
│                    DEVELOPMENT                              │
├────────────────────────────────────────────────────────────┤
│                                                             │
│  Frontend Code:                                             │
│    fetch('/api/products')                                   │
│                                                             │
│  Browser macht Request zu:                                  │
│    http://localhost:3001/api/products                       │
│                                                             │
│  package.json Proxy leitet um zu:                           │
│    http://localhost:5000/api/products                       │
│                                                             │
│  ✅ Keine CORS Issues (gleicher Origin durch Proxy)        │
│  ✅ Einfaches Setup                                         │
│                                                             │
└────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────┐
│                      PRODUCTION                             │
├────────────────────────────────────────────────────────────┤
│                                                             │
│  Frontend Code:                                             │
│    fetch('/api/products')                                   │
│    → Wird zu:                                               │
│    fetch('https://...railway.app/api/products')             │
│                                                             │
│  REACT_APP_API_URL im Code:                                 │
│    const API = process.env.REACT_APP_API_URL || '/api'      │
│    → In production: "https://...railway.app/api"            │
│                                                             │
│  Browser macht Request zu:                                  │
│    https://soap-homepage-backend.up.railway.app/api/products│
│                                                             │
│  ✅ Direkter API Call (kein Proxy)                          │
│  ✅ CORS durch Backend Headers gelöst                       │
│                                                             │
└────────────────────────────────────────────────────────────┘
```

---

**Erstellt**: 5. Oktober 2025  
**Projekt**: Glücksmomente Manufaktur  
**Version**: 1.0.1
