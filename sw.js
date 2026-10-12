/* Jeopardy-Board service worker (same approach as Khatfa and Draft Night).
   App files: network first, so new versions always win when online; cached copy when offline.
   Libraries, icons, fonts: cache first. */
const VERSION = '0fd6fb3bbe';
const CACHE = 'jboard-' + VERSION;
const FONTS = ['anton-latin-400', 'barlow-latin-400', 'barlow-latin-500', 'barlow-latin-600', 'barlow-latin-700',
  'barlow-semi-condensed-latin-500', 'barlow-semi-condensed-latin-600', 'barlow-semi-condensed-latin-700', 'barlow-semi-condensed-latin-800'].map((f) => './fonts/' + f + '-normal.woff2');
const CORE = ['./', './index.html', './app.js?v=' + VERSION, './bank.js?v=' + VERSION, './styles.css?v=' + VERSION, './manifest.webmanifest',
  './vendor/react.production.min.js', './vendor/react-dom.production.min.js',
  './icons/icon-192.png', './icons/icon-512.png', './icons/apple-touch-icon.png', ...FONTS];
// Built-in pictures and sounds, and your files in sounds/ (names are content hashes, so a cached copy never goes stale).
const MEDIA = ["./media/i/0005213e8a31.svg","./media/i/0a1ef6f272eb.svg","./media/i/0b3d97dbcc61.svg","./media/i/0e6213376c91.svg","./media/i/13bdb8604a36.svg","./media/i/1f42c543683c.svg","./media/i/2351c1b04235.svg","./media/i/27c924f0293d.svg","./media/i/3aa15f93c741.svg","./media/i/3aec38098229.svg","./media/i/3b1326de5a40.svg","./media/i/3e2a41d35e00.svg","./media/i/41f5814aa918.svg","./media/i/45c99b285368.svg","./media/i/545e694a0fbd.svg","./media/i/59212f5e7539.svg","./media/i/5d7c8b15a1de.svg","./media/i/612fa9417e36.svg","./media/i/6c7881a74d0c.svg","./media/i/725294433c2f.svg","./media/i/79c15381898d.svg","./media/i/87fcc8bf8e3d.svg","./media/i/88cb4193193a.svg","./media/i/8be5e89d699a.svg","./media/i/9632b496a0ac.svg","./media/i/9778202ddd95.svg","./media/i/9b17552835e5.svg","./media/i/9d82fcceac46.svg","./media/i/9e1b536fd10b.svg","./media/i/a9162b2a643f.svg","./media/i/b6861e218cdb.svg","./media/i/ba9af8de9057.svg","./media/i/be012ab5e7b9.svg","./media/i/bf6c4a3e6a87.svg","./media/i/ca21b74078b7.svg","./media/i/dd404f43e3ff.svg","./media/i/e9fa8dd0fda1.svg","./media/i/f0eb17ad0543.svg","./media/i/fa8f42ab3c85.svg","./media/i/fe13ea2d451c.svg","./media/a/0161846b310e.mp3","./media/a/06184e1e5717.mp3","./media/a/0f9bc0568502.mp3","./media/a/1b4f9d854aa5.mp3","./media/a/2b1e2ae89f63.mp3","./media/a/31d05a68a029.mp3","./media/a/3710cba6ee88.mp3","./media/a/3b42ef6d0915.mp3","./media/a/4477ce11fbd2.mp3","./media/a/454d41213dd5.mp3","./media/a/550d3582aa78.mp3","./media/a/573e0fee0518.mp3","./media/a/75a4ebde6351.mp3","./media/a/7a319aa5f37d.mp3","./media/a/8ad4f5903073.mp3","./media/a/9013de8c38d2.mp3","./media/a/a096c5c580de.mp3","./media/a/e0656698e17e.mp3","./media/a/e49386e9cd89.mp3","./media/a/f643d7c04ad6.mp3","./media/a/ff2d195fc422.mp3"];

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
