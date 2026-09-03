// 词汇生长 - 跨平台兼容性验证脚本
// 用于自动化验证各平台兼容性和性能指标

const COMPATIBILITY_VERIFICATION = (function () {
  'use strict';

  // 验证结果存储
  const verificationResults = {
    timestamp: Date.now(),
    platform: null,
    basicChecks: {},
    performanceChecks: {},
    functionalChecks: {},
    stabilityChecks: {},
    overall: {
      passed: false,
      score: 0,
      grade: 'F'
    }
  };

  // 平台检测验证
  function verifyPlatformDetection() {
    const platform = CROSS_PLATFORM.detectPlatform();
    verificationResults.platform = platform;
    
    const checks = {
      platformDetection: {
        passed: platform && typeof platform === 'object',
        message: '平台检测功能正常'
      },
      userAgent: {
        passed: !!platform.userAgent,
        message: `User-Agent: ${platform.userAgent.substring(0, 50)}...`
      },
      deviceType: {
        passed: platform.isMobile || platform.isDesktop,
        message: platform.isDesktop ? '桌面端' : '移动端'
      },
      osType: {
        passed: platform.isIOS || platform.isAndroid || platform.isDesktop,
        message: platform.isIOS ? 'iOS' : platform.isAndroid ? 'Android' : '其他系统'
      }
    };
    
    verificationResults.basicChecks = checks;
    return checks;
  }

  // 性能验证
  function verifyPerformance() {
    const performanceData = CROSS_PLATFORM.monitorPerformance();
    
    if (!performanceData) {
      verificationResults.performanceChecks = {
        message: '性能监控不可用'
      };
      return verificationResults.performanceChecks;
    }
    
    const validationResult = CROSS_PLATFORM.validatePerformance(performanceData);
    
    const checks = {
      pageLoadTime: {
        passed: validationResult.results.pageLoad.passed,
        value: validationResult.results.pageLoad.value,
        limit: validationResult.results.pageLoad.limit,
        message: `页面加载时间: ${validationResult.results.pageLoad.value}ms (限制: ${validationResult.results.pageLoad.limit}ms)`
      },
      ttfb: {
        passed: validationResult.results.ttfb.passed,
        value: validationResult.results.ttfb.value,
        limit: validationResult.results.ttfb.limit,
        message: `首字节时间: ${validationResult.results.ttfb.value}ms (限制: ${validationResult.results.ttfb.limit}ms)`
      },
      domContentLoaded: {
        passed: validationResult.results.domContentLoaded.passed,
        value: validationResult.results.domContentLoaded.value,
        limit: validationResult.results.domContentLoaded.limit,
        message: `DOM加载时间: ${validationResult.results.domContentLoaded.value}ms (限制: ${validationResult.results.domContentLoaded.limit}ms)`
      },
      overallPerformance: {
        passed: validationResult.allPassed,
        message: validationResult.allPassed ? '整体性能达标' : '性能不达标'
      }
    };
    
    if (performanceData.memoryMetrics) {
      checks.memoryUsage = {
        passed: performanceData.memoryMetrics.usedJSHeapSize < 150,
        value: performanceData.memoryMetrics.usedJSHeapSize,
        message: `内存使用: ${performanceData.memoryMetrics.usedJSHeapSize.toFixed(2)}MB`
      };
    }
    
    verificationResults.performanceChecks = checks;
    return checks;
  }

  // 功能验证
  function verifyFunctionality() {
    const checks = {
      domLoaded: {
        passed: document.readyState === 'complete' || document.readyState === 'interactive',
        message: `DOM状态: ${document.readyState}`
      },
      mainElements: {
        passed: !!document.getElementById('app') && !!document.getElementById('main'),
        message: '主要DOM元素存在'
      },
      navigationElements: {
        passed: !!document.getElementById('mainNav'),
        message: '导航元素存在'
      },
      localStorage: {
        passed: checkLocalStorage(),
        message: 'localStorage 功能正常'
      },
      audioSupport: {
        passed: checkAudioSupport(),
        message: '音频支持正常'
      },
      touchSupport: {
        passed: 'ontouchstart' in window,
        message: '触摸支持正常'
      }
    };
    
    verificationResults.functionalChecks = checks;
    return checks;
  }

  // 检查localStorage
  function checkLocalStorage() {
    try {
      const testKey = 'compatibility_test_' + Date.now();
      localStorage.setItem(testKey, 'test');
      localStorage.removeItem(testKey);
      return true;
    } catch (e) {
      return false;
    }
  }

  // 检查音频支持
  function checkAudioSupport() {
    const audio = document.createElement('audio');
    return audio.canPlayType && audio.canPlayType('audio/mpeg') !== '';
  }

  // 稳定性验证
  function verifyStability() {
    const errorLogs = CROSS_PLATFORM.getErrorLogs();
    
    const checks = {
      recentErrors: {
        passed: errorLogs.filter(log => {
          const logTime = log.timestamp;
          const now = Date.now();
          const oneHourAgo = now - 3600000; // 1小时前
          return logTime > oneHourAgo;
        }).length === 0,
        value: errorLogs.length,
        message: `最近1小时错误数: ${errorLogs.length}`
      },
      errorRate: {
        passed: errorLogs.length < 10,
        value: errorLogs.length,
        message: `总错误数: ${errorLogs.length}`
      },
      resourceLoading: {
        passed: checkResourceLoading(),
        message: '资源加载正常'
      }
    };
    
    verificationResults.stabilityChecks = checks;
    return checks;
  }

  // 检查资源加载
  function checkResourceLoading() {
    // 检查关键资源是否加载
    const criticalResources = [
      'css/style.css',
      'js/app.js'
    ];
    
    let allLoaded = true;
    const missingResources = [];
    
    criticalResources.forEach(resource => {
      const link = document.querySelector(`link[href="${resource}"]`);
      const script = document.querySelector(`script[src="${resource}"]`);
      
      if (!link && !script) {
        allLoaded = false;
        missingResources.push(resource);
      }
    });
    
    return allLoaded;
  }

  // 计算总体分数
  function calculateOverallScore() {
    let totalChecks = 0;
    let passedChecks = 0;
    
    // 统计基本检查
    Object.values(verificationResults.basicChecks).forEach(check => {
      totalChecks++;
      if (check.passed) passedChecks++;
    });
    
    // 统计性能检查
    Object.values(verificationResults.performanceChecks).forEach(check => {
      if (check.passed !== undefined) {
        totalChecks++;
        if (check.passed) passedChecks++;
      }
    });
    
    // 统计功能检查
    Object.values(verificationResults.functionalChecks).forEach(check => {
      totalChecks++;
      if (check.passed) passedChecks++;
    });
    
    // 统计稳定性检查
    Object.values(verificationResults.stabilityChecks).forEach(check => {
      totalChecks++;
      if (check.passed) passedChecks++;
    });
    
    const score = totalChecks > 0 ? (passedChecks / totalChecks) * 100 : 0;
    
    // 评级
    let grade = 'F';
    if (score >= 95) grade = 'A+';
    else if (score >= 90) grade = 'A';
    else if (score >= 85) grade = 'B+';
    else if (score >= 80) grade = 'B';
    else if (score >= 75) grade = 'C+';
    else if (score >= 70) grade = 'C';
    else if (score >= 60) grade = 'D';
    
    verificationResults.overall = {
      passed: score >= 70,
      score: score.toFixed(1),
      grade,
      totalChecks,
      passedChecks
    };
    
    return verificationResults.overall;
  }

  // 执行完整验证
  function runFullVerification() {
    console.log('🧪 开始跨平台兼容性验证...');
    
    // 执行各项验证
    verifyPlatformDetection();
    verifyPerformance();
    verifyFunctionality();
    verifyStability();
    
    // 计算总体分数
    calculateOverallScore();
    
    // 显示结果
    displayResults();
    
    // 保存结果
    saveResults();
    
    return verificationResults;
  }

  // 显示验证结果
  function displayResults() {
    const results = verificationResults;
    
    console.log('📊 跨平台兼容性验证结果:');
    console.log('='.repeat(50));
    
    // 平台信息
    console.log('🔍 平台信息:');
    console.log(`  平台: ${results.platform.isDesktop ? '桌面端' : '移动端'}`);
    console.log(`  系统: ${results.platform.isIOS ? 'iOS' : results.platform.isAndroid ? 'Android' : '其他'}`);
    if (results.platform.isWeChat) console.log(`  微信: 是`);
    if (results.platform.isDouyin) console.log(`  抖音: 是`);
    if (results.platform.isXinghongshu) console.log(`  小红书: 是`);
    
    // 基本检查
    console.log('📋 基本检查:');
    Object.entries(results.basicChecks).forEach(([key, check]) => {
      const status = check.passed ? '✅' : '❌';
      console.log(`  ${status} ${key}: ${check.message}`);
    });
    
    // 性能检查
    console.log('⚡ 性能检查:');
    Object.entries(results.performanceChecks).forEach(([key, check]) => {
      const status = check.passed === undefined ? '⏭️' : (check.passed ? '✅' : '❌');
      console.log(`  ${status} ${key}: ${check.message}`);
    });
    
    // 功能检查
    console.log('🎯 功能检查:');
    Object.entries(results.functionalChecks).forEach(([key, check]) => {
      const status = check.passed ? '✅' : '❌';
      console.log(`  ${status} ${key}: ${check.message}`);
    });
    
    // 稳定性检查
    console.log('🛡️ 稳定性检查:');
    Object.entries(results.stabilityChecks).forEach(([key, check]) => {
      const status = check.passed ? '✅' : '❌';
      console.log(`  ${status} ${key}: ${check.message}`);
    });
    
    // 总体结果
    console.log('🎯 总体结果:');
    console.log(`  分数: ${results.overall.score}`);
    console.log(`  等级: ${results.overall.grade}`);
    console.log(`  通过: ${results.overall.passed ? '✅' : '❌'}`);
    console.log('='.repeat(50));
    
    // 在页面上显示结果（可选）
    showResultsOnPage();
  }

  // 在页面上显示结果
  function showResultsOnPage() {
    const results = verificationResults;
    
    // 创建结果显示容器
    let resultContainer = document.getElementById('compatibility-results');
    if (!resultContainer) {
      resultContainer = document.createElement('div');
      resultContainer.id = 'compatibility-results';
      resultContainer.style.cssText = `
        position: fixed;
        top: 10px;
        right: 10px;
        background: rgba(255, 255, 255, 0.95);
        border: 1px solid #ccc;
        border-radius: 8px;
        padding: 15px;
        box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        z-index: 10000;
        max-width: 300px;
        font-size: 12px;
        font-family: monospace;
      `;
      document.body.appendChild(resultContainer);
    }
    
    const overallClass = results.overall.passed ? 'passed' : 'failed';
    const overallColor = results.overall.passed ? 'green' : 'red';
    
    resultContainer.innerHTML = `
      <div style="font-weight: bold; margin-bottom: 10px;">兼容性验证</div>
      <div style="color: ${overallColor}; font-weight: bold;">
        ${results.overall.grade} ${results.overall.score}%
      </div>
      <div style="margin-top: 5px;">
        平台: ${results.platform.isDesktop ? '桌面' : '移动'}
        ${results.platform.isWeChat ? ' | 微信' : ''}
        ${results.platform.isDouyin ? ' | 抖音' : ''}
        ${results.platform.isXinghongshu ? ' | 小红书' : ''}
      </div>
      <div style="margin-top: 5px; font-size: 10px;">
        基本检查: ${Object.values(results.basicChecks).filter(c => c.passed).length}/${Object.keys(results.basicChecks).length}<br>
        性能检查: ${Object.values(results.performanceChecks).filter(c => c.passed).length}/${Object.keys(results.performanceChecks).length}<br>
        功能检查: ${Object.values(results.functionalChecks).filter(c => c.passed).length}/${Object.keys(results.functionalChecks).length}<br>
        稳定性检查: ${Object.values(results.stabilityChecks).filter(c => c.passed).length}/${Object.keys(results.stabilityChecks).length}
      </div>
      <button onclick="document.getElementById('compatibility-results').remove()" 
              style="margin-top: 10px; padding: 5px 10px; cursor: pointer;">
        关闭
      </button>
    `;
  }

  // 保存验证结果
  function saveResults() {
    try {
      const existingResults = JSON.parse(localStorage.getItem('compatibility_verification_results') || '[]');
      existingResults.push(verificationResults);
      
      // 只保留最近20次验证结果
      if (existingResults.length > 20) {
        existingResults.splice(0, existingResults.length - 20);
      }
      
      localStorage.setItem('compatibility_verification_results', JSON.stringify(existingResults));
    } catch (error) {
      console.error('保存验证结果失败:', error);
    }
  }

  // 导出验证结果
  function exportResults() {
    const blob = new Blob([JSON.stringify(verificationResults, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `compatibility_verification_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  // 获取历史验证结果
  function getHistoricalResults() {
    try {
      return JSON.parse(localStorage.getItem('compatibility_verification_results') || '[]');
    } catch (error) {
      return [];
    }
  }

  // 清空历史验证结果
  function clearHistoricalResults() {
    localStorage.removeItem('compatibility_verification_results');
  }

  // 暴露公共API
  return {
    runFullVerification,
    verifyPlatformDetection,
    verifyPerformance,
    verifyFunctionality,
    verifyStability,
    displayResults,
    exportResults,
    getHistoricalResults,
    clearHistoricalResults,
    results: verificationResults
  };
})();

// 导出到全局作用域
window.COMPATIBILITY_VERIFICATION = COMPATIBILITY_VERIFICATION;

// 添加全局快捷键
document.addEventListener('keydown', function(e) {
  // Ctrl+Shift+V 运行验证
  if (e.ctrlKey && e.shiftKey && e.key === 'V') {
    e.preventDefault();
    COMPATIBILITY_VERIFICATION.runFullVerification();
  }
});

// 页面加载后自动运行验证（可选）
// window.addEventListener('load', () => {
//   COMPATIBILITY_VERIFICATION.runFullVerification();
// });