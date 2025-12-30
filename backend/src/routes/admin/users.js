const express = require('express');
const Kunde = require('../../models/Kunde'); // Use Kunde model instead of User
const AdminSettings = require('../../models/AdminSettings');

const router = express.Router();

// Benutzer manuell verifizieren
router.put('/verify/:userId', async (req, res) => {
  try {
    console.log(`📧 Admin-Verifikation für Benutzer: ${req.params.userId}`);
    
    const user = await Kunde.findById(req.params.userId);
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: 'Benutzer nicht gefunden' 
      });
    }

    // Kundennummer generieren falls nicht vorhanden
    let kundennummer = user.kundennummer;
    if (!kundennummer) {
      let eindeutig = false;
      let versuche = 0;
      
      while (!eindeutig && versuche < 10) {
        const datum = new Date();
        const jahr = datum.getFullYear().toString().slice(-2);
        const monat = (datum.getMonth() + 1).toString().padStart(2, '0');
        const random = Math.floor(Math.random() * 9999).toString().padStart(4, '0');
        const neueKundennummer = `KD${jahr}${monat}${random}`;
        
        const existierender = await Kunde.findOne({ kundennummer: neueKundennummer });
        
        if (!existierender) {
          kundennummer = neueKundennummer;
          eindeutig = true;
        }
        versuche++;
      }
      
      if (!eindeutig) {
        // Fallback mit Timestamp
        kundennummer = `KD${Date.now()}`;
      }
      
      console.log(`🔢 Kundennummer generiert: ${kundennummer} für ${user.email}`);
    }

    // Benutzer als verifiziert markieren UND Kundennummer setzen
    await Kunde.findByIdAndUpdate(req.params.userId, {
      $set: {
        kundennummer: kundennummer,
        status: {
          aktiv: true,
          emailVerifiziert: true,
          telefonVerifiziert: false,
          gesperrt: false,
          sperrgrund: ''
        }
      }
    }, { runValidators: false });

    console.log(`✅ Benutzer ${user.email} wurde durch Admin verifiziert mit Kundennummer: ${kundennummer}`);
    
    res.json({
      success: true,
      message: `Benutzer ${user.email} wurde erfolgreich verifiziert`,
      kundennummer: kundennummer
    });
  } catch (error) {
    console.error('❌ Fehler bei Admin-Verifikation:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Fehler bei der Verifikation' 
    });
  }
});

// Fehlende Kundennummern für verifizierte Benutzer reparieren
router.post('/fix-missing-customer-numbers', async (req, res) => {
  try {
    console.log('🔧 Starte Reparatur fehlender Kundennummern...');
    
    // Finde alle Benutzer ohne Kundennummer
    const benutzerOhneKundennummer = await Kunde.find({
      $or: [
        { kundennummer: { $exists: false } },
        { kundennummer: null },
        { kundennummer: '' }
      ]
    });
    
    let erfolgreich = 0;
    let fehler = 0;
    
    for (const user of benutzerOhneKundennummer) {
      try {
        let eindeutig = false;
        let versuche = 0;
        let kundennummer;
        
        while (!eindeutig && versuche < 10) {
          const datum = new Date();
          const jahr = datum.getFullYear().toString().slice(-2);
          const monat = (datum.getMonth() + 1).toString().padStart(2, '0');
          const random = Math.floor(Math.random() * 9999).toString().padStart(4, '0');
          const neueKundennummer = `KD${jahr}${monat}${random}`;
          
          const existierender = await Kunde.findOne({ kundennummer: neueKundennummer });
          
          if (!existierender) {
            kundennummer = neueKundennummer;
            eindeutig = true;
          }
          versuche++;
        }
        
        if (!eindeutig) {
          // Fallback mit Timestamp
          kundennummer = `KD${Date.now()}${Math.floor(Math.random() * 100)}`;
        }
        
        await Kunde.findByIdAndUpdate(user._id, {
          $set: { kundennummer: kundennummer }
        }, { runValidators: false });
        
        console.log(`✅ Kundennummer ${kundennummer} für ${user.email} generiert`);
        erfolgreich++;
        
      } catch (error) {
        console.error(`❌ Fehler bei ${user.email}:`, error);
        fehler++;
      }
    }
    
    res.json({
      success: true,
      message: `Reparatur abgeschlossen: ${erfolgreich} erfolgreich, ${fehler} Fehler`,
      erfolgreich,
      fehler,
      gesamt: benutzerOhneKundennummer.length
    });
    
  } catch (error) {
    console.error('❌ Fehler bei Kundennummer-Reparatur:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Fehler bei der Reparatur' 
    });
  }
});

// E-Mail-Verifikationseinstellung abrufen
router.get('/verification-settings', async (req, res) => {
  try {
    const settings = await AdminSettings.getInstance();
    
    res.json({
      success: true,
      requireEmailVerification: settings.userManagement?.requireEmailVerification ?? true
    });
  } catch (error) {
    console.error('❌ Fehler beim Abrufen der Verifikationseinstellungen:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Fehler beim Abrufen der Einstellungen' 
    });
  }
});

// E-Mail-Verifikationseinstellungen abrufen
router.get('/verification-settings', async (req, res) => {
  try {
    const settings = await AdminSettings.getInstance();
    
    res.json({
      success: true,
      requireEmailVerification: settings.userManagement?.requireEmailVerification ?? true
    });
  } catch (error) {
    console.error('❌ Fehler beim Abrufen der Verifikationseinstellungen:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Abrufen der Einstellungen'
    });
  }
});

