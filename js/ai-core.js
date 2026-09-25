/* ============================================================
 * 词汇生长 — AI 统一网关 (js/ai-core.js) — 完整重写版
 * 全应用 AI 能力的唯一入口：队列 / 两层缓存 / 降级 / 总开关 / 共享 Key
 * ============================================================ */
var VG_AI_CORE = (function () {
  'use strict';

  var API_URL = 'https://open.bigmodel.cn/api/paas/v4/chat/completions';
  var BUILTIN_KEY = '3749a3477c5640908d4ea12345481b34.PKnWS0sLQg09FUkO';
  var MODEL = 'glm-4-flash';
  var CTX_TTL = 7 * 86400000;
  var CACHE_CAP = 400;

  var QUEUE = [], qBusy = false;

  function enabled() {
    try { return localStorage.getItem('vgAiEnabled') !== '0'; } catch (e) { return true; }
  }
  function setEnabled(v) { try { localStorage.setItem('vgAiEnabled', v ? '1' : '0'); } catch (e) {} }
  function getKey() {
    try { return (localStorage.getItem('vgAiKey') || '').trim() || BUILTIN_KEY; }
    catch (e) { return BUILTIN_KEY; }
  }
  function setKey(k) { try { localStorage.setItem('vgAiKey', (k || '').trim()); } catch (e) {} }

  function hash(s) {
    var h1 = 0x811c9dc5;
    s = String(s || '');
    for (var i = 0; i < s.length; i++) { h1 ^= s.charCodeAt(i); h1 = (h1 * 0x01000193) >>> 0; }
    return ('0000000' + h1.toString(16)).slice(-8) + s.length.toString(36);
  }

  function cacheGet(k, ttl) {
    try {
      var raw = localStorage.getItem(k);
      if (!raw) return null;
      var item = JSON.parse(raw);
      if (ttl && Date.now() - item.t > ttl) { localStorage.removeItem(k); return null; }
      return item.v;
    } catch (e) { return null; }
  }
  function cacheSet(k, v) {
    try {
      localStorage.setItem(k, JSON.stringify({ t: Date.now(), v: v }));
      var keys = [];
      for (var i = 0; i < localStorage.length; i++) {
        var key = localStorage.key(i);
        if (key && key.indexOf('vgAiCache:') === 0) keys.push(key);
      }
      if (keys.length > CACHE_CAP) {
        var items = keys.map(function (key) {
          try { var it = JSON.parse(localStorage.getItem(key)); return { k: key, t: it.t || 0 }; }
          catch (e) { return { k: key, t: 0 }; }
        }).sort(function (a, b) { return a.t - b.t; });
        items.slice(0, keys.length - CACHE_CAP).forEach(function (it) { localStorage.removeItem(it.k); });
      }
    } catch (e) {}
  }

  function enqueue(task) {
    return new Promise(function (res, rej) {
      QUEUE.push({ task: task, res: res, rej: rej });
      pump();
    });
  }
  function pump() {
    if (qBusy || !QUEUE.length) return;
    qBusy = true;
    var t = QUEUE.shift();
    t.task().then(function (v) { t.res(v); })
      .catch(function (e) { t.rej(e); })
      .then(function () { setTimeout(function () { qBusy = false; pump(); }, 350); });
  }

  function chat(messages, opts) {
    opts = opts || {};
    if (!enabled()) return Promise.reject(new Error('AI_OFF'));
    return enqueue(function () {
      return fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + getKey() },
        body: JSON.stringify({
          model: MODEL,
          messages: messages,
          temperature: opts.temp != null ? opts.temp : 0.7,
          max_tokens: opts.max || 500
        })
      }).then(function (r) {
        if (!r.ok) return r.text().then(function (t) { throw new Error('HTTP ' + r.status + ' ' + t.slice(0, 60)); });
        return r.json();
      }).then(function (j) {
        var c = j.choices && j.choices[0] && j.choices[0].message && j.choices[0].message.content;
        if (!c) throw new Error('empty');
        return String(c).trim();
      });
    });
  }
  function cached(key, ttl, gen) {
    var k = 'vgAiCache:' + key;
    var hit = cacheGet(k, ttl);
    if (hit != null) return Promise.resolve(hit);
    return gen().then(function (v) { cacheSet(k, v); return v; });
  }

  function sentenceReview(ref, user, score) {
    return cached('s:' + hash(ref + '|' + user), CTX_TTL, function () {
      return chat([
        { role: 'system', content: '你是英语口语教练。用户照参考句造了自己的句子。用中文回复，严格遵守格式（共3行）：\n✏️ 更自然: <给出更地道的英语改写；若原句已地道就写"原句已很地道">\n💡 要点: <一句话讲语法/搭配/用词，≤40字>\n🌟 夸奖: <≤18字>\n若用户句子与参考意思偏差大，"更自然"给正确表达示例。' },
        { role: 'user', content: '参考句: ' + ref + '\n我的句子: ' + user + '\n规则评分: ' + score + '分' }
      ], { max: 300, temp: 0.5 });
    });
  }
  function wordMemory(word, zh) {
    return cached('w:' + word.toLowerCase(), 0, function () {
      return chat([
        { role: 'system', content: '你是单词记忆教练。用中文回复，≤75字，严格格式（共2行）：\n拆解: <词根词缀拆解；无词根则用谐音/拆音节联想>\n联想: <一个有画面感的记忆场景，≤40字>' },
        { role: 'user', content: '单词: ' + word + (zh ? '（' + zh + '）' : '') }
      ], { max: 220, temp: 0.8 });
    });
  }
  function dailyPlan(snap) {
    return chat([
      { role: 'system', content: '你是中国英语学习者的私人规划师。基于用户数据安排今天的学习。所有文字必须用中文（英文单词本身除外）。只输出严格JSON（禁止markdown/解释文字）：{"focus":"一句话学习重点≤20字","items":["具体安排1(含数量)","安排2","安排3"],"tip":"给TA的鼓励或提醒≤28字"}。安排必须贴合数据里的薄弱点。' },
      { role: 'user', content: JSON.stringify(snap) }
    ], { max: 300, temp: 0.6 });
  }
  function weeklyReport(snap) {
    return chat([
      { role: 'system', content: '你是英语学习教练。基于近7天数据写中文周报，恰好4行，每行以emoji开头分别是：✅ 本周亮点 / 📊 数据速览 / ⚠️ 待改进 / 🎯 下周建议。每行≤40字，务实不鸡汤，数字要引用真实数据。' },
      { role: 'user', content: JSON.stringify(snap) }
    ], { max: 340, temp: 0.6 });
  }
  function readAlongScore(ref, spoken) {
    return chat([
      { role: 'system', content: '你是英语发音教练。用户跟读了一个英语句子。用中文回复，严格2行格式：\n✅ 准确度: X%（数字+一句话评价发音/单词准确度）\n✏️ 纠错: <用户读错的单词→正确单词，用空格分隔多个；无错写「完美」>' },
      { role: 'user', content: '原句: ' + ref + '\n用户朗读转写: ' + spoken }
    ], { max: 150, temp: 0.3 });
  }
  function chapterSummary(text, bookTitle) {
    return chat([
      { role: 'system', content: '你是阅读助手。基于一段英文章节文本，用中文输出：\n📝 摘要: <3句话概括本章内容，每句≤30字>\n❓ 理解题（3道，每道含题目+4个选项A-D+答案）：\n1. <题干>\nA) ... B) ... C) ... D) ...\n答案: X' },
      { role: 'user', content: '书名: ' + (bookTitle || '') + '\n章节文本(截取): ' + text.slice(0, 2000) }
    ], { max: 600, temp: 0.5 });
  }

  function clearCache() {
    try {
      var keys = [];
      for (var i = 0; i < localStorage.length; i++) {
        var k = localStorage.key(i);
        if (k && k.indexOf('vgAiCache:') === 0) keys.push(k);
      }
      keys.forEach(function (k) { localStorage.removeItem(k); });
      return keys.length;
    } catch (e) { return 0; }
  }

  return {
    chat: chat, cached: cached, clearCache: clearCache,
    sentenceReview: sentenceReview, wordMemory: wordMemory, dailyPlan: dailyPlan, weeklyReport: weeklyReport,
    readAlongScore: readAlongScore, chapterSummary: chapterSummary,
    enabled: enabled, setEnabled: setEnabled, getKey: getKey, setKey: setKey,
    _hash: hash
  };
})();
