// يعمل التطبيق بدون إنترنت: الواجهة من الكاش، والبيانات من الشبكة أولاً ثم الكاش
const VERSION = '3zhub-v2';
const SHELL = ['./', 'index.html', 'style.css', 'app.js', 'manifest.webmanifest', 'icons/icon.svg', 'icons/icon-180.png', 'icons/icon-512.png'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  const sameOrigin = url.origin === location.origin;
  const isData = sameOrigin && url.pathname.endsWith('/data/repos.json');
  const isStatic = sameOrigin || url.hostname.endsWith('cdnjs.cloudflare.com') || url.hostname.includes('fonts.g');

  if (isData || (sameOrigin && req.mode === 'navigate') || (sameOrigin && /\.(js|css)$/.test(url.pathname))) {
    // الشبكة أولاً
    e.respondWith(
      fetch(req).then((res) => {
        const copy = res.clone();
        if (res.ok) caches.open(VERSION).then((c) => c.put(isData ? 'data/repos.json' : req, copy));
        return res;
      }).catch(() => caches.match(isData ? 'data/repos.json' : req).then((r) => r || caches.match('index.html'))),
    );
  } else if (isStatic) {
    // الكاش أولاً
    e.respondWith(
      caches.match(req).then((hit) => hit || fetch(req).then((res) => {
        if (res.ok || res.type === 'opaque') { const copy = res.clone(); caches.open(VERSION).then((c) => c.put(req, copy)); }
        return res;
      })),
    );
  }
});
