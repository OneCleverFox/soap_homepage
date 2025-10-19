import React, { useState, useEffect } from 'react';
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
  StepLabel,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  LinearProgress
} from '@mui/material';
import { 
  ArrowBack, 
  Lock, 
  CheckOutlined, 
  CloseOutlined,
  Visibility,
  VisibilityOff,
  Security
} from '@mui/icons-material';
import { useNavigate, useParams } from 'react-router-dom';
import authService from '../services/authService';
import PasswordValidator from '../utils/passwordValidator';

const ResetPasswordPage = () => {
  const navigate = useNavigate();
  const { token } = useParams();
  const [formData, setFormData] = useState({
    password: '',
    confirmPassword: ''
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordValidation, setPasswordValidation] = useState({
    isValid: false,
    requirements: {},
    feedback: [],
    strengthText: '',
    strengthColor: 'error'
  });

  useEffect(() => {
    if (!token) {
      setError('Ungültiger Reset-Link. Token fehlt.');
      return;
    }

    // Token-Format validieren (sollte 64 Zeichen Hex sein)
    if (!/^[a-f0-9]{64}$/i.test(token)) {
      setError('Ungültiger Reset-Link. Token hat falsches Format.');
    }
  }, [token]);

  useEffect(() => {
    if (formData.password) {
      const validation = PasswordValidator.validatePassword(formData.password, {});
      setPasswordValidation(validation);
    } else {
      setPasswordValidation({
        isValid: false,
        requirements: {},
        feedback: [],
        strengthText: '',
        strengthColor: 'error'
      });
    }
  }, [formData.password]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    setError('');
  };

  const validateForm = () => {
    if (!formData.password) {
      setError('Passwort ist erforderlich');
      return false;
    }

    if (!formData.confirmPassword) {
      setError('Passwort-Bestätigung ist erforderlich');
      return false;
    }

    if (formData.password !== formData.confirmPassword) {
      setError('Passwörter stimmen nicht überein');
      return false;
    }

    if (!passwordValidation.isValid) {
      setError('Passwort erfüllt nicht alle Sicherheitsanforderungen');
      return false;
    }

    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');

    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      const response = await authService.resetPassword(token, formData.password, formData.confirmPassword);
      
      if (response.success) {
        setMessage(response.message);
        setSuccess(true);
      } else {
        setError(response.message || 'Fehler beim Zurücksetzen des Passworts');
      }
    } catch (error) {
      console.error('Reset password error:', error);
      setError('Verbindungsfehler. Bitte versuchen Sie es später erneut.');
    } finally {
      setLoading(false);
    }
  };

  const handleBackToLogin = () => {
    navigate('/login');
  };

  const getPasswordStrengthColor = () => {
    switch (passwordValidation.strengthColor) {
      case 'success': return 'success';
      case 'warning': return 'warning';
      case 'info': return 'info';
      default: return 'error';
    }
  };

  const getPasswordStrengthValue = () => {
    if (!formData.password) return 0;
    return (Object.values(passwordValidation.requirements).filter(Boolean).length / 
            Object.keys(passwordValidation.requirements).length) * 100;
  };

  if (success) {
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
            <Stepper activeStep={2} alternativeLabel>
              <Step completed>
                <StepLabel>E-Mail eingeben</StepLabel>
              </Step>
              <Step completed>
                <StepLabel>E-Mail gesendet</StepLabel>
              </Step>
              <Step completed>
                <StepLabel>Neues Passwort erstellt</StepLabel>
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
            <Security sx={{ fontSize: 40, color: 'white' }} />
          </Box>

          <Typography variant="h4" component="h1" gutterBottom align="center" color="primary">
            Passwort erfolgreich zurückgesetzt!
          </Typography>

          {message && (
            <Alert severity="success" sx={{ width: '100%', mb: 3 }}>
              {message}
            </Alert>
          )}

          <Typography variant="body1" align="center" color="text.secondary" sx={{ mb: 4 }}>
            Ihr Passwort wurde erfolgreich aktualisiert. Sie können sich jetzt mit Ihrem neuen Passwort anmelden.
          </Typography>

          <Button
            variant="contained"
            size="large"
            onClick={handleBackToLogin}
            startIcon={<ArrowBack />}
            fullWidth
          >
            Zur Anmeldung
          </Button>
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
          <Stepper activeStep={2} alternativeLabel>
            <Step completed>
              <StepLabel>E-Mail eingeben</StepLabel>
            </Step>
            <Step completed>
              <StepLabel>E-Mail gesendet</StepLabel>
            </Step>
            <Step active>
              <StepLabel>Neues Passwort erstellen</StepLabel>
            </Step>
          </Stepper>
        </Box>

        <Typography variant="h4" component="h1" gutterBottom align="center" color="primary">
          Neues Passwort erstellen
        </Typography>

        <Typography variant="body1" align="center" color="text.secondary" sx={{ mb: 4 }}>
          Erstellen Sie ein neues, sicheres Passwort für Ihr Konto.
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
            name="password"
            label="Neues Passwort"
            type={showPassword ? 'text' : 'password'}
            id="password"
            autoComplete="new-password"
            value={formData.password}
            onChange={handleInputChange}
            InputProps={{
              startAdornment: <Lock sx={{ mr: 1, color: 'text.secondary' }} />,
              endAdornment: (
                <Button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  sx={{ minWidth: 'auto', p: 1 }}
                >
                  {showPassword ? <VisibilityOff /> : <Visibility />}
                </Button>
              )
            }}
            sx={{ mb: 2 }}
          />

          <TextField
            margin="normal"
            required
            fullWidth
            name="confirmPassword"
            label="Passwort bestätigen"
            type={showConfirmPassword ? 'text' : 'password'}
            id="confirmPassword"
            autoComplete="new-password"
            value={formData.confirmPassword}
            onChange={handleInputChange}
            error={formData.confirmPassword && formData.password !== formData.confirmPassword}
            helperText={
              formData.confirmPassword && formData.password !== formData.confirmPassword
                ? 'Passwörter stimmen nicht überein'
                : ''
            }
            InputProps={{
              startAdornment: <Lock sx={{ mr: 1, color: 'text.secondary' }} />,
              endAdornment: (
                <Button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  sx={{ minWidth: 'auto', p: 1 }}
                >
                  {showConfirmPassword ? <VisibilityOff /> : <Visibility />}
                </Button>
              )
            }}
            sx={{ mb: 3 }}
          />

          {/* Passwort-Stärke-Anzeige */}
          {formData.password && (
            <Box sx={{ mb: 3 }}>
              <Typography variant="body2" gutterBottom>
                Passwort-Stärke: <strong style={{ color: getPasswordStrengthColor() === 'error' ? '#d32f2f' : getPasswordStrengthColor() === 'warning' ? '#ed6c02' : '#2e7d32' }}>
                  {passwordValidation.strengthText || 'Schwach'}
                </strong>
              </Typography>
              
              <LinearProgress
                variant="determinate"
                value={getPasswordStrengthValue()}
                color={getPasswordStrengthColor()}
                sx={{ height: 8, borderRadius: 4, mb: 2 }}
              />
              
              {/* Anforderungen-Liste */}
              <Typography variant="body2" gutterBottom fontWeight="bold">
                Passwort-Anforderungen:
              </Typography>
              <List dense sx={{ py: 0 }}>
                <ListItem dense sx={{ py: 0.5 }}>
                  <ListItemIcon sx={{ minWidth: 36 }}>
                    {passwordValidation.requirements.length ? 
                      <CheckOutlined color="success" fontSize="small" /> : 
                      <CloseOutlined color="error" fontSize="small" />
                    }
                  </ListItemIcon>
                  <ListItemText primary="Mindestens 8 Zeichen" />
                </ListItem>
                
                <ListItem dense sx={{ py: 0.5 }}>
                  <ListItemIcon sx={{ minWidth: 36 }}>
                    {passwordValidation.requirements.uppercase ? 
                      <CheckOutlined color="success" fontSize="small" /> : 
                      <CloseOutlined color="error" fontSize="small" />
                    }
                  </ListItemIcon>
                  <ListItemText primary="Großbuchstabe (A-Z)" />
                </ListItem>
                
                <ListItem dense sx={{ py: 0.5 }}>
                  <ListItemIcon sx={{ minWidth: 36 }}>
                    {passwordValidation.requirements.lowercase ? 
                      <CheckOutlined color="success" fontSize="small" /> : 
                      <CloseOutlined color="error" fontSize="small" />
                    }
                  </ListItemIcon>
                  <ListItemText primary="Kleinbuchstabe (a-z)" />
                </ListItem>
                
                <ListItem dense sx={{ py: 0.5 }}>
                  <ListItemIcon sx={{ minWidth: 36 }}>
                    {passwordValidation.requirements.number ? 
                      <CheckOutlined color="success" fontSize="small" /> : 
                      <CloseOutlined color="error" fontSize="small" />
                    }
                  </ListItemIcon>
                  <ListItemText primary="Zahl (0-9)" />
                </ListItem>
                
                <ListItem dense sx={{ py: 0.5 }}>
                  <ListItemIcon sx={{ minWidth: 36 }}>
                    {passwordValidation.requirements.special ? 
                      <CheckOutlined color="success" fontSize="small" /> : 
                      <CloseOutlined color="error" fontSize="small" />
                    }
                  </ListItemIcon>
                  <ListItemText primary="Sonderzeichen (@$!%*?&)" />
                </ListItem>
                
                <ListItem dense sx={{ py: 0.5 }}>
                  <ListItemIcon sx={{ minWidth: 36 }}>
                    {passwordValidation.requirements.noRepetition ? 
                      <CheckOutlined color="success" fontSize="small" /> : 
                      <CloseOutlined color="error" fontSize="small" />
                    }
                  </ListItemIcon>
                  <ListItemText primary="Keine 3+ gleichen Zeichen hintereinander" />
                </ListItem>
              </List>
              
              {/* Feedback anzeigen */}
              {passwordValidation.feedback.length > 0 && (
                <Box sx={{ mt: 1 }}>
                  <Typography variant="body2" color="error.main" fontWeight="bold">
                    Verbesserungsvorschläge:
                  </Typography>
                  <ul style={{ margin: '4px 0', paddingLeft: '20px' }}>
                    {passwordValidation.feedback.map((feedback, index) => (
                      <li key={index}>
                        <Typography variant="body2" color="error.main">
                          {feedback}
                        </Typography>
                      </li>
                    ))}
                  </ul>
                </Box>
              )}
            </Box>
          )}

          <Button
            type="submit"
            fullWidth
            variant="contained"
            size="large"
            disabled={loading || !passwordValidation.isValid || formData.password !== formData.confirmPassword}
            startIcon={loading ? <CircularProgress size={20} /> : <Security />}
            sx={{ mb: 3 }}
          >
            {loading ? 'Wird gespeichert...' : 'Passwort zurücksetzen'}
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

export default ResetPasswordPage;