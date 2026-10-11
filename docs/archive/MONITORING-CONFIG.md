# 词汇生长 - 监控系统配置

> 本文档提供完整的监控系统配置方案，帮助实时监控应用性能和用户行为。

---

## 📊 监控系统架构

### 1.1 监控目标

**核心监控指标**：
- 用户增长：DAU、MAU、新增用户数
- 用户留存：D7、D30、D90留存率
- 使用行为：学习频率、学习时长、功能使用率
- 技术性能：页面加载速度、兼容性、稳定性
- 付费转化：付费转化率、付费用户数、LTV

**监控频率**：
- 实时监控：关键性能指标（页面加载、错误率）
- 每日监控：用户行为数据、使用频率
- 每周监控：留存率、付费转化
- 每月监控：用户增长、LTV

### 1.2 监控工具栈

**免费工具**：
- **Google Analytics**：用户行为分析
- **自研监控系统**：localStorage + 定期导出分析
- **浏览器控制台日志**：开发调试

**付费工具**（商业化版本）：
- **Mixpanel / Amplitude**：用户行为分析
- **Sentry**：错误监控
- **New Relic**：性能监控

---

## 📈 自研监控系统实现

### 2.1 数据收集机制

#### 2.1.1 用户行为数据收集

**数据结构**：
```javascript
// 用户行为数据
const userBehaviorData = {
  userId: generateUserId(), // 基于localStorage的匿名ID
  timestamp: Date.now(),
  page: window.location.hash || 'home',
  action: 'click|view|submit', // 用户操作类型
  element: 'button|link|form', // 操作元素
  module: 'dashboard|learn|review|sentence|chunks|vocabulary', // 模块名称
  data: { // 额外数据
    wordId: 'word_001',
    actionType: 'review_completed',
    reviewTime: 15000, // 复习耗时（毫秒）
    successRate: 0.8, // 复习成功率
    sentenceQuality: 'good|bad|skip' // 造句质量
  }
};
```

**收集方式**：
```javascript
// 监控初始化
function initMonitoring() {
  // 生成匿名用户ID
  const userId = getUserId();
  
  // 记录页面访问
  recordPageView();
  
  // 监听用户操作
  document.addEventListener('click', (e) => {
    const target = e.target;
    const behavior = {
      userId,
      timestamp: Date.now(),
      page: window.location.hash || 'home',
      action: 'click',
      element: target.tagName.toLowerCase(),
      module: getModuleFromElement(target),
      data: {
        elementId: target.id,
        elementClass: target.className,
        text: target.textContent.trim()
      }
    };
    sendBehaviorData(behavior);
  });
  
  // 监听表单提交
  document.addEventListener('submit', (e) => {
    const form = e.target;
    const behavior = {
      userId,
      timestamp: Date.now(),
      page: window.location.hash || 'home',
      action: 'submit',
      element: 'form',
      module: getModuleFromForm(form),
      data: {
        formId: form.id,
        formData: getFormData(form)
      }
    };
    sendBehaviorData(behavior);
  });
}
```

#### 2.1.2 性能数据收集

**性能指标**：
```javascript
// 性能监控
function monitorPerformance() {
  // 页面加载时间
  const loadTime = window.performance.timing.loadEventEnd - window.performance.timing.navigationStart;
  
  // 内存使用情况
  const memoryUsage = getMemoryUsage();
  
  // CPU使用情况
  const cpuUsage = getCpuUsage();
  
  // 网络请求时间
  const networkTime = getNetworkTime();
  
  // 发送性能数据
  sendPerformanceData({
    userId: getUserId(),
    timestamp: Date.now(),
    loadTime,
    memoryUsage,
    cpuUsage,
    networkTime,
    page: window.location.hash || 'home'
  });
}
```

### 2.2 数据存储与导出

#### 2.2.1 本地存储结构

```javascript
// 监控数据存储结构
const monitoringData = {
  userId: 'user_2026_08_28_001',
  createdAt: 1695936000000,
  lastSync: 1695936000000,
  behaviorLogs: [
    {
      timestamp: 1695936001000,
      page: 'review',
      action: 'click',
      module: 'review',
      data: {
        elementId: 'review-button',
        reviewTime: 15000,
        successRate: 0.8
      }
    }
  ],
  performanceLogs: [
    {
      timestamp: 1695936001000,
      loadTime: 850,
      memoryUsage: 45,
      cpuUsage: 2.5,
      networkTime: 200
    }
  ],
  errorLogs: [
    {
      timestamp: 1695936001000,
      page: 'review',
      error: 'TTS发音失败',
      stack: 'Error: Audio not supported'
    }
  ]
};
```

