/**
 * Frontend Passwort-Validierung nach aktuellen Sicherheitsstandards
 * Synchronisiert mit Backend-Validierung für bessere UX
 */

export class PasswordValidator {
  
  /**
   * Validiert Passwort in Echtzeit (Frontend)
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
      },
      strengthText: '',
      strengthColor: 'error'
    };

    if (!password) {
      result.feedback.push('Passwort ist erforderlich');
      return result;
    }

    // 1. Mindestlänge: 8 Zeichen
    if (password.length >= 8) {
      result.requirements.length = true;
    } else {
      result.feedback.push('Mindestens 8 Zeichen erforderlich');
    }

    // 2. Großbuchstaben
    if (/[A-Z]/.test(password)) {
      result.requirements.uppercase = true;
    } else {
      result.feedback.push('Mindestens einen Großbuchstaben (A-Z)');
    }

    // 3. Kleinbuchstaben
    if (/[a-z]/.test(password)) {
      result.requirements.lowercase = true;
    } else {
      result.feedback.push('Mindestens einen Kleinbuchstaben (a-z)');
    }

    // 4. Zahlen
    if (/\d/.test(password)) {
      result.requirements.number = true;
    } else {
      result.feedback.push('Mindestens eine Zahl (0-9)');
    }

    // 5. Sonderzeichen
    if (/[@$!%*?&#+\-_=]/.test(password)) {
      result.requirements.special = true;
    } else {
      result.feedback.push('Mindestens ein Sonderzeichen (@$!%*?&#+\\-_=)');
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

    // 7. Häufige Passwörter ausschließen
    const commonPasswordCheck = this.checkCommonPasswords(password);
    if (commonPasswordCheck.isValid) {
      result.requirements.noCommonPasswords = true;
    } else {
      result.feedback.push(commonPasswordCheck.message);
    }

    // 8. Passwort-Stärke berechnen
    result.score = this.calculatePasswordStrength(password, userInfo);
    
    if (result.score >= 3) {
      result.requirements.strength = true;
    }

    // Stärke-Text und Farbe bestimmen
    const strengthInfo = this.getStrengthInfo(result.score);
    result.strengthText = strengthInfo.text;
    result.strengthColor = strengthInfo.color;

    // Gesamtvalidierung
    result.isValid = Object.values(result.requirements).every(req => req === true);

    return result;
  }

  /**
   * Berechnet Passwort-Stärke (vereinfachte Version ohne zxcvbn)
   */
  static calculatePasswordStrength(password, userInfo) {
    let score = 0;

    // Länge
    if (password.length >= 8) score += 1;
    if (password.length >= 12) score += 1;

    // Zeichenvielfalt
    if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score += 1;
    if (/\d/.test(password)) score += 1;
    if (/[@$!%*?&#+\-_=]/.test(password)) score += 1;

    // Komplexität
    const uniqueChars = new Set(password).size;
    if (uniqueChars >= password.length * 0.7) score += 1;

    // Benutzerinfo-Check
    if (this.checkUserInfoInPassword(password, userInfo).isValid) score += 1;

    // Häufige Muster vermeiden
    if (!/(123|abc|qwe|asd)/i.test(password)) score += 1;

    return Math.min(score, 4); // Max 4 Punkte
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
      userInfo.email?.split('@')[0]
    ].filter(field => field && field.length >= 3);

    for (const field of userFields) {
      if (passwordLower.includes(field.toLowerCase())) {
        return {
          isValid: false,
          message: `Keine persönlichen Informationen verwenden`
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
      return {
        isValid: false,
        message: 'Keine 3+ gleichen Zeichen hintereinander'
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
          message: 'Keine einfachen Wiederholungen verwenden'
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
      'deutschland', '12345abc', 'test1234', 'user1234'
    ];

    const passwordLower = password.toLowerCase();
    
    if (commonPasswords.some(common => passwordLower.includes(common))) {
      return {
        isValid: false,
        message: 'Häufige Passwörter vermeiden'
      };
    }

    return { isValid: true };
  }

  /**
   * Gibt Stärke-Information zurück
   */
  static getStrengthInfo(score) {
    switch (score) {
      case 0:
      case 1:
        return { text: 'Sehr schwach', color: 'error' };
      case 2:
        return { text: 'Schwach', color: 'warning' };
      case 3:
        return { text: 'Mittel', color: 'info' };
      case 4:
        return { text: 'Stark', color: 'success' };
      default:
        return { text: 'Unbekannt', color: 'error' };
    }
  }

  /**
   * Generiert Passwort-Tipps
   */
  static getPasswordTips() {
    return [
      '🔤 Mindestens 8 Zeichen verwenden',
      '🔠 Groß- und Kleinbuchstaben kombinieren',
      '🔢 Zahlen hinzufügen (0-9)',
      '🎯 Sonderzeichen verwenden (@$!%*?&)',
      '🚫 Persönliche Informationen vermeiden',
      '💡 Einzigartige Passphrase erstellen'
    ];
  }
}

export default PasswordValidator;