import React, { lazy, Suspense } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Box, CircularProgress } from '@mui/material';

// Context Providers
import { CompanyProvider } from './contexts/CompanyContext';

// Components
import Navbar from './components/layout/Navbar';
import Footer from './components/layout/Footer';
import ProtectedRoute from './components/auth/ProtectedRoute';
import ScrollToTop from './components/common/ScrollToTop';
import CookieConsent from './components/common/CookieConsent';

// Lazy Loading für bessere Performance
const HomePage = lazy(() => import('./pages/HomePage'));
const ProductsPage = lazy(() => import('./pages/ProductsPage'));
const ProductDetailPage = lazy(() => import('./pages/ProductDetailPage'));
const CheckoutSuccessPage = lazy(() => import('./pages/CheckoutSuccessPage'));
const CheckoutCancelPage = lazy(() => import('./pages/CheckoutCancelPage'));
const InquirySuccessPage = lazy(() => import('./pages/InquirySuccessPage'));
const OrderTrackingPage = lazy(() => import('./pages/OrderTrackingPage'));
const AboutPage = lazy(() => import('./pages/AboutPage'));
const ContactPage = lazy(() => import('./pages/ContactPage'));
const GalleryPage = lazy(() => import('./pages/GalleryPage'));
const LoginPage = lazy(() => import('./pages/LoginPage'));
const RegisterPage = lazy(() => import('./pages/RegisterPage'));
const EmailVerificationPage = lazy(() => import('./pages/EmailVerificationPage'));
const ForgotPasswordPage = lazy(() => import('./pages/ForgotPasswordPage'));
const ResetPasswordPage = lazy(() => import('./pages/ResetPasswordPage'));
const ResponsiveCartPage = lazy(() => import('./components/responsive/ResponsiveCartPage'));
const ResponsiveCheckoutPage = lazy(() => import('./components/responsive/ResponsiveCheckoutPage'));
const ResponsiveProfilePage = lazy(() => import('./components/responsive/ResponsiveProfilePage'));
const CustomerInquiries = lazy(() => import('./pages/CustomerInquiries'));
const MyOrdersPage = lazy(() => import('./pages/MyOrdersPage'));
const InquiryPaymentSuccess = lazy(() => import('./pages/InquiryPaymentSuccess'));
const InquiryPaymentCancel = lazy(() => import('./pages/InquiryPaymentCancel'));
const OrderPaymentSuccess = lazy(() => import('./pages/OrderPaymentSuccess'));
const GalleryPage = lazy(() => import('./pages/GalleryPage'));

// Legal Pages
const ImpressumPage = lazy(() => import('./pages/ImpressumPage'));
const DatenschutzPage = lazy(() => import('./pages/DatenschutzPage'));
const AGBPage = lazy(() => import('./pages/AGBPage'));
const WiderrufsrechtPage = lazy(() => import('./pages/WiderrufsrechtPage'));

// Admin Pages - Lazy Loading für bessere Performance
const AdminPortfolio = lazy(() => import('./admin/AdminPortfolio'));
const AdminDashboard = lazy(() => import('./admin/AdminDashboard'));
const AdminRohstoffe = lazy(() => import('./admin/AdminRohstoffe'));
const AdminOrdersManagement = lazy(() => import('./admin/AdminOrdersManagement'));
const AdminInquiries = lazy(() => import('./admin/AdminInquiries'));
const TokenDebugger = lazy(() => import('./TokenDebugger'));
const AdminCheckout = lazy(() => import('./admin/AdminCheckout'));
const AdminInventory = lazy(() => import('./admin/AdminInventory'));
const AdminUsers = lazy(() => import('./admin/AdminUsers'));
const AdminWarenberechnung = lazy(() => import('./admin/AdminWarenberechnung'));
const AdminLager = lazy(() => import('./admin/AdminLagerNew'));
const AdminCart = lazy(() => import('./admin/AdminCart'));
const AdminSettingsPanel = lazy(() => import('./admin/AdminSettingsPanel'));
const AdminInvoiceConfiguration = lazy(() => import('./admin/AdminInvoiceConfiguration'));
const AdminEmailConfiguration = lazy(() => import('./admin/AdminEmailConfiguration'));
const AdminInvoiceDesigner = lazy(() => import('./admin/AdminInvoiceDesigner'));
const CreateInvoice = lazy(() => import('./admin/CreateInvoice'));
const InvoiceList = lazy(() => import('./admin/InvoiceList'));
const AdminGallery = lazy(() => import('./admin/AdminGallery'));

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

// Loading Komponente für Suspense
const LoadingFallback = () => (
  <Box 
    display="flex" 
    justifyContent="center" 
    alignItems="center" 
    minHeight="50vh"
  >
    <CircularProgress />
  </Box>
);

function App() {
  return (
    <CompanyProvider>
      <ScrollToTop />
      <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
        <Suspense fallback={<LoadingFallback />}>
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
                      <Route path="/gallery" element={<GalleryPage />} />
                      <Route path="/contact" element={<ContactPage />} />
                      <Route path="/gallery" element={<GalleryPage />} />
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
                      
                      {/* Admin Rohstoffe Route with normal Navbar */}
                      <Route 
                        path="/admin/rohstoffe" 
                        element={
                          <ProtectedRoute requiredRole="admin">
                            <AdminRohstoffe />
                          </ProtectedRoute>
                        } 
                      />
                      
                      {/* Legal Pages */}
                      <Route path="/impressum" element={<ImpressumPage />} />
                      <Route path="/datenschutz" element={<DatenschutzPage />} />
                      <Route path="/agb" element={<AGBPage />} />
                      <Route path="/widerrufsrecht" element={<WiderrufsrechtPage />} />
                      
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
                <ProtectedRoute requiredRole="admin">
                  <AdminDashboard />
                </ProtectedRoute>
              </>
            }
          />
          <Route
            path="/debug-token"
            element={
              <>
                <Navbar />
                <TokenDebugger />
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
          <Route
            path="/admin/rechnungs-designer"
            element={
              <>
                <Navbar />
                <ProtectedRoute requiredRole="admin">
                  <AdminInvoiceDesigner />
                </ProtectedRoute>
              </>
            }
          />
          <Route
            path="/admin/email-tests"
            element={
              <>
                <Navbar />
                <ProtectedRoute requiredRole="admin">
                  <AdminEmailConfiguration />
                </ProtectedRoute>
              </>
            }
          />
          <Route
            path="/admin/gallery"
            element={
              <>
                <Navbar />
                <ProtectedRoute requiredRole="admin">
                  <AdminGallery />
                </ProtectedRoute>
              </>
            }
          />
          <Route
            path="/admin/create-invoice"
            element={
              <>
                <Navbar />
                <ProtectedRoute requiredRole="admin">
                  <CreateInvoice />
                </ProtectedRoute>
              </>
            }
          />
          <Route
            path="/admin/invoice-list"
            element={
              <>
                <Navbar />
                <ProtectedRoute requiredRole="admin">
                  <InvoiceList />
                </ProtectedRoute>
              </>
            }
          />
          <Route
            path="/admin/galerie"
            element={
              <>
                <Navbar />
                <ProtectedRoute requiredRole="admin">
                  <AdminGallery />
                </ProtectedRoute>
              </>
            }
          />
          </Routes>
        </Suspense>
      </Box>
      
      {/* Cookie Consent Banner */}
      <CookieConsent />
    </CompanyProvider>
  );
}

export default App;