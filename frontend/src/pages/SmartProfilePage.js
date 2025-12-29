import React, { useContext } from 'react';
import { AuthContext } from '../contexts/AuthContext';
import AccordionProfilePage from './AccordionProfilePage';

const SmartProfilePage = () => {
  const { user } = useContext(AuthContext);

  if (process.env.NODE_ENV === 'development') {
    console.log('🔍 SmartProfile - User:', user?.username || 'No user');
  }

  // Alle Benutzer verwenden die neue AccordionProfilePage
  return <AccordionProfilePage />;
};

export default SmartProfilePage;