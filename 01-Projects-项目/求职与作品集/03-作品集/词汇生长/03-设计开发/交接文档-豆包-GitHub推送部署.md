# 交接文档：词汇生长 v2「开口练升级版」推送 GitHub 并完成部署

> 交接人：ZCode agent ｜ 接手人：豆包 agent ｜ 日期：2026-08-29
> 目标：把本地已完成、已提交但**未能推送**的代码推送到 GitHub，让 GitHub Pages 自动部署新版。

---

## 一、项目背景与当前进度

### 1.1 项目是什么
「词汇生长 Vocabulary Growth」——一个零框架纯静态英语开口练 Web 应用（HTML + CSS + 原生 JS，无构建、无后端），已部署在 GitHub Pages：
**https://dukekang0124.github.io/vocab-growth/**

### 1.2 本次已完成的工作（全部在本地，未上线）
原「造句工坊」已升级为「🎤 开口练」，对标 OB 英语开口练，包含：

| 模块 | 文件 | 状态 |
|:--|:--|:--|
| 造句评分引擎（语法/完整/自然/词汇四维度 + 中文反馈） | `js/speak-workshop.js` | ✅ 已完成并测试 |
| 难度分级 A1/A2/B1/B2（自动定级 + 按难度给提示） | `js/difficulty-level.js` | ✅ 已完成并测试 |
| 激励机制（积分 + 5 级等级 + 8 枚徽章 + 成就页） | `js/gamification.js` | ✅ 已完成并测试 |
| 开口练页面（4 种练法：造句/句型填空/关键词造句/开口说） | `js/app.js`（workshop 段重写） | ✅ 已完成并测试 |
| 开口说语音评测（Web Speech API，零成本，微信内自动降级） | `js/app.js` | ✅ 已完成并测试 |
| 页面骨架（脚本引入、顶栏积分胶囊、导航改名） | `index.html` | ✅ 已完成 |
| 新样式（评分面板/徽章墙/麦克风按钮等） | `css/style.css`（文件末尾追加） | ✅ 已完成 |
| 持久化扩展（gamification 字段 + saveAll 方法） | `js/store.js` | ✅ 已完成 |

**质量验证已完成**：单元测试 35/35 通过（`node --test test/test-data.js test/test-srs.js test/test-store.js`）；浏览器端到端验证通过（评分、徽章解锁、四种模式均正常）。

### 1.3 当前代码状态（关键！）
- 本地仓库路径：
  `D:\写作工具\知识管理\01-Projects-项目\求职与作品集\03-作品集\词汇生长\03-设计开发\vocab-growth-app`
- 该目录**本身就是一个独立 git 仓库**（不是外层笔记库），远程已配置：
  `origin → https://github.com/Dukekang0124/vocab-growth.git`
- 当前分支：`master`
- **最新提交已在本地完成**（共 2 个，一并推送）：
  - `83b2587` 文档同步 v2（README + V2 验收记录）← **当前顶部**
  - `0a7722f` 开口练升级（7 个文件：4 修改 + 3 新增，是本次核心变更）
  - 除 `vocab-growth-deploy.tar.gz` 外工作区干净；该压缩包是历史部署产物，**不要提交它**。

### 1.4 阻塞点
`git push origin master` 失败：`Recv failure: Connection was reset`（当前网络直连 GitHub 不通，本机未探测到可用代理端口）。代码本身没有任何问题，**只差推送这一步**。

---

## 二、起始阶段：从哪里开始、需要什么前提

**起始动作**：进入上述本地仓库目录，先执行 `git log --oneline -3` 确认顶部提交是 `83b2587`（其下是 `0a7722f` 开口练升级）。如果是，直接进入第三部分第 1 步；如果用户机器上没有该目录（换电脑了），改用第三部分「路径 B：网页上传」。

