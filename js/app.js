/* ============================================================
 * 词汇生长 — UI 层 (js/app.js)
 * 依赖：VG_DATA / VG_SRS / VG_STORE（经典脚本全局）
 * 职责：hash 路由 + 6 页渲染 + TTS/音频 + 分层抢救交互
 * ============================================================ */
/* 引入新模块 */
var VG_USAGE_LIMIT = typeof USAGE_LIMIT !== 'undefined' ? USAGE_LIMIT : {};
var VG_WECHAT = typeof showAlertIfNeeded !== 'undefined' ? {
  showAlertIfNeeded: showAlertIfNeeded
} : {};

var VG_APP = (function () {
  'use strict';

  /* ---------- 基础工具 ---------- */
  function $(sel) { return document.querySelector(sel); }
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  var toastTimer = null;
  var currentRating = 0;  // 反馈评分
  var usageCheckTimer = null;  // 使用限制检查定时器
  var studyStartTime = null;  // 学习开始时间

  /* ---------- 使用限制检查 ---------- */
  function checkUsageLimit(action) {
    if (!VG_USAGE_LIMIT.checkUsageLimit) return { allowed: true, remaining: Infinity };

    var userId = 'user_' + (Math.random().toString(36).substr(2, 9));
    var result = VG_USAGE_LIMIT.checkUsageLimit(userId, action);

    if (!result.allowed) {
      // 显示限制提示
      toast(result.reason + '（剩余: ' + result.remaining + '）', 'warn', 4000);
      return { allowed: false, reason: result.reason };
    }

    return { allowed: true, remaining: result.remaining };
  }

  function recordUsage(action, amount) {
    if (!VG_USAGE_LIMIT.recordUsage) return;

    var userId = 'user_' + (Math.random().toString(36).substr(2, 9));
    VG_USAGE_LIMIT.recordUsage(userId, action, amount);
  }

  function addStudyTime(minutes) {
    if (!VG_USAGE_LIMIT.addStudyTime) return;

    var userId = 'user_' + (Math.random().toString(36).substr(2, 9));
    VG_USAGE_LIMIT.addStudyTime(userId, minutes);
  }

  function startStudyTimer() {
    if (!VG_USAGE_LIMIT.addStudyTime) return;
    studyStartTime = Date.now();
    if (usageCheckTimer) clearInterval(usageCheckTimer);

    // 每分钟检查一次学习时长
    usageCheckTimer = setInterval(function() {
      var elapsed = Math.floor((Date.now() - studyStartTime) / 1000 / 60);
      addStudyTime(elapsed);
    }, 60000);
  }

  function stopStudyTimer() {
    if (usageCheckTimer) {
      clearInterval(usageCheckTimer);
      usageCheckTimer = null;
    }
    if (studyStartTime) {
      var elapsed = Math.floor((Date.now() - studyStartTime) / 1000 / 60);
      addStudyTime(elapsed);
      studyStartTime = null;
    }
  }

  /* ---------- 反馈功能 ---------- */
  function showFeedbackModal() {
    var modal = $('#feedbackModal');
    if (modal) {
      modal.style.display = 'block';
      setRating(currentRating || 0); /* 每次打开按当前评分重绘星星（未评 = 全灰空心） */
    }
  }

  function closeFeedbackModal() {
    var modal = $('#feedbackModal');
    if (modal) {
      modal.style.display = 'none';
    }
  }

  function setRating(rating) {
    var was = currentRating;
    currentRating = rating;
    /* 评分单位是苏不倦头像：未点亮灰色，点亮彩色并弹一下（星星 emoji/字符配色始终不够醒目） */
    var btns = document.querySelectorAll('#starRating .rate-btn');
    btns.forEach(function (b, i) {
      var on = i < rating;
      b.classList.toggle('on', on);
      b.style.transform = on ? 'scale(1.15)' : 'scale(1)';
    });
    /* 音效：每点亮一个播上行音符；集齐 5 个小苏开口说谢谢 */
    var bubble = document.getElementById('rateThanks');
    if (rating > was && rating > 0) {
      playBlip(rating);
      if (rating === 5) {
        if (bubble) { bubble.classList.add('show'); setTimeout(function () { bubble.classList.remove('show'); }, 2600); }
        speakThanks();
      }
    }
    if (rating < 5 && bubble) bubble.classList.remove('show');
  }

  /* ---- 评分音效：Web Audio 合成（零音频文件，点击手势内播放无限制） ---- */
  var rateAudioCtx = null;
  function getRateCtx() {
    if (!rateAudioCtx) {
      var AC = window.AudioContext || window.webkitAudioContext;
      if (AC) { try { rateAudioCtx = new AC(); } catch (e) {} }
    }
    if (rateAudioCtx && rateAudioCtx.state === 'suspended') { try { rateAudioCtx.resume(); } catch (e) {} }
    return rateAudioCtx;
  }
  function playBlip(step) {
    var freq = 523.25 * Math.pow(1.122, step); /* C4 起每级升半音，越点越亮 */
    var ctx = getRateCtx();
    if (ctx && ctx.state === 'running') {
      try {
        var o = ctx.createOscillator();
        var g = ctx.createGain();
        o.type = 'sine';
        o.frequency.value = freq;
        g.gain.setValueAtTime(0.12, ctx.currentTime);
        g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.22);
        o.connect(g); g.connect(ctx.destination);
        o.start(); o.stop(ctx.currentTime + 0.22);
        return;
      } catch (e) { /* 落到 audio 元素兜底 */ }
    }
    /* 微信 XWeb 等 Web Audio 受限环境：JS 现场合成的 WAV 用 <audio> 播（与发音同通道） */
    playWavBlob(freq);
  }

  /* JS 生成正弦波 WAV → Blob URL → <audio> 播放，绕开 Web Audio 限制 */
  var beepUrlCache = {};
  function playWavBlob(freq) {
    try {
      var key = Math.round(freq);
      if (!beepUrlCache[key]) {
        var sr = 8000, n = Math.floor(sr * 0.16);
        var buf = new ArrayBuffer(44 + n * 2);
        var v = new DataView(buf);
        function wstr(off, s) { for (var i = 0; i < s.length; i++) v.setUint8(off + i, s.charCodeAt(i)); }
        wstr(0, 'RIFF'); v.setUint32(4, 36 + n * 2, true); wstr(8, 'WAVE');
        wstr(12, 'fmt '); v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true);
        v.setUint32(24, sr, true); v.setUint32(28, sr * 2, true); v.setUint16(32, 2, true); v.setUint16(34, 16, true);
        wstr(36, 'data'); v.setUint32(40, n * 2, true);
        for (var i = 0; i < n; i++) {
          var env = Math.min(1, i / (sr * 0.012)) * Math.pow(1 - i / n, 1.4);
          v.setInt16(44 + i * 2, Math.sin(2 * Math.PI * freq * i / sr) * env * 30000, true);
        }
        beepUrlCache[key] = URL.createObjectURL(new Blob([buf], { type: 'audio/wav' }));
      }
      stopAudio();
      var a = new Audio(beepUrlCache[key]);
      a.volume = 0.6;
      currentAudio = a;
      var p = a.play();
      if (p && p.catch) p.catch(function () {});
    } catch (e) {}
  }
  /* 集齐 5 个：小苏用中文说「谢谢夸奖！」
   * 音源：Edge 云希拟真男声（cheerful）→ 真声录音位（assets/ip/thanks-real.mp3）→ 百度 zh → 有道 */
  function speakThanks() {
    edgeTts('哎哟，谢谢夸奖！', 'zh-CN', isSlow()).then(function (blob) {
      if (blob) {
        stopAudio();
        var a = new Audio(URL.createObjectURL(blob));
        currentAudio = a;
        a.volume = 0.9;
        var p = a.play();
        if (p && p.catch) p.catch(function () { playChain(['assets/ip/thanks-real.mp3',
          'https://fanyi.baidu.com/gettts?lan=zh&text=' + encodeURIComponent('哎哟，谢谢夸奖！') + '&spd=4&source=web',
          'https://dict.youdao.com/dictvoice?audio=' + encodeURIComponent('哎哟，谢谢夸奖')], '哎哟，谢谢夸奖！', true); });
      } else {
        playChain(['assets/ip/thanks-real.mp3',
          'https://fanyi.baidu.com/gettts?lan=zh&text=' + encodeURIComponent('哎哟，谢谢夸奖！') + '&spd=4&source=web',
          'https://dict.youdao.com/dictvoice?audio=' + encodeURIComponent('哎哟，谢谢夸奖')], '哎哟，谢谢夸奖！', true);
      }
    }).catch(function () { playChain(['assets/ip/thanks-real.mp3',
      'https://fanyi.baidu.com/gettts?lan=zh&text=' + encodeURIComponent('哎哟，谢谢夸奖！') + '&spd=4&source=web',
      'https://dict.youdao.com/dictvoice?audio=' + encodeURIComponent('哎哟，谢谢夸奖')], '哎哟，谢谢夸奖！', true); });
  }

  function submitFeedback(e) {
    e.preventDefault();
    var form = e.target;
    var type = form.type.value;
    var content = form.content.value;
    var email = form.email.value;

    /* 运行时解析 feedback.js 的全局 submitFeedback。
     * 注意：本 IIFE 内有同名 handler，直接写 submitFeedback 会解析到自己造成递归，
     * 必须显式走 window。 */
    var submitFn = (typeof window.submitFeedback === 'function') ? window.submitFeedback : null;
    if (!submitFn) {
      toast('反馈功能暂未启用', 'warn');
      return;
    }

    var result = submitFn(type, content, currentRating, email);
    if (result.success) {
      /* 参照「我能说英语」v1.5.2 教训：只写 localStorage 反馈没人收得到，
       * 引导用户加微信直接发（反馈同时已存本机，可从数据管理导出兜底） */
      toast('✅ 已保存！加微信 kz910124（备注：词汇生长）直接发我，响应最快', 'ok', 6000);
      closeFeedbackModal();
      form.reset();
      setRating(0);
    } else {
      toast(result.message, 'err');
    }
  }

  /* 复制作者微信号（反馈/交流渠道），失败时兜底提示手动复制 */
  function copyWechat() {
    var id = 'kz910124';
    var done = function () { toast('微信号已复制：' + id + '（备注：词汇生长）', 'ok', 4000); };
    var fail = function () { toast('复制失败，微信号：' + id + '（请手动复制）', 'warn', 5000); };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(id).then(done, fail);
    } else {
      try {
        var ta = document.createElement('textarea');
        ta.value = id; document.body.appendChild(ta); ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
        done();
      } catch (e) { fail(); }
    }
  }

  /* 网络自检：逐源探测发音依赖的在线音源（诊断 APK 内发音不可用问题） */
  function netDiag() {
    var box = document.getElementById('diagResult');
    if (!box) return;
    box.innerHTML = '诊断中…';
    var probes = [
      ['百度 TTS', 'https://fanyi.baidu.com/gettts?lan=en&text=hi&spd=3&source=web'],
      ['有道 TTS', 'https://dict.youdao.com/dictvoice?type=2&audio=hello']
    ];
    var lines = [];
    var done = 0;
    probes.forEach(function (pr) {
      fetch(pr[1], { mode: 'no-cors', cache: 'no-store' })
        .then(function () { lines.push('✅ ' + pr[0] + '：可达'); check(); })
        .catch(function (e) { lines.push('❌ ' + pr[0] + '：不通（' + (e && e.message ? e.message : '网络失败') + '）'); check(); });
    });
    edgeTts('hi', 'en-US').then(function (blob) {
      lines.push(blob ? '✅ Edge 拟真音源：可达' : '⚠️ Edge 拟真音源：不通（已自动回落，不影响使用）');
      check();
    });
    function check() {
      done++;
      if (done >= probes.length + 1) {
        lines.push('—— 若 TTS 全部不通：请检查手机是否给本 App 联网权限（设置 → 应用 → 词汇生长 → 流量使用）');
        box.innerHTML = lines.join('<br>');
      } else {
        box.innerHTML = '诊断中…(' + done + '/' + (probes.length + 1) + ')';
      }
    }
  }

  /* ---------- Toast / 横幅 ---------- */
  function toast(msg, type, ms) {
    var wrap = $('#toastWrap');
    var el = document.createElement('div');
    el.className = 'toast ' + (type || '');
    el.textContent = msg;
    wrap.appendChild(el);
    setTimeout(function () { el.remove(); }, ms || 2600);
  }

  var store = VG_STORE.createStore(
    (typeof localStorage !== 'undefined' ? localStorage : null) || {
      _m: {}, getItem: function (k) { return this._m[k] || null; },
      setItem: function (k, v) { this._m[k] = v; }, removeItem: function (k) { delete this._m[k]; }
    },
    VG_DATA, VG_SRS
  );

  /* ---------- 发音：多源音频链 + 失败自动重试 ----------
   * 链路：OB 原声 mp3 → 有道词典发音 → 百度翻译TTS → 浏览器TTS(有英文语音才用)
   * 微信 X5 暴露 speechSynthesis 但无语音包（假接口），所以在线音频源优先，
   * 浏览器 TTS 只作为最后兜底且必须检测到英文语音才启用。
   * 微信音频需在 WeixinJSBridgeReady 后才稳定，init 时做一次解锁。 */
  var IS_WECHAT = /MicroMessenger/i.test(navigator.userAgent);
  var currentAudio = null;
  /* M3 修复：TTS 播放期间在发音按钮上显示 loading 态 */
  var _lastSpeakBtn = null;
  document.addEventListener('click', function (e) {
    var btn = e.target.closest && e.target.closest('.speak-btn');
    if (btn) _lastSpeakBtn = btn;
  }, true);
  function clearSpeakLoading() {
    if (_lastSpeakBtn) { _lastSpeakBtn.classList.remove('loading'); _lastSpeakBtn = null; }
  }
  function stopAudio() { if (currentAudio) { try { currentAudio.pause(); } catch (e) {} } clearSpeakLoading(); }
  function onlineTtsUrls(text, slow) {
    /* 顺序经实测校准（参照「我能说英语」v1.5.2 测量）：
     * 百度 spd3 RMS -15.8dB 峰值 0.877，比有道 type2（-20.1dB / 0.362）响约 2.7 倍，故百度首选。
     * 慢速模式用百度 spd=2 真慢速合成（比 playbackRate 变速自然），有道用元素降速兜底 */
    return [
      'https://fanyi.baidu.com/gettts?lan=en&text=' + encodeURIComponent(text) + '&spd=' + (slow ? 2 : 3) + '&source=web',
      'https://dict.youdao.com/dictvoice?type=2&audio=' + encodeURIComponent(text)
    ];
  }
  /* TTS 音频代理（学自「我能说英语」audio-proxy）：部署 Cloudflare Worker 后填
   * 'https://xxx.workers.dev/?u='。作用：Worker 端伪造正常浏览器 UA/Referer 转发，
   * 解决 Capacitor WebView 的 wv UA / localhost 来源被 TTS CDN 拒绝的问题；
   * 兼带 CORS 头与 7 天边缘缓存。留空 = 不走代理。 */
  var TTS_PROXY = 'https://kaikou-tts.kang7108558.workers.dev/?u=';
  function proxyUrl(u) {
    return (TTS_PROXY && /^https?:/i.test(u)) ? TTS_PROXY + encodeURIComponent(u) : u;
  }

  function playChain(urls, text, silentFail) {
    stopAudio();
    if (!urls.length) { clearSpeakLoading(); if (!silentFail && !ttsSpeak(text)) toast('发音暂不可用，请检查网络后重试', 'warn', 3000); return; }
    if (_lastSpeakBtn) _lastSpeakBtn.classList.add('loading');
    urls = urls.map(proxyUrl); /* 在线音源经代理转发（WebView UA 被 CDN 拒时的修复通道） */
    var i = 0;
    var a = new Audio();
    currentAudio = a;
    try { a.playbackRate = (store.state.speed || 1.0) >= 1 ? 1 : 0.7; } catch (e) {}
    /* 部分内核在 metadata 就绪前会忽略 playbackRate，就绪后再设一次 */
    a.addEventListener('loadedmetadata', function () {
      try { a.playbackRate = (store.state.speed || 1.0) >= 1 ? 1 : 0.7; } catch (e2) {}
    });
    a.addEventListener('playing', clearSpeakLoading);
    a.addEventListener('ended', clearSpeakLoading);
    a.onerror = function () {
      i++;
      if (i < urls.length) { a.src = urls[i]; try { a.load(); } catch (e2) {} a.play().catch(function () {}); }
      else { clearSpeakLoading(); if (!silentFail && !ttsSpeak(text)) toast('发音暂不可用，请检查网络后重试', 'warn', 3000); }
    };
    a.src = urls[0];
    a.play().catch(function () {
      /* 播放被拦截（罕见：非用户手势触发）→ 延迟重试一次 */
      setTimeout(function () { try { a.play(); } catch (e) {} }, 200);
    });
  }
  function isSlow() { return (store.state.speed || 1.0) < 1; }

  function speak(text, opts) {
    opts = opts || {};
    var urls = [];
    if (opts.audio) urls.push('assets/audio/' + opts.audio);
    urls = urls.concat(onlineTtsUrls(text, isSlow()));
    playChain(urls, text, undefined, isSlow());
  }
  /* 浏览器 TTS：只在确有英文语音时使用（微信 X5 是假接口，直接跳过） */
  function ttsSpeak(text) {
    if (!('speechSynthesis' in window)) return false;
    var enVoice = null;
    try {
      var voices = speechSynthesis.getVoices() || [];
      if (!voices.length) return false; /* 语音包没就绪/不存在 → 不假装成功 */
      for (var i = 0; i < voices.length; i++) {
        if (/^en/i.test(voices[i].lang || '')) { enVoice = voices[i]; break; }
      }
      if (!enVoice) return false;
      speechSynthesis.cancel();
      var u = new SpeechSynthesisUtterance(text);
      u.lang = 'en-US'; u.rate = (store.state.speed || 1.0) >= 1 ? 1 : 0.7;
      u.voice = enVoice;
      speechSynthesis.speak(u);
      return true;
    } catch (e) { return false; }
  }
  /* 微信音频解锁：桥就绪或首次触摸时播放一次极短的静音音频 */
  var audioUnlocked = false;
  function unlockAudio() {
    if (audioUnlocked) return;
    audioUnlocked = true;
    try {
      /* 最短的合法静音 WAV，只为解锁微信的音频播放权限（volume 0 会被部分内核优化掉） */
      var a = new Audio('data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA');
      a.volume = 0.01;
      var p = a.play();
      if (p && p.catch) p.catch(function () {});
    } catch (e) {}
  }
  function speakWord(word) {
    speak(word.w || word.word, { audio: word.audio });
  }
  function speakChunkText(en) { speak(en); }

  /* ---------- 深度徽章 ---------- */
  function depthBadge(w) {
    if (w.depth === 'untested' || w.depth == null) return '<span class="badge badge-gray">未测</span>';
    if (w.depth <= 1) return '<span class="badge badge-green">🟢 记得牢</span>';
    if (w.depth <= 3) return '<span class="badge badge-yellow">🟡 有点模糊</span>';
    return '<span class="badge badge-red">🔴 快忘了</span>';
  }
  function sentBadge(w) {
    return w.sent === 'done'
      ? '<span class="badge badge-green">✅ 已造句</span>'
      : '<span class="badge badge-gray">⬜ 待造句</span>';
  }
  function groupName(id) {
    for (var i = 0; i < VG_DATA.GROUPS.length; i++) if (VG_DATA.GROUPS[i].id === id) return VG_DATA.GROUPS[i].name;
    return '我的新词';
  }
  function maskWord(en, word) {
    var parts = word.split(/\s+/);
    var out = en;
    parts.forEach(function (p) {
      var re = new RegExp('\\b' + p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b', 'i');
      out = out.replace(re, '___');
    });
    return out;
  }

  /* ---------- 路由 ---------- */
  var PAGES = {};
  var _navToTop = true;

  /* ---------- 页面级新手引导 ---------- */
  var PAGE_GUIDES = {
    today: {
      icon: '📋', title: '今日看板',
      body: '这里是你每天的开始。先看「今日目标」——复习 5 词、造句 1 句、开口 1 次，三件事做完就打卡。',
      cta: '从复习开始'
    },
    learn: {
      icon: '📖', title: '学新词',
      body: '词按故事分组学（如海洋探险：wetsuit, dive, dolphin），同一故事的词成串记。也可以从「图解词库」挑词收进来。',
      cta: '选一个词群看看'
    },
    review: {
      icon: '🔄', title: '复习：分层抢救',
      body: '六层提示：先硬想 30 秒 → 词性 → 词义 → 首字母 → 长度+场景 → 看答案。想不起来的那几秒，才是大脑加固记忆的时候。',
      cta: '开始第一个词'
    },
    workshop: {
      icon: '🎤', title: '开口练',
      body: '4 种练法：造句、句型填空、关键词造句、开口说。提交后立即评分，对照「老外会说」版本。写错也是生产模式。',
      cta: '选一个词试造句'
    },
    chunks: {
      icon: '💬', title: '说法库',
      body: '你想说 X → 老外会说 Y。攒够库存，自然不用中文翻译。开「自测模式」可以遮住英文，看中文回想。',
      cta: '看看高频说法'
    },
    library: {
      icon: '📚', title: '我的词汇',
      body: '主动词汇库、薄弱词清单、造句记录、成就徽章、数据管理——你所有的学习数据在这里。别忘了定期导出备份。',
      cta: '看看你的词库'
    }
  };

  function guideBannerHTML(page) {
    var g = PAGE_GUIDES[page];
    if (!g) return '';
    return '<div class="guide-banner" id="guide-' + page + '">' +
      '<div class="guide-head"><span class="guide-icon">' + g.icon + '</span>' +
      '<b>' + esc(g.title) + '</b>' +
      '<button class="guide-close" onclick="VG_APP.dismissGuide(\'' + page + '\')">✕ 知道了</button></div>' +
      '<p class="guide-body">' + esc(g.body) + '</p>' +
      '<button class="btn btn-sm guide-cta" onclick="VG_APP.dismissGuide(\'' + page + '\')">' + g.cta + ' →</button>' +
      '</div>';
  }

  function dismissGuide(page) {
    store.markPageGuided(page);
    render();
  }

  function replayGuides() {
    store.resetPageGuide();
    toast('引导已重新开启，逐页浏览即可看到介绍', 'ok', 3000);
    render();
  }
  function go(hash) {
    _navToTop = true;
    if (location.hash === hash) { render(); return; }
    location.hash = hash;
  }
  window.addEventListener('hashchange', render);

  function render() {
    var hash = location.hash || '#today';
    var tab = hash.replace('#', '').split('?')[0];
    var param = hash.indexOf('?') > -1 ? decodeURIComponent(hash.split('?')[1]) : null;
    if (!PAGES[tab]) tab = 'today';
    document.querySelectorAll('.nav-btn').forEach(function (b) {
      b.classList.toggle('active', b.dataset.tab === tab);
    });
    var main = $('#main');
    main.innerHTML = '';
    PAGES[tab](main, param);
    /* 页面级新手引导：首次访问该页时在顶部插入介绍卡片（欢迎弹窗期间不叠加） */
    if (!store.isPageGuided(tab) && store.state.onboarded) {
      var guide = guideBannerHTML(tab);
      if (guide) main.insertAdjacentHTML('afterbegin', guide);
    }
    updateNavBadge();
    updateStreakPill();
    if (_navToTop) { window.scrollTo(0, 0); _navToTop = false; }
    /* 存储故障警告：只提示一次 */
    if (!window._storageWarned && store.isStorageBroken()) {
      window._storageWarned = true;
      toast('⚠️ 当前浏览器无法保存进度（隐私模式或存储已满）——请导出备份保护数据', 'warn', 8000);
    }
  }

  function updateNavBadge() {
    var stats = store.getStats();
    var btn = document.querySelector('.nav-btn[data-tab="review"]');
    var old = btn.querySelector('.nav-badge');
    if (old) old.remove();
    if (stats.dueCount > 0) {
      var b = document.createElement('span');
      b.className = 'nav-badge';
      b.textContent = stats.dueCount > 99 ? '99+' : stats.dueCount;
      btn.appendChild(b);
    }
  }
  function updateStreakPill() {
    $('#streakDays').textContent = store.state.streak.days;
    var pv = $('#pointsVal');
    if (pv && typeof GAMIFICATION !== 'undefined') pv.textContent = GAMIFICATION.getOverview().points;
  }

  /* ============================================================
   * ① 今日 Dashboard
   * ============================================================ */
  PAGES.today = function (main) {
    var stats = store.getStats();
    var st = store.state;

    var hero = '';
    var stats = store.getStats();
    var st = store.state;

    /* 每日目标：复习5词 · 造句1句 · 开口1次（完成即打卡） */
    var today = VG_SRS.todayStr();
    var sentToday = store.state.sentenceRecords.filter(function (r) { return r.date === today; }).length;
    var gamiLog = (st.gamification && st.gamification.practiceLog) || [];
    var spokeToday = gamiLog.filter(function (r) { return r.date === today; }).length;
    var goalReview = Math.min(stats.todayReviewCount, VG_DATA.CONFIG.reviewBatchSize);
    var goals = [
      { icon: '🔄', name: '复习 ' + VG_DATA.CONFIG.reviewBatchSize + ' 词', now: goalReview, need: VG_DATA.CONFIG.reviewBatchSize },
      { icon: '✍️', name: '造句 1 句', now: Math.min(sentToday, 1), need: 1 },
      { icon: '🎤', name: '开口练 1 次', now: Math.min(spokeToday, 1), need: 1 }
    ];
    var allDone = goals.every(function (g) { return g.now >= g.need; });
    /* 今日主题：从图解词库按日期轮换（学「我能说英语」每日场景轮换，给每天一点新鲜感） */
    var todayTheme = '';
    if (typeof VG_OPD3 !== 'undefined' && VG_OPD3.THEMES.length) {
      var nowD = new Date();
      var doy = Math.floor((nowD - new Date(nowD.getFullYear(), 0, 0)) / 86400000);
      var th = VG_OPD3.THEMES[doy % VG_OPD3.THEMES.length];
      todayTheme = '<div class="goals-theme" onclick="VG_APP.go(\'#learn?' + encodeURIComponent('opd:' + th.id) + '\')">' +
        '📅 今日主题：<b>' + esc(th.name) + '</b>（' + th.words.length + ' 词）' +
        '<span>点开收 2 个词，今天就把它用出去 →</span></div>';
    }
    var goalsHtml =
      '<div class="goals-card' + (allDone ? ' done' : '') + '">' +
      '<div class="goals-head">' + (allDone ? '🎉 今日目标已达成，打卡成功！' : '🎯 今日目标') +
      '<span class="goals-hint">完成三件事就打卡</span></div>' +
      '<div class="goals-row">' +
      goals.map(function (g) {
        var done = g.now >= g.need;
        return '<div class="goal-item' + (done ? ' done' : '') + '">' +
          '<span class="g-ic">' + (done ? '✅' : g.icon) + '</span>' +
          '<span class="g-name">' + g.name + '</span>' +
          '<span class="g-num">' + g.now + '/' + g.need + '</span></div>';
      }).join('') +
      '</div>' + todayTheme + '</div>';

    var hero = '';
    if (stats.dueCount > 0) {
      hero = '<div class="hero-review">' +
        '<h2>🔄 今日有 ' + stats.dueCount + ' 词等你抢救</h2>' +
        '<p>分层六提示：先硬想30秒 → 词性 → 词义 → 首字母 → 长度+场景 → 答案。想不起来的那几秒，才是大脑加固记忆的时候。</p>' +
        '<button class="btn" onclick="VG_APP.go(\'#review\')">开始复习（每次 ' + VG_DATA.CONFIG.reviewBatchSize + ' 词）</button></div>';
    } else {
      hero = '<div class="hero-review">' +
        '<img src="assets/ip/su-bujuan-192.png" alt="苏不倦" class="hero-avatar">' +
        '<h2>✅ 今日复习已完成</h2>' +
        '<p>今天没有到期词。去学点新词，或到开口练把词用掉。</p>' +
        '<button class="btn" onclick="VG_APP.go(\'#learn\')">去学词</button> ' +
        '<button class="btn btn-outline" style="background:#fff" onclick="VG_APP.go(\'#workshop\')">去开口练</button></div>';
    }

    var statsHtml =
      '<div class="stats-grid">' +
      '<div class="stat"><b>' + stats.total + '</b><span>主动词汇</span></div>' +
      '<div class="stat"><b>' + stats.doneRate + '%</b><span>已造句</span></div>' +
      '<div class="stat' + (stats.dueCount > 0 ? ' warn' : '') + '"><b>' + stats.dueCount + '</b><span>待复习</span></div>' +
      '<div class="stat' + (stats.weakCount > 0 ? ' warn' : '') + '"><b>' + stats.weakCount + '</b><span>薄弱词</span></div>' +
      '<div class="stat"><b>🔥 ' + stats.streakDays + '</b><span>连续天数</span></div>' +
      '</div>';

    /* 每日目标卡片置顶 */
    statsHtml = goalsHtml + statsHtml;

    /* 今天用掉清单：当日复习过的词 + 当日新学词 */
    var usedCandidates = store.getWords().filter(function (w) {
      return (w.lastReview === today) || (w.firstLearned === today);
    });
    var useHtml = '<div class="card"><div class="card-title">🎯 今天用掉' +
      '<span class="hint">新词当天跟老外聊出去，用出来一次比读十遍管用 · 已用 ' + stats.todayUsedCount + '</span></div>';
    if (usedCandidates.length === 0) {
      useHtml += '<div class="empty">今天还没有复习/新学的词。先去复习或学新词，它们会出现在这里。</div>';
    } else {
      useHtml += '<div class="today-use-list">' + usedCandidates.map(function (w) {
        return '<button class="use-chip' + (w.usedToday ? ' used' : '') + '" onclick="VG_APP.toggleUse(\'' + esc(w.id) + '\')">' +
          (w.usedToday ? '✅' : '⬜') + ' ' + esc(w.w) + '</button>';
      }).join('') + '</div>';
    }
    useHtml += '</div>';

    /* 词汇生长曲线 */
    var chartHtml = '<div class="card"><div class="card-title">📈 词汇生长曲线<span class="hint">累计主动词汇量</span></div>' +
      '<div class="chart-wrap">' + growthChartSVG(st.growthLog) + '</div></div>';

    /* 里程碑 */
    var ms = st.milestones.slice().reverse().slice(0, 6);
    var msHtml = '<div class="card"><div class="card-title">🏆 里程碑</div>' +
      (ms.length ? ms.map(function (m) {
        return '<div class="milestone-item"><span class="ms-date">' + esc(m.date) + '</span><span>' + esc(m.text) + '</span></div>';
      }).join('') : '<div class="empty">暂无里程碑，30 词见 🌱</div>') + '</div>';

    main.innerHTML = statsHtml + hero + useHtml + chartHtml + msHtml;
  };

  function growthChartSVG(log) {
    if (!log || log.length < 2) {
      return '<div class="empty">数据点不足，学几个新词后曲线开始生长</div>';
    }
    var W = 640, H = 160, P = 30;
    var maxY = Math.max.apply(null, log.map(function (p) { return p.total; })) * 1.15;
    var minY = Math.min.apply(null, log.map(function (p) { return p.total; })) * 0.85;
    var xs = log.map(function (p, i) {
      return P + (i / (log.length - 1)) * (W - P * 2);
    });
    var ys = log.map(function (p) {
      return H - P - ((p.total - minY) / (maxY - minY)) * (H - P * 2);
    });
    var pts = xs.map(function (x, i) { return x.toFixed(1) + ',' + ys[i].toFixed(1); }).join(' ');
    var dots = xs.map(function (x, i) {
      return '<circle cx="' + x.toFixed(1) + '" cy="' + ys[i].toFixed(1) + '" r="3.5" fill="#43A047"/>';
    }).join('');
    var lastX = xs[xs.length - 1], lastY = ys[ys.length - 1];
    var lastTotal = log[log.length - 1].total;
    var labels = [
      text(P, H - 8, log[0].date.slice(5), '#90A4AE', 11),
      text(W - P, H - 8, log[log.length - 1].date.slice(5), '#90A4AE', 11, 'end'),
      text(lastX - 6, lastY - 10, lastTotal + ' 词', '#2E7D32', 13, 'end')
    ].join('');
    return '<svg class="chart-svg" viewBox="0 0 ' + W + ' ' + H + '" preserveAspectRatio="xMidYMid meet">' +
      '<line x1="' + P + '" y1="' + (H - P) + '" x2="' + (W - P) + '" y2="' + (H - P) + '" stroke="#E3E8E4"/>' +
      '<polyline points="' + pts + '" fill="none" stroke="#43A047" stroke-width="2.5" stroke-linejoin="round"/>' +
      dots + labels + '</svg>';
  }
  function text(x, y, s, color, size, anchor) {
    return '<text x="' + x + '" y="' + y + '" fill="' + color + '" font-size="' + size + '" text-anchor="' + (anchor || 'start') + '">' + esc(s) + '</text>';
  }

  function toggleUse(wordId) {
    var used = store.toggleUsedToday(wordId);
    toast(used ? '🎯 已标记用掉！这个词开始长根了' : '已取消标记', used ? 'ok' : '');
    render();
  }

  /* ============================================================
   * ② 学新词
   * ============================================================ */
  PAGES.learn = function (main, groupId) {
    if (groupId && groupId.indexOf('word:') === 0) {
      var single = store.getWord(groupId.slice(5));
      main.innerHTML = '<button class="btn-ghost" onclick="VG_APP.go(\'#learn\')">← 返回</button>' +
        (single ? wordCardHTML(single, true) : '<div class="card"><div class="empty">这个词不存在了</div></div>');
      return;
    }
    if (groupId && groupId.indexOf('opd:') === 0) {
      renderOpdTheme(main, groupId.slice(4));
      return;
    }
    if (groupId && groupId !== 'new') {
      renderGroupDetail(main, groupId);
      return;
    }
    if (groupId === 'new') {
      renderAddNewWord(main, null);
      return;
    }
    var stats = store.getStats();
    var words = store.getWords();

    var lockHtml = stats.newWordLocked
      ? '<div class="lock-banner">🔒 <b>新词上限铁律</b>：待复习 ' + stats.dueCount + ' 词 &gt; ' +
        VG_DATA.CONFIG.newWordLockThreshold + '，先消化再进食。<button class="btn btn-sm btn-outline" onclick="VG_APP.go(\'#review\')">去复习</button></div>'
      : '';

    var cards = VG_DATA.GROUPS.map(function (g) {
      var gw = words.filter(function (w) { return w.g === g.id; });
      var doneN = gw.filter(function (w) { return w.sent === 'done'; }).length;
      return '<div class="group-card" onclick="VG_APP.go(\'#learn?' + g.id + '\')">' +
        '<h3>' + esc(g.name) + '</h3><div class="g-story">' + esc(g.story) + '</div>' +
        '<div class="g-meta">' + gw.length + ' 词 · 已造句 ' + doneN + '</div></div>';
    }).join('');

    var myNew = words.filter(function (w) { return w.custom; });
    var myNewHtml = '<div class="card"><div class="card-title">➕ 我的新词<span class="hint">遇到想用的词就记下来，当天用掉</span></div>' +
      (myNew.length
        ? '<div class="group-grid">' + myNew.map(function (w) {
            return '<div class="group-card" onclick="VG_APP.go(\'#learn?' + encodeURIComponent('word:' + w.id) + '\')">' +
              '<h3 style="font-size:18px">' + esc(w.w) + '</h3><div class="g-story">' + esc(w.zh || w.simple || '') + '</div>' +
              '<div class="g-meta">首学 ' + esc(w.firstLearned) + ' · ' + (w.usedToday ? '✅ 已用掉' : '⬜ 待用掉') + '</div></div>';
          }).join('') + '</div>'
        : '<div class="empty">还没有自己加的词</div>') +
      '<div style="margin-top:12px"><button class="btn" onclick="VG_APP.go(\'#learn?new\')">➕ 添加新词</button></div></div>';

    /* OPD3 图解词库：主题卡片（显示已收词数） */
    var opdThemes = (typeof VG_OPD3 !== 'undefined' ? VG_OPD3.THEMES : []);
    var opdHtml = '';
    if (opdThemes.length) {
      var opdCards = opdThemes.map(function (t) {
        var collected = t.words.filter(function (x) { return !!store.getWord(x.w.toLowerCase()); }).length;
        return '<div class="group-card opd-card" onclick="VG_APP.go(\'#learn?' + encodeURIComponent('opd:' + t.id) + '\')">' +
          '<h3>' + esc(t.name) + '</h3><div class="g-story">' + esc(t.en) + ' · 牛津图解</div>' +
          '<div class="g-meta">' + t.words.length + ' 词 · 已收 ' + collected + '</div></div>';
      }).join('');
      opdHtml = '<div class="card"><div class="card-title">📚 图解词库<span class="hint">牛津图解词典 ' + opdThemes.length +
        ' 个生活主题 · 点开挑词收进你的词库</span></div><div class="group-grid">' + opdCards + '</div></div>';
    }

    main.innerHTML = lockHtml + goalsHtmlOnLearn() +
      '<div class="card"><div class="card-title">📖 词群学习<span class="hint">同一故事的词成串学，大脑有故事锚点</span></div>' +
      '<div class="group-grid">' + cards + '</div></div>' + opdHtml + myNewHtml;
  };

  function goalsHtmlOnLearn() {
    var due = store.getStats().dueCount;
    if (due === 0) return '';
    return '<div class="ws-diff-hint">💡 待复习 ' + due + ' 词——先复习再收新词（新词上限铁律）' +
      '<button class="btn-ghost" style="margin-left:6px" onclick="VG_APP.go(\'#review\')">去复习</button></div>';
  }

  /* OPD3 主题详情：逐词收进词库 */
  function renderOpdTheme(main, themeId) {
    var theme = null;
    if (typeof VG_OPD3 !== 'undefined') {
      VG_OPD3.THEMES.forEach(function (t) { if (t.id === themeId) theme = t; });
    }
    if (!theme) { go('#learn'); return; }
    var rows = theme.words.map(function (x, i) {
      var owned = !!store.getWord(x.w.toLowerCase());
      return '<div class="opd-word-row' + (owned ? ' owned' : '') + '">' +
        '<div class="opd-word-main"><b>' + esc(x.w) + '</b><span class="opd-zh">' + esc(x.zh) + '</span></div>' +
        '<div class="opd-word-ops">' +
        '<button class="speak-btn" onclick="VG_APP.speakText(' + JSON.stringify(x.w).replace(/"/g, '&quot;') + ')">🔊</button>' +
        (owned
          ? '<span class="badge badge-green">已收</span>'
          : '<button class="btn btn-sm" onclick="VG_APP.collectOpd(\'' + esc(theme.id) + '\',' + i + ')">➕ 收词</button>') +
        '</div></div>';
    }).join('');
    main.innerHTML =
      '<button class="btn-ghost" onclick="VG_APP.go(\'#learn\')">← 返回词库</button>' +
      '<div class="card"><div class="card-title">' + esc(theme.name) + '<span class="hint">' + esc(theme.en) + ' · ' + theme.words.length + ' 词 · 来源：牛津图解词典 OPD3</span></div>' +
      '<div class="opd-tip">词是场景里成串的——先点 🔊 听一遍，能顺口说出来的直接跳过；想长期记住的，点「➕ 收词」，明天自动进复习队列。</div>' +
      rows + '</div>';
  }

  function collectOpd(themeId, index) {
    var theme = null;
    VG_OPD3.THEMES.forEach(function (t) { if (t.id === themeId) theme = t; });
    var x = theme && theme.words[index];
    if (!x) return;
    var r = store.addCustomWord({ word: x.w, zh: x.zh, note: 'OPD3·' + theme.name }, 'daily');
    if (!r.ok) { toast(r.error, 'warn'); return; }
    toast('🌱 「' + x.w + '」已收进词库，明天首复习，今天记得去开口练用掉', 'ok', 3200);
    renderOpdTheme($('#main'), themeId);
  }

  function wordCardHTML(w, showActions) {
    var h = '<div class="wordcard" id="wc-' + esc(w.id) + '">' +
      '<div class="wc-head"><span class="wc-word">' + esc(w.w) + '</span>' +
      '<span class="wc-ipa">' + esc(w.ipa || '') + '</span>' +
      '<span class="wc-pos">' + esc(w.pos || '') + '</span>' +
      '<button class="speak-btn" onclick="VG_APP.speakWordById(\'' + esc(w.id) + '\')">🔊 发音</button>' +
      (w.audio ? '<span class="badge badge-green" style="font-size:11px">OB原音</span>' : '') +
      '</div>';
    if (w.simple) h += '<div class="wc-row"><span class="lbl">简单英语 · </span><span class="wc-simple">' + esc(w.simple) + '</span></div>';
    if (w.zh) h += '<div class="wc-row"><span class="lbl">中文 · </span>' + esc(w.zh) + '</div>';
    if (w.chunk) h += '<div class="wc-row"><span class="lbl">句型骨架 · </span><span class="wc-chunk">' + esc(w.chunk) + '</span></div>';
    if (w.ex && w.ex.en) {
      h += '<div class="wc-row wc-ex"><span class="lbl">语境例句 · </span><button class="btn-ghost" onclick="VG_APP.speakExById(\'' + esc(w.id) + '\')">🔊</button>' +
        '<div class="en">' + esc(w.ex.en) + '</div><div class="zh">' + esc(w.ex.zh) + '</div></div>';
    }
    if (w.note) h += '<div class="wc-row"><div class="wc-note">📌 ' + esc(w.note) + '</div></div>';
    h += '<div class="wc-row">' + sentBadge(w) + ' ' + depthBadge(w) + '</div>';
    if (showActions) {
      h += '<div class="wc-row" style="display:flex;gap:8px;flex-wrap:wrap">' +
        '<button class="btn btn-sm" onclick="VG_APP.go(\'#workshop?' + encodeURIComponent(w.id) + '\')">🎤 去开口练</button>' +
        '<button class="btn btn-sm btn-outline" onclick="VG_APP.go(\'#review\')">🔄 去复习</button></div>';
    }
    return h + '</div>';
  }

  function renderGroupDetail(main, groupId) {
    var g = null;
    VG_DATA.GROUPS.forEach(function (x) { if (x.id === groupId) g = x; });
    if (!g) { go('#learn'); return; }
    var words = store.getWords().filter(function (w) { return w.g === groupId; });
    main.innerHTML =
      '<button class="btn-ghost" onclick="VG_APP.go(\'#learn\')">← 返回词群</button>' +
      '<div class="card"><div class="card-title">' + esc(g.name) + '<span class="hint">' + words.length + ' 词</span></div>' +
      '<div style="font-size:13.5px;color:var(--ink-2)">' + esc(g.story) + '</div></div>' +
      words.map(function (w) { return wordCardHTML(w, true); }).join('');
  }

  function renderAddNewWord(main, errMsg) {
    main.innerHTML =
      '<button class="btn-ghost" onclick="VG_APP.go(\'#learn\')">← 返回</button>' +
      '<div class="card"><div class="card-title">➕ 添加新词<span class="hint">遇到想用的词就记下来 → 当天用掉</span></div>' +
      (errMsg ? '<div class="lock-banner">' + esc(errMsg) + '</div>' : '') +
      '<label class="fld">单词 *</label><input id="nw-word" placeholder="例如 awesome">' +
      '<label class="fld">简单英语释义（小孩能懂的话）</label><input id="nw-simple" placeholder="very very good">' +
      '<label class="fld">中文</label><input id="nw-zh" placeholder="极好的">' +
      '<label class="fld">句型骨架 / 常见搭配</label><input id="nw-chunk" placeholder="an awesome day">' +
      '<label class="fld">语境例句（英文）</label><input id="nw-exen" placeholder="I had an awesome day today.">' +
      '<label class="fld">例句中文</label><input id="nw-exzh" placeholder="我今天过得特别好。">' +
      '<label class="fld">备注（记你的混淆点/锚点）</label><input id="nw-note" placeholder="">' +
      '<div style="margin-top:16px"><button class="btn" onclick="VG_APP.submitNewWord()">建档 🌱</button></div></div>' +
      '<div class="card"><div class="card-title">🌱 词群学习法</div><div style="font-size:14px;color:var(--ink-2)">' +
      '同一篇文章/故事里的词成串记（如一次潜水探险：wetsuit, dive, dolphin, treasure）。' +
      '新词明天会自动进入复习队列（睡眠巩固），别忘了当天用掉。</div></div>';
  }

  function submitNewWord() {
    var f = {
      word: $('#nw-word').value, simple: $('#nw-simple').value, zh: $('#nw-zh').value,
      chunk: $('#nw-chunk').value, exEn: $('#nw-exen').value, exZh: $('#nw-exzh').value,
      note: $('#nw-note').value
    };
    if (!f.word.trim()) { toast('先填上你想学的词', 'warn'); return; }

    // 检查使用限制
    var usageCheck = checkUsageLimit('newWord');
    if (!usageCheck.allowed) {
      return;
    }

    var r = store.addCustomWord(f, 'daily');
    if (!r.ok) { toast(r.error, 'err'); renderAddNewWord($('#main'), r.error); return; }

    // 记录使用次数
    recordUsage('newWord', 1);

    toast('🌱 已建档：' + f.word + '（明天首复习，今天记得用掉）', 'ok');
    go('#learn');
  }

  /* ============================================================
   * ③ 复习：分层抢救
   * ============================================================ */
  var rs = null; /* review session */

  PAGES.review = function (main) {
    // 检查使用限制
    var usageCheck = checkUsageLimit('review');
    if (!usageCheck.allowed) {
      return;
    }

    // 开始学习计时
    startStudyTimer();

    var stats = store.getStats();
    if (!rs) {
      rs = {
        queue: stats.dueBatch.slice(),
        idx: 0, results: [], revealed: 0, hintsOpen: [], timerId: null,
        timerLeft: 30
      };
    }
    if (rs.queue.length === 0) {
      main.innerHTML = '<div class="card session-summary"><h2>🎉 今日复习已清空</h2>' +
        '<p style="color:var(--ink-2);font-size:14px">没有到期词。语言是语块不是单词——去说法库攒点库存，或学个新词群。</p>' +
        '<div style="margin-top:14px"><button class="btn" onclick="VG_APP.go(\'#learn\')">📖 学新词</button> ' +
        '<button class="btn btn-outline" onclick="VG_APP.go(\'#chunks\')">💬 说法库</button></div></div>';
      return;
    }
    if (rs.idx >= rs.queue.length) { renderReviewSummary(main); return; }
    renderReviewWord(main);
  };

  function renderReviewWord(main) {
    var w = store.getWord(rs.queue[rs.idx]);
    if (!w) { rs.idx++; renderReviewWord(main); return; }
    rs.revealed = 0; rs.hintsOpen = []; rs.timerLeft = 30; stopTimer();

    var progress = Math.round((rs.idx / rs.queue.length) * 100);
    var letters = w.w.replace(/\s/g, '').length;

    main.innerHTML =
      '<div class="review-progress"><span>' + (rs.idx + 1) + ' / ' + rs.queue.length + '</span>' +
      '<div class="bar"><i style="width:' + progress + '%"></i></div></div>' +
      '<div class="card rescue-card">' +
      '<div style="font-size:12px;color:var(--ink-2);letter-spacing:1px">中 → 英 · 拼出这个词</div>' +
      '<div class="rescue-zh">' + esc(w.zh || w.simple || '—') + '</div>' +
      '<div class="rescue-scene">词群：' + esc(groupName(w.g)) + '</div>' +
      '<div class="rescue-timer" id="rescueTimer"></div>' +
      '<div class="rescue-input-row">' +
      '<input id="rescueInput" placeholder="试着自己拼出来…" autocomplete="off" autocapitalize="off" autocorrect="off" spellcheck="false">' +
      '<button class="btn btn-sm" onclick="VG_APP.submitRescue()">确认</button></div>' +
      '<div id="rescueFeedback"></div>' +
      '<div id="hintReveal"></div>' +
      '<div class="hint-layers" id="hintLayers">' + hintBtnHTML(w, letters) + '</div>' +
      '<div id="answerArea"></div>' +
      '</div>';

    bindHintButtons(w);
    var ri = document.getElementById('rescueInput');
    if (ri) {
      ri.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') { e.preventDefault(); submitRescue(); }
      });
    }
  }

  /* 复习拼写输入：拼对 = 直接按 🟢 记牢档通过；拼错 = 提示继续解锁（六层自评流程不变） */
  function submitRescue() {
    var w = store.getWord(rs.queue[rs.idx]);
    var input = document.getElementById('rescueInput');
    var fb = document.getElementById('rescueFeedback');
    if (!w || !input) return;
    var val = input.value.trim().toLowerCase().replace(/\s+/g, ' ');
    if (!val) { toast('先拼出来——或继续解锁提示', 'warn'); return; }
    if (val === w.w.toLowerCase()) {
      if (fb) fb.innerHTML = '<div class="rescue-ok">✅ 一次拼对！就是 <b>' + esc(w.w) + '</b></div>';
      pickLayer('green');
    } else {
      if (fb) fb.innerHTML = '<div class="rescue-no">还不是它——再硬想几秒，或继续解锁下面的提示</div>';
      input.select();
    }
  }

  function hintBtnHTML(w, letters) {
    var b = function (i, title, sub, disabled) {
      return '<button class="hint-btn" data-layer="' + i + '"' + (disabled ? ' disabled' : '') + '>' +
        '<span class="h-idx">第' + i + '层</span>' + title +
        (sub ? ' · ' + sub : '') + '</button>';
    };
    return [
      b(1, '⏱️ 先硬想 30 秒', '不给任何提示', false),
      b(2, '🔤 给词性', '', true),
      b(3, '📖 给词义（简单英语）', '', true),
      b(4, '💡 给首字母', '', true),
      b(5, '📏 长度 + 场景半句', letters + '个字母', true),
      b(6, '👁️ 看答案', '', true)
    ].join('');
  }

  function bindHintButtons(w) {
    var btns = document.querySelectorAll('.hint-btn');
    btns.forEach(function (btn) {
      btn.addEventListener('click', function () {
        var layer = Number(btn.dataset.layer);
        openHint(w, layer);
      });
    });
  }

  function openHint(w, layer) {
    /* 顺序解锁：必须先点第1层 */
    if (layer > 1 && rs.hintsOpen.indexOf(1) < 0) {
      toast('先从第1层「硬想」开始——能自己想起来，永远比看答案记得牢', 'warn');
      return;
    }
    /* 逐层解锁：跳层时自动补开中间层 */
    for (var i = 1; i < layer; i++) {
      if (rs.hintsOpen.indexOf(i) < 0) openHint(w, i, true);
    }
    if (rs.hintsOpen.indexOf(layer) >= 0) return;
    rs.hintsOpen.push(layer);
    rs.revealed = layer;
    stopTimer();

    var reveal = $('#hintReveal');
    var html = '';
    switch (layer) {
      case 1: startTimer(); break;
      case 2: html = '<div class="hint-reveal">词性：' + esc(w.pos || '—') + '</div>'; break;
      case 3: html = '<div class="hint-reveal">' + esc(w.simple || w.zh || '—') + '</div>'; break;
      case 4: html = '<div class="hint-reveal">' + esc(w.w[0].toUpperCase()) + ' ' + '_ '.repeat(Math.max(0, w.w.replace(/\s/g, '').length - 1)).trim() + '</div>'; break;
      case 5: html = '<div class="hint-reveal">' + w.w.replace(/\s/g, '').length + ' 个字母 · 场景：' +
        esc(maskWord(w.ex && w.ex.en ? w.ex.en : w.chunk || '', w.w)) + '</div>'; break;
      case 6: showAnswer(w); updateHintButtons(); return;
    }
    reveal.insertAdjacentHTML('beforeend', html);
    updateHintButtons();
  }

  function updateHintButtons() {
    var opened = Math.max.apply(null, rs.hintsOpen.concat([0]));
    document.querySelectorAll('.hint-btn').forEach(function (btn) {
      var layer = Number(btn.dataset.layer);
      btn.disabled = layer <= opened;
    });
  }

  function startTimer() {
    rs.timerLeft = 30;
    var t = $('#rescueTimer');
    t.textContent = '⏱️ 30.0 秒 · 深呼吸，先自己想';
    rs.timerId = setInterval(function () {
      rs.timerLeft -= 0.1;
      if (rs.timerLeft <= 0) {
        stopTimer();
        t.textContent = '⏱️ 30 秒到！想不起来很正常——现在逐层要提示';
        return;
      }
      t.textContent = '⏱️ ' + rs.timerLeft.toFixed(1) + ' 秒 · 深呼吸，先自己想';
    }, 100);
  }
  function stopTimer() {
    if (rs.timerId) { clearInterval(rs.timerId); rs.timerId = null; }
    var t = $('#rescueTimer');
    if (t && rs.hintsOpen.indexOf(1) >= 0 && rs.timerLeft > 0) t.textContent = '';
  }

  function showAnswer(w) {
    stopTimer();
    var area = $('#answerArea');
    area.innerHTML =
      '<div class="answer-box">' +
      '<div><span class="aw">' + esc(w.w) + '</span><span class="aw-phon">' + esc(w.ipa || '') + '</span> ' +
      '<button class="speak-btn" onclick="VG_APP.speakWordById(\'' + esc(w.id) + '\')">🔊</button></div>' +
      '<div class="aw-simple">' + esc(w.simple || '') + ' ' + esc(w.zh ? '· ' + w.zh : '') + '</div>' +
      (w.chunk ? '<div class="aw-chunk">搭配：' + esc(w.chunk) + '</div>' : '') +
      (w.ex && w.ex.en ? '<div style="margin-top:6px;font-size:14px">' + esc(w.ex.en) + '<div style="color:var(--ink-2);font-size:13px">' + esc(w.ex.zh) + '</div></div>' : '') +
      '</div>' +
      '<div style="font-size:13px;color:var(--ink-2);text-align:center;margin-top:10px">刚才你在第几层想起来的？（遗忘是数据，不是失败）</div>' +
      '<div class="layer-pick">' +
      '<button class="lp-green" onclick="VG_APP.pickLayer(\'green\')">🟢 0-1层想起<br><small>记得牢</small></button>' +
      '<button class="lp-yellow" onclick="VG_APP.pickLayer(\'yellow\')">🟡 2-3层想起<br><small>有点模糊</small></button>' +
      '<button class="lp-red" onclick="VG_APP.pickLayer(\'red\')">🔴 4层+/没想起<br><small>快忘了</small></button>' +
      '</div>';
    rs.phase = 'answer';
  }

  function pickLayer(kind) {
    var w = store.getWord(rs.queue[rs.idx]);
    var layer;
    if (kind === 'green') layer = Math.min(Math.max(rs.revealed, 0), 1);
    else if (kind === 'yellow') layer = Math.min(Math.max(rs.revealed, 2), 3);
    else layer = Math.max(rs.revealed, 4);

    var events = store.markReview(w.id, layer);
    rs.results.push({ wordId: w.id, layer: layer, kind: kind });

    events.forEach(function (ev) {
      if (ev.type === 'enteredWeak') toast('🔴 ' + ev.wordId + ' 已进薄弱词清单（每天复习，连续2次🟢自动移出）', 'warn', 3200);
      if (ev.type === 'leftWeak') toast('🎉 ' + ev.wordId + ' 连续2次🟢，已移出薄弱清单！', 'ok', 3200);
    });
    rs.idx++;

    // 记录使用次数
    recordUsage('review', 1);

    checkDailyGoalPraise(); /* 复习可能是今天的最后一块拼图 */
    _navToTop = true; /* 下一词从顶部开始 */
    render();
  }

  function renderReviewSummary(main) {
    var greens = rs.results.filter(function (r) { return r.kind === 'green'; }).length;
    var yellows = rs.results.filter(function (r) { return r.kind === 'yellow'; }).length;
    var reds = rs.results.filter(function (r) { return r.kind === 'red'; }).length;
    main.innerHTML =
      '<div class="card session-summary">' +
      '<img src="assets/ip/su-bujuan-192.png" alt="苏不倦" class="summary-avatar">' +
      '<h2>本轮复习完成 🌱</h2>' +
      '<p style="color:var(--ink-2)">记忆靠挣扎——刚才每一次"想不起来"，都是大脑在加固。</p>' +
      '<div class="summary-rows">' +
      rs.results.map(function (r) {
        var icon = r.kind === 'green' ? '🟢' : (r.kind === 'yellow' ? '🟡' : '🔴');
        return '<div class="milestone-item"><span>' + icon + '</span><span style="font-weight:600">' + esc(r.wordId) + '</span><span style="color:var(--ink-2);margin-left:auto">第' + r.layer + '层</span></div>';
      }).join('') + '</div>' +
      '<p style="font-size:14px">🟢 ' + greens + ' · 🟡 ' + yellows + ' · 🔴 ' + reds + '</p>' +
      '<div style="margin-top:16px;display:flex;gap:10px;justify-content:center;flex-wrap:wrap">' +
      '<button class="btn" onclick="VG_APP.go(\'#workshop\')">🎤 去开口练用掉</button>' +
      (store.getStats().dueCount > 0 ? '<button class="btn btn-outline" onclick="VG_APP.newSession()">🔄 再来一轮</button>' : '') +
      '<button class="btn btn-outline" onclick="VG_APP.go(\'#today\')">回今日</button></div></div>';
  }

  function newSession() { rs = null; render(); }

  /* ============================================================
   * ④ 开口练：4 种练法 + 即时评分 + 难度分级 + 积分徽章
   * ============================================================ */
  var WS_MODES = [
    { id: 'sentence',   icon: '✍️', name: '造句' },
    { id: 'fill_blank', icon: '📝', name: '句型填空' },
    { id: 'keywords',   icon: '🎯', name: '关键词造句' },
    { id: 'speaking',   icon: '🎤', name: '开口说' }
  ];
  var SPEECH_OK = ('webkitSpeechRecognition' in window) || ('SpeechRecognition' in window);
  var ws = { mode: 'sentence', wordId: null, diff: '' };

  function wsRefText(w) { return (w.ex && w.ex.en) || w.chunk || ''; }
  function wsNorm(s) {
    return String(s).toLowerCase().replace(/[^a-z0-9' ]/g, ' ').replace(/\s+/g, ' ').trim();
  }
  /* 词干掩码：dolphin 也能盖住 dolphins，dive 盖住 diving */
  function wsStem(word) {
    var stem = word.replace(/(e?s|e?d|ing)$/i, '');
    return stem.length >= 3 ? stem : word;
  }
  function wsMaskSentence(ref, word) {
    var re = new RegExp('\\b' + wsStem(word).replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\w*', 'gi');
    return ref.replace(re, '___');
  }

  PAGES.workshop = function (main, presetWordId) {
    var usageCheck = checkUsageLimit('sentence');
    if (!usageCheck.allowed) return;
    startStudyTimer();

    var today = VG_SRS.todayStr();
    var words = store.getWords();
    /* 候选：今日复习过的词 + 到期词；fallback：全部词 */
    var todayReviewed = store.state.reviewLog.filter(function (r) { return r.date === today; })
      .map(function (r) { return r.wordId; });
    var candidates = words.filter(function (w) {
      return todayReviewed.indexOf(w.id) >= 0 || w.sent === 'pending';
    });
    if (candidates.length === 0) candidates = words.slice(0, 12);

    if (!ws.diff) ws.diff = GAMIFICATION.getDifficulty();
    candidates = DIFFICULTY_LEVEL.filterWords(candidates, ws.diff).slice(0, 16);

    if (presetWordId && store.getWord(presetWordId)) ws.wordId = presetWordId;
    if (!ws.wordId || !store.getWord(ws.wordId)) ws.wordId = candidates[0] ? candidates[0].id : null;

    var diffChips = DIFFICULTY_LEVEL.ORDER.map(function (d) {
      var cfg = DIFFICULTY_LEVEL.getConfig(d);
      return '<button class="ws-chip' + (ws.diff === d ? ' on' : '') + '" onclick="VG_APP.pickWsDiff(\'' + d + '\')">' + cfg.icon + ' ' + d + ' ' + esc(cfg.name) + '</button>';
    }).join('');
    var modeChips = WS_MODES.map(function (m) {
      return '<button class="ws-chip' + (ws.mode === m.id ? ' on' : '') + '"' +
        ' onclick="VG_APP.pickWsMode(\'' + m.id + '\')">' + m.icon + ' ' + m.name + '</button>';
    }).join('');
    var wordChips = candidates.map(function (w) {
      return '<button class="ws-chip' + (w.id === ws.wordId ? ' on' : '') + '" onclick="VG_APP.pickWsWord(\'' + esc(w.id) + '\')">' + esc(w.w) + '</button>';
    }).join('');

    main.innerHTML =
      '<div class="card"><div class="card-title">🎤 开口练<span class="hint">4 种练法 · 提交即评分 · 对照老外版本</span></div>' +
      '<div class="ws-row-label">难度 · ' + esc(DIFFICULTY_LEVEL.getConfig(ws.diff).desc) + '</div>' +
      '<div class="ws-chips">' + diffChips + '</div>' +
      '<div class="ws-row-label">练法</div>' +
      '<div class="ws-chips">' + modeChips + '</div>' +
      (candidates.length ? '<div class="ws-row-label">选词</div><div class="ws-chips">' + wordChips + '</div>' : '') +
      '<div id="wsBody"></div></div>';

    renderWsBody();
  };

  function renderWsBody() {
    var body = $('#wsBody');
    var w = ws.wordId ? store.getWord(ws.wordId) : null;
    if (!w) { if (body) body.innerHTML = '<div class="empty">没有可练的词——先去学个新词吧</div><div style="text-align:center;margin-top:12px"><button class="btn" onclick="VG_APP.go(\'#learn\')">📖 去学词</button></div>'; return; }
    window._wsWord = w;
    var zhRef = (w.ex && w.ex.zh) ? '<div style="font-size:13px;color:var(--ink-2);margin-top:4px">场景参考：' + esc(w.ex.zh) + '</div>' : '';
    var html = '';

    if (ws.mode === 'sentence') {
      html = '<div class="ws-prompt">用 <b>' + esc(w.w) + '</b> 造一句英文' + zhRef + '</div>' +
        '<div class="ws-diff-hint">💡 ' + esc(DIFFICULTY_LEVEL.hintFor(ws.diff)) + '</div>' +
        '<textarea id="ws-input" rows="3" placeholder="写下你的句子…（别怕错，敢说就赢了一半）"></textarea>' +
        '<div class="ws-actions"><button class="btn" onclick="VG_APP.submitSentence()">提交 · 立即评分</button>' +
        '<button class="speak-btn" onclick="VG_APP.speakWordById(\'' + esc(w.id) + '\')">🔊 ' + esc(w.w) + '</button></div>' +
        '<div id="wsRef"></div>';
    } else if (ws.mode === 'fill_blank') {
      var ref = wsRefText(w);
      if (!ref) {
        html = '<div class="empty">这个词没有参考句型，换「✍️ 造句」练吧</div>';
      } else {
        var masked = esc(wsMaskSentence(ref, w.w)).replace(/_{3,}/g, '<span class="blank">______</span>');
        html = '<div class="ws-prompt">补全这句地道说法（空缺处与 <b>' + esc(w.w) + '</b> 相关）' + zhRef + '</div>' +
          '<div class="fill-blank-box">' + masked + '</div>' +
          '<input id="ws-blank" placeholder="填入空缺的词…">' +
          '<div class="ws-actions"><button class="btn" onclick="VG_APP.submitFillBlank()">提交 · 检查</button>' +
          '<button class="speak-btn" onclick="VG_APP.speakExById(\'' + esc(w.id) + '\')">🔊 听整句</button></div>' +
          '<div id="wsRef"></div>';
      }
    } else if (ws.mode === 'keywords') {
      var kws = wsKeywords(w);
      html = '<div class="ws-prompt">把这几个词用进同一句话' + zhRef + '</div>' +
        '<div class="kw-row">' + kws.map(function (k) { return '<span class="kw">' + esc(k) + '</span>'; }).join('') + '</div>' +
        '<div class="ws-diff-hint">💡 ' + esc(DIFFICULTY_LEVEL.hintFor(ws.diff)) + '</div>' +
        '<textarea id="ws-input" rows="3" placeholder="写出包含这些词的句子…"></textarea>' +
        '<div class="ws-actions"><button class="btn" onclick="VG_APP.submitKeywords()">提交 · 立即评分</button></div>' +
        '<div id="wsRef"></div>';
    } else {
      var ref2 = wsRefText(w);
      if (!ref2) {
        html = '<div class="empty">这个词没有参考句，换「✍️ 造句」练吧</div>';
      } else if (IS_WECHAT || !SPEECH_OK) {
        /* 微信/无识别能力浏览器：直接进跟读模式，不摆一个注定失败的麦克风 */
        window._wsRefText = wsRefText(w);
        html = '<div class="ws-prompt">看着中文意思，开口说出英文' +
          '<div class="speak-zh">💬 ' + esc((w.ex && w.ex.zh) || w.zh || w.simple || w.w) + '</div></div>' +
          '<div class="mic-zone">' + buildSpeakFallbackHTML(
            IS_WECHAT ? '微信内置浏览器不支持语音识别，已自动切换跟读模式（想用真语音识别，iPhone 用 Safari 打开本页）'
                      : '这个浏览器没有语音识别能力，跟读模式效果一样！') + '</div>' +
          '<div id="wsRef"></div>';
      } else {
        html = '<div class="ws-prompt">看着中文意思，开口说出英文' +
          '<div class="speak-zh">💬 ' + esc((w.ex && w.ex.zh) || w.zh || w.simple || w.w) + '</div></div>' +
          '<div class="mic-zone">' +
          '<button class="mic-btn" id="micBtn" onclick="VG_APP.startSpeech()">🎤<br>开口说</button>' +
          '<div class="mic-tip">点后开口说，识别完成自动打分；识别不可用时自动切换跟读模式</div>' +
          '<div class="mic-heard" id="micHeard"></div>' +
          '<div id="micFallback"></div></div>' +
          '<div id="wsRef"></div>';
      }
    }
    body.innerHTML = html;
  }

  function wsKeywords(w) {
    var kws = [w.w];
    var stop = {};
    ['the', 'a', 'an', 'i', 'you', 'we', 'they', 'he', 'she', 'it', 'is', 'are', 'was', 'were',
      'to', 'of', 'and', 'in', 'on', 'for', 'with', 'my', 'me', 'this', 'that'].forEach(function (x) { stop[x] = 1; });
    var src = ((w.chunk || '') + ' ' + ((w.ex && w.ex.en) || '')).toLowerCase().replace(/[^a-z' ]/g, ' ');
    src.split(/\s+/).forEach(function (t) {
      if (t.length > 3 && !stop[t] && kws.indexOf(t) < 0 && kws.length < 3) {
        /* 跳过已有关键词的变形（dolphins vs dolphin） */
        var dup = kws.some(function (k) { return k.indexOf(t) === 0 || t.indexOf(k) === 0; });
        if (!dup) kws.push(t);
      }
    });
    return kws;
  }

  function pickWsMode(id) {
    ws.mode = id;
    /* 同步芯片选中态（此前只换内容不换样式，用户以为点不中） */
    var chips = document.querySelectorAll('.ws-chips .ws-chip');
    chips.forEach(function (c) {
      var m = (c.getAttribute('onclick') || '').match(/pickWsMode\('([\w]+)'\)/);
      if (m) c.classList.toggle('on', m[1] === id);
    });
    var b = $('#wsRef');
    if (b) b.innerHTML = '';
    renderWsBody();
  }
  function pickWsDiff(d) {
    ws.diff = d;
    GAMIFICATION.setDifficulty(d);
    toast(DIFFICULTY_LEVEL.getConfig(d).icon + ' 已切到 ' + d + ' ' + DIFFICULTY_LEVEL.getConfig(d).name);
    render();
  }
  function pickWsWord(wordId) {
    ws.wordId = wordId;
    document.querySelectorAll('.ws-word-pick .ws-chip, .ws-chips .ws-chip').forEach(function (c) {
      var m = (c.getAttribute('onclick') || '').match(/pickWsWord\('([^']+)'\)/);
      if (m) c.classList.toggle('on', decodeURIComponent(m[1]) === wordId);
    });
    var b = $('#wsRef');
    if (b) b.innerHTML = '';
    renderWsBody();
  }

  function submitSentence() {
    var w = window._wsWord;
    var s = $('#ws-input').value.trim();
    if (!s) { toast('先写下一句——写错也是生产模式', 'warn'); return; }
    var ref = wsRefText(w);
    var score = SPEAK_WORKSHOP.scoreSentence(s, ref);
    finishPractice(w, score, ref, false, s, []);
  }

  function submitFillBlank() {
    var w = window._wsWord;
    var ans = $('#ws-blank').value.trim();
    if (!ans) { toast('把空缺的词填进去', 'warn'); return; }
    var ref = wsRefText(w);
    var stem = wsNorm(wsStem(w.w));
    var ansN = wsNorm(ans);
    var ok = ansN.length >= 3 && (ansN.indexOf(stem) === 0 || stem.indexOf(ansN) === 0);
    var full = String(ref).replace(/___+/g, ans);
    var score = SPEAK_WORKSHOP.scoreSentence(full, ref);
    var notes = [];
    if (ok) {
      if (score.total < 70) score.total = 70;
    } else {
      score.total = Math.min(score.total, 45);
      notes.push('空缺处的原词是「' + w.w + '」——点「🔊 听整句」跟着说一次');
    }
    score.level = SPEAK_WORKSHOP.levelOf(score.total);
    finishPractice(w, score, ref, false, full, notes);
  }

  function submitKeywords() {
    var w = window._wsWord;
    var s = $('#ws-input').value.trim();
    if (!s) { toast('先写出你的句子', 'warn'); return; }
    var low = ' ' + wsNorm(s) + ' ';
    var missing = [];
    wsKeywords(w).forEach(function (k) {
      if (low.indexOf(' ' + wsNorm(k) + ' ') < 0) missing.push(k);
    });
    var ref = wsRefText(w);
    var score = SPEAK_WORKSHOP.scoreSentence(s, ref);
    var notes = [];
    if (missing.length) {
      score.total = Math.max(30, score.total - 20 * missing.length);
      score.level = SPEAK_WORKSHOP.levelOf(score.total);
      notes.push('这几个词还没用上：' + missing.join(', ') + '——试着把它们串进去');
    }
    finishPractice(w, score, ref, false, s, notes);
  }

  /* 开口说：浏览器语音识别；识别不可用时自动降级为「跟读自评」模式 */
  function startSpeech() {
    var w = window._wsWord;
    if (!SPEECH_OK) {
      showSpeakFallback('这个浏览器没有语音识别能力。用下面的跟读模式，效果一样！');
      return;
    }
    var SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    var rec = new SR();
    rec.lang = 'en-US'; rec.interimResults = false; rec.maxAlternatives = 1;
    var btn = $('#micBtn');
    if (btn) { btn.disabled = true; btn.innerHTML = '🔴<br>在听…请说'; }
    rec.onresult = function (e) {
      var text = e.results[0][0].transcript;
      var heard = $('#micHeard');
      if (heard) heard.textContent = '👂 听到：' + text;
      var ref = wsRefText(w);
      var sp = SPEAK_WORKSHOP.scoreSpeaking(text, ref);
      finishPractice(w, {
        total: sp.total, level: sp.level,
        grammar: { score: sp.total, errors: (sp.missedWords && sp.missedWords.length) ? ['漏了这些关键内容：' + sp.missedWords.join(', ')] : [] },
        completeness: { score: sp.total, missing: [] },
        naturalness: { score: sp.total, highlights: sp.total >= 70 ? ['关键内容都表达出来了，很棒'] : [], improvements: [] },
        vocabulary: { score: sp.total }
      }, ref, true, text, []);
    };
    rec.onerror = function (e) {
      var code = e && e.error ? e.error : 'unknown';
      var b2 = $('#micBtn');
      if (b2) { b2.disabled = false; b2.innerHTML = '🎤<br>开口说'; }
      if (code === 'aborted') return;
      if (code === 'no-speech') {
        toast('没听到声音——离屏幕近一点，说完稍停半秒', 'warn');
        return;
      }
      if (code === 'not-allowed' || code === 'service-not-allowed') {
        showSpeakFallback('麦克风权限被拒绝了。可以在浏览器设置里允许本页使用麦克风，或直接用下面的跟读模式。');
        return;
      }
      /* network / language-not-supported / audio-capture：
       * 国内浏览器（微信/夸克等）暴露了识别接口但服务在国外，普遍连不上 */
      showSpeakFallback('这个浏览器的语音识别服务连不上（微信、夸克等国内浏览器普遍如此）。iPhone 用 Safari 打开可用真语音识别；其他情况请用下面的跟读模式。');
    };
    rec.onend = function () {
      var b2 = $('#micBtn');
      if (b2 && b2.disabled) { b2.disabled = false; b2.innerHTML = '🎤<br>再说一次'; }
    };
    rec.start();
  }

  /* 跟读自评：语音识别不可用时的完整闭环
   * 听示范 → 大声跟读 → （可选）录下自己的声音回放对比 → 自评拿积分 */
  function buildSpeakFallbackHTML(msg) {
    var recBtn = recOK()
      ? '<button class="btn btn-sm btn-outline" onclick="VG_APP.toggleSelfRecord()">🎙️ 录下自己的声音</button>'
      : '';
    return '<div class="fb-box" style="text-align:left">' +
      '<div class="fb-title"><b>🗣️ 跟读模式</b><span class="fb-sub">' + esc(msg) + '</span></div>' +
      '<ol style="margin:8px 0 0 18px;font-size:13.5px">' +
      '<li>点「🔊 听示范」，听一遍老外的说法</li>' +
      '<li>对着屏幕大声跟读 2-3 遍' + (recOK() ? '，或录下自己的声音回放对比' : '') + '</li>' +
      '<li>诚实地给自己打个分：</li></ol>' +
      '<div class="fb-actions" style="justify-content:flex-start">' +
      '<button class="speak-btn" onclick="VG_APP.speakWsRef()">🔊 听示范</button>' + recBtn + '</div>' +
      '<div id="recZone"></div>' +
      '<div class="fb-actions" style="justify-content:flex-start;margin-top:8px">' +
      '<button class="btn btn-sm" onclick="VG_APP.selfRate(85)">✅ 我说流畅了</button>' +
      '<button class="btn btn-sm btn-outline" onclick="VG_APP.selfRate(55)">😅 还不太熟，待会再来</button></div></div>';
  }
  function showSpeakFallback(msg) {
    var box = $('#micFallback');
    if (box) box.innerHTML = buildSpeakFallbackHTML(msg);
    else toast(msg, 'warn', 4500);
  }

  /* 录音自听（可选增强）：浏览器支持才显示；录完自动回放对比 */
  var selfRecorder = null, selfChunks = [], selfStream = null, selfRecording = false;
  function recOK() {
    return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia && window.MediaRecorder);
  }
  function toggleSelfRecord() {
    var zone = $('#recZone');
    if (!zone) return;
    if (selfRecording) { try { selfRecorder.stop(); } catch (e) {} return; }
    if (!recOK()) { toast('这个浏览器不支持录音，直接跟读自评就好', 'warn'); return; }
    navigator.mediaDevices.getUserMedia({ audio: true }).then(function (stream) {
      selfStream = stream;
      selfChunks = [];
      selfRecorder = new MediaRecorder(stream);
      selfRecorder.ondataavailable = function (e) { if (e.data && e.data.size) selfChunks.push(e.data); };
      selfRecorder.onstop = function () {
        selfRecording = false;
        if (selfStream) {
          selfStream.getTracks().forEach(function (t) { try { t.stop(); } catch (e) {} });
          selfStream = null;
        }
        var blob = new Blob(selfChunks, { type: (selfRecorder && selfRecorder.mimeType) || 'audio/webm' });
        var url = URL.createObjectURL(blob);
        zone.innerHTML =
          '<audio controls src="' + url + '" style="width:100%;margin-top:8px"></audio>' +
          '<div class="mic-tip">🎧 听自己的发音，和「老外会说」对比——不像就重录一遍</div>' +
          '<div class="fb-actions" style="justify-content:flex-start"><button class="btn btn-sm btn-outline" onclick="VG_APP.toggleSelfRecord()">🎙️ 重录</button></div>';
      };
      selfRecorder.start();
      selfRecording = true;
      zone.innerHTML =
        '<div class="mic-tip" style="color:var(--red);font-weight:600">🔴 录音中…大声说，说完点「完成」</div>' +
        '<div class="fb-actions" style="justify-content:flex-start"><button class="btn btn-sm" onclick="VG_APP.toggleSelfRecord()">⏹️ 完成</button></div>';
    }).catch(function () {
      toast('拿不到麦克风权限——不影响跟读，直接自评就可以', 'warn', 3500);
    });
  }

  function selfRate(score) {
    var w = window._wsWord;
    var ref = wsRefText(w);
    finishPractice(w, {
      total: score, level: SPEAK_WORKSHOP.levelOf(score),
      grammar: { score: score, errors: [] },
      completeness: { score: score, missing: [] },
      naturalness: {
        score: score,
        highlights: score >= 80 ? ['敢开口大声说出来，这是学英语最重要的一步'] : ['听了几遍示范，耳朵已经开始熟悉这个说法了'],
        improvements: []
      },
      vocabulary: { score: score }
    }, ref, true, '(跟读自评)', []);
  }

  /* 统一收尾：评分面板 + 积分/徽章 + 使用计数 */
  /* ============================================================
   * 情绪价值语音反馈（小苏人格 · P0 四场景）
   * 原则：2-3 秒一句话 · 每日 ≤3 条 · 同场景 ≥24h · 文案不重复 · 失败静默
   * 场景：B1 首次开口说 / A1 完成今日目标 / A3 进步时刻 / C1 低分鼓励
   * ============================================================ */
  var PRAISE_LINES = {
    b1_first_speaking: [
      { en: 'Whoa, you just said that out loud. Hardest part? Done.', zh: '哇，你真说出口了——最难的部分，完成' },
      { en: "First time speaking, huh? Not gonna lie, that was pretty good.", zh: '第一次开口？不骗你，说得真不错' },
      { en: 'That was YOU speaking English. Cool, right? Remember this.', zh: '刚才是你在说英语哦，记住这种感觉' }
    ],
    a1_daily_done: [
      { en: "Aaand that's a wrap! Nice work today.", zh: '好——今天收工！干得漂亮' },
      { en: 'Three for three! The chain is still alive.', zh: '三件事全清，坚持链还活着' },
      { en: 'Alright, day done. Same time tomorrow?', zh: '行，今天完赛。明天老时间见？' }
    ],
    a3_progress: [
      { en: "Ooh, new personal best! You're getting good at this.", zh: '哦——新纪录！你越来越上手了' },
      { en: 'Whoa, up {delta} points from last time? Love it.', zh: '哇，比上次高了 {delta} 分？爱了爱了' },
      { en: "You're getting better every day. Seriously.", zh: '你真的每天都在变好，说真的' }
    ],
    c1_low_score: [
      { en: "Oof, tough one. But hey, you showed up. That's what counts.", zh: '哎，这道难。但你来了，这才最重要' },
      { en: "Eh, not today. No biggie. You're here, that's what matters.", zh: '嗯，今天不顺。没事儿，人在就行' },
      { en: "Hey, even the pros blew this a thousand times. You're fine.", zh: '嘿，大神们这也栽过一千次了，你没问题的' }
    ]
  };

  function praiseState() {
    var g = store.state.gamification;
    if (!g.praise) g.praise = { date: '', count: 0, lastBy: {}, lastLine: {} };
    return g.praise;
  }
  function praiseCan(scenario) {
    var p = praiseState();
    var today = VG_SRS.todayStr();
    if (p.date !== today) { p.date = today; p.count = 0; }
    if (p.count >= 3) return false;
    if (p.lastBy[scenario] === today) return false; /* 同场景间隔 ≥24h */
    return true;
  }
  function praisePick(scenario) {
    var pool = PRAISE_LINES[scenario];
    var p = praiseState();
    var idx = Math.floor(Math.random() * pool.length);
    if (pool.length > 1 && p.lastLine[scenario] === idx) idx = (idx + 1) % pool.length;
    return { idx: idx, line: pool[idx] };
  }
  function praisePlay(scenario, delta) {
    if (!praiseCan(scenario)) return false;
    var pick = praisePick(scenario);
    var p = praiseState();
    var today = VG_SRS.todayStr();
    if (p.date !== today) { p.date = today; p.count = 0; }
    p.count++;
    p.lastBy[scenario] = today;
    p.lastLine[scenario] = pick.idx;
    store.saveAll();
    var en = pick.line.en.replace('{delta}', String(delta || ''));
    var zh = pick.line.zh.replace('{delta}', String(delta || ''));
    /* Edge 拟真男声（Guy·cheerful）优先，失败回落百度→有道 */
    playSmart(en, 'en-US', onlineTtsUrls(en, isSlow()));
    showPraiseSub(en, zh);
    return true;
  }

  /* A1 完成今日目标：三任务全清当天只播一次（频控由 praiseCan 承担） */
  function checkDailyGoalPraise() {
    var today = VG_SRS.todayStr();
    var stats = store.getStats();
    var sentToday = store.state.sentenceRecords.filter(function (r) { return r.date === today; }).length;
    var gamiLog = (store.state.gamification && store.state.gamification.practiceLog) || [];
    var spokeToday = gamiLog.filter(function (r) { return r.date === today; }).length;
    var allDone = Math.min(stats.todayReviewCount, VG_DATA.CONFIG.reviewBatchSize) >= VG_DATA.CONFIG.reviewBatchSize
      && sentToday >= 1 && spokeToday >= 1;
    if (allDone) praisePlay('a1_daily_done');
  }
  function showPraiseSub(en, zh) {
    var el = document.getElementById('praiseSub');
    if (!el) {
      el = document.createElement('div');
      el.id = 'praiseSub';
      document.body.appendChild(el);
    }
    el.innerHTML = '<img src="assets/ip/su-bujuan-192.png" alt="">' +
      '<div class="ps-text"><b>' + esc(en) + '</b><span>' + esc(zh) + '</span></div>';
    el.classList.add('show');
    clearTimeout(showPraiseSub._t);
    showPraiseSub._t = setTimeout(function () { el.classList.remove('show'); }, 4500);
  }

  /* ---- Edge 神经拟真音源（免费·浏览器直连·失败自动回落传统 TTS）----
   * 中文：zh-CN-YunxiNeural（云希·年轻男声·支持 cheerful 欢快风格）
   * 英文：en-US-GuyNeural（自然男声）
   * 协议：wss + Sec-MS-GEC 令牌（BigInt 计算 ticks 的 SHA-256），6 秒超时 */
  var EDGE_TOKEN = '6A5AA1D4EAFF4E9FB37E23D68491D6F4';
  var EDGE_VOICE_ZH = 'zh-CN-YunxiNeural';
  var EDGE_VOICE_EN = 'en-US-GuyNeural';

  function edgeUuid() {
    return 'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'.replace(/x/g, function () {
      return Math.floor(Math.random() * 16).toString(16);
    });
  }
  function edgeXml(s) {
    return String(s).replace(/[&<>'"]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&apos;', '"': '&quot;' }[c];
    });
  }
  function edgeGec() {
    if (!(window.crypto && crypto.subtle && crypto.subtle.digest)) return Promise.resolve(null);
    var ticks = (BigInt(Math.floor(Date.now() / 1000)) + 11644473600n) * 10000000n;
    ticks = ticks - (ticks % 3000000000n);
    return crypto.subtle.digest('SHA-256', new TextEncoder().encode(ticks.toString() + EDGE_TOKEN))
      .then(function (hash) {
        var hex = '';
        new Uint8Array(hash).forEach(function (b) { hex += b.toString(16).padStart(2, '0'); });
        return hex.toUpperCase();
      })
      .catch(function () { return null; });
  }
  function edgeTts(text, lang, slow) {
    var voice = lang === 'zh-CN' ? EDGE_VOICE_ZH : EDGE_VOICE_EN;
    return edgeGec().then(function (gec) {
      if (!gec) return null;
      return new Promise(function (resolve) {
        var done = false, chunks = [], ws = null;
        function finish(result) {
          if (done) return;
          done = true;
          clearTimeout(t);
          try { ws.close(); } catch (e) {}
          resolve(result);
        }
        var t = setTimeout(function () { finish(null); }, 3500); /* Edge 不通时快速回落，不让用户干等 */
        try {
          ws = new WebSocket('wss://speech.platform.bing.com/consumer/speech/synthesize/readaloud/edge/v1?TrustedClientToken=' + EDGE_TOKEN +
            '&Sec-MS-GEC=' + gec + '&Sec-MS-GEC-Version=1-131.0.2903.112&ConnectionId=' + edgeUuid());
        } catch (e) { finish(null); return; }
        ws.binaryType = 'arraybuffer';
        ws.onopen = function () {
          var ts = new Date().toISOString();
          ws.send('X-Timestamp:' + ts + '\r\nContent-Type:application/json; charset=utf-8\r\nPath:speech.config\r\n\r\n' +
            '{"context":{"synthesis":{"audio":{"metadataoptions":{"sentenceBoundaryEnabled":"false","wordBoundaryEnabled":"false"},"outputFormat":"audio-24khz-48kbitrate-mono-mp3"}}}}');
          var ssml = "<speak version='1.0' xmlns='http://www.w3.org/2001/10/synthesis' xml:lang='" + lang + "'><voice name='" + voice + "'>" +
            "<mstts:express-as style='cheerful'><prosody rate='" + (slow ? '-25%' : '+0%') + "'>" + edgeXml(text) + '</prosody></mstts:express-as></voice></speak>';
          ws.send('X-RequestId:' + edgeUuid() + '\r\nContent-Type:application/ssml+xml\r\nX-Timestamp:' + ts + 'Z\r\nPath:ssml\r\n\r\n' + ssml);
        };
        ws.onmessage = function (ev) {
          if (typeof ev.data === 'string') {
            if (ev.data.indexOf('Path:turn.end') >= 0) finish(chunks.length ? new Blob(chunks, { type: 'audio/mp3' }) : null);
          } else {
            var hl = new DataView(ev.data).getUint16(0);
            if (ev.data.byteLength > hl + 2) chunks.push(ev.data.slice(hl + 2));
          }
        };
        ws.onerror = function () { finish(null); };
        ws.onclose = function () { finish(chunks.length ? new Blob(chunks, { type: 'audio/mp3' }) : null); };
      });
    });
  }
  /* 智能播放：Edge 拟真优先，拿不到音频回落传统链 */
  function playSmart(text, lang, fallbackUrls) {
    var slow = isSlow();
    edgeTts(text, lang, slow).then(function (blob) {
      if (blob) {
        stopAudio();
        var a = new Audio(URL.createObjectURL(blob));
        currentAudio = a;
        a.volume = 0.9;
        try { if (slow) a.playbackRate = 0.8; } catch (e) {}
        var p = a.play();
        if (p && p.catch) p.catch(function () { playChain(fallbackUrls, text, true); });
      } else {
        playChain(fallbackUrls, text, true);
      }
    }).catch(function () { playChain(fallbackUrls, text, true); });
  }

  function finishPractice(w, score, ref, speaking, userText, notes) {
    var prevScore = (store.state.gamification && store.state.gamification.practiceLog && store.state.gamification.practiceLog.length)
      ? store.state.gamification.practiceLog[store.state.gamification.practiceLog.length - 1].score : null;
    var res = GAMIFICATION.recordPractice({ mode: ws.mode, wordId: w.id, score: score.total, speaking: speaking });
    window._wsRefText = ref;
    window._wsUserText = userText || '';
    /* 写句子产出即自动入造句记录（否则用户看完评分就走，今日目标的「造句 1 句」永远差一项） */
    if (userText && (ws.mode === 'sentence' || ws.mode === 'keywords' || ws.mode === 'fill_blank')) {
      store.addSentenceRecord({
        wordId: w.id, userSentence: userText, refEn: ref, correction: '', status: 'pending'
      });
    }
    store.touchActive(); /* 开口练也算真实学习行为，计入连续天数 */
    var box = $('#wsRef');
    if (box) box.innerHTML = wsFeedbackHTML(score, ref, notes || []);
    var msg = '⭐ +' + res.points + ' 积分';
    if (res.newBadges.length) msg += ' · 🏅 ' + res.newBadges.map(function (b) { return b.name; }).join('、');
    if (res.levelUp) msg += ' · 🎉 升级「' + res.levelUp.name + '」';
    toast(msg, 'ok', 3600);
    recordUsage('sentence', 1);
    updateStreakPill();

    /* 情绪价值语音（P0）：一次练习只播一条，优先级 B1 > A3 > C1 */
    var firstSpeaking = speaking && store.state.gamification.speakingCount === 1;
    if (firstSpeaking) {
      praisePlay('b1_first_speaking');
    } else if (prevScore !== null && score.total >= 60 && score.total - prevScore >= 10) {
      praisePlay('a3_progress', score.total - prevScore);
    } else if (score.total < 60) { /* 低分鼓励：阈值从 45 提到 60（评分下限实测 57，原阈值不可达） */
      praisePlay('c1_low_score');
    }
    checkDailyGoalPraise();
  }

  function wsFeedbackHTML(score, refText, notes) {
    var dims = [
      ['语法', score.grammar.score],
      ['完整', score.completeness.score],
      ['自然', score.naturalness.score],
      ['词汇', score.vocabulary.score],
      ['对比', score.refSim != null ? score.refSim : 50]
    ];
    var bars = dims.map(function (d) {
      var color = d[1] >= 80 ? '#2E7D32' : (d[1] >= 55 ? '#F9A825' : '#E53935');
      return '<div class="fb-dim"><span class="fb-dim-name">' + d[0] + '</span>' +
        '<div class="fb-bar"><i style="width:' + d[1] + '%;background:' + color + '"></i></div>' +
        '<span class="fb-dim-num">' + d[1] + '</span></div>';
    }).join('');
    var fixes = (score.grammar.errors || []).concat(notes || []);
    var h = '<div class="fb-box">' +
      '<div class="fb-head"><div class="fb-score">' + score.total + '</div>' +
      '<div class="fb-title"><b>' + score.level.icon + ' ' + esc(score.level.label) + '</b>' +
      '<span class="fb-sub">' + esc(score.level.level) + ' 级 · ' + dims.map(function (d) { return d[0] + ' ' + d[1]; }).join(' · ') + '</span></div></div>' +
      '<div class="fb-bars">' + bars + '</div>';
    if (fixes.length) {
      h += '<div class="fb-sec"><b>💡 这样改更好</b><ul>' + fixes.map(function (c) { return '<li>' + esc(c) + '</li>'; }).join('') + '</ul></div>';
    }
    if (score.naturalness.highlights && score.naturalness.highlights.length) {
      h += '<div class="fb-sec fb-good"><b>🌟 做得好的</b><ul>' + score.naturalness.highlights.map(function (c) { return '<li>' + esc(c) + '</li>'; }).join('') + '</ul></div>';
    }
    if (refText) {
      h += '<div class="fb-ref"><b>💬 老外会说</b><div class="ref-en">' + esc(refText) + '</div>' +
        '<button class="btn-ghost" onclick="VG_APP.speakWsRef()">🔊 听一遍</button>' +
        '<div class="ref-tip">把整块说法搬走：下次遇到同样的意思，直接用这句。</div></div>';
    }
    h += '<div class="fb-actions">' +
      '<button class="btn btn-sm" onclick="VG_APP.wsMarkDone(true)">✅ 已会说对</button>' +
      '<button class="btn btn-sm btn-outline" onclick="VG_APP.wsMarkDone(false)">💾 记下来待巩固</button>' +
      '<button class="btn btn-sm btn-outline" onclick="VG_APP.wsRetry()">🔄 再练一次</button></div></div>';
    return h;
  }

  function wsMarkDone(done) {
    var w = window._wsWord;
    /* 造句记录已在 finishPractice 自动写入，这里只更新状态，避免重复记录 */
    if (done) {
      store.markSentenceDone(w.id);
      store.markLastRecordDone(w.id);
    }
    toast(done ? '✅ ' + w.w + ' 已会说对，进入主动词汇！' : '💾 已记录，下次继续练', 'ok');
    renderWsBody();
  }
  function speakWsRef() { if (window._wsRefText) speak(window._wsRefText); }

  /* ============================================================
   * ⑤ 说法库
   * ============================================================ */
  var chunkQuiz = false;
  PAGES.chunks = function (main) {
    var chunks = store.getChunks();
    var scenes = [];
    chunks.forEach(function (c) { if (scenes.indexOf(c.scene) < 0) scenes.push(c.scene); });

    main.innerHTML =
      '<div class="card"><div class="card-title">💬 地道说法库<span class="hint">你想说X → 老外会说Y · 库存够了，自然不用中文翻译</span>' +
      '<label class="quiz-toggle"><input type="checkbox" ' + (chunkQuiz ? 'checked' : '') + ' onchange="VG_APP.toggleQuiz(this.checked)"> 自测模式</label></div>' +
      scenes.map(function (scene) {
        var list = chunks.filter(function (c) { return c.scene === scene; });
        return '<div class="scene-h">🏷️ ' + esc(scene) + '<span class="hint" style="font-weight:400;font-size:12px;color:var(--ink-2)">' + list.length + ' 条</span></div>' +
          list.map(function (c) {
            return '<div class="chunk-card">' +
              '<div class="chunk-zh">💬 ' + esc(c.zh) + '</div>' +
              '<div class="chunk-en' + (chunkQuiz ? ' masked' : '') + '" ' +
              (chunkQuiz ? 'onclick="this.classList.remove(\'masked\')" title="点击揭晓"' : '') + '>' + esc(c.en) + '</div>' +
              '<div class="chunk-ops"><button class="speak-btn" onclick="VG_APP.speakChunkById(\'' + esc(c.id) + '\')">🔊</button>' +
              (c.custom ? '<button class="btn-ghost" onclick="VG_APP.delChunk(\'' + esc(c.id) + '\')">🗑️</button>' : '') +
              '</div></div>';
          }).join('');
      }).join('') +
      '<div class="card" style="margin-top:18px"><div class="card-title">➕ 攒一条新说法</div>' +
      '<label class="fld">场景</label><select id="ck-scene">' +
      ['好奇提问', '表达观点', '日常闲聊', '学英语相关', '我的语块'].map(function (s) {
        return '<option>' + s + '</option>';
      }).join('') + '</select>' +
      '<label class="fld">你想说（中文）*</label><input id="ck-zh" placeholder="例如：这事儿说来话长">' +
      '<label class="fld">老外会说（英文）*</label><input id="ck-en" placeholder="It\'s a long story.">' +
      '<div style="margin-top:14px"><button class="btn" onclick="VG_APP.addChunk()">入库 💬</button></div></div>';
  };

  function toggleQuiz(on) { chunkQuiz = on; render(); }

  function addChunk() {
    var r = store.addCustomChunk($('#ck-scene').value, $('#ck-zh').value, $('#ck-en').value);
    if (!r.ok) { toast(r.error, 'err'); return; }
    toast('💬 已入库，下次卡壳直接查这里', 'ok');
    render();
  }

  function delChunk(id) {
    store.removeCustomChunk(id);
    render();
    toast('已删除');
  }

  /* ============================================================
   * ⑥ 我的词汇
   * ============================================================ */
  var libTab = 'bank';
  var libGroupFilter = 'all';
  PAGES.library = function (main, presetTab) {
    if (presetTab) libTab = presetTab;
    var tabs = [
      ['bank', '📚 主动词汇库'], ['weak', '🔴 薄弱词清单'],
      ['records', '📝 造句记录'], ['achv', '🏆 成就'], ['data', '🗂️ 数据管理']
    ];
    main.innerHTML =
      '<div class="tabbar">' + tabs.map(function (t) {
        return '<button class="' + (libTab === t[0] ? 'on' : '') + '" onclick="VG_APP.switchLib(\'' + t[0] + '\')">' + t[1] + '</button>';
      }).join('') + '</div><div id="libBody"></div>';
    renderLibBody();
  };

  function switchLib(tab) { libTab = tab; render(); }

  function renderLibBody() {
    var body = $('#libBody');
    var words = store.getWords();
    if (libTab === 'bank') {
      var groups = [{ id: 'all', name: '全部词群' }].concat(VG_DATA.GROUPS);
      var filtered = libGroupFilter === 'all' ? words : words.filter(function (w) { return w.g === libGroupFilter; });
      body.innerHTML =
        '<div class="card"><div class="filter-row"><select onchange="VG_APP.setGroupFilter(this.value)">' +
        groups.map(function (g) {
          return '<option value="' + g.id + '"' + (libGroupFilter === g.id ? ' selected' : '') + '>' + esc(g.name) + '</option>';
        }).join('') + '</select>' +
        '<span style="font-size:13px;color:var(--ink-2);align-self:center">' + filtered.length + ' 词</span></div>' +
        '<div style="overflow-x:auto"><table class="vtable"><thead><tr>' +
        '<th>词</th><th>词群</th><th>造句</th><th>遗忘深度</th><th>备注</th></tr></thead><tbody>' +
        filtered.map(function (w) {
          return '<tr onclick="VG_APP.toggleRow(this)" style="cursor:pointer">' +
            '<td class="vw">' + esc(w.w) + ' <button class="btn-ghost" onclick="event.stopPropagation();VG_APP.speakWordById(\'' + esc(w.id) + '\')">🔊</button></td>' +
            '<td>' + esc(groupName(w.g)) + '</td>' +
            '<td>' + sentBadge(w) + '</td>' +
            '<td>' + depthBadge(w) + '</td>' +
            '<td style="font-size:12.5px;color:var(--ink-2)">' + esc(w.note || '') + '</td></tr>' +
            '<tr class="detail-row" style="display:none"><td colspan="5">' + wordCardHTML(w, false) + '</td></tr>';
        }).join('') + '</tbody></table></div></div>';
    } else if (libTab === 'weak') {
      var weak = words.filter(function (w) { return !!w.inWeak; });
      body.innerHTML =
        '<div class="weak-guide"><b>四步攻克法</b>（原系统薄弱词清单规则）：<br>' +
        '① 词根拆解（curious = curi 好奇 + ous 形容词尾） ② 造3句（场景句+聊天句+串句） ③ 记忆锚点（mechanic = 修 machine 的人） ④ 连续2次🟢 → 自动移出</div>' +
        '<div class="card">' +
        (weak.length === 0 ? '<div class="empty">薄弱词清单是空的 🎉<br><span style="font-size:12.5px">复习中标记 🔴 的词会自动进入这里</span></div>' :
        '<table class="vtable"><thead><tr><th>词</th><th>进清单</th><th>卡在哪层</th><th>锚点/备注</th><th></th></tr></thead><tbody>' +
        weak.map(function (w) {
          return '<tr><td class="vw">' + esc(w.w) + '</td><td>' + esc(w.weakSince || '—') + '</td>' +
            '<td>' + depthBadge(w) + '</td><td style="font-size:12.5px;color:var(--ink-2)">' + esc(w.note || '') + '</td>' +
            '<td><button class="btn btn-sm" onclick="VG_APP.go(\'#review\')">去抢救</button></td></tr>';
        }).join('') + '</tbody></table>') + '</div>';
    } else if (libTab === 'records') {
      var recs = store.state.sentenceRecords.slice().reverse();
      body.innerHTML = '<div class="card">' +
        (recs.length === 0 ? '<div class="empty">还没有造句记录</div>' :
        '<table class="vtable"><thead><tr><th>日期</th><th>词</th><th>你的句子</th><th>老外会说/纠正</th><th>状态</th></tr></thead><tbody>' +
        recs.map(function (r) {
          return '<tr><td>' + esc(r.date) + '</td><td class="vw">' + esc(r.wordId) + '</td>' +
            '<td>' + esc(r.userSentence) + '</td>' +
            '<td><div style="font-weight:600">' + esc(r.refEn || '') + '</div>' +
            (r.correction ? '<div style="font-size:12.5px;color:#B28704">' + esc(r.correction) + '</div>' : '') + '</td>' +
            '<td>' + (r.status === 'corrected' ? '<span class="badge badge-green">✅</span>' : '<span class="badge badge-gray">待巩固</span>') + '</td></tr>';
        }).join('') + '</tbody></table>') + '</div>';
    } else if (libTab === 'achv' && typeof GAMIFICATION !== 'undefined') {
      var ov = GAMIFICATION.getOverview();
      body.innerHTML =
        '<div class="card"><div class="achv-head">' +
        '<div class="achv-points">⭐ <b>' + ov.points + '</b> 积分</div>' +
        '<div class="achv-level">' + ov.level.icon + ' Lv.' + ov.level.level + ' ' + esc(ov.level.name) + '</div></div>' +
        '<div class="level-progress"><div class="bar"><i style="width:' + ov.progress.pct + '%"></i></div>' +
        (ov.progress.next
          ? '<div class="lp-text">' + ov.progress.pct + '% · 距离「' + esc(ov.progress.next.name) + '」还差 ' + ov.progress.remaining + ' 分</div>'
          : '<div class="lp-text">已是最高等级 🎉</div>') + '</div>' +
        '<div class="achv-meta">练习 ' + ov.practiceCount + ' 次 · 开口说 ' + ov.speakingCount + ' 次 · 最佳 ' + ov.bestScore + ' 分</div></div>' +
        '<div class="card"><div class="card-title">🏅 徽章墙<span class="hint">' + ov.unlocked.length + ' / ' + (ov.unlocked.length + ov.locked.length) + ' 已解锁</span></div>' +
        '<div class="badge-grid">' +
        ov.unlocked.map(function (b) {
          return '<div class="badge-cell on"><div class="b-ic">' + b.icon + '</div><div class="b-name">' + esc(b.name) + '</div><div class="b-desc">' + esc(b.description) + '</div></div>';
        }).join('') +
        ov.locked.map(function (b) {
          return '<div class="badge-cell"><div class="b-ic">🔒</div><div class="b-name">' + esc(b.name) + '</div><div class="b-desc">' + esc(b.description) + '</div></div>';
        }).join('') +
        '</div></div>' +
        (ov.recentLog.length
          ? '<div class="card"><div class="card-title">📜 最近练习</div>' + ov.recentLog.map(function (r) {
              return '<div class="milestone-item"><span>' + esc(r.date) + '</span><span style="font-weight:600">' + esc(r.wordId) + '</span><span style="color:var(--ink-2);margin-left:auto">' + esc(r.mode) + '</span><b style="margin-left:12px">' + r.score + '</b></div>';
            }).join('') + '</div>'
          : '<div class="card"><div class="empty">去「🎤 开口练」完成第一次练习，解锁第一个徽章</div></div>');
    } else {
      body.innerHTML =
        '<div class="card"><div class="card-title">🗂️ 数据管理<span class="hint">数据只存在本机浏览器 · 定期导出备份</span></div>' +
        '<div style="display:flex;gap:10px;flex-wrap:wrap">' +
        '<button class="btn" onclick="VG_APP.exportData()">⬇️ 导出备份 JSON</button>' +
        '<label class="btn btn-outline" style="display:inline-block">⬆️ 导入备份<input type="file" accept=".json" style="display:none" onchange="VG_APP.importData(this)"></label>' +
        '<button class="btn btn-outline" onclick="VG_APP.exportFeedback()">💬 导出反馈记录</button>' +
        '<button class="btn btn-outline" onclick="VG_APP.replayGuides()">🌱 重看新手引导</button>' +
        '<button class="btn btn-outline" style="color:var(--red);border-color:var(--red)" onclick="VG_APP.resetData()">↩️ 重置为种子数据</button></div>' +
        '<div class="install-guide"><b>📲 安装到手机桌面（像 App 一样打开）</b>' +
        '<span>📱 iPhone：用 <b>Safari</b> 打开本页 → 点分享按钮 <b>⬆️</b> → 「添加到主屏幕」</span>' +
        '<span>🤖 安卓：用 Chrome / Edge 打开 → 右上角菜单 <b>⋮</b> → 「添加到主屏幕」或「安装应用」</span>' +
        '<span>⚠️ 微信里装不了——先点右上角「···」→「在浏览器打开」，再到浏览器里安装</span>' +
        '<span>💡 安装后离线也能打开复习（发音功能需联网）</span>' +
        '<span style="margin-top:4px"><button class="btn btn-sm btn-outline" onclick="VG_APP.netDiag()">🔧 网络自检（发音不可用时点这里）</button></span>' +
        '<div id="diagResult" style="font-size:12px;color:var(--ink-2)"></div></div>' +
        '<p style="font-size:13px;color:var(--ink-2);margin-top:12px">种子数据 = OB「英语自学建设系统」2026-08-28 的真实快照（68词 + 13语块 + 2条造句记录）。重置会清空你此后的一切学习痕迹。反馈记录独立保存，用「导出反馈记录」单独取出。</p></div>';
    }
  }

  function setGroupFilter(v) { libGroupFilter = v; renderLibBody(); }

  function toggleRow(tr) {
    var detail = tr.nextElementSibling;
    if (detail && detail.classList.contains('detail-row')) {
      detail.style.display = detail.style.display === 'none' ? '' : 'none';
    }
  }

  function exportData() {
    var blob = new Blob([store.exportJSON()], { type: 'application/json' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'vocab-growth-backup-' + VG_SRS.todayStr() + '.json';
    a.click();
    URL.revokeObjectURL(a.href);
    toast('⬇️ 备份已导出', 'ok');
  }

  /* 反馈记录存在独立的 storage key，主备份不含它，需要单独导出 */
  function exportFeedback() {
    var raw;
    try { raw = localStorage.getItem('vocab_growth_feedback_v1') || '{}'; } catch (e) { raw = '{}'; }
    var blob = new Blob([raw], { type: 'application/json' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'vocab-growth-feedback-' + VG_SRS.todayStr() + '.json';
    a.click();
    URL.revokeObjectURL(a.href);
    toast('💬 反馈记录已导出', 'ok');
  }

  function importData(input) {
    var file = input.files[0];
    if (!file) return;
    var reader = new FileReader();
    reader.onload = function () {
      var r = store.importJSON(reader.result);
      if (r.ok) { toast('⬆️ 数据已恢复', 'ok'); render(); }
      else toast(r.error, 'err', 3500);
    };
    reader.readAsText(file);
  }

  function resetData() {
    /* M10 修复：两步确认防误操作 */
    if (!confirm('确定重置？你在本机的所有学习记录将被清空，恢复到种子数据。')) return;
    if (!confirm('再次确认：所有积分、徽章、造句记录、连续天数都将永久删除，无法恢复。确定继续？')) return;
    store.resetAll();
    rs = null;
    toast('已重置为种子数据', 'ok');
    render();
  }

  /* ---------- 语速切换 ---------- */
  function toggleSpeed() {
    store.setSpeed((store.state.speed || 1.0) >= 1 ? 0.7 : 1.0);
    $('#speedBtn').textContent = (store.state.speed >= 1) ? '🐢 慢' : '🐇 常';
    toast(store.state.speed >= 1 ? '常速发音' : '慢速发音（0.7x）');
  }

  /* ---------- 新手引导（仅首次访问） ---------- */
  function maybeOnboard() {
    if (store.state.onboarded) return;
    var ov = document.createElement('div');
    ov.id = 'onboard-overlay';
    ov.innerHTML =
      '<div class="onboard-card">' +
      '<img src="assets/ip/su-bujuan-192.png" alt="苏不倦" class="onboard-avatar">' +
      '<h2>🌱 欢迎来到词汇生长</h2>' +
      '<p class="onboard-sub">不背单词，让单词长出来</p>' +
      '<div class="onboard-step"><span class="os-ic">1️⃣</span><div><b>学 → 复 → 用</b><br>' +
      '词群里学词，分层抢救复习，然后在「开口练」说出来、造句用掉——每次 10 分钟就够。</div></div>' +
      '<div class="onboard-step"><span class="os-ic">2️⃣</span><div><b>词库已经备好</b><br>' +
      '68 个真实学习词 + 240 多个牛津图解主题词，在「学词」页随时挑词收进你的词库。</div></div>' +
      '<div class="onboard-step"><span class="os-ic">3️⃣</span><div><b>每天 3 件事</b><br>' +
      '复习 5 词 · 造句 1 句 · 开口 1 次。首页「今日目标」打卡，练了就涨积分升等级。</div></div>' +
      '<button class="btn" style="width:100%;margin-top:16px" onclick="VG_APP.finishOnboard()">开始我的第一天 →</button>' +
      '<p class="onboard-sign"><img src="assets/ip/su-bujuan-192.png" alt="" class="onboard-sign-avatar"> 苏不倦 · 做给每个想开口说英语的人 · 有问题加微信 kz910124</p>' +
      '</div>';
    document.body.appendChild(ov);
  }
  function finishOnboard() {
    store.setOnboarded();
    var ov = document.getElementById('onboard-overlay');
    if (ov) ov.remove();
    toast('🌱 开始吧！今天的任务在「今日」页等你', 'ok', 3200);
    render();
  }

  /* ---------- 暴露到全局（inline onclick 用） ---------- */
  var api = {
    go: go, toggleUse: toggleUse,
    speakWordById: function (id) { var w = store.getWord(id); if (w) speakWord(w); },
    speakExById: function (id) {
      var w = store.getWord(id);
      if (w && w.ex && w.ex.en) speak(w.ex.en);
      else if (w) speakWord(w);
    },
    speakChunkById: function (id) {
      var list = store.getChunks();
      for (var i = 0; i < list.length; i++) if (list[i].id === id) { speak(list[i].en); return; }
    },
    speakText: function (t) { speak(t); },
    submitNewWord: submitNewWord, pickLayer: pickLayer, newSession: newSession,
    pickWsMode: pickWsMode, pickWsDiff: pickWsDiff, pickWsWord: pickWsWord,
    submitSentence: submitSentence, submitFillBlank: submitFillBlank, submitKeywords: submitKeywords,
    startSpeech: startSpeech, selfRate: selfRate, toggleSelfRecord: toggleSelfRecord, wsRetry: function () { renderWsBody(); },
    wsMarkDone: wsMarkDone, speakWsRef: speakWsRef,
    toggleQuiz: toggleQuiz, addChunk: addChunk, delChunk: delChunk,
    switchLib: switchLib, setGroupFilter: setGroupFilter, toggleRow: toggleRow,
    exportData: exportData, exportFeedback: exportFeedback, importData: importData, resetData: resetData,
    copyWechat: copyWechat, netDiag: netDiag, praisePlay: praisePlay, praiseCan: praiseCan, edgeTts: edgeTts,
    submitRescue: submitRescue,
    toggleSpeed: toggleSpeed,
    collectOpd: collectOpd, finishOnboard: finishOnboard,
    showFeedbackModal: showFeedbackModal, closeFeedbackModal: closeFeedbackModal,
    submitFeedback: submitFeedback, setRating: setRating,
    dismissGuide: dismissGuide, replayGuides: replayGuides,
    _store: store
  };

  /* ---------- 启动 ---------- */
  function init() {
    $('#speedBtn').textContent = ((store.state.speed || 1.0) >= 1) ? '🐢 慢' : '🐇 常';
    $('#speedBtn').addEventListener('click', toggleSpeed);
    if (!location.hash) location.hash = '#today';
    render();
    maybeOnboard();

    /* 微信音频解锁：桥就绪即解锁，否则等首次触摸 */
    if (window.WeixinJSBridge) unlockAudio();
    else document.addEventListener('WeixinJSBridgeReady', unlockAudio, false);
    document.addEventListener('touchstart', unlockAudio, { once: true, passive: true });

    /* PWA：注册 Service Worker（离线可用 + 可安装到桌面；file:// 与老内核自动跳过） */
    if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === '127.0.0.1' || location.hostname === 'localhost')) {
      navigator.serviceWorker.register('sw.js').catch(function () {});
    }

    // 初始化微信白名单提示
    if (VG_WECHAT.showAlertIfNeeded) {
      VG_WECHAT.showAlertIfNeeded(1000);
    }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else setTimeout(init, 0); /* 延后一拍：保证 GAMIFICATION 等模块首次渲染时能拿到 VG_APP._store */

  return api;
})();
