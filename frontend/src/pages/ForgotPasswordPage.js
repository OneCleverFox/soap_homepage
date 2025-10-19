import React, { useState } from 'react';
import {
  Container,
  Paper,
  Box,
  Typography,
  TextField,
  Button,
  Alert,
  Link,
  CircularProgress,
  Stepper,
  Step,
  StepLabel
} from '@mui/material';
import { ArrowBack, Email, Send } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import authService from '../services/authService';

const ForgotPasswordPage = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [emailSent, setEmailSent] = useState(false);

  const validateEmail = (email) => {
    const emailRegex = /^\S+@\S+\.\S+$/;
    return emailRegex.test(email);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');

    // Validierung
    if (!email) {
      setError('E-Mail-Adresse ist erforderlich');
      return;
    }

    if (!validateEmail(email)) {
      setError('Bitte geben Sie eine gültige E-Mail-Adresse ein');
      return;
    }

    setLoading(true);

    try {
      const response = await authService.forgotPassword(email);
      
      if (response.success) {
        setMessage(response.message);
        setEmailSent(true);
      } else {
        setError(response.message || 'Ein Fehler ist aufgetreten');
      }
    } catch (error) {
      console.error('Forgot password error:', error);
      setError('Verbindungsfehler. Bitte versuchen Sie es später erneut.');
    } finally {
      setLoading(false);
    }
  };

  const handleBackToLogin = () => {
    navigate('/login');
  };

  const handleResendEmail = () => {
    setEmailSent(false);
    setMessage('');
    setError('');
  };

  if (emailSent) {
    return (
      <Container maxWidth="sm" sx={{ mt: 8, mb: 4 }}>
        <Paper
          elevation={3}
          sx={{
            p: 4,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            backgroundColor: 'background.paper'
          }}
        >
          {/* Success Step Indicator */}
          <Box sx={{ width: '100%', mb: 4 }}>
            <Stepper activeStep={1} alternativeLabel>
              <Step completed>
                <StepLabel>E-Mail eingeben</StepLabel>
              </Step>
              <Step completed>
                <StepLabel>E-Mail gesendet</StepLabel>
              </Step>
              <Step>
                <StepLabel>Neues Passwort erstellen</StepLabel>
              </Step>
            </Stepper>
          </Box>

          {/* Success Icon */}
          <Box
            sx={{
              width: 80,
              height: 80,
              borderRadius: '50%',
              backgroundColor: 'success.main',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              mb: 3
            }}
          >
            <Email sx={{ fontSize: 40, color: 'white' }} />
          </Box>

          <Typography variant="h4" component="h1" gutterBottom align="center" color="primary">
            E-Mail gesendet!
          </Typography>

          <Typography variant="body1" align="center" color="text.secondary" sx={{ mb: 3 }}>
            Falls ein Konto mit der E-Mail-Adresse <strong>{email}</strong> existiert, 
            haben wir eine E-Mail mit Anweisungen zum Zurücksetzen des Passworts gesendet.
          </Typography>

          {message && (
            <Alert severity="success" sx={{ width: '100%', mb: 3 }}>
              {message}
            </Alert>
          )}

          <Box sx={{ 
            border: '1px solid', 
            borderColor: 'primary.main', 
            borderRadius: 2, 
            p: 3, 
            backgroundColor: 'primary.50',
            width: '100%',
            mb: 3 
          }}>
            <Typography variant="h6" gutterBottom sx={{ color: 'primary.main' }}>
              📧 Nächste Schritte:
            </Typography>
            <Typography variant="body2" color="text.secondary" component="div">
              <ol style={{ paddingLeft: '20px', margin: 0 }}>
                <li>Überprüfen Sie Ihr E-Mail-Postfach (auch den Spam-Ordner)</li>
                <li>Klicken Sie auf den "Passwort zurücksetzen" Link in der E-Mail</li>
                <li>Erstellen Sie ein neues, sicheres Passwort</li>
                <li>Melden Sie sich mit dem neuen Passwort an</li>
              </ol>
            </Typography>
          </Box>

          <Box sx={{ display: 'flex', gap: 2, width: '100%' }}>
            <Button
              variant="outlined"
              onClick={handleBackToLogin}
              startIcon={<ArrowBack />}
              fullWidth
            >
              Zurück zum Login
            </Button>
            <Button
              variant="contained"
              onClick={handleResendEmail}
              startIcon={<Send />}
              fullWidth
            >
              Erneut senden
            </Button>
          </Box>
        </Paper>
      </Container>
    );
  }

  return (
    <Container maxWidth="sm" sx={{ mt: 8, mb: 4 }}>
      <Paper
        elevation={3}
        sx={{
          p: 4,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          backgroundColor: 'background.paper'
        }}
      >
        {/* Step Indicator */}
        <Box sx={{ width: '100%', mb: 4 }}>
          <Stepper activeStep={0} alternativeLabel>
            <Step active>
              <StepLabel>E-Mail eingeben</StepLabel>
            </Step>
            <Step>
              <StepLabel>E-Mail gesendet</StepLabel>
            </Step>
            <Step>
              <StepLabel>Neues Passwort erstellen</StepLabel>
            </Step>
          </Stepper>
        </Box>

        <Typography variant="h4" component="h1" gutterBottom align="center" color="primary">
          Passwort vergessen?
        </Typography>

        <Typography variant="body1" align="center" color="text.secondary" sx={{ mb: 4 }}>
          Geben Sie Ihre E-Mail-Adresse ein und wir senden Ihnen einen Link zum Zurücksetzen Ihres Passworts.
        </Typography>

        {error && (
          <Alert severity="error" sx={{ width: '100%', mb: 3 }}>
            {error}
          </Alert>
        )}

        <Box component="form" onSubmit={handleSubmit} sx={{ width: '100%' }}>
          <TextField
            margin="normal"
            required
            fullWidth
            id="email"
            label="E-Mail-Adresse"
            name="email"
            autoComplete="email"
            autoFocus
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            error={Boolean(error) || (email && !validateEmail(email))}
            helperText={error || (email && !validateEmail(email) ? 'Ungültige E-Mail-Adresse' : '')}
            InputProps={{
              startAdornment: <Email sx={{ mr: 1, color: 'text.secondary' }} />
            }}
            sx={{ mb: 3 }}
          />

          <Button
            type="submit"
            fullWidth
            variant="contained"
            size="large"
            disabled={loading || !email}
            startIcon={loading ? <CircularProgress size={20} /> : <Send />}
            sx={{ mb: 3 }}
          >
            {loading ? 'Wird gesendet...' : 'Reset-Link senden'}
          </Button>

          <Box sx={{ textAlign: 'center' }}>
            <Link
              component="button"
              type="button"
              variant="body2"
              onClick={handleBackToLogin}
              sx={{ 
                textDecoration: 'none',
                '&:hover': {
                  textDecoration: 'underline'
                }
              }}
            >
              ← Zurück zum Login
            </Link>
          </Box>
        </Box>
      </Paper>
    </Container>
  );
};

export default ForgotPasswordPage;