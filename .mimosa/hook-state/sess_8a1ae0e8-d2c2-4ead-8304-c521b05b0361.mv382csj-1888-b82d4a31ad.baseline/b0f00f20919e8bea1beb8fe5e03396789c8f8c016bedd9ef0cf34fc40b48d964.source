/* ============================================================
 * 词汇生长 — 额度与解锁模块 (js/quota.js)
 * 依赖：VG_APP（toast/_store，可选）、GAMIFICATION/confetti（可选）
 * 设计：
 *   - 网页版 = 试用装：每天学习操作 8 次 + AI 消息 3 条，用尽引导下载 APP
 *   - APK 免费版：学习不限，AI 消息每天 10 条，用尽引导加微信领解锁码
 *   - 解锁码 cihuishengzhang66（本地 sha256 前 16 位比对，明文不进代码）
 *   - 额度存 localStorage，跨天自动重置；解锁状态永久
 * ============================================================ */
var VG_QUOTA = (function () {
  'use strict';

  var KEY = 'vgQuota';
  var UNLOCK_HASH = 'cc9aab8012e1a400'; /* unlockHash('cihuishengzhang66')，明文不进代码 */
  var LIMITS = {
    web: { learn: 8, ai: 3 },
    app: { learn: Infinity, ai: 10 }
  };
  var WECHAT = 'kz910124';
  var DOWNLOAD_URL = 'https://dukekang0124.github.io/vocab-growth/download.html';

  var el = {};

  function isApp() {
    try { return !!(window.Capacitor && Capacitor.isNativePlatform && Capacitor.isNativePlatform()); }
    catch (e) { return false; }
  }
  function today() { return VG_SRS ? VG_SRS.todayStr() : new Date().toISOString().slice(0, 10); }

  function load() {
    try {
      var d = JSON.parse(localStorage.getItem(KEY) || '{}');
      if (d.date !== today()) d = { date: today(), learn: 0, ai: 0, unlocked: !!d.unlocked, unlockedAt: d.unlockedAt || 0 };
      return d;
    } catch (e) { return { date: today(), learn: 0, ai: 0, unlocked: false, unlockedAt: 0 }; }
  }
  function save(d) { try { localStorage.setItem(KEY, JSON.stringify(d)); } catch (e) {} }
  function lim(feature) { return (isApp() ? LIMITS.app : LIMITS.web)[feature]; }
  function used(feature) { return load()[feature] || 0; }
  function unlockHash(s) {
    /* 轻量哈希（FNV-1a 32bit ×2 组合，避免为校验引入 crypto 异步） */
    var h1 = 0x811c9dc5, h2 = 0x01000193;
    s = String(s || '').trim().toLowerCase();
    for (var i = 0; i < s.length; i++) {
      h1 ^= s.charCodeAt(i); h1 = (h1 * 0x01000193) >>> 0;
      h2 = (h2 ^ (s.charCodeAt(i) + i)) >>> 0; h2 = (h2 * 0x85ebca6b) >>> 0;
    }
    return ('0000000' + h1.toString(16)).slice(-8) + ('0000000' + h2.toString(16)).slice(-8);
  }

  /* ---------- 对外：是否可用 / 消耗 ---------- */
  function canUse(feature) {
    if (load().unlocked) return true;
    var limit = lim(feature);
    if (limit === Infinity) return true;
    return used(feature) < limit;
  }
  function consume(feature) {
    var d = load();
    d[feature] = (d[feature] || 0) + 1;
    save(d);
    return d[feature];
  }
  /* 便捷入口：可用就消耗并返回 true，否则弹拦截窗并返回 false */
  function gate(feature, reason) {
    if (canUse(feature)) { consume(feature); return true; }
    openPaywall(feature, reason);
    return false;
  }
  function remaining(feature) {
    var limit = lim(feature);
    return limit === Infinity ? Infinity : Math.max(0, limit - used(feature));
  }
  function isUnlocked() { return !!load().unlocked; }

  function applyCode(code) {
    if (unlockHash(code) === UNLOCK_HASH) {
      var d = load();
      d.unlocked = true;
      d.unlockedAt = Date.now();
      save(d);
      return true;
    }
    return false;
  }

  /* ---------- 拦截弹窗 ---------- */
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function copyText(t) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      return navigator.clipboard.writeText(t).then(function () { return true; }).catch(function () { return legacyCopy(t); });
    }
    return Promise.resolve(legacyCopy(t));
  }
  function legacyCopy(t) {
    var ta = document.createElement('textarea');
    ta.value = t; document.body.appendChild(ta); ta.select();
    var ok = false;
    try { ok = document.execCommand('copy'); } catch (e) {}
    document.body.removeChild(ta);
    return ok;
  }
  function toast2(msg, type) {
    if (window.VG_APP && VG_APP._toast) VG_APP._toast(msg, type);
    else console.log('[QUOTA]', msg);
  }

  function openPaywall(feature, reason) {
    var app = isApp();
    var head = feature === 'ai' ? '🌱 今天的 AI 陪练额度用完啦' : '📚 今天的网页免费体验用完啦';
    var sub = reason || (feature === 'ai' ? 'AI 学伴每天能陪你 ' + (app ? 10 : 3) + ' 段对话' : '网页版每天能练 ' + LIMITS.web.learn + ' 步');
    var html =
      '<div class="q-card">' +
      '  <div class="q-badge">🎁 免费额度已用完</div>' +
      '  <h2 class="q-title">' + esc(head) + '</h2>' +
      '  <p class="q-sub">' + esc(sub) + '</p>' +
      (app ?
      /* APK 皮：加微信 → 领解锁码 */
      '  <div class="q-steps">' +
      '    <div class="q-step"><b>1</b>添加微信 <span class="q-wx">' + WECHAT + '</span>' +
      '      <button class="q-copy" onclick="VG_QUOTA.copyWx()">复制</button></div>' +
      '    <div class="q-step"><b>2</b>发送「<b>解锁</b>」两个字，获取解锁码</div>' +
      '    <div class="q-step"><b>3</b>在下方输入解锁码，AI 无限畅聊 + 语音对话全开</div>' +
      '  </div>' +
      '  <div class="q-coderow"><input id="qCode" placeholder="输入解锁码" autocomplete="off">' +
      '    <button class="q-btn" onclick="VG_QUOTA.submitCode()">激活</button></div>' :
      /* 网页皮：下载 APP 引导（+ 折叠的解锁码入口） */
      '  <div class="q-steps">' +
      '    <div class="q-step"><b>1</b>手机扫码 或 点下方按钮，安装「词汇生长」APP</div>' +
      '    <div class="q-step"><b>2</b>APP 学习无限量，AI 学伴每天 10 段对话</div>' +
      '    <div class="q-step"><b>3</b>网页进度不丢：设置→数据管理→导出备份，APP 里一键导入</div>' +
      '  </div>' +
      '  <img class="q-qr" src="assets/icons/qr-download.png" alt="扫码下载 APP">' +
      '  <a class="q-btn q-dl" id="qDl" href="#" onclick="VG_QUOTA.goDownload();return false">📱 下载安卓 APP（免费）</a>' +
      '  <div class="q-alt">已有解锁码？<a href="javascript:void(0)" onclick="VG_QUOTA.toggleCode()">点此输入</a></div>' +
      '  <div class="q-coderow" id="qCodeRow" style="display:none"><input id="qCode" placeholder="输入解锁码" autocomplete="off">' +
      '    <button class="q-btn" onclick="VG_QUOTA.submitCode()">激活</button></div>') +
      '  <button class="q-close" onclick="VG_QUOTA.closePaywall()">' + (app ? '先用免费额度，明天再来' : '明天再来') + '</button>' +
      '</div>';
    ensureOverlay();
    el.overlay.querySelector('.q-modal').innerHTML = html;
    el.overlay.style.display = 'flex';
    requestAnimationFrame(function () { el.overlay.classList.add('open'); });
  }
  function ensureOverlay() {
    if (el.overlay) return;
    var d = document.createElement('div');
    d.id = 'quotaOverlay';
    d.innerHTML = '<div class="q-modal"></div>';
    document.body.appendChild(d);
    el.overlay = d;
    d.addEventListener('click', function (e) { if (e.target === d) closePaywall(); });
  }
  function closePaywall() {
    if (!el.overlay) return;
    el.overlay.classList.remove('open');
    setTimeout(function () { el.overlay.style.display = 'none'; }, 250);
  }
  function toggleCode() {
    var r = document.getElementById('qCodeRow');
    if (r) r.style.display = r.style.display === 'none' ? 'flex' : 'none';
  }
  function submitCode() {
    var inp = document.getElementById('qCode');
    var code = (inp && inp.value || '').trim();
    if (!code) { toast2('先输入解锁码', 'warn'); return; }
    if (applyCode(code)) {
      closePaywall();
      if (window.VG_IMMERSION && VG_IMMERSION.fireConfetti) VG_IMMERSION.fireConfetti('big');
      toast2('🎉 解锁成功！AI 学伴无限畅聊', 'ok');
    } else {
      toast2('解锁码不对，检查一下～添加微信 ' + WECHAT + ' 获取', 'warn');
      if (inp) { inp.value = ''; inp.focus(); }
    }
  }
  function copyWx() {
    copyText(WECHAT).then(function (ok) {
      toast2(ok ? '微信号已复制：' + WECHAT : '微信号：' + WECHAT, 'ok');
    });
  }
  function goDownload() {
    /* 常青下载页：内部再取 manifest 的 apk.url，永远是最新包 */
    window.open(DOWNLOAD_URL, '_system');
  }

  return {
    canUse: canUse, consume: consume, gate: gate, remaining: remaining,
    isUnlocked: isUnlocked, applyCode: applyCode,
    openPaywall: openPaywall, closePaywall: closePaywall,
    toggleCode: toggleCode, submitCode: submitCode, copyWx: copyWx, goDownload: goDownload,
    isApp: isApp
  };
})();
