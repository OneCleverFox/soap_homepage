// Service Worker für Glücksmomente Website
// Optimiert für mobile Performance und Network-Probleme

const CACHE_NAME = 'gluecksmomente-v2';
const API_CACHE = 'gluecksmomente-api-v2';
const STATIC_CACHE = 'gluecksmomente-static-v2';

// Statische Ressourcen die gecacht werden sollen
const staticFiles = [
  '/',
  '/static/js/bundle.js',
  '/static/css/main.css',
  '/manifest.json'
];

// API-Endpunkte die gecacht werden sollen
const apiEndpoints = [
  '/api/portfolio/with-prices',
  '/api/portfolio',
  '/api/auth/verify'
];

// Install event - Cache statische Dateien
self.addEventListener('install', (event) => {
  console.log('SW: Installing v2...');
  event.waitUntil(
    Promise.all([
      caches.open(STATIC_CACHE).then((cache) => {
        console.log('SW: Caching static files');
        return cache.addAll(staticFiles);
      }),
      caches.open(API_CACHE).then((cache) => {
        console.log('SW: API cache ready');
      })
    ]).catch((error) => {
      console.log('SW: Install failed', error);
    })
  );
  // Erzwinge sofortige Aktivierung
  self.skipWaiting();
});

// Fetch event - Intelligente Caching-Strategie
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // API-Anfragen: Stale-While-Revalidate für bessere Performance
  if (url.pathname.includes('/api/')) {
    event.respondWith(
      caches.open(API_CACHE).then(async (cache) => {
        // Versuche Cache zuerst
        const cachedResponse = await cache.match(request);
        
        // Fetch von Netzwerk (im Hintergrund wenn Cache vorhanden)
        const fetchPromise = fetch(request).then((networkResponse) => {
          // Nur erfolgreiche Responses cachen
          if (networkResponse.ok) {
            cache.put(request, networkResponse.clone());
          }
          return networkResponse;
        }).catch((error) => {
          console.log('SW: Network fetch failed for', url.pathname, error.message);
          // Bei Netzwerkfehlern: Cache-Response zurückgeben wenn vorhanden
          if (cachedResponse) {
            console.log('SW: Serving from cache due to network error');
            return cachedResponse;
          }
          throw error;
        });
        
        // Wenn Cache vorhanden: sofort zurückgeben, im Hintergrund aktualisieren
        if (cachedResponse) {
          console.log('SW: Serving from cache (stale-while-revalidate)', url.pathname);
          fetchPromise.catch(() => {}); // Ignore background errors
          return cachedResponse;
        }
        
        // Kein Cache: Warte auf Netzwerk-Response
        return fetchPromise;
      })
    );
    return;
  }

  // Statische Dateien: Cache-First
  event.respondWith(
    caches.match(request).then((response) => {
      if (response) {
        console.log('SW: Serving static file from cache');
        return response;
      }
      
      return fetch(request).then((networkResponse) => {
        // Cache neue statische Ressourcen
        if (networkResponse.ok && request.method === 'GET') {
          caches.open(STATIC_CACHE).then((cache) => {
            cache.put(request, networkResponse.clone());
          });
        }
        return networkResponse;
      }).catch((error) => {
        console.log('SW: Failed to fetch', request.url, error.message);
        throw error;
      });
    })
  );
});

// Activate event - Bereinige alte Caches
self.addEventListener('activate', (event) => {
  console.log('SW: Activating v2...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (![CACHE_NAME, API_CACHE, STATIC_CACHE].includes(cacheName)) {
            console.log('SW: Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      // Übernehme sofort die Kontrolle über alle Clients
      return self.clients.claim();
    })
  );
});
  );
});