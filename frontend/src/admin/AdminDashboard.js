import React from 'react';
import { 
  Container, 
  Typography, 
  Grid, 
  Card, 
  CardContent, 
  CardActions, 
  Button,
  Box 
} from '@mui/material';
import { 
  Inventory as InventoryIcon,
  ShoppingCart as OrdersIcon,
  People as UsersIcon,
  Analytics as AnalyticsIcon,
  Photo as PortfolioIcon,
  Dashboard as DashboardIcon,
  ShoppingBag as CartIcon
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';

const AdminDashboard = () => {
  const navigate = useNavigate();

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
    <Container maxWidth="lg">
      <Box py={4}>
        <Typography variant="h2" component="h1" gutterBottom align="center">
          Admin Dashboard
        </Typography>
        <Typography variant="h6" component="p" gutterBottom align="center" color="textSecondary" mb={4}>
          Willkommen im Verwaltungsbereich - wählen Sie einen Bereich aus:
        </Typography>

        <Grid container spacing={3}>
          {adminSections.map((section) => (
            <Grid item xs={12} sm={6} md={4} key={section.title}>
              <Card 
                sx={{ 
                  height: '100%', 
                  display: 'flex', 
                  flexDirection: 'column',
                  transition: 'transform 0.2s, box-shadow 0.2s',
                  '&:hover': {
                    transform: 'translateY(-4px)',
                    boxShadow: 3
                  }
                }}
              >
                <CardContent sx={{ flexGrow: 1, textAlign: 'center', p: 3 }}>
                  <Box mb={2}>
                    {section.icon}
                  </Box>
                  <Typography variant="h5" component="h3" gutterBottom>
                    {section.title}
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    {section.description}
                  </Typography>
                </CardContent>
                <CardActions sx={{ justifyContent: 'center', pb: 2 }}>
                  <Button 
                    variant="contained" 
                    color={section.color}
                    onClick={() => navigate(section.path)}
                    size="large"
                  >
                    Öffnen
                  </Button>
                </CardActions>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Box>
    </Container>
  );
};

export default AdminDashboard;