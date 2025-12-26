import React, { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Box,
  Paper,
  Grid,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Card,
  CardContent,
  CardActions,
  CardHeader,
  Chip,
  Alert,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Switch,
  FormControlLabel,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  ListItemSecondaryAction,
  IconButton,
  Tabs,
  Tab,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Snackbar
} from '@mui/material';
import {
  Send as SendIcon,
  Settings as SettingsIcon,
  Email as EmailIcon,
  Check as CheckIcon,
  Error as ErrorIcon,
  ExpandMore as ExpandMoreIcon,
  Edit as EditIcon,
  Visibility as PreviewIcon,
  Save as SaveIcon,
  Add as AddIcon,
  Code as CodeIcon,
  FileCopy as FileCopyIcon,
  Refresh as RefreshIcon,
  Schedule as ScheduleIcon,
  Notifications as NotificationIcon
} from '@mui/icons-material';
import api from '../services/api';

const AdminEmailConfiguration = () => {
  const [currentTab, setCurrentTab] = useState(0);
  const [loading, setLoading] = useState(false);
  const [saveLoading, setSaveLoading] = useState(false);
  const [results, setResults] = useState([]);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [editDialog, setEditDialog] = useState({ open: false, emailType: null, template: '' });
  const [templates, setTemplates] = useState({});
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [templateEditor, setTemplateEditor] = useState(false);
  const [templateContent, setTemplateContent] = useState('');
  const [templatePreview, setTemplatePreview] = useState('');

  // E-Mail-Konfigurationen laden
  useEffect(() => {
    loadEmailConfig();
  }, []);

  const loadEmailConfig = async () => {
    try {
      const response = await api.get('/admin/email-config');
      if (response.data.success) {
        setEmailConfigs(response.data.emailConfigs);
        setGlobalEmailSettings(response.data.globalSettings);
      }
      
      // Templates laden
      await loadTemplates();
    } catch (error) {
      console.error('Fehler beim Laden der E-Mail-Konfiguration:', error);
      setSnackbar({
        open: true,
        message: 'Fehler beim Laden der E-Mail-Konfiguration',
        severity: 'error'
      });
    }
  };

  // Templates von Backend laden
  const loadTemplates = async () => {
    try {
      const response = await api.get('/admin/email-templates');
      if (response.data.success) {
        setTemplates(response.data.templates);
      }
    } catch (error) {
      console.error('Fehler beim Laden der Templates:', error);
    }
  };

  // E-Mail-Konfigurationen
  const [emailConfigs, setEmailConfigs] = useState({
    verification: {
      enabled: true,
      automatic: true,
      trigger: 'user_registration',
      subject: '✅ E-Mail-Adresse bestätigen - Gluecksmomente Seifenmanufaktur',
      template: 'default'
    },
    welcome: {
      enabled: true,
      automatic: true,
      trigger: 'email_verified',
      subject: '🌸 Willkommen bei Gluecksmomente Manufaktur!',
      template: 'default'
    },
    passwordReset: {
      enabled: true,
      automatic: true,
      trigger: 'password_reset_request',
      subject: '🔒 Passwort zurücksetzen - Gluecksmomente Manufaktur',
      template: 'default'
    },
    orderConfirmation: {
      enabled: true,
      automatic: true,
      trigger: 'order_placed',
      subject: '📦 Bestellbestätigung - Gluecksmomente Manufaktur',
      template: 'default'
    },
    adminNotification: {
      enabled: true,
      automatic: true,
      trigger: 'new_order',
      subject: '🚨 Neue Bestellung eingegangen - {{orderNumber}}',
      template: 'default'
    },
    adminInquiryNotification: {
      enabled: true,
      automatic: true,
      trigger: 'new_inquiry',
      subject: '📝 Neue Kundenanfrage von {{customerName}}',
      template: 'default'
    }
  });

  const [globalEmailSettings, setGlobalEmailSettings] = useState({
    fromName: 'Gluecksmomente Manufaktur',
    fromEmail: 'onboarding@resend.dev',
    adminEmail: 'ralle.jacob84@googlemail.com',
    emailEnabled: true,
    defaultLanguage: 'de',
    footer: 'Vielen Dank für Ihr Vertrauen in die Gluecksmomente Manufaktur',
    notifications: {
      newOrders: true,
      newInquiries: true,
      orderUpdates: false,
      highValueOrders: true,
      highValueThreshold: 100
    }
  });

  const emailTypes = [
    { 
      id: 'verification', 
      label: 'E-Mail Verifikation', 
      description: 'Nach der Registrierung',
      color: 'primary',
      icon: '✉️'
    },
    { 
      id: 'welcome', 
      label: 'Willkommens-E-Mail', 
      description: 'Nach E-Mail-Bestätigung',
      color: 'success',
      icon: '🌸'
    },
    { 
      id: 'password-reset', 
      label: 'Passwort zurücksetzen', 
      description: 'Bei Passwort-Reset-Anfrage',
      color: 'warning',
      icon: '🔒'
    },
    { 
      id: 'order-confirmation', 
      label: 'Bestellbestätigung', 
      description: 'Nach abgeschlossener Bestellung',
      color: 'info',
      icon: '📦'
    },
    { 
      id: 'admin-notification', 
      label: 'Admin-Bestellbenachrichtigung', 
      description: 'Bei neuen Bestellungen',
      color: 'secondary',
      icon: '🚨'
    },
    { 
      id: 'admin-inquiry-notification', 
      label: 'Admin-Anfragebenachrichtigung', 
      description: 'Bei neuen Kundenanfragen',
      color: 'warning',
      icon: '📝'
    }
  ];

  const triggerOptions = {
    verification: [
      { value: 'user_registration', label: 'Bei Nutzer-Registrierung' },
      { value: 'manual', label: 'Nur manuell' }
    ],
    welcome: [
      { value: 'email_verified', label: 'Nach E-Mail-Verifizierung' },
      { value: 'user_registration', label: 'Sofort nach Registrierung' },
      { value: 'manual', label: 'Nur manuell' }
    ],
    passwordReset: [
      { value: 'password_reset_request', label: 'Bei Passwort-Reset-Anfrage' },
      { value: 'manual', label: 'Nur manuell' }
    ],
    orderConfirmation: [
      { value: 'order_placed', label: 'Sofort nach Bestellung' },
      { value: 'order_paid', label: 'Nach Zahlungsbestätigung' },
      { value: 'manual', label: 'Nur manuell' }
    ],
    adminNotification: [
      { value: 'new_order', label: 'Bei jeder neuen Bestellung' },
      { value: 'high_value_order', label: 'Nur bei hohen Beträgen (>100€)' },
      { value: 'manual', label: 'Nur manuell' }
    ],
    adminInquiryNotification: [
      { value: 'new_inquiry', label: 'Bei jeder neuen Anfrage' },
      { value: 'urgent_inquiry', label: 'Nur bei dringenden Anfragen' },
      { value: 'manual', label: 'Nur manuell' }
    ]
  };

  // E-Mail testen
  const sendTestEmail = async (emailType, customEmail = null) => {
    setLoading(true);
    
    const targetEmail = customEmail || globalEmailSettings.adminEmail;
    
    console.log('📧 [Frontend] E-Mail-Test gestartet...');
    console.log('  📧 E-Mail-Typ:', emailType);
    console.log('  🎯 Ziel-E-Mail:', targetEmail);
    console.log('  ⏰ Zeitpunkt:', new Date().toLocaleString());
    
    try {
      const payload = {};
      if (customEmail) {
        payload.email = customEmail;
      }

      console.log('  📡 Sende Anfrage an Backend...');
      const response = await api.post(`/invoice/test-email/${emailType}`, payload);
      
      const newResult = {
        id: Date.now(),
        type: emailType,
        email: targetEmail,
        success: response.data.success,
        message: response.data.message,
        timestamp: new Date(),
        data: response.data.data
      };

      console.log('✅ [Frontend] E-Mail-Test ERFOLGREICH');
      console.log('  📬 Empfänger:', targetEmail);
      console.log('  📝 Backend-Antwort:', response.data.message);
      if (response.data.data?.messageId) {
        console.log('  📩 Message ID:', response.data.data.messageId);
      }

      setResults(prev => [newResult, ...prev.slice(0, 9)]);
      setSnackbar({
        open: true,
        message: `Test-E-Mail erfolgreich an ${targetEmail} gesendet`,
        severity: 'success'
      });
      
    } catch (error) {
      const newResult = {
        id: Date.now(),
        type: emailType,
        email: targetEmail,
        success: false,
        message: error.response?.data?.message || error.message,
        timestamp: new Date(),
        error: true
      };
      
      console.error('❌ [Frontend] E-Mail-Test FEHLGESCHLAGEN');
      console.error('  📬 Ziel-E-Mail:', targetEmail);
      console.error('  ⚠️ Fehler:', error.response?.data?.message || error.message);
      
      setResults(prev => [newResult, ...prev.slice(0, 9)]);
      setSnackbar({
        open: true,
        message: `Fehler beim E-Mail-Versand: ${error.response?.data?.message || error.message}`,
        severity: 'error'
      });
    } finally {
      setLoading(false);
      console.log('🏁 [Frontend] E-Mail-Test abgeschlossen');
    }
  };

  // Template-Management-Funktionen
  const openTemplateEditor = async (templateType) => {
    try {
      const response = await api.get(`/admin/email-templates/${templateType}`);
      if (response.data.success) {
        setSelectedTemplate(templateType);
        setTemplateContent(response.data.template);
        setTemplateEditor(true);
      }
    } catch (error) {
      console.error('Fehler beim Laden des Templates:', error);
      setSnackbar({
        open: true,
        message: 'Fehler beim Laden des Templates',
        severity: 'error'
      });
    }
  };

  const saveTemplate = async () => {
    try {
      const response = await api.post(`/admin/email-templates/${selectedTemplate}`, {
        template: templateContent
      });
      
      if (response.data.success) {
        setSnackbar({
          open: true,
          message: 'Template erfolgreich gespeichert!',
          severity: 'success'
        });
        setTemplateEditor(false);
        await loadTemplates();
      }
    } catch (error) {
      console.error('Fehler beim Speichern des Templates:', error);
      setSnackbar({
        open: true,
        message: 'Fehler beim Speichern des Templates',
        severity: 'error'
      });
    }
  };

  const previewTemplate = () => {
    setTemplatePreview(templateContent);
  };

  const sendTestEmailWithCurrentTemplate = async (emailType) => {
    try {
      const response = await api.post(`/admin/test-email-with-template/${emailType}`, {
        template: templateContent || templates[emailType],
        email: globalEmailSettings.adminEmail
      });
      
      const newResult = {
        id: Date.now(),
        type: `${emailType} (Custom Template)`,
        email: globalEmailSettings.adminEmail,
        success: response.data.success,
        message: response.data.message,
        timestamp: new Date(),
        data: response.data.data
      };
      
      setResults(prev => [newResult, ...prev.slice(0, 9)]);
      setSnackbar({
        open: true,
        message: newResult.success ? 'Test-E-Mail mit Template erfolgreich gesendet!' : 'Fehler beim E-Mail-Versand',
        severity: newResult.success ? 'success' : 'error'
      });
    } catch (error) {
      console.error('Fehler beim Test-E-Mail-Versand:', error);
      setSnackbar({
        open: true,
        message: 'Fehler beim Test-E-Mail-Versand',
        severity: 'error'
      });
    }
  };

  // Konfiguration speichern
  const saveEmailConfig = async () => {
    setSaveLoading(true);
    try {
      const response = await api.post('/admin/email-config', { 
        emailConfigs, 
        globalEmailSettings 
      });
      
      if (response.data.success) {
        setSnackbar({
          open: true,
          message: 'E-Mail-Konfiguration erfolgreich gespeichert',
          severity: 'success'
        });
      }
    } catch (error) {
      setSnackbar({
        open: true,
        message: 'Fehler beim Speichern der Konfiguration',
        severity: 'error'
      });
    } finally {
      setSaveLoading(false);
    }
  };

  const getEmailTypeInfo = (typeId) => {
    return emailTypes.find(type => type.id === typeId);
  };

  // Tab-Content Rendering - Updated to fix emailTypes reference
  const renderConfigurationTab = () => (
    <Grid container spacing={3}>
      {/* Globale E-Mail-Einstellungen */}
      <Grid item xs={12}>
        <Paper elevation={2} sx={{ p: 3 }}>
          <Box display="flex" alignItems="center" mb={2}>
            <SettingsIcon sx={{ mr: 2, color: 'primary.main' }} />
            <Typography variant="h6">Globale E-Mail-Einstellungen</Typography>
          </Box>
          
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Absender-Name"
                value={globalEmailSettings.fromName}
                onChange={(e) => setGlobalEmailSettings(prev => ({
                  ...prev,
                  fromName: e.target.value
                }))}
                margin="normal"
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Absender E-Mail"
                value={globalEmailSettings.fromEmail}
                onChange={(e) => setGlobalEmailSettings(prev => ({
                  ...prev,
                  fromEmail: e.target.value
                }))}
                margin="normal"
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Admin E-Mail"
                value={globalEmailSettings.adminEmail}
                onChange={(e) => setGlobalEmailSettings(prev => ({
                  ...prev,
                  adminEmail: e.target.value
                }))}
                margin="normal"
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControlLabel
                control={
                  <Switch
                    checked={globalEmailSettings.emailEnabled}
                    onChange={(e) => setGlobalEmailSettings(prev => ({
                      ...prev,
                      emailEnabled: e.target.checked
                    }))}
                  />
                }
                label="E-Mail-Versand aktiviert"
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                rows={3}
                label="Standard-Footer"
                value={globalEmailSettings.footer}
                onChange={(e) => setGlobalEmailSettings(prev => ({
                  ...prev,
                  footer: e.target.value
                }))}
                margin="normal"
              />
            </Grid>
          </Grid>

          {/* Admin-Benachrichtigung-Einstellungen */}
          <Divider sx={{ my: 3 }} />
          <Box display="flex" alignItems="center" mb={2}>
            <NotificationIcon sx={{ mr: 2, color: 'warning.main' }} />
            <Typography variant="h6">Admin-Benachrichtigungen</Typography>
          </Box>
          
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Admin E-Mail-Adresse"
                value={globalEmailSettings.adminEmail}
                onChange={(e) => setGlobalEmailSettings(prev => ({
                  ...prev,
                  adminEmail: e.target.value
                }))}
                margin="normal"
                helperText="E-Mail-Adresse für alle Admin-Benachrichtigungen"
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                type="number"
                label="Schwellenwert für hohe Beträge (€)"
                value={globalEmailSettings.notifications?.highValueThreshold || 100}
                onChange={(e) => setGlobalEmailSettings(prev => ({
                  ...prev,
                  notifications: {
                    ...prev.notifications,
                    highValueThreshold: parseFloat(e.target.value) || 100
                  }
                }))}
                margin="normal"
              />
            </Grid>
            <Grid item xs={12}>
              <Box display="flex" flexWrap="wrap" gap={2}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={globalEmailSettings.notifications?.newOrders || false}
                      onChange={(e) => setGlobalEmailSettings(prev => ({
                        ...prev,
                        notifications: {
                          ...prev.notifications,
                          newOrders: e.target.checked
                        }
                      }))}
                    />
                  }
                  label="📦 Neue Bestellungen"
                />
                <FormControlLabel
                  control={
                    <Switch
                      checked={globalEmailSettings.notifications?.newInquiries || false}
                      onChange={(e) => setGlobalEmailSettings(prev => ({
                        ...prev,
                        notifications: {
                          ...prev.notifications,
                          newInquiries: e.target.checked
                        }
                      }))}
                    />
                  }
                  label="📝 Neue Anfragen"
                />
                <FormControlLabel
                  control={
                    <Switch
                      checked={globalEmailSettings.notifications?.highValueOrders || false}
                      onChange={(e) => setGlobalEmailSettings(prev => ({
                        ...prev,
                        notifications: {
                          ...prev.notifications,
                          highValueOrders: e.target.checked
                        }
                      }))}
                    />
                  }
                  label="💰 Hohe Beträge"
                />
              </Box>
            </Grid>
          </Grid>
        </Paper>
      </Grid>

      {/* E-Mail-Typ-Konfigurationen */}
      {emailTypes.map((emailType) => (
        <Grid item xs={12} key={emailType.id}>
          <Paper elevation={2} sx={{ p: 3 }}>
            <Accordion>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Box display="flex" alignItems="center" width="100%">
                  <Box sx={{ fontSize: '1.5rem', mr: 2 }}>{emailType.icon}</Box>
                  <Box flexGrow={1}>
                    <Typography variant="h6">{emailType.label}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      {emailType.description}
                    </Typography>
                  </Box>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={emailConfigs[emailType.id.replace('-', '')]?.enabled || false}
                        onChange={(e) => {
                          const configKey = emailType.id.replace('-', '');
                          setEmailConfigs(prev => ({
                            ...prev,
                            [configKey]: {
                              ...prev[configKey],
                              enabled: e.target.checked
                            }
                          }));
                        }}
                        onClick={(e) => e.stopPropagation()}
                      />
                    }
                    label="Aktiviert"
                    onClick={(e) => e.stopPropagation()}
                  />
                </Box>
              </AccordionSummary>
              <AccordionDetails>
                <Grid container spacing={3}>
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      label="Betreff"
                      value={emailConfigs[emailType.id.replace('-', '')]?.subject || ''}
                      onChange={(e) => {
                        const configKey = emailType.id.replace('-', '');
                        setEmailConfigs(prev => ({
                          ...prev,
                          [configKey]: {
                            ...prev[configKey],
                            subject: e.target.value
                          }
                        }));
                      }}
                      margin="normal"
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <FormControl fullWidth margin="normal">
                      <InputLabel>Auslöser</InputLabel>
                      <Select
                        value={emailConfigs[emailType.id.replace('-', '')]?.trigger || 'manual'}
                        label="Auslöser"
                        onChange={(e) => {
                          const configKey = emailType.id.replace('-', '');
                          setEmailConfigs(prev => ({
                            ...prev,
                            [configKey]: {
                              ...prev[configKey],
                              trigger: e.target.value
                            }
                          }));
                        }}
                      >
                        {(triggerOptions[emailType.id.replace('-', '')] || []).map((option) => (
                          <MenuItem key={option.value} value={option.value}>
                            {option.label}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid item xs={12}>
                    <Box display="flex" gap={2} mt={2}>
                      <Button
                        variant="outlined"
                        startIcon={<EditIcon />}
                        onClick={() => openTemplateEditor(emailType.id)}
                      >
                        Template bearbeiten
                      </Button>
                      <Button
                        variant="outlined"
                        startIcon={<PreviewIcon />}
                        onClick={() => sendTestEmail(emailType.id)}
                        disabled={loading}
                      >
                        Test senden
                      </Button>
                    </Box>
                  </Grid>
                </Grid>
              </AccordionDetails>
            </Accordion>
          </Paper>
        </Grid>
      ))}

      {/* Speichern Button */}
      <Grid item xs={12}>
        <Box display="flex" justifyContent="center" mt={3}>
          <Button
            variant="contained"
            size="large"
            startIcon={<SaveIcon />}
            onClick={saveEmailConfig}
            loading={saveLoading}
          >
            Konfiguration speichern
          </Button>
        </Box>
      </Grid>
    </Grid>
  );

  const renderTestingTab = () => (
    <Grid container spacing={3}>
      <Grid item xs={12}>
        <Typography variant="h6" gutterBottom>
          📧 E-Mail-Tests
        </Typography>
        <Typography variant="body2" color="text.secondary" paragraph>
          Testen Sie alle konfigurierten E-Mail-Funktionen
        </Typography>
      </Grid>

      {/* Schnell-Test-Buttons */}
      <Grid item xs={12}>
        <Paper elevation={2} sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>Schnell-Tests</Typography>
          <Grid container spacing={2}>
            {emailTypes.map((emailType) => (
              <Grid item xs={12} sm={6} md={4} key={emailType.id}>
                <Card variant="outlined">
                  <CardContent sx={{ textAlign: 'center', py: 2 }}>
                    <Box sx={{ fontSize: '2rem', mb: 1 }}>{emailType.icon}</Box>
                    <Typography variant="subtitle2" gutterBottom>
                      {emailType.label}
                    </Typography>
                    <Button
                      variant="contained"
                      color={emailType.color}
                      size="small"
                      startIcon={<SendIcon />}
                      onClick={() => sendTestEmail(emailType.id)}
                      disabled={loading}
                      fullWidth
                    >
                      Test senden
                    </Button>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Paper>
      </Grid>

      {/* Test-Ergebnisse */}
      {results.length > 0 && (
        <Grid item xs={12}>
          <Paper elevation={2} sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Test-Ergebnisse
            </Typography>
            <List>
              {results.map((result) => {
                const emailInfo = getEmailTypeInfo(result.type);
                return (
                  <ListItem key={result.id} divider>
                    <ListItemIcon>
                      {result.success ? (
                        <CheckIcon color="success" />
                      ) : (
                        <ErrorIcon color="error" />
                      )}
                    </ListItemIcon>
                    <ListItemText
                      primary={
                        <Box display="flex" alignItems="center" gap={1}>
                          <Typography variant="subtitle2">
                            {emailInfo?.label || result.type}
                          </Typography>
                          <Chip
                            size="small"
                            label={result.success ? 'Erfolgreich' : 'Fehler'}
                            color={result.success ? 'success' : 'error'}
                          />
                        </Box>
                      }
                      secondary={
                        <Box>
                          <Typography variant="body2" color="text.secondary">
                            An: {result.email} | {result.timestamp.toLocaleString()}
                          </Typography>
                          <Typography variant="body2">
                            {result.message}
                          </Typography>
                        </Box>
                      }
                    />
                  </ListItem>
                );
              })}
            </List>
          </Paper>
        </Grid>
      )}
    </Grid>
  );

  // Template-Management Tab
  const renderTemplateManagementTab = () => (
    <Grid container spacing={3}>
      <Grid item xs={12}>
        <Paper elevation={2} sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>
            📝 E-Mail-Template-Verwaltung
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Bearbeiten Sie die HTML-Templates für alle E-Mail-Typen. Änderungen werden sofort für Tests und Live-E-Mails verwendet.
          </Typography>

          <Grid container spacing={3}>
            {emailTypes.map((emailType) => (
              <Grid item xs={12} md={6} lg={4} key={emailType.id}>
                <Card variant="outlined">
                  <CardContent>
                    <Box display="flex" alignItems="center" gap={1} mb={2}>
                      <Typography variant="h6">
                        {emailType.icon} {emailType.label}
                      </Typography>
                    </Box>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                      {emailType.description}
                    </Typography>
                    
                    <Box display="flex" gap={1} flexWrap="wrap">
                      <Button
                        startIcon={<EditIcon />}
                        variant="outlined"
                        size="small"
                        onClick={() => openTemplateEditor(emailType.id)}
                      >
                        Bearbeiten
                      </Button>
                      <Button
                        startIcon={<PreviewIcon />}
                        variant="outlined"
                        size="small"
                        onClick={() => openTemplateEditor(emailType.id)}
                      >
                        Vorschau
                      </Button>
                      <Button
                        startIcon={<SendIcon />}
                        variant="contained"
                        size="small"
                        color="primary"
                        onClick={() => sendTestEmailWithCurrentTemplate(emailType.id)}
                      >
                        Testen
                      </Button>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Paper>
      </Grid>

      {/* Template-Übersicht */}
      <Grid item xs={12}>
        <Paper elevation={2} sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>
            🔍 Template-Übersicht
          </Typography>
          <Alert severity="info" sx={{ mb: 2 }}>
            Diese Templates werden für alle E-Mails verwendet. Änderungen wirken sich sofort auf Test- und Live-E-Mails aus.
          </Alert>
          
          <Grid container spacing={2}>
            {Object.keys(templates).map((templateKey) => (
              <Grid item xs={12} md={6} key={templateKey}>
                <Paper variant="outlined" sx={{ p: 2 }}>
                  <Typography variant="subtitle1" gutterBottom>
                    {emailTypes.find(t => t.id === templateKey)?.label || templateKey}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    Letzte Änderung: {new Date().toLocaleDateString()}
                  </Typography>
                  <Box display="flex" gap={1}>
                    <Button
                      startIcon={<CodeIcon />}
                      variant="outlined"
                      size="small"
                      onClick={() => openTemplateEditor(templateKey)}
                    >
                      Code ansehen
                    </Button>
                    <Button
                      startIcon={<FileCopyIcon />}
                      variant="outlined"
                      size="small"
                      onClick={() => navigator.clipboard.writeText(templates[templateKey])}
                    >
                      Kopieren
                    </Button>
                  </Box>
                </Paper>
              </Grid>
            ))}
          </Grid>
        </Paper>
      </Grid>
    </Grid>
  );

  return (
    <Container maxWidth="xl">
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          📧 E-Mail-Verwaltung
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Konfigurieren und testen Sie alle E-Mail-Funktionen der Anwendung
        </Typography>
      </Box>

      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs 
          value={currentTab} 
          onChange={(e, newValue) => setCurrentTab(newValue)}
          aria-label="E-Mail-Verwaltung Tabs"
        >
          <Tab 
            label="Konfiguration" 
            icon={<SettingsIcon />}
            iconPosition="start"
          />
          <Tab 
            label="Tests" 
            icon={<SendIcon />}
            iconPosition="start"
          />
          <Tab 
            label="Templates" 
            icon={<CodeIcon />}
            iconPosition="start"
          />
        </Tabs>
      </Box>

      {currentTab === 0 && renderConfigurationTab()}
      {currentTab === 1 && renderTestingTab()}
      {currentTab === 2 && renderTemplateManagementTab()}

      {/* Template-Editor Dialog */}
      <Dialog
        open={templateEditor}
        onClose={() => setTemplateEditor(false)}
        maxWidth="lg"
        fullWidth
        PaperProps={{
          sx: { height: '90vh' }
        }}
      >
        <DialogTitle>
          <Box display="flex" alignItems="center" gap={1}>
            <CodeIcon />
            Template bearbeiten: {emailTypes.find(t => t.id === selectedTemplate)?.label}
          </Box>
        </DialogTitle>
        <DialogContent sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
          <Box sx={{ mb: 2 }}>
            <Alert severity="info">
              Verfügbare Variablen: $&#123;userName&#125;, $&#123;userEmail&#125;, $&#123;verificationUrl&#125;, $&#123;resetUrl&#125;, $&#123;orderData&#125;, etc.
            </Alert>
          </Box>
          
          <Box display="flex" gap={2} sx={{ mb: 2 }}>
            <Button
              startIcon={<PreviewIcon />}
              variant="outlined"
              onClick={previewTemplate}
            >
              Vorschau
            </Button>
            <Button
              startIcon={<SendIcon />}
              variant="outlined"
              color="primary"
              onClick={() => sendTestEmailWithCurrentTemplate(selectedTemplate)}
            >
              Test senden
            </Button>
            <Button
              startIcon={<RefreshIcon />}
              variant="outlined"
              onClick={() => loadTemplates()}
            >
              Neu laden
            </Button>
          </Box>

          <TextField
            fullWidth
            multiline
            label="HTML-Template"
            value={templateContent}
            onChange={(e) => setTemplateContent(e.target.value)}
            sx={{ 
              flex: 1,
              '& .MuiInputBase-root': {
                height: '100%',
                alignItems: 'stretch'
              },
              '& textarea': {
                fontFamily: 'Monaco, Menlo, "Ubuntu Mono", monospace',
                fontSize: '14px',
                lineHeight: '1.5'
              }
            }}
            InputProps={{
              style: { height: '100%' }
            }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setTemplateEditor(false)}>
            Abbrechen
          </Button>
          <Button onClick={saveTemplate} variant="contained" startIcon={<SaveIcon />}>
            Speichern
          </Button>
        </DialogActions>
      </Dialog>

      {/* Template-Vorschau Dialog */}
      <Dialog
        open={Boolean(templatePreview)}
        onClose={() => setTemplatePreview('')}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          <Box display="flex" alignItems="center" gap={1}>
            <PreviewIcon />
            Template-Vorschau
          </Box>
        </DialogTitle>
        <DialogContent>
          <Box
            sx={{
              border: '1px solid #ddd',
              borderRadius: 1,
              p: 2,
              backgroundColor: '#f9f9f9',
              maxHeight: '70vh',
              overflow: 'auto'
            }}
            dangerouslySetInnerHTML={{ __html: templatePreview }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setTemplatePreview('')}>
            Schließen
          </Button>
        </DialogActions>
      </Dialog>

      {/* Legacy Template-Editor Dialog */}
      <Dialog
        open={editDialog.open}
        onClose={() => setEditDialog({ open: false, emailType: null, template: '' })}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          Template bearbeiten: {getEmailTypeInfo(editDialog.emailType)?.label}
        </DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            multiline
            rows={10}
            label="E-Mail-Template"
            value={editDialog.template}
            onChange={(e) => setEditDialog(prev => ({ ...prev, template: e.target.value }))}
            margin="normal"
            helperText="Verfügbare Variablen: {{userName}}, {{userEmail}}, {{orderNumber}}, {{resetUrl}}, etc."
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialog({ open: false, emailType: null, template: '' })}>
            Abbrechen
          </Button>
          <Button onClick={saveTemplate} variant="contained">
            Speichern
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar für Benachrichtigungen */}
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

export default AdminEmailConfiguration;