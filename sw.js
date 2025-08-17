/* Lye, Dye & DIY - offline cache */
const CACHE_VERSION = 'v1.0.0';
const CACHE_NAME = `lye-dye-diy-${CACHE_VERSION}`;

const FILES_TO_CACHE = [
  './',                // GitHub Pages will treat this as your index
  './index.html',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png'
  // Add more files here later (css/js/images) as you create them
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(FILES_TO_CACHE))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.map((key) => key !== CACHE_NAME && caches.delete(key)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  // Network-first with cache fallback
  event.respondWith(
    fetch(event.request).then((response) => {
      const respClone = response.clone();
      caches.open(CACHE_NAME).then((cache) => cache.put(event.request, respClone));
      return response;
    }).catch(() => caches.match(event.request).then((res) => {
      // Fallback to cached index for navigation requests
      if (event.request.mode === 'navigate') {
        return caches.match('./index.html');
      }
      return res;
    }))
  );
});
