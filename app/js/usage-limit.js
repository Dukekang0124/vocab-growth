/**
 * 词汇生长 — 使用限制模块 (js/usage-limit.js)
 * 限制每日复习 10 次 / 造句 5 次 / 新词 3 个 / 学习 30 分钟
 * 存储：localStorage key: vocab_growth_usage_v1
 * 日期统一用本地时间（与 srs.js todayStr 一致，非 UTC）
 */
var USAGE_LIMIT = (function () {
  'use strict';

  var LIMITS = {
    review: 10,           // 每日最多复习 10 次
    sentence: 5,          // 每日最多造句 5 次
    newWord: 3,           // 每日最多添加 3 个新词
    studyTime: 30 * 60 * 1000  // 每日最多学习 30 分钟（毫秒）
  };

  var STORAGE_KEY = 'vocab_growth_usage_v1';

  /* 本地时间日期串，与 srs.js todayStr 一致 */
  function todayStr() {
    var d = new Date();
    var m = String(d.getMonth() + 1).padStart(2, '0');
    var day = String(d.getDate()).padStart(2, '0');
    return d.getFullYear() + '-' + m + '-' + day;
  }

  function getData() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return { date: todayStr(), records: {} };
      var d = JSON.parse(raw);
      if (!d || d.date !== todayStr()) return { date: todayStr(), records: {} };
      if (!d.records || typeof d.records !== 'object') d.records = {};
      return d;
    } catch (e) {
      return { date: todayStr(), records: {} };
    }
  }

  function saveData(d) {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(d)); } catch (e) {}
  }

  /* app.js 调用签名：checkUsageLimit(userId, action) → {allowed, reason, remaining} */
  function checkUsageLimit(userId, action) {
    var limit = LIMITS[action];
    if (limit == null) return { allowed: true, remaining: Infinity };
    var d = getData();
    var current = d.records[action] || 0;
    if (current >= limit) {
      return { allowed: false, reason: '今日' + action + '次数已用完（' + limit + '次）', remaining: 0 };
    }
    return { allowed: true, remaining: limit - current };
  }

  /* app.js 调用签名：recordUsage(userId, action, amount) */
  function recordUsage(userId, action, amount) {
    var limit = LIMITS[action];
    if (limit == null) return;
    var d = getData();
    var current = d.records[action] || 0;
    d.records[action] = current + (amount || 1);
    saveData(d);
  }

  /* app.js 调用签名：addStudyTime(userId, minutes) */
  function addStudyTime(userId, minutes) {
    if (!minutes || minutes <= 0) return;
    var d = getData();
    var current = d.records.studyTime || 0;
    d.records.studyTime = current + minutes * 60 * 1000;
    saveData(d);
  }

  return {
    checkUsageLimit: checkUsageLimit,
    recordUsage: recordUsage,
    addStudyTime: addStudyTime,
    LIMITS: LIMITS
  };
})();

if (typeof module !== 'undefined' && module.exports) module.exports = USAGE_LIMIT;