// E-Mail-Verifikationseinstellung ändern
router.put('/verification-settings', async (req, res) => {
  try {
    const { requireEmailVerification } = req.body;
    
    if (typeof requireEmailVerification !== 'boolean') {
      return res.status(400).json({
        success: false,
        message: 'Ungültiger Wert für requireEmailVerification'
      });
    }

    const settings = await AdminSettings.getInstance();
    
    // Einstellung aktualisieren
    settings.userManagement = {
      ...settings.userManagement,
      requireEmailVerification
    };
    
    await settings.save();
    
    console.log(`📧 E-Mail-Verifikation ${requireEmailVerification ? 'aktiviert' : 'deaktiviert'} von Admin: ${req.user.email}`);
    
    res.json({
      success: true,
      message: `E-Mail-Verifikation wurde ${requireEmailVerification ? 'aktiviert' : 'deaktiviert'}`,
      requireEmailVerification: settings.userManagement.requireEmailVerification
    });
  } catch (error) {
    console.error('❌ Fehler beim Ändern der Verifikationseinstellung:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Fehler beim Ändern der Einstellung' 
    });
  }
});

// Benutzer sperren
router.put('/block/:userId', async (req, res) => {
  try {
    console.log(`🚫 Admin-Sperrung für Benutzer: ${req.params.userId}`);
    
    const user = await Kunde.findById(req.params.userId);
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: 'Benutzer nicht gefunden' 
      });
    }

    // Benutzer sperren
    await Kunde.findByIdAndUpdate(req.params.userId, {
      $set: {
        status: {
          aktiv: false,
          emailVerifiziert: user.status?.emailVerifiziert || false,
          telefonVerifiziert: user.status?.telefonVerifiziert || false,
          gesperrt: true,
          sperrgrund: req.body.sperrgrund || 'Administrativ gesperrt'
        }
      }
    }, { runValidators: false });

    console.log(`✅ Benutzer ${user.email} wurde durch Admin gesperrt`);
    
    res.json({
      success: true,
      message: `Benutzer ${user.email} wurde erfolgreich gesperrt`
    });
  } catch (error) {
    console.error('❌ Fehler bei Admin-Sperrung:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Fehler bei der Sperrung' 
    });
  }
});

// Benutzer entsperren
router.put('/unblock/:userId', async (req, res) => {
  try {
    console.log(`✅ Admin-Entsperrung für Benutzer: ${req.params.userId}`);
    
    const user = await Kunde.findById(req.params.userId);
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: 'Benutzer nicht gefunden' 
      });
    }

    // Benutzer entsperren
    await Kunde.findByIdAndUpdate(req.params.userId, {
      $set: {
        status: {
          aktiv: true,
          emailVerifiziert: user.status?.emailVerifiziert || false,
          telefonVerifiziert: user.status?.telefonVerifiziert || false,
          gesperrt: false,
          sperrgrund: ''
        }
      }
    }, { runValidators: false });

    console.log(`✅ Benutzer ${user.email} wurde durch Admin entsperrt`);
    
    res.json({
      success: true,
      message: `Benutzer ${user.email} wurde erfolgreich entsperrt`
    });
  } catch (error) {
    console.error('❌ Fehler bei Admin-Entsperrung:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Fehler bei der Entsperrung' 
    });
  }
});

// Benutzer löschen
router.delete('/delete/:userId', async (req, res) => {
  try {
    console.log(`🗑️ Admin-Löschung für Benutzer: ${req.params.userId}`);
    
    const user = await Kunde.findById(req.params.userId);
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: 'Benutzer nicht gefunden' 
      });
    }

    // Prüfe, ob Benutzer Bestellungen hat
    const Order = require('../../models/Order');
    const orderCount = await Order.countDocuments({ 
      $or: [
        { 'besteller.email': user.email },
        { 'besteller.kundeId': user._id },
        { kundeId: user._id }
      ]
    });

    if (orderCount > 0) {
      // Benutzer hat Bestellungen - anonymisieren statt löschen (DSGVO-konform)
      await Kunde.findByIdAndUpdate(req.params.userId, {
        $set: {
          vorname: 'Gelöscht',
          nachname: 'Gelöscht',
          email: `deleted_${user._id}@deleted.local`,
          telefon: '',
          status: {
            aktiv: false,
            emailVerifiziert: false,
            telefonVerifiziert: false,
            gesperrt: true,
            sperrgrund: 'Konto gelöscht - Daten anonymisiert'
          },
          adresse: {
            strasse: '',
            hausnummer: '',
            zusatz: '',
            plz: '',
            stadt: '',
            land: ''
          },
          kommunikation: {
            newsletter: false,
            sms: false
          },
          notizen: 'Konto wurde administrativ gelöscht und anonymisiert'
        }
      }, { runValidators: false });

      console.log(`✅ Benutzer ${user.email} wurde anonymisiert (hatte ${orderCount} Bestellungen)`);
      
      res.json({
        success: true,
        message: `Benutzer wurde anonymisiert (hatte ${orderCount} Bestellungen - DSGVO-konform)`,
        anonymized: true
      });
    } else {
      // Benutzer hat keine Bestellungen - kann sicher gelöscht werden
      await Kunde.findByIdAndDelete(req.params.userId);
      
      console.log(`✅ Benutzer ${user.email} wurde komplett gelöscht (keine Bestellungen)`);
      
      res.json({
        success: true,
        message: `Benutzer wurde erfolgreich gelöscht`,
        deleted: true
      });
    }
  } catch (error) {
    console.error('❌ Fehler bei Admin-Löschung:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Fehler bei der Löschung' 
    });
  }
});

module.exports = router;