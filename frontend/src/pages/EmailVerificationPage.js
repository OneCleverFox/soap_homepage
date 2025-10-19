import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  Container,
  Paper,
  Typography,
  Box,
  CircularProgress,
  Button,
  Fade
} from '@mui/material';
import {
  CheckCircleOutlined,
  ErrorOutlined,
  EmailOutlined,
  LoginOutlined,
  RefreshOutlined
} from '@mui/icons-material';
import { authAPI } from '../services/api';

const EmailVerificationPage = () => {
  const { token } = useParams();
  const navigate = useNavigate();
  
  const [status, setStatus] = useState('verifying'); // 'verifying', 'success', 'error', 'expired'
  const [message, setMessage] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [resendLoading, setResendLoading] = useState(false);

  const verifyEmail = useCallback(async () => {
    try {
      console.log('🔍 E-Mail-Verifizierung gestartet für Token:', token);
      
      const response = await authAPI.verifyEmail(token);
      
      if (response.data.success) {
        console.log('✅ E-Mail erfolgreich verifiziert');
        setStatus('success');
        setMessage('Ihr Konto wurde erfolgreich aktiviert!');
        setUserEmail(response.data.user?.email || '');
      } else {
        throw new Error(response.data.message || 'Verifizierung fehlgeschlagen');
      }
      
    } catch (err) {
      console.error('❌ Verifizierungs-Fehler:', err);
      
      const errorMessage = err.response?.data?.message || err.message;
      
      if (errorMessage.includes('expired') || errorMessage.includes('abgelaufen')) {
        setStatus('expired');
        setMessage('Der Verifizierungslink ist abgelaufen.');
        setUserEmail(err.response?.data?.email || '');
      } else {
        setStatus('error');
        setMessage(errorMessage);
      }
    }
  }, [token]);

  useEffect(() => {
    if (token) {
      verifyEmail();
    } else {
      setStatus('error');
      setMessage('Ungültiger Verifizierungslink');
    }
  }, [token, verifyEmail]);

  const handleResendVerification = async () => {
    if (!userEmail) {
      setMessage('E-Mail-Adresse nicht verfügbar');
      return;
    }

    setResendLoading(true);
    
    try {
      console.log('📧 Neue Verifizierungs-E-Mail angefordert für:', userEmail);
      
      const response = await authAPI.resendVerification(userEmail);
      
      if (response.data.success) {
        console.log('✅ Neue Verifizierungs-E-Mail gesendet');
        setMessage('Eine neue Verifizierungs-E-Mail wurde gesendet!');
        setStatus('success');
      } else {
        throw new Error(response.data.message || 'Fehler beim Versenden der E-Mail');
      }
      
    } catch (err) {
      console.error('❌ Fehler beim Versenden der Verifizierungs-E-Mail:', err);
      setMessage(err.response?.data?.message || err.message);
    } finally {
      setResendLoading(false);
    }
  };

  const renderContent = () => {
    switch (status) {
      case 'verifying':
        return (
          <Fade in={true}>
            <Box textAlign="center">
              <CircularProgress size={64} sx={{ mb: 3, color: 'primary.main' }} />
              <Typography variant="h5" gutterBottom>
                🔍 E-Mail wird verifiziert...
              </Typography>
              <Typography variant="body1" color="text.secondary">
                Bitte warten Sie einen Moment, während wir Ihre E-Mail-Adresse bestätigen.
              </Typography>
            </Box>
          </Fade>
        );

      case 'success':
        return (
          <Fade in={true}>
            <Box textAlign="center">
              <CheckCircleOutlined 
                sx={{ 
                  fontSize: 72, 
                  color: 'success.main', 
                  mb: 3 
                }} 
              />
              <Typography variant="h4" gutterBottom color="success.main">
                🎉 Verifizierung erfolgreich!
              </Typography>
              <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
                {message}
              </Typography>
              {userEmail && (
                <Box sx={{ 
                  p: 2, 
                  bgcolor: 'success.light', 
                  borderRadius: 2, 
                  mb: 3,
                  border: '1px solid',
                  borderColor: 'success.main'
                }}>
                  <Typography variant="body2" color="success.main">
                    📧 <strong>Verifizierte E-Mail:</strong> {userEmail}
                  </Typography>
                </Box>
              )}
              <Typography variant="body2" color="text.secondary" sx={{ mb: 4 }}>
                Sie können sich jetzt mit Ihren Zugangsdaten anmelden und alle Funktionen nutzen.
              </Typography>
              <Button
                variant="contained"
                size="large"
                startIcon={<LoginOutlined />}
                onClick={() => navigate('/login')}
                sx={{ px: 4 }}
              >
                Jetzt anmelden
              </Button>
            </Box>
          </Fade>
        );

      case 'expired':
        return (
          <Fade in={true}>
            <Box textAlign="center">
              <EmailOutlined 
                sx={{ 
                  fontSize: 72, 
                  color: 'warning.main', 
                  mb: 3 
                }} 
              />
              <Typography variant="h5" gutterBottom color="warning.main">
                ⏰ Link abgelaufen
              </Typography>
              <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
                {message}
              </Typography>
              {userEmail && (
                <Box sx={{ 
                  p: 2, 
                  bgcolor: 'warning.light', 
                  borderRadius: 2, 
                  mb: 3,
                  border: '1px solid',
                  borderColor: 'warning.main'
                }}>
                  <Typography variant="body2" color="warning.main">
                    📧 <strong>E-Mail-Adresse:</strong> {userEmail}
                  </Typography>
                </Box>
              )}
              <Typography variant="body2" color="text.secondary" sx={{ mb: 4 }}>
                Kein Problem! Wir können Ihnen einen neuen Verifizierungslink senden.
              </Typography>
              <Button
                variant="contained"
                size="large"
                startIcon={resendLoading ? <CircularProgress size={20} /> : <RefreshOutlined />}
                onClick={handleResendVerification}
                disabled={resendLoading || !userEmail}
                sx={{ px: 4, mr: 2 }}
              >
                {resendLoading ? 'Wird gesendet...' : 'Neuen Link senden'}
              </Button>
              <Button
                variant="outlined"
                size="large"
                component={Link}
                to="/register"
              >
                Neue Registrierung
              </Button>
            </Box>
          </Fade>
        );

      case 'error':
      default:
        return (
          <Fade in={true}>
            <Box textAlign="center">
              <ErrorOutlined 
                sx={{ 
                  fontSize: 72, 
                  color: 'error.main', 
                  mb: 3 
                }} 
              />
              <Typography variant="h5" gutterBottom color="error.main">
                ❌ Verifizierung fehlgeschlagen
              </Typography>
              <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
                {message}
              </Typography>
              <Button
                variant="contained"
                size="large"
                component={Link}
                to="/register"
                sx={{ px: 4, mr: 2 }}
              >
                Neue Registrierung
              </Button>
              <Button
                variant="outlined"
                size="large"
                component={Link}
                to="/login"
              >
                Zur Anmeldung
              </Button>
            </Box>
          </Fade>
        );
    }
  };

  return (
    <Container maxWidth="sm" sx={{ mt: 8, mb: 4 }}>
      <Paper elevation={6} sx={{ p: 4, borderRadius: 3 }}>
        {renderContent()}
        
        {status !== 'verifying' && (
          <Box textAlign="center" sx={{ mt: 4, pt: 3, borderTop: '1px solid', borderColor: 'divider' }}>
            <Typography variant="body2" color="text.secondary">
              Haben Sie Fragen? {' '}
              <Link 
                to="/contact" 
                style={{ 
                  color: 'inherit', 
                  textDecoration: 'none',
                  fontWeight: 'bold'
                }}
              >
                Kontaktieren Sie uns
              </Link>
            </Typography>
          </Box>
        )}
      </Paper>
    </Container>
  );
};

export default EmailVerificationPage;