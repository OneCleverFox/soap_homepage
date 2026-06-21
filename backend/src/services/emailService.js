const { Resend } = require('resend');
const nodemailer = require('nodemailer');
const dns = require('dns');
const { google } = require('googleapis');
const EmailOut = require('../models/EmailOut');

class EmailService {
  constructor() {
    try {
      dns.setDefaultResultOrder('ipv4first');
    } catch (dnsOrderError) {
      // Nicht kritisch - Transport nutzt zusätzlich family: 4.
      console.warn('⚠️ Konnte DNS ipv4first nicht setzen:', dnsOrderError.message);
    }

    this.environment = process.env.NODE_ENV || 'development';
    this.isProduction = this.environment === 'production';
    this.smtpOnlyMode = this.isProduction || String(process.env.SMTP_ONLY || '').toLowerCase() === 'true';

        // ─── Gmail API OAuth2 ─────────────────────────────────────────────────────
        const gmailClientId = (process.env.GMAIL_OAUTH_CLIENT_ID || '').trim();
        const gmailClientSecret = (process.env.GMAIL_OAUTH_CLIENT_SECRET || '').trim();
        const gmailRefreshToken = (process.env.GMAIL_OAUTH_REFRESH_TOKEN || '').trim();
        const gmailOAuthFrom = (process.env.GMAIL_OAUTH_FROM_EMAIL || process.env.EMAIL_USER || process.env.GMAIL_USER || '').trim();

        this.gmailOAuthConfigured = Boolean(gmailClientId && gmailClientSecret && gmailRefreshToken && gmailOAuthFrom);
        this.gmailOAuthFrom = gmailOAuthFrom;

        if (this.gmailOAuthConfigured) {
          this.gmailOAuth2Client = new google.auth.OAuth2(gmailClientId, gmailClientSecret);
          this.gmailOAuth2Client.setCredentials({ refresh_token: gmailRefreshToken });
          this.gmailApi = google.gmail({ version: 'v1', auth: this.gmailOAuth2Client });
          console.log('✅ Gmail API OAuth2 konfiguriert – verwende Gmail API für E-Mail-Versand');
        } else {
          console.warn('⚠️ Gmail API OAuth2 nicht vollständig konfiguriert (GMAIL_OAUTH_CLIENT_ID, GMAIL_OAUTH_CLIENT_SECRET, GMAIL_OAUTH_REFRESH_TOKEN, GMAIL_OAUTH_FROM_EMAIL)');
        }
        // ─────────────────────────────────────────────────────────────────────────
    this.smtpForceIpv4 = String(process.env.SMTP_FORCE_IPV4 || 'true').toLowerCase() !== 'false';
    this.adminEmail = process.env.ADMIN_EMAIL || 'admin@example.com';
    this.notificationEmail = process.env.ADMIN_ALERT_EMAIL || this.adminEmail;

    const smtpUser = (
      process.env.GMAIL_USER ||
      process.env.GMAIL_EMAIL ||
      process.env.SMTP_USER ||
      process.env.EMAIL_USER ||
      ''
    ).trim();

    const smtpPass = (
      process.env.GMAIL_APP_PASSWORD ||
      process.env.GMAIL_PASSWORD ||
      process.env.SMTP_PASS ||
      process.env.SMTP_PASSWORD ||
      process.env.EMAIL_PASS ||
      process.env.EMAIL_PASSWORD ||
      ''
    ).trim();

    this.smtpUserConfigured = Boolean(smtpUser);
    this.smtpPassConfigured = Boolean(smtpPass);
    this.smtpAuth = { user: smtpUser, pass: smtpPass };
    this.smtpBackoffMs = Number(process.env.SMTP_FAILURE_BACKOFF_MS || 300000);
    this.smtpDisabledUntil = 0;

    if (smtpUser && smtpPass) {
      this.smtpHost = process.env.SMTP_HOST || 'smtp.gmail.com';
      this.smtpPort = Number(process.env.SMTP_PORT || 465);
      this.smtpSecure = String(process.env.SMTP_SECURE || 'true').toLowerCase() !== 'false';

      this.smtpTransport = nodemailer.createTransport({
        host: this.smtpHost,
        port: this.smtpPort,
        secure: this.smtpSecure,
        family: 4,
        connectionTimeout: Number(process.env.SMTP_CONNECTION_TIMEOUT || 6000),
        greetingTimeout: Number(process.env.SMTP_GREETING_TIMEOUT || 6000),
        socketTimeout: Number(process.env.SMTP_SOCKET_TIMEOUT || 10000),
        dnsTimeout: Number(process.env.SMTP_DNS_TIMEOUT || 8000),
        tls: {
          servername: this.smtpHost
        },
        auth: this.smtpAuth
      });
      this.activeProvider = 'gmail';
      console.log('📧 SMTP-Konfiguration erkannt: user=true, pass=true');
    } else {
      console.warn(`📧 SMTP-Konfiguration unvollständig: user=${this.smtpUserConfigured}, pass=${this.smtpPassConfigured}`);
    }

    // Optionaler Resend-Fallback: explizite ENV gewinnt; ohne ENV in Production standardmäßig AN.
    const resendFallbackFlag = String(process.env.ENABLE_RESEND_FALLBACK || '').trim().toLowerCase();
    this.enableResendFallback = resendFallbackFlag
      ? resendFallbackFlag === 'true'
      : this.isProduction;

    // Optionaler Resend-Fallback
    const apiKey = process.env.RESEND_API_KEY;
    const isPlaceholderKey = !apiKey ||
      apiKey.includes('placeholder') ||
      apiKey.includes('testing') ||
      apiKey.includes('123456') ||
      apiKey === 're_123456789_placeholder_key_for_testing';

    const hasValidResendApiKey = Boolean(apiKey && !isPlaceholderKey);
    // Resend ist standardmäßig in Production deaktiviert; kann aber explizit via ENABLE_RESEND_FALLBACK aktiviert werden.
    const shouldEnableResend = hasValidResendApiKey;

    if (shouldEnableResend) {
      this.resend = new Resend(apiKey);
      if (!this.activeProvider) {
        this.activeProvider = 'resend';
      }
    }

    this.resendFromEmail = (process.env.RESEND_FROM || process.env.RESEND_FROM_EMAIL || '').trim();

    const configuredFromEmail = (process.env.EMAIL_FROM || smtpUser || '').trim();

    // Absenderadresse: bevorzugt aus ENV, sonst Gmail-Fallback
    this.fromEmail = configuredFromEmail || 'info.gluecksmomente.manufaktur@gmail.com';
    this.fromName = this.isProduction ? 'Glücksmomente Manufaktur' : 'Glücksmomente Manufaktur (DEV)';

    this.isDisabled = !this.gmailOAuthConfigured && !this.smtpTransport && !this.resend;
    this.isDemoMode = this.isDisabled;

    if (this.isDisabled) {
      console.warn('⚠️ Kein E-Mail-Provider konfiguriert - E-Mail-Service im DEMO-MODUS');
      console.warn('📝 Für Gmail API: GMAIL_OAUTH_CLIENT_ID, GMAIL_OAUTH_CLIENT_SECRET, GMAIL_OAUTH_REFRESH_TOKEN, GMAIL_OAUTH_FROM_EMAIL setzen');
      if (this.smtpOnlyMode) {
        console.warn('⚠️ SMTP-ONLY ist aktiv: Resend wird in dieser Umgebung nicht verwendet');
      }
    } else if (this.gmailOAuthConfigured) {
      console.log('📧 E-Mail-Service: Gmail API OAuth2 (primär)' + (this.smtpTransport ? ' + SMTP (Fallback)' : ''));
    } else if (this.smtpTransport) {
      console.log('📧 E-Mail-Service: SMTP (Gmail API nicht konfiguriert)');
    }
  }

  async createSmtpTransportForAttempt({ port, secure, requireTLS = false } = {}) {
    let connectHost = this.smtpHost;

    if (this.smtpForceIpv4) {
      try {
        const ipv4Records = await dns.promises.resolve4(this.smtpHost);
        if (ipv4Records && ipv4Records.length > 0) {
          connectHost = ipv4Records[0];
        }
      } catch (resolveError) {
        console.warn('⚠️ SMTP IPv4-Auflösung fehlgeschlagen, verwende Hostname:', resolveError.message);
      }
    }

    return nodemailer.createTransport({
      host: connectHost,
      port: Number(port || this.smtpPort || 465),
      secure: typeof secure === 'boolean' ? secure : this.smtpSecure,
      requireTLS,
      family: 4,
      connectionTimeout: Number(process.env.SMTP_CONNECTION_TIMEOUT || 6000),
      greetingTimeout: Number(process.env.SMTP_GREETING_TIMEOUT || 6000),
      socketTimeout: Number(process.env.SMTP_SOCKET_TIMEOUT || 10000),
      dnsTimeout: Number(process.env.SMTP_DNS_TIMEOUT || 8000),
      tls: {
        servername: this.smtpHost
      },
      auth: this.smtpAuth
    });
  }

  isSmtpNetworkError(error) {
    const code = String(error?.code || '').toUpperCase();
    const message = String(error?.message || '').toLowerCase();

    return (
      code === 'ENETUNREACH' ||
      code === 'EHOSTUNREACH' ||
      code === 'ETIMEDOUT' ||
      code === 'ECONNECTION' ||
      message.includes('connection timeout') ||
      message.includes('timed out') ||
      message.includes('enetwork') ||
      message.includes('enetunreach') ||
      message.includes('ehostunreach')
    );
  }

  async tryAlternateGmailPort(smtpMail) {
    // Häufig ist in Cloud-Umgebungen nur einer der beiden Gmail-Ports erreichbar.
    const shouldTryAlternatePort =
      this.smtpHost === 'smtp.gmail.com' &&
      this.smtpPort === 465 &&
      this.smtpSecure === true;

    if (!shouldTryAlternatePort) {
      return null;
    }

    try {
      const alternateTransport = await this.createSmtpTransportForAttempt({
        port: 587,
        secure: false,
        requireTLS: true
      });

      const info = await alternateTransport.sendMail(smtpMail);
      return {
        id: info.messageId,
        data: { id: info.messageId },
        provider: 'gmail-587'
      };
    } catch (alternateError) {
      return { error: alternateError };
    }
  }

