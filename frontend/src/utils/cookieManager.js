/**
 * DSGVO-konformer Cookie-Manager
 * Stellt sicher, dass KEIN Tracking stattfindet ohne explizite Einwilligung
 */

class CookieManager {
  constructor() {
    this.settings = this.loadSettings();
    this.initialized = false;
    this.pendingOperations = [];
  }

  // Lade gespeicherte Cookie-Einstellungen
  loadSettings() {
    try {
      const saved = localStorage.getItem('cookieSettings');
      const hasConsent = localStorage.getItem('cookieConsent');
      
      if (!hasConsent || !saved) {
        // DSGVO-konforme Defaults: Nur notwendige Cookies
        return {
          necessary: true,
          functional: false,
          analytics: false,
          marketing: false
        };
      }
      
      return JSON.parse(saved);
    } catch (error) {
      console.warn('Cookie settings corrupted, using defaults:', error);
      return {
        necessary: true,
        functional: false,
        analytics: false,
        marketing: false
      };
    }
  }

  // Prüfe ob eine bestimmte Cookie-Kategorie erlaubt ist
  isAllowed(category) {
    return this.settings[category] === true;
  }

  // KRITISCH: Blockiere LocalStorage-Operationen ohne Einwilligung
  setItem(key, value, category = 'functional') {
    if (category === 'necessary') {
      // Notwendige Daten direkt speichern
      localStorage.setItem(key, value);
      return true;
    }

    if (this.isAllowed(category)) {
      localStorage.setItem(key, value);
      return true;
    }

    // Datensammlung blockiert - logge für Debugging
    console.warn(`🚫 DSGVO: LocalStorage blocked for category "${category}": ${key}`);
    return false;
  }

  // Sichere getItem-Methode
  getItem(key, category = 'functional') {
    if (category === 'necessary') {
      return localStorage.getItem(key);
    }

    if (this.isAllowed(category)) {
      return localStorage.getItem(key);
    }

    console.warn(`🚫 DSGVO: LocalStorage access blocked for category "${category}": ${key}`);
    return null;
  }

  // Tracking-spezifische Methoden
  canTrackUser() {
    return this.isAllowed('analytics');
  }

  canUseMarketing() {
    return this.isAllowed('marketing');
  }

  canUseFunctional() {
    return this.isAllowed('functional');
  }

  // Update Cookie-Einstellungen
  updateSettings(newSettings) {
    this.settings = { ...newSettings };
    localStorage.setItem('cookieSettings', JSON.stringify(this.settings));
    localStorage.setItem('cookieConsent', 'configured');
    
    // Emit Event für andere Komponenten
    window.dispatchEvent(new CustomEvent('cookieSettingsChanged', {
      detail: this.settings
    }));
  }

  // Lösche nicht-erlaubte Daten
  clearNonConsentedData() {
    const keysToCheck = [];
    
    // Sammle alle LocalStorage-Keys
    for (let i = 0; i < localStorage.length; i++) {
      keysToCheck.push(localStorage.key(i));
    }

    // Definiere notwendige Keys (diese bleiben)
    const necessaryKeys = ['token', 'user', 'cookieConsent', 'cookieSettings'];

    keysToCheck.forEach(key => {
      if (!necessaryKeys.includes(key)) {
        // Nicht-notwendige Daten löschen wenn keine Einwilligung
        if (!this.isAllowed('functional')) {
          console.log(`🧹 DSGVO: Clearing non-consented data: ${key}`);
          localStorage.removeItem(key);
        }
      }
    });
  }

  // Reset alle Einstellungen
  reset() {
    this.settings = {
      necessary: true,
      functional: false,
      analytics: false,
      marketing: false
    };
    localStorage.removeItem('cookieConsent');
    localStorage.removeItem('cookieSettings');
    this.clearNonConsentedData();
  }
}

// Singleton Instance
const cookieManager = new CookieManager();

// Event-Listener für Cookie-Setting-Änderungen
window.addEventListener('cookieSettingsChanged', (event) => {
  cookieManager.updateSettings(event.detail);
});

export default cookieManager;