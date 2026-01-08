# 📋 Technische Dokumentation - Glücksmomente E-Commerce

## 🏢 CompanyContext - Zentrale Unternehmensdatenverwaltung

### Überblick
Das `CompanyContext` System ermöglicht die zentrale Verwaltung aller Unternehmensdaten im gesamten Frontend. Alle Daten werden einmalig aus der Datenbank (InvoiceTemplate) geladen und stehen dann allen Komponenten zur Verfügung.

### Vorteile
- **Zentrale Datenhaltung**: Alle Unternehmensdaten an einem Ort
- **Automatische Aktualisierung**: Änderungen in der DB werden sofort im Frontend sichtbar
- **Performance**: Einmaliger API-Aufruf für alle Komponenten
- **Einfache Wartung**: Daten nur einmal in der Rechnungsvorlage ändern

### Architektur
```
Backend: InvoiceTemplate (MongoDB) 
    ↓
API: /api/company-info 
    ↓
Frontend: CompanyContext 
    ↓
Komponenten: useCompany()
```

### Verwendung im Code
```javascript
import { useCompany } from '../contexts/CompanyContext';

const MyComponent = () => {
  const {
    companyData,    // Vollständige Rohdaten
    loading,        // Ladestatus
    error,          // Fehlerstatus
    name,           // Firmenname
    address,        // Vollständige Adresse (Objekt)
    contact,        // Kontaktdaten (Objekt)
    vatId,          // USt-IdNr.
    fullAddress,    // Formatierte Adresse (String)
    refetch         // Daten neu laden
  } = useCompany();

  if (loading) return <div>Laden...</div>;
  if (error) return <div>Fehler: {error}</div>;

  return (
    <div>
      <h1>{name}</h1>
      <p>{fullAddress}</p>
    </div>
  );
};
```

---

## 📦 Verpackungs-Datenkonsistenz zwischen Portfolio und Warenberechnung

### Problem-Analyse
Die Warenberechnung und Portfolio-Verwaltung verwendeten unterschiedliche Ansätze für Verpackungsdaten, was zu Inkonsistenzen führen konnte.

### Implementierte Lösung

#### 1. Konsistente Datenquelle im Frontend
```javascript
// Portfolio-Verwaltung: Primäre DB-Optionen + markierte veraltete
const primaryOptions = verpackungList;
const orphanedVerpackungen = existingVerpackungen.filter(v => !verpackungList.includes(v));

// Warnung bei veralteten Verpackungen
if (orphanedVerpackungen.length > 0) {
  console.warn('⚠️ Veraltete Verpackungen in Portfolio gefunden:', orphanedVerpackungen);
}

// Veraltete werden markiert für Sichtbarkeit
const allOptions = [...primaryOptions, ...orphanedVerpackungen.map(v => `${v} (VERALTET)`)];
```

#### 2. Verbesserte Backend-Validierung
```javascript
// Warenberechnung: Nur verfügbare Verpackungen laden
const verpackungList = await Verpackung.find({ verfuegbar: true });
const verpackung = verpackungList.find(v => v.bezeichnung === portfolio.verpackung);

// Warnung bei fehlender Verpackung
if (!verpackung && portfolio.verpackung) {
  console.warn(`⚠️ Verpackung "${portfolio.verpackung}" für Portfolio "${portfolio.name}" nicht in DB gefunden`);
}
```

### Verbesserungen
1. **Einheitliche Datenquelle**: Verpackung.find() als primäre Quelle
2. **Markierung veralteter Daten**: "(VERALTET)" Suffix für Sichtbarkeit
3. **Improved Logging**: Detaillierte Warnungen für fehlende Verpackungen
4. **Validierung**: Backend prüft Verfügbarkeit vor Verwendung

### Best Practices
- **Regelmäßige Datenbereinigung**: Veraltete Verpackungen aus Produkten entfernen
- **Konsistente Validierung**: Gleiche Logik in Frontend und Backend
- **Monitoring**: Logs überwachen für veraltete Referenzen
- **Migration**: Schrittweise Migration alter Daten zu neuen Standards

---

## 🔧 Performance Optimierungen

### Bildoptimierung
- **WebP-Konvertierung**: Automatische Konvertierung für 95% kleinere Dateien
- **Sharp Integration**: Server-side Bildverarbeitung
- **Lazy Loading**: Bilder werden nur bei Bedarf geladen
- **Responsive Images**: Verschiedene Größen für verschiedene Viewports

### Caching-Strategien
```javascript
// Cache-Manager Implementation
const { cacheManager } = require('../utils/cacheManager');

// Portfolio-Cache mit TTL
const getCachedPortfolio = async () => {
  const cacheKey = 'portfolio_list';
  const cached = await cacheManager.get(cacheKey);
  
  if (cached) {
    return cached;
  }
  
  const portfolio = await Portfolio.find();
  await cacheManager.set(cacheKey, portfolio, 300); // 5min TTL
  return portfolio;
};
```

### Database Optimierungen
- **Indexierung**: Optimierte Indices für häufige Queries
- **Aggregation Pipelines**: Effiziente Datenverarbeitung
- **Projection**: Nur benötigte Felder laden
- **Populate Optimization**: Selektives Laden von Referenzen

---

## 🚀 Deployment Notes

### Railway Configuration
```yaml
# railway.toml
[build]
command = "npm install && npm run build"

[deploy]
startCommand = "npm start"

[env]
NODE_ENV = "production"
PORT = "5000"
```

### Vercel Configuration
```json
{
  "name": "gluecksmomente-frontend",
  "version": 2,
  "builds": [
    {
      "src": "package.json",
      "use": "@vercel/static-build",
      "config": {
        "distDir": "build"
      }
    }
  ],
  "routes": [
    {
      "src": "/static/(.*)",
      "headers": { "cache-control": "s-maxage=31536000,immutable" },
      "dest": "/static/$1"
    },
    { "src": "/(.*)", "dest": "/index.html" }
  ]
}
```

### Environment Variables Checklist
- [ ] `MONGODB_URI` - Database Connection
- [ ] `JWT_SECRET` - Authentication Secret
- [ ] `PAYPAL_CLIENT_ID` - PayPal Integration
- [ ] `EMAIL_USER` / `EMAIL_PASSWORD` - Email Service
- [ ] `FRONTEND_URL` - CORS Configuration
- [ ] `NODE_ENV` - Environment Flag

---

## 🐛 Debugging & Troubleshooting

### Common Issues

#### 1. MongoDB Connection Issues
```javascript
// Debug MongoDB Connection
mongoose.connection.on('connected', () => {
  console.log('✅ MongoDB connected successfully');
});

mongoose.connection.on('error', (err) => {
  console.error('❌ MongoDB connection error:', err);
});
```

#### 2. PayPal Integration Problems
```javascript
// Debug PayPal Environment
console.log('PayPal Environment:', process.env.PAYPAL_ENVIRONMENT);
console.log('PayPal Client ID exists:', !!process.env.PAYPAL_CLIENT_ID);
```

#### 3. Email Service Issues
```javascript
// Test Email Configuration
const testEmail = async () => {
  try {
    await emailService.sendTestEmail('test@example.com');
    console.log('✅ Email service working');
  } catch (error) {
    console.error('❌ Email service error:', error);
  }
};
```

### Log Analysis
```bash
# View Backend Logs
npm run logs:view

# Filter Error Logs
npm run logs:errors

# Clear Application Cache
npm run cache:clear
```

### Performance Monitoring
```javascript
// API Response Time Logging
const logResponseTime = (req, res, next) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`✅ API call: ${req.path} took ${duration}ms`);
  });
  
  next();
};
```