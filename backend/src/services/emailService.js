const { Resend } = require('resend');
const EmailOut = require('../models/EmailOut');

class EmailService {
  constructor() {
    // API-Key aus Umgebungsvariablen laden
    const apiKey = process.env.RESEND_API_KEY;
    
    // Prüfe auf Platzhalter-Keys
    const isPlaceholderKey = !apiKey || 
      apiKey.includes('placeholder') || 
      apiKey.includes('testing') ||
      apiKey.includes('123456') ||
      apiKey === 're_123456789_placeholder_key_for_testing';
    
    if (!apiKey || isPlaceholderKey) {
      console.warn('⚠️ RESEND_API_KEY nicht konfiguriert oder Platzhalter - E-Mail-Service im DEMO-MODUS');
      console.warn('📝 Für echte E-Mails: https://resend.com → API Key generieren → .env RESEND_API_KEY=re_xxxxx setzen');
      this.isDisabled = true;
      this.isDemoMode = true;
      return;
    }
    
    this.resend = new Resend(apiKey);
    
    // Production/Development E-Mail-Konfiguration
    this.environment = process.env.NODE_ENV || 'development';
    this.isProduction = this.environment === 'production';
    this.adminEmail = process.env.ADMIN_EMAIL || 'admin@example.com';
    
    // Domain-Konfiguration basierend auf Environment
    if (this.isProduction) {
      this.fromEmail = 'info@gluecksmomente-manufaktur.de';
      this.fromName = 'Glücksmomente Manufaktur';
    } else {
      // Development: Verwende auch die verifizierte Domain
      this.fromEmail = 'info@gluecksmomente-manufaktur.de';
      this.fromName = 'Glücksmomente Manufaktur (DEV)';
    }
    
    this.isDisabled = false;
    
    // Stille Initialisierung - Logs nur bei Fehlern
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
    console.log('📧 [E-Mail Service] Verifikations-E-Mail angefordert:', { to, userName });
    
    if (this.isDisabled) {
      console.log('🟡 [DEMO-MODUS] E-Mail-Service nicht konfiguriert - simuliere Versand');
      console.log('   📧 Typ: Verifikations-E-Mail');
      console.log('   📬 An:', to);
      console.log('   👤 Benutzer:', userName);
      console.log('   🔗 Token:', verificationToken.substring(0, 10) + '...');
      console.log('   💡 Tipp: Für echte E-Mails Resend API-Key konfigurieren');
      
      // Speichere Log als "erfolgreich simuliert"
      await this.saveEmailLog({
        to,
        subject: '✅ E-Mail-Adresse bestätigen',
        type: 'verification',
        success: true,
        messageId: 'demo-' + Date.now(),
        simulation: true
      });
      
      return { 
        success: true, 
        messageId: 'demo-simulation-' + Date.now(),
        simulation: true,
        message: 'E-Mail im Demo-Modus simuliert - für echte E-Mails Resend API konfigurieren'
      };
    }
    
    try {
      const verificationUrl = `${process.env.FRONTEND_URL || 'http://localhost:3001'}/verify-email?token=${verificationToken}`;
      
      const htmlContent = `<div style="font-family: 'Georgia', 'Times New Roman', serif; max-width: 600px; margin: 0 auto; padding: 20px; background: linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%); border-radius: 15px;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px; text-align: center; border-radius: 15px 15px 0 0; box-shadow: 0 4px 15px rgba(0,0,0,0.1);">
            <h1 style="color: white; margin: 0; font-size: 32px; text-shadow: 2px 2px 4px rgba(0,0,0,0.3);">🌸 Glücksmomente Manufaktur</h1>
            <p style="color: white; margin: 15px 0 0 0; font-size: 18px; opacity: 0.95; font-style: italic;">Wo Träume zu duftenden Realitäten werden</p>
          </div>
          
          <div style="background: white; padding: 40px; border-radius: 0 0 15px 15px; box-shadow: 0 8px 25px rgba(0,0,0,0.1);">
            <h2 style="color: #2c3e50; margin-bottom: 25px; font-size: 24px; text-align: center;">Hallo ${userName}! 🌺</h2>
            
            <div style="background: #f8f9fa; padding: 25px; border-radius: 12px; margin: 25px 0; border-left: 5px solid #667eea;">
              <p style="color: #555; line-height: 1.8; margin: 0; font-size: 16px;">
                <strong>Herzlich willkommen in unserer besonderen Welt der handgemachten Seifen!</strong> ✨<br><br>
                
                Es freut uns riesig, dass Sie sich für die Glücksmomente Manufaktur entschieden haben. 
                Wir kreieren mit Liebe und Sorgfalt einzigartige Seifen aus natürlichen Zutaten, 
                die nicht nur Ihre Haut verwöhnen, sondern auch kleine Glücksmomente in Ihren Alltag bringen.
              </p>
            </div>
            
            <div style="background: #e8f4fd; padding: 25px; border-radius: 12px; margin: 30px 0; text-align: center;">
              <p style="color: #1e4a73; line-height: 1.6; margin-bottom: 25px; font-size: 17px;">
                <strong>🔐 Letzter Schritt zur Vollendung:</strong><br>
                Bestätigen Sie bitte Ihre E-Mail-Adresse, damit wir Sie über neue Duftkreationen, 
                exklusive Angebote und kleine Geheimnisse der Seifenherstellung informieren können.
              </p>
              
              <a href="${verificationUrl}" 
                 style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
                        color: white; 
                        text-decoration: none; 
                        padding: 18px 35px; 
                        border-radius: 30px; 
                        font-weight: bold; 
                        font-size: 18px; 
                        box-shadow: 0 6px 20px rgba(102, 126, 234, 0.3);
                        transition: all 0.3s ease;
                        display: inline-block;
                        margin: 10px;">
                ✨ E-Mail jetzt bestätigen ✨
              </a>
            </div>
            
            <div style="background: #fff3cd; padding: 20px; border-radius: 12px; margin: 25px 0; border: 2px dashed #ffc107;">
              <h3 style="color: #856404; margin: 0 0 15px 0; font-size: 18px;">🎁 Was Sie nach der Bestätigung erwartet:</h3>
              <ul style="color: #6c757d; line-height: 1.8; margin: 10px 0; padding-left: 25px;">
                <li><strong>10% Willkommensrabatt</strong> auf Ihre erste Bestellung</li>
                <li><strong>Exklusive Seifenrezepte</strong> und Pflegetipps</li>
                <li><strong>Früher Zugang</strong> zu neuen Kollektionen</li>
                <li><strong>Persönliche Beratung</strong> für Ihre Hautbedürfnisse</li>
                <li><strong>Monatliche Inspiration</strong> rund um natürliche Pflege</li>
              </ul>
            </div>
            
            <div style="margin: 30px 0; padding: 20px; background: #f1f8e9; border-radius: 12px; text-align: center;">
              <p style="color: #2e7d32; margin: 0; font-style: italic; font-size: 16px;">
                "Jede Seife erzählt eine Geschichte. Lassen Sie uns gemeinsam Ihre Geschichte schreiben."<br>
                <strong>- Das Team der Glücksmomente Manufaktur</strong>
              </p>
            </div>
            
            <hr style="border: none; border-top: 2px solid #e9ecef; margin: 30px 0;">
            
            <div style="text-align: center;">
              <p style="color: #6c757d; font-size: 14px; line-height: 1.6; margin: 0;">
                <strong>Hinweis:</strong> Falls der Button nicht funktioniert, kopieren Sie bitte diesen Link:<br>
                <a href="${verificationUrl}" style="color: #667eea; word-break: break-all; font-size: 12px;">${verificationUrl}</a><br><br>
                
                <em>Dieser Bestätigungslink ist 24 Stunden gültig.</em><br>
                Bei Fragen erreichen Sie uns unter: <strong>info@gluecksmomente-manufaktur.de</strong>
              </p>
            </div>
          </div>
        </div>`;

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
    console.log('📧 [E-Mail Service] Willkommens-E-Mail angefordert:', { to, userName });
    
    if (this.isDisabled) {
      console.log('🟡 [DEMO-MODUS] E-Mail-Service nicht konfiguriert - simuliere Versand');
      console.log('   📧 Typ: Willkommens-E-Mail');
      console.log('   📬 An:', to);
      console.log('   👤 Benutzer:', userName);
      console.log('   💡 Tipp: Für echte E-Mails Resend API-Key konfigurieren');
      
      await this.saveEmailLog({
        to,
        subject: '🌸 Willkommen bei Glücksmomente Manufaktur!',
        type: 'welcome',
        success: true,
        messageId: 'demo-' + Date.now(),
        simulation: true
      });
      
      return { 
        success: true, 
        messageId: 'demo-simulation-' + Date.now(),
        simulation: true,
        message: 'E-Mail im Demo-Modus simuliert - für echte E-Mails Resend API konfigurieren'
      };
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
            
            <div style="background: #fff3cd; padding: 25px; border-radius: 12px; margin: 30px 0; border: 2px dashed #ffc107;">
              <h3 style="color: #856404; margin: 0 0 20px 0; font-size: 20px; text-align: center;">🎁 Ihr exklusiver Willkommensbonus erwartet Sie!</h3>
              
              <div style="background: white; padding: 20px; border-radius: 8px; margin: 15px 0; text-align: center; border: 3px solid #ffc107;">
                <h4 style="color: #dc3545; margin: 0 0 10px 0; font-size: 24px;">10% RABATT</h4>
                <p style="margin: 0; font-size: 14px; color: #6c757d;">Auf Ihre erste Bestellung<br>Code: <strong style="color: #dc3545;">WILLKOMMEN10</strong></p>
              </div>
            </div>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${process.env.FRONTEND_URL || 'http://localhost:3001'}/login" 
                 style="background: linear-gradient(135deg, #4CAF50 0%, #45a049 100%); 
                        color: white; 
                        text-decoration: none; 
                        padding: 18px 35px; 
                        border-radius: 25px; 
                        font-weight: bold; 
                        font-size: 16px; 
                        display: inline-block;
                        box-shadow: 0 4px 15px rgba(76, 175, 80, 0.4);
                        transition: all 0.3s ease;">
                🚪 Jetzt anmelden & entdecken
              </a>
            </div>
            
            <div style="background: #f1f8e9; padding: 25px; border-radius: 12px; margin: 30px 0;">
              <h3 style="color: #2e7d32; margin: 0 0 15px 0; font-size: 18px;">🌿 Was macht unsere Seifen besonders?</h3>
              <ul style="color: #6c757d; line-height: 1.8; margin: 10px 0; padding-left: 20px;">
                <li><strong>100% natürliche Inhaltsstoffe</strong> - keine künstlichen Zusätze</li>
                <li><strong>Handgemacht mit Liebe</strong> - jede Seife ist ein Unikat</li>
                <li><strong>Nachhaltig verpackt</strong> - umweltfreundlich und plastikfrei</li>
                <li><strong>Für jeden Hauttyp</strong> - auch für sensible Haut geeignet</li>
                <li><strong>Fair produziert</strong> - mit hochwertigen Bio-Ölen</li>
              </ul>
            </div>
            
            <div style="margin: 30px 0; padding: 20px; background: linear-gradient(135deg, #e8f5e8 0%, #f0f8f0 100%); border-radius: 12px; text-align: center;">
              <p style="color: #2e7d32; margin: 0; font-style: italic; font-size: 16px; line-height: 1.6;">
                💚 "Bei uns finden Sie nicht nur Seifen, sondern kleine Glücksmomente für Ihre tägliche Pflegeroutine. Lassen Sie sich verwöhnen!"<br><br>
                <strong>- Mit herzlichen Grüßen, Ihr Team der Glücksmomente Manufaktur</strong>
              </p>
            </div>
            
            <hr style="border: none; border-top: 2px solid #e9ecef; margin: 30px 0;">
            
            <div style="text-align: center;">
              <p style="color: #6c757d; font-size: 14px; line-height: 1.6; margin: 0;">
                <strong>Haben Sie Fragen?</strong><br>
                Wir sind gerne für Sie da: <strong>info@gluecksmomente-manufaktur.de</strong><br><br>
                
                <em>Folgen Sie uns auch auf unseren sozialen Medien für Pflegetipps und Neuigkeiten!</em>
              </p>
            </div>
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
    console.log('📧 [E-Mail Service] Passwort-Reset-E-Mail angefordert:', { to, userName });
    
    if (this.isDisabled) {
      console.log('🟡 [DEMO-MODUS] E-Mail-Service nicht konfiguriert - simuliere Versand');
      console.log('   📧 Typ: Passwort-Reset-E-Mail');
      console.log('   📬 An:', to);
      console.log('   👤 Benutzer:', userName);
      console.log('   🔗 Reset-URL:', resetUrl.substring(0, 50) + '...');
      console.log('   💡 Tipp: Für echte E-Mails Resend API-Key konfigurieren');
      
      await this.saveEmailLog({
        to,
        subject: '🔒 Passwort zurücksetzen - Glücksmomente Manufaktur',
        type: 'password-reset',
        success: true,
        messageId: 'demo-' + Date.now(),
        simulation: true,
        userId,
        kundeId
      });
      
      return { 
        success: true, 
        messageId: 'demo-simulation-' + Date.now(),
        simulation: true,
        message: 'E-Mail im Demo-Modus simuliert - für echte E-Mails Resend API konfigurieren'
      };
    }
    
    console.log('📧 [EmailService] Attempting to send password reset email...');
    console.log('📧 [EmailService] Environment:', this.environment);
    console.log('📧 [EmailService] Original recipient:', to);
    
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
            <h2 style="color: #333; margin-bottom: 20px;">Hallo ${userName || 'liebe/r Kunde/in'}! 🤝</h2>
            
            <p style="color: #666; line-height: 1.6; margin-bottom: 25px;">
              Kein Problem! Wir helfen Ihnen gerne dabei, wieder Zugang zu Ihrem Konto bei der Glücksmomente Manufaktur zu erhalten. 
              Sicherheit ist uns sehr wichtig, deshalb senden wir Ihnen diesen speziellen Link.
            </p>
            
            <div style="background: #fff3cd; border: 2px solid #ffc107; border-radius: 12px; padding: 20px; margin: 25px 0;">
              <h3 style="color: #856404; margin: 0 0 15px 0; font-size: 18px;">🛡️ Ihre Sicherheit ist uns wichtig</h3>
              <p style="color: #856404; margin: 0; line-height: 1.6;">
                <strong>⏰ Zeitbegrenzung:</strong> Dieser sichere Link ist 60 Minuten gültig<br>
                <strong>🔐 Einmalige Nutzung:</strong> Nach der Verwendung wird der Link automatisch deaktiviert<br>
                <strong>🛡️ Nur Sie:</strong> Dieser Link wurde speziell für Ihre E-Mail-Adresse erstellt
              </p>
            </div>
            
            <p style="color: #666; line-height: 1.6; margin-bottom: 30px;">
              Klicken Sie einfach auf den Button unten und erstellen Sie Ihr neues Passwort. 
              Danach können Sie sich wie gewohnt anmelden und Ihre Lieblungsseifen bestellen:
            </p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${resetUrl}" 
                 style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
                        color: white; 
                        padding: 18px 45px; 
                        text-decoration: none; 
                        border-radius: 25px; 
                        font-weight: bold; 
                        font-size: 16px;
                        display: inline-block;
                        box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);
                        transition: all 0.3s ease;">
                🔑 Neues Passwort erstellen
              </a>
            </div>
            
            <div style="background: #e8f5e8; border: 2px solid #4caf50; border-radius: 12px; padding: 25px; margin: 30px 0;">
              <h3 style="color: #2e7d32; margin: 0 0 15px 0; font-size: 18px;">💡 Tipps für ein sicheres Passwort</h3>
              <ul style="color: #2e7d32; margin: 0; padding-left: 20px; line-height: 1.8;">
                <li><strong>Mindestens 8 Zeichen</strong> - je länger, desto sicherer</li>
                <li><strong>Groß- und Kleinbuchstaben</strong> kombinieren</li>
                <li><strong>Zahlen und Sonderzeichen</strong> verwenden</li>
                <li><strong>Einzigartiges Passwort</strong> - nicht bei anderen Diensten verwenden</li>
                <li><strong>Passwort-Manager</strong> können dabei helfen</li>
              </ul>
            </div>
            
            <div style="background: #f8f9fa; border: 1px solid #dee2e6; border-radius: 8px; padding: 20px; margin: 25px 0;">
              <h3 style="color: #495057; margin: 0 0 10px 0; font-size: 16px;">🤔 Diese Anfrage nicht gestellt?</h3>
              <p style="color: #6c757d; margin: 0; line-height: 1.6;">
                Keine Sorge! Falls Sie diese Passwort-Zurücksetzung nicht angefordert haben, können Sie diese E-Mail einfach ignorieren. 
                Ihr Konto bleibt vollkommen sicher und es werden keine Änderungen vorgenommen.
              </p>
            </div>
            
            <p style="color: #666; line-height: 1.6; margin-bottom: 20px; font-size: 14px;">
              <strong>💻 Button funktioniert nicht?</strong> Kein Problem! Kopieren Sie einfach diesen Link in Ihren Browser:<br>
              <span style="background: #f5f5f5; padding: 8px; border-radius: 4px; word-break: break-all; font-family: monospace; font-size: 12px; color: #667eea;">${resetUrl}</span>
            </p>
            
            <hr style="border: none; border-top: 2px solid #e9ecef; margin: 30px 0;">
            
            <div style="text-align: center;">
              <p style="color: #6c757d; font-size: 14px; line-height: 1.6; margin: 0;">
                <strong>🤝 Brauchen Sie Hilfe?</strong><br>
                Unser freundliches Team ist gerne für Sie da!<br>
                📧 <strong>info@gluecksmomente-manufaktur.de</strong><br><br>
                
                <em>Wir wünschen Ihnen weiterhin viel Freude mit unseren natürlichen Seifen!</em><br>
                <strong style="color: #667eea;">💚 Das Team der Glücksmomente Manufaktur</strong>
              </p>
            </div>
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
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 35px; border-radius: 12px 12px 0 0; text-align: center;">
            <h1 style="margin: 0; font-size: 32px;">🎉 Hurra! Ihre Bestellung ist bei uns!</h1>
            <p style="margin: 15px 0 5px 0; font-size: 18px; opacity: 0.9;">
              Liebe/r ${kundenname}, wir freuen uns riesig!
            </p>
            <p style="margin: 0; font-size: 16px; opacity: 0.8;">
              Ihre wunderbaren handgemachten Seifen sind schon in Arbeit ✨
            </p>
          </div>
          
          <div style="background: white; padding: 30px; border: 1px solid #eee; border-top: none; border-radius: 0 0 12px 12px; box-shadow: 0 4px 15px rgba(0,0,0,0.1);">
            
            <div style="background: #e8f5e8; padding: 25px; border-radius: 12px; margin-bottom: 30px; border: 2px solid #4caf50;">
              <h2 style="color: #2e7d32; margin: 0 0 15px 0; font-size: 20px; text-align: center;">💚 Herzlichen Dank für Ihr Vertrauen!</h2>
              <p style="margin: 0; color: #2e7d32; text-align: center; line-height: 1.6;">
                Sie haben sich für natürliche, handgemachte Qualität entschieden. Das macht uns sehr stolz!<br>
                <strong>Jede Seife wird mit viel Liebe für Sie hergestellt.</strong>
              </p>
            </div>

            <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 30px;">
              <h2 style="color: #333; margin: 0 0 15px 0; font-size: 20px;">📦 Ihre Bestelldetails</h2>
              <p style="margin: 5px 0; color: #666;"><strong>Bestellnummer:</strong> <span style="color: #667eea; font-weight: bold;">${bestellung.bestellnummer}</span></p>
              <p style="margin: 5px 0; color: #666;"><strong>Bestelldatum:</strong> ${formatDate(bestellung.bestelldatum)}</p>
              <p style="margin: 5px 0; color: #666;"><strong>Status:</strong> <span style="background: #4caf50; color: white; padding: 4px 12px; border-radius: 20px; font-size: 14px; font-weight: bold;">✓ Bestätigt & in Bearbeitung</span></p>
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

            <div style="background: #e8f5e8; border: 3px solid #4caf50; border-radius: 12px; padding: 25px; margin: 30px 0;">
              <h4 style="color: #2e7d32; margin: 0 0 15px 0; font-size: 18px;">✅ Zahlung erfolgreich erhalten!</h4>
              <p style="color: #2e7d32; margin: 0; line-height: 1.6;">
                Fantastisch! Ihre Zahlung über PayPal wurde erfolgreich verarbeitet. 
                <strong>Wir beginnen sofort mit der liebevollen Vorbereitung Ihrer Bestellung.</strong><br><br>
                🎯 <strong>Nächster Schritt:</strong> Unsere Seifenmeister greifen zu den besten Zutaten für Sie!
              </p>
            </div>

            <div style="background: #fff3cd; border: 3px solid #ffc107; border-radius: 12px; padding: 25px; margin: 30px 0;">
              <h4 style="color: #856404; margin: 0 0 15px 0; font-size: 18px;">📦 Versand & Lieferung - Transparent & Zuverlässig</h4>
              <div style="color: #856404;">
                <p style="margin: 0 0 10px 0;">🚚 <strong>Lieferzeit:</strong> 3-5 Werktage nach Zahlungseingang</p>
                <p style="margin: 0 0 10px 0;">📬 <strong>Versandpartner:</strong> DHL & DPD (klimaneutral)</p>
                <p style="margin: 0 0 10px 0;">🔍 <strong>Sendungsverfolgung:</strong> Link per E-Mail sobald versandt</p>
                <p style="margin: 0 0 10px 0;">📦 <strong>Verpackung:</strong> Plastikfrei & nachhaltig</p>
                <p style="margin: 0; font-style: italic;">💡 <strong>Tipp:</strong> Seifen bei Raumtemperatur lagern für beste Haltbarkeit</p>
              </div>
            </div>

            <div style="background: #f3e5f5; border: 2px solid #ce93d8; border-radius: 12px; padding: 25px; margin: 30px 0;">
              <h4 style="color: #7b1fa2; margin: 0 0 15px 0; font-size: 18px;">🌿 Wussten Sie schon?</h4>
              <p style="color: #7b1fa2; margin: 0; line-height: 1.6;">
                <strong>Jede unserer Seifen reift mindestens 6 Wochen,</strong> bevor sie zu Ihnen kommt. 
                So entwickeln sie ihre besonders milde und pflegende Wirkung. 
                <em>Handwerk braucht Zeit - und das schmeckt man!</em> 🥰
              </p>
            </div>

            <div style="text-align: center; background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%); padding: 30px; border-radius: 12px; margin: 30px 0; border: 3px dashed #6c757d;">
              <h3 style="color: #495057; margin: 0 0 15px 0; font-size: 20px;">🎁 Kleines Dankeschön</h3>
              <p style="color: #6c757d; margin: 0; font-size: 16px; line-height: 1.6;">
                Als Zeichen unserer Wertschätung legen wir Ihrer Sendung<br>
                <strong style="color: #dc3545;">ein kleines Überraschungsgeschenk</strong> bei!<br><br>
                💝 <em>Lassen Sie sich überraschen...</em>
              </p>
            </div>
            
            <hr style="border: none; border-top: 2px solid #e9ecef; margin: 30px 0;">
            
            <div style="text-align: center;">
              <p style="color: #6c757d; font-size: 14px; line-height: 1.6; margin: 0;">
                <strong>Fragen zu Ihrer Bestellung? Wir sind für Sie da! 🤝</strong><br>
                📧 <strong>info@gluecksmomente-manufaktur.de</strong><br>
                📞 <strong>Mo-Fr 9-17 Uhr</strong><br><br>
                
                <em>Folgen Sie uns für Pflegetipps, Behind-the-Scenes & mehr:</em><br>
                📱 Instagram | 👍 Facebook | 💌 Newsletter
              </p>
            </div>
            
            <div style="margin: 30px 0; padding: 20px; background: linear-gradient(135deg, #e8f5e8 0%, #f0f8f0 100%); border-radius: 12px; text-align: center;">
              <p style="color: #2e7d32; margin: 0; font-style: italic; font-size: 16px; line-height: 1.6;">
                💚 "Möge jede Berührung mit unseren Seifen ein kleiner Moment der Freude in Ihrem Alltag sein."<br><br>
                <strong>Von Herzen - Ihr Team der Glücksmomente Manufaktur</strong>
              </p>
            </div>
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
  // Admin-Benachrichtigung für neue Anfragen
  async sendAdminInquiryNotification(inquiry) {
    console.log('📧 [E-Mail Service] Admin-Anfrage-Benachrichtigung angefordert:', { 
      inquiryId: inquiry._id,
      customerEmail: inquiry.email 
    });
    
    if (this.isDisabled) {
      console.log('🟡 [DEMO-MODUS] E-Mail-Service nicht konfiguriert - simuliere Versand');
      console.log('   📧 Typ: Admin-Anfrage-Benachrichtigung');
      console.log('   📝 Anfrage von:', inquiry.name, '(', inquiry.email, ')');
      console.log('   📞 Telefon:', inquiry.phone);
      console.log('   💬 Nachricht:', inquiry.message?.substring(0, 50) + '...');
      console.log('   📬 An: Admin (', this.adminEmail, ')');
      console.log('   💡 Tipp: Für echte E-Mails Resend API-Key konfigurieren');
      
      await this.saveEmailLog({
        to: this.adminEmail,
        subject: '📝 Neue Kundenanfrage eingegangen',
        type: 'admin-inquiry-notification',
        success: true,
        messageId: 'demo-' + Date.now(),
        simulation: true,
        inquiryId: inquiry._id
      });
      
      return { 
        success: true, 
        messageId: 'demo-simulation-' + Date.now(),
        simulation: true,
        message: 'E-Mail im Demo-Modus simuliert - für echte E-Mails Resend API konfigurieren'
      };
    }

    try {
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
        <div style="font-family: Arial, sans-serif; max-width: 650px; margin: 0 auto; padding: 20px; background-color: #f8f9fa;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 35px; text-align: center; border-radius: 12px 12px 0 0; color: white;">
            <h1 style="margin: 0; font-size: 28px;">🎯 Neue Kundenanfrage eingegangen!</h1>
            <p style="margin: 10px 0 5px 0; opacity: 0.9; font-size: 16px;">Glücksmomente Manufaktur - Kundenkontakt</p>
            <p style="margin: 0; opacity: 0.8; font-size: 14px;">Ein interessierter Kunde möchte mit Ihnen sprechen ✨</p>
          </div>
          
          <div style="background: white; padding: 35px; border-radius: 0 0 12px 12px; box-shadow: 0 4px 15px rgba(0,0,0,0.1);">
            
            <div style="background: #e8f5e8; border: 3px solid #4caf50; border-radius: 12px; padding: 25px; margin-bottom: 30px;">
              <h2 style="color: #2e7d32; margin: 0 0 15px 0; font-size: 20px;">🚨 Schnelle Antwort erwünscht!</h2>
              <p style="color: #2e7d32; margin: 0; line-height: 1.6;">
                Ein Kunde hat eine Anfrage gestellt und wartet auf Ihre Antwort. 
                <strong>Schnelle und persönliche Antworten stärken das Vertrauen!</strong>
              </p>
            </div>

            <div style="background: #f8f9fa; padding: 25px; border-radius: 12px; margin-bottom: 25px; border-left: 6px solid #667eea;">
              <h3 style="color: #667eea; margin-bottom: 20px; font-size: 20px;">👤 Kundeninformationen</h3>
              <table style="width: 100%; border-collapse: collapse;">
                <tr style="border-bottom: 1px solid #e9ecef;">
                  <td style="padding: 12px 15px 12px 0; font-weight: bold; color: #555; width: 140px;">👨‍💼 Name:</td>
                  <td style="padding: 12px 0; color: #333; font-size: 16px;">${inquiry.name || 'Nicht angegeben'}</td>
                </tr>
                <tr style="border-bottom: 1px solid #e9ecef;">
                  <td style="padding: 12px 15px 12px 0; font-weight: bold; color: #555;">📧 E-Mail:</td>
                  <td style="padding: 12px 0;"><a href="mailto:${inquiry.email}" style="color: #667eea; text-decoration: none; font-weight: bold; font-size: 16px;">${inquiry.email}</a></td>
                </tr>
                <tr style="border-bottom: 1px solid #e9ecef;">
                  <td style="padding: 12px 15px 12px 0; font-weight: bold; color: #555;">📞 Telefon:</td>
                  <td style="padding: 12px 0; color: #333; font-size: 16px;">${inquiry.phone || 'Nicht angegeben'}</td>
                </tr>
                <tr>
                  <td style="padding: 12px 15px 12px 0; font-weight: bold; color: #555;">⏰ Eingegangen:</td>
                  <td style="padding: 12px 0; color: #333; font-size: 16px;">${formatDate(inquiry.createdAt || new Date())}</td>
                </tr>
              </table>
            </div>
            
            <div style="background: #fff8e1; border: 3px solid #ffb300; border-radius: 12px; padding: 25px; margin-bottom: 30px;">
              <h3 style="color: #e65100; margin-bottom: 20px; font-size: 20px;">💬 Kundennachricht</h3>
              <div style="background: white; padding: 20px; border-radius: 8px; border: 2px solid #ffcc80;">
                <p style="color: #5d4037; line-height: 1.8; white-space: pre-wrap; margin: 0; font-size: 15px;">
                  "${inquiry.message || 'Keine spezifische Nachricht hinterlassen - Kunde möchte vermutlich allgemeine Informationen.'}"
                </p>
              </div>
            </div>
            
            <div style="background: linear-gradient(135deg, #e8f5e8 0%, #f0f8f0 100%); border: 3px solid #4caf50; border-radius: 12px; padding: 30px; text-align: center; margin-bottom: 30px;">
              <h3 style="color: #2e7d32; margin-bottom: 20px; font-size: 22px;">🎯 Ihre nächsten Schritte</h3>
              
              <div style="background: white; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
                <p style="color: #2e7d32; margin: 0; font-size: 16px; line-height: 1.6;">
                  💡 <strong>Profi-Tipp:</strong> Eine schnelle und persönliche Antwort zeigt Professionalität<br>
                  ⏰ <strong>Empfohlene Antwortzeit:</strong> Innerhalb von 4-8 Stunden<br>
                  🎪 <strong>Tonfall:</strong> Freundlich, hilfsbereit und kompetent
                </p>
              </div>
              
              <div style="margin: 25px 0;">
                <a href="mailto:${inquiry.email}?subject=Re: Ihre Anfrage bei der Glücksmomente Manufaktur&body=Liebe/r ${inquiry.name || 'Kunde/in'},%0D%0A%0D%0AVielen Dank für Ihr Interesse an unseren handgemachten Seifen! Gerne beantworte ich Ihre Frage...%0D%0A%0D%0AMit freundlichen Grüßen,%0D%0AIhr Team der Glücksmomente Manufaktur" 
                   style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
                          color: white; 
                          padding: 18px 40px; 
                          text-decoration: none; 
                          border-radius: 25px; 
                          font-weight: bold; 
                          font-size: 16px;
                          display: inline-block;
                          box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);
                          transition: all 0.3s ease;">
                  📧 Sofort professionell antworten
                </a>
              </div>
              
              <p style="color: #6c757d; margin: 0; font-size: 14px; font-style: italic;">
                ✨ E-Mail-Vorlage ist bereits vorbereitet - einfach anpassen und senden!
              </p>
            </div>
            
            <hr style="border: none; border-top: 2px solid #e9ecef; margin: 30px 0;">
            
            <div style="text-align: center;">
              <p style="color: #6c757d; font-size: 14px; line-height: 1.6; margin: 0;">
                🤖 <strong>Automatische Benachrichtigung</strong><br>
                Glücksmomente Manufaktur - Kundenkontakt-System<br><br>
                
                <em>Diese Nachricht wurde automatisch generiert und benötigt keine Antwort.</em>
              </p>
            </div>
          </div>
        </div>
      `;

      const { data, error } = await this.resend.emails.send({
        from: this.getSenderAddress(),
        to: [this.adminEmail],
        subject: '📝 Neue Kundenanfrage von ' + (inquiry.name || inquiry.email),
        html: htmlContent
      });

      if (error) {
        console.error('❌ [E-Mail Service] Admin-Anfrage-Benachrichtigung fehlgeschlagen:', error);
        return { success: false, error: error.message || error, data: null };
      }

      // Log in DB speichern
      await this.saveEmailLog({
        to: this.adminEmail,
        subject: '📝 Neue Kundenanfrage von ' + (inquiry.name || inquiry.email),
        type: 'admin-inquiry-notification',
        messageId: data?.id,
        success: true,
        inquiryId: inquiry._id
      });

      console.log('✅ [E-Mail Service] Admin-Anfrage-Benachrichtigung gesendet:', data?.id);
      return { success: true, messageId: data?.id, data };
    } catch (error) {
      console.error('❌ [E-Mail Service] Admin-Anfrage-Benachrichtigung Fehler:', error);
      
      // Log auch Fehler speichern
      await this.saveEmailLog({
        to: this.adminEmail,
        subject: '📝 Neue Kundenanfrage von ' + (inquiry.name || inquiry.email),
        type: 'admin-inquiry-notification',
        success: false,
        error: error.message,
        inquiryId: inquiry._id
      });

      return { success: false, error: error.message, data: null };
    }
  }

  // Bestehende sendAdminOrderNotification Funktion erweitern
  async sendAdminOrderNotification(orderData, pdfAttachment) {
    console.log('📧 [E-Mail Service] Admin-Benachrichtigung angefordert:', { 
      bestellnummer: orderData?.bestellung?.bestellnummer || orderData?.bestellnummer 
    });
    
    if (this.isDisabled) {
      console.log('🟡 [DEMO-MODUS] E-Mail-Service nicht konfiguriert - simuliere Versand');
      console.log('   📧 Typ: Admin-Benachrichtigung');
      console.log('   📦 Bestellung:', orderData?.bestellung?.bestellnummer || orderData?.bestellnummer);
      console.log('   👤 Kunde:', orderData?.kundenname || 'Test Kunde');
      console.log('   💰 Betrag:', orderData?.gesamtbetrag || orderData?.gesamtpreis, '€');
      console.log('   📬 An: Admin (', this.adminEmail, ')');
      console.log('   💡 Tipp: Für echte E-Mails Resend API-Key konfigurieren');
      
      await this.saveEmailLog({
        to: this.adminEmail,
        subject: '🚨 Neue Bestellung eingegangen',
        type: 'admin-notification',
        success: true,
        messageId: 'demo-' + Date.now(),
        simulation: true,
        orderId: orderData?.bestellung?._id || orderData?._id,
        orderNumber: orderData?.bestellung?.bestellnummer || orderData?.bestellnummer
      });
      
      return { 
        success: true, 
        messageId: 'demo-simulation-' + Date.now(),
        simulation: true,
        message: 'E-Mail im Demo-Modus simuliert - für echte E-Mails Resend API konfigurieren'
      };
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

  // 📧 Bestellung bestätigt E-Mail
  async sendOrderConfirmationEmail(bestellung) {
    console.log('📧 [E-Mail Service] Bestellbestätigungs-E-Mail angefordert:', { 
      bestellnummer: bestellung.bestellnummer, 
      email: bestellung.besteller?.email 
    });
    
    if (this.isDisabled) {
      console.log('🟡 [DEMO-MODUS] E-Mail-Service nicht konfiguriert - simuliere Versand');
      console.log('   📧 Typ: Bestellbestätigungs-E-Mail');
      console.log('   📦 Bestellung:', bestellung.bestellnummer);
      console.log('   📬 An:', bestellung.besteller?.email);
      console.log('   👤 Kunde:', bestellung.besteller?.vorname, bestellung.besteller?.nachname);
      console.log('   💰 Betrag:', bestellung.gesamtpreis, '€');
      console.log('   💡 Tipp: Für echte E-Mails Resend API-Key konfigurieren');
      
      await this.saveEmailLog({
        to: bestellung.besteller?.email,
        subject: '📦 Bestellbestätigung - Glücksmomente Manufaktur',
        type: 'order-confirmation',
        success: true,
        messageId: 'demo-' + Date.now(),
        simulation: true,
        orderId: bestellung._id,
        orderNumber: bestellung.bestellnummer
      });
      
      return { 
        success: true, 
        messageId: 'demo-simulation-' + Date.now(),
        simulation: true,
        message: 'E-Mail im Demo-Modus simuliert - für echte E-Mails Resend API konfigurieren'
      };
    }

    try {
      const formatPrice = (price) => {
        return new Intl.NumberFormat('de-DE', {
          style: 'currency',
          currency: 'EUR'
        }).format(price);
      };

      const formatDate = (dateString) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('de-DE', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        });
      };

      const htmlContent = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9;">
          <div style="background: linear-gradient(135deg, #9b4dca 0%, #6a4c93 100%); color: white; padding: 30px; text-align: center; border-radius: 12px 12px 0 0;">
            <h1 style="margin: 0; font-size: 28px; font-weight: bold;">✅ Bestellung bestätigt!</h1>
            <p style="margin: 10px 0 0 0; font-size: 16px; opacity: 0.9;">
              Ihre Bestellung wurde erfolgreich angenommen
            </p>
          </div>
          
          <div style="background-color: white; padding: 30px; border-radius: 0 0 12px 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
            <h2 style="color: #333; margin: 0 0 20px 0; font-size: 24px;">
              Liebe/r ${bestellung.besteller.vorname} ${bestellung.besteller.nachname},
            </h2>
            
            <p style="color: #555; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
              <strong>fantastische Neuigkeiten!</strong> 🎉 Wir haben Ihre Bestellung <strong>#${bestellung.bestellnummer}</strong> 
              erhalten und freuen uns sehr, diese für Sie bearbeiten zu dürfen.
            </p>
            
            <div style="background-color: #f0f8ff; border-left: 4px solid #9b4dca; padding: 20px; margin: 20px 0; border-radius: 8px;">
              <h3 style="color: #9b4dca; margin: 0 0 15px 0; font-size: 18px;">📦 Bestellübersicht</h3>
              <p style="color: #333; margin: 5px 0; font-size: 16px;"><strong>Bestellnummer:</strong> ${bestellung.bestellnummer}</p>
              <p style="color: #333; margin: 5px 0; font-size: 16px;"><strong>Bestelldatum:</strong> ${formatDate(bestellung.erstelltAm)}</p>
              <p style="color: #333; margin: 5px 0; font-size: 16px;"><strong>Gesamtbetrag:</strong> ${formatPrice(bestellung.preise?.gesamtsumme || 0)}</p>
            </div>
            
            <h3 style="color: #333; margin: 30px 0 15px 0; font-size: 20px;">🎯 Wie geht es weiter?</h3>
            <ul style="color: #555; font-size: 16px; line-height: 1.8; padding-left: 20px;">
              <li><strong>Sofort:</strong> Wir beginnen mit der sorgfältigen Zusammenstellung Ihrer Artikel</li>
              <li><strong>24-48h:</strong> Ihre Bestellung wird liebevoll verpackt und versandfertig gemacht</li>
              <li><strong>Versand:</strong> Sie erhalten automatisch eine E-Mail mit der Sendungsverfolgung</li>
              <li><strong>Ankunft:</strong> In 2-3 Werktagen erreichen Sie Ihre Glücksmomente</li>
            </ul>
            
            <div style="background-color: #fff3cd; border: 1px solid #ffeaa7; padding: 20px; margin: 25px 0; border-radius: 8px;">
              <h4 style="color: #856404; margin: 0 0 10px 0; font-size: 16px;">💡 Wichtiger Hinweis</h4>
              <p style="color: #856404; margin: 0; font-size: 14px; line-height: 1.5;">
                Alle weiteren Statusmeldungen zu Ihrer Bestellung können Sie jederzeit in Ihrem 
                <strong>persönlichen Kundenkonto</strong> auf unserer Website einsehen. Dort finden Sie auch 
                alle Details zu Versand und Tracking-Informationen.
              </p>
            </div>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="https://gluecksmomente-manufaktur.vercel.app/kundenkonto" 
                 style="background: linear-gradient(135deg, #9b4dca 0%, #6a4c93 100%); color: white; padding: 15px 30px; text-decoration: none; border-radius: 25px; font-weight: bold; font-size: 16px; display: inline-block; box-shadow: 0 4px 15px rgba(155, 77, 202, 0.3);">
                🔍 Zum Kundenkonto
              </a>
            </div>
            
            <p style="color: #555; font-size: 16px; line-height: 1.6; margin: 25px 0 0 0;">
              Vielen Dank für Ihr Vertrauen in die Glücksmomente Manufaktur! ✨<br>
              Bei Fragen stehen wir Ihnen gerne zur Verfügung.
            </p>
            
            <p style="color: #999; font-size: 14px; text-align: center; margin: 30px 0 0 0; padding-top: 20px; border-top: 1px solid #eee;">
              Automatische Benachrichtigung vom Bestellsystem<br>
              <strong style="color: #9b4dca;">Glücksmomente Manufaktur</strong>
            </p>
          </div>
        </div>
      `;

      const emailData = {
        from: `${this.fromName} <${this.fromEmail}>`,
        to: bestellung.besteller.email,
        subject: `✅ Bestellung bestätigt #${bestellung.bestellnummer} - Wir bearbeiten Ihre Bestellung`,
        html: htmlContent
      };

      const result = await this.resend.emails.send(emailData);

      // E-Mail-Versand in MongoDB loggen
      await this.logEmail({
        type: 'order_confirmation',
        to: bestellung.besteller.email,
        recipientName: `${bestellung.besteller.vorname} ${bestellung.besteller.nachname}`,
        userId: bestellung.userId,
        kundeId: bestellung.kundeId,
        orderId: bestellung._id,
        subject: emailData.subject,
        content: htmlContent,
        messageId: result.id
      });

      console.log('✅ Order confirmation email sent:', result);
      return { success: true, messageId: result.id };
    } catch (error) {
      console.error('❌ Order confirmation email failed:', error);
      return { success: false, error: error.message };
    }
  }

  // 📧 Bestellung abgelehnt E-Mail
  async sendOrderRejectionEmail(bestellung, reason = null) {
    if (this.isDisabled) {
      console.warn('E-Mail-Service deaktiviert - Ablehnungs-E-Mail wird nicht gesendet');
      return { success: false, error: 'E-Mail-Service deaktiviert' };
    }

    try {
      const formatPrice = (price) => {
        return new Intl.NumberFormat('de-DE', {
          style: 'currency',
          currency: 'EUR'
        }).format(price);
      };

      const formatDate = (dateString) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('de-DE', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        });
      };

      const defaultReason = `
        Leider müssen wir Ihnen mitteilen, dass es derzeit zu unvorhergesehenen Lieferschwierigkeiten 
        bei einigen Komponenten Ihrer Bestellung kommt. Unsere Lieferanten haben uns kurzfristig über 
        Verzögerungen informiert, die eine rechtzeitige Erfüllung Ihrer Bestellung verhindern würden.
        
        Als Manufaktur, die höchste Qualitätsstandards verfolgt, möchten wir Ihnen nur perfekte Produkte 
        liefern. Da wir zum jetzigen Zeitpunkt nicht garantieren können, wann alle Artikel wieder 
        vollständig verfügbar sind, haben wir uns schweren Herzens dazu entschieden, Ihre Bestellung 
        zu stornieren.
      `;

      const actualReason = reason || defaultReason;

      const htmlContent = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9;">
          <div style="background: linear-gradient(135deg, #dc3545 0%, #c82333 100%); color: white; padding: 30px; text-align: center; border-radius: 12px 12px 0 0;">
            <h1 style="margin: 0; font-size: 28px; font-weight: bold;">😔 Bestellung storniert</h1>
            <p style="margin: 10px 0 0 0; font-size: 16px; opacity: 0.9;">
              Leider müssen wir Ihre Bestellung absagen
            </p>
          </div>
          
          <div style="background-color: white; padding: 30px; border-radius: 0 0 12px 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
            <h2 style="color: #333; margin: 0 0 20px 0; font-size: 24px;">
              Liebe/r ${bestellung.besteller.vorname} ${bestellung.besteller.nachname},
            </h2>
            
            <p style="color: #555; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
              es tut uns außerordentlich leid, Ihnen mitteilen zu müssen, dass wir Ihre Bestellung 
              <strong>#${bestellung.bestellnummer}</strong> leider nicht wie geplant bearbeiten können.
            </p>
            
            <div style="background-color: #fff5f5; border-left: 4px solid #dc3545; padding: 20px; margin: 20px 0; border-radius: 8px;">
              <h3 style="color: #dc3545; margin: 0 0 15px 0; font-size: 18px;">📦 Bestelldetails</h3>
              <p style="color: #333; margin: 5px 0; font-size: 16px;"><strong>Bestellnummer:</strong> ${bestellung.bestellnummer}</p>
              <p style="color: #333; margin: 5px 0; font-size: 16px;"><strong>Bestelldatum:</strong> ${formatDate(bestellung.erstelltAm)}</p>
              <p style="color: #333; margin: 5px 0; font-size: 16px;"><strong>Betrag:</strong> ${formatPrice(bestellung.preise?.gesamtsumme || 0)}</p>
            </div>
            
            <h3 style="color: #333; margin: 30px 0 15px 0; font-size: 20px;">🔍 Grund der Stornierung</h3>
            <div style="background-color: #f8f9fa; border: 1px solid #dee2e6; padding: 20px; margin: 15px 0; border-radius: 8px;">
              <p style="color: #495057; margin: 0; font-size: 15px; line-height: 1.6;">
                ${actualReason.trim()}
              </p>
            </div>
            
            <h3 style="color: #333; margin: 30px 0 15px 0; font-size: 20px;">💰 Rückerstattung</h3>
            <p style="color: #555; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
              <strong>Gute Nachricht:</strong> Der Betrag von <strong>${formatPrice(bestellung.preise?.gesamtsumme || 0)}</strong> 
              wird Ihnen in den nächsten <strong>3-5 Werktagen</strong> vollständig auf Ihr Zahlungsmittel zurückerstattet. 
              Bei PayPal-Zahlungen erfolgt die Rückerstattung meist sofort.
            </p>
            
            <div style="background-color: #d1ecf1; border: 1px solid #b7d7e8; padding: 20px; margin: 25px 0; border-radius: 8px;">
              <h4 style="color: #0c5460; margin: 0 0 10px 0; font-size: 16px;">🎁 Besonderes Angebot für Sie</h4>
              <p style="color: #0c5460; margin: 0; font-size: 14px; line-height: 1.5;">
                Als Entschuldigung für die Unannehmlichkeiten erhalten Sie bei Ihrer nächsten Bestellung 
                einen <strong>10% Rabatt-Code: SORRY10</strong>. Dieser ist 60 Tage gültig und kann 
                ohne Mindestbestellwert eingelöst werden.
              </p>
            </div>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="https://gluecksmomente-manufaktur.vercel.app/products" 
                 style="background: linear-gradient(135deg, #9b4dca 0%, #6a4c93 100%); color: white; padding: 15px 30px; text-decoration: none; border-radius: 25px; font-weight: bold; font-size: 16px; display: inline-block; box-shadow: 0 4px 15px rgba(155, 77, 202, 0.3);">
                🛍️ Neue Bestellung aufgeben
              </a>
            </div>
            
            <p style="color: #555; font-size: 16px; line-height: 1.6; margin: 25px 0 0 0;">
              Wir entschuldigen uns nochmals für die Unannehmlichkeiten und hoffen, Sie bald wieder als Kunde 
              begrüßen zu dürfen. Sollten Sie Fragen haben, zögern Sie nicht, uns zu kontaktieren. 💙
            </p>
            
            <p style="color: #999; font-size: 14px; text-align: center; margin: 30px 0 0 0; padding-top: 20px; border-top: 1px solid #eee;">
              Automatische Benachrichtigung vom Bestellsystem<br>
              <strong style="color: #9b4dca;">Glücksmomente Manufaktur</strong>
            </p>
          </div>
        </div>
      `;

      const emailData = {
        from: `${this.fromName} <${this.fromEmail}>`,
        to: bestellung.besteller.email,
        subject: `😔 Bestellung #${bestellung.bestellnummer} storniert - Rückerstattung wird eingeleitet`,
        html: htmlContent
      };

