const express = require('express');
const router = express.Router();
const Kunde = require('../../models/Kunde');

// GET /api/admin/kunden - Alle Kunden für Admin abrufen
router.get('/', async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 50, 
      search = '', 
      sortBy = 'nachname',
      sortOrder = 'asc'
    } = req.query;

    const query = {};
    
    // Such-Filter anwenden
    if (search) {
      query.$or = [
        { vorname: { $regex: search, $options: 'i' } },
        { nachname: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { firma: { $regex: search, $options: 'i' } },
        { 'adresse.ort': { $regex: search, $options: 'i' } }
      ];
    }

    // Sortierung
    const sort = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

    // Pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    // Kunden abrufen (ohne Passwort)
    const kunden = await Kunde.find(query)
      .select('-passwort -resetPasswordToken -resetPasswordTokenExpires')
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    // Gesamt-Anzahl für Pagination
    const totalCount = await Kunde.countDocuments(query);
    
    // Daten für Frontend formatieren
    const formattedKunden = kunden.map(kunde => ({
      _id: kunde._id,
      vorname: kunde.vorname,
      nachname: kunde.nachname,
      firstName: kunde.vorname, // Alias für Frontend
      lastName: kunde.nachname,  // Alias für Frontend
      company: kunde.firma,
      email: kunde.email,
      telefon: kunde.telefon,
      phone: kunde.telefon, // Alias für Frontend
      address: kunde.adresse, // Alias für Frontend
      adresse: kunde.adresse,
      kundennummer: kunde.kundennummer,
      status: kunde.status || 'aktiv',
      registriert: kunde.createdAt,
      letzteAnmeldung: kunde.letzteAnmeldung
    }));

    res.json({
      success: true,
      data: formattedKunden,
      totalCount,
      currentPage: parseInt(page),
      totalPages: Math.ceil(totalCount / parseInt(limit)),
      hasNext: skip + parseInt(limit) < totalCount,
      hasPrev: parseInt(page) > 1
    });

  } catch (error) {
    console.error('❌ Fehler beim Laden der Kunden:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Laden der Kunden',
      error: error.message
    });
  }
});

// GET /api/admin/kunden/:id - Einzelner Kunde für Admin
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const kunde = await Kunde.findById(id)
      .select('-passwort -resetPasswordToken -resetPasswordTokenExpires')
      .lean();

    if (!kunde) {
      return res.status(404).json({
        success: false,
        message: 'Kunde nicht gefunden'
      });
    }

    res.json({
      success: true,
      data: kunde
    });

  } catch (error) {
    console.error('❌ Fehler beim Laden des Kunden:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Laden des Kunden',
      error: error.message
    });
  }
});

// POST /api/admin/kunden - Neuen Kunden als Admin erstellen
router.post('/', async (req, res) => {
  try {
    const {
      vorname,
      nachname,
      email,
      telefon,
      firma,
      adresse,
      lieferadresse,
      geburtsdatum,
      geschlecht,
      notizen
    } = req.body;

    // Prüfen ob E-Mail bereits existiert
    const existierenderKunde = await Kunde.findOne({ 
      email: email.toLowerCase().trim() 
    });
    
    if (existierenderKunde) {
      return res.status(400).json({
        success: false,
        message: 'Ein Kunde mit dieser E-Mail-Adresse existiert bereits'
      });
    }

    // Pflichtfelder prüfen
    if (!vorname || !nachname || !email || !adresse) {
      return res.status(400).json({
        success: false,
        message: 'Vorname, Nachname, E-Mail und Adresse sind erforderlich'
      });
    }

    // Neuen Kunden erstellen (ohne Passwort - Admin-Erstellung)
    const neuerKunde = new Kunde({
      vorname: vorname.trim(),
      nachname: nachname.trim(),
      email: email.toLowerCase().trim(),
      telefon: telefon?.trim(),
      firma: firma?.trim(),
      adresse: {
        strasse: adresse.strasse?.trim(),
        plz: adresse.plz?.trim(),
        ort: adresse.ort?.trim(),
        land: adresse.land?.trim() || 'Deutschland'
      },
      lieferadresse: lieferadresse || null,
      geburtsdatum: geburtsdatum || null,
      geschlecht: geschlecht || null,
      notizen: {
        intern: notizen?.intern || '',
        ...notizen
      },
      status: 'aktiv',
      erstelltVon: 'admin',
      // Passwort wird nicht gesetzt - Kunde muss es später selbst setzen
      passwort: null,
      praeferenzen: {
        datenschutz: true,
        agb: true,
        newsletter: false,
        sms: false
      }
    });

    const gespeicherterKunde = await neuerKunde.save();

    res.status(201).json({
      success: true,
      message: 'Kunde erfolgreich erstellt',
      data: {
        _id: gespeicherterKunde._id,
        vorname: gespeicherterKunde.vorname,
        nachname: gespeicherterKunde.nachname,
        email: gespeicherterKunde.email,
        kundennummer: gespeicherterKunde.kundennummer
      }
    });

  } catch (error) {
    console.error('❌ Fehler beim Erstellen des Kunden:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Erstellen des Kunden',
      error: error.message
    });
  }
});

// PUT /api/admin/kunden/:id - Kunde aktualisieren
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    // Entferne sensitive Felder
    delete updateData.passwort;
    delete updateData.resetPasswordToken;
    delete updateData.resetPasswordTokenExpires;

    // E-Mail Duplikat prüfen (außer bei gleichem Kunden)
    if (updateData.email) {
      const existierenderKunde = await Kunde.findOne({
        email: updateData.email.toLowerCase().trim(),
        _id: { $ne: id }
      });
      
      if (existierenderKunde) {
        return res.status(400).json({
          success: false,
          message: 'Ein anderer Kunde mit dieser E-Mail-Adresse existiert bereits'
        });
      }
    }

    const kunde = await Kunde.findByIdAndUpdate(
      id,
      { ...updateData, updatedAt: new Date() },
      { new: true, runValidators: true }
    ).select('-passwort -resetPasswordToken -resetPasswordTokenExpires');

    if (!kunde) {
      return res.status(404).json({
        success: false,
        message: 'Kunde nicht gefunden'
      });
    }

    res.json({
      success: true,
      message: 'Kunde erfolgreich aktualisiert',
      data: kunde
    });

  } catch (error) {
    console.error('❌ Fehler beim Aktualisieren des Kunden:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Aktualisieren des Kunden',
      error: error.message
    });
  }
});

// DELETE /api/admin/kunden/:id - Kunde löschen
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const kunde = await Kunde.findById(id);
    if (!kunde) {
      return res.status(404).json({
        success: false,
        message: 'Kunde nicht gefunden'
      });
    }

    // Soft Delete - Status auf 'gelöscht' setzen
    await Kunde.findByIdAndUpdate(id, {
      status: 'gelöscht',
      geloeschtAm: new Date(),
      updatedAt: new Date()
    });

    res.json({
      success: true,
      message: 'Kunde erfolgreich gelöscht'
    });

  } catch (error) {
    console.error('❌ Fehler beim Löschen des Kunden:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Löschen des Kunden',
      error: error.message
    });
  }
});

module.exports = router;