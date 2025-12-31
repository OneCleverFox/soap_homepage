const express = require('express');
const Kunde = require('../../models/Kunde'); // Use Kunde model instead of User
const User = require('../../models/User'); // Add User model
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
    console.log('🔧 E-Mail-Verifikation Toggle-Request:', {
      body: req.body,
      user: req.user?.email,
      requireEmailVerification: req.body.requireEmailVerification
    });
    
    const { requireEmailVerification } = req.body;
    
    if (typeof requireEmailVerification !== 'boolean') {
      console.log('❌ Ungültiger Wert für requireEmailVerification:', requireEmailVerification);
      return res.status(400).json({
        success: false,
        message: 'Ungültiger Wert für requireEmailVerification'
      });
    }

    console.log('📋 Lade AdminSettings...');
    const settings = await AdminSettings.getInstance();
    console.log('📋 Aktuelle Einstellungen:', settings.userManagement);
    
    // Einstellung aktualisieren
    settings.userManagement = {
      ...settings.userManagement,
      requireEmailVerification
    };
    
    console.log('💾 Speichere neue Einstellungen...');
    await settings.save();
    console.log('✅ Einstellungen gespeichert:', settings.userManagement);
    
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
      
      // WICHTIG: Sowohl User als auch Kunde anonymisieren
      const User = require('../../models/User');
      
      // User anonymisieren (falls vorhanden)
      await User.findOneAndUpdate(
        { email: user.email },
        {
          $set: {
            firstName: 'Gelöscht',
            lastName: 'Gelöscht',
            email: `deleted_user_${user._id}@deleted.local`,
            phone: '',
            status: 'deleted',
            emailVerified: false
          }
        },
        { runValidators: false }
      );
      
      // Kunde anonymisieren
      await Kunde.findByIdAndUpdate(req.params.userId, {
        $set: {
          vorname: 'Gelöscht',
          nachname: 'Gelöscht',
          email: `deleted_kunde_${user._id}@deleted.local`,
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
      
      // WICHTIG: Sowohl aus User als auch aus Kunde Collection löschen
      const User = require('../../models/User');
      
      console.log(`🔄 Starte vollständige Löschung für ${user.email}...`);
      
      // User löschen (falls vorhanden) - mehrere Varianten prüfen
      let deletedUserCount = 0;
      const userVariants = [
        { email: user.email },
        { email: user.email.toLowerCase() },
        { email: user.email.toUpperCase() }
      ];
      
      for (const variant of userVariants) {
        try {
          const deletedUser = await User.findOneAndDelete(variant);
          if (deletedUser) {
            deletedUserCount++;
            console.log(`🗑️ User ${deletedUser.email} aus User-Collection gelöscht (Variante: ${JSON.stringify(variant)})`);
          }
        } catch (userDeleteError) {
          console.log(`⚠️ User-Löschung fehlgeschlagen für ${JSON.stringify(variant)}:`, userDeleteError.message);
        }
      }
      
      // Kunde löschen
      const deletedKunde = await Kunde.findByIdAndDelete(req.params.userId);
      console.log(`🗑️ Kunde ${deletedKunde ? deletedKunde.email : 'unbekannt'} aus Kunde-Collection gelöscht`);
      
      // Zusätzlich nach E-Mail in Kunde-Collection suchen und löschen
      let deletedKundeCount = 0;
      const kundeVariants = [
        { email: user.email },
        { email: user.email.toLowerCase() },
        { email: user.email.toUpperCase() },
        { _id: { $ne: req.params.userId }, email: user.email } // Falls es mehrere Einträge gibt
      ];
      
      for (const variant of kundeVariants) {
        try {
          const deletedKundeByEmail = await Kunde.findOneAndDelete(variant);
          if (deletedKundeByEmail) {
            deletedKundeCount++;
            console.log(`🗑️ Zusätzlicher Kunde ${deletedKundeByEmail.email} gelöscht (Variante: ${JSON.stringify(variant)})`);
          }
        } catch (kundeDeleteError) {
          console.log(`⚠️ Kunde-Löschung fehlgeschlagen für ${JSON.stringify(variant)}:`, kundeDeleteError.message);
        }
      }
      
      console.log(`✅ Benutzer ${user.email} wurde komplett gelöscht`);
      console.log(`📊 Löschstatistik: ${deletedUserCount} User-Einträge, ${deletedKundeCount + 1} Kunde-Einträge`);
      
      res.json({
        success: true,
        message: `Benutzer wurde erfolgreich gelöscht`,
        deleted: true,
        details: {
          userEntriesDeleted: deletedUserCount,
          kundeEntriesDeleted: deletedKundeCount + 1
        }
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

// Debug: User-Status prüfen
router.get('/debug-user/:email', async (req, res) => {
  try {
    const email = decodeURIComponent(req.params.email);
    console.log(`🔍 Debug User-Status für: ${email}`);
    
    const user = await Kunde.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: 'User nicht gefunden' 
      });
    }

    res.json({
      success: true,
      data: {
        email: user.email,
        kundennummer: user.kundennummer,
        status: user.status,
        statusType: typeof user.status,
        vorname: user.vorname,
        nachname: user.nachname,
        rolle: user.rolle,
        createdAt: user.createdAt
      }
    });

  } catch (error) {
    console.error('❌ Fehler bei User-Debug:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Debug-Fehler' 
    });
  }
});

// Status-Migration für spezifischen User
router.post('/migrate-status/:userId', async (req, res) => {
  try {
    console.log(`🔧 Status-Migration für User: ${req.params.userId}`);
    
    const user = await Kunde.findById(req.params.userId);
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: 'Benutzer nicht gefunden' 
      });
    }

    console.log('👤 User vor Migration:', {
      email: user.email,
      status: user.status,
      statusType: typeof user.status,
      kundennummer: user.kundennummer,
      vorname: user.vorname,
      nachname: user.nachname
    });

    let migrationNeeded = false;
    
    // Status-Migration falls String
    if (typeof user.status === 'string') {
      const newStatus = {
        aktiv: user.status === 'active' || user.status === 'verified',
        emailVerifiziert: user.status === 'verified' || user.status === 'active',
        telefonVerifiziert: false,
        gesperrt: user.status === 'blocked' || user.status === 'suspended'
      };
      
      user.status = newStatus;
      migrationNeeded = true;
      console.log('✅ Status migriert:', { old: req.body.oldStatus, new: newStatus });
    }

    // Kundennummer-Migration falls fehlt
    if (!user.kundennummer) {
      // Manuell generieren falls Pre-Save Hook versagt hat
      const jetzt = new Date();
      const jahr = jetzt.getFullYear().toString().slice(-2);
      const monat = (jetzt.getMonth() + 1).toString().padStart(2, '0');
      const zufallsZahl = Math.floor(1000 + Math.random() * 9000);
      
      let neueKundennummer = `KD${jahr}${monat}${zufallsZahl}`;
      
      // Eindeutigkeit prüfen
      let existiert = await Kunde.findOne({ kundennummer: neueKundennummer });
      let versuche = 0;
      while (existiert && versuche < 10) {
        zufallsZahl = Math.floor(1000 + Math.random() * 9000);
        neueKundennummer = `KD${jahr}${monat}${zufallsZahl}`;
        existiert = await Kunde.findOne({ kundennummer: neueKundennummer });
        versuche++;
      }
      
      user.kundennummer = neueKundennummer;
      migrationNeeded = true;
      console.log('✅ Kundennummer generiert:', neueKundennummer);
    }

    if (migrationNeeded) {
      await user.save();
      console.log('💾 User erfolgreich migriert und gespeichert');
    }

    console.log('👤 User nach Migration:', {
      email: user.email,
      status: user.status,
      statusType: typeof user.status,
      kundennummer: user.kundennummer,
      vorname: user.vorname,
      nachname: user.nachname
    });

    res.json({
      success: true,
      message: migrationNeeded ? 'User erfolgreich migriert' : 'Migration nicht erforderlich',
      data: {
        email: user.email,
        kundennummer: user.kundennummer,
        status: user.status,
        migrationPerformed: migrationNeeded
      }
    });

  } catch (error) {
    console.error('❌ Fehler bei User-Migration:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Fehler bei der Migration' 
    });
  }
});

