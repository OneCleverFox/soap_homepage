const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const User = require('../models/User');
const Kunde = require('../models/Kunde');
const emailService = require('../services/emailService');
const PasswordValidator = require('../utils/passwordValidator');
const UsernameGenerator = require('../utils/usernameGenerator');

// Admin-Benutzer aus Umgebungsvariablen
const getAdminUser = () => ({
  email: process.env.ADMIN_EMAIL,
  password: process.env.ADMIN_PASSWORD,
  name: 'Ralf Jacob',
  role: 'admin',
  permissions: ['read', 'write', 'delete', 'admin']
});

// @desc    Admin Login
// @route   POST /api/auth/login
// @access  Public
const loginAdmin = async (req, res) => {
  try {
    const { email, password } = req.body;

    console.log('🔐 Login-Versuch:', email);

    // Validierung
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'E-Mail und Passwort sind erforderlich'
      });
    }

    // Admin-Benutzer aus Umgebungsvariablen abrufen
    const ADMIN_USER = getAdminUser();

    console.log('🔍 Admin-Check:', {
      eingabeEmail: email.toLowerCase(),
      erwarteteEmail: ADMIN_USER.email?.toLowerCase(),
      emailMatch: email.toLowerCase() === ADMIN_USER.email?.toLowerCase(),
      adminPasswordVorhanden: !!ADMIN_USER.password,
      adminPasswordLaenge: ADMIN_USER.password?.length
    });

    // Prüfen ob es der Admin ist
    if (email.toLowerCase() === ADMIN_USER.email?.toLowerCase()) {
      // Admin-Login
      if (password !== ADMIN_USER.password) {
        console.log('❌ Falsches Passwort für Admin:', email);
        console.log('🔍 Passwort-Vergleich fehlgeschlagen');
        console.log('   - Eingegebenes Passwort Länge:', password?.length);
        console.log('   - Erwartetes Passwort Länge:', ADMIN_USER.password?.length);
        return res.status(401).json({
          success: false,
          message: 'Ungültige Anmeldedaten'
        });
      }

      // JWT Token für Admin erstellen
      const token = jwt.sign(
        {
          id: 'admin-ralf',
          email: ADMIN_USER.email,
          role: ADMIN_USER.role,
          permissions: ADMIN_USER.permissions
        },
        process.env.JWT_SECRET || 'fallback-secret-key',
        { expiresIn: '24h' }
      );

      console.log('✅ Erfolgreicher Admin-Login:', email);

      return res.status(200).json({
        success: true,
        message: 'Erfolgreich angemeldet',
        token,
        user: {
          id: 'admin-ralf',
          email: ADMIN_USER.email,
          name: ADMIN_USER.name,
          role: ADMIN_USER.role,
          permissions: ADMIN_USER.permissions
        }
      });
    }

    // Nicht der Admin - prüfen ob Kunde existiert
    
    console.log('🔍 Suche Kunde mit E-Mail:', email.toLowerCase().trim());
    const kunde = await Kunde.findOne({ email: email.toLowerCase().trim() });
    
    if (!kunde) {
      // Debug: Alle Kunden-E-Mails anzeigen
      const alleKunden = await Kunde.find({}).select('email vorname nachname').limit(5);
      console.log('📋 Erste 5 Kunden in DB:', alleKunden.map(k => ({ email: k.email, name: `${k.vorname} ${k.nachname}` })));
      
      console.log('❌ Unbekannte E-Mail:', email);
      return res.status(401).json({
        success: false,
        message: 'Ungültige Anmeldedaten'
      });
    }
    
    console.log('✅ Kunde gefunden:', { 
      id: kunde._id, 
      email: kunde.email, 
      name: `${kunde.vorname} ${kunde.nachname}`,
      status: kunde.status,
      statusType: typeof kunde.status
    });

    // Status-Migration für ältere Kunden-Datensätze
    let statusFixed = false;
    if (typeof kunde.status === 'string') {
      console.log('🔧 Status-Migration erforderlich für:', email);
      
      // String-Status in Objekt-Status konvertieren
      const newStatus = {
        aktiv: kunde.status === 'active' || kunde.status === 'verified',
        emailVerifiziert: kunde.status === 'verified' || kunde.status === 'active',
        telefonVerifiziert: false,
        gesperrt: kunde.status === 'blocked' || kunde.status === 'suspended'
      };
      
      kunde.status = newStatus;
      await kunde.save();
      statusFixed = true;
      
      console.log('✅ Status migriert:', { 
        old: typeof kunde.status === 'string' ? kunde.status : 'object',
        new: newStatus 
      });
    }

    // Admin-Einstellungen für E-Mail-Verifikation prüfen
    const AdminSettings = require('../models/AdminSettings');
    const adminSettings = await AdminSettings.getInstance();
    const requireEmailVerification = adminSettings.userManagement?.requireEmailVerification ?? true;

    console.log('📋 Admin-Einstellungen:', {
      requireEmailVerification,
      kundeStatus: kunde.status,
      statusFixed
    });

    // Account-Status prüfen (nach Migration)
    if (!kunde.status.aktiv || kunde.status.gesperrt) {
      console.log('❌ Account inaktiv oder gesperrt:', email, kunde.status);
      return res.status(401).json({
        success: false,
        message: 'Account ist deaktiviert oder gesperrt'
      });
    }

    // E-Mail-Verifikation prüfen (nur wenn in Admin-Einstellungen aktiviert)
    if (requireEmailVerification && !kunde.status.emailVerifiziert) {
      console.log('❌ E-Mail nicht verifiziert:', email);
      return res.status(401).json({
        success: false,
        message: 'Bitte verifizieren Sie zuerst Ihre E-Mail-Adresse'
      });
    }

    // Passwort vergleichen
    const istPasswortKorrekt = await kunde.vergleichePasswort(password);
    if (!istPasswortKorrekt) {
      kunde.anmeldeversuche = (kunde.anmeldeversuche || 0) + 1;
      await kunde.save();
      
      console.log('❌ Falsches Passwort für Kunde:', email);
      return res.status(401).json({
        success: false,
        message: 'Ungültige Anmeldedaten'
      });
    }

    // Erfolgreiche Kunden-Anmeldung
    kunde.letzteAnmeldung = new Date();
    kunde.anmeldeversuche = 0;
    await kunde.save();

    // JWT Token für Kunde erstellen
    const token = jwt.sign(
      { 
        id: kunde._id.toString(),
        kundeId: kunde._id,
        email: kunde.email,
        kundennummer: kunde.kundennummer,
        rolle: kunde.rolle || 'kunde'  // Verwende kunde.rolle statt hartcodiert 'kunde'
      },
      process.env.JWT_SECRET || 'fallback-secret-key',
      { expiresIn: '24h' }
    );

    console.log('✅ Erfolgreicher Kunden-Login:', email);

    // Passwort aus Response entfernen
    const kundeOhnePasswort = kunde.toObject();
    delete kundeOhnePasswort.passwort;

    res.status(200).json({
      success: true,
      message: 'Erfolgreich angemeldet',
      token,
      user: {
        id: kunde._id.toString(),
        email: kunde.email,
        name: `${kunde.vorname} ${kunde.nachname}`,
        rolle: kunde.rolle || 'kunde',  // Verwende kunde.rolle statt hartcodiert 'kunde'
        kundennummer: kunde.kundennummer
      }
    });

  } catch (error) {
    console.error('Auth Error:', error);
    res.status(500).json({
      success: false,
      message: 'Server-Fehler bei der Anmeldung'
    });
  }
};