**前提条件清单**：
| 项目 | 要求 |
|:--|:--|
| 本地代码 | 上述目录存在且含 `0a7722f` 提交（用 `git log` 验证） |
| 仓库地址 | https://github.com/Dukekang0124/vocab-growth （public） |
| 分支 | `master`（GitHub Pages 已配置为 master 分支根目录 `/ (root)`，推送即部署） |
| 账号权限 | GitHub 账号 `Dukekang0124` 的登录态：要么浏览器已登录 GitHub（走网页上传），要么本机 Git 凭据管理器已存有该账号的凭据（走命令行） |
| 网络 | 能访问 github.com（必要时让用户开启其 GitHub 加速器/VPN，或配置代理） |
| ⚠️ 安全红线 | **不要向任何对话索要或让用户粘贴 GitHub 密码/Token**；凭据只通过浏览器登录态或系统凭据管理器使用 |

---

## 三、分步操作指引

### 路径 A：命令行推送（首选，2 分钟）

**第 1 步：确认本地状态**
- 操作：在仓库目录执行
  ```bash
  git log --oneline -3
  git status --short
  ```
- 预期：顶部是 `83b2587`，其下是 `0a7722f`；status 只显示 `?? vocab-growth-deploy.tar.gz`（无其他未提交变更）。

**第 2 步：确认网络能通 GitHub**
- 操作：`curl -s -o /dev/null -w "%{http_code}" https://github.com`
- 预期：输出 `200`。
- 若不通：让用户开启 GitHub 加速器；若加速器是本地代理（常见端口 7890/7897），用
  ```bash
  git -c http.proxy=http://127.0.0.1:7890 push origin master
  ```
  （端口以用户加速器实际显示为准，逐个试探直到 curl 返回 200。）

**第 3 步：推送**
- 操作：`git push origin master`
- 预期：两个本地提交（`0a7722f`、`83b2587`）一起推上去，输出类似 `xxx..83b2587 master -> master`，无报错。
- 若提示需要登录：让用户在弹出的浏览器/凭据窗口登录 `Dukekang0124`，**不要在命令行明文输入密码**。

**第 4 步：确认 GitHub 收到代码**
- 操作：浏览器打开 https://github.com/Dukekang0124/vocab-growth/commits/master
- 预期：顶部出现「开口练升级：即时评分反馈 + 难度分级 + 4种练法 + 积分徽章 + 浏览器语音识别」，时间为刚刚。

**第 5 步：等待 Pages 自动部署并验收**
- 操作：推送后等 1–3 分钟，打开 **https://dukekang0124.github.io/vocab-growth/**（建议强制刷新 Ctrl+F5）。
- 预期（验收清单，全部满足才算成功）：
  1. 顶栏出现两个胶囊：`🔥 x 天` 和 `⭐ 0`（积分）；
  2. 导航栏第 4 个按钮是「🎤 开口练」（不是「✍️ 造句」）；
  3. 点进开口练：能看到 A1/A2/B1/B2 难度行、四种练法行、选词行；
  4. 随便写一句英文（如 `I saw a dolphin jumping alongside the boat.`）点「提交 · 立即评分」：出现绿色评分面板，显示总分（该句应 90+）、四维条、「老外会说」对照句，且 toast 提示 `⭐ +xx 积分`，顶栏 ⭐ 数字增加；
  5. 「📚 词汇」→「🏆 成就」页签存在，能看到徽章墙（首练后 ≥1 枚解锁）。

### 路径 B：网页上传（路径 A 网络始终不通时的兜底，5 分钟）

**第 1 步**：浏览器登录 GitHub 账号 `Dukekang0124`，打开 https://github.com/Dukekang0124/vocab-growth

**第 2 步**：点 `Add file → Upload files`，把本地仓库中以下 **7 个文件**（保持原有目录结构）拖入上传：
```
css/style.css            （修改：覆盖原文件）
index.html               （修改：覆盖原文件）
js/app.js                （修改：覆盖原文件）
js/store.js              （修改：覆盖原文件）
js/speak-workshop.js     （新增）
js/difficulty-level.js   （新增）
js/gamification.js       （新增）
```
- 注意：`js/` 下的文件必须进入 `js` 目录（上传时拖入或先点进 js 文件夹再上传均可，GitHub 会按文件路径自动覆盖）。
- ⚠️ 不要上传 `vocab-growth-deploy.tar.gz`。

