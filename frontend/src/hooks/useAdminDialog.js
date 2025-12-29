import { useState, useCallback } from 'react';

/**
 * Hook für Dialog-Management in Admin-Komponenten
 * Standardisiert Dialog-States und -Operationen
 */
export const useAdminDialog = (initialState = {}) => {
  const [dialogs, setDialogs] = useState({
    create: false,
    edit: false,
    delete: false,
    view: false,
    ...initialState
  });

  const [selectedItem, setSelectedItem] = useState(null);
  const [formData, setFormData] = useState({});

  // Einzelner Dialog öffnen
  const openDialog = useCallback((dialogType, item = null, initialFormData = {}) => {
    setDialogs(prev => ({ ...prev, [dialogType]: true }));
    setSelectedItem(item);
    setFormData(item ? { ...item, ...initialFormData } : initialFormData);
  }, []);

  // Einzelner Dialog schließen
  const closeDialog = useCallback((dialogType) => {
    setDialogs(prev => ({ ...prev, [dialogType]: false }));
    if (!Object.values({...dialogs, [dialogType]: false}).some(Boolean)) {
      // Nur zurücksetzen wenn alle Dialoge geschlossen sind
      setSelectedItem(null);
      setFormData({});
    }
  }, [dialogs]);

  // Alle Dialoge schließen
  const closeAllDialogs = useCallback(() => {
    setDialogs(Object.keys(dialogs).reduce((acc, key) => ({ ...acc, [key]: false }), {}));
    setSelectedItem(null);
    setFormData({});
  }, [dialogs]);

  // Create-Dialog
  const openCreateDialog = useCallback((initialData = {}) => {
    openDialog('create', null, initialData);
  }, [openDialog]);

  const closeCreateDialog = useCallback(() => {
    closeDialog('create');
  }, [closeDialog]);

  // Edit-Dialog
  const openEditDialog = useCallback((item) => {
    openDialog('edit', item);
  }, [openDialog]);

  const closeEditDialog = useCallback(() => {
    closeDialog('edit');
  }, [closeDialog]);

  // Delete-Dialog
  const openDeleteDialog = useCallback((item) => {
    openDialog('delete', item);
  }, [openDialog]);

  const closeDeleteDialog = useCallback(() => {
    closeDialog('delete');
  }, [closeDialog]);

  // View-Dialog
  const openViewDialog = useCallback((item) => {
    openDialog('view', item);
  }, [openDialog]);

  const closeViewDialog = useCallback(() => {
    closeDialog('view');
  }, [closeDialog]);

  // Form-Updates
  const updateFormData = useCallback((updates) => {
    setFormData(prev => ({ ...prev, ...updates }));
  }, []);

  const updateFormField = useCallback((field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  }, []);

  const resetFormData = useCallback((newData = {}) => {
    setFormData(newData);
  }, []);

  // Hilfsfunktionen
  const isEditing = selectedItem !== null;
  const hasOpenDialogs = Object.values(dialogs).some(Boolean);

  return {
    // Dialog States
    dialogs,
    selectedItem,
    formData,
    
    // General Dialog Actions
    openDialog,
    closeDialog,
    closeAllDialogs,
    
    // Specific Dialog Actions
    openCreateDialog,
    closeCreateDialog,
    openEditDialog,
    closeEditDialog,
    openDeleteDialog,
    closeDeleteDialog,
    openViewDialog,
    closeViewDialog,
    
    // Form Actions
    updateFormData,
    updateFormField,
    resetFormData,
    
    // Helper Properties
    isEditing,
    hasOpenDialogs,
    isCreateOpen: dialogs.create,
    isEditOpen: dialogs.edit,
    isDeleteOpen: dialogs.delete,
    isViewOpen: dialogs.view
  };
};

/**
 * Hook für Confirmation-Dialoge (z.B. Löschen)
 */
export const useConfirmationDialog = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [config, setConfig] = useState({
    title: 'Bestätigung',
    message: 'Sind Sie sicher?',
    confirmText: 'Bestätigen',
    cancelText: 'Abbrechen',
    onConfirm: () => {},
    severity: 'warning'
  });

  const openConfirmation = useCallback((newConfig) => {
    setConfig(prev => ({ ...prev, ...newConfig }));
    setIsOpen(true);
  }, []);

  const closeConfirmation = useCallback(() => {
    setIsOpen(false);
  }, []);

  const handleConfirm = useCallback(async () => {
    try {
      await config.onConfirm();
      closeConfirmation();
    } catch (error) {
      console.error('Confirmation action failed:', error);
      // Dialog bleibt offen bei Fehler
    }
  }, [config, closeConfirmation]);

  return {
    isOpen,
    config,
    openConfirmation,
    closeConfirmation,
    handleConfirm
  };
};

export default useAdminDialog;