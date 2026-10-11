/* ============================================================
 * 测试套件 T2：SRS-lite 调度引擎 (test/test-srs.js)
 * ============================================================ */
'use strict';
const test = require('node:test');
const assert = require('node:assert');
const srs = require('../js/srs.js');

test('T2-01 日期工具：addDays / daysBetween 跨月正确', () => {
  assert.strictEqual(srs.addDays('2026-08-30', 3), '2026-09-02');
  assert.strictEqual(srs.addDays('2026-12-30', 3), '2027-01-02');
  assert.strictEqual(srs.daysBetween('2026-08-28', '2026-08-30'), 2);
  assert.strictEqual(srs.daysBetween('2026-08-30', '2026-08-28'), -2);
  assert.strictEqual(srs.daysBetween('2026-08-28', '2026-08-28'), 0);
});

test('T2-02 遗忘深度映射：层0-1→green，2-3→yellow，4+→red（含看答案5）', () => {
  assert.strictEqual(srs.depthFromLayer(0), 'green');
  assert.strictEqual(srs.depthFromLayer(1), 'green');
  assert.strictEqual(srs.depthFromLayer(2), 'yellow');
  assert.strictEqual(srs.depthFromLayer(3), 'yellow');
  assert.strictEqual(srs.depthFromLayer(4), 'red');
  assert.strictEqual(srs.depthFromLayer(5), 'red');
});

test('T2-03 复习强度映射：🟢隔天起算2天 / 🟡1天 / 🔴每天1天', () => {
  assert.strictEqual(srs.intervalFor('green'), 2);
  assert.strictEqual(srs.intervalFor('yellow'), 1);
  assert.strictEqual(srs.intervalFor('red'), 1);
});

test('T2-04 状态机：🟢 连续2次 且在薄弱清单 → 自动移出（leftWeak 事件）', () => {
  let w = { w: 'test', sent: 'pending', depth: 5, greenStreak: 0, inWeak: true, weakSince: '2026-08-01' };
  let r1 = srs.applyReview(w, 0, '2026-08-28');
  assert.strictEqual(r1.word.depth, 1);
  assert.strictEqual(r1.word.greenStreak, 1);
  assert.strictEqual(r1.word.inWeak, true, '第1次🟢仍在薄弱清单');
  assert.deepStrictEqual(r1.events, []);

  let r2 = srs.applyReview(r1.word, 1, '2026-08-30');
  assert.strictEqual(r2.word.greenStreak, 0, '移出后清零');
  assert.strictEqual(r2.word.inWeak, false, '连续2次🟢移出');
  assert.strictEqual(r2.word.weakSince, null);
  assert.strictEqual(r2.events.length, 1);
  assert.strictEqual(r2.events[0].type, 'leftWeak');
});

test('T2-05 状态机：🔴 首次 → 进薄弱清单（enteredWeak 事件）；重复🔴 不重复进', () => {
  let w = { w: 'test', sent: 'pending', depth: 1, greenStreak: 2, inWeak: false };
  let r1 = srs.applyReview(w, 5, '2026-08-28');
  assert.strictEqual(r1.word.depth, 5);
  assert.strictEqual(r1.word.inWeak, true);
  assert.strictEqual(r1.word.weakSince, '2026-08-28');
  assert.strictEqual(r1.word.greenStreak, 0);
  assert.strictEqual(r1.events[0].type, 'enteredWeak');

  let r2 = srs.applyReview(r1.word, 4, '2026-08-29');
  assert.strictEqual(r2.word.inWeak, true);
  assert.deepStrictEqual(r2.events, [], '已在清单不再触发事件');
});

test('T2-06 状态机：🟡 归零 greenStreak，间隔1天', () => {
  let w = { w: 'test', sent: 'done', depth: 1, greenStreak: 3, inWeak: false };
  let r = srs.applyReview(w, 2, '2026-08-28');
  assert.strictEqual(r.word.depth, 3);
  assert.strictEqual(r.word.greenStreak, 0);
  assert.strictEqual(r.word.nextReview, '2026-08-29');
});

