import React from 'react';
import { useCompany } from '../contexts/CompanyContext';
import { 
  Container, 
  Typography, 
  Box, 
  Grid, 
  Card, 
  CardContent, 
  Button,
  useTheme,
  useMediaQuery
} from '@mui/material';
import { Helmet } from 'react-helmet-async';
import { useNavigate } from 'react-router-dom';
import ShopStatusAlert from '../components/common/ShopStatusAlert';

const HomePage = () => {
  const { name } = useCompany();
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const features = [
    {
      icon: <span style={{ fontSize: isMobile ? 40 : 48, color: theme.palette.primary.main }}>🌿</span>,
      title: 'Natürlich & Nachhaltig',
      description: 'Alle Produkte aus natürlichen Zutaten, umweltfreundlich hergestellt'
    },
    {
      icon: <span style={{ fontSize: isMobile ? 40 : 48, color: theme.palette.secondary.main }}>💝</span>,
      title: 'Handgemacht mit Liebe',
      description: 'Jedes Produkt wird mit Sorgfalt und Leidenschaft handgefertigt'
    },
    {
      icon: <span style={{ fontSize: isMobile ? 40 : 48, color: theme.palette.info.main }}>🎨</span>,
      title: 'Kreative Familienarbeit',
      description: 'Von Seifen über Schmuck bis hin zu Gips-Kunstwerken - vielfältige Kreativität'
    }
  ];

  return (
    <>
      <Helmet>
        <title>Glücksmomente-Manufaktur</title>
        <meta name="description" content="Entdecken Sie unsere handgemachte Naturkosmetik und Seifen. Hochwertige, nachhaltige Pflege für Körper und Seele." />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      </Helmet>
      
      <Container maxWidth="lg">
        {/* Shop Status Benachrichtigung */}
        <ShopStatusAlert />
        
        {/* Hero Section */}
        <Box 
          py={{ xs: 4, md: 8 }}
          textAlign="center"
        >
          <Typography 
            variant={isMobile ? "h3" : "h1"} 
            component="h1" 
            gutterBottom
            sx={{
              fontWeight: 'bold',
              mb: { xs: 2, md: 3 }
            }}
          >
            Willkommen bei {name || 'Glücksmomente'}
          </Typography>
          <Typography 
            variant={isMobile ? "h6" : "h5"} 
            component="h2" 
            gutterBottom 
            color="text.secondary"
            sx={{ mb: { xs: 3, md: 4 } }}
          >
            Handgemachte Produkte für besondere Momente
          </Typography>
          <Typography 
            variant="body1" 
            sx={{ 
              mt: { xs: 2, md: 4 },
              mb: { xs: 3, md: 4 },
              fontSize: { xs: '1rem', md: '1.1rem' },
              maxWidth: 600,
              mx: 'auto'
            }}
          >
            Entdecken Sie unsere liebevoll hergestellten Seifen aus natürlichen Zutaten.
          </Typography>
          
          <Button
            variant="contained"
            size={isMobile ? "medium" : "large"}
            onClick={() => navigate('/products')}
            sx={{
              mt: 2,
              px: { xs: 3, md: 4 },
              py: { xs: 1, md: 1.5 },
              fontSize: { xs: '1rem', md: '1.1rem' }
            }}
          >
            Produkte entdecken
          </Button>
        </Box>

        {/* Features Section */}
        <Box py={{ xs: 4, md: 6 }}>
          <Typography
            variant={isMobile ? "h5" : "h4"}
            component="h3"
            textAlign="center"
            gutterBottom
            sx={{ mb: { xs: 3, md: 5 } }}
          >
            Warum Glücksmomente?
          </Typography>
          
          <Grid container spacing={{ xs: 2, md: 4 }}>
            {features.map((feature, index) => (
              <Grid item xs={12} md={4} key={index}>
                <Card 
                  sx={{ 
                    height: '100%',
                    textAlign: 'center',
                    p: { xs: 1, md: 2 },
                    boxShadow: { xs: 1, md: 3 },
                    '&:hover': {
                      boxShadow: { xs: 2, md: 6 },
                      transform: 'translateY(-4px)',
                      transition: 'all 0.3s ease'
                    }
                  }}
                >
                  <CardContent sx={{ p: { xs: 2, md: 3 } }}>
                    <Box sx={{ mb: 2 }}>
                      {feature.icon}
                    </Box>
                    <Typography 
                      variant={isMobile ? "h6" : "h5"} 
                      component="h4" 
                      gutterBottom
                      sx={{ fontWeight: 'bold' }}
                    >
                      {feature.title}
                    </Typography>
                    <Typography 
                      variant="body2" 
                      color="text.secondary"
                      sx={{ fontSize: { xs: '0.9rem', md: '1rem' } }}
                    >
                      {feature.description}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Box>

        {/* Call to Action Section */}
        <Box 
          py={{ xs: 4, md: 6 }}
          textAlign="center"
          sx={{
            bgcolor: 'grey.50',
            borderRadius: 2,
            my: { xs: 2, md: 4 }
          }}
        >
          <Typography
            variant={isMobile ? "h5" : "h4"}
            component="h3"
            gutterBottom
            sx={{ fontWeight: 'bold' }}
          >
            Bereit für Ihre Glücksmomente?
          </Typography>
          <Typography
            variant="body1"
            sx={{ 
              mb: 3,
              maxWidth: 500,
              mx: 'auto',
              fontSize: { xs: '1rem', md: '1.1rem' }
            }}
          >
            Stöbern Sie durch unsere Produktpalette und finden Sie Ihre Lieblingspflege.
          </Typography>
          <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', flexWrap: 'wrap' }}>
            <Button
              variant="contained"
              size={isMobile ? "medium" : "large"}
              onClick={() => navigate('/products')}
              sx={{ minWidth: { xs: 140, md: 160 } }}
            >
              Jetzt shoppen
            </Button>
            <Button
              variant="outlined"
              size={isMobile ? "medium" : "large"}
              onClick={() => navigate('/about')}
              sx={{ minWidth: { xs: 140, md: 160 } }}
            >
              Über uns
            </Button>
          </Box>
        </Box>
      </Container>
    </>
  );
};

export default HomePage;