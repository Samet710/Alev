const CACHE_NAME = 'alev-serisi-flat-assets-v15';
const scopeURL = new URL('./', self.registration.scope);
const shellURLs = [
  new URL('index.html', scopeURL).href,
  new URL('manifest.webmanifest', scopeURL).href,
  new URL('icon-192.png', scopeURL).href,
  new URL('icon-512.png', scopeURL).href
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(shellURLs))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys
        .filter(key => key.startsWith('alev-serisi-') && key !== CACHE_NAME)
        .map(key => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin || !url.href.startsWith(scopeURL.href)) return;

  event.respondWith((async () => {
    const cache = await caches.open(CACHE_NAME);
    const isNavigation = request.mode === 'navigate';

    // Always try to fetch the newest page first, so a fixed index.html is not hidden by an old cache.
    if (isNavigation) {
      try {
        const response = await fetch(request, { cache: 'no-store' });
        if (response && response.ok) {
          cache.put(new URL('index.html', scopeURL).href, response.clone()).catch(() => {});
        }
        return response;
      } catch (error) {
        const fallback = await cache.match(new URL('index.html', scopeURL).href);
        return fallback || Response.error();
      }
    }

    const cached = await cache.match(request);
    if (cached) return cached;

    const response = await fetch(request);
    if (response && response.ok && response.type !== 'opaque') {
      cache.put(request, response.clone()).catch(() => {});
    }
    return response;
  })());
});
