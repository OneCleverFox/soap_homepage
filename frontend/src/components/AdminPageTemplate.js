import React from 'react';
import { Container, Typography, Box } from '@mui/material';

/**
 * Generische Basis-Komponente für Admin-Seiten
 * Reduziert Code-Duplikation für einfache Admin-Seiten
 */
const AdminPageTemplate = ({ 
  title, 
  children, 
  maxWidth = "lg",
  showContainer = true 
}) => {
  const content = (
    <Box>
      <Typography variant="h2" component="h1" gutterBottom>
        {title}
      </Typography>
      {children}
    </Box>
  );

  return showContainer ? (
    <Container maxWidth={maxWidth}>
      {content}
    </Container>
  ) : content;
};

export default AdminPageTemplate;