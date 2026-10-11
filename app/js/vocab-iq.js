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

  /* ---------- 词汇量测试（自适应难度） ---------- */
  var BAND_ORDER = ['a1', 'a2', 'b1', 'b2'];
  var BAND_VALUE = { a1: 400, a2: 700, b1: 1200, b2: 2000 };

  /* Fisher-Yates 均匀洗牌（sort(random) 有明显下标偏差，会被玩家摸到规律） */
  function shuffle(a) {
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }

  /* 数据清洗：部分词库的释义带词性前缀（如 "num 七十"、"v. 唱歌"），选项里必须剥掉 */
  function cleanMeaning(s) {
    return String(s || '').replace(/^\s*(num|int|interj|aux|conj|prep|pron|art|adj|adv|vt|vi|n|v)\s*\.?\s*/i, '');
  }

  /* 数据质量：释义过短的低质条目（如"…的"）不入题 */
  function meaningOk(meaning) {
    if (!meaning) return false;
    if (meaning.replace(/[^\u4e00-\u9fff]/g, '').length < 2 && /^[^A-Za-z]/.test(meaning)) return false;
    return true;
  }

  /* 选项截断：超长释义（多义词合并条目）截到 24 字保持界面可读 */
  function truncOpt(s) {
    s = String(s || '');
    return s.length > 24 ? s.slice(0, 24) + '…' : s;
  }

  function buildBandPools(pool) {
    var bands = { a1: [], a2: [], b1: [], b2: [] };
    pool.forEach(function (w) {
      var meaning = cleanMeaning(w.correct || w.zh || w.def);
      if (!meaningOk(meaning) || !bands[w.cefr]) return;
      bands[w.cefr].push({ word: w.word, meaning: meaning, ipa: w.ipa || '', cefr: w.cefr });
    });
    Object.keys(bands).forEach(function (k) { shuffle(bands[k]); });
    return bands;
  }

  function nextFromBands(bands, used, band) {
    var i = BAND_ORDER.indexOf(band);
    var seq = [i, i - 1, i + 1, i - 2, i + 2].filter(function (x) { return x >= 0 && x < 4; });
    for (var s = 0; s < seq.length; s++) {
      var arr = bands[BAND_ORDER[seq[s]]] || [];
      for (var j = 0; j < arr.length; j++) {
        if (!used[arr[j].word]) return arr[j];
      }
    }
    return null;
  }

  function makeQuestion(w, bandArr) {
    var distract = shuffle(bandArr.filter(function (d) { return d.word !== w.word; })).slice(0, 3)
      .map(function (d) { return truncOpt(d.meaning); });
    var seen = {};
    var correct = truncOpt(w.meaning);
    var options = [correct].concat(distract).filter(function (o) {
      if (!o || seen[o]) return false;
      seen[o] = true; return true;
    });
    shuffle(options);
    return { word: w.word, correct: correct, options: options, cefr: w.cefr, ipa: w.ipa || '' };
  }

  /* 自适应估值：按各难度带正确率加权求和，再看整体正确率给高能加成 */
  function estimateAdaptive(qs, answers) {
    var stat = { a1: [0, 0], a2: [0, 0], b1: [0, 0], b2: [0, 0] };
    qs.forEach(function (q, i) {
      var b = stat[q.cefr] ? q.cefr : 'a1';
      stat[b][1]++;
      if (answers[i] === q.correct) stat[b][0]++;
    });
    var est = 300;
    Object.keys(stat).forEach(function (b) {
      var c = stat[b][0], t = stat[b][1];
      if (t > 0) est += Math.round(BAND_VALUE[b] * (c / t));
    });
    var allC = 0;
    qs.forEach(function (q, i) { if (answers[i] === q.correct) allC++; });
    if (qs.length >= 20 && allC / qs.length >= 0.8) est += 400;
    return Math.max(200, Math.min(5000, est));
  }

  /* 结果页弱项分析：找正确率最低且作答 ≥3 题的难度带 */
  function weakBand(qs, answers) {
    var stat = { a1: [0, 0], a2: [0, 0], b1: [0, 0], b2: [0, 0] };
    qs.forEach(function (q, i) {
      var b = stat[q.cefr] ? q.cefr : 'a1';
      stat[b][1]++;
      if (answers[i] === q.correct) stat[b][0]++;
    });
    var worst = null;
    Object.keys(stat).forEach(function (b) {
      var c = stat[b][0], t = stat[b][1];
      if (t < 3) return;
      var rate = c / t;
      if (!worst || rate < worst.rate) worst = { band: b.toUpperCase(), rate: rate, c: c, t: t };
    });
    if (!worst || worst.rate >= 0.6) return null;
    return '薄弱带：' + worst.band + '（正确率 ' + Math.round(worst.rate * 100) + '%）——建议重点补充这一带的词汇';
  }

  function bandSummary(qs, answers) {
    var stat = { a1: [0, 0], a2: [0, 0], b1: [0, 0], b2: [0, 0] };
    qs.forEach(function (q, i) {
      var b = stat[q.cefr] ? q.cefr : 'a1';
      stat[b][1]++;
      if (answers[i] === q.correct) stat[b][0]++;
    });
    return BAND_ORDER.map(function (b) {
      var c = stat[b][0], t = stat[b][1];
      return t > 0 ? { band: b.toUpperCase(), c: c, t: t, rate: Math.round(c / t * 100) } : null;
    }).filter(Boolean);
  }

  return {
    getFamily: getFamily,
    buildBandPools: buildBandPools,
    nextFromBands: nextFromBands,
    makeQuestion: makeQuestion,
    estimateAdaptive: estimateAdaptive,
    weakBand: weakBand,
    bandSummary: bandSummary,
    BAND_ORDER: BAND_ORDER
  };
})();
