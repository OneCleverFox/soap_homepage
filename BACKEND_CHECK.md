# Backend Status Check - Anleitung

## 🔍 So prüfen Sie Ihr Backend:

### 1. Railway Dashboard
- Gehen Sie zu: https://railway.app/dashboard
- Wählen Sie Ihr Projekt
- **"Deployments"** Tab:
  - ✅ Status: "Success" = Backend läuft
  - ❌ Status: "Failed" = Deployment fehlgeschlagen
- **"Logs"** Tab: Zeigt Server-Ausgaben
- **"Settings"** → **"Networking"**: Hier finden Sie Ihre Domain

### 2. Health Check testen
Sobald Sie Ihre Railway-URL haben:

**Im Browser öffnen:**
```
https://ihre-railway-url.railway.app/api/health
```

**Erwartete Antwort:**
```json
{
  "status": "ok",
  "message": "Server is running",
  "timestamp": "2025-10-02T..."
}
```

### 3. PowerShell Test (mit echter URL)
```powershell
# Ersetzen Sie "ihre-railway-url" mit der echten URL
curl https://ihre-railway-url.railway.app/api/health

# Oder mit Invoke-RestMethod:
Invoke-RestMethod -Uri "https://ihre-railway-url.railway.app/api/health"
```

### 4. API Endpoints testen
```
GET https://ihre-railway-url.railway.app/api/products
GET https://ihre-railway-url.railway.app/api/auth/me
```

## 🚨 Problemdiagnose

### Backend läuft nicht?
1. **Railway Logs prüfen**: Fehlermeldungen in den Logs
2. **Environment Variables**: Sind alle gesetzt?
3. **Dependencies**: Wurden korrekt installiert?

### Häufige Probleme:
- `MONGODB_URI` nicht gesetzt
- `JWT_SECRET` fehlt
- Port-Konflikte

## 📋 Checklist:
- [ ] Railway Deployment Status: Success
- [ ] Domain generiert und verfügbar
- [ ] Environment Variables gesetzt
- [ ] Health Check Response: 200 OK
- [ ] Logs zeigen: "Server running on port 5000"
- [ ] MongoDB connection: "Connected to MongoDB"

---
**Nächster Schritt**: Vercel Frontend mit Railway Backend URL verbinden