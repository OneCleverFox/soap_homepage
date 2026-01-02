import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import {
  AppBar,
  Toolbar,
  Typography,
  Box,
  Button,
  IconButton,
  Menu,
  MenuItem,
  Badge,
  Drawer,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  ListItemButton,
  Divider,
  useTheme,
  useMediaQuery
} from '@mui/material';
import { useAuth } from '../../contexts/AuthContext';
import { useCart } from '../../contexts/CartContext';
import api from '../../services/api';
import { ordersAPI } from '../../services/api';
import cookieManager from '../../utils/cookieManager';

const Navbar = () => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [accountMenu, setAccountMenu] = useState(null);
  const [infoMenu, setInfoMenu] = useState(null);
  const [adminMenu, setAdminMenu] = useState(null);
  
  // Badge-Zähler für Handlungsbedarf
  const [pendingInquiries, setPendingInquiries] = useState(0);
  const [pendingOrders, setPendingOrders] = useState(0);
  
  const { user, logout } = useAuth();
  const { getCartItemsCount } = useCart();
  const navigate = useNavigate();
  const location = useLocation();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const cartItemsCount = getCartItemsCount();

  // Handlungsbedarf für Anfragen laden
  const loadPendingInquiries = async () => {
    if (!user) return;
    
    try {
      const response = await api.get('/inquiries');
      if (response.data.success) {
        const inquiries = response.data.data;
        
        // Admin vs Kunde Logik
        const isAdmin = user.rolle === 'admin' || user.role === 'admin' || user.permissions?.includes('admin');
        
        if (isAdmin) {
          // Admin: Zähle neue, unbearbeitete Anfragen mit lastViewed-System
          const lastViewedKey = 'admin_inquiries_last_viewed';
          const lastViewed = cookieManager.getItem(lastViewedKey, 'optional');
          const lastViewedDate = lastViewed ? new Date(lastViewed) : new Date(0);
          
          // Nur Anfragen zählen, die nach dem letzten Besuch eingegangen sind
          const newInquiries = inquiries.filter(inquiry => {
            const status = inquiry.status?.toLowerCase();
            const createdAt = new Date(inquiry.createdAt);
            return (status === 'pending' || !status) && createdAt > lastViewedDate;
          });
          
          setPendingInquiries(newInquiries.length);
          
          if (process.env.NODE_ENV === 'development') {
            console.log(`👑 Admin: ${newInquiries.length} neue Anfragen seit ${lastViewedDate.toLocaleString()}`);
          }
        } else {
          // Kunde: Zähle Antworten auf eigene Anfragen
          const lastViewedKey = `inquiries_last_viewed_${user.id || user.userId}`;
          const lastViewed = cookieManager.getItem(lastViewedKey, 'optional');
          const lastViewedDate = lastViewed ? new Date(lastViewed) : new Date(0);
          
          // Ungesehene Benachrichtigungen zählen - erweiterte Status-Liste
          const unseenNotifications = inquiries.filter(inquiry => {
            const status = inquiry.status?.toLowerCase();
            const updatedAt = new Date(inquiry.updatedAt || inquiry.createdAt);
            
            // Zähle alle Status-Änderungen als wichtige Benachrichtigungen
            const isImportantStatus = [
              'accepted',          // Anfrage angenommen
              'abgelehnt', 
              'rejected',          // Anfrage abgelehnt
              'converted_to_order', // Als Bestellung umgewandelt
              'payment_pending',    // Zahlung ausstehend
              'paid',              // Bezahlt
              'shipped',           // Versandt
              'delivered'          // Geliefert
            ].includes(status);
            
            // Nur Status-Änderungen nach dem letzten Besuch zählen
            return isImportantStatus && updatedAt > lastViewedDate;
          });
        
          setPendingInquiries(unseenNotifications.length);
          
          if (process.env.NODE_ENV === 'development') {
            console.log(`📋 Ungesehene Anfragen-Updates: ${unseenNotifications.length}`);
            console.log(`📅 Letzter Besuch: ${lastViewedDate.toLocaleString()}`);
            console.log('🔍 Updates:', unseenNotifications.map(i => `${i.inquiryId}: ${i.status}`));
          }
        }
      }
    } catch (error) {
      // Fehler beim Laden der Badges - setze auf 0 und logge nur in Development
      setPendingInquiries(0);
      if (process.env.NODE_ENV === 'development') {
        console.warn('Fehler beim Laden der Anfragen-Badges:', error.response?.status, error.response?.statusText);
      }
    }
  };

  // Handlungsbedarf für Bestellungen laden
  const loadPendingOrders = async () => {
    if (!user) return;
    
    try {
      const result = await ordersAPI.getCustomerOrders({ limit: 100 });
      if (result.success) {
        const isAdmin = user.rolle === 'admin' || user.role === 'admin' || user.permissions?.includes('admin');
        
        if (isAdmin) {
          // Admin: Zähle Bestellungen die Aufmerksamkeit benötigen
          const needsAttention = result.data.bestellungen.filter(order => {
            const paymentStatus = order.zahlung?.status?.toLowerCase();
            const orderStatus = order.status?.toLowerCase();
            
            // Bestellungen die Handlungsbedarf haben
            return orderStatus === 'neu' || 
                   orderStatus === 'pending' ||
                   paymentStatus === 'failed';
          });
          setPendingOrders(needsAttention.length);
        } else {
          // Kunde: Bestellungs-Updates seit letztem Besuch
          const lastViewedKey = `orders_last_viewed_${user.id || user.userId}`;
          const lastViewed = cookieManager.getItem(lastViewedKey, 'optional');
          const lastViewedDate = lastViewed ? new Date(lastViewed) : new Date(0);
          
          const updatedOrders = result.data.bestellungen.filter(order => {
            const updatedAt = new Date(order.updatedAt || order.createdAt);
            const orderStatus = order.status?.toLowerCase();
            const paymentStatus = order.zahlung?.status?.toLowerCase();
            
            // Status-Änderungen die für Kunden wichtig sind
            const hasImportantUpdate = [
              'bestätigt', 'confirmed',       // Bestellung bestätigt
              'in_bearbeitung', 'processing', // In Bearbeitung
              'versandt', 'shipped',          // Versandt
              'geliefert', 'delivered',       // Geliefert
              'storniert', 'cancelled'        // Storniert
            ].includes(orderStatus) ||
            [
              'bezahlt', 'paid', 'completed', // Zahlung eingegangen
              'failed', 'fehlgeschlagen'      // Zahlung fehlgeschlagen
            ].includes(paymentStatus);
            
            return hasImportantUpdate && updatedAt > lastViewedDate;
          });
          
          setPendingOrders(updatedOrders.length);
          
          if (process.env.NODE_ENV === 'development') {
            console.log(`📦 Ungesehene Bestellungs-Updates: ${updatedOrders.length}`);
            console.log('🔍 Updates:', updatedOrders.map(o => `${o.bestellnummer}: ${o.status} | Zahlung: ${o.zahlung?.status}`));
          }
        }
      }
    } catch (error) {
      console.error('Fehler beim Laden der Bestellungen-Badges:', error);
    }
  };

  // Badges laden wenn User eingeloggt ist
  useEffect(() => {
    if (user) {
      loadPendingInquiries();
      loadPendingOrders();
    } else {
      setPendingInquiries(0);
      setPendingOrders(0);
    }
    
    // Event-Listener für Anfragen-Seite besucht
    const handleInquiriesViewed = () => {
      if (user) {
        loadPendingInquiries(); // Badges neu laden wenn Anfragen angesehen wurden
      }
    };
    
    // Event-Listener für Admin-Anfragen-Seite besucht
    const handleAdminInquiriesViewed = () => {
      if (user && (user.rolle === 'admin' || user.role === 'admin' || user.permissions?.includes('admin'))) {
        const lastViewedKey = 'admin_inquiries_last_viewed';
        localStorage.setItem(lastViewedKey, new Date().toISOString());
        loadPendingInquiries(); // Badges neu laden
        
        if (process.env.NODE_ENV === 'development') {
          console.log('👑 Admin-Anfrage bearbeitet - Badge zurückgesetzt');
        }
      }
    };
    
    // Event-Listener für wirkliche Anfragen-Aktionen (nicht nur Seitenbesuch)
    const handleInquiryAction = () => {
      if (user && (user.rolle === 'admin' || user.role === 'admin' || user.permissions?.includes('admin'))) {
        const lastViewedKey = 'admin_inquiries_last_viewed';
        cookieManager.setItem(lastViewedKey, new Date().toISOString(), 'optional');
        loadPendingInquiries();
        
        if (process.env.NODE_ENV === 'development') {
          console.log('👑 Admin-Anfrage-Aktion durchgeführt - Badge zurückgesetzt');
        }
      }
    };
    
    // Event-Listener für Bestellungen-Seite besucht (Kunde)
    const handleOrdersViewed = () => {
      if (user && !(user.rolle === 'admin' || user.role === 'admin' || user.permissions?.includes('admin'))) {
        const lastViewedKey = `orders_last_viewed_${user.id || user.userId}`;
        cookieManager.setItem(lastViewedKey, new Date().toISOString(), 'optional');
        loadPendingOrders(); // Badges neu laden
        
        if (process.env.NODE_ENV === 'development') {
          console.log('📦 Kunden-Bestellungen-Seite besucht - lastViewed aktualisiert');
        }
      }
    };
    
    window.addEventListener('inquiriesViewed', handleInquiriesViewed);
    window.addEventListener('adminInquiriesViewed', handleAdminInquiriesViewed);
    window.addEventListener('ordersViewed', handleOrdersViewed);
    window.addEventListener('inquiryViewed', handleInquiryAction);
    window.addEventListener('inquiryActioned', handleInquiryAction);
    
    return () => {
      window.removeEventListener('inquiriesViewed', handleInquiriesViewed);
      window.removeEventListener('adminInquiriesViewed', handleAdminInquiriesViewed);
      window.removeEventListener('ordersViewed', handleOrdersViewed);
      window.removeEventListener('inquiryViewed', handleInquiryAction);
      window.removeEventListener('inquiryActioned', handleInquiryAction);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]); // Nur von user abhängig - Funktionen werden bewusst nicht als Dependency hinzugefügt

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const handleAccountMenu = (event) => {
    setAccountMenu(event.currentTarget);
  };

  const handleInfoMenu = (event) => {
    setInfoMenu(event.currentTarget);
  };

  const handleAdminMenu = (event) => {
    setAdminMenu(event.currentTarget);
  };

  const handleCloseAccountMenu = () => {
    setAccountMenu(null);
  };

  const handleCloseInfoMenu = () => {
    setInfoMenu(null);
  };

  const handleCloseAdminMenu = () => {
    setAdminMenu(null);
  };

  const handleLogout = () => {
    logout();
    handleCloseAccountMenu();
    navigate('/');
  };

  const isActive = (path) => location.pathname === path;

  const mainNavItems = [
    { label: 'Home', path: '/', icon: '🏠' },
    { label: 'Produkte', path: '/products', icon: '🛍️' },
    { label: 'Das sind wir', path: '/about', icon: 'ℹ️' },
    { label: 'Kontakt', path: '/contact', icon: '📧' }
  ];

  const legalNavItems = [
    { label: 'Impressum', path: '/impressum', icon: '📄' },
    { label: 'Datenschutz', path: '/datenschutz', icon: '🔒' },
    { label: 'AGB', path: '/agb', icon: '⚖️' },
    { label: 'Widerrufsrecht', path: '/widerrufsrecht', icon: '↩️' }
  ];

  const adminNavItems = [
    { label: 'Dashboard', path: '/admin/dashboard', icon: '📊' },
    { label: 'Portfolio-Verwaltung', path: '/admin/portfolio', icon: '🎨' },
    { label: 'Mein Warenkorb', path: '/admin/warenkorb', icon: '🛒' },
    { label: 'Rohstoffe', path: '/admin/rohstoffe', icon: '📦' },
    { label: 'Bestellverwaltung', path: '/admin/bestellungen', icon: '📋' },
    { label: 'Anfragen-Verwaltung', path: '/admin/anfragen', icon: '📨' },
    { label: 'Lager', path: '/admin/lager', icon: '🏪' },
    { label: 'Benutzer', path: '/admin/benutzer', icon: '👥' },
    { label: 'Warenberechnung', path: '/admin/warenberechnung', icon: '📈' },
    { label: 'Rechnung erstellen', path: '/admin/create-invoice', icon: '📄' },
    { label: 'Rechnungen verwalten', path: '/admin/invoice-list', icon: '🧾' },
    { label: 'Rechnungskonfiguration', path: '/admin/rechnungen', icon: '⚙️' },
    { label: 'E-Mail-Verwaltung', path: '/admin/email-tests', icon: '📧' },
    { label: 'System-Einstellungen', path: '/admin/einstellungen', icon: '🔧' }
  ];

  const drawer = (
    <Box sx={{ width: 250 }}>
      <Box sx={{ p: 2, bgcolor: 'primary.main', color: 'white' }}>
        <Typography variant="h6" component="div">
          Glücksmomente
        </Typography>
        <Typography variant="body2" sx={{ opacity: 0.8 }}>
          Manufaktur
        </Typography>
      </Box>
      
      <List>
        {mainNavItems.map((item) => (
          <ListItemButton 
            key={item.path}
            component={Link}
            to={item.path}
            selected={isActive(item.path)}
            onClick={() => setMobileOpen(false)}
          >
            <ListItemIcon>
              {item.icon}
            </ListItemIcon>
            <ListItemText primary={item.label} />
          </ListItemButton>
        ))}
      </List>

      <Divider />

      <List>
        <ListItem>
          <ListItemText 
            primary="Rechtliches" 
            primaryTypographyProps={{ 
              variant: 'subtitle2', 
              color: 'text.secondary' 
            }} 
          />
        </ListItem>
        {legalNavItems.map((item) => (
          <ListItemButton 
            key={item.path}
            component={Link}
            to={item.path}
            selected={isActive(item.path)}
            onClick={() => setMobileOpen(false)}
            sx={{ pl: 3 }}
          >
            <ListItemIcon sx={{ minWidth: 36 }}>
              {item.icon}
            </ListItemIcon>
            <ListItemText primary={item.label} />
          </ListItemButton>
        ))}
      </List>

      <Divider />

      <List>
        {user ? (
          <>
            <ListItemButton onClick={() => { setMobileOpen(false); navigate('/profile'); }}>
              <ListItemIcon>
                <Badge 
                  badgeContent={pendingInquiries + pendingOrders} 
                  color="warning"
                  invisible={pendingInquiries + pendingOrders === 0}
                  sx={{
                    '& .MuiBadge-badge': {
                      fontSize: '0.6rem',
                      minWidth: '16px',
                      height: '16px'
                    }
                  }}
                >
                  👤
                </Badge>
              </ListItemIcon>
              <ListItemText primary={`Hallo, ${user.name}`} />
            </ListItemButton>
            
            {/* Admin-Bereiche für Mobile */}
            {(user.rolle === 'admin' || user.role === 'admin') && (
              <>
                <Divider />
                <ListItem>
                  <ListItemText 
                    primary="Admin-Bereiche" 
                    primaryTypographyProps={{ 
                      variant: 'subtitle2', 
                      color: 'primary.main',
                      fontWeight: 'bold'
                    }} 
                  />
                </ListItem>
                {adminNavItems.map((item) => (
                  <ListItemButton 
                    key={item.path}
                    component={Link}
                    to={item.path}
                    selected={isActive(item.path)}
                    onClick={() => setMobileOpen(false)}
                    sx={{ pl: 3 }}
                  >
                    <ListItemIcon sx={{ minWidth: 36 }}>
                      {item.icon}
                    </ListItemIcon>
                    <ListItemText primary={item.label} />
                  </ListItemButton>
                ))}
                <Divider />
              </>
            )}
            
            <ListItemButton onClick={() => { setMobileOpen(false); handleLogout(); }}>
              <ListItemIcon>
                🚪
              </ListItemIcon>
              <ListItemText primary="Abmelden" />
            </ListItemButton>
          </>
        ) : (
          <ListItemButton onClick={() => { setMobileOpen(false); navigate('/login'); }}>
            <ListItemIcon>
              🔑
            </ListItemIcon>
            <ListItemText primary="Anmelden" />
          </ListItemButton>
        )}
      </List>
    </Box>
  );

  return (
    <>
      <AppBar position="sticky" elevation={1}>
        <Toolbar>
          {/* Mobile Menu Button */}
          {isMobile && (
            <IconButton
              color="inherit"
              edge="start"
              onClick={handleDrawerToggle}
              sx={{ mr: 2 }}
            >
              ☰
            </IconButton>
          )}

          {/* Logo */}
          <Typography 
            variant="h6" 
            component={Link}
            to="/"
            sx={{ 
              flexGrow: 1,
              textDecoration: 'none',
              color: 'inherit',
              fontWeight: 'bold'
            }}
          >
            Glücksmomente
          </Typography>

          {/* Desktop Navigation */}
          {!isMobile && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              {mainNavItems.map((item) => (
                <Button
                  key={item.path}
                  component={Link}
                  to={item.path}
                  color="inherit"
                  sx={{
                    textTransform: 'none',
                    fontWeight: isActive(item.path) ? 'bold' : 'normal',
                    bgcolor: isActive(item.path) ? 'rgba(255,255,255,0.1)' : 'transparent'
                  }}
                >
                  {item.label}
                </Button>
              ))}

              {/* Info Dropdown */}
              <Button
                color="inherit"
                onClick={handleInfoMenu}
                sx={{ textTransform: 'none' }}
              >
                Rechtliches
              </Button>
              <Menu
                anchorEl={infoMenu}
                open={Boolean(infoMenu)}
                onClose={handleCloseInfoMenu}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                transformOrigin={{ vertical: 'top', horizontal: 'right' }}
              >
                {legalNavItems.map((item) => (
                  <MenuItem
                    key={item.path}
                    component={Link}
                    to={item.path}
                    onClick={handleCloseInfoMenu}
                  >
                    <ListItemIcon sx={{ minWidth: 36 }}>
                      {item.icon}
                    </ListItemIcon>
                    {item.label}
                  </MenuItem>
                ))}
              </Menu>

              {/* Admin Dropdown - nur sichtbar wenn Admin eingeloggt */}
              {user && (user.rolle === 'admin' || user.role === 'admin') && (
                <>
                  <Button
                    color="inherit"
                    onClick={handleAdminMenu}
                    sx={{ 
                      textTransform: 'none',
                      bgcolor: 'rgba(255,255,255,0.1)',
                      ml: 1
                    }}
                  >
                    ⚙️ Admin
                  </Button>
                  <Menu
                    anchorEl={adminMenu}
                    open={Boolean(adminMenu)}
                    onClose={handleCloseAdminMenu}
                    anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                    transformOrigin={{ vertical: 'top', horizontal: 'right' }}
                    PaperProps={{
                      sx: { minWidth: 200 }
                    }}
                  >
                    {adminNavItems.map((item) => (
                      <MenuItem
                        key={item.path}
                        component={Link}
                        to={item.path}
                        onClick={handleCloseAdminMenu}
                        selected={isActive(item.path)}
                      >
                        <ListItemIcon sx={{ minWidth: 36 }}>
                          {item.path === '/admin/anfragen' && pendingInquiries > 0 ? (
                            <Badge 
                              badgeContent={pendingInquiries} 
                              color="error"
                              sx={{
                                '& .MuiBadge-badge': {
                                  fontSize: '0.7rem',
                                  minWidth: '18px',
                                  height: '18px'
                                }
                              }}
                            >
                              {item.icon}
                            </Badge>
                          ) : (
                            item.icon
                          )}
                        </ListItemIcon>
                        {item.label}
                      </MenuItem>
                    ))}
                  </Menu>
                </>
              )}
            </Box>
          )}

          {/* Right side buttons */}
          <Box sx={{ display: 'flex', alignItems: 'center', ml: 2 }}>
            {/* Shopping Cart - für alle angemeldeten Benutzer */}
            {user && (
              <IconButton 
                color="inherit" 
                component={Link} 
                to={user.role === 'admin' ? "/admin/warenkorb" : "/cart"}
                title={user.role === 'admin' ? "Admin Warenkorb" : "Warenkorb"}
              >
                <Badge badgeContent={cartItemsCount} color="secondary">
                  🛒
                </Badge>
              </IconButton>
            )}

            {/* User Account */}
            {user ? (
              <>
                <IconButton
                  color="inherit"
                  onClick={handleAccountMenu}
                >
                  <Badge 
                    badgeContent={pendingInquiries + pendingOrders} 
                    color="warning"
                    invisible={pendingInquiries + pendingOrders === 0}
                    sx={{
                      '& .MuiBadge-badge': {
                        fontSize: '0.65rem',
                        minWidth: '18px',
                        height: '18px'
                      }
                    }}
                  >
                    👤
                  </Badge>
                </IconButton>
                <Menu
                  anchorEl={accountMenu}
                  open={Boolean(accountMenu)}
                  onClose={handleCloseAccountMenu}
                  anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                  transformOrigin={{ vertical: 'top', horizontal: 'right' }}
                >
                  <MenuItem disabled>
                    <Typography variant="subtitle2">
                      Hallo, {user.name}
                    </Typography>
                  </MenuItem>
                  <Divider />
                  <MenuItem component={Link} to="/profile" onClick={handleCloseAccountMenu}>
                    <ListItemIcon>
                      👤
                    </ListItemIcon>
                    Mein Profil
                  </MenuItem>
                  
                  <MenuItem component={Link} to="/inquiries" onClick={handleCloseAccountMenu}>
                    <ListItemIcon>
                      📋
                    </ListItemIcon>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      Meine Anfragen
                      {pendingInquiries > 0 && (
                        <Badge 
                          badgeContent={pendingInquiries} 
                          color="warning"
                          sx={{
                            '& .MuiBadge-badge': {
                              fontSize: '0.6rem',
                              minWidth: '16px',
                              height: '16px'
                            }
                          }}
                        >
                          <Box sx={{ width: 8 }} />
                        </Badge>
                      )}
                    </Box>
                  </MenuItem>

                  <MenuItem component={Link} to="/my-orders" onClick={handleCloseAccountMenu}>
                    <ListItemIcon>
                      🧾
                    </ListItemIcon>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      Meine Bestellungen
                      {pendingOrders > 0 && (
                        <Badge 
                          badgeContent={pendingOrders} 
                          color="warning"
                          sx={{
                            '& .MuiBadge-badge': {
                              fontSize: '0.6rem',
                              minWidth: '16px',
                              height: '16px'
                            }
                          }}
                        >
                          <Box sx={{ width: 8 }} />
                        </Badge>
                      )}
                    </Box>
                  </MenuItem>

                  <Divider />
                  <MenuItem onClick={handleLogout}>
                    <ListItemIcon>
                      🚪
                    </ListItemIcon>
                    Abmelden
                  </MenuItem>
                </Menu>
              </>
            ) : (
              <Button 
                color="inherit" 
                component={Link} 
                to="/login"
                sx={{ textTransform: 'none' }}
              >
                🔑 Anmelden
              </Button>
            )}
          </Box>
        </Toolbar>
      </AppBar>

      {/* Mobile Drawer */}
      <Drawer
        variant="temporary"
        anchor="left"
        open={mobileOpen}
        onClose={handleDrawerToggle}
        ModalProps={{ keepMounted: true }}
      >
        {drawer}
      </Drawer>
    </>
  );
};

export default Navbar;