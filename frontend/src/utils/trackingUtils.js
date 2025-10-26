/**
 * Tracking-Utilities für verschiedene Versanddienstleister
 */

export const CARRIERS = {
  DHL: 'dhl',
  HERMES: 'hermes',
  UPS: 'ups',
  DPD: 'dpd',
  GLS: 'gls',
  FEDEX: 'fedex'
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
    [CARRIERS.GLS]: `https://gls-group.eu/DE/de/paketverfolgung?match=${trackingNumber}`,
    [CARRIERS.FEDEX]: `https://www.fedex.com/fedextrack/?trknbr=${trackingNumber}`
  };
  
  return trackingUrls[carrier] || '';
};

/**
 * Validiert Tracking-Nummern basierend auf Versanddienstleister-Formaten
 * Erweiterte Validierung nach internationalen Standards
 */
export const validateTrackingNumber = (carrier, trackingNumber) => {
  if (!trackingNumber) return { valid: false, message: 'Tracking-Nummer ist erforderlich' };
  
  // Entferne Leerzeichen und Bindestriche für Validierung
  const cleanNumber = trackingNumber.replace(/[\s-]/g, '');
  
  const validationRules = {
    [CARRIERS.DHL]: {
      // DHL: Standard-Sendung (12 oder 20 Stellen), Express (10-11 Stellen), International (13-22 Stellen)
      pattern: /^([0-9]{10,12}|[0-9]{20}|[A-Z]{2}[0-9A-Z]{9,18}[A-Z]{2})$/,
      message: 'DHL: Standard (12 oder 20 Ziffern), Express (10-11 Ziffern), oder International (z.B. GH1234567890DE)'
    },
    [CARRIERS.HERMES]: {
      // Hermes: H/T + 12-14 Ziffern
      pattern: /^[HT][0-9]{12,14}$/,
      message: 'Hermes: H oder T gefolgt von 12-14 Ziffern'
    },
    [CARRIERS.UPS]: {
      // UPS: 1Z + 16 alphanumerische Zeichen ODER T + 9 Ziffern
      pattern: /^(1Z[A-Z0-9]{16}|T[0-9]{9})$/,
      message: 'UPS: 1Z + 16 Zeichen (z.B. 1Z999AA10123456784) oder T + 9 Ziffern'
    },
    [CARRIERS.DPD]: {
      // DPD: 14 Ziffern
      pattern: /^[0-9]{14}$/,
      message: 'DPD: Genau 14 Ziffern'
    },
    [CARRIERS.GLS]: {
      // GLS: 11 Ziffern
      pattern: /^[0-9]{11}$/,
      message: 'GLS: Genau 11 Ziffern'
    },
    [CARRIERS.FEDEX]: {
      // FedEx: 12-14 Ziffern (alle numerisch)
      pattern: /^[0-9]{12,14}$/,
      message: 'FedEx: 12-14 Ziffern (z.B. 123456789012)'
    }
  };
  
  const rule = validationRules[carrier];
  if (!rule) {
    return { valid: true, message: '' }; // Unbekannte Anbieter werden als gültig akzeptiert
  }
  
  const isValid = rule.pattern.test(cleanNumber);
  return {
    valid: isValid,
    message: isValid ? '' : rule.message,
    formattedNumber: isValid ? formatTrackingNumber(carrier, cleanNumber) : trackingNumber
  };
};

/**
 * Formatiert Tracking-Nummern für bessere Lesbarkeit
 */
