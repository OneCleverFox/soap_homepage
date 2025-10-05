import React, { useState } from 'react';
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

const Navbar = () => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [accountMenu, setAccountMenu] = useState(null);
  const [infoMenu, setInfoMenu] = useState(null);
  const [adminMenu, setAdminMenu] = useState(null);
  
  const { user, logout } = useAuth();
  const { getCartItemsCount } = useCart();
  const navigate = useNavigate();
  const location = useLocation();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const cartItemsCount = getCartItemsCount();

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
    { label: 'AGB', path: '/agb', icon: '⚖️' }
  ];

  const adminNavItems = [
    { label: 'Dashboard', path: '/admin/dashboard', icon: '📊' },
    { label: 'Portfolio-Verwaltung', path: '/admin/portfolio', icon: '🎨' },
    { label: 'Rohstoffe', path: '/admin/rohstoffe', icon: '📦' },
    { label: 'Bestellungen', path: '/admin/bestellungen', icon: '🛒' },
    { label: 'Lager', path: '/admin/lager', icon: '📋' },
    { label: 'Benutzer', path: '/admin/benutzer', icon: '👥' },
    { label: 'Warenberechnung', path: '/admin/warenberechnung', icon: '📈' }
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
                👤
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
                          {item.icon}
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
            {/* Shopping Cart - nur für Kunden (nicht für Admins) */}
            {user && user.role !== 'admin' && (
              <IconButton 
                color="inherit" 
                component={Link} 
                to="/cart"
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
                  👤
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
                  {(user.rolle === 'admin' || user.role === 'admin') && (
                    <MenuItem component={Link} to="/admin" onClick={handleCloseAccountMenu}>
                      <ListItemIcon>
                        ⚙️
                      </ListItemIcon>
                      Admin Panel
                    </MenuItem>
                  )}
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