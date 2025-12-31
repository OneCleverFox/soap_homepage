import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Paper,
  Typography,
  Grid,
  TextField,
  Switch,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button,
  Card,
  CardContent,
  CardHeader,
  Chip,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Slider,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Tab,
  Tabs,
  FormControlLabel,
  Snackbar
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  Preview as PreviewIcon,
  Save as SaveIcon,
  Add as AddIcon,
  DragIndicator as DragIcon,
  ViewColumn as LayoutIcon,
  Business as CompanyIcon,
  Receipt as InvoiceIcon
} from '@mui/icons-material';
import { styled } from '@mui/material/styles';
import { SketchPicker } from 'react-color';
import { useAdminState } from '../hooks/useAdminState';
import { API_URL } from '../services/api';

const StyledPaper = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(3),
  height: '100%'
}));

const PreviewContainer = styled(Box)(({ theme }) => ({
  border: `2px solid ${theme.palette.divider}`,
  borderRadius: theme.shape.borderRadius,
  minHeight: 600,
  backgroundColor: theme.palette.background.default,
  position: 'relative'
}));

const VariableChip = styled(Chip)(({ theme }) => ({
  margin: theme.spacing(0.5),
  cursor: 'pointer',
  '&:hover': {
    backgroundColor: theme.palette.primary.light,
    color: theme.palette.primary.contrastText
  }
}));

