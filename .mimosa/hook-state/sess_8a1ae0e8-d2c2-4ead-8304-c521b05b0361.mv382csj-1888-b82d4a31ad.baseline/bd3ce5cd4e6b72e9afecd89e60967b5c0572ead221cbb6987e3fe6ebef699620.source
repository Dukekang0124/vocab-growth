/* ============================================================
 * 测试套件 T3：状态管理 store (test/test-store.js)
 * 用内存 storage shim，模拟 localStorage
 * ============================================================ */
'use strict';
const test = require('node:test');
const assert = require('node:assert');
const data = require('../js/data.js');
const srs = require('../js/srs.js');
const VG_STORE = require('../js/store.js');

function memStorage() {
  return {
    _m: {},
    getItem(k) { return Object.prototype.hasOwnProperty.call(this._m, k) ? this._m[k] : null; },
    setItem(k, v) { this._m[k] = String(v); },
    removeItem(k) { delete this._m[k]; }
  };
}

/* 固定"今天"= 2026-08-28，保证测试可复现 */
const FIXED_TODAY = '2026-08-28';
function createStore() {
  return VG_STORE.createStore(memStorage(), data, srs, () => FIXED_TODAY);
}

test('T3-01 初始化：播种 68 词运行态，nextReview=今天+off，streak 从 0 起算', () => {
  const st = createStore();
  const words = st.getWords();
  assert.strictEqual(words.length, 68);
  assert.strictEqual(Object.keys(st.state.overrides).length, 68);
  assert.strictEqual(st.state.streak.days, 0);
  assert.strictEqual(st.state.streak.lastActiveDate, '2026-08-27');
  // 抽查 alongside (off=0) 当天到期，shark (off=6) 未来
  assert.strictEqual(st.getWord('alongside').nextReview, FIXED_TODAY);
  assert.strictEqual(st.getWord('shark').nextReview, srs.addDays(FIXED_TODAY, 6));
  // 真实初始状态迁移
  assert.strictEqual(st.getWord('curious').sent, 'done');
  assert.strictEqual(st.getWord('himalayas').inWeak, true);
});

test('T3-02 复习：markReview 更新深度/nextReview 并写 reviewLog，streak+1', () => {
  const st = createStore();
  const before = st.state.streak.days;
  const events = st.markReview('dolphin', 5);
  const w = st.getWord('dolphin');
  assert.strictEqual(w.depth, 5);
  assert.strictEqual(w.inWeak, true);
  assert.strictEqual(w.nextReview, srs.addDays(FIXED_TODAY, 1));
  assert.strictEqual(events.length, 1);
  assert.strictEqual(events[0].type, 'enteredWeak');
  assert.strictEqual(st.state.reviewLog.length, 1);
  assert.strictEqual(st.state.reviewLog[0].wordId, 'dolphin');
  assert.strictEqual(st.state.streak.days, before + 1, '学习行为触发连续天数');
});

test('T3-03 复习：himalayas 已在薄弱清单，再标🔴不重复发事件', () => {
  const st = createStore();
  const events = st.markReview('himalayas', 4);
  assert.deepStrictEqual(events, []);
  assert.strictEqual(st.getWord('himalayas').inWeak, true);
});

test('T3-04 复习：连续两次🟢 自动移出薄弱清单', () => {
  const st = createStore();
  st.markReview('himalayas', 0); // 第1次🟢
  assert.strictEqual(st.getWord('himalayas').inWeak, true);
  const ev2 = st.markReview('himalayas', 1); // 第2次🟢
  assert.strictEqual(st.getWord('himalayas').inWeak, false);
  assert.strictEqual(ev2[0].type, 'leftWeak');
});

test('T3-05 添加新词：正常建档 + 隔天首复习 + 增长日志与里程碑', () => {
  const st = createStore();
  const r = st.addCustomWord({ word: 'Awesome', simple: 'very very good', zh: '极好的', chunk: 'an awesome day', exEn: 'I had an awesome day.', exZh: '我今天过得特别好。' }, 'mood');
  assert.ok(r.ok);
  const w = st.getWord('awesome');
  assert.ok(w, 'id 小写化建档');
  assert.strictEqual(w.zh, '极好的');
  assert.strictEqual(w.nextReview, '2026-08-29', '新词隔天首复习');
  assert.strictEqual(w.custom, true);
  const lastGrowth = st.state.growthLog[st.state.growthLog.length - 1];
  assert.strictEqual(lastGrowth.date, FIXED_TODAY);
  assert.strictEqual(lastGrowth.total, 69);
});

test('T3-06 添加新词：重复词被拒绝', () => {
  const st = createStore();
  const r = st.addCustomWord({ word: 'dolphin', zh: 'x' });
  assert.strictEqual(r.ok, false);
  assert.match(r.error, /已在词库/);
});

