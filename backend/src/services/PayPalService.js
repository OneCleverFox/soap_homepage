const paypal = require('@paypal/checkout-server-sdk');
const AdminSettings = require('../models/AdminSettings');

class PayPalService {
  constructor() {
    // Stille Initialisierung
    this.currentConfig = null;
    this.client = null;
  }

  // � PayPal Client mit Admin-Einstellungen und Umgebungsvariablen aktualisieren
  async updateClientFromSettings() {
    try {
      const settings = await AdminSettings.getInstance();
      const dbConfig = settings.getPayPalConfig();
      
      // Prüfe ob PayPal in Admin-Einstellungen deaktiviert ist
      if (!dbConfig.enabled) {
        this.currentConfig = { enabled: false };
        return false;
      }
      
      // Bestimme Credentials aus Umgebungsvariablen basierend auf dem Modus
      let clientId, clientSecret, isLive;
      
      if (dbConfig.mode === 'live') {
        clientId = process.env.PAYPAL_LIVE_CLIENT_ID;
        clientSecret = process.env.PAYPAL_LIVE_CLIENT_SECRET;
        isLive = true;
      } else {
        clientId = process.env.PAYPAL_SANDBOX_CLIENT_ID || process.env.PAYPAL_CLIENT_ID;
        clientSecret = process.env.PAYPAL_SANDBOX_CLIENT_SECRET || process.env.PAYPAL_CLIENT_SECRET;
        isLive = false;
      }
      
      // Prüfe ob Credentials in Umgebungsvariablen vorhanden sind
      if (!clientId || !clientSecret) {
        this.currentConfig = { enabled: false };
        return false;
      }
      
      const environment = isLive 
        ? new paypal.core.LiveEnvironment(clientId, clientSecret)
        : new paypal.core.SandboxEnvironment(clientId, clientSecret);
        
      this.client = new paypal.core.PayPalHttpClient(environment);
      this.currentConfig = {
        enabled: true,
        mode: dbConfig.mode,
        isLive: isLive
      };
      
      console.log(`✅ PayPal Client erfolgreich konfiguriert - Modus: ${dbConfig.mode}`);
      return true;
    } catch (error) {
      console.error('❌ Fehler beim Aktualisieren des PayPal Clients:', error);
      this.currentConfig = { enabled: false };
      return false;
    }
  }

  // 🔍 PayPal-Status prüfen
  async isEnabled() {
    await this.updateClientFromSettings();
    return this.currentConfig?.enabled || false;
  }

