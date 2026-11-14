/* 여백 노트 service worker: works offline after the first visit. */
const V = 'yeobaek-v18';
const SHELL = [
  './', './index.html', './manifest.webmanifest',
  './icons/apple-touch-icon.png', './icons/icon-192.png', './icons/icon-512.png',
  './vendor/pdf.min.js', './vendor/pdf.worker.min.js', './vendor/pdf-lib.min.js', './vendor/jszip.min.js'
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(V).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(k => k !== V).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

async function networkFirst(req) {
  const cache = await caches.open(V);
  try {
    const res = await Promise.race([
      fetch(req.url, { cache: 'no-cache', credentials: 'same-origin' }),
      new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), 4000))
    ]);
    if (res && res.ok) cache.put(req, res.clone());
    return res;
  } catch {
    return (await cache.match(req)) || (await cache.match('./index.html')) || Response.error();
  }
}

async function cacheFirst(req) {
  const cache = await caches.open(V);
  const hit = await cache.match(req);
  if (hit) return hit;
  const res = await fetch(req);
  if (res && (res.ok || res.type === 'opaque')) cache.put(req, res.clone());
  return res;
}

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin === location.origin) {
    if (req.mode === 'navigate' || url.pathname.endsWith('/') || url.pathname.endsWith('/index.html')) {
      e.respondWith(networkFirst(req));
    } else {
      e.respondWith(cacheFirst(req));
    }
  } else if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {
    e.respondWith(cacheFirst(req));
  }
});
