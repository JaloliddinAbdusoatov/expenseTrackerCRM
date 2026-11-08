/* Minimal service worker for PWA installability (Chrome/Edge). */
self.addEventListener('install', (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// Chrome installability expects a fetch handler (pass-through is enough).
self.addEventListener('fetch', (event) => {
  event.respondWith(fetch(event.request));
});
