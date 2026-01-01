import React, { useState, useEffect, useRef } from 'react';
import { Box } from '@mui/material';

/**
 * LazyImage Component - Optimiert für schnellstes Laden
 * 
 * Features:
 * - Lazy Loading mit Intersection Observer
 * - Progressive Image Loading (Blur-up)
 * - Priorität für sichtbare Bilder
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
 * @param {boolean} props.priority - High priority loading (für Above-the-fold Bilder)
 */
const LazyImage = ({
  src,
  alt = '',
  height = 200,
  objectFit = 'cover',
  fallback = null,
  onLoad,
  onError,
  priority = false,
  ...props
}) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isInView, setIsInView] = useState(priority); // Priority-Bilder sofort laden
  const [hasError, setHasError] = useState(false);
  const imgRef = useRef(null);
  const observerRef = useRef(null);

  // Intersection Observer für Lazy Loading
  useEffect(() => {
    if (!imgRef.current || !src || priority) return; // Priority-Bilder überspringen Observer

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
        rootMargin: '200px', // Lade 200px bevor sichtbar für mobile Performance
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
  }, [src, isLoaded, priority]);

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
      {/* Minimales Skeleton - nur Hintergrundfarbe statt Animation */}
      {!isLoaded && (
        <Box
          sx={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            bgcolor: 'grey.100',
            zIndex: 1
          }}
        />
      )}

      {/* Actual Image - nur laden wenn in View oder Priority */}
      {isInView && (
        <img
          src={src}
          alt={alt}
          title={alt} // Für bessere Barrierefreiheit
          onLoad={handleLoad}
          onError={handleError}
          loading={priority ? 'eager' : 'lazy'} // Priority: eager, sonst lazy
          decoding="async" // Async Dekodierung für bessere Performance
          fetchpriority={priority ? 'high' : 'auto'} // HTML-Attribut für Priorität (Chrome/Edge)
          style={{
            width: '100%',
            height: '100%',
            objectFit: objectFit,
            opacity: isLoaded ? 1 : 0,
            transition: 'opacity 0.2s ease-in', // Schnellere Transition
            display: 'block'
          }}
        />
      )}
    </Box>
  );
};

export default LazyImage;
