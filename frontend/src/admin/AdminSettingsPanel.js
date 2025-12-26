import React, { useState, useEffect, useCallback } from 'react';
import {
  Container,
  Typography,
  Box,
  Card,
  CardContent,
  Grid,
  Button,
  TextField,
  Tabs,
  Tab,
  Paper,
  Chip,
  CircularProgress,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Snackbar,
  Alert,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Tooltip,
  Switch,
  FormControlLabel,
  FormGroup,
  useTheme,
  useMediaQuery,
  InputAdornment
} from '@mui/material';
import {
  PaymentRounded,
  ShoppingCart,
  Store,
  Refresh,
  Save,
  Edit,
  ExpandMore,
  CheckCircle,
  Warning,
  Visibility,
  VisibilityOff
} from '@mui/icons-material';
import api from '../services/api';

const AdminSettingsPanel = () => {
  const _theme = useTheme();
  
  const [currentTab, setCurrentTab] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // Konfigurationsstates
  const [paypalConfig, setPaypalConfig] = useState({
    mode: 'sandbox',
    sandbox: { clientId: '', clientSecret: '' },
    live: { clientId: '', clientSecret: '' },
    environment: { nodeEnv: 'development', isDevelopment: true }
  });
  
  const [checkoutConfig, setCheckoutConfig] = useState({
    enabled: true,
    mode: 'full',
    maintenanceMessage: ''
  });
  
  const [shopConfig, setShopConfig] = useState({
    status: 'open',
    statusMessage: '',
    vacationMode: { startDate: '', endDate: '', autoMessage: '' }
  });

  // UI States
  const [testDialog, setTestDialog] = useState({ open: false, mode: null, loading: false });
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'info' });

  const showSnackbar = useCallback((message, severity = 'info') => {
    setSnackbar({ open: true, message, severity });
  }, []);

  // Einstellungen laden
  const loadSettings = useCallback(async () => {
    try {
      setLoading(true);
      const response = await api.get('/admin-settings/settings');
      
      if (response.data.success) {
        const settings = response.data.settings;
        
        setPaypalConfig({
          mode: settings.paypal?.mode || 'sandbox',
          sandbox: settings.paypal?.current?.sandbox || { clientId: '', clientSecret: '' },
          live: settings.paypal?.current?.live || { clientId: '', clientSecret: '' },
          environment: settings.paypal?.environment || { nodeEnv: 'development', isDevelopment: true }
        });
        
        setCheckoutConfig(settings.checkout || {
          enabled: true,
          mode: 'full',
          maintenanceMessage: ''
        });
        
        setShopConfig(settings.shop || {
          status: 'open',
          statusMessage: '',
          vacationMode: { startDate: '', endDate: '', autoMessage: '' }
        });
      }
    } catch (error) {
      console.error('Fehler beim Laden der Einstellungen:', error);
      showSnackbar('Fehler beim Laden der Einstellungen', 'error');
    } finally {
      setLoading(false);
    }
  }, [showSnackbar]); // showSnackbar als Abhängigkeit hinzugefügt

  // Einstellungen speichern
  const saveSettings = async (section, config) => {
    try {
      setSaving(true);
      const response = await api.put('/admin-settings/settings', {
        section,
        updates: config
      });
      
      if (response.data.success) {
        showSnackbar('Einstellungen erfolgreich gespeichert', 'success');
        await loadSettings();
      }
    } catch (error) {
      console.error('Fehler beim Speichern:', error);
      showSnackbar('Fehler beim Speichern der Einstellungen', 'error');
    } finally {
      setSaving(false);
    }
  };

  // PayPal Test
  const testPayPalConnection = async (mode) => {
    try {
      setTestDialog(prev => ({ ...prev, loading: true }));
      
      const response = await api.post('/admin-settings/test-paypal', { mode });
      
      if (response.data.success) {
        showSnackbar(`PayPal ${mode} Verbindung erfolgreich`, 'success');
      } else {
        showSnackbar(`PayPal ${mode} Test fehlgeschlagen: ${response.data.message}`, 'error');
      }
    } catch (error) {
      console.error('PayPal Test Fehler:', error);
      showSnackbar(`PayPal ${mode} Test fehlgeschlagen`, 'error');
    } finally {
      setTestDialog({ open: false, mode: null, loading: false });
    }
  };

  // Environment-Variablen aktualisieren
  const updateEnvironmentVariables = async (updates) => {
    try {
      setSaving(true);
      
      const response = await api.post('/admin-settings/update-env-vars', updates);
      
      if (response.data.success) {
        showSnackbar('Environment-Variablen erfolgreich aktualisiert', 'success');
        await loadSettings();
      } else {
        showSnackbar(`Fehler: ${response.data.message}`, 'error');
      }
    } catch (error) {
      console.error('Environment Update Fehler:', error);
      showSnackbar('Fehler beim Aktualisieren der Environment-Variablen', 'error');
    } finally {
      setSaving(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'sandbox': return 'warning';
      case 'live': return 'success';
      case 'disabled': return 'error';
      case 'open': return 'success';
      case 'maintenance': return 'warning';
      case 'vacation': return 'info';
      case 'full': return 'success';
      case 'inquiry': return 'info';
      case 'deaktiviert': return 'error';
      default: return 'default';
    }
  };

  const getCheckoutStatusText = () => {
    if (!checkoutConfig.enabled) {
      return 'deaktiviert';
    }
    switch (checkoutConfig.mode) {
      case 'full': return 'vollständig';
      case 'inquiry': return 'nur Anfrage';
      case 'disabled': return 'deaktiviert';
      default: return checkoutConfig.mode;
    }
  };

  const getCheckoutStatusColor = () => {
    if (!checkoutConfig.enabled) {
      return 'error';
    }
    switch (checkoutConfig.mode) {
      case 'full': return 'success';
      case 'inquiry': return 'info';
      case 'disabled': return 'error';
      default: return 'default';
    }
  };

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4, display: 'flex', justifyContent: 'center' }}>
        <CircularProgress />
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={4}>
        <Box>
          <Typography variant="h4" component="h1" sx={{ fontWeight: 'bold' }}>
            ⚙️ System-Einstellungen
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mt: 1 }}>
            PayPal-Konfiguration, Checkout-Modi und Shop-Status verwalten
          </Typography>
        </Box>
        <Button
          variant="outlined"
          startIcon={<Refresh />}
          onClick={loadSettings}
          disabled={loading}
        >
          Aktualisieren
        </Button>
      </Box>

      {/* Status Overview */}
      <Card sx={{ mb: 4 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>📊 System-Status</Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} md={4}>
              <Box display="flex" alignItems="center" gap={1}>
                <PaymentRounded />
                <Typography>PayPal:</Typography>
                <Chip 
                  label={paypalConfig.mode} 
                  color={getStatusColor(paypalConfig.mode)} 
                  size="small" 
                />
              </Box>
            </Grid>
            <Grid item xs={12} md={4}>
              <Box display="flex" alignItems="center" gap={1}>
                <ShoppingCart />
                <Typography>Checkout:</Typography>
                <Chip 
                  label={getCheckoutStatusText()} 
                  color={getCheckoutStatusColor()} 
                  size="small" 
                />
              </Box>
            </Grid>
            <Grid item xs={12} md={4}>
              <Box display="flex" alignItems="center" gap={1}>
                <Store />
                <Typography>Shop:</Typography>
                <Chip 
                  label={shopConfig.status} 
                  color={getStatusColor(shopConfig.status)} 
                  size="small" 
                />
              </Box>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Paper sx={{ mb: 3 }}>
        <Tabs 
          value={currentTab} 
          onChange={(e, newValue) => setCurrentTab(newValue)}
          variant="fullWidth"
        >
          <Tab icon={<PaymentRounded />} label="PayPal" />
          <Tab icon={<ShoppingCart />} label="Checkout" />
          <Tab icon={<Store />} label="Shop" />
        </Tabs>
      </Paper>

      {/* Tab Content */}
      <Box>
        {currentTab === 0 && (
          <PayPalConfigTab 
            config={paypalConfig}
            saving={saving}
            onSave={saveSettings}
            onTest={testPayPalConnection}
            onUpdateEnvVars={updateEnvironmentVariables}
          />
        )}

        {currentTab === 1 && (
          <CheckoutConfigTab 
            config={checkoutConfig}
            saving={saving}
            onSave={saveSettings}
          />
        )}

        {currentTab === 2 && (
          <ShopConfigTab 
            config={shopConfig}
            saving={saving}
            onSave={saveSettings}
          />
        )}
      </Box>

      {/* Test Dialog */}
      <Dialog open={testDialog.open} onClose={() => !testDialog.loading && setTestDialog({ open: false, mode: null, loading: false })}>
        <DialogTitle>PayPal {testDialog.mode} Verbindung testen</DialogTitle>
        <DialogContent>
          <Typography>
            Möchten Sie die PayPal {testDialog.mode} Konfiguration testen?
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setTestDialog({ open: false, mode: null, loading: false })} disabled={testDialog.loading}>
            Abbrechen
          </Button>
          <Button 
            onClick={() => testPayPalConnection(testDialog.mode)} 
            disabled={testDialog.loading}
            variant="contained"
          >
            {testDialog.loading ? <CircularProgress size={20} /> : 'Testen'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
      >
        <Alert 
          onClose={() => setSnackbar({ ...snackbar, open: false })} 
          severity={snackbar.severity}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Container>
  );
};

