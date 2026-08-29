/* 图解词库数据完整性测试（node --test test/test-opd3.js） */
const test = require('node:test');
const assert = require('node:assert');
const OPD3 = require('../js/data-opd3.js');
const DATA = require('../js/data.js');

test('OPD3-01 主题与词汇规模：≥18 主题、≥220 词', () => {
  assert.ok(OPD3.themeCount >= 18, '主题数 ' + OPD3.themeCount);
  assert.ok(OPD3.wordCount >= 220, '词汇数 ' + OPD3.wordCount);
});

test('OPD3-02 词形合法：无 OCR 噪音（I 分隔/截断/数字）', () => {
  OPD3.THEMES.forEach(t => {
    t.words.forEach(x => {
      assert.match(x.w, /^[A-Za-z][A-Za-z'’\- ]*$/, t.id + ' → ' + x.w);
      assert.ok(!/\bI\b/.test(x.w), t.id + ' 含 OCR 分隔符: ' + x.w);
      assert.ok(x.w.trim().split(/\s+/).length <= 4, t.id + ' 词组过长: ' + x.w);
      assert.ok(x.w.length >= 2, t.id + ' 词过短: ' + x.w);
    });
  });
});

test('OPD3-03 每词都有中文释义', () => {
  OPD3.THEMES.forEach(t => {
    t.words.forEach(x => {
      assert.ok(x.zh && x.zh.trim().length >= 1, t.id + ' 缺中文: ' + x.w);
    });
  });
});

test('OPD3-04 OPD3 词库内无重复（同词可跨主题，但同形重复视为脏数据）', () => {
  const seen = new Set();
  OPD3.THEMES.forEach(t => {
    t.words.forEach(x => {
      const k = x.w.toLowerCase();
      assert.ok(!seen.has(k), '重复词: ' + x.w);
      seen.add(k);
    });
  });
});

test('OPD3-05 与主词库 68 词无冲突（收词不会撞车）', () => {
  const main = new Set(DATA.WORDS.map(w => w.w.toLowerCase()));
  OPD3.THEMES.forEach(t => {
    t.words.forEach(x => {
      assert.ok(!main.has(x.w.toLowerCase()), '与主词库冲突: ' + x.w);
    });
  });
});

test('OPD3-06 主题结构完整：id/name/en/words 齐全', () => {
  OPD3.THEMES.forEach(t => {
    assert.ok(t.id && t.name && t.en && Array.isArray(t.words) && t.words.length >= 5,
      '主题不完整: ' + (t.id || '?'));
  });
});