**第 3 步**：页面底部 Commit message 填「开口练升级：即时评分反馈+难度分级+4种练法+积分徽章+语音识别」，选择 **Commit directly to the master branch**，点 `Commit changes`。

**第 4 步**：同路径 A 的第 5 步进行验收。

---

## 四、完成标准（结束条件）

全部满足才算任务结束：
1. ✅ `git log origin/master`（或 GitHub commits 页）顶部为 `83b2587`（网页上传路径则需包含相同的 7 个代码文件变更）；
2. ✅ GitHub 仓库文件列表中存在 `js/speak-workshop.js`、`js/difficulty-level.js`、`js/gamification.js` 三个新文件；
3. ✅ https://dukekang0124.github.io/vocab-growth/ 通过上文 5 项验收清单（导航、积分胶囊、评分面板、积分增长、成就页）；
4. ✅ 无需 PR/CI——本项目是单人静态站，push 到 master 即等于上线；仓库若配了 Actions 工作流（deploy.yml），可在仓库 Actions 页看到绿色 ✓。

**完成后向用户汇报**：一句话说明「新版已上线，可以继续把 https://dukekang0124.github.io/vocab-growth/ 发给用户使用」。

---

## 五、注意事项：可能的问题、验证方法与回滚

### 5.1 可能遇到的问题
| 问题 | 判断方法 | 处理 |
|:--|:--|:--|
| push 仍然 Connection reset / timeout | curl github.com 不返回 200 | 换代理端口重试；或直接走路径 B 网页上传 |
| push 提示 403 无权限 | 凭据是别的 GitHub 账号 | 让用户在系统凭据管理器删除旧凭据后重新登录 Dukekang0124 |
| Pages 打开还是旧版 | 强刷后导航仍显示「✍️ 造句」 | 等 1–3 分钟；检查仓库 Settings → Pages 是否为 `master / (root)`；或再 force refresh |
| 线上页面白屏 | 打开 F12 Console 看报错 | 多为文件路径/大小写问题：确认三个新 js 文件在 `js/` 目录且文件名全小写 |
| 语音按钮灰色不可点 | 「🎤 开口说」按钮 disabled | 正常降级：微信内置浏览器不支持语音识别，属预期行为，提示换 Chrome/Edge 即可 |

### 5.2 本地验证方法（不动线上）
```bash
cd "D:\写作工具\知识管理\01-Projects-项目\求职与作品集\03-作品集\词汇生长\03-设计开发\vocab-growth-app"
node server.js        # 打开 http://127.0.0.1:8430 验证
node --test test/test-data.js test/test-srs.js test/test-store.js   # 35/35 应全过
```

### 5.3 回滚方案
- **命令行回滚**：在仓库执行
  ```bash
  git revert 83b2587 0a7722f --no-edit && git push origin master
  ```
  Pages 会自动部署回旧版（revert 会生成新提交，不改写历史，最安全）。
- **网页回滚**：仓库页进入对应被覆盖的文件（如 `js/app.js`）→ History → 选 revert 前的版本 → 复制旧内容覆盖保存。最坏情况下，四个修改文件都能在 GitHub 文件历史里找到旧版。
- **回滚后验证**：线上导航恢复为「✍️ 造句」、无积分胶囊即回滚成功。

### 5.4 其他提醒
- 不要提交 `vocab-growth-deploy.tar.gz` 和 `node_modules`（如有）。
- 所有用户数据存 localStorage，本次改动不涉及数据结构破坏性变更（旧数据加载时会自动补齐 gamification 默认字段），无需迁移。
- 用户数据备份入口在「📚 词汇 → 🗂️ 数据管理 → 导出备份」，如用户反馈数据问题先引导导出。