  /**
   * Sendet eine E-Mail via Gmail API (OAuth2) – funktioniert auf Railway, da nur HTTPS Port 443 benötigt wird.
   */
  async sendViaGmailAPI(emailData) {
    if (!this.gmailOAuthConfigured || !this.gmailApi) {
      return { error: { message: 'Gmail API OAuth2 nicht konfiguriert' } };
    }

    try {
      // RFC 2822 MIME-Nachricht aufbauen
      const fromAddress = `${this.fromName} <${this.gmailOAuthFrom}>`;
      const toAddress = emailData.to;
      const subject = emailData.subject || '(kein Betreff)';

      let mimeLines = [
        `From: ${fromAddress}`,
        `To: ${toAddress}`,
        `Subject: =?UTF-8?B?${Buffer.from(subject).toString('base64')}?=`,
        `MIME-Version: 1.0`,
      ];

      const attachments = emailData.attachments || [];

      if (attachments.length > 0) {
        const boundary = `boundary_${Date.now()}_${Math.random().toString(36).slice(2)}`;
        mimeLines.push(`Content-Type: multipart/mixed; boundary="${boundary}"`);
        mimeLines.push('');
        mimeLines.push(`--${boundary}`);
        mimeLines.push('Content-Type: text/html; charset=UTF-8');
        mimeLines.push('Content-Transfer-Encoding: base64');
        mimeLines.push('');
        mimeLines.push(Buffer.from(emailData.html || emailData.text || '').toString('base64'));

        for (const att of attachments) {
          const contentData = typeof att.content === 'string' ? att.content : att.content.toString('base64');
          mimeLines.push(`--${boundary}`);
          mimeLines.push(`Content-Type: ${att.contentType || 'application/octet-stream'}; name="${att.filename}"`);
          mimeLines.push(`Content-Disposition: attachment; filename="${att.filename}"`);
          mimeLines.push('Content-Transfer-Encoding: base64');
          mimeLines.push('');
          mimeLines.push(contentData);
        }
        mimeLines.push(`--${boundary}--`);
      } else {
        mimeLines.push('Content-Type: text/html; charset=UTF-8');
        mimeLines.push('Content-Transfer-Encoding: base64');
        mimeLines.push('');
        mimeLines.push(Buffer.from(emailData.html || emailData.text || '').toString('base64'));
      }

      const rawMessage = mimeLines.join('\r\n');
      const encodedMessage = Buffer.from(rawMessage)
        .toString('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');

      const response = await this.gmailApi.users.messages.send({
        userId: 'me',
        requestBody: { raw: encodedMessage }
      });

      const messageId = response?.data?.id || `gmail-api-${Date.now()}`;
      console.log(`✅ Gmail API: E-Mail gesendet (id=${messageId}) an ${toAddress}`);
      return {
        id: messageId,
        data: { id: messageId },
        provider: 'gmail-api'
      };
    } catch (apiError) {
      console.error('❌ Gmail API Fehler:', apiError.message);
      return { error: { message: `Gmail API Fehler: ${apiError.message}` } };
    }
  }

  async sendViaResend(emailData, smtpErrorMessage = null) {
    if (!this.resend) {
      if (smtpErrorMessage) {
        return { error: { message: `Gmail SMTP Fehler: ${smtpErrorMessage}` } };
      }
      return { error: { message: 'Kein E-Mail-Provider konfiguriert' } };
    }

    const resendEmailData = {
      ...emailData,
      from: this.getResendSenderAddress()
    };

    try {
      const resendResult = await this.resend.emails.send(resendEmailData);
      if (!resendResult?.error) {
        return {
          ...resendResult,
          provider: 'resend'
        };
      }

      const resendError = resendResult?.error?.message || 'Unbekannter Resend-Fehler';
      return {
        error: {
          message: smtpErrorMessage
            ? `Gmail SMTP Fehler: ${smtpErrorMessage}; Resend-Fallback Fehler: ${resendError}`
            : resendError
        }
      };
    } catch (resendFallbackError) {
      return {
        error: {
          message: smtpErrorMessage
            ? `Gmail SMTP Fehler: ${smtpErrorMessage}; Resend-Fallback Ausnahme: ${resendFallbackError.message}`
            : `Resend-Fallback Ausnahme: ${resendFallbackError.message}`
        }
      };
    }
  }

