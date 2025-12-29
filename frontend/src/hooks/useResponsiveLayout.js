import { useMediaQuery, useTheme } from '@mui/material';

/**
 * Custom hook für responsive Layout-Entscheidungen
 * @param {string} breakpoint - Der Breakpoint für Mobile-Ansicht (default: 'md')
 * @returns {boolean} isMobile - True wenn Mobile-Ansicht aktiv ist
 */
export const useResponsiveLayout = (breakpoint = 'md') => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down(breakpoint));
  
  return isMobile;
};

/**
 * Generische Hook für Responsive Component Selection
 * @param {React.Component} DesktopComponent - Komponente für Desktop-Ansicht
 * @param {React.Component} MobileComponent - Komponente für Mobile-Ansicht
 * @param {string} breakpoint - Breakpoint für Umschaltung (default: 'md')
 * @returns {React.Component} Entsprechende Komponente basierend auf Screen-Size
 */
export const useResponsiveComponent = (DesktopComponent, MobileComponent, breakpoint = 'md') => {
  const isMobile = useResponsiveLayout(breakpoint);
  return isMobile ? MobileComponent : DesktopComponent;
};

export default useResponsiveLayout;