import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  IconButton,
  Slide,
  useTheme,
  useMediaQuery,
  FormControlLabel,
  Switch,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Divider,
  Chip
} from '@mui/material';
import { Close, ExpandMore, Settings, Info } from '@mui/icons-material';

const CookieConsent = () => {
  const [showBanner, setShowBanner] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [cookieSettings, setCookieSettings] = useState({
    necessary: true,
    functional: false,
    analytics: false,
    marketing: false
  });
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  useEffect(() => {
    // Check if user has already given consent
    const hasConsent = localStorage.getItem('cookieConsent');
    const savedSettings = localStorage.getItem('cookieSettings');
    
    if (savedSettings) {
      setCookieSettings(JSON.parse(savedSettings));
    }
    
    if (!hasConsent) {
      // DSGVO-KONFORM: Banner SOFORT zeigen ohne Delay
      setShowBanner(true);
    }
  }, []);

  const saveCookieSettings = (settings) => {
    localStorage.setItem('cookieConsent', 'configured');
    localStorage.setItem('cookieSettings', JSON.stringify(settings));
    
    // Bereinige nicht-erlaubte Daten sofort
    clearNonConsentedData(settings);
    
    // Emit custom event für andere Komponenten
    window.dispatchEvent(new CustomEvent('cookieSettingsChanged', {
      detail: settings
    }));
  };

  // DSGVO: Lösche alle nicht-erlaubten Daten
  const clearNonConsentedData = (settings) => {
    const keysToCheck = [];
    
    // Sammle alle LocalStorage-Keys
    for (let i = 0; i < localStorage.length; i++) {
      keysToCheck.push(localStorage.key(i));
    }

    // Definiere notwendige Keys (diese bleiben immer)
    const necessaryKeys = ['token', 'user', 'cookieConsent', 'cookieSettings'];
    
    // Definiere funktionale Keys (nur mit Einwilligung)
    const functionalKeys = [
      'admin_inquiries_last_viewed',
      'orders_last_viewed_',
      'inquiries_last_viewed_',
      'cachedProducts',
      'portfolioCache'
    ];

    keysToCheck.forEach(key => {
      if (necessaryKeys.includes(key)) return; // Notwendige bleiben
      
      const isFunctionalKey = functionalKeys.some(pattern => key.includes(pattern));
      
      if (isFunctionalKey && !settings.functional) {
        console.log(`🧹 DSGVO: Removing non-consented functional data: ${key}`);
        localStorage.removeItem(key);
      }
    });
  };

  const handleAcceptAll = () => {
    const allAccepted = {
      necessary: true,
      functional: true,
      analytics: true,
      marketing: true
    };
    setCookieSettings(allAccepted);
    saveCookieSettings(allAccepted);
    setShowBanner(false);
  };

  const handleAcceptNecessary = () => {
    const necessaryOnly = {
      necessary: true,
      functional: false,
      analytics: false,
      marketing: false
    };
    setCookieSettings(necessaryOnly);
    saveCookieSettings(necessaryOnly);
    setShowBanner(false);
  };

  const handleSaveSettings = () => {
    saveCookieSettings(cookieSettings);
    setShowSettings(false);
    setShowBanner(false);
  };

  const handleToggleSetting = (category) => {
    if (category === 'necessary') return; // Notwendige Cookies können nicht deaktiviert werden
    
    setCookieSettings(prev => ({
      ...prev,
      [category]: !prev[category]
    }));
  };

  const handleClose = () => {
    setShowBanner(false);
  };

  if (!showBanner) return null;

  const cookieCategories = [
    {
      id: 'necessary',
      title: 'Technisch notwendig',
      description: 'Diese Cookies sind für die Grundfunktionen der Website erforderlich.',
      examples: 'Warenkorb, Anmeldung, Sicherheit',
      required: true
    },
    {
      id: 'functional', 
      title: 'Funktional',
      description: 'Diese Cookies ermöglichen erweiterte Funktionen und Personalisierung.',
      examples: 'Spracheinstellungen, Benutzereinstellungen',
      required: false
    },
    {
      id: 'analytics',
      title: 'Analyse',
      description: 'Diese Cookies helfen uns zu verstehen, wie Besucher unsere Website nutzen.',
      examples: 'Besucherstatistiken, Leistungsanalyse (derzeit nicht verwendet)',
      required: false
    },
    {
      id: 'marketing',
      title: 'Marketing',
      description: 'Diese Cookies werden für personalisierte Werbung verwendet.',
      examples: 'Werbung, Social Media (derzeit nicht verwendet)',
      required: false
    }
  ];

  return (
    <>
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
                  Wir verwenden Cookies und ähnliche Technologien. Einige sind technisch notwendig, 
                  andere optional. Sie können Ihre Einwilligung jederzeit widerrufen.
                </Typography>              <Typography variant="body2" color="text.secondary" sx={{ 
                bgcolor: 'warning.light', 
                p: 1, 
                borderRadius: 1, 
                mb: 1,
                fontSize: '0.85rem'
              }}>
                ⚠️ <strong>DSGVO-Hinweis:</strong> Ohne Ihre Einwilligung werden nur technisch notwendige 
                Cookies verwendet. Tracking und Analyse sind deaktiviert.
              </Typography>                <Typography variant="body2" color="text.secondary">
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
                onClick={handleAcceptAll}
                sx={{ 
                  minWidth: isMobile ? 'auto' : '140px',
                  textTransform: 'none'
                }}
              >
                Alle akzeptieren
              </Button>
              <Button
                variant="outlined"
                onClick={handleAcceptNecessary}
                sx={{ 
                  minWidth: isMobile ? 'auto' : '140px',
                  textTransform: 'none'
                }}
              >
                Nur notwendige
              </Button>
              <Button
                variant="text"
                startIcon={<Settings />}
                onClick={() => setShowSettings(true)}
                sx={{ 
                  minWidth: isMobile ? 'auto' : '120px',
                  textTransform: 'none'
                }}
              >
                Einstellungen
              </Button>
              {!isMobile && (
                <Typography 
                  variant="caption" 
                  color="text.secondary"
                  sx={{ ml: 'auto' }}
                >
                  DSGVO-konform
                </Typography>
              )}
            </Box>
          </Box>
        </Paper>
      </Slide>

      {/* Cookie-Einstellungen Dialog */}
      <Dialog 
        open={showSettings} 
        onClose={() => setShowSettings(false)}
        maxWidth="md" 
        fullWidth
      >
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Settings />
          Cookie-Einstellungen verwalten
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" paragraph>
            Sie können hier granular einstellen, welche Cookie-Kategorien Sie zulassen möchten.
            Technisch notwendige Cookies können nicht deaktiviert werden.
          </Typography>
          
          {cookieCategories.map((category, index) => (
            <Box key={category.id} sx={{ mb: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Typography variant="subtitle1" fontWeight="medium">
                    {category.title}
                  </Typography>
                  {category.required && (
                    <Chip label="Erforderlich" size="small" variant="filled" color="primary" />
                  )}
                </Box>
                <FormControlLabel
                  control={
                    <Switch
                      checked={cookieSettings[category.id]}
                      onChange={() => handleToggleSetting(category.id)}
                      disabled={category.required}
                      color="primary"
                    />
                  }
                  label=""
                />
              </Box>
              <Typography variant="body2" color="text.secondary" paragraph>
                {category.description}
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                Beispiele: {category.examples}
              </Typography>
              {index < cookieCategories.length - 1 && <Divider sx={{ mt: 2 }} />}
            </Box>
          ))}
          
          <Box sx={{ mt: 3, p: 2, bgcolor: 'action.hover', borderRadius: 1 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
              <Info fontSize="small" color="primary" />
              <Typography variant="subtitle2">Ihre Rechte</Typography>
            </Box>
            <Typography variant="caption" color="text.secondary">
              Sie können Ihre Cookie-Einstellungen jederzeit ändern oder widerrufen. 
              Bereits gesetzte Cookies werden entsprechend Ihrer neuen Einstellung behandelt.
            </Typography>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowSettings(false)}>
            Abbrechen
          </Button>
          <Button variant="contained" onClick={handleSaveSettings}>
            Einstellungen speichern
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default CookieConsent;