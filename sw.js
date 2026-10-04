/* Offline support. Network first, so a reload always picks up the newest site when online;
   the saved copy is used only when the network is unavailable. Nothing the reader wrote
   (read marks, notes, flags) is stored here - that stays in localStorage. */
const CACHE = 'psm-viva-v1';

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    const base = self.registration.scope;
    const res = await fetch(new Request(base + 'index.html', { cache: 'reload' }));
    const html = await res.clone().text();
    await cache.put(base, res.clone());
    await cache.put(base + 'index.html', res);
    const urls = new Set(['manifest.webmanifest', 'icons/icon-192.png', 'icons/icon-512.png']);
    html.replace(/(?:src|href)="((?:css|js|topics)\/[^"?#]+)"/g, (_, u) => urls.add(u));
    await Promise.all([...urls].map((u) => cache.add(new Request(base + u, { cache: 'reload' })).catch(() => {})));
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  const sameOrigin = url.origin === self.location.origin;
  const fonts = url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com';
  if (!sameOrigin && !fonts) return;

  event.respondWith((async () => {
    const cache = await caches.open(CACHE);
    try {
      const fresh = await fetch(req);
      if (fresh && (fresh.ok || fresh.type === 'opaque')) cache.put(req, fresh.clone());
      return fresh;
    } catch (err) {
      const hit = await cache.match(req, { ignoreSearch: true });
      if (hit) return hit;
      if (req.mode === 'navigate') {
        const home = await cache.match(self.registration.scope + 'index.html');
        if (home) return home;
      }
      throw err;
    }
  })());
});
