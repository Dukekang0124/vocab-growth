// 我能说英语 · Service Worker（离线壳）
// 策略：同源自家资源 network-first，在线即最新；离线回退到缓存的 index.html。
// 外源（有道/Baidu TTS CDN）不缓存，直连放行——离线时 TTS 不出声属已知限制。
// 缓存名随版本轮转：改动 APP_SHELL 清单时**必须**同步改这里，
// 否则已安装 PWA 的用户会一直用旧清单，新文件永远进不了缓存。
const CACHE = 'kaikou-v1.31.8';
const APP_SHELL = [
  '/n900-sentences.js',
  '/manifest.webmanifest',
  '/icon-192.png', '/icon-512.png', '/icon-maskable-512.png', '/icon-mono-512.png',
  '/ip/ip-avatar-512.png',
  '/privacy.html', '/download.html',
  // 苏不倦语音反馈素材（edge-tts 神经男声占位，真人录制后覆盖同名文件）
  '/voice/blind_first_early.mp3', '/voice/blind_first_mid.mp3', '/voice/blind_first_late.mp3',
  '/voice/daily_checkin_early.mp3', '/voice/daily_checkin_mid.mp3', '/voice/daily_checkin_late.mp3',
  '/voice/review_clear_1.mp3', '/voice/review_clear_2.mp3',
  '/voice/achievement_1.mp3', '/voice/achievement_2.mp3',
  '/voice/milestone_3_1.mp3', '/voice/milestone_7_1.mp3', '/voice/milestone_21_1.mp3', '/voice/milestone_100_1.mp3',
  '/voice/welcome_back_1.mp3', '/voice/welcome_back_2.mp3',
  '/voice/score_up_1.mp3', '/voice/daily_wrap_1.mp3', '/voice/unlock_scene_1.mp3',
  '/voice/mistake_1.mp3', '/voice/mistake_2.mp3', '/voice/mid_exit_1.mp3', '/voice/weekly_1.mp3'
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
  if (url.origin !== self.location.origin) return; // 外源放行，不进缓存

  // 克隆真声 mp3：cache-first（首次走网络，之后从缓存秒出，根治“每次播放都慢”）
  if (url.pathname.indexOf('/audio/flows/') === 0) {
    e.respondWith((async () => {
      const cache = await caches.open(CACHE);
      const hit = await cache.match(req.url); // 按绝对 URL 匹配（Range 仅差在 header，不影响命中）
      if (hit) return hit;
      try {
        const noRange = new Request(req.url, {
          method: 'GET', headers: new Headers(),
          mode: req.mode || 'cors',
          credentials: req.credentials || 'same-origin',
          redirect: req.redirect || 'follow'
        });
        const res = await fetch(noRange);
        if (res && res.ok) {
          const clone = res.clone();
          // 关键：用 waitUntil 保活 SW 直到缓存写入完成，否则 SW 在 respondWith 返回后即被回收，
          // cache.put 悬空 → 刷新后复播仍走网络（"每次都慢"治不彻底）。
          e.waitUntil(cache.put(req.url, clone));
        }
        return res;
      } catch (err) {
        return hit || (await cache.match('/index.html')) || Response.error();
      }
    })());
    return;
  }

  // 其余同源自家资源：network-first（在线即最新，离线回退缓存）
  e.respondWith(
    fetch(req)
      .then((res) => {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(req, copy));
        return res;
      })
      .catch(() => caches.match(req).then((cached) => cached || caches.match('/index.html')))
  );
});
