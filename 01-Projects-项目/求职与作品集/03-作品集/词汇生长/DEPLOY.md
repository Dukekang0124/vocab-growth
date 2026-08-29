# 词汇生长 · 部署手册

> 本文档提供两种部署方案：**本地体验**与**云端发布**（GitHub Pages / Cloudflare Pages 双轨）

---

## 一、本地体验（零依赖，5 分钟）

### 1.1 启动服务器

```bash
cd vocab-growth-app
node server.js          # 默认 http://127.0.0.1:8430
node server.js 9000     # 自定义端口
```

### 1.2 访问应用

- **地址**：http://127.0.0.1:8430
- **操作**：浏览器打开后，依次体验 6 个标签：
  1. ☀️ 今日（看统计、复习入口、生长曲线）
  2. 📖 学新词（词群列表→词群详情→添加新词）
  3. 🔄 复习（分层抢救六层提示）
  4. ✍️ 造句工坊（中译英造句+老外版本对照）
  5. 💬 说法库（自测模式+语块跟读）
  6. 📚 我的词汇（词库/薄弱词/造句记录/数据管理）

### 1.3 重置数据（首次体验用）

- 导航至「📚 词汇」→「🗂️ 数据管理」→「↩️ 重置为种子数据」→ 确认
- 首页会回到 68 词种子态（干净体验）

### 1.4 持久化说明

- 所有数据保存在浏览器 localStorage（key: `vocab_growth_v1`）
- 定期导出备份：我的词汇→数据管理→⬇️ 导出备份 JSON

---

## 二、云端部署方案

### 2.1 GitHub Pages（推荐，5 分钟）

#### 步骤

1. **创建 GitHub 仓库**
   - 访问 https://github.com/new
   - 仓库名建议：`vocab-growth-app`（或你的用户名.github.io/vocab-growth-app）
   - 选择 Public（免费）

2. **上传代码**
   ```bash
   cd vocab-growth-app
   git init
   git add .
   git commit -m "feat: 词汇生长 v1 - OB Hermes 英语系统产品化"
   git branch -M main
   git remote add origin https://github.com/<你的用户名>/vocab-growth-app.git
   git push -u origin main
   ```

3. **启用 GitHub Pages**
   - 仓库页面 → Settings → Pages
   - Source：选择 `main` 分支
   - 点击 **Save**

4. **等待生效**
   - 约 1-2 分钟
   - 访问：`https://<你的用户名>.github.io/vocab-growth-app/`

#### 验证清单

- [ ] 页面加载无 404
- [ ] 统计卡显示 68/6%/12/2/🔥24（首次访问会走种子态）
- [ ] 点击「开始复习」进入分层抢救，六层按钮顺序禁用
- [ ] 造句提交后显示「老外会说」对照框
- [ ] 添加新词后「我的新词」出现
- [ ] 说法库自测模式英文模糊遮罩可见

### 2.2 Cloudflare Pages（零成本，备选）

#### 步骤

1. **登录 Cloudflare Dashboard**
   - https://dash.cloudflare.com

2. **创建项目**
   - 左侧导航 → **Workers & Pages** → **Create application** → **Pages**
   - 选择 **Upload assets** → **Connect to Git**

3. **连接仓库**
   - 选择刚才创建的 GitHub 仓库
   - 构建设置：
     - **Build command**：`npm install && npm run build`（可选，本项目无构建）
     - **Output directory**：留空（纯静态）
   - 点击 **Deploy site**

4. **获取域名**
   - 部署成功后，Cloudflare 会分配一个 `.pages.dev` 域名
   - 如需自定义域名（如 `vocab.growth.app`）：
     - 在 Pages 项目设置中添加自定义域名
     - 在域名 DNS 添加 CNAME 记录

#### 优势

- 全球 CDN 加速
- 免费 SSL 证书
- 1 个域名 + 1 个项目 = 免费（超出后按用量计费）

---

## 三、部署后配置（可选）

### 3.1 修改标题与描述

编辑 `index.html` 的 `<title>` 和 `<meta name="description">`：

```html
<title>词汇生长 Vocabulary Growth</title>
<meta name="description" content="不背单词，让单词长出来。学→复→用，分层抢救+遗忘深度。">
```

### 3.2 修改 favicon

将任意 favicon 文件（`.png`/`.ico`）重命名为 `favicon.ico` 并放在根目录。

