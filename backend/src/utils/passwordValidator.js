const bcrypt = require('bcryptjs');
const zxcvbn = require('zxcvbn'); // Passwort-Stärke-Bewertung Library

/**
 * Passwort-Validierungsklasse nach aktuellen Sicherheitsstandards
 * Basiert auf NIST SP 800-63B und BSI TR-02102-1 Empfehlungen
 */
class PasswordValidator {
  
  /**
   * Validiert Passwort nach aktuellen Sicherheitsstandards
   * @param {string} password - Das zu validierende Passwort
   * @param {object} userInfo - Benutzerinformationen für Kontext-Check
   * @returns {object} Validierungsergebnis
   */
  static validatePassword(password, userInfo = {}) {
    const result = {
      isValid: false,
      score: 0,
      feedback: [],
      requirements: {
        length: false,
        uppercase: false,
        lowercase: false,
        number: false,
        special: false,
        noUserInfo: false,
        noRepetition: false,
        noCommonPasswords: false,
        strength: false
      }
    };

    if (!password) {
      result.feedback.push('Passwort ist erforderlich');
      return result;
    }

    // 1. Mindestlänge: 8 Zeichen (NIST empfiehlt 8+)
    if (password.length >= 8) {
      result.requirements.length = true;
    } else {
      result.feedback.push('Mindestens 8 Zeichen erforderlich');
    }

    // 2. Großbuchstaben
    if (/[A-Z]/.test(password)) {
      result.requirements.uppercase = true;
    } else {
      result.feedback.push('Mindestens einen Großbuchstaben verwenden');
    }

    // 3. Kleinbuchstaben
    if (/[a-z]/.test(password)) {
      result.requirements.lowercase = true;
    } else {
      result.feedback.push('Mindestens einen Kleinbuchstaben verwenden');
    }

    // 4. Zahlen
    if (/\d/.test(password)) {
      result.requirements.number = true;
    } else {
      result.feedback.push('Mindestens eine Zahl verwenden');
    }

    // 5. Sonderzeichen (sicherheitskritische Zeichen)
    if (/[@$!%*?&#+\-_=]/.test(password)) {
      result.requirements.special = true;
    } else {
      result.feedback.push('Mindestens ein Sonderzeichen verwenden (@$!%*?&#+\\-_=)');
    }

    // 6. Benutzerinformationen nicht im Passwort
    const userInfoCheck = this.checkUserInfoInPassword(password, userInfo);
    if (userInfoCheck.isValid) {
      result.requirements.noUserInfo = true;
    } else {
      result.feedback.push(userInfoCheck.message);
    }

    // 7. Keine Zeichenwiederholungen (max. 2 gleiche Zeichen hintereinander)
    const repetitionCheck = this.checkCharacterRepetition(password);
    if (repetitionCheck.isValid) {
      result.requirements.noRepetition = true;
    } else {
      result.feedback.push(repetitionCheck.message);
    }

    // 8. Häufige Passwörter ausschließen
    const commonPasswordCheck = this.checkCommonPasswords(password);
    if (commonPasswordCheck.isValid) {
      result.requirements.noCommonPasswords = true;
    } else {
      result.feedback.push(commonPasswordCheck.message);
    }

    // 9. Passwort-Stärke mit zxcvbn bewerten
    const strengthAnalysis = zxcvbn(password, [
      userInfo.firstName, 
      userInfo.lastName, 
      userInfo.email, 
      userInfo.username,
      'glücksmomente',
      'manufaktur',
      'seife'
    ]);

    result.score = strengthAnalysis.score; // 0-4 Skala

    if (strengthAnalysis.score >= 3) {
      result.requirements.strength = true;
    } else {
      result.feedback.push(`Passwort-Stärke zu schwach (${strengthAnalysis.score}/4). ${strengthAnalysis.feedback.suggestions.join(' ')}`);
    }

    // Zusätzliche Empfehlungen von zxcvbn
    if (strengthAnalysis.feedback.warning) {
      result.feedback.push(`Warnung: ${strengthAnalysis.feedback.warning}`);
    }

    // Gesamtvalidierung
    result.isValid = Object.values(result.requirements).every(req => req === true);

    return result;
  }

  /**
   * Prüft ob Benutzerinformationen im Passwort enthalten sind
   */
  static checkUserInfoInPassword(password, userInfo) {
    const passwordLower = password.toLowerCase();
    
    const userFields = [
      userInfo.firstName,
      userInfo.lastName,
      userInfo.username,
      userInfo.email?.split('@')[0] // Teil vor @
    ].filter(field => field && field.length >= 3);

    for (const field of userFields) {
      if (passwordLower.includes(field.toLowerCase())) {
        return {
          isValid: false,
          message: `Passwort darf keine persönlichen Informationen enthalten (${field})`
        };
      }
    }

    return { isValid: true };
  }

  /**
   * Prüft auf Zeichenwiederholungen (max. 2 gleiche Zeichen hintereinander)
   * Verhindert Muster wie "aaa", "111", "!!!" etc.
   */
  static checkCharacterRepetition(password) {
    // Regex für 3+ aufeinanderfolgende gleiche Zeichen
    const repetitionPattern = /(.)\1{2,}/;
    
    if (repetitionPattern.test(password)) {
      // Finde das wiederholte Zeichen für detailliertere Fehlermeldung
      const match = password.match(repetitionPattern);
      const repeatedChar = match[1];
      const repetitionLength = match[0].length;
      
      return {
        isValid: false,
        message: `Keine ${repetitionLength} aufeinanderfolgenden "${repeatedChar}"-Zeichen verwenden`
      };
    }

    // Zusätzliche Prüfung für häufige Tastaturmuster
    const keyboardPatterns = [
      /123{3,}/, /abc{3,}/i, /qwe{3,}/i, /asd{3,}/i, /zxc{3,}/i,
      /111+/, /000+/, /aaa+/i, /sss+/i
    ];

    for (const pattern of keyboardPatterns) {
      if (pattern.test(password)) {
        return {
          isValid: false,
          message: 'Keine einfachen Tastaturmuster oder Wiederholungen verwenden'
        };
      }
    }

    return { isValid: true };
  }

  /**
   * Prüft auf häufig verwendete Passwörter
   */
  static checkCommonPasswords(password) {
    const commonPasswords = [
      'password', 'passwort', '12345678', 'qwertz123', 'admin123',
      'password123', 'passwort123', '123456789', 'qwertzui',
      'deutschland', 'sommer2024', 'winter2024', '12345abc',
      'test1234', 'user1234', 'admin1234', 'master123'
    ];

    const passwordLower = password.toLowerCase();
    
    if (commonPasswords.some(common => passwordLower.includes(common))) {
      return {
        isValid: false,
        message: 'Häufig verwendete Passwörter sind nicht sicher'
      };
    }

    return { isValid: true };
  }

  /**
   * Generiert sichere Passwort-Empfehlungen
   */
  static generatePasswordSuggestions() {
    return [
      'Verwenden Sie eine Passphrase aus 4+ zufälligen Wörtern',
      'Kombinieren Sie Groß-/Kleinbuchstaben, Zahlen und Sonderzeichen',
      'Nutzen Sie einen Passwort-Manager für einzigartige Passwörter',
      'Vermeiden Sie persönliche Informationen im Passwort',
      'Mindestens 8 Zeichen, besser 12+ Zeichen verwenden'
    ];
  }

  /**
   * Hash-Passwort mit bcrypt (Rounds nach aktuellen Standards)
   */
  static async hashPassword(password) {
    // 12 Rounds sind aktuell sicher (2024 Standard)
    // Bei starken Servern können auch 14+ Rounds verwendet werden
    const saltRounds = 12;
    return await bcrypt.hash(password, saltRounds);
  }

  /**
   * Vergleiche Passwort mit Hash
   */
  static async comparePassword(password, hash) {
    return await bcrypt.compare(password, hash);
  }
}

module.exports = PasswordValidator;