#### 2.2.2 数据导出功能

```javascript
// 导出监控数据
function exportMonitoringData() {
  const data = getMonitoringData();
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `monitoring_data_${new Date().toISOString().split('T')[0]}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

// 导入监控数据（仅用于分析）
function importMonitoringData(file) {
  const reader = new FileReader();
  reader.onload = (e) => {
    const data = JSON.parse(e.target.result);
    saveMonitoringData(data);
    showNotification('监控数据导入成功');
  };
  reader.readAsText(file);
}
```

### 2.3 数据分析脚本

#### 2.3.1 用户增长分析

```javascript
// 用户增长分析脚本
function analyzeUserGrowth() {
  const data = getMonitoringData();
  const behaviorLogs = data.behaviorLogs;
  
  // 计算DAU（日活跃用户数）
  const dailyActiveUsers = calculateDailyActiveUsers(behaviorLogs);
  
  // 计算MAU（月活跃用户数）
  const monthlyActiveUsers = calculateMonthlyActiveUsers(behaviorLogs);
  
  // 计算新增用户数
  const newUsers = calculateNewUsers(behaviorLogs);
  
  return {
    dailyActiveUsers,
    monthlyActiveUsers,
    newUsers,
    growthRate: calculateGrowthRate(dailyActiveUsers)
  };
}

// 计算日活跃用户数
function calculateDailyActiveUsers(behaviorLogs) {
  const dailyUsers = {};
  behaviorLogs.forEach(log => {
    const date = new Date(log.timestamp).toISOString().split('T')[0];
    dailyUsers[date] = (dailyUsers[date] || 0) + 1;
  });
  return dailyUsers;
}
```

#### 2.3.2 留存率分析

```javascript
// 留存率分析脚本
function analyzeRetention() {
  const data = getMonitoringData();
  const behaviorLogs = data.behaviorLogs;
  
  // 计算D7留存率
  const d7Retention = calculateRetention(behaviorLogs, 7);
  
  // 计算D30留存率
  const d30Retention = calculateRetention(behaviorLogs, 30);
  
  // 计算D90留存率
  const d90Retention = calculateRetention(behaviorLogs, 90);
  
  return {
    d7Retention,
    d30Retention,
    d90Retention,
    averageRetention: (d7Retention + d30Retention + d90Retention) / 3
  };
}

