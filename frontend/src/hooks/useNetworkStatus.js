import { useState, useEffect } from 'react';

// Hook für Network-Status-Monitoring
export const useNetworkStatus = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [connectionType, setConnectionType] = useState('unknown');
  const [effectiveType, setEffectiveType] = useState('unknown');

  useEffect(() => {
    const updateNetworkStatus = () => {
      setIsOnline(navigator.onLine);
      
      // Verbindungstyp ermitteln (falls unterstützt)
      if ('connection' in navigator) {
        const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
        if (connection) {
          setConnectionType(connection.type || 'unknown');
          setEffectiveType(connection.effectiveType || 'unknown');
        }
      }
    };

    const handleOnline = () => {
      setIsOnline(true);
      console.log('🌐 Network: Online');
    };

    const handleOffline = () => {
      setIsOnline(false);
      console.log('🌐 Network: Offline');
    };

    // Initial check
    updateNetworkStatus();

    // Event listeners
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Connection change listener (falls unterstützt)
    if ('connection' in navigator) {
      const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
      if (connection) {
        connection.addEventListener('change', updateNetworkStatus);
        
        return () => {
          window.removeEventListener('online', handleOnline);
          window.removeEventListener('offline', handleOffline);
          connection.removeEventListener('change', updateNetworkStatus);
        };
      }
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const isSlowConnection = () => {
    return effectiveType === 'slow-2g' || effectiveType === '2g' || effectiveType === '3g';
  };

  return {
    isOnline,
    connectionType,
    effectiveType,
    isSlowConnection: isSlowConnection()
  };
};