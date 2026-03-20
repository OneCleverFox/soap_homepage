import React, { useState, useEffect, useCallback } from 'react';
import {
  Container,
  Typography,
  Box,
  Paper,
  Stepper,
  Step,
  StepLabel,
  TextField,
  Button,
  Checkbox,
  FormControlLabel,
  Alert,
  CircularProgress,
  Divider,
  MenuItem,
  Chip
} from '@mui/material';
import DownloadIcon from '@mui/icons-material/Download';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';

const API_BASE_URL =
  process.env.NODE_ENV === 'development'
    ? 'http://localhost:5000/api'
    : process.env.REACT_APP_API_URL || 'https://soap-homepage-backend-production.up.railway.app/api';

const steps = ['Ihre Daten', 'Prüfen & Bestätigen', 'Bestätigung'];

// Hilfsfunktion: Deadline als lesbares Datum
function formatDate(isoString) {
  if (!isoString) return '';
  return new Intl.DateTimeFormat('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  }).format(new Date(isoString));
}

// ── Step 1 – Formular ────────────────────────────────────────────────────────
function Step1Form({ form, setForm, eligibleOrders, loadingOrders }) {
  const handleChange = (field) => (e) => {
    const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <Typography variant="body2" color="text.secondary">
        Füllen Sie das Formular aus. Die mit * markierten Felder sind Pflichtfelder.
      </Typography>

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
        <TextField
          label="Vorname *"
          value={form.firstName}
          onChange={handleChange('firstName')}
          fullWidth
          autoComplete="given-name"
        />
        <TextField
          label="Nachname *"
          value={form.lastName}
          onChange={handleChange('lastName')}
          fullWidth
          autoComplete="family-name"
        />
      </Box>

      <TextField
        label="E-Mail-Adresse *"
        type="email"
        value={form.email}
        onChange={handleChange('email')}
        fullWidth
        autoComplete="email"
        helperText="An diese Adresse senden wir die Eingangsbestätigung."
      />

      {/* Bestellnummer - entweder Dropdown (eingeloggt) oder Freitext (Gast) */}
      {eligibleOrders && eligibleOrders.length > 0 ? (
        <TextField
          select
          label="Bestellung auswählen *"
          value={form.orderNumber}
          onChange={handleChange('orderNumber')}
          fullWidth
          disabled={loadingOrders}
          helperText={loadingOrders ? 'Lade Bestellungen…' : 'Nur Bestellungen innerhalb der 14-Tage-Frist werden angezeigt.'}
        >
          {eligibleOrders.map((o) => (
            <MenuItem key={o.orderNumber} value={o.orderNumber}>
              #{o.orderNumber}
              {o.withdrawal?.uncertain && ' (Lieferdatum unbekannt)'}
              {o.withdrawal?.deadlineDate && ` – Frist bis ${formatDate(o.withdrawal.deadlineDate)}`}
            </MenuItem>
          ))}
        </TextField>
      ) : (
        <TextField
          label="Bestellnummer *"
          value={form.orderNumber}
          onChange={handleChange('orderNumber')}
          fullWidth
          placeholder="z. B. 2024-001"
          helperText={
            loadingOrders
              ? 'Lade Bestellungen…'
              : 'Geben Sie die Bestellnummer aus Ihrer Bestätigungsmail ein.'
          }
        />
      )}

      <TextField
        label="Anschrift (Straße, PLZ, Ort)"
        value={form.address}
        onChange={handleChange('address')}
        fullWidth
        multiline
        rows={2}
        autoComplete="street-address"
        helperText="Optional – wird für postalische Rückabwicklung benötigt."
      />

      <TextField
        label="Begründung"
        value={form.statementText}
        onChange={handleChange('statementText')}
        fullWidth
        multiline
        rows={3}
        helperText="Optional – eine Begründung ist gesetzlich nicht erforderlich."
      />

      <FormControlLabel
        control={
          <Checkbox
            checked={form.consentAck}
            onChange={handleChange('consentAck')}
          />
        }
        label={
          <Typography variant="body2">
            Ich bestätige, dass ich den Vertrag über die oben genannte Bestellung widerrufen möchte.
            Mir ist bekannt, dass das Widerrufsrecht für personalisierte Produkte ausgeschlossen sein kann.*
          </Typography>
        }
      />
    </Box>
  );
}

// ── Step 2 – Überprüfung ─────────────────────────────────────────────────────
function Step2Review({ form }) {
  const customerName = [form.firstName, form.lastName].filter(Boolean).join(' ');
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <Alert severity="warning" sx={{ mb: 1 }}>
        Bitte prüfen Sie Ihre Angaben sorgfältig. Mit einem Klick auf <strong>"Widerruf jetzt bestätigen"</strong> senden
        Sie Ihre rechtlich bindende Widerrufserklärung ab.
      </Alert>
      <Paper variant="outlined" sx={{ p: 2 }}>
        <Typography variant="subtitle2" gutterBottom>Ihre Angaben:</Typography>
        <Box sx={{ display: 'grid', gridTemplateColumns: '160px 1fr', gap: '4px 12px' }}>
          <Typography variant="body2" color="text.secondary">Name:</Typography>
          <Typography variant="body2">{customerName || '–'}</Typography>
          <Typography variant="body2" color="text.secondary">E-Mail:</Typography>
          <Typography variant="body2">{form.email || '–'}</Typography>
          <Typography variant="body2" color="text.secondary">Bestellnummer:</Typography>
          <Typography variant="body2">{form.orderNumber || '–'}</Typography>
          {form.address && (
            <>
              <Typography variant="body2" color="text.secondary">Anschrift:</Typography>
              <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>{form.address}</Typography>
            </>
          )}
          {form.statementText && (
            <>
              <Typography variant="body2" color="text.secondary">Begründung:</Typography>
              <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>{form.statementText}</Typography>
            </>
          )}
        </Box>
      </Paper>
      <Typography variant="body2" color="text.secondary">
        Der Widerruf gilt für die gesamte Bestellung. Nach der Übermittlung erhalten Sie eine
        Eingangsbestätigung per E-Mail. Bitte heben Sie diese für Ihre Unterlagen auf.
      </Typography>
    </Box>
  );
}

