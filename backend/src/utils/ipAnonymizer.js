/**
 * IP-Anonymisierung für DSGVO-Compliance
 * 
 * Diese Utility implementiert IP-Anonymisierung nach Art. 25 DSGVO (Privacy by Design).
 * 
 * RECHTLICHE GRUNDLAGEN:
 * - Art. 4 Nr. 1 DSGVO: IP-Adressen sind personenbezogene Daten
 * - Art. 5 Abs. 1 lit. c DSGVO: Datenminimierung 
 * - Art. 25 DSGVO: Datenschutz durch Technikgestaltung (Privacy by Design)
 * - ErwGr. 26 DSGVO: Anonymisierung entfernt Personenbezug
 * 
 * ANONYMISIERUNGSMETHODEN:
 * - IPv4: Letztes Oktett auf 0 setzen (z.B. 192.168.1.123 → 192.168.1.0)  
 * - IPv6: Letzten 64 Bit auf 0 setzen (Interface-ID entfernen)
 * - IPv6-in-IPv4: IPv4-Teil anonymisieren
 * 
 * DATENSCHUTZZIELE:
 * ✅ Keine Rückverfolgung zu individuellen Nutzern möglich
 * ✅ Geographische/ISP-Information bleibt für Analytik erhalten
 * ✅ Technische Funktionalität (Rate-Limiting, etc.) weiterhin möglich
 * ✅ Irreversible Anonymisierung (kein Hashing!)
 */

class IPAnonymizer {
  /**
   * Anonymisiert eine IP-Adresse DSGVO-konform
   * @param {string} ipAddress - Die zu anonymisierende IP-Adresse
   * @param {boolean} [fullAnonymization=false] - Bei true: Vollständige Anonymisierung für Logs
   * @returns {string} Anonymisierte IP-Adresse oder Platzhalter
   */
  static anonymizeIP(ipAddress, fullAnonymization = false) {
    if (!ipAddress || ipAddress === 'unknown' || ipAddress === '::1' || ipAddress === '127.0.0.1') {
      return fullAnonymization ? '[LOCAL]' : ipAddress;
    }

    // Vollständige Anonymisierung für Logs (keine IP-Daten speichern)
    if (fullAnonymization) {
      // Nur Typ beibehalten für technische Analyse
      if (this.isIPv6(ipAddress)) {
        return '[IPv6-CLIENT]';
      } else {
        return '[IPv4-CLIENT]';
      }
    }

    // Standard-Anonymisierung (für operative Zwecke)
    if (this.isIPv6(ipAddress)) {
      return this.anonymizeIPv6(ipAddress);
    } else {
      return this.anonymizeIPv4(ipAddress);
    }
  }

  /**
   * IPv4-Anonymisierung: Letztes Oktett entfernen
   * @param {string} ipv4 - IPv4-Adresse
   * @returns {string} Anonymisierte IPv4-Adresse
   */
  static anonymizeIPv4(ipv4) {
    // IPv6-mapped IPv4 behandeln (::ffff:192.168.1.1)
    if (ipv4.includes('::ffff:')) {
      const mappedIP = ipv4.split('::ffff:')[1];
      const anonymizedIPv4 = this.anonymizeIPv4(mappedIP);
      return `::ffff:${anonymizedIPv4}`;
    }

    const parts = ipv4.split('.');
    if (parts.length !== 4) {
      return '[INVALID-IP]';
    }

    // Letztes Oktett auf 0 setzen
    parts[3] = '0';
    return parts.join('.');
  }

  /**
   * IPv6-Anonymisierung: Interface-ID entfernen (letzten 64 Bit)
   * @param {string} ipv6 - IPv6-Adresse  
   * @returns {string} Anonymisierte IPv6-Adresse
   */
  static anonymizeIPv6(ipv6) {
    // Normalisierung für verschiedene IPv6-Formate
    let normalized = ipv6.toLowerCase().trim();
    
    // IPv6-mapped IPv4 behandeln
    if (normalized.includes('::ffff:')) {
      const mappedIP = normalized.split('::ffff:')[1];
      const anonymizedIPv4 = this.anonymizeIPv4(mappedIP);
      return `::ffff:${anonymizedIPv4}`;
    }

    // Standard IPv6-Behandlung
    // Interface-ID entfernen (letzten 64 Bit = 4 Blöcke)
    try {
      // Expandiere verkürzte Notation
      const expanded = this.expandIPv6(normalized);
      const blocks = expanded.split(':');
      
      if (blocks.length !== 8) {
        return '[INVALID-IPv6]';
      }

      // Erste 4 Blöcke (Netzwerk-Präfix) behalten, Rest anonymisieren
      return `${blocks.slice(0, 4).join(':')}:0000:0000:0000:0000`;
      
    } catch (error) {
      return '[IPv6-PARSE-ERROR]';
    }
  }

