const express = require('express');
const router = express.Router();
const Kunde = require('../models/Kunde');
const jwt = require('jsonwebtoken');
const { authenticateToken } = require('../middleware/auth');

// @route   POST /api/kunden/registrierung
// @desc    Neuen Kunden registrieren
// @access  Public
router.post('/registrierung', async (req, res) => {
  try {
    const {
      vorname,
      nachname,
      email,
      telefon,
      passwort,
      adresse,
      lieferadresse,
      geburtsdatum,
      geschlecht,
      praeferenzen,
      interessen,
      kommunikation
    } = req.body;

    // Prüfen ob E-Mail bereits existiert
    const existierenderKunde = await Kunde.findOne({ email: email.toLowerCase().trim() });
    if (existierenderKunde) {
      return res.status(400).json({
        success: false,
        message: 'Ein Kunde mit dieser E-Mail-Adresse existiert bereits'
      });
    }

    // Pflichtfelder prüfen
    if (!vorname || !nachname || !email || !passwort || !adresse) {
      return res.status(400).json({
        success: false,
        message: 'Vorname, Nachname, E-Mail, Passwort und Adresse sind erforderlich'
      });
    }

    // Datenschutz und AGB prüfen
    if (!praeferenzen?.datenschutz || !praeferenzen?.agb) {
      return res.status(400).json({
        success: false,
        message: 'Datenschutzerklärung und AGB müssen akzeptiert werden'
      });
    }

    // Neuen Kunden erstellen
    const neuerKunde = new Kunde({
      vorname: vorname.trim(),
      nachname: nachname.trim(),
      email: email.toLowerCase().trim(),
      telefon: telefon?.trim(),
      passwort,
      adresse: {
        strasse: adresse.strasse?.trim(),
        hausnummer: adresse.hausnummer?.trim(),
        zusatz: adresse.zusatz?.trim() || '',
        plz: adresse.plz?.trim(),
        stadt: adresse.stadt?.trim(),
        land: adresse.land?.trim() || 'Deutschland'
      },
      lieferadresse: lieferadresse || {},
      geburtsdatum: geburtsdatum ? new Date(geburtsdatum) : undefined,
      geschlecht: geschlecht || 'keine Angabe',
      praeferenzen: {
        newsletter: praeferenzen?.newsletter || false,
        werbung: praeferenzen?.werbung || false,
        sms: praeferenzen?.sms || false,
        datenschutz: praeferenzen?.datenschutz || false,
        agb: praeferenzen?.agb || false
      },
      interessen: interessen || {},
      kommunikation: kommunikation || {},
      erstelltVon: 'kunde'
    });

    const gespeicherterKunde = await neuerKunde.save();

    // JWT Token erstellen
    const token = jwt.sign(
      { 
        kundeId: gespeicherterKunde._id,
        email: gespeicherterKunde.email,
        kundennummer: gespeicherterKunde.kundennummer
      },
      process.env.JWT_SECRET || 'fallback_secret',
      { expiresIn: '24h' }
    );

    // Passwort aus Response entfernen
    const kundeOhnePasswort = gespeicherterKunde.toObject();
    delete kundeOhnePasswort.passwort;

    res.status(201).json({
      success: true,
      message: 'Kunde erfolgreich registriert',
      data: {
        kunde: kundeOhnePasswort,
        token,
        expiresIn: '24h'
      }
    });

  } catch (error) {
    console.error('Registrierung Error:', error);
    
    if (error.name === 'ValidationError') {
      const validationErrors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        message: 'Validierungsfehler',
        errors: validationErrors
      });
    }

    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'E-Mail-Adresse bereits vergeben'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Interner Serverfehler bei der Registrierung'
    });
  }
});

