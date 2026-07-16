/*
 * Minimal service worker for installability ("Add to Home Screen").
 * Intentionally does NOT cache responses: this is an authenticated,
 * data-driven app, so serving stale pages/API data would be wrong. The empty
 * fetch handler satisfies the PWA install criteria while letting every request
 * hit the network normally.
 */
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));
self.addEventListener('fetch', () => {
  // no-op: let the browser handle every request as usual
});
