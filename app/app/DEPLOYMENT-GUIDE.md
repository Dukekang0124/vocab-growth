# 词汇生长 - GitHub Pages 部署指南

## 🚀 部署地址

**本地测试地址**：http://127.0.0.1:8431
**GitHub Pages 地址**：`your-username.github.io/vocab-growth`

## 📋 部署前检查

### ✅ 已完成的检查

- ✅ 服务器正常运行（HTTP 200 OK）
- ✅ 页面结构完整
- ✅ 所有资源文件正常加载
- ✅ 核心功能脚本正常
- ✅ 响应式布局配置正确
- ✅ 代码问题已修复

### 🔧 已修复的问题

1. **代码重复**：删除了 `usage-limit.js` 中的重复函数定义
2. **监控系统集成**：在 `index.html` 中添加了 `monitoring.js` 引用

## 📦 GitHub Pages 部署步骤

### 方法1：手动部署（推荐）

#### 第1步：创建 GitHub 仓库

1. 访问 [GitHub](https://github.com/new)
2. 创建新仓库，命名为 `vocab-growth`
3. 设置为 Public 仓库
4. 不初始化 README（避免文件冲突）
5. 点击 "Create repository"

#### 第2步：连接本地仓库

```bash
cd "D:\写作工具\知识管理\01-Projects-项目\求职与作品集\03-作品集\词汇生长\03-设计开发\vocab-growth-app"

# 添加远程仓库（替换 your-username 为你的GitHub用户名）
git remote add origin https://github.com/your-username/vocab-growth.git

# 重命名分支为 main
git branch -M main
```

#### 第3步：提交并推送代码

```bash
# 添加所有文件
git add .

# 提交更改
git commit -m "Release: 词汇生长 MVP v1.0.0 - 完整功能上线"

# 推送到 GitHub
git push -u origin main
```

#### 第4步：启用 GitHub Pages

1. 进入仓库页面
2. 点击 "Settings" 标签
3. 在左侧菜单中找到 "Pages"
4. 在 "Build and deployment" 部分选择：
   - **Source**: Deploy from a branch
   - **Branch**: main
   - **Folder**: /(root)
5. 点击 "Save"

#### 第5步：等待部署完成

- 部署通常需要 1-2 分钟
- 部署成功后，会显示访问地址
- 访问地址格式：`https://your-username.github.io/vocab-growth/`

### 方法2：使用 GitHub Actions 自动部署

#### 第1步：确认工作流文件

项目已包含 `.github/workflows/deploy.yml` 工作流配置文件。

#### 第2步：提交代码

```bash
git add .
git commit -m "Add GitHub Actions deployment"
git push origin main
```

#### 第3步：启用 GitHub Pages

1. 进入仓库页面
2. 点击 "Settings" 标签
3. 在左侧菜单中找到 "Pages"
4. 在 "Build and deployment" 部分选择：
   - **Source**: GitHub Actions

#### 第4步：等待自动部署

- GitHub Actions 会自动运行部署流程
- 在 "Actions" 标签可以看到部署进度
- 部署成功后会显示绿色勾号

## 🧪 部署后验证

### 验证清单

#### 1. 基础功能检查

- [ ] 页面能正常打开
- [ ] 所有CSS和JavaScript文件正常加载
- [ ] 页面布局正常，无样式错误
- [ ] 导航功能正常工作

#### 2. 核心功能检查

- [ ] 今日看板显示正常
- [ ] 学新词功能正常
- [ ] 复习功能正常
- [ ] 造句工坊正常
- [ ] 说法库功能正常
- [ ] 我的词汇功能正常

#### 3. 响应式布局检查

- [ ] 移动端布局正常（375px）
- [ ] 平板布局正常
- [ ] 桌面端布局正常

#### 4. 交互检查

- [ ] 点击事件正常响应
- [ ] 表单提交正常工作
- [ ] Toast消息正常显示
- [ ] 导航切换正常

#### 5. 数据持久化检查

- [ ] localStorage 正常工作
- [ ] 数据导出功能正常
- [ ] 数据导入功能正常

### 验证方法

#### 自动化验证

```bash
# 检查服务器响应
curl -I https://your-username.github.io/vocab-growth/

# 检查关键文件
curl -I https://your-username.github.io/vocab-growth/css/style.css
curl -I https://your-username.github.io/vocab-growth/js/app.js
```

#### 手动验证

1. 在浏览器中打开部署地址
2. 逐个检查上述清单项目
3. 记录发现的问题

## 🔍 问题排查

### 常见问题

#### 问题1：页面无法打开

**症状**：访问部署地址时显示 404 或其他错误

**解决方法**：
1. 检查 GitHub Pages 是否已启用
2. 确认 Source 和 Branch 设置正确
3. 等待 1-2 分钟，有时需要时间部署
4. 检查浏览器缓存，尝试刷新页面

#### 问题2：样式文件无法加载

**症状**：页面显示但样式混乱

**解决方法**：
1. 检查 CSS 文件是否已提交到仓库
2. 确认文件路径正确
3. 检查浏览器控制台是否有错误信息

#### 问题3：JavaScript 错误

**症状**：功能无法正常工作

**解决方法**：
1. 打开浏览器控制台查看错误信息
2. 检查所有 JavaScript 文件是否已提交
3. 确认文件加载顺序正确

#### 问题4：HTTPS 证书问题

**症状**：浏览器提示证书错误

**解决方法**：
1. GitHub Pages 自动提供 HTTPS
2. 检查是否正确使用 `https://` 前缀
3. 清除浏览器缓存和 Cookie

## 📊 监控和日志

### GitHub Actions 日志

1. 进入仓库页面
2. 点击 "Actions" 标签
3. 选择最近的工作流运行
4. 查看详细日志信息

### GitHub Pages 日志

1. 进入仓库设置
2. 选择 Pages
3. 查看最近的部署状态和错误信息

## 🎯 上线后推广

### 推广渠道

1. **个人社交圈**
   - 朋友圈分享
   - 微信群推广
   - QQ群分享

2. **知识分享平台**
   - 知乎文章
   - 小红书笔记
   - B站视频

3. **技术社区**
   - GitHub 项目展示
   - 掘金社区
   - SegmentFault

4. **英语学习社区**
   - 小花生
   - 扇贝社区
   - 百词斩用户

### 推广材料

已准备完整的推广材料包：
- 产品简介（短/中/长版本）
- 功能特点文案
- 推广文案模板（朋友圈/社群/小红书/知乎）
- 用户指南和常见问题解答

---

**文档版本**: v1.0.0
**最后更新**: 2026-08-28
**适用版本**: 词汇生长 MVP v1.0
**作者**: ZCode（九思搭档）
**状态**: 🟢 **准备就绪，可以部署**