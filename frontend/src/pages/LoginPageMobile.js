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
  Visibility,
  VisibilityOff,
  Login
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

      // Admin-Login über Backend-API
      console.log('✅ Sende Anfrage an Backend...');
      
      const response = await fetch('http://localhost:5000/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      console.log('📡 Backend-Response Status:', response.status);

      const data = await response.json();
      console.log('📨 Backend-Response:', data);

      if (response.ok) {
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
          setError(data.message || 'Ungültige Anmeldedaten');
        }
      } else {
        setError(data.message || 'Fehler beim Login');
      }
    } catch (err) {
      console.error('❌ Login-Fehler:', err);
      setError('Netzwerkfehler. Bitte versuchen Sie es erneut.');
    } finally {
      setLoading(false);
    }
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  return (
    <>
      <Helmet>
        <title>Anmelden - Gluecksmomente</title>
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      </Helmet>
      
      <Container 
        component="main" 
        maxWidth="xs"
        sx={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          py: { xs: 2, sm: 4 },
          px: { xs: 2, sm: 3 }
        }}
      >
        <Paper 
          elevation={isMobile ? 1 : 6} 
          sx={{ 
            p: { xs: 3, sm: 4 }, 
            borderRadius: 3,
            width: '100%',
            maxWidth: { xs: '100%', sm: 400 }
          }}
        >
          <Box display="flex" flexDirection="column" alignItems="center" mb={3}>
            <Login 
              sx={{ 
                fontSize: { xs: 40, sm: 48 }, 
                color: 'primary.main', 
                mb: 2 
              }} 
            />
            <Typography 
              variant={isMobile ? "h5" : "h4"} 
              component="h1" 
              gutterBottom
              textAlign="center"
              sx={{ fontWeight: 'bold' }}
            >
              Anmelden
            </Typography>
            <Typography 
              variant="body2" 
              color="text.secondary" 
              textAlign="center"
              sx={{ fontSize: { xs: '0.875rem', sm: '1rem' } }}
            >
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
              autoComplete="email"
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <EmailOutlined color="action" />
                  </InputAdornment>
                ),
              }}
              sx={{
                '& .MuiInputBase-root': {
                  fontSize: { xs: '16px', sm: '1rem' } // iOS Zoom verhindern
                },
                '& .MuiInputLabel-root': {
                  fontSize: { xs: '1rem', sm: '1rem' }
                }
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
              autoComplete="current-password"
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
                      size={isMobile ? "small" : "medium"}
                    >
                      {showPassword ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
              sx={{
                '& .MuiInputBase-root': {
                  fontSize: { xs: '16px', sm: '1rem' } // iOS Zoom verhindern
                },
                '& .MuiInputLabel-root': {
                  fontSize: { xs: '1rem', sm: '1rem' }
                }
              }}
            />

            <Button
              type="submit"
              fullWidth
              variant="contained"
              disabled={loading}
              sx={{ 
                mt: 3, 
                mb: 2,
                py: { xs: 1.5, sm: 1.5 },
                fontSize: { xs: '1rem', sm: '1.1rem' },
                fontWeight: 'bold',
                borderRadius: 2
              }}
              startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <Login />}
            >
              {loading ? 'Anmelden...' : 'Anmelden'}
            </Button>

            <Box textAlign="center" mt={2}>
              <Typography 
                variant="body2" 
                color="text.secondary"
                sx={{ fontSize: { xs: '0.8rem', sm: '0.875rem' } }}
              >
                Bei Problemen wenden Sie sich an den Support
              </Typography>
            </Box>
          </Box>
        </Paper>
      </Container>
    </>
  );
};

export default LoginPage;