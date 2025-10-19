const { Resend } = require('resend');
const EmailOut = require('../models/EmailOut');

class EmailService {
  constructor() {
    // API-Key aus Umgebungsvariablen laden
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      console.warn('⚠️ RESEND_API_KEY nicht konfiguriert - E-Mail-Service deaktiviert');
      this.isDisabled = true;
      return;
    }
    
    this.resend = new Resend(apiKey);
    
    // Production/Development E-Mail-Konfiguration
    this.environment = process.env.NODE_ENV || 'development';
    this.isProduction = this.environment === 'production';
    this.adminEmail = 'ralle.jacob84@googlemail.com';
    
    // Domain-Konfiguration basierend auf Environment
    if (this.isProduction) {
      this.fromEmail = 'noreply@notifications.gluecksmomente-manufaktur.com';
      this.fromName = 'Glücksmomente Manufaktur';
    } else {
      // Development: Verwende Resend's Onboarding-Domain
      this.fromEmail = 'onboarding@resend.dev';
      this.fromName = 'Glücksmomente Manufaktur (DEV)';
    }
    
    this.isDisabled = false;
    
    console.log(`📧 [EmailService] Initialized for ${this.environment} environment`);
    console.log(`📧 [EmailService] From: ${this.fromName} <${this.fromEmail}>`);
    console.log(`📧 [EmailService] Production Mode: ${this.isProduction}`);
  }

  // E-Mail-Logging in MongoDB
  async logEmail(emailData) {
    try {
      const emailLog = new EmailOut({
        emailType: emailData.type,
        recipient: {
          email: emailData.to,
          name: emailData.recipientName,
          userId: emailData.userId,
          kundeId: emailData.kundeId
        },
        sender: {
          email: this.fromEmail,
          name: this.fromName
        },
        content: {
          subject: emailData.subject,
          htmlBody: emailData.htmlBody,
          textBody: emailData.textBody
        },
        delivery: {
          status: 'pending',
          provider: 'resend'
        },
        contextData: emailData.contextData || {},
        environment: this.environment,
        system: {
          sourceApplication: 'soap_homepage',
          version: process.env.APP_VERSION || '2.0.0'
        }
      });

      await emailLog.save();
      console.log(`📧 [EmailService] Email logged to MongoDB:`, emailLog._id);
      return emailLog;
    } catch (error) {
      console.error('❌ [EmailService] Failed to log email to MongoDB:', error);
      return null;
    }
  }

  // Update E-Mail-Log nach Versand
  async updateEmailLog(emailLogId, result) {
    try {
      const emailLog = await EmailOut.findById(emailLogId);
      if (!emailLog) return;

      if (result.success) {
        await emailLog.markAsSent(result.fullResponse);
        console.log(`✅ [EmailService] Email log updated as sent:`, emailLogId);
      } else {
        await emailLog.markAsFailed(result.error, result.fullResponse);
        console.log(`❌ [EmailService] Email log updated as failed:`, emailLogId);
      }
    } catch (error) {
      console.error('❌ [EmailService] Failed to update email log:', error);
    }
  }

  // Intelligente E-Mail-Weiterleitung für Development
  getEmailRecipient(originalRecipient) {
    // In Production: Direkt an Zielempfänger
    if (this.isProduction) {
      return {
        email: originalRecipient,
        isRedirected: false
      };
    }
    
    // In Development: Nur Admin-E-Mail oder Redirect an Admin
    if (originalRecipient === this.adminEmail) {
      return {
        email: originalRecipient,
        isRedirected: false
      };
    }
    
    return {
      email: this.adminEmail,
      isRedirected: true,
      originalRecipient: originalRecipient
    };
  }

  async sendVerificationEmail(to, verificationToken, userName) {
    if (this.isDisabled) {
      console.log('📧 E-Mail-Service deaktiviert - Verifizierungs-E-Mail würde gesendet werden an:', to);
      console.log('🔗 Verifizierungs-Token:', verificationToken);
      return { success: true, messageId: 'disabled', info: 'Email service disabled' };
    }
    
    try {
      const verificationUrl = `${process.env.FRONTEND_URL || 'http://localhost:3001'}/verify-email?token=${verificationToken}`;
      
      const htmlContent = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
            <h1 style="color: white; margin: 0; font-size: 28px;">🌸 Glücksmomente Manufaktur</h1>
            <p style="color: white; margin: 10px 0 0 0; font-size: 16px;">Willkommen in unserer Seifenmanufaktur!</p>
          </div>
          
          <div style="background: white; padding: 30px; border-radius: 0 0 10px 10px; box-shadow: 0 4px 10px rgba(0,0,0,0.1);">
            <h2 style="color: #333; margin-bottom: 20px;">Hallo ${userName}! 👋</h2>
            
            <p style="color: #666; line-height: 1.6; margin-bottom: 25px;">
              Vielen Dank für Ihre Registrierung bei der Glücksmomente Manufaktur! 
              Wir freuen uns sehr, Sie in unserer Gemeinschaft von Seifenliebhabern begrüßen zu dürfen.
            </p>
            
            <p style="color: #666; line-height: 1.6; margin-bottom: 30px;">
              Um Ihr Konto zu aktivieren und unsere handgemachten Seifen zu entdecken, 
              bestätigen Sie bitte Ihre E-Mail-Adresse:
            </p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${verificationUrl}" 
                 style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
                        color: white; 
                        text-decoration: none; 
                        padding: 15px 30px; 
                        border-radius: 25px; 
                        font-weight: bold; 
                        font-size: 16px; 
                        display: inline-block;
                        box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);
                        transition: all 0.3s ease;">
                ✨ E-Mail bestätigen
              </a>
            </div>
            
            <div style="background: #f8f9ff; padding: 20px; border-radius: 8px; margin: 25px 0; border-left: 4px solid #667eea;">
              <p style="color: #666; margin: 0; font-size: 14px;">
                <strong>🔒 Sicherheitshinweis:</strong><br>
                Falls Sie sich nicht bei uns registriert haben, können Sie diese E-Mail ignorieren. 
                Ihr Konto wird nicht aktiviert ohne Bestätigung.
              </p>
            </div>
            
            <p style="color: #666; line-height: 1.6; margin-bottom: 20px;">
              Nach der Bestätigung können Sie:
            </p>
            
            <ul style="color: #666; line-height: 1.8; margin-bottom: 25px;">
              <li>🛒 Unsere handgemachten Seifen bestellen</li>
              <li>📦 Ihre Bestellungen verwalten</li>
              <li>🎁 Exklusive Angebote erhalten</li>
              <li>💌 Über neue Kreationen informiert werden</li>
            </ul>
            
            <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
            
            <p style="color: #999; font-size: 14px; text-align: center; margin: 0;">
              Mit seifigen Grüßen,<br>
              <strong style="color: #667eea;">Das Team der Glücksmomente Manufaktur</strong>
            </p>
            
            <p style="color: #ccc; font-size: 12px; text-align: center; margin: 15px 0 0 0;">
              Diese E-Mail wurde automatisch generiert. Bitte antworten Sie nicht auf diese E-Mail.
            </p>
          </div>
        </div>
      `;

      const result = await this.resend.emails.send({
        from: this.fromEmail,
        to: to,
        subject: '🌸 Willkommen bei Glücksmomente - E-Mail bestätigen',
        html: htmlContent
      });

      console.log('✅ [EmailService] Verification email sent successfully!');
      console.log('📧 [EmailService] Verification Response:', JSON.stringify(result, null, 2));
      return { 
        success: true, 
        messageId: result?.id || result?.data?.id || 'sent-without-id',
        fullResponse: result
      };
    } catch (error) {
      console.error('❌ Email sending failed:', error);
      return { success: false, error: error.message };
    }
  }

  async sendWelcomeEmail(to, userName) {
    if (this.isDisabled) {
      console.log('📧 E-Mail-Service deaktiviert - Willkommens-E-Mail würde gesendet werden an:', to);
      return { success: true, messageId: 'disabled', info: 'Email service disabled' };
    }
    
    try {
      const htmlContent = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9;">
          <div style="background: linear-gradient(135deg, #4CAF50 0%, #45a049 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
            <h1 style="color: white; margin: 0; font-size: 28px;">🎉 Herzlich Willkommen!</h1>
            <p style="color: white; margin: 10px 0 0 0; font-size: 16px;">Ihr Konto ist jetzt aktiv</p>
          </div>
          
          <div style="background: white; padding: 30px; border-radius: 0 0 10px 10px; box-shadow: 0 4px 10px rgba(0,0,0,0.1);">
            <h2 style="color: #333; margin-bottom: 20px;">Hallo ${userName}! 🌟</h2>
            
            <p style="color: #666; line-height: 1.6; margin-bottom: 25px;">
              Fantastisch! Ihre E-Mail-Adresse wurde erfolgreich bestätigt und Ihr Konto ist jetzt vollständig aktiviert.
            </p>
            
            <p style="color: #666; line-height: 1.6; margin-bottom: 30px;">
              Sie können sich jetzt anmelden und unsere wunderbaren handgemachten Seifen entdecken!
            </p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${process.env.FRONTEND_URL || 'http://localhost:3001'}/login" 
                 style="background: linear-gradient(135deg, #4CAF50 0%, #45a049 100%); 
                        color: white; 
                        text-decoration: none; 
                        padding: 15px 30px; 
                        border-radius: 25px; 
                        font-weight: bold; 
                        font-size: 16px; 
                        display: inline-block;
                        box-shadow: 0 4px 15px rgba(76, 175, 80, 0.4);">
                🚪 Jetzt anmelden
              </a>
            </div>
            
            <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
            
            <p style="color: #999; font-size: 14px; text-align: center; margin: 0;">
              Viel Freude beim Stöbern!<br>
              <strong style="color: #4CAF50;">Das Team der Glücksmomente Manufaktur</strong>
            </p>
          </div>
        </div>
      `;

      const result = await this.resend.emails.send({
        from: this.fromEmail,
        to: to,
        subject: '🎉 Konto erfolgreich aktiviert - Willkommen bei Glücksmomente!',
        html: htmlContent
      });

      console.log('✅ Welcome email sent:', result);
      return { success: true, messageId: result.id };
    } catch (error) {
      console.error('❌ Welcome email sending failed:', error);
      return { success: false, error: error.message };
    }
  }

  async sendPasswordResetEmail(to, resetUrl, userName, userId = null, kundeId = null) {
    console.log('📧 [EmailService] Attempting to send password reset email...');
    console.log('📧 [EmailService] Environment:', this.environment);
    console.log('📧 [EmailService] Original recipient:', to);
    
    if (this.isDisabled) {
      console.log('⚠️ [EmailService] E-Mail-Service deaktiviert');
      return { success: true, messageId: 'disabled', info: 'Email service disabled' };
    }
    
    // E-Mail-Weiterleitung basierend auf Environment
    const recipientInfo = this.getEmailRecipient(to);
    const finalRecipient = recipientInfo.email;
    
    if (recipientInfo.isRedirected) {
      console.log(`📧 [EmailService] Development Mode: Redirecting email from ${to} to ${finalRecipient}`);
    }
    
    // E-Mail-Daten für Logging vorbereiten
    const emailData = {
      type: 'password_reset',
      to: finalRecipient,
      originalTo: to,
      recipientName: userName,
      userId: userId,
      kundeId: kundeId,
      subject: recipientInfo.isRedirected 
        ? `🧪 [DEV] Passwort zurücksetzen für ${to} - Glücksmomente Manufaktur`
        : '🔐 Passwort zurücksetzen - Glücksmomente Manufaktur',
      contextData: {
        resetUrl: resetUrl,
        resetExpiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1 Stunde
        originalRecipient: recipientInfo.isRedirected ? to : null,
        metadata: {
          environment: this.environment,
          isRedirected: recipientInfo.isRedirected
        }
      }
    };
    
    try {
      console.log('📧 [EmailService] Preparing email content...');
      
      // Development warning wenn E-Mail weitergeleitet wird
      const developmentWarning = recipientInfo.isRedirected ? `
        <div style="background: #E3F2FD; border: 2px solid #1976D2; border-radius: 8px; padding: 15px; margin: 20px 0;">
          <p style="color: #1976D2; margin: 0; font-weight: bold;">🧪 DEVELOPMENT MODE</p>
          <p style="color: #1976D2; margin: 5px 0 0 0; font-size: 14px;">
            Diese E-Mail war ursprünglich für <strong>${to}</strong> bestimmt, 
            wurde aber im Development-Modus an den Admin weitergeleitet.
          </p>
        </div>
      ` : '';
      
      const htmlContent = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9;">
          <div style="background: linear-gradient(135deg, #FF6B6B 0%, #FF8E53 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
            <h1 style="color: white; margin: 0; font-size: 28px;">🌸 Glücksmomente Manufaktur</h1>
            <p style="color: white; margin: 10px 0 0 0; font-size: 16px;">Passwort zurücksetzen</p>
          </div>
          
          <div style="background: white; padding: 30px; border-radius: 0 0 10px 10px; box-shadow: 0 4px 10px rgba(0,0,0,0.1);">
            ${developmentWarning}
            <h2 style="color: #333; margin-bottom: 20px;">Hallo ${userName || 'liebe/r Kunde/in'}! 🔐</h2>
            
            <p style="color: #666; line-height: 1.6; margin-bottom: 25px;">
              Sie haben eine Anfrage zum Zurücksetzen Ihres Passworts für Ihr Konto bei der Glücksmomente Manufaktur gestellt.
            </p>
            
            <div style="background: #FFF3E0; border-left: 4px solid #FF9800; padding: 15px; margin: 20px 0;">
              <p style="color: #E65100; margin: 0; font-weight: bold;">⏰ Wichtiger Hinweis:</p>
              <p style="color: #E65100; margin: 5px 0 0 0;">Dieser Link ist nur 1 Stunde gültig und kann nur einmal verwendet werden.</p>
            </div>
            
            <p style="color: #666; line-height: 1.6; margin-bottom: 30px;">
              Klicken Sie auf den folgenden Button, um ein neues, sicheres Passwort zu erstellen:
            </p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${resetUrl}" 
                 style="background: linear-gradient(135deg, #FF6B6B 0%, #FF8E53 100%); 
                        color: white; 
                        padding: 15px 40px; 
                        text-decoration: none; 
                        border-radius: 25px; 
                        font-weight: bold; 
                        font-size: 16px;
                        display: inline-block;
                        transition: transform 0.2s;">
                🔑 Neues Passwort erstellen
              </a>
            </div>
            
            <div style="background: #F3E5F5; border: 1px solid #CE93D8; border-radius: 8px; padding: 20px; margin: 25px 0;">
              <h3 style="color: #7B1FA2; margin: 0 0 10px 0; font-size: 16px;">🛡️ Sicherheitshinweise:</h3>
              <ul style="color: #7B1FA2; margin: 0; padding-left: 20px; line-height: 1.4;">
                <li>Falls Sie diese Anfrage nicht gestellt haben, ignorieren Sie diese E-Mail</li>
                <li>Teilen Sie diesen Link niemals mit anderen Personen</li>
                <li>Verwenden Sie ein starkes, einzigartiges Passwort</li>
                <li>Der Link wird automatisch ungültig, sobald er verwendet wurde</li>
              </ul>
            </div>
            
            <p style="color: #666; line-height: 1.6; margin-bottom: 20px; font-size: 14px;">
              <strong>Alternative:</strong> Falls der Button nicht funktioniert, kopieren Sie diesen Link in Ihren Browser:<br>
              <span style="background: #f5f5f5; padding: 8px; border-radius: 4px; word-break: break-all; font-family: monospace; font-size: 12px;">${resetUrl}</span>
            </p>
            
            <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
            
            <p style="color: #999; font-size: 14px; text-align: center; margin: 0;">
              Bei Fragen stehen wir Ihnen gerne zur Verfügung.<br>
              <strong style="color: #FF6B6B;">Das Team der Glücksmomente Manufaktur</strong>
            </p>
          </div>
          
          <div style="text-align: center; margin-top: 20px; color: #999; font-size: 12px;">
            Diese E-Mail wurde automatisch erstellt. Bitte antworten Sie nicht auf diese E-Mail.
          </div>
        </div>
      `;

      // E-Mail Content für Logging speichern
      emailData.htmlBody = htmlContent;
      
      // E-Mail in MongoDB loggen BEVOR sie gesendet wird
      const emailLog = await this.logEmail(emailData);
      
      console.log('📧 [EmailService] Sending email via Resend API...');
      
      const result = await this.resend.emails.send({
        from: `${this.fromName} <${this.fromEmail}>`,
        to: finalRecipient,
        subject: emailData.subject,
        html: htmlContent
      });

      console.log('✅ [EmailService] Resend API call completed!');
      console.log('📧 [EmailService] Full Resend Response:', JSON.stringify(result, null, 2));
      
      // Ergebnis verarbeiten und Log updaten
      let emailResult;
      
      if (result.error) {
        console.error('❌ [EmailService] Resend API Error:', result.error);
        emailResult = { 
          success: false, 
          error: `Resend API Error: ${result.error.message} (Status: ${result.error.statusCode})`,
          fullResponse: result
        };
      } else if (!result.data || !result.data.id) {
        console.error('❌ [EmailService] Unexpected Resend response structure');
        emailResult = { 
          success: false, 
          error: 'Unexpected response from email service',
          fullResponse: result
        };
      } else {
        console.log('✅ [EmailService] Password reset email sent successfully!');
        console.log('📧 [EmailService] Message ID:', result.data.id);
        emailResult = { 
          success: true, 
          messageId: result.data.id,
          fullResponse: result
        };
      }
      
      // E-Mail-Log mit Ergebnis aktualisieren
      if (emailLog) {
        await this.updateEmailLog(emailLog._id, emailResult);
      }
      
      return emailResult;
    } catch (error) {
      console.error('❌ [EmailService] Password reset email sending failed!');
      console.error('❌ [EmailService] Error details:', {
        message: error.message,
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data
      });
      
      const errorResult = { success: false, error: error.message };
      
      // E-Mail-Log mit Fehler aktualisieren
      if (emailLog) {
        await this.updateEmailLog(emailLog._id, errorResult);
      }
      
      return errorResult;
    }
  }

  async sendProfileUpdateNotification(to, userName, changes) {
    if (this.isDisabled) {
      console.log('📧 E-Mail-Service deaktiviert - Profil-Update-E-Mail würde gesendet werden an:', to);
      console.log('🔄 Änderungen:', changes);
      return { success: true, messageId: 'disabled', info: 'Email service disabled' };
    }
    
    try {
      const changesList = changes.map(change => `<li style="margin: 5px 0;">${change}</li>`).join('');
      
      const htmlContent = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9;">
          <div style="background: linear-gradient(135deg, #4CAF50 0%, #45a049 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
            <h1 style="color: white; margin: 0; font-size: 28px;">🌸 Glücksmomente Manufaktur</h1>
            <p style="color: white; margin: 10px 0 0 0; font-size: 16px;">Profil-Änderung bestätigt</p>
          </div>
          
          <div style="background: white; padding: 30px; border-radius: 0 0 10px 10px; box-shadow: 0 4px 10px rgba(0,0,0,0.1);">
            <h2 style="color: #333; margin-bottom: 20px;">Hallo ${userName}! 👤</h2>
            
            <p style="color: #666; line-height: 1.6; margin-bottom: 25px;">
              Ihr Profil bei der Glücksmomente Manufaktur wurde erfolgreich aktualisiert.
              Diese E-Mail dient zu Ihrer Sicherheit als Bestätigung.
            </p>
            
            <div style="background: #E8F5E8; border: 1px solid #4CAF50; border-radius: 8px; padding: 20px; margin: 25px 0;">
              <h3 style="color: #2E7D32; margin: 0 0 15px 0; font-size: 16px;">📝 Folgende Änderungen wurden vorgenommen:</h3>
              <ul style="color: #2E7D32; margin: 0; padding-left: 20px; line-height: 1.6;">
                ${changesList}
              </ul>
            </div>
            
            <div style="background: #FFF3E0; border-left: 4px solid #FF9800; padding: 15px; margin: 20px 0;">
              <p style="color: #E65100; margin: 0; font-weight: bold;">🔒 Sicherheitshinweis:</p>
              <p style="color: #E65100; margin: 5px 0 0 0;">
                Falls Sie diese Änderungen nicht vorgenommen haben, wenden Sie sich bitte umgehend an unseren Support.
              </p>
            </div>
            
            <p style="color: #666; line-height: 1.6; margin-bottom: 20px;">
              <strong>Zeitpunkt der Änderung:</strong> ${new Date().toLocaleString('de-DE')}<br>
              <strong>Ihre E-Mail:</strong> ${to}
            </p>
            
            <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
            
            <p style="color: #999; font-size: 14px; text-align: center; margin: 0;">
              Bei Fragen stehen wir Ihnen gerne zur Verfügung.<br>
              <strong style="color: #4CAF50;">Das Team der Glücksmomente Manufaktur</strong>
            </p>
          </div>
          
          <div style="text-align: center; margin-top: 20px; color: #999; font-size: 12px;">
            Diese E-Mail wurde automatisch erstellt. Bitte antworten Sie nicht auf diese E-Mail.
          </div>
        </div>
      `;

      const result = await this.resend.emails.send({
        from: this.fromEmail,
        to: to,
        subject: '✅ Profil-Änderung bestätigt - Glücksmomente Manufaktur',
        html: htmlContent
      });

      console.log('✅ Profile update notification email sent:', result);
      return { success: true, messageId: result.id };
    } catch (error) {
      console.error('❌ Profile update notification sending failed:', error);
      return { success: false, error: error.message };
    }
  }

  async sendAccountDeletionConfirmation(to, userName, username, reason) {
    if (this.isDisabled) {
      console.log('📧 E-Mail-Service deaktiviert - Account-Löschungs-E-Mail würde gesendet werden an:', to);
      console.log('🗑️ Grund:', reason);
      return { success: true, messageId: 'disabled', info: 'Email service disabled' };
    }
    
    try {
      const htmlContent = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9;">
          <div style="background: linear-gradient(135deg, #757575 0%, #616161 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
            <h1 style="color: white; margin: 0; font-size: 28px;">🌸 Glücksmomente Manufaktur</h1>
            <p style="color: white; margin: 10px 0 0 0; font-size: 16px;">Account-Löschung bestätigt</p>
          </div>
          
          <div style="background: white; padding: 30px; border-radius: 0 0 10px 10px; box-shadow: 0 4px 10px rgba(0,0,0,0.1);">
            <h2 style="color: #333; margin-bottom: 20px;">Auf Wiedersehen, ${userName}! 👋</h2>
            
            <p style="color: #666; line-height: 1.6; margin-bottom: 25px;">
              Ihr Account bei der Glücksmomente Manufaktur wurde wie gewünscht erfolgreich gelöscht.
              Wir bedauern, dass Sie uns verlassen.
            </p>
            
            <div style="background: #FFEBEE; border: 1px solid #F44336; border-radius: 8px; padding: 20px; margin: 25px 0;">
              <h3 style="color: #C62828; margin: 0 0 15px 0; font-size: 16px;">🗑️ Gelöschte Account-Daten:</h3>
              <ul style="color: #C62828; margin: 0; padding-left: 20px; line-height: 1.6;">
                <li>Benutzername: <strong>${username}</strong></li>
                <li>E-Mail: <strong>${to}</strong></li>
                <li>Löschungsgrund: <strong>${reason}</strong></li>
                <li>Löschungsdatum: <strong>${new Date().toLocaleString('de-DE')}</strong></li>
              </ul>
            </div>
            
            <div style="background: #E3F2FD; border-left: 4px solid #2196F3; padding: 15px; margin: 20px 0;">
              <p style="color: #1565C0; margin: 0; font-weight: bold;">ℹ️ Was passiert jetzt:</p>
              <ul style="color: #1565C0; margin: 5px 0 0 0; padding-left: 20px;">
                <li>Alle Ihre persönlichen Daten wurden unwiderruflich gelöscht</li>
                <li>Sie erhalten keine weiteren E-Mails von uns</li>
                <li>Ihre Bestellhistorie ist nicht mehr einsehbar</li>
                <li>Sie können sich jederzeit mit einer neuen E-Mail wieder registrieren</li>
              </ul>
            </div>
            
            <p style="color: #666; line-height: 1.6; margin-bottom: 25px;">
              Sollten Sie Ihre Meinung ändern, können Sie sich jederzeit mit einer neuen E-Mail-Adresse 
              wieder bei uns registrieren. Wir würden uns freuen, Sie wieder bei uns begrüßen zu dürfen!
            </p>
            
            <div style="text-align: center; background: #F5F5F5; padding: 20px; border-radius: 8px; margin: 25px 0;">
              <p style="color: #666; margin: 0; font-size: 16px;">
                💝 Vielen Dank für die Zeit, die Sie bei uns verbracht haben!
              </p>
            </div>
            
            <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
            
            <p style="color: #999; font-size: 14px; text-align: center; margin: 0;">
              Alles Gute wünscht Ihnen<br>
              <strong style="color: #757575;">Das Team der Glücksmomente Manufaktur</strong>
            </p>
          </div>
          
          <div style="text-align: center; margin-top: 20px; color: #999; font-size: 12px;">
            Diese E-Mail wurde automatisch erstellt. Bitte antworten Sie nicht auf diese E-Mail.
          </div>
        </div>
      `;

      const result = await this.resend.emails.send({
        from: this.fromEmail,
        to: to,
        subject: '👋 Account gelöscht - Auf Wiedersehen von Glücksmomente Manufaktur',
        html: htmlContent
      });

      console.log('✅ Account deletion confirmation email sent:', result);
      return { success: true, messageId: result.id };
    } catch (error) {
      console.error('❌ Account deletion confirmation sending failed:', error);
      return { success: false, error: error.message };
    }
  }

  // 🛒 Bestellbestätigung für Kunden
  async sendOrderConfirmation(customerEmail, orderData, pdfAttachment) {
    if (this.isDisabled) {
      console.log('📧 E-Mail-Service deaktiviert - Bestellbestätigung übersprungen');
      return { success: false, error: 'E-Mail-Service deaktiviert' };
    }

    try {
      const { bestellung, kundenname } = orderData;
      
      const formatPrice = (price) => {
        return new Intl.NumberFormat('de-DE', {
          style: 'currency',
          currency: 'EUR'
        }).format(price || 0);
      };

      const formatDate = (date) => {
        return new Intl.DateTimeFormat('de-DE', {
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        }).format(new Date(date));
      };

      const htmlContent = `
        <div style="max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif; line-height: 1.6;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 8px 8px 0 0; text-align: center;">
            <h1 style="margin: 0; font-size: 28px;">🎉 Bestellung bestätigt!</h1>
            <p style="margin: 10px 0 0 0; font-size: 18px; opacity: 0.9;">
              Vielen Dank für Ihre Bestellung, ${kundenname}!
            </p>
          </div>
          
          <div style="background: white; padding: 30px; border: 1px solid #eee; border-top: none;">
            <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 30px;">
              <h2 style="color: #333; margin: 0 0 15px 0; font-size: 20px;">📦 Bestelldetails</h2>
              <p style="margin: 5px 0; color: #666;"><strong>Bestellnummer:</strong> ${bestellung.bestellnummer}</p>
              <p style="margin: 5px 0; color: #666;"><strong>Bestelldatum:</strong> ${formatDate(bestellung.bestelldatum)}</p>
              <p style="margin: 5px 0; color: #666;"><strong>Status:</strong> <span style="color: #28a745; font-weight: bold;">Bestätigt</span></p>
            </div>

            <h3 style="color: #333; margin: 30px 0 15px 0;">🛍️ Ihre Artikel</h3>
            <table style="width: 100%; border-collapse: collapse; margin-bottom: 30px;">
              <thead>
                <tr style="background: #f8f9fa; border-bottom: 2px solid #dee2e6;">
                  <th style="text-align: left; padding: 12px; border-bottom: 1px solid #dee2e6;">Artikel</th>
                  <th style="text-align: center; padding: 12px; border-bottom: 1px solid #dee2e6;">Menge</th>
                  <th style="text-align: right; padding: 12px; border-bottom: 1px solid #dee2e6;">Preis</th>
                </tr>
              </thead>
              <tbody>
                ${bestellung.artikel.map(artikel => `
                  <tr>
                    <td style="padding: 12px; border-bottom: 1px solid #f1f1f1;">${artikel.name}</td>
                    <td style="text-align: center; padding: 12px; border-bottom: 1px solid #f1f1f1;">${artikel.menge}</td>
                    <td style="text-align: right; padding: 12px; border-bottom: 1px solid #f1f1f1;">${formatPrice(artikel.preis * artikel.menge)}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>

            <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 30px;">
              <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
                <span>Zwischensumme:</span>
                <span>${formatPrice(bestellung.gesamt.netto - (bestellung.versandkosten || 0))}</span>
              </div>
              ${bestellung.versandkosten ? `
                <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
                  <span>Versandkosten:</span>
                  <span>${formatPrice(bestellung.versandkosten)}</span>
                </div>
              ` : ''}
              <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
                <span>MwSt. (19%):</span>
                <span>${formatPrice(bestellung.gesamt.mwst)}</span>
              </div>
              <hr style="border: none; border-top: 1px solid #dee2e6; margin: 15px 0;">
              <div style="display: flex; justify-content: space-between; font-size: 18px; font-weight: bold; color: #333;">
                <span>Gesamtsumme:</span>
                <span style="color: #28a745;">${formatPrice(bestellung.gesamt.brutto)}</span>
              </div>
            </div>

            <h3 style="color: #333; margin: 30px 0 15px 0;">📍 Lieferadresse</h3>
            <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 30px;">
              <p style="margin: 0; color: #666;">
                ${bestellung.lieferadresse.vorname} ${bestellung.lieferadresse.nachname}<br>
                ${bestellung.lieferadresse.strasse} ${bestellung.lieferadresse.hausnummer}<br>
                ${bestellung.lieferadresse.plz} ${bestellung.lieferadresse.stadt}
              </p>
            </div>

            <div style="background: #e8f5e8; border-left: 4px solid #28a745; padding: 20px; margin: 30px 0;">
              <h4 style="color: #155724; margin: 0 0 10px 0;">✅ Zahlung erfolgreich</h4>
              <p style="color: #155724; margin: 0;">
                Ihre Zahlung über PayPal wurde erfolgreich verarbeitet. 
                Wir beginnen umgehend mit der Bearbeitung Ihrer Bestellung.
              </p>
            </div>

            <div style="background: #fff3cd; border-left: 4px solid #ffc107; padding: 20px; margin: 30px 0;">
              <h4 style="color: #856404; margin: 0 0 10px 0;">📦 Versand & Lieferung</h4>
              <p style="color: #856404; margin: 0;">
                <strong>Lieferzeit:</strong> 3-5 Werktage nach Zahlungseingang<br>
                <strong>Versand:</strong> DHL/DPD<br>
                <strong>Sendungsverfolgung:</strong> Erhalten Sie per E-Mail
              </p>
            </div>

            <div style="text-align: center; background: #F5F5F5; padding: 20px; border-radius: 8px; margin: 25px 0;">
              <p style="color: #666; margin: 0; font-size: 16px;">
                💝 Vielen Dank für Ihr Vertrauen in unsere handgemachten Produkte!
              </p>
            </div>
            
            <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
            
            <p style="color: #999; font-size: 14px; text-align: center; margin: 0;">
              Bei Fragen zu Ihrer Bestellung erreichen Sie uns unter:<br>
              <strong style="color: #757575;">info@gluecksmomente-manufaktur.com</strong>
            </p>
          </div>
          
          <div style="text-align: center; margin-top: 20px; color: #999; font-size: 12px;">
            Im Anhang finden Sie Ihre Rechnung als PDF.<br>
            Diese E-Mail wurde automatisch erstellt.
          </div>
        </div>
      `;

      const emailData = {
        from: `${this.fromName} <${this.fromEmail}>`,
        to: customerEmail,
        subject: `🎉 Bestellbestätigung - ${bestellung.bestellnummer}`,
        html: htmlContent,
        attachments: pdfAttachment ? [{
          filename: `Rechnung_${bestellung.bestellnummer}.pdf`,
          content: pdfAttachment
        }] : undefined
      };

      const result = await this.resend.emails.send(emailData);

      console.log('✅ Order confirmation email sent to customer:', result);
      return { success: true, messageId: result.id };
    } catch (error) {
      console.error('❌ Order confirmation email failed:', error);
      return { success: false, error: error.message };
    }
  }

  // 🔔 Admin-Benachrichtigung für neue Bestellungen
  async sendAdminOrderNotification(orderData, pdfAttachment) {
    if (this.isDisabled) {
      console.log('📧 E-Mail-Service deaktiviert - Admin-Benachrichtigung übersprungen');
      return { success: false, error: 'E-Mail-Service deaktiviert' };
    }

    try {
      const { bestellung, kundenname, gesamtbetrag } = orderData;
      
      const formatPrice = (price) => {
        return new Intl.NumberFormat('de-DE', {
          style: 'currency',
          currency: 'EUR'
        }).format(price || 0);
      };

      const formatDate = (date) => {
        return new Intl.DateTimeFormat('de-DE', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        }).format(new Date(date));
      };

      const htmlContent = `
        <div style="max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif; line-height: 1.6;">
          <div style="background: linear-gradient(135deg, #ff6b6b 0%, #ee5a24 100%); color: white; padding: 30px; border-radius: 8px 8px 0 0; text-align: center;">
            <h1 style="margin: 0; font-size: 28px;">🔔 Neue Bestellung!</h1>
            <p style="margin: 10px 0 0 0; font-size: 18px; opacity: 0.9;">
              Bestellung ${bestellung.bestellnummer} eingegangen
            </p>
          </div>
          
          <div style="background: white; padding: 30px; border: 1px solid #eee; border-top: none;">
            <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 30px;">
              <h2 style="color: #333; margin: 0 0 15px 0; font-size: 20px;">👤 Kundeninformationen</h2>
              <p style="margin: 5px 0; color: #666;"><strong>Name:</strong> ${kundenname}</p>
              <p style="margin: 5px 0; color: #666;"><strong>E-Mail:</strong> ${bestellung.kontakt?.email || 'N/A'}</p>
              <p style="margin: 5px 0; color: #666;"><strong>Bestellzeit:</strong> ${formatDate(bestellung.bestelldatum)}</p>
              <p style="margin: 5px 0; color: #666;"><strong>Gesamtbetrag:</strong> <span style="color: #28a745; font-weight: bold; font-size: 18px;">${formatPrice(gesamtbetrag)}</span></p>
            </div>

            <h3 style="color: #333; margin: 30px 0 15px 0;">🛍️ Bestellte Artikel</h3>
            <table style="width: 100%; border-collapse: collapse; margin-bottom: 30px;">
              <thead>
                <tr style="background: #f8f9fa; border-bottom: 2px solid #dee2e6;">
                  <th style="text-align: left; padding: 12px; border-bottom: 1px solid #dee2e6;">Artikel</th>
                  <th style="text-align: center; padding: 12px; border-bottom: 1px solid #dee2e6;">Menge</th>
                  <th style="text-align: right; padding: 12px; border-bottom: 1px solid #dee2e6;">Einzelpreis</th>
                  <th style="text-align: right; padding: 12px; border-bottom: 1px solid #dee2e6;">Gesamt</th>
                </tr>
              </thead>
              <tbody>
                ${bestellung.artikel.map(artikel => `
                  <tr>
                    <td style="padding: 12px; border-bottom: 1px solid #f1f1f1;">
                      <strong>${artikel.name}</strong><br>
                      <small style="color: #666;">${artikel.typ || ''}</small>
                    </td>
                    <td style="text-align: center; padding: 12px; border-bottom: 1px solid #f1f1f1;">${artikel.menge}</td>
                    <td style="text-align: right; padding: 12px; border-bottom: 1px solid #f1f1f1;">${formatPrice(artikel.preis)}</td>
                    <td style="text-align: right; padding: 12px; border-bottom: 1px solid #f1f1f1;"><strong>${formatPrice(artikel.preis * artikel.menge)}</strong></td>
                  </tr>
                `).join('')}
              </tbody>
            </table>

            <h3 style="color: #333; margin: 30px 0 15px 0;">📍 Adressen</h3>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 30px;">
              <div style="background: #f8f9fa; padding: 20px; border-radius: 8px;">
                <h4 style="color: #333; margin: 0 0 10px 0;">Rechnungsadresse</h4>
                <p style="margin: 0; color: #666; line-height: 1.4;">
                  ${bestellung.rechnungsadresse.vorname} ${bestellung.rechnungsadresse.nachname}<br>
                  ${bestellung.rechnungsadresse.strasse} ${bestellung.rechnungsadresse.hausnummer}<br>
                  ${bestellung.rechnungsadresse.plz} ${bestellung.rechnungsadresse.stadt}
                </p>
              </div>
              <div style="background: #f8f9fa; padding: 20px; border-radius: 8px;">
                <h4 style="color: #333; margin: 0 0 10px 0;">Lieferadresse</h4>
                <p style="margin: 0; color: #666; line-height: 1.4;">
                  ${bestellung.lieferadresse.vorname} ${bestellung.lieferadresse.nachname}<br>
                  ${bestellung.lieferadresse.strasse} ${bestellung.lieferadresse.hausnummer}<br>
                  ${bestellung.lieferadresse.plz} ${bestellung.lieferadresse.stadt}
                </p>
              </div>
            </div>

            ${bestellung.notizen?.kunde ? `
              <div style="background: #fff3cd; border-left: 4px solid #ffc107; padding: 20px; margin: 30px 0;">
                <h4 style="color: #856404; margin: 0 0 10px 0;">💬 Kundennotizen</h4>
                <p style="color: #856404; margin: 0;">${bestellung.notizen.kunde}</p>
              </div>
            ` : ''}

            <div style="background: #d4edda; border-left: 4px solid #28a745; padding: 20px; margin: 30px 0;">
              <h4 style="color: #155724; margin: 0 0 10px 0;">💳 Zahlung</h4>
              <p style="color: #155724; margin: 0;">
                <strong>Methode:</strong> PayPal<br>
                <strong>Status:</strong> Bezahlt ✅<br>
                <strong>Transaktions-ID:</strong> ${bestellung.zahlung?.transaktionsId || 'Wird aktualisiert'}
              </p>
            </div>

            <div style="text-align: center; background: #F5F5F5; padding: 20px; border-radius: 8px; margin: 25px 0;">
              <p style="color: #666; margin: 0; font-size: 16px;">
                🚀 <strong>Nächste Schritte:</strong> Bestellung in Admin-Panel bearbeiten
              </p>
            </div>
            
            <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
            
            <p style="color: #999; font-size: 14px; text-align: center; margin: 0;">
              Automatische Benachrichtigung vom Bestellsystem<br>
              <strong style="color: #757575;">Glücksmomente Manufaktur</strong>
            </p>
          </div>
          
          <div style="text-align: center; margin-top: 20px; color: #999; font-size: 12px;">
            Im Anhang finden Sie die Bestelldetails als PDF.
          </div>
        </div>
      `;

      const emailData = {
        from: `${this.fromName} <${this.fromEmail}>`,
        to: this.adminEmail,
        subject: `🔔 Neue Bestellung: ${bestellung.bestellnummer} (${formatPrice(gesamtbetrag)})`,
        html: htmlContent,
        attachments: pdfAttachment ? [{
          filename: `Bestellung_${bestellung.bestellnummer}.pdf`,
          content: pdfAttachment
        }] : undefined
      };

      const result = await this.resend.emails.send(emailData);

      console.log('✅ Admin order notification sent:', result);
      return { success: true, messageId: result.id };
    } catch (error) {
      console.error('❌ Admin order notification failed:', error);
      return { success: false, error: error.message };
    }
  }
}

module.exports = new EmailService();