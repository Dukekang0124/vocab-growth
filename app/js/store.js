/* ============================================================
 * 词汇生长 — 状态管理 (js/store.js)
 * createStore(storageAdapter, data, srs, nowFn)
 *  - storageAdapter: localStorage 或测试用内存 shim
 *  - 种子静态数据(data.js)与运行态覆盖(override)分离存储
 *  - Node 可测：注入内存 storage 即可
 * ============================================================ */
var VG_STORE = (function () {
  'use strict';

  function createStore(storage, data, srs, nowFn) {
    var KEY = data.CONFIG.storageKey;
    var now = nowFn || function () { return srs.todayStr(new Date()); };

    /* ---------- 初始化 / 加载 ---------- */

    function seedState() {
      var today = now();
      /* 种子运行态：nextReview = 首开日 + off（模拟系统已按规则运转） */
      var overrides = {};
      data.WORDS.forEach(function (w) {
        overrides[w.w] = {
          sent: w.sent,
          depth: w.depth,
          greenStreak: w.depth === 1 ? 1 : 0,
          inWeak: !!w.weak,
          weakSince: w.weak ? w.learned : null,
          firstLearned: w.learned,
          lastReview: w.depth === 'untested' ? null : w.learned,
          nextReview: srs.addDays(today, w.off || 0),
          usedToday: false
        };
      });
      return {
        version: 1,
        createdAt: today,
        overrides: overrides,
        customWords: [],
        customChunks: [],
        sentenceRecords: [],
        reviewLog: [],
        growthLog: [{ date: today, total: data.WORDS.length }],
        milestones: [],
        streak: { days: data.CONFIG.streakSeedDays, lastActiveDate: srs.addDays(today, -1) },
        speed: 1.0,
        /* B类商业化预留（需求分类 B1）：免费词群数 / 解锁状态 */
        freeGroupLimit: 2,
        unlocked: false,
        /* MVP 使用限制和反馈字段 */
        feedback: [],
        usage_records: {},
        /* 新手引导：主引导只显示一次，页面级引导按页记录 */
        onboarded: false,
        pageGuide: {}
      };
    }

    function load() {
      var raw = null;
      try { raw = storage.getItem(KEY); } catch (e) { raw = null; }
      if (!raw) {
        var fresh = seedState();
        persist(fresh);
        return fresh;
      }
      try {
        var st = JSON.parse(raw);
        if (!st || st.version !== 1) throw new Error('bad version');
        return st;
      } catch (e) {
        /* 数据损坏 → 重新播种（原系统 8/9 丢词事故的教训：损坏要可恢复） */
        var fresh2 = seedState();
        persist(fresh2);
        return fresh2;
      }
    }

    var state = load();
    var storageBroken = false; /* 隐私模式/存储满时置位，UI 层提示用户导出备份 */

    function persist(st) {
      try { storage.setItem(KEY, JSON.stringify(st)); }
      catch (e) { storageBroken = true; /* 静默但留下证据 */ }
    }
    /* M8 修复：日志数组上限 500 条，超出截断旧记录 */
    var LOG_CAP = 500;
    function cap(arr) {
      if (Array.isArray(arr) && arr.length > LOG_CAP) {
        arr.splice(0, arr.length - LOG_CAP);
      }
    }
    function save() {
      cap(state.reviewLog);
      cap(state.sentenceRecords);
      cap(state.growthLog);
      cap(state.milestones);
      if (state.gamification && state.gamification.practiceLog) cap(state.gamification.practiceLog);
      persist(state);
    }

    /* ---------- 词表合并视图 ---------- */

    function getWords() {
      var list = data.WORDS.map(function (w) {
        var ov = state.overrides[w.w] || {};
        return Object.assign({}, w, ov, { id: w.w });
      });
      state.customWords.forEach(function (w) {
        list.push(Object.assign({}, w, { id: w.w, custom: true }));
      });
      return list;
    }

    function getWord(id) {
      var all = getWords();
      for (var i = 0; i < all.length; i++) if (all[i].id === id) return all[i];
      return null;
    }

    function putOverride(id, patch) {
      if (!state.overrides[id]) state.overrides[id] = {};
      Object.assign(state.overrides[id], patch);
      save();
    }

    /* ---------- 学习行为 ---------- */

    function touchActive() {
      state.streak = srs.nextStreak(state.streak, now());
      save();
    }

    /* 复习标记：layer 0-5；返回事件数组（含流转事件） */
    function markReview(wordId, layer) {
      var w = getWord(wordId);
      if (!w) return [];
      var r = srs.applyReview(
        { w: wordId, sent: w.sent, depth: w.depth, greenStreak: w.greenStreak || 0,
          inWeak: !!w.inWeak, weakSince: w.weakSince },
        layer, now());
      putOverride(wordId, {
        depth: r.word.depth, greenStreak: r.word.greenStreak,
        inWeak: r.word.inWeak, weakSince: r.word.weakSince,
        lastReview: r.word.lastReview, nextReview: r.word.nextReview
      });
      state.reviewLog.push({ date: now(), wordId: wordId, layer: layer });
      touchActive();
      return r.events;
    }

    /* 添加自定义新词（词群生长法：遇到想用的词就记下来） */
    function addCustomWord(fields, groupId) {
      var today = now();
      var id = fields.word.trim().toLowerCase();
      if (!id) return { ok: false, error: '词不能为空' };
      if (getWord(id)) return { ok: false, error: '这个词已在词库里' };

      /* 新词上限铁律 */
      var dueCount = srs.buildQueue(getWords(), today).length;
      if (srs.isNewWordLocked(dueCount, data.CONFIG.newWordLockThreshold)) {
        return { ok: false, error: '先消化再进食：待复习 ' + dueCount + ' 词 > ' +
          data.CONFIG.newWordLockThreshold + '，完成复习后解锁', locked: true };
      }

      state.customWords.push({
        w: id, word: fields.word.trim(), ipa: fields.ipa || '', pos: fields.pos || '',
        simple: (fields.simple || '').trim(), zh: (fields.zh || '').trim(),
        chunk: (fields.chunk || '').trim(),
        ex: { en: (fields.exEn || '').trim(), zh: (fields.exZh || '').trim() },
        note: (fields.note || '').trim(), g: groupId || 'daily',
        audio: null, custom: true,
        sent: 'pending', depth: 'untested', weak: false,
        firstLearned: today, lastReview: null,
        nextReview: srs.addDays(today, 1), /* 新词隔天首复习（睡眠巩固） */
        usedToday: false, greenStreak: 0, inWeak: false, weakSince: null
      });
      logGrowth(today);
      touchActive();
      return { ok: true, word: getWord(id) };
    }

    /* 造句完成 */
    function markSentenceDone(wordId, record) {
      putOverride(wordId, { sent: 'done' });
      if (record) {
        state.sentenceRecords.push(Object.assign({ date: now() }, record));
      }
      touchActive();
      save();
    }

    function addSentenceRecord(record) {
      state.sentenceRecords.push(Object.assign({ date: now() }, record));
      save();
    }

    /* 把该词最近一条未巩固的造句记录标记为已纠正 */
    function markLastRecordDone(wordId) {
      for (var i = state.sentenceRecords.length - 1; i >= 0; i--) {
        if (state.sentenceRecords[i].wordId === wordId && state.sentenceRecords[i].status !== 'corrected') {
          state.sentenceRecords[i].status = 'corrected';
          break;
        }
      }
      save();
    }

    /* 今天用掉 */
    function toggleUsedToday(wordId) {
      var w = getWord(wordId);
      if (!w) return false;
      putOverride(wordId, { usedToday: !w.usedToday });
      touchActive();
      return !w.usedToday;
    }

    /* ---------- 语块 ---------- */

    function getChunks() { return data.CHUNKS.concat(state.customChunks); }

    function addCustomChunk(scene, zh, en) {
      if (!zh.trim() || !en.trim()) return { ok: false, error: '中文想法和英文说法都不能为空' };
      state.customChunks.push({
        id: 'uc' + Date.now(), scene: (scene || '我的语块').trim(),
        zh: zh.trim(), en: en.trim(), custom: true
      });
      save();
      return { ok: true };
    }

    function removeCustomChunk(id) {
      state.customChunks = state.customChunks.filter(function (c) { return c.id !== id; });
      save();
    }

    /* ---------- 统计 ---------- */

    function getStats() {
      var today = now();
      var words = getWords();
      var done = words.filter(function (w) { return w.sent === 'done'; }).length;
      var weak = words.filter(function (w) { return !!w.inWeak; });
      var due = srs.buildQueue(words, today);
      var todayReviews = state.reviewLog.filter(function (r) { return r.date === today; });
      return {
        total: words.length,
        done: done,
        doneRate: words.length ? Math.round((done / words.length) * 100) : 0,
        weakCount: weak.length,
        dueCount: due.length,
        dueBatch: due.slice(0, data.CONFIG.reviewBatchSize).map(function (w) { return w.id; }),
        todayReviewCount: todayReviews.length,
        todayUsedCount: words.filter(function (w) { return w.usedToday; }).length,
        streakDays: state.streak.days,
        newWordLocked: srs.isNewWordLocked(due.length, data.CONFIG.newWordLockThreshold)
      };
    }

    function logGrowth(today) {
      var total = getWords().length;
      var last = state.growthLog[state.growthLog.length - 1];
      if (!last || last.date !== today) {
        state.growthLog.push({ date: today, total: total });
      } else {
        last.total = total;
      }
      var m = srs.milestoneFor(total);
      if (m && !state.milestones.some(function (x) { return x.n === m && x.date === today; })) {
        state.milestones.push({ date: today, text: '词汇量突破 ' + m + ' 词', n: m });
      }
      save();
    }

    /* ---------- 数据管理 ---------- */

    function exportJSON() {
      return JSON.stringify({ app: 'vocab-growth', exportedAt: now(), state: state }, null, 2);
    }

    function importJSON(text) {
      try {
        var obj = JSON.parse(text);
        var st = obj.state || obj;
        if (!st.overrides || !Array.isArray(st.customWords)) {
          return { ok: false, error: '文件格式不正确（缺少 overrides/customWords）' };
        }
        /* 字段补全：缺失的必需字段填默认值，避免后续 TypeError */
        if (!Array.isArray(st.sentenceRecords)) st.sentenceRecords = [];
        if (!Array.isArray(st.reviewLog)) st.reviewLog = [];
        if (!Array.isArray(st.growthLog)) st.growthLog = [{ date: srs.todayStr(), total: data.WORDS.length }];
        if (!Array.isArray(st.milestones)) st.milestones = [];
        if (!st.streak || typeof st.streak !== 'object') st.streak = { days: 0, lastActiveDate: srs.addDays(srs.todayStr(), -1) };
        if (typeof st.speed !== 'number') st.speed = 1.0;
        if (typeof st.onboarded !== 'boolean') st.onboarded = true;
        if (!st.pageGuide || typeof st.pageGuide !== 'object') st.pageGuide = {};
        if (!st.gamification || typeof st.gamification !== 'object') st.gamification = { points: 0, badges: [], practiceLog: [], practiceCount: 0, speakingCount: 0, bestScore: 0, difficulty: '', modesTried: {} };
        if (!st.pageGuide || typeof st.pageGuide !== 'object') st.pageGuide = {};
        st.version = 1;
        state = st;
        save();
        return { ok: true };
      } catch (e) {
        return { ok: false, error: 'JSON 解析失败：' + e.message };
      }
    }

    function resetAll() {
      state = seedState();
      save();
    }

    function setSpeed(v) { state.speed = v; save(); }

    /* gamification.js 直接改 state.gamification 后调用此方法持久化 */
    function saveAll() { save(); }

    function setOnboarded() { state.onboarded = true; save(); }

    function isPageGuided(page) { return !!(state.pageGuide && state.pageGuide[page]); }
    function markPageGuided(page) {
      if (!state.pageGuide) state.pageGuide = {};
      state.pageGuide[page] = true;
      save();
    }
    function resetPageGuide() { state.pageGuide = {}; save(); }

    return {
      get state() { return state; },
      getWords: getWords, getWord: getWord,
      markReview: markReview, addCustomWord: addCustomWord,
      markSentenceDone: markSentenceDone, addSentenceRecord: addSentenceRecord, markLastRecordDone: markLastRecordDone,
      toggleUsedToday: toggleUsedToday,
      getChunks: getChunks, addCustomChunk: addCustomChunk, removeCustomChunk: removeCustomChunk,
      getStats: getStats, touchActive: touchActive,
      exportJSON: exportJSON, importJSON: importJSON,
      resetAll: resetAll, setSpeed: setSpeed, saveAll: saveAll, setOnboarded: setOnboarded,
      isPageGuided: isPageGuided, markPageGuided: markPageGuided, resetPageGuide: resetPageGuide,
      isStorageBroken: function () { return storageBroken; }
    };
  }

  return { createStore: createStore };
})();

/* Node 测试环境兼容 */
if (typeof module !== 'undefined' && module.exports) {
  module.exports = VG_STORE;
}
