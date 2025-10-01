import { createTheme } from '@mui/material/styles';

const theme = createTheme({
  palette: {
    primary: {
      main: '#8B4B61', // Warmes Mauve/Rose
      light: '#B17A89',
      dark: '#5D3242',
      contrastText: '#ffffff',
    },
    secondary: {
      main: '#E8D5B7', // Warmes Beige
      light: '#F5EEDD',
      dark: '#D4B895',
      contrastText: '#5D3242',
    },
    accent: {
      main: '#A8D5B5', // Sanftes Grün für Natur-Aspekt
      light: '#C8E6D0',
      dark: '#7FB88A',
    },
    background: {
      default: '#FEFDFB', // Sehr warmes Weiß
      paper: '#FFFFFF',
    },
    text: {
      primary: '#2C2C2C',
      secondary: '#5D3242',
    },
    error: {
      main: '#D32F2F',
    },
    warning: {
      main: '#FF9800',
    },
    info: {
      main: '#2196F3',
    },
    success: {
      main: '#4CAF50',
    },
  },
  typography: {
    fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
    h1: {
      fontFamily: '"Playfair Display", serif',
      fontWeight: 600,
      fontSize: '3.5rem',
      lineHeight: 1.2,
      color: '#2C2C2C',
    },
    h2: {
      fontFamily: '"Playfair Display", serif',
      fontWeight: 600,
      fontSize: '2.75rem',
      lineHeight: 1.3,
      color: '#2C2C2C',
    },
    h3: {
      fontFamily: '"Playfair Display", serif',
      fontWeight: 500,
      fontSize: '2.2rem',
      lineHeight: 1.3,
      color: '#2C2C2C',
    },
    h4: {
      fontFamily: '"Playfair Display", serif',
      fontWeight: 500,
      fontSize: '1.75rem',
      lineHeight: 1.4,
      color: '#2C2C2C',
    },
    h5: {
      fontWeight: 600,
      fontSize: '1.25rem',
      lineHeight: 1.4,
      color: '#2C2C2C',
    },
    h6: {
      fontWeight: 600,
      fontSize: '1.1rem',
      lineHeight: 1.4,
      color: '#2C2C2C',
    },
    body1: {
      fontSize: '1rem',
      lineHeight: 1.6,
      color: '#2C2C2C',
    },
    body2: {
      fontSize: '0.875rem',
      lineHeight: 1.6,
      color: '#5D3242',
    },
    button: {
      textTransform: 'none',
      fontWeight: 500,
    },
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          padding: '10px 24px',
          fontSize: '1rem',
          fontWeight: 500,
          textTransform: 'none',
          boxShadow: 'none',
          '&:hover': {
            boxShadow: '0 4px 12px rgba(139, 75, 97, 0.15)',
          },
        },
        contained: {
          background: 'linear-gradient(45deg, #8B4B61 30%, #B17A89 90%)',
          '&:hover': {
            background: 'linear-gradient(45deg, #5D3242 30%, #8B4B61 90%)',
          },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          boxShadow: '0 2px 16px rgba(0, 0, 0, 0.08)',
          '&:hover': {
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.12)',
            transform: 'translateY(-2px)',
            transition: 'all 0.3s ease-in-out',
          },
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            borderRadius: 8,
            '&:hover .MuiOutlinedInput-notchedOutline': {
              borderColor: '#8B4B61',
            },
            '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
              borderColor: '#8B4B61',
            },
          },
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: 6,
        },
      },
    },
  },
  breakpoints: {
    values: {
      xs: 0,
      sm: 600,
      md: 900,
      lg: 1200,
      xl: 1536,
    },
  },
  spacing: 8,
});

// Custom theme additions
theme.palette.accent = {
  main: '#A8D5B5',
  light: '#C8E6D0',
  dark: '#7FB88A',
};

export default theme;