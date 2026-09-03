/* ============================================================
 * 词汇生长 — 难度分级模块 (js/difficulty-level.js)
 * 依赖：VG_STORE（经典脚本全局）
 * 职责：难度定义（A1/A2/B1/B2）+ 基于真实表现的自动定级
 *       + 按难度筛选练习素材
 * ============================================================ */
var DIFFICULTY_LEVEL = (function () {
  'use strict';

  var LEVELS = {
    A1: {
      id: 'A1', name: '入门', icon: '🌱',
      desc: '短句为主，先把话说出来',
      maxWords: 8,   /* 提示句子最长词数参考 */
      hint: '允许很短的句子，重点是敢说'
    },
    A2: {
      id: 'A2', name: '初级', icon: '🌿',
      desc: '加点细节：时间、地点、感受',
      maxWords: 12,
      hint: '试着把一句话说完整、说具体'
    },
    B1: {
      id: 'B1', name: '中级', icon: '🌳',
      desc: '用连接词，说有逻辑的句子',
      maxWords: 18,
      hint: '试着用 because / so / but 串起两个信息'
    },
    B2: {
      id: 'B2', name: '高级', icon: '🌲',
      desc: '复合句 + 观点表达',
      maxWords: 25,
      hint: '试着表达看法并给一个理由'
    }
  };
  var ORDER = ['A1', 'A2', 'B1', 'B2'];

  /* 自动定级：优先看练习历史，其次看词汇体量 */
  function autoDetect() {
    /* store 实例在 app.js 中（VG_APP._store），加载顺序无关 */
    var store = (typeof VG_APP !== 'undefined' && VG_APP._store) ? VG_APP._store : null;
    if (!store) return 'A1';
    var st = store.state;
    var g = st.gamification;
    if (g && g.practiceLog && g.practiceLog.length >= 3) {
      var recent = g.practiceLog.slice(-5);
      var avg = recent.reduce(function (s, r) { return s + (r.score || 0); }, 0) / recent.length;
      if (avg >= 85) return 'B2';
      if (avg >= 70) return 'B1';
      if (avg >= 50) return 'A2';
      return 'A1';
    }
    var total = store.getStats().total;
    if (total >= 60) return 'A2';
    return 'A1';
  }

  function getConfig(id) { return LEVELS[id] || LEVELS.A1; }

  /* 按难度给「造句提示」：难度越高，对句子的期望越高 */
  function hintFor(id) { return getConfig(id).hint; }

  /* 按难度筛选候选词：入门用简单词（词短），高级不限 */
  function filterWords(words, id) {
    var cfg = getConfig(id);
    if (id === 'B1' || id === 'B2') return words;
    var maxLen = id === 'A1' ? 8 : 10;
    var filtered = words.filter(function (w) { return (w.w || '').length <= maxLen; });
    return filtered.length >= 3 ? filtered : words;
  }

  return {
    LEVELS: LEVELS,
    ORDER: ORDER,
    autoDetect: autoDetect,
    getConfig: getConfig,
    hintFor: hintFor,
    filterWords: filterWords
  };
})();

if (typeof window !== 'undefined') window.DIFFICULTY_LEVEL = DIFFICULTY_LEVEL;
if (typeof module !== 'undefined' && module.exports) module.exports = DIFFICULTY_LEVEL;