// PayPal Configuration Component
const PayPalConfigTab = ({ config, saving, onSave, onTest, onUpdateEnvVars }) => {
  const theme = useTheme();
  const _isMobile = useMediaQuery(theme.breakpoints.down('md'));
  
  const [editMode, setEditMode] = useState(false);
  const [editConfig, setEditConfig] = useState(config);
  const [showCredentials, setShowCredentials] = useState({
    sandbox: false,
    live: false
  });
  const [credentialsTimer, setCredentialsTimer] = useState({
    sandbox: null,
    live: null
  });
  const [productiveWarning, setProductiveWarning] = useState(false);

  useEffect(() => {
    setEditConfig(config);
  }, [config]);

  // Credentials anzeigen/verstecken mit Timer
  const toggleCredentials = (mode) => {
    setShowCredentials(prev => {
      const newState = { ...prev, [mode]: !prev[mode] };
      
      // Timer setzen wenn Credentials angezeigt werden
      if (newState[mode]) {
        const timer = setTimeout(() => {
          setShowCredentials(current => ({ ...current, [mode]: false }));
        }, 10000); // 10 Sekunden
        
        setCredentialsTimer(prev => {
          // Vorherigen Timer löschen
          if (prev[mode]) clearTimeout(prev[mode]);
          return { ...prev, [mode]: timer };
        });
      } else {
        // Timer löschen wenn manuell versteckt
        if (credentialsTimer[mode]) {
          clearTimeout(credentialsTimer[mode]);
          setCredentialsTimer(prev => ({ ...prev, [mode]: null }));
        }
      }
      
      return newState;
    });
  };

  // PayPal Modus ändern mit Warnung für Live
  const handleModeChange = (newMode) => {
    if (newMode === 'live' && config.mode !== 'live') {
      setProductiveWarning(true);
    } else {
      setEditConfig(prev => ({ ...prev, mode: newMode }));
      onSave('paypal', { ...editConfig, mode: newMode });
    }
  };

  const confirmProductiveMode = () => {
    setEditConfig(prev => ({ ...prev, mode: 'live' }));
    onSave('paypal', { ...editConfig, mode: 'live' });
    setProductiveWarning(false);
  };

  const handleEnvironmentSave = async () => {
    const envUpdates = {
      PAYPAL_SANDBOX_CLIENT_ID: editConfig.sandbox.clientId,
      PAYPAL_SANDBOX_CLIENT_SECRET: editConfig.sandbox.clientSecret,
      PAYPAL_LIVE_CLIENT_ID: editConfig.live.clientId,
      PAYPAL_LIVE_CLIENT_SECRET: editConfig.live.clientSecret
    };
    await onUpdateEnvVars(envUpdates);
    setEditMode(false);
  };

  const isDevelopment = config.environment?.isDevelopment || false;

  return (
    <Card>
      <CardContent>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
          <Typography variant="h6">💳 PayPal-Konfiguration</Typography>
          <Box>
            {isDevelopment && (
              <Tooltip title="Environment-Variablen bearbeiten">
                <IconButton 
                  onClick={() => setEditMode(!editMode)}
                  color={editMode ? 'primary' : 'default'}
                >
                  <Edit />
                </IconButton>
              </Tooltip>
            )}
          </Box>
        </Box>

        {/* Environment Info */}
        <Accordion sx={{ mb: 2 }}>
          <AccordionSummary expandIcon={<ExpandMore />}>
            <Typography>🔧 Environment-Informationen</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <Typography variant="body2" color="text.secondary">Umgebung:</Typography>
                <Chip 
                  label={config.environment?.nodeEnv || 'unbekannt'} 
                  color={isDevelopment ? 'warning' : 'success'} 
                  size="small" 
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="body2" color="text.secondary">Modus:</Typography>
                <Chip 
                  label={config.mode} 
                  color={config.mode === 'sandbox' ? 'warning' : 'success'} 
                  size="small" 
                />
              </Grid>
            </Grid>
          </AccordionDetails>
        </Accordion>

        {/* Current Configuration */}
        <Typography variant="h6" gutterBottom>📋 PayPal Modus-Konfiguration</Typography>
        
        <Card sx={{ mb: 3, bgcolor: theme.palette.background.default }}>
          <CardContent>
            <Grid container spacing={3}>
              <Grid item xs={12} md={4}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={config.mode === 'sandbox'}
                      onChange={() => handleModeChange('sandbox')}
                      color="warning"
                    />
                  }
                  label={
                    <Box>
                      <Typography variant="body1">Sandbox (Test)</Typography>
                      <Typography variant="caption" color="text.secondary">
                        Für Entwicklung und Tests
                      </Typography>
                    </Box>
                  }
                />
              </Grid>
              
              <Grid item xs={12} md={4}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={config.mode === 'live'}
                      onChange={() => handleModeChange('live')}
                      color="success"
                    />
                  }
                  label={
                    <Box>
                      <Typography variant="body1">Live (Produktiv)</Typography>
                      <Typography variant="caption" color="text.secondary">
                        Echte Zahlungen
                      </Typography>
                    </Box>
                  }
                />
              </Grid>
              
              <Grid item xs={12} md={4}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={config.mode === 'disabled'}
                      onChange={() => handleModeChange('disabled')}
                      color="error"
                    />
                  }
                  label={
                    <Box>
                      <Typography variant="body1">Deaktiviert</Typography>
                      <Typography variant="caption" color="text.secondary">
                        PayPal ausgeschaltet
                      </Typography>
                    </Box>
                  }
                />
              </Grid>
            </Grid>
          </CardContent>
        </Card>

        <Typography variant="h6" gutterBottom>🔑 Credentials-Konfiguration</Typography>
        
        {/* Sandbox Configuration */}
        <Accordion>
          <AccordionSummary expandIcon={<ExpandMore />}>
            <Box display="flex" alignItems="center" gap={1}>
              <Warning color="warning" />
              <Typography>Sandbox (Test-Umgebung)</Typography>
              <Chip 
                label={config.sandbox?.configured ? 'Konfiguriert' : 'Nicht konfiguriert'} 
                color={config.sandbox?.configured ? 'success' : 'error'} 
                size="small" 
              />
            </Box>
          </AccordionSummary>
          <AccordionDetails>
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Client ID"
                  value={editMode ? editConfig.sandbox?.clientId || '' : 
                    showCredentials.sandbox ? config.sandbox?.clientId || '' : '••••••••••••••••'}
                  onChange={(e) => editMode && setEditConfig(prev => ({
                    ...prev,
                    sandbox: { ...prev.sandbox, clientId: e.target.value }
                  }))}
                  disabled={!editMode}
                  InputProps={{
                    readOnly: !editMode,
                    endAdornment: !editMode && (
                      <InputAdornment position="end">
                        <IconButton onClick={() => toggleCredentials('sandbox')} size="small">
                          {showCredentials.sandbox ? <VisibilityOff /> : <Visibility />}
                        </IconButton>
                      </InputAdornment>
                    )
                  }}
                  size="small"
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Client Secret"
                  value={editMode ? editConfig.sandbox?.clientSecret || '' : 
                    showCredentials.sandbox ? config.sandbox?.clientSecret || '' : '••••••••••••••••'}
                  onChange={(e) => editMode && setEditConfig(prev => ({
                    ...prev,
                    sandbox: { ...prev.sandbox, clientSecret: e.target.value }
                  }))}
                  disabled={!editMode}
                  InputProps={{
                    readOnly: !editMode,
                    endAdornment: !editMode && (
                      <InputAdornment position="end">
                        <IconButton onClick={() => toggleCredentials('sandbox')} size="small">
                          {showCredentials.sandbox ? <VisibilityOff /> : <Visibility />}
                        </IconButton>
                      </InputAdornment>
                    )
                  }}
                  size="small"
                />
              </Grid>
              <Grid item xs={12}>
                <Button
                  variant="outlined"
                  color="warning"
                  onClick={() => onTest('sandbox')}
                  disabled={saving || !config.sandbox?.clientId}
                  size="small"
                >
                  Sandbox testen
                </Button>
              </Grid>
            </Grid>
          </AccordionDetails>
        </Accordion>

        {/* Live Configuration */}
        <Accordion>
          <AccordionSummary expandIcon={<ExpandMore />}>
            <Box display="flex" alignItems="center" gap={1}>
              <CheckCircle color="success" />
              <Typography>Live (Produktions-Umgebung)</Typography>
              <Chip 
                label={config.live?.configured ? 'Konfiguriert' : 'Nicht konfiguriert'} 
                color={config.live?.configured ? 'success' : 'error'} 
                size="small" 
              />
            </Box>
          </AccordionSummary>
          <AccordionDetails>
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Client ID"
                  value={editMode ? editConfig.live?.clientId || '' : 
                    showCredentials.live ? config.live?.clientId || '' : '••••••••••••••••'}
                  onChange={(e) => editMode && setEditConfig(prev => ({
                    ...prev,
                    live: { ...prev.live, clientId: e.target.value }
                  }))}
                  disabled={!editMode}
                  InputProps={{
                    readOnly: !editMode,
                    endAdornment: !editMode && (
                      <InputAdornment position="end">
                        <IconButton onClick={() => toggleCredentials('live')} size="small">
                          {showCredentials.live ? <VisibilityOff /> : <Visibility />}
                        </IconButton>
                      </InputAdornment>
                    )
                  }}
                  size="small"
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Client Secret"
                  value={editMode ? editConfig.live?.clientSecret || '' : 
                    showCredentials.live ? config.live?.clientSecret || '' : '••••••••••••••••'}
                  onChange={(e) => editMode && setEditConfig(prev => ({
                    ...prev,
                    live: { ...prev.live, clientSecret: e.target.value }
                  }))}
                  disabled={!editMode}
                  InputProps={{
                    readOnly: !editMode,
                    endAdornment: !editMode && (
                      <InputAdornment position="end">
                        <IconButton onClick={() => toggleCredentials('live')} size="small">
                          {showCredentials.live ? <VisibilityOff /> : <Visibility />}
                        </IconButton>
                      </InputAdornment>
                    )
                  }}
                  size="small"
                />
              </Grid>
              <Grid item xs={12}>
                <Button
                  variant="outlined"
                  color="success"
                  onClick={() => onTest('live')}
                  disabled={saving || !config.live?.clientId}
                  size="small"
                >
                  Live testen
                </Button>
              </Grid>
            </Grid>
          </AccordionDetails>
        </Accordion>

        {/* Save Buttons */}
        {editMode && (
          <Box display="flex" gap={2} mt={3}>
            <Button
              variant="contained"
              onClick={handleEnvironmentSave}
              disabled={saving}
              startIcon={saving ? <CircularProgress size={16} /> : <Save />}
            >
              Environment-Variablen speichern
            </Button>
            <Button
              variant="outlined"
              onClick={() => setEditMode(false)}
              disabled={saving}
            >
              Abbrechen
            </Button>
          </Box>
        )}

        {/* Produktiv-Warnung Dialog */}
        <Dialog open={productiveWarning} onClose={() => setProductiveWarning(false)}>
          <DialogTitle>
            <Box display="flex" alignItems="center" gap={1}>
              <Warning color="error" />
              <Typography variant="h6">⚠️ PayPal auf PRODUKTIV umstellen?</Typography>
            </Box>
          </DialogTitle>
          <DialogContent>
            <Typography paragraph>
              <strong>ACHTUNG!</strong> Du bist dabei, PayPal auf den LIVE-Modus umzustellen.
            </Typography>
            <Typography paragraph>
              • Im Live-Modus werden <strong>echte Zahlungen</strong> verarbeitet
              • Kunden werden mit <strong>echtem Geld</strong> belastet
              • Transaktionen sind <strong>bindend und kostenpflichtig</strong>
            </Typography>
            <Typography>
              Bist du sicher, dass du PayPal auf PRODUKTIV umstellen möchtest?
            </Typography>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setProductiveWarning(false)} color="inherit">
              Abbrechen
            </Button>
            <Button onClick={confirmProductiveMode} color="error" variant="contained">
              Ja, auf PRODUKTIV umstellen
            </Button>
          </DialogActions>
        </Dialog>
      </CardContent>
    </Card>
  );
};

