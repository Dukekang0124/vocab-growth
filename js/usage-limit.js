/**
 * 词汇生长 - 使用次数限制模块
 * 功能：限制每日复习次数、造句次数、新词添加次数和学习时长
 * 存储方式：localStorage (key: vocab_growth_usage_v1)
 */

// 使用限制配置
const USAGE_LIMIT = {
  dailyReview: 10,        // 每日复习次数限制
  dailySentence: 5,       // 每日造句次数限制
  dailyNewWord: 3,        // 每日添加新词数量限制
  dailyStudyTime: 30 * 60 * 1000  // 每日学习时长限制（30分钟）
};

// 存储键名
const STORAGE_KEY = 'vocab_growth_usage_v1';

/**
 * 获取当前日期字符串（YYYY-MM-DD）
 * @returns {string} 日期字符串
 */
function getTodayString() {
  const now = new Date();
  return now.toISOString().split('T')[0];
}

/**
 * 初始化使用记录数据结构
 * @returns {Object} 初始化的使用记录对象
 */
function initializeUsageRecords() {
  return {
    records: {}  // 结构: { "2026-08-28": { userId: { reviewCount, sentenceCount, newWordCount, studyTime } } }
  };
}

/**
 * 获取使用记录
 * @returns {Object} 使用记录对象
 */
function getUsageRecords() {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : initializeUsageRecords();
  } catch (error) {
    console.error('读取使用记录失败:', error);
    return initializeUsageRecords();
  }
}

/**
 * 保存使用记录
 * @param {Object} records 使用记录对象
 */
function saveUsageRecords(records) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
  } catch (error) {
    console.error('保存使用记录失败:', error);
  }
}

/**
 * 获取用户的今日使用记录
 * @param {string} userId 用户ID（当前版本使用 localStorage key 作为 userId）
 * @returns {Object} 用户的今日使用记录
 */
function getUserTodayUsage(userId) {
  const records = getUsageRecords();
  const today = getTodayString();

  if (!records.records[today]) {
    records.records[today] = {};
  }

  if (!records.records[today][userId]) {
    records.records[today][userId] = {
      reviewCount: 0,
      sentenceCount: 0,
      newWordCount: 0,
      studyTime: 0
    };
  }

  return records.records[today][userId];
}

/**
 * 检查是否允许执行操作
 * @param {string} userId 用户ID
 * @param {string} action 操作类型（'review' | 'sentence' | 'newWord'）
 * @returns {Object} { allowed: boolean, reason: string, remaining: number }
 */
function checkUsageLimit(userId, action) {
  const today = getTodayString();
  const usage = getUserTodayUsage(userId);

  // 检查每日复习次数
  if (action === 'review') {
    if (usage.reviewCount >= USAGE_LIMIT.dailyReview) {
      return {
        allowed: false,
        reason: '每日复习次数已达上限',
        limit: USAGE_LIMIT.dailyReview,
        remaining: 0,
        limitType: 'dailyReview'
      };
    }
    return {
      allowed: true,
      remaining: USAGE_LIMIT.dailyReview - usage.reviewCount
    };
  }

  // 检查每日造句次数
  if (action === 'sentence') {
    if (usage.sentenceCount >= USAGE_LIMIT.dailySentence) {
      return {
        allowed: false,
        reason: '每日造句次数已达上限',
        limit: USAGE_LIMIT.dailySentence,
        remaining: 0,
        limitType: 'dailySentence'
      };
    }
    return {
      allowed: true,
      remaining: USAGE_LIMIT.dailySentence - usage.sentenceCount
    };
  }

  // 检查每日新词添加次数
  if (action === 'newWord') {
    if (usage.newWordCount >= USAGE_LIMIT.dailyNewWord) {
      return {
        allowed: false,
        reason: '每日添加新词已达上限',
        limit: USAGE_LIMIT.dailyNewWord,
        remaining: 0,
        limitType: 'dailyNewWord'
      };
    }
    return {
      allowed: true,
      remaining: USAGE_LIMIT.dailyNewWord - usage.newWordCount
    };
  }

  // 检查每日学习时长
  if (action === 'studyTime') {
    if (usage.studyTime >= USAGE_LIMIT.dailyStudyTime) {
      return {
        allowed: false,
        reason: '每日学习时长已达上限',
        limit: USAGE_LIMIT.dailyStudyTime,
        remaining: 0,
        limitType: 'dailyStudyTime'
      };
    }
    return {
      allowed: true,
      remaining: USAGE_LIMIT.dailyStudyTime - usage.studyTime
    };
  }

  // 未知操作类型
  return {
    allowed: true,
    remaining: Infinity
  };
}

