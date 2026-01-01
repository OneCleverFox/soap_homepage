import React from 'react';
import {
  Box,
  CircularProgress,
  Typography,
  Alert,
  Button,
  LinearProgress
} from '@mui/material';
import { Wifi as WifiIcon, WifiOff as WifiOffIcon, Refresh as RefreshIcon } from '@mui/icons-material';

const NetworkAwareLoader = ({ 
  isLoading, 
  error, 
  onRetry, 
  isOnline = true, 
  isSlowConnection = false,
  retryCount = 0,
  children 
}) => {
  // Zeige Inhalt wenn alles OK
  if (!isLoading && !error) {
    return children;
  }

  // Offline-Status
  if (!isOnline) {
    return (
      <Box
        display="flex"
        flexDirection="column"
        alignItems="center"
        justifyContent="center"
        minHeight="200px"
        p={3}
        textAlign="center"
      >
        <WifiOffIcon sx={{ fontSize: 48, color: 'warning.main', mb: 2 }} />
        <Typography variant="h6" gutterBottom>
          Keine Internetverbindung
        </Typography>
        <Typography color="text.secondary" gutterBottom>
          Bitte überprüfen Sie Ihre Netzwerkverbindung
        </Typography>
        <Button
          variant="outlined"
          startIcon={<RefreshIcon />}
          onClick={onRetry}
          sx={{ mt: 2 }}
        >
          Erneut versuchen
        </Button>
      </Box>
    );
  }

  // Fehler-Status
  if (error) {
    return (
      <Box p={3}>
        <Alert 
          severity="error" 
          action={
            <Button
              size="small"
              startIcon={<RefreshIcon />}
              onClick={onRetry}
            >
              Wiederholen
            </Button>
          }
        >
          <Typography variant="subtitle2" gutterBottom>
            {error}
          </Typography>
          {retryCount > 0 && (
            <Typography variant="caption" color="text.secondary">
              Fehlerversuche: {retryCount}
            </Typography>
          )}
        </Alert>
      </Box>
    );
  }

  // Loading-Status
  return (
    <Box
      display="flex"
      flexDirection="column"
      alignItems="center"
      justifyContent="center"
      minHeight="200px"
      p={3}
    >
      {isSlowConnection && (
        <Box width="100%" mb={2}>
          <Alert severity="info" sx={{ mb: 2 }}>
            <Typography variant="body2">
              Langsame Verbindung erkannt - Ladevorgang kann etwas dauern
            </Typography>
          </Alert>
          <LinearProgress />
        </Box>
      )}
      
      <CircularProgress size={40} />
      
      <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
        {isSlowConnection 
          ? 'Daten werden geladen... Dies kann bei langsamer Verbindung etwas dauern'
          : 'Produkte werden geladen...'
        }
      </Typography>
      
      <Box display="flex" alignItems="center" mt={1}>
        <WifiIcon sx={{ fontSize: 16, mr: 0.5, color: 'success.main' }} />
        <Typography variant="caption" color="text.secondary">
          Verbunden
        </Typography>
      </Box>
    </Box>
  );
};

export default NetworkAwareLoader;