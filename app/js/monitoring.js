/**
 * 词汇生长 - 监控系统
 * 功能：用户行为跟踪、性能监控和错误监控
 */

// 监控配置
const MONITORING_CONFIG = {
  enabled: true,
  batchSize: 10,  // 批量上报数量
  flushInterval: 60000,  // 60秒上报一次
  maxRetries: 3,  // 最大重试次数
  debug: false  // 调试模式
};

// 监控数据存储键名
const MONITORING_STORAGE_KEY = 'vocab_growth_monitoring_v1';

/**
 * 初始化监控数据结构
 * @returns {Object} 初始化的监控数据对象
 */
function initializeMonitoringData() {
  return {
    events: [],  // 事件队列
    errors: [],  // 错误队列
    performance: [],  // 性能数据
    sessions: [],  // 会话数据
    userId: 'user_' + Math.random().toString(36).substr(2, 9)  // 随机用户ID
  };
}

/**
 * 获取监控数据
 * @returns {Object} 监控数据对象
 */
function getMonitoringData() {
  try {
    const data = localStorage.getItem(MONITORING_STORAGE_KEY);
    return data ? JSON.parse(data) : initializeMonitoringData();
  } catch (error) {
    console.error('读取监控数据失败:', error);
    return initializeMonitoringData();
  }
}

/**
 * 保存监控数据
 * @param {Object} monitoringData 监控数据对象
 */
function saveMonitoringData(monitoringData) {
  try {
    localStorage.setItem(MONITORING_STORAGE_KEY, JSON.stringify(monitoringData));
  } catch (error) {
    console.error('保存监控数据失败:', error);
  }
}

/**
 * 记录用户事件
 * @param {string} eventName 事件名称
 * @param {Object} eventData 事件数据
 */
function trackEvent(eventName, eventData = {}) {
  if (!MONITORING_CONFIG.enabled) {
    return;
  }

  const monitoringData = getMonitoringData();
  const event = {
    id: Date.now(),
    eventName,
    eventData,
    timestamp: new Date().toISOString(),
    userId: monitoringData.userId
  };

  monitoringData.events.push(event);
  saveMonitoringData(monitoringData);

  // 如果达到批量大小，立即上报
  if (monitoringData.events.length >= MONITORING_CONFIG.batchSize) {
    flushEvents();
  }
}

/**
 * 记录错误
 * @param {Error} error 错误对象
 * @param {Object} context 错误上下文
 */
function trackError(error, context = {}) {
  if (!MONITORING_CONFIG.enabled) {
    return;
  }

  const monitoringData = getMonitoringData();
  const errorData = {
    id: Date.now(),
    error: {
      message: error.message,
      name: error.name,
      stack: error.stack
    },
    context,
    timestamp: new Date().toISOString(),
    userId: monitoringData.userId
  };

  monitoringData.errors.push(errorData);
  saveMonitoringData(monitoringData);

  // 如果达到批量大小，立即上报
  if (monitoringData.errors.length >= MONITORING_CONFIG.batchSize) {
    flushErrors();
  }
}

/**
 * 记录性能数据
 * @param {string} metric 性能指标名称
 * @param {number} value 指标值
 * @param {Object} metadata 元数据
 */
function trackPerformance(metric, value, metadata = {}) {
  if (!MONITORING_CONFIG.enabled) {
    return;
  }

  const monitoringData = getMonitoringData();
  const performanceData = {
    id: Date.now(),
    metric,
    value,
    metadata,
    timestamp: new Date().toISOString(),
    userId: monitoringData.userId
  };

  monitoringData.performance.push(performanceData);
  saveMonitoringData(monitoringData);

  // 如果达到批量大小，立即上报
  if (monitoringData.performance.length >= MONITORING_CONFIG.batchSize) {
    flushPerformance();
  }
}

/**
 * 记录会话数据
 * @param {string} action 会话动作
 * @param {Object} data 会话数据
 */
function trackSession(action, data = {}) {
  if (!MONITORING_CONFIG.enabled) {
    return;
  }

  const monitoringData = getMonitoringData();
  const sessionData = {
    id: Date.now(),
    action,
    data,
    timestamp: new Date().toISOString(),
    userId: monitoringData.userId
  };

  monitoringData.sessions.push(sessionData);
  saveMonitoringData(monitoringData);
}