test('T2-07 队列优先级：未造句 > 薄弱 > 其余按 nextReview 升序', () => {
  const today = '2026-08-28';
  const words = [
    { id: 'a-done-old', w: 'a', sent: 'done', inWeak: false, nextReview: '2026-08-20' },
    { id: 'b-pending', w: 'b', sent: 'pending', inWeak: false, nextReview: '2026-08-25' },
    { id: 'c-weak', w: 'c', sent: 'done', inWeak: true, nextReview: '2026-08-26' },
    { id: 'd-pending-late', w: 'd', sent: 'pending', inWeak: false, nextReview: '2026-08-27' },
    { id: 'e-future', w: 'e', sent: 'pending', inWeak: false, nextReview: '2026-09-05' }
  ];
  const q = srs.buildQueue(words, today);
  assert.deepStrictEqual(q.map(x => x.id), ['b-pending', 'd-pending-late', 'c-weak', 'a-done-old']);
  assert.ok(!q.some(x => x.id === 'e-future'), '未来词不进队列');
});

test('T2-08 新词上限铁律：>30 锁定，≤30 放行，边界30放行', () => {
  assert.strictEqual(srs.isNewWordLocked(31, 30), true);
  assert.strictEqual(srs.isNewWordLocked(30, 30), false);
  assert.strictEqual(srs.isNewWordLocked(0, 30), false);
});

test('T2-09 连续天数：断一天重置为1，当天重复活跃不变', () => {
  let s1 = srs.nextStreak({ days: 5, lastActiveDate: '2026-08-27' }, '2026-08-28');
  assert.deepStrictEqual(s1, { days: 6, lastActiveDate: '2026-08-28' });

  let s2 = srs.nextStreak(s1, '2026-08-28');
  assert.strictEqual(s2.days, 6, '同一天不重复计数');

  let s3 = srs.nextStreak({ days: 6, lastActiveDate: '2026-08-26' }, '2026-08-28');
  assert.deepStrictEqual(s3, { days: 1, lastActiveDate: '2026-08-28' }, '断档重置');
});

test('T2-10 里程碑：30/60/100 触发，非整数不触发', () => {
  assert.strictEqual(srs.milestoneFor(30), 30);
  assert.strictEqual(srs.milestoneFor(60), 60);
  assert.strictEqual(srs.milestoneFor(100), 100);
  assert.strictEqual(srs.milestoneFor(45), null);
  assert.strictEqual(srs.milestoneFor(101), null);
});

test('T2-11 端到端场景：一个词从建档到两轮复习的完整调度', () => {
  const today = '2026-08-28';
  // 新词建档：nextReview = 明天（睡眠巩固）
  let w = { w: 'newword', sent: 'pending', depth: 'untested', greenStreak: 0, inWeak: false, nextReview: '2026-08-29' };
  assert.strictEqual(srs.buildQueue([w], today).length, 0, '当天不复习新词');

  // 次日首复习：第3层想起（yellow）
  let r1 = srs.applyReview(w, 3, '2026-08-29');
  assert.strictEqual(r1.word.depth, 3);
  assert.strictEqual(r1.word.nextReview, '2026-08-30');

  // 8-30 复习：第5层看答案（red）→ 进薄弱
  let r2 = srs.applyReview(r1.word, 5, '2026-08-30');
  assert.strictEqual(r2.word.inWeak, true);
  assert.strictEqual(r2.word.nextReview, '2026-08-31');

  // 8-31、9-1 连续两次第0层想起 → 移出薄弱
  let r3 = srs.applyReview(r2.word, 0, '2026-08-31');
  let r4 = srs.applyReview(r3.word, 0, '2026-09-01');
  assert.strictEqual(r4.word.inWeak, false);
  assert.strictEqual(r4.events[0].type, 'leftWeak');
  assert.strictEqual(r4.word.nextReview, '2026-09-03', '🟢隔天起算2天');
});