// @desc    Token validieren
// @route   GET /api/auth/validate
// @access  Private
const validateToken = async (req, res) => {
  try {
    // Token wurde bereits durch Middleware validiert
    res.status(200).json({
      success: true,
      user: req.user
    });
  } catch (error) {
    console.error('Token Validation Error:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler bei Token-Validierung'
    });
  }
};

// @desc    Logout (Client-seitig)
// @route   POST /api/auth/logout
// @access  Private
const logout = async (req, res) => {
  try {
    console.log('🚪 Admin-Logout:', req.user?.email);
    
    res.status(200).json({
      success: true,
      message: 'Erfolgreich abgemeldet'
    });
  } catch (error) {
    console.error('Logout Error:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Abmelden'
    });
  }
};

// @desc    Benutzer registrieren
// @route   POST /api/auth/register
// @access  Public
const registerUser = async (req, res) => {
  try {
    const { 
      username: providedUsername, // optional, wird automatisch generiert
      email, 
      password, 
      firstName, 
      lastName, 
      phone,
      address,
      dateOfBirth,
      communicationPreferences
    } = req.body;

    console.log('📝 Registrierung-Versuch:', email);

    // Admin-Einstellungen abrufen
    const AdminSettings = require('../models/AdminSettings');
    const adminSettings = await AdminSettings.getInstance();
    const requireEmailVerification = adminSettings.userManagement?.requireEmailVerification ?? true;

    // Validierung der Pflichtfelder
    if (!email || !password || !firstName || !lastName) {
      return res.status(400).json({
        success: false,
        message: 'E-Mail, Passwort, Vor- und Nachname sind erforderlich'
      });
    }

    // E-Mail-Format validieren
    const emailRegex = /^\S+@\S+\.\S+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: 'Bitte geben Sie eine gültige E-Mail-Adresse ein'
      });
    }

    // Erweiterte Passwort-Validierung nach aktuellen Sicherheitsstandards
    const passwordValidation = PasswordValidator.validatePassword(password, {
      firstName,
      lastName,
      username: providedUsername,
      email
    });

    if (!passwordValidation.isValid) {
      return res.status(400).json({
        success: false,
        message: 'Passwort entspricht nicht den Sicherheitsanforderungen',
        passwordFeedback: passwordValidation.feedback,
        requirements: passwordValidation.requirements,
        suggestions: PasswordValidator.generatePasswordSuggestions()
      });
    }

    // Passwort-Stärke prüfen (zusätzliche Validierung)
    if (passwordValidation.score < 3) {
      return res.status(400).json({
        success: false,
        message: `Passwort-Stärke zu schwach (${passwordValidation.score}/4)`,
        passwordFeedback: passwordValidation.feedback,
        suggestions: PasswordValidator.generatePasswordSuggestions()
      });
    }

    // Automatischen Benutzernamen generieren
    const username = await UsernameGenerator.createUsernameForRegistration(firstName, lastName);
    console.log(`✅ Automatisch generierter Benutzername: ${username}`);

    // Prüfen ob Benutzer bereits existiert (in User-Collection)
    const existingUser = await User.findOne({
      $or: [
        { email: email.toLowerCase() },
        { username: username.toLowerCase() }
      ]
    });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: existingUser.email === email.toLowerCase() 
          ? 'Ein Benutzer mit dieser E-Mail-Adresse existiert bereits'
          : 'Dieser Benutzername ist bereits vergeben'
      });
    }

    // Zusätzlich prüfen ob E-Mail bereits in Kunden-Collection existiert
    const Kunde = require('../models/Kunde');
    const existingKunde = await Kunde.findOne({ email: email.toLowerCase() });
    
    if (existingKunde) {
      return res.status(400).json({
        success: false,
        message: 'Ein Kunde mit dieser E-Mail-Adresse ist bereits registriert. Bitte verwenden Sie die Anmeldefunktion.'
      });
    }

    // E-Mail-Verifizierungs-Token generieren (falls erforderlich)
    let verificationToken = null;
    let verificationExpires = null;
    
    if (requireEmailVerification) {
      verificationToken = crypto.randomBytes(32).toString('hex');
      verificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 Stunden
    }

    // Neuen Kunden erstellen (parallell zum User für die Bestellsystem-Kompatibilität)
    const newKunde = new Kunde({
      username: username.toLowerCase(),
      email: email.toLowerCase(),
      passwort: password, // WICHTIG: Das Kunde-Model verwendet 'passwort', nicht 'password'
      vorname: firstName,
      nachname: lastName,
      telefon: phone || '',
      adresse: address || {
        strasse: '',
        hausnummer: '',
        plz: '',
        stadt: '',
        land: 'Deutschland'
      },
      status: {
        aktiv: !requireEmailVerification, // Aktiv wenn keine E-Mail-Verifikation erforderlich
        emailVerifiziert: !requireEmailVerification,
        telefonVerifiziert: false,
        gesperrt: false
      },
      rolle: 'kunde',
      kommunikation: communicationPreferences || {
        newsletter: false,
        sms: false
      }
    });

    console.log('💾 Speichere neuen Kunden...');
    await newKunde.save();
    console.log('✅ Kunde erfolgreich erstellt mit Kundennummer:', newKunde.kundennummer);

    // Neuen Benutzer erstellen (für erweiterte Funktionen)
    const newUser = new User({
      username: username.toLowerCase(),
      email: email.toLowerCase(),
      password,
      firstName,
      lastName,
      phone,
      address,
      dateOfBirth,
      emailVerificationToken: verificationToken,
      emailVerificationExpires: verificationExpires,
      status: requireEmailVerification ? 'unverified' : 'active',
      emailVerified: !requireEmailVerification, // Sofort verifiziert wenn nicht erforderlich
      kundeId: newKunde._id // Referenz zum Kunden-Datensatz
    });

    await newUser.save();

    console.log('✅ Benutzer erstellt:', newUser.email);
    console.log('✅ Kunde erstellt:', newKunde.email);
    console.log(`📧 E-Mail-Verifikation: ${requireEmailVerification ? 'ERFORDERLICH' : 'ÜBERSPRUNGEN'}`);

    // Verifizierungs-E-Mail senden (nur wenn erforderlich)
    if (requireEmailVerification) {
      try {
        const emailResult = await emailService.sendVerificationEmail(
          newUser.email,
          verificationToken,
          newUser.firstName
        );

        if (emailResult.success) {
          console.log('📧 Verifizierungs-E-Mail gesendet');
        } else {
          console.error('❌ E-Mail-Versand fehlgeschlagen:', emailResult.error);
        }
      } catch (emailError) {
        console.error('❌ E-Mail-Service-Fehler:', emailError);
      }
    }

    res.status(201).json({
      success: true,
      message: requireEmailVerification 
        ? 'Registrierung erfolgreich! Bitte überprüfen Sie Ihre E-Mail zur Bestätigung.'
        : 'Registrierung erfolgreich! Ihr Account ist sofort aktiv.',
      data: {
        userId: newUser._id,
        kundeId: newKunde._id,
        kundennummer: newKunde.kundennummer,
        email: newUser.email,
        firstName: newUser.firstName,
        emailSent: requireEmailVerification,
        emailVerified: !requireEmailVerification,
        status: newUser.status
      }
    });

  } catch (error) {
    console.error('❌ Registrierung-Fehler:', error);
    
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern)[0];
      const message = field === 'email' 
        ? 'Ein Benutzer mit dieser E-Mail-Adresse existiert bereits'
        : 'Dieser Benutzername ist bereits vergeben';
      
      return res.status(400).json({
        success: false,
        message
      });
    }

    res.status(500).json({
      success: false,
      message: 'Fehler bei der Registrierung. Bitte versuchen Sie es erneut.'
    });
  }
};

