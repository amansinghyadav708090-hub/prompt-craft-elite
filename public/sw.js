self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(clients.claim());
});

self.addEventListener('fetch', (event) => {
  // A minimal fetch handler to satisfy PWA criteria.
  // In a real app, you'd add caching here.
  event.respondWith(fetch(event.request));
});
