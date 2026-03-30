import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Container,
  Paper,
  TextField,
  Button,
  Typography,
  Box,
  Alert,
  CircularProgress,
  InputAdornment,
  IconButton,
  Grid,
  Divider,
  Stepper,
  Step,
  StepLabel,
  Fade,
  Collapse,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormControlLabel,
  Checkbox,
  FormGroup,
  LinearProgress,
  Chip,
  List,
  ListItem,
  ListItemIcon,
  ListItemText
} from '@mui/material';
import {
  PersonOutlined,
  EmailOutlined,
  LockOutlined,
  VisibilityOutlined,
  VisibilityOffOutlined,
  PersonAddOutlined,
  PhoneOutlined,
  HomeOutlined,
  CakeOutlined,
  CheckCircleOutlined,
  ArrowBackOutlined,
  WcOutlined,
  CloseOutlined,
  SecurityOutlined
} from '@mui/icons-material';
import { authAPI } from '../services/api';
import PasswordValidator from '../utils/passwordValidator';

const RegisterPage = () => {
  const navigate = useNavigate();
  
  const [activeStep, setActiveStep] = useState(0);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [registrationData, setRegistrationData] = useState(null);
  const [emailCheckLoading, setEmailCheckLoading] = useState(false);
  const [emailError, setEmailError] = useState('');
  const [passwordValidation, setPasswordValidation] = useState({
    isValid: false,
    score: 0,
    feedback: [],
    requirements: {},
    strengthText: '',
    strengthColor: 'error'
  });

  const [formData, setFormData] = useState({
    // Schritt 1: Grunddaten (Pflicht)
    email: '',
    password: '',
    confirmPassword: '',
    
    // Schritt 2: Persönliche Daten
    firstName: '', // Pflicht - vorname
    lastName: '',  // Pflicht - nachname
    phone: '',     // Optional - telefon
    dateOfBirth: null, // Optional - geburtsdatum
    geschlecht: '', // Optional - geschlecht
    
    // Schritt 3: Adresse (Pflicht)
    address: {
      street: '',     // Pflicht
      houseNumber: '', // Pflicht  
      zipCode: '',    // Pflicht
      city: '',       // Pflicht
      country: 'Deutschland' // Pflicht
    },
    
    // Schritt 4: Lieferadresse & Präferenzen (Optional)
    lieferadresse: {
      abweichend: false,
      street: '',
      houseNumber: '',
      zipCode: '',
      city: '',
      country: 'Deutschland'
    },
    
    // Kommunikations-Präferenzen (Optional)
    kommunikation: {
      newsletter: true,
      produktupdates: true,
      angebote: true,
      emailFrequenz: 'wöchentlich'
    }
  });

  const steps = [
    'Zugangsdaten',
    'Persönliche Daten', 
    'Adresse',
    'Lieferung & Präferenzen'
  ];

  const requirementLabels = {
    length: 'Mindestens 8 Zeichen',
    uppercase: 'Großbuchstabe (A-Z)',
    lowercase: 'Kleinbuchstabe (a-z)',
    number: 'Zahl (0-9)',
    special: 'Sonderzeichen (@$!%*?&#+-_=)',
    noRepetition: 'Keine 3+ gleichen Zeichen hintereinander',
    noUserInfo: 'Keine persönlichen Daten im Passwort',
    noCommonPasswords: 'Kein häufig verwendetes Passwort',
    strength: 'Stärke mindestens Mittel (3/4)'
  };

  const handleChange = (e) => {
    const { name, value, checked, type } = e.target;
    
    if (name.startsWith('address.')) {
      const addressField = name.split('.')[1];
      setFormData(prev => ({
        ...prev,
        address: {
          ...prev.address,
          [addressField]: value
        }
      }));
    } else if (name.startsWith('lieferadresse.')) {
      const lieferField = name.split('.')[1];
      setFormData(prev => ({
        ...prev,
        lieferadresse: {
          ...prev.lieferadresse,
          [lieferField]: type === 'checkbox' ? checked : value
        }
      }));
    } else if (name.startsWith('kommunikation.')) {
      const kommField = name.split('.')[1];
      setFormData(prev => ({
        ...prev,
        kommunikation: {
          ...prev.kommunikation,
          [kommField]: type === 'checkbox' ? checked : value
        }
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: type === 'checkbox' ? checked : value
      }));
      
      // E-Mail-Eindeutigkeits-Check bei E-Mail-Eingabe
      if (name === 'email' && value) {
        checkEmailUniqueness(value);
      }
      
      // Passwort-Validierung bei Passwort-Eingabe
      if (name === 'password') {
        validatePassword(value);
      }

      // Passwort neu bewerten, wenn benutzerbezogene Felder geändert werden
      if ((name === 'firstName' || name === 'lastName' || name === 'email') && formData.password) {
        validatePassword(formData.password, { [name]: value });
      }
    }
    
    setError('');
    if (name === 'email') {
      setEmailError('');
    }
  };

  const validatePassword = (password, userInfoOverrides = {}) => {
    const validation = PasswordValidator.validatePassword(password, {
      firstName: userInfoOverrides.firstName ?? formData.firstName,
      lastName: userInfoOverrides.lastName ?? formData.lastName,
      email: userInfoOverrides.email ?? formData.email
    });
    
    setPasswordValidation(validation);
  };

  const checkEmailUniqueness = async (email) => {
    // Nur prüfen wenn E-Mail gültiges Format hat
    const emailRegex = /^\S+@\S+\.\S+$/;
    if (!emailRegex.test(email)) {
      return;
    }

    setEmailCheckLoading(true);
    setEmailError('');

    try {
      // Timeout für bessere UX (nicht bei jedem Tastendruck)
      await new Promise(resolve => setTimeout(resolve, 800));
      
      // Check E-Mail endpoint implementiert
      // Für jetzt simulieren wir die Validierung bei der Registrierung
      console.log('🔍 E-Mail-Eindeutigkeits-Check für:', email);
      
    } catch (err) {
      console.error('E-Mail-Check Fehler:', err);
    } finally {
      setEmailCheckLoading(false);
    }
  };

  const handleDateChange = (e) => {
    const { value } = e.target;
    setFormData(prev => ({
      ...prev,
      dateOfBirth: value ? new Date(value) : null
    }));
  };

  const validateStep = (step) => {
    switch (step) {
      case 0:
        if (!formData.email || !formData.password || !formData.confirmPassword) {
          setError('Alle Felder in diesem Schritt sind erforderlich');
          return false;
        }
        if (emailError) {
          setError('Bitte verwenden Sie eine andere E-Mail-Adresse');
          return false;
        }
        if (formData.password !== formData.confirmPassword) {
          setError('Passwörter stimmen nicht überein');
          return false;
        }
        if (formData.password.length < 8) {
          setError('Passwort muss mindestens 8 Zeichen lang sein');
          return false;
        }
        if (!passwordValidation.isValid && formData.password) {
          setError('Passwort entspricht nicht den Sicherheitsanforderungen');
          return false;
        }
        break;
        
      case 1:
        if (!formData.firstName || !formData.lastName) {
          setError('Vor- und Nachname sind erforderlich');
          return false;
        }
        break;
        
        case 2:
        if (!formData.address.street || !formData.address.houseNumber || 
            !formData.address.zipCode || !formData.address.city) {
          setError('Alle Adressfelder sind erforderlich');
          return false;
        }
        break;
        
      case 3:
        // Schritt 4 ist komplett optional - keine Validierung erforderlich
        break;      default:
        return true;
    }
    
    setError('');
    return true;
  };

  const handleNext = () => {
    if (validateStep(activeStep)) {
      setActiveStep(prev => prev + 1);
    }
  };

  const handleBack = () => {
    setActiveStep(prev => prev - 1);
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateStep(3)) return;
    
    setLoading(true);
    setError('');

    try {
      console.log('📝 Registrierungs-Versuch:', formData.email);
      console.log('🐛 DEBUG - Gesendete Daten:', {
        ...formData,
        password: '***hidden***'
      });

      const response = await authAPI.register(formData);

      if (response.data.success) {
        console.log('✅ Registrierung erfolgreich');
        setSuccess(true);
        
        // Store registration data for success page
        setRegistrationData(response.data);
        
        // If email verification is not required, redirect to login after 3 seconds
        if (response.data.data?.emailVerified === true) {
          setTimeout(() => {
            navigate('/login', { 
              state: { 
                message: 'Registrierung erfolgreich! Sie können sich jetzt anmelden.',
                registrationSuccess: true 
              }
            });
          }, 3000);
        }
      } else {
        throw new Error(response.data.message || 'Registrierung fehlgeschlagen');
      }

    } catch (err) {
      console.error('❌ Registrierungs-Fehler:', err);
      console.error('📋 Fehler-Details:', {
        message: err.message,
        responseData: err.response?.data,
        responseStatus: err.response?.status,
        responseHeaders: err.response?.headers,
        requestData: formData
      });
      
      // WICHTIG: Vollständige responseData ausgeben
      if (err.response?.data) {
        console.error('🔍 Vollständige Response-Data:', JSON.stringify(err.response.data, null, 2));
      }
      
      let errorMessage = 'Unbekannter Fehler bei der Registrierung';
      
      if (err.response?.data?.message) {
        errorMessage = err.response.data.message;
      } else if (err.response?.data?.error) {
        errorMessage = `Fehler: ${err.response.data.error}`;
      } else if (err.response?.status) {
        errorMessage = `Server-Fehler ${err.response.status}: ${err.response.statusText || 'Unbekannt'}`;
      } else {
        errorMessage = err.message;
      }
      
      // Zusätzliche Debug-Info für Entwicklung
      if (err.response?.data?.validationErrors) {
        errorMessage += '\nValidierung: ' + err.response.data.validationErrors.map(e => e.message).join(', ');
      }
      
      // Details für Entwicklung hinzufügen
      if (err.response?.data?.details) {
        errorMessage += '\nDetails: ' + err.response.data.details.join(', ');
      }
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  const unmetRequirements = Object.entries(requirementLabels)
    .filter(([key]) => !passwordValidation.requirements[key])
    .map(([key, label]) => ({ key, label }));

  if (success) {
    return (
      <Container maxWidth="sm" sx={{ mt: 8, mb: 4 }}>
        <Fade in={true}>
          <Paper elevation={6} sx={{ 
            p: 4, 
            borderRadius: 3, 
            textAlign: 'center',
            background: registrationData?.data?.emailVerified 
              ? 'linear-gradient(135deg, #e8f5e8 0%, #f1f9f1 100%)'
              : 'linear-gradient(135deg, #e3f2fd 0%, #f1f9ff 100%)',
            border: registrationData?.data?.emailVerified 
              ? '2px solid #4caf50'
              : '2px solid #2196f3'
          }}>
            <CheckCircleOutlined 
              sx={{ 
                fontSize: 72, 
                color: registrationData?.data?.emailVerified ? '#4caf50' : '#2196f3', 
                mb: 2 
              }} 
            />
            <Typography variant="h4" component="h1" gutterBottom 
              sx={{ 
                color: registrationData?.data?.emailVerified ? '#2e7d32' : '#1565c0',
                fontWeight: 'bold'
              }}
            >
              🎉 {registrationData?.data?.emailVerified 
                ? 'Willkommen bei Glücksmomente!' 
                : 'Registrierung erfolgreich!'}
            </Typography>
            
            {registrationData?.data?.emailVerified ? (
              <>
                <Typography variant="body1" sx={{ 
                  mb: 3, 
                  color: '#2e7d32',
                  fontSize: '1.1rem',
                  fontWeight: 500
                }}>
                  Herzlichen Dank für Ihre Registrierung! Wir freuen uns sehr, 
                  Sie als neuen Kunden begrüßen zu dürfen. Ihr Konto ist sofort 
                  aktiv und Sie können sich jetzt anmelden.
                </Typography>
                <Box sx={{ 
                  p: 3, 
                  bgcolor: '#f1f9f1', 
                  borderRadius: 2, 
                  mb: 3,
                  border: '1px solid #4caf50'
                }}>
                  <Typography variant="body1" sx={{ color: '#2e7d32', fontWeight: 'bold' }}>
                    ✨ Kundennummer: {registrationData?.data?.kundennummer}
                  </Typography>
                  <Typography variant="body2" sx={{ color: '#388e3c', mt: 1 }}>
                    💌 E-Mail: {registrationData?.data?.email}
                  </Typography>
                  <Typography variant="body2" sx={{ color: '#388e3c', mt: 1 }}>
                    🚀 Sie werden in wenigen Sekunden zur Anmeldung weitergeleitet...
                  </Typography>
                </Box>
              </>
            ) : (
              <>
                <Typography variant="body1" sx={{ 
                  mb: 3, 
                  color: '#1565c0',
                  fontSize: '1.1rem'
                }}>
                  Vielen Dank für Ihre Registrierung! Wir haben Ihnen eine E-Mail mit einem 
                  Bestätigungslink gesendet. Bitte überprüfen Sie Ihr Postfach und klicken 
                  Sie auf den Link, um Ihr Konto zu aktivieren.
                </Typography>
                <Box sx={{ 
                  p: 3, 
                  bgcolor: '#e3f2fd', 
                  borderRadius: 2, 
                  mb: 3,
                  border: '1px solid #2196f3'
                }}>
                  <Typography variant="body2" sx={{ color: '#1565c0', fontWeight: 'bold' }}>
                    💌 E-Mail-Adresse: {formData.email}
                  </Typography>
                  <Typography variant="body2" sx={{ color: '#1976d2', mt: 1 }}>
                    📧 Bitte überprüfen Sie auch Ihren Spam-Ordner
                  </Typography>
                </Box>
              </>
            )}
            
            <Button
              variant="contained"
              startIcon={<ArrowBackOutlined />}
              onClick={() => navigate('/login')}
              sx={{ 
                mr: 2,
                bgcolor: registrationData?.data?.emailVerified ? '#4caf50' : '#2196f3',
                '&:hover': {
                  bgcolor: registrationData?.data?.emailVerified ? '#388e3c' : '#1976d2'
                },
                fontSize: '1.1rem',
                px: 3,
                py: 1.5
              }}
            >
              Zur Anmeldung
            </Button>
            <Button
              variant="outlined"
              onClick={() => window.location.reload()}
              sx={{
                borderColor: registrationData?.data?.emailVerified ? '#4caf50' : '#2196f3',
                color: registrationData?.data?.emailVerified ? '#4caf50' : '#2196f3',
                '&:hover': {
                  borderColor: registrationData?.data?.emailVerified ? '#388e3c' : '#1976d2',
                  bgcolor: registrationData?.data?.emailVerified ? '#f1f9f1' : '#e3f2fd'
                }
              }}
            >
              Neue Registrierung
            </Button>
          </Paper>
        </Fade>
      </Container>
    );
  }

  const renderStepContent = (step) => {
    switch (step) {
      case 0:
        return (
          <Fade in={true} key="step0">
            <Box>
              <Typography variant="h6" gutterBottom color="primary">
                🔐 Zugangsdaten erstellen
              </Typography>
              <Alert severity="info" sx={{ mb: 2 }}>
                <Typography variant="body2">
                  <strong>Automatische Benutzername-Generierung:</strong><br />
                  Ihr Benutzername wird automatisch aus Ihrem Vor- und Nachnamen generiert (Schritt 2).
                  Dadurch können wir Sie eindeutig identifizieren und Ihnen den besten Service bieten.
                </Typography>
              </Alert>
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    name="email"
                    label="E-Mail-Adresse"
                    type="email"
                    value={formData.email}
                    onChange={handleChange}
                    required
                    disabled={loading}
                    error={!!emailError}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <EmailOutlined color="action" />
                        </InputAdornment>
                      ),
                      endAdornment: emailCheckLoading ? (
                        <InputAdornment position="end">
                          <CircularProgress size={20} />
                        </InputAdornment>
                      ) : null,
                    }}
                    helperText={
                      emailError || 
                      "Ihre E-Mail-Adresse für Login und Kommunikation"
                    }
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    name="password"
                    label="Passwort"
                    type={showPassword ? 'text' : 'password'}
                    value={formData.password}
                    onChange={handleChange}
                    required
                    disabled={loading}
                    error={formData.password && !passwordValidation.isValid}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <SecurityOutlined color="action" />
                        </InputAdornment>
                      ),
                      endAdornment: (
                        <InputAdornment position="end">
                          <IconButton
                            onClick={togglePasswordVisibility}
                            edge="end"
                            disabled={loading}
                          >
                            {showPassword ? <VisibilityOffOutlined /> : <VisibilityOutlined />}
                          </IconButton>
                        </InputAdornment>
                      ),
                    }}
                    helperText="Sichere Passwörter nach aktuellen Standards"
                  />
                  
                  {/* Passwort-Stärke-Anzeige */}
                  {formData.password && (
                    <Box sx={{ mt: 2, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
                      <Box display="flex" alignItems="center" gap={1} mb={1}>
                        <SecurityOutlined color={passwordValidation.strengthColor} />
                        <Typography variant="body2" fontWeight="bold">
                          Passwort-Stärke: 
                        </Typography>
                        <Chip 
                          label={passwordValidation.strengthText}
                          color={passwordValidation.strengthColor}
                          size="small"
                        />
                        <Typography variant="body2" color="text.secondary">
                          ({passwordValidation.score}/4)
                        </Typography>
                      </Box>
                      
                      <LinearProgress 
                        variant="determinate" 
                        value={(passwordValidation.score / 4) * 100}
                        color={passwordValidation.strengthColor}
                        sx={{ mb: 2, height: 6, borderRadius: 3 }}
                      />
                      
                      {/* Anforderungen-Checkliste: nur offene Punkte */}
                      {unmetRequirements.length > 0 ? (
                        <>
                          <Typography variant="body2" fontWeight="bold" gutterBottom color="error.main">
                            Bitte noch ergänzen:
                          </Typography>
                          <List dense sx={{ py: 0 }}>
                            {unmetRequirements.map((requirement) => (
                              <ListItem key={requirement.key} sx={{ py: 0.5 }}>
                                <ListItemIcon sx={{ minWidth: 36 }}>
                                  <CloseOutlined color="error" fontSize="small" />
                                </ListItemIcon>
                                <ListItemText primary={requirement.label} />
                              </ListItem>
                            ))}
                          </List>
                        </>
                      ) : (
                        <Alert severity="success" sx={{ mt: 1 }}>
                          Alle Sicherheitsanforderungen sind erfüllt.
                        </Alert>
                      )}
                      
                      {/* Feedback anzeigen */}
                      {!passwordValidation.isValid && passwordValidation.feedback.length > 0 && (
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
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    name="confirmPassword"
                    label="Passwort bestätigen"
                    type={showPassword ? 'text' : 'password'}
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    required
                    disabled={loading}
                    error={formData.password && formData.confirmPassword && formData.password !== formData.confirmPassword}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <LockOutlined color="action" />
                        </InputAdornment>
                      ),
                    }}
                    helperText={
                      formData.password && formData.confirmPassword && formData.password !== formData.confirmPassword 
                        ? "Passwörter stimmen nicht überein" 
                        : "Wiederholen Sie Ihr Passwort"
                    }
                  />
                </Grid>
              </Grid>
            </Box>
          </Fade>
        );

        case 1:
        return (
          <Fade in={true} key="step1">
            <Box>
              <Typography variant="h6" gutterBottom color="primary">
                👤 Persönliche Informationen
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    name="firstName"
                    label="Vorname *"
                    value={formData.firstName}
                    onChange={handleChange}
                    required
                    disabled={loading}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <PersonOutlined color="action" />
                        </InputAdornment>
                      ),
                    }}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    name="lastName"
                    label="Nachname *"
                    value={formData.lastName}
                    onChange={handleChange}
                    required
                    disabled={loading}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <PersonOutlined color="action" />
                        </InputAdornment>
                      ),
                    }}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth>
                    <InputLabel>Geschlecht (optional)</InputLabel>
                    <Select
                      name="geschlecht"
                      value={formData.geschlecht}
                      onChange={handleChange}
                      disabled={loading}
                      startAdornment={
                        <InputAdornment position="start">
                          <WcOutlined color="action" />
                        </InputAdornment>
                      }
                    >
                      <MenuItem value="">Keine Angabe</MenuItem>
                      <MenuItem value="weiblich">Weiblich</MenuItem>
                      <MenuItem value="männlich">Männlich</MenuItem>
                      <MenuItem value="divers">Divers</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    name="phone"
                    label="Telefonnummer (optional)"
                    value={formData.phone}
                    onChange={handleChange}
                    disabled={loading}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <PhoneOutlined color="action" />
                        </InputAdornment>
                      ),
                    }}
                    helperText="Für Rückfragen zu Bestellungen"
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    name="dateOfBirth"
                    label="Geburtsdatum (optional)"
                    type="date"
                    value={formData.dateOfBirth ? formData.dateOfBirth.toISOString().substr(0, 10) : ''}
                    onChange={handleDateChange}
                    disabled={loading}
                    InputLabelProps={{
                      shrink: true,
                    }}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <CakeOutlined color="action" />
                        </InputAdornment>
                      ),
                    }}
                    helperText="Für Geburtstagsüberraschungen und Rabatte"
                  />
                </Grid>
              </Grid>
            </Box>
          </Fade>
        );

      case 2:
        return (
          <Fade in={true} key="step2">
            <Box>
              <Typography variant="h6" gutterBottom color="primary">
                🏠 Rechnungsadresse *
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={8}>
                  <TextField
                    fullWidth
                    name="address.street"
                    label="Straße *"
                    value={formData.address.street}
                    onChange={handleChange}
                    required
                    disabled={loading}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <HomeOutlined color="action" />
                        </InputAdornment>
                      ),
                    }}
                  />
                </Grid>
                <Grid item xs={12} sm={4}>
                  <TextField
                    fullWidth
                    name="address.houseNumber"
                    label="Hausnummer *"
                    value={formData.address.houseNumber}
                    onChange={handleChange}
                    required
                    disabled={loading}
                  />
                </Grid>
                <Grid item xs={12} sm={4}>
                  <TextField
                    fullWidth
                    name="address.zipCode"
                    label="PLZ *"
                    value={formData.address.zipCode}
                    onChange={handleChange}
                    required
                    disabled={loading}
                  />
                </Grid>
                <Grid item xs={12} sm={8}>
                  <TextField
                    fullWidth
                    name="address.city"
                    label="Stadt *"
                    value={formData.address.city}
                    onChange={handleChange}
                    required
                    disabled={loading}
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    name="address.country"
                    label="Land *"
                    value={formData.address.country}
                    onChange={handleChange}
                    required
                    disabled={loading}
                  />
                </Grid>
              </Grid>
            </Box>
          </Fade>
        );

      case 3:
        return (
          <Fade in={true} key="step3">
            <Box>
              <Typography variant="h6" gutterBottom color="primary">
                📦 Lieferung & Kommunikation
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                Diese Angaben sind optional, helfen uns aber dabei, Ihnen den bestmöglichen Service zu bieten.
              </Typography>
              
              {/* Abweichende Lieferadresse */}
              <FormControlLabel
                control={
                  <Checkbox
                    name="lieferadresse.abweichend"
                    checked={formData.lieferadresse.abweichend}
                    onChange={handleChange}
                    disabled={loading}
                  />
                }
                label="Abweichende Lieferadresse"
                sx={{ mb: 2 }}
              />
              
              {formData.lieferadresse.abweichend && (
                <Box sx={{ mb: 3, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
                  <Typography variant="subtitle2" gutterBottom>
                    📦 Lieferadresse
                  </Typography>
                  <Grid container spacing={2}>
                    <Grid item xs={12} sm={8}>
                      <TextField
                        fullWidth
                        name="lieferadresse.street"
                        label="Straße"
                        value={formData.lieferadresse.street}
                        onChange={handleChange}
                        disabled={loading}
                        size="small"
                      />
                    </Grid>
                    <Grid item xs={12} sm={4}>
                      <TextField
                        fullWidth
                        name="lieferadresse.houseNumber"
                        label="Hausnummer"
                        value={formData.lieferadresse.houseNumber}
                        onChange={handleChange}
                        disabled={loading}
                        size="small"
                      />
                    </Grid>
                    <Grid item xs={12} sm={4}>
                      <TextField
                        fullWidth
                        name="lieferadresse.zipCode"
                        label="PLZ"
                        value={formData.lieferadresse.zipCode}
                        onChange={handleChange}
                        disabled={loading}
                        size="small"
                      />
                    </Grid>
                    <Grid item xs={12} sm={8}>
                      <TextField
                        fullWidth
                        name="lieferadresse.city"
                        label="Stadt"
                        value={formData.lieferadresse.city}
                        onChange={handleChange}
                        disabled={loading}
                        size="small"
                      />
                    </Grid>
                  </Grid>
                </Box>
              )}

              {/* Kommunikationspräferenzen */}
              <Box sx={{ mt: 3 }}>
                <Typography variant="subtitle2" gutterBottom>
                  💌 Kommunikationspräferenzen
                </Typography>
                <FormGroup>
                  <FormControlLabel
                    control={
                      <Checkbox
                        name="kommunikation.newsletter"
                        checked={formData.kommunikation.newsletter}
                        onChange={handleChange}
                        disabled={loading}
                      />
                    }
                    label="Newsletter mit Neuigkeiten und Tipps erhalten"
                  />
                  <FormControlLabel
                    control={
                      <Checkbox
                        name="kommunikation.produktupdates"
                        checked={formData.kommunikation.produktupdates}
                        onChange={handleChange}
                        disabled={loading}
                      />
                    }
                    label="Informationen über neue Produkte erhalten"
                  />
                  <FormControlLabel
                    control={
                      <Checkbox
                        name="kommunikation.angebote"
                        checked={formData.kommunikation.angebote}
                        onChange={handleChange}
                        disabled={loading}
                      />
                    }
                    label="Exklusive Angebote und Rabatte erhalten"
                  />
                </FormGroup>
                
                <FormControl sx={{ mt: 2, minWidth: 200 }}>
                  <InputLabel>E-Mail-Häufigkeit</InputLabel>
                  <Select
                    name="kommunikation.emailFrequenz"
                    value={formData.kommunikation.emailFrequenz}
                    onChange={handleChange}
                    disabled={loading}
                    label="E-Mail-Häufigkeit"
                  >
                    <MenuItem value="täglich">Täglich</MenuItem>
                    <MenuItem value="wöchentlich">Wöchentlich</MenuItem>
                    <MenuItem value="monatlich">Monatlich</MenuItem>
                    <MenuItem value="nur-wichtiges">Nur wichtige Updates</MenuItem>
                  </Select>
                </FormControl>
              </Box>
            </Box>
          </Fade>
        );

      default:
        return 'Unbekannter Schritt';
    }
  };

  return (
    <Container maxWidth="md" sx={{ mt: 4, mb: 4 }}>
      <Paper elevation={6} sx={{ p: 4, borderRadius: 3 }}>
        <Box display="flex" flexDirection="column" alignItems="center" mb={4}>
          <PersonAddOutlined 
            sx={{ 
              fontSize: 48, 
              color: 'primary.main', 
              mb: 2 
            }} 
          />
          <Typography variant="h4" component="h1" gutterBottom>
            Registrierung
          </Typography>
          <Typography variant="body2" color="text.secondary" textAlign="center">
            Werden Sie Teil der Glücksmomente Familie
          </Typography>
        </Box>

        <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
          {steps.map((label) => (
            <Step key={label}>
              <StepLabel>{label}</StepLabel>
            </Step>
          ))}
        </Stepper>

        <Collapse in={!!error}>
          <Alert 
            severity="error" 
            sx={{ mb: 3 }}
            onClose={() => setError('')}
          >
            {error}
          </Alert>
        </Collapse>

        <Box component="form" onSubmit={handleSubmit}>
          {renderStepContent(activeStep)}

          <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 4 }}>
            <Button
              onClick={handleBack}
              disabled={activeStep === 0 || loading}
              startIcon={<ArrowBackOutlined />}
            >
              Zurück
            </Button>

            <Box>
              {activeStep === steps.length - 1 ? (
                <Button
                  type="submit"
                  variant="contained"
                  size="large"
                  disabled={loading}
                  startIcon={loading ? <CircularProgress size={20} /> : <PersonAddOutlined />}
                  sx={{ px: 4 }}
                >
                  {loading ? 'Registriere...' : 'Registrieren'}
                </Button>
              ) : (
                <Button
                  onClick={handleNext}
                  variant="contained"
                  disabled={loading}
                >
                  Weiter
                </Button>
              )}
            </Box>
          </Box>
        </Box>

        <Divider sx={{ my: 3 }} />

        <Box textAlign="center">
          <Typography variant="body2" color="text.secondary">
            Bereits ein Konto? {' '}
            <Link 
              to="/login" 
              style={{ 
                color: 'inherit', 
                textDecoration: 'none',
                fontWeight: 'bold'
              }}
            >
              Jetzt anmelden
            </Link>
          </Typography>
        </Box>
      </Paper>
    </Container>
  );
};

export default RegisterPage;