  // 💳 PayPal-Zahlung erstellen (mit dynamischer Konfiguration)
  async createPayment(orderData) {
    try {
      // Client mit aktuellen Admin-Einstellungen aktualisieren
      const isConfigured = await this.updateClientFromSettings();
      
      if (!isConfigured) {
        throw new Error('PayPal ist nicht konfiguriert oder deaktiviert');
      }
      
      console.log('💳 Erstelle PayPal-Zahlung für Bestellung:', orderData.bestellnummer);
      console.log(`💳 PayPal Modus: ${this.currentConfig.mode}`);
      console.log('📦 PayPal Artikel-Daten:', JSON.stringify(orderData.items || orderData.artikel, null, 2));

      // Flexibler Zugriff auf Artikel-Daten
      const artikel = orderData.items || orderData.artikel;

      // Validierung der Input-Daten
      if (!artikel || !Array.isArray(artikel) || artikel.length === 0) {
        throw new Error('Keine Artikel in der Bestellung gefunden');
      }

      // Artikel für PayPal formatieren
      const items = artikel.map((artikel, index) => {
        console.log(`🔍 Verarbeite Artikel ${index}:`, JSON.stringify(artikel, null, 2));
        
        // Flexiblere Validierung der Pflichtfelder
        const name = artikel.name || artikel.titel || artikel.produktname || 
                    artikel.produktSnapshot?.name || 'Unbekanntes Produkt';
        const preis = artikel.preis || artikel.price || artikel.einzelpreis || 0;
        const menge = artikel.menge || artikel.quantity || 1;
        
        if (!name || name.trim() === '') {
          throw new Error(`Artikel ${index} hat keinen gültigen Namen: ${JSON.stringify(artikel)}`);
        }
        
        if (!preis || isNaN(parseFloat(preis)) || parseFloat(preis) <= 0) {
          throw new Error(`Artikel ${index} hat keinen gültigen Preis: ${preis}`);
        }
        
        if (!menge || isNaN(parseInt(menge)) || parseInt(menge) <= 0) {
          throw new Error(`Artikel ${index} hat keine gültige Menge: ${menge}`);
        }
        
        const itemData = {
          name: name.trim(),
          description: typeof artikel.beschreibung === 'string' 
            ? artikel.beschreibung.trim() 
            : (artikel.beschreibung?.kurz || artikel.description || '').toString().trim(),
          unit_amount: {
            currency_code: 'EUR',
            value: parseFloat(preis).toFixed(2)
          },
          quantity: parseInt(menge).toString()
        };
        
        console.log(`✅ Item ${index} für PayPal:`, JSON.stringify(itemData, null, 2));
        return itemData;
      });
      
      console.log('🏷️ PayPal Items:', JSON.stringify(items, null, 2));

      // Berechnung mit flexibler Artikel-Zugriff
      const artikelItems = orderData.items || orderData.artikel;
      
      console.log('🔍 Debug artikelItems:', {
        itemsVorhanden: !!orderData.items,
        artikelVorhanden: !!orderData.artikel,
        artikelItemsVorhanden: !!artikelItems,
        artikelItemsType: typeof artikelItems,
        artikelItemsIsArray: Array.isArray(artikelItems)
      });

      if (!artikelItems || !Array.isArray(artikelItems)) {
        throw new Error(`Keine gültigen Artikel-Daten gefunden. Items: ${!!orderData.items}, Artikel: ${!!orderData.artikel}`);
      }

      const itemTotal = artikelItems.reduce((sum, artikel) => {
        const preis = artikel.preis || artikel.price || artikel.einzelpreis || 0;
        const menge = artikel.menge || artikel.quantity || 1;
        return sum + (preis * menge);
      }, 0);
      
      const versandkosten = orderData.versandkosten || orderData.shipping || 0;
      const originalSteuer = orderData.gesamt?.mwst || orderData.tax || 0;
      const gesamtbetrag = orderData.gesamt?.brutto || orderData.total || orderData.gesamtsumme;

      // Intelligente Steuerbehandlung: 
      // Wenn gesamtbetrag ≈ itemTotal, dann sind Preise inkl. Steuer
      // Wenn gesamtbetrag ≈ itemTotal + steuer, dann sind Preise exkl. Steuer
      const istInklusivSteuer = Math.abs(gesamtbetrag - itemTotal) < Math.abs(gesamtbetrag - (itemTotal + originalSteuer));
      
      const steuer = istInklusivSteuer ? 0 : originalSteuer;
      const berechneteGesamtsumme = itemTotal + versandkosten + steuer;

      console.log('💰 PayPal Berechnungen:', {
        itemTotal: itemTotal,
        versandkosten: versandkosten,
        originalSteuer: originalSteuer,
        steuerBehandlung: istInklusivSteuer ? 'INKLUSIVE (bereits in Preisen enthalten)' : 'EXKLUSIVE (wird hinzugefügt)',
        verwendeteSteuer: steuer,
        originalGesamtbetrag: gesamtbetrag,
        berechneteGesamtsumme: berechneteGesamtsumme,
        differenz: Math.abs(gesamtbetrag - berechneteGesamtsumme),
        orderDataStructure: {
          hasItems: !!orderData.items,
          hasArtikel: !!orderData.artikel,
          itemsLength: orderData.items?.length || 0,
          artikelLength: orderData.artikel?.length || 0
        }
      });

      // Verwende die berechnete Gesamtsumme wenn sie mit der originalen übereinstimmt
      const finalGesamtbetrag = Math.abs(gesamtbetrag - berechneteGesamtsumme) < 0.01 ? 
        gesamtbetrag : berechneteGesamtsumme;

      console.log('📍 PayPal Adressdaten:', {
        hasLieferadresse: !!orderData.lieferadresse,
        vorname: orderData.lieferadresse?.vorname,
        nachname: orderData.lieferadresse?.nachname,
        strasse: orderData.lieferadresse?.strasse,
        hausnummer: orderData.lieferadresse?.hausnummer,
        stadt: orderData.lieferadresse?.stadt,
        plz: orderData.lieferadresse?.plz
      });

      const orderRequest = {
        intent: 'CAPTURE',
        application_context: {
          brand_name: 'Glücksmomente Manufaktur',
          locale: 'de-DE',
          landing_page: 'BILLING',
          shipping_preference: 'SET_PROVIDED_ADDRESS',
          user_action: 'PAY_NOW',
          return_url: orderData.returnUrl || `${process.env.FRONTEND_URL}/checkout/success?bestellnummer=${orderData.bestellnummer}`,
          cancel_url: orderData.cancelUrl || `${process.env.FRONTEND_URL}/checkout/cancel?bestellnummer=${orderData.bestellnummer}`
        },
        purchase_units: [{
          reference_id: orderData.bestellnummer,
          description: `Bestellung ${orderData.bestellnummer}`,
          custom_id: orderData.bestellnummer,
          amount: {
            currency_code: 'EUR',
            value: finalGesamtbetrag.toFixed(2),
            breakdown: {
              item_total: {
                currency_code: 'EUR',
                value: itemTotal.toFixed(2)
              },
              shipping: {
                currency_code: 'EUR',
                value: versandkosten.toFixed(2)
              },
              tax_total: {
                currency_code: 'EUR',
                value: steuer.toFixed(2)
              }
            }
          },
          items: items,
          shipping: {
            name: {
              full_name: `${orderData.lieferadresse?.vorname || 'Kunde'} ${orderData.lieferadresse?.nachname || ''}`.trim()
            },
            address: {
              address_line_1: `${orderData.lieferadresse?.strasse || ''} ${orderData.lieferadresse?.hausnummer || ''}`.trim() || 'Nicht angegeben',
              address_line_2: orderData.lieferadresse?.zusatz || '',
              admin_area_2: orderData.lieferadresse?.stadt || 'Nicht angegeben',
              postal_code: orderData.lieferadresse?.plz || '00000',
              country_code: 'DE'
            }
          }
        }]
      };

      const request = new paypal.orders.OrdersCreateRequest();
      request.requestBody(orderRequest);

      const response = await this.client.execute(request);
      const result = response.result;
      
      console.log('✅ PayPal-Zahlung erstellt:', result.id);
      
      // Approval-Link finden
      const approvalLink = result.links.find(link => link.rel === 'approve');
      
      return {
        success: true,
        paypalOrderId: result.id,
        approvalUrl: approvalLink ? approvalLink.href : null,
        status: result.status
      };

    } catch (error) {
      console.error('❌ Fehler beim Erstellen der PayPal-Zahlung:', error);
      return {
        success: false,
        error: error.message || 'Unbekannter PayPal-Fehler',
        paypalOrderId: null,
        approvalUrl: null
      };
    }
  }

