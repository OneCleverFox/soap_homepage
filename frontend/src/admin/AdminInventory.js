import React from 'react';
import { Navigate } from 'react-router-dom';

/**
 * @deprecated Diese Komponente ist veraltet.
 * Verwende AdminLagerNew.js für Lagerverwaltung.
 * Redirect zu neuer Lager-Komponente.
 */
const AdminInventory = () => {
  return <Navigate to="/admin/lager" replace />;
};

export default AdminInventory;