/**
 * 上报事件数据
 */
function flushEvents() {
  const monitoringData = getMonitoringData();
  if (monitoringData.events.length === 0) {
    return;
  }

  const eventsToReport = monitoringData.events.splice(0, MONITORING_CONFIG.batchSize);
  saveMonitoringData(monitoringData);

  // 实际上报逻辑（这里简化为控制台输出）
  if (MONITORING_CONFIG.debug) {
    console.log('上报事件:', eventsToReport);
  }

  // 在实际应用中，这里会发送到服务器
  // sendToServer('events', eventsToReport);
}

/**
 * 上报错误数据
 */
function flushErrors() {
  const monitoringData = getMonitoringData();
  if (monitoringData.errors.length === 0) {
    return;
  }

  const errorsToReport = monitoringData.errors.splice(0, MONITORING_CONFIG.batchSize);
  saveMonitoringData(monitoringData);

  // 实际上报逻辑（这里简化为控制台输出）
  if (MONITORING_CONFIG.debug) {
    console.log('上报错误:', errorsToReport);
  }

  // 在实际应用中，这里会发送到服务器
  // sendToServer('errors', errorsToReport);
}

/**
 * 上报性能数据
 */
function flushPerformance() {
  const monitoringData = getMonitoringData();
  if (monitoringData.performance.length === 0) {
    return;
  }

  const performanceToReport = monitoringData.performance.splice(0, MONITORING_CONFIG.batchSize);
  saveMonitoringData(monitoringData);

  // 实际上报逻辑（这里简化为控制台输出）
  if (MONITORING_CONFIG.debug) {
    console.log('上报性能数据:', performanceToReport);
  }

  // 在实际应用中，这里会发送到服务器
  // sendToServer('performance', performanceToReport);
}

/**
 * 初始化监控系统
 */
function initMonitoring() {
  // 启动定时上报
  setInterval(() => {
    flushEvents();
    flushErrors();
    flushPerformance();
  }, MONITORING_CONFIG.flushInterval);

  // 监听错误
  window.addEventListener('error', (event) => {
    trackError(event.error, {
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno
    });
  });

  // 监听未处理的 Promise 拒绝
  window.addEventListener('unhandledrejection', (event) => {
    trackError(new Error(event.reason), {
      type: 'unhandledrejection'
    });
  });

  // 记录页面加载性能
  if (performance && performance.timing) {
    const timing = performance.timing;
    const loadTime = timing.loadEventEnd - timing.navigationStart;
    
    trackPerformance('page_load_time', loadTime, {
      navigationStart: timing.navigationStart,
      loadEventEnd: timing.loadEventEnd,
      domContentLoadedEventEnd: timing.domContentLoadedEventEnd
    });
  }

  // 记录会话开始
  trackSession('session_start', {
    userAgent: navigator.userAgent,
    screenWidth: window.screen.width,
    screenHeight: window.screen.height,
    language: navigator.language
  });

  // 记录页面访问
  trackEvent('page_view', {
    url: window.location.href,
    referrer: document.referrer
  });
}

/**
 * 获取监控统计数据
 * @returns {Object} 监控统计数据
 */
function getMonitoringStats() {
  const monitoringData = getMonitoringData();
  
  return {
    totalEvents: monitoringData.events.length,
    totalErrors: monitoringData.errors.length,
    totalPerformance: monitoringData.performance.length,
    totalSessions: monitoringData.sessions.length,
    userId: monitoringData.userId
  };
}

/**
 * 清空所有监控数据
 */
function clearAllMonitoringData() {
  localStorage.removeItem(MONITORING_STORAGE_KEY);
}

// 初始化监控系统
initMonitoring();

// 导出公共 API
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    MONITORING_CONFIG,
    MONITORING_STORAGE_KEY,
    initializeMonitoringData,
    getMonitoringData,
    saveMonitoringData,
    trackEvent,
    trackError,
    trackPerformance,
    trackSession,
    flushEvents,
    flushErrors,
    flushPerformance,
    initMonitoring,
    getMonitoringStats,
    clearAllMonitoringData
  };
}