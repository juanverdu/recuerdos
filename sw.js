// Nido service worker. Bump VERSION (and the one in index.html) on every change.
const VERSION = '1.1.0';
const CACHE = 'nido-' + VERSION;
const RUNTIME = 'nido-runtime';
const SHELL = ['./', './index.html', './manifest.webmanifest', './icon-192.png', './icon-512.png', './apple-touch-icon.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k.startsWith('nido-') && k !== CACHE && k !== RUNTIME).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // The app itself: served from the cache of this version (new versions arrive via a new sw.js).
  if (url.origin === location.origin) {
    e.respondWith(caches.open(CACHE).then(c =>
      c.match(req, {ignoreSearch: true}).then(hit => hit || (req.mode === 'navigate' ? c.match('./') : null)).then(hit =>
        hit || fetch(req).then(res => { if (res.ok) c.put(req, res.clone()); return res; })
      )
    ));
    return;
  }

  // Fonts and the world map: cached so the app also works without connection.
  if (/(^|\.)fonts\.googleapis\.com$|(^|\.)fonts\.gstatic\.com$|(^|\.)cdn\.jsdelivr\.net$/.test(url.hostname)) {
    e.respondWith(caches.open(RUNTIME).then(c => c.match(req).then(hit => {
      const net = fetch(req).then(res => { if (res.ok || res.type === 'opaque') c.put(req, res.clone()); return res; }).catch(() => hit);
      return hit || net;
    })));
  }
});
