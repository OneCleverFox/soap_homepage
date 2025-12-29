import React from 'react';
import { useResponsiveComponent } from '../hooks/useResponsiveLayout';

/**
 * Generische Responsive Page Component Factory
 * Erstellt eine responsive Komponente basierend auf Desktop/Mobile Components
 */
const createResponsivePage = (DesktopComponent, MobileComponent, breakpoint = 'md') => {
  const ResponsivePage = () => {
    const SelectedComponent = useResponsiveComponent(DesktopComponent, MobileComponent, breakpoint);
    return <SelectedComponent />;
  };
  
  // Display name für besseres Debugging
  ResponsivePage.displayName = `ResponsivePage(${DesktopComponent.displayName || DesktopComponent.name}, ${MobileComponent.displayName || MobileComponent.name})`;
  
  return ResponsivePage;
};

export default createResponsivePage;