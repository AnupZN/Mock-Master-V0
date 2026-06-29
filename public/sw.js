const CACHE_NAME = 'modular-exam-app-cache-v1';

// Assets to cache immediately on installation
const PRECACHE_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icon.svg'
];

// Install Event: Precaches essential shell assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[Service Worker] Precaching app shell...');
        return cache.addAll(PRECACHE_ASSETS);
      })
      .then(() => {
        // Force the waiting service worker to become the active service worker
        return self.skipWaiting();
      })
  );
});

// Activate Event: Cleans up old caches to prevent storage bloat
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('[Service Worker] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      // Claim all clients immediately so the service worker controls the page on first load
      return self.clients.claim();
    })
  );
});

// Fetch Event: Directs caching strategies based on resource type
self.addEventListener('fetch', (event) => {
  const requestUrl = new URL(event.request.url);

  // Ignore non-GET requests and external API/Supabase calls (unless desired)
  if (event.request.method !== 'GET') {
    return;
  }

  // 1. Subject Question Data & Fonts - Cache-First Strategy
  // Once downloaded, these rarely change and are critical for offline exam practice.
  if (
    requestUrl.pathname.includes('/data/') ||
    requestUrl.pathname.endsWith('.json') ||
    requestUrl.host.includes('fonts.gstatic.com') ||
    requestUrl.host.includes('fonts.googleapis.com') ||
    requestUrl.pathname.endsWith('.svg') ||
    requestUrl.pathname.endsWith('.png')
  ) {
    event.respondWith(
      caches.open(CACHE_NAME).then((cache) => {
        return cache.match(event.request).then((cachedResponse) => {
          if (cachedResponse) {
            // Return cached response instantly, check for updates in background
            fetch(event.request).then((networkResponse) => {
              if (networkResponse.status === 200) {
                cache.put(event.request, networkResponse);
              }
            }).catch(() => {/* Ignore network errors when offline */});
            return cachedResponse;
          }

          // Fetch from network and save to cache
          return fetch(event.request).then((networkResponse) => {
            if (networkResponse.status === 200) {
              cache.put(event.request, networkResponse.clone());
            }
            return networkResponse;
          }).catch(() => {
            // Fallback for offline (for json files, we might be offline)
            return new Response(JSON.stringify({ error: "Offline" }), {
              headers: { 'Content-Type': 'application/json' }
            });
          });
        });
      })
    );
    return;
  }

  // 2. Main app shell bundle (Vite assets) - Stale-While-Revalidate Strategy
  // Serves from cache immediately for speed, but fetches latest in background.
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        // Fetch from network to update the cache in the background
        const fetchPromise = fetch(event.request).then((networkResponse) => {
          if (networkResponse.status === 200) {
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, networkResponse);
            });
          }
          return networkResponse;
        }).catch((err) => {
          console.log('[Service Worker] Background fetch failed (probably offline):', err);
        });

        // Return the cached version immediately
        return cachedResponse;
      }

      // If not in cache, fallback to standard network request
      return fetch(event.request);
    })
  );
});