// 计算留存率
function calculateRetention(behaviorLogs, days) {
  const firstVisitDates = {};
  const returnVisitDates = {};
  
  behaviorLogs.forEach(log => {
    const userId = log.userId;
    const date = new Date(log.timestamp).toISOString().split('T')[0];
    
    if (!firstVisitDates[userId]) {
      firstVisitDates[userId] = date;
    } else if (!returnVisitDates[userId]) {
      returnVisitDates[userId] = date;
    }
  });
  
  const retainedUsers = Object.keys(returnVisitDates).filter(userId => {
    const firstDate = firstVisitDates[userId];
    const returnDate = returnVisitDates[userId];
    const daysDiff = (new Date(returnDate) - new Date(firstDate)) / (1000 * 60 * 60 * 24);
    return daysDiff <= days;
  });
  
  return retainedUsers.length / Object.keys(firstVisitDates).length;
}
```

#### 2.3.3 功能使用率分析

```javascript
// 功能使用率分析脚本
function analyzeFeatureUsage() {
  const data = getMonitoringData();
  const behaviorLogs = data.behaviorLogs;
  
  // 计算各模块使用次数
  const moduleUsage = {};
  behaviorLogs.forEach(log => {
    const module = log.module;
    moduleUsage[module] = (moduleUsage[module] || 0) + 1;
  });
  
  // 计算总使用次数
  const totalUsage = Object.values(moduleUsage).reduce((sum, count) => sum + count, 0);
  
  // 计算使用率
  const usageRate = {};
  Object.keys(moduleUsage).forEach(module => {
    usageRate[module] = (moduleUsage[module] / totalUsage * 100).toFixed(2) + '%';
  });
  
  return {
    moduleUsage,
    totalUsage,
    usageRate,
    topModules: Object.entries(usageRate)
      .sort((a, b) => parseFloat(b[1]) - parseFloat(a[1]))
      .slice(0, 5)
  };
}
```

---

## 🔧 监控系统集成

### 3.1 集成到应用

#### 3.1.1 初始化监控

```javascript
// 在 app.js 中初始化监控
document.addEventListener('DOMContentLoaded', () => {
  // 初始化监控
  initMonitoring();
  
  // 监控性能
  monitorPerformance();
  
  // 设置错误监控
  setErrorMonitoring();
  
  // 定期同步数据
  setInterval(syncMonitoringData, 5 * 60 * 1000); // 每5分钟同步一次
});
```

#### 3.1.2 错误监控

```javascript
// 错误监控
function setErrorMonitoring() {
  // 捕获JavaScript错误
  window.onerror = (message, source, lineno, colno, error) => {
    const errorData = {
      userId: getUserId(),
      timestamp: Date.now(),
      page: window.location.hash || 'home',
      error: message,
      source,
      lineno,
      colno,
      stack: error?.stack
    };
    sendErrorData(errorData);
    return false;
  };
  
  // 捕获Promise错误
  window.addEventListener('unhandledrejection', (event) => {
    const errorData = {
      userId: getUserId(),
      timestamp: Date.now(),
      page: window.location.hash || 'home',
      error: event.reason?.message || 'Promise rejection',
      stack: event.reason?.stack
    };
    sendErrorData(errorData);
  });
}
```

### 3.2 监控数据面板

#### 3.2.1 开发者仪表板

```html
<!-- 开发者仪表板 -->
<div id="monitoring-dashboard" class="monitoring-dashboard">
  <h2>📊 监控数据面板</h2>
  
  <div class="dashboard-grid">
    <!-- 用户增长 -->
    <div class="dashboard-card">
      <h3>用户增长</h3>
      <div class="stat-item">
        <span>DAU</span>
        <span id="dau-value">0</span>
      </div>
      <div class="stat-item">
        <span>MAU</span>
        <span id="mau-value">0</span>
      </div>
      <div class="stat-item">
        <span>新增用户</span>
        <span id="new-users-value">0</span>
      </div>
    </div>
    
    <!-- 留存率 -->
    <div class="dashboard-card">
      <h3>留存率</h3>
      <div class="stat-item">
        <span>D7留存</span>
        <span id="d7-retention-value">0%</span>
      </div>
      <div class="stat-item">
        <span>D30留存</span>
        <span id="d30-retention-value">0%</span>
      </div>
      <div class="stat-item">
        <span>D90留存</span>
        <span id="d90-retention-value">0%</span>
      </div>
    </div>
    
    <!-- 功能使用率 -->
    <div class="dashboard-card">
      <h3>功能使用率</h3>
      <div class="stat-item">
        <span>复习模块</span>
        <span id="review-usage-value">0%</span>
      </div>
      <div class="stat-item">
        <span>造句模块</span>
        <span id="sentence-usage-value">0%</span>
      </div>
      <div class="stat-item">
        <span>说法库</span>
        <span id="chunks-usage-value">0%</span>
      </div>
    </div>
    
    <!-- 性能指标 -->
    <div class="dashboard-card">
      <h3>性能指标</h3>
      <div class="stat-item">
        <span>页面加载</span>
        <span id="load-time-value">0ms</span>
      </div>
      <div class="stat-item">
        <span>内存使用</span>
        <span id="memory-usage-value">0MB</span>
      </div>
      <div class="stat-item">
        <span>错误率</span>
        <span id="error-rate-value">0%</span>
      </div>
    </div>
  </div>
  
  <!-- 数据导出 -->
  <div class="export-section">
    <button onclick="exportMonitoringData()">导出监控数据</button>
    <input type="file" id="import-file" accept=".json" onchange="importMonitoringData(this.files[0])">
    <label for="import-file">导入监控数据</label>
  </div>
</div>
```

#### 3.2.2 数据可视化

```javascript
// 数据可视化
function updateDashboard() {
  // 更新用户增长数据
  const growthData = analyzeUserGrowth();
  document.getElementById('dau-value').textContent = Object.keys(growthData.dailyActiveUsers).length;
  document.getElementById('mau-value').textContent = Object.keys(growthData.monthlyActiveUsers).length;
  document.getElementById('new-users-value').textContent = growthData.newUsers;
  
  // 更新留存率数据
  const retentionData = analyzeRetention();
  document.getElementById('d7-retention-value').textContent = (retentionData.d7Retention * 100).toFixed(1) + '%';
  document.getElementById('d30-retention-value').textContent = (retentionData.d30Retention * 100).toFixed(1) + '%';
  document.getElementById('d90-retention-value').textContent = (retentionData.d90Retention * 100).toFixed(1) + '%';
  
  // 更新功能使用率
  const usageData = analyzeFeatureUsage();
  document.getElementById('review-usage-value').textContent = usageData.usageRate.review || '0%';
  document.getElementById('sentence-usage-value').textContent = usageData.usageRate.sentence || '0%';
  document.getElementById('chunks-usage-value').textContent = usageData.usageRate.chunks || '0%';
  
  // 更新性能指标
  const performanceData = getPerformanceData();
  document.getElementById('load-time-value').textContent = performanceData.loadTime + 'ms';
  document.getElementById('memory-usage-value').textContent = performanceData.memoryUsage + 'MB';
  document.getElementById('error-rate-value').textContent = (performanceData.errorRate * 100).toFixed(1) + '%';
}