  getResendSenderAddress() {
    const preferredResendFrom = this.resendFromEmail;
    if (preferredResendFrom) {
      return `${this.fromName} <${preferredResendFrom}>`;
    }

    const fromEmailLower = String(this.fromEmail || '').toLowerCase();
    const usesLikelyUnverifiedPublicDomain = fromEmailLower.endsWith('@gmail.com') ||
      fromEmailLower.endsWith('@googlemail.com') ||
      fromEmailLower.endsWith('@yahoo.com') ||
      fromEmailLower.endsWith('@outlook.com') ||
      fromEmailLower.endsWith('@hotmail.com');

    if (usesLikelyUnverifiedPublicDomain) {
      return `${this.fromName} <onboarding@resend.dev>`;
    }

    return this.getSenderAddress();
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
          provider: this.activeProvider || 'smtp'
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

  // Legacy-Wrapper für bestehenden Code
  async saveEmailLog(emailData) {
    const typeMap = {
      verification: 'email_verification',
      welcome: 'welcome_email',
      'password-reset': 'password_reset',
      password_reset: 'password_reset',
      'profile-update': 'profile_update_notification',
      profile_update_notification: 'profile_update_notification',
      'account-deletion': 'account_deletion_confirmation',
      'order-confirmation': 'order_confirmation',
      'order-rejection': 'order_rejection',
      'admin-inquiry-notification': 'system_notification',
      'admin-notification': 'system_notification',
      invoice: 'invoice'
    };

    const normalizedType = typeMap[emailData.type] || 'system_notification';

    const mapped = {
      type: normalizedType,
      to: emailData.to || this.notificationEmail,
      recipientName: emailData.recipientName,
      userId: emailData.userId,
      kundeId: emailData.kundeId,
      subject: emailData.subject || '(ohne Betreff)',
      htmlBody: emailData.content || emailData.htmlBody || '',
      textBody: emailData.textBody || '',
      contextData: {
        success: emailData.success,
        simulation: emailData.simulation,
        messageId: emailData.messageId,
        error: emailData.error,
        orderId: emailData.orderId,
        orderNumber: emailData.orderNumber,
        inquiryId: emailData.inquiryId
      }
    };

    return this.logEmail(mapped);
  }

  getSenderAddress() {
    return `${this.fromName} <${this.fromEmail}>`;
  }

  buildTestEmailSubject(baseSubject, testMeta = null) {
    if (!testMeta?.isTest) {
      return baseSubject;
    }

    const typeLabel = String(testMeta.type || 'mail').toUpperCase();
    const timestamp = testMeta.timestamp
      ? new Date(testMeta.timestamp).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
      : new Date().toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

    return `Admin-Hinweis [TEST ${typeLabel} ${timestamp}]: ${baseSubject}`;
  }

  async sendWithResendFallback(emailData) {
    // ── 1. Gmail API OAuth2 (primär – funktioniert auf Railway via HTTPS 443) ──
    if (this.gmailOAuthConfigured) {
      const apiResult = await this.sendViaGmailAPI(emailData);
      if (!apiResult?.error) {
        return apiResult;
      }
      console.error('❌ Gmail API fehlgeschlagen:', apiResult.error.message);
      // Weiter zu SMTP-Fallback
    }

    // ── 2. SMTP-Fallback (falls Gmail API nicht konfiguriert oder fehlgeschlagen) ──
    if (this.smtpTransport) {
      console.warn('⚠️ Versuche SMTP als Fallback...');
      const smtpMail = {
        from: emailData.from || this.getSenderAddress(),
        to: emailData.to,
        subject: emailData.subject,
        html: emailData.html,
        text: emailData.text,
        replyTo: emailData.replyTo || undefined,
        priority: emailData.priority || undefined,
        attachments: (emailData.attachments || []).map((att) => ({
          filename: att.filename,
          content: att.content,
          encoding: typeof att.content === 'string' ? 'base64' : undefined,
          contentType: att.contentType
        }))
      };

      try {
        const smtpTransport = await this.createSmtpTransportForAttempt({
          port: this.smtpPort,
          secure: this.smtpSecure
        });
        const info = await smtpTransport.sendMail(smtpMail);
        return {
          id: info.messageId,
          data: { id: info.messageId },
          provider: 'gmail-smtp'
        };
      } catch (smtpError) {
        console.error('❌ Gmail SMTP Versand fehlgeschlagen:', smtpError.message);
        return { error: { message: `Gmail SMTP Fehler: ${smtpError.message}` } };
      }
    }

    return { error: { message: 'Kein E-Mail-Provider verfügbar. Bitte Gmail API OAuth2 in Railway konfigurieren (GMAIL_OAUTH_CLIENT_ID, GMAIL_OAUTH_CLIENT_SECRET, GMAIL_OAUTH_REFRESH_TOKEN, GMAIL_OAUTH_FROM_EMAIL).' } };

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

  getTemplateStyles(theme = 'blue') {
    const palettes = {
      blue: {
        pageBg: '#FEFDFB',
        start: '#8B4B61',
        end: '#5D3242',
        border: '#E8D5B7',
        button: '#8B4B61'
      },
      green: {
        pageBg: '#FEFDFB',
        start: '#A8D5B5',
        end: '#7FB88A',
        border: '#C8E6D0',
        button: '#7FB88A'
      },
      amber: {
        pageBg: '#FEFDFB',
        start: '#E8D5B7',
        end: '#D4B895',
        border: '#F5EEDD',
        button: '#8B4B61'
      },
      indigo: {
        pageBg: '#FEFDFB',
        start: '#B17A89',
        end: '#8B4B61',
        border: '#E8D5B7',
        button: '#8B4B61'
      },
      red: {
        pageBg: '#FEFDFB',
        start: '#B17A89',
        end: '#8B4B61',
        border: '#E8D5B7',
        button: '#8B4B61'
      }
    };

    const colors = palettes[theme] || palettes.blue;

    return {
      wrapper: `font-family: Arial, sans-serif; max-width: 680px; margin: 0 auto; color: #2C2C2C; line-height: 1.65; background:${colors.pageBg}; padding:16px; border-radius:16px;`,
      headerCentered: `background:linear-gradient(135deg,${colors.start},${colors.end}); color:white; padding:28px 24px; border-radius:14px 14px 0 0; text-align:center; box-shadow:0 8px 24px rgba(93,50,66,0.16);`,
      header: `background:linear-gradient(135deg,${colors.start},${colors.end}); color:white; padding:26px 24px; border-radius:14px 14px 0 0; box-shadow:0 8px 24px rgba(93,50,66,0.16);`,
      body: `border:1px solid ${colors.border}; border-top:none; border-radius:0 0 14px 14px; padding:24px; background:white; box-shadow:0 6px 20px rgba(93,50,66,0.08);`,
      panel: 'background:#F5EEDD; border:1px solid #E8D5B7; border-radius:10px; padding:14px 16px;',
      button: `display:inline-block; background:linear-gradient(135deg,${colors.button},#5D3242); color:#fff; text-decoration:none; padding:12px 22px; border-radius:999px; font-weight:700; box-shadow:0 6px 16px rgba(139,75,97,0.25);`,
      smallMuted: 'font-size:13px; color:#5D3242; margin:0;'
    };
  }

  renderTemplateButton(url, label, buttonStyle) {
    return `<a href="${url}" style="${buttonStyle}">${label}</a>`;
  }

  renderTemplateBadge(text) {
    return `<span style="display:inline-block; padding:6px 12px; border-radius:999px; background:rgba(255,255,255,0.2); border:1px solid rgba(255,255,255,0.35); color:white; font-size:12px; font-weight:700; letter-spacing:0.2px; margin-top:10px;">${text}</span>`;
  }

  renderTemplateInfoBox(title, listItems = [], tone = 'info') {
    const tones = {
      info: {
        background: '#F5EEDD',
        border: '#E8D5B7',
        titleColor: '#5D3242',
        textColor: '#5D3242'
      },
      success: {
        background: '#EAF6EF',
        border: '#C8E6D0',
        titleColor: '#3E6D4A',
        textColor: '#3E6D4A'
      },
      warning: {
        background: '#FDF6EA',
        border: '#E8D5B7',
        titleColor: '#7A5B2F',
        textColor: '#7A5B2F'
      },
      danger: {
        background: '#F8ECEF',
        border: '#D9B2BE',
        titleColor: '#7A2D43',
        textColor: '#7A2D43'
      }
    };

    const palette = tones[tone] || tones.info;

    return `
      <div style="background:${palette.background}; border:1px solid ${palette.border}; border-radius:10px; padding:14px 16px; margin:16px 0;">
        <p style="margin:0 0 6px 0; font-weight:700; color:${palette.titleColor};">${title}</p>
        <ul style="margin:0; padding-left:18px; color:${palette.textColor};">
          ${listItems.map((item) => `<li>${item}</li>`).join('')}
        </ul>
      </div>
    `;
  }

  renderTemplateFooter() {
    return `
      <div style="margin-top:22px; padding-top:14px; border-top:1px solid #E8D5B7; text-align:center;">
        <p style="margin:0; font-size:12px; color:#5D3242;">Mit Liebe gestaltet von der Glücksmomente Manufaktur</p>
      </div>
    `;
  }

  async sendVerificationEmail(to, verificationToken, userName, testMeta = null) {
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

      const htmlContent = `
        <div style="font-family:Arial,sans-serif; max-width:680px; margin:0 auto; color:#2C2C2C; line-height:1.65; background:#FEFDFB; padding:16px; border-radius:16px;">

          <div style="background:linear-gradient(135deg,#8B4B61,#5D3242); color:white; padding:36px 28px; border-radius:14px 14px 0 0; text-align:center; box-shadow:0 8px 24px rgba(93,50,66,0.18);">
            <p style="margin:0 0 10px 0; font-size:12px; letter-spacing:2px; text-transform:uppercase; opacity:0.75;">Glücksmomente Manufaktur</p>
            <h1 style="margin:0; font-size:30px; font-weight:700;">Herzlich willkommen${userName ? `, ${userName}` : ''}!</h1>
            <p style="margin:12px 0 0 0; font-size:16px; opacity:0.92;">Wie schön, dass Sie da sind. Ein letzter Schritt fehlt noch.</p>
            <span style="display:inline-block; margin-top:16px; padding:6px 16px; border-radius:999px; background:rgba(255,255,255,0.15); border:1px solid rgba(255,255,255,0.3); color:white; font-size:12px; font-weight:700; letter-spacing:1px;">KONTO AKTIVIERUNG</span>
          </div>

          <div style="border:1px solid #E8D5B7; border-top:none; border-radius:0 0 14px 14px; padding:32px 28px; background:white; box-shadow:0 6px 20px rgba(93,50,66,0.08);">

            <p style="margin:0 0 16px 0; font-size:16px;">vielen Dank für Ihre Registrierung. Um Ihr Konto zu aktivieren und alle Funktionen sofort nutzen zu können, bestätigen Sie bitte einmalig Ihre E-Mail-Adresse mit dem Button unten.</p>

            <div style="text-align:center; margin:28px 0 10px 0;">
              <a href="${verificationUrl}" style="display:inline-block; background:linear-gradient(135deg,#8B4B61,#5D3242); color:#fff; text-decoration:none; padding:15px 36px; border-radius:999px; font-weight:700; font-size:16px; box-shadow:0 6px 18px rgba(139,75,97,0.32);">E-Mail-Adresse bestätigen</a>
            </div>
            <p style="text-align:center; font-size:13px; color:#999; margin:8px 0 28px 0;">Der Link ist 24 Stunden gültig und kann nur einmal verwendet werden.</p>

            <hr style="border:none; border-top:1px solid #F5EEDD; margin:24px 0;">

            <h2 style="margin:0 0 14px 0; font-size:20px; color:#5D3242;">Was Sie in Ihrem Konto erwartet</h2>
            <p style="margin:0 0 18px 0; font-size:15px; color:#555;">Nach der Aktivierung stehen Ihnen alle Bereiche Ihres persönlichen Kundenkontos sofort zur Verfügung:</p>

            <table style="width:100%; border-collapse:collapse;">
              <tr><td style="width:50px; vertical-align:top; padding:8px 0;">
                <div style="width:40px; height:40px; border-radius:50%; background:#F5EEDD; border:2px solid #E8D5B7; text-align:center; line-height:40px; font-size:20px;">📦</div>
              </td><td style="vertical-align:top; padding:8px 0 8px 14px;">
                <p style="margin:0; font-weight:700; font-size:15px;">Bestellungen &amp; Anfragen</p>
                <p style="margin:4px 0 0 0; font-size:14px; color:#666;">Alle Ihre Anfragen und Bestellungen übersichtlich an einem Ort – mit vollem Überblick über den aktuellen Status.</p>
              </td></tr>
              <tr><td style="width:50px; vertical-align:top; padding:8px 0;">
                <div style="width:40px; height:40px; border-radius:50%; background:#EAF6EF; border:2px solid #C8E6D0; text-align:center; line-height:40px; font-size:20px;">👤</div>
              </td><td style="vertical-align:top; padding:8px 0 8px 14px;">
                <p style="margin:0; font-weight:700; font-size:15px;">Persönliche Daten</p>
                <p style="margin:4px 0 0 0; font-size:14px; color:#666;">Hinterlegte Kontaktdaten sorgen für eine schnellere und reibungslosere Bearbeitung Ihrer Anfragen.</p>
              </td></tr>
              <tr><td style="width:50px; vertical-align:top; padding:8px 0;">
                <div style="width:40px; height:40px; border-radius:50%; background:#F8ECEF; border:2px solid #D9B2BE; text-align:center; line-height:40px; font-size:20px;">🔔</div>
              </td><td style="vertical-align:top; padding:8px 0 8px 14px;">
                <p style="margin:0; font-weight:700; font-size:15px;">Informationen &amp; Neuheiten</p>
                <p style="margin:4px 0 0 0; font-size:14px; color:#666;">Wir informieren Sie gezielt über für Sie relevante Angebote, Neuheiten und wichtige Änderungen.</p>
              </td></tr>
            </table>

            <div style="background:#F5EEDD; border:1px solid #E8D5B7; border-radius:12px; padding:18px 20px; margin:24px 0 20px 0;">
              <p style="margin:0 0 10px 0; font-weight:700; color:#5D3242; font-size:15px;">Ihre nächsten Schritte</p>
              <ol style="margin:0; padding-left:20px; color:#5D3242; font-size:14px; line-height:1.8;">
                <li>Klicken Sie auf den Button oben, um Ihr Konto zu aktivieren.</li>
                <li>Melden Sie sich anschließend mit Ihren Zugangsdaten an.</li>
                <li>Ergänzen Sie Ihre Kontaktdaten für eine schnellere Bearbeitung.</li>
                <li>Stellen Sie bei Bedarf eine Anfrage oder sehen Sie sich unsere Angebote an.</li>
              </ol>
            </div>

            <div style="background:#f9f9f9; border:1px solid #eee; border-radius:10px; padding:14px 16px; margin:0 0 24px 0;">
              <p style="margin:0; font-size:13px; color:#888;"><strong style="color:#5D3242;">Sicherheitshinweis:</strong> Falls Sie sich nicht bei uns registriert haben, ignorieren Sie diese E-Mail bitte. Ihr Aktivierungslink ist ausschließlich für Sie bestimmt und läuft automatisch ab.</p>
            </div>

            <p style="margin:0 0 6px 0; font-size:13px; color:#aaa;">Falls der Button nicht funktioniert, kopieren Sie bitte diesen Link:</p>
            <p style="margin:0 0 24px 0; font-size:12px; word-break:break-all;"><a href="${verificationUrl}" style="color:#8B4B61;">${verificationUrl}</a></p>

            <div style="margin-top:22px; padding-top:14px; border-top:1px solid #E8D5B7; text-align:center;">
              <p style="margin:0; font-size:12px; color:#5D3242;">Mit Liebe gestaltet von der <strong>Glücksmomente Manufaktur</strong></p>
            </div>
          </div>
        </div>
      `;

      const subject = this.buildTestEmailSubject('Bitte E-Mail-Adresse bestätigen', testMeta);

      const result = await this.sendWithResendFallback({
        from: this.getSenderAddress(),
        to,
        subject,
        html: htmlContent,
        replyTo: testMeta?.isTest ? this.notificationEmail : undefined,
        priority: testMeta?.isTest ? 'high' : undefined
      });

      if (result?.error) {
        return { success: false, error: result.error.message || 'Resend API Error', fullResponse: result };
      }

      return {
        success: true,
        messageId: result?.data?.id || result?.id || 'sent-without-id',
        fullResponse: result
      };
      
    } catch (error) {
      console.error('❌ Email sending failed:', error);
      return { success: false, error: error.message };
    }
  }

  async sendWelcomeEmail(to, userName, testMeta = null) {
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
      const loginUrl = `${process.env.FRONTEND_URL || 'http://localhost:3001'}/login`;

      const htmlContent = `
        <div style="font-family:Arial,sans-serif; max-width:680px; margin:0 auto; color:#2C2C2C; line-height:1.65; background:#FEFDFB; padding:16px; border-radius:16px;">

          <div style="background:linear-gradient(135deg,#A8D5B5,#7FB88A); color:white; padding:36px 28px; border-radius:14px 14px 0 0; text-align:center; box-shadow:0 8px 24px rgba(127,184,138,0.22);">
            <p style="margin:0 0 10px 0; font-size:12px; letter-spacing:2px; text-transform:uppercase; opacity:0.75;">Glücksmomente Manufaktur</p>
            <h1 style="margin:0; font-size:30px; font-weight:700;">Ihr Konto ist jetzt aktiv! 🎉</h1>
            <p style="margin:12px 0 0 0; font-size:16px; opacity:0.92;">Hallo ${userName || 'und herzlich willkommen'} – wir freuen uns sehr, Sie an Bord zu haben.</p>
            <span style="display:inline-block; margin-top:16px; padding:6px 16px; border-radius:999px; background:rgba(255,255,255,0.2); border:1px solid rgba(255,255,255,0.35); color:white; font-size:12px; font-weight:700; letter-spacing:1px;">WILLKOMMEN</span>
          </div>

          <div style="border:1px solid #C8E6D0; border-top:none; border-radius:0 0 14px 14px; padding:32px 28px; background:white; box-shadow:0 6px 20px rgba(127,184,138,0.1);">

            <p style="margin:0 0 16px 0; font-size:16px;">Vielen Dank für Ihr Vertrauen. Ihre E-Mail-Adresse wurde erfolgreich bestätigt und Ihr Konto ist ab sofort vollständig aktiviert. Wir freuen uns darauf, Sie bestmöglich zu unterstützen.</p>

            <div style="text-align:center; margin:28px 0 10px 0;">
              <a href="${loginUrl}" style="display:inline-block; background:linear-gradient(135deg,#7FB88A,#5D9E6A); color:#fff; text-decoration:none; padding:15px 36px; border-radius:999px; font-weight:700; font-size:16px; box-shadow:0 6px 18px rgba(127,184,138,0.35);">Jetzt anmelden</a>
            </div>
            <p style="text-align:center; font-size:13px; color:#999; margin:8px 0 28px 0;">Nutzen Sie die E-Mail-Adresse und das Passwort, mit dem Sie sich registriert haben.</p>

            <hr style="border:none; border-top:1px solid #EAF6EF; margin:24px 0;">

            <h2 style="margin:0 0 14px 0; font-size:20px; color:#3E6D4A;">Was Sie jetzt in Ihrem Konto finden</h2>

            <table style="width:100%; border-collapse:collapse;">
              <tr><td style="width:50px; vertical-align:top; padding:8px 0;">
                <div style="width:40px; height:40px; border-radius:50%; background:#EAF6EF; border:2px solid #C8E6D0; text-align:center; line-height:40px; font-size:20px;">📋</div>
              </td><td style="vertical-align:top; padding:8px 0 8px 14px;">
                <p style="margin:0; font-weight:700; font-size:15px;">Ihre Anfragen &amp; Bestellungen</p>
                <p style="margin:4px 0 0 0; font-size:14px; color:#666;">Behalten Sie den Überblick über alle Ihre Anfragen und sehen Sie jederzeit den aktuellen Bearbeitungsstand ein.</p>
              </td></tr>
              <tr><td style="width:50px; vertical-align:top; padding:8px 0;">
                <div style="width:40px; height:40px; border-radius:50%; background:#F5EEDD; border:2px solid #E8D5B7; text-align:center; line-height:40px; font-size:20px;">⚙️</div>
              </td><td style="vertical-align:top; padding:8px 0 8px 14px;">
                <p style="margin:0; font-weight:700; font-size:15px;">Profil &amp; Kontaktdaten</p>
                <p style="margin:4px 0 0 0; font-size:14px; color:#666;">Hinterlegen Sie Ihre Daten für eine schnellere und reibungslosere Abwicklung. Sie sparen Zeit bei jeder weiteren Anfrage.</p>
              </td></tr>
              <tr><td style="width:50px; vertical-align:top; padding:8px 0;">
                <div style="width:40px; height:40px; border-radius:50%; background:#F8ECEF; border:2px solid #D9B2BE; text-align:center; line-height:40px; font-size:20px;">🔔</div>
              </td><td style="vertical-align:top; padding:8px 0 8px 14px;">
                <p style="margin:0; font-weight:700; font-size:15px;">Statusupdates</p>
                <p style="margin:4px 0 0 0; font-size:14px; color:#666;">Sie werden automatisch informiert, sobald sich der Status Ihrer Anfragen oder Bestellungen ändert.</p>
              </td></tr>
              <tr><td style="width:50px; vertical-align:top; padding:8px 0;">
                <div style="width:40px; height:40px; border-radius:50%; background:#EAF6EF; border:2px solid #C8E6D0; text-align:center; line-height:40px; font-size:20px;">💌</div>
              </td><td style="vertical-align:top; padding:8px 0 8px 14px;">
                <p style="margin:0; font-weight:700; font-size:15px;">Persönlicher Kontakt</p>
                <p style="margin:4px 0 0 0; font-size:14px; color:#666;">Bei Fragen erreichen Sie uns jederzeit direkt per E-Mail. Wir antworten schnell und unkompliziert.</p>
              </td></tr>
            </table>

            <div style="background:#EAF6EF; border:1px solid #C8E6D0; border-radius:12px; padding:18px 20px; margin:24px 0 20px 0;">
              <p style="margin:0 0 10px 0; font-weight:700; color:#3E6D4A; font-size:15px;">Tipps für einen guten Start</p>
              <ul style="margin:0; padding-left:20px; color:#3E6D4A; font-size:14px; line-height:1.8;">
                <li>Vervollständigen Sie Ihr Profil mit aktuellen Kontaktdaten.</li>
                <li>Stellen Sie Ihre erste Anfrage über das Kontaktformular.</li>
                <li>Speichern Sie die Anmeldeseite für schnellen Zugriff.</li>
                <li>Sprechen Sie uns bei Fragen jederzeit direkt an – wir helfen gerne.</li>
              </ul>
            </div>

            <div style="background:#f9f9f9; border:1px solid #eee; border-radius:10px; padding:14px 16px; margin:0 0 24px 0;">
              <p style="margin:0; font-size:14px; color:#666;">Bei Fragen stehen wir Ihnen jederzeit gerne zur Verfügung. Antworten Sie einfach direkt auf diese E-Mail oder nutzen Sie das Kontaktformular auf unserer Website.</p>
            </div>

            <div style="margin-top:22px; padding-top:14px; border-top:1px solid #C8E6D0; text-align:center;">
              <p style="margin:0; font-size:12px; color:#3E6D4A;">Mit Liebe gestaltet von der <strong>Glücksmomente Manufaktur</strong></p>
            </div>
          </div>
        </div>
      `;

      const subject = this.buildTestEmailSubject('Willkommen – Ihr Konto ist aktiv', testMeta);

      const result = await this.sendWithResendFallback({
        from: this.getSenderAddress(),
        to,
        subject,
        html: htmlContent,
        replyTo: testMeta?.isTest ? this.notificationEmail : undefined,
        priority: testMeta?.isTest ? 'high' : undefined
      });

      if (result?.error) {
        return { success: false, error: result.error.message || 'Resend API Error', fullResponse: result };
      }

      return { success: true, messageId: result?.data?.id || result?.id || 'sent-without-id', fullResponse: result };

    } catch (error) {
      console.error('❌ Welcome email sending failed:', error);
      return { success: false, error: error.message };
    }
  }

