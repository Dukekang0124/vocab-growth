// 词汇生长 · Service Worker（离线壳）
// 策略：同源资源 network-first（在线即最新），离线回退缓存；外源 TTS CDN 直连放行。
// 铁律（学自「我能说英语」）：改动 APP_SHELL 清单时必须同步轮转 CACHE 版本号，
// 否则已安装 PWA 的用户永远读旧缓存。
// 发布三同步：CACHE 名 ↔ js/update.js 的 APP_VERSION ↔ update-manifest.json 的 latest
const CACHE = 'vocab-v1.0.32';
const APP_SHELL = [
  './', './index.html', './favicon.ico',
  './manifest.webmanifest', './update-manifest.json',
  './css/style.css',
  './js/data.js', './js/data-opd3.js', './js/data-oxford.js', './js/data-phonetics.js', './js/srs.js', './js/store.js',
  './js/speak-workshop.js', './js/difficulty-level.js', './js/gamification.js',
  './js/app.js', './js/update.js',
  './js/feedback.js', './js/immersion.js', './js/ai-assistant.js', './js/stats-panel.js',
  './assets/vendor/confetti.browser.min.js', './assets/vendor/chart.umd.js',
  './assets/icons/icon-192.png', './assets/icons/icon-512.png',
  './assets/icons/icon-maskable-512.png', './assets/icons/icon-mono-512.png',
  './assets/ip/su-bujuan-192.png', './assets/ip/su-bujuan-512.png',
  './assets/ip/qr-wechat.jpg',
  './assets/art/g-ocean.svg', './assets/art/g-mountain.svg', './assets/art/g-road.svg', './assets/art/g-jobs.svg',
  './assets/art/g-daily.svg', './assets/art/g-mood.svg', './assets/art/g-talk.svg', './assets/art/g-world.svg',
  './assets/art/g-empty-weak.svg', './assets/art/g-empty-records.svg',
  './js/data-oxford.js'
];

/* 逐文件预缓存并向页面广播进度（js/update.js 接收，驱动更新对话框进度条） */
function bcast(msg) {
  return self.clients.matchAll({ includeUncontrolled: true }).then((cs) =>
    cs.forEach((cl) => { try { cl.postMessage(msg); } catch (e) {} })
  );
}

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE).then((c) => {
      let done = 0;
      const total = APP_SHELL.length;
      return APP_SHELL.reduce(
        (p, url) => p
          .then(() => c.add(url))
          .then(() => { done++; return bcast({ type: 'up-progress', done, total }); }),
        Promise.resolve()
      ).then(() => self.skipWaiting());
    })
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
      /* cache:'reload'：绕过浏览器 HTTP 缓存强制回源——否则发新版后
       * network-first 会拿到 HTTP 缓存里的旧文件，用户永远看不到更新 */
      fetch(req, { cache: 'reload' })
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