// @desc    E-Mail verifizieren
// @route   GET /api/auth/verify-email/:token
// @access  Public
const verifyEmail = async (req, res) => {
  try {
    const { token } = req.params;

    console.log('🔍 E-Mail-Verifizierung für Token:', token);

    // Benutzer mit gültigem Token finden
    const user = await User.findOne({
      emailVerificationToken: token,
      emailVerificationExpires: { $gt: new Date() }
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'Ungültiger oder abgelaufener Verifizierungslink'
      });
    }

    // E-Mail als verifiziert markieren
    user.emailVerified = true;
    user.status = 'active';
    user.emailVerificationToken = undefined;
    user.emailVerificationExpires = undefined;
    
    await user.save();

    console.log('✅ E-Mail verifiziert für:', user.email);

    // Willkommens-E-Mail senden
    try {
      await emailService.sendWelcomeEmail(user.email, user.firstName);
    } catch (emailError) {
      console.error('❌ Willkommens-E-Mail-Fehler:', emailError);
    }

    res.status(200).json({
      success: true,
      message: 'E-Mail erfolgreich verifiziert! Ihr Konto ist jetzt aktiv.',
      data: {
        email: user.email,
        firstName: user.firstName
      }
    });

  } catch (error) {
    console.error('❌ E-Mail-Verifizierung-Fehler:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler bei der E-Mail-Verifizierung'
    });
  }
};