// @route   POST /api/kunden/login
// @desc    Kunde anmelden
// @access  Public
router.post('/login', async (req, res) => {
  try {
    const { email, passwort } = req.body;

    if (!email || !passwort) {
      return res.status(400).json({
        success: false,
        message: 'E-Mail und Passwort sind erforderlich'
      });
    }

    // Kunde suchen
    const kunde = await Kunde.findOne({ email: email.toLowerCase().trim() });
    if (!kunde) {
      return res.status(401).json({
        success: false,
        message: 'Ungültige Anmeldedaten'
      });
    }

    // Account-Status prüfen
    if (!kunde.status.aktiv || kunde.status.gesperrt) {
      return res.status(401).json({
        success: false,
        message: 'Account ist deaktiviert oder gesperrt'
      });
    }

    // Passwort vergleichen
    const istPasswortKorrekt = await kunde.vergleichePasswort(passwort);
    if (!istPasswortKorrekt) {
      kunde.anmeldeversuche += 1;
      await kunde.save();
      
      return res.status(401).json({
        success: false,
        message: 'Ungültige Anmeldedaten'
      });
    }

    // Erfolgreiche Anmeldung
    kunde.letzteAnmeldung = new Date();
    kunde.anmeldeversuche = 0;
    await kunde.save();

    // JWT Token erstellen
    const token = jwt.sign(
      { 
        kundeId: kunde._id,
        email: kunde.email,
        kundennummer: kunde.kundennummer,
        rolle: kunde.rolle || 'kunde'  // Rolle hinzufügen!
      },
      process.env.JWT_SECRET || 'fallback_secret',
      { expiresIn: '24h' }
    );

    // Passwort aus Response entfernen
    const kundeOhnePasswort = kunde.toObject();
    delete kundeOhnePasswort.passwort;

    res.status(200).json({
      success: true,
      message: 'Erfolgreich angemeldet',
      data: {
        kunde: kundeOhnePasswort,
        token,
        expiresIn: '24h'
      }
    });

  } catch (error) {
    console.error('Login Error:', error);
    res.status(500).json({
      success: false,
      message: 'Interner Serverfehler bei der Anmeldung'
    });
  }
});

// @route   GET /api/kunden/profil
// @desc    Eigenes Kundenprofil abrufen (für angemeldete Kunden)
// @access  Private (Customer only)
router.get('/profil', authenticateToken, async (req, res) => {
  try {
    console.log('🔍 Profil-Abruf für Kunde ID:', req.user?.kundeId);
    
    // Prüfen ob es ein angemeldeter Kunde ist
    if (!req.user || !req.user.kundeId) {
      return res.status(401).json({
        success: false,
        message: 'Nur für angemeldete Kunden zugänglich'
      });
    }

    const kunde = await Kunde.findById(req.user.kundeId).select('-passwort -passwordResetToken -passwordResetExpires');

    if (!kunde) {
      return res.status(404).json({
        success: false,
        message: 'Kundenprofil nicht gefunden'
      });
    }

    console.log('✅ Profil erfolgreich abgerufen für:', kunde.email);

    res.status(200).json({
      success: true,
      message: 'Profil erfolgreich abgerufen',
      data: kunde
    });

  } catch (error) {
    console.error('❌ Profil-Abruf-Fehler:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Abrufen des Profils'
    });
  }
});

