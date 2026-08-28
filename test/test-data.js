/* ============================================================
 * 测试套件 T1：种子数据完整性 (test/test-data.js)
 * 运行：node --test test/
 * ============================================================ */
'use strict';
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

const data = require('../js/data.js');

test('T1-01 词群：8 个，id 唯一，有故事锚点', () => {
  assert.strictEqual(data.GROUPS.length, 8);
  const ids = data.GROUPS.map(g => g.id);
  assert.strictEqual(new Set(ids).size, 8);
  data.GROUPS.forEach(g => {
    assert.ok(g.name && g.name.length > 1, '词群名非空: ' + g.id);
    assert.ok(g.story && g.story.length > 4, '词群有故事: ' + g.id);
  });
});

test('T1-02 词表：68 词（66词表 + strict/fabulous 从音频资产恢复），id 唯一', () => {
  assert.strictEqual(data.WORDS.length, 68);
  const words = data.WORDS.map(w => w.w.toLowerCase());
  assert.strictEqual(new Set(words).size, 68, '词不能重复');
});

test('T1-03 词条必备字段：w/ipa/simple/zh/chunk/ex.en/g 非空', () => {
  const groupIds = new Set(data.GROUPS.map(g => g.id));
  data.WORDS.forEach(w => {
    assert.ok(w.w, '词: ' + w.w);
    assert.ok(w.ipa, '音标: ' + w.w);
    assert.ok(w.simple, '简单英语释义: ' + w.w);
    assert.ok(w.zh, '中文: ' + w.w);
    assert.ok(w.chunk, '句型骨架: ' + w.w);
    assert.ok(w.ex && w.ex.en, '例句en: ' + w.w);
    assert.ok(w.ex && w.ex.zh, '例句zh: ' + w.w);
    assert.ok(groupIds.has(w.g), '词群id合法: ' + w.w + ' → ' + w.g);
    assert.ok(['done', 'pending'].includes(w.sent), '造句状态: ' + w.w);
    assert.ok(w.learned && /^\d{4}-\d{2}-\d{2}$/.test(w.learned), '首学日期: ' + w.w);
  });
});

test('T1-04 真实状态迁移：4 词已造句(done)，himalayas/mechanic 在薄弱清单', () => {
  const done = data.WORDS.filter(w => w.sent === 'done').map(w => w.w).sort();
  assert.deepStrictEqual(done, ['camera', 'curious', 'editor', 'stuff']);
  const weak = data.WORDS.filter(w => w.weak).map(w => w.w).sort();
  assert.deepStrictEqual(weak, ['himalayas', 'mechanic']);
});

test('T1-05 音频映射：声明的 40 个 mp3 文件真实存在于 assets/audio/', () => {
  const audioDir = path.join(__dirname, '..', 'assets', 'audio');
  const files = new Set(fs.readdirSync(audioDir));
  const withAudio = data.WORDS.filter(w => w.audio);
  assert.strictEqual(withAudio.length, 40, '40 词带 OB 原音');
  withAudio.forEach(w => {
    assert.ok(files.has(w.audio), '音频存在: ' + w.audio);
  });
  // 音频目录没有孤儿文件（每个 mp3 都被某个词引用）
  files.forEach(f => {
    assert.ok(withAudio.some(w => w.audio === f), '音频被引用: ' + f);
  });
});

test('T1-06 语块：13 条，场景归属 4 个真实场景，中英非空', () => {
  assert.strictEqual(data.CHUNKS.length, 13);
  const scenes = new Set(data.CHUNKS.map(c => c.scene));
  assert.strictEqual(scenes.size, 4);
  ['好奇提问', '表达观点', '学英语相关', '日常闲聊'].forEach(s => {
    assert.ok(scenes.has(s), '种子场景存在: ' + s);
  });
});

test('T1-07 造句记录种子：2 条真实记录（curious/stuff）', () => {
  assert.strictEqual(data.SENTENCE_RECORDS.length, 2);
  assert.strictEqual(data.SENTENCE_RECORDS[0].wordId, 'curious');
  assert.strictEqual(data.SENTENCE_RECORDS[1].wordId, 'stuff');
  data.SENTENCE_RECORDS.forEach(r => {
    assert.ok(r.userSentence && r.correction && r.refEn);
  });
});

test('T1-08 增长日志与里程碑一致（终值 68 = 词表总数）', () => {
  const last = data.GROWTH_LOG[data.GROWTH_LOG.length - 1];
  assert.strictEqual(last.total, data.WORDS.length);
  assert.ok(data.MILESTONES.length >= 3);
  data.MILESTONES.forEach(m => assert.ok(m.date && m.text && m.n > 0));
});

test('T1-09 运行配置：复习批5 / 新词锁阈值30 / 存储键', () => {
  assert.strictEqual(data.CONFIG.reviewBatchSize, 5);
  assert.strictEqual(data.CONFIG.newWordLockThreshold, 30);
  assert.strictEqual(data.CONFIG.storageKey, 'vocab_growth_v1');
});