export const formatTrackingNumber = (carrier, trackingNumber) => {
  if (!trackingNumber) return '';
  
  // Entferne bereits vorhandene Leerzeichen
  const clean = trackingNumber.replace(/[\s-]/g, '');
  
  switch (carrier) {
    case CARRIERS.DHL:
      // DHL: Standard 12-stellig: XXXX XXXX XXXX
      if (/^[0-9]{12}$/.test(clean)) {
        return clean.replace(/(\d{4})(\d{4})(\d{4})/, '$1 $2 $3');
      }
      // DHL: Standard 20-stellig: XX XXXXXX XXXX XXXX X
      if (/^[0-9]{20}$/.test(clean)) {
        return clean.replace(/(\d{2})(\d{6})(\d{4})(\d{4})(\d{4})/, '$1 $2 $3 $4 $5');
      }
      // DHL: Express 10-11 stellig: XXXX XXXX XX
      if (/^[0-9]{10,11}$/.test(clean)) {
        return clean.replace(/(\d{4})(\d{4})(\d{2,3})/, '$1 $2 $3');
      }
      // DHL: International AA123456789DE Format
      if (/^[A-Z]{2}[0-9A-Z]{9,18}[A-Z]{2}$/.test(clean)) {
        const start = clean.slice(0, 2);
        const middle = clean.slice(2, -2);
        const end = clean.slice(-2);
        return `${start} ${middle} ${end}`;
      }
      return clean;
    
    case CARRIERS.UPS:
      // UPS: 1Z XXXXXX XX XXXX XXXX
      if (clean.startsWith('1Z') && clean.length === 18) {
        return clean.replace(/^(1Z)([A-Z0-9]{6})([A-Z0-9]{2})([A-Z0-9]{4})([A-Z0-9]{4})$/, '$1 $2 $3 $4 $5');
      }
      // UPS: T123456789 Format
      if (clean.startsWith('T') && clean.length === 10) {
        return clean.replace(/^(T)([0-9]{9})$/, '$1 $2');
      }
      return clean;
    
    case CARRIERS.DPD:
      // DPD: XXXX XXXX XXXX XX (14 Ziffern)
      if (/^[0-9]{14}$/.test(clean)) {
        return clean.replace(/(\d{4})(\d{4})(\d{4})(\d{2})/, '$1 $2 $3 $4');
      }
      return clean;
    
    case CARRIERS.FEDEX:
      // FedEx: XXXX XXXX XXXX (12 Ziffern) oder XXXX XXXX XXXX XX (14 Ziffern)
      if (/^[0-9]{12}$/.test(clean)) {
        return clean.replace(/(\d{4})(\d{4})(\d{4})/, '$1 $2 $3');
      }
      if (/^[0-9]{14}$/.test(clean)) {
        return clean.replace(/(\d{4})(\d{4})(\d{4})(\d{2})/, '$1 $2 $3 $4');
      }
      return clean;
    
    case CARRIERS.GLS:
      // GLS: XXXX XXXX XXX (11 Ziffern)
      if (/^[0-9]{11}$/.test(clean)) {
        return clean.replace(/(\d{4})(\d{4})(\d{3})/, '$1 $2 $3');
      }
      return clean;
    
    case CARRIERS.HERMES:
      // Hermes: H XXXX XXXX XXXX XX (13-15 Zeichen)
      if (/^[HT][0-9]{12,14}$/.test(clean)) {
        const prefix = clean.charAt(0);
        const numbers = clean.slice(1);
        return `${prefix} ${numbers.replace(/(\d{4})(?=\d)/g, '$1 ').trim()}`;
      }
      return clean;
    
    default:
      return clean;
  }
};

/**
 * Automatische Erkennung des Versandanbieters basierend auf der Tracking-Nummer
 */
export const detectCarrier = (trackingNumber) => {
  if (!trackingNumber) return null;
  
  const clean = trackingNumber.replace(/[\s-]/g, '');
  
  // UPS: Beginnt mit 1Z und 18 Zeichen total ODER T + 9 Ziffern
  if (/^1Z[A-Z0-9]{16}$/.test(clean) || /^T[0-9]{9}$/.test(clean)) {
    return CARRIERS.UPS;
  }
  
  // DHL: Standard (12 oder 20 Ziffern), Express (10-11 Ziffern), International (AA123...DE)
  if (/^[0-9]{10,12}$/.test(clean) || /^[0-9]{20}$/.test(clean) || /^[A-Z]{2}[0-9A-Z]{9,18}[A-Z]{2}$/.test(clean)) {
    return CARRIERS.DHL;
  }
  
  // Hermes: H oder T + 12-14 Ziffern
  if (/^[HT][0-9]{12,14}$/.test(clean)) {
    return CARRIERS.HERMES;
  }
  
  // DPD: Genau 14 Ziffern
  if (/^[0-9]{14}$/.test(clean)) {
    return CARRIERS.DPD;
  }
  
  // FedEx: 12-13 Ziffern (wenn nicht DPD)
  if (/^[0-9]{12,13}$/.test(clean)) {
    return CARRIERS.FEDEX;
  }
  
  // GLS: Genau 11 Ziffern
  if (/^[0-9]{11}$/.test(clean)) {
    return CARRIERS.GLS;
  }
  
  return null; // Unbekannter Anbieter
};