// @route   PUT /api/kunden/profil
// @desc    Eigenes Kundenprofil aktualisieren (für angemeldete Kunden)
// @access  Private (Customer only)
router.put('/profil', authenticateToken, async (req, res) => {
  try {
    console.log('🔄 Profil-Update für Kunde ID:', req.user?.kundeId);
    console.log('📦 Empfangene Daten:', JSON.stringify(req.body, null, 2));
    
    // Prüfen ob es ein angemeldeter Kunde ist
    if (!req.user || !req.user.kundeId) {
      return res.status(401).json({
        success: false,
        message: 'Nur für angemeldete Kunden zugänglich'
      });
    }

    const {
      vorname,
      nachname,
      telefon,
      adresse,
      lieferadresse,
      geburtsdatum,
      geschlecht,
      praeferenzen,
      interessen,
      kommunikation
    } = req.body;

    const kunde = await Kunde.findById(req.user.kundeId);

    if (!kunde) {
      return res.status(404).json({
        success: false,
        message: 'Kundenprofil nicht gefunden'
      });
    }

    console.log('👤 Gefundener Kunde:', kunde.email);

    // Änderungen verfolgen für Logging
    const changes = [];

    // Persönliche Daten aktualisieren (nur wenn definiert und geändert)
    if (vorname !== undefined && vorname !== null && vorname.toString().trim() !== kunde.vorname) {
      changes.push(`Vorname: ${kunde.vorname} → ${vorname.toString().trim()}`);
      kunde.vorname = vorname.toString().trim();
    }
    
    if (nachname !== undefined && nachname !== null && nachname.toString().trim() !== kunde.nachname) {
      changes.push(`Nachname: ${kunde.nachname} → ${nachname.toString().trim()}`);
      kunde.nachname = nachname.toString().trim();
    }
    
    if (telefon !== undefined && telefon !== null && telefon.toString().trim() !== (kunde.telefon || '')) {
      changes.push(`Telefon: ${kunde.telefon || ''} → ${telefon.toString().trim()}`);
      kunde.telefon = telefon.toString().trim();
    }

    if (geburtsdatum !== undefined && geburtsdatum !== null && geburtsdatum !== '') {
      const neuesDatum = new Date(geburtsdatum);
      if (!isNaN(neuesDatum.getTime()) && JSON.stringify(neuesDatum) !== JSON.stringify(kunde.geburtsdatum)) {
        changes.push(`Geburtsdatum: ${kunde.geburtsdatum} → ${neuesDatum}`);
        kunde.geburtsdatum = neuesDatum;
      }
    }

    if (geschlecht !== undefined && geschlecht !== null && geschlecht !== kunde.geschlecht) {
      changes.push(`Geschlecht: ${kunde.geschlecht} → ${geschlecht}`);
      kunde.geschlecht = geschlecht;
    }

    // Adresse aktualisieren (nur wenn adresse-Objekt gesendet wird)
    if (adresse && typeof adresse === 'object') {
      const adresseAenderungen = [];
      
      // Stelle sicher, dass kunde.adresse existiert
      if (!kunde.adresse) {
        kunde.adresse = {};
      }
      
      if (adresse.strasse !== undefined && adresse.strasse !== null && adresse.strasse.toString().trim() !== (kunde.adresse.strasse || '')) {
        adresseAenderungen.push(`Straße: ${kunde.adresse.strasse || ''} → ${adresse.strasse.toString().trim()}`);
        kunde.adresse.strasse = adresse.strasse.toString().trim();
      }
      
      if (adresse.hausnummer !== undefined && adresse.hausnummer !== null && adresse.hausnummer.toString().trim() !== (kunde.adresse.hausnummer || '')) {
        adresseAenderungen.push(`Hausnummer: ${kunde.adresse.hausnummer || ''} → ${adresse.hausnummer.toString().trim()}`);
        kunde.adresse.hausnummer = adresse.hausnummer.toString().trim();
      }
      
      if (adresse.zusatz !== undefined && adresse.zusatz !== null && adresse.zusatz.toString().trim() !== (kunde.adresse.zusatz || '')) {
        adresseAenderungen.push(`Zusatz: ${kunde.adresse.zusatz || ''} → ${adresse.zusatz.toString().trim()}`);
        kunde.adresse.zusatz = adresse.zusatz.toString().trim();
      }
      
      if (adresse.plz !== undefined && adresse.plz !== null && adresse.plz.toString().trim() !== (kunde.adresse.plz || '')) {
        adresseAenderungen.push(`PLZ: ${kunde.adresse.plz || ''} → ${adresse.plz.toString().trim()}`);
        kunde.adresse.plz = adresse.plz.toString().trim();
      }
      
      if (adresse.stadt !== undefined && adresse.stadt !== null && adresse.stadt.toString().trim() !== (kunde.adresse.stadt || '')) {
        adresseAenderungen.push(`Stadt: ${kunde.adresse.stadt || ''} → ${adresse.stadt.toString().trim()}`);
        kunde.adresse.stadt = adresse.stadt.toString().trim();
      }
      
      if (adresse.land !== undefined && adresse.land !== null && adresse.land.toString().trim() !== (kunde.adresse.land || '')) {
        adresseAenderungen.push(`Land: ${kunde.adresse.land || ''} → ${adresse.land.toString().trim()}`);
        kunde.adresse.land = adresse.land.toString().trim();
      }

      if (adresseAenderungen.length > 0) {
        changes.push(`Adresse: ${adresseAenderungen.join(', ')}`);
      }
    }

    // Lieferadresse aktualisieren (nur wenn lieferadresse-Objekt gesendet wird)
    if (lieferadresse && typeof lieferadresse === 'object') {
      // Stelle sicher, dass kunde.lieferadresse existiert
      if (!kunde.lieferadresse) {
        kunde.lieferadresse = {};
      }
      
      const newLieferadresse = {
        verwendet: lieferadresse.verwendet === true,
        firmenname: (lieferadresse.firmenname || '').toString().trim(),
        vorname: (lieferadresse.vorname || '').toString().trim(),
        nachname: (lieferadresse.nachname || '').toString().trim(),
        strasse: (lieferadresse.strasse || '').toString().trim(),
        hausnummer: (lieferadresse.hausnummer || '').toString().trim(),
        zusatz: (lieferadresse.zusatz || '').toString().trim(),
        plz: (lieferadresse.plz || '').toString().trim(),
        stadt: (lieferadresse.stadt || '').toString().trim(),
        land: (lieferadresse.land || 'Deutschland').toString().trim()
      };
      
      if (JSON.stringify(newLieferadresse) !== JSON.stringify(kunde.lieferadresse)) {
        kunde.lieferadresse = newLieferadresse;
        changes.push('Lieferadresse aktualisiert');
      }
    }

    // Präferenzen aktualisieren (nur wenn praeferenzen-Objekt gesendet wird)
    if (praeferenzen && typeof praeferenzen === 'object') {
      const praeferenzenAenderungen = [];
      
      // Stelle sicher, dass kunde.praeferenzen existiert
      if (!kunde.praeferenzen) {
        kunde.praeferenzen = {};
      }
      
      Object.keys(praeferenzen).forEach(key => {
        if (praeferenzen[key] !== kunde.praeferenzen[key]) {
          praeferenzenAenderungen.push(`${key}: ${kunde.praeferenzen[key]} → ${praeferenzen[key]}`);
          kunde.praeferenzen[key] = praeferenzen[key];
        }
      });
      
      if (praeferenzenAenderungen.length > 0) {
        changes.push(`Präferenzen: ${praeferenzenAenderungen.join(', ')}`);
      }
    }

    // Interessen aktualisieren (nur wenn interessen-Objekt gesendet wird)
    if (interessen && typeof interessen === 'object') {
      const interessenAenderungen = [];
      
      // Stelle sicher, dass kunde.interessen existiert
      if (!kunde.interessen) {
        kunde.interessen = {};
      }
      
      Object.keys(interessen).forEach(key => {
        if (JSON.stringify(interessen[key]) !== JSON.stringify(kunde.interessen[key])) {
          interessenAenderungen.push(`${key} aktualisiert`);
          kunde.interessen[key] = interessen[key];
        }
      });
      
      if (interessenAenderungen.length > 0) {
        changes.push(`Interessen: ${interessenAenderungen.join(', ')}`);
      }
    }

    // Kommunikationseinstellungen aktualisieren (nur wenn kommunikation-Objekt gesendet wird)
    if (kommunikation && typeof kommunikation === 'object') {
      const kommunikationAenderungen = [];
      
      // Stelle sicher, dass kunde.kommunikation existiert
      if (!kunde.kommunikation) {
        kunde.kommunikation = {};
      }
      
      Object.keys(kommunikation).forEach(key => {
        if (kommunikation[key] !== kunde.kommunikation[key]) {
          kommunikationAenderungen.push(`${key}: ${kunde.kommunikation[key]} → ${kommunikation[key]}`);
          kunde.kommunikation[key] = kommunikation[key];
        }
      });
      
      if (kommunikationAenderungen.length > 0) {
        changes.push(`Kommunikation: ${kommunikationAenderungen.join(', ')}`);
      }
    }

    console.log('🔄 Vor Speicherung - Änderungen:', changes);

    // Speichern der Änderungen
    const aktualisiertKunde = await kunde.save();

    // Passwort aus Response entfernen
    const kundeOhnePasswort = aktualisiertKunde.toObject();
    delete kundeOhnePasswort.passwort;
    delete kundeOhnePasswort.passwordResetToken;
    delete kundeOhnePasswort.passwordResetExpires;

    console.log(`✅ Profil erfolgreich aktualisiert für ${kunde.email}. Änderungen: ${changes.length > 0 ? changes.join(' | ') : 'Keine'}`);

    res.status(200).json({
      success: true,
      message: 'Profil erfolgreich aktualisiert',
      data: kundeOhnePasswort,
      changes: changes
    });

  } catch (error) {
    console.error('❌ Profil-Update-Fehler:', error);
    console.error('❌ Stack Trace:', error.stack);
    
    if (error.name === 'ValidationError') {
      const validationErrors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        message: 'Validierungsfehler bei Profil-Update',
        errors: validationErrors
      });
    }

    res.status(500).json({
      success: false,
      message: 'Fehler beim Aktualisieren des Profils',
      error: error.message
    });
  }
});

