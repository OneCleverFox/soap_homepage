# Glücksmomente MERN Stack - Komplette Deployment-Anleitung (Kostenlos)

## Übersicht
Diese Anleitung zeigt Ihnen, wie Sie Ihre MERN Stack Anwendung kostenlos live schalten können:
- **Backend**: Railway (Node.js/Express)
- **Frontend**: Vercel (React)
- **Datenbank**: MongoDB Atlas (kostenlos bis 512MB)

## 1. MongoDB Atlas Setup (Datenbank)

### 1.1 Account erstellen
1. Gehen Sie zu [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. Klicken Sie auf "Try Free"
3. Erstellen Sie ein Konto oder melden Sie sich an

### 1.2 Cluster erstellen
1. Wählen Sie "Build a Database"
2. Wählen Sie "FREE" (M0 Sandbox)
3. Wählen Sie eine Region (am besten Frankfurt für Deutschland)
4. Geben Sie Ihrem Cluster einen Namen (z.B. "gluecksmomente")

### 1.3 Datenbankbenutzer erstellen
1. Unter "Security" → "Database Access"
2. Klicken Sie "Add New Database User"
3. Erstellen Sie Username und Passwort (merken Sie sich diese!)
4. Wählen Sie "Read and write to any database"

### 1.4 Netzwerkzugriff konfigurieren
1. Unter "Security" → "Network Access"
2. Klicken Sie "Add IP Address"
3. Wählen Sie "Allow Access from Anywhere" (0.0.0.0/0)

### 1.5 Connection String erhalten
1. Unter "Deployment" → "Database"
2. Klicken Sie "Connect" bei Ihrem Cluster
3. Wählen Sie "Connect your application"
4. Kopieren Sie den Connection String
5. Ersetzen Sie `<password>` mit Ihrem echten Passwort
6. Ersetzen Sie den Datenbanknamen mit `soap`

**Beispiel Connection String:**
```
mongodb+srv://username:password@cluster.mongodb.net/soap
```

## 2. Railway Setup (Backend)

### 2.1 Account erstellen
1. Gehen Sie zu [Railway](https://railway.app)
2. Melden Sie sich mit GitHub an

### 2.2 Projekt deployen
1. Klicken Sie "New Project"
2. Wählen Sie "Deploy from GitHub repo"
3. Verbinden Sie Ihr GitHub Repository
4. **Wichtig**: Setzen Sie das **Root Directory** auf `backend`
5. Railway erkennt automatisch Ihr Node.js Backend

**⚠️ Wichtiger Hinweis - Root Directory Problem:**
Falls das `backend` Verzeichnis in Railway nicht erkannt wird:

**Option A: Service Settings anpassen**
1. Gehen Sie zu Ihrem Service in Railway
2. Unter "Settings" → "Service Settings"
3. Setzen Sie "Root Directory" auf `backend`
4. Klicken Sie "Update"

**Option B: Railway CLI verwenden**
```bash
# Railway CLI installieren
npm install -g @railway/cli

# In Ihr Projekt-Verzeichnis wechseln
cd c:\Users\rj18401\CODE\soap_homepage

# Railway CLI anmelden
railway login

# Projekt verknüpfen
railway link

# Backend deployen mit spezifischem Pfad
cd backend
railway up
```

### 2.3 Environment Variables setzen
1. Gehen Sie zu Ihrem Projekt
2. Klicken Sie auf Ihr Service
3. Unter "Variables" fügen Sie hinzu:
   ```
   NODE_ENV=production
   PORT=5000
   MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/soap
   JWT_SECRET=ihr-super-sicherer-jwt-geheimschluessel
   FRONTEND_URL=https://gluecksmomente-manufaktur.vercel.app
   ```

### 2.4 Domain erhalten
1. Unter "Settings" → "Networking"
2. Klicken Sie "Generate Domain"
3. Notieren Sie sich die URL (z.B. `https://ihr-backend.railway.app`)

## 3. Vercel Setup (Frontend)

### 3.1 Frontend für Deployment vorbereiten
Erstellen Sie eine `.env.production` Datei im Frontend-Verzeichnis:

```bash
REACT_APP_API_URL=https://ihr-backend.railway.app
```

### 3.2 Account erstellen
1. Gehen Sie zu [Vercel](https://vercel.com)
2. Melden Sie sich mit GitHub an

### 3.3 Projekt deployen
1. Klicken Sie "New Project"
2. Importieren Sie Ihr GitHub Repository
3. Setzen Sie:
   - **Framework Preset**: Create React App
   - **Root Directory**: `frontend`
   - **Build Command**: `npm run build`
   - **Output Directory**: `build`

### 3.4 Environment Variables setzen
1. Unter "Project Settings" → "Environment Variables"
2. Fügen Sie hinzu:
   ```
   REACT_APP_API_URL=https://ihr-backend.railway.app
   ```

**Status:** ✅ **Vercel läuft bereits unter:** https://gluecksmomente-manufaktur.vercel.app/

## 4. Frontend API URL konfigurieren

Aktualisieren Sie die API-Konfiguration im Frontend:

`frontend/src/services/api.js`:
```javascript
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

export const api = {
  baseURL: API_BASE_URL,
  // ... rest der Konfiguration
};
```

## 5. Deployment Checklist

### ✅ Vor dem Deployment
- [ ] MongoDB Atlas Cluster erstellt und konfiguriert
- [ ] Railway Account erstellt
- [ ] Vercel Account erstellt
- [ ] GitHub Repository ist öffentlich oder verbunden

### ✅ Nach dem Deployment
- [ ] Backend auf Railway läuft (Health Check: `https://ihr-backend.railway.app/api/health`)
- [ ] Frontend auf Vercel läuft
- [ ] Datenbankverbindung funktioniert
- [ ] API-Aufrufe vom Frontend zum Backend funktionieren

## 6. Kosten Übersicht

| Service | Kostenlos inklusive | Limit |
|---------|-------------------|--------|
| **MongoDB Atlas** | 512MB Speicher | Unbegrenzt für kleine Apps |
| **Railway** | $5 Startguthaben | 500 Stunden/Monat |
| **Vercel** | 100GB Bandwidth | Unlimited für Hobby-Projekte |

## 7. Monitoring und Wartung

### Railway Monitoring
- Unter "Observability" können Sie Logs einsehen
- CPU und Memory Usage überwachen

### Vercel Analytics
- Unter "Analytics" Performance überwachen
- Build-Logs unter "Functions"

### MongoDB Atlas Monitoring
- Unter "Monitoring" Datenbankperformance überwachen
- Alerts bei Problemen setzen

## 8. Troubleshooting

### Backend startet nicht
1. Prüfen Sie Railway Logs
2. Überprüfen Sie Environment Variables
3. Testen Sie MongoDB Connection String

### Frontend kann Backend nicht erreichen
1. Prüfen Sie CORS-Konfiguration im Backend
2. Überprüfen Sie `REACT_APP_API_URL`
3. Prüfen Sie Network-Tab in Browser DevTools

### Datenbank Verbindungsprobleme
1. Überprüfen Sie IP-Whitelist in MongoDB Atlas
2. Prüfen Sie Connection String
3. Testen Sie Datenbankbenutzer Credentials

## 9. Nächste Schritte

Nach erfolgreichem Deployment können Sie:
- Custom Domain auf Vercel einrichten
- SSL-Zertifikate konfigurieren (automatisch)
- Monitoring und Alerts einrichten
- Backup-Strategien implementieren

## 10. Support

Bei Problemen:
- Railway Dokumentation: https://docs.railway.app
- Vercel Dokumentation: https://vercel.com/docs
- MongoDB Atlas Dokumentation: https://docs.atlas.mongodb.com