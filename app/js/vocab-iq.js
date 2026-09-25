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

  /* Fisher-Yates 均匀洗牌（sort(random) 有明显下标偏差，会被玩家摸到规律） */
  function shuffle(a) {
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }

  function buildTest(pool, total) {
    /* 从 Oxford 数据抽样 30 词，覆盖 A1→B2 四个难度带 */
    var levels = ['a1', 'a2', 'b1', 'b2'];
    var per = Math.ceil(total / levels.length);
    var qs = [];
    var used = {};
    levels.forEach(function (lv) {
      var lvWords = shuffle(pool.filter(function (w) { return w.cefr === lv && !used[w.word]; }));
      lvWords.slice(0, per + 2).forEach(function (w) {
        if (qs.length >= total) return;
        var ans = w.correct || w.zh || w.def || '';
        if (!ans || used[w.word]) return;
        used[w.word] = true;
        /* 干扰项：同 CEFR 其他词的中文释义 */
        var distract = shuffle(pool.filter(function (d) { return d.cefr === lv && d.word !== w.word && (d.correct || d.zh); })).slice(0, 3)
          .map(function (d) { return d.correct || d.zh || d.def; });
        /* 正确项+干扰项合并去重后洗牌 */
        var seen = {};
        var options = [ans].concat(distract).filter(function (o) {
          if (!o || seen[o]) return false;
          seen[o] = true; return true;
        });
        shuffle(options);
        qs.push({ word: w.word, correct: ans, options: options, cefr: lv });
      });
    });
    return qs.slice(0, total);
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
    /* 扣除四选一瞎猜的期望值(25%)再线性映射到词库规模，防止乱答也算出几十万 */
    var corrected = Math.max(0, (rate - 0.25) / 0.75);
    var base = 300;
    return Math.round(base + corrected * (total - base) + maxLevel * 150);
  }
  var total = 5000;

  return {
    getFamily: getFamily,
    buildTest: buildTest,
    estimate: function (qs, answers, poolSize) { total = poolSize || 5000; return estimate(qs, answers); }
  };
})();