// @route   GET /api/kunden
// @desc    Alle Kunden abrufen (Admin)
// @access  Private
router.get('/', async (req, res) => {
  try {
    const { 
      seite = 1, 
      limit = 20, 
      suche, 
      status, 
      stadt, 
      sortieren = '-createdAt' 
    } = req.query;

    const filter = {};
    
    // Filter anwenden
    if (suche) {
      filter.$or = [
        { vorname: { $regex: suche, $options: 'i' } },
        { nachname: { $regex: suche, $options: 'i' } },
        { email: { $regex: suche, $options: 'i' } },
        { kundennummer: { $regex: suche, $options: 'i' } }
      ];
    }
    
    if (status) {
      filter['status.aktiv'] = status === 'aktiv';
    }
    
    if (stadt) {
      filter['adresse.stadt'] = { $regex: stadt, $options: 'i' };
    }

    const skip = (parseInt(seite) - 1) * parseInt(limit);
    
    const kunden = await Kunde.find(filter)
      .select('-passwort') // Passwort ausschließen
      .sort(sortieren)
      .skip(skip)
      .limit(parseInt(limit));

    const gesamt = await Kunde.countDocuments(filter);

    res.status(200).json({
      success: true,
      count: kunden.length,
      gesamt,
      seite: parseInt(seite),
      seiten: Math.ceil(gesamt / parseInt(limit)),
      data: kunden
    });

  } catch (error) {
    console.error('Kunden Fetch Error:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Abrufen der Kundendaten'
    });
  }
});

