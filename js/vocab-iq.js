/* ============================================================
 * 词汇量估算 + 词族展开 + 语境选词 (Vocabulary Intelligence)
 * ============================================================ */
var VG_VOCAB = (function () {
  'use strict';

  /* ---------- 词族展开（后缀推导） ---------- */
  var SUFFIX_MAP = {
    tion: 'the act of ~ing', sion: 'the act of ~ing', ment: 'the result of ~ing',
    ness: 'the state of being ~', ity: 'the quality of being ~',
    ful: 'full of ~', less: 'without ~', ous: 'having ~',
    ive: 'tending to ~', able: 'able to be ~', ible: 'able to be ~',
    ly: 'in a ~ way', er: 'one who ~s', or: 'one who ~s',
    ing: 'the act of ~', ed: 'past/past participle', s: 'plural/3rd person'
  };
  var PREFIX_MAP = {
    un: 'not ~', in: 'not ~', im: 'not ~', dis: 'not/opposite of ~',
    re: '~ again', pre: 'before ~', mis: '~ wrongly', over: '~ too much',
    under: '~ not enough', sub: '~ below'
  };

  function getFamily(word) {
    var w = word.toLowerCase();
    var family = [];
    /* 加后缀 */
    Object.keys(SUFFIX_MAP).forEach(function (suf) {
      if (w.length > 3 && w.slice(-suf.length) === suf) {
        var base = w.slice(0, -suf.length);
        if (base.length >= 2) {
          family.push({ word: base + suf, type: 'suffix', desc: SUFFIX_MAP[suf].replace('~', base) });
        }
      }
    });
    /* 加前缀 */
    Object.keys(PREFIX_MAP).forEach(function (pre) {
      if (w.length > 3 && w.slice(0, pre.length) === pre) {
        var base = w.slice(pre.length);
        if (base.length >= 2) {
          family.push({ word: pre + base, type: 'prefix', desc: PREFIX_MAP[pre].replace('~', base) });
        }
      }
    });
    /* 反义前缀变体 */
    ['un', 'in', 'im', 'dis'].forEach(function (pre) {
      var variant = pre + w;
      if (variant !== w && family.indexOf({ word: variant }) < 0) {
        family.push({ word: variant, type: 'antonym', desc: 'not ' + w });
      }
    });
    /* 去重 + 不含原词 */
    var seen = {};
    return family.filter(function (f) {
      if (f.word === w || seen[f.word]) return false;
      seen[f.word] = true;
      return true;
    }).slice(0, 5);
  }

  /* ---------- 词汇量估算 ---------- */
  var VT_QUESTIONS = null, VT_IDX = 0, VT_ANSWERS = [];

  function buildTest(pool, total) {
    /* 从 Oxford 数据抽样 30 词，覆盖 A1→B2 四个难度带 */
    var levels = ['a1', 'a2', 'b1', 'b2'];
    var per = Math.ceil(30 / levels.length);
    var qs = [];
    var used = {};
    levels.forEach(function (lv) {
      var lvWords = pool.filter(function (w) { return w.cefr === lv && !used[w.word]; });
      /* 打乱 */
      lvWords.sort(function () { return Math.random() - 0.5; });
      lvWords.slice(0, per + 2).forEach(function (w) {
        if (qs.length >= 30) return;
        used[w.word] = true;
        /* 干扰项：同 CEFR 其他词的中文 */
        var distract = pool.filter(function (d) { return d.cefr === lv && d.word !== w.word && d.zh; })
          .sort(function () { return Math.random() - 0.5; }).slice(0, 3)
          .map(function (d) { return d.zh || d.def; });
        var options = [w.zh || w.def].concat(distract).sort(function () { return Math.random() - 0.5; });
        qs.push({ word: w.word, correct: w.zh || w.def, options: options, cefr: lv });
      });
    });
    return qs.slice(0, 30);
  }

  /* 估算公式：基于答对率和最高连续正确难度带 */
  function estimate(qs, answers) {
    var correct = 0, maxLevel = 0;
    var levelOrder = { a1: 1, a2: 2, b1: 3, b2: 4 };
    qs.forEach(function (q, i) {
      if (answers[i] === q.correct) {
        correct++;
        var lv = levelOrder[q.cefr] || 1;
        if (lv > maxLevel) maxLevel = lv;
      }
    });
    var rate = correct / qs.length;
    var base = 500;
    var per = 180;
    return Math.round(base + rate * total * per + maxLevel * 200);
  }
  var total = 5000;

  return {
    getFamily: getFamily,
    buildTest: buildTest,
    estimate: function (qs, answers, poolSize) { total = poolSize || 5000; return estimate(qs, answers); }
  };
})();