  /**
   * Prüft ob eine Adresse IPv6 ist
   * @param {string} ip - IP-Adresse
   * @returns {boolean} true wenn IPv6
   */
  static isIPv6(ip) {
    return ip.includes(':');
  }

  /**
   * Expandiert verkürzte IPv6-Notation für einheitliche Verarbeitung
   * @param {string} ipv6 - IPv6 in beliebiger gültiger Notation
   * @returns {string} Vollständig expandierte IPv6-Adresse
   */
  static expandIPv6(ipv6) {
    // Handle double colon expansion
    if (ipv6.includes('::')) {
      const parts = ipv6.split('::');
      const left = parts[0] ? parts[0].split(':') : [];
      const right = parts[1] ? parts[1].split(':') : [];
      
      const totalBlocks = 8;
      const missingBlocks = totalBlocks - left.length - right.length;
      
      const middle = Array(missingBlocks).fill('0000');
      const expanded = [...left, ...middle, ...right];
      
      return expanded.map(block => block.padStart(4, '0')).join(':');
    }
    
    // Already fully expanded or short form
    return ipv6.split(':').map(block => block.padStart(4, '0')).join(':');
  }

  /**
   * DSGVO-konforme Anonymisierung für Performance-Logs
   * Entfernt alle personenbezogenen Daten aus Request-Metadaten
   * @param {Object} requestData - Original Request-Daten
   * @returns {Object} Anonymisierte Request-Daten
   */
  static anonymizeRequestData(requestData) {
    return {
      ...requestData,
      // IP vollständig anonymisieren für Logs
      ip: this.anonymizeIP(requestData.ip, true),
      // User-Agent entfernen (kann zum Fingerprinting genutzt werden)
      userAgent: requestData.userAgent ? '[USER-AGENT-REMOVED]' : undefined,
      // Andere potentiell personenbezogene Daten
      headers: undefined, // Request-Headers können personenbezogene Daten enthalten
      cookies: undefined  // Cookies sind personenbezogene Daten
    };
  }

  /**
   * DSGVO-konforme Anonymisierung für Error-Logs
   * @param {Object} errorData - Original Error-Daten
   * @returns {Object} Anonymisierte Error-Daten
   */
  static anonymizeErrorData(errorData) {
    return {
      ...errorData,
      // IP vollständig anonymisieren
      ip: this.anonymizeIP(errorData.ip, true),
      // User-Agent entfernen
      userAgent: '[REMOVED-FOR-PRIVACY]',
      // URL-Parameter könnten personenbezogene Daten enthalten
      url: errorData.url ? this.sanitizeUrl(errorData.url) : undefined
    };
  }

  /**
   * Entfernt potentiell personenbezogene Daten aus URLs
   * @param {string} url - Original URL
   * @returns {string} Bereinigte URL
   */
  static sanitizeUrl(url) {
    try {
      const urlObj = new URL(url, 'http://example.com');
      
      // Query-Parameter entfernen (können personenbezogene Daten enthalten)
      urlObj.search = '';
      
      // Nur Pfad behalten
      return urlObj.pathname;
    } catch (error) {
      return '[URL-PARSE-ERROR]';
    }
  }

  /**
   * Prüft ob eine IP-Adresse bereits anonymisiert ist
   * @param {string} ip - Zu prüfende IP-Adresse
   * @returns {boolean} true wenn bereits anonymisiert
   */
  static isAnonymized(ip) {
    if (!ip) return false;
    
    // Placeholder-IPs sind bereits anonymisiert
    if (ip.startsWith('[') && ip.endsWith(']')) {
      return true;
    }
    
    // IPv4: Prüfe ob letztes Oktett 0 ist
    if (!this.isIPv6(ip) && ip.includes('.')) {
      const parts = ip.split('.');
      return parts.length === 4 && parts[3] === '0';
    }
    
    // IPv6: Prüfe ob Interface-ID entfernt ist
    if (this.isIPv6(ip)) {
      return ip.endsWith(':0000:0000:0000:0000') || ip.includes('[IPv6');
    }
    
    return false;
  }
}

module.exports = { IPAnonymizer };