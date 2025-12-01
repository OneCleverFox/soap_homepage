/**
 * Backend Tracking-Validierung für Sendungsnummern
 * Validiert Tracking-Nummern basierend auf Versanddienstleister-Formaten
 */

const CARRIERS = {
  DHL: 'dhl',
  HERMES: 'hermes', 
  UPS: 'ups',
  DPD: 'dpd',
  GLS: 'gls',
  FEDEX: 'fedex'
};

/**
 * Validiert Tracking-Nummern basierend auf internationalen Standards
 */
const validateTrackingNumber = (carrier, trackingNumber) => {
  if (!trackingNumber) {
    return { 
      valid: false, 
      message: 'Tracking-Nummer ist erforderlich' 
    };
  }
  
  // Entferne Leerzeichen und Bindestriche für Validierung
  const cleanNumber = trackingNumber.replace(/[\s-]/g, '');
  
  const validationRules = {
    [CARRIERS.DHL]: {
      // DHL: 10-11 stellig numerisch ODER 3 Buchstaben + 9 Ziffern + 'DE'/'SG'
      pattern: /^([0-9]{10,11}|[A-Z]{3}[0-9]{9}(DE|SG))$/,
      message: 'DHL: 10-11 Ziffern oder Format ABC123456789DE'
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
    return { 
      valid: true, 
      message: '', 
      cleanNumber 
    }; // Unbekannte Anbieter werden als gültig akzeptiert
  }
  
  const isValid = rule.pattern.test(cleanNumber);
  return {
    valid: isValid,
    message: isValid ? '' : rule.message,
    cleanNumber: cleanNumber
  };
};

/**
 * Automatische Erkennung des Versandanbieters basierend auf der Tracking-Nummer
 */
const detectCarrier = (trackingNumber) => {
  if (!trackingNumber) return null;
  
  const clean = trackingNumber.replace(/[\s-]/g, '');
  
  // UPS: Beginnt mit 1Z und 18 Zeichen total ODER T + 9 Ziffern
  if (/^1Z[A-Z0-9]{16}$/.test(clean) || /^T[0-9]{9}$/.test(clean)) {
    return CARRIERS.UPS;
  }
  
  // DHL: 3 Buchstaben + 9 Ziffern + 2 Buchstaben ODER 10-11 Ziffern
  if (/^[A-Z]{3}[0-9]{9}[A-Z]{2}$/.test(clean) || /^[0-9]{10,11}$/.test(clean)) {
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
 * Generiert Tracking-URLs für verschiedene Versanddienstleister
 */
const generateTrackingUrl = (carrier, trackingNumber) => {
  if (!trackingNumber || !carrier) return '';
  
  const cleanNumber = trackingNumber.replace(/[\s-]/g, '');
  
  const trackingUrls = {
    [CARRIERS.DHL]: `https://www.dhl.de/de/privatkunden/pakete-empfangen/verfolgen.html?lang=de&idc=${cleanNumber}`,
    [CARRIERS.HERMES]: `https://www.myhermes.de/empfangen/sendungsverfolgung/sendungsinformation/#${cleanNumber}`,
    [CARRIERS.UPS]: `https://www.ups.com/track?tracknum=${cleanNumber}`,
    [CARRIERS.DPD]: `https://tracking.dpd.de/status/de_DE/parcel/${cleanNumber}`,
    [CARRIERS.GLS]: `https://gls-group.eu/DE/de/paketverfolgung?match=${cleanNumber}`,
    [CARRIERS.FEDEX]: `https://www.fedex.com/fedextrack/?trknbr=${cleanNumber}`
  };
  
  return trackingUrls[carrier] || '';
};

/**
 * Validiert Versanddaten für Order-Updates
 */
const validateShippingData = (versandData) => {
  const errors = [];
  
  if (!versandData) {
    return { valid: false, errors: ['Versanddaten sind erforderlich'] };
  }
  
  const { anbieter, sendungsnummer } = versandData;
  
  if (!anbieter) {
    errors.push('Versandanbieter ist erforderlich');
  }
  
  if (!sendungsnummer) {
    errors.push('Sendungsnummer ist erforderlich');
  }
  
  if (anbieter && sendungsnummer) {
    const validation = validateTrackingNumber(anbieter, sendungsnummer);
    if (!validation.valid) {
      errors.push(`Ungültige Sendungsnummer: ${validation.message}`);
    }
  }
  
  return {
    valid: errors.length === 0,
    errors: errors
  };
};

module.exports = {
  CARRIERS,
  validateTrackingNumber,
  detectCarrier,
  generateTrackingUrl,
  validateShippingData
};