  async sendPasswordResetEmail(to, resetUrl, userName, userId = null, kundeId = null, testMeta = null) {
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
      subject: this.buildTestEmailSubject(
        recipientInfo.isRedirected
          ? `🧪 [DEV] Passwort zurücksetzen für ${to} - Glücksmomente Manufaktur`
          : '🔐 Passwort zurücksetzen - Glücksmomente Manufaktur',
        testMeta
      ),
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
      const styles = this.getTemplateStyles('amber');
      
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
        <div style="font-family:Arial,sans-serif; max-width:680px; margin:0 auto; color:#2C2C2C; line-height:1.65; background:#FEFDFB; padding:16px; border-radius:16px;">

          <div style="background:linear-gradient(135deg,#8B4B61,#5D3242); color:white; padding:36px 28px; border-radius:14px 14px 0 0; text-align:center; box-shadow:0 8px 24px rgba(93,50,66,0.18);">
            <p style="margin:0 0 10px 0; font-size:12px; letter-spacing:2px; text-transform:uppercase; opacity:0.75;">Glücksmomente Manufaktur</p>
            <h1 style="margin:0; font-size:28px; font-weight:700;">Passwort zurücksetzen</h1>
            <p style="margin:12px 0 0 0; font-size:16px; opacity:0.92;">Hallo ${userName || 'Kunde'}, wir haben eine Anfrage für Ihr Konto erhalten.</p>
            <span style="display:inline-block; margin-top:16px; padding:6px 16px; border-radius:999px; background:rgba(255,255,255,0.15); border:1px solid rgba(255,255,255,0.3); color:white; font-size:12px; font-weight:700; letter-spacing:1px;">SICHERHEITSMAIL</span>
          </div>

          <div style="border:1px solid #E8D5B7; border-top:none; border-radius:0 0 14px 14px; padding:32px 28px; background:white; box-shadow:0 6px 20px rgba(93,50,66,0.08);">
            ${developmentWarning}

            <p style="margin:0 0 14px 0; font-size:16px;">Wir haben eine Anfrage erhalten, das Passwort für Ihr Konto zurückzusetzen. Wenn Sie diese Anfrage selbst gestellt haben, klicken Sie bitte auf den folgenden Button.</p>
            <p style="margin:0 0 22px 0; font-size:15px; color:#555;">Zum Schutz Ihres Kontos empfehlen wir ein starkes, einzigartiges Passwort, das Sie ausschließlich für dieses Konto verwenden.</p>

            <div style="text-align:center; margin:28px 0 10px 0;">
              <a href="${resetUrl}" style="display:inline-block; background:linear-gradient(135deg,#8B4B61,#5D3242); color:#fff; text-decoration:none; padding:15px 36px; border-radius:999px; font-weight:700; font-size:16px; box-shadow:0 6px 18px rgba(139,75,97,0.32);">Neues Passwort festlegen</a>
            </div>
            <p style="text-align:center; font-size:13px; color:#999; margin:8px 0 28px 0;">Der Link ist 60 Minuten gültig und kann nur einmal verwendet werden.</p>

            <hr style="border:none; border-top:1px solid #F5EEDD; margin:24px 0;">

            <h2 style="margin:0 0 14px 0; font-size:18px; color:#5D3242;">Tipps für ein sicheres Passwort</h2>
            <table style="width:100%; border-collapse:collapse;">
              <tr><td style="width:50px; vertical-align:top; padding:6px 0;">
                <div style="width:36px; height:36px; border-radius:50%; background:#F5EEDD; border:2px solid #E8D5B7; text-align:center; line-height:36px; font-size:16px;">🔢</div>
              </td><td style="vertical-align:top; padding:6px 0 6px 14px;">
                <p style="margin:0; font-weight:700; font-size:14px;">Mindestens 12 Zeichen</p>
                <p style="margin:3px 0 0 0; font-size:13px; color:#666;">Je länger, desto besser. Kombinieren Sie Buchstaben, Zahlen und Sonderzeichen.</p>
              </td></tr>
              <tr><td style="width:50px; vertical-align:top; padding:6px 0;">
                <div style="width:36px; height:36px; border-radius:50%; background:#EAF6EF; border:2px solid #C8E6D0; text-align:center; line-height:36px; font-size:16px;">🔁</div>
              </td><td style="vertical-align:top; padding:6px 0 6px 14px;">
                <p style="margin:0; font-weight:700; font-size:14px;">Kein Passwort doppelt nutzen</p>
                <p style="margin:3px 0 0 0; font-size:13px; color:#666;">Verwenden Sie für jedes Konto ein eigenes Passwort. Ein Passwort-Manager kann dabei helfen.</p>
              </td></tr>
              <tr><td style="width:50px; vertical-align:top; padding:6px 0;">
                <div style="width:36px; height:36px; border-radius:50%; background:#F8ECEF; border:2px solid #D9B2BE; text-align:center; line-height:36px; font-size:16px;">🚫</div>
              </td><td style="vertical-align:top; padding:6px 0 6px 14px;">
                <p style="margin:0; font-weight:700; font-size:14px;">Keine persönlichen Daten</p>
                <p style="margin:3px 0 0 0; font-size:13px; color:#666;">Verwenden Sie keine Namen, Geburtstage oder einfach erratbare Zeichenfolgen.</p>
              </td></tr>
            </table>

            <div style="background:#FDF6EA; border:1px solid #E8D5B7; border-radius:12px; padding:16px 18px; margin:24px 0 20px 0;">
              <p style="margin:0 0 8px 0; font-weight:700; color:#7A5B2F; font-size:15px;">Wichtige Sicherheitshinweise</p>
              <ul style="margin:0; padding-left:18px; color:#7A5B2F; font-size:14px; line-height:1.8;">
                <li>Der Link ist genau 60 Minuten gültig.</li>
                <li>Der Link kann nur einmal verwendet werden und ist danach ungültig.</li>
                <li>Falls Sie keine Anfrage gestellt haben, ignorieren Sie diese E-Mail – Ihr Passwort bleibt unverändert.</li>
                <li>Bei verdächtigen Aktivitäten kontaktieren Sie uns bitte umgehend.</li>
              </ul>
            </div>

            <p style="margin:0 0 6px 0; font-size:13px; color:#aaa;">Falls der Button nicht funktioniert, kopieren Sie bitte diesen Link:</p>
            <p style="margin:0 0 24px 0; font-size:12px; word-break:break-all;"><a href="${resetUrl}" style="color:#8B4B61;">${resetUrl}</a></p>

            <div style="margin-top:22px; padding-top:14px; border-top:1px solid #E8D5B7; text-align:center;">
              <p style="margin:0; font-size:12px; color:#5D3242;">Mit Liebe gestaltet von der <strong>Glücksmomente Manufaktur</strong></p>
            </div>
          </div>
        </div>
      `;

      // sendPasswordResetEmail: testMeta auf emailData.testMeta mappen
      emailData.testMeta = testMeta;

      // E-Mail Content für Logging speichern
      emailData.htmlBody = htmlContent;

      // E-Mail in MongoDB loggen BEVOR sie gesendet wird
      const emailLog = await this.logEmail(emailData);

      const result = await this.sendWithResendFallback({
        from: this.getSenderAddress(),
        to: finalRecipient,
        subject: emailData.subject,
        html: htmlContent,
        replyTo: emailData.testMeta?.isTest ? this.notificationEmail : undefined,
        priority: emailData.testMeta?.isTest ? 'high' : undefined
      });

      let emailResult;
      if (result?.error) {
        emailResult = {
          success: false,
          error: `Resend API Error: ${result.error.message} (Status: ${result.error.statusCode || 'n/a'})`,
          fullResponse: result
        };
      } else {
        const messageId = result?.data?.id || result?.id;
        emailResult = messageId
          ? { success: true, messageId, fullResponse: result }
          : { success: false, error: 'Unexpected response from email service', fullResponse: result };
      }

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

  async sendPasswordResetSuccessEmail(to, userName, testMeta = null) {
    if (this.isDisabled) {
      return { success: true, messageId: 'demo-password-reset-success' };
    }

    try {
      const loginUrl = `${process.env.FRONTEND_URL || 'http://localhost:3001'}/login`;

      const htmlContent = `
        <div style="font-family:Arial,sans-serif; max-width:680px; margin:0 auto; color:#2C2C2C; line-height:1.65; background:#FEFDFB; padding:16px; border-radius:16px;">

          <div style="background:linear-gradient(135deg,#A8D5B5,#7FB88A); color:white; padding:36px 28px; border-radius:14px 14px 0 0; text-align:center; box-shadow:0 8px 24px rgba(127,184,138,0.22);">
            <p style="margin:0 0 10px 0; font-size:12px; letter-spacing:2px; text-transform:uppercase; opacity:0.75;">Glücksmomente Manufaktur</p>
            <h1 style="margin:0; font-size:28px; font-weight:700;">Passwort erfolgreich geändert ✓</h1>
            <p style="margin:12px 0 0 0; font-size:16px; opacity:0.92;">Hallo ${userName || 'Kunde'}, Ihre Änderung wurde bestätigt.</p>
            <span style="display:inline-block; margin-top:16px; padding:6px 16px; border-radius:999px; background:rgba(255,255,255,0.2); border:1px solid rgba(255,255,255,0.35); color:white; font-size:12px; font-weight:700; letter-spacing:1px;">SICHERHEITSINFO</span>
          </div>

          <div style="border:1px solid #C8E6D0; border-top:none; border-radius:0 0 14px 14px; padding:32px 28px; background:white; box-shadow:0 6px 20px rgba(127,184,138,0.1);">

            <p style="margin:0 0 14px 0; font-size:16px;">Ihr Passwort wurde soeben erfolgreich geändert. Wenn Sie diese Änderung selbst vorgenommen haben, ist keine weitere Aktion erforderlich.</p>

            <div style="background:#FDF6EA; border:1px solid #E8D5B7; border-radius:12px; padding:16px 20px; margin:0 0 24px 0;">
              <p style="margin:0 0 6px 0; font-weight:700; color:#7A5B2F; font-size:15px;">⚠️ Nicht Sie selbst?</p>
              <p style="margin:0; font-size:14px; color:#7A5B2F;">Falls Sie diese Änderung nicht veranlasst haben, setzen Sie Ihr Passwort bitte sofort erneut zurück und kontaktieren Sie uns umgehend. Ihr Konto könnte gefährdet sein.</p>
            </div>

            <div style="text-align:center; margin:24px 0;">
              <a href="${loginUrl}" style="display:inline-block; background:linear-gradient(135deg,#7FB88A,#5D9E6A); color:#fff; text-decoration:none; padding:14px 32px; border-radius:999px; font-weight:700; font-size:16px; box-shadow:0 6px 18px rgba(127,184,138,0.35);">Zur Anmeldung</a>
            </div>

            <hr style="border:none; border-top:1px solid #EAF6EF; margin:24px 0;">

            <h2 style="margin:0 0 14px 0; font-size:18px; color:#3E6D4A;">Tipps für ein sicheres Konto</h2>

            <table style="width:100%; border-collapse:collapse;">
              <tr><td style="width:50px; vertical-align:top; padding:8px 0;">
                <div style="width:40px; height:40px; border-radius:50%; background:#EAF6EF; border:2px solid #C8E6D0; text-align:center; line-height:40px; font-size:20px;">🔒</div>
              </td><td style="vertical-align:top; padding:8px 0 8px 14px;">
                <p style="margin:0; font-weight:700; font-size:15px;">Starkes Passwort</p>
                <p style="margin:4px 0 0 0; font-size:14px; color:#666;">Verwenden Sie mindestens 12 Zeichen – idealerweise eine Kombination aus Buchstaben, Zahlen und Sonderzeichen.</p>
              </td></tr>
              <tr><td style="width:50px; vertical-align:top; padding:8px 0;">
                <div style="width:40px; height:40px; border-radius:50%; background:#F5EEDD; border:2px solid #E8D5B7; text-align:center; line-height:40px; font-size:20px;">📵</div>
              </td><td style="vertical-align:top; padding:8px 0 8px 14px;">
                <p style="margin:0; font-weight:700; font-size:15px;">Passwort nicht weitergeben</p>
                <p style="margin:4px 0 0 0; font-size:14px; color:#666;">Teilen Sie Ihr Passwort niemals mit anderen Personen, auch nicht telefonisch oder per E-Mail.</p>
              </td></tr>
              <tr><td style="width:50px; vertical-align:top; padding:8px 0;">
                <div style="width:40px; height:40px; border-radius:50%; background:#F8ECEF; border:2px solid #D9B2BE; text-align:center; line-height:40px; font-size:20px;">🧠</div>
              </td><td style="vertical-align:top; padding:8px 0 8px 14px;">
                <p style="margin:0; font-weight:700; font-size:15px;">Passwort-Manager nutzen</p>
                <p style="margin:4px 0 0 0; font-size:14px; color:#666;">Ein Passwort-Manager hilft Ihnen, für jedes Konto ein einzigartiges, sicheres Passwort zu verwenden.</p>
              </td></tr>
            </table>

            <div style="background:#EAF6EF; border:1px solid #C8E6D0; border-radius:12px; padding:16px 18px; margin:24px 0 20px 0;">
              <p style="margin:0; font-size:14px; color:#3E6D4A;">Diese Nachricht wurde automatisch aus Sicherheitsgründen versandt. Wenn Sie Fragen haben, antworten Sie einfach auf diese E-Mail.</p>
            </div>

            <div style="margin-top:22px; padding-top:14px; border-top:1px solid #C8E6D0; text-align:center;">
              <p style="margin:0; font-size:12px; color:#3E6D4A;">Mit Liebe gestaltet von der <strong>Glücksmomente Manufaktur</strong></p>
            </div>
          </div>
        </div>
      `;

      const subject = this.buildTestEmailSubject('Sicherheitsinfo: Passwort wurde geändert', testMeta);

      const result = await this.sendWithResendFallback({
        from: this.getSenderAddress(),
        to,
        subject,
        html: htmlContent,
        replyTo: testMeta?.isTest ? this.notificationEmail : undefined,
        priority: testMeta?.isTest ? 'high' : undefined
      });

      if (result?.error) {
        return { success: false, error: result.error.message || 'Resend API Error' };
      }

      return { success: true, messageId: result?.data?.id || result?.id || 'sent-without-id' };
    } catch (error) {
      return { success: false, error: error.message };
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
      const styles = this.getTemplateStyles('green');
      
      const htmlContent = `
        <div style="${styles.wrapper}">
          <div style="${styles.headerCentered}">
            <h1 style="color: white; margin: 0; font-size: 28px;">Profiländerung bestätigt</h1>
            <p style="color: white; margin: 10px 0 0 0; font-size: 16px; opacity:0.95;">Hallo ${userName || 'Kunde'}, die Änderungen wurden erfolgreich gespeichert.</p>
            ${this.renderTemplateBadge('PROFIL AKTUALISIERT')}
          </div>
          
          <div style="${styles.body}">
            <h2 style="color: #2C2C2C; margin-bottom: 20px;">Ihre aktualisierten Angaben</h2>
            
            <p style="color: #2C2C2C; line-height: 1.6; margin-bottom: 25px;">
              Diese E-Mail dient Ihrer Sicherheit und informiert Sie über die zuletzt gespeicherten Änderungen.
            </p>
            
            <div style="${styles.panel}; margin: 25px 0;">
              <h3 style="color: #5D3242; margin: 0 0 15px 0; font-size: 16px;">Folgende Änderungen wurden vorgenommen:</h3>
              <ul style="color: #2C2C2C; margin: 0; padding-left: 20px; line-height: 1.6;">
                ${changesList}
              </ul>
            </div>
            
            ${this.renderTemplateInfoBox('Sicherheitshinweis', [
              'Falls Sie diese Änderungen nicht selbst vorgenommen haben, wenden Sie sich bitte umgehend an den Support.'
            ], 'warning')}
            
            <p style="color: #2C2C2C; line-height: 1.6; margin-bottom: 20px;">
              <strong>Zeitpunkt der Änderung:</strong> ${new Date().toLocaleString('de-DE')}<br>
              <strong>Ihre E-Mail:</strong> ${to}
            </p>
            
            <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
            
            <p style="color: #5D3242; font-size: 14px; text-align: center; margin: 0;">
              Bei Fragen stehen wir Ihnen gerne zur Verfügung.<br>
              <strong style="color: #8B4B61;">Das Team der Glücksmomente Manufaktur</strong>
            </p>
            ${this.renderTemplateFooter()}
          </div>
          
          <div style="text-align: center; margin-top: 20px; color: #5D3242; font-size: 12px;">
            Diese E-Mail wurde automatisch erstellt. Bitte antworten Sie nicht auf diese E-Mail.
          </div>
        </div>
      `;

      const result = await this.sendWithResendFallback({
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
      const styles = this.getTemplateStyles('red');
      const htmlContent = `
        <div style="${styles.wrapper}">
          <div style="${styles.headerCentered}">
            <h1 style="color: white; margin: 0; font-size: 28px;">Account-Löschung bestätigt</h1>
            <p style="color: white; margin: 10px 0 0 0; font-size: 16px; opacity:0.95;">Ihr Wunsch wurde erfolgreich umgesetzt.</p>
            ${this.renderTemplateBadge('KONTOSTATUS GEÄNDERT')}
          </div>
          
          <div style="${styles.body}">
            <h2 style="color: #333; margin-bottom: 20px;">Auf Wiedersehen, ${userName}! 👋</h2>
            
            <p style="color: #666; line-height: 1.6; margin-bottom: 25px;">
              Ihr Account bei der Glücksmomente Manufaktur wurde wie gewünscht erfolgreich gelöscht.
              Wir bedauern, dass Sie uns verlassen.
            </p>
            
            <div style="${styles.panel}; margin: 25px 0;">
              <h3 style="color: #5D3242; margin: 0 0 15px 0; font-size: 16px;">Gelöschte Account-Daten:</h3>
              <ul style="color: #2C2C2C; margin: 0; padding-left: 20px; line-height: 1.6;">
                <li>Benutzername: <strong>${username}</strong></li>
                <li>E-Mail: <strong>${to}</strong></li>
                <li>Löschungsgrund: <strong>${reason}</strong></li>
                <li>Löschungsdatum: <strong>${new Date().toLocaleString('de-DE')}</strong></li>
              </ul>
            </div>
            
            ${this.renderTemplateInfoBox('Was passiert jetzt?', [
              'Alle persönlichen Daten wurden unwiderruflich gelöscht.',
              'Sie erhalten keine weiteren E-Mails zu diesem Konto.',
              'Eine neue Registrierung ist jederzeit mit einer neuen E-Mail möglich.'
            ], 'info')}
            
            <p style="color: #666; line-height: 1.6; margin-bottom: 25px;">
              Sollten Sie Ihre Meinung ändern, können Sie sich jederzeit mit einer neuen E-Mail-Adresse 
              wieder bei uns registrieren. Wir würden uns freuen, Sie wieder bei uns begrüßen zu dürfen!
            </p>
            
            <div style="text-align: center; background: #F5EEDD; padding: 20px; border-radius: 8px; margin: 25px 0;">
              <p style="color: #666; margin: 0; font-size: 16px;">
                💝 Vielen Dank für die Zeit, die Sie bei uns verbracht haben!
              </p>
            </div>
            
            <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
            
            <p style="color: #999; font-size: 14px; text-align: center; margin: 0;">
              Alles Gute wünscht Ihnen<br>
              <strong style="color: #8B4B61;">Das Team der Glücksmomente Manufaktur</strong>
            </p>
            ${this.renderTemplateFooter()}
          </div>
          
          <div style="text-align: center; margin-top: 20px; color: #999; font-size: 12px;">
            Diese E-Mail wurde automatisch erstellt. Bitte antworten Sie nicht auf diese E-Mail.
          </div>
        </div>
      `;

      const result = await this.sendWithResendFallback({
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
      const styles = this.getTemplateStyles('blue');
      
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
        <div style="${styles.wrapper}">
          <div style="${styles.headerCentered}">
            <h1 style="margin:0; font-size:26px;">Vielen Dank für Ihre Bestellung</h1>
            <p style="margin:10px 0 0 0; opacity:0.95;">Hallo ${kundenname || 'Kunde'}, Ihre Bestellung ist erfolgreich bei uns eingegangen.</p>
            ${this.renderTemplateBadge('BESTELLUNG EINGEGANGEN')}
          </div>
          <div style="${styles.body}">
            <div style="${styles.panel}; margin-bottom:18px;">
              <p style="margin:0 0 4px 0;"><strong>Bestellnummer:</strong> ${bestellung.bestellnummer}</p>
              <p style="margin:0 0 4px 0;"><strong>Bestelldatum:</strong> ${formatDate(bestellung.bestelldatum)}</p>
              <p style="margin:0;"><strong>Status:</strong> Bestätigung versendet</p>
            </div>

            <p style="margin:0 0 14px 0;">Wir kümmern uns nun um die weitere Bearbeitung Ihrer Bestellung und informieren Sie bei wichtigen Statusänderungen.</p>

            <h3 style="margin:0 0 10px 0;">Bestellübersicht</h3>
            <table style="width:100%; border-collapse:collapse; background:#fff; border:1px solid #e5e7eb; border-radius:10px; overflow:hidden;">
              <thead>
                <tr style="background:#f9fafb;">
                  <th style="text-align:left; padding:10px; border-bottom:1px solid #e5e7eb;">Artikel</th>
                  <th style="text-align:center; padding:10px; border-bottom:1px solid #e5e7eb;">Menge</th>
                  <th style="text-align:right; padding:10px; border-bottom:1px solid #e5e7eb;">Gesamtpreis</th>
                </tr>
              </thead>
              <tbody>
                ${bestellung.artikel.map((artikel) => `
                  <tr>
                    <td style="padding:10px; border-bottom:1px solid #f3f4f6;">${artikel.name}</td>
                    <td style="text-align:center; padding:10px; border-bottom:1px solid #f3f4f6;">${artikel.menge}</td>
                    <td style="text-align:right; padding:10px; border-bottom:1px solid #f3f4f6;">${formatPrice((artikel.preis || 0) * (artikel.menge || 0))}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>

            <div style="margin-top:18px; background:#ecfeff; border:1px solid #a5f3fc; border-radius:10px; padding:14px 16px;">
              <p style="margin:0; font-size:18px; font-weight:700; color:#0c4a6e;">Gesamtsumme: ${formatPrice(bestellung.gesamt?.brutto || bestellung.gesamtsumme || 0)}</p>
            </div>

            ${this.renderTemplateInfoBox('Wie geht es weiter?', [
              'Sie erhalten bei Bedarf weitere Informationen zum Bearbeitungsstand.',
              'Ihre Rechnung ist bereits als PDF im Anhang enthalten.',
              'Bei Rückfragen antworten Sie einfach direkt auf diese E-Mail.'
            ], 'info')}

            <p style="font-size:14px; color:#334155; margin:16px 0 8px 0;">Die Rechnung finden Sie als PDF im Anhang dieser E-Mail.</p>
            <p style="font-size:13px; color:#6b7280; margin:0;">Bei Fragen zu Ihrer Bestellung antworten Sie gerne direkt auf diese E-Mail.</p>
            ${this.renderTemplateFooter()}
          </div>
        </div>
      `;

      const emailData = {
        from: this.getSenderAddress(),
        to: customerEmail,
        subject: `Bestellbestätigung - ${bestellung.bestellnummer}`,
        html: htmlContent,
        attachments: pdfAttachment ? [{
          filename: `Rechnung_${bestellung.bestellnummer}.pdf`,
          content: Buffer.isBuffer(pdfAttachment) ? pdfAttachment.toString('base64') : String(pdfAttachment),
          contentType: 'application/pdf'
        }] : undefined
      };

      const result = await this.sendWithResendFallback(emailData);
      if (result?.error) {
        return { success: false, error: result.error.message || 'Resend API Error' };
      }

      return { success: true, messageId: result?.data?.id || result?.id || 'sent-without-id' };

    } catch (error) {
      console.error('❌ Order confirmation email failed:', error);
      return { success: false, error: error.message };
    }
  }

  // 🔔 Admin-Benachrichtigung für neue Bestellungen
  // Admin-Benachrichtigung für neue Anfragen
  async sendAdminInquiryNotification(inquiry, testMeta = null) {
    const debugCustomerEmail = inquiry?.customer?.email || inquiry?.email;
    const fallbackCustomerName = inquiry?.customer?.name || inquiry?.name || 'Unbekannt';
    const fallbackCustomerEmail = inquiry?.customer?.email || inquiry?.email || 'nicht-verfuegbar@example.com';
    console.log('📧 [E-Mail Service] Admin-Anfrage-Benachrichtigung angefordert:', { 
      inquiryId: inquiry._id,
      customerEmail: debugCustomerEmail 
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
        to: this.notificationEmail,
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
      const customerName = inquiry.customer?.name || inquiry.name || 'Unbekannt';
      const customerEmail = inquiry.customer?.email || inquiry.email || 'nicht-verfuegbar@example.com';
      const customerPhone = inquiry.customer?.phone || inquiry.phone || 'Nicht angegeben';
      const customerMessage = inquiry.customerNote || inquiry.message || 'Keine spezifische Nachricht hinterlassen - Kunde möchte vermutlich allgemeine Informationen.';
      const styles = this.getTemplateStyles('indigo');

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
        <div style="${styles.wrapper}">
          <div style="${styles.header}">
            <h1 style="margin:0; font-size:25px;">Neue Kundenanfrage eingegangen</h1>
            <p style="margin:10px 0 0 0; opacity:0.95;">Bitte prüfen Sie die Anfrage und veranlassen Sie eine zeitnahe Rückmeldung.</p>
            ${this.renderTemplateBadge('ADMIN BENACHRICHTIGUNG')}
          </div>
          <div style="${styles.body}">
            <div style="${styles.panel}; margin-bottom:18px;">
              <p style="margin:0 0 4px 0;"><strong>Name:</strong> ${customerName}</p>
              <p style="margin:0 0 4px 0;"><strong>E-Mail:</strong> <a href="mailto:${customerEmail}" style="color:#3730a3;">${customerEmail}</a></p>
              <p style="margin:0 0 4px 0;"><strong>Telefon:</strong> ${customerPhone}</p>
              <p style="margin:0;"><strong>Eingang:</strong> ${formatDate(inquiry.createdAt || new Date())}</p>
            </div>

            <h3 style="margin:0 0 10px 0;">Nachricht</h3>
            <div style="background:#f9fafb; border:1px solid #e5e7eb; border-radius:10px; padding:14px; white-space:pre-wrap;">${customerMessage}</div>

            ${this.renderTemplateInfoBox('Empfohlene Bearbeitung', [
              'Erstantwort möglichst innerhalb von 24 Stunden senden.',
              'Bei Rückfragen den Kontakt per E-Mail oder Telefon aufnehmen.',
              'Status im Adminbereich nach Bearbeitung aktualisieren.'
            ], 'info')}
            ${this.renderTemplateFooter()}
          </div>
        </div>
      `;

      const subject = this.buildTestEmailSubject(
        `Admin-Hinweis: Neue Kundenanfrage von ${customerName || customerEmail}`,
        testMeta
      );

      const result = await this.sendWithResendFallback({
        from: this.getSenderAddress(),
        to: this.notificationEmail,
        subject,
        html: htmlContent
      });

      if (result?.error) {
        throw new Error(result.error.message || 'Resend API Error');
      }

      const messageId = result?.data?.id || result?.id;
      await this.saveEmailLog({
        to: this.notificationEmail,
        subject: 'Admin-Hinweis: Neue Kundenanfrage',
        type: 'admin-inquiry-notification',
        success: true,
        messageId,
        inquiryId: inquiry._id
      });

      return { success: true, messageId, data: result?.data || result };

    } catch (error) {
      console.error('❌ [E-Mail Service] Admin-Anfrage-Benachrichtigung Fehler:', error);
      
      // Log auch Fehler speichern
      await this.saveEmailLog({
        to: this.notificationEmail,
        subject: 'Admin-Hinweis: Neue Kundenanfrage von ' + (fallbackCustomerName || fallbackCustomerEmail),
        type: 'admin-inquiry-notification',
        success: false,
        error: error.message,
        inquiryId: inquiry._id
      });

      return { success: false, error: error.message, data: null };
    }
  }

  // Bestehende sendAdminOrderNotification Funktion erweitern
  async sendAdminOrderNotification(orderData, pdfAttachment, testMeta = null) {
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
        to: this.notificationEmail,
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
      const styles = this.getTemplateStyles('red');
      
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
        <div style="${styles.wrapper}">
          <div style="${styles.header}">
            <h1 style="margin:0; font-size:25px;">Neue Bestellung im System</h1>
            <p style="margin:10px 0 0 0; opacity:0.95;">Bestellnummer ${bestellung.bestellnummer} • Gesamt ${formatPrice(gesamtbetrag)}</p>
            ${this.renderTemplateBadge('ADMIN AUFTRAGSEINGANG')}
          </div>
          <div style="${styles.body}">
            <div style="background:#fff7ed; border:1px solid #fdba74; border-radius:10px; padding:14px 16px; margin-bottom:16px;">
              <p style="margin:0 0 4px 0;"><strong>Kunde:</strong> ${kundenname}</p>
              <p style="margin:0 0 4px 0;"><strong>E-Mail:</strong> ${bestellung.kontakt?.email || 'N/A'}</p>
              <p style="margin:0;"><strong>Bestellzeit:</strong> ${formatDate(bestellung.bestelldatum)}</p>
            </div>

            <h3 style="margin:0 0 10px 0;">Positionen</h3>
            <ul style="padding-left:18px; margin:0;">
              ${bestellung.artikel.map((artikel) => `<li style="margin-bottom:6px;">${artikel.menge}x ${artikel.name} - ${formatPrice((artikel.preis || 0) * (artikel.menge || 0))}</li>`).join('')}
            </ul>

            ${this.renderTemplateInfoBox('Empfohlene Bearbeitung', [
              'Bestellung inhaltlich prüfen und intern freigeben.',
              'Rechnungsdokument im Anhang kontrollieren.',
              'Bestellung zeitnah in die operative Bearbeitung übernehmen.'
            ], 'danger')}
            ${this.renderTemplateFooter()}
          </div>
        </div>
      `;

      const attachments = [];
      if (pdfAttachment) {
        const pdfBase64 = Buffer.isBuffer(pdfAttachment)
          ? pdfAttachment.toString('base64')
          : String(pdfAttachment);
        attachments.push({
          filename: `Bestellung_${bestellung.bestellnummer}.pdf`,
          content: pdfBase64,
          contentType: 'application/pdf'
        });
      }

      const subject = this.buildTestEmailSubject(
        `Admin-Hinweis: Neue Bestellung ${bestellung.bestellnummer} (${formatPrice(gesamtbetrag)})`,
        testMeta
      );

      const result = await this.sendWithResendFallback({
        from: this.getSenderAddress(),
        to: this.notificationEmail,
        subject,
        html: htmlContent,
        attachments: attachments.length > 0 ? attachments : undefined
      });

      if (result?.error) {
        return { success: false, error: result.error.message || 'Resend API Error' };
      }

      const messageId = result?.data?.id || result?.id;
      if (!messageId) {
        return { success: false, error: 'Unexpected response from email provider' };
      }

      return { success: true, messageId };

    } catch (error) {
      console.error('❌ Admin order notification failed:', error);
      return { success: false, error: error.message };
    }
  }

  // 📧 Bestellung bestätigt E-Mail
  async sendOrderConfirmationEmail(bestellung, testMeta = null) {
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
      const styles = this.getTemplateStyles('blue');

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
        <div style="${styles.wrapper}">
          <div style="${styles.headerCentered}">
            <h1 style="margin:0; font-size:28px; font-weight:700;">Bestellung bestätigt</h1>
            <p style="margin:10px 0 0 0; font-size:16px; opacity:0.92;">Vielen Dank ${bestellung.besteller.vorname ? `, ${bestellung.besteller.vorname}` : ''}. Wir haben Ihren Auftrag erhalten.</p>
            ${this.renderTemplateBadge('BESTELLSTATUS AKTUALISIERT')}
          </div>
          <div style="${styles.body}">
            <p style="margin:0 0 14px 0;">Ihre Bestellung <strong>#${bestellung.bestellnummer}</strong> wurde erfolgreich erfasst und wird nun bearbeitet.</p>

            <div style="${styles.panel}; margin-bottom:16px;">
              <p style="margin:0 0 4px 0;"><strong>Bestellnummer:</strong> ${bestellung.bestellnummer}</p>
              <p style="margin:0 0 4px 0;"><strong>Bestelldatum:</strong> ${formatDate(bestellung.erstelltAm)}</p>
              <p style="margin:0;"><strong>Gesamtbetrag:</strong> ${formatPrice(bestellung.preise?.gesamtsumme || 0)}</p>
            </div>

            ${this.renderTemplateInfoBox('Wie geht es weiter?', [
              'Die Bestellung wird intern geprüft und vorbereitet.',
              'Sie erhalten weitere Informationen zum Versandstatus.',
              'Für Rückfragen können Sie jederzeit auf diese E-Mail antworten.'
            ], 'info')}

            <div style="text-align:center; margin:24px 0;">
              ${this.renderTemplateButton('https://gluecksmomente-manufaktur.vercel.app/kundenkonto', 'Zum Kundenkonto', styles.button)}
            </div>

            ${this.renderTemplateFooter()}
          </div>
        </div>
      `;

      const emailData = {
        from: `${this.fromName} <${this.fromEmail}>`,
        to: bestellung.besteller.email,
        subject: this.buildTestEmailSubject(`Bestellbestätigung #${bestellung.bestellnummer} - Vielen Dank`, testMeta),
        html: htmlContent,
        replyTo: testMeta?.isTest ? this.notificationEmail : undefined,
        priority: testMeta?.isTest ? 'high' : undefined
      };

      const result = await this.sendWithResendFallback(emailData);

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
  async sendOrderRejectionEmail(bestellung, reason = null, testMeta = null) {
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
      const styles = this.getTemplateStyles('red');

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
        <div style="${styles.wrapper}">
          <div style="${styles.headerCentered}">
            <h1 style="margin:0; font-size:28px; font-weight:700;">Bestellung storniert</h1>
            <p style="margin:10px 0 0 0; font-size:16px; opacity:0.92;">Leider können wir Ihre Bestellung aktuell nicht ausführen.</p>
            ${this.renderTemplateBadge('WICHTIGE INFORMATION')}
          </div>

          <div style="${styles.body}">
            <p style="margin:0 0 14px 0;">Es tut uns leid, dass wir Bestellung <strong>#${bestellung.bestellnummer}</strong> nicht wie geplant bearbeiten können.</p>

            <div style="${styles.panel}; margin-bottom:16px;">
              <p style="margin:0 0 4px 0;"><strong>Bestellnummer:</strong> ${bestellung.bestellnummer}</p>
              <p style="margin:0 0 4px 0;"><strong>Bestelldatum:</strong> ${formatDate(bestellung.erstelltAm)}</p>
              <p style="margin:0;"><strong>Betrag:</strong> ${formatPrice(bestellung.preise?.gesamtsumme || 0)}</p>
            </div>

            <h3 style="margin:0 0 10px 0;">Grund der Stornierung</h3>
            <div style="background:#f8f9fa; border:1px solid #dee2e6; border-radius:10px; padding:14px; white-space:pre-wrap;">${actualReason.trim()}</div>

            ${this.renderTemplateInfoBox('Rückerstattung', [
              `Der Betrag von ${formatPrice(bestellung.preise?.gesamtsumme || 0)} wird in der Regel innerhalb von 3-5 Werktagen zurückerstattet.`,
              'Bei PayPal erfolgt die Rückerstattung häufig schneller.',
              'Bei Fragen helfen wir Ihnen gerne weiter.'
            ], 'warning')}

            <div style="text-align:center; margin:24px 0;">
              ${this.renderTemplateButton('https://gluecksmomente-manufaktur.vercel.app/products', 'Neue Bestellung aufgeben', styles.button)}
            </div>

            ${this.renderTemplateFooter()}
          </div>
        </div>
      `;

      const emailData = {
        from: `${this.fromName} <${this.fromEmail}>`,
        to: bestellung.besteller.email,
        subject: this.buildTestEmailSubject(`Bestellung #${bestellung.bestellnummer} storniert - Rückerstattung eingeleitet`, testMeta),
        html: htmlContent,
        replyTo: testMeta?.isTest ? this.notificationEmail : undefined,
        priority: testMeta?.isTest ? 'high' : undefined
      };

      const result = await this.sendWithResendFallback(emailData);

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

    const invoiceNumber = invoiceData?.invoiceNumber || invoiceData?.bestellnummer || 'unbekannt';

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
      const styles = this.getTemplateStyles('blue');

      // Flexibel mit verschiedenen Datenstrukturen arbeiten
      const invoiceDate = invoiceData.dates?.invoiceDate || invoiceData.bestelldatum;
      const totalAmount = invoiceData.amounts?.total || invoiceData.gesamtsumme;
      const invoiceItems = Array.isArray(invoiceData.artikel)
        ? invoiceData.artikel.map((artikel) => ({
            name: artikel.name,
            description: artikel.beschreibung || '',
            quantity: artikel.menge,
            unitPrice: artikel.einzelpreis,
            totalPrice: artikel.gesamtpreis
          }))
        : Array.isArray(invoiceData.items)
          ? invoiceData.items.map((item) => ({
              name: item.productData?.name || item.name || 'Artikel',
              description: item.productData?.description || item.description || '',
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              totalPrice: item.total
            }))
          : [];
      const netAmount =
        invoiceData.nettosumme ??
        invoiceData.amounts?.subtotal ??
        (totalAmount || 0);
      const vatAmount =
        invoiceData.mwst ??
        invoiceData.amounts?.vatAmount ??
        0;

      const htmlContent = `
        <div style="${styles.wrapper}">
          <div style="${styles.headerCentered}">
            <h1 style="margin:0; font-size:30px;">Vielen Dank für Ihre Bestellung</h1>
            <p style="margin:12px 0 0 0; font-size:17px; opacity:0.9;">${customerName}</p>
            ${this.renderTemplateBadge('RECHNUNGSDOKUMENT')}
          </div>

          <div style="${styles.body}">
            <p style="margin:0 0 14px 0; color:#2C2C2C; line-height:1.65;">
              herzlichen Dank für Ihr Vertrauen in unsere Manufaktur. Es bedeutet uns sehr viel, dass Sie bei uns bestellt haben.
              Anbei erhalten Sie Ihre Rechnung als PDF.
            </p>

            <div style="${styles.panel}; margin-bottom:18px;">
              <h2 style="margin:0 0 10px 0; font-size:20px; color:#5D3242;">Rechnungsdetails</h2>
              <p style="margin:5px 0;"><strong>Rechnungsnummer:</strong> ${invoiceNumber}</p>
              <p style="margin:5px 0;"><strong>Rechnungsdatum:</strong> ${formatDate(invoiceDate)}</p>
              <p style="margin:5px 0;"><strong>Gesamtbetrag:</strong> ${formatPrice(totalAmount)}</p>
            </div>

            ${invoiceItems.length ? `
            <h3 style="color: #333; margin: 22px 0 12px 0;">Ihre Artikel</h3>
            <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px; border:1px solid #E8D5B7; border-radius:10px; overflow:hidden;">
              <thead>
                <tr style="background: #F5EEDD; border-bottom: 2px solid #E8D5B7;">
                  <th style="text-align: left; padding: 12px; border-bottom: 1px solid #dee2e6;">Artikel</th>
                  <th style="text-align: center; padding: 12px; border-bottom: 1px solid #dee2e6;">Menge</th>
                  <th style="text-align: right; padding: 12px; border-bottom: 1px solid #dee2e6;">Einzelpreis</th>
                  <th style="text-align: right; padding: 12px; border-bottom: 1px solid #dee2e6;">Gesamtpreis</th>
                </tr>
              </thead>
              <tbody>
                ${invoiceItems.map(item => `
                  <tr>
                    <td style="padding: 12px; border-bottom: 1px solid #f1f1f1;">
                      <strong>${item.name}</strong>
                      ${item.description ? `<br><small style="color: #666;">${item.description}</small>` : ''}
                    </td>
                    <td style="text-align: center; padding: 12px; border-bottom: 1px solid #f1f1f1;">${item.quantity}</td>
                    <td style="text-align: right; padding: 12px; border-bottom: 1px solid #f1f1f1;">${formatPrice(item.unitPrice)}</td>
                    <td style="text-align: right; padding: 12px; border-bottom: 1px solid #f1f1f1;">${formatPrice(item.totalPrice)}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>

            <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
              <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
                <span>Nettosumme:</span>
                <span>${formatPrice(netAmount)}</span>
              </div>
              ${vatAmount > 0 ? `
                <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
                  <span>MwSt. (19%):</span>
                  <span>${formatPrice(vatAmount)}</span>
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
                <span style="color: #5D3242;">${formatPrice(totalAmount)}</span>
              </div>
            </div>
            ` : ''}

            ${this.renderTemplateInfoBox('Rechnungsanhang', [
              'Die Rechnung finden Sie als PDF im Anhang dieser E-Mail.'
            ], 'warning')}

            ${this.renderTemplateInfoBox('Zahlungsinformation', [
              invoiceData.zahlungsmethode === 'pending'
                ? 'Die Zahlung für diese Rechnung steht noch aus. Details finden Sie in der PDF-Rechnung.'
                : 'Vielen Dank für die pünktliche Zahlung.'
            ], 'info')}

            <div style="margin-top:18px; padding:12px 14px; background:#FFF8EE; border:1px solid #E8D5B7; border-radius:10px; color:#5D3242;">
              Danke, dass Sie handgemachte Produkte aus unserer Manufaktur unterstützen. Wir wissen Ihre Bestellung sehr zu schätzen.
            </div>

            <div style="margin-top:14px; text-align:center; font-size:14px; color:#5D3242;">
              Bei Fragen zur Rechnung kontaktieren Sie uns gerne.
            </div>

            ${this.renderTemplateFooter()}
          </div>
        </div>
      `;

      const attachments = [];
      if (pdfAttachment) {
        let pdfContent = null;

        if (Buffer.isBuffer(pdfAttachment)) {
          pdfContent = pdfAttachment;
        } else if (pdfAttachment instanceof Uint8Array) {
          pdfContent = Buffer.from(pdfAttachment);
        } else if (typeof pdfAttachment === 'string') {
          pdfContent = Buffer.from(pdfAttachment, 'base64');
        }

        if (pdfContent && pdfContent.length > 0) {
          attachments.push({
            filename: `Rechnung_${invoiceNumber}.pdf`,
            content: pdfContent,
            contentType: 'application/pdf'
          });
        }
      }

      const emailData = {
        from: `${this.fromName} <${this.fromEmail}>`,
        to: customerEmail,
        subject: `📧 Ihre Rechnung ${invoiceNumber} von Glücksmomente Manufaktur`,
        html: htmlContent,
        attachments
      };

      console.log(`📧 [EmailService] Sending invoice email to: ${customerEmail}`);
      
      const result = await this.sendWithResendFallback(emailData);

      if (result?.error) {
        const providerError = result.error;
        console.error('❌ Invoice email failed (Provider Error):', providerError);

        await this.logEmail({
          to: customerEmail,
          from: emailData.from,
          subject: emailData.subject,
          content: 'E-Mail-Versand fehlgeschlagen',
          type: 'invoice',
          status: 'failed',
          invoiceId: invoiceData._id,
          error: providerError.message || 'Provider Error'
        });

        return {
          success: false,
          error: providerError.message || 'Provider Error'
        };
      }

      const messageId = result?.data?.id || result?.id;
      if (!messageId) {
        console.error('❌ Invoice email failed: Unexpected Resend response', result);

        await this.logEmail({
          to: customerEmail,
          from: emailData.from,
          subject: emailData.subject,
          content: 'E-Mail-Versand fehlgeschlagen',
          type: 'invoice',
          status: 'failed',
          invoiceId: invoiceData._id,
          error: 'Unexpected response from email provider'
        });

        return {
          success: false,
          error: 'Unexpected response from email provider'
        };
      }

      // E-Mail-Versand in DB protokollieren
      await this.logEmail({
        to: customerEmail,
        from: emailData.from,
        subject: emailData.subject,
        content: htmlContent,
        type: 'invoice',
        status: 'sent',
        invoiceId: invoiceData._id,
        messageId
      });

      console.log('✅ Invoice email sent:', result);
      return { success: true, messageId };
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

    const styles = this.getTemplateStyles('indigo');
    const htmlContent = `
      <div style="${styles.wrapper}">
        <div style="${styles.headerCentered}">
          <h1 style="margin:0;font-size:24px;">Widerruf eingegangen</h1>
          <p style="margin:12px 0 0;font-size:15px;opacity:.9;">Eingangsbestätigung gemäß § 355 BGB</p>
          ${this.renderTemplateBadge('RECHTLICHE EINGANGSBESTÄTIGUNG')}
        </div>
        <div style="${styles.body}">
          <p>Guten Tag${customerName ? ` ${customerName}` : ''},</p>
          <p>wir bestätigen den Eingang Ihrer Widerrufserklärung. Ihr Widerruf wurde elektronisch erfasst und wird nun geprüft.</p>

          <div style="${styles.panel}; margin:16px 0;">
            <p style="margin:0 0 6px;"><strong>Ihre Referenzdaten:</strong></p>
            ${refLine ? `<p style="margin:0 0 4px;">${refLine}</p>` : ''}
            <p style="margin:0 0 4px;"><strong>Widerrufs-ID:</strong> ${_id}</p>
            <p style="margin:0;"><strong>Eingegangen am:</strong> ${formatDate(createdAt)}</p>
          </div>

          ${this.renderTemplateInfoBox('Wichtiger Hinweis', [
            'Für personalisierte Produkte kann das Widerrufsrecht gemäß § 312g Abs. 2 Nr. 1 BGB ausgeschlossen sein.',
            'Wir informieren Sie gesondert, falls dies auf Ihre Bestellung zutrifft.'
          ], 'warning')}

          <p>Wir bearbeiten Ihren Widerruf schnellstmöglich und informieren Sie über das Ergebnis. Bei Fragen sind wir gerne für Sie da.</p>
          ${this.renderTemplateFooter()}
        </div>
      </div>`;

    const emailLogEntry = await this.logEmail({
      to: customerEmail,
      from: `${this.fromName} <${this.fromEmail}>`,
      subject: `Eingangsbestätigung Ihres Widerrufs – Glücksmomente Manufaktur`,
      content: `Widerrufsbestätigung für ${customerName || customerEmail}, Widerrufs-ID: ${_id}`,
      type: 'widerruf'
    });

    try {
      const result = await this.sendWithResendFallback({
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