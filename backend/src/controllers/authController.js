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

    // Datenreparatur für unvollständige Kunden vor jeder weiteren Verarbeitung
    let dataFixed = false;
    if (!kunde.vorname || !kunde.nachname || !kunde.passwort) {
      console.log('🔧 Datenreparatur erforderlich für unvollständigen Kunde:', email);
      
      // Fehlende Daten mit Dummy-Werten füllen
      if (!kunde.vorname) kunde.vorname = 'Kunde';
      if (!kunde.nachname) kunde.nachname = 'Nicht vollständig';
      if (!kunde.kundennummer) {
        // Kundennummer generieren wie im Model
        const datum = new Date();
        const jahr = datum.getFullYear().toString();
        const monat = (datum.getMonth() + 1).toString().padStart(2, '0');
        const random = Math.floor(Math.random() * 9999).toString().padStart(4, '0');
        kunde.kundennummer = `KD${jahr}${monat}${random}`;
      }
      if (!kunde.geschlecht) kunde.geschlecht = 'keine Angabe';
      
      // Adresse reparieren
      if (!kunde.adresse) kunde.adresse = {};
      if (!kunde.adresse.strasse) kunde.adresse.strasse = 'Unbekannt';
      if (!kunde.adresse.hausnummer) kunde.adresse.hausnummer = '0';
      if (!kunde.adresse.plz) kunde.adresse.plz = '00000';
      if (!kunde.adresse.stadt) kunde.adresse.stadt = 'Unbekannt';
      
      dataFixed = true;
      console.log('✅ Daten repariert für:', email);
    }

    // Status-Migration für ältere Kunden-Datensätze
    let statusFixed = false;
    if (typeof kunde.status === 'string') {
      console.log('🔧 Status-Migration erforderlich für:', email, 'Status:', kunde.status);
      
      // String-Status in Objekt-Status konvertieren
      const newStatus = {
        aktiv: kunde.status === 'active' || kunde.status === 'verified',
        emailVerifiziert: kunde.status === 'verified' || kunde.status === 'active',
        telefonVerifiziert: false,
        gesperrt: kunde.status === 'blocked' || kunde.status === 'suspended'
      };
      
      kunde.status = newStatus;
      statusFixed = true;
      
      console.log('✅ Status migriert:', { 
        alt: 'string: ' + kunde.status,
        neu: newStatus 
      });
    }

    // Zusätzliche Prüfung für defekte Status-Objekte
    if (typeof kunde.status === 'object' && kunde.status !== null) {
      if (kunde.status.aktiv === undefined || kunde.status.emailVerifiziert === undefined) {
        console.log('🔧 Status-Reparatur erforderlich für:', email);
        
        kunde.status = {
          aktiv: true, // Standardmäßig aktiv für existierende User
          emailVerifiziert: true, // Existierende User als verifiziert betrachten
          telefonVerifiziert: kunde.status.telefonVerifiziert || false,
          gesperrt: kunde.status.gesperrt || false
        };
        
        statusFixed = true;
        
        console.log('✅ Status repariert für:', email, kunde.status);
      }
    }
    
    // Speichere Status-Änderungen separat falls nötig (nur bei Migration/Reparatur)
    if (statusFixed) {
      await kunde.save({ validateBeforeSave: false });
      console.log('✅ Status-Migration gespeichert');
    }
    
    // Speichere Datenreparaturen separat falls nötig (nur bei Reparatur)
    if (dataFixed) {
      await kunde.save({ validateBeforeSave: false });
      console.log('✅ Datenreparatur gespeichert');
    }

    // Admin-Einstellungen für E-Mail-Verifikation prüfen
    const AdminSettings = require('../models/AdminSettings');
    const adminSettings = await AdminSettings.getInstance();
    const requireEmailVerification = adminSettings.userManagement?.requireEmailVerification ?? true;

    console.log('📋 Admin-Einstellungen:', {
      requireEmailVerification,
      kundeStatus: kunde.status,
      statusFixed,
      kundeStatusAktiv: kunde.status?.aktiv,
      kundeStatusGesperrt: kunde.status?.gesperrt
    });

    // Account-Status prüfen (nach Migration)
    if (!kunde.status || !kunde.status.aktiv || kunde.status.gesperrt) {
      console.log('❌ Account inaktiv oder gesperrt:', email, {
        status: kunde.status,
        aktiv: kunde.status?.aktiv,
        gesperrt: kunde.status?.gesperrt,
        checkResult: !kunde.status || !kunde.status.aktiv || kunde.status.gesperrt
      });
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
      
      // Versuche normales Save, falls das fehlschlägt, dann ohne Validierung
      try {
        await kunde.save();
      } catch (saveError) {
        await kunde.save({ validateBeforeSave: false });
      }
      
      console.log('❌ Falsches Passwort für Kunde:', email, {
        hatPasswort: !!kunde.passwort,
        eingegebenesPasswort: password ? '***' : 'leer'
      });
      
      // Spezielle Fehlermeldung für Kunden ohne Passwort
      if (!kunde.passwort) {
        return res.status(401).json({
          success: false,
          message: 'Account unvollständig - bitte kontaktieren Sie den Support'
        });
      }
      
      return res.status(401).json({
        success: false,
        message: 'Ungültige Anmeldedaten'
      });
    }

    // Erfolgreiche Kunden-Anmeldung - normale Felder updaten
    kunde.letzteAnmeldung = new Date();
    kunde.anmeldeversuche = 0;
    
    // Normaler Save für Standard-Updates (letzteAnmeldung, anmeldeversuche)
    try {
      await kunde.save();
    } catch (saveError) {
      // Falls normal save fehlschlägt wegen Validierung, dann mit disabled validation
      console.log('⚠️ Standard Save fehlgeschlagen, verwende validateBeforeSave: false');
      await kunde.save({ validateBeforeSave: false });
    }

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

