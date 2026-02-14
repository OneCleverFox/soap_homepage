/**
 * Cache-Invalidierung Utilities für Produkt-Cache
 * 
 * Verwaltet die Synchronisation zwischen Admin-Änderungen und Kunden-Cache
 */

const CACHE_VERSION_KEY = 'productsLastModified';

/**
 * Markiert den Produkt-Cache als veraltet durch Setzen eines neuen Timestamps
 * Rufe diese Funktion auf, wenn Admin Änderungen macht die Kunden sehen sollen
 * 
 * @param {string} reason - Optional: Beschreibung der Änderung für Debugging
 */
export const invalidateProductsCache = (reason = 'Admin update') => {
  const timestamp = Date.now();
  try {
    localStorage.setItem(CACHE_VERSION_KEY, timestamp.toString());
    console.log(`🔄 Products cache invalidated: ${reason} (${new Date(timestamp).toISOString()})`);
  } catch (err) {
    console.warn('⚠️ Could not invalidate products cache:', err);
  }
};

/**
 * Prüft ob der sessionStorage Cache noch gültig ist basierend auf der letzten Admin-Änderung
 * 
 * @param {number} cacheTimestamp - Timestamp des aktuellen Caches
 * @returns {boolean} true wenn Cache noch gültig ist, false wenn neu geladen werden muss
 */
export const isCacheValid = (cacheTimestamp) => {
  try {
    const lastModified = localStorage.getItem(CACHE_VERSION_KEY);
    
    // Wenn keine Admin-Änderung verzeichnet ist, ist Cache gültig
    if (!lastModified) {
      return true;
    }
    
    const lastModifiedTime = parseInt(lastModified, 10);
    
    // Cache ist ungültig wenn er älter als letzte Änderung ist
    if (cacheTimestamp < lastModifiedTime) {
      console.log(`⚠️ Cache is outdated. Cache: ${new Date(cacheTimestamp).toISOString()}, Last modified: ${new Date(lastModifiedTime).toISOString()}`);
      return false;
    }
    
    return true;
  } catch (err) {
    console.warn('⚠️ Could not check cache validity:', err);
    return true; // Im Zweifelsfall Cache verwenden
  }
};

/**
 * Holt den Timestamp der letzten Produkt-Änderung
 * 
 * @returns {number|null} Timestamp oder null wenn keine Änderung verzeichnet
 */
export const getLastModifiedTimestamp = () => {
  try {
    const timestamp = localStorage.getItem(CACHE_VERSION_KEY);
    return timestamp ? parseInt(timestamp, 10) : null;
  } catch (err) {
    console.warn('⚠️ Could not get last modified timestamp:', err);
    return null;
  }
};

/**
 * Löscht die Cache-Version (nur für Testing/Debugging)
 */
export const clearCacheVersion = () => {
  try {
    localStorage.removeItem(CACHE_VERSION_KEY);
    console.log('🗑️ Cache version cleared');
  } catch (err) {
    console.warn('⚠️ Could not clear cache version:', err);
  }
};
