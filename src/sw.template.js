/* Jeopardy-Board service worker (same approach as Khatfa and Draft Night).
   App files: network first, so new versions always win when online; cached copy when offline.
   Libraries, icons, fonts: cache first. */
const VERSION = '__VERSION__';
const CACHE = 'jboard-' + VERSION;
const FONTS = ['anton-latin-400', 'barlow-latin-400', 'barlow-latin-500', 'barlow-latin-600', 'barlow-latin-700',
  'barlow-semi-condensed-latin-500', 'barlow-semi-condensed-latin-600', 'barlow-semi-condensed-latin-700', 'barlow-semi-condensed-latin-800'].map((f) => './fonts/' + f + '-normal.woff2');
const CORE = ['./', './index.html', './app.js?v=' + VERSION, './bank.js?v=' + VERSION, './styles.css?v=' + VERSION, './manifest.webmanifest',
  './vendor/react.production.min.js', './vendor/react-dom.production.min.js',
  './icons/icon-192.png', './icons/icon-512.png', './icons/apple-touch-icon.png', ...FONTS];
// Built-in pictures and sounds, and your files in sounds/ (names are content hashes, so a cached copy never goes stale).
const MEDIA = __MEDIA__;

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(CORE).then(() => Promise.all(MEDIA.map((u) => c.add(u).catch(() => {}))))).catch(() => {}));
});
self.addEventListener('message', (e) => { if (e.data === 'skipWaiting') self.skipWaiting(); });
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k.startsWith('jboard-') && k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  // Only this game's folder (the hub and the other games share the domain).
  if (!url.pathname.startsWith(new URL(self.registration.scope).pathname)) return;
  const isShell = (req.mode === 'navigate' || /\/(index\.html)?$/.test(url.pathname) || /\.(js|css|webmanifest)$/.test(url.pathname)) && !url.pathname.includes('/vendor/');
  if (isShell) {
    e.respondWith(fetch(req).then((res) => { if (res.ok) { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(req, copy)); } return res; })
      .catch(() => caches.match(req, { ignoreSearch: req.mode === 'navigate' }).then((r) => r || caches.match('./index.html'))));
    return;
  }
  // Audio: Safari asks for byte ranges; answer them from the cached file (offline too).
  const range = req.headers.get('range');
  if (range && /\/(media|sounds)\//.test(url.pathname)) {
    e.respondWith(caches.match(req.url, { ignoreSearch: true }).then((hit) => {
      if (!hit) return fetch(req);
      return hit.arrayBuffer().then((buf) => {
        const m = /bytes=(\d*)-(\d*)/.exec(range) || [];
        const size = buf.byteLength; const start = m[1] ? +m[1] : 0; const end = m[2] ? Math.min(+m[2], size - 1) : size - 1;
        return new Response(buf.slice(start, end + 1), { status: 206, statusText: 'Partial Content', headers: {
          'Content-Type': hit.headers.get('Content-Type') || 'audio/mpeg', 'Content-Range': 'bytes ' + start + '-' + end + '/' + size, 'Content-Length': String(end - start + 1), 'Accept-Ranges': 'bytes' } });
      });
    }));
    return;
  }
  e.respondWith(caches.match(req).then((hit) => hit || fetch(req).then((res) => {
    if (res.ok) { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(req, copy)); }
    return res;
  })));
});
