const User = require('../models/User');

/**
 * Generiert einen eindeutigen Benutzernamen basierend auf Vor- und Nachname
 * Format: vorname.nachname oder vorname.nachname2, vorname.nachname3, etc.
 */
class UsernameGenerator {
  
  /**
   * Bereinigt einen Namen für Benutzername (entfernt Sonderzeichen, Umlaute, etc.)
   */
  static sanitizeName(name) {
    if (!name) return '';
    
    return name
      .toLowerCase()
      .trim()
      // Umlaute ersetzen
      .replace(/ä/g, 'ae')
      .replace(/ö/g, 'oe')
      .replace(/ü/g, 'ue')
      .replace(/ß/g, 'ss')
      // Nur Buchstaben und Zahlen behalten
      .replace(/[^a-z0-9]/g, '')
      // Mehrfache Leerzeichen entfernen
      .replace(/\s+/g, '');
  }

  /**
   * Generiert einen Basis-Benutzernamen aus Vor- und Nachname
   */
  static generateBaseUsername(firstName, lastName) {
    const cleanFirstName = this.sanitizeName(firstName);
    const cleanLastName = this.sanitizeName(lastName);
    
    if (!cleanFirstName || !cleanLastName) {
      throw new Error('Vor- und Nachname sind für die Benutzername-Generierung erforderlich');
    }
    
    // Format: vorname.nachname
    return `${cleanFirstName}.${cleanLastName}`;
  }

  /**
   * Prüft ob ein Benutzername bereits existiert
   */
  static async isUsernameTaken(username) {
    try {
      const existingUser = await User.findOne({ 
        username: { $regex: new RegExp(`^${username}$`, 'i') } 
      });
      return !!existingUser;
    } catch (error) {
      console.error('Fehler bei Benutzername-Prüfung:', error);
      return true; // Im Fehlerfall als "vergeben" betrachten
    }
  }

  /**
   * Generiert einen eindeutigen Benutzernamen
   */
  static async generateUniqueUsername(firstName, lastName, maxAttempts = 10) {
    try {
      const baseUsername = this.generateBaseUsername(firstName, lastName);
      
      // Ersten Versuch ohne Nummer
      if (!(await this.isUsernameTaken(baseUsername))) {
        return baseUsername;
      }
      
      // Falls vergeben, Nummer anhängen
      for (let i = 2; i <= maxAttempts + 1; i++) {
        const numberedUsername = `${baseUsername}${i}`;
        
        if (!(await this.isUsernameTaken(numberedUsername))) {
          return numberedUsername;
        }
      }
      
      // Falls alle Versuche fehlschlagen, Fallback mit Timestamp
      const timestamp = Date.now().toString().slice(-4);
      const fallbackUsername = `${baseUsername}${timestamp}`;
      
      console.warn(`Alle Benutzername-Versuche fehlgeschlagen. Fallback: ${fallbackUsername}`);
      return fallbackUsername;
      
    } catch (error) {
      console.error('Fehler bei Benutzername-Generierung:', error);
      // Notfall-Fallback
      const randomSuffix = Math.random().toString(36).substring(2, 8);
      return `user${randomSuffix}`;
    }
  }

  /**
   * Validiert und generiert einen Benutzernamen für neue Registrierung
   */
  static async createUsernameForRegistration(firstName, lastName) {
    console.log(`🔄 Generiere Benutzername für: ${firstName} ${lastName}`);
    
    if (!firstName || !lastName) {
      throw new Error('Vor- und Nachname sind erforderlich');
    }
    
    const username = await this.generateUniqueUsername(firstName, lastName);
    
    console.log(`✅ Generierter Benutzername: ${username}`);
    return username;
  }

  /**
   * Aktualisiert Benutzername bei Namensänderung
   */
  static async updateUsernameForNameChange(userId, newFirstName, newLastName) {
    try {
      console.log(`🔄 Aktualisiere Benutzername für User ${userId}: ${newFirstName} ${newLastName}`);
      
      // Aktuellen Benutzer abrufen
      const user = await User.findById(userId);
      if (!user) {
        throw new Error('Benutzer nicht gefunden');
      }
      
      // Neuen Benutzernamen generieren
      const newUsername = await this.generateUniqueUsername(newFirstName, newLastName);
      
      // Prüfen ob sich der Benutzername ändert
      if (user.username === newUsername) {
        console.log(`ℹ️ Benutzername bleibt unverändert: ${newUsername}`);
        return newUsername;
      }
      
      // Benutzername aktualisieren
      await User.findByIdAndUpdate(userId, { username: newUsername });
      
      console.log(`✅ Benutzername aktualisiert: ${user.username} → ${newUsername}`);
      return newUsername;
      
    } catch (error) {
      console.error('Fehler bei Benutzername-Aktualisierung:', error);
      throw error;
    }
  }

  /**
   * Vorschau für Benutzername-Generierung (ohne DB-Speicherung)
   */
  static async previewUsername(firstName, lastName) {
    try {
      const baseUsername = this.generateBaseUsername(firstName, lastName);
      const isTaken = await this.isUsernameTaken(baseUsername);
      
      return {
        baseUsername,
        isTaken,
        suggestedUsername: isTaken ? `${baseUsername}2` : baseUsername
      };
    } catch (error) {
      console.error('Fehler bei Benutzername-Vorschau:', error);
      return {
        baseUsername: 'fehler',
        isTaken: true,
        suggestedUsername: 'fehler'
      };
    }
  }
}

module.exports = UsernameGenerator;