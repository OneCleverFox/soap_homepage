import React from 'react';
import { 
  Container, 
  Typography, 
  Box, 
  Grid, 
  Card, 
  CardContent, 
  Divider,
  Alert,
  Skeleton,
  useTheme,
  useMediaQuery
} from '@mui/material';
import { Helmet } from 'react-helmet-async';
import { useCompany } from '../contexts/CompanyContext';

const ContactPage = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  
  const { 
    companyData: companyInfo, 
    loading, 
    error,
    name,
    address,
    contact,
    vatId,
    ceo,
    legalForm,
    fullAddress,
    phone,
    email,
    website
  } = useCompany();

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ py: isMobile ? 3 : 6 }}>
        <Skeleton variant="text" height={60} width="300px" sx={{ mb: 3 }} />
        <Grid container spacing={isMobile ? 2 : 4}>
          <Grid item xs={12} md={6}>
            <Skeleton variant="rectangular" height={200} />
          </Grid>
          <Grid item xs={12} md={6}>
            <Skeleton variant="rectangular" height={200} />
          </Grid>
        </Grid>
      </Container>
    );
  }

  if (error) {
    return (
      <Container maxWidth="lg" sx={{ py: isMobile ? 3 : 6 }}>
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      </Container>
    );
  }

  return (
    <>
      <Helmet>
        <title>Kontakt - Glücksmomente-Manufaktur</title>
        <meta name="description" content="Kontaktinformationen der Glücksmomente-Manufaktur. Erreichen Sie uns für Fragen zu unseren handgemachten Naturkosmetik-Produkten." />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      </Helmet>
      
      <Container maxWidth="lg" sx={{ py: isMobile ? 3 : 6 }}>
        {/* Header */}
        <Box textAlign="center" mb={isMobile ? 4 : 6}>
          <Typography 
            variant={isMobile ? "h4" : "h2"} 
            component="h1" 
            gutterBottom
            sx={{ 
              fontWeight: 'bold',
              background: 'linear-gradient(45deg, #8B4B61, #B17A89)',
              WebkitBackgroundClip: 'text',
              backgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              mb: 2
            }}
          >
            Kontakt
          </Typography>
          <Typography 
            variant={isMobile ? "body1" : "h6"} 
            color="text.secondary"
            sx={{ maxWidth: 600, mx: 'auto' }}
          >
            Haben Sie Fragen zu unseren handgemachten Naturprodukten? 
            Wir freuen uns auf Ihre Nachricht!
          </Typography>
        </Box>

        {companyInfo && (
          <Grid container spacing={isMobile ? 3 : 4}>
            {/* Kontaktinformationen */}
            <Grid item xs={12} md={6}>
              <Card 
                sx={{ 
                  height: '100%',
                  boxShadow: isMobile ? 2 : 3,
                  '&:hover': {
                    boxShadow: isMobile ? 3 : 6,
                    transform: 'translateY(-2px)',
                    transition: 'all 0.3s ease'
                  }
                }}
              >
                <CardContent sx={{ p: isMobile ? 3 : 4 }}>
                  <Box display="flex" alignItems="center" mb={3}>
                    <span style={{ fontSize: isMobile ? 32 : 40, marginRight: 16 }}>📞</span>
                    <Typography variant={isMobile ? "h5" : "h4"} component="h2" color="primary">
                      Kontakt
                    </Typography>
                  </Box>
                  
                  <Box mb={3}>
                    <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                      {companyInfo.name}
                    </Typography>
                    <Typography variant="body1" color="text.secondary" paragraph>
                      Ihre Manufaktur für handgemachte Naturkosmetik und Seifen
                    </Typography>
                  </Box>

                  <Divider sx={{ my: 2 }} />

                  {/* Telefon */}
                  {phone && (
                    <Box display="flex" alignItems="center" mb={2}>
                      <span style={{ fontSize: 20, marginRight: 12, width: 24 }}>📱</span>
                      <Box>
                        <Typography variant="body2" color="text.secondary">
                          Telefon
                        </Typography>
                        <Typography variant="body1" fontWeight="500">
                          <a 
                            href={`tel:${phone}`}
                            style={{ 
                              color: 'inherit', 
                              textDecoration: 'none',
                              '&:hover': { textDecoration: 'underline' }
                            }}
                          >
                            {phone}
                          </a>
                        </Typography>
                      </Box>
                    </Box>
                  )}

                  {/* E-Mail */}
                  {email && (
                    <Box display="flex" alignItems="center" mb={2}>
                      <span style={{ fontSize: 20, marginRight: 12, width: 24 }}>✉️</span>
                      <Box>
                        <Typography variant="body2" color="text.secondary">
                          E-Mail
                        </Typography>
                        <Typography variant="body1" fontWeight="500">
                          <a 
                            href={`mailto:${email}`}
                            style={{ 
                              color: theme.palette.primary.main, 
                              textDecoration: 'none',
                              '&:hover': { textDecoration: 'underline' }
                            }}
                          >
                            {email}
                          </a>
                        </Typography>
                      </Box>
                    </Box>
                  )}

                  {/* Website */}
                  {website && (
                    <Box display="flex" alignItems="center" mb={2}>
                      <span style={{ fontSize: 20, marginRight: 12, width: 24 }}>🌐</span>
                      <Box>
                        <Typography variant="body2" color="text.secondary">
                          Website
                        </Typography>
                        <Typography variant="body1" fontWeight="500">
                          <a 
                            href={`https://${website}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{ 
                              color: theme.palette.primary.main, 
                              textDecoration: 'none',
                              '&:hover': { textDecoration: 'underline' }
                            }}
                          >
                            {website}
                          </a>
                        </Typography>
                      </Box>
                    </Box>
                  )}
                </CardContent>
              </Card>
            </Grid>

            {/* Adresse */}
            <Grid item xs={12} md={6}>
              <Card 
                sx={{ 
                  height: '100%',
                  boxShadow: isMobile ? 2 : 3,
                  '&:hover': {
                    boxShadow: isMobile ? 3 : 6,
                    transform: 'translateY(-2px)',
                    transition: 'all 0.3s ease'
                  }
                }}
              >
                <CardContent sx={{ p: isMobile ? 3 : 4 }}>
                  <Box display="flex" alignItems="center" mb={3}>
                    <span style={{ fontSize: isMobile ? 32 : 40, marginRight: 16 }}>📍</span>
                    <Typography variant={isMobile ? "h5" : "h4"} component="h2" color="primary">
                      Adresse
                    </Typography>
                  </Box>
                  
                  <Box mb={3}>
                    <Typography variant="body1" fontWeight="500" gutterBottom>
                      {companyInfo.name}
                    </Typography>
                    <Typography variant="body1" color="text.primary">
                      {companyInfo.address.street}
                    </Typography>
                    <Typography variant="body1" color="text.primary" mb={2}>
                      {companyInfo.address.postalCode} {companyInfo.address.city}
                    </Typography>
                    <Typography variant="body1" color="text.primary">
                      {companyInfo.address.country}
                    </Typography>
                  </Box>

                  <Divider sx={{ my: 2 }} />

                  {/* Geschäftsführung */}
                  {companyInfo.ceo && (
                    <Box mb={2}>
                      <Typography variant="body2" color="text.secondary">
                        Geschäftsführung
                      </Typography>
                      <Typography variant="body1" fontWeight="500">
                        {companyInfo.ceo}
                      </Typography>
                    </Box>
                  )}

                  {/* USt-IdNr */}
                  {companyInfo.vatId && (
                    <Box mb={2}>
                      <Typography variant="body2" color="text.secondary">
                        {companyInfo.vatId}
                      </Typography>
                    </Box>
                  )}

                  {/* Rechtsform */}
                  {companyInfo.legalForm && (
                    <Box mb={2}>
                      <Typography variant="body2" color="text.secondary">
                        Rechtsform: {companyInfo.legalForm}
                      </Typography>
                    </Box>
                  )}
                </CardContent>
              </Card>
            </Grid>

            {/* Öffnungszeiten / Zusätzliche Informationen */}
            <Grid item xs={12}>
              <Card 
                sx={{ 
                  boxShadow: isMobile ? 2 : 3,
                  '&:hover': {
                    boxShadow: isMobile ? 3 : 6,
                    transform: 'translateY(-2px)',
                    transition: 'all 0.3s ease'
                  }
                }}
              >
                <CardContent sx={{ p: isMobile ? 3 : 4 }}>
                  <Box display="flex" alignItems="center" mb={3}>
                    <span style={{ fontSize: isMobile ? 32 : 40, marginRight: 16 }}>ℹ️</span>
                    <Typography variant={isMobile ? "h5" : "h4"} component="h2" color="primary">
                      Wichtige Hinweise
                    </Typography>
                  </Box>
                  
                  <Grid container spacing={isMobile ? 2 : 3}>
                    <Grid item xs={12} md={6}>
                      <Typography variant="h6" color="text.primary" gutterBottom>
                        🕒 Bearbeitungszeiten
                      </Typography>
                      <Typography variant="body1" color="text.secondary" paragraph>
                        Ihre Anfragen und Bestellungen werden in der Regel innerhalb von 
                        1-2 Werktagen bearbeitet. 
                      </Typography>
                    </Grid>
                    
                    <Grid item xs={12} md={6}>
                      <Typography variant="h6" color="text.primary" gutterBottom>
                        🚚 Versand
                      </Typography>
                      <Typography variant="body1" color="text.secondary" paragraph>
                        Der Versand erfolgt klimaneutral und nachhaltig verpackt. 
                        Versandkosten werden fair kalkuliert.
                      </Typography>
                    </Grid>
                    
                    <Grid item xs={12} md={6}>
                      <Typography variant="h6" color="text.primary" gutterBottom>
                        🌿 Handgemacht
                      </Typography>
                      <Typography variant="body1" color="text.secondary" paragraph>
                        Alle Produkte werden von Hand gefertigt. Kleine Abweichungen in 
                        Form und Farbe machen jedes Stück einzigartig.
                      </Typography>
                    </Grid>
                    
                    <Grid item xs={12} md={6}>
                      <Typography variant="h6" color="text.primary" gutterBottom>
                        💚 Nachhaltigkeit
                      </Typography>
                      <Typography variant="body1" color="text.secondary" paragraph>
                        Wir verwenden ausschließlich natürliche Inhaltsstoffe und 
                        achten auf umweltfreundliche Herstellung.
                      </Typography>
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        )}
      </Container>
    </>
  );
};

export default ContactPage;