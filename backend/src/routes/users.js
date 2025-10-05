const express = require('express');
const router = express.Router();
const Kunde = require('../models/Kunde');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

// Alle Routen erfordern Authentifizierung und Admin-Rechte
// Middleware wird für alle Routen in dieser Datei angewendet
const adminAuthMiddleware = [authenticateToken, requireAdmin];

// GET /api/users - Alle Benutzer abrufen
router.get('/', adminAuthMiddleware, async (req, res) => {
  try {
    const { status, role, search, page = 1, limit = 10 } = req.query;
    
    const query = {};
    
    // Filter nach Status - Status im Kunde-Modell ist ein Objekt
    if (status === 'blocked') {
      query['status.gesperrt'] = true;
    } else if (status === 'active') {
      query['status.aktiv'] = true;
      query['status.gesperrt'] = false;
    } else if (status === 'pending') {
      query['status.aktiv'] = false;
      query['status.gesperrt'] = false;
    }
    
    // Filter nach Rolle - das Kunde-Modell hat kein role-Feld standardmäßig
    // Wir filtern nur wenn die Rolle NICHT customer ist, da alle Kunden customer sind
    if (role && role !== 'customer') {
      query.role = role; // Nur wenn explizit admin/user gesetzt ist
    }
    // Wenn nach 'customer' gefiltert wird, keine role-Bedingung setzen
    // oder explizit nach Dokumenten ohne role suchen
    if (role === 'customer') {
      query.$or = [
        { role: { $exists: false } },
        { role: 'customer' }
      ];
    }
    
    // Suchfunktion - verwende deutsche Feldnamen
    if (search) {
      query.$or = [
        { vorname: { $regex: search, $options: 'i' } },
        { nachname: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }
    
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const kunden = await Kunde.find(query)
      .select('-passwort')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));
    
    const total = await Kunde.countDocuments(query);
    
    // Mappe die Felder für Frontend-Kompatibilität
    const users = kunden.map(kunde => ({
      _id: kunde._id,
      username: kunde.email, // Email als Username verwenden
      email: kunde.email,
      firstName: kunde.vorname,
      lastName: kunde.nachname,
      phone: kunde.telefon,
      role: kunde.role || 'customer',
      status: kunde.status?.gesperrt ? 'blocked' : (kunde.status?.aktiv ? 'active' : 'pending'),
      lastLogin: kunde.lastLogin,
      createdAt: kunde.createdAt,
      updatedAt: kunde.updatedAt,
      // Zusätzliche Kundeninformationen
      kundennummer: kunde.kundennummer,
      geburtsdatum: kunde.geburtsdatum,
      geschlecht: kunde.geschlecht,
      adresse: kunde.adresse,
      lieferadresse: kunde.lieferadresse,
      notizen: kunde.notizen,
      kommunikation: kunde.kommunikation,
      anmeldeversuche: kunde.anmeldeversuche
    }));
    
    res.json({
      success: true,
      data: users,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Fehler beim Abrufen der Benutzer:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Abrufen der Benutzer',
      error: error.message
    });
  }
});

// GET /api/users/:id - Einzelnen Benutzer abrufen
router.get('/:id', adminAuthMiddleware, async (req, res) => {
  try {
    const kunde = await Kunde.findById(req.params.id)
      .select('-password');
    
    if (!kunde) {
      return res.status(404).json({
        success: false,
        message: 'Benutzer nicht gefunden'
      });
    }
    
    res.json({
      success: true,
      data: user
    });
  } catch (error) {
    console.error('Fehler beim Abrufen des Benutzers:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Abrufen des Benutzers',
      error: error.message
    });
  }
});