// ── Step 3 – Erfolg ──────────────────────────────────────────────────────────
function Step3Success({ widerrufId, email, createdAt }) {
  return (
    <Box sx={{ textAlign: 'center', py: 3 }}>
      <CheckCircleIcon sx={{ fontSize: 64, color: 'success.main', mb: 2 }} />
      <Typography variant="h5" gutterBottom>
        Ihr Widerruf wurde übermittelt
      </Typography>
      <Typography variant="body1" sx={{ mb: 3 }}>
        Wir haben Ihren Widerruf erhalten und bearbeiten ihn schnellstmöglich.
        {email && (
          <> Eine Eingangsbestätigung wurde an <strong>{email}</strong> gesendet.</>
        )}
      </Typography>
      <Paper variant="outlined" sx={{ display: 'inline-block', px: 3, py: 1.5, mb: 3 }}>
        <Typography variant="body2" color="text.secondary" gutterBottom>
          Ihre Referenznummer:
        </Typography>
        <Typography variant="h6" sx={{ fontFamily: 'monospace' }}>
          {widerrufId}
        </Typography>
        {createdAt && (
          <Typography variant="caption" color="text.secondary">
            Eingegangen am: {new Intl.DateTimeFormat('de-DE', {
              day: '2-digit', month: '2-digit', year: 'numeric',
              hour: '2-digit', minute: '2-digit'
            }).format(new Date(createdAt))}
          </Typography>
        )}
      </Paper>
      <Typography variant="body2" color="text.secondary">
        Bitte bewahren Sie diese Referenznummer auf. Bei Rückfragen nennen Sie sie unserem Kundenservice.
      </Typography>
    </Box>
  );
}