// @desc    Verifizierungs-E-Mail erneut senden
// @route   POST /api/auth/resend-verification
// @access  Public
const resendVerification = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'E-Mail-Adresse ist erforderlich'
      });
    }

    // Benutzer finden
    const user = await User.findOne({ 
      email: email.toLowerCase(),
      emailVerified: false 
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Kein unverifizierter Benutzer mit dieser E-Mail-Adresse gefunden'
      });
    }

    // Neuen Verifizierungs-Token generieren
    const verificationToken = crypto.randomBytes(32).toString('hex');
    const verificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 Stunden

    user.emailVerificationToken = verificationToken;
    user.emailVerificationExpires = verificationExpires;
    
    await user.save();

    // E-Mail erneut senden
    const emailResult = await emailService.sendVerificationEmail(
      user.email,
      verificationToken,
      user.firstName
    );

    if (emailResult.success) {
      res.status(200).json({
        success: true,
        message: 'Verifizierungs-E-Mail wurde erneut gesendet'
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'Fehler beim Senden der E-Mail'
      });
    }

  } catch (error) {
    console.error('❌ Resend-Verification-Fehler:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim erneuten Senden der Verifizierungs-E-Mail'
    });
  }
};

// @desc    Passwort-Reset-Anfrage (E-Mail versenden)
// @route   POST /api/auth/forgot-password
// @access  Public
const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    console.log('🔄 Passwort-Reset angefordert für:', email);

    // Validierung
    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'E-Mail-Adresse ist erforderlich'
      });
    }

    // Email-Format validieren
    const emailRegex = /^\S+@\S+\.\S+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: 'Ungültige E-Mail-Adresse'
      });
    }

    // Benutzer suchen
    const user = await User.findOne({ email: email.toLowerCase() });

    // Sicherheit: Immer gleiche Antwort geben (verhindert Email-Enumeration)
    const successMessage = 'Falls ein Konto mit dieser E-Mail-Adresse existiert, wurde eine E-Mail zum Zurücksetzen des Passworts gesendet.';

    if (!user) {
      console.log('⚠️ Passwort-Reset für unbekannte E-Mail:', email);
      // Trotzdem erfolgreiche Antwort geben
      return res.status(200).json({
        success: true,
        message: successMessage
      });
    }

    // Sicheren Reset-Token generieren (32 Bytes = 256 Bit)
    const resetToken = crypto.randomBytes(32).toString('hex');
    
    // Token-Hash erstellen (zusätzliche Sicherheit)
    const hashedToken = crypto.createHash('sha256').update(resetToken).digest('hex');

    // Token in DB speichern (1 Stunde gültig)
    user.passwordResetToken = hashedToken;
    user.passwordResetExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 Stunde
    await user.save({ validateBeforeSave: false });

    // Reset-Link erstellen
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const resetUrl = `${frontendUrl}/reset-password/${resetToken}`;

    console.log('📧 Sende Passwort-Reset-E-Mail an:', email);
    console.log('🔗 Reset-URL:', resetUrl);

    // E-Mail senden mit User-ID für Logging
    const emailResult = await emailService.sendPasswordResetEmail(
      user.email, 
      resetUrl, 
      user.firstName || user.username,
      user._id,  // User ID für MongoDB Logging
      null       // Kunde ID (falls verfügbar)
    );
    
    console.log('📧 E-Mail Service Antwort:', {
      success: emailResult.success,
      messageId: emailResult.messageId,
      error: emailResult.error
    });

    if (emailResult.success) {
      console.log('✅ Passwort-Reset-E-Mail erfolgreich gesendet - Message ID:', emailResult.messageId);
      res.status(200).json({
        success: true,
        message: successMessage
      });
    } else {
      console.error('❌ Fehler beim Senden der Passwort-Reset-E-Mail:', emailResult.error);
      // Token wieder entfernen bei E-Mail-Fehler
      user.passwordResetToken = undefined;
      user.passwordResetExpires = undefined;
      await user.save({ validateBeforeSave: false });
      
      res.status(500).json({
        success: false,
        message: 'Fehler beim Senden der E-Mail. Bitte versuchen Sie es später erneut.'
      });
    }

  } catch (error) {
    console.error('❌ Forgot-Password-Fehler:', error);
    res.status(500).json({
      success: false,
      message: 'Interner Serverfehler'
    });
  }
};

