import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  IconButton,
  Typography,
  Box
} from '@mui/material';
import { Close as CloseIcon } from '@mui/icons-material';

/**
 * Generische Admin Dialog Komponente
 * Reduziert Boilerplate für Standard-Dialoge
 */
const AdminDialog = ({
  open,
  onClose,
  title,
  children,
  actions,
  maxWidth = 'sm',
  fullWidth = true,
  showCloseButton = true,
  PaperProps,
  ...other
}) => {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth={maxWidth}
      fullWidth={fullWidth}
      PaperProps={PaperProps}
      {...other}
    >
      <DialogTitle
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          pb: 1
        }}
      >
        <Typography variant="h6" component="div">
          {title}
        </Typography>
        {showCloseButton && (
          <IconButton
            aria-label="close"
            onClick={onClose}
            sx={{
              color: (theme) => theme.palette.grey[500],
            }}
          >
            <CloseIcon />
          </IconButton>
        )}
      </DialogTitle>

      <DialogContent dividers>
        {children}
      </DialogContent>

      {actions && (
        <DialogActions sx={{ px: 3, py: 2 }}>
          {actions}
        </DialogActions>
      )}
    </Dialog>
  );
};

/**
 * Bestätigungs-Dialog für kritische Aktionen
 */
export const ConfirmationDialog = ({
  open,
  onClose,
  onConfirm,
  title = 'Bestätigung',
  message = 'Sind Sie sicher?',
  confirmText = 'Bestätigen',
  cancelText = 'Abbrechen',
  severity = 'warning',
  loading = false
}) => {
  const severityColors = {
    error: 'error',
    warning: 'warning', 
    info: 'info',
    success: 'success'
  };

  return (
    <AdminDialog
      open={open}
      onClose={onClose}
      title={title}
      maxWidth="xs"
      actions={
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button 
            onClick={onClose} 
            disabled={loading}
          >
            {cancelText}
          </Button>
          <Button
            onClick={onConfirm}
            color={severityColors[severity]}
            variant="contained"
            disabled={loading}
          >
            {confirmText}
          </Button>
        </Box>
      }
    >
      <Typography>
        {message}
      </Typography>
    </AdminDialog>
  );
};

/**
 * CRUD Dialog für Standard-Operationen
 */
export const CrudDialog = ({
  open,
  onClose,
  onSave,
  title,
  children,
  isEditing = false,
  loading = false,
  saveText = 'Speichern',
  cancelText = 'Abbrechen'
}) => {
  return (
    <AdminDialog
      open={open}
      onClose={onClose}
      title={`${isEditing ? 'Bearbeiten' : 'Erstellen'} - ${title}`}
      actions={
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button 
            onClick={onClose}
            disabled={loading}
          >
            {cancelText}
          </Button>
          <Button
            onClick={onSave}
            variant="contained"
            disabled={loading}
          >
            {saveText}
          </Button>
        </Box>
      }
    >
      {children}
    </AdminDialog>
  );
};

export default AdminDialog;