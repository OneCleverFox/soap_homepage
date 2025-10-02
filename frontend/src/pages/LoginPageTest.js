import React, { useState } from 'react';
import {
  Container,
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  Box,
  Alert,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import { useNavigate } from 'react-router-dom';

const LoginPageTest = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    // Spezieller Admin-Check
    if (email === 'Ralle.jacob84@googlemail.com' && password === 'Ralle1984') {
      localStorage.setItem('userToken', 'admin-token');
      localStorage.setItem('userRole', 'admin');
      setSuccess('Erfolgreich als Admin angemeldet!');
      setTimeout(() => {
        navigate('/admin');
      }, 1000);
      return;
    }

    // Normale Benutzer-Anmeldung
    try {
      const response = await fetch('http://localhost:5000/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (response.ok) {
        localStorage.setItem('userToken', data.token);
        localStorage.setItem('userRole', 'user');
        setSuccess('Erfolgreich angemeldet!');
        setTimeout(() => {
          navigate('/');
        }, 1000);
      } else {
        setError(data.message || 'Anmeldung fehlgeschlagen');
      }
    } catch (err) {
      setError('Fehler bei der Anmeldung. Bitte versuchen Sie es später erneut.');
    }
  };

  return (
    <Container 
      maxWidth="sm" 
      sx={{ 
        py: 4,
        px: isMobile ? 2 : 3,
        minHeight: '80vh',
        display: 'flex',
        alignItems: 'center',
      }}
    >
      <Card 
        sx={{ 
          width: '100%',
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          borderRadius: 4,
          boxShadow: isMobile ? 
            '0 8px 32px rgba(0,0,0,0.12)' : 
            '0 20px 60px rgba(0,0,0,0.15)',
        }}
      >
        <CardContent sx={{ p: isMobile ? 3 : 4 }}>
          <Typography 
            variant={isMobile ? "h4" : "h3"} 
            component="h1" 
            gutterBottom
            sx={{
              color: 'white',
              fontWeight: 'bold',
              textAlign: 'center',
              mb: 4,
            }}
          >
            Anmelden
          </Typography>
          
          <Box 
            component="form" 
            onSubmit={handleLogin}
            sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}
          >
            <TextField
              fullWidth
              label="E-Mail"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              variant="outlined"
              size={isMobile ? "medium" : "large"}
              sx={{
                '& .MuiOutlinedInput-root': {
                  backgroundColor: 'rgba(255,255,255,0.9)',
                  borderRadius: 2,
                  '&:hover': {
                    backgroundColor: 'rgba(255,255,255,1)',
                  },
                  '&.Mui-focused': {
                    backgroundColor: 'rgba(255,255,255,1)',
                  },
                },
                '& .MuiInputLabel-root': {
                  fontWeight: 'bold',
                },
              }}
            />
            
            <TextField
              fullWidth
              label="Passwort"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              variant="outlined"
              size={isMobile ? "medium" : "large"}
              sx={{
                '& .MuiOutlinedInput-root': {
                  backgroundColor: 'rgba(255,255,255,0.9)',
                  borderRadius: 2,
                  '&:hover': {
                    backgroundColor: 'rgba(255,255,255,1)',
                  },
                  '&.Mui-focused': {
                    backgroundColor: 'rgba(255,255,255,1)',
                  },
                },
                '& .MuiInputLabel-root': {
                  fontWeight: 'bold',
                },
              }}
            />
            
            {error && (
              <Alert 
                severity="error" 
                sx={{ 
                  borderRadius: 2,
                  fontSize: isMobile ? '0.875rem' : '1rem',
                }}
              >
                {error}
              </Alert>
            )}
            
            {success && (
              <Alert 
                severity="success" 
                sx={{ 
                  borderRadius: 2,
                  fontSize: isMobile ? '0.875rem' : '1rem',
                }}
              >
                {success}
              </Alert>
            )}
            
            <Button
              type="submit"
              variant="contained"
              size={isMobile ? "large" : "large"}
              fullWidth
              sx={{
                py: isMobile ? 1.5 : 2,
                fontSize: isMobile ? '1rem' : '1.125rem',
                fontWeight: 'bold',
                borderRadius: 2,
                backgroundColor: 'rgba(255,255,255,0.9)',
                color: '#667eea',
                boxShadow: '0 4px 15px rgba(0,0,0,0.2)',
                '&:hover': {
                  backgroundColor: 'rgba(255,255,255,1)',
                  boxShadow: '0 6px 20px rgba(0,0,0,0.3)',
                  transform: 'translateY(-2px)',
                },
                transition: 'all 0.3s ease',
              }}
            >
              Anmelden
            </Button>
          </Box>
          
          <Typography 
            variant="body2" 
            sx={{ 
              color: 'rgba(255,255,255,0.8)', 
              textAlign: 'center', 
              mt: 3,
              fontSize: isMobile ? '0.75rem' : '0.875rem',
            }}
          >
            Admin-Zugang nur für autorisierte Benutzer
          </Typography>
        </CardContent>
      </Card>
    </Container>
  );
};

export default LoginPageTest;