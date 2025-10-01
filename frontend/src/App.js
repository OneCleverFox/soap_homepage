import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Box } from '@mui/material';

// Public Pages
import HomePage from './pages/HomePage';
import ProductsPage from './pages/ProductsPage';
import ProductDetailPage from './pages/ProductDetailPage';
import CartPage from './pages/CartPage';
import CheckoutPage from './pages/CheckoutPage';
import OrderTrackingPage from './pages/OrderTrackingPage';
import AboutPage from './pages/AboutPage';
import ContactPage from './pages/ContactPage';
import LoginPage from './pages/LoginPage';

// Admin Pages
import AdminDashboard from './admin/AdminDashboard';
import AdminProducts from './admin/AdminProducts';
import AdminOrders from './admin/AdminOrders';
import AdminInventory from './admin/AdminInventory';
import AdminUsers from './admin/AdminUsers';
import AdminAnalytics from './admin/AdminAnalytics';

// Components
import Navbar from './components/layout/Navbar';
import Footer from './components/layout/Footer';
import ProtectedRoute from './components/auth/ProtectedRoute';
import ScrollToTop from './components/common/ScrollToTop';
import LoadingSpinner from './components/common/LoadingSpinner';

// Hooks
import { useAuth } from './hooks/useAuth';

function App() {
  const { isLoading } = useAuth();

  if (isLoading) {
    return (
      <Box 
        display="flex" 
        justifyContent="center" 
        alignItems="center" 
        minHeight="100vh"
      >
        <LoadingSpinner size={60} />
      </Box>
    );
  }

  return (
    <>
      <ScrollToTop />
      <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
        <Routes>
          {/* Public Routes with Navbar and Footer */}
          <Route
            path="/*"
            element={
              <>
                <Navbar />
                <Box component="main" sx={{ flexGrow: 1 }}>
                  <Routes>
                    <Route path="/" element={<HomePage />} />
                    <Route path="/produkte" element={<ProductsPage />} />
                    <Route path="/produkte/:id" element={<ProductDetailPage />} />
                    <Route path="/warenkorb" element={<CartPage />} />
                    <Route path="/kasse" element={<CheckoutPage />} />
                    <Route path="/bestellung-verfolgen" element={<OrderTrackingPage />} />
                    <Route path="/ueber-uns" element={<AboutPage />} />
                    <Route path="/kontakt" element={<ContactPage />} />
                    <Route path="/login" element={<LoginPage />} />
                    <Route path="*" element={<Navigate to="/" replace />} />
                  </Routes>
                </Box>
                <Footer />
              </>
            }
          />

          {/* Admin Routes without Navbar and Footer */}
          <Route path="/admin" element={<Navigate to="/admin/dashboard" replace />} />
          <Route
            path="/admin/dashboard"
            element={
              <ProtectedRoute requiredRole="employee">
                <AdminDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/produkte"
            element={
              <ProtectedRoute requiredPermission="products.read">
                <AdminProducts />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/bestellungen"
            element={
              <ProtectedRoute requiredPermission="orders.read">
                <AdminOrders />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/lager"
            element={
              <ProtectedRoute requiredPermission="inventory.read">
                <AdminInventory />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/benutzer"
            element={
              <ProtectedRoute requiredRole="admin">
                <AdminUsers />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/analytics"
            element={
              <ProtectedRoute requiredPermission="analytics.read">
                <AdminAnalytics />
              </ProtectedRoute>
            }
          />
        </Routes>
      </Box>
    </>
  );
}

export default App;