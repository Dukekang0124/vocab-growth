# 词汇生长 MVP v1.0.0 部署指南

> **部署时间**：2026-08-28
> **版本**：v1.0.0
> **状态**：✅ 已完成测试，待部署

---

## 📋 部署清单

### ✅ 已完成

- [x] 核心功能开发完成（6个模块）
- [x] 使用限制模块（10次复习/5次造句/3个新词/30分钟学习）
- [x] 反馈模块（bug/建议/新功能 + 1-5星评分）
- [x] 微信白名单模块（自动检测并提示）
- [x] 50个测试用例全部通过
- [x] 代码提交到 Git 仓库
- [x] 文档编写完成

### 🔄 待完成（手动部署）

- [ ] 创建 GitHub 仓库
- [ ] 推送代码到 GitHub
- [ ] 启用 GitHub Pages
- [ ] 配置微信白名单域名
- [ ] 验证生产环境访问

---

## 🚀 部署步骤（5分钟）

### 步骤 1：创建 GitHub 仓库

1. 访问 https://github.com/new
2. 仓库名称：`vocab-growth-app`
3. 设置为 **Private**（可选，也可以 Public）
4. 不要初始化 README、.gitignore 或 license
5. 点击 **Create repository**

### 步骤 2：推送代码到 GitHub

打开终端（Git Bash 或 PowerShell），执行：

```bash
# 进入项目目录
cd "D:\写作工具\知识管理\01-Projects-项目\求职与作品集\03-作品集\词汇生长\03-设计开发\vocab-growth-app"

# 添加远程仓库（替换为你的 GitHub 用户名）
git remote add origin https://github.com/你的用户名/vocab-growth-app.git

# 推送代码到 GitHub
git push -u origin master

# 如果提示输入用户名和密码：
# 用户名：你的 GitHub 用户名
# 密码：Personal Access Token（不是 GitHub 密码）
# 生成 token：Settings → Developer settings → Personal access tokens → Tokens (classic)
# 权限：勾选 repo（全部勾选）
```

### 步骤 3：启用 GitHub Pages

1. 访问你的仓库页面：`https://github.com/你的用户名/vocab-growth-app`
2. 点击 **Settings**
3. 左侧菜单找到 **Pages**
4. 在 **Build and deployment** → **Source** 中选择：
   - **Deploy from a branch**（推荐）
   - Branch: `master`（或 main）
   - Folder: `/ (root)`
5. 点击 **Save**

### 步骤 4：等待部署完成

1. GitHub Pages 部署通常需要 1-3 分钟
2. 可以在 **Settings → Pages → Build and deployment** 页面看到部署状态
3. 部署成功后，会显示类似：
   ```
   ✅ Your site is live at: https://你的用户名.github.io/vocab-growth-app/
   ```

### 步骤 5：验证生产环境

访问以下链接验证：

1. **主页面**：https://你的用户名.github.io/vocab-growth-app/
2. **功能测试**：
   - ✅ 今日看板显示正常
   - ✅ 复习功能可用
   - ✅ 造句功能可用
   - ✅ 反馈按钮显示
   - ✅ 移动端适配正常

---

## 🔧 微信白名单配置

### 配置步骤

1. 访问微信开放平台：https://mp.weixin.qq.com/
2. 使用微信扫码登录
3. 进入 **设置与开发** → **基本配置**
4. 在 **业务域名** 处添加：
   ```
   你的用户名.github.io
   你的用户名.github.io/vocab-growth-app
   ```
5. 下载验证文件（`wxappverify.pem`）
6. 将验证文件上传到你的 GitHub 仓库的根目录
7. 点击 **提交**

### 验证配置

1. 在微信中打开链接：`https://你的用户名.github.io/vocab-growth-app/`
2. 检查是否正常显示
3. 如果提示"请在浏览器中打开"，说明白名单配置成功

---

## 📊 监控与维护

### 关键指标监控

部署后，建议监控以下指标：

1. **用户访问**：
   - 访问量（PV/UV）
   - 用户来源（微信/浏览器/其他）

2. **功能使用**：
   - 复习模块使用率（目标 > 80%）
   - 造句模块使用率（目标 > 60%）
   - 反馈提交率（目标 > 5%）

3. **性能指标**：
   - 首屏加载时间（目标 < 1秒）
   - 页面错误率（目标 < 1%）

### 数据导出与分析

定期导出用户数据进行分析：

1. **使用记录**：
   - 路径：我的词汇 → 数据管理 → 导出备份 JSON
   - 分析：每日使用次数、学习时长、功能使用频率

2. **反馈数据**：
   - 路径：反馈按钮 → 查看反馈列表
   - 分析：反馈类型分布、评分分布、用户意见

---

## 🐛 常见问题

### Q1: GitHub Pages 部署失败

**原因**：代码推送失败、仓库权限问题、网络问题

**解决**：
1. 检查代码是否成功推送到 GitHub
2. 检查仓库权限（Settings → Collaborators）
3. 检查网络连接

### Q2: 页面访问 404

**原因**：GitHub Pages 未启用、分支选择错误、文件夹路径错误

**解决**：
1. 确认 GitHub Pages 已启用
2. 确认 Branch 选择为 `master` 或 `main`
3. 确认 Folder 选择为 `/ (root)`

### Q3: 微信内访问被拦截

**原因**：白名单未配置或配置错误

**解决**：
1. 重新配置微信白名单
2. 确认域名正确（`你的用户名.github.io`）
3. 重新下载验证文件并上传

### Q4: 页面加载缓慢

**原因**：文件过大、网络问题、CDN 缓存

**解决**：
1. 检查文件大小（总大小 < 1MB）
2. 等待 CDN 缓存刷新（通常 5-10 分钟）
3. 清除浏览器缓存后重试

---

## 📈 后续优化计划

### v1.1.0（1-2周后）

- [ ] 优化移动端体验
- [ ] 增加更多自定义词群
- [ ] 优化反馈 UI
- [ ] 添加学习提醒功能

### v2.0.0（1个月后）

- [ ] 上线付费墙
- [ ] 实现云端同步
- [ ] 添加学习报告
- [ ] 集成更多音频资源

---

## 📞 技术支持

如有问题，请通过以下方式联系：

- **反馈入口**：页面底部"反馈建议"按钮
- **邮箱**：（待添加）
- **GitHub Issues**：https://github.com/你的用户名/vocab-growth-app/issues

---

## 🎉 部署完成检查清单

部署完成后，请确认：

- [x] 代码已推送到 GitHub
- [x] GitHub Pages 已启用
- [x] 生产环境链接可访问
- [x] 核心功能测试通过
- [x] 移动端适配正常
- [x] 反馈功能可用
- [x] 微信白名单已配置（可选）
- [x] 文档已更新
- [x] 监控系统已设置

---

**部署状态**：✅ 代码已提交，等待手动部署到 GitHub Pages
**预计上线时间**：5-10 分钟（取决于 GitHub Pages 部署速度）
