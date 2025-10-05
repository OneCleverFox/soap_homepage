import { useState, useEffect, useCallback } from 'react';

/**
 * Hook für intelligentes Bild-Preloading
 * Lädt Bilder im Hintergrund vor, um Timeouts zu vermeiden
 * 
 * @param {Array<string>} imageUrls - Array von Bild-URLs
 * @param {Object} options - Optionen
 * @param {number} options.maxConcurrent - Max. parallele Loads (default: 3)
 * @param {number} options.timeout - Timeout pro Bild in ms (default: 10000)
 * @returns {Object} { loaded, loading, failed, progress }
 */
export const useImagePreload = (imageUrls = [], options = {}) => {
  const {
    maxConcurrent = 3, // Nicht zu viele parallel für mobile
    timeout = 10000 // 10 Sekunden Timeout
  } = options;

  const [loaded, setLoaded] = useState([]);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState([]);
  const [progress, setProgress] = useState(0);

  // Lädt ein einzelnes Bild mit Timeout
  const loadSingleImage = useCallback((url) => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      let timeoutId;

      const cleanup = () => {
        clearTimeout(timeoutId);
        img.onload = null;
        img.onerror = null;
      };

      timeoutId = setTimeout(() => {
        cleanup();
        console.warn(`Timeout beim Laden von: ${url}`);
        reject(new Error('Timeout'));
      }, timeout);

      img.onload = () => {
        cleanup();
        resolve();
      };

      img.onerror = () => {
        cleanup();
        console.error(`Fehler beim Laden von: ${url}`);
        reject(new Error('Load failed'));
      };

      img.src = url;
    });
  }, [timeout]);

  useEffect(() => {
    if (!imageUrls || imageUrls.length === 0) return;

    setLoading(true);
    const loadedUrls = [];
    const failedUrls = [];

    // Filter: Nur http(s) URLs, Base64 ist schon im DOM
    const urlsToLoad = imageUrls.filter(url => 
      url && (url.startsWith('http://') || url.startsWith('https://'))
    );

    // Base64 sofort als "geladen" markieren
    const base64Urls = imageUrls.filter(url => 
      url && url.startsWith('data:image/')
    );
    let completedCount = base64Urls.length;

    if (urlsToLoad.length === 0) {
      setLoaded(imageUrls);
      setLoading(false);
      setProgress(100);
      return;
    }

    // Chunked Loading (nur maxConcurrent parallel)
    const loadInChunks = async () => {
      for (let i = 0; i < urlsToLoad.length; i += maxConcurrent) {
        const chunk = urlsToLoad.slice(i, i + maxConcurrent);
        
        await Promise.all(
          chunk.map(url => 
            loadSingleImage(url)
              .then(() => {
                loadedUrls.push(url);
                completedCount++;
                setProgress(Math.round((completedCount / imageUrls.length) * 100));
              })
              .catch(() => {
                failedUrls.push(url);
                completedCount++;
                setProgress(Math.round((completedCount / imageUrls.length) * 100));
              })
          )
        );
      }

      setLoaded([...loadedUrls, ...base64Urls]);
      setFailed(failedUrls);
      setLoading(false);
    };

    loadInChunks();

    // Cleanup
    return () => {
      setLoading(false);
    };
  }, [imageUrls, maxConcurrent, loadSingleImage]);

  return { loaded, loading, failed, progress };
};

export default useImagePreload;
