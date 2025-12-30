import React, { useState, useEffect } from 'react';
import { useAdminState } from '../hooks/useAdminState';
import {
  Container,
  Paper,
  Typography,
  Box,
  Grid,
  Card,
  CardContent,
  Switch,
  FormControlLabel,
  Alert,
  Button,
  Divider,
  Chip,
  TextField
} from '@mui/material';
import {
  Settings,
  Payment,
  Security,
  Save,
  TestTube,
  LiveTv
} from '@mui/icons-material';

const AdminSettings = () => {
  const [settings, setSettings] = useState({
    paypalMode: 'sandbox', // 'sandbox' oder 'live'
    paypalSandboxClientId: '',
    paypalSandboxClientSecret: '',
    paypalLiveClientId: '',
    paypalLiveClientSecret: '',
    emailNotifications: true,
    inventoryTracking: true,
    debugMode: true
  });
  
  // Standardisierte Admin-States
  const {
    loading, setLoading,
    error, setError,
    success, setSuccess,
    handleAsyncOperation
  } = useAdminState();

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const response = await fetch('/api/admin/settings', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setSettings(prev => ({ ...prev, ...data.data }));
      }
    } catch (error) {
      console.error('Fehler beim Laden der Einstellungen:', error);
    }
  };

  const saveSettings = async () => {
    setLoading(true);
    setMessage('');

    try {
      const response = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(settings)
      });

      const result = await response.json();

      if (response.ok) {
        setMessage('Einstellungen erfolgreich gespeichert');
      } else {
        setMessage('Fehler beim Speichern: ' + result.message);
      }
    } catch (error) {
      setMessage('Fehler beim Speichern der Einstellungen');
    } finally {
      setLoading(false);
    }
  };

  const handleSettingChange = (key, value) => {
    setSettings(prev => ({
      ...prev,
      [key]: value
    }));
  };

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
          <Settings sx={{ mr: 2 }} />
          System-Einstellungen
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Konfigurieren Sie PayPal, E-Mail-Benachrichtigungen und andere Systemeinstellungen
        </Typography>
      </Box>

      {message && (
        <Alert 
          severity={message.includes('erfolgreich') ? 'success' : 'error'} 
          sx={{ mb: 3 }}
          onClose={() => setMessage('')}
        >
          {message}
        </Alert>
      )}

      <Grid container spacing={3}>
        {/* PayPal Einstellungen */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                <Payment sx={{ mr: 2 }} />
                <Typography variant="h6">
                  PayPal-Konfiguration
                </Typography>
                <Chip
                  label={settings.paypalMode === 'sandbox' ? 'Sandbox' : 'Live'}
                  color={settings.paypalMode === 'sandbox' ? 'warning' : 'success'}
                  icon={settings.paypalMode === 'sandbox' ? <TestTube /> : <LiveTv />}
                  sx={{ ml: 2 }}
                />
              </Box>

              <FormControlLabel
                control={
                  <Switch
                    checked={settings.paypalMode === 'live'}
                    onChange={(e) => handleSettingChange('paypalMode', e.target.checked ? 'live' : 'sandbox')}
                  />
                }
                label={`PayPal ${settings.paypalMode === 'live' ? 'Live' : 'Sandbox'} Modus`}
                sx={{ mb: 3 }}
              />

              <Alert severity="warning" sx={{ mb: 3 }}>
                <Typography variant="body2">
                  <strong>Achtung:</strong> Im Live-Modus werden echte Zahlungen verarbeitet! 
                  Verwenden Sie den Sandbox-Modus für Tests.
                </Typography>
              </Alert>

              <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle1" gutterBottom>
                    Sandbox Credentials
                  </Typography>
                  <TextField
                    fullWidth
                    label="Sandbox Client ID"
                    value={settings.paypalSandboxClientId}
                    onChange={(e) => handleSettingChange('paypalSandboxClientId', e.target.value)}
                    margin="normal"
                    type="password"
                  />
                  <TextField
                    fullWidth
                    label="Sandbox Client Secret"
                    value={settings.paypalSandboxClientSecret}
                    onChange={(e) => handleSettingChange('paypalSandboxClientSecret', e.target.value)}
                    margin="normal"
                    type="password"
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle1" gutterBottom>
                    Live Credentials
                  </Typography>
                  <TextField
                    fullWidth
                    label="Live Client ID"
                    value={settings.paypalLiveClientId}
                    onChange={(e) => handleSettingChange('paypalLiveClientId', e.target.value)}
                    margin="normal"
                    type="password"
                  />
                  <TextField
                    fullWidth
                    label="Live Client Secret"
                    value={settings.paypalLiveClientSecret}
                    onChange={(e) => handleSettingChange('paypalLiveClientSecret', e.target.value)}
                    margin="normal"
                    type="password"
                  />
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        {/* System Einstellungen */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                System-Optionen
              </Typography>
              
              <FormControlLabel
                control={
                  <Switch
                    checked={settings.emailNotifications}
                    onChange={(e) => handleSettingChange('emailNotifications', e.target.checked)}
                  />
                }
                label="E-Mail-Benachrichtigungen"
                sx={{ display: 'block', mb: 2 }}
              />
              
              <FormControlLabel
                control={
                  <Switch
                    checked={settings.inventoryTracking}
                    onChange={(e) => handleSettingChange('inventoryTracking', e.target.checked)}
                  />
                }
                label="Bestandsverfolgung"
                sx={{ display: 'block', mb: 2 }}
              />
              
              <FormControlLabel
                control={
                  <Switch
                    checked={settings.debugMode}
                    onChange={(e) => handleSettingChange('debugMode', e.target.checked)}
                  />
                }
                label="Debug-Modus"
                sx={{ display: 'block' }}
              />
            </CardContent>
          </Card>
        </Grid>

        {/* Sicherheit */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <Security sx={{ mr: 1 }} />
                <Typography variant="h6">
                  Sicherheit
                </Typography>
              </Box>
              
              <Alert severity="info">
                <Typography variant="body2">
                  Alle Credentials werden verschlüsselt gespeichert. 
                  Stellen Sie sicher, dass nur autorisierte Administratoren 
                  Zugang zu diesen Einstellungen haben.
                </Typography>
              </Alert>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Divider sx={{ my: 4 }} />

      {/* Speichern Button */}
      <Box sx={{ textAlign: 'center' }}>
        <Button
          variant="contained"
          size="large"
          startIcon={<Save />}
          onClick={saveSettings}
          disabled={loading}
        >
          {loading ? 'Speichern...' : 'Einstellungen speichern'}
        </Button>
      </Box>
    </Container>
  );
};

export default AdminSettings;