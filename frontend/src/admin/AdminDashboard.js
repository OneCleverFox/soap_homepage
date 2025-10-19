import React from 'react';
import { 
  Container, 
  Typography, 
  Grid, 
  Card, 
  CardContent, 
  CardActions, 
  Button,
  Box,
  useTheme,
  useMediaQuery
} from '@mui/material';
import { 
  Inventory as InventoryIcon,
  ShoppingCart as OrdersIcon,
  People as UsersIcon,
  Analytics as AnalyticsIcon,
  Photo as PortfolioIcon,
  Dashboard as DashboardIcon,
  ShoppingBag as CartIcon,
  Receipt as CheckoutIcon
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';

const AdminDashboard = () => {
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const adminSections = [
    {
      title: 'Portfolio-Verwaltung',
      description: 'Verwalten Sie alle Produkte im Portfolio - erstellen, bearbeiten, löschen und Bilder hochladen.',
      icon: <PortfolioIcon sx={{ fontSize: 40, color: 'primary.main' }} />,
      path: '/admin/portfolio',
      color: 'primary'
    },
    {
      title: 'Rohstoffe',
      description: 'Verwalten Sie Rohseifen, Duftöle und Verpackungen.',
      icon: <InventoryIcon sx={{ fontSize: 40, color: 'secondary.main' }} />,
      path: '/admin/rohstoffe',
      color: 'secondary'
    },
    {
      title: 'Bestellungen',
      description: 'Übersicht und Verwaltung aller Kundenbestellungen.',
      icon: <OrdersIcon sx={{ fontSize: 40, color: 'success.main' }} />,
      path: '/admin/bestellungen',
      color: 'success'
    },
    {
      title: 'Admin-Checkout',
      description: 'Erstellen Sie Bestellungen für Kunden als Administrator.',
      icon: <CheckoutIcon sx={{ fontSize: 40, color: 'primary.main' }} />,
      path: '/admin/checkout',
      color: 'primary'
    },
    {
      title: 'Lager',
      description: 'Lagerbestand und Inventar verwalten.',
      icon: <DashboardIcon sx={{ fontSize: 40, color: 'info.main' }} />,
      path: '/admin/lager',
      color: 'info'
    },
    {
      title: 'Benutzer',
      description: 'Benutzerverwaltung und Berechtigungen.',
      icon: <UsersIcon sx={{ fontSize: 40, color: 'warning.main' }} />,
      path: '/admin/benutzer',
      color: 'warning'
    },
    {
      title: 'Warenberechnung',
      description: 'Detaillierte Kostenberechnung für alle Portfolio-Produkte.',
      icon: <AnalyticsIcon sx={{ fontSize: 40, color: 'error.main' }} />,
      path: '/admin/warenberechnung',
      color: 'error'
    },
    {
      title: 'Mein Warenkorb',
      description: 'Verwalten Sie Ihren persönlichen Administrator-Warenkorb.',
      icon: <CartIcon sx={{ fontSize: 40, color: 'secondary.main' }} />,
      path: '/admin/warenkorb',
      color: 'secondary'
    }
  ];

  return (
    <Container maxWidth="lg" sx={{ px: isMobile ? 1 : 3 }}>
      <Box py={isMobile ? 2 : 4}>
        <Typography 
          variant={isMobile ? "h4" : "h2"} 
          component="h1" 
          gutterBottom 
          align="center"
          sx={{ fontSize: isMobile ? '1.75rem' : '3rem' }}
        >
          Admin Dashboard
        </Typography>
        <Typography 
          variant={isMobile ? "body1" : "h6"} 
          component="p" 
          gutterBottom 
          align="center" 
          color="textSecondary" 
          mb={isMobile ? 2 : 4}
          sx={{ px: isMobile ? 1 : 0 }}
        >
          Willkommen im Verwaltungsbereich - wählen Sie einen Bereich aus:
        </Typography>

        <Grid container spacing={isMobile ? 2 : 3}>
          {adminSections.map((section) => (
            <Grid item xs={12} sm={6} md={4} key={section.title}>
              <Card 
                sx={{ 
                  height: '100%', 
                  display: 'flex', 
                  flexDirection: 'column',
                  transition: 'transform 0.2s, box-shadow 0.2s',
                  cursor: 'pointer',
                  '&:hover': isMobile ? {} : {
                    transform: 'translateY(-4px)',
                    boxShadow: 3
                  },
                  '&:active': isMobile ? {
                    transform: 'scale(0.98)',
                    boxShadow: 1
                  } : {},
                  minHeight: isMobile ? '140px' : '200px'
                }}
                onClick={() => navigate(section.path)}
              >
                <CardContent 
                  sx={{ 
                    flexGrow: 1, 
                    textAlign: 'center', 
                    p: isMobile ? 2 : 3,
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center'
                  }}
                >
                  <Box mb={isMobile ? 1 : 2}>
                    {React.cloneElement(section.icon, {
                      sx: { 
                        fontSize: isMobile ? 30 : 40, 
                        color: `${section.color}.main` 
                      }
                    })}
                  </Box>
                  <Typography 
                    variant={isMobile ? "h6" : "h5"} 
                    component="h3" 
                    gutterBottom
                    sx={{ fontSize: isMobile ? '1.1rem' : '1.5rem' }}
                  >
                    {section.title}
                  </Typography>
                  {!isMobile && (
                    <Typography variant="body2" color="textSecondary">
                      {section.description}
                    </Typography>
                  )}
                </CardContent>
                {!isMobile && (
                  <CardActions sx={{ justifyContent: 'center', pb: 2 }}>
                    <Button 
                      variant="contained" 
                      color={section.color}
                      size="large"
                    >
                      Öffnen
                    </Button>
                  </CardActions>
                )}
              </Card>
            </Grid>
          ))}
        </Grid>
      </Box>
    </Container>
  );
};

export default AdminDashboard;