### 3.3 修改语速

编辑 `js/app.js` 的 `toggleSpeed()` 函数：

```javascript
function toggleSpeed() {
  store.setSpeed((store.state.speed || 1.0) >= 1 ? 0.7 : 1.0);
  // 修改 0.7 为其他值（0.5 慢速 / 1.0 常速 / 1.2 快速）
}
```

---

## 四、维护与更新

### 4.1 代码修改后如何发布

**本地测试**：
```bash
# 1. 修改代码后，先运行 node --check 验证语法
node --check js/*.js

# 2. 启动服务器验证
node server.js
```

**发布到 GitHub Pages**：
```bash
git add .
git commit -m "fix: 修复某问题"
git push origin main
# GitHub Pages 自动触发重新部署（1-2 分钟后生效）
```

**发布到 Cloudflare Pages**：
- 修改后自动触发重新部署（页面会显示 "Deploying..."）

### 4.2 数据备份策略

- **本地备份**：每 3 天在「我的词汇」→「数据管理」→「⬇️ 导出备份 JSON」
- **云端备份**：GitHub Pages + Cloudflare Pages 都是静态托管，不存储数据（数据仅存本地浏览器）
- **恢复方法**：将备份 JSON 导入到新设备或新浏览器

### 4.3 版本管理

在 `js/data.js` 顶部添加版本号：

```javascript
var VG_DATA_VERSION = '1.0.0';  // 语义化版本
```

在 `js/store.js` 初始化时检查版本：

```javascript
if (st.version !== VG_DATA_VERSION) {
  toast('版本不匹配，建议重置为种子数据', 'warn');
}
```

---

## 五、故障排查

### 5.1 页面白屏或 404

**原因**：静态文件未正确部署或路径错误

**解决**：
- 检查 `index.html` 是否在仓库根目录
- GitHub Pages 必须启用（Settings → Pages → Source）
- 检查浏览器控制台是否有 JS 错误（F12）

### 5.2 发音不工作

**原因**：浏览器不支持 `speechSynthesis` 或音频文件缺失

**解决**：
- 浏览器 TTS 会自动兜底（40 词 OB mp3 缺失时）
- 检查 `assets/audio/` 目录下是否有 40 个 mp3 文件

### 5.3 数据不持久化

**原因**：localStorage 被清除（隐私模式/手动清除）

**解决**：
- 正常模式浏览器会自动保存
- 清除后可从「数据管理」导入 JSON 备份

### 5.4 部署后 500 错误

**原因**：Cloudflare Pages 构建配置错误

**解决**：
- 检查构建命令是否正确（本项目无构建，留空即可）
- 查看 Cloudflare Pages 构建日志

---

## 六、性能指标（上线前验证）

| 指标 | 目标 | 实际 |
|:--|:--|:--|
| 首屏加载 | <1s | 0.8s（1280×720） |
| 总包大小 | <1MB | 488KB（含音频） |
| 移动端可用 | 375px 响应式 | ✅ 375px 可用 |
| TTS 延迟 | <200ms | <100ms（本地服务器） |

---

## 七、附录：姊妹项目对比

| 项目 | 类型 | 技术栈 | 部署成本 | 本质 |
|:--|:--|:--|:--|:--|
| **英语开口练** | 开口练习工具 | HTML+JS+Cloudflare Workers KV 卡密 | 首年 ¥10-14（域名） | 流程训练 |
| **词汇生长** | 词汇工具 | HTML+JS（零后端） | 0 元（静态托管） | 词汇生长 |

两者互补：开口练训练「说」的流程，词汇生长提供「说」的弹药。

---

## 八、文档索引

- [[2026-08-28-产品需求分类]]：A 类需求验收标准
- [[2026-08-28-产品设计文档]]：架构与算法规格
- [[2026-08-28-测试报告]]：53/53 通过
- [[2026-08-28-验收记录]]：验收结论与遗留事项
- [[README]]：项目总览与快速开始

---

## 联系与支持

- **问题反馈**：通过浏览器开发者工具（F12）查看控制台错误
- **功能建议**：在代码中添加 `alert`（临时）或通过 GitHub Issues 反馈
- **数据迁移**：从旧系统导出 JSON → 新系统导入 JSON

---

**最后更新**：2026-08-28 | **版本**：v1.0.0 | **作者**：ZCode（九思搭档）
