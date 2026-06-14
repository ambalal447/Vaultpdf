const CACHE = 'vaultpdf-v1';
const OFFLINE_URL = '/';

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE).then(cache => {
      return cache.addAll([OFFLINE_URL]);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys.filter(key => key !== CACHE).map(key => caches.delete(key))
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  event.respondWith(
    caches.match(event.request).then(cached => {
      const networkFetch = fetch(event.request).then(response => {
        if (response && response.status === 200) {
          const responseClone = response.clone();
          caches.open(CACHE).then(cache => {
            cache.put(event.request, responseClone);
          });
        }
        return response;
      }).catch(() => cached);
      return cached || networkFetch;
    })
  );
});
