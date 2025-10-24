/**
 * Tracking-Utilities für verschiedene Versanddienstleister
 */

export const CARRIERS = {
  DHL: 'dhl',
  HERMES: 'hermes',
  UPS: 'ups',
  DPD: 'dpd',
  GLS: 'gls'
};

/**
 * Generiert Tracking-URLs für verschiedene Versanddienstleister
 */
export const generateTrackingUrl = (carrier, trackingNumber) => {
  if (!trackingNumber || !carrier) return '';
  
  const trackingUrls = {
    [CARRIERS.DHL]: `https://www.dhl.de/de/privatkunden/pakete-empfangen/verfolgen.html?lang=de&idc=${trackingNumber}`,
    [CARRIERS.HERMES]: `https://www.myhermes.de/empfangen/sendungsverfolgung/sendungsinformation/#${trackingNumber}`,
    [CARRIERS.UPS]: `https://www.ups.com/track?tracknum=${trackingNumber}`,
    [CARRIERS.DPD]: `https://tracking.dpd.de/status/de_DE/parcel/${trackingNumber}`,
    [CARRIERS.GLS]: `https://gls-group.eu/DE/de/paketverfolgung?match=${trackingNumber}`
  };
  
  return trackingUrls[carrier] || '';
};

/**
 * Validiert Tracking-Nummern basierend auf Versanddienstleister-Formaten
 */
export const validateTrackingNumber = (carrier, trackingNumber) => {
  if (!trackingNumber) return { valid: false, message: 'Tracking-Nummer ist erforderlich' };
  
  const validationRules = {
    [CARRIERS.DHL]: {
      pattern: /^[0-9]{10,39}$/, // DHL Tracking-Nummern sind normalerweise 10-39 Zeichen
      message: 'DHL Tracking-Nummer muss 10-39 Ziffern enthalten'
    },
    [CARRIERS.HERMES]: {
      pattern: /^[HT][0-9]{12,14}$/, // Hermes beginnt oft mit H oder T
      message: 'Hermes Tracking-Nummer beginnt mit H oder T gefolgt von 12-14 Ziffern'
    },
    [CARRIERS.UPS]: {
      pattern: /^(1Z[A-Z0-9]{16}|[T0-9]{10})$/, // UPS hat spezifische Formate
      message: 'UPS Tracking-Nummer: 1Z + 16 Zeichen oder 10-stellige Nummer'
    },
    [CARRIERS.DPD]: {
      pattern: /^[0-9]{14}$/, // DPD normalerweise 14 Ziffern
      message: 'DPD Tracking-Nummer muss 14 Ziffern enthalten'
    },
    [CARRIERS.GLS]: {
      pattern: /^[0-9]{11}$/, // GLS normalerweise 11 Ziffern
      message: 'GLS Tracking-Nummer muss 11 Ziffern enthalten'
    }
  };
  
  const rule = validationRules[carrier];
  if (!rule) {
    return { valid: true, message: '' }; // Unbekannte Anbieter werden als gültig akzeptiert
  }
  
  const isValid = rule.pattern.test(trackingNumber);
  return {
    valid: isValid,
    message: isValid ? '' : rule.message
  };
};

/**
 * Formatiert Tracking-Nummern für bessere Lesbarkeit
 */
export const formatTrackingNumber = (carrier, trackingNumber) => {
  if (!trackingNumber) return '';
  
  switch (carrier) {
    case CARRIERS.DHL:
      // DHL: Formatierung in 4er-Gruppen
      return trackingNumber.replace(/(\d{4})(?=\d)/g, '$1 ').trim();
    
    case CARRIERS.UPS:
      // UPS: 1Z XXXXXX XX XXXX XXXX
      if (trackingNumber.startsWith('1Z')) {
        return trackingNumber.replace(/^(1Z)([A-Z0-9]{6})([A-Z0-9]{2})([A-Z0-9]{4})([A-Z0-9]{4})$/, '$1 $2 $3 $4 $5');
      }
      return trackingNumber;
    
    case CARRIERS.DPD:
      // DPD: XXXX XXXX XXXX XX
      return trackingNumber.replace(/(\d{4})(?=\d)/g, '$1 ').trim();
    
    default:
      return trackingNumber;
  }
};

/**
 * Extrahiert Anbieter-spezifische Informationen
 */
