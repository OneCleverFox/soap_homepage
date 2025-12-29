import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Grid,
  Typography,
  Button,
  TextField,
  Switch,
  FormControl,
  FormControlLabel,
  InputLabel,
  Select,
  MenuItem,
  Tabs,
  Tab,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  Snackbar,
  Tooltip,
  useTheme,
  useMediaQuery
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  Preview as PreviewIcon,
  Save as SaveIcon,
  Delete as DeleteIcon,
  Code as CodeIcon
} from '@mui/icons-material';


function TabPanel({ children, value, index, ...other }) {
  return (
    <Box
      role="tabpanel"
      hidden={value !== index}
      id={`invoice-tabpanel-${index}`}
      aria-labelledby={`invoice-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </Box>
  );
}

function AdminInvoiceDesigner() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  
  const [tabValue, setTabValue] = useState(0);
  const [template, setTemplate] = useState({
    name: '',
    description: '',
    isDefault: false,
    layout: {
      pageFormat: 'A4',
      margin: { top: 20, right: 20, bottom: 20, left: 20 },
      fontSize: 11,
      fontFamily: 'Arial, sans-serif'
    },
    sections: {}
  });
  const [availableVariables, setAvailableVariables] = useState({});
  const [variablesDialog, setVariablesDialog] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'info' });
  const [isLoading, setIsLoading] = useState(false);

  // Verfügbare Sektionen mit deutschen Bezeichnungen
  const sectionTypes = {
    header: {
      name: 'Kopfbereich',
      description: 'Logo, Firmenname und Kontaktdaten',
      icon: '📋',
      defaultContent: {
        logo: { enabled: true, position: 'left', maxHeight: 80 },
        company: {
          name: '{{company.name}}',
          address: '{{company.address.street}}, {{company.address.postalCode}} {{company.address.city}}',
          contact: 'Tel: {{company.contact.phone}} | E-Mail: {{company.contact.email}}'
        }
      }
    },
    legalInfo: {
      name: 'Rechtliche Angaben',
      description: 'Steuernummer, USt-IdNr, etc.',
      icon: '⚖️',
      defaultContent: {
        taxNumber: '{{company.taxInfo.taxNumber}}',
        vatId: '{{company.taxInfo.vatId}}',
        ceo: 'Inhaber: {{company.taxInfo.ceo}}'
      }
    },
    customer: {
      name: 'Kundenadresse',
      description: 'Name und Anschrift des Kunden',
      icon: '👤',
      defaultContent: {
        title: 'Rechnung an:',
        name: '{{customer.name}}',
        address: '{{customer.address.street}}\n{{customer.address.postalCode}} {{customer.address.city}}'
      }
    },
    invoiceDetails: {
      name: 'Rechnungsdetails',
      description: 'Nummer, Datum, Fälligkeit',
      icon: '📄',
      defaultContent: {
        invoiceNumber: 'Rechnungsnummer: {{invoice.number}}',
        invoiceDate: 'Rechnungsdatum: {{invoice.date}}',
        dueDate: 'Fällig bis: {{invoice.dueDate}}'
      }
    },
    items: {
      name: 'Artikelliste',
      description: 'Produkte und Leistungen',
      icon: '📦',
      defaultContent: {
        showHeaders: true,
        headers: ['Pos.', 'Artikel', 'Beschreibung', 'Menge', 'Einzelpreis', 'Gesamt'],
        template: '{{loop:order.products}}{{@index+1}} | {{name}} | {{description}} | {{quantity}} Stück | {{unitPrice}}€ | {{total}}€{{/loop}}'
      }
    },
    totals: {
      name: 'Summen',
      description: 'Netto, MwSt., Gesamtbetrag',
      icon: '💰',
      defaultContent: {
        netTotal: 'Nettobetrag: {{order.netTotal}}€',
        vatTotal: 'MwSt.: {{order.vatTotal}}€',
        grandTotal: 'Gesamtbetrag: {{order.grandTotal}}€'
      }
    },
    paymentInfo: {
      name: 'Zahlungsinfos',
      description: 'Bankdaten und Zahlungsbedingungen',
      icon: '🏦',
      defaultContent: {
        terms: '{{invoice.paymentTerms}}',
        bankDetails: 'IBAN: {{company.bankDetails.iban}}\nBIC: {{company.bankDetails.bic}}'
      }
    },
    footer: {
      name: 'Fußbereich',
      description: 'Rechtliche Hinweise und Kleinunternehmer-Info',
      icon: '📝',
      defaultContent: {
        legalNotice: '{{invoice.legalNotice}}',
        vatNote: '{{legal.vatExemptionNote}}'
      }
    }
  };

  useEffect(() => {
    loadDefaultTemplate();
    loadAvailableVariables();
  }, []);

  const loadDefaultTemplate = async () => {
    try {
      const response = await fetch('/api/invoice/templates/default');
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setTemplate(data.data);
        }
      }
    } catch (error) {
      console.error('Fehler beim Laden der Vorlage:', error);
    }
  };

  const loadAvailableVariables = async () => {
    const variables = {
      company: {
        name: 'Firmenname',
        'address.street': 'Straße',
        'address.postalCode': 'PLZ',
        'address.city': 'Stadt',
        'contact.phone': 'Telefon',
        'contact.email': 'E-Mail',
        'taxInfo.taxNumber': 'Steuernummer',
        'taxInfo.vatId': 'USt-IdNr',
        'bankDetails.iban': 'IBAN',
        'bankDetails.bic': 'BIC'
      },
      customer: {
        name: 'Kundenname',
        'address.street': 'Kundenstraße',
        'address.city': 'Kundenstadt',
        customerNumber: 'Kundennummer'
      },
      invoice: {
        number: 'Rechnungsnummer',
        date: 'Rechnungsdatum',
        dueDate: 'Fälligkeitsdatum',
        paymentTerms: 'Zahlungsbedingungen'
      },
      order: {
        netTotal: 'Nettosumme',
        vatTotal: 'MwSt-Betrag',
        grandTotal: 'Gesamtbetrag'
      },
      legal: {
        vatExemptionNote: 'MwSt-Befreiungshinweis'
      }
    };
    setAvailableVariables(variables);
  };

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  const addSection = (sectionType) => {
    const newPosition = Object.keys(template.sections).length + 1;
    const newSection = {
      enabled: true,
      position: newPosition,
      content: sectionTypes[sectionType].defaultContent
    };

    setTemplate({
      ...template,
      sections: {
        ...template.sections,
        [sectionType]: newSection
      }
    });

    setSnackbar({
      open: true,
      message: `Sektion "${sectionTypes[sectionType].name}" hinzugefügt`,
      severity: 'success'
    });
  };

  const removeSection = (sectionType) => {
    const updatedSections = { ...template.sections };
    delete updatedSections[sectionType];
    
    setTemplate({
      ...template,
      sections: updatedSections
    });

    setSnackbar({
      open: true,
      message: `Sektion "${sectionTypes[sectionType].name}" entfernt`,
      severity: 'info'
    });
  };

  const updateSection = (sectionType, updates) => {
    setTemplate({
      ...template,
      sections: {
        ...template.sections,
        [sectionType]: {
          ...template.sections[sectionType],
          ...updates
        }
      }
    });
  };

  const generatePreview = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/invoice/preview', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          templateData: template
        })
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        window.open(url, '_blank');
      } else {
        throw new Error('Preview generation failed');
      }
    } catch (error) {
      setSnackbar({
        open: true,
        message: 'Fehler bei der Vorschau-Generierung',
        severity: 'error'
      });
      console.error('Preview error:', error);
    }
    setIsLoading(false);
  };

  const saveTemplate = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/invoice/templates', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(template)
      });

      if (response.ok) {
        setSnackbar({
          open: true,
          message: 'Vorlage erfolgreich gespeichert',
          severity: 'success'
        });
      } else {
        throw new Error('Save failed');
      }
    } catch (error) {
      setSnackbar({
        open: true,
        message: 'Fehler beim Speichern',
        severity: 'error'
      });
    }
    setIsLoading(false);
  };

  const renderSectionEditor = (sectionType, section) => {
    return (
      <Card key={sectionType} sx={{ mb: 2 }}>
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography variant="h6">
                {sectionTypes[sectionType]?.icon} {sectionTypes[sectionType]?.name}
              </Typography>
              <FormControlLabel
                control={
                  <Switch
                    checked={section.enabled}
                    onChange={(e) => updateSection(sectionType, { enabled: e.target.checked })}
                  />
                }
                label="Aktiviert"
              />
            </Box>
            <IconButton
              color="error"
              onClick={() => removeSection(sectionType)}
              size="small"
            >
              <DeleteIcon />
            </IconButton>
          </Box>

          {section.enabled && (
            <Box sx={{ ml: 2 }}>
              <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
                {sectionTypes[sectionType]?.description}
              </Typography>
              
              {Object.entries(section.content || {}).map(([key, value]) => (
                <TextField
                  key={key}
                  fullWidth
                  label={key}
                  value={value || ''}
                  onChange={(e) => updateSection(sectionType, {
                    content: {
                      ...section.content,
                      [key]: e.target.value
                    }
                  })}
                  margin="normal"
                  multiline={typeof value === 'string' && value.includes('\n')}
                  rows={typeof value === 'string' && value.includes('\n') ? 3 : 1}
                  size="small"
                />
              ))}
            </Box>
          )}
        </CardContent>
      </Card>
    );
  };

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">🧾 Rechnungs-Designer</Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            variant="outlined"
            startIcon={<PreviewIcon />}
            onClick={generatePreview}
            disabled={isLoading}
          >
            Vorschau
          </Button>
          <Button
            variant="contained"
            startIcon={<SaveIcon />}
            onClick={saveTemplate}
            disabled={isLoading}
          >
            Speichern
          </Button>
          <Button
            variant="outlined"
            startIcon={<CodeIcon />}
            onClick={() => setVariablesDialog(true)}
          >
            Variablen
          </Button>
        </Box>
      </Box>

      <Card>
        <Tabs value={tabValue} onChange={handleTabChange}>
          <Tab label="🎨 Design" />
          <Tab label="⚙️ Layout" />
          <Tab label="🏢 Firmendaten" />
          <Tab label="🧩 Sektionen" />
        </Tabs>

        <TabPanel value={tabValue} index={0}>
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Vorlagen-Name"
                value={template.name}
                onChange={(e) => setTemplate({ ...template, name: e.target.value })}
                margin="normal"
              />
              <TextField
                fullWidth
                label="Beschreibung"
                value={template.description}
                onChange={(e) => setTemplate({ ...template, description: e.target.value })}
                margin="normal"
                multiline
                rows={3}
              />
              <FormControlLabel
                control={
                  <Switch
                    checked={template.isDefault}
                    onChange={(e) => setTemplate({ ...template, isDefault: e.target.checked })}
                  />
                }
                label="Als Standard-Vorlage verwenden"
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <Alert severity="info" sx={{ mb: 2 }}>
                <Typography variant="subtitle2">💡 Gesetzliche Pflichtangaben</Typography>
                <Typography variant="body2">
                  Diese Vorlage enthält alle nach deutschem Recht erforderlichen Angaben für Rechnungen.
                  Bei Kleinunternehmern wird automatisch der MwSt-Befreiungshinweis eingefügt.
                </Typography>
              </Alert>
            </Grid>
          </Grid>
        </TabPanel>

        <TabPanel value={tabValue} index={1}>
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth margin="normal">
                <InputLabel>Seitenformat</InputLabel>
                <Select
                  value={template.layout?.pageFormat || 'A4'}
                  onChange={(e) => setTemplate({
                    ...template,
                    layout: { ...template.layout, pageFormat: e.target.value }
                  })}
                >
                  <MenuItem value="A4">A4</MenuItem>
                  <MenuItem value="Letter">Letter</MenuItem>
                </Select>
              </FormControl>
              
              <FormControl fullWidth margin="normal">
                <InputLabel>Schriftart</InputLabel>
                <Select
                  value={template.layout?.fontFamily || 'Arial, sans-serif'}
                  onChange={(e) => setTemplate({
                    ...template,
                    layout: { ...template.layout, fontFamily: e.target.value }
                  })}
                >
                  <MenuItem value="Arial, sans-serif">Arial</MenuItem>
                  <MenuItem value="Helvetica, sans-serif">Helvetica</MenuItem>
                  <MenuItem value="Times, serif">Times</MenuItem>
                </Select>
              </FormControl>

              <TextField
                fullWidth
                type="number"
                label="Schriftgröße"
                value={template.layout?.fontSize || 11}
                onChange={(e) => setTemplate({
                  ...template,
                  layout: { ...template.layout, fontSize: parseInt(e.target.value) }
                })}
                margin="normal"
                inputProps={{ min: 8, max: 16 }}
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <Typography variant="h6" sx={{ mb: 2 }}>Seitenränder (mm)</Typography>
              {['top', 'right', 'bottom', 'left'].map(side => (
                <TextField
                  key={side}
                  type="number"
                  label={side === 'top' ? 'Oben' : side === 'right' ? 'Rechts' : side === 'bottom' ? 'Unten' : 'Links'}
                  value={template.layout?.margin?.[side] || 20}
                  onChange={(e) => setTemplate({
                    ...template,
                    layout: {
                      ...template.layout,
                      margin: {
                        ...template.layout.margin,
                        [side]: parseInt(e.target.value)
                      }
                    }
                  })}
                  margin="normal"
                  size="small"
                  sx={{ width: '48%', mr: side === 'top' || side === 'bottom' ? 1 : 0 }}
                />
              ))}
            </Grid>
          </Grid>
        </TabPanel>

        <TabPanel value={tabValue} index={2}>
          <Typography variant="h6" gutterBottom>🏢 Firmendaten bearbeiten</Typography>
          <Grid container spacing={3}>
            
            {/* Grunddaten */}
            <Grid item xs={12}>
              <Typography variant="subtitle1" sx={{ fontWeight: 'bold', mb: 2 }}>📋 Grunddaten</Typography>
            </Grid>
            
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Firmenname"
                value={template.companyInfo?.name || ''}
                onChange={(e) => setTemplate({
                  ...template,
                  companyInfo: {
                    ...template.companyInfo,
                    name: e.target.value
                  }
                })}
                margin="normal"
                required
              />
            </Grid>
            
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Straße und Hausnummer"
                value={template.companyInfo?.address?.street || ''}
                onChange={(e) => setTemplate({
                  ...template,
                  companyInfo: {
                    ...template.companyInfo,
                    address: {
                      ...template.companyInfo?.address,
                      street: e.target.value
                    }
                  }
                })}
                margin="normal"
                required
              />
            </Grid>
            
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                label="Postleitzahl"
                value={template.companyInfo?.address?.postalCode || ''}
                onChange={(e) => setTemplate({
                  ...template,
                  companyInfo: {
                    ...template.companyInfo,
                    address: {
                      ...template.companyInfo?.address,
                      postalCode: e.target.value
                    }
                  }
                })}
                margin="normal"
                inputProps={{ pattern: '[0-9]{5}', maxLength: 5 }}
                required
                placeholder="64673"
              />
            </Grid>
            
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                label="Stadt"
                value={template.companyInfo?.address?.city || ''}
                onChange={(e) => setTemplate({
                  ...template,
                  companyInfo: {
                    ...template.companyInfo,
                    address: {
                      ...template.companyInfo?.address,
                      city: e.target.value
                    }
                  }
                })}
                margin="normal"
                required
                placeholder="Zwingenberg"
              />
            </Grid>
            
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                label="Land"
                value={template.companyInfo?.address?.country || 'Deutschland'}
                onChange={(e) => setTemplate({
                  ...template,
                  companyInfo: {
                    ...template.companyInfo,
                    address: {
                      ...template.companyInfo?.address,
                      country: e.target.value
                    }
                  }
                })}
                margin="normal"
              />
            </Grid>
            
            {/* Kontaktdaten */}
            <Grid item xs={12}>
              <Typography variant="subtitle1" sx={{ fontWeight: 'bold', mb: 2, mt: 3 }}>📞 Kontaktdaten</Typography>
            </Grid>
            
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                label="Telefonnummer"
                value={template.companyInfo?.contact?.phone || ''}
                onChange={(e) => setTemplate({
                  ...template,
                  companyInfo: {
                    ...template.companyInfo,
                    contact: {
                      ...template.companyInfo?.contact,
                      phone: e.target.value
                    }
                  }
                })}
                margin="normal"
                placeholder="+49 6251 1234567"
              />
            </Grid>
            
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                label="E-Mail-Adresse"
                type="email"
                value={template.companyInfo?.contact?.email || ''}
                onChange={(e) => setTemplate({
                  ...template,
                  companyInfo: {
                    ...template.companyInfo,
                    contact: {
                      ...template.companyInfo?.contact,
                      email: e.target.value
                    }
                  }
                })}
                margin="normal"
                placeholder="info@gluecksmomente-manufaktur.de"
              />
            </Grid>
            
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                label="Website"
                value={template.companyInfo?.contact?.website || ''}
                onChange={(e) => setTemplate({
                  ...template,
                  companyInfo: {
                    ...template.companyInfo,
                    contact: {
                      ...template.companyInfo?.contact,
                      website: e.target.value
                    }
                  }
                })}
                margin="normal"
                placeholder="www.gluecksmomente-manufaktur.de"
              />
            </Grid>
            
            {/* Steuerliche Angaben */}
            <Grid item xs={12}>
              <Typography variant="subtitle1" sx={{ fontWeight: 'bold', mb: 2, mt: 3 }}>🏛️ Steuerliche Angaben</Typography>
            </Grid>
            
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Steuernummer"
                value={template.companyInfo?.taxInfo?.taxNumber || ''}
                onChange={(e) => setTemplate({
                  ...template,
                  companyInfo: {
                    ...template.companyInfo,
                    taxInfo: {
                      ...template.companyInfo?.taxInfo,
                      taxNumber: e.target.value
                    }
                  }
                })}
                margin="normal"
                placeholder="11548484"
              />
            </Grid>
            
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="USt-IdNr"
                value={template.companyInfo?.taxInfo?.vatId || ''}
                onChange={(e) => setTemplate({
                  ...template,
                  companyInfo: {
                    ...template.companyInfo,
                    taxInfo: {
                      ...template.companyInfo?.taxInfo,
                      vatId: e.target.value
                    }
                  }
                })}
                margin="normal"
                placeholder="DE123456789"
              />
            </Grid>
            
            {/* Rechtliche Angaben */}
            <Grid item xs={12}>
              <Typography variant="subtitle1" sx={{ fontWeight: 'bold', mb: 2, mt: 3 }}>⚖️ Rechtliche Angaben</Typography>
            </Grid>
            
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                label="Inhaber/Geschäftsführer"
                value={template.companyInfo?.owner?.name || ''}
                onChange={(e) => setTemplate({
                  ...template,
                  companyInfo: {
                    ...template.companyInfo,
                    owner: {
                      ...template.companyInfo?.owner,
                      name: e.target.value
                    }
                  }
                })}
                margin="normal"
                placeholder="Ralf Jacob"
              />
            </Grid>
            
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                label="Amtsgericht"
                value={template.companyInfo?.legal?.registrationCourt || ''}
                onChange={(e) => setTemplate({
                  ...template,
                  companyInfo: {
                    ...template.companyInfo,
                    legal: {
                      ...template.companyInfo?.legal,
                      registrationCourt: e.target.value
                    }
                  }
                })}
                margin="normal"
                placeholder="Darmstadt"
              />
            </Grid>
            
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                label="Rechtsform"
                value={template.companyInfo?.legal?.legalForm || ''}
                onChange={(e) => setTemplate({
                  ...template,
                  companyInfo: {
                    ...template.companyInfo,
                    legal: {
                      ...template.companyInfo?.legal,
                      legalForm: e.target.value
                    }
                  }
                })}
                margin="normal"
                placeholder="Einzelunternehmen"
              />
            </Grid>
            
            {/* Bankverbindung */}
            <Grid item xs={12}>
              <Typography variant="subtitle1" sx={{ fontWeight: 'bold', mb: 2, mt: 3 }}>🏦 Bankverbindung</Typography>
            </Grid>
            
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                label="Bankname"
                value={template.companyInfo?.bankDetails?.bankName || ''}
                onChange={(e) => setTemplate({
                  ...template,
                  companyInfo: {
                    ...template.companyInfo,
                    bankDetails: {
                      ...template.companyInfo?.bankDetails,
                      bankName: e.target.value
                    }
                  }
                })}
                margin="normal"
                placeholder="Sparkasse Bensheim"
              />
            </Grid>
            
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                label="IBAN"
                value={template.companyInfo?.bankDetails?.iban || ''}
                onChange={(e) => setTemplate({
                  ...template,
                  companyInfo: {
                    ...template.companyInfo,
                    bankDetails: {
                      ...template.companyInfo?.bankDetails,
                      iban: e.target.value
                    }
                  }
                })}
                margin="normal"
                placeholder="DE85 5085 2651 0346 0592 50"
              />
            </Grid>
            
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                label="BIC"
                value={template.companyInfo?.bankDetails?.bic || ''}
                onChange={(e) => setTemplate({
                  ...template,
                  companyInfo: {
                    ...template.companyInfo,
                    bankDetails: {
                      ...template.companyInfo?.bankDetails,
                      bic: e.target.value
                    }
                  }
                })}
                margin="normal"
                placeholder="HELADEF1DAD"
              />
            </Grid>
            
            {/* Hinweis */}
            <Grid item xs={12}>
              <Alert severity="info" sx={{ mt: 2 }}>
                <Typography variant="body2">
                  💡 <strong>Rechtliche Pflichtangaben:</strong> Diese Daten werden automatisch im Footer der Rechnung angezeigt und entsprechen den deutschen gesetzlichen Anforderungen nach § 14 UStG.
                </Typography>
              </Alert>
            </Grid>
            
          </Grid>
        </TabPanel>

        <TabPanel value={tabValue} index={3}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
            <Typography variant="h6">Rechnungs-Sektionen</Typography>
            <FormControl sx={{ minWidth: 200 }}>
              <InputLabel>Sektion hinzufügen</InputLabel>
              <Select
                value=""
                onChange={(e) => addSection(e.target.value)}
                label="Sektion hinzufügen"
              >
                {Object.entries(sectionTypes)
                  .filter(([type]) => !template.sections?.[type])
                  .map(([type, config]) => (
                  <MenuItem key={type} value={type}>
                    {config.icon} {config.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>

          <Box>
            {Object.entries(template.sections || {})
              .sort(([,a], [,b]) => (a.position || 0) - (b.position || 0))
              .map(([sectionType, section]) => renderSectionEditor(sectionType, section))}
          </Box>

          {Object.keys(template.sections || {}).length === 0 && (
            <Alert severity="warning" sx={{ mt: 2 }}>
              Keine Sektionen vorhanden. Fügen Sie mindestens eine Sektion hinzu, um eine gültige Rechnungsvorlage zu erstellen.
            </Alert>
          )}
        </TabPanel>
      </Card>

      {/* Variablen Dialog */}
      <Dialog open={variablesDialog} onClose={() => setVariablesDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>📋 Verfügbare Variablen</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="textSecondary" sx={{ mb: 3 }}>
            Verwenden Sie diese Variablen in Ihren Templates. Format: {`{{variable.name}}`}
          </Typography>
          
          {Object.entries(availableVariables).map(([category, variables]) => (
            <Accordion key={category}>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography variant="h6" sx={{ textTransform: 'capitalize' }}>
                  {category === 'company' ? '🏢 Firma' :
                   category === 'customer' ? '👤 Kunde' :
                   category === 'invoice' ? '📄 Rechnung' :
                   category === 'order' ? '🛒 Bestellung' :
                   category === 'legal' ? '⚖️ Rechtliches' : category}
                </Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                  {Object.entries(variables).map(([key, description]) => (
                    <Tooltip key={key} title={`Klicken zum Kopieren: {{${category}.${key}}}`}>
                      <Chip
                        label={`${key}: ${description}`}
                        variant="outlined"
                        size="small"
                        onClick={() => {
                          navigator.clipboard.writeText(`{{${category}.${key}}}`);
                          setSnackbar({
                            open: true,
                            message: `Variable {{${category}.${key}}} kopiert`,
                            severity: 'success'
                          });
                        }}
                        sx={{ cursor: 'pointer' }}
                      />
                    </Tooltip>
                  ))}
                </Box>
              </AccordionDetails>
            </Accordion>
          ))}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setVariablesDialog(false)}>Schließen</Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar für Nachrichten */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
      >
        <Alert severity={snackbar.severity} sx={{ width: '100%' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}

export default AdminInvoiceDesigner;