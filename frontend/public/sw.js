// Service Worker für Glücksmomente Website
// Optimiert für mobile Performance und Network-Probleme

const API_CACHE = 'gluecksmomente-api-v4';
const IMAGE_CACHE = 'gluecksmomente-images-v1';

// Install event - Cache vorbereiten
self.addEventListener('install', (event) => {
  console.log('SW: Installing v4...');
  event.waitUntil(
    Promise.all([
      caches.open(API_CACHE),
      caches.open(IMAGE_CACHE)
    ]).then(() => {
      console.log('SW: Caches ready');
      self.skipWaiting(); // Erzwinge sofortige Aktivierung
    })
  );
});

// Fetch event - API und Bilder cachen
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Portfolio-Bilder cachen (neue URL-Struktur)
  if (url.pathname.includes('/api/portfolio/') && url.pathname.includes('/image/')) {
    event.respondWith(
      caches.open(IMAGE_CACHE).then((cache) => {
        return cache.match(request).then((cachedResponse) => {
          if (cachedResponse) {
            // Bilder sind immutable - immer aus Cache nehmen
            return cachedResponse;
          }
          
          // Bild vom Server laden und cachen
          return fetch(request).then((networkResponse) => {
            if (networkResponse && networkResponse.ok) {
              cache.put(request, networkResponse.clone());
            }
            return networkResponse;
          }).catch(() => {
            console.log('SW: Failed to load image:', url.pathname);
            return new Response('', { status: 404 });
          });
        });
      })
    );
    return;
  }

  // API-Anfragen cachen (portfolio und company-info)
  if (url.pathname.includes('/api/portfolio') || url.pathname.includes('/api/company-info')) {
    event.respondWith(
      caches.open(API_CACHE).then((cache) => {
        return cache.match(request).then((cachedResponse) => {
          // Stale-while-revalidate: Zeige Cache, update im Hintergrund
          const fetchPromise = fetch(request).then((networkResponse) => {
            if (networkResponse && networkResponse.ok) {
              cache.put(request, networkResponse.clone());
            }
            return networkResponse;
          }).catch(() => {
            if (cachedResponse) {
              console.log('SW: Using cache fallback for:', url.pathname);
              return cachedResponse;
            }
            throw new Error('Network error and no cache available');
          });

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
  console.log('SW: Activating v4...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          // Lösche alte Cache-Versionen
          if (cacheName !== API_CACHE && cacheName !== IMAGE_CACHE) {
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