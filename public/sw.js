// sw.js

// Define cache name and files to cache
const CACHE_NAME = 'my-app-cache-v1';
const URLS_TO_CACHE = [
  '/', // root
  '/index.html',
  '/favicon.ico',
  '/manifest.json',
];

// Install event (caches files)
self.addEventListener('install', (event) => {
  console.log('[Service Worker] Install');
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[Service Worker] Caching files');
      return cache.addAll(URLS_TO_CACHE);
    })
  );
});

// Activate event (cleanup old caches)
self.addEventListener('activate', (event) => {
  console.log('[Service Worker] Activate');
  event.waitUntil(
    caches.keys().then((cacheNames) =>
      Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            console.log('[Service Worker] Removing old cache:', cache);
            return caches.delete(cache);
          }
        })
      )
    )
  );
});

// Fetch event (serve cached content if available)
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      return (
        cachedResponse ||
        fetch(event.request).catch(() => {
          console.warn('[Service Worker] Network failed:', event.request.url);
        })
      );
    })
  );
});
