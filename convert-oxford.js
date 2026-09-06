/* 转换 winterdl oxford 数据 → js/data-oxford.js（一次性脚本）
 * 源：%TEMP%/oxford3000-rich.json（word/type/cefr/phon_n_am/definition/example）
 * 产物：VG_OXFORD = { LEVELS: [{ id, name, words: [...] }] }，词字段与产品 WORDS 对齐 */
const fs = require('fs');
const path = require('path');

let s = fs.readFileSync(path.join(process.env.TEMP, 'oxford3000-rich.json'), 'utf8').replace(/^\uFEFF/, '');
const raw = Object.values(JSON.parse(s));

/* 词性英文→缩写（观感） */
const POS_MAP = [
  [/^noun$/, 'n.'], [/^verb$/, 'v.'], [/^adjective$/, 'adj.'], [/^adverb$/, 'adv.'],
  [/^preposition$/, 'prep.'], [/^conjunction$/, 'conj.'], [/^pronoun$/, 'pron.'],
  [/^exclamation$/, 'excl.'], [/^number$/, 'num.'], [/^determiner$/, 'det.'],
  [/^modal verb$/, 'mod. v.'], [/^auxiliary verb$/, 'aux. v.'], [/^phrase$/, 'phr.'], [/^indefinite article$/, 'art.'],
  [/^definite article$/, 'art.'], [/^ordinal number$/, 'num.'], [/^prefix$/, 'pref.'], [/^suffix$/, 'suf.']
];
function posShort(t) {
  t = String(t || '').toLowerCase().trim();
  for (const [re, ab] of POS_MAP) if (re.test(t)) return ab;
  return t ? t.slice(0, 12) : '';
}

/* 例句清洗：去引号、斜杠变体取最像句子的分段、去“词 (占位), ”格式说明前缀 */
function cleanExample(ex) {
  if (!ex) return '';
  let x = String(ex).replace(/^["']|["']$/g, '').trim();
  if (!x) return '';
  if (x.indexOf('/') >= 0) {
    const parts = x.split('/').map(function (s) { return s.trim(); }).filter(Boolean);
    parts.sort(function (a, b) { return b.split(' ').length - a.split(' ').length; });
    x = parts[0] || '';
  }
  /* 去掉 “Build (something), ” 这类格式说明前缀，保留真句 */
  x = x.replace(/^[A-Za-z'' ]+ \([^)]*\)\s*,?\s*/, '').replace(/^\([^)]*\)\s*,?\s*/, '').trim();
  if (!x || x.indexOf(' ') < 0) return ''; /* 单词级“例句”没有语境价值 → 视为无例句 */
  if (!/[.!?]$/.test(x)) x += '.';
  return x.charAt(0).toUpperCase() + x.slice(1);
}

/* 释义清洗 */
function cleanDef(d) {
  if (!d) return '';
  return String(d).replace(/^["']|["']$/g, '').trim();
}

/* 去重（word 小写为键，同词不同词性保留信息量大的：definition 更长者优先） */
const byKey = {};
for (const w of raw) {
  const word = String(w.word || '').trim();
  if (!word) continue;
  const key = word.toLowerCase();
  const item = {
    word: word,
    pos: posShort(w.type),
    cefr: String(w.cefr || '').toLowerCase(),
    ipa: String(w.phon_n_am || '').replace(/\//g, '').trim(),
    def: cleanDef(w.definition),
    ex: cleanExample(w.example)
  };
  if (!byKey[key]) { byKey[key] = item; continue; }
  const old = byKey[key];
  if ((item.def + item.ex).length > (old.def + old.ex).length) byKey[key] = item;
}

/* 按 CEFR 分组排序 */
const LEVELS = [
  { id: 'a1', name: 'A1 入门' },
  { id: 'a2', name: 'A2 基础' },
  { id: 'b1', name: 'B1 进阶' },
  { id: 'b2', name: 'B2 高阶' }
];
const LEVEL_ORDER = { a1: 0, a2: 1, b1: 2, b2: 3 };
const groups = {};
for (const key of Object.keys(byKey)) {
  const item = byKey[key];
  if (!LEVEL_ORDER.hasOwnProperty(item.cefr)) continue; /* 无等级的丢弃 */
  (groups[item.cefr] = groups[item.cefr] || []).push(item);
}
LEVELS.forEach(l => {
  (groups[l.id] || []).sort((x, y) => x.word.localeCompare(y.word));
  l.words = groups[l.id] || [];
});

const total = LEVELS.reduce((n, l) => n + l.words.length, 0);
const compact = JSON.stringify({ LEVELS: LEVELS.map(l => ({ id: l.id, name: l.name, words: l.words })) });
const out = '/* ============================================================\n' +
  ' * 词汇生长 — 牛津 3000/5000 高频词库 (js/data-oxford.js)\n' +
  ' * 数据源：Oxford 3000/5000 by CEFR（开源数据集 winterdl/oxford-5000-vocabulary-audio-definition）\n' +
  ' * 共 ' + total + ' 词（A1-B2），词性已缩写、例句已清洗；中文释义由收词后学习流程以英文释义承接\n' +
  ' * 用法：学词页「日常高频」板块挑选收词（addCustomWord），收后进入完整复习/造句/开口链路\n' +
  ' * ============================================================ */\n' +
  'var VG_OXFORD = ' + compact + ';\n' +
  'if (typeof module !== "undefined" && module.exports) module.exports = VG_OXFORD;\n';
fs.writeFileSync(path.join(__dirname, 'js', 'data-oxford.js'), out);
console.log('生成完成: 总词数 ' + total);
LEVELS.forEach(l => console.log('  ' + l.name + ': ' + l.words.length));
console.log('文件大小: ' + Math.round(fs.statSync(path.join(__dirname, 'js', 'data-oxford.js')).size / 1024) + ' KB');
