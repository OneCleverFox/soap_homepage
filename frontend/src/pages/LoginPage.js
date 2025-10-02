import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
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
  useTheme,
  useMediaQuery
} from '@mui/material';
import {
  EmailOutlined,
  LockOutlined,
  VisibilityOutlined,
  VisibilityOffOutlined,
  LoginOutlined
} from '@mui/icons-material';
import { Helmet } from 'react-helmet-async';

const LoginPage = () => {
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
    setError(''); // Fehler zurücksetzen bei Eingabe
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const { email, password } = formData;

      console.log('🔐 Login-Versuch für:', email);

      // Prüfen ob es sich um Admin-Anmeldedaten handelt (case-insensitive)
      if (email.toLowerCase() === 'ralle.jacob84@googlemail.com') {
        console.log('✅ Admin-E-Mail erkannt, sende Anfrage an Backend...');
        
        // Admin-Login-Versuch
        const response = await fetch('http://localhost:5000/api/auth/login', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ email, password }),
        });

        console.log('📡 Backend-Response Status:', response.status);
        
        if (response.ok) {
          const data = await response.json();
          console.log('📨 Backend-Response:', data);

          if (data.success) {
            // Admin-Token speichern
            localStorage.setItem('adminToken', data.token);
            localStorage.setItem('adminUser', JSON.stringify(data.user));
            
            console.log('✅ Admin-Login erfolgreich - Weiterleitung zu Admin-Panel');
            console.log('🎯 Navigiere zu /admin...');
            
            // Sofortige Navigation ohne Verzögerung
            navigate('/admin', { replace: true });
            
            // Fallback: Manuelle Navigation falls React Router versagt
            setTimeout(() => {
              console.log('🔄 Fallback: Erzwinge Seitennavigation...');
              window.location.href = '/admin';
            }, 1000);
            return;
          } else {
            setError(data.message || 'Ungültige Admin-Anmeldedaten');
          }
        } else {
          const errorData = await response.json().catch(() => ({}));
          console.error('❌ Backend-Fehler:', response.status, errorData);
          setError(errorData.message || 'Server-Fehler beim Anmelden');
        }
      } else {
        // Normale Benutzer-Anmeldung (falls später implementiert)
        console.log('❌ Unbekannte E-Mail-Adresse:', email);
        setError('Diese E-Mail-Adresse ist nicht registriert');
      }
    } catch (error) {
      console.error('❌ Login-Fehler:', error);
      setError('Verbindungsfehler. Bitte versuchen Sie es später erneut.');
    } finally {
      setLoading(false);
    }
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  return (
    <Container maxWidth="sm" sx={{ mt: 8, mb: 4 }}>
      <Paper elevation={6} sx={{ p: 4, borderRadius: 3 }}>
        <Box display="flex" flexDirection="column" alignItems="center" mb={3}>
          <LoginOutlined 
            sx={{ 
              fontSize: 48, 
              color: 'primary.main', 
              mb: 2 
            }} 
          />
          <Typography variant="h4" component="h1" gutterBottom>
            Anmelden
          </Typography>
          <Typography variant="body2" color="text.secondary" textAlign="center">
            Geben Sie Ihre Anmeldedaten ein
          </Typography>
        </Box>

        {error && (
          <Alert 
            severity="error" 
            sx={{ mb: 3 }}
            onClose={() => setError('')}
          >
            {error}
          </Alert>
        )}

        <Box component="form" onSubmit={handleSubmit}>
          <TextField
            fullWidth
            name="email"
            label="E-Mail-Adresse"
            type="email"
            value={formData.email}
            onChange={handleChange}
            margin="normal"
            required
            disabled={loading}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <EmailOutlined color="action" />
                </InputAdornment>
              ),
            }}
          />

          <TextField
            fullWidth
            name="password"
            label="Passwort"
            type={showPassword ? 'text' : 'password'}
            value={formData.password}
            onChange={handleChange}
            margin="normal"
            required
            disabled={loading}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <LockOutlined color="action" />
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
          />

          <Button
            type="submit"
            fullWidth
            variant="contained"
            size="large"
            disabled={loading}
            sx={{ 
              mt: 3, 
              mb: 2, 
              py: 1.5,
              fontSize: '1.1rem'
            }}
          >
            {loading ? (
              <>
                <CircularProgress size={20} sx={{ mr: 1 }} />
                Anmelden...
              </>
            ) : (
              'Anmelden'
            )}
          </Button>
        </Box>

        <Box textAlign="center" mt={2}>
          <Typography variant="body2" color="text.secondary">
            Probleme beim Anmelden? Kontaktieren Sie den Support.
          </Typography>
        </Box>
      </Paper>
    </Container>
  );
};

export default LoginPage;