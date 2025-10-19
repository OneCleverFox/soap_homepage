import React, { useContext } from 'react';
import { AuthContext } from '../contexts/AuthContext';
import AccordionProfilePage from './AccordionProfilePage';

const SmartProfilePage = () => {
  const { user } = useContext(AuthContext);

  console.log('🔍 SmartProfile - User:', user);
  console.log('🔍 SmartProfile - user.rolle:', user?.rolle);
  console.log('🔍 SmartProfile - user.role:', user?.role);

  // Alle Benutzer verwenden die neue AccordionProfilePage
  return <AccordionProfilePage />;
};

export default SmartProfilePage;