// 词汇生长 · Service Worker（离线壳）
// 策略：同源资源 network-first（在线即最新），离线回退缓存；外源 TTS CDN 直连放行。
// 铁律（学自「我能说英语」）：改动 APP_SHELL 清单时必须同步轮转 CACHE 版本号，
// 否则已安装 PWA 的用户永远读旧缓存。
const CACHE = 'vocab-v2.4.0';
const APP_SHELL = [
  './', './index.html',
  './manifest.webmanifest',
  './css/style.css',
  './js/data.js', './js/data-opd3.js', './js/srs.js', './js/store.js',
  './js/speak-workshop.js', './js/difficulty-level.js', './js/gamification.js',
  './js/cross-platform.js', './js/compatibility-verification.js', './js/app.js',
  './js/usage-limit.js', './js/feedback.js', './js/wechat-whitelist.js', './js/monitoring.js',
  './assets/icons/icon-192.png', './assets/icons/icon-512.png',
  './assets/icons/icon-maskable-512.png', './assets/icons/icon-mono-512.png',
  './assets/ip/su-bujuan-192.png', './assets/ip/su-bujuan-512.png',
  './assets/ip/qr-wechat.jpg'
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(APP_SHELL)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin === self.location.origin) {
    e.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy));
          return res;
        })
        .catch(() => caches.match(req).then((cached) => cached || caches.match('./index.html')))
    );
  }
  // 外源（有道/百度 TTS、Edge 语音）直连放行，不进缓存
});
