/**
 * 词汇生长 MVP 测试套件 - 使用限制和反馈功能
 * 测试目标：验证使用限制和反馈功能正常工作
 */

// 测试环境设置
var testStorage = {
  _m: {},
  getItem: function(k) { return this._m[k]; },
  setItem: function(k, v) { this._m[k] = v; },
  removeItem: function(k) { delete this._m[k]; }
};

// 模拟 localStorage
if (typeof localStorage === 'undefined') {
  localStorage = testStorage;
}

// 引入使用限制模块
var USAGE_LIMIT = require('../js/usage-limit.js');
var clearAllUsageRecords = USAGE_LIMIT.clearAllUsageRecords;
var getUsageRecords = USAGE_LIMIT.getUsageRecords;

// 引入反馈模块
var feedbackModule = require('../js/feedback.js');
var submitFeedback = feedbackModule.submitFeedback;
var getFeedbackStats = feedbackModule.getFeedbackStats;
var getFeedbackList = feedbackModule.getFeedbackList;
var getFeedbackData = feedbackModule.getFeedbackData;
var exportFeedbackData = feedbackModule.exportFeedbackData;

// 测试结果统计
var testResults = {
  total: 0,
  passed: 0,
  failed: 0
};

// 测试辅助函数
function assert(condition, testName) {
  testResults.total++;
  if (condition) {
    testResults.passed++;
    console.log('✅ PASS:', testName);
  } else {
    testResults.failed++;
    console.log('❌ FAIL:', testName);
  }
}

function assertEqual(actual, expected, testName) {
  assert(actual === expected, testName + ' (期望: ' + expected + ', 实际: ' + actual + ')');
}

function assertInRange(actual, min, max, testName) {
  assert(actual >= min && actual <= max, testName + ' (范围: ' + min + '-' + max + ')');
}

// ========================================
// 测试 1: 使用限制初始化
// ========================================
console.log('\n========== 测试 1: 使用限制初始化 ==========');

// 清空之前的测试数据
localStorage.removeItem('vocab_growth_usage_v1');

var userId = 'test_user_' + Date.now();
var today = USAGE_LIMIT.getTodayString();

// 测试初始化记录
var usage = USAGE_LIMIT.getUserTodayUsage(userId);
assert(usage.reviewCount === 0, '初始复习次数为 0');
assert(usage.sentenceCount === 0, '初始造句次数为 0');
assert(usage.newWordCount === 0, '初始新词添加次数为 0');
assert(usage.studyTime === 0, '初始学习时长为 0');

// 测试检查限制
var reviewCheck = USAGE_LIMIT.checkUsageLimit(userId, 'review');
assert(reviewCheck.allowed === true, '复习限制检查通过');
assert(reviewCheck.remaining === 10, '复习剩余次数为 10');

// 测试检查造句限制
var sentenceCheck = USAGE_LIMIT.checkUsageLimit(userId, 'sentence');
assert(sentenceCheck.allowed === true, '造句限制检查通过');
assert(sentenceCheck.remaining === 5, '造句剩余次数为 5');

// 测试检查新词限制
var newWordCheck = USAGE_LIMIT.checkUsageLimit(userId, 'newWord');
assert(newWordCheck.allowed === true, '新词添加限制检查通过');
assert(newWordCheck.remaining === 3, '新词添加剩余次数为 3');

// 测试检查学习时长限制
var studyCheck = USAGE_LIMIT.checkUsageLimit(userId, 'studyTime');
assert(studyCheck.allowed === true, '学习时长限制检查通过');
assert(studyCheck.remaining === 30 * 60 * 1000, '学习时长剩余为 30 分钟');

// ========================================
// 测试 2: 使用次数记录
// ========================================
console.log('\n========== 测试 2: 使用次数记录 ==========');

// 记录复习次数
USAGE_LIMIT.recordUsage(userId, 'review', 3);
usage = USAGE_LIMIT.getUserTodayUsage(userId);
assert(usage.reviewCount === 3, '复习次数记录为 3');

// 记录造句次数
USAGE_LIMIT.recordUsage(userId, 'sentence', 2);
usage = USAGE_LIMIT.getUserTodayUsage(userId);
assert(usage.sentenceCount === 2, '造句次数记录为 2');

// 记录新词添加次数
USAGE_LIMIT.recordUsage(userId, 'newWord', 1);
usage = USAGE_LIMIT.getUserTodayUsage(userId);
assert(usage.newWordCount === 1, '新词添加次数记录为 1');

// 测试记录学习时长
USAGE_LIMIT.addStudyTime(userId, 15);
usage = USAGE_LIMIT.getUserTodayUsage(userId);
assertInRange(usage.studyTime, 15 * 60 * 1000, 16 * 60 * 1000, '学习时长记录正确');

// ========================================
// 测试 3: 使用限制检查（达到上限）
// ========================================
console.log('\n========== 测试 3: 使用限制检查（达到上限）==========');

// 清空今日记录
USAGE_LIMIT.resetTodayUsage(userId);

// 记录复习次数达到上限
for (var i = 0; i < 10; i++) {
  USAGE_LIMIT.recordUsage(userId, 'review', 1);
}

var reviewCheck = USAGE_LIMIT.checkUsageLimit(userId, 'review');
assert(reviewCheck.allowed === false, '复习次数达到上限时检查失败');
assert(reviewCheck.reason === '每日复习次数已达上限', '限制原因正确');
assert(reviewCheck.remaining === 0, '剩余次数为 0');

