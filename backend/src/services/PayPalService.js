const paypal = require('@paypal/checkout-server-sdk');

class PayPalService {
  constructor() {
    console.log('💳 PayPal Service initialisiert');
    console.log('💳 NODE_ENV:', process.env.NODE_ENV);
    console.log('💳 PAYPAL_CLIENT_ID:', process.env.PAYPAL_CLIENT_ID ? 'Gesetzt' : 'NICHT GESETZT');
    console.log('💳 PAYPAL_CLIENT_SECRET:', process.env.PAYPAL_CLIENT_SECRET ? 'Gesetzt' : 'NICHT GESETZT');
    
    // PayPal API Client mit bewährter alter SDK
    const environment = process.env.NODE_ENV === 'production' 
      ? new paypal.core.LiveEnvironment(process.env.PAYPAL_CLIENT_ID, process.env.PAYPAL_CLIENT_SECRET)
      : new paypal.core.SandboxEnvironment(process.env.PAYPAL_CLIENT_ID, process.env.PAYPAL_CLIENT_SECRET);
      
    this.client = new paypal.core.PayPalHttpClient(environment);
  }

  // 💳 PayPal-Zahlung erstellen
  async createPayment(orderData) {
    try {
      console.log('💳 Erstelle PayPal-Zahlung für Bestellung:', orderData.bestellnummer);
      console.log('📦 PayPal Artikel-Daten:', JSON.stringify(orderData.artikel, null, 2));

      // Validierung der Input-Daten
      if (!orderData.artikel || !Array.isArray(orderData.artikel) || orderData.artikel.length === 0) {
        throw new Error('Keine Artikel in der Bestellung gefunden');
      }

      // Artikel für PayPal formatieren
      const items = orderData.artikel.map((artikel, index) => {
        console.log(`🔍 Verarbeite Artikel ${index}:`, JSON.stringify(artikel, null, 2));
        
        // Validierung der Pflichtfelder
        const name = artikel.name || artikel.titel || artikel.produktname;
        const preis = artikel.preis || artikel.price || 0;
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

      // Berechnung
      const itemTotal = orderData.artikel.reduce((sum, artikel) => sum + (artikel.preis * artikel.menge), 0);
      const versandkosten = orderData.versandkosten || 0;
      const steuer = orderData.gesamt.mwst || 0;
      const gesamtbetrag = orderData.gesamt.brutto;

      const orderRequest = {
        intent: 'CAPTURE',
        application_context: {
          brand_name: 'Glücksmomente Manufaktur',
          locale: 'de-DE',
          landing_page: 'BILLING',
          shipping_preference: 'SET_PROVIDED_ADDRESS',
          user_action: 'PAY_NOW',
          return_url: `${process.env.FRONTEND_URL}/checkout/success?bestellnummer=${orderData.bestellnummer}`,
          cancel_url: `${process.env.FRONTEND_URL}/checkout/cancel?bestellnummer=${orderData.bestellnummer}`
        },
        purchase_units: [{
          reference_id: orderData.bestellnummer,
          description: `Bestellung ${orderData.bestellnummer}`,
          custom_id: orderData.bestellnummer,
          amount: {
            currency_code: 'EUR',
            value: gesamtbetrag.toFixed(2),
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
              full_name: `${orderData.lieferadresse.vorname} ${orderData.lieferadresse.nachname}`
            },
            address: {
              address_line_1: `${orderData.lieferadresse.strasse} ${orderData.lieferadresse.hausnummer}`,
              address_line_2: orderData.lieferadresse.zusatz || '',
              admin_area_2: orderData.lieferadresse.stadt,
              postal_code: orderData.lieferadresse.plz,
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
        paypalOrderId: result.id,
        approvalUrl: approvalLink ? approvalLink.href : null,
        status: result.status
      };

    } catch (error) {
      console.error('❌ Fehler beim Erstellen der PayPal-Zahlung:', error);
      throw new Error('PayPal-Zahlung konnte nicht erstellt werden: ' + error.message);
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
        paypalOrderId: result.id,
        status: result.status,
        captureId: result.purchase_units?.[0]?.payments?.captures?.[0]?.id,
        amount: result.purchase_units?.[0]?.payments?.captures?.[0]?.amount,
        transactionId: result.purchase_units?.[0]?.payments?.captures?.[0]?.id
      };

    } catch (error) {
      console.error('❌ Fehler beim Erfassen der PayPal-Zahlung:', error);
      throw new Error('PayPal-Zahlung konnte nicht erfasst werden: ' + error.message);
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