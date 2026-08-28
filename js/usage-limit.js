/**
 * 词汇生长 - 使用限制模块
 * 功能：限制每日复习次数、造句次数、新词添加次数和学习时长
 * 存储方式：localStorage (key: vocab_growth_usage_v1)
 */

// 使用类型枚举
const USAGE_TYPE = {
  REVIEW: 'review',      // 复习次数
  SENTENCE: 'sentence',   // 造句次数
  NEW_WORD: 'new_word',   // 新词添加次数
  STUDY_TIME: 'study_time' // 学习时长（毫秒）
};

// 使用限制配置
const USAGE_LIMITS = {
  daily: {
    [USAGE_TYPE.REVIEW]: 10,        // 每日最多复习10次
    [USAGE_TYPE.SENTENCE]: 5,       // 每日最多造句5次
    [USAGE_TYPE.NEW_WORD]: 3,       // 每日最多添加3个新词
    [USAGE_TYPE.STUDY_TIME]: 30 * 60 * 1000  // 每日最多学习30分钟
  }
};

// 存储键名
const USAGE_STORAGE_KEY = 'vocab_growth_usage_v1';

/**
 * 初始化使用数据结构
 * @returns {Object} 初始化的使用数据对象
 */
function initializeUsageData() {
  return {
    date: new Date().toISOString().split('T')[0],  // 当前日期 YYYY-MM-DD
    records: {
      [USAGE_TYPE.REVIEW]: 0,
      [USAGE_TYPE.SENTENCE]: 0,
      [USAGE_TYPE.NEW_WORD]: 0,
      [USAGE_TYPE.STUDY_TIME]: 0
    }
  };
}

/**
 * 获取使用数据
 * @returns {Object} 使用数据对象
 */
function getUsageData() {
  try {
    const data = localStorage.getItem(USAGE_STORAGE_KEY);
    if (!data) {
      return initializeUsageData();
    }
    
    const usageData = JSON.parse(data);
    
    // 检查是否是今天的数据，如果不是则重置
    const today = new Date().toISOString().split('T')[0];
    if (usageData.date !== today) {
      return initializeUsageData();
    }
    
    return usageData;
  } catch (error) {
    console.error('读取使用数据失败:', error);
    return initializeUsageData();
  }
}

/**
 * 保存使用数据
 * @param {Object} usageData 使用数据对象
 */
function saveUsageData(usageData) {
  try {
    localStorage.setItem(USAGE_STORAGE_KEY, JSON.stringify(usageData));
  } catch (error) {
    console.error('保存使用数据失败:', error);
  }
}

/**
 * 记录使用次数
 * @param {string} type 使用类型
 * @param {number} count 次数（可选，默认1）
 * @returns {Object} { success: boolean, message: string, remaining: number }
 */
function recordUsage(type, count = 1) {
  if (!USAGE_TYPE[type]) {
    return {
      success: false,
      message: '无效的使用类型',
      remaining: 0
    };
  }
  
  const usageData = getUsageData();
  const currentCount = usageData.records[type];
  const limit = USAGE_LIMITS.daily[type];
  
  // 检查是否超过限制
  if (currentCount >= limit) {
    return {
      success: false,
      message: `今日${type}次数已用完（${limit}次）`,
      remaining: 0
    };
  }
  
  // 计算剩余次数
  const remaining = limit - currentCount - count;
  if (remaining < 0) {
    return {
      success: false,
      message: `今日${type}次数已用完（${limit}次）`,
      remaining: 0
    };
  }
  
  // 记录使用
  usageData.records[type] += count;
  saveUsageData(usageData);
  
  return {
    success: true,
    message: `记录成功，剩余${remaining}次`,
    remaining: remaining
  };
}

/**
 * 添加学习时间
 * @param {number} milliseconds 毫秒数
 * @returns {Object} { success: boolean, message: string, remaining: number }
 */
function addStudyTime(milliseconds) {
  const usageData = getUsageData();
  const currentStudyTime = usageData.records[USAGE_TYPE.STUDY_TIME];
  const limit = USAGE_LIMITS.daily[USAGE_TYPE.STUDY_TIME];
  
  // 检查是否超过时间限制
  if (currentStudyTime >= limit) {
    return {
      success: false,
      message: `今日学习时间已用完（${limit / (60 * 1000)}分钟）`,
      remaining: 0
    };
  }
  
  // 计算剩余时间
  const remaining = limit - currentStudyTime - milliseconds;
  if (remaining < 0) {
    return {
      success: false,
      message: `今日学习时间已用完（${limit / (60 * 1000)}分钟）`,
      remaining: 0
    };
  }
  
  // 记录学习时间
  usageData.records[USAGE_TYPE.STUDY_TIME] += milliseconds;
  saveUsageData(usageData);
  
  // 转换为分钟显示
  const remainingMinutes = Math.max(0, Math.floor(remaining / (60 * 1000)));
  
  return {
    success: true,
    message: `学习时间记录成功，剩余${remainingMinutes}分钟`,
    remaining: remainingMinutes
  };
}

/**
 * 获取使用统计
 * @returns {Object} 使用统计
 */
function getUsageStats() {
  const usageData = getUsageData();
  const stats = {
    date: usageData.date,
    total: 0,
    byType: usageData.records,
    remaining: {}
  };
  
  // 计算各类型剩余次数
  for (const type in USAGE_TYPE) {
    const limit = USAGE_LIMITS.daily[type];
    stats.remaining[type] = limit - usageData.records[type];
  }
  
  // 计算总使用次数
  stats.total = Object.values(usageData.records).reduce((sum, count) => sum + count, 0);
  
  return stats;
}

/**
 * 清空所有使用记录
 */
function clearAllUsageRecords() {
  localStorage.removeItem(USAGE_STORAGE_KEY);
}

/**
 * 检查是否达到使用限制
 * @param {string} type 使用类型
 * @returns {boolean} 是否达到限制
 */
function isUsageLimitReached(type) {
  const usageData = getUsageData();
  const currentCount = usageData.records[type];
  const limit = USAGE_LIMITS.daily[type];
  
  return currentCount >= limit;
}

/**
 * 获取使用限制信息
 * @returns {Object} 限制信息
 */
function getUsageLimits() {
  return {
    daily: USAGE_LIMITS.daily,
    remaining: getUsageStats().remaining
  };
}

// 导出公共 API
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    USAGE_TYPE,
    USAGE_LIMITS,
    USAGE_STORAGE_KEY,
    initializeUsageData,
    getUsageData,
    saveUsageData,
    recordUsage,
    addStudyTime,
    getUsageStats,
    clearAllUsageRecords,
    isUsageLimitReached,
    getUsageLimits
  };
}