test('T3-07 新词上限铁律：构造待复习>30 → 添加被锁定', () => {
  const st = createStore();
  // 把词的 nextReview 拉到今天，构造 dueCount > 30
  let dueNow = st.getWords().filter(w => w.nextReview <= FIXED_TODAY).length;
  let need = 31 - dueNow;
  st.getWords().forEach(w => {
    if (need > 0 && w.nextReview > FIXED_TODAY) {
      st.state.overrides[w.id].nextReview = FIXED_TODAY;
      need--;
    }
  });
  const stats = st.getStats();
  assert.ok(stats.dueCount > 30, '构造条件成立: ' + stats.dueCount);
  assert.strictEqual(stats.newWordLocked, true);
  const r = st.addCustomWord({ word: 'brandnewword', zh: 'x' });
  assert.strictEqual(r.ok, false);
  assert.ok(r.locked, '错误类型=锁定');
});

test('T3-08 造句：markSentenceDone 记录 ✅ 并写造句记录', () => {
  const st = createStore();
  const before = st.state.sentenceRecords.length;
  st.markSentenceDone('dolphin', { wordId: 'dolphin', userSentence: 'I saw a dolphin.', refEn: 'We saw dolphins jumping alongside our boat.', status: 'corrected' });
  assert.strictEqual(st.getWord('dolphin').sent, 'done');
  assert.strictEqual(st.state.sentenceRecords.length, before + 1);
  assert.strictEqual(st.state.sentenceRecords[before].userSentence, 'I saw a dolphin.');
});

test('T3-09 今天用掉：toggleUsedToday 往返', () => {
  const st = createStore();
  assert.strictEqual(st.toggleUsedToday('dolphin'), true);
  assert.strictEqual(st.getWord('dolphin').usedToday, true);
  assert.strictEqual(st.toggleUsedToday('dolphin'), false);
  assert.strictEqual(st.getWord('dolphin').usedToday, false);
});

test('T3-10 语块：自定义入库 + 合并视图', () => {
  const st = createStore();
  assert.strictEqual(st.getChunks().length, 13);
  const r = st.addCustomChunk('日常闲聊', '这事儿说来话长', "It's a long story.");
  assert.ok(r.ok);
  assert.strictEqual(st.getChunks().length, 14);
  const mine = st.getChunks().filter(c => c.custom);
  assert.strictEqual(mine.length, 1);
  assert.strictEqual(mine[0].en, "It's a long story.");
  // 空值拒绝
  assert.strictEqual(st.addCustomChunk('s', '', '').ok, false);
});

test('T3-11 统计：总数/造句率/薄弱数/到期批 ≤5', () => {
  const st = createStore();
  const stats = st.getStats();
  assert.strictEqual(stats.total, 68);
  assert.strictEqual(stats.done, 4);
  assert.strictEqual(Math.round((4 / 68) * 100), stats.doneRate);
  assert.strictEqual(stats.weakCount, 2);
  assert.ok(stats.dueCount > 0, '种子保证首开有复习量');
  assert.ok(stats.dueCount <= 30, '种子保证不触发新词锁定');
  assert.ok(stats.dueBatch.length <= 5, '每轮最多5词');
  assert.ok(stats.dueBatch.every(id => !!st.getWord(id)));
});

test('T3-12 导出/导入：完整往返恢复', () => {
  const st = createStore();
  st.markReview('dolphin', 5);
  st.addCustomWord({ word: 'awesome', zh: '极好的' });
  st.addCustomChunk('日常闲聊', '说来话长', 'Long story.');
  const exported = st.exportJSON();

  const st2 = VG_STORE.createStore(memStorage(), data, srs, () => FIXED_TODAY);
  const r = st2.importJSON(exported);
  assert.ok(r.ok);
  assert.strictEqual(st2.getWord('dolphin').inWeak, true);
  assert.strictEqual(st2.getWord('awesome').custom, true);
  assert.strictEqual(st2.getChunks().length, 14);
});

test('T3-13 导入：损坏 JSON 报错不崩溃', () => {
  const st = createStore();
  assert.strictEqual(st.importJSON('not-json{{').ok, false);
  assert.strictEqual(st.importJSON('{"foo":1}').ok, false);
});

test('T3-14 重置：恢复种子状态', () => {
  const st = createStore();
  st.markReview('dolphin', 5);
  st.addCustomWord({ word: 'awesome', zh: 'x' });
  st.resetAll();
  assert.strictEqual(st.getWords().length, 68);
  assert.strictEqual(st.getWord('dolphin').inWeak, false);
  assert.strictEqual(st.getWord('dolphin').depth, 'untested');
});

test('T3-15 持久化脏数据：localStorage 损坏时重新播种（不白屏）', () => {
  const storage = memStorage();
  storage.setItem(data.CONFIG.storageKey, '{{{corrupted');
  const st = VG_STORE.createStore(storage, data, srs, () => FIXED_TODAY);
  assert.strictEqual(st.getWords().length, 68, '损坏后自动恢复种子');
});
