/**
 * 词汇生长 MVP 测试套件 - 使用限制和反馈功能
 * 已适配重写后的 usage-limit.js（IIFE + checkUsageLimit/recordUsage/addStudyTime）
 */

var testStorage = {
  _m: {},
  getItem: function(k) { return this._m[k] || null; },
  setItem: function(k, v) { this._m[k] = v; },
  removeItem: function(k) { delete this._m[k]; }
};

if (typeof localStorage === 'undefined') {
  global.localStorage = testStorage;
} else {
  // Node 已有 localStorage 时清空
  localStorage.removeItem('vocab_growth_usage_v1');
}

// 引入使用限制模块（新 API）
var USAGE_LIMIT = require('../app/js/usage-limit.js');

var testResults = { total: 0, passed: 0, failed: 0 };
function assert(cond, name) {
  testResults.total++;
  if (cond) { testResults.passed++; console.log('✅ PASS:', name); }
  else { testResults.failed++; console.log('❌ FAIL:', name); }
}

// ========================================
// 测试 1: 使用限制初始化和检查
// ========================================
console.log('\n========== 测试 1: 使用限制初始化 ==========');
localStorage.removeItem('vocab_growth_usage_v1');

var uc = USAGE_LIMIT.checkUsageLimit('user1', 'review');
assert(uc.allowed === true, '复习初始 allowed=true');
assert(uc.remaining === 10, '复习初始剩余 10 次');

var sc = USAGE_LIMIT.checkUsageLimit('user1', 'sentence');
assert(sc.allowed === true, '造句初始 allowed=true');
assert(sc.remaining === 5, '造句初始剩余 5 次');

var nc = USAGE_LIMIT.checkUsageLimit('user1', 'newWord');
assert(nc.allowed === true, '新词初始 allowed=true');
assert(nc.remaining === 3, '新词初始剩余 3 次');

// 不存在的 action 应该放行
var xc = USAGE_LIMIT.checkUsageLimit('user1', 'nonexistent');
assert(xc.allowed === true, '未知 action 放行');
assert(xc.remaining === Infinity, '未知 action 剩余 Infinity');

// ========================================
// 测试 2: 使用次数记录
// ========================================
console.log('\n========== 测试 2: 使用次数记录 ==========');

USAGE_LIMIT.recordUsage('user1', 'review', 3);
var uc2 = USAGE_LIMIT.checkUsageLimit('user1', 'review');
assert(uc2.remaining === 7, '复习用 3 次后剩余 7');

USAGE_LIMIT.recordUsage('user1', 'sentence', 2);
var sc2 = USAGE_LIMIT.checkUsageLimit('user1', 'sentence');
assert(sc2.remaining === 3, '造句用 2 次后剩余 3');

USAGE_LIMIT.recordUsage('user1', 'newWord', 1);
var nc2 = USAGE_LIMIT.checkUsageLimit('user1', 'newWord');
assert(nc2.remaining === 2, '新词用 1 次后剩余 2');

// ========================================
// 测试 3: 达到上限
// ========================================
console.log('\n========== 测试 3: 使用限制达到上限 ==========');

// 复习超限
localStorage.removeItem('vocab_growth_usage_v1');
for (var i = 0; i < 10; i++) USAGE_LIMIT.recordUsage('user1', 'review', 1);
var uc3 = USAGE_LIMIT.checkUsageLimit('user1', 'review');
assert(uc3.allowed === false, '复习 10 次后 allowed=false');
assert(uc3.remaining === 0, '复习超限剩余 0');

// 造句超限
localStorage.removeItem('vocab_growth_usage_v1');
for (var i = 0; i < 5; i++) USAGE_LIMIT.recordUsage('user1', 'sentence', 1);
var sc3 = USAGE_LIMIT.checkUsageLimit('user1', 'sentence');
assert(sc3.allowed === false, '造句 5 次后 allowed=false');

// 新词超限
localStorage.removeItem('vocab_growth_usage_v1');
for (var i = 0; i < 3; i++) USAGE_LIMIT.recordUsage('user1', 'newWord', 1);
var nc3 = USAGE_LIMIT.checkUsageLimit('user1', 'newWord');
assert(nc3.allowed === false, '新词 3 次后 allowed=false');

// ========================================
// 测试 4: 学习时长
// ========================================
console.log('\n========== 测试 4: 学习时长 ==========');
localStorage.removeItem('vocab_growth_usage_v1');

USAGE_LIMIT.addStudyTime('user1', 15); // 15 分钟
var tc = USAGE_LIMIT.checkUsageLimit('user1', 'studyTime');
assert(tc.allowed === true, '15 分钟后未超限');

USAGE_LIMIT.addStudyTime('user1', 20); // 共 35 分钟 > 30 上限
var tc2 = USAGE_LIMIT.checkUsageLimit('user1', 'studyTime');
assert(tc2.allowed === false, '35 分钟后超限');

// 负值不应增加
localStorage.removeItem('vocab_growth_usage_v1');
USAGE_LIMIT.addStudyTime('user1', -5);
var tc3 = USAGE_LIMIT.checkUsageLimit('user1', 'studyTime');
assert(tc3.allowed === true, '负学习时间不记录');

// ========================================
// 测试 5: LIMITS 配置
// ========================================
console.log('\n========== 测试 5: LIMITS 配置 ==========');
assert(USAGE_LIMIT.LIMITS.review === 10, '复习上限 10');
assert(USAGE_LIMIT.LIMITS.sentence === 5, '造句上限 5');
assert(USAGE_LIMIT.LIMITS.newWord === 3, '新词上限 3');
assert(USAGE_LIMIT.LIMITS.studyTime === 30 * 60 * 1000, '学习时长上限 30 分钟(ms)');

// ========================================
// 测试总结
// ========================================
console.log('\n========== 测试总结 ==========');
console.log('总测试数:', testResults.total);
console.log('通过:', testResults.passed);
console.log('失败:', testResults.failed);
var rate = ((testResults.passed / testResults.total) * 100).toFixed(1);
console.log('通过率:', rate + '%');

if (testResults.failed === 0) {
  console.log('\n🎉 所有测试通过！');
  process.exit(0);
} else {
  console.log('\n❌ 部分测试失败！');
  process.exit(1);
}