// @desc    Passwort zurücksetzen mit Token
// @route   POST /api/auth/reset-password/:token
// @access  Public
const resetPassword = async (req, res) => {
  try {
    const { token } = req.params;
    const { password, confirmPassword } = req.body;

    console.log('🔄 Passwort-Reset mit Token:', token?.substring(0, 8) + '...');

    // Validierung
    if (!token) {
      return res.status(400).json({
        success: false,
        message: 'Reset-Token ist erforderlich'
      });
    }

    if (!password || !confirmPassword) {
      return res.status(400).json({
        success: false,
        message: 'Passwort und Passwort-Bestätigung sind erforderlich'
      });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({
        success: false,
        message: 'Passwörter stimmen nicht überein'
      });
    }

    // Passwort-Sicherheit validieren
    const passwordValidation = PasswordValidator.validatePassword(password, {});
    if (!passwordValidation.isValid) {
      return res.status(400).json({
        success: false,
        message: passwordValidation.message || 'Passwort erfüllt nicht die Sicherheitsanforderungen',
        feedback: passwordValidation.feedback
      });
    }

    // Token hashen (muss mit gespeichertem Hash übereinstimmen)
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    // Benutzer mit Token suchen (Token noch nicht abgelaufen)
    const user = await User.findOne({
      passwordResetToken: hashedToken,
      passwordResetExpires: { $gt: Date.now() }
    });

    if (!user) {
      console.log('❌ Ungültiger oder abgelaufener Token');
      return res.status(400).json({
        success: false,
        message: 'Ungültiger oder abgelaufener Reset-Token'
      });
    }

    console.log('✅ Gültiger Token für Benutzer:', user.email);

    // Neues Passwort hashen
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Passwort aktualisieren und Token entfernen
    user.password = hashedPassword;
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    
    // Account aktivieren falls noch nicht verifiziert
    if (user.status === 'unverified') {
      user.status = 'active';
      user.emailVerified = true;
    }

    await user.save();

    console.log('✅ Passwort erfolgreich zurückgesetzt für:', user.email);

    res.status(200).json({
      success: true,
      message: 'Passwort wurde erfolgreich zurückgesetzt. Sie können sich jetzt mit Ihrem neuen Passwort anmelden.'
    });

  } catch (error) {
    console.error('❌ Reset-Password-Fehler:', error);
    res.status(500).json({
      success: false,
      message: 'Interner Serverfehler'
    });
  }
};