const AdminInvoiceConfiguration = () => {
  // Standardisierte Admin-States
  const {
    loading, setLoading,
    snackbar, showSnackbar, hideSnackbar
  } = useAdminState(true);

  const [currentTemplate, setCurrentTemplate] = useState(null);
  const [saving, setSaving] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [activeTab, setActiveTab] = useState(0);
  const [variablesDialog, setVariablesDialog] = useState(false);
  const [colorPickerOpen, setColorPickerOpen] = useState({});

  // Verfügbare Variablen
  const [availableVariables, setAvailableVariables] = useState([]);

  // Template-Struktur wird direkt in der Funktion definiert
  const _createDefaultTemplate = () => ({
    name: 'Neue Rechnungsvorlage',
    isDefault: false,
    companyInfo: {
      name: 'Glücksmomente Manufaktur',
      address: {
        street: 'Musterstraße 123',
        postalCode: '64673',
        city: 'Zwingenberg',
        country: 'Deutschland'
      },
      contact: {
        phone: '+49 123 456789',
        email: 'info@gluecksmomente-manufaktur.de',
        website: 'www.gluecksmomente-manufaktur.de'
      },
      taxInfo: {
        taxNumber: 'DE123456789',
        vatId: 'USt-IdNr.: DE123456789',
        ceo: 'Max Mustermann',
        legalForm: 'Einzelunternehmen',
        registrationCourt: 'Amtsgericht Musterstadt',
        registrationNumber: 'HRB 123456'
      },
      bankDetails: {
        bankName: 'Musterbank',
        iban: 'DE89 3704 0044 0532 0130 00',
        bic: 'COBADEFF'
      },
      logo: {
        enabled: false,
        url: ''
      }
    },
    layout: {
      header: {
        showLogo: true,
        logoPosition: 'left',
        logoSize: 'medium',
        showCompanyInfo: true,
        companyInfoPosition: 'right'
      },
      colors: {
        primary: '#8b4a8b',
        secondary: '#f5f5f5',
        text: '#333333',
        accent: '#4caf50'
      },
      fonts: {
        primary: 'Arial, sans-serif',
        size: {
          heading: 24,
          subheading: 18,
          body: 12,
          small: 10
        }
      },
      spacing: {
        margin: 20,
        lineHeight: 1.4
      }
    },
    sections: {
      invoiceInfo: {
        enabled: true,
        position: 1,
        title: 'RECHNUNG',
        showInvoiceNumber: true,
        showInvoiceDate: true,
        showDueDate: true,
        showOrderNumber: true
      },
      customerInfo: {
        enabled: true,
        position: 2,
        title: 'Rechnungsadresse',
        showTitle: true
      },
      productTable: {
        enabled: true,
        position: 3,
        columns: {
          position: { enabled: true, width: 8 },
          description: { enabled: true, width: 40 },
          quantity: { enabled: true, width: 12 },
          unitPrice: { enabled: true, width: 15 },
          total: { enabled: true, width: 15 }
        },
        showHeaders: true,
        alternateRowColors: true
      },
      totals: {
        enabled: true,
        position: 4,
        showSubtotal: true,
        showTax: true,
        showShipping: true,
        showTotal: true,
        alignment: 'right'
      },
      footer: {
        enabled: true,
        position: 5,
        customText: 'Vielen Dank für Ihren Einkauf bei Glücksmomente Manufaktur!',
        showPaymentInfo: true,
        showReturnPolicy: true
      }
    }
  });

  // API-Aufrufe
  const _loadTemplates = useCallback(async () => {
    try {
      const response = await fetch(`${API_URL}/admin/invoice/templates`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      const data = await response.json();
      
      if (data.success) {
        // Templates werden hier verarbeitet
        const defaultTemplate = data.data.find(t => t.isDefault);
        let template = defaultTemplate || data.data[0];
        
        // Standard-Layout-Werte setzen falls nicht vorhanden
        if (template) {
          // Hilfsfunktion um Standard-Werte nur zu setzen wenn sie nicht bereits existieren
          const setDefaultIfUndefined = (obj, defaults) => {
            const result = { ...defaults };
            if (obj) {
              Object.keys(obj).forEach(key => {
                if (obj[key] !== undefined && obj[key] !== null) {
                  result[key] = obj[key];
                }
              });
            }
            return result;
          };

          template = {
            ...template,
            layout: {
              ...template.layout,
              header: setDefaultIfUndefined(template.layout?.header, {
                style: 'standard',
                alignment: 'left',
                height: 100,
                showBorder: false
              }),
              footer: setDefaultIfUndefined(template.layout?.footer, {
                layout: 'columns',
                columns: 3,
                showContactInfo: true,
                showTaxInfo: true,
                showBankDetails: false, // Standard: aus
                showLegalInfo: true,
                height: 80,
                showBorder: true,
                fontSize: 8
              })
            },
            companyInfo: {
              ...template.companyInfo,
              isSmallBusiness: template.companyInfo?.isSmallBusiness ?? false, // Nur setzen wenn undefined
              paymentMethod: template.companyInfo?.paymentMethod || 'sofort',
              logo: setDefaultIfUndefined(template.companyInfo?.logo, {
                enabled: false, // Standard: aus
                url: '',
                width: 120,
                height: 60
              })
            }
          };
          setCurrentTemplate(template);
        }
      }
    } catch (error) {
      console.error('Fehler beim Laden der Templates:', error);
      showSnackbar('Fehler beim Laden der Templates', 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  const loadVariables = useCallback(async () => {
    try {
      const response = await fetch(`${API_URL}/admin/invoice/variables`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      const data = await response.json();
      
      if (data.success && Array.isArray(data.data)) {
        setAvailableVariables(data.data);
      } else {
        // Fallback: Setze leeres Array wenn API fehlschlägt
        setAvailableVariables([]);
      }
    } catch (error) {
      console.error('Fehler beim Laden der Variablen:', error);
      // Fallback: Setze leeres Array bei Fehler
      setAvailableVariables([]);
    }
  }, []);

  const handleLogoUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    // Validierung
    if (!file.type.startsWith('image/')) {
      showSnackbar('Bitte wählen Sie eine Bilddatei aus', 'error');
      return;
    }

    if (file.size > 2 * 1024 * 1024) { // 2MB Limit
      showSnackbar('Die Datei ist zu groß (max. 2MB)', 'error');
      return;
    }

    const formData = new FormData();
    formData.append('logo', file);

    try {
      const response = await fetch(`${API_URL}/admin/invoice/upload-logo`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: formData
      });

      const data = await response.json();
      
      if (response.ok && data.success) {
        updateTemplate('companyInfo.logo.url', data.logoUrl);
        updateTemplate('companyInfo.logo.enabled', true);
        showSnackbar('Logo erfolgreich hochgeladen', 'success');
      } else {
        showSnackbar(data.message || 'Fehler beim Upload', 'error');
      }
    } catch (error) {
      console.error('Fehler beim Logo-Upload:', error);
      showSnackbar('Fehler beim Logo-Upload', 'error');
    }
  };

  const removeLogo = () => {
    updateTemplate('companyInfo.logo.enabled', false);
    updateTemplate('companyInfo.logo.url', '');
    showSnackbar('Logo entfernt', 'success');
  };

  const setDefaultLogo = async () => {
    try {
      // SVG-Logo aus favicon.svg
      const svgString = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100">
  <circle cx="50" cy="50" r="48" fill="#f8f5f0" stroke="#d4a574" stroke-width="2"/>
  <rect x="48" y="60" width="4" height="25" fill="#4a7c59" rx="2"/>
  <ellipse cx="42" cy="70" rx="8" ry="4" fill="#5a8b67" transform="rotate(-30 42 70)"/>
  <ellipse cx="58" cy="75" rx="6" ry="3" fill="#5a8b67" transform="rotate(45 58 75)"/>
  <ellipse cx="50" cy="35" rx="6" ry="12" fill="#e8a5c4" transform="rotate(0 50 50)"/>
  <ellipse cx="50" cy="35" rx="6" ry="12" fill="#e8a5c4" transform="rotate(60 50 50)"/>
  <ellipse cx="50" cy="35" rx="6" ry="12" fill="#e8a5c4" transform="rotate(120 50 50)"/>
  <ellipse cx="50" cy="35" rx="6" ry="12" fill="#e8a5c4" transform="rotate(180 50 50)"/>
  <ellipse cx="50" cy="35" rx="6" ry="12" fill="#e8a5c4" transform="rotate(240 50 50)"/>
  <ellipse cx="50" cy="35" rx="6" ry="12" fill="#e8a5c4" transform="rotate(300 50 50)"/>
  <circle cx="50" cy="50" r="8" fill="#f9e79f"/>
  <circle cx="50" cy="50" r="5" fill="#f4d03f"/>
  <circle cx="47" cy="47" r="1.5" fill="#e67e22"/>
  <circle cx="53" cy="52" r="1.5" fill="#e67e22"/>
  <circle cx="50" cy="50" r="1" fill="#d35400"/>
</svg>`;
      
      // SVG zu Canvas konvertieren
      const canvas = document.createElement('canvas');
      canvas.width = 200;
      canvas.height = 200;
      const ctx = canvas.getContext('2d');
      
      // Weißer Hintergrund
      ctx.fillStyle = 'white';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      const img = new Image();
      const svgBlob = new Blob([svgString], {type: 'image/svg+xml;charset=utf-8'});
      const url = URL.createObjectURL(svgBlob);
      
      img.onload = function() {
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/png');
        
        // Logo als Data URL setzen
        updateTemplate('companyInfo.logo.url', dataUrl);
        updateTemplate('companyInfo.logo.enabled', true);
        showSnackbar('Standard-Logo gesetzt', 'success');
        
        URL.revokeObjectURL(url);
      };
      
      img.src = url;
      
    } catch (error) {
      console.error('Fehler beim Setzen des Standard-Logos:', error);
      showSnackbar('Fehler beim Setzen des Logos', 'error');
    }
  };

  const saveTemplate = async () => {
    if (!currentTemplate) return;

    setSaving(true);
    try {
      // Debug: Log was gespeichert wird
      console.log('🔍 Speichere Template:', {
        isSmallBusiness: currentTemplate.companyInfo?.isSmallBusiness,
        showBankDetails: currentTemplate.layout?.footer?.showBankDetails,
        logoEnabled: currentTemplate.companyInfo?.logo?.enabled
      });
      
      const url = currentTemplate._id 
        ? `${API_URL}/admin/invoice/templates/${currentTemplate._id}`
        : `${API_URL}/admin/invoice/templates`;
      
      const method = currentTemplate._id ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(currentTemplate)
      });

      const data = await response.json();
      
      if (response.ok && data.success) {
        showSnackbar('Template erfolgreich gespeichert', 'success');
        if (!currentTemplate._id) {
          // Für neue Templates setze die Daten vom Server
          setCurrentTemplate(data.data);
        } else {
          // Für Updates behalte die aktuellen Daten, aktualisiere nur die updatedAt Zeit
          setCurrentTemplate(prev => ({
            ...prev,
            updatedAt: data.data.updatedAt || new Date().toISOString()
          }));
        }
        // WICHTIG: _loadTemplates() NICHT aufrufen, da es die Werte überschreibt
      } else {
        console.error('Server error:', data);
        showSnackbar(data.message || 'Fehler beim Speichern', 'error');
      }
    } catch (error) {
      console.error('Fehler beim Speichern:', error);
      showSnackbar('Fehler beim Speichern', 'error');
    } finally {
      setSaving(false);
    }
  };

  const generatePreview = async () => {
    if (!currentTemplate) return;

    setPreviewLoading(true);
    try {
      const response = await fetch(`${API_URL}/admin/invoice/preview`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ templateData: currentTemplate })
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        window.open(url, '_blank');
      } else {
        showSnackbar('Fehler bei der Vorschau-Generierung', 'error');
      }
    } catch (error) {
      console.error('Fehler bei der Vorschau:', error);
      showSnackbar('Fehler bei der Vorschau', 'error');
    } finally {
      setPreviewLoading(false);
    }
  };

  const updateTemplate = (path, value) => {
    setCurrentTemplate(prev => {
      const newTemplate = { ...prev };
      const keys = path.split('.');
      let current = newTemplate;
      
      for (let i = 0; i < keys.length - 1; i++) {
        if (!current[keys[i]]) current[keys[i]] = {};
        current = current[keys[i]];
      }
      
      current[keys[keys.length - 1]] = value;
      return newTemplate;
    });
  };

  const _insertVariable = (variable, targetField) => {
    const currentValue = targetField || '';
    const newValue = currentValue + `{{${variable.name}}}`;
    return newValue;
  };

  useEffect(() => {
    _loadTemplates();
    loadVariables();
  }, [_loadTemplates, loadVariables]);

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <Typography>Lade Rechnungsvorlagen...</Typography>
      </Box>
    );
  }

  const tabPanels = [
    {
      label: 'Firmeninformationen',
      icon: <CompanyIcon />,
      content: (
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="Firmenname"
              value={currentTemplate?.companyInfo?.name || ''}
              onChange={(e) => updateTemplate('companyInfo.name', e.target.value)}
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="Website"
              value={currentTemplate?.companyInfo?.contact?.website || ''}
              onChange={(e) => updateTemplate('companyInfo.contact.website', e.target.value)}
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="Straße"
              value={currentTemplate?.companyInfo?.address?.street || ''}
              onChange={(e) => updateTemplate('companyInfo.address.street', e.target.value)}
            />
          </Grid>
          <Grid item xs={12} md={3}>
            <TextField
              fullWidth
              label="Postleitzahl"
              value={currentTemplate?.companyInfo?.address?.postalCode || ''}
              onChange={(e) => updateTemplate('companyInfo.address.postalCode', e.target.value)}
              inputProps={{ pattern: '[0-9]{5}', maxLength: 5 }}
              placeholder="64673"
            />
          </Grid>
          <Grid item xs={12} md={3}>
            <TextField
              fullWidth
              label="Stadt"
              value={currentTemplate?.companyInfo?.address?.city || ''}
              onChange={(e) => updateTemplate('companyInfo.address.city', e.target.value)}
              placeholder="Zwingenberg"
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="Telefon"
              value={currentTemplate?.companyInfo?.contact?.phone || ''}
              onChange={(e) => updateTemplate('companyInfo.contact.phone', e.target.value)}
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="E-Mail"
              value={currentTemplate?.companyInfo?.contact?.email || ''}
              onChange={(e) => updateTemplate('companyInfo.contact.email', e.target.value)}
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="Steuernummer"
              value={currentTemplate?.companyInfo?.taxInfo?.taxNumber || ''}
              onChange={(e) => updateTemplate('companyInfo.taxInfo.taxNumber', e.target.value)}
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="USt-IdNr."
              value={currentTemplate?.companyInfo?.taxInfo?.vatId || ''}
              onChange={(e) => updateTemplate('companyInfo.taxInfo.vatId', e.target.value)}
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="Geschäftsführer/Inhaber"
              value={currentTemplate?.companyInfo?.taxInfo?.ceo || ''}
              onChange={(e) => updateTemplate('companyInfo.taxInfo.ceo', e.target.value)}
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="Rechtsform"
              value={currentTemplate?.companyInfo?.taxInfo?.legalForm || ''}
              onChange={(e) => updateTemplate('companyInfo.taxInfo.legalForm', e.target.value)}
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="Amtsgericht"
              value={currentTemplate?.companyInfo?.taxInfo?.registrationCourt || ''}
              onChange={(e) => updateTemplate('companyInfo.taxInfo.registrationCourt', e.target.value)}
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="Finanzamt"
              value={currentTemplate?.companyInfo?.taxInfo?.taxOffice || ''}
              onChange={(e) => updateTemplate('companyInfo.taxInfo.taxOffice', e.target.value)}
              placeholder="z.B. Bensheim"
            />
          </Grid>
          <Grid item xs={12}>
            <Typography variant="h6" sx={{ mt: 3, mb: 2 }}>
              Bankverbindung (optional - nur für Notfall)
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Hauptsächlich Bar- oder PayPal-Zahlung. Bankdaten nur als Backup.
            </Typography>
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="Bank"
              value={currentTemplate?.companyInfo?.bankDetails?.bankName || ''}
              onChange={(e) => updateTemplate('companyInfo.bankDetails.bankName', e.target.value)}
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="IBAN"
              value={currentTemplate?.companyInfo?.bankDetails?.iban || ''}
              onChange={(e) => updateTemplate('companyInfo.bankDetails.iban', e.target.value)}
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="BIC"
              value={currentTemplate?.companyInfo?.bankDetails?.bic || ''}
              onChange={(e) => updateTemplate('companyInfo.bankDetails.bic', e.target.value)}
            />
          </Grid>
          <Grid item xs={12}>
            <Typography variant="h6" sx={{ mt: 3, mb: 2 }}>
              Zahlungskonditionen
            </Typography>
          </Grid>
          <Grid item xs={12} md={6}>
            <FormControl fullWidth>
              <InputLabel>Zahlungsart</InputLabel>
              <Select
                value={currentTemplate?.companyInfo?.paymentMethod || 'sofort'}
                onChange={(e) => updateTemplate('companyInfo.paymentMethod', e.target.value)}
              >
                <MenuItem value="sofort">Sofortige Zahlung (Bar/PayPal)</MenuItem>
                <MenuItem value="bank">Überweisung (Notfall)</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={6}>
            <FormControlLabel
              control={
                <Switch
                  checked={currentTemplate?.companyInfo?.isSmallBusiness || false}
                  onChange={(e) => updateTemplate('companyInfo.isSmallBusiness', e.target.checked)}
                />
              }
              label="Kleinunternehmer (§ 19 UStG) - keine USt ausweisen"
            />
          </Grid>
          <Grid item xs={12}>
            <Typography variant="h6" sx={{ mt: 3, mb: 2 }}>
              Logo-Einstellungen
            </Typography>
          </Grid>
          <Grid item xs={12}>
            <FormControlLabel
              control={
                <Switch
                  checked={currentTemplate?.companyInfo?.logo?.enabled || false}
                  onChange={(e) => updateTemplate('companyInfo.logo.enabled', e.target.checked)}
                />
              }
              label="Logo aktivieren"
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <input
              type="file"
              accept="image/*"
              onChange={handleLogoUpload}
              style={{ display: 'none' }}
              id="logo-upload"
            />
            <label htmlFor="logo-upload">
              <Button
                variant="outlined"
                component="span"
                disabled={!currentTemplate?.companyInfo?.logo?.enabled}
                sx={{ mr: 2 }}
              >
                Logo hochladen
              </Button>
            </label>
            <Button
              variant="outlined"
              color="primary"
              onClick={setDefaultLogo}
              size="small"
              sx={{ mr: 1 }}
            >
              Standard-Logo setzen
            </Button>
            {currentTemplate?.companyInfo?.logo?.url && (
              <Button
                variant="outlined"
                color="error"
                onClick={removeLogo}
                size="small"
              >
                Entfernen
              </Button>
            )}
          </Grid>
          {currentTemplate?.companyInfo?.logo?.enabled && currentTemplate?.companyInfo?.logo?.url && (
            <Grid item xs={12}>
              <Box sx={{ mt: 2, p: 2, border: '1px solid #e0e0e0', borderRadius: 1 }}>
                <Typography variant="body2" gutterBottom>Logo-Vorschau:</Typography>
                <img 
                  src={currentTemplate.companyInfo.logo.url} 
                  alt="Logo" 
                  style={{ 
                    maxWidth: '200px', 
                    maxHeight: '100px', 
                    objectFit: 'contain',
                    border: '1px solid #ccc',
                    borderRadius: '4px'
                  }} 
                />
              </Box>
            </Grid>
          )}
        </Grid>
      )
    },
    {
      label: 'Layout & Design',
      icon: <LayoutIcon />,
      content: (
        <Grid container spacing={3}>
          {/* Header-Einstellungen */}
          <Grid item xs={12}>
            <Card>
              <CardHeader title="Header-Einstellungen" />
              <CardContent>
                <Grid container spacing={2}>
                  <Grid item xs={12} md={6}>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={currentTemplate?.layout?.header?.showLogo || false}
                          onChange={(e) => updateTemplate('layout.header.showLogo', e.target.checked)}
                        />
                      }
                      label="Logo anzeigen"
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <FormControl fullWidth>
                      <InputLabel>Logo-Position</InputLabel>
                      <Select
                        value={currentTemplate?.layout?.header?.logoPosition || 'left'}
                        onChange={(e) => updateTemplate('layout.header.logoPosition', e.target.value)}
                      >
                        <MenuItem value="left">Links</MenuItem>
                        <MenuItem value="center">Mitte</MenuItem>
                        <MenuItem value="right">Rechts</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <FormControl fullWidth>
                      <InputLabel>Logo-Größe</InputLabel>
                      <Select
                        value={currentTemplate?.layout?.header?.logoSize || 'medium'}
                        onChange={(e) => updateTemplate('layout.header.logoSize', e.target.value)}
                      >
                        <MenuItem value="small">Klein</MenuItem>
                        <MenuItem value="medium">Mittel</MenuItem>
                        <MenuItem value="large">Groß</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <FormControl fullWidth>
                      <InputLabel>Firmeninfo-Position</InputLabel>
                      <Select
                        value={currentTemplate?.layout?.header?.companyInfoPosition || 'right'}
                        onChange={(e) => updateTemplate('layout.header.companyInfoPosition', e.target.value)}
                      >
                        <MenuItem value="left">Links</MenuItem>
                        <MenuItem value="right">Rechts</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Grid>

          {/* Farben */}
          <Grid item xs={12}>
            <Card>
              <CardHeader title="Farbschema" />
              <CardContent>
                <Grid container spacing={2}>
                  {['primary', 'secondary', 'text', 'accent'].map((colorType) => (
                    <Grid item xs={12} md={3} key={colorType}>
                      <Box>
                        <Typography variant="subtitle2" gutterBottom>
                          {colorType === 'primary' ? 'Primärfarbe' :
                           colorType === 'secondary' ? 'Sekundärfarbe' :
                           colorType === 'text' ? 'Textfarbe' : 'Akzentfarbe'}
                        </Typography>
                        <Box
                          onClick={() => setColorPickerOpen(prev => ({ ...prev, [colorType]: !prev[colorType] }))}
                          sx={{
                            width: '100%',
                            height: 40,
                            backgroundColor: currentTemplate?.layout?.colors?.[colorType] || '#000',
                            border: '1px solid #ccc',
                            borderRadius: 1,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: colorType === 'text' ? '#fff' : currentTemplate?.layout?.colors?.text
                          }}
                        >
                          {currentTemplate?.layout?.colors?.[colorType] || '#000'}
                        </Box>
                        {colorPickerOpen[colorType] && (
                          <Box sx={{ position: 'absolute', zIndex: 1000, mt: 1 }}>
                            <SketchPicker
                              color={currentTemplate?.layout?.colors?.[colorType] || '#000'}
                              onChangeComplete={(color) => {
                                updateTemplate(`layout.colors.${colorType}`, color.hex);
                                setColorPickerOpen(prev => ({ ...prev, [colorType]: false }));
                              }}
                            />
                          </Box>
                        )}
                      </Box>
                    </Grid>
                  ))}
                </Grid>
              </CardContent>
            </Card>
          </Grid>

          {/* Schriftarten */}
          <Grid item xs={12}>
            <Card>
              <CardHeader title="Schrifteinstellungen" />
              <CardContent>
                <Grid container spacing={2}>
                  <Grid item xs={12} md={6}>
                    <FormControl fullWidth>
                      <InputLabel>Schriftart</InputLabel>
                      <Select
                        value={currentTemplate?.layout?.fonts?.primary || 'Arial, sans-serif'}
                        onChange={(e) => updateTemplate('layout.fonts.primary', e.target.value)}
                      >
                        <MenuItem value="Arial, sans-serif">Arial</MenuItem>
                        <MenuItem value="Helvetica, sans-serif">Helvetica</MenuItem>
                        <MenuItem value="Times, serif">Times</MenuItem>
                        <MenuItem value="Georgia, serif">Georgia</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <Typography gutterBottom>Zeilenhöhe: {currentTemplate?.layout?.spacing?.lineHeight || 1.4}</Typography>
                    <Slider
                      value={currentTemplate?.layout?.spacing?.lineHeight || 1.4}
                      onChange={(e, value) => updateTemplate('layout.spacing.lineHeight', value)}
                      min={1}
                      max={2}
                      step={0.1}
                      marks
                      valueLabelDisplay="auto"
                    />
                  </Grid>
                  {['heading', 'subheading', 'body', 'small'].map((sizeType) => (
                    <Grid item xs={12} md={3} key={sizeType}>
                      <Typography gutterBottom>
                        {sizeType === 'heading' ? 'Überschrift' :
                         sizeType === 'subheading' ? 'Unterüberschrift' :
                         sizeType === 'body' ? 'Fließtext' : 'Klein'}: {currentTemplate?.layout?.fonts?.size?.[sizeType] || 12}px
                      </Typography>
                      <Slider
                        value={currentTemplate?.layout?.fonts?.size?.[sizeType] || 12}
                        onChange={(e, value) => updateTemplate(`layout.fonts.size.${sizeType}`, value)}
                        min={8}
                        max={32}
                        step={1}
                        marks
                        valueLabelDisplay="auto"
                      />
                    </Grid>
                  ))}
                </Grid>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )
    },
    {
      label: 'Rechnungssektionen',
      icon: <InvoiceIcon />,
      content: (
        <Box>
          {Object.entries(currentTemplate?.sections || {}).map(([sectionKey, section]) => (
            <Accordion key={sectionKey} defaultExpanded>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Box display="flex" alignItems="center" gap={1}>
                  <DragIcon />
                  <Switch
                    checked={section.enabled}
                    onChange={(e) => updateTemplate(`sections.${sectionKey}.enabled`, e.target.checked)}
                    onClick={(e) => e.stopPropagation()}
                  />
                  <Typography>
                    {sectionKey === 'invoiceInfo' ? 'Rechnungsinformationen' :
                     sectionKey === 'customerInfo' ? 'Kundeninformationen' :
                     sectionKey === 'productTable' ? 'Produkttabelle' :
                     sectionKey === 'totals' ? 'Gesamtsummen' : 'Fußzeile'}
                  </Typography>
                  <Chip label={`Position: ${section.position}`} size="small" />
                </Box>
              </AccordionSummary>
              <AccordionDetails>
                <Grid container spacing={2}>
                  {/* Sektions-spezifische Einstellungen */}
                  {sectionKey === 'invoiceInfo' && (
                    <>
                      <Grid item xs={12} md={6}>
                        <TextField
                          fullWidth
                          label="Titel"
                          value={section.title}
                          onChange={(e) => updateTemplate(`sections.${sectionKey}.title`, e.target.value)}
                        />
                      </Grid>
                      <Grid item xs={12} md={6}>
                        <TextField
                          fullWidth
                          type="number"
                          label="Position"
                          value={section.position}
                          onChange={(e) => updateTemplate(`sections.${sectionKey}.position`, parseInt(e.target.value))}
                        />
                      </Grid>
                      {['showInvoiceNumber', 'showInvoiceDate', 'showDueDate', 'showOrderNumber'].map((field) => (
                        <Grid item xs={12} md={3} key={field}>
                          <FormControlLabel
                            control={
                              <Switch
                                checked={section[field]}
                                onChange={(e) => updateTemplate(`sections.${sectionKey}.${field}`, e.target.checked)}
                              />
                            }
                            label={field.replace('show', '').replace(/([A-Z])/g, ' $1')}
                          />
                        </Grid>
                      ))}
                    </>
                  )}

                  {sectionKey === 'productTable' && (
                    <>
                      <Grid item xs={12}>
                        <Typography variant="h6" gutterBottom>Spalten-Konfiguration</Typography>
                      </Grid>
                      {Object.entries(section.columns || {}).map(([columnKey, column]) => (
                        <Grid item xs={12} md={4} key={columnKey}>
                          <Card variant="outlined">
                            <CardContent>
                              <Typography variant="subtitle1" gutterBottom>
                                {columnKey === 'position' ? 'Position' :
                                 columnKey === 'description' ? 'Beschreibung' :
                                 columnKey === 'quantity' ? 'Menge' :
                                 columnKey === 'unitPrice' ? 'Einzelpreis' : 'Gesamt'}
                              </Typography>
                              <FormControlLabel
                                control={
                                  <Switch
                                    checked={column.enabled}
                                    onChange={(e) => updateTemplate(`sections.${sectionKey}.columns.${columnKey}.enabled`, e.target.checked)}
                                  />
                                }
                                label="Aktiviert"
                              />
                              <Typography gutterBottom>Breite: {column.width}%</Typography>
                              <Slider
                                value={column.width}
                                onChange={(e, value) => updateTemplate(`sections.${sectionKey}.columns.${columnKey}.width`, value)}
                                min={5}
                                max={50}
                                step={1}
                                marks
                                valueLabelDisplay="auto"
                              />
                            </CardContent>
                          </Card>
                        </Grid>
                      ))}
                      <Grid item xs={12} md={6}>
                        <FormControlLabel
                          control={
                            <Switch
                              checked={section.showHeaders}
                              onChange={(e) => updateTemplate(`sections.${sectionKey}.showHeaders`, e.target.checked)}
                            />
                          }
                          label="Spaltenüberschriften anzeigen"
                        />
                      </Grid>
                      <Grid item xs={12} md={6}>
                        <FormControlLabel
                          control={
                            <Switch
                              checked={section.alternateRowColors}
                              onChange={(e) => updateTemplate(`sections.${sectionKey}.alternateRowColors`, e.target.checked)}
                            />
                          }
                          label="Abwechselnde Zeilenfarben"
                        />
                      </Grid>
                    </>
                  )}

                  {sectionKey === 'footer' && (
                    <>
                      <Grid item xs={12}>
                        <TextField
                          fullWidth
                          multiline
                          rows={3}
                          label="Benutzerdefinierter Text"
                          value={section.customText}
                          onChange={(e) => updateTemplate(`sections.${sectionKey}.customText`, e.target.value)}
                          helperText="Verwenden Sie {{variable}} für dynamische Inhalte"
                        />
                      </Grid>
                      <Grid item xs={12} md={6}>
                        <FormControlLabel
                          control={
                            <Switch
                              checked={section.showPaymentInfo}
                              onChange={(e) => updateTemplate(`sections.${sectionKey}.showPaymentInfo`, e.target.checked)}
                            />
                          }
                          label="Zahlungshinweise anzeigen"
                        />
                      </Grid>
                      <Grid item xs={12} md={6}>
                        <FormControlLabel
                          control={
                            <Switch
                              checked={section.showReturnPolicy}
                              onChange={(e) => updateTemplate(`sections.${sectionKey}.showReturnPolicy`, e.target.checked)}
                            />
                          }
                          label="Rückgaberichtlinien anzeigen"
                        />
                      </Grid>
                    </>
                  )}
                </Grid>
              </AccordionDetails>
            </Accordion>
          ))}
        </Box>
      )
    },
    {
      label: 'Header & Footer Layout',
      icon: <InvoiceIcon />,
      content: (
        <Grid container spacing={3}>
          {/* Header Layout-Konfiguration */}
          <Grid item xs={12}>
            <Card>
              <CardHeader 
                title="Header Layout-Einstellungen" 
                subheader="Anzeige und Positionierung der Firmeninformationen im Header"
              />
              <CardContent>
                <Grid container spacing={3}>
                  <Grid item xs={12} md={6}>
                    <FormControl fullWidth>
                      <InputLabel>Header-Stil</InputLabel>
                      <Select
                        value={currentTemplate?.layout?.header?.style || 'standard'}
                        onChange={(e) => updateTemplate('layout.header.style', e.target.value)}
                      >
                        <MenuItem value="standard">Standard</MenuItem>
                        <MenuItem value="compact">Kompakt</MenuItem>
                        <MenuItem value="detailed">Detailliert</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <FormControl fullWidth>
                      <InputLabel>Text-Ausrichtung</InputLabel>
                      <Select
                        value={currentTemplate?.layout?.header?.alignment || 'left'}
                        onChange={(e) => updateTemplate('layout.header.alignment', e.target.value)}
                      >
                        <MenuItem value="left">Linksbündig</MenuItem>
                        <MenuItem value="center">Zentriert</MenuItem>
                        <MenuItem value="right">Rechtsbündig</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid item xs={12}>
                    <Typography gutterBottom>Header-Größe</Typography>
                    <Slider
                      value={currentTemplate?.layout?.header?.height || 100}
                      onChange={(e, value) => updateTemplate('layout.header.height', value)}
                      min={60}
                      max={150}
                      marks={[
                        { value: 60, label: 'Klein' },
                        { value: 100, label: 'Normal' },
                        { value: 150, label: 'Groß' }
                      ]}
                      valueLabelDisplay="auto"
                      valueLabelFormat={(value) => `${value}px`}
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={currentTemplate?.layout?.header?.showBorder || false}
                          onChange={(e) => updateTemplate('layout.header.showBorder', e.target.checked)}
                        />
                      }
                      label="Untere Trennlinie anzeigen"
                    />
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Grid>

          {/* Footer Layout-Konfiguration */}
          <Grid item xs={12}>
            <Card>
              <CardHeader 
                title="Footer Layout-Einstellungen (§ 14 UStG)" 
                subheader="Anzeige und Anordnung der rechtspflichtigen Informationen"
              />
              <CardContent>
                <Grid container spacing={3}>
                  <Grid item xs={12} md={6}>
                    <FormControl fullWidth>
                      <InputLabel>Footer-Layout</InputLabel>
                      <Select
                        value={currentTemplate?.layout?.footer?.layout || 'columns'}
                        onChange={(e) => updateTemplate('layout.footer.layout', e.target.value)}
                      >
                        <MenuItem value="columns">Mehrspaltig</MenuItem>
                        <MenuItem value="rows">Zeilenweise</MenuItem>
                        <MenuItem value="compact">Kompakt</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <FormControl fullWidth>
                      <InputLabel>Anzahl Spalten</InputLabel>
                      <Select
                        value={currentTemplate?.layout?.footer?.columns || 3}
                        onChange={(e) => updateTemplate('layout.footer.columns', parseInt(e.target.value))}
                        disabled={currentTemplate?.layout?.footer?.layout !== 'columns'}
                      >
                        <MenuItem value={2}>2 Spalten</MenuItem>
                        <MenuItem value={3}>3 Spalten</MenuItem>
                        <MenuItem value={4}>4 Spalten</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>
                  
                  {/* Anzeige-Optionen für Footer-Bereiche */}
                  <Grid item xs={12}>
                    <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
                      Anzuzeigende Bereiche
                    </Typography>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={currentTemplate?.layout?.footer?.showContactInfo !== false}
                          onChange={(e) => updateTemplate('layout.footer.showContactInfo', e.target.checked)}
                        />
                      }
                      label="Kontaktinformationen anzeigen"
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={currentTemplate?.layout?.footer?.showTaxInfo !== false}
                          onChange={(e) => updateTemplate('layout.footer.showTaxInfo', e.target.checked)}
                        />
                      }
                      label="Steuerliche Angaben anzeigen"
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={currentTemplate?.layout?.footer?.showBankDetails || false}
                          onChange={(e) => updateTemplate('layout.footer.showBankDetails', e.target.checked)}
                        />
                      }
                      label="Bankverbindung anzeigen (optional)"
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={currentTemplate?.layout?.footer?.showLegalInfo !== false}
                          onChange={(e) => updateTemplate('layout.footer.showLegalInfo', e.target.checked)}
                        />
                      }
                      label="Rechtliche Angaben anzeigen"
                    />
                  </Grid>
                  
                  {/* Footer-Position und Größe */}
                  <Grid item xs={12}>
                    <Typography gutterBottom sx={{ mt: 2 }}>Footer-Größe</Typography>
                    <Slider
                      value={currentTemplate?.layout?.footer?.height || 80}
                      onChange={(e, value) => updateTemplate('layout.footer.height', value)}
                      min={60}
                      max={120}
                      marks={[
                        { value: 60, label: 'Kompakt' },
                        { value: 80, label: 'Normal' },
                        { value: 120, label: 'Ausführlich' }
                      ]}
                      valueLabelDisplay="auto"
                      valueLabelFormat={(value) => `${value}px`}
                    />
                  </Grid>
                  
                  <Grid item xs={12} md={6}>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={currentTemplate?.layout?.footer?.showBorder !== false}
                          onChange={(e) => updateTemplate('layout.footer.showBorder', e.target.checked)}
                        />
                      }
                      label="Obere Trennlinie anzeigen"
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      label="Schriftgröße Footer"
                      type="number"
                      value={currentTemplate?.layout?.footer?.fontSize || 8}
                      onChange={(e) => updateTemplate('layout.footer.fontSize', parseInt(e.target.value))}
                      inputProps={{ min: 6, max: 12 }}
                      helperText="Schriftgröße in pt"
                    />
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Grid>
          
          {/* Hinweis */}
          <Grid item xs={12}>
            <Alert severity="info">
              <Typography variant="body2">
                <strong>Hinweis:</strong> Die Daten für Header und Footer werden im Tab "Firmeninformationen" gepflegt. 
                Hier können Sie nur die Anzeige und das Layout konfigurieren.
              </Typography>
            </Alert>
          </Grid>
        </Grid>
      )
    }
  ];

  return (
    <Box sx={{ p: 3 }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" component="h1">
          Rechnungskonfiguration
        </Typography>
        <Box display="flex" gap={2}>
          <Button
            variant="outlined"
            startIcon={<AddIcon />}
            onClick={() => setVariablesDialog(true)}
          >
            Variablen
          </Button>
          <Button
            variant="outlined"
            startIcon={<PreviewIcon />}
            onClick={generatePreview}
            disabled={previewLoading || !currentTemplate}
          >
            {previewLoading ? 'Generiere...' : 'Vorschau'}
          </Button>
          <Button
            variant="contained"
            startIcon={<SaveIcon />}
            onClick={saveTemplate}
            disabled={saving || !currentTemplate}
          >
            {saving ? 'Speichere...' : 'Speichern'}
          </Button>
        </Box>
      </Box>

      <Grid container spacing={3}>
        <Grid item xs={12} lg={8}>
          <StyledPaper>
            <Box mb={3}>
              <TextField
                fullWidth
                label="Template-Name"
                value={currentTemplate?.name || ''}
                onChange={(e) => updateTemplate('name', e.target.value)}
                variant="outlined"
              />
            </Box>

            <Tabs
              value={activeTab}
              onChange={(e, newValue) => setActiveTab(newValue)}
              variant="scrollable"
              scrollButtons="auto"
            >
              {tabPanels.map((panel, index) => (
                <Tab
                  key={index}
                  label={panel.label}
                  icon={panel.icon}
                  iconPosition="start"
                />
              ))}
            </Tabs>

            <Box mt={3}>
              {tabPanels[activeTab]?.content}
            </Box>
          </StyledPaper>
        </Grid>

        <Grid item xs={12} lg={4}>
          <StyledPaper>
            <Typography variant="h6" gutterBottom>
              Live-Vorschau
            </Typography>
            <PreviewContainer>
              <Box p={2} textAlign="center" color="text.secondary">
                <PreviewIcon sx={{ fontSize: 48, mb: 2 }} />
                <Typography>
                  Klicken Sie auf "Vorschau", um eine PDF-Vorschau zu generieren
                </Typography>
                <Button
                  variant="contained"
                  startIcon={<PreviewIcon />}
                  onClick={generatePreview}
                  disabled={previewLoading || !currentTemplate}
                  sx={{ mt: 2 }}
                >
                  PDF-Vorschau generieren
                </Button>
              </Box>
            </PreviewContainer>
          </StyledPaper>
        </Grid>
      </Grid>

      {/* Variablen-Dialog */}
      <Dialog open={variablesDialog} onClose={() => setVariablesDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>Verfügbare Variablen</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            Klicken Sie auf eine Variable, um sie zu kopieren. Verwenden Sie Doppelklammern in Ihren Texten.
          </Typography>
          <Box mt={2}>
            {['company', 'customer', 'order', 'product', 'date'].map((category) => (
              <Box key={category} mb={2}>
                <Typography variant="h6" gutterBottom>
                  {category === 'company' ? 'Firmen-Variablen' :
                   category === 'customer' ? 'Kunden-Variablen' :
                   category === 'order' ? 'Bestell-Variablen' :
                   category === 'product' ? 'Produkt-Variablen' : 'Datums-Variablen'}
                </Typography>
                <Box display="flex" flexWrap="wrap" gap={1}>
                  {(Array.isArray(availableVariables) ? availableVariables : [])
                    .filter(variable => variable && variable.category === category)
                    .map((variable) => (
                      <VariableChip
                        key={variable.name}
                        label={`{{${variable.name}}}`}
                        onClick={() => {
                          navigator.clipboard.writeText(`{{${variable.name}}}`);
                          showSnackbar('Variable kopiert!', 'success');
                        }}
                        title={variable.description}
                      />
                    ))}
                </Box>
              </Box>
            ))}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setVariablesDialog(false)}>Schließen</Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar für Benachrichtigungen */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={hideSnackbar}
      >
        <Alert
          onClose={hideSnackbar}
          severity={snackbar.severity}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default AdminInvoiceConfiguration;