// ── Hauptkomponente ──────────────────────────────────────────────────────────
export default function WiderrufPage() {
  const { user, token } = useAuth();

  const [activeStep, setActiveStep] = useState(0);
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    orderNumber: '',
    address: '',
    statementText: '',
    consentAck: false
  });
  const [eligibleOrders, setEligibleOrders] = useState([]);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);

  // Eingeloggte Nutzer: Vorausfüllen + berechtigte Bestellungen laden
  useEffect(() => {
    if (user) {
      // Name splitten, wenn nur 'name' Feld vorhanden ist
      let fName = user.firstName || user.vorname;
      let lName = user.lastName || user.nachname;
      
      if (!fName && !lName && user.name) {
        const nameParts = user.name.trim().split(/\s+/);
        if (nameParts.length >= 2) {
          fName = nameParts[0];
          lName = nameParts.slice(1).join(' ');
        } else if (nameParts.length === 1) {
          fName = nameParts[0];
        }
      }
      
      // Versuche Adresse aus verschiedenen Quellen zu extrahieren
      let addressStr = '';
      if (user.address) {
        // Struktur: { street, houseNumber, zipCode, city, country }
        const parts = [
          [user.address.street, user.address.houseNumber].filter(Boolean).join(' '),
          [user.address.zipCode, user.address.city].filter(Boolean).join(' '),
          user.address.country || ''
        ].filter(Boolean);
        addressStr = parts.join(', ');
      }
      
      setForm((prev) => ({
        ...prev,
        firstName: fName || prev.firstName,
        lastName: lName || prev.lastName,
        email: user.email || prev.email,
        address: addressStr || prev.address
      }));
    }
  }, [user]);

  // Lade vollständige User-Daten (einschl. Adresse) wenn angemeldet
  useEffect(() => {
    if (token) {
      api.get('/users/me')
        .then((res) => {
          const userData = res.data || res.data.user;
          if (userData?.address) {
            const { street = '', houseNumber = '', zipCode = '', city = '', country = '' } = userData.address;
            const addressStr = [
              [street, houseNumber].filter(Boolean).join(' '),
              [zipCode, city].filter(Boolean).join(' '),
              country
            ].filter(Boolean).join(', ');
            
            setForm((prev) => ({
              ...prev,
              address: addressStr || prev.address
            }));
          }
        })
        .catch(() => {
          // Fehler beim Laden ignorieren – Fallback aktiv
        });
    }
  }, [token]);

  const fetchEligibleOrders = useCallback(async () => {
    if (!token) return;
    setLoadingOrders(true);
    try {
      const res = await fetch(`${API_BASE_URL}/widerruf/eligible-orders`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setEligibleOrders(data.orders || []);
      }
    } catch {
      // Fehler beim Laden ignorieren – Freitext-Fallback aktiv
    } finally {
      setLoadingOrders(false);
    }
  }, [token]);

  useEffect(() => {
    fetchEligibleOrders();
  }, [fetchEligibleOrders]);

  // Formularvalidierung Step 1
  const step1Valid =
    form.firstName.trim() &&
    form.lastName.trim() &&
    form.email.trim() &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email) &&
    form.orderNumber.trim() &&
    form.consentAck;

  const handleNext = () => setActiveStep((s) => s + 1);
  const handleBack = () => {
    setError('');
    setActiveStep((s) => s - 1);
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    setError('');
    try {
      const headers = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch(`${API_BASE_URL}/widerruf/submit`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          customerName: [form.firstName, form.lastName].filter(Boolean).join(' '),
          customerEmail: form.email,
          customerAddress: form.address || undefined,
          orderNumber: form.orderNumber,
          statementText: form.statementText || undefined,
          consentAck: form.consentAck
        })
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || 'Fehler beim Übermitteln des Widerrufs');
      }

      setResult(data);
      setActiveStep(2);
    } catch (err) {
      setError(err.message || 'Ein unerwarteter Fehler ist aufgetreten.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDownloadPDF = () => {
    const params = new URLSearchParams();
    // Nutze die Form-Daten, die bereits mit den User-Infos gefüllt sind
    if (form.firstName) params.append('customerFirstName', form.firstName);
    if (form.lastName) params.append('customerLastName', form.lastName);
    const url = `${API_BASE_URL}/widerruf/formular.pdf?${params.toString()}`;
    window.open(url, '_blank');
  };

  return (
    <Container maxWidth="md" sx={{ py: 5 }}>
      {/* Seiten-Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom sx={{ fontWeight: 700 }}>
          Widerruf einlegen
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Gemäß § 355 BGB haben Sie das Recht, innerhalb von 14 Tagen nach Erhalt Ihrer Bestellung ohne
          Angabe von Gründen zu widerrufen.
        </Typography>
      </Box>

      {/* PDF-Download-Banner */}
      <Alert
        severity="info"
        sx={{ mb: 3 }}
        action={
          <Button
            size="small"
            startIcon={<DownloadIcon />}
            onClick={handleDownloadPDF}
          >
            PDF herunterladen
          </Button>
        }
      >
        Sie können den Widerruf auch schriftlich per Post einreichen.&nbsp;
        Laden Sie das Muster-Widerrufsformular (DIN A4) herunter, füllen Sie es aus und senden Sie
        es an unsere Anschrift.
      </Alert>

      <Paper elevation={2} sx={{ p: { xs: 2, sm: 4 } }}>
        <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
          {steps.map((label) => (
            <Step key={label}>
              <StepLabel>{label}</StepLabel>
            </Step>
          ))}
        </Stepper>

        <Divider sx={{ mb: 3 }} />

        {/* Schritt-Inhalte */}
        {activeStep === 0 && (
          <Step1Form
            form={form}
            setForm={setForm}
            eligibleOrders={eligibleOrders}
            loadingOrders={loadingOrders}
          />
        )}
        {activeStep === 1 && <Step2Review form={form} />}
        {activeStep === 2 && result && (
          <Step3Success
            widerrufId={result.widerrufId}
            email={form.email}
            createdAt={result.createdAt}
          />
        )}

        {/* Fehlermeldung */}
        {error && (
          <Alert severity="error" sx={{ mt: 2 }}>
            {error}
          </Alert>
        )}

        {/* Navigation */}
        {activeStep < 2 && (
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 3 }}>
            <Button
              disabled={activeStep === 0 || submitting}
              onClick={handleBack}
              variant="outlined"
            >
              Zurück
            </Button>

            {activeStep === 0 && (
              <Button
                variant="contained"
                onClick={handleNext}
                disabled={!step1Valid}
              >
                Weiter zur Prüfung
              </Button>
            )}

            {activeStep === 1 && (
              <Button
                variant="contained"
                color="error"
                onClick={handleSubmit}
                disabled={submitting}
                startIcon={submitting ? <CircularProgress size={18} color="inherit" /> : null}
              >
                {submitting ? 'Wird übermittelt…' : 'Widerruf jetzt bestätigen'}
              </Button>
            )}
          </Box>
        )}

        {/* Hinweis auf Ausschlüsse */}
        {activeStep < 2 && (
          <>
            <Divider sx={{ mt: 4, mb: 2 }} />
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              <Chip label="14-Tage-Frist" size="small" color="primary" variant="outlined" />
              <Chip label="Personalisierte Artikel ausgeschlossen" size="small" color="warning" variant="outlined" />
              <Chip label="Eingangsbestätigung per E-Mail" size="small" color="success" variant="outlined" />
            </Box>
            <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
              Das Widerrufsrecht ist gemäß § 312g Abs. 2 Nr. 1 BGB für Waren ausgeschlossen, die nach
              Kundenspezifikation hergestellt oder eindeutig auf die persönlichen Bedürfnisse zugeschnitten wurden.
            </Typography>
          </>
        )}
      </Paper>
    </Container>
  );
}