// @route   GET /api/kunden/:id
// @desc    Einzelnen Kunden abrufen
// @access  Private
router.get('/:id', async (req, res) => {
  try {
    const kunde = await Kunde.findById(req.params.id).select('-passwort');

    if (!kunde) {
      return res.status(404).json({
        success: false,
        message: 'Kunde nicht gefunden'
      });
    }

    res.status(200).json({
      success: true,
      data: kunde
    });

  } catch (error) {
    console.error('Kunde Fetch Error:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Abrufen der Kundendaten'
    });
  }
});

// @route   PUT /api/kunden/:id
// @desc    Kundendaten aktualisieren
// @access  Private (Admin)
router.put('/:id', async (req, res) => {
  try {
    const {
      vorname,
      nachname,
      email,
      telefon,
      adresse,
      lieferadresse,
      geburtsdatum,
      geschlecht,
      praeferenzen,
      interessen,
      kommunikation,
      rolle,  // Neue Rolle (admin oder kunde)
      status
    } = req.body;

    const kunde = await Kunde.findById(req.params.id);

    if (!kunde) {
      return res.status(404).json({
        success: false,
        message: 'Kunde nicht gefunden'
      });
    }

    // Aktualisiere nur die übergebenen Felder
    if (vorname !== undefined) kunde.vorname = vorname.trim();
    if (nachname !== undefined) kunde.nachname = nachname.trim();
    if (email !== undefined) kunde.email = email.toLowerCase().trim();
    if (telefon !== undefined) kunde.telefon = telefon.trim();
    if (geburtsdatum !== undefined) kunde.geburtsdatum = geburtsdatum ? new Date(geburtsdatum) : undefined;
    if (geschlecht !== undefined) kunde.geschlecht = geschlecht;

    // Adresse aktualisieren
    if (adresse) {
      kunde.adresse = {
        strasse: adresse.strasse?.trim() || kunde.adresse.strasse,
        hausnummer: adresse.hausnummer?.trim() || kunde.adresse.hausnummer,
        zusatz: adresse.zusatz?.trim() || kunde.adresse.zusatz || '',
        plz: adresse.plz?.trim() || kunde.adresse.plz,
        stadt: adresse.stadt?.trim() || kunde.adresse.stadt,
        land: adresse.land?.trim() || kunde.adresse.land || 'Deutschland'
      };
    }

    // Lieferadresse aktualisieren
    if (lieferadresse) {
      kunde.lieferadresse = lieferadresse;
    }

    // Präferenzen aktualisieren
    if (praeferenzen) {
      kunde.praeferenzen = {
        ...kunde.praeferenzen,
        ...praeferenzen
      };
    }

    // Interessen aktualisieren
    if (interessen) {
      kunde.interessen = {
        ...kunde.interessen,
        ...interessen
      };
    }

    // Kommunikation aktualisieren
    if (kommunikation) {
      kunde.kommunikation = {
        ...kunde.kommunikation,
        ...kommunikation
      };
    }

    // Rolle aktualisieren (wichtig für Admin-Zuweisung)
    if (rolle !== undefined) {
      console.log(`🔐 Rolle wird geändert von "${kunde.rolle}" zu "${rolle}"`);
      kunde.rolle = rolle;
    }

    // Status aktualisieren
    if (status) {
      kunde.status = {
        ...kunde.status,
        ...status
      };
    }

    const aktualisiertKunde = await kunde.save();

    // Passwort aus Response entfernen
    const kundeOhnePasswort = aktualisiertKunde.toObject();
    delete kundeOhnePasswort.passwort;

    console.log(`✅ Kunde ${kunde.kundennummer} erfolgreich aktualisiert. Neue Rolle: ${aktualisiertKunde.rolle}`);

    res.status(200).json({
      success: true,
      message: 'Kundendaten erfolgreich aktualisiert',
      data: kundeOhnePasswort
    });

  } catch (error) {
    console.error('Kunde Update Error:', error);
    
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'E-Mail-Adresse bereits vergeben'
      });
    }

    if (error.name === 'ValidationError') {
      const validationErrors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        message: 'Validierungsfehler',
        errors: validationErrors
      });
    }

    res.status(500).json({
      success: false,
      message: 'Fehler beim Aktualisieren der Kundendaten'
    });
  }
});

