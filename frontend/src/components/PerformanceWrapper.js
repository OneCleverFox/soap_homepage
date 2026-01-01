import React from 'react';
import {
  Alert,
  Box,
  Button,
  Container,
  Typography,
  useMediaQuery,
  useTheme
} from '@mui/material';
import { Refresh as RefreshIcon } from '@mui/icons-material';
import NetworkAwareLoader from '../components/NetworkAwareLoader';

// Wrapper-Komponente für bessere Performance und Network-Handling
const PerformanceWrapper = ({ 
  children, 
  isLoading, 
  error, 
  onRetry, 
  isOnline = true,
  isSlowConnection = false,
  retryCount = 0,
  showRetryButton = true,
  minHeight = "400px"
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  // Zeige NetworkAwareLoader bei Loading oder kritischen Fehlern
  if (isLoading || (error && !children)) {
    return (
      <Container maxWidth="lg" sx={{ py: isMobile ? 2 : 4 }}>
        <NetworkAwareLoader
          isLoading={isLoading}
          error={error}
          onRetry={onRetry}
          isOnline={isOnline}
          isSlowConnection={isSlowConnection}
          retryCount={retryCount}
        />
      </Container>
    );
  }

  // Bei Hintergrundfehlern: Zeige Inhalt mit Warning
  if (error && children) {
    return (
      <Container maxWidth="lg" sx={{ py: isMobile ? 2 : 4 }}>
        {/* Zeige Warnung bei Hintergrundfehlern */}
        <Box mb={2}>
          <Alert 
            severity="warning"
            action={
              showRetryButton && (
                <Button
                  color="inherit"
                  size="small"
                  startIcon={<RefreshIcon />}
                  onClick={onRetry}
                >
                  Aktualisieren
                </Button>
              )
            }
          >
            <Typography variant="body2">
              {isOnline 
                ? 'Daten eventuell nicht aktuell. Verbindung zum Server problematisch.'
                : 'Offline-Modus: Zeige gespeicherte Daten.'
              }
            </Typography>
          </Alert>
        </Box>
        {children}
      </Container>
    );
  }

  // Normaler Fall: Zeige Inhalt
  return (
    <Container maxWidth="lg" sx={{ py: isMobile ? 2 : 4 }}>
      {children}
    </Container>
  );
};

export default PerformanceWrapper;