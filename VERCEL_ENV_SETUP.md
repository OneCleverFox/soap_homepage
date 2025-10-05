# 🚀 Vercel Environment Variables - MUST DO NOW!

## ⚠️ AKTUELLES PROBLEM

**Fehler:** `timeout of 10000ms exceeded`
**Ursache:** Vercel Environment Variables fehlen komplett!

## ✅ RAILWAY (Backend) - BEREITS KONFIGURIERT ✓

Railway ist korrekt eingerichtet mit allen notwendigen Variables:
- ✅ ADMIN_EMAIL
- ✅ ADMIN_PASSWORD  
- ✅ FRONTEND_URL
- ✅ JWT_SECRET
- ✅ MONGODB_URI
- ✅ NODE_ENV
- ✅ PORT

**Railway Backend ist erreichbar:**
https://soap-homepage-backend-production.up.railway.app

---

## ❌ VERCEL (Frontend) - MUSS JETZT KONFIGURIERT WERDEN!

### Schritt-für-Schritt Anleitung:

### 1️⃣ Vercel Dashboard öffnen

Gehe zu: **https://vercel.com/dashboard**

### 2️⃣ Project Settings öffnen

1. Wähle Project: **gluecksmomente-manufaktur**
2. Klicke auf **Settings** (oben)
3. Klicke auf **Environment Variables** (links)

### 3️⃣ Diese 3 Variables EXAKT SO eintragen:

---

#### ✅ Variable 1: REACT_APP_API_URL

```
VARIABLE_NAME:
REACT_APP_API_URL

VALUE or ${REF}:
https://soap-homepage-backend-production.up.railway.app/api

Environments:
☑ Production
☑ Preview  
☑ Development
```

**Klicke auf "Add"** ✓

---

#### ✅ Variable 2: REACT_APP_FRONTEND_URL

```
VARIABLE_NAME:
REACT_APP_FRONTEND_URL

VALUE or ${REF}:
https://gluecksmomente-manufaktur.vercel.app

Environments:
☑ Production
☑ Preview
☑ Development
```

**Klicke auf "Add"** ✓

---

#### ✅ Variable 3: GENERATE_SOURCEMAP

```
VARIABLE_NAME:
GENERATE_SOURCEMAP

VALUE or ${REF}:
false

Environments:
☑ Production
☑ Preview
☑ Development
```

**Klicke auf "Add"** ✓

---

### 4️⃣ Redeploy triggern

**Nach dem Hinzufügen aller 3 Variables:**

1. Gehe zu **Deployments** Tab (oben)
2. Finde die neueste Deployment (ganz oben)
3. Klicke auf **⋯** (3 Punkte rechts)
4. Wähle **"Redeploy"**
5. Bestätige mit **"Redeploy"**

⏱️ **Deployment dauert ~2-3 Minuten**

---

## 🔍 VERIFIKATION (Nach Redeploy)

### ✅ Check 1: Vercel Build Logs

1. Gehe zu **Deployments**
2. Klicke auf die laufende Deployment
3. Warte bis Status: **"Ready"** ✓
4. Prüfe die Logs auf Fehler

### ✅ Check 2: Railway Backend Health

Öffne im Browser:
```
https://soap-homepage-backend-production.up.railway.app/api/health
```

**Erwartetes Ergebnis:**
```json
{
  "status": "ok",
  "environment": "production", 
  "database": "connected"
}
```

### ✅ Check 3: Frontend testen

Öffne im Browser:
```
https://gluecksmomente-manufaktur.vercel.app
```

**Erwartetes Ergebnis:**
- ✅ Keine Console Errors
- ✅ Produkte werden geladen
- ✅ Kein Timeout mehr!

---

## 📋 CHECKLISTE

- [ ] Vercel Dashboard geöffnet
- [ ] Project "gluecksmomente-manufaktur" ausgewählt
- [ ] Settings → Environment Variables geöffnet
- [ ] REACT_APP_API_URL hinzugefügt
- [ ] REACT_APP_FRONTEND_URL hinzugefügt
- [ ] GENERATE_SOURCEMAP hinzugefügt
- [ ] Redeploy getriggert
- [ ] Deployment abgeschlossen (Status: Ready)
- [ ] Backend Health Check OK
- [ ] Frontend funktioniert ohne Fehler

---

## ⚠️ WICHTIGE HINWEISE

1. **Genau diese URLs verwenden** (keine Tippfehler!)
2. **Alle 3 Environments wählen** (Production, Preview, Development)
3. **Nach dem Hinzufügen MUSS ein Redeploy erfolgen**
4. **Keine Secrets in .env.production committen** (nur über UI setzen)

---

## 🆘 TROUBLESHOOTING

**Problem:** Variables werden nicht übernommen
**Lösung:** Vercel Cache löschen:
```bash
# Lokaler Cache
rm -rf .next
rm -rf node_modules/.cache

# Dann Redeploy
```

**Problem:** Immer noch Timeout
**Lösung:** 
1. Railway Backend Logs prüfen (Railway Dashboard → Logs)
2. CORS Konfiguration prüfen (sollte aber OK sein)
3. FRONTEND_URL in Railway prüfen (muss Vercel Domain sein)

---

**Status:** ⚠️ **ACTION REQUIRED - Jetzt durchführen!**
**Erstellt:** 5. Oktober 2025
