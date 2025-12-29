import { useState, useMemo } from 'react';

/**
 * Hook für Pagination und Filtering in Admin-Komponenten
 * @param {Array} items - Array der Items 
 * @param {number} itemsPerPage - Items pro Seite (default: 10)
 * @param {Object} initialFilters - Initial filter values
 * @returns {Object} Pagination state und filtered/paginated items
 */
export const useAdminPagination = (items = [], itemsPerPage = 10, initialFilters = {}) => {
  const [currentPage, setCurrentPage] = useState(1);
  const [filters, setFilters] = useState(initialFilters);
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });

  // Gefilterte Items
  const filteredItems = useMemo(() => {
    return items.filter(item => {
      return Object.entries(filters).every(([key, value]) => {
        if (!value || value === '') return true;
        
        // Nested field support
        const itemValue = key.split('.').reduce((obj, k) => obj?.[k], item);
        
        if (typeof value === 'string') {
          return String(itemValue).toLowerCase().includes(value.toLowerCase());
        }
        
        return itemValue === value;
      });
    });
  }, [items, filters]);

  // Sortierte Items
  const sortedItems = useMemo(() => {
    if (!sortConfig.key) return filteredItems;

    return [...filteredItems].sort((a, b) => {
      const aValue = sortConfig.key.split('.').reduce((obj, key) => obj?.[key], a);
      const bValue = sortConfig.key.split('.').reduce((obj, key) => obj?.[key], b);

      if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
  }, [filteredItems, sortConfig]);

  // Paginierte Items
  const paginatedItems = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return sortedItems.slice(startIndex, endIndex);
  }, [sortedItems, currentPage, itemsPerPage]);

  // Total pages
  const totalPages = Math.ceil(sortedItems.length / itemsPerPage);

  // Helper functions
  const updateFilter = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setCurrentPage(1); // Reset to first page when filter changes
  };

  const clearFilters = () => {
    setFilters(initialFilters);
    setCurrentPage(1);
  };

  const handleSort = (key) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  const goToPage = (page) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  return {
    // Data
    items: paginatedItems,
    filteredItems: sortedItems,
    totalItems: items.length,
    filteredCount: sortedItems.length,
    
    // Pagination
    currentPage,
    totalPages,
    itemsPerPage,
    hasNextPage: currentPage < totalPages,
    hasPrevPage: currentPage > 1,
    
    // Actions
    goToPage,
    nextPage: () => goToPage(currentPage + 1),
    prevPage: () => goToPage(currentPage - 1),
    
    // Filters
    filters,
    updateFilter,
    clearFilters,
    hasActiveFilters: Object.values(filters).some(value => value && value !== ''),
    
    // Sorting
    sortConfig,
    handleSort,
    getSortDirection: (key) => sortConfig.key === key ? sortConfig.direction : null
  };
};

export default useAdminPagination;