// Placeholder Components for other tabs
const CheckoutConfigTab = ({ config, saving, onSave }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [localConfig, setLocalConfig] = useState(config);

  const handleSave = () => {
    onSave('checkout', localConfig);
  };

  return (
    <Card>
      <CardContent>
        <Typography variant="h6" gutterBottom>🛒 Checkout-Konfiguration</Typography>
        
        <Card sx={{ mb: 3, bgcolor: theme.palette.background.default }}>
          <CardContent>
            <Typography variant="subtitle1" gutterBottom>Checkout-Modus</Typography>
            <FormGroup>
              <Grid container spacing={isMobile ? 1 : 2}>
                <Grid item xs={12} md={4}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={localConfig.mode === 'full'}
                        onChange={() => setLocalConfig({...localConfig, mode: 'full'})}
                        color="success"
                      />
                    }
                    label={
                      <Box>
                        <Typography variant="body1">Vollständiger Checkout</Typography>
                        <Typography variant="caption" color="text.secondary">
                          PayPal-Zahlung möglich
                        </Typography>
                      </Box>
                    }
                  />
                </Grid>
                
                <Grid item xs={12} md={4}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={localConfig.mode === 'inquiry'}
                        onChange={() => setLocalConfig({...localConfig, mode: 'inquiry'})}
                        color="warning"
                      />
                    }
                    label={
                      <Box>
                        <Typography variant="body1">Nur Anfrage</Typography>
                        <Typography variant="caption" color="text.secondary">
                          Kunden können nur anfragen
                        </Typography>
                      </Box>
                    }
                  />
                </Grid>
                
                <Grid item xs={12} md={4}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={localConfig.mode === 'disabled'}
                        onChange={() => setLocalConfig({...localConfig, mode: 'disabled'})}
                        color="error"
                      />
                    }
                    label={
                      <Box>
                        <Typography variant="body1">Deaktiviert</Typography>
                        <Typography variant="caption" color="text.secondary">
                          Checkout gesperrt
                        </Typography>
                      </Box>
                    }
                  />
                </Grid>
              </Grid>
            </FormGroup>
          </CardContent>
        </Card>
        
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Wartungsnachricht"
              value={localConfig.maintenanceMessage || ''}
              onChange={(e) => setLocalConfig({...localConfig, maintenanceMessage: e.target.value})}
              multiline
              rows={2}
              helperText="Nachricht, die angezeigt wird, wenn der Checkout deaktiviert ist"
            />
          </Grid>
          
          <Grid item xs={12}>
            <Button
              variant="contained"
              onClick={handleSave}
              disabled={saving}
              startIcon={saving ? <CircularProgress size={20} /> : null}
            >
              {saving ? 'Speichern...' : 'Checkout-Einstellungen speichern'}
            </Button>
          </Grid>
        </Grid>
      </CardContent>
    </Card>
  );
};