  // ✅ PayPal-Zahlung erfassen
  async capturePayment(paypalOrderId) {
    try {
      console.log('✅ Erfasse PayPal-Zahlung:', paypalOrderId);

      const request = new paypal.orders.OrdersCaptureRequest(paypalOrderId);
      request.requestBody({});

      const response = await this.client.execute(request);
      const result = response.result;
      
      console.log('💰 PayPal-Zahlung erfasst:', result.id);
      
      return {
        success: true,
        paypalOrderId: result.id,
        status: result.status,
        captureId: result.purchase_units?.[0]?.payments?.captures?.[0]?.id,
        amount: result.purchase_units?.[0]?.payments?.captures?.[0]?.amount,
        transactionId: result.purchase_units?.[0]?.payments?.captures?.[0]?.id,
        id: result.purchase_units?.[0]?.payments?.captures?.[0]?.id // Für Rückwärtskompatibilität
      };

    } catch (error) {
      console.error('❌ Fehler beim Erfassen der PayPal-Zahlung:', error);
      return {
        success: false,
        error: error.message || 'Unbekannter PayPal-Capture-Fehler',
        paypalOrderId: null,
        status: 'FAILED'
      };
    }
  }

  // 💰 PayPal-Rückerstattung erstellen
  async refundPayment(paypalOrderId, amount = null, reason = 'Bestellung storniert') {
    try {
      console.log('💰 Erstelle PayPal-Rückerstattung für Order:', paypalOrderId);
      
      // Client mit aktuellen Admin-Einstellungen aktualisieren
      const isConfigured = await this.updateClientFromSettings();
      
      if (!isConfigured) {
        throw new Error('PayPal ist nicht konfiguriert oder deaktiviert');
      }
      
      // Erst die Bestellung abrufen um die Capture-ID zu finden
      const orderDetails = await this.getPaymentDetails(paypalOrderId);
      console.log('🔍 PayPal Order Details:', JSON.stringify(orderDetails, null, 2));
      
      const captures = orderDetails.purchase_units?.[0]?.payments?.captures;
      if (!captures || captures.length === 0) {
        throw new Error('Keine Capture-Transaktion für diese Bestellung gefunden');
      }
      
      const captureId = captures[0].id;
      const capturedAmount = captures[0].amount;
      
      console.log('💳 Gefundene Capture:', {
        captureId,
        capturedAmount
      });
      
      // Rückerstattungsbetrag bestimmen (Vollrückerstattung wenn nicht angegeben)
      const refundAmount = amount || capturedAmount;
      
      // Rückerstattung erstellen
      const request = new paypal.payments.CapturesRefundRequest(captureId);
      request.requestBody({
        amount: {
          currency_code: refundAmount.currency_code || 'EUR',
          value: typeof refundAmount === 'object' ? refundAmount.value : refundAmount.toString()
        },
        note_to_payer: reason
      });

      const response = await this.client.execute(request);
      const result = response.result;
      
      console.log('✅ PayPal-Rückerstattung erstellt:', {
        refundId: result.id,
        status: result.status,
        amount: result.amount
      });
      
      return {
        success: true,
        refundId: result.id,
        status: result.status,
        amount: result.amount,
        captureId: captureId,
        paypalOrderId: paypalOrderId
      };

    } catch (error) {
      console.error('❌ Fehler beim Erstellen der PayPal-Rückerstattung:', error);
      return {
        success: false,
        error: error.message || 'Unbekannter PayPal-Rückerstattungsfehler',
        refundId: null,
        paypalOrderId: paypalOrderId
      };
    }
  }

