// Service Worker: AppIngles — caché de la app shell para uso offline.
// Rutas relativas al propio sw.js: funcionan igual en raíz (dev) que en
// subcarpeta de producción (https://www.ingresosdigitalesit.com/appingles/).
const CACHE = 'appingles-v3';
const SHELL = [
  './',
  './index.html',
  './manifest.webmanifest',
  './icons/icon.svg',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

// Estrategia: network-first para navegaciones y API; fallback al caché si offline.
self.addEventListener('fetch', (event) => {
  const { request } = event;

  // Solo cacheamos GET (los POST/PUT no son cacheables y el navegador lanza error).
  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  // API: network-only (si falla, devuelve error; el frontend lo maneja).
  if (url.pathname.startsWith('/api') || url.pathname.startsWith('/webhooks')) {
    return;
  }

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put('./', copy));
          return res;
        })
        .catch(() => caches.match('./')),
    );
    return;
  }

  event.respondWith(
    caches.match(request).then(
      (cached) =>
        cached ||
        fetch(request).then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(request, copy));
          return res;
        }),
    ),
  );
});
