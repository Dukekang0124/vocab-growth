/* ============================================================
 * 词汇生长 — 激励机制模块 (js/gamification.js)
 * 依赖：VG_STORE（经典脚本全局），数据持久化在 store.state.gamification
 * 职责：积分规则 / 等级 / 徽章条件与解锁 / 练习记录
 * ============================================================ */
var GAMIFICATION = (function () {
  'use strict';

  /* ---------- 积分规则 ---------- */
  var POINT_RULES = {
    practiceBase: 10,      // 完成一次练习
    scoreBonus: 0.3,       // 得分加成：score × 0.3（85分 → +25）
    speakingBonus: 15,     // 开口说模式额外奖励
    perfectScore: 100,     // 满分奖励
    badgeUnlock: 50        // 徽章额外积分（徽章自身也有 points）
  };

  /* ---------- 等级 ---------- */
  var LEVELS = [
    { level: 1, name: '开口新手', points: 0,    icon: '🌱' },
    { level: 2, name: '敢说学徒', points: 150,  icon: '🌿' },
    { level: 3, name: '表达能手', points: 500,  icon: '🌳' },
    { level: 4, name: '流利达人', points: 1200, icon: '🌲' },
    { level: 5, name: '口语大师', points: 2500, icon: '🏆' }
  ];

  /* ---------- 徽章（condition 的 user 为快照，见 snapshot()） ---------- */
  var BADGES = [
    { id: 'first_practice',   name: '第一次开口', icon: '🎤', description: '完成第 1 次开口练',
      points: 30,  condition: function (u) { return u.practiceCount >= 1; } },
    { id: 'practice_10',      name: '小有所成', icon: '✍️', description: '累计完成 10 次练习',
      points: 60,  condition: function (u) { return u.practiceCount >= 10; } },
    { id: 'daily_streak',     name: '持续学习者', icon: '📈', description: '连续学习 7 天',
      points: 80,  condition: function (u) { return u.streakDays >= 7; } },
    { id: 'good_score',       name: '渐入佳境', icon: '🌟', description: '单次练习得分 ≥ 85',
      points: 50,  condition: function (u) { return u.bestScore >= 85; } },
    { id: 'perfect_score',    name: '满分达人', icon: '💯', description: '拿到一次 95 分以上',
      points: 120, condition: function (u) { return u.bestScore >= 95; } },
    { id: 'speaking_brave',   name: '敢于开口', icon: '🗣️', description: '完成 3 次「开口说」语音练习',
      points: 80,  condition: function (u) { return u.speakingCount >= 3; } },
    { id: 'mode_explorer',    name: '全能练习', icon: '🎯', description: '体验过全部 4 种练习模式',
      points: 100, condition: function (u) { return u.modesTried >= 4; } },
    { id: 'sentence_master',  name: '造句达人', icon: '📚', description: '10 个词完成造句',
      points: 100, condition: function (u) { return u.sentDone >= 10; } }
  ];

  /* ---------- 内部工具 ----------
   * store 实例在 app.js 中创建并挂到 VG_APP._store，
   * 这里惰性解析，保证脚本加载顺序无关。 */
  function S() {
    return (typeof VG_APP !== 'undefined' && VG_APP._store) ? VG_APP._store : null;
  }

  function gami() {
    var st = S().state;
    if (!st.gamification) {
      st.gamification = {
        points: 0, badges: [], practiceLog: [],
        practiceCount: 0, speakingCount: 0, bestScore: 0,
        difficulty: '', modesTried: {}
      };
    }
    if (!st.gamification.modesTried) st.gamification.modesTried = {};
    return st.gamification;
  }

  function saveGami() {
    var store = S();
    if (store && store.saveAll) store.saveAll();
  }

  /* 组装徽章判断所需的用户快照 */
  function snapshot() {
    var g = gami();
    var stats = S().getStats();
    var modes = 0;
    Object.keys(g.modesTried).forEach(function (k) { if (g.modesTried[k]) modes++; });
    return {
      points: g.points,
      practiceCount: g.practiceCount,
      speakingCount: g.speakingCount || 0,
      bestScore: g.bestScore || 0,
      streakDays: stats.streakDays,
      sentDone: stats.done,
      modesTried: modes,
      badges: g.badges
    };
  }

  /* ---------- 积分 ---------- */
  function addPoints(n) {
    var g = gami();
    g.points += n;
    saveGami();
    return g.points;
  }

  /* ---------- 练习记录（练习完成统一入口） ----------
   * entry: { mode, wordId, score, speaking }
   * 返回 { points, total, newBadges, levelUp } */
  function recordPractice(entry) {
    var g = gami();
    var pts = POINT_RULES.practiceBase
      + Math.round((entry.score || 0) * POINT_RULES.scoreBonus)
      + (entry.speaking ? POINT_RULES.speakingBonus : 0)
      + (entry.score >= 95 ? POINT_RULES.perfectScore : 0);

    g.practiceCount++;
    if (entry.speaking) g.speakingCount = (g.speakingCount || 0) + 1;
    if (entry.score > (g.bestScore || 0)) g.bestScore = entry.score;
    if (entry.mode) g.modesTried[entry.mode] = true;
    g.practiceLog.push({
      date: VG_SRS.todayStr(), mode: entry.mode, wordId: entry.wordId, score: entry.score
    });
    if (g.practiceLog.length > 200) g.practiceLog = g.practiceLog.slice(-200);

    var beforeLevel = getLevel().level;
    var total = addPoints(pts);
    var newBadges = checkBadges();
    var levelUp = getLevel().level > beforeLevel ? getLevel() : null;

    return { points: pts, total: total, newBadges: newBadges, levelUp: levelUp };
  }

  /* ---------- 徽章 ---------- */
  function checkBadges() {
    var g = gami();
    var u = snapshot();
    var newly = [];
    BADGES.forEach(function (b) {
      if (g.badges.indexOf(b.id) < 0 && b.condition(u)) {
        g.badges.push(b.id);
        newly.push(b);
      }
    });
    if (newly.length) {
      var bonus = newly.length * POINT_RULES.badgeUnlock;
      g.points += bonus;
      newly.forEach(function (b) { g.points += b.points; });
      saveGami();
    }
    return newly;
  }

  function unlockedBadges() {
    var g = gami();
    return BADGES.filter(function (b) { return g.badges.indexOf(b.id) >= 0; });
  }

  function lockedBadges() {
    var g = gami();
    return BADGES.filter(function (b) { return g.badges.indexOf(b.id) < 0; });
  }

  /* ---------- 等级 ---------- */
  function getLevel() {
    var p = gami().points;
    var lv = LEVELS[0];
    LEVELS.forEach(function (l) { if (p >= l.points) lv = l; });
    return lv;
  }

  function getLevelProgress() {
    var p = gami().points;
    var cur = getLevel();
    var next = null;
    for (var i = 0; i < LEVELS.length; i++) {
      if (LEVELS[i].level === cur.level + 1) next = LEVELS[i];
    }
    if (!next) return { cur: cur, next: null, pct: 100, remaining: 0 };
    var pct = Math.round(((p - cur.points) / (next.points - cur.points)) * 100);
    return { cur: cur, next: next, pct: Math.max(0, Math.min(100, pct)), remaining: next.points - p };
  }

  /* ---------- 难度（联动 difficulty-level.js） ---------- */
  /* M1 修复：自动模式每 5 次练习重新评估，手动选择后锁定 */
  function getDifficulty() {
    var g = gami();
    if (g.difficultySource === 'manual' && g.difficulty) return g.difficulty;
    var since = g.practiceCount - (g.difficultyEvalAt || 0);
    if (!g.difficulty || since >= 5) {
      var auto = (typeof DIFFICULTY_LEVEL !== 'undefined' && DIFFICULTY_LEVEL.autoDetect) ? DIFFICULTY_LEVEL.autoDetect() : 'A1';
      g.difficulty = auto;
      g.difficultySource = 'auto';
      g.difficultyEvalAt = g.practiceCount;
      saveGami();
      return auto;
    }
    return g.difficulty || 'A1';
  }

  function setDifficulty(d) {
    var g = gami();
    g.difficulty = d;
    g.difficultySource = 'manual';
    saveGami();
  }

  /* ---------- 概览（成就页用） ---------- */
  function getOverview() {
    var g = gami();
    return {
      points: g.points,
      level: getLevel(),
      progress: getLevelProgress(),
      practiceCount: g.practiceCount,
      speakingCount: g.speakingCount || 0,
      bestScore: g.bestScore || 0,
      unlocked: unlockedBadges(),
      locked: lockedBadges(),
      recentLog: g.practiceLog.slice(-10).reverse()
    };
  }

  return {
    recordPractice: recordPractice,
    checkBadges: checkBadges,
    addPoints: addPoints,
    getLevel: getLevel,
    getLevelProgress: getLevelProgress,
    getDifficulty: getDifficulty,
    setDifficulty: setDifficulty,
    getOverview: getOverview,
    unlockedBadges: unlockedBadges,
    lockedBadges: lockedBadges,
    getRules: function () { return POINT_RULES; },
    getLevels: function () { return LEVELS; },
    getBadges: function () { return BADGES; }
  };
})();

if (typeof window !== 'undefined') window.GAMIFICATION = GAMIFICATION;
if (typeof module !== 'undefined' && module.exports) module.exports = GAMIFICATION;