/**
 * 记录操作使用次数
 * @param {string} userId 用户ID
 * @param {string} action 操作类型（'review' | 'sentence' | 'newWord' | 'studyTime'）
 * @param {number} amount 数量（默认1）
 */
function recordUsage(userId, action, amount = 1) {
  const today = getTodayString();
  const records = getUsageRecords();

  // 初始化今日记录
  if (!records.records[today]) {
    records.records[today] = {};
  }

  // 初始化用户记录
  if (!records.records[today][userId]) {
    records.records[today][userId] = {
      reviewCount: 0,
      sentenceCount: 0,
      newWordCount: 0,
      studyTime: 0
    };
  }

  // 更新使用次数
  const usage = records.records[today][userId];
  if (action === 'review') {
    usage.reviewCount += amount;
  } else if (action === 'sentence') {
    usage.sentenceCount += amount;
  } else if (action === 'newWord') {
    usage.newWordCount += amount;
  } else if (action === 'studyTime') {
    usage.studyTime += amount;
  }

  saveUsageRecords(records);
}

/**
 * 增加学习时长
 * @param {string} userId 用户ID
 * @param {number} minutes 增加的分钟数
 */
function addStudyTime(userId, minutes) {
  recordUsage(userId, 'studyTime', minutes * 60 * 1000);
}

/**
 * 重置今日使用记录（用于测试或用户手动重置）
 * @param {string} userId 用户ID
 */
function resetTodayUsage(userId) {
  const today = getTodayString();
  const records = getUsageRecords();

  if (records.records[today] && records.records[today][userId]) {
    records.records[today][userId] = {
      reviewCount: 0,
      sentenceCount: 0,
      newWordCount: 0,
      studyTime: 0
    };
    saveUsageRecords(records);
  }
}

/**
 * 清空所有使用记录
 */
function clearAllUsageRecords() {
  const records = initializeUsageRecords();
  saveUsageRecords(records);
}

/**
 * 获取所有使用记录（用于调试和数据分析）
 * @returns {Object} 所有使用记录
 */
function getAllUsageRecords() {
  return getUsageRecords();
}

/**
 * 导出使用记录为 JSON
 * @returns {string} JSON 字符串
 */
function exportUsageRecords() {
  const records = getUsageRecords();
  return JSON.stringify(records, null, 2);
}

/**
 * 从 JSON 导入使用记录
 * @param {string} jsonString JSON 字符串
 */
function importUsageRecords(jsonString) {
  try {
    const records = JSON.parse(jsonString);
    saveUsageRecords(records);
  } catch (error) {
    console.error('导入使用记录失败:', error);
    throw new Error('JSON 格式错误');
  }
}

/**
 * 清空所有使用记录
 */
function clearAllUsageRecords() {
  localStorage.removeItem(STORAGE_KEY);
}

// 导出公共 API
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    USAGE_LIMIT,
    STORAGE_KEY,
    getTodayString,
    initializeUsageRecords,
    getUsageRecords,
    saveUsageRecords,
    getUserTodayUsage,
    checkUsageLimit,
    recordUsage,
    addStudyTime,
    resetTodayUsage,
    clearAllUsageRecords,
    getAllUsageRecords,
    exportUsageRecords,
    importUsageRecords
  };
}
