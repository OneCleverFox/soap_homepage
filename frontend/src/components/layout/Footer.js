import React from 'react';
import { Link } from 'react-router-dom';
import { 
  Box, 
  Typography, 
  Container,
  Grid,
  IconButton,
  Divider,
  useMediaQuery,
  useTheme
} from '@mui/material';
import { useCompanyInfo } from '../../hooks/useCompanyInfo';

const Footer = () => {
  const { companyInfo, loading } = useCompanyInfo();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  
  // Fallback-Daten falls API noch lädt oder fehlschlägt
  const name = companyInfo.name || 'Glücksmomente Manufaktur';
  const email = companyInfo.contact?.email || 'info@gluecksmomente-manufaktur.de';
  const phone = companyInfo.contact?.phone || '+49 123 456789';
  
  const footerLinks = {
    shop: [
      { label: 'Alle Produkte', path: '/products' },
      { label: 'Warenkorb', path: '/cart' },
      { label: 'Bestellverfolgung', path: '/order-tracking' }
    ],
    company: [
      { label: 'Das sind wir', path: '/about' },
      { label: 'Kontakt', path: '/contact' }
    ],
    legal: [
      { label: 'Impressum', path: '/impressum' },
      { label: 'Datenschutz', path: '/datenschutz' },
      { label: 'AGB', path: '/agb' },
      { label: 'Widerrufsrecht', path: '/widerrufsrecht' }
    ]
  };

  const socialLinks = [
    //{ icon: 'f', url: 'https://facebook.com/gluecksmomente', label: 'Facebook' },
    { icon: '📷', url: 'https://www.instagram.com/gluecksmomente_manufaktur/', label: 'Instagram' }
    //{ icon: '🐦', url: 'https://twitter.com/gluecksmomente', label: 'Twitter' }
  ];

  return (
    <Box 
      component="footer" 
      sx={{ 
        bgcolor: 'primary.main', 
        color: 'white', 
        mt: 'auto',
        pt: 4,
        pb: 2
      }}
    >
      <Container maxWidth="lg">
        <Grid container spacing={4}>
          {/* Company Info */}
          <Grid item xs={12} md={4}>
            <Typography variant="h6" gutterBottom sx={{ fontWeight: 'bold' }}>
              {name || 'Glücksmomente Manufaktur'}
            </Typography>
            <Typography variant="body2" paragraph sx={{ opacity: 0.9 }}>
              Handgefertigte Unikate für besondere Momente. 
              Jedes Produkt wird mit Liebe und Sorgfalt in unserer 
              kleinen Manufaktur hergestellt.
            </Typography>
            
            {/* Contact Info */}
            <Box sx={{ mt: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <span style={{ marginRight: 8, fontSize: 16 }}>📧</span>
                <Typography variant="body2">
                  {email || 'info@gluecksmomente-manufaktur.de'}
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <span style={{ marginRight: 8, fontSize: 16 }}>📞</span>
                <Typography variant="body2">
                  {phone || '+49 (0) 123 456789'}
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <span style={{ marginRight: 8, fontSize: 16 }}>📍</span>
                <Typography variant="body2">
                  Deutschland
                </Typography>
              </Box>
            </Box>
          </Grid>

          {/* Shop Links */}
          <Grid item xs={12} sm={6} md={2}>
            <Typography variant="h6" gutterBottom sx={{ fontWeight: 'bold' }}>
              Shop
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              {footerLinks.shop.map((link) => (
                <Typography
                  key={link.path}
                  component={Link}
                  to={link.path}
                  variant="body2"
                  sx={{
                    color: 'inherit',
                    textDecoration: 'none',
                    opacity: 0.9,
                    '&:hover': {
                      opacity: 1,
                      textDecoration: 'underline'
                    }
                  }}
                >
                  {link.label}
                </Typography>
              ))}
            </Box>
          </Grid>

          {/* Company Links */}
          <Grid item xs={12} sm={6} md={2}>
            <Typography variant="h6" gutterBottom sx={{ fontWeight: 'bold' }}>
              Unternehmen
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              {footerLinks.company.map((link) => (
                <Typography
                  key={link.path}
                  component={Link}
                  to={link.path}
                  variant="body2"
                  sx={{
                    color: 'inherit',
                    textDecoration: 'none',
                    opacity: 0.9,
                    '&:hover': {
                      opacity: 1,
                      textDecoration: 'underline'
                    }
                  }}
                >
                  {link.label}
                </Typography>
              ))}
            </Box>
          </Grid>

          {/* Legal Links */}
          <Grid item xs={12} sm={6} md={2}>
            <Typography variant="h6" gutterBottom sx={{ fontWeight: 'bold' }}>
              Rechtliches
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              {footerLinks.legal.map((link) => (
                <Typography
                  key={link.path}
                  component={Link}
                  to={link.path}
                  variant="body2"
                  sx={{
                    color: 'inherit',
                    textDecoration: 'none',
                    opacity: 0.9,
                    '&:hover': {
                      opacity: 1,
                      textDecoration: 'underline'
                    }
                  }}
                >
                  {link.label}
                </Typography>
              ))}
            </Box>
          </Grid>

          {/* Social Media */}
          <Grid item xs={12} sm={6} md={2}>
            <Typography variant="h6" gutterBottom sx={{ fontWeight: 'bold' }}>
              Folgen Sie uns
            </Typography>
            <Box sx={{ display: 'flex', gap: 1 }}>
              {socialLinks.map((social) => (
                <IconButton
                  key={social.label}
                  component="a"
                  href={social.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  sx={{
                    color: 'white',
                    opacity: 0.9,
                    '&:hover': {
                      opacity: 1,
                      transform: 'translateY(-2px)'
                    }
                  }}
                  aria-label={social.label}
                >
                  {social.icon}
                </IconButton>
              ))}
            </Box>
          </Grid>
        </Grid>

        <Divider sx={{ my: 3, borderColor: 'rgba(255,255,255,0.2)' }} />

        {/* Bottom Section */}
        <Box 
          sx={{ 
            display: 'flex', 
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: 2
          }}
        >
          <Typography variant="body2" sx={{ opacity: 0.8 }}>
            © 2025 {name || 'Glücksmomente Manufaktur'}. Alle Rechte vorbehalten.
          </Typography>
          
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
            <Typography
              component={Link}
              to="/impressum"
              variant="body2"
              sx={{
                color: 'inherit',
                textDecoration: 'none',
                opacity: 0.8,
                '&:hover': { opacity: 1 }
              }}
            >
              Impressum
            </Typography>
            <Typography
              component={Link}
              to="/datenschutz"
              variant="body2"
              sx={{
                color: 'inherit',
                textDecoration: 'none',
                opacity: 0.8,
                '&:hover': { opacity: 1 }
              }}
            >
              Datenschutz
            </Typography>
            <Typography
              component={Link}
              to="/agb"
              variant="body2"
              sx={{
                color: 'inherit',
                textDecoration: 'none',
                opacity: 0.8,
                '&:hover': { opacity: 1 }
              }}
            >
              AGB
            </Typography>
          </Box>
        </Box>
      </Container>
    </Box>
  );
};

export default Footer;