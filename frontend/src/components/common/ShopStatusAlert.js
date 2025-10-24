import React, { useState, useEffect } from 'react';
import { Alert, Typography, Box, Collapse } from '@mui/material';
import { LocalShipping, Build } from '@mui/icons-material';

const ShopStatusAlert = ({ persistent = false }) => {
  const [shopSettings, setShopSettings] = useState(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const loadShopSettings = async () => {
      try {
        const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
        const response = await fetch(`${apiUrl}/admin-settings/shop-status`);
        
        if (response.ok) {
          const data = await response.json();
          setShopSettings(data.status);
        }
      } catch (error) {
        console.error('❌ Error loading shop settings:', error);
      }
    };

    loadShopSettings();
  }, []);

  // Nicht anzeigen wenn dismisst (außer persistent)
  if (dismissed && !persistent) {
    return null;
  }

  // Urlaubs-Benachrichtigung
  if (shopSettings?.shop === 'vacation') {
    // Datums-Formatierung
    const formatDate = (dateString) => {
      if (!dateString) return '';
      try {
        return new Date(dateString).toLocaleDateString('de-DE', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric'
        });
      } catch {
        return '';
      }
    };

    const startDate = shopSettings?.vacation?.startDate;
    const endDate = shopSettings?.vacation?.endDate;
    const hasValidDates = startDate && endDate;

    return (
      <Collapse in={!dismissed || persistent}>
        <Alert 
          severity="info" 
          sx={{ 
            mb: 3, 
            backgroundColor: '#e3f2fd',
            '& .MuiAlert-icon': { color: '#1976d2' },
            '& .MuiAlert-message': { fontWeight: 'medium' }
          }}
          icon={<LocalShipping />}
          onClose={persistent ? undefined : () => setDismissed(true)}
        >
          <Box>
            <Typography variant="h6" sx={{ mb: 1 }}>
              🏖️ Wir sind derzeit im Urlaub
            </Typography>
            <Typography variant="body2" sx={{ mb: hasValidDates ? 1 : 0 }}>
              Ihre Anfragen und Bestellungen werden nach unserer Rückkehr bearbeitet. 
              Vielen Dank für Ihr Verständnis!
              {shopSettings?.checkoutMode === 'inquiry-only' && 
                ' Sie können trotzdem eine Anfrage stellen.'
              }
            </Typography>
            {hasValidDates && (
              <Typography variant="body2" sx={{ 
                fontWeight: 'bold', 
                color: '#1976d2',
                fontSize: '0.95rem' 
              }}>
                📅 Urlaubszeit: {formatDate(startDate)} - {formatDate(endDate)}
              </Typography>
            )}
          </Box>
        </Alert>
      </Collapse>
    );
  }

  // Wartungs-Benachrichtigung
  if (shopSettings?.shop === 'maintenance') {
    return (
      <Collapse in={!dismissed || persistent}>
        <Alert 
          severity="warning" 
          sx={{ 
            mb: 3,
            backgroundColor: '#fff3e0',
            '& .MuiAlert-icon': { color: '#f57c00' },
            '& .MuiAlert-message': { fontWeight: 'medium' }
          }}
          icon={<Build />}
          onClose={persistent ? undefined : () => setDismissed(true)}
        >
          <Box>
            <Typography variant="h6" sx={{ mb: 1 }}>
              🔧 Wartungsarbeiten
            </Typography>
            <Typography variant="body2">
              Wir führen derzeit Wartungsarbeiten durch. Der Service kann eingeschränkt sein.
              {shopSettings?.checkoutMode === 'inquiry-only' && 
                ' Sie können trotzdem eine Anfrage stellen.'
              }
            </Typography>
          </Box>
        </Alert>
      </Collapse>
    );
  }

  // Checkout deaktiviert (nur Anfragen möglich)
  if (shopSettings?.checkoutMode === 'inquiry-only' && shopSettings?.shop !== 'vacation' && shopSettings?.shop !== 'maintenance') {
    return (
      <Collapse in={!dismissed || persistent}>
        <Alert 
          severity="info" 
          sx={{ 
            mb: 3,
            backgroundColor: '#f3e5f5',
            '& .MuiAlert-icon': { color: '#9c27b0' },
            '& .MuiAlert-message': { fontWeight: 'medium' }
          }}
          onClose={persistent ? undefined : () => setDismissed(true)}
        >
          <Box>
            <Typography variant="h6" sx={{ mb: 1 }}>
              💬 Anfrage-Modus aktiv
            </Typography>
            <Typography variant="body2">
              Derzeit sind nur Anfragen möglich. Nach Ihrer Anfrage erhalten Sie von uns ein individuelles Angebot.
            </Typography>
          </Box>
        </Alert>
      </Collapse>
    );
  }

  return null;
};

export default ShopStatusAlert;