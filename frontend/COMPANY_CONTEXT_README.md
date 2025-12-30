# 🏢 CompanyContext - Zentrale Unternehmensdatenverwaltung

## 🎯 Überblick

Das `CompanyContext` System ermöglicht die zentrale Verwaltung aller Unternehmensdaten im gesamten Frontend. Alle Daten werden einmalig aus der Datenbank (InvoiceTemplate) geladen und stehen dann allen Komponenten zur Verfügung.

## ✨ Vorteile

- **🎯 Zentrale Datenhaltung**: Alle Unternehmensdaten an einem Ort
- **🔄 Automatische Aktualisierung**: Änderungen in der DB werden sofort im Frontend sichtbar
- **📱 Responsive Design**: Optimiert für alle Geräte
- **⚡ Performance**: Einmaliger API-Aufruf für alle Komponenten
- **🛠️ Einfache Wartung**: Daten nur einmal in der Rechnungsvorlage ändern

## 🏗️ Architektur

```
Backend: InvoiceTemplate (MongoDB) 
    ↓
API: /api/company-info 
    ↓
Frontend: CompanyContext 
    ↓
Komponenten: useCompany()
```

## 📋 Verfügbare Daten

Das `useCompany()` Hook stellt folgende Daten bereit:

### Basis-Daten
```javascript
const {
  companyData,    // Vollständige Rohdaten
  loading,        // Ladestatus
  error,          // Fehlerstatus
  refetch         // Daten neu laden
} = useCompany();
```

### Convenience-Getter
```javascript
const {
  name,           // Firmenname
  address,        // Vollständige Adresse (Objekt)
  contact,        // Kontaktdaten (Objekt)
  vatId,          // USt-IdNr.
  ceo,            // Geschäftsführer
  legalForm,      // Rechtsform
  fullAddress,    // Formatierte Adresse (String)
  phone,          // Telefonnummer
  email,          // E-Mail
  website         // Website
} = useCompany();
```

## 🔧 Implementation

### 1. Context Provider (bereits eingerichtet)
```javascript
// App.js
import { CompanyProvider } from './contexts/CompanyContext';

function App() {
  return (
    <CompanyProvider>
      {/* Ihre App-Komponenten */}
    </CompanyProvider>
  );
}
```

### 2. Hook in Komponenten verwenden
```javascript
import { useCompany } from '../contexts/CompanyContext';

const MyComponent = () => {
  const { name, email, loading } = useCompany();

  if (loading) return <div>Laden...</div>;

  return (
    <div>
      <h1>{name}</h1>
      <p>E-Mail: {email}</p>
    </div>
  );
};
```

## 📦 Bereits angepasste Komponenten

### ✅ Vollständig implementiert:
- **ContactPage** - Vollständige Kontaktseite mit allen Unternehmensdaten
- **Footer** - Firmenname, E-Mail, Telefon, Copyright
- **HomePage** - Willkommensnachricht mit Firmennamen
- **ImpressumPage** - Firmenname, Geschäftsführer, E-Mail
- **DatenschutzPage** - Firmenname, Geschäftsführer, E-Mail
- **AGBPage** - Firmenname in AGB-Text

### 📄 Weitere Verwendung:
- E-Mail-Templates (Backend)
- Rechnungsvorlagen (Backend)
- Meta-Tags und SEO-Daten
- Social Media Links

## 🎨 Beispiele

### Kontakt-Seite
```javascript
const ContactPage = () => {
  const { 
    name, email, phone, website,
    fullAddress, loading, error 
  } = useCompany();

  return (
    <div>
      <h1>Kontakt zu {name}</h1>
      <p>📧 {email}</p>
      <p>📞 {phone}</p>
      <p>🌐 {website}</p>
      <p>📍 {fullAddress}</p>
    </div>
  );
};
```

### Footer
```javascript
const Footer = () => {
  const { name, email, phone } = useCompany();

  return (
    <footer>
      <p>© 2025 {name}</p>
      <p>📧 {email}</p>
      <p>📞 {phone}</p>
    </footer>
  );
};
```

## ⚙️ Backend-API

### Endpoint: `/api/company-info`
```javascript
// GET /api/company-info
{
  "success": true,
  "data": {
    "name": "Glücksmomente Manufaktur",
    "address": {
      "street": "Wasserwerkstrasse 15",
      "postalCode": "68642",
      "city": "Bürstadt",
      "country": "Deutschland"
    },
    "contact": {
      "phone": "+49 123 456789",
      "email": "info@gluecksmomente-manufaktur.de",
      "website": "www.gluecksmomente-manufaktur.de"
    },
    "vatId": "USt-IdNr.: DE123456789",
    "ceo": "Ralf Jacob",
    "legalForm": "Einzelunternehmen"
  }
}
```

## 🔄 Daten aktualisieren

**Zentrale Änderung**: Alle Unternehmensdaten werden in der Admin-Oberfläche unter **Rechnungsvorlagen** verwaltet:

1. 🔧 Admin-Dashboard → Rechnungsvorlagen
2. ✏️ Standard-Vorlage bearbeiten
3. 💾 Speichern
4. ✨ **Automatische Aktualisierung** im gesamten Frontend

### Keine Änderungen erforderlich in:
- ❌ Footer-Komponente
- ❌ Kontakt-Seite
- ❌ Impressum
- ❌ Datenschutz
- ❌ AGB
- ❌ Homepage

## 🚀 Performance

- **Einmaliger API-Aufruf** beim App-Start
- **Caching** der Daten im Context
- **Lazy Loading** mit Skeleton-Components
- **Error Handling** mit Fallback-Werten

## 🛡️ Fehlerbehandlung

```javascript
const { name, loading, error } = useCompany();

// Loading State
if (loading) return <Skeleton />;

// Error State mit Fallback
if (error) return <div>{name || 'Glücksmomente Manufaktur'}</div>;

// Normal State
return <div>{name}</div>;
```

## 🔮 Zukunft

### Mögliche Erweiterungen:
- 🎨 **Theme-Integration**: Corporate Design aus DB laden
- 🌍 **Mehrsprachigkeit**: Unternehmensdaten in verschiedenen Sprachen
- 📱 **PWA-Manifest**: App-Namen dynamisch setzen
- 🔔 **Benachrichtigungen**: Bei Datenänderungen

---

**✅ Das System ist vollständig implementiert und einsatzbereit!**

Alle Unternehmensdaten werden jetzt zentral über die Rechnungsvorlage in der Admin-Oberfläche verwaltet und automatisch im gesamten Frontend verwendet.