// @desc    Benutzer-Profil abrufen
// @route   GET /api/auth/profile
// @access  Private
const getProfile = async (req, res) => {
  try {
    let user;
    
    // Versuche zuerst mit ObjectId (neue User)
    if (req.user.id && req.user.id.match(/^[0-9a-fA-F]{24}$/)) {
      user = await User.findById(req.user.id).select('-password -passwordResetToken -passwordResetExpires -emailVerificationToken');
    }
    
    // Falls nicht gefunden, versuche mit username (Legacy-User wie admin-ralf)
    if (!user && req.user.id) {
      user = await User.findOne({ username: req.user.id }).select('-password -passwordResetToken -passwordResetExpires -emailVerificationToken');
    }
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Benutzer nicht gefunden'
      });
    }

    res.status(200).json({
      success: true,
      data: user
    });

  } catch (error) {
    console.error('❌ Get-Profile-Fehler:', error);
    res.status(500).json({
      success: false,
      message: 'Interner Serverfehler'
    });
  }
};

// @desc    Benutzer-Profil aktualisieren
// @route   PUT /api/auth/profile
// @access  Private
const updateProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    const {
      firstName,
      lastName,
      phone,
      address,
      dateOfBirth,
      communicationPreferences
    } = req.body;

    console.log('🔄 Profil-Update für User:', userId);

    // Aktuellen Benutzer abrufen
    let user;
    
    // Versuche zuerst mit ObjectId (neue User)
    if (userId && userId.match(/^[0-9a-fA-F]{24}$/)) {
      user = await User.findById(userId);
    }
    
    // Falls nicht gefunden, versuche mit username (Legacy-User wie admin-ralf)
    if (!user && userId) {
      user = await User.findOne({ username: userId });
    }
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Benutzer nicht gefunden'
      });
    }

    // Änderungen verfolgen für Email-Benachrichtigung
    const changes = [];
    const oldData = {
      firstName: user.firstName,
      lastName: user.lastName,
      phone: user.phone,
      address: { ...user.address },
      dateOfBirth: user.dateOfBirth,
      communicationPreferences: { ...user.communicationPreferences }
    };

    // Daten aktualisieren
    const updateData = {};
    
    if (firstName !== undefined) {
      updateData.firstName = firstName.trim();
      if (oldData.firstName !== firstName.trim()) {
        changes.push(`Vorname: "${oldData.firstName}" → "${firstName.trim()}"`);
      }
    }
    
    if (lastName !== undefined) {
      updateData.lastName = lastName.trim();
      if (oldData.lastName !== lastName.trim()) {
        changes.push(`Nachname: "${oldData.lastName}" → "${lastName.trim()}"`);
      }
    }
    
    if (phone !== undefined) {
      updateData.phone = phone.trim();
      if (oldData.phone !== phone.trim()) {
        changes.push(`Telefon: "${oldData.phone || 'nicht angegeben'}" → "${phone.trim() || 'nicht angegeben'}"`);
      }
    }
    
    if (address !== undefined) {
      updateData.address = { ...user.address, ...address };
      // Adressänderungen verfolgen
      if (address.street && oldData.address.street !== address.street) {
        changes.push(`Straße: "${oldData.address.street || ''}" → "${address.street}"`);
      }
      if (address.houseNumber && oldData.address.houseNumber !== address.houseNumber) {
        changes.push(`Hausnummer: "${oldData.address.houseNumber || ''}" → "${address.houseNumber}"`);
      }
      if (address.zipCode && oldData.address.zipCode !== address.zipCode) {
        changes.push(`PLZ: "${oldData.address.zipCode || ''}" → "${address.zipCode}"`);
      }
      if (address.city && oldData.address.city !== address.city) {
        changes.push(`Stadt: "${oldData.address.city || ''}" → "${address.city}"`);
      }
      if (address.country && oldData.address.country !== address.country) {
        changes.push(`Land: "${oldData.address.country || ''}" → "${address.country}"`);
      }
    }
    
    if (dateOfBirth !== undefined) {
      updateData.dateOfBirth = dateOfBirth;
      const oldDate = oldData.dateOfBirth ? new Date(oldData.dateOfBirth).toLocaleDateString('de-DE') : 'nicht angegeben';
      const newDate = dateOfBirth ? new Date(dateOfBirth).toLocaleDateString('de-DE') : 'nicht angegeben';
      if (oldDate !== newDate) {
        changes.push(`Geburtsdatum: "${oldDate}" → "${newDate}"`);
      }
    }
    
    if (communicationPreferences !== undefined) {
      updateData.communicationPreferences = { ...user.communicationPreferences, ...communicationPreferences };
      // Kommunikationseinstellungen verfolgen
      Object.keys(communicationPreferences).forEach(key => {
        if (oldData.communicationPreferences[key] !== communicationPreferences[key]) {
          changes.push(`${key}: ${oldData.communicationPreferences[key] ? 'aktiviert' : 'deaktiviert'} → ${communicationPreferences[key] ? 'aktiviert' : 'deaktiviert'}`);
        }
      });
    }

    // Benutzername aktualisieren wenn Name geändert wurde
    let newUsername = user.username;
    if ((firstName && firstName.trim() !== user.firstName) || (lastName && lastName.trim() !== user.lastName)) {
      const newFirstName = firstName?.trim() || user.firstName;
      const newLastName = lastName?.trim() || user.lastName;
      
      try {
        newUsername = await UsernameGenerator.updateUsernameForNameChange(userId, newFirstName, newLastName);
        updateData.username = newUsername;
        
        if (user.username !== newUsername) {
          changes.push(`Benutzername: "${user.username}" → "${newUsername}"`);
        }
      } catch (error) {
        console.error('Fehler bei Benutzername-Update:', error);
        // Benutzername-Fehler sind nicht kritisch, weitermachen
      }
    }

    // Profil in Datenbank aktualisieren
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      updateData,
      { new: true, runValidators: true }
    ).select('-password -passwordResetToken -passwordResetExpires -emailVerificationToken');

    console.log('✅ Profil erfolgreich aktualisiert:', changes.length, 'Änderungen');

    // Email-Benachrichtigung senden wenn Änderungen vorgenommen wurden
    if (changes.length > 0) {
      const emailSent = await emailService.sendProfileUpdateNotification(
        user.email,
        user.firstName || user.username,
        changes
      );
      
      if (emailSent.success) {
        console.log('✅ Profil-Update-E-Mail gesendet');
      } else {
        console.log('⚠️ Profil-Update-E-Mail konnte nicht gesendet werden');
      }
    }

    res.status(200).json({
      success: true,
      message: changes.length > 0 
        ? `Profil erfolgreich aktualisiert. ${changes.length} Änderung(en) vorgenommen.`
        : 'Keine Änderungen am Profil vorgenommen.',
      data: updatedUser,
      changes: changes.length
    });

  } catch (error) {
    console.error('❌ Update-Profile-Fehler:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Aktualisieren des Profils'
    });
  }
};

