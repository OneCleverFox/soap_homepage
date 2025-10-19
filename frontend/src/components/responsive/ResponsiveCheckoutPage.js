import React from 'react';
import { useMediaQuery, useTheme } from '@mui/material';
import CheckoutPage from '../../pages/CheckoutPage';
import MobileCheckoutPage from '../../pages/MobileCheckoutPage';

const ResponsiveCheckoutPage = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  return isMobile ? <MobileCheckoutPage /> : <CheckoutPage />;
};

export default ResponsiveCheckoutPage;