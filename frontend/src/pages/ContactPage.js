import React from 'react';
import { 
  Container, 
  Typography, 
  Box, 
  Grid, 
  Card, 
  CardContent, 
  Button,
  Alert,
  Skeleton,
  useTheme,
  useMediaQuery
} from '@mui/material';
import { 
  LocationOn,
  Phone,
  Email,
  Language,
  Business,
  AccountBalance,
  Person 
} from '@mui/icons-material';
import { Helmet } from 'react-helmet-async';
import { useCompanyInfo } from '../hooks/useCompanyInfo';

const ContactPage = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  
  const { companyInfo, loading, error } = useCompanyInfo();
  
  // Daten aus companyInfo extrahieren mit Fallback-Werten
  const name = companyInfo.name || 'Glücksmomente Manufaktur Ralf Jacob';
  const address = companyInfo.address || {};
  const contact = companyInfo.contact || {};
  const taxInfo = companyInfo.taxInfo || {};
  
  const phone = contact.phone || '+49 123 456789';
  const email = contact.email || 'info@gluecksmomente-manufaktur.de';
  const website = contact.website || 'https://gluecksmomente-manufaktur.vercel.app/';
  const vatId = taxInfo.vatId || 'DE1234567890000';
  const ceo = taxInfo.ceo || 'Ralf Jacob';
  const legalForm = taxInfo.legalForm || 'Einzelunternehmen';
  
  const fullAddress = `${address.street || 'Wasserverkstraße 15'}, ${address.postalCode || '68642'} ${address.city || 'Bürstadt'}, ${address.country || 'Deutschland'}`;

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
        <title>Kontakt - {name}</title>
        <meta name="description" content={`Kontaktinformationen der ${name}. Erreichen Sie uns für Fragen zu unseren handgemachten Naturkosmetik-Produkten.`} />
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

        <Grid container spacing={isMobile ? 3 : 4}>
          {/* Firmenname */}
          <Grid item xs={12}>
            <Card 
              elevation={3} 
              sx={{ 
                mb: 2,
                borderRadius: 2,
                background: 'linear-gradient(45deg, rgba(139,75,97,0.05), rgba(177,122,137,0.05))'
              }}
            >
              <CardContent sx={{ textAlign: 'center', py: isMobile ? 2 : 3 }}>
                <Typography 
                  variant={isMobile ? "h5" : "h4"} 
                  component="h2" 
                  sx={{ 
                    fontWeight: 'bold',
                    color: 'primary.main',
                    mb: 1
                  }}
                >
                  {name}
                </Typography>
                <Typography variant="body1" color="text.secondary">
                  {legalForm}
                </Typography>
                {ceo && (
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                    Geschäftsführung: {ceo}
                  </Typography>
                )}
              </CardContent>
            </Card>
          </Grid>

          {/* Kontaktdaten */}
          <Grid item xs={12} md={6}>
            <Card 
              elevation={2} 
              sx={{ 
                height: '100%',
                borderRadius: 2,
                '&:hover': {
                  elevation: 4,
                  transform: isMobile ? 'none' : 'translateY(-2px)',
                  transition: 'all 0.3s ease-in-out'
                }
              }}
            >
              <CardContent sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                <Box display="flex" alignItems="center" mb={2}>
                  <Phone sx={{ color: 'primary.main', mr: 2, fontSize: isMobile ? 24 : 28 }} />
                  <Typography variant={isMobile ? "h6" : "h5"} fontWeight="bold">
                    Kontakt
                  </Typography>
                </Box>
                
                <Box sx={{ flexGrow: 1 }}>
                  {/* Telefon */}
                  {phone && (
                    <Box mb={3}>
                      <Typography variant="body2" color="text.secondary" gutterBottom>
                        Telefon
                      </Typography>
                      <Button 
                        variant="outlined"
                        startIcon={<Phone />}
                        href={`tel:${phone}`}
                        sx={{ 
                          justifyContent: 'flex-start',
                          width: '100%',
                          textAlign: 'left',
                          minHeight: isMobile ? 48 : 44
                        }}
                      >
                        {phone}
                      </Button>
                    </Box>
                  )}

                  {/* E-Mail */}
                  {email && (
                    <Box mb={3}>
                      <Typography variant="body2" color="text.secondary" gutterBottom>
                        E-Mail
                      </Typography>
                      <Button 
                        variant="outlined"
                        startIcon={<Email />}
                        href={`mailto:${email}`}
                        sx={{ 
                          justifyContent: 'flex-start',
                          width: '100%',
                          textAlign: 'left',
                          minHeight: isMobile ? 48 : 44
                        }}
                      >
                        {email}
                      </Button>
                    </Box>
                  )}

                  {/* Website */}
                  {website && (
                    <Box mb={2}>
                      <Typography variant="body2" color="text.secondary" gutterBottom>
                        Website
                      </Typography>
                      <Button 
                        variant="outlined"
                        startIcon={<Language />}
                        href={`https://${website}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        sx={{ 
                          justifyContent: 'flex-start',
                          width: '100%',
                          textAlign: 'left',
                          minHeight: isMobile ? 48 : 44
                        }}
                      >
                        {website}
                      </Button>
                    </Box>
                  )}
                </Box>
              </CardContent>
            </Card>
          </Grid>

          {/* Adresse und Geschäftsdaten */}
          <Grid item xs={12} md={6}>
            <Card 
              elevation={2} 
              sx={{ 
                height: '100%',
                borderRadius: 2,
                '&:hover': {
                  elevation: 4,
                  transform: isMobile ? 'none' : 'translateY(-2px)',
                  transition: 'all 0.3s ease-in-out'
                }
              }}
            >
              <CardContent sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                <Box display="flex" alignItems="center" mb={2}>
                  <LocationOn sx={{ color: 'primary.main', mr: 2, fontSize: isMobile ? 24 : 28 }} />
                  <Typography variant={isMobile ? "h6" : "h5"} fontWeight="bold">
                    Anschrift
                  </Typography>
                </Box>
                
                <Box sx={{ flexGrow: 1 }}>
                  {/* Adresse */}
                  {address && (
                    <Box mb={3}>
                      <Typography variant="body2" color="text.secondary" gutterBottom>
                        Geschäftsadresse
                      </Typography>
                      <Button 
                        variant="outlined"
                        startIcon={<LocationOn />}
                        href={`https://maps.google.com/maps?q=${encodeURIComponent(fullAddress)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        sx={{ 
                          justifyContent: 'flex-start',
                          width: '100%',
                          textAlign: 'left',
                          whiteSpace: 'pre-line',
                          minHeight: isMobile ? 64 : 60
                        }}
                      >
                        <Box>
                          <div>{address.street}</div>
                          <div>{address.postalCode} {address.city}</div>
                          <div>{address.country}</div>
                        </Box>
                      </Button>
                    </Box>
                  )}

                  {/* Geschäftsdaten */}
                  <Box>
                    {ceo && (
                      <Box display="flex" alignItems="center" mb={1}>
                        <Person sx={{ color: 'text.secondary', mr: 1, fontSize: 18 }} />
                        <Typography variant="body2" color="text.secondary">
                          Geschäftsführung: {ceo}
                        </Typography>
                      </Box>
                    )}
                    
                    {vatId && (
                      <Box display="flex" alignItems="center" mb={1}>
                        <AccountBalance sx={{ color: 'text.secondary', mr: 1, fontSize: 18 }} />
                        <Typography variant="body2" color="text.secondary">
                          {vatId}
                        </Typography>
                      </Box>
                    )}
                    
                    {legalForm && (
                      <Box display="flex" alignItems="center">
                        <Business sx={{ color: 'text.secondary', mr: 1, fontSize: 18 }} />
                        <Typography variant="body2" color="text.secondary">
                          Rechtsform: {legalForm}
                        </Typography>
                      </Box>
                    )}
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Zusätzliche Informationen */}
        <Box mt={isMobile ? 4 : 6} textAlign="center">
          <Typography 
            variant="body1" 
            color="text.secondary"
            sx={{ maxWidth: 800, mx: 'auto', lineHeight: 1.8 }}
          >
            Wir sind eine kleine Manufaktur, die mit Leidenschaft und Hingabe 
            handgemachte Glücksmomente herstellt. 
            Jedes Produkt wird mit Liebe zum Detail und höchsten Qualitätsansprüchen gefertigt.
          </Typography>
          
          <Typography 
            variant="body2" 
            color="text.secondary" 
            sx={{ mt: 3 }}
          >
            Haben Sie Fragen zu unseren Produkten, benötigen Sie eine individuelle Beratung 
            oder möchten Sie ein Angebot anfragen? 
            Wir freuen uns darauf, von Ihnen zu hören!
          </Typography>
        </Box>
      </Container>
    </>
  );
};

export default ContactPage;