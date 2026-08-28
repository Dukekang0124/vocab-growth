/* ============================================================
 * 词汇生长 — 造句评分模块 (js/speak-workshop.js)
 * 纯函数模块：不碰 DOM / localStorage。
 * 职责：对用户产出的英文句子做多维度评分 + 生成中文反馈
 *   - grammar      语法正确性（规则引擎，只抓真实错误）
 *   - vocabulary   词汇多样性 / 句子长度
 *   - naturalness  自然度（连接词、句式、地道表达匹配）
 *   - completeness 完整度（主语/谓语/标点/与参考重合度）
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

  /* ---------- 语法检查：只抓确定性的真实错误 ---------- */
  var GRAMMAR_PATTERNS = [
    { re: /\b(i|you|we|they)\s+goes\b/gi,      fix: '主语 I/you/we/they 后用 go（第三人称单数才用 goes）' },
    { re: /\b(he|she|it)\s+go\b(?!nes|ing)/gi, fix: '主语 he/she/it 后用 goes' },
    { re: /\b(he|she|it)\s+don't\b/gi,         fix: 'he/she/it 后用 doesn\'t' },
    { re: /\b(i|you|we|they)\s+doesn't\b/gi,   fix: 'I/you/we/they 后用 don\'t' },
    { re: /\b(he|she|it)\s+have\b/gi,          fix: 'he/she/it 后用 has' },
    { re: /\b(i|you|we|they)\s+has\b/gi,       fix: 'I/you/we/they 后用 have' },
    { re: /\bi\s+is\b/gi,                      fix: 'I 后用 am' },
    { re: /\b(he|she|it)\s+are\b/gi,           fix: 'he/she/it 后用 is' },
    { re: /\b(i|you|we|they)\s+was\b/gi,       fix: 'I/you/we/they 过去用 were（I 用 was 除外）' },
    { re: /\ba\s+[aeiou]/gi,                   fix: '元音开头的词前用 an（a apple → an apple）' },
    { re: /\ban\s+[bcdfgjklmnpqrstvwxyz]/gi,   fix: '辅音开头的词前用 a（an book → a book）' },
    { re: /\b(\w+)\s+\1\b/gi,                  fix: '单词重复了' },
    { re: /\bvery\s+very\s+very\b/gi,          fix: 'very 连用太多，换个更强的形容词' }
  ];

  function scoreGrammar(text) {
    var errors = [];
    GRAMMAR_PATTERNS.forEach(function (p) {
      /* I was 特例放行：先排除 */
      if (p.re.source.indexOf('(i|you|we|they)\\s+was') >= 0 && /\b(i)\s+was\b/i.test(text)) return;
      if (p.re.test(text)) errors.push(p.fix);
      p.re.lastIndex = 0;
    });
    var score = 100 - errors.length * 15;
    return { score: clamp(score, 0, 100), errors: errors };
  }

  /* ---------- 词汇维度 ---------- */
  function scoreVocabulary(text) {
    var ws = words(text);
    var u = uniq(ws);
    var diversity = ws.length ? Math.round((u.length / ws.length) * 100) : 0;
    /* 长度分：1词太短，8词以上给满分 */
    var lenScore = clamp(ws.length * 14, 10, 100);
    var score = Math.round(diversity * 0.5 + lenScore * 0.5);
    return {
      score: clamp(score, 0, 100),
      wordCount: ws.length,
      uniqueCount: u.length,
      diversity: diversity
    };
  }

  /* ---------- 自然度 ---------- */
  var CONNECTORS = ['and', 'but', 'because', 'so', 'then', 'when', 'if', 'after', 'before', 'however', 'therefore', 'also', 'really', 'very', 'too'];

  function scoreNaturalness(text, refText) {
    var ws = words(text);
    var refSet = {};
    words(refText).forEach(function (w) { refSet[w] = 1; });

    var connectorHits = ws.filter(function (w) { return CONNECTORS.indexOf(w) >= 0; }).length;
    var hasStructure = /,/.test(text) || connectorHits > 0;
    var overlap = ws.length ? Math.round((ws.filter(function (w) { return refSet[w]; }).length / ws.length) * 100) : 0;

    var score = 55;
    if (connectorHits > 0) score += 12;
    if (connectorHits >= 2) score += 8;
    if (hasStructure) score += 10;
    /* 与地道参考重合度 40%-80% 最佳：重合说明用了地道搭配，太高说明照抄 */
    if (overlap >= 40) score += 15;
    if (overlap > 90) score -= 10;

    var highlights = [];
    var improvements = [];
    if (connectorHits >= 1) highlights.push('用了连接词，句子之间有逻辑感');
    if (overlap >= 40 && overlap <= 90) highlights.push('用到了地道搭配，离老外的说法很近');
    if (ws.length >= 8) highlights.push('句子有血有肉，不是干巴巴的主谓宾');
    if (highlights.length === 0) highlights.push('敢开口就是胜利，先把句子说出来');

    if (connectorHits === 0) improvements.push('试着加一个连接词（because / but / so），句子会更有逻辑');
    if (ws.length < 5) improvements.push('可以再加点细节：时间、地点、感受，让句子更立体');
    if (overlap < 30) improvements.push('看看下面的「老外会说」，把地道的说法整块搬走');

    return {
      score: clamp(Math.round(score), 0, 100),
      overlap: overlap,
      highlights: highlights,
      improvements: improvements
    };
  }

  /* ---------- 完整度 ---------- */
  function scoreCompleteness(text, refText) {
    var s = String(text).trim();
    var hasStart = /^[a-z]/.test(s) || /^[A-Z]/.test(s);
    var hasVerb = /\b(is|are|am|was|were|be|been|have|has|had|do|does|did|will|would|can|could|should|went|go|goes|made|make|took|take|got|get|want|wanted|like|liked|think|thought|feel|felt|say|said|see|saw|know|knew)\b/i.test(s);
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

  /* 主入口：text=用户句子 refText=老外会说（可空） */
  function scoreSentence(text, refText) {
    refText = refText || '';
    var grammar = scoreGrammar(text);
    var vocabulary = scoreVocabulary(text);
    var naturalness = scoreNaturalness(text, refText);
    var completeness = scoreCompleteness(text, refText);

    var total = Math.round(
      grammar.score * 0.35 +
      completeness.score * 0.25 +
      naturalness.score * 0.25 +
      vocabulary.score * 0.15
    );
    var lv = levelOf(total);

    return {
      total: clamp(total, 0, 100),
      level: lv,
      grammar: grammar,
      vocabulary: vocabulary,
      naturalness: naturalness,
      completeness: completeness
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