  // 🔍 PayPal-Zahlung Details abrufen
  async getPaymentDetails(paypalOrderId) {
    try {
      const request = new paypal.orders.OrdersGetRequest(paypalOrderId);
      const response = await this.client.execute(request);
      
      return response.result;

    } catch (error) {
      console.error('❌ Fehler beim Abrufen der PayPal-Details:', error);
      throw new Error('PayPal-Details konnten nicht abgerufen werden: ' + error.message);
    }
  }

  // 🔄 Webhook-Signatur verifizieren
  async verifyWebhookSignature(headers, body) {
    try {
      // PayPal Webhook-Verifikation
      const request = new paypal.webhooks.VerifyWebhookSignature();
      request.requestBody({
        auth_algo: headers['paypal-auth-algo'],
        cert_id: headers['paypal-cert-id'],
        transmission_id: headers['paypal-transmission-id'],
        transmission_sig: headers['paypal-transmission-sig'],
        transmission_time: headers['paypal-transmission-time'],
        webhook_id: process.env.PAYPAL_WEBHOOK_ID,
        webhook_event: body
      });

      const response = await this.client.execute(request);
      return response.result.verification_status === 'SUCCESS';

    } catch (error) {
      console.error('❌ Fehler bei Webhook-Verifikation:', error);
      return false;
    }
  }
}

module.exports = new PayPalService();