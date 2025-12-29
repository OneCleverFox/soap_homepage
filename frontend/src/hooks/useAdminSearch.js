import { useState, useMemo } from 'react';

/**
 * Hook für Search-Funktionalität in Admin-Komponenten
 * @param {Array} items - Array der zu durchsuchenden Items
 * @param {Array} searchFields - Array der Felder, die durchsucht werden sollen
 * @param {number} debounceDelay - Debounce-Delay in ms (default: 300)
 * @returns {Object} Search state und filtered items
 */
export const useAdminSearch = (items = [], searchFields = ['name'], debounceDelay = 300) => {
  const [searchTerm, setSearchTerm] = useState('');

  // Gefilterte Items basierend auf Suchbegriff
  const filteredItems = useMemo(() => {
    if (!searchTerm || !searchTerm.trim()) {
      return items;
    }

    const lowerSearchTerm = searchTerm.toLowerCase();
    
    return items.filter(item => {
      return searchFields.some(field => {
        // Nested field support (z.B. 'kunde.name')
        const fieldValue = field.split('.').reduce((obj, key) => obj?.[key], item);
        
        if (fieldValue === null || fieldValue === undefined) {
          return false;
        }
        
        return String(fieldValue).toLowerCase().includes(lowerSearchTerm);
      });
    });
  }, [items, searchTerm, searchFields]);

  const clearSearch = () => setSearchTerm('');
  
  const hasSearchTerm = searchTerm && searchTerm.trim().length > 0;

  return {
    searchTerm,
    setSearchTerm,
    filteredItems,
    clearSearch,
    hasSearchTerm,
    resultsCount: filteredItems.length,
    totalCount: items.length
  };
};

export default useAdminSearch;