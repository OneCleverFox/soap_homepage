import React from 'react';
import { Navigate } from 'react-router-dom';

/**
 * @deprecated Diese Komponente ist veraltet.
 * Verwende AdminPortfolio.js für Produktverwaltung.
 * Redirect zu Portfolio-Komponente.
 */
const AdminProducts = () => {
  return <Navigate to="/admin/portfolio" replace />;
};

export default AdminProducts;