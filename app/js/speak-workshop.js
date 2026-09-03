/* ============================================================
 * 词汇生长 — 造句评分模块 (js/speak-workshop.js)
 * 纯函数模块：不碰 DOM / localStorage。
 * v2 重写：以与「老外会说」的词级 F1 重合度为核心，
 * 加缺介词/冠词检测，差句真正低分（旧版保底 55 导致 57+ 永远不触发低分鼓励）
 * 兼容：经典脚本全局 + Node 测试
 * ============================================================ */
var SPEAK_WORKSHOP = (function () {
  'use strict';

  /* ---------- 工具 ---------- */
  function words(text) {
    return String(text || '')
      .toLowerCase()
      .replace(/[.,!?;:'"()（）]/g, ' ')
      .split(/\s+/)
      .filter(Boolean);
  }
  function uniq(arr) {
    var seen = {}, out = [];
    arr.forEach(function (x) { if (!seen[x]) { seen[x] = 1; out.push(x); } });
    return out;
  }
  function clamp(n, lo, hi) { return Math.max(lo, Math.min(hi, n)); }

  /* ---------- 语法检查：规则 + 与参考句对比缺词 ---------- */
  var GRAMMAR_PATTERNS = [
    { re: /\b(i|you|we|they)\s+goes\b/gi,      fix: '主语 I/you/we/they 后用 go（第三人称单数才用 goes）' },
    { re: /\b(he|she|it)\s+go\b(?!nes|ing)/gi, fix: '主语 he/she/it 后用 goes' },
    { re: /\b(he|she|it)\s+don't\b/gi,         fix: 'he/she/it 后用 doesn\'t' },
    { re: /\b(i|you|we|they)\s+doesn't\b/gi,   fix: 'I/you/we/they 后用 don\'t' },
    { re: /\b(he|she|it)\s+have\b/gi,          fix: 'he/she/it 后用 has' },
    { re: /\b(i|you|we|they)\s+has\b/gi,       fix: 'I/you/we/they 后用 have' },
    { re: /\bi\s+is\b/gi,                      fix: 'I 后用 am' },
    { re: /\b(he|she|it)\s+are\b/gi,           fix: 'he/she/it 后用 is' },
    { re: /\ba\s+[aeiou]/gi,                   fix: '元音开头的词前用 an' },
    { re: /\ban\s+[bcdfgjklmnpqrstvwxyz]/gi,   fix: '辅音开头的词前用 a' },
    { re: /\b(\w+)\s+\1\b/gi,                  fix: '单词重复了' }
  ];

  var COMMON_PREPS = ['to', 'at', 'in', 'on', 'for', 'with', 'from', 'by', 'of', 'about', 'into', 'through', 'during', 'before', 'after'];
  var COMMON_ARTICLES = ['the', 'a', 'an'];

  function scoreGrammar(text, refText) {
    var errors = [];
    var score = 70; /* 基线 70（非 100）：规则引擎无法识别所有错误，低基线起步更诚实 */

    GRAMMAR_PATTERNS.forEach(function (p) {
      if (p.re.source.indexOf('(i|you|we|they)\\s+was') >= 0 && /\b(i)\s+was\b/i.test(text)) return;
      if (p.re.test(text)) errors.push(p.fix);
      p.re.lastIndex = 0;
    });
    score -= errors.length * 15;

    /* 与参考句对比：用户漏掉的介词/冠词 → 结构性错误扣分 */
    if (refText) {
      var refWs = words(refText);
      var userSet = {};
      words(text).forEach(function (w) { userSet[w] = 1; });
      var missingPreps = [];
      refWs.forEach(function (w) {
        if ((COMMON_PREPS.indexOf(w) >= 0 || COMMON_ARTICLES.indexOf(w) >= 0) && !userSet[w]) {
          if (missingPreps.indexOf(w) < 0) missingPreps.push(w);
        }
      });
      if (missingPreps.length) {
        score -= missingPreps.length * 12;
        errors.push('缺少了介词/冠词：' + missingPreps.join(', '));
      }
    }

    /* 太短的句子（< 4 词）扣分——大多数完整句子至少 4 词 */
    var wc = words(text).length;
    if (wc > 0 && wc < 4) {
      score -= (4 - wc) * 10;
      errors.push('句子太短，可能不完整');
    }

    return { score: clamp(score, 0, 100), errors: errors };
  }

  /* ---------- 词汇维度 ---------- */
  function scoreVocabulary(text) {
    var ws = words(text);
    var u = uniq(ws);
    var diversity = ws.length ? Math.round((u.length / ws.length) * 100) : 0;
    var lenScore = clamp(ws.length * 14, 10, 100);
    var score = Math.round(diversity * 0.5 + lenScore * 0.5);
    return {
      score: clamp(score, 0, 100),
      wordCount: ws.length,
      uniqueCount: u.length,
      diversity: diversity
    };
  }

  /* ---------- 自然度：与参考句的词级 F1 重合度（不再保底 55） ---------- */
  var CONNECTORS = ['and', 'but', 'because', 'so', 'then', 'when', 'if', 'after', 'before', 'however', 'therefore', 'also', 'really', 'very', 'too'];

  /* 词干近似匹配：dolphin ≈ dolphins，dive ≈ diving（前缀 ≥4 字符即算同词） */
  function stemMatch(a, b) {
    if (a === b) return true;
    var min = Math.min(a.length, b.length);
    return min >= 4 && a.slice(0, min) === b.slice(0, min);
  }

  function scoreNaturalness(text, refText) {
    var ws = words(text);
    var refWs = words(refText);

    /* 词级 F1（用词干匹配，dolphin≈dolphins）：recall + precision */
    var recall = 0, precision = 0, f1 = 0;
    if (refWs.length && ws.length) {
      var matched = 0;
      refWs.forEach(function (rw) {
        if (ws.some(function (uw) { return stemMatch(uw, rw); })) matched++;
      });
      recall = matched / refWs.length;
      var matched2 = 0;
      ws.forEach(function (uw) {
        if (refWs.some(function (rw) { return stemMatch(uw, rw); })) matched2++;
      });
      precision = ws.length ? matched2 / ws.length : 0;
      f1 = (recall + precision > 0) ? (2 * recall * precision) / (recall + precision) : 0;
    } else if (!refWs.length) {
      f1 = 0.5;
    }

    /* 基线 40（非 0）：完整句子值 40 分基础分，参考句重叠再加 0-60 */
    var score = 40 + Math.round(f1 * 60);

    /* 连接词加分（最多 +10） */
    var connectorHits = ws.filter(function (w) { return CONNECTORS.indexOf(w) >= 0; }).length;
    score += Math.min(10, connectorHits * 5);

    /* 句子长度惩罚：用户句比参考句短很多 → 封顶（少说了一半内容） */
    if (refWs.length && ws.length < refWs.length * 0.6) {
      score = Math.min(score, Math.round((ws.length / refWs.length) * 100));
    }

    score = clamp(score, 0, 100);

    var highlights = [];
    var improvements = [];
    if (f1 >= 0.7) highlights.push('和「老外会说」高度重合，用词到位');
    if (precision >= 0.8 && recall >= 0.5) highlights.push('关键内容都说了，没有多余废话');
    if (connectorHits >= 1) highlights.push('用了连接词，句子有逻辑感');
    if (ws.length >= 8) highlights.push('句子有血有肉，不是干巴巴的主谓宾');
    if (highlights.length === 0) highlights.push('敢开口就是胜利，先把句子说出来');

    if (recall < 0.5 && refWs.length) improvements.push('参考句里有些关键内容你没说到，对照下方「老外会说」看看漏了什么');
    if (connectorHits === 0 && ws.length >= 4) improvements.push('试着加一个连接词（because / but / so），句子会更有逻辑');
    if (ws.length < 5) improvements.push('可以再加点细节：时间、地点、感受，让句子更立体');
    if (precision < 0.7 && ws.length) improvements.push('有些词不在参考句里，确认一下用法是否正确');

    return {
      score: score,
      overlap: Math.round(f1 * 100),
      highlights: highlights,
      improvements: improvements
    };
  }

  /* ---------- 完整度 ---------- */
  function scoreCompleteness(text, refText) {
    var s = String(text).trim();
    var hasStart = /^[a-z]/.test(s) || /^[A-Z]/.test(s);
    var hasVerb = /\b(is|are|am|was|were|be|been|have|has|had|do|does|did|will|would|can|could|should|went|go|goes|made|make|took|take|got|get|want|wanted|like|liked|think|thought|feel|felt|say|said|see|saw|know|knew|saw|run|walk|eat|ate|drink|drank|sleep|slept|read|write|wrote|speak|spoke|learn|teach|work|play|sit|stand|come|came|go|leave|left|find|found|give|gave|buy|bought|bring|brought|tell|told|ask|asked|try|tried|call|called|hear|heard|hold|held|wear|wore|meet|met|pay|paid|begin|began|keep|kept|let|let|put|put|cut|set)\b/i.test(s);
    var hasEnd = /[.!?]$/.test(s);
    var score = (hasStart ? 30 : 0) + (hasVerb ? 40 : 0) + (hasEnd ? 30 : 0);
    var missing = [];
    if (!hasVerb) missing.push('句子里好像没有动词');
    if (!hasEnd) missing.push('结尾补上标点（. ! ?）');
    if (s.length > 0 && !hasStart) missing.push('开头记得用字母');
    return {
      score: clamp(score, 0, 100),
      missing: missing
    };
  }

  /* ---------- 总评 ---------- */
  function levelOf(score) {
    if (score >= 90) return { level: 'A', label: '太棒了！这就是老外的说法', icon: '🏆' };
    if (score >= 75) return { level: 'B', label: '很好！意思传达到了，再加点地道感', icon: '🎉' };
    if (score >= 60) return { level: 'C', label: '不错！句子立住了，还能更好', icon: '💪' };
    if (score >= 40) return { level: 'D', label: '开口就是胜利，对照参考再来一次', icon: '🌱' };
    return { level: 'E', label: '别怕错——先照着老外版本说一遍，再自己来', icon: '🌱' };
  }

  /* 主入口：text=用户句子 refText=老外会说（可空）
   * 权重：自然度(F1) 35% + 语法 25% + 完整度 25% + 词汇 15% */
  /* ---------- 参考句对比分（Levenshtein 相似度 + 词级 recall） ---------- */
  function levenshtein(a, b) {
    if (a === b) return 0;
    if (!a.length) return b.length;
    if (!b.length) return a.length;
    var prev = [], cur = [];
    for (var j = 0; j <= b.length; j++) prev[j] = j;
    for (var i = 1; i <= a.length; i++) {
      cur[0] = i;
      for (var j = 1; j <= b.length; j++) {
        cur[j] = a[i - 1] === b[j - 1] ? prev[j - 1] : Math.min(prev[j], cur[j - 1], prev[j - 1]) + 1;
      }
      var tmp = prev; prev = cur; cur = tmp;
    }
    return prev[b.length];
  }
  function scoreVsReference(text, refText) {
    if (!refText || !refText.trim()) return 50;
    var u = words(text), r = words(refText);
    if (!u.length || !r.length) return 30;
    var rSet = {}; r.forEach(function (w) { rSet[w] = 1; });
    var hits = u.filter(function (w) { return r.some(function (rw) { return stemMatch(w, rw); }); }).length;
    var recall = r.length ? hits / r.length : 0;
    var dist = levenshtein(String(text).toLowerCase().trim(), String(refText).toLowerCase().trim());
    var maxLen = Math.max(text.length, refText.length);
    var similarity = maxLen ? 1 - dist / maxLen : 0;
    return Math.round(recall * 40 + similarity * 60);
  }

  function scoreSentence(text, refText) {
    refText = refText || '';
    var grammar = scoreGrammar(text, refText);
    var vocabulary = scoreVocabulary(text);
    var naturalness = scoreNaturalness(text, refText);
    var completeness = scoreCompleteness(text, refText);
    var refSim = scoreVsReference(text, refText);

    /* 重配权重：参考句对比 0.25 + 自然度 0.30 + 语法 0.20 + 完整度 0.15 + 词汇 0.10
     * 此前语法 0.35 + 完整度 0.25 = 0.60 权重过高，垃圾句仅靠"有动词+有标点"就 60+ 分 */
    var total = Math.round(
      refSim * 0.25 +
      naturalness.score * 0.30 +
      grammar.score * 0.20 +
      completeness.score * 0.15 +
      vocabulary.score * 0.10
    );
    var lv = levelOf(total);

    return {
      total: clamp(total, 0, 100),
      level: lv,
      grammar: grammar,
      vocabulary: vocabulary,
      naturalness: naturalness,
      completeness: completeness,
      refSim: refSim
    };
  }

  /* 语音识别文本 vs 参考句 的重合评分（开口说模式用） */
  function scoreSpeaking(transcript, refText) {
    var ws = words(transcript);
    var ref = words(refText);
    if (!ws.length) {
      return { total: 0, level: levelOf(0), hitWords: [], missedWords: ref.slice(0, 8),
        summary: '没听清你说的内容，再大声说一次试试' };
    }
    var refSet = {};
    ref.forEach(function (w) { refSet[w] = 1; });
    var hits = uniq(ws).filter(function (w) { return refSet[w]; });
    var missed = ref.filter(function (w) { return uniq(ws).indexOf(w) < 0; });
    var recall = ref.length ? hits.length / Math.min(ref.length, uniq(ws).length + hits.length) : 0;
    var total = clamp(Math.round(recall * 100 * 1.15), 0, 100);
    var lv = levelOf(total);
    var summary = total >= 75 ? '说得很好！关键信息都出来了'
      : total >= 45 ? '说出来了，漏了几个关键词'
      : '再试一次——先听一遍示范，跟着说';
    return { total: total, level: lv, hitWords: hits, missedWords: missed.slice(0, 8), summary: summary };
  }

  return {
    scoreSentence: scoreSentence,
    scoreSpeaking: scoreSpeaking,
    levelOf: levelOf
  };
})();

if (typeof window !== 'undefined') window.SPEAK_WORKSHOP = SPEAK_WORKSHOP;
if (typeof module !== 'undefined' && module.exports) module.exports = SPEAK_WORKSHOP;
