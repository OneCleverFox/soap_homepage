import api from './api';

// Shop-Status und Checkout-Konfiguration abrufen
export const getShopStatus = async () => {
  try {
    const response = await api.get('/admin-settings/settings');
    
    if (response.data.success) {
      const settings = response.data.settings;
      
      return {
        success: true,
        data: {
          shop: {
            status: settings.shop?.status || 'open',
            statusMessage: settings.shop?.statusMessage || '',
            vacationMode: settings.shop?.vacationMode || null
          },
          checkout: {
            mode: settings.checkout?.mode || 'full',
            enabled: settings.checkout?.mode !== 'disabled',
            maintenanceMessage: settings.checkout?.maintenanceMessage || '',
            shippingEnabled: settings.checkout?.shippingEnabled !== false,
            shippingCost: Number(settings.checkout?.shippingCost ?? 5.99),
            freeShippingThreshold: Number(settings.checkout?.freeShippingThreshold ?? 30)
          },
          paypal: {
            mode: settings.paypal?.mode || 'sandbox',
            enabled: settings.paypal?.mode !== 'disabled'
          }
        }
      };
    }
    
    return {
      success: false,
      error: 'Fehler beim Laden der Shop-Einstellungen'
    };
  } catch (error) {
    console.error('Fehler beim Abrufen des Shop-Status:', error);
    
    // Fallback: Shop als geöffnet behandeln
    return {
      success: true,
      data: {
        shop: { status: 'open', statusMessage: '', vacationMode: null },
        checkout: {
          mode: 'full',
          enabled: true,
          maintenanceMessage: '',
          shippingEnabled: true,
          shippingCost: 5.99,
          freeShippingThreshold: 30
        },
        paypal: { mode: 'sandbox', enabled: true }
      }
    };
  }
};

// Prüft ob Checkout verfügbar ist
export const validateCheckoutAvailability = (shopStatus) => {
  const { shop, checkout, paypal } = shopStatus;
  
  // Shop geschlossen
  if (shop.status === 'closed') {
    return {
      available: false,
      type: 'shop-closed',
      title: 'Shop geschlossen',
      message: shop.statusMessage || 'Der Shop ist derzeit geschlossen.',
      actions: ['contact']
    };
  }
  
  // Wartungsmodus
  if (shop.status === 'maintenance') {
    return {
      available: false,
      type: 'maintenance',
      title: 'Wartungsarbeiten',
      message: shop.statusMessage || 'Wir führen derzeit Wartungsarbeiten durch.',
      actions: ['contact', 'later']
    };
  }
  
  // Checkout deaktiviert
  if (checkout.mode === 'disabled') {
    return {
      available: false,
      type: 'checkout-disabled',
      title: 'Checkout deaktiviert',
      message: checkout.maintenanceMessage || 'Bestellungen sind momentan nicht möglich.',
      actions: ['contact', 'inquiry']
    };
  }
  
  // Nur Anfrage-Modus
  if (checkout.mode === 'inquiry') {
    return {
      available: 'inquiry-only',
      type: 'inquiry-mode',
      title: 'Nur Anfragen möglich',
      message: 'Sie können eine unverbindliche Anfrage senden. Wir melden uns bei Ihnen.',
      actions: ['inquiry'],
      paymentDisabled: true
    };
  }
  
  // Urlaubsmodus (Warnung, aber Checkout erlaubt)
  if (shop.status === 'vacation') {
    return {
      available: true,
      type: 'vacation-warning',
      title: 'Urlaubsmodus',
      message: shop.vacationMode?.autoMessage || 'Wir sind im Urlaub. Bestellungen werden nach unserer Rückkehr bearbeitet.',
      warning: true,
      vacationInfo: shop.vacationMode
    };
  }
  
  // PayPal deaktiviert (nur Info)
  if (!paypal.enabled) {
    return {
      available: true,
      type: 'paypal-disabled',
      paymentWarning: 'PayPal-Zahlungen sind derzeit nicht verfügbar. Bitte kontaktieren Sie uns für alternative Zahlungsmethoden.'
    };
  }
  
  // Alles normal
  return {
    available: true,
    type: 'normal'
  };
};

export default {
  getShopStatus,
  validateCheckoutAvailability
};