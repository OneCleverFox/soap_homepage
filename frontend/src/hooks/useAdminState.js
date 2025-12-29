import { useState, useCallback } from 'react';

/**
 * Custom Hook für Standard-Admin-States
 * Vereinheitlicht loading, error, snackbar Pattern
 */
export const useAdminState = (initialLoading = false) => {
  const [loading, setLoading] = useState(initialLoading);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [snackbar, setSnackbar] = useState({ 
    open: false, 
    message: '', 
    severity: 'success' 
  });

  const showSnackbar = useCallback((message, severity = 'success') => {
    setSnackbar({ open: true, message, severity });
  }, []);

  const hideSnackbar = useCallback(() => {
    setSnackbar(prev => ({ ...prev, open: false }));
  }, []);

  const clearError = useCallback(() => {
    setError('');
  }, []);

  const clearMessages = useCallback(() => {
    setError('');
    setSuccess('');
  }, []);

  const handleAsyncOperation = useCallback(async (operation, successMessage) => {
    try {
      setLoading(true);
      setError('');
      setSuccess('');
      const result = await operation();
      if (successMessage) {
        setSuccess(successMessage);
        showSnackbar(successMessage);
      }
      return result;
    } catch (err) {
      const errorMessage = err.response?.data?.message || err.message || 'Ein Fehler ist aufgetreten';
      setError(errorMessage);
      showSnackbar(errorMessage, 'error');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [showSnackbar]);

  return {
    loading,
    setLoading,
    error,
    setError,
    success,
    setSuccess,
    clearError,
    clearMessages,
    snackbar,
    showSnackbar,
    hideSnackbar,
    handleAsyncOperation
  };
};

/**
 * Custom Hook für CRUD-Operationen mit optimistischen Updates
 */
export const useCrudOperations = (apiService, resourceName = 'Eintrag') => {
  const adminState = useAdminState();
  const [data, setData] = useState([]);

  const loadData = useCallback(async (params = {}) => {
    return adminState.handleAsyncOperation(async () => {
      const response = await apiService.getAll(params);
      const result = response.data?.data || response.data || [];
      setData(result);
      return result;
    });
  }, [apiService, adminState]);

  const createItem = useCallback(async (itemData) => {
    return adminState.handleAsyncOperation(async () => {
      const response = await apiService.create(itemData);
      const newItem = response.data?.data || response.data;
      setData(prev => [...prev, newItem]);
      return newItem;
    }, `${resourceName} erfolgreich erstellt`);
  }, [apiService, resourceName, adminState]);

  const updateItem = useCallback(async (id, itemData) => {
    return adminState.handleAsyncOperation(async () => {
      const response = await apiService.update(id, itemData);
      const updatedItem = response.data?.data || response.data;
      setData(prev => prev.map(item => 
        item._id === id ? updatedItem : item
      ));
      return updatedItem;
    }, `${resourceName} erfolgreich aktualisiert`);
  }, [apiService, resourceName, adminState]);

  const deleteItem = useCallback(async (id) => {
    return adminState.handleAsyncOperation(async () => {
      await apiService.delete(id);
      setData(prev => prev.filter(item => item._id !== id));
    }, `${resourceName} erfolgreich gelöscht`);
  }, [apiService, resourceName, adminState]);

  return {
    data,
    setData,
    loadData,
    createItem,
    updateItem,
    deleteItem,
    ...adminState
  };
};