      const result = await this.resend.emails.send(emailData);

      // E-Mail-Versand in MongoDB loggen
      await this.logEmail({
        type: 'order_rejection',
        to: bestellung.besteller.email,
        recipientName: `${bestellung.besteller.vorname} ${bestellung.besteller.nachname}`,
        userId: bestellung.userId,
        kundeId: bestellung.kundeId,
        orderId: bestellung._id,
        subject: emailData.subject,
        content: htmlContent,
        messageId: result.id
      });

      console.log('✅ Order rejection email sent:', result);
      return { success: true, messageId: result.id };
    } catch (error) {
      console.error('❌ Order rejection email failed:', error);
      return { success: false, error: error.message };
    }
  }

  // 🧾 Rechnung per E-Mail an Kunden versenden
  async sendInvoiceEmail(customerEmail, invoiceData, pdfAttachment) {
    if (this.isDisabled) {
      console.log('📧 E-Mail-Service deaktiviert - Rechnungsversand übersprungen');
      return { success: false, error: 'E-Mail-Service deaktiviert' };
    }

    try {
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

      const customerName = invoiceData.customer?.customerData?.firstName ? 
                          `${invoiceData.customer.customerData.firstName} ${invoiceData.customer.customerData.lastName}`.trim() :
                          invoiceData.besteller ? 
                          `${invoiceData.besteller.vorname} ${invoiceData.besteller.nachname}`.trim() :
                          invoiceData.customer?.customerData?.company || 
                          invoiceData.besteller?.firma || 'Liebe Kundin, lieber Kunde';

      // Flexibel mit verschiedenen Datenstrukturen arbeiten
      const invoiceNumber = invoiceData.invoiceNumber || invoiceData.bestellnummer;
      const invoiceDate = invoiceData.dates?.invoiceDate || invoiceData.bestelldatum;
      const totalAmount = invoiceData.amounts?.total || invoiceData.gesamtsumme;

      const htmlContent = `
        <div style="max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif; line-height: 1.6;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 35px; border-radius: 12px 12px 0 0; text-align: center;">
            <h1 style="margin: 0; font-size: 32px;">🧾 Ihre Rechnung ist da!</h1>
            <p style="margin: 15px 0 5px 0; font-size: 18px; opacity: 0.9;">
              ${customerName}
            </p>
            <p style="margin: 0; font-size: 16px; opacity: 0.8;">
              Vielen Dank für Ihr Vertrauen in unsere handgemachten Seifen ✨
            </p>
          </div>
          
          <div style="background: white; padding: 30px; border: 1px solid #eee; border-top: none; border-radius: 0 0 12px 12px; box-shadow: 0 4px 15px rgba(0,0,0,0.1);">
            
            <div style="background: #e8f5e8; padding: 25px; border-radius: 12px; margin-bottom: 30px; border: 2px solid #4caf50;">
              <h2 style="color: #2e7d32; margin: 0 0 15px 0; font-size: 20px; text-align: center;">💚 Rechnung für Ihre Bestellung</h2>
              <p style="margin: 0; color: #2e7d32; text-align: center; line-height: 1.6;">
                Anbei finden Sie Ihre Rechnung als PDF.<br>
                <strong>Herzlichen Dank für Ihr Vertrauen!</strong>
              </p>
            </div>

            <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 30px;">
              <h2 style="color: #333; margin: 0 0 15px 0; font-size: 20px;">📋 Rechnungsdetails</h2>
              <p style="margin: 5px 0; color: #666;"><strong>Rechnungsnummer:</strong> <span style="color: #667eea; font-weight: bold;">${invoiceNumber}</span></p>
              <p style="margin: 5px 0; color: #666;"><strong>Rechnungsdatum:</strong> ${formatDate(invoiceDate)}</p>
              <p style="margin: 5px 0; color: #666;"><strong>Gesamtbetrag:</strong> <span style="color: #2e7d32; font-weight: bold; font-size: 18px;">${formatPrice(totalAmount)}</span></p>
            </div>

            ${invoiceData.artikel ? `
            <h3 style="color: #333; margin: 30px 0 15px 0;">🛍️ Ihre Artikel</h3>
            <table style="width: 100%; border-collapse: collapse; margin-bottom: 30px;">
              <thead>
                <tr style="background: #f8f9fa; border-bottom: 2px solid #dee2e6;">
                  <th style="text-align: left; padding: 12px; border-bottom: 1px solid #dee2e6;">Artikel</th>
                  <th style="text-align: center; padding: 12px; border-bottom: 1px solid #dee2e6;">Menge</th>
                  <th style="text-align: right; padding: 12px; border-bottom: 1px solid #dee2e6;">Einzelpreis</th>
                  <th style="text-align: right; padding: 12px; border-bottom: 1px solid #dee2e6;">Gesamtpreis</th>
                </tr>
              </thead>
              <tbody>
                ${invoiceData.artikel.map(artikel => `
                  <tr>
                    <td style="padding: 12px; border-bottom: 1px solid #f1f1f1;">
                      <strong>${artikel.name}</strong>
                      ${artikel.beschreibung ? `<br><small style="color: #666;">${artikel.beschreibung}</small>` : ''}
                    </td>
                    <td style="text-align: center; padding: 12px; border-bottom: 1px solid #f1f1f1;">${artikel.menge}</td>
                    <td style="text-align: right; padding: 12px; border-bottom: 1px solid #f1f1f1;">${formatPrice(artikel.einzelpreis)}</td>
                    <td style="text-align: right; padding: 12px; border-bottom: 1px solid #f1f1f1;">${formatPrice(artikel.gesamtpreis)}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>

            <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 30px;">
              <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
                <span>Nettosumme:</span>
                <span>${formatPrice(invoiceData.nettosumme)}</span>
              </div>
              ${invoiceData.mwst > 0 ? `
                <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
                  <span>MwSt. (19%):</span>
                  <span>${formatPrice(invoiceData.mwst)}</span>
                </div>
              ` : `
                <div style="display: flex; justify-content: space-between; margin-bottom: 10px; color: #666; font-size: 14px;">
                  <span>Kleinunternehmer-Regelung (§19 UStG):</span>
                  <span>Keine MwSt.</span>
                </div>
              `}
              <hr style="border: none; border-top: 1px solid #dee2e6; margin: 15px 0;">
              <div style="display: flex; justify-content: space-between; font-size: 18px; font-weight: bold; color: #333;">
                <span>Gesamtsumme:</span>
                <span style="color: #28a745;">${formatPrice(totalAmount)}</span>
              </div>
            </div>
            ` : ''}

            <div style="background: #fff3e0; padding: 20px; border-radius: 8px; border-left: 4px solid #ff9800; margin-bottom: 30px;">
              <h3 style="color: #e65100; margin: 0 0 15px 0; font-size: 16px;">📄 Rechnungsanhang</h3>
              <p style="margin: 0; color: #e65100;">
                Ihre Rechnung finden Sie als PDF im Anhang dieser E-Mail.
              </p>
            </div>

            <div style="background: #e3f2fd; padding: 20px; border-radius: 8px; border-left: 4px solid #2196f3; margin-bottom: 30px;">
              <h3 style="color: #1565c0; margin: 0 0 15px 0; font-size: 16px;">💳 Zahlungsinformation</h3>
              <p style="margin: 0; color: #1565c0; line-height: 1.6;">
                ${invoiceData.zahlungsmethode === 'pending' ? 
                  'Die Zahlung für diese Rechnung steht noch aus. Weitere Informationen finden Sie in der PDF-Rechnung.' :
                  'Vielen Dank für die pünktliche Zahlung!'
                }
              </p>
            </div>

            <div style="margin-top: 30px; padding-top: 20px; border-top: 2px solid #eee; text-align: center;">
              <p style="color: #666; margin: 10px 0;">
                Bei Fragen zur Rechnung kontaktieren Sie uns gerne!
              </p>
              <div style="color: #999; font-size: 14px; margin: 20px 0;">
                <p style="margin: 5px 0;"><strong>Glücksmomente Manufaktur</strong></p>
                <p style="margin: 5px 0;">📧 info@gluecksmomente-manufaktur.de</p>
                <p style="margin: 5px 0;">📞 +49 123 456789</p>
              </div>
              
              <div style="background: #f8f9fa; padding: 15px; border-radius: 8px; margin-top: 20px;">
                <p style="color: #666; margin: 0; font-size: 12px; line-height: 1.4;">
                  <strong>Glücksmomente Manufaktur</strong> • Wasserwerkstrasse 15 • 68642 Bürstadt<br>
                  Geschäftsführer: Ralf Jacob • Einzelunternehmen<br>
                  Finanzamt Bensheim • Steuernummer: DE123456789
                </p>
              </div>
            </div>
          </div>
        </div>
      `;

      const attachments = [];
      if (pdfAttachment) {
        attachments.push({
          filename: `Rechnung_${invoiceNumber}.pdf`,
          content: pdfAttachment
        });
      }

      const emailData = {
        from: `${this.fromName} <${this.fromEmail}>`,
        to: customerEmail,
        subject: `📧 Ihre Rechnung ${invoiceNumber} von Glücksmomente Manufaktur`,
        html: htmlContent,
        attachments
      };

      console.log(`📧 [EmailService] Sending invoice email to: ${customerEmail}`);
      
      const result = await this.resend.emails.send(emailData);

      // E-Mail-Versand in DB protokollieren
      await this.logEmail({
        to: customerEmail,
        from: emailData.from,
        subject: emailData.subject,
        content: htmlContent,
        type: 'invoice',
        status: 'sent',
        invoiceId: invoiceData._id,
        messageId: result.id
      });

      console.log('✅ Invoice email sent:', result);
      return { success: true, messageId: result.id };
    } catch (error) {
      console.error('❌ Invoice email failed:', error);
      
      // Fehler in DB protokollieren
      await this.logEmail({
        to: customerEmail,
        from: `${this.fromName} <${this.fromEmail}>`,
        subject: `Rechnung ${invoiceNumber}`,
        content: 'E-Mail-Versand fehlgeschlagen',
        type: 'invoice',
        status: 'failed',
        invoiceId: invoiceData._id,
        error: error.message
      });
      
      return { success: false, error: error.message };
    }
  }

  /**
   * Sendet eine Eingangsbestätigung an den Kunden nach erfolgreichem Widerruf.
   * @param {Object} widerruf  – gespeichertes Widerruf-Dokument aus MongoDB
   */
  async sendWiderrufBestaetigung(widerruf) {
    if (this.isDisabled) {
      console.log('📧 E-Mail-Service deaktiviert – Widerrufsbestätigung übersprungen');
      return { success: true, simulation: true };
    }

    const {
      customerName,
      customerEmail,
      orderNumber,
      contractRef,
      _id,
      createdAt
    } = widerruf;

    if (!customerEmail) {
      return { success: false, error: 'Keine Kunden-E-Mail vorhanden' };
    }

    const formatDate = (date) =>
      new Intl.DateTimeFormat('de-DE', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      }).format(new Date(date));

    const refLine = orderNumber
      ? `<strong>Bestellnummer:</strong> ${orderNumber}`
      : contractRef
      ? `<strong>Vertragsreferenz:</strong> ${contractRef}`
      : null;

    const htmlContent = `
      <div style="max-width:600px;margin:0 auto;font-family:Arial,Helvetica,sans-serif;line-height:1.6;color:#1a1a1a;">
        <div style="background:linear-gradient(135deg,#7b3f7b 0%,#4a1f4a 100%);color:white;padding:30px;border-radius:12px 12px 0 0;text-align:center;">
          <h1 style="margin:0;font-size:24px;">✅ Widerruf eingegangen</h1>
          <p style="margin:12px 0 0;font-size:15px;opacity:.9;">Eingangsbestätigung gemäß § 355 BGB</p>
        </div>
        <div style="background:#fff;padding:28px;border:1px solid #e0e0e0;border-top:none;border-radius:0 0 12px 12px;">
          <p>Guten Tag${customerName ? ` ${customerName}` : ''},</p>
          <p>
            wir bestätigen den Eingang Ihrer Widerrufserklärung. Ihr Widerruf wurde elektronisch erfasst und
            wird nun von uns geprüft.
          </p>
          <div style="background:#f3e8f3;border-left:4px solid #7b3f7b;padding:14px 18px;border-radius:4px;margin:20px 0;">
            <p style="margin:0 0 6px;font-size:13px;"><strong>Ihre Referenzdaten:</strong></p>
            ${refLine ? `<p style="margin:0 0 4px;font-size:13px;">${refLine}</p>` : ''}
            <p style="margin:0 0 4px;font-size:13px;"><strong>Widerrufs-ID:</strong> ${_id}</p>
            <p style="margin:0;font-size:13px;"><strong>Eingegangen am:</strong> ${formatDate(createdAt)}</p>
          </div>
          <p>
            Bitte beachten Sie: Für personalisierte Produkte, die bereits auf Ihren Wunsch hin angefertigt wurden,
            ist das Widerrufsrecht gemäß § 312g Abs. 2 Nr. 1 BGB ausgeschlossen. Wir werden Sie gesondert
            informieren, sofern dies für Ihre Bestellung zutrifft.
          </p>
          <p>
            Wir werden Ihren Widerruf schnellstmöglich bearbeiten und Sie über das Ergebnis benachrichtigen.
            Bei Fragen stehen wir Ihnen gerne zur Verfügung.
          </p>
          <p style="margin-top:24px;">
            Mit freundlichen Grüßen,<br>
            <strong>Glücksmomente Manufaktur</strong>
          </p>
        </div>
        <p style="text-align:center;font-size:11px;color:#999;margin-top:12px;">
          Diese E-Mail wurde automatisch generiert. Bitte antworten Sie direkt auf diese E-Mail bei Rückfragen.
        </p>
      </div>`;

    const emailLogEntry = await this.logEmail({
      to: customerEmail,
      from: `${this.fromName} <${this.fromEmail}>`,
      subject: `Eingangsbestätigung Ihres Widerrufs – Glücksmomente Manufaktur`,
      content: `Widerrufsbestätigung für ${customerName || customerEmail}, Widerrufs-ID: ${_id}`,
      type: 'widerruf'
    });

    try {
      const result = await this.resend.emails.send({
        from: `${this.fromName} <${this.fromEmail}>`,
        to: customerEmail,
        subject: `Eingangsbestätigung Ihres Widerrufs – Glücksmomente Manufaktur`,
        html: htmlContent
      });

      await this.updateEmailLog(emailLogEntry, 'sent', result?.data?.id);
      return { success: true, emailId: result?.data?.id };
    } catch (error) {
      console.error('❌ Fehler beim Senden der Widerrufsbestätigung:', error.message);
      await this.updateEmailLog(emailLogEntry, 'failed', null, error.message);
      return { success: false, error: error.message };
    }
  }
}

module.exports = new EmailService();