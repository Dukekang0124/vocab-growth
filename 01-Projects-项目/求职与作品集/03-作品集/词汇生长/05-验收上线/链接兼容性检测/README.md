# 链接兼容性检测工具

> 用途：检测产品链接在微信、抖音等主流平台的打开支持状态
> **关键检测点**：微信白名单机制、抖音链接拦截、浏览器兼容性
> 创建：2026-08-28

---

## 一、工具概述

本工具提供完整的链接兼容性检测方案，支持以下功能：

1. **单平台检测**：检测链接在特定平台的打开支持状态
2. **批量检测**：检测链接在所有主流平台的兼容性
3. **支持率统计**：自动计算平台支持率并提供改进建议
4. **环境检测**：检测当前运行环境（微信/浏览器）
5. **测试链接生成**：一键生成测试链接

---

## 二、文件说明

| 文件 | 说明 |
|:--|:--|
| `link-compatibility-checker.js` | 核心检测模块（检测逻辑） |
| `test-link-compatibility.html` | 测试页面（可视化界面） |
| `README.md` | 本文档 |

---

## 三、快速开始

### 方式一：使用测试页面（推荐）

1. **启动本地服务器**
   ```bash
   cd vocab-growth-app
   node server.js 8430
   ```

2. **访问测试页面**
   - 打开浏览器访问：`http://127.0.0.1:8430/test-link-compatibility.html`
   - 或直接打开 `test-link-compatibility.html` 文件

3. **输入产品链接并检测**
   - 点击「🧪 使用测试链接」生成 GitHub Pages 链接
   - 点击「🔍 开始检测」查看检测结果

### 方式二：浏览器控制台使用

1. **加载检测模块**
   ```javascript
   // 在浏览器控制台执行
   const LinkCompatibilityChecker = window.LinkCompatibilityChecker;
   ```

2. **生成测试链接**
   ```javascript
   const testLink = LinkCompatibilityChecker.generateTestLink();
   console.log('测试链接:', testLink);
   ```

3. **检查单个平台支持**
   ```javascript
   const wechatResult = LinkCompatibilityChecker.checkPlatformSupport(
     testLink,
     'wechat'
   );
   console.log('微信支持:', wechatResult);
   ```

4. **批量检查所有平台**
   ```javascript
   const allResults = LinkCompatibilityChecker.checkAllPlatforms(testLink);
   console.log('所有平台检测结果:', allResults);
   ```

5. **获取支持总结**
   ```javascript
   const summary = LinkCompatibilityChecker.getSupportSummary(testLink);
   console.log('支持总结:', summary);
   console.log('支持率:', summary.supportRate + '%');
   ```

---

## 四、平台支持矩阵

| 平台标识 | 平台名称 | 支持状态 | 说明 |
|:--|:--|:--|:--|
| `wechat` | 微信 | ✅ 支持 | 需域名白名单 |
| `wechat_chat` | 微信聊天群 | ✅ 支持 | 需域名白名单 |
| `wechat_private` | 微信私聊 | ✅ 支持 | 需域名白名单 |
| `douyin_chat_group` | 抖音聊天群 | ❌ 不支持 | 仅支持外链跳转 |
| `douyin_private_chat` | 抖音私聊 | ❌ 不支持 | 仅支持外链跳转 |
| `douyin_short_video` | 抖音短视频 | ✅ 支持 | 需点击"去网页" |
| `browser` | 浏览器 | ✅ 支持 | 所有现代浏览器 |

**关键限制**：
- **微信**：需要域名在微信公众平台配置白名单（业务域名）
- **抖音**：不支持通过链接打开应用内页面，仅支持外链跳转
- **HTTPS**：微信/抖音要求链接必须使用 `https://` 协议

---

## 五、检测结果说明

### 5.1 返回对象结构

```javascript
{
  platform: 'wechat',
  platformName: '微信',
  supported: true,
  reason: '需要域名在微信公众平台配置白名单',
  status: 'supported',  // 'supported' | 'unsupported' | 'invalid_format' | 'domain_not_whitelisted'
  notes: [
    '需要域名在微信公众平台配置白名单',
    '链接需要以 https:// 开头'
  ],
  details: {
    url: 'https://yourname.github.io/vocab-growth-app/',
    protocol: 'https:',
    domain: 'yourname.github.io',
    path: '/',
    hashRouting: true
  }
}
```

### 5.2 状态码说明

