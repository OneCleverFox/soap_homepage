import React, { useState, useEffect, useCallback } from 'react';
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
  CircularProgress,
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
  Check as CheckIcon,
  Error as ErrorIcon,
  ExpandMore as ExpandMoreIcon,
  Edit as EditIcon,
  Visibility as PreviewIcon,
  Save as SaveIcon,
  Code as CodeIcon,
  FileCopy as FileCopyIcon,
  Refresh as RefreshIcon,
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
  const [editorTab, setEditorTab] = useState(0);

  const normalizeTriggerForEmailType = (emailType, triggerValue) => {
    const legacyTriggerMap = {
      registration: 'user_registration',
      'after-verification': 'email_verified',
      auto: 'manual',
      order_placed: 'manual',
      'order-placed': 'manual',
      order_rejected: 'manual',
      'order-rejected': 'manual',
      new_order: 'manual',
      new_inquiry: 'manual',
      'inquiry-submitted': 'manual',
      password_reset_request: 'manual'
    };

    const allowedTriggers = (triggerOptionsMap[emailType] || []).map((option) => option.value);
    const mappedTrigger = legacyTriggerMap[triggerValue] || triggerValue;

    if (allowedTriggers.includes(mappedTrigger)) {
      return mappedTrigger;
    }

    return allowedTriggers[0] || '';
  };

  const normalizeEmailConfigs = (configs = {}) => {
    return Object.fromEntries(
      Object.entries(configs).map(([key, config]) => [
        key,
        {
          ...config,
          trigger: normalizeTriggerForEmailType(key, config?.trigger)
        }
      ])
    );
  };

  const loadEmailConfig = useCallback(async () => {
    try {
      const response = await api.get('/admin-settings/email/config');
      if (response.data.success) {
        // Stelle sicher, dass emailConfigs populated werden und nicht undefined
        const configs = normalizeEmailConfigs(response.data.emailConfigs || {});
        setEmailConfigs(prev => ({ ...prev, ...configs }));
        // Mergen statt überschreiben, damit lokale Defaults (z.B. adminEmail) erhalten bleiben
        setGlobalEmailSettings(prev => ({ ...prev, ...(response.data.globalSettings || {}) }));
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
  }, []);

  // E-Mail-Konfigurationen laden
  useEffect(() => {
    loadEmailConfig();
  }, [loadEmailConfig]);

  // Templates von Backend laden
  const loadTemplates = async () => {
    try {
      const response = await api.get('/admin-settings/email/templates');
      if (response.data.success) {
        // Response kann templates ODER emailConfigs enthalten
        const templates = response.data.templates || response.data.emailConfigs || {};
        setTemplates(templates);
      } else {
        console.warn('Templates response invalid:', response.data);
        setTemplates({});
      }
    } catch (error) {
      console.error('Fehler beim Laden der Templates:', error);
      setTemplates({});
    }
  };

  // E-Mail-Konfigurationen
  const [emailConfigs, setEmailConfigs] = useState({
    verification: { enabled: true, subject: '', trigger: 'user_registration' },
    welcome: { enabled: true, subject: '', trigger: 'email_verified' },
    passwordreset: { enabled: true, subject: '', trigger: 'manual' },
    passwordchanged: { enabled: true, subject: '', trigger: 'manual' },
    orderconfirmation: { enabled: true, subject: '', trigger: 'manual' },
    orderrejection: { enabled: true, subject: '', trigger: 'manual' },
    adminordernotification: { enabled: true, subject: '', trigger: 'manual' },
    admininquirynotification: { enabled: true, subject: '', trigger: 'manual' }
  });
  
  // Trigger-Optionen für Select-Dropdowns (als triggerOptionsMap)
  const triggerOptionsMap = {
    verification: [
      { label: 'Benutzer-Registrierung', value: 'user_registration' },
      { label: 'Manuell', value: 'manual' }
    ],
    welcome: [
      { label: 'E-Mail verifiziert', value: 'email_verified' },
      { label: 'Benutzer-Registrierung', value: 'user_registration' },
      { label: 'Manuell', value: 'manual' }
    ],
    passwordreset: [
      { label: 'Manuell', value: 'manual' }
    ],
    passwordchanged: [
      { label: 'Manuell', value: 'manual' }
    ],
    orderconfirmation: [
      { label: 'Manuell', value: 'manual' }
    ],
    orderrejection: [
      { label: 'Manuell', value: 'manual' }
    ],
    adminordernotification: [
      { label: 'Manuell', value: 'manual' }
    ],
    admininquirynotification: [
      { label: 'Manuell', value: 'manual' }
    ]
  };

  const [globalEmailSettings, setGlobalEmailSettings] = useState({
    fromName: 'Gluecksmomente Manufaktur',
    fromEmail: 'info.gluecksmomente.manufaktur@gmail.com',
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
      id: 'passwordreset', 
      label: 'Passwort zurücksetzen', 
      description: 'Bei Passwort-Reset-Anfrage',
      color: 'warning',
      icon: '🔒'
    },
    { 
      id: 'passwordchanged', 
      label: 'Passwort-Änderung bestätigt', 
      description: 'Nach erfolgreicher Änderung',
      color: 'info',
      icon: '✅'
    },
    { 
      id: 'orderconfirmation', 
      label: 'Bestellbestätigung', 
      description: 'Nach abgeschlossener Bestellung',
      color: 'info',
      icon: '📦'
    },
    { 
      id: 'orderrejection', 
      label: 'Bestellung abgelehnt', 
      description: 'Wenn Bestellung nicht verarbeitet wird',
      color: 'error',
      icon: '❌'
    },
    { 
      id: 'adminordernotification', 
      label: 'Admin-Bestellbenachrichtigung', 
      description: 'Bei neuen Bestellungen',
      color: 'secondary',
      icon: '🚨'
    },
    { 
      id: 'admininquirynotification', 
      label: 'Admin-Anfragebenachrichtigung', 
      description: 'Bei neuen Kundenanfragen',
      color: 'warning',
      icon: '📝'
    }
  ];

  // Mapping von Email-Typ-ID zu Backend-Route
  const testEmailRouteMap = {
    verification: 'verification',
    welcome: 'welcome',
    passwordreset: 'password-reset',
    passwordchanged: 'password-changed',
    orderconfirmation: 'order-confirmation',
    orderrejection: 'order-rejection',
    adminordernotification: 'admin-notification',
    admininquirynotification: 'admin-inquiry-notification'
  };

  // E-Mail testen
  const sendTestEmail = async (emailType, customEmail = null) => {
    setLoading(true);
    
    const targetEmail = customEmail || globalEmailSettings.adminEmail || '';
    
    console.log('📧 [Frontend] E-Mail-Test gestartet...');
    console.log('  📧 E-Mail-Typ:', emailType);
    console.log('  🎯 Ziel-E-Mail:', targetEmail || '(wird vom Backend bestimmt)');
    console.log('  ⏰ Zeitpunkt:', new Date().toLocaleString());
    
    try {
      const payload = {};
      if (customEmail) {
        payload.email = customEmail;
      } else if (targetEmail) {
        payload.email = targetEmail;
      }

      const routePath = testEmailRouteMap[emailType] || emailType;
      console.log('  📡 Sende Anfrage an Backend...');
      const response = await api.post(`/invoice/test-email/${routePath}`, payload);
      
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
      const response = await api.get(`/admin-settings/email/templates/${templateType}`);
      if (response.data.success) {
        setSelectedTemplate(templateType);
        setTemplateContent(response.data.template || '');
        setTemplateEditor(true);
      }
    } catch (error) {
      if (error.response?.status === 404) {
        setSelectedTemplate(templateType);
        setTemplateContent('');
        setTemplateEditor(true);
      } else {
        console.error('Fehler beim Laden des Templates:', error);
        setSnackbar({
          open: true,
          message: 'Fehler beim Laden des Templates',
          severity: 'error'
        });
      }
    }
  };

  const saveTemplate = async () => {
    try {
      const response = await api.post(`/admin-settings/email/templates/${selectedTemplate}`, {
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

  const getPreviewStylesByTemplate = (templateType) => {
    const paletteByType = {
      verification: { start: '#8B4B61', end: '#5D3242', border: '#E8D5B7', button: '#8B4B61', pageBg: '#FEFDFB' },
      welcome: { start: '#A8D5B5', end: '#7FB88A', border: '#C8E6D0', button: '#7FB88A', pageBg: '#FEFDFB' },
      'password-reset': { start: '#E8D5B7', end: '#D4B895', border: '#F5EEDD', button: '#8B4B61', pageBg: '#FEFDFB' },
      'order-confirmation': { start: '#8B4B61', end: '#5D3242', border: '#E8D5B7', button: '#8B4B61', pageBg: '#FEFDFB' },
      'admin-notification': { start: '#B17A89', end: '#8B4B61', border: '#E8D5B7', button: '#8B4B61', pageBg: '#FEFDFB' },
      'admin-inquiry-notification': { start: '#B17A89', end: '#8B4B61', border: '#E8D5B7', button: '#8B4B61', pageBg: '#FEFDFB' }
    };

    const colors = paletteByType[templateType] || paletteByType.verification;

    return {
      wrapper: `font-family: Arial, sans-serif; max-width: 680px; margin: 0 auto; color: #2C2C2C; line-height: 1.65; background:${colors.pageBg}; padding:16px; border-radius:16px;`,
      headerCentered: `background:linear-gradient(135deg,${colors.start},${colors.end}); color:white; padding:28px 24px; border-radius:14px 14px 0 0; text-align:center; box-shadow:0 8px 24px rgba(93,50,66,0.16);`,
      header: `background:linear-gradient(135deg,${colors.start},${colors.end}); color:white; padding:26px 24px; border-radius:14px 14px 0 0; box-shadow:0 8px 24px rgba(93,50,66,0.16);`,
      body: `border:1px solid ${colors.border}; border-top:none; border-radius:0 0 14px 14px; padding:24px; background:white; box-shadow:0 6px 20px rgba(93,50,66,0.08);`,
      panel: 'background:#F5EEDD; border:1px solid #E8D5B7; border-radius:10px; padding:14px 16px;',
      button: `display:inline-block; background:linear-gradient(135deg,${colors.button},#5D3242); color:#fff; text-decoration:none; padding:12px 22px; border-radius:999px; font-weight:700; box-shadow:0 6px 16px rgba(139,75,97,0.25);`
    };
  };

  const buildTemplatePreview = (rawTemplate, templateType) => {
    const styles = getPreviewStylesByTemplate(templateType);
    let html = rawTemplate || '';

    html = html
      .replace(/\$\{styles\.wrapper\}/g, styles.wrapper)
      .replace(/\$\{styles\.headerCentered\}/g, styles.headerCentered)
      .replace(/\$\{styles\.header\}/g, styles.header)
      .replace(/\$\{styles\.body\}/g, styles.body)
      .replace(/\$\{styles\.panel\}/g, styles.panel)
      .replace(/\$\{styles\.button\}/g, styles.button)
      .replace(/\$\{developmentWarning\}/g, '<div style="background:#fff7ed;border:1px solid #fdba74;border-radius:10px;padding:12px 14px;margin:12px 0;color:#7c2d12;"><strong>Hinweis (Vorschau):</strong> Development-Weiterleitungsinfo</div>');

    html = html.replace(/\$\{this\.renderTemplateBadge\('([^']+)'\)\}/g, (_, text) => {
      return `<span style="display:inline-block;padding:6px 12px;border-radius:999px;background:rgba(255,255,255,0.2);border:1px solid rgba(255,255,255,0.35);color:white;font-size:12px;font-weight:700;letter-spacing:0.2px;margin-top:10px;">${text}</span>`;
    });

    html = html.replace(/\$\{this\.renderTemplateButton\(([^,]+),\s*'([^']+)'\s*,\s*styles\.button\)\}/g, (_, __urlExpr, label) => {
      return `<a href="#" style="${styles.button}">${label}</a>`;
    });

    html = html.replace(/\$\{this\.renderTemplateFooter\(\)\}/g, `
      <div style="margin-top:22px; padding-top:14px; border-top:1px solid #E8D5B7; text-align:center;">
        <p style="margin:0; font-size:12px; color:#5D3242;">Mit Liebe gestaltet von der Gluecksmomente Manufaktur</p>
      </div>
    `);

    html = html.replace(/\$\{this\.renderTemplateInfoBox\('([^']+)',\s*\[([\s\S]*?)\],\s*'([^']+)'\)\}/g, (_, title, rawItems) => {
      const items = [...rawItems.matchAll(/'([^']+)'/g)].map((m) => m[1]);
      const listHtml = items.map((item) => `<li>${item}</li>`).join('');
      return `
        <div style="background:#F5EEDD; border:1px solid #E8D5B7; border-radius:10px; padding:14px 16px; margin:16px 0;">
          <p style="margin:0 0 6px 0; font-weight:700; color:#5D3242;">${title}</p>
          <ul style="margin:0; padding-left:18px; color:#5D3242;">${listHtml}</ul>
        </div>
      `;
    });

    html = html.replace(/\$\{bestellung\.artikel\.map\([\s\S]*?\.join\('\'\)\}/g, `
      <tr>
        <td style="padding:10px; border-bottom:1px solid #f3f4f6;">Beispielartikel A</td>
        <td style="text-align:center; padding:10px; border-bottom:1px solid #f3f4f6;">2</td>
        <td style="text-align:right; padding:10px; border-bottom:1px solid #f3f4f6;">39,90 EUR</td>
      </tr>
      <tr>
        <td style="padding:10px; border-bottom:1px solid #f3f4f6;">Beispielartikel B</td>
        <td style="text-align:center; padding:10px; border-bottom:1px solid #f3f4f6;">1</td>
        <td style="text-align:right; padding:10px; border-bottom:1px solid #f3f4f6;">19,90 EUR</td>
      </tr>
    `);

    html = html
      .replace(/\$\{userName \|\| 'Kunde'\}/g, 'Max Mustermann')
      .replace(/\$\{userName \|\| 'und herzlich willkommen'\}/g, 'Max Mustermann')
      .replace(/\$\{userName\}/g, 'Max Mustermann')
      .replace(/\$\{resetUrl\}/g, 'https://example.com/reset?token=demo')
      .replace(/\$\{verificationUrl\}/g, 'https://example.com/verify-email?token=demo')
      .replace(/\$\{customerName\}/g, 'Max Mustermann')
      .replace(/\$\{kundenname \|\| 'Kunde'\}/g, 'Max Mustermann')
      .replace(/\$\{to\}/g, 'max@example.com')
      .replace(/\$\{[^}]+\}/g, '');

    return html;
  };

  const previewTemplate = () => {
    setTemplatePreview(buildTemplatePreview(templateContent, selectedTemplate));
  };

  const sendTestEmailWithCurrentTemplate = async (emailType) => {
    try {
      const response = await api.post(`/admin-settings/email/test-email-with-template/${emailType}`, {
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
      const response = await api.post('/admin-settings/email/config', { 
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
                value={globalEmailSettings.adminEmail || ''}
                onChange={(e) => setGlobalEmailSettings(prev => ({
                  ...prev,
                  adminEmail: e.target.value
                }))}
                margin="normal"
                helperText="Empfänger für alle Admin-Benachrichtigungen"
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
                        checked={emailConfigs[emailType.id]?.enabled || false}
                        onChange={(e) => {
                          setEmailConfigs(prev => ({
                            ...prev,
                            [emailType.id]: {
                              ...prev[emailType.id],
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
                      value={emailConfigs[emailType.id]?.subject || ''}
                      onChange={(e) => {
                        setEmailConfigs(prev => ({
                          ...prev,
                          [emailType.id]: {
                            ...prev[emailType.id],
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
                        value={emailConfigs[emailType.id]?.trigger || 
                               (triggerOptionsMap[emailType.id] || [])[0]?.value || ''}
                        label="Auslöser"
                        onChange={(e) => {
                          setEmailConfigs(prev => ({
                            ...prev,
                            [emailType.id]: {
                              ...prev[emailType.id],
                              trigger: e.target.value
                            }
                          }));
                        }}
                      >
                        {(triggerOptionsMap[emailType.id] || []).map((option) => (
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
            startIcon={saveLoading ? <CircularProgress size={20} /> : <SaveIcon />}
            onClick={saveEmailConfig}
            disabled={saveLoading}
          >
            {saveLoading ? 'Speichere...' : 'Konfiguration speichern'}
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

  const openTemplatePreviewDirect = async (templateType) => {
    try {
      const response = await api.get(`/admin-settings/email/templates/${templateType}`);
      if (response.data.success) {
        setTemplatePreview(buildTemplatePreview(response.data.template, templateType));
      }
    } catch (error) {
      setSnackbar({ open: true, message: 'Vorschau konnte nicht geladen werden', severity: 'error' });
    }
  };

  // Template-Management Tab
  const renderTemplateManagementTab = () => (
    <Grid container spacing={3}>
      <Grid item xs={12}>
        <Paper elevation={2} sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>
            📝 E-Mail-Template-Verwaltung
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Klick auf <strong>Bearbeiten</strong> öffnet den HTML-Editor. <strong>Vorschau</strong> zeigt die fertige Mail. <strong>Testen</strong> sendet eine E-Mail an Ihre Admin-Adresse.
          </Typography>

          <Grid container spacing={3}>
            {emailTypes.map((emailType) => (
              <Grid item xs={12} md={6} lg={4} key={emailType.id}>
                <Card variant="outlined">
                  <CardContent>
                    <Box display="flex" alignItems="center" gap={1} mb={1}>
                      <Typography sx={{ fontSize: '1.4rem' }}>{emailType.icon}</Typography>
                      <Typography variant="subtitle1" fontWeight={600}>{emailType.label}</Typography>
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
                        onClick={() => openTemplatePreviewDirect(emailType.id)}
                      >
                        Vorschau
                      </Button>
                      <Button
                        startIcon={<SendIcon />}
                        variant="contained"
                        size="small"
                        color="primary"
                        onClick={() => sendTestEmail(emailType.id)}
                        disabled={loading}
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

      {/* Template-Editor Dialog – kombiniert Code + Vorschau als Tabs */}
      <Dialog
        open={templateEditor}
        onClose={() => { setTemplateEditor(false); setEditorTab(0); }}
        maxWidth="lg"
        fullWidth
        PaperProps={{ sx: { height: '92vh' } }}
      >
        <DialogTitle sx={{ pb: 0 }}>
          <Box display="flex" alignItems="center" justifyContent="space-between">
            <Box display="flex" alignItems="center" gap={1}>
              <CodeIcon />
              {emailTypes.find(t => t.id === selectedTemplate)?.icon}{' '}
              {emailTypes.find(t => t.id === selectedTemplate)?.label}
            </Box>
            <Button
              startIcon={<SendIcon />}
              variant="contained"
              size="small"
              onClick={() => sendTestEmail(selectedTemplate)}
              disabled={loading}
            >
              Test-Mail senden
            </Button>
          </Box>
          <Tabs
            value={editorTab}
            onChange={(_, v) => {
              setEditorTab(v);
              if (v === 1) setTemplatePreview(buildTemplatePreview(templateContent, selectedTemplate));
            }}
            sx={{ mt: 1 }}
          >
            <Tab label="HTML-Code" icon={<CodeIcon />} iconPosition="start" />
            <Tab label="Vorschau" icon={<PreviewIcon />} iconPosition="start" />
          </Tabs>
        </DialogTitle>

        <DialogContent sx={{ display: 'flex', flexDirection: 'column', pt: 2 }}>
          {editorTab === 0 && (
            <>
              <Alert severity="info" sx={{ mb: 2 }}>
                Verfügbare Variablen: $&#123;userName&#125;, $&#123;verificationUrl&#125;, $&#123;resetUrl&#125;, $&#123;loginUrl&#125; usw.
              </Alert>
              <TextField
                fullWidth
                multiline
                label="HTML-Template"
                value={templateContent}
                onChange={(e) => setTemplateContent(e.target.value)}
                sx={{
                  flex: 1,
                  '& .MuiInputBase-root': { height: '100%', alignItems: 'stretch' },
                  '& textarea': { fontFamily: 'Monaco, Menlo, "Ubuntu Mono", monospace', fontSize: '13px', lineHeight: '1.5' }
                }}
                InputProps={{ style: { height: '100%' } }}
              />
            </>
          )}
          {editorTab === 1 && (
            <Box
              sx={{ flex: 1, overflow: 'auto', border: '1px solid #E8D5B7', borderRadius: 2, p: 1, background: '#FEFDFB' }}
              dangerouslySetInnerHTML={{ __html: templatePreview }}
            />
          )}
        </DialogContent>

        <DialogActions>
          <Button onClick={() => { setTemplateEditor(false); setEditorTab(0); }}>Abbrechen</Button>
          <Button onClick={saveTemplate} variant="contained" startIcon={<SaveIcon />}>Speichern</Button>
        </DialogActions>
      </Dialog>

      {/* Standalone-Vorschau Dialog (vom Vorschau-Button in den Karten) */}
      <Dialog
        open={Boolean(templatePreview) && !templateEditor}
        onClose={() => setTemplatePreview('')}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          <Box display="flex" alignItems="center" gap={1}><PreviewIcon />Template-Vorschau</Box>
        </DialogTitle>
        <DialogContent>
          <Box
            sx={{ border: '1px solid #E8D5B7', borderRadius: 2, p: 1, background: '#FEFDFB', maxHeight: '70vh', overflow: 'auto' }}
            dangerouslySetInnerHTML={{ __html: templatePreview }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setTemplatePreview('')}>Schließen</Button>
        </DialogActions>
      </Dialog>

      {/* Legacy Template-Editor Dialog – kann entfernt bleiben */}
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