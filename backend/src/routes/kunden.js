const express = require('express');
const router = express.Router();
const Kunde = require('../models/Kunde');
const jwt = require('jsonwebtoken');

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

module.exports = router;