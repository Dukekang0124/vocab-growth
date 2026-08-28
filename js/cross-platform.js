// 词汇生长 - 跨平台适配模块
// 功能：平台检测、性能监控、跨平台兼容性处理

const CROSS_PLATFORM = (function () {
  'use strict';

  // 平台检测
  function detectPlatform() {
    const userAgent = navigator.userAgent;
    
    // 微信检测
    const isWeChat = /MicroMessenger/i.test(userAgent);
    
    // 抖音检测
    const isDouyin = /aweme/i.test(userAgent);
    
    // 小红书检测
    const isXinghongshu = /Xinghongshu/i.test(userAgent);
    
    // QQ检测
    const isQQ = /QQ/i.test(userAgent);
    
    // 桌面检测
    const isDesktop = !/Mobile|Android|iPhone|iPad|iPod/i.test(userAgent);
    
    // 移动设备检测
    const isMobile = !isDesktop;
    
    // iOS检测
    const isIOS = /iPhone|iPad|iPod/i.test(userAgent);
    
    // Android检测
    const isAndroid = /Android/i.test(userAgent);
    
    // 屏幕尺寸检测
    const screenSize = {
      width: window.innerWidth,
      height: window.innerHeight,
      isSmall: window.innerWidth <= 375,
      isMedium: window.innerWidth > 375 && window.innerWidth <= 768,
      isLarge: window.innerWidth > 768
    };
    
    return {
      isWeChat,
      isDouyin,
      isXinghongshu,
      isQQ,
      isDesktop,
      isMobile,
      isIOS,
      isAndroid,
      screenSize,
      userAgent: userAgent
    };
  }

  // 平台信息
  const platformInfo = detectPlatform();

  // 性能监控
  function monitorPerformance() {
    if (!window.performance) return null;
    
    const performance = window.performance;
    const timing = performance.timing;
    
    // 计算各项性能指标
    const metrics = {
      // DNS查询时间
      dnsLookup: timing.domainLookupEnd - timing.domainLookupStart,
      
      // TCP连接时间
      tcpConnect: timing.connectEnd - timing.connectStart,
      
      // 请求时间
      request: timing.responseStart - timing.requestStart,
      
      // 响应时间
      response: timing.responseEnd - timing.responseStart,
      
      // DOM解析时间
      domParse: timing.domComplete - timing.domInteractive,
      
      // 页面加载总时间
      pageLoad: timing.loadEventEnd - timing.navigationStart,
      
      // 首字节时间（TTFB）
      ttfb: timing.responseStart - timing.navigationStart,
      
      // DOM内容加载时间
      domContentLoaded: timing.domContentLoadedEventEnd - timing.navigationStart,
      
      // 窗口加载完成时间
      windowLoad: timing.loadEventEnd - timing.navigationStart
    };
    
    // 内存使用情况（如果支持）
    let memoryMetrics = null;
    if (performance.memory) {
      memoryMetrics = {
        usedJSHeapSize: performance.memory.usedJSHeapSize / 1024 / 1024, // MB
        totalJSHeapSize: performance.memory.totalJSHeapSize / 1024 / 1024, // MB
        jsHeapSizeLimit: performance.memory.jsHeapSizeLimit / 1024 / 1024 // MB
      };
    }
    
    // 网络信息（如果支持）
    let networkMetrics = null;
    if (navigator.connection) {
      networkMetrics = {
        effectiveType: navigator.connection.effectiveType,
        downlink: navigator.connection.downlink, // Mbps
        rtt: navigator.connection.rtt, // ms
        saveData: navigator.connection.saveData
      };
    }
    
    return {
      metrics,
      memoryMetrics,
      networkMetrics,
      timestamp: Date.now(),
      platform: platformInfo
    };
  }

  // 性能验证
  function validatePerformance(performanceData) {
    const platform = performanceData.platform;
    const metrics = performanceData.metrics;
    
    // 根据平台设置不同的性能标准
    const standards = {
      desktop: {
        pageLoad: 1000, // 1秒
        ttfb: 500,      // 500ms
        domContentLoaded: 800
      },
      mobile: {
        pageLoad: 2000, // 2秒
        ttfb: 800,      // 800ms
        domContentLoaded: 1500
      },
      wechat: {
        pageLoad: 2000, // 2秒
        ttfb: 800,      // 800ms
        domContentLoaded: 1500
      },
      douyin: {
        pageLoad: 2500, // 2.5秒
        ttfb: 1000,     // 1秒
        domContentLoaded: 1800
      },
      xinghongshu: {
        pageLoad: 2500, // 2.5秒
        ttfb: 1000,     // 1秒
        domContentLoaded: 1800
      }
    };
    
    // 选择适用的标准
    let standard = standards.mobile; // 默认移动端
    if (platform.isDesktop) standard = standards.desktop;
    else if (platform.isWeChat) standard = standards.wechat;
    else if (platform.isDouyin) standard = standards.douyin;
    else if (platform.isXinghongshu) standard = standards.xinghongshu;
    
    // 验证各项指标
    const results = {
      pageLoad: {
        value: metrics.pageLoad,
        limit: standard.pageLoad,
        passed: metrics.pageLoad <= standard.pageLoad
      },
      ttfb: {
        value: metrics.ttfb,
        limit: standard.ttfb,
        passed: metrics.ttfb <= standard.ttfb
      },
      domContentLoaded: {
        value: metrics.domContentLoaded,
        limit: standard.domContentLoaded,
        passed: metrics.domContentLoaded <= standard.domContentLoaded
      }
    };
    
    // 总体通过判断
    const allPassed = Object.values(results).every(result => result.passed);
    
    return {
      results,
      allPassed,
      platform: platform.isWeChat ? '微信' : 
               platform.isDouyin ? '抖音' : 
               platform.isXinghongshu ? '小红书' : 
               platform.isDesktop ? '桌面端' : '移动端'
    };
  }

  // 平台特定优化
  function applyPlatformOptimizations() {
    const platform = platformInfo;
    const html = document.documentElement;
    
    // 添加平台类到HTML
    html.classList.add(
      platform.isDesktop ? 'platform-desktop' : 'platform-mobile',
      platform.isIOS ? 'platform-ios' : 'platform-android',
      platform.isWeChat ? 'platform-wechat' : '',
      platform.isDouyin ? 'platform-douyin' : '',
      platform.isXinghongshu ? 'platform-xinghongshu' : ''
    );
    
    // 微信特定优化
    if (platform.isWeChat) {
      applyWeChatOptimizations();
    }
    
    // 抖音特定优化
    if (platform.isDouyin) {
      applyDouyinOptimizations();
    }
    
    // 小红书特定优化
    if (platform.isXinghongshu) {
      applyXinghongshuOptimizations();
    }
    
    // 桌面端特定优化
    if (platform.isDesktop) {
      applyDesktopOptimizations();
    }
  }

  // 微信特定优化
  function applyWeChatOptimizations() {
    // 隐藏微信默认的分享菜单（可选）
    document.addEventListener('WeixinJSBridgeReady', function() {
      if (typeof WeixinJSBridge !== 'undefined') {
        WeixinJSBridge.call('hideOptionMenu');
      }
    }, false);
    
    // 优化微信环境下的音频播放
    document.addEventListener('WeixinJSBridgeReady', function() {
      if (typeof WeixinJSBridge !== 'undefined') {
        WeixinJSBridge.invoke('getNetworkType', {}, function(res) {
          console.log('微信网络类型:', res.err_msg);
        });
      }
    }, false);
  }

  // 抖音特定优化
  function applyDouyinOptimizations() {
    // 优化抖音环境下的全屏显示
    const body = document.body;
    body.style.overscrollBehavior = 'none'; // 禁用滚动回弹
    
    // 处理抖音视频背景的影响
    const app = document.getElementById('app');
    if (app) {
      app.style.zIndex = '9999';
      app.style.position = 'relative';
    }
    
    // 优化音频播放，避免与抖音音频冲突
    document.addEventListener('visibilitychange', function() {
      if (document.hidden) {
        // 页面不可见时暂停音频
        // 实现音频暂停逻辑
      } else {
        // 页面可见时恢复
        // 实现音频恢复逻辑
      }
    });
  }

  // 小红书特定优化
  function applyXinghongshuOptimizations() {
    // 优化图片懒加载
    const images = document.querySelectorAll('img[data-src]');
    images.forEach(img => {
      img.loading = 'lazy';
    });
    
    // 优化长按图片保存功能
    document.addEventListener('contextmenu', function(e) {
      if (e.target.tagName === 'IMG') {
        // 可以在这里添加自定义右键菜单
        // 或者阻止默认的长按保存功能
        e.preventDefault();
      }
    });
  }

  // 桌面端特定优化
  function applyDesktopOptimizations() {
    // 添加键盘导航支持
    document.addEventListener('keydown', function(e) {
      // ESC键返回
      if (e.key === 'Escape') {
        // 返回到今日看板
        if (window.VG_APP && VG_APP.go) {
          VG_APP.go('#today');
        }
      }
      
      // 数字键导航
      const keyMap = {
        '1': '#today',
        '2': '#learn',
        '3': '#review',
        '4': '#workshop',
        '5': '#chunks',
        '6': '#library'
      };
      
      if (keyMap[e.key] && window.VG_APP && VG_APP.go) {
        VG_APP.go(keyMap[e.key]);
      }
    });
    
    // 添加右键菜单处理
    document.addEventListener('contextmenu', function(e) {
      // 可以在这里添加自定义右键菜单
      // 或者阻止默认的右键菜单
      // e.preventDefault();
    });
    
    // 添加桌面通知支持（可选）
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }

  // 错误监控
  function setupErrorMonitoring() {
    // JavaScript错误监控
    window.addEventListener('error', function(e) {
      logError({
        type: 'javascript_error',
        message: e.message,
        filename: e.filename,
        lineno: e.lineno,
        colno: e.colno,
        stack: e.error?.stack,
        platform: platformInfo,
        timestamp: Date.now()
      });
    });
    
    // Promise错误监控
    window.addEventListener('unhandledrejection', function(e) {
      logError({
        type: 'promise_error',
        message: e.reason?.message || 'Promise rejection',
        stack: e.reason?.stack,
        platform: platformInfo,
        timestamp: Date.now()
      });
    });
    
    // 资源加载错误监控
    window.addEventListener('error', function(e) {
      if (e.target !== window) {
        logError({
          type: 'resource_error',
          tagName: e.target.tagName,
          src: e.target.src || e.target.href,
          platform: platformInfo,
          timestamp: Date.now()
        });
      }
    }, true);
  }

  // 错误日志记录
  function logError(errorData) {
    try {
      // 获取现有的错误日志
      const errorLogs = JSON.parse(localStorage.getItem('cross_platform_errors') || '[]');
      
      // 添加新的错误
      errorLogs.push(errorData);
      
      // 只保留最近100个错误
      if (errorLogs.length > 100) {
        errorLogs.splice(0, errorLogs.length - 100);
      }
      
      // 保存到localStorage
      localStorage.setItem('cross_platform_errors', JSON.stringify(errorLogs));
      
      // 在控制台输出
      console.error('[跨平台错误]', errorData);
    } catch (error) {
      console.error('[错误日志记录失败]', error);
    }
  }

  // 获取错误日志
  function getErrorLogs() {
    try {
      return JSON.parse(localStorage.getItem('cross_platform_errors') || '[]');
    } catch (error) {
      return [];
    }
  }

  // 清空错误日志
  function clearErrorLogs() {
    localStorage.removeItem('cross_platform_errors');
  }

  // 导出错误日志
  function exportErrorLogs() {
    const errorLogs = getErrorLogs();
    const blob = new Blob([JSON.stringify(errorLogs, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cross_platform_errors_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  // 自动性能报告
  function startAutoPerformanceReporting(interval = 60000) {
    setInterval(() => {
      const performanceData = monitorPerformance();
      if (performanceData) {
        const validationResult = validatePerformance(performanceData);
        
        // 如果性能不达标，记录到错误日志
        if (!validationResult.allPassed) {
          logError({
            type: 'performance_warning',
            message: `性能不达标 - ${validationResult.platform}`,
            details: validationResult.results,
            platform: platformInfo,
            timestamp: Date.now()
          });
        }
        
        // 可以在这里将性能数据发送到监控系统
        console.log('[性能监控]', validationResult);
      }
    }, interval);
  }

  // 初始化
  function init() {
    // 应用平台优化
    applyPlatformOptimizations();
    
    // 设置错误监控
    setupErrorMonitoring();
    
    // 开始性能监控报告
    startAutoPerformanceReporting(60000); // 每分钟报告一次
    
    // 页面加载完成后进行性能验证
    window.addEventListener('load', () => {
      setTimeout(() => {
        const performanceData = monitorPerformance();
        if (performanceData) {
          const validationResult = validatePerformance(performanceData);
          console.log('[页面性能]', validationResult);
        }
      }, 100); // 延迟100ms确保性能数据完整
    });
  }

  // 暴露公共API
  return {
    detectPlatform,
    monitorPerformance,
    validatePerformance,
    applyPlatformOptimizations,
    setupErrorMonitoring,
    getErrorLogs,
    clearErrorLogs,
    exportErrorLogs,
    startAutoPerformanceReporting,
    init,
    platformInfo
  };
})();

// 自动初始化
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => CROSS_PLATFORM.init());
} else {
  CROSS_PLATFORM.init();
}

// 导出到全局作用域
window.CROSS_PLATFORM = CROSS_PLATFORM;