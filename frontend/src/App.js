import React from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Box } from '@mui/material';

// Public Pages
import HomePage from './pages/HomePage';
import ProductsPage from './pages/ProductsPage';
import ProductDetailPage from './pages/ProductDetailPage';
import CheckoutSuccessPage from './pages/CheckoutSuccessPage';
import CheckoutCancelPage from './pages/CheckoutCancelPage';
import InquirySuccessPage from './pages/InquirySuccessPage';
import OrderTrackingPage from './pages/OrderTrackingPage';
import AboutPage from './pages/AboutPage';
import ContactPage from './pages/ContactPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import EmailVerificationPage from './pages/EmailVerificationPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import ResponsiveCartPage from './components/responsive/ResponsiveCartPage';
import ResponsiveCheckoutPage from './components/responsive/ResponsiveCheckoutPage';
import ResponsiveProfilePage from './components/responsive/ResponsiveProfilePage';
import CustomerInquiries from './pages/CustomerInquiries';
import MyOrdersPage from './pages/MyOrdersPage';
import InquiryPaymentSuccess from './pages/InquiryPaymentSuccess';
import InquiryPaymentCancel from './pages/InquiryPaymentCancel';
import OrderPaymentSuccess from './pages/OrderPaymentSuccess';

// Legal Pages
import ImpressumPage from './pages/ImpressumPage';
import DatenschutzPage from './pages/DatenschutzPage';
import AGBPage from './pages/AGBPage';

// Admin Pages
import AdminPortfolio from './admin/AdminPortfolio';

// Original Admin Pages
import AdminDashboard from './admin/AdminDashboard';
import AdminRohstoffe from './admin/AdminRohstoffe';
import AdminOrdersManagement from './admin/AdminOrdersManagement';
import AdminInquiries from './admin/AdminInquiries';
import AdminCheckout from './admin/AdminCheckout';
import AdminInventory from './admin/AdminInventory';
import AdminUsers from './admin/AdminUsers';
import AdminWarenberechnung from './admin/AdminWarenberechnung';
import AdminLager from './admin/AdminLagerNew';
import AdminCart from './admin/AdminCart';
import AdminSettingsPanel from './admin/AdminSettingsPanel';
import AdminInvoiceConfiguration from './admin/AdminInvoiceConfiguration';

// Components
import Navbar from './components/layout/Navbar';
import Footer from './components/layout/Footer';
import ProtectedRoute from './components/auth/ProtectedRoute';
import ScrollToTop from './components/common/ScrollToTop';
import CookieConsent from './components/common/CookieConsent';

// Hook um zu prüfen ob Footer angezeigt werden soll
const useShowFooter = () => {
  const location = useLocation();
  const routesWithoutFooter = [
    '/cart',
    '/checkout', 
    '/admin/portfolio',
    '/inquiries',
    '/my-orders'
  ];
  
  return !routesWithoutFooter.some(route => location.pathname.startsWith(route));
};

// Komponente für Footer mit bedingter Anzeige
const ConditionalFooter = () => {
  const showFooter = useShowFooter();
  return showFooter ? <Footer /> : null;
};

function App() {
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
                      <Route path="/products" element={<ProductsPage />} />
                      <Route path="/products/:id" element={<ProductDetailPage />} />
                      <Route path="/cart" element={<ResponsiveCartPage />} />
                      <Route path="/checkout" element={<ResponsiveCheckoutPage />} />
                      <Route path="/checkout/success" element={<CheckoutSuccessPage />} />
                      <Route path="/checkout/cancel" element={<CheckoutCancelPage />} />
                      <Route path="/inquiries" element={<CustomerInquiries />} />
                      <Route path="/my-orders" element={<MyOrdersPage />} />
                      <Route path="/inquiry-success" element={<InquirySuccessPage />} />
                      <Route path="/inquiry-payment-success" element={<InquiryPaymentSuccess />} />
                      <Route path="/inquiry-payment-cancel" element={<InquiryPaymentCancel />} />
                      <Route path="/order-payment-success" element={<OrderPaymentSuccess />} />
                      <Route path="/order-tracking" element={<OrderTrackingPage />} />
                      <Route path="/about" element={<AboutPage />} />
                      <Route path="/contact" element={<ContactPage />} />
                      <Route path="/login" element={<LoginPage />} />
                      <Route path="/register" element={<RegisterPage />} />
                      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
                      <Route path="/reset-password/:token" element={<ResetPasswordPage />} />
                      <Route path="/verify-email/:token" element={<EmailVerificationPage />} />
                      <Route path="/profile" element={<ResponsiveProfilePage />} />
                      <Route path="/meine-anfragen" element={<CustomerInquiries />} />
                      
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
                <ConditionalFooter />
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
                <ProtectedRoute requiredRole="admin">
                  <AdminOrdersManagement />
                </ProtectedRoute>
              </>
            }
          />
          <Route
            path="/admin/anfragen"
            element={
              <>
                <Navbar />
                <ProtectedRoute requiredRole="admin">
                  <AdminInquiries />
                </ProtectedRoute>
              </>
            }
          />
          <Route
            path="/admin/checkout"
            element={
              <>
                <Navbar />
                <ProtectedRoute requiredRole="admin">
                  <AdminCheckout />
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
          <Route
            path="/admin/warenkorb"
            element={
              <>
                <Navbar />
                <ProtectedRoute requiredRole="admin">
                  <AdminCart />
                </ProtectedRoute>
              </>
            }
          />
          <Route
            path="/admin/einstellungen"
            element={
              <>
                <Navbar />
                <ProtectedRoute requiredRole="admin">
                  <AdminSettingsPanel />
                </ProtectedRoute>
              </>
            }
          />
          <Route
            path="/admin/rechnungen"
            element={
              <>
                <Navbar />
                <ProtectedRoute requiredRole="admin">
                  <AdminInvoiceConfiguration />
                </ProtectedRoute>
              </>
            }
          />
        </Routes>
      </Box>
      
      {/* Cookie Consent Banner */}
      <CookieConsent />
    </>
  );
}

export default App;