// @route   GET /api/kunden/stats/overview
// @desc    Kunden-Statistiken abrufen
// @access  Private
router.get('/stats/overview', async (req, res) => {
  try {
    const stats = await Kunde.aggregate([
      {
        $group: {
          _id: null,
          gesamtKunden: { $sum: 1 },
          aktiveKunden: {
            $sum: { $cond: [{ $eq: ['$status.aktiv', true] }, 1, 0] }
          },
          verifiziertKunden: {
            $sum: { $cond: [{ $eq: ['$status.emailVerifiziert', true] }, 1, 0] }
          },
          gesamtumsatz: { $sum: '$statistiken.gesamtumsatz' },
          durchschnittUmsatz: { $avg: '$statistiken.gesamtumsatz' }
        }
      }
    ]);

    const stadteStats = await Kunde.aggregate([
      { $group: { _id: '$adresse.stadt', anzahl: { $sum: 1 } } },
      { $sort: { anzahl: -1 } },
      { $limit: 10 }
    ]);

    const registrierungenHeute = await Kunde.countDocuments({
      createdAt: { $gte: new Date(new Date().setHours(0, 0, 0, 0)) }
    });

    res.status(200).json({
      success: true,
      data: {
        ...stats[0],
        registrierungenHeute,
        topStaedte: stadteStats
      }
    });

  } catch (error) {
    console.error('Kunden Stats Error:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Abrufen der Statistiken'
    });
  }
});

// 🔍 Kunden suchen (für Admin)
router.get('/search', authenticateToken, async (req, res) => {
  try {
    const { query } = req.query;
    
    if (!query || query.length < 2) {
      return res.json({
        success: true,
        data: []
      });
    }

    const searchRegex = new RegExp(query, 'i');
    
    const kunden = await Kunde.find({
      $or: [
        { vorname: searchRegex },
        { nachname: searchRegex },
        { email: searchRegex },
        { kundennummer: searchRegex }
      ]
    })
    .select('kundennummer vorname nachname email telefon adresse')
    .limit(20)
    .sort({ nachname: 1, vorname: 1 });

    console.log(`🔍 ${kunden.length} Kunden gefunden für: "${query}"`);

    res.json({
      success: true,
      data: kunden
    });

  } catch (error) {
    console.error('Fehler bei der Kundensuche:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler bei der Kundensuche'
    });
  }
});

module.exports = router;