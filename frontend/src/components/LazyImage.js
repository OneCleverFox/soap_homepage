import React, { useState, useEffect, useRef } from 'react';
import { Box, CircularProgress, Skeleton } from '@mui/material';

/**
 * LazyImage Component - Optimiert für mobile Geräte
 * 
 * Features:
 * - Lazy Loading mit Intersection Observer
 * - Progressive Image Loading (Blur-up)
 * - Automatische Base64-Dekodierung
 * - Error Handling mit Fallback
 * - Memory-effizient (cleanup)
 * 
 * @param {Object} props
 * @param {string} props.src - Bild-URL oder Base64
 * @param {string} props.alt - Alt-Text
 * @param {number} props.height - Höhe in px (optional)
 * @param {string} props.objectFit - CSS object-fit (default: 'cover')
 * @param {React.ReactNode} props.fallback - Fallback bei Fehler
 * @param {Function} props.onLoad - Callback bei erfolgreichem Laden
 * @param {Function} props.onError - Callback bei Fehler
 */
const LazyImage = ({
  src,
  alt = '',
  height = 200,
  objectFit = 'cover',
  fallback = null,
  onLoad,
  onError,
  ...props
}) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isInView, setIsInView] = useState(false);
  const [hasError, setHasError] = useState(false);
  const imgRef = useRef(null);
  const observerRef = useRef(null);

  // Intersection Observer für Lazy Loading
  useEffect(() => {
    if (!imgRef.current || !src) return;

    // Wenn schon geladen, Observer nicht mehr nötig
    if (isLoaded) return;

    const currentImg = imgRef.current; // Copy ref for cleanup

    // Observer erstellen
    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsInView(true);
            // Observer nach erstem Trigger stoppen (Memory-Optimierung)
            if (observerRef.current && currentImg) {
              observerRef.current.unobserve(currentImg);
            }
          }
        });
      },
      {
        rootMargin: '50px', // Lade 50px bevor sichtbar
        threshold: 0.01
      }
    );

    if (currentImg) {
      observerRef.current.observe(currentImg);
    }

    // Cleanup
    return () => {
      if (observerRef.current && currentImg) {
        observerRef.current.unobserve(currentImg);
      }
    };
  }, [src, isLoaded]);

  // Image Load Handler
  const handleLoad = () => {
    setIsLoaded(true);
    if (onLoad) onLoad();
  };

  const handleError = (e) => {
    console.error('Fehler beim Laden des Bildes:', src);
    setHasError(true);
    if (onError) onError(e);
  };

  // Kein Bild vorhanden
  if (!src) {
    return fallback || (
      <Box
        height={height}
        display="flex"
        alignItems="center"
        justifyContent="center"
        bgcolor="grey.100"
      >
        <Box color="text.secondary">Kein Bild</Box>
      </Box>
    );
  }

  // Fehler beim Laden
  if (hasError) {
    return fallback || (
      <Box
        height={height}
        display="flex"
        alignItems="center"
        justifyContent="center"
        bgcolor="grey.200"
      >
        <Box color="text.secondary">Bild nicht verfügbar</Box>
      </Box>
    );
  }

  return (
    <Box
      ref={imgRef}
      position="relative"
      height={height}
      overflow="hidden"
      bgcolor="grey.50"
      {...props}
    >
      {/* Loading Skeleton */}
      {!isLoaded && (
        <Skeleton
          variant="rectangular"
          width="100%"
          height={height}
          animation="wave"
          sx={{
            position: 'absolute',
            top: 0,
            left: 0,
            zIndex: 1
          }}
        />
      )}

      {/* Actual Image - nur laden wenn in View */}
      {isInView && (
        <img
          src={src}
          alt={alt}
          onLoad={handleLoad}
          onError={handleError}
          loading="lazy" // Native Browser Lazy Loading als Fallback
          decoding="async" // Async Dekodierung für bessere Performance
          style={{
            width: '100%',
            height: '100%',
            objectFit: objectFit,
            opacity: isLoaded ? 1 : 0,
            transition: 'opacity 0.3s ease-in-out',
            display: 'block'
          }}
        />
      )}

      {/* Loading Spinner (optional, nur bei großen Bildern) */}
      {isInView && !isLoaded && height > 300 && (
        <Box
          position="absolute"
          top="50%"
          left="50%"
          sx={{
            transform: 'translate(-50%, -50%)',
            zIndex: 2
          }}
        >
          <CircularProgress size={40} />
        </Box>
      )}
    </Box>
  );
};

export default LazyImage;
