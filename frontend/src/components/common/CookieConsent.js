import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  IconButton,
  Slide,
  useTheme,
  useMediaQuery
} from '@mui/material';
import { Close } from '@mui/icons-material';

const CookieConsent = () => {
  const [showBanner, setShowBanner] = useState(false);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  useEffect(() => {
    // Check if user has already given consent
    const hasConsent = localStorage.getItem('cookieConsent');
    if (!hasConsent) {
      // Show banner after a short delay
      const timer = setTimeout(() => {
        setShowBanner(true);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleAccept = () => {
    localStorage.setItem('cookieConsent', 'accepted');
    setShowBanner(false);
  };

  const handleDecline = () => {
    localStorage.setItem('cookieConsent', 'declined');
    setShowBanner(false);
  };

  const handleClose = () => {
    setShowBanner(false);
  };

  if (!showBanner) return null;

  return (
    <Slide direction="up" in={showBanner} mountOnEnter unmountOnExit>
      <Paper
        elevation={8}
        sx={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: 9999,
          p: 3,
          borderRadius: '16px 16px 0 0',
          bgcolor: 'background.paper',
          borderTop: '3px solid',
          borderColor: 'primary.main'
        }}
      >
        <Box sx={{ maxWidth: '1200px', mx: 'auto' }}>
          <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
            <Box sx={{ flexGrow: 1 }}>
              <Typography variant="h6" gutterBottom>
                🍪 Cookie-Einstellungen
              </Typography>
              <Typography variant="body2" color="text.secondary" paragraph>
                Wir verwenden Cookies und ähnliche Technologien, um Ihnen die 
                bestmögliche Nutzererfahrung zu bieten. Einige Cookies sind für 
                den Betrieb der Website erforderlich, andere helfen uns dabei, 
                diese Website und Ihre Erfahrung zu verbessern.
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Weitere Informationen finden Sie in unserer{' '}
                <Button
                  component="a"
                  href="/datenschutz"
                  size="small"
                  sx={{ 
                    textTransform: 'none',
                    p: 0,
                    minWidth: 'auto',
                    textDecoration: 'underline'
                  }}
                >
                  Datenschutzerklärung
                </Button>
                .
              </Typography>
            </Box>
            
            <IconButton 
              onClick={handleClose}
              size="small"
              sx={{ 
                opacity: 0.7,
                '&:hover': { opacity: 1 }
              }}
            >
              <Close />
            </IconButton>
          </Box>

          <Box 
            sx={{ 
              display: 'flex', 
              gap: 2, 
              mt: 3,
              flexDirection: isMobile ? 'column' : 'row',
              alignItems: isMobile ? 'stretch' : 'center'
            }}
          >
            <Button
              variant="contained"
              onClick={handleAccept}
              sx={{ 
                minWidth: isMobile ? 'auto' : '120px',
                textTransform: 'none'
              }}
            >
              Alle akzeptieren
            </Button>
            <Button
              variant="outlined"
              onClick={handleDecline}
              sx={{ 
                minWidth: isMobile ? 'auto' : '120px',
                textTransform: 'none'
              }}
            >
              Nur notwendige
            </Button>
            <Typography 
              variant="caption" 
              color="text.secondary"
              sx={{ 
                ml: isMobile ? 0 : 'auto',
                textAlign: isMobile ? 'center' : 'right'
              }}
            >
              Sie können Ihre Einstellungen jederzeit ändern
            </Typography>
          </Box>
        </Box>
      </Paper>
    </Slide>
  );
};

export default CookieConsent;