// @desc    Benutzer-Account löschen
// @route   DELETE /api/auth/account
// @access  Private
const deleteAccount = async (req, res) => {
  try {
    const userId = req.user.id;
    const kundennummer = req.user.kundennummer;
    const { password, email, reason } = req.body;

    console.log('🗑️ Account-Löschung angefordert für User:', userId, 'Kundennummer:', kundennummer);

    // Benutzer abrufen
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Benutzer nicht gefunden'
      });
    }

    // Email-Bestätigung prüfen
    if (email !== user.email) {
      return res.status(400).json({
        success: false,
        message: 'Zur Bestätigung muss die E-Mail-Adresse korrekt eingegeben werden'
      });
    }

    // Passwort prüfen
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(400).json({
        success: false,
        message: 'Passwort ist nicht korrekt'
      });
    }

    // Prüfung auf unzugestellte Bestellungen
    if (kundennummer) {
      const Order = require('../models/Order');
      const undeliveredOrders = await Order.find({
        'besteller.kundennummer': kundennummer,
        status: { 
          $nin: ['zugestellt', 'storniert', 'rueckerstattung'] 
        }
      });

      if (undeliveredOrders.length > 0) {
        console.log('❌ Account kann nicht gelöscht werden - unzugestellte Bestellungen:', undeliveredOrders.length);
        return res.status(400).json({
          success: false,
          message: `Account kann nicht gelöscht werden. Es bestehen noch ${undeliveredOrders.length} unzugestellte Bestellung(en). Bitte warten Sie, bis alle Bestellungen zugestellt wurden.`,
          undeliveredOrders: undeliveredOrders.map(order => ({
            bestellnummer: order.bestellnummer,
            status: order.status,
            bestelldatum: order.bestelldatum
          }))
        });
      }
      
      console.log('✅ Alle Bestellungen sind zugestellt - Account kann gelöscht werden');
    }

    // Benutzer-Daten für Email-Benachrichtigung sichern
    const userData = {
      email: user.email,
      firstName: user.name || user.username,
      username: user.username,
      registrationDate: user.createdAt,
      kundennummer: kundennummer
    };

    // Account löschen
    await User.findByIdAndDelete(userId);

    console.log('✅ Account erfolgreich gelöscht:', user.email);

    // Bestätigungs-E-Mail senden
    const emailSent = await emailService.sendAccountDeletionConfirmation(
      userData.email,
      userData.firstName,
      userData.username,
      reason || 'Keine Angabe'
    );

    if (emailSent.success) {
      console.log('✅ Account-Löschungs-Bestätigung gesendet');
    } else {
      console.log('⚠️ Account-Löschungs-E-Mail konnte nicht gesendet werden');
    }

    res.status(200).json({
      success: true,
      message: 'Ihr Account wurde erfolgreich gelöscht. Eine Bestätigungsmail wurde an Ihre E-Mail-Adresse gesendet.'
    });

  } catch (error) {
    console.error('❌ Delete-Account-Fehler:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Löschen des Accounts'
    });
  }
};

module.exports = {
  loginAdmin,
  validateToken,
  logout,
  registerUser,
  verifyEmail,
  resendVerification,
  forgotPassword,
  resetPassword,
  getProfile,
  updateProfile,
  deleteAccount
};