// POST /api/users - Neuen Benutzer erstellen
router.post('/', adminAuthMiddleware, async (req, res) => {
  try {
    const { username, email, password, role, firstName, lastName, phone } = req.body;
    
    // Validierung
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'E-Mail und Passwort sind erforderlich'
      });
    }
    
    if (!firstName || !lastName) {
      return res.status(400).json({
        success: false,
        message: 'Vor- und Nachname sind erforderlich'
      });
    }
    
    // Prüfen ob Email bereits existiert
    const existingKunde = await Kunde.findOne({ email });
    
    if (existingKunde) {
      return res.status(400).json({
        success: false,
        message: 'E-Mail-Adresse wird bereits verwendet'
      });
    }
    
    // Neuen Kunden erstellen mit Mindestadresse
    const kunde = new Kunde({
      vorname: firstName,
      nachname: lastName,
      email,
      passwort: password,
      telefon: phone || '',
      role: role || 'customer',
      adresse: {
        strasse: 'Nicht angegeben',
        hausnummer: '0',
        plz: '00000',
        stadt: 'Nicht angegeben',
        land: 'Deutschland'
      },
      status: {
        aktiv: true,
        emailVerifiziert: false,
        telefonVerifiziert: false,
        gesperrt: false
      }
    });
    
    await kunde.save();
    
    // Antwort mit gemappten Feldern
    res.status(201).json({
      success: true,
      message: 'Benutzer erfolgreich erstellt',
      data: {
        _id: kunde._id,
        username: kunde.email,
        email: kunde.email,
        firstName: kunde.vorname,
        lastName: kunde.nachname,
        phone: kunde.telefon,
        role: kunde.role,
        status: kunde.status.gesperrt ? 'blocked' : 'active'
      }
    });
  } catch (error) {
    console.error('Fehler beim Erstellen des Benutzers:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Erstellen des Benutzers',
      error: error.message
    });
  }
});

// PUT /api/users/:id - Benutzer aktualisieren
router.put('/:id', adminAuthMiddleware, async (req, res) => {
  try {
    const { 
      email, role, firstName, lastName, phone, 
      geschlecht, geburtsdatum, notizen,
      strasse, hausnummer, zusatz, plz, stadt, land,
      newsletter, sms
    } = req.body;
    
    const kunde = await Kunde.findById(req.params.id);
    
    if (!kunde) {
      return res.status(404).json({
        success: false,
        message: 'Benutzer nicht gefunden'
      });
    }
    
    // Admin darf sich selbst nicht degradieren oder sperren
    if (kunde._id.toString() === req.user.userId) {
      if (role && role !== 'admin') {
        return res.status(400).json({
          success: false,
          message: 'Sie können Ihre eigene Admin-Rolle nicht ändern'
        });
      }
    }
    
    // Prüfen ob neue E-Mail bereits existiert
    if (email && email !== kunde.email) {
      const existingEmail = await Kunde.findOne({ email });
      if (existingEmail) {
        return res.status(400).json({
          success: false,
          message: 'E-Mail-Adresse wird bereits verwendet'
        });
      }
      kunde.email = email;
    }
    
    // Persönliche Daten aktualisieren
    if (firstName !== undefined) kunde.vorname = firstName;
    if (lastName !== undefined) kunde.nachname = lastName;
    if (phone !== undefined) kunde.telefon = phone;
    if (geschlecht !== undefined) kunde.geschlecht = geschlecht;
    if (geburtsdatum !== undefined) kunde.geburtsdatum = geburtsdatum;
    if (notizen !== undefined) kunde.notizen = notizen;
    if (role !== undefined) kunde.role = role;
    
    // Adresse aktualisieren
    if (!kunde.adresse) kunde.adresse = {};
    if (strasse !== undefined) kunde.adresse.strasse = strasse;
    if (hausnummer !== undefined) kunde.adresse.hausnummer = hausnummer;
    if (zusatz !== undefined) kunde.adresse.zusatz = zusatz;
    if (plz !== undefined) kunde.adresse.plz = plz;
    if (stadt !== undefined) kunde.adresse.stadt = stadt;
    if (land !== undefined) kunde.adresse.land = land;
    
    // Kommunikationspräferenzen aktualisieren
    if (!kunde.kommunikation) kunde.kommunikation = {};
    if (newsletter !== undefined) kunde.kommunikation.newsletter = newsletter;
    if (sms !== undefined) kunde.kommunikation.sms = sms;
    
    await kunde.save();
    
    // Response im kompatiblen Format
    res.json({
      success: true,
      message: 'Benutzer erfolgreich aktualisiert',
      data: {
        _id: kunde._id,
        email: kunde.email,
        firstName: kunde.vorname,
        lastName: kunde.nachname,
        phone: kunde.telefon,
        role: kunde.role || 'customer',
        status: kunde.status?.gesperrt ? 'blocked' : 'active',
        geschlecht: kunde.geschlecht,
        geburtsdatum: kunde.geburtsdatum,
        kundennummer: kunde.kundennummer,
        notizen: kunde.notizen,
        adresse: kunde.adresse,
        kommunikation: kunde.kommunikation,
        createdAt: kunde.createdAt,
        updatedAt: kunde.updatedAt
      }
    });
  } catch (error) {
    console.error('Fehler beim Aktualisieren des Benutzers:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Aktualisieren des Benutzers',
      error: error.message
    });
  }
});