// 定期更新仪表板
setInterval(updateDashboard, 60 * 1000); // 每分钟更新一次
```

---

## 📋 监控检查清单

### 4.1 功能完整性检查

- [ ] 监控系统初始化正常
- [ ] 用户行为数据收集正常
- [ ] 性能数据收集正常
- [ ] 错误监控正常
- [ ] 数据导出/导入功能正常
- [ ] 仪表板显示正常

### 4.2 数据准确性检查

- [ ] DAU计算准确
- [ ] 留存率计算准确
- [ ] 功能使用率计算准确
- [ ] 性能指标准确
- [ ] 错误率统计准确

### 4.3 性能影响检查

- [ ] 监控系统对页面加载时间影响 < 100ms
- [ ] 监控系统内存占用 < 10MB
- [ ] 监控系统CPU占用率 < 2%

### 4.4 兼容性检查

- [ ] iOS Safari 监控正常
- [ ] Android Chrome 监控正常
- [ ] 微信浏览器监控正常
- [ ] 电脑端浏览器监控正常

---

## 🚀 生产环境部署

### 5.1 部署步骤

#### 5.1.1 GitHub Pages 部署

**步骤1：创建 GitHub 仓库**
```bash
# 创建新仓库
gh repo create vocab-growth --public --clone

# 克隆仓库
git clone https://github.com/your-username/vocab-growth.git
cd vocab-growth
```

**步骤2：上传代码**
```bash
# 复制应用代码
cp -r /path/to/vocab-growth-app/* .

# 添加 .gitignore
echo "node_modules/" > .gitignore
echo "dist/" >> .gitignore
echo "build/" >> .gitignore

# 初始化 git
git init
git add .
git commit -m "Initial commit: 词汇生长 MVP v1.0"
git push -u origin main
```

**步骤3：启用 GitHub Pages**
1. 登录 GitHub
2. 进入仓库设置
3. 选择 "Pages"
4. 选择 "main" 分支
5. 选择 "/docs" 或根目录
6. 启用 GitHub Pages

**步骤4：配置域名（可选）**
1. 购买域名（如 vocab-growth.com）
2. 配置 DNS（A记录指向 GitHub Pages IP）
3. 在 GitHub Pages 设置中配置自定义域名

#### 5.1.2 部署验证

**验证步骤**：
1. 访问部署的 URL
2. 检查所有功能是否正常
3. 检查监控数据是否收集
4. 检查错误日志是否正常

### 5.2 部署检查清单

- [ ] GitHub Pages 部署成功
- [ ] HTTPS 证书有效
- [ ] 域名可访问
- [ ] CDN 加速生效
- [ ] 所有功能正常
- [ ] 监控系统正常
- [ ] 错误日志正常

---

## 📊 监控指标目标

### 6.1 用户指标目标

| 指标 | 目标 | 监控频率 |
|:--|:--|:--|
| DAU（日活跃用户数） | > 50（上线1周） | 每日 |
| MAU（月活跃用户数） | > 1000（上线1个月） | 每日 |
| D7留存率 | > 30% | 每日 |
| D30留存率 | > 20% | 每周 |
| D90留存率 | > 10% | 每月 |

### 6.2 使用行为指标目标

| 指标 | 目标 | 监控频率 |
|:--|:--|:--|
| 每日学习次数 | > 3次/日 | 每日 |
| 每周学习天数 | > 5天/周 | 每周 |
| 复习模块使用率 | > 80% | 每日 |
| 造句模块使用率 | > 60% | 每日 |
| 说法库使用率 | > 50% | 每日 |

### 6.3 技术指标目标

| 指标 | 目标 | 监控频率 |
|:--|:--|:--|
| 首屏加载时间 | < 1秒 | 实时 |
| 完整页面加载时间 | < 2秒 | 实时 |
| 内存占用 | < 200MB | 实时 |
| CPU占用率 | < 5% | 实时 |
| 错误率 | < 1% | 实时 |

---

## 📞 联系与支持

### 问题反馈
通过应用内的反馈功能提交问题，我们会尽快回复。

### 监控系统支持
如需监控系统支持，请联系：[联系邮箱]

---

**文档版本**: v1.0.0
**最后更新**: 2026-08-28
**适用版本**: 词汇生长 MVP v1.0
**作者**: ZCode（九思搭档）
**状态**: 🟢 已完成