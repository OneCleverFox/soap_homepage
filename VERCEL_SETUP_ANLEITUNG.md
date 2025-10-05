# 🚀 Vercel Environment Variables Setup

## ❌ AKTUELLES PROBLEM

**Fehler in Produktion:**
```
Error fetching products: timeout of 10000ms exceeded
```

**Ursache:** Environment Variables sind in Vercel nicht gesetzt!

## ✅ LÖSUNG: Vercel Environment Variables setzen

### Schritt 1: Vercel Dashboard öffnen

1. Gehe zu: https://vercel.com/dashboard
2. Wähle dein Project: `gluecksmomente-manufaktur`
3. Klicke auf **Settings** → **Environment Variables**

### Schritt 2: Folgende Variables hinzufügen

#### Variable 1: REACT_APP_API_URL
```
Name:  REACT_APP_API_URL
Value: https://soap-homepage-backend-production.up.railway.app/api
Environments: ☑ Production, ☑ Preview, ☑ Development
```

#### Variable 2: REACT_APP_FRONTEND_URL
```
Name:  REACT_APP_FRONTEND_URL
Value: https://gluecksmomente-manufaktur.vercel.app
Environments: ☑ Production, ☑ Preview, ☑ Development
```

#### Variable 3: GENERATE_SOURCEMAP
```
Name:  GENERATE_SOURCEMAP
Value: false
Environments: ☑ Production, ☑ Preview, ☑ Development
```

### Schritt 3: Redeploy triggern

Nach dem Hinzufügen der Variables:

**Option A: Automatischer Redeploy (empfohlen)**
1. Gehe zu **Deployments** Tab
2. Klicke bei der letzten Deployment auf die **3 Punkte** (•••)
3. Wähle **Redeploy**

**Option B: Neuer Git Push**
```bash
# Kleine Änderung machen und pushen
git commit --allow-empty -m "chore: Trigger Vercel redeploy"
git push origin main
```

## 🔍 VERIFIKATION

Nach dem Redeploy prüfen:

### 1. Vercel Build Logs prüfen
```
Settings → Deployments → [Latest] → View Function Logs
```

Suche nach:
```
REACT_APP_API_URL is set to: https://soap-homepage-backend-production.up.railway.app/api
```

### 2. Railway Backend prüfen

Öffne: https://soap-homepage-backend-production.up.railway.app/api/health

Erwartetes Ergebnis:
```json
{
  "status": "ok",
  "environment": "production",
  "database": "connected"
}
```

### 3. Vercel Frontend testen

Öffne: https://gluecksmomente-manufaktur.vercel.app

**Keine Fehler mehr in der Browser Console!** ✅

## 📋 RAILWAY ENVIRONMENT VARIABLES (zur Sicherheit)

Stelle auch sicher, dass Railway die korrekten Variables hat:

### Railway Dashboard → soap-homepage-backend → Variables

```bash
MONGODB_URI=mongodb+srv://gluecksmomente-admin:Jonas2014@soap.eybn71b.mongodb.net/gluecksmomente?retryWrites=true&w=majority&appName=soap
JWT_SECRET=***REMOVED_JWT_SECRET***
ADMIN_EMAIL=ralle.jacob84@googlemail.com
ADMIN_PASSWORD=Jonas2014
FRONTEND_URL=https://gluecksmomente-manufaktur.vercel.app
NODE_ENV=production
PORT=5000
```

## 🎯 WICHTIG

- **NIEMALS** Secrets in .env.production committen
- **IMMER** Environment Variables über Vercel/Railway UI setzen
- Nach jeder Änderung der Variables: **Redeploy** triggern

## ✅ FERTIG!

Nach dem Redeploy sollte die App einwandfrei funktionieren! 🎉

---

**Erstellt:** 5. Oktober 2025
**Status:** ⚠️ Action Required - Variables müssen gesetzt werden
