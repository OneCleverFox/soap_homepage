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
  Divider,
  Card,
  CardContent,
  CardHeader,
  Chip,
  IconButton,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Slider,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Tab,
  Tabs,
  FormControlLabel,
  ColorPicker,
  Snackbar
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  Preview as PreviewIcon,
  Save as SaveIcon,
  Add as AddIcon,
  Delete as DeleteIcon,
  DragIndicator as DragIcon,
  Settings as SettingsIcon,
  Palette as PaletteIcon,
  ViewColumn as LayoutIcon,
  Business as CompanyIcon,
  Receipt as InvoiceIcon
} from '@mui/icons-material';
import { styled } from '@mui/material/styles';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';
import { SketchPicker } from 'react-color';

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
  const [currentTemplate, setCurrentTemplate] = useState(null);
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [activeTab, setActiveTab] = useState(0);
  const [previewDialog, setPreviewDialog] = useState(false);
  const [variablesDialog, setVariablesDialog] = useState(false);
  const [colorPickerOpen, setColorPickerOpen] = useState({});
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  // Verfügbare Variablen
  const [availableVariables, setAvailableVariables] = useState([]);

  // Standard Template-Struktur
  const defaultTemplate = {
    name: 'Neue Rechnungsvorlage',
    isDefault: false,
    companyInfo: {
      name: 'Glücksmomente Manufaktur',
      address: {
        street: 'Musterstraße 123',
        city: '12345 Musterstadt',
        country: 'Deutschland'
      },
      contact: {
        phone: '+49 123 456789',
        email: 'info@gluecksmomente-manufaktur.de',
        website: 'www.gluecksmomente-manufaktur.de'
      },
      taxInfo: {
        taxNumber: 'DE123456789',
        vatId: 'USt-IdNr.: DE123456789'
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
  };

  // API-Aufrufe
  const loadTemplates = useCallback(async () => {
    try {
      const response = await fetch('/api/invoice/templates', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      const data = await response.json();
      
      if (data.success) {
        setTemplates(data.data);
        const defaultTemplate = data.data.find(t => t.isDefault);
        if (defaultTemplate) {
          setCurrentTemplate(defaultTemplate);
        } else if (data.data.length > 0) {
          setCurrentTemplate(data.data[0]);
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
      const response = await fetch('/api/invoice/variables', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      const data = await response.json();
      
      if (data.success) {
        setAvailableVariables(data.data);
      }
    } catch (error) {
      console.error('Fehler beim Laden der Variablen:', error);
    }
  }, []);

  const saveTemplate = async () => {
    if (!currentTemplate) return;

    setSaving(true);
    try {
      const url = currentTemplate._id 
        ? `/api/invoice/templates/${currentTemplate._id}`
        : '/api/invoice/templates';
      
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
      
      if (data.success) {
        showSnackbar('Template erfolgreich gespeichert', 'success');
        if (!currentTemplate._id) {
          setCurrentTemplate(data.data);
        }
        loadTemplates();
      } else {
        showSnackbar('Fehler beim Speichern', 'error');
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
      const response = await fetch('/api/invoice/preview', {
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

  const showSnackbar = (message, severity = 'success') => {
    setSnackbar({ open: true, message, severity });
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

  const insertVariable = (variable, targetField) => {
    const currentValue = targetField || '';
    const newValue = currentValue + `{{${variable.name}}}`;
    return newValue;
  };

  useEffect(() => {
    loadTemplates();
    loadVariables();
  }, [loadTemplates, loadVariables]);

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
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="Stadt"
              value={currentTemplate?.companyInfo?.address?.city || ''}
              onChange={(e) => updateTemplate('companyInfo.address.city', e.target.value)}
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
                  {availableVariables
                    .filter(variable => variable.category === category)
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
        onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}
      >
        <Alert
          onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}
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