export const getCarrierInfo = (carrier) => {
  const carrierInfo = {
    [CARRIERS.DHL]: {
      name: 'DHL',
      fullName: 'DHL Deutschland',
      color: '#FFCC00',
      icon: '📦',
      supportUrl: 'https://www.dhl.de/de/privatkunden/hilfe-kundenservice.html',
      estimatedDeliveryDays: '1-2'
    },
    [CARRIERS.HERMES]: {
      name: 'Hermes',
      fullName: 'Hermes Germany',
      color: '#0066CC',
      icon: '🚚',
      supportUrl: 'https://www.myhermes.de/kundenservice/',
      estimatedDeliveryDays: '1-3'
    },
    [CARRIERS.UPS]: {
      name: 'UPS',
      fullName: 'United Parcel Service',
      color: '#8B4513',
      icon: '📮',
      supportUrl: 'https://www.ups.com/de/de/help-support-center.page',
      estimatedDeliveryDays: '1-2'
    },
    [CARRIERS.DPD]: {
      name: 'DPD',
      fullName: 'Dynamic Parcel Distribution',
      color: '#D50000',
      icon: '🚛',
      supportUrl: 'https://www.dpd.com/de/de/kundenservice/',
      estimatedDeliveryDays: '1-2'
    },
    [CARRIERS.GLS]: {
      name: 'GLS',
      fullName: 'General Logistics Systems',
      color: '#0066CC',
      icon: '📫',
      supportUrl: 'https://gls-group.eu/DE/de/kundenservice',
      estimatedDeliveryDays: '1-3'
    }
  };
  
  return carrierInfo[carrier] || {
    name: carrier.toUpperCase(),
    fullName: carrier.toUpperCase(),
    color: '#666666',
    icon: '📦',
    supportUrl: '',
    estimatedDeliveryDays: '1-5'
  };
};

/**
 * Schätzt Lieferdatum basierend auf Anbieter und Versanddatum
 */
export const estimateDeliveryDate = (carrier, shippingDate) => {
  if (!shippingDate) return null;
  
  const carrierInfo = getCarrierInfo(carrier);
  const deliveryDays = parseInt(carrierInfo.estimatedDeliveryDays.split('-')[1]) || 3;
  
  const estimatedDate = new Date(shippingDate);
  estimatedDate.setDate(estimatedDate.getDate() + deliveryDays);
  
  // Wochenende überspringen
  while (estimatedDate.getDay() === 0 || estimatedDate.getDay() === 6) {
    estimatedDate.setDate(estimatedDate.getDate() + 1);
  }
  
  return estimatedDate;
};

/**
 * Status-Mapping für einheitliche Darstellung
 */
export const TRACKING_STATUS = {
  LABEL_CREATED: 'label_created',
  PICKED_UP: 'picked_up',
  IN_TRANSIT: 'in_transit',
  OUT_FOR_DELIVERY: 'out_for_delivery',
  DELIVERED: 'delivered',
  EXCEPTION: 'exception',
  RETURNED: 'returned'
};

export const getStatusInfo = (status) => {
  const statusInfo = {
    [TRACKING_STATUS.LABEL_CREATED]: {
      label: 'Versandlabel erstellt',
      icon: '🏷️',
      color: 'info',
      description: 'Das Paket wurde beim Versanddienstleister angemeldet'
    },
    [TRACKING_STATUS.PICKED_UP]: {
      label: 'Abgeholt',
      icon: '📦',
      color: 'primary',
      description: 'Das Paket wurde vom Versanddienstleister abgeholt'
    },
    [TRACKING_STATUS.IN_TRANSIT]: {
      label: 'Unterwegs',
      icon: '🚚',
      color: 'warning',
      description: 'Das Paket ist auf dem Weg zum Ziel'
    },
    [TRACKING_STATUS.OUT_FOR_DELIVERY]: {
      label: 'Wird zugestellt',
      icon: '🚛',
      color: 'secondary',
      description: 'Das Paket wird heute zugestellt'
    },
    [TRACKING_STATUS.DELIVERED]: {
      label: 'Zugestellt',
      icon: '✅',
      color: 'success',
      description: 'Das Paket wurde erfolgreich zugestellt'
    },
    [TRACKING_STATUS.EXCEPTION]: {
      label: 'Problem',
      icon: '⚠️',
      color: 'error',
      description: 'Es gab ein Problem bei der Zustellung'
    },
    [TRACKING_STATUS.RETURNED]: {
      label: 'Retour',
      icon: '🔄',
      color: 'error',
      description: 'Das Paket wird zurückgesendet'
    }
  };
  
  return statusInfo[status] || {
    label: 'Unbekannt',
    icon: '❓',
    color: 'default',
    description: 'Status unbekannt'
  };
};

export default {
  CARRIERS,
  generateTrackingUrl,
  validateTrackingNumber,
  formatTrackingNumber,
  getCarrierInfo,
  estimateDeliveryDate,
  TRACKING_STATUS,
  getStatusInfo
};