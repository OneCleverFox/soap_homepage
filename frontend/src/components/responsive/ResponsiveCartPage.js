import React from 'react';
import { useMediaQuery, useTheme } from '@mui/material';
import CartPage from '../../pages/CartPage';
import MobileCartPage from '../../pages/MobileCartPage';

const ResponsiveCartPage = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  return isMobile ? <MobileCartPage /> : <CartPage />;
};

export default ResponsiveCartPage;