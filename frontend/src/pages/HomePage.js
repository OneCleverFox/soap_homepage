import React from 'react';
import { Container, Typography, Box } from '@mui/material';
import { Helmet } from 'react-helmet-async';

const HomePage = () => {
  return (
    <>
      <Helmet>
        <title>Gluecksmomente - Handgemachte Naturkosmetik</title>
        <meta name="description" content="Entdecken Sie unsere handgemachte Naturkosmetik und Seifen. Hochwertige, nachhaltige Pflege für Körper und Seele." />
      </Helmet>
      
      <Container maxWidth="lg">
        <Box py={8}>
          <Typography variant="h1" component="h1" gutterBottom align="center">
            Willkommen bei Gluecksmomente
          </Typography>
          <Typography variant="h5" component="h2" gutterBottom align="center" color="text.secondary">
            Handgemachte Naturkosmetik für besondere Momente
          </Typography>
          <Typography variant="body1" align="center" sx={{ mt: 4 }}>
            Entdecken Sie unsere liebevoll hergestellten Seifen und Pflegeprodukte aus natürlichen Zutaten.
          </Typography>
        </Box>
      </Container>
    </>
  );
};

export default HomePage;