const ShopConfigTab = ({ config, saving, onSave }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [localConfig, setLocalConfig] = useState(config);

  // Automatischen Urlaubstext generieren
  const generateVacationMessage = useCallback((startDate, endDate) => {
    const formatDate = (dateString) => {
      if (!dateString) return '[DATUM]';
      const date = new Date(dateString);
      return date.toLocaleDateString('de-DE', {
        day: '2-digit',
        month: '2-digit', 
        year: 'numeric'
      });
    };

    const start = formatDate(startDate);
    const end = formatDate(endDate);
    
    return `🏖️ Liebe Kunden,

wir befinden uns derzeit im wohlverdienten Urlaub vom ${start} bis ${end}.

Während dieser Zeit können Sie gerne weiterhin Anfragen über unseren Shop stellen. Wir werden alle Anfragen nach unserer Rückkehr schnellstmöglich bearbeiten und uns umgehend bei Ihnen melden.

Vielen Dank für Ihr Verständnis und Ihre Geduld!

Ihr Team von Glücksmomente`;
  }, []);

  // Hilfsfunktion für Datumskonvertierung
  const toInputDateFormat = useCallback((dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '';
    return date.toISOString().split('T')[0];
  }, []);

  const handleSave = () => {
    onSave('shop', localConfig);
  };

  // Automatisch Standard-Daten setzen wenn Urlaubsmodus aktiviert wird
  useEffect(() => {
    if (localConfig.status === 'vacation' && !localConfig.vacationMode?.autoMessage) {
      const currentDate = new Date().toISOString().split('T')[0];
      const endDate = new Date();
      endDate.setDate(endDate.getDate() + 14); // 2 Wochen Standard
      const endDateStr = endDate.toISOString().split('T')[0];
      
      const newVacationMode = {
        startDate: localConfig.vacationMode?.startDate || currentDate,
        endDate: localConfig.vacationMode?.endDate || endDateStr,
        autoMessage: generateVacationMessage(
          localConfig.vacationMode?.startDate || currentDate,
          localConfig.vacationMode?.endDate || endDateStr
        )
      };
      
      setLocalConfig(prev => ({
        ...prev,
        vacationMode: newVacationMode
      }));
    }
  }, [localConfig.status, localConfig.vacationMode?.autoMessage, localConfig.vacationMode?.startDate, localConfig.vacationMode?.endDate, generateVacationMessage]);

  return (
    <Card>
      <CardContent>
        <Typography variant="h6" gutterBottom>🏪 Shop-Konfiguration</Typography>
        
        <Card sx={{ mb: 3, bgcolor: theme.palette.background.default }}>
          <CardContent>
            <Typography variant="subtitle1" gutterBottom>Shop-Status</Typography>
            <FormGroup>
              <Grid container spacing={isMobile ? 1 : 2}>
                <Grid item xs={12} md={3}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={localConfig.status === 'open'}
                        onChange={() => setLocalConfig({...localConfig, status: 'open'})}
                        color="success"
                      />
                    }
                    label={
                      <Box>
                        <Typography variant="body1">Geöffnet</Typography>
                        <Typography variant="caption" color="text.secondary">
                          Normal geöffnet
                        </Typography>
                      </Box>
                    }
                  />
                </Grid>
                
                <Grid item xs={12} md={3}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={localConfig.status === 'maintenance'}
                        onChange={() => setLocalConfig({...localConfig, status: 'maintenance'})}
                        color="warning"
                      />
                    }
                    label={
                      <Box>
                        <Typography variant="body1">Wartung</Typography>
                        <Typography variant="caption" color="text.secondary">
                          Wartungsarbeiten
                        </Typography>
                      </Box>
                    }
                  />
                </Grid>
                
                <Grid item xs={12} md={3}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={localConfig.status === 'vacation'}
                        onChange={() => {
                          const newConfig = {...localConfig, status: 'vacation'};
                          // Nur Status setzen, Text wird separat generiert
                          setLocalConfig(newConfig);
                        }}
                        color="info"
                      />
                    }
                    label={
                      <Box>
                        <Typography variant="body1">Urlaubsmodus</Typography>
                        <Typography variant="caption" color="text.secondary">
                          Im Urlaub
                        </Typography>
                      </Box>
                    }
                  />
                </Grid>
                
                <Grid item xs={12} md={3}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={localConfig.status === 'closed'}
                        onChange={() => setLocalConfig({...localConfig, status: 'closed'})}
                        color="error"
                      />
                    }
                    label={
                      <Box>
                        <Typography variant="body1">Geschlossen</Typography>
                        <Typography variant="caption" color="text.secondary">
                          Dauerhaft zu
                        </Typography>
                      </Box>
                    }
                  />
                </Grid>
              </Grid>
            </FormGroup>
          </CardContent>
        </Card>
        
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Status-Nachricht"
              value={localConfig.statusMessage || ''}
              onChange={(e) => setLocalConfig({...localConfig, statusMessage: e.target.value})}
              multiline
              rows={2}
              helperText="Nachricht, die im Shop angezeigt wird"
            />
          </Grid>
          
          {localConfig.status === 'vacation' && (
            <>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  type="date"
                  label="Urlaub Start"
                  value={toInputDateFormat(localConfig.vacationMode?.startDate) || ''}
                  onChange={(e) => {
                    const newConfig = {
                      ...localConfig, 
                      vacationMode: {...localConfig.vacationMode, startDate: e.target.value}
                    };
                    // Automatisch Nachricht aktualisieren
                    newConfig.vacationMode.autoMessage = generateVacationMessage(
                      e.target.value, 
                      localConfig.vacationMode?.endDate
                    );
                    setLocalConfig(newConfig);
                  }}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  type="date"
                  label="Urlaub Ende"
                  value={toInputDateFormat(localConfig.vacationMode?.endDate) || ''}
                  onChange={(e) => {
                    const newConfig = {
                      ...localConfig, 
                      vacationMode: {...localConfig.vacationMode, endDate: e.target.value}
                    };
                    // Automatisch Nachricht aktualisieren
                    newConfig.vacationMode.autoMessage = generateVacationMessage(
                      localConfig.vacationMode?.startDate, 
                      e.target.value
                    );
                    setLocalConfig(newConfig);
                  }}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Automatische Urlaubsnachricht"
                  value={localConfig.vacationMode?.autoMessage || ''}
                  onChange={(e) => setLocalConfig({
                    ...localConfig, 
                    vacationMode: {...localConfig.vacationMode, autoMessage: e.target.value}
                  })}
                  multiline
                  rows={6}
                  helperText="Diese Nachricht wird automatisch mit den eingestellten Daten generiert und kann individuell angepasst werden"
                  InputProps={{
                    endAdornment: (
                      <InputAdornment position="end">
                        <Button
                          size="small"
                          variant="outlined"
                          onClick={() => {
                            const newMessage = generateVacationMessage(
                              localConfig.vacationMode?.startDate,
                              localConfig.vacationMode?.endDate
                            );
                            setLocalConfig({
                              ...localConfig,
                              vacationMode: {...localConfig.vacationMode, autoMessage: newMessage}
                            });
                          }}
                          sx={{ mr: 1, mt: 1, alignSelf: 'flex-start' }}
                        >
                          🔄 Neu generieren
                        </Button>
                      </InputAdornment>
                    )
                  }}
                />
              </Grid>
            </>
          )}
          
          <Grid item xs={12}>
            <Button
              variant="contained"
              onClick={handleSave}
              disabled={saving}
              startIcon={saving ? <CircularProgress size={20} /> : null}
            >
              {saving ? 'Speichern...' : 'Shop-Einstellungen speichern'}
            </Button>
          </Grid>
        </Grid>
      </CardContent>
    </Card>
  );
};

export default AdminSettingsPanel;