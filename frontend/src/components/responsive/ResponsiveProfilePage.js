import React from 'react';
import { useMediaQuery, useTheme } from '@mui/material';
import SmartProfilePage from '../../pages/SmartProfilePage';
import AccordionProfilePage from '../../pages/AccordionProfilePage';

const ResponsiveProfilePage = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  return isMobile ? <AccordionProfilePage /> : <SmartProfilePage />;
};

export default ResponsiveProfilePage;