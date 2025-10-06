import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Box } from '@mui/material';

// Context Providers
import { AuthProvider } from './contexts/AuthContext';
import { CartProvider } from './contexts/CartContext';

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

// Legal Pages
import ImpressumPage from './pages/ImpressumPage';
import DatenschutzPage from './pages/DatenschutzPage';
import AGBPage from './pages/AGBPage';

// Admin Pages
import AdminPortfolio from './pages/AdminPortfolio';

// Original Admin Pages
import AdminDashboard from './admin/AdminDashboard';
import AdminRohstoffe from './admin/AdminRohstoffe';
import AdminOrders from './admin/AdminOrders';
import AdminInventory from './admin/AdminInventory';
import AdminUsers from './admin/AdminUsers';
import AdminWarenberechnung from './admin/AdminWarenberechnung';
import AdminLager from './admin/AdminLager';

// Components
import Navbar from './components/layout/Navbar';
import Footer from './components/layout/Footer';
import ProtectedRoute from './components/auth/ProtectedRoute';
import ScrollToTop from './components/common/ScrollToTop';
import CookieConsent from './components/common/CookieConsent';

function App() {
  return (
    <AuthProvider>
      <CartProvider>
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
                      <Route path="/products" element={<ProductsPage />} />
                      <Route path="/products/:id" element={<ProductDetailPage />} />
                      <Route path="/cart" element={<CartPage />} />
                      <Route path="/checkout" element={<CheckoutPage />} />
                      <Route path="/order-tracking" element={<OrderTrackingPage />} />
                      <Route path="/about" element={<AboutPage />} />
                      <Route path="/contact" element={<ContactPage />} />
                      <Route path="/login" element={<LoginPage />} />
                      
                      {/* Admin Portfolio Route with normal Navbar */}
                      <Route 
                        path="/admin/portfolio" 
                        element={
                          <ProtectedRoute requiredRole="admin">
                            <AdminPortfolio />
                          </ProtectedRoute>
                        } 
                      />
                      
                      {/* Legal Pages */}
                      <Route path="/impressum" element={<ImpressumPage />} />
                      <Route path="/datenschutz" element={<DatenschutzPage />} />
                      <Route path="/agb" element={<AGBPage />} />
                      
                      {/* Legacy Routes (German) */}
                    <Route path="/produkte" element={<Navigate to="/products" replace />} />
                    <Route path="/produkte/:id" element={<Navigate to="/products/:id" replace />} />
                    <Route path="/warenkorb" element={<Navigate to="/cart" replace />} />
                    <Route path="/kasse" element={<Navigate to="/checkout" replace />} />
                    <Route path="/bestellung-verfolgen" element={<Navigate to="/order-tracking" replace />} />
                    <Route path="/ueber-uns" element={<Navigate to="/about" replace />} />
                    <Route path="/kontakt" element={<Navigate to="/contact" replace />} />
                    
                    <Route path="*" element={<Navigate to="/" replace />} />
                  </Routes>
                </Box>
                <Footer />
              </>
            }
          />

          {/* Admin Routes with Navbar */}
          <Route path="/admin" element={<Navigate to="/admin/dashboard" replace />} />
          <Route
            path="/admin/dashboard"
            element={
              <>
                <Navbar />
                <ProtectedRoute requiredRole="employee">
                  <AdminDashboard />
                </ProtectedRoute>
              </>
            }
          />
          <Route
            path="/admin/rohstoffe"
            element={
              <>
                <Navbar />
                <ProtectedRoute requiredRole="admin">
                  <AdminRohstoffe />
                </ProtectedRoute>
              </>
            }
          />
          <Route
            path="/admin/bestellungen"
            element={
              <>
                <Navbar />
                <ProtectedRoute requiredPermission="orders.read">
                  <AdminOrders />
                </ProtectedRoute>
              </>
            }
          />
          <Route
            path="/admin/lager"
            element={
              <>
                <Navbar />
                <ProtectedRoute requiredRole="admin">
                  <AdminLager />
                </ProtectedRoute>
              </>
            }
          />
          <Route
            path="/admin/inventory"
            element={
              <>
                <Navbar />
                <ProtectedRoute requiredPermission="inventory.read">
                  <AdminInventory />
                </ProtectedRoute>
              </>
            }
          />
          <Route
            path="/admin/benutzer"
            element={
              <>
                <Navbar />
                <ProtectedRoute requiredRole="admin">
                  <AdminUsers />
                </ProtectedRoute>
              </>
            }
          />
          <Route
            path="/admin/warenberechnung"
            element={
              <>
                <Navbar />
                <ProtectedRoute requiredRole="admin">
                  <AdminWarenberechnung />
                </ProtectedRoute>
              </>
            }
          />
        </Routes>
      </Box>
      
      {/* Cookie Consent Banner */}
      <CookieConsent />
      </CartProvider>
    </AuthProvider>
  );
}

export default App;