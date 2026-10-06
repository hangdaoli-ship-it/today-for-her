/* 予卿 · 离线缓存
   策略：
   - 页面本身（导航请求）用「网络优先」——这样你改了 index.html，她下次联网打开就能拿到新版，
     不会再被旧缓存卡住；断网时回落到缓存，照样能用。
   - 其他静态资源用「缓存优先」——首屏更快，且离线可用。
   改了本文件或资源的版本，把 CACHE 名字 +1。 */
const CACHE = 'today-for-her-v3';
const ASSETS = ['./', './index.html', './manifest.webmanifest', './icon.svg', './icon-512.png', './robots.txt'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;

  const isDocument = e.request.mode === 'navigate'
    || e.request.destination === 'document'
    || /index\.html$/.test(new URL(e.request.url).pathname)
    || new URL(e.request.url).pathname.endsWith('/app/');

  if (isDocument) {
    // 网络优先：保证拿到最新版本；断网时用缓存兜底
    e.respondWith(
      // cache:'no-store' 绕过浏览器 HTTP 缓存，确保拿到最新版本（否则可能又是旧的坏页面）
      fetch(e.request, { cache: 'no-store' })
        .then(res => {
          const copy = res.clone();
          caches.open(CACHE).then(c => c.put(e.request, copy)).catch(() => {});
          return res;
        })
        .catch(() => caches.match(e.request).then(hit => hit || caches.match('./index.html')))
    );
    return;
  }

  e.respondWith(
    caches.match(e.request).then(hit => hit || fetch(e.request).then(res => {
      const copy = res.clone();
      caches.open(CACHE).then(c => c.put(e.request, copy)).catch(() => {});
      return res;
    }).catch(() => caches.match('./index.html')))
  );
});
