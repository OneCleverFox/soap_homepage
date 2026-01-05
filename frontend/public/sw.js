// Service Worker für Glücksmomente Website
// Optimiert für mobile Performance und Network-Probleme

const API_CACHE = 'gluecksmomente-api-v3';

// Install event - Nur API Cache vorbereiten
self.addEventListener('install', (event) => {
  console.log('SW: Installing v3...');
  event.waitUntil(
    caches.open(API_CACHE).then(() => {
      console.log('SW: API cache ready');
      self.skipWaiting(); // Erzwinge sofortige Aktivierung
    })
  );
});

// Fetch event - Nur wichtige API-Endpunkte cachen
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Nur wichtige API-Anfragen cachen (portfolio und company-info)
  if (url.pathname.includes('/api/portfolio') || url.pathname.includes('/api/company-info')) {
    event.respondWith(
      caches.open(API_CACHE).then((cache) => {
        return cache.match(request).then((cachedResponse) => {
          // Stale-while-revalidate: Zeige Cache, update im Hintergrund
          const fetchPromise = fetch(request).then((networkResponse) => {
            if (networkResponse && networkResponse.ok) {
              // Clone response für Cache
              cache.put(request, networkResponse.clone());
            }
            return networkResponse;
          }).catch(() => {
            // Fallback bei Network-Fehlern
            if (cachedResponse) {
              console.log('SW: Using cache fallback for:', url.pathname);
              return cachedResponse;
            }
            throw new Error('Network error and no cache available');
          });

          // Gebe Cache zurück wenn vorhanden, sonst warte auf Netzwerk
          return cachedResponse || fetchPromise;
        });
      })
    );
    return;
  }

  // Alle anderen Requests normal weiterleiten
});

// Activate event - Bereinige alte Caches
self.addEventListener('activate', (event) => {
  console.log('SW: Activating v3...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          // Lösche alte Cache-Versionen
          if (cacheName !== API_CACHE) {
            console.log('SW: Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      console.log('SW: Claiming clients');
      return self.clients.claim();
    })
  );
});