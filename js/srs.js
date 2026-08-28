/* ============================================================
 * 词汇生长 — SRS-lite 调度引擎 (js/srs.js)
 * 纯函数模块：不碰 DOM / localStorage，可在 Node 中单元测试。
 * 规则忠实数字化原系统（英语自学建设系统）：
 *   - 遗忘深度：第几层提示才想起 → 🟢0-1层 / 🟡2-3层 / 🔴4层+
 *   - 复习强度映射：🟢 隔天起算2天 / 🟡 1天 / 🔴 每天（进薄弱清单）
 *   - 流转状态机：🔴→薄弱清单；连续2次🟢 且在薄弱清单→自动移出
 *   - 队列优先级：未造句 > 薄弱 > 其余按 nextReview 升序
 *   - 新词上限铁律：待复习>30 锁定新词
 * ============================================================ */
var VG_SRS = (function () {
  'use strict';

  /* ---------- 日期工具（一律用 YYYY-MM-DD 字符串，避免时区坑） ---------- */

  function todayStr(d) {
    var dt = d || new Date();
    var m = String(dt.getMonth() + 1).padStart(2, '0');
    var day = String(dt.getDate()).padStart(2, '0');
    return dt.getFullYear() + '-' + m + '-' + day;
  }

  function addDays(dateStr, n) {
    var parts = dateStr.split('-').map(Number);
    var dt = new Date(parts[0], parts[1] - 1, parts[2]);
    dt.setDate(dt.getDate() + n);
    return todayStr(dt);
  }

  function daysBetween(a, b) {
    var pa = a.split('-').map(Number);
    var pb = b.split('-').map(Number);
    var da = new Date(pa[0], pa[1] - 1, pa[2]);
    var db = new Date(pb[0], pb[1] - 1, pb[2]);
    return Math.round((db - da) / 86400000);
  }

  /* ---------- 遗忘深度 ---------- */

  /* 分层抢救六层：0硬想30s 1词性 2词义 3首字母 4长度+场景半句 5答案
   * 返回 'green' | 'yellow' | 'red' */
  function depthFromLayer(layer) {
    if (layer <= 1) return 'green';
    if (layer <= 3) return 'yellow';
    return 'red';
  }

  /* 深度 → 下次复习间隔（天） */
  function intervalFor(depth) {
    if (depth === 'green') return 2;
    if (depth === 'yellow') return 1;
    return 1; // red：每天复习直至连续2次🟢
  }

  /* 深度数值（存档用）：🟢=1 🟡=3 🔴=5 untested */
  function depthValue(depth) {
    if (depth === 'green') return 1;
    if (depth === 'yellow') return 3;
    if (depth === 'red') return 5;
    return 'untested';
  }

  /* ---------- 复习应用（状态机核心） ----------
   * word: {sent, depth, greenStreak, inWeak, weakSince, lastReview, nextReview}
   * layer: 0-5（第几层提示才想起/看答案）
   * 返回 { word: 更新后的运行态, events: [{type, wordId}] } */
  function applyReview(word, layer, today) {
    var w = Object.assign({}, word);
    var events = [];
    var depth = depthFromLayer(layer);

    w.lastReview = today;
    w.nextReview = addDays(today, intervalFor(depth));

    if (depth === 'green') {
      w.depth = 1;
      w.greenStreak = (w.greenStreak || 0) + 1;
      /* 连续2次🟢 且在薄弱清单 → 自动移出（四步攻克法的完成条件） */
      if (w.inWeak && w.greenStreak >= 2) {
        w.inWeak = false;
        w.weakSince = null;
        w.greenStreak = 0;
        events.push({ type: 'leftWeak', wordId: w.w || w.id });
      }
    } else if (depth === 'yellow') {
      w.depth = 3;
      w.greenStreak = 0;
    } else {
      w.depth = 5;
      w.greenStreak = 0;
      if (!w.inWeak) {
        w.inWeak = true;
        w.weakSince = today;
        events.push({ type: 'enteredWeak', wordId: w.w || w.id });
      }
    }
    return { word: w, events: events };
  }

  /* ---------- 队列 ---------- */

  /* words: 全量词（含运行态）；today: YYYY-MM-DD
   * 返回按优先级排序的到期词数组 */
  function buildQueue(words, today) {
    var due = words.filter(function (w) {
      return !w.nextReview || w.nextReview <= today;
    });
    due.sort(function (a, b) {
      var sa = a.sent === 'pending' ? 0 : 1; /* 未造句优先 */
      var sb = b.sent === 'pending' ? 0 : 1;
      if (sa !== sb) return sa - sb;
      var wa = a.inWeak ? 0 : 1; /* 薄弱次优先 */
      var wb = b.inWeak ? 0 : 1;
      if (wa !== wb) return wa - wb;
      return String(a.nextReview || '').localeCompare(String(b.nextReview || ''));
    });
    return due;
  }

  /* 新词上限铁律：待复习>30 → 锁定新词 */
  function isNewWordLocked(dueCount, threshold) {
    return dueCount > (threshold || 30);
  }

  /* ---------- 连续天数（streak） ---------- */

  function nextStreak(streak, today) {
    var s = streak || { days: 0, lastActiveDate: null };
    if (s.lastActiveDate === today) return s;
    if (s.lastActiveDate && daysBetween(s.lastActiveDate, today) === 1) {
      return { days: s.days + 1, lastActiveDate: today };
    }
    return { days: 1, lastActiveDate: today };
  }

  /* ---------- 里程碑 ---------- */
  var MILESTONE_STEPS = [30, 60, 100, 150, 200, 300, 500];

  function milestoneFor(totalWords) {
    for (var i = 0; i < MILESTONE_STEPS.length; i++) {
      if (totalWords === MILESTONE_STEPS[i]) return MILESTONE_STEPS[i];
    }
    return null;
  }

  return {
    todayStr: todayStr,
    addDays: addDays,
    daysBetween: daysBetween,
    depthFromLayer: depthFromLayer,
    intervalFor: intervalFor,
    depthValue: depthValue,
    applyReview: applyReview,
    buildQueue: buildQueue,
    isNewWordLocked: isNewWordLocked,
    nextStreak: nextStreak,
    milestoneFor: milestoneFor
  };
})();

/* Node 测试环境兼容 */
if (typeof module !== 'undefined' && module.exports) {
  module.exports = VG_SRS;
}
