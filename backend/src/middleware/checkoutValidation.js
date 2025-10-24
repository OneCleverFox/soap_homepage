const AdminSettings = require('../models/AdminSettings');

// Middleware: Checkout-Status prüfen
const validateCheckoutStatus = async (req, res, next) => {
  try {
    const settings = await AdminSettings.getInstance();
    const checkoutConfig = settings.checkout;
    const shopConfig = settings.shop;
    
    console.log('🔍 Checkout-Validierung:', {
      checkoutMode: checkoutConfig.mode,
      shopStatus: shopConfig.status,
      endpoint: req.route.path
    });
    
    // Shop-Status prüfen
    if (shopConfig.status === 'closed') {
      return res.status(503).json({
        success: false,
        message: 'Der Shop ist derzeit geschlossen.',
        statusMessage: shopConfig.statusMessage || 'Wir sind momentan nicht verfügbar.',
        redirectTo: 'shop-closed'
      });
    }
    
    if (shopConfig.status === 'maintenance') {
      return res.status(503).json({
        success: false,
        message: 'Der Shop ist derzeit in Wartung.',
        statusMessage: shopConfig.statusMessage || 'Wir führen Wartungsarbeiten durch.',
        redirectTo: 'maintenance'
      });
    }
    
    // Checkout-Modus prüfen
    if (checkoutConfig.mode === 'disabled') {
      return res.status(503).json({
        success: false,
        message: 'Der Checkout ist derzeit deaktiviert.',
        statusMessage: checkoutConfig.maintenanceMessage || 'Bestellungen sind momentan nicht möglich.',
        redirectTo: 'checkout-disabled'
      });
    }
    
    // Anfrage-Modus: Nur Anfragen erlauben, keine direkten Bestellungen
    if (checkoutConfig.mode === 'inquiry') {
      // Prüfen ob es eine PayPal-Zahlung ist (nicht erlaubt im Anfrage-Modus)
      if (req.route.path.includes('/payment') || req.route.path.includes('/paypal')) {
        return res.status(403).json({
          success: false,
          message: 'Im Anfrage-Modus sind keine direkten Zahlungen möglich.',
          statusMessage: 'Bitte senden Sie uns eine Anfrage. Wir melden uns bei Ihnen.',
          redirectTo: 'inquiry-mode'
        });
      }
      
      // Bei Bestellerstellung: Als Anfrage markieren
      if (req.route.path.includes('/create')) {
        req.isInquiryMode = true;
        console.log('📝 Anfrage-Modus aktiv: Bestellung wird als Anfrage behandelt');
      }
    }
    
    // Urlaubsmodus: Warnung, aber Bestellungen erlauben
    if (shopConfig.status === 'vacation') {
      // Info an Frontend weitergeben
      req.vacationMode = {
        active: true,
        message: shopConfig.vacationMode?.autoMessage || 'Wir sind im Urlaub. Bestellungen werden nach unserer Rückkehr bearbeitet.',
        startDate: shopConfig.vacationMode?.startDate,
        endDate: shopConfig.vacationMode?.endDate
      };
    }
    
    next();
  } catch (error) {
    console.error('❌ Fehler bei Checkout-Validierung:', error);
    // Bei Fehler: Checkout erlauben (Fail-Safe)
    next();
  }
};

// Middleware: PayPal-Status prüfen
const validatePayPalStatus = async (req, res, next) => {
  try {
    const settings = await AdminSettings.getInstance();
    const paypalConfig = settings.paypal;
    
    console.log('💳 PayPal-Validierung:', {
      mode: paypalConfig.mode,
      endpoint: req.route.path
    });
    
    if (paypalConfig.mode === 'disabled') {
      return res.status(503).json({
        success: false,
        message: 'PayPal-Zahlungen sind derzeit deaktiviert.',
        statusMessage: 'Bitte wählen Sie eine andere Zahlungsmethode oder kontaktieren Sie uns.',
        redirectTo: 'paypal-disabled'
      });
    }
    
    // PayPal-Modus an Request anhängen
    req.paypalMode = paypalConfig.mode;
    
    next();
  } catch (error) {
    console.error('❌ Fehler bei PayPal-Validierung:', error);
    // Bei Fehler: PayPal erlauben (Fail-Safe)
    next();
  }
};

module.exports = {
  validateCheckoutStatus,
  validatePayPalStatus
};