// Debug-Route: E-Mail in beiden Collections prüfen und optional löschen
router.post('/debug-email/:email', async (req, res) => {
  try {
    const email = req.params.email.toLowerCase();
    const { action } = req.body; // 'check' oder 'delete'
    
    console.log(`🔍 Debug E-Mail: ${email}, Aktion: ${action}`);
    
    // Prüfe User Collection
    const userInUserCollection = await User.findOne({ email });
    
    // Prüfe Kunde Collection  
    const userInKundeCollection = await Kunde.findOne({ email });
    
    const result = {
      email,
      userCollection: {
        exists: !!userInUserCollection,
        id: userInUserCollection?._id,
        username: userInUserCollection?.username,
        status: userInUserCollection?.status
      },
      kundeCollection: {
        exists: !!userInKundeCollection,
        id: userInKundeCollection?._id,
        kundennummer: userInKundeCollection?.kundennummer,
        status: userInKundeCollection?.status
      }
    };
    
    if (action === 'delete') {
      const deleteResults = {
        userDeleted: false,
        kundeDeleted: false
      };
      
      // User aus User-Collection löschen
      if (userInUserCollection) {
        await User.findByIdAndDelete(userInUserCollection._id);
        deleteResults.userDeleted = true;
        console.log(`🗑️ User ${email} aus User-Collection gelöscht`);
      }
      
      // Kunde aus Kunde-Collection löschen
      if (userInKundeCollection) {
        await Kunde.findByIdAndDelete(userInKundeCollection._id);
        deleteResults.kundeDeleted = true;
        console.log(`🗑️ Kunde ${email} aus Kunde-Collection gelöscht`);
      }
      
      result.deleteResults = deleteResults;
    }
    
    res.json({
      success: true,
      debug: result
    });
    
  } catch (error) {
    console.error('❌ Debug E-Mail Fehler:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Fehler bei Debug-Abfrage',
      error: error.message
    });
  }
});

module.exports = router;