// PUT /api/users/:id/password - Passwort ändern
router.put('/:id/password', adminAuthMiddleware, async (req, res) => {
  try {
    const { password } = req.body;
    
    if (!password || password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Passwort muss mindestens 6 Zeichen lang sein'
      });
    }
    
    const user = await Kunde.findById(req.params.id);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Benutzer nicht gefunden'
      });
    }
    
    user.password = password;
    user.updatedBy = req.user.id || req.user.userId;
    
    await user.save();
    
    res.json({
      success: true,
      message: 'Passwort erfolgreich geändert'
    });
  } catch (error) {
    console.error('Fehler beim Ändern des Passworts:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Ändern des Passworts',
      error: error.message
    });
  }
});

// PUT /api/users/:id/block - Benutzer sperren
router.put('/:id/block', adminAuthMiddleware, async (req, res) => {
  try {
    const user = await Kunde.findById(req.params.id);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Benutzer nicht gefunden'
      });
    }
    
    // Admin darf sich selbst nicht sperren
    if (user._id.toString() === req.user.id || user._id.toString() === req.user.userId) {
      return res.status(400).json({
        success: false,
        message: 'Sie können sich nicht selbst sperren'
      });
    }
    
    user.status = 'blocked';
    user.updatedBy = req.user.id || req.user.userId;
    
    await user.save();
    
    res.json({
      success: true,
      message: 'Benutzer erfolgreich gesperrt',
      data: user.toJSON()
    });
  } catch (error) {
    console.error('Fehler beim Sperren des Benutzers:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Sperren des Benutzers',
      error: error.message
    });
  }
});

// PUT /api/users/:id/unblock - Benutzer entsperren
router.put('/:id/unblock', adminAuthMiddleware, async (req, res) => {
  try {
    const user = await Kunde.findById(req.params.id);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Benutzer nicht gefunden'
      });
    }
    
    user.status = 'active';
    user.loginAttempts = 0;
    user.lockUntil = undefined;
    user.updatedBy = req.user.id || req.user.userId;
    
    await user.save();
    
    res.json({
      success: true,
      message: 'Benutzer erfolgreich entsperrt',
      data: user.toJSON()
    });
  } catch (error) {
    console.error('Fehler beim Entsperren des Benutzers:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Entsperren des Benutzers',
      error: error.message
    });
  }
});

// DELETE /api/users/:id - Benutzer löschen
router.delete('/:id', adminAuthMiddleware, async (req, res) => {
  try {
    const kunde = await Kunde.findById(req.params.id);
    
    if (!kunde) {
      return res.status(404).json({
        success: false,
        message: 'Benutzer nicht gefunden'
      });
    }
    
    // Admin darf sich selbst nicht löschen
    if (kunde._id.toString() === req.user.id || kunde._id.toString() === req.user.userId) {
      return res.status(400).json({
        success: false,
        message: 'Sie können sich nicht selbst löschen'
      });
    }
    
    await kunde.deleteOne();
    
    res.json({
      success: true,
      message: 'Benutzer erfolgreich gelöscht'
    });
  } catch (error) {
    console.error('Fehler beim Löschen des Benutzers:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Löschen des Benutzers',
      error: error.message
    });
  }
});

// GET /api/users/stats/overview - Benutzerstatistiken
router.get('/stats/overview', adminAuthMiddleware, async (req, res) => {
  try {
    const totalUsers = await Kunde.countDocuments();
    const activeUsers = await Kunde.countDocuments({ 'status.aktiv': true, 'status.gesperrt': false });
    const blockedUsers = await Kunde.countDocuments({ 'status.gesperrt': true });
    const admins = await Kunde.countDocuments({ role: 'admin' });
    
    // Neue Benutzer letzte 30 Tage
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const newUsers = await Kunde.countDocuments({
      createdAt: { $gte: thirtyDaysAgo }
    });
    
    res.json({
      success: true,
      data: {
        total: totalUsers,
        active: activeUsers,
        blocked: blockedUsers,
        admins,
        newLastMonth: newUsers
      }
    });
  } catch (error) {
    console.error('Fehler beim Abrufen der Statistiken:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Abrufen der Statistiken',
      error: error.message
    });
  }
});

module.exports = router;
