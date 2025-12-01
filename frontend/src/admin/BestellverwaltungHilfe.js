import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  Stepper,
  Step,
  StepLabel,
  StepContent,
  Chip,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Alert
} from '@mui/material';
import {
  ShoppingCart,
  Payment,
  CheckCircle,
  LocalShipping,
  HelpOutline
} from '@mui/icons-material';

const BestellverwaltungHilfe = ({ open, onClose }) => {
  const [activeStep, setActiveStep] = useState(0);

  const bestellprozess = [
    {
      label: 'Neue Bestellung',
      icon: <ShoppingCart />,
      status: 'neu',
      color: 'primary',
      description: 'Kunde hat Bestellung aufgegeben',
      action: 'PayPal-Zahlung prüfen → "bezahlt" setzen'
    },
    {
      label: 'Bezahlt',
      icon: <Payment />,
      status: 'bezahlt',
      color: 'success',
      description: 'PayPal-Zahlung eingegangen',
      action: 'Bestellung prüfen → "bestätigt" setzen'
    },
    {
      label: 'Bestätigt',
      icon: <CheckCircle />,
      status: 'bestätigt',
      color: 'info',
      description: 'Bestellung bestätigt, Produktion',
      action: 'Produkte verpacken → "verpackt" setzen'
    },
    {
      label: 'Verpackt',
      icon: <LocalShipping />,
      status: 'verpackt',
      color: 'warning',
      description: 'Bestellung fertig verpackt',
      action: 'Versenden + Tracking → "versendet" setzen'
    },
    {
      label: 'Versendet',
      icon: <LocalShipping />,
      status: 'versendet',
      color: 'success',
      description: 'Paket unterwegs zum Kunden',
      action: 'Automatisch → "abgeschlossen" nach Zustellung'
    }
  ];

  const rueckerstattungsProzess = [
    {
      title: 'Problem erkannt',
      description: 'Bestellung kann nicht erfüllt werden',
      action: 'Status auf "abgelehnt" setzen'
    },
    {
      title: 'PayPal Button erscheint',
      description: 'Automatisch generierter PayPal-Rückerstattungsbutton',
      action: 'Auf PayPal-Button klicken'
    },
    {
      title: 'Rückerstattung durchführen',
      description: 'PayPal Business Account führt Rückerstattung durch',
      action: 'In PayPal bestätigen'
    },
    {
      title: 'Als erledigt markieren',
      description: 'Rückerstattung abgeschlossen',
      action: '"Als erledigt markieren" klicken'
    }
  ];

  return (
    <Dialog 
      open={open} 
      onClose={onClose}
      maxWidth="md"
      fullWidth
    >
      <DialogTitle>
        <Box display="flex" alignItems="center" gap={1}>
          <HelpOutline color="primary" />
          📋 Bestellverwaltung - Anleitung
        </Box>
      </DialogTitle>
      
      <DialogContent>
        <Alert severity="info" sx={{ mb: 3 }}>
          Die Bestellverwaltung verwaltet den kompletten Prozess von der Bestellung bis zur Lieferung 
          oder Rückerstattung. Hier sind die wichtigsten Workflows:
        </Alert>

        {/* Normaler Bestellprozess */}
        <Typography variant="h6" gutterBottom sx={{ mt: 3 }}>
          ✅ Normaler Bestellablauf
        </Typography>
        
        <Stepper activeStep={activeStep} orientation="vertical">
          {bestellprozess.map((step, index) => (
            <Step key={step.status}>
              <StepLabel 
                icon={step.icon}
                onClick={() => setActiveStep(index)}
                sx={{ cursor: 'pointer' }}
              >
                <Box display="flex" alignItems="center" gap={1}>
                  <Typography>{step.label}</Typography>
                  <Chip 
                    label={step.status}
                    color={step.color}
                    size="small"
                  />
                </Box>
              </StepLabel>
              <StepContent>
                <Typography color="text.secondary" gutterBottom>
                  {step.description}
                </Typography>
                <Alert severity="info" sx={{ mt: 1 }}>
                  <strong>Nächster Schritt:</strong> {step.action}
                </Alert>
              </StepContent>
            </Step>
          ))}
        </Stepper>

        {/* Rückerstattungsprozess */}
        <Typography variant="h6" gutterBottom sx={{ mt: 4 }}>
          💳 PayPal Rückerstattungs-Workflow
        </Typography>
        
        <List>
          {rueckerstattungsProzess.map((step, index) => (
            <ListItem key={index}>
              <ListItemIcon>
                <Box 
                  sx={{ 
                    width: 24, 
                    height: 24, 
                    borderRadius: '50%', 
                    bgcolor: 'primary.main', 
                    color: 'white',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '12px',
                    fontWeight: 'bold'
                  }}
                >
                  {index + 1}
                </Box>
              </ListItemIcon>
              <ListItemText
                primary={step.title}
                secondary={
                  <Box>
                    <Typography variant="body2" color="text.secondary">
                      {step.description}
                    </Typography>
                    <Typography variant="body2" color="primary" sx={{ fontWeight: 'bold', mt: 0.5 }}>
                      → {step.action}
                    </Typography>
                  </Box>
                }
              />
            </ListItem>
          ))}
        </List>

        {/* Wichtige Features */}
        <Typography variant="h6" gutterBottom sx={{ mt: 3 }}>
          🎯 Wichtige Features
        </Typography>
        
        <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))' }}>
          <Alert severity="success">
            <strong>📊 Dashboard</strong><br />
            Überblick über alle offenen Bestellungen nach Status
          </Alert>
          
          <Alert severity="info">
            <strong>💳 PayPal Integration</strong><br />
            Echte PayPal Business Buttons für Rückerstattungen
          </Alert>
          
          <Alert severity="warning">
            <strong>📧 Automatische E-Mails</strong><br />
            Kunden werden über Statusänderungen informiert
          </Alert>
          
          <Alert severity="error">
            <strong>📱 Mobile Optimiert</strong><br />
            Funktioniert perfekt auf Smartphones und Tablets
          </Alert>
        </Box>

        {/* System-Einstellungen Verbindung */}
        <Alert severity="info" sx={{ mt: 3 }}>
          <strong>⚙️ Verbindung zu System-Einstellungen:</strong><br />
          Die Bestellverwaltung nutzt die PayPal-Konfiguration aus den System-Einstellungen. 
          Dort können Sie zwischen Sandbox und Live-Modus wechseln.
        </Alert>
      </DialogContent>
      
      <DialogActions>
        <Button onClick={onClose} variant="contained">
          Verstanden
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default BestellverwaltungHilfe;