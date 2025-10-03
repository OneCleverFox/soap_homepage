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
  IconButton
} from '@mui/material';
import {
  EmailOutlined,
  LockOutlined,
  VisibilityOutlined,
  VisibilityOffOutlined,
  LoginOutlined
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';

const LoginPage = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e) => {
    const newFormData = {
      ...formData,
      [e.target.name]: e.target.value
    };
    
    setFormData(newFormData);
    setError(''); // Fehler zurücksetzen bei Eingabe
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      console.log('🔐 Login-Versuch:', formData.email);

      const result = await login(formData.email, formData.password);

      if (result.success) {
        console.log('✅ Login erfolgreich:', result.user);
        
        // Unterschiedliche Weiterleitung basierend auf Benutzerrolle
        if (result.user.role === 'admin') {
          console.log('👑 Admin-Login erkannt - Weiterleitung zum Dashboard');
          navigate('/admin/dashboard');
        } else {
          console.log('� Kunden-Login - Weiterleitung zur Startseite');
          navigate('/');
        }
        
      } else {
        throw new Error(result.error || 'Login fehlgeschlagen');
      }

    } catch (err) {
      console.error('❌ Login-Fehler:', err);
      setError(err.message);
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
            Willkommen zurück bei Glücksmomente
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
            Verwalten Sie Ihre Bestellungen und erhalten Sie exklusive Angebote.
          </Typography>
        </Box>

        {/* Verstecktes Dev-Panel für Admin-Zugang */}
        {process.env.NODE_ENV === 'development' && (
          <Box sx={{ mt: 3, p: 2, bgcolor: 'grey.50', borderRadius: 1, border: '1px dashed #ccc' }}>
            <Typography variant="caption" display="block" gutterBottom color="text.secondary">
              🛠️ <strong>Entwicklungs-Hinweis:</strong>
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Admin-Email eingeben aktiviert automatische Passwort-Vervollständigung
            </Typography>
          </Box>
        )}
      </Paper>
    </Container>
  );
};

export default LoginPage;