/**
 * Validiert Tracking-Nummer mit automatischer Anbieter-Erkennung
 */
export const validateTrackingNumberAuto = (trackingNumber) => {
  if (!trackingNumber || trackingNumber.trim().length === 0) {
    return { valid: false, message: 'Tracking-Nummer ist erforderlich', carrier: null };
  }
  
  const detectedCarrier = detectCarrier(trackingNumber);
  if (!detectedCarrier) {
    return { 
      valid: false, 
      message: 'Versandanbieter konnte nicht erkannt werden', 
      carrier: null 
    };
  }
  
  const validation = validateTrackingNumber(detectedCarrier, trackingNumber);
  return {
    ...validation,
    carrier: detectedCarrier
  };
};

/**
 * Erweiterte Informationen über Versandanbieter
 */
export const getCarrierInfo = (carrier) => {
  const carrierData = {
    [CARRIERS.DHL]: {
      name: 'DHL',
      fullName: 'DHL Express',
      website: 'https://www.dhl.de',
      color: '#FFCC00',
      icon: '📦',
      estimatedDays: '1-3'
    },
    [CARRIERS.HERMES]: {
      name: 'Hermes',
      fullName: 'Hermes Germany',
      website: 'https://www.myhermes.de',
      color: '#3056A0',
      icon: '📦',
      estimatedDays: '2-4'
    },
    [CARRIERS.UPS]: {
      name: 'UPS',
      fullName: 'United Parcel Service',
      website: 'https://www.ups.com',
      color: '#8B4513',
      icon: '📦',
      estimatedDays: '1-3'
    },
    [CARRIERS.DPD]: {
      name: 'DPD',
      fullName: 'Dynamic Parcel Distribution',
      website: 'https://www.dpd.com',
      color: '#DC143C',
      icon: '📦',
      estimatedDays: '1-2'
    },
    [CARRIERS.GLS]: {
      name: 'GLS',
      fullName: 'General Logistics Systems',
      website: 'https://gls-group.eu',
      color: '#003875',
      icon: '📦',
      estimatedDays: '1-3'
    },
    [CARRIERS.FEDEX]: {
      name: 'FedEx',
      fullName: 'Federal Express',
      website: 'https://www.fedex.com',
      color: '#4B0082',
      icon: '📦',
      estimatedDays: '1-2'
    }
  };
  
  return carrierData[carrier] || {
    name: 'Unbekannt',
    fullName: 'Unbekannter Anbieter',
    website: '',
    color: '#666666',
    icon: '❓',
    estimatedDays: 'Unbekannt'
  };
};

/**
 * Schätzt Lieferdatum basierend auf Versandanbieter
 */
export const estimateDeliveryDate = (carrier, shippedDate = new Date()) => {
  const carrierInfo = getCarrierInfo(carrier);
  const estimatedDays = parseInt(carrierInfo.estimatedDays.split('-')[1]) || 3;
  
  const deliveryDate = new Date(shippedDate);
  deliveryDate.setDate(deliveryDate.getDate() + estimatedDays);
  
  return deliveryDate;
};

/**
 * Tracking Status Konstanten
 */
export const TRACKING_STATUS = {
  PENDING: 'pending',
  IN_TRANSIT: 'in_transit', 
  OUT_FOR_DELIVERY: 'out_for_delivery',
  DELIVERED: 'delivered',
  EXCEPTION: 'exception',
  RETURNED: 'returned'
};

/**
 * Status-Informationen für UI
 */
export const getStatusInfo = (status) => {
  const statusInfo = {
    [TRACKING_STATUS.PENDING]: {
      label: 'Wartend',
      icon: '⏳',
      color: 'default',
      description: 'Das Paket wurde noch nicht abgeholt'
    },
    [TRACKING_STATUS.IN_TRANSIT]: {
      label: 'Unterwegs',
      icon: '🚚',
      color: 'info',
      description: 'Das Paket ist auf dem Weg zum Zielort'
    },
    [TRACKING_STATUS.OUT_FOR_DELIVERY]: {
      label: 'Wird zugestellt',
      icon: '🚛',
      color: 'warning',
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