| 状态码 | 含义 | 处理建议 |
|:--|:--|:--|
| `supported` | 平台支持 | 可正常打开 |
| `unsupported` | 平台不支持 | 需调整推广策略 |
| `invalid_format` | 链接格式错误 | 检查协议和格式 |
| `domain_not_whitelisted` | 域名未白名单 | 需配置微信公众平台白名单 |

---

## 六、微信白名单配置指南

### 6.1 配置步骤

1. **登录微信公众平台**
   - 访问：https://mp.weixin.qq.com/
   - 使用管理员账号登录

2. **进入业务域名配置**
   - 左侧导航 → 设置 → 功能设置 → 业务域名

3. **添加域名**
   - 填写域名（无需 `https://`）
   - 例如：`yourname.github.io` 或 `vocab.growth.app`

4. **下载验证文件**
   - 下载 `MP_verify_xxxxx.txt`
   - 将文件上传到你的 GitHub Pages 或自定义域名根目录

5. **保存配置**
   - 点击"保存"按钮

### 6.2 验证白名单

配置完成后，等待 10-30 分钟生效，然后使用检测工具验证：

```javascript
const result = LinkCompatibilityChecker.checkPlatformSupport(
  'https://yourname.github.io/vocab-growth-app/',
  'wechat'
);
console.log(result.supported);  // 应该为 true
```

---

## 七、抖音链接处理策略

### 7.1 抖音限制说明

- **不支持**：通过链接直接打开抖音群聊或私聊页面
- **支持**：外链跳转到浏览器（需用户点击"去网页"）

### 7.2 推荐引流方式

**方式一：抖音短视频引流**
```
抖音短视频 → 点击"去网页" → 跳转到产品页面
```

**方式二：抖音主页外链**
```
抖音个人主页 → 添加外链 → 用户点击外链按钮 → 跳转到产品页面
```

**方式三：私信引流**
```
抖音私信 → 发送短视频链接 → 用户点击"去网页" → 跳转到产品页面
```

### 7.3 抖音链接检测

检测抖音链接打开状态：

```javascript
// 抖音聊天群（不支持）
const douyinGroupResult = LinkCompatibilityChecker.checkPlatformSupport(
  'https://yourname.github.io/vocab-growth-app/',
  'douyin_chat_group'
);
console.log(douyinGroupResult.supported);  // false

// 抖音短视频（支持）
const douyinVideoResult = LinkCompatibilityChecker.checkPlatformSupport(
  'https://yourname.github.io/vocab-growth-app/',
  'douyin_short_video'
);
console.log(douyinVideoResult.supported);  // true
```

---

## 八、使用场景示例

### 场景一：产品上线前兼容性检查

```javascript
// 生成测试链接
const testLink = LinkCompatibilityChecker.generateTestLink();

// 批量检测所有平台
const allResults = LinkCompatibilityChecker.checkAllPlatforms(testLink);

// 获取支持总结
const summary = LinkCompatibilityChecker.getSupportSummary(testLink);

console.log('支持率:', summary.supportRate + '%');
console.log('支持的平台:', summary.supportedPlatforms);
console.log('不支持的平台:', summary.unsupportedPlatforms);

// 输出改进建议
summary.recommendations.forEach(function(rec) {
  console.log('[' + rec.priority + '] ' + rec.message);
  console.log('  -> ' + rec.action);
});
```

**输出示例**：
```
支持率: 57.1%
支持的平台: ['wechat', 'wechat_chat', 'wechat_private', 'browser']
不支持的平台: ['douyin_chat_group', 'douyin_private_chat']

[high] 微信链接未支持，需要配置微信公众平台域名白名单
  -> 在微信公众平台配置业务域名

[medium] 抖音聊天群和私聊不支持链接打开，建议通过短视频引流
  -> 创建抖音短视频分享链接
```

### 场景二：实时检测当前平台

```javascript
// 获取当前平台信息
const currentPlatform = LinkCompatibilityChecker.getCurrentPlatform();
console.log('当前平台:', currentPlatform.name);

// 判断是否在微信环境
if (currentPlatform.isWechat) {
  console.log('正在微信浏览器中运行');
  // 显示微信专属提示
} else {
  console.log('正在普通浏览器中运行');
  // 显示浏览器专属提示
}
```

### 场景三：验证链接格式