// @desc    Debug-Route für Registrierung
// @route   POST /api/auth/debug-register
// @access  Public
const debugRegister = async (req, res) => {
  try {
    console.log('🔍 DEBUG Registrierung-Versuch für:', req.body.email);
    console.log('📋 Vollständige Request-Body:', JSON.stringify(req.body, null, 2));
    
    const { email, firstName, lastName, password } = req.body;
    
    // Alle Validierungen durchlaufen
    const checks = {
      hasEmail: !!email,
      hasPassword: !!password,
      hasFirstName: !!firstName,
      hasLastName: !!lastName,
      emailFormat: email ? /^\S+@\S+\.\S+$/.test(email) : false
    };
    
    console.log('✅ Basis-Validierung:', checks);
    
    // Check User Collection
    const User = require('../models/User');
    const existingUser = await User.findOne({ email: email?.toLowerCase() });
    console.log('👤 User in User-Collection:', existingUser ? 'GEFUNDEN' : 'NICHT GEFUNDEN');
    
    // Check Kunde Collection
    const Kunde = require('../models/Kunde');
    const existingKunde = await Kunde.findOne({ email: email?.toLowerCase() });
    console.log('🛒 Kunde in Kunde-Collection:', existingKunde ? 'GEFUNDEN' : 'NICHT GEFUNDEN');
    
    // Password Validation Test
    let passwordValidation = null;
    if (password && firstName && lastName) {
      try {
        passwordValidation = PasswordValidator.validatePassword(password, {
          firstName,
          lastName,
          email
        });
        console.log('🔐 Passwort-Validierung:', passwordValidation.isValid ? 'OK' : 'FEHLER');
        if (!passwordValidation.isValid) {
          console.log('📝 Passwort-Feedback:', passwordValidation.feedback);
        }
      } catch (pwErr) {
        console.log('❌ Passwort-Validierung-Fehler:', pwErr.message);
      }
    }
    
    res.status(200).json({
      success: true,
      debug: {
        receivedData: req.body,
        validationChecks: checks,
        existingUser: !!existingUser,
        existingKunde: !!existingKunde,
        passwordValidation: passwordValidation ? {
          isValid: passwordValidation.isValid,
          score: passwordValidation.score,
          feedback: passwordValidation.feedback
        } : 'NICHT GETESTET'
      }
    });
    
  } catch (error) {
    console.error('❌ DEBUG Registrierung-Fehler:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      stack: error.stack
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
    console.log('🔍 Empfangene Daten:', {
      email,
      firstName,
      lastName,
      hasPassword: !!password,
      hasPhone: !!phone,
      hasAddress: !!address,
      addressFields: address ? Object.keys(address) : 'keine'
    });

    // Admin-Einstellungen abrufen
    const AdminSettings = require('../models/AdminSettings');
    const adminSettings = await AdminSettings.getInstance();
    const requireEmailVerification = adminSettings.userManagement?.requireEmailVerification ?? true;

    // Validierung der Pflichtfelder
    if (!email || !password || !firstName || !lastName) {
      console.log('❌ Fehlende Pflichtfelder:', {
        email: !!email,
        password: !!password,
        firstName: !!firstName,
        lastName: !!lastName
      });
      return res.status(400).json({
        success: false,
        message: 'E-Mail, Passwort, Vor- und Nachname sind erforderlich',
        missingFields: {
          email: !email,
          password: !password,
          firstName: !firstName,
          lastName: !lastName
        }
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
    console.log('🔐 Starte Passwort-Validierung...');
    let passwordValidation;
    try {
      passwordValidation = PasswordValidator.validatePassword(password, {
        firstName,
        lastName,
        username: providedUsername,
        email
      });
      console.log('✅ Passwort-Validierung erfolgreich:', {
        isValid: passwordValidation.isValid,
        score: passwordValidation.score
      });
    } catch (passwordError) {
      console.error('❌ Passwort-Validierung Fehler:', passwordError);
      return res.status(400).json({
        success: false,
        message: 'Fehler bei der Passwort-Validierung',
        error: 'PASSWORD_VALIDATION_ERROR',
        details: passwordError.message
      });
    }

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
    console.log('🔄 Starte Benutzername-Generierung...');
    let username;
    try {
      username = await UsernameGenerator.createUsernameForRegistration(firstName, lastName);
      
      // Zusätzliche Eindeutigkeit durch Zeitstempel
      const timestamp = Date.now().toString().slice(-4);
      const uniqueUsername = `${username}${timestamp}`;
      
      console.log(`✅ Automatisch generierter Benutzername: ${username} → ${uniqueUsername}`);
      username = uniqueUsername;
      
    } catch (usernameError) {
      console.error('❌ Benutzername-Generierung Fehler:', usernameError);
      return res.status(400).json({
        success: false,
        message: 'Fehler bei der Benutzername-Generierung',
        error: 'USERNAME_GENERATION_ERROR',
        details: usernameError.message
      });
    }

    // Prüfen ob Benutzer bereits existiert (in User-Collection)
    console.log('🔍 Prüfe User-Collection...');
    let existingUser;
    try {
      existingUser = await User.findOne({
        $or: [
          { email: email.toLowerCase() },
          { username: username.toLowerCase() }
        ]
      });
      console.log('✅ User-Collection geprüft:', existingUser ? 'BENUTZER GEFUNDEN' : 'KEIN BENUTZER');
    } catch (userCheckError) {
      console.error('❌ User-Collection Fehler:', userCheckError);
      return res.status(500).json({
        success: false,
        message: 'Fehler bei der Benutzerprüfung',
        error: 'USER_CHECK_ERROR'
      });
    }

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: existingUser.email === email.toLowerCase() 
          ? 'Ein Benutzer mit dieser E-Mail-Adresse existiert bereits'
          : 'Dieser Benutzername ist bereits vergeben'
      });
    }

    // Zusätzlich prüfen ob E-Mail bereits in Kunden-Collection existiert
    console.log('🔍 Prüfe Kunde-Collection...');
    let existingKunde;
    try {
      const Kunde = require('../models/Kunde');
      existingKunde = await Kunde.findOne({ email: email.toLowerCase() });
      console.log('✅ Kunde-Collection geprüft:', existingKunde ? 'KUNDE GEFUNDEN' : 'KEIN KUNDE');
    } catch (kundeCheckError) {
      console.error('❌ Kunde-Collection Fehler:', kundeCheckError);
      return res.status(500).json({
        success: false,
        message: 'Fehler bei der Kundenprüfung',
        error: 'KUNDE_CHECK_ERROR'
      });
    }
    
    if (existingKunde) {
      console.log('❌ E-Mail bereits in Kunde-Collection:', email);
      return res.status(400).json({
        success: false,
        message: 'Ein Kunde mit dieser E-Mail-Adresse ist bereits registriert. Bitte verwenden Sie die Anmeldefunktion.',
        error: 'EMAIL_EXISTS_KUNDE'
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
      geschlecht: req.body.geschlecht || 'keine Angabe',
      adresse: address ? {
        strasse: address.street || '',
        hausnummer: address.houseNumber || '',
        zusatz: address.zusatz || '',
        plz: address.zipCode || '',
        stadt: address.city || '',
        land: address.country || 'Deutschland'
      } : {
        strasse: '',
        hausnummer: '',
        zusatz: '',
        plz: '',
        stadt: '',
        land: 'Deutschland'
      },
      // Standard-Lieferadresse = Rechnungsadresse bei Registrierung
      lieferadresse: address ? {
        verwendet: true,
        firmenname: '',
        vorname: firstName,
        nachname: lastName,
        strasse: address.street || '',
        hausnummer: address.houseNumber || '',
        zusatz: address.zusatz || '',
        plz: address.zipCode || '',
        stadt: address.city || '',
        land: address.country || 'Deutschland'
      } : {
        verwendet: false,
        firmenname: '',
        vorname: '',
        nachname: '',
        strasse: '',
        hausnummer: '',
        zusatz: '',
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
    
    try {
      await newKunde.save();
      console.log('✅ Kunde erfolgreich erstellt mit Kundennummer:', newKunde.kundennummer);
    } catch (kundeValidationError) {
      console.error('❌ Kunde Validierungsfehler:', kundeValidationError);
      
      // Detaillierte Fehlermeldung für fehlende Felder
      if (kundeValidationError.name === 'ValidationError') {
        const missingFields = Object.keys(kundeValidationError.errors).map(field => {
          return `${field}: ${kundeValidationError.errors[field].message}`;
        });
        
        return res.status(400).json({
          success: false,
          message: 'Validierungsfehler bei der Kundenerstellung',
          details: missingFields,
          error: 'KUNDE_VALIDATION_FAILED'
        });
      }
      
      throw kundeValidationError; // Anderen Fehler weiterwerfen
    }

    // Neuen Benutzer erstellen (für erweiterte Funktionen)
    console.log('🐛 DEBUG - Empfangene Daten:', {
      username: username.toLowerCase(),
      email: email.toLowerCase(),
      firstName,
      lastName,
      phone,
      dateOfBirth,
      address
    });

    const newUser = new User({
      username: username.toLowerCase(),
      email: email.toLowerCase(),
      password,
      firstName,
      lastName,
      phone,
      address,
      dateOfBirth: dateOfBirth || undefined, // Explizit undefined wenn null
      emailVerificationToken: verificationToken,
      emailVerificationExpires: verificationExpires,
      status: requireEmailVerification ? 'unverified' : 'active',
      emailVerified: !requireEmailVerification, // Sofort verifiziert wenn nicht erforderlich
      kundeId: newKunde._id // Referenz zum Kunden-Datensatz
    });

    console.log('💾 Speichere neuen User...');
    
    try {
      await newUser.save();
      console.log('✅ User erfolgreich erstellt:', newUser.email);
    } catch (userSaveError) {
      console.error('❌ User Speicherfehler:', userSaveError);
      
      // Falls User-Speicherung fehlschlägt, müssen wir den bereits erstellten Kunde löschen
      try {
        await Kunde.findByIdAndDelete(newKunde._id);
        console.log('🗑️ Kunde aufgrund User-Fehler wieder gelöscht');
      } catch (cleanupError) {
        console.error('❌ Cleanup-Fehler:', cleanupError);
      }
      
      // Spezifische Fehlerbehandlung für Duplicate Key
      if (userSaveError.code === 11000) {
        return res.status(400).json({
          success: false,
          message: 'Ein Benutzer mit dieser E-Mail-Adresse existiert bereits',
          error: 'DUPLICATE_KEY',
          field: 'email'
        });
      }
      
      return res.status(500).json({
        success: false,
        message: 'Fehler beim Erstellen des Benutzerkontos',
        error: 'USER_SAVE_FAILED'
      });
    }

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
    console.error('📋 Fehler-Details:', {
      name: error.name,
      message: error.message,
      code: error.code,
      keyPattern: error.keyPattern
    });
    
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern)[0];
      const message = field === 'email' 
        ? 'Ein Benutzer mit dieser E-Mail-Adresse existiert bereits'
        : 'Dieser Benutzername ist bereits vergeben';
      
      return res.status(400).json({
        success: false,
        message,
        error: 'DUPLICATE_KEY',
        field
      });
    }

    if (error.name === 'ValidationError') {
      const validationErrors = Object.keys(error.errors).map(field => ({
        field,
        message: error.errors[field].message
      }));
      
      return res.status(400).json({
        success: false,
        message: 'Validierungsfehler bei der Registrierung',
        error: 'VALIDATION_FAILED',
        validationErrors
      });
    }

    res.status(500).json({
      success: false,
      message: 'Fehler bei der Registrierung. Bitte versuchen Sie es erneut.',
      error: 'INTERNAL_SERVER_ERROR'
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
    console.log('🔍 Profile-Request für User ID:', req.user.id);
    let user;
    
    // Zuerst versuchen in Kunde Collection zu finden (primäre Collection)
    if (req.user.id && req.user.id.match(/^[0-9a-fA-F]{24}$/)) {
      const Kunde = require('../models/Kunde');
      user = await Kunde.findById(req.user.id).select('-passwort -__v');
      console.log('🔍 Kunde gefunden:', !!user);
      
      if (user) {
        // Kunde-Daten in User-Format umwandeln für Frontend-Kompatibilität
        const profileData = {
          _id: user._id,
          username: user.username || `${user.vorname?.toLowerCase()}.${user.nachname?.toLowerCase()}`,
          email: user.email,
          firstName: user.vorname,
          lastName: user.nachname,
          phone: user.telefon,
          dateOfBirth: user.geburtsdatum,
          geschlecht: user.geschlecht,
          addressDetails: {
            street: user.adresse?.strasse || '',
            houseNumber: user.adresse?.hausnummer || '',
            zusatz: user.adresse?.zusatz || '',
            zipCode: user.adresse?.plz || '',
            city: user.adresse?.stadt || '',
            country: user.adresse?.land || 'Deutschland'
          },
          lieferadresseDetails: {
            verwendet: user.lieferadresse?.verwendet || false,
            firmenname: user.lieferadresse?.firmenname || '',
            vorname: user.lieferadresse?.vorname || '',
            nachname: user.lieferadresse?.nachname || '',
            street: user.lieferadresse?.strasse || '',
            houseNumber: user.lieferadresse?.hausnummer || '',
            zusatz: user.lieferadresse?.zusatz || '',
            zipCode: user.lieferadresse?.plz || '',
            city: user.lieferadresse?.stadt || '',
            country: user.lieferadresse?.land || 'Deutschland'
          },
          communicationPreferences: {
            newsletter: user.kommunikation?.newsletter || user.praeferenzen?.newsletter || false,
            sms: user.kommunikation?.sms || user.praeferenzen?.sms || false,
            werbung: user.praeferenzen?.werbung || false
          },
          status: user.status,
          kundennummer: user.kundennummer,
          rolle: user.rolle,
          emailVerified: user.status?.emailVerifiziert,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt
        };
        
        console.log('✅ Profile Daten gesendet:', {
          hasAddress: !!profileData.addressDetails,
          addressDetails: profileData.addressDetails,
          hasLieferadresse: !!profileData.lieferadresseDetails,
          lieferadresseDetails: profileData.lieferadresseDetails
        });
        
        return res.status(200).json({
          success: true,
          data: profileData
        });
      }
    }
    
    // Fallback: Versuche in User Collection (für Admin-Accounts)
    if (req.user.id && req.user.id.match(/^[0-9a-fA-F]{24}$/)) {
      user = await User.findById(req.user.id).select('-password -passwordResetToken -passwordResetExpires -emailVerificationToken');
      console.log('🔍 User gefunden:', !!user);
    }
    
    // Falls nicht gefunden, versuche mit username (Legacy-User wie admin-ralf)
    if (!user && req.user.id) {
      user = await User.findOne({ username: req.user.id }).select('-password -passwordResetToken -passwordResetExpires -emailVerificationToken');
      console.log('🔍 Legacy User gefunden:', !!user);
    }
    
    if (!user) {
      console.log('❌ Kein Benutzer gefunden für ID:', req.user.id);
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
      geschlecht,
      address,
      lieferadresse,
      dateOfBirth,
      communicationPreferences
    } = req.body;

    console.log('🔄 Profil-Update für User:', userId);
    console.log('🔄 Update-Daten:', JSON.stringify(req.body, null, 2));

    // Prüfe zuerst Kunde Collection (für registrierte Kunden)
    let user = await Kunde.findById(userId);
    let isKunde = true;

    // Falls nicht in Kunde Collection, versuche User Collection
    if (!user) {
      user = await User.findById(userId);
      isKunde = false;
    }

    // Legacy support für admin-ralf etc.
    if (!user && userId && !userId.match(/^[0-9a-fA-F]{24}$/)) {
      user = await User.findOne({ username: userId });
      isKunde = false;
    }

    if (!user) {
      console.log('❌ User nicht gefunden:', userId);
      return res.status(404).json({
        success: false,
        message: 'Benutzer nicht gefunden'
      });
    }

    console.log('✅ User gefunden:', isKunde ? 'Kunde' : 'User', user.email);

    // Änderungen verfolgen für Email-Benachrichtigung
    const changes = [];
    
    // Daten aktualisieren basierend auf Collection-Typ
    const updateData = {};
    
    if (firstName !== undefined) {
      if (isKunde) {
        updateData.vorname = firstName.trim();
        if (user.vorname !== firstName.trim()) {
          changes.push(`Vorname: "${user.vorname || ''}" → "${firstName.trim()}"`);
        }
      } else {
        updateData.firstName = firstName.trim();
        if (user.firstName !== firstName.trim()) {
          changes.push(`Vorname: "${user.firstName || ''}" → "${firstName.trim()}"`);
        }
      }
    }
    
    if (lastName !== undefined) {
      if (isKunde) {
        updateData.nachname = lastName.trim();
        if (user.nachname !== lastName.trim()) {
          changes.push(`Nachname: "${user.nachname || ''}" → "${lastName.trim()}"`);
        }
      } else {
        updateData.lastName = lastName.trim();
        if (user.lastName !== lastName.trim()) {
          changes.push(`Nachname: "${user.lastName || ''}" → "${lastName.trim()}"`);
        }
      }
    }
    
    if (phone !== undefined) {
      if (isKunde) {
        updateData.telefon = phone.trim();
        if (user.telefon !== phone.trim()) {
          changes.push(`Telefon: "${user.telefon || 'nicht angegeben'}" → "${phone.trim() || 'nicht angegeben'}"`);
        }
      } else {
        updateData.phone = phone.trim();
        if (user.phone !== phone.trim()) {
          changes.push(`Telefon: "${user.phone || 'nicht angegeben'}" → "${phone.trim() || 'nicht angegeben'}"`);
        }
      }
    }
    
    if (geschlecht !== undefined && isKunde) {
      updateData.geschlecht = geschlecht;
      if (user.geschlecht !== geschlecht) {
        changes.push(`Geschlecht: "${user.geschlecht || ''}" → "${geschlecht}"`);
      }
    }
    
    if (address !== undefined) {
      if (isKunde) {
        // Für Kunde Collection - verwende deutsche Feldnamen
        updateData.adresse = { 
          ...user.adresse, 
          strasse: address.street || '',
          hausnummer: address.houseNumber || '',
          zusatz: address.zusatz || '',
          plz: address.zipCode || '',
          stadt: address.city || '',
          land: address.country || 'Deutschland'
        };
        
        // Adressänderungen verfolgen
        const oldAddr = user.adresse || {};
        if (address.street && oldAddr.strasse !== address.street) {
          changes.push(`Straße: "${oldAddr.strasse || ''}" → "${address.street}"`);
        }
        if (address.houseNumber && oldAddr.hausnummer !== address.houseNumber) {
          changes.push(`Hausnummer: "${oldAddr.hausnummer || ''}" → "${address.houseNumber}"`);
        }
        if (address.zipCode && oldAddr.plz !== address.zipCode) {
          changes.push(`PLZ: "${oldAddr.plz || ''}" → "${address.zipCode}"`);
        }
        if (address.city && oldAddr.stadt !== address.city) {
          changes.push(`Stadt: "${oldAddr.stadt || ''}" → "${address.city}"`);
        }
      } else {
        // Für User Collection - verwende englische Feldnamen
        updateData.address = { ...user.address, ...address };
        const oldAddr = user.address || {};
        if (address.street && oldAddr.street !== address.street) {
          changes.push(`Straße: "${oldAddr.street || ''}" → "${address.street}"`);
        }
      }
    }
    
    if (lieferadresse !== undefined && isKunde) {
      updateData.lieferadresse = { 
        ...user.lieferadresse, 
        verwendet: lieferadresse.verwendet || false,
        firmenname: lieferadresse.firmenname || '',
        vorname: lieferadresse.vorname || '',
        nachname: lieferadresse.nachname || '',
        strasse: lieferadresse.street || '',
        hausnummer: lieferadresse.houseNumber || '',
        zusatz: lieferadresse.zusatz || '',
        plz: lieferadresse.zipCode || '',
        stadt: lieferadresse.city || '',
        land: lieferadresse.country || 'Deutschland'
      };
      
      if (lieferadresse.verwendet !== user.lieferadresse?.verwendet) {
        changes.push(`Lieferadresse ${lieferadresse.verwendet ? 'aktiviert' : 'deaktiviert'}`);
      }
    }
    
    if (dateOfBirth !== undefined) {
      updateData.dateOfBirth = dateOfBirth ? new Date(dateOfBirth) : null;
      const oldDate = user.dateOfBirth ? user.dateOfBirth.toISOString().split('T')[0] : '';
      const newDate = dateOfBirth || '';
      if (oldDate !== newDate) {
        changes.push(`Geburtsdatum: "${oldDate}" → "${newDate}"`);
      }
    }
    
    if (communicationPreferences !== undefined) {
      if (isKunde) {
        // Für Kunde - deutsche Feldnamen in praeferenzen
        updateData.praeferenzen = { 
          ...user.praeferenzen, 
          newsletter: communicationPreferences.newsletter !== undefined ? communicationPreferences.newsletter : user.praeferenzen?.newsletter,
          sms: communicationPreferences.sms !== undefined ? communicationPreferences.sms : user.praeferenzen?.sms,
          werbung: communicationPreferences.werbung !== undefined ? communicationPreferences.werbung : user.praeferenzen?.werbung
        };
        
        if (communicationPreferences.newsletter !== undefined && user.praeferenzen?.newsletter !== communicationPreferences.newsletter) {
          changes.push(`Newsletter: ${user.praeferenzen?.newsletter ? 'ja' : 'nein'} → ${communicationPreferences.newsletter ? 'ja' : 'nein'}`);
        }
        if (communicationPreferences.sms !== undefined && user.praeferenzen?.sms !== communicationPreferences.sms) {
          changes.push(`SMS: ${user.praeferenzen?.sms ? 'ja' : 'nein'} → ${communicationPreferences.sms ? 'ja' : 'nein'}`);
        }
        if (communicationPreferences.werbung !== undefined && user.praeferenzen?.werbung !== communicationPreferences.werbung) {
          changes.push(`Werbung: ${user.praeferenzen?.werbung ? 'ja' : 'nein'} → ${communicationPreferences.werbung ? 'ja' : 'nein'}`);
        }
      } else {
        // Für User Collection
        updateData.communicationPreferences = { 
          ...user.communicationPreferences, 
          ...communicationPreferences 
        };
      }
    }

    console.log('🔄 Änderungen:', changes);
    console.log('🔄 Update-Data:', JSON.stringify(updateData, null, 2));

    // Update in der entsprechenden Collection durchführen
    let updatedUser;
    if (isKunde) {
      updatedUser = await Kunde.findByIdAndUpdate(
        userId,
        { $set: updateData },
        { new: true, runValidators: true }
      );
      console.log('✅ Kunde aktualisiert');
    } else {
      updatedUser = await User.findByIdAndUpdate(
        userId,
        { $set: updateData },
        { new: true, runValidators: true }
      );
      console.log('✅ User aktualisiert');
    }

    if (!updatedUser) {
      console.log('❌ Update fehlgeschlagen');
      return res.status(500).json({
        success: false,
        message: 'Fehler beim Aktualisieren der Profil-Daten'
      });
    }

    console.log('✅ Profil erfolgreich aktualisiert');

    // Erfolgreiche Antwort
    res.json({
      success: true,
      message: 'Profil erfolgreich aktualisiert',
      changes: changes.length > 0 ? changes : ['Keine Änderungen']
    });

  } catch (error) {
    console.error('❌ Fehler beim Profil-Update:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Aktualisieren der Profil-Daten',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// @desc    Benutzer-Account löschen
// @route   DELETE /api/auth/account
// @access  Private
const deleteAccount = async (req, res) => {
  try {
    const userId = req.user.id;
    const { password, confirmEmail, reason } = req.body;

    console.log('🗑️ Account-Löschung angefordert für User:', userId);

    // Versuche zuerst Kunde zu finden
    const Kunde = require('../models/Kunde');
    let user = await Kunde.findById(userId);
    let isKunde = true;
    
    // Falls nicht in Kunde Collection, versuche User Collection
    if (!user) {
      user = await User.findById(userId);
      isKunde = false;
    }
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Benutzer nicht gefunden'
      });
    }

    console.log(`🔍 User gefunden in ${isKunde ? 'Kunde' : 'User'} Collection`);

    // Email-Bestätigung prüfen
    if (confirmEmail !== user.email) {
      return res.status(400).json({
        success: false,
        message: 'Zur Bestätigung muss die E-Mail-Adresse korrekt eingegeben werden'
      });
    }

    // Passwort prüfen
    const hashedPasswordFromDB = isKunde ? user.passwort : user.password;
    const isPasswordValid = await bcrypt.compare(password, hashedPasswordFromDB);
    if (!isPasswordValid) {
      return res.status(400).json({
        success: false,
        message: 'Passwort ist nicht korrekt'
      });
    }

    // Prüfung auf unzugestellte Bestellungen (nur für Kunden)
    if (isKunde && user.kundennummer) {
      const Order = require('../models/Order');
      const undeliveredOrders = await Order.find({
        $or: [
          { 'besteller.kundennummer': user.kundennummer },
          { 'besteller.kundeId': user._id },
          { kundeId: user._id }
        ],
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

    // Benutzer-Daten für Logging sichern
    const userData = {
      email: user.email,
      firstName: isKunde ? user.vorname : user.firstName,
      lastName: isKunde ? user.nachname : user.lastName,
      username: isKunde ? `${user.vorname}.${user.nachname}` : user.username,
      kundennummer: isKunde ? user.kundennummer : null,
      registrationDate: user.createdAt
    };

    // Account aus beiden Collections löschen
    if (isKunde) {
      await Kunde.findByIdAndDelete(userId);
      console.log('🗑️ Kunde aus Kunde-Collection gelöscht');
      
      // Auch aus User Collection löschen falls vorhanden
      const userInUserCollection = await User.findOne({ email: user.email });
      if (userInUserCollection) {
        await User.findByIdAndDelete(userInUserCollection._id);
        console.log('🗑️ User aus User-Collection gelöscht');
      }
    } else {
      await User.findByIdAndDelete(userId);
      console.log('🗑️ User aus User-Collection gelöscht');
    }

    console.log('✅ Account erfolgreich gelöscht:', user.email);

    res.status(200).json({
      success: true,
      message: 'Ihr Account wurde erfolgreich gelöscht. Vielen Dank für Ihr Vertrauen.',
      deletedUser: {
        email: userData.email,
        deletedAt: new Date(),
        reason: reason || 'Kunde-initiierte Löschung'
      }
    });

  } catch (error) {
    console.error('❌ Account-Löschung-Fehler:', error);
    res.status(500).json({
      success: false,
      message: 'Interner Serverfehler beim Löschen des Accounts'
    });
  }
};

module.exports = {
  loginAdmin,
  validateToken,
  logout,
  debugRegister,
  registerUser,
  verifyEmail,
  resendVerification,
  forgotPassword,
  resetPassword,
  getProfile,
  updateProfile,
  deleteAccount
};