import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from 'react-query';
import { ThemeProvider } from '@mui/material/styles';
import { CssBaseline } from '@mui/material';
import { HelmetProvider } from 'react-helmet-async';
import { Toaster } from 'react-hot-toast';

import App from './App';
import theme from './theme';
import { AuthProvider } from './contexts/AuthContext';
import { CartProvider } from './contexts/CartContext';
import './index.css';

// React Query Client Konfiguration
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      refetchOnWindowFocus: false,
      staleTime: 5 * 60 * 1000, // 5 Minuten
    },
    mutations: {
      retry: 1,
    },
  },
});

const root = ReactDOM.createRoot(document.getElementById('root'));

root.render(
  <React.StrictMode>
    <HelmetProvider>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider theme={theme}>
          <CssBaseline />
          <BrowserRouter
            future={{
              v7_startTransition: true,
              v7_relativeSplatPath: true
            }}
          >
            <AuthProvider>
              <CartProvider>
                <App />
                <Toaster
                  position="bottom-right"
                  gutter={8}
                  containerStyle={{
                    bottom: '20px',
                    right: '20px',
                    zIndex: 9999, // Über anderen Elementen aber unter Modals
                  }}
                  toastOptions={{
                    duration: 4000,
                    style: {
                      background: '#363636',
                      color: '#fff',
                      borderRadius: '8px',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                      fontSize: '14px',
                      maxWidth: '350px',
                    },
                    success: {
                      duration: 3000,
                      style: {
                        background: '#4caf50',
                        color: '#fff',
                      },
                      iconTheme: {
                        primary: '#fff',
                        secondary: '#4caf50',
                      },
                    },
                    error: {
                      duration: 5000,
                      style: {
                        background: '#f44336',
                        color: '#fff',
                      },
                      iconTheme: {
                        primary: '#fff',
                        secondary: '#f44336',
                      },
                    },
                    loading: {
                      style: {
                        background: '#2196f3',
                        color: '#fff',
                      },
                    },
                  }}
                />
              </CartProvider>
            </AuthProvider>
          </BrowserRouter>
        </ThemeProvider>
      </QueryClientProvider>
    </HelmetProvider>
  </React.StrictMode>
);

// Service Worker Registration für besseres Caching
if ('serviceWorker' in navigator && process.env.NODE_ENV === 'production') {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then((registration) => {
        console.log('✅ SW registered: ', registration);
      })
      .catch((registrationError) => {
        console.log('❌ SW registration failed: ', registrationError);
      });
  });
}