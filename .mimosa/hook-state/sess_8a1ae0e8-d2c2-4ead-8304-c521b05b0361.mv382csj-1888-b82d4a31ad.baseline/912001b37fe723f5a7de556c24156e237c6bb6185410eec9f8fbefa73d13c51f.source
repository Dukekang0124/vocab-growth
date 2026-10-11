/* ============================================================
 * 词汇生长 — 沉浸感反馈层 (js/immersion.js)
 * 三件事：触觉反馈（Haptics/Vibrate）、庆祝动效（canvas-confetti）、
 * 每日学习提醒（Local Notifications，仅 APK）。
 * 网页环境自动降级：触觉→navigator.vibrate（安卓）→静默；通知→隐藏设置。
 * ============================================================ */
(function () {
  'use strict';

  function capPlugin(name) {
    return window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins[name];
  }

  /* ---------- 触觉反馈 ---------- */
  function vibrate(pattern) {
    try { if (navigator.vibrate) navigator.vibrate(pattern); } catch (e) {}
  }
  /* 轻点：选中/翻面等小交互 */
  function tap() {
    var H = capPlugin('Haptics');
    if (H && H.impact) { try { H.impact({ style: 'LIGHT' }); return; } catch (e) {} }
    vibrate(15);
  }
  /* 中等：答题提交 */
  function impact() {
    var H = capPlugin('Haptics');
    if (H && H.impact) { try { H.impact({ style: 'MEDIUM' }); return; } catch (e) {} }
    vibrate(35);
  }
  /* 成功：答对/攻克/徽章（双击节奏） */
  function success() {
    var H = capPlugin('Haptics');
    if (H && H.notification) { try { H.notification({ type: 'SUCCESS' }); return; } catch (e) {} }
    vibrate([28, 45, 28]);
  }
  /* 庆祝：日目标全清/里程碑（三连节奏） */
  function celebrate() {
    var H = capPlugin('Haptics');
    if (H && H.notification) { try { H.notification({ type: 'SUCCESS' }); } catch (e) {} }
    vibrate([30, 50, 30, 50, 60]);
  }

  /* ---------- 庆祝动效 ---------- */
  var confettiReady = false;
  function ensureConfetti() {
    if (confettiReady) return true;
    if (typeof window.confetti === 'function') { confettiReady = true; return true; }
    return false;
  }
  /* 从屏幕两侧喷射品牌色纸屑 */
  function fireConfetti(mode) {
    if (!ensureConfetti()) return;
    var colors = ['#2E7D32', '#66BB6A', '#A5D6A7', '#FFD54F', '#4FC3F7'];
    try {
      if (mode === 'big') {
        window.confetti({ particleCount: 90, spread: 100, origin: { x: 0.2, y: 0.7 }, colors: colors, angle: 60 });
        window.confetti({ particleCount: 90, spread: 100, origin: { x: 0.8, y: 0.7 }, colors: colors, angle: 120 });
        setTimeout(function () { window.confetti({ particleCount: 130, spread: 160, origin: { x: 0.5, y: 0.55 }, colors: colors }); }, 350);
      } else {
        window.confetti({ particleCount: 70, spread: 85, origin: { x: 0.5, y: 0.62 }, colors: colors });
      }
    } catch (e) {}
  }

  /* ---------- 每日学习提醒（APK） ---------- */
  var REMIND_ID = 'vocab-daily-remind'; /* 固定 id：重复排程自动覆盖 */
  var REMIND_TEXTS = [
    '今天的 5 个词在等你复习 🌱',
    '坚持链还在生长——今天也别断哦 🔥',
    '10 分钟，复习 5 词 · 造句 1 句 · 开口 1 次',
    '昨天背的词正在等你去救它们 🛡️'
  ];

  function remindSupported() {
    return !!(capPlugin('LocalNotifications'));
  }

  /* 读取/存储提醒设置（存 store.updatePref 同级：独立 key 避免迁移） */
  function getRemindSetting() {
    try {
      var raw = localStorage.getItem('vocab_remind_v1');
      if (raw) return JSON.parse(raw);
    } catch (e) {}
    return { enabled: false, hour: 20, minute: 0 };
  }
  function saveRemindSetting(s) {
    try { localStorage.setItem('vocab_remind_v1', JSON.stringify(s)); } catch (e) {}
  }

  function scheduleRemind(setting) {
    var LN = capPlugin('LocalNotifications');
    if (!LN) return Promise.resolve(false);
    var text = REMIND_TEXTS[Math.floor(Math.random() * REMIND_TEXTS.length)];
    var p = LN.schedule({
      notifications: [{
        id: 20260914,
        title: '🌱 词汇生长 · 该浇水了',
        body: text,
        schedule: { on: { year: 2026, month: 1, day: 1, hour: setting.hour, minute: setting.minute }, allowWhileIdle: true, repeats: true, every: 'day' }
      }]
    });
    return Promise.resolve(p ? true : false).catch ? Promise.resolve(true) : Promise.resolve(true);
  }

  function cancelRemind() {
    var LN = capPlugin('LocalNotifications');
    if (!LN) return Promise.resolve();
    try { return LN.cancel({ notifications: [{ id: 20260914 }] }); } catch (e) { return Promise.resolve(); }
  }

  /* 开启：请求权限（APK 首次弹系统授权）→ 排程每日提醒 */
  function enableRemind(hour, minute) {
    var LN = capPlugin('LocalNotifications');
    if (!LN) return Promise.resolve({ ok: false, reason: 'unsupported' });
    var req = (LN.requestPermissions && LN.requestPermissions()) || Promise.resolve({ display: 'granted' });
    return Promise.resolve(req).then(function (perm) {
      var granted = !perm || perm.display === 'granted' || perm.display === 'prompt';
      if (!granted) return { ok: false, reason: 'denied' };
      var setting = { enabled: true, hour: hour, minute: minute };
      saveRemindSetting(setting);
      return scheduleRemind(setting).then(function () { return { ok: true }; });
    }).catch(function () { return { ok: false, reason: 'denied' }; });
  }

  function disableRemind() {
    var setting = getRemindSetting();
    setting.enabled = false;
    saveRemindSetting(setting);
    return cancelRemind().then(function () { return { ok: true }; });
  }

  window.VG_IMMERSION = {
    tap: tap,
    impact: impact,
    success: success,
    celebrate: celebrate,
    fireConfetti: fireConfetti,
    remindSupported: remindSupported,
    getRemindSetting: getRemindSetting,
    enableRemind: enableRemind,
    disableRemind: disableRemind
  };
})();
