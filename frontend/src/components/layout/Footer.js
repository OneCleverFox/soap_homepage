import React from 'react';
import { Box, Typography } from '@mui/material';

const Footer = () => {
  return (
    <Box sx={{ bgcolor: 'primary.main', color: 'white', p: 2, mt: 4 }}>
      <Typography variant="body2" align="center">
        © 2025 Gluecksmomente. Alle Rechte vorbehalten.
      </Typography>
    </Box>
  );
};

export default Footer;