// 记录造句次数达到上限
USAGE_LIMIT.resetTodayUsage(userId);
for (var i = 0; i < 5; i++) {
  USAGE_LIMIT.recordUsage(userId, 'sentence', 1);
}

var sentenceCheck = USAGE_LIMIT.checkUsageLimit(userId, 'sentence');
assert(sentenceCheck.allowed === false, '造句次数达到上限时检查失败');
assert(sentenceCheck.reason === '每日造句次数已达上限', '限制原因正确');
assert(sentenceCheck.remaining === 0, '剩余次数为 0');

// 记录新词添加次数达到上限
USAGE_LIMIT.resetTodayUsage(userId);
for (var i = 0; i < 3; i++) {
  USAGE_LIMIT.recordUsage(userId, 'newWord', 1);
}

var newWordCheck = USAGE_LIMIT.checkUsageLimit(userId, 'newWord');
assert(newWordCheck.allowed === false, '新词添加次数达到上限时检查失败');
assert(newWordCheck.reason === '每日添加新词已达上限', '限制原因正确');
assert(newWordCheck.remaining === 0, '剩余次数为 0');

// 记录学习时长达到上限
USAGE_LIMIT.resetTodayUsage(userId);
USAGE_LIMIT.addStudyTime(userId, 30);
var studyCheck = USAGE_LIMIT.checkUsageLimit(userId, 'studyTime');
assert(studyCheck.allowed === false, '学习时长达到上限时检查失败');
assert(studyCheck.reason === '每日学习时长已达上限', '限制原因正确');
assert(studyCheck.remaining === 0, '剩余时长为 0');

// ========================================
// 测试 4: 反馈功能
// ========================================
console.log('\n========== 测试 4: 反馈功能 ==========');

// 清空之前的反馈数据
localStorage.removeItem('vocab_growth_feedback_v1');

// 提交反馈
var feedback1 = submitFeedback('bug', '发音有误', 5, 'test@example.com');
assert(feedback1.success === true, '反馈提交成功');
assert(feedback1.message === '感谢您的反馈！我们会持续改进产品。', '反馈消息正确');

// 提交多个反馈
submitFeedback('suggestion', '增加夜间模式', 4, '');
submitFeedback('feature', '希望有云端同步', 3, '');

// 获取反馈统计
var stats = getFeedbackStats();
assert(stats.total === 3, '反馈总数为 3');
assert(stats.byType.bug === 1, 'Bug 反馈数为 1');
assert(stats.byType.suggestion === 1, '建议反馈数为 1');
assert(stats.byType.feature === 1, '新功能需求反馈数为 1');
assert(stats.averageRating === '4.0', '平均评分为 4.0');

// 获取反馈列表
var feedbacks = getFeedbackList(10);
assert(feedbacks.length === 3, '反馈列表长度为 3');

// 获取反馈详情（注意：getFeedbackList 返回倒序列表，第一个是最后提交的）
var lastFeedback = feedbacks[0];
assert(lastFeedback.type === 'feature', '最后一个反馈类型为 feature');
assert(lastFeedback.rating === 3, '最后一个反馈评分为 3');
assert(lastFeedback.email === '', '邮箱为空');

// ========================================
// 测试 5: 数据导出/导入
// ========================================
console.log('\n========== 测试 5: 数据导出/导入 ==========');

// 导出使用记录
var exportData = USAGE_LIMIT.exportUsageRecords();
var exportObj = JSON.parse(exportData);
assert(exportObj.records !== undefined, '导出数据包含 records 字段');
assert(exportObj.records[today] !== undefined, '导出数据包含今日记录');

// 导出反馈数据
var feedbackExport = exportFeedbackData();
var feedbackExportObj = JSON.parse(feedbackExport);
assert(feedbackExportObj.feedbacks !== undefined, '反馈导出数据包含 feedbacks 字段');
assert(feedbackExportObj.feedbacks.length === 3, '反馈导出数据包含 3 条记录');

// ========================================
// 测试 6: 数据重置
// ========================================
console.log('\n========== 测试 6: 数据重置 ==========');

// 重置使用记录
USAGE_LIMIT.resetTodayUsage(userId);
usage = USAGE_LIMIT.getUserTodayUsage(userId);
assert(usage.reviewCount === 0, '重置后复习次数为 0');
assert(usage.sentenceCount === 0, '重置后造句次数为 0');
assert(usage.newWordCount === 0, '重置后新词添加次数为 0');
assert(usage.studyTime === 0, '重置后学习时长为 0');

// 清空所有使用记录
clearAllUsageRecords();
var records = getUsageRecords();
assert(records.records !== undefined, '清空后使用记录对象存在');
assert(Object.keys(records.records).length === 0, '清空后使用记录为空对象');

// 清空所有反馈数据
feedbackModule.clearAllFeedbackData();
var feedbackData = getFeedbackData();
assert(feedbackData.feedbacks.length === 0, '清空后反馈列表为空');

// ========================================
// 测试总结
// ========================================
console.log('\n========== 测试总结 ==========');
console.log('总测试数:', testResults.total);
console.log('通过:', testResults.passed);
console.log('失败:', testResults.failed);
console.log('通过率:', ((testResults.passed / testResults.total) * 100).toFixed(2) + '%');

if (testResults.failed === 0) {
  console.log('\n🎉 所有测试通过！');
  process.exit(0);
} else {
  console.log('\n❌ 部分测试失败！');
  process.exit(1);
}
