import React from 'react';
import { Container, Typography } from '@mui/material';

const ProductsPage = () => {
  return (
    <Container maxWidth="lg">
      <Typography variant="h2" component="h1" gutterBottom>
        Unsere Produkte
      </Typography>
      <Typography variant="body1">
        Hier finden Sie bald unser komplettes Sortiment.
      </Typography>
    </Container>
  );
};

export default ProductsPage;