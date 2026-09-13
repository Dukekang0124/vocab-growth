/* ============================================================
 * 词汇生长 — AI 学伴浮动窗 (js/ai-assistant.js)
 * 依赖：VG_APP（全局，取 _store/speakText）、GAMIFICATION（可选）
 * 功能：全局浮动球 + 底部聊天面板；三种模式（怎么用/教我这个词/英文陪聊）
 * 大脑：智谱 GLM-4-Flash（免费模型，OpenAI 兼容接口，已验证支持浏览器 CORS 直连）
 * Key 策略：内置默认 Key 体验；用户可在 设置→通用→AI学伴 换自己的 Key（localStorage）
 * ============================================================ */
var VG_AI = (function () {
  'use strict';

  /* ---------- 配置 ---------- */
  var API_URL = 'https://open.bigmodel.cn/api/paas/v4/chat/completions';
  var MODEL = 'glm-4-flash';
  /* 内置体验 Key（免费模型；用户可在设置中替换为自己的） */
  var BUILTIN_KEY = '3749a3477c5640908d4ea12345481b34.PKnWS0sLQg09FUkO';
  var KEY_STORE = 'vgAiKey';
  var SPEAK_STORE = 'vgAiAutoSpeak';
  var HISTORY_CAP = 20;       /* 每个模式线程最多保留的消息条数 */
  var SEND_CAP = 14;          /* 每次请求实际携带的最大消息条数 */
  var ASR_URL = 'https://open.bigmodel.cn/api/paas/v4/audio/transcriptions';
  var SF_ASR_URL = 'https://api.siliconflow.cn/v1/audio/transcriptions';
  var SF_ASR_MODEL = 'FunAudioLLM/SenseVoiceSmall';   /* 硅基流动免费语音识别 */
  var REC_MAX_MS = 29000;     /* 单条音频上限 30s，留余量 */

  /* ---------- 语音（Web Audio 采 PCM → WAV → GLM-ASR） ---------- */
  var rec = { on: false, ctx: null, stream: null, src: null, node: null, chunks: [], len: 0, t0: 0, timer: null, busy: false };

  function autoSpeakOn() { return lsGet(SPEAK_STORE, '1') === '1'; }
  function setAutoSpeak(v) { lsSet(SPEAK_STORE, v ? '1' : '0'); renderSpeakBtn(); }

  function renderSpeakBtn() {
    if (!el.speakToggle) return;
    el.speakToggle.textContent = autoSpeakOn() ? '🔊' : '🔇';
    el.speakToggle.title = autoSpeakOn() ? '语音回复已开（点击关闭）' : '语音回复已关（点击开启）';
  }

  function startRec() {
    if (rec.on || rec.busy) return;
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      toastAi('当前环境不支持麦克风'); return;
    }
    navigator.mediaDevices.getUserMedia({ audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true } })
      .then(function (stream) {
        rec.stream = stream;
        rec.ctx = new (window.AudioContext || window.webkitAudioContext)();
        /* 关键：移动端 WebView AudioContext 常以 suspended 启动，不 resume 采不到任何数据 */
        return rec.ctx.resume().then(function () {
          /* 再等 state 真正 running（个别 WebView resume 异步完成） */
          var tries = 0;
          function waitRunning() {
            if (rec.ctx.state === 'running' || tries++ > 10) return Promise.resolve();
            return new Promise(function (r) { setTimeout(r, 100); }).then(waitRunning);
          }
          return waitRunning();
        }).then(function () {
          if (rec.ctx.state !== 'running') { cleanupRec(); toastAi('麦克风被系统挂起，请重试或检查权限'); return; }
          rec.src = rec.ctx.createMediaStreamSource(stream);
          rec.node = rec.ctx.createScriptProcessor(4096, 1, 1);
          rec.chunks = []; rec.len = 0; rec.t0 = Date.now(); rec.on = true;
          rec.hasSpeech = false; rec.lastVoice = 0; rec.autoStopped = false;
          rec.node.onaudioprocess = function (e) {
            if (!rec.on) return;
            var d = e.inputBuffer.getChannelData(0);
            rec.chunks.push(new Float32Array(d));
            rec.len += d.length;
            /* VAD：能量检测。说过话之后静音超过 1.5s → 自动断句发送 */
            var sum = 0;
            for (var i = 0; i < d.length; i++) sum += d[i] * d[i];
            var rms = Math.sqrt(sum / d.length);
            var now = Date.now();
            if (rms > 0.012) { rec.hasSpeech = true; rec.lastVoice = now; }
            else if (rec.hasSpeech && now - rec.lastVoice > 1500 && !rec.busy) {
              rec.autoStopped = true;
              stopRec();
              return;
            }
            if (now - rec.t0 > REC_MAX_MS) stopRec();
          };
          rec.src.connect(rec.node);
          rec.node.connect(rec.ctx.destination);
          el.mic.classList.add('rec');
          recStatus('🎙️ 正在听…说完停顿一下就会自动发送（也可点 ⏹ 结束）');
          rec.timer = setInterval(function () {
            el.mic.textContent = '⏹ ' + Math.floor((Date.now() - rec.t0) / 1000) + 's';
          }, 500);
        });
      })
      .catch(function () { toastAi('🎤 麦克风不可用，请允许麦克风权限后重试（旧版 APK 需升级到 1.0.32+）'); });
  }

  function cleanupRec() {
    try { rec.node.disconnect(); rec.src.disconnect(); } catch (e) {}
    try { rec.stream.getTracks().forEach(function (t) { t.stop(); }); } catch (e) {}
    try { rec.ctx.close(); } catch (e) {}
  }

  function recStatus(text) {
    var s = document.getElementById('aiRecStatus');
    if (s) { s.textContent = text; s.style.display = text ? 'flex' : 'none'; }
  }

  function stopRec() {
    if (!rec.on) return;
    rec.on = false;
    clearInterval(rec.timer);
    el.mic.classList.remove('rec');
    el.mic.textContent = '…';
    var sampleRate = rec.ctx ? rec.ctx.sampleRate : 16000;
    cleanupRec();
    /* 过短的录音不发送（<0.6s 视为误触） */
    var seconds = rec.len / sampleRate;
    if (seconds < 0.6 || !rec.hasSpeech) {
      el.mic.textContent = '🎤';
      recStatus('');
      toastAi(rec.hasSpeech ? '说话太短啦' : '没听到声音，请离麦克风近一点再说');
      return;
    }
    var merged = new Float32Array(rec.len);
    var off = 0;
    for (var i = 0; i < rec.chunks.length; i++) { merged.set(rec.chunks[i], off); off += rec.chunks[i].length; }
    rec.chunks = [];
    var wavBuf = encodeWav(downsample16k(merged, sampleRate), 16000);
    rec.busy = true;
    recStatus('🗣️ 识别中，请稍候…');
    el.input.placeholder = '🗣️ 识别中…';
    transcribe(wavBuf).then(function (text) {
      rec.busy = false;
      el.mic.textContent = '🎤';
      recStatus('');
      el.input.placeholder = '输入问题，或点麦克风说英文…';
      text = (text || '').trim();
      if (!text) { toastAi('没听清，再靠近一点试一次？'); return; }
      /* AI 还在回复时发送会被拒：文字退回输入框，不丢 */
      if (!send(text, { voice: true })) el.input.value = text;
    }).catch(function (err) {
      rec.busy = false;
      el.mic.textContent = '🎤';
      recStatus('');
      el.input.placeholder = '输入问题，或点麦克风说英文…';
      toastAi('语音识别失败：' + (err && err.message ? err.message : '请再试一次'));
    });
  }

  function toggleRec() {
    if (rec.on) { stopRec(); try { var s = nativeSR(); if (s && s.stop) s.stop(); } catch (e) {} return; }
    if (nativeListen()) return;   /* APK：系统级语音识别（免费/离线/自动断句） */
    startRec();                    /* 网页：录音→云 ASR 链 */
  }

  /* ---------- 安卓原生语音识别（@capacitor-community/speech-recognition） ---------- */
  function nativeSR() {
    return (window.Capacitor && Capacitor.Plugins && Capacitor.Plugins.SpeechRecognition) || null;
  }
  function nativeListen() {
    var SR = nativeSR();
    if (!SR || !SR.start) return false;
    var lang = (mode === 'chat') ? 'en-US' : 'zh-CN';  /* 陪聊练英文，其余场景识别中文 */
    el.mic.classList.add('rec');
    el.mic.textContent = '⏹';
    recStatus('🎙️ 正在听…说完停顿一下就会自动发送');
    var ready = SR.checkPermission
      ? SR.checkPermission().then(function (p) {
          return p && p.speechRecognition === 'granted' ? null : SR.requestPermission();
        }).catch(function () { return SR.requestPermission(); })
      : Promise.resolve();
    ready.then(function () { return SR.start({ lang: lang, maxResults: 3, partialResults: false, popup: true }); })
      .then(function (res) {
        el.mic.classList.remove('rec');
        el.mic.textContent = '🎤';
        recStatus('');
        var matches = (res && res.matches) || [];
        var text = (matches[0] || '').trim();
        if (!text) { toastAi('没听清，再靠近一点说一次？'); return; }
        send(text, { voice: true });
      })
      .catch(function (e) {
        el.mic.classList.remove('rec');
        el.mic.textContent = '🎤';
        recStatus('');
        var msg = e && e.message ? e.message : '请再试一次';
        toastAi('语音识别未成功：' + msg);
        /* 原生不可用（权限被拒等）→ 不再自动降级录音，避免二次弹窗 */
      });
    return true;
  }

  /* 任意采样率 → 16kHz 单声道（简单线性抽取，人声够用） */
  function downsample16k(f32, fromRate) {
    var ratio = fromRate / 16000;
    if (ratio <= 1) return f32;
    var n = Math.floor(f32.length / ratio);
    var out = new Float32Array(n);
    for (var i = 0; i < n; i++) out[i] = f32[Math.floor(i * ratio)];
    return out;
  }

  /* Float32 PCM → 16bit WAV（GLM-ASR 只收 wav/mp3） */
  function encodeWav(samples, rate) {
    var buf = new ArrayBuffer(44 + samples.length * 2);
    var v = new DataView(buf);
    function wstr(off, s) { for (var i = 0; i < s.length; i++) v.setUint8(off + i, s.charCodeAt(i)); }
    wstr(0, 'RIFF'); v.setUint32(4, 36 + samples.length * 2, true); wstr(8, 'WAVE');
    wstr(12, 'fmt '); v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true);
    v.setUint32(24, rate, true); v.setUint32(28, rate * 2, true); v.setUint16(32, 2, true); v.setUint16(34, 16, true);
    wstr(36, 'data'); v.setUint32(40, samples.length * 2, true);
    for (var i = 0; i < samples.length; i++) {
      var s = Math.max(-1, Math.min(1, samples[i]));
      v.setInt16(44 + i * 2, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
    }
    return buf;
  }

  function transcribe(wavBuf) {
    var sfKey = lsGet('vgAsrKey', '').trim();
    var chain = sfKey
      ? [transcribeVia(sfKey, SF_ASR_URL, SF_ASR_MODEL), transcribeVia(getKey(), ASR_URL, 'glm-asr-2512')]
      : [transcribeVia(getKey(), ASR_URL, 'glm-asr-2512')];
    /* 依次尝试，全部失败时汇总原因 */
    function tryAt(i) {
      return chain[i]().catch(function (e) {
        if (i + 1 < chain.length) return tryAt(i + 1);
        throw e;
      });
    }
    return tryAt(0);
  }

  function transcribeVia(key, url, model) {
    var fd = new FormData();
    fd.append('model', model);
    fd.append('file', new Blob([wavBuf], { type: 'audio/wav' }), 'voice.wav');
    return fetch(url, { method: 'POST', headers: { 'Authorization': 'Bearer ' + key }, body: fd })
      .then(function (r) {
        return r.json().then(function (j) { return { code: r.status, j: j }; });
      })
      .then(function (res) {
        if (res.j.text != null) return res.j.text;
        var msg = (res.j.error && res.j.error.message) || (res.j.message) || ('HTTP ' + res.code);
        throw new Error(msg);
      });
  }

  function toastAi(msg) {
    if (window.VG_APP && VG_APP._toast) VG_APP._toast(msg);
    else console.log('[AI]', msg);
  }

  /* ---------- 状态 ---------- */
  var mode = 'guide';         /* guide 怎么用 | teach 教我这个词 | chat 英文陪聊 */
  var threads = { guide: [], teach: [], chat: [] };
  var streaming = false;
  var el = {};                /* DOM 引用缓存 */

  var MODES = [
    { id: 'guide', icon: '🧭', name: '怎么用' },
    { id: 'teach', icon: '📖', name: '教我这个词' },
    { id: 'chat',  icon: '💬', name: '英文陪聊' }
  ];
  var SUGGESTIONS = {
    guide: ['这个页面是干嘛的？', '今天我该学什么？', '怎么复习最有效？'],
    teach: ['教教我今天的词', '这个词怎么搭配？', '给我举个例子'],
    chat:  ['用我的造句聊聊', '陪我练口语', '聊聊今天学的事']
  };
  var PAGE_LABELS = {
    today: '今日首页', learn: '学词', review: '复习', workshop: '开口练',
    chunks: '说法库', sounds: '音标表', library: '词汇库', records: '造句记录',
    achievements: '成就墙', stats: '学习统计', settings: '设置'
  };

  /* ---------- 小工具 ---------- */
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function lsGet(k, d) { try { var v = localStorage.getItem(k); return v == null ? d : v; } catch (e) { return d; } }
  function lsSet(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
  function loadThreads() {
    try {
      var raw = lsGet('vgAiThreads', null);
      if (raw) { var p = JSON.parse(raw); if (p && p.guide) threads = p; }
    } catch (e) {}
  }
  function saveThreads() {
    for (var m in threads) if (threads[m].length > HISTORY_CAP) threads[m].splice(0, threads[m].length - HISTORY_CAP);
    lsSet('vgAiThreads', JSON.stringify(threads));
  }
  function getKey() { return (lsGet(KEY_STORE, '') || '').trim() || BUILTIN_KEY; }
  function setKey(k) { lsSet(KEY_STORE, (k || '').trim()); }

  /* ---------- 上下文采集（把用户的学习状态喂给 AI） ---------- */
  function getContext() {
    var ctx = { page: '今日首页', level: 'A2', total: 0, due: 0, reviewedToday: 0, weak: [], lastSentence: '', word: null };
    try {
      var app = window.VG_APP, store = app && app._store;
      var hash = (location.hash || '#today').replace('#', '');
      ctx.page = PAGE_LABELS[hash.split('-')[0]] || '今日首页';
      if (!store) return ctx;
      try { ctx.level = (window.GAMIFICATION && GAMIFICATION.getDifficulty()) || 'A2'; } catch (e) {}
      var words = store.getWords();
      ctx.total = words.length;
      var today = VG_SRS.todayStr();
      var dueIds = {};
      words.forEach(function (w) {
        var ov = store.state.overrides[w.w];
        if (ov && ov.nextReview && ov.nextReview <= today) dueIds[w.w] = true;
      });
      ctx.due = Object.keys(dueIds).length;
      var reviewed = {};
      store.state.reviewLog.forEach(function (r) { if (r.date === today) reviewed[r.wordId] = true; });
      ctx.reviewedToday = Object.keys(reviewed).length;
      /* 薄弱词（按弱置时间最早的 5 个） */
      var weak = words.filter(function (w) { var ov = store.state.overrides[w.w]; return ov && ov.inWeak; }).slice(0, 5);
      ctx.weak = weak.map(function (w) { return w.w; });
      /* 最近一条造句 */
      var srs = store.state.sentenceRecords || [];
      if (srs.length) {
        var last = srs[srs.length - 1];
        ctx.lastSentence = (last.en || last.sentence || '') + '';
      }
      /* 目标词：今日最后复习的词 > 最早到期的词 > 薄弱词第一个 > 第一个词 */
      var target = null;
      for (var i = (store.state.reviewLog || []).length - 1; i >= 0; i--) {
        var r = store.state.reviewLog[i];
        if (r.date === today && r.wordId) { target = r.wordId; break; }
      }
      if (!target) {
        var dueWords = words.filter(function (w) { return dueIds[w.w]; });
        if (dueWords.length) target = dueWords[0].w;
      }
      if (!target && ctx.weak.length) target = ctx.weak[0];
      if (!target && words.length) target = words[0].w;
      if (target) {
        var w = store.getWord(target);
        if (w) ctx.word = { w: w.w, zh: w.zh || w.zhDef || '', ex: (w.ex && w.ex.en) || w.ex || '' };
      }
    } catch (e) {}
    return ctx;
  }

  function contextBlock(ctx) {
    var lines = ['【当前页面】' + ctx.page, '【英语水平】' + ctx.level,
      '【词汇量】' + ctx.total + ' 个（今日已复习 ' + ctx.reviewedToday + ' 个，今日待复习 ' + ctx.due + ' 个）'];
    if (ctx.weak.length) lines.push('【薄弱词】' + ctx.weak.join('、'));
    if (ctx.lastSentence) lines.push('【用户最近的造句】' + ctx.lastSentence);
    if (ctx.word) lines.push('【目标词】' + ctx.word.w + (ctx.word.zh ? '（' + ctx.word.zh + '）' : '') + (ctx.word.ex ? ' 例句: ' + ctx.word.ex : ''));
    return lines.join('\n');
  }

  /* ---------- 系统提示词 ---------- */
  var PERSONA = '你是「词汇生长」App 内置的 AI 学伴「小苗🌱」。用户是中国的成人英语学习者，正在用这个 App 背单词、造句、开口说英语。\n' +
    '规则：\n' +
    '- 用中文解释和交流；英文例句/陪练内容用简单英文\n' +
    '- 回复简洁友好，一般不超过 150 字，多用短句和列表\n' +
    '- 多鼓励；用户有错误时先肯定再给正确版本（用「✏️ 更自然地说：…」标注）\n' +
    '- 只聊英语学习和本 App 使用，无关话题礼貌拉回学习';

  function buildSystemPrompt() {
    var ctx = getContext();
    var base = PERSONA + '\n\n【用户学习状态】\n' + contextBlock(ctx);
    if (mode === 'guide') {
      return base + '\n\n【你的任务】解答用户对本 App 的使用疑问。产品结构：底部4个Tab——「今日」学习仪表盘；「学习」含学词/复习/开口练/说法库/音标表五个子页；「我的」含词汇库/造句记录/成就/统计；「设置」含通用/数据/关于。学词流程：学词页学新词→提交造句→按 SRS 间隔复习；开口练有4种练法（造句/填空/关键词/自测）并给发音评分。结合用户当前页面「' + ctx.page + '」给出下一步建议。';
    }
    if (mode === 'teach') {
      return base + '\n\n【你的任务】围绕目标词教用户学会用它。用 3 步：1）一词多义或核心意思；2）1-2 个高频搭配；3）一个贴近生活的简单例句（英文+中文）。最后明确要求用户用这个词造一个句子发给你，并说明你会帮他批改。目标词以上方【目标词】为准。';
    }
    return base + '\n\n【你的任务】陪用户用英文聊天练口语。要求：\n' +
      '- 每轮你只说 2-3 句简单英文（贴近用户水平和目标词/最近造句话题），必要时附一句中文提示\n' +
      '- 主动使用用户的薄弱词和目标词，引导用户把学过的词说出来\n' +
      '- 用户用中文回复时，鼓励他改用英文说一遍；用户英文有错时用「✏️ 更自然地说：…」给正确版本，然后继续话题\n' +
      '- 第一句先自然开场切入话题';
  }

  /* ---------- API 调用（SSE 流式） ---------- */
  function chatStream(messages, onDelta, onDone, onErr) {
    fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + getKey() },
      body: JSON.stringify({ model: MODEL, messages: messages, stream: true, temperature: 0.8, max_tokens: 700 })
    }).then(function (res) {
      if (!res.ok) {
        return res.text().then(function (t) {
          var msg = res.status === 401 ? '🔑 AI Key 无效或过期，去 设置→通用→AI学伴 换一个吧'
            : res.status === 429 ? '⏳ AI 请求太频繁了，休息一下再试'
            : '⚠️ AI 服务开小差（' + res.status + '），稍后再试';
          onErr(msg);
        });
      }
      var reader = res.body.getReader();
      var dec = new TextDecoder();
      var buf = '';
      function pump() {
        return reader.read().then(function (r) {
          if (r.done) { onDone(); return; }
          buf += dec.decode(r.value, { stream: true });
          var lines = buf.split('\n');
          buf = lines.pop();
          for (var i = 0; i < lines.length; i++) {
            var line = lines[i].trim();
            if (line.indexOf('data:') !== 0) continue;
            var payload = line.slice(5).trim();
            if (payload === '[DONE]') { onDone(); try { reader.cancel(); } catch (e) {} return; }
            try {
              var j = JSON.parse(payload);
              var d = j.choices && j.choices[0] && j.choices[0].delta && j.choices[0].delta.content;
              if (d) onDelta(d);
            } catch (e) {}
          }
          return pump();
        });
      }
      return pump();
    }).catch(function () { onErr('⚠️ 网络连不上 AI 服务，检查网络后重试'); });
  }

  /* 抽取适合朗读的英文：按 ASCII 字母数最多的行，剥离中文/emoji 后返回 */
  function pickEnglish(text) {
    var lines = String(text).split('\n'), best = '', bestN = 0;
    for (var i = 0; i < lines.length; i++) {
      var ascii = (lines[i].match(/[\x20-\x7E]/g) || []).join('');
      var letters = (ascii.match(/[A-Za-z]/g) || []).length;
      if (letters >= 8 && letters > bestN) { bestN = letters; best = ascii; }
    }
    return best.replace(/\s+/g, ' ').trim();
  }

  /* ---------- 渲染 ---------- */
  function renderMsgs() {
    var box = el.msgs;
    var list = threads[mode];
    if (!list.length) {
      box.innerHTML = '<div class="ai-empty">🌱 我是你的 AI 学伴小苗<br><span>' + ({ guide: '关于这个 App 怎么用，随便问', teach: '我来把目标词讲透，再陪你造句', chat: '用你学过的词，跟我用英文聊起来' }[mode]) + '</span></div>' +
        '<div class="ai-suggest">' + SUGGESTIONS[mode].map(function (s) {
          return '<button onclick="VG_AI.quickAsk(\'' + esc(s) + '\')">' + esc(s) + '</button>';
        }).join('') + '</div>';
      return;
    }
    box.innerHTML = list.map(function (m, i) {
      if (m.role === 'user') return '<div class="ai-row me"><div class="ai-bubble">' + esc(m.content) + '</div></div>';
      var en = pickEnglish(m.content);
      return '<div class="ai-row ai"><div class="ai-bubble">' + fmt(m.content) +
        (en ? '<button class="ai-speak" title="朗读英文" onclick="VG_APP.speakText(VG_AI.englishOf(' + i + '))">🔊</button>' : '') +
        '</div></div>';
    }).join('');
    box.scrollTop = box.scrollHeight;
  }
  /* 供朗读按钮取原文 */
  function englishOf(i) { return pickEnglish((threads[mode][i] || {}).content || ''); }
  function fmt(t) { return esc(t).replace(/\n/g, '<br>'); }

  function renderModeChips() {
    el.chips.innerHTML = MODES.map(function (m) {
      return '<button class="' + (mode === m.id ? 'on' : '') + '" onclick="VG_AI.switchMode(\'' + m.id + '\')">' + m.icon + ' ' + m.name + '</button>';
    }).join('');
  }

  function setStreaming(on) {
    streaming = on;
    el.send.disabled = on;
    el.send.textContent = on ? '…' : '发送';
    el.input.disabled = on;
  }

  /* ---------- 发送流程 ---------- */
  function send(text, opts) {
    text = (text || '').trim();
    if (!text) return false;
    if (streaming) { toastAi('🌱 AI 还在回复，稍等一下'); return false; }
    opts = opts || {};
    /* 关键：发送瞬间锁定线程与模式。中途切模式不改写目标，回调全部用捕获引用，
       避免 mode 漂移把内容写错线程、或 undefined 崩溃卡死输入 */
    var th = threads[mode];
    var thatMode = mode;
    var msgs = [{ role: 'system', content: buildSystemPrompt() }].concat(
      th.slice(-SEND_CAP),
      [{ role: 'user', content: text }]
    );
    th.push({ role: 'user', content: text });
    th.push({ role: 'assistant', content: '' });
    saveThreads();
    if (mode === thatMode) renderMsgs();
    var bubbleIdx = th.length - 1;
    setStreaming(true);
    if (mode === thatMode) {
      bubble = document.createElement('div');
      bubble.className = 'ai-row ai';
      bubble.innerHTML = '<div class="ai-bubble ai-typing">🌱…</div>';
      el.msgs.appendChild(bubble);
      el.msgs.scrollTop = el.msgs.scrollHeight;
    }

    var bubble = null;
    function liveBubble() {
      if (!bubble || !bubble.isConnected) return null;  /* 切模式重渲染后旧气泡已脱离 DOM */
      return bubble;
    }
    chatStream(msgs,
      function (d) {
        var m = th[bubbleIdx];
        if (!m) return;
        m.content += d;
        var b = liveBubble();
        if (b) {
          var inner = b.firstChild;
          if (inner) {
            inner.classList.remove('ai-typing');
            inner.innerHTML = fmt(m.content) + '<span class="ai-caret"></span>';
            el.msgs.scrollTop = el.msgs.scrollHeight;
          }
        }
      },
      function () {
        var m = th[bubbleIdx];
        if (m && !m.content) m.content = '（AI 没有返回内容，再试一次吧）';
        saveThreads();
        setStreaming(false);
        if (mode === thatMode) renderMsgs();
        /* 语音发起的轮次：回复自动朗读（优先英文部分） */
        if (opts.voice && autoSpeakOn() && m) {
          var spoken = pickEnglish(m.content) || m.content;
          if (window.VG_APP && VG_APP.speakText) VG_APP.speakText(spoken);
        }
      },
      function (errText) {
        var m = th[bubbleIdx];
        if (m) m.content = errText;
        saveThreads();
        setStreaming(false);
        if (mode === thatMode) renderMsgs();
      });
    return true;
  }

  /* ---------- 面板开关 ---------- */
  function openPanel() { el.wrap.classList.add('open'); renderModeChips(); renderMsgs(); el.input.focus(); }
  function closePanel() { el.wrap.classList.remove('open'); el.input.blur(); }
  function togglePanel() { el.wrap.classList.contains('open') ? closePanel() : openPanel(); }
  function switchMode(m) { mode = m; renderModeChips(); renderMsgs(); }
  function quickAsk(s) {
    if (!send(s) && streaming) { /* send() 内已提示 */ }
  }
  function clearThread() { threads[mode] = []; saveThreads(); renderMsgs(); }

  /* ---------- 浮动球（可拖拽记住位置） ---------- */
  function initBall() {
    var pos = null;
    try { pos = JSON.parse(lsGet('vgAiBallPos', 'null')); } catch (e) {}
    function place() {
      var w = window.innerWidth, h = window.innerHeight;
      var x = pos && pos.x != null ? Math.min(Math.max(12, pos.x), w - 60) : w - 66;
      var y = pos && pos.y != null ? Math.min(Math.max(60, pos.y), h - 160) : h - 176;
      el.ball.style.left = x + 'px'; el.ball.style.top = y + 'px'; el.ball.style.right = 'auto'; el.ball.style.bottom = 'auto';
    }
    place();
    var drag = null, moved = false;
    el.ball.addEventListener('pointerdown', function (e) {
      drag = { x: e.clientX - el.ball.offsetLeft, y: e.clientY - el.ball.offsetTop }; moved = false;
      el.ball.setPointerCapture(e.pointerId);
    });
    el.ball.addEventListener('pointermove', function (e) {
      if (!drag) return;
      var nx = e.clientX - drag.x, ny = e.clientY - drag.y;
      if (Math.abs(nx - el.ball.offsetLeft) > 3 || Math.abs(ny - el.ball.offsetTop) > 3) moved = true;
      el.ball.style.left = Math.min(Math.max(12, nx), window.innerWidth - 60) + 'px';
      el.ball.style.top = Math.min(Math.max(60, ny), window.innerHeight - 160) + 'px';
    });
    el.ball.addEventListener('pointerup', function () {
      if (drag && moved) {
        pos = { x: el.ball.offsetLeft, y: el.ball.offsetTop };
        lsSet('vgAiBallPos', JSON.stringify(pos));
      } else {
        togglePanel();
      }
      drag = null;
    });
  }

  /* ---------- 初始化 ---------- */
  function init() {
    loadThreads();
    var wrap = document.createElement('div');
    wrap.id = 'aiWrap';
    wrap.innerHTML =
      '<button id="aiBall" title="AI 学伴">🌱</button>' +
      '<div id="aiPanel" role="dialog">' +
      '  <div class="ai-head"><span class="ai-title">🌱 AI 学伴小苗</span>' +
      '    <span class="ai-headbtns"><button id="aiSpeakToggle" onclick="VG_AI.toggleAutoSpeak()" title="语音回复开关">🔊</button>' +
      '    <button onclick="VG_AI.clearThread()" title="清空对话">🧹</button>' +
      '    <button onclick="VG_APP.go(\'#settings\');VG_AI.closePanel()" title="设置">⚙️</button>' +
      '    <button onclick="VG_AI.closePanel()" title="收起">✕</button></span></div>' +
      '  <div class="ai-chips" id="aiChips"></div>' +
      '  <div class="ai-msgs" id="aiMsgs"></div>' +
      '  <div class="ai-recstatus" id="aiRecStatus" style="display:none"></div>' +
      '  <div class="ai-inputrow"><button id="aiMic" class="ai-mic" title="点一下说话，停顿自动发送">🎤</button>' +
      '  <textarea id="aiInput" rows="1" placeholder="输入问题，或直接说英文…"></textarea>' +
      '  <button id="aiSend">发送</button></div>' +
      '</div>';
    document.body.appendChild(wrap);
    el = { wrap: wrap, ball: wrap.querySelector('#aiBall'), panel: wrap.querySelector('#aiPanel'),
      chips: wrap.querySelector('#aiChips'), msgs: wrap.querySelector('#aiMsgs'),
      input: wrap.querySelector('#aiInput'), send: wrap.querySelector('#aiSend'),
      mic: wrap.querySelector('#aiMic'), speakToggle: wrap.querySelector('#aiSpeakToggle') };

    el.send.addEventListener('click', function () {
      if (send(el.input.value)) el.input.value = '';
    });
    el.mic.addEventListener('click', toggleRec);
    el.input.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        if (send(el.input.value)) el.input.value = '';
      }
    });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closePanel(); });
    renderSpeakBtn();
    initBall();
    renderModeChips();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else setTimeout(init, 0);

  return {
    openPanel: openPanel, closePanel: closePanel, togglePanel: togglePanel,
    switchMode: switchMode, quickAsk: quickAsk, clearThread: clearThread,
    setKey: setKey, getKey: getKey, englishOf: englishOf,
    toggleRec: toggleRec, toggleAutoSpeak: function () { setAutoSpeak(!autoSpeakOn()); },
    _getContext: getContext,
    /* 诊断用：把 Float32 采样直接走完整识别链路（控制台可调） */
    _asr: function (f32, rate) { return transcribe(encodeWav(downsample16k(f32, rate), 16000)); }
  };
})();