```javascript
// 验证链接格式
const formatCheck = LinkCompatibilityChecker.validateLinkFormat(
  'https://yourname.github.io/vocab-growth-app/'
);

console.log('链接有效:', formatCheck.valid);
console.log('协议:', formatCheck.protocol);
console.log('域名:', formatCheck.domain);
console.log('路径:', formatCheck.path);

// 检查域名白名单
const domainCheck = LinkCompatibilityChecker.checkDomainWhitelist(
  'https://yourname.github.io/vocab-growth-app/'
);

console.log('域名在白名单:', domainCheck.valid);
```

---

## 九、常见问题

### Q1: 为什么检测显示"链接格式无效"？

**原因**：
- 链接缺少 `https://` 前缀
- 链接格式不正确（如包含空格、特殊字符）

**解决**：
```javascript
const url = 'https://yourname.github.io/vocab-growth-app/';  // 必须以 https:// 开头
```

### Q2: 微信检测显示"域名未在白名单中"怎么办？

**原因**：域名未在微信公众平台配置白名单

**解决**：参考"六、微信白名单配置指南"

### Q3: 抖音聊天群检测显示"不支持"怎么办？

**原因**：抖音本身不支持通过链接打开应用内页面

**解决**：使用抖音短视频引流（参考"七、抖音链接处理策略"）

### Q4: 如何检测当前页面是否在微信中打开？

**解决**：
```javascript
const isWechat = LinkCompatibilityChecker.isRunningOnPlatform('wechat');
console.log('是否在微信中:', isWechat);
```

### Q5: 检测结果中的 notes 是什么意思？

**说明**：`notes` 数组包含平台特定的注意事项或配置要求，例如：
```javascript
{
  platform: 'wechat',
  notes: [
    '需要域名在微信公众平台配置白名单',
    '链接需要以 https:// 开头',
    '复制到聊天中点击打开需要微信版本 ≥ 7.0.0'
  ]
}
```

---

## 十、技术实现细节

### 10.1 检测逻辑

1. **链接格式验证**
   - 检查协议（必须 `https://`）
   - 检查链接长度（最大 2048 字符）
   - 解析域名和路径

2. **域名白名单检查**
   - 检查域名是否在白名单中
   - 支持子域名匹配（如 `yourname.github.io` 匹配 `user.github.io`）

3. **平台特定检查**
   - 微信：检查域名白名单 + hash 路由支持
   - 抖音：判断平台不支持应用内打开
   - 浏览器：默认支持

### 10.2 平台配置

```javascript
const PLATFORM_CONFIG = {
  wechat: {
    name: '微信',
    supported: true,
    notes: [
      '需要域名在微信公众平台配置白名单',
      '链接需要以 https:// 开头'
    ]
  },
  douyin_chat_group: {
    name: '抖音聊天群',
    supported: false,
    reason: '抖音不支持通过链接打开群聊内部页面',
    notes: [
      '抖音群聊链接会直接跳转到抖音网页版或外部浏览器',
      '建议使用抖音短视频链接引流'
    ]
  }
};
```

### 10.3 导出方式

- **浏览器环境**：挂载到 `window.LinkCompatibilityChecker`
- **Node.js 环境**：使用 `module.exports` 导出

---

## 十一、测试清单

在产品上线前，请完成以下检测：

- [ ] **微信端检测**
  - [ ] 微信个人对话点击链接打开
  - [ ] 微信群聊点击链接打开
  - [ ] 微信中复制链接后点击打开
  - [ ] 链接打开后页面布局正常

- [ ] **浏览器端检测**
  - [ ] Chrome 浏览器打开
  - [ ] Safari 浏览器打开
  - [ ] Firefox 浏览器打开
  - [ ] Edge 浏览器打开

- [ ] **抖音端检测**
  - [ ] 抖音短视频分享链接跳转正常
  - [ ] 抖音主页外链跳转正常
  - [ ] 抖音私信链接跳转正常

- [ ] **链接格式检测**
  - [ ] HTTPS 协议正常
  - [ ] Hash 路由正常（#today/#learn/#review）
  - [ ] 链接长度正常（<2048 字符）

---

## 十二、更新日志

### v1.0.0 (2026-08-28)

- ✨ 初始版本发布
- 🎯 支持微信/抖音/浏览器 7 个平台检测
- 📊 支持率统计与改进建议
- 🌐 环境检测（微信/浏览器）
- 📝 完整的文档与使用示例

---

## 十三、联系与支持

- **问题反馈**：通过浏览器开发者工具（F12）查看控制台错误
- **功能建议**：通过 GitHub Issues 反馈
- **技术支持**：参考本 README 文档

---

**最后更新**：2026-08-28 | **版本**：v1.0.0 | **作者**：ZCode（九思搭档）
