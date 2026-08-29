# 英语开口练 · 开发→部署 移交说明（致豆包 Agent）

> 生成时间：2026-08-28 17:43 · 交接方：九思（开发侧）
> 用途：请你（豆包 Agent）无缝接手「功能层已改完、待检查与上线部署」的收尾工作。

---

## 一、项目背景与已完成工作

**产品**：英语开口练 —— 面向成人零基础英语学习者的纯前端 Web App，核心闭环为「听标准音 → 录音跟读 → AB 对比 → 打卡」。当前为 MVP 验证期，目标是在真实用户（苏不倦抖音/视频号 + 朋友圈流量）中快速验证产品可行性。

**开发侧（九思）已完成**：自 2026-08-27 起，已对源文件 `english-speaking-app/index.html` 完成多轮功能整改，JS 语法校验全部通过。已落地功能：

| 模块 | 已完成内容 |
|---|---|
| 全局 | 微信号统一为 `kz910124`（13 处，无旧号残留）；「关于」页接入底部导航；反馈弹窗加「导出我的数据」按钮 |
| 挑战页 | 逐句录音跟读（每句独立按钮+波形+打分）；慢速发音真实降速（修复 `load()` 重置 bug）；苏不倦中文 TTS 丢失修复（含中文走 `zh-CN`）；打分升级为「准确度+流利度」双维度；**音频分段串行播放修复**（改 `onended` 推进，纠正中英文并发导致的"苏不倦先于 Hi my name is"顺序错乱，18:41 补） |
| 词卡页 | 例句播放按钮（`playExample`）；单词本身保留听发音 |
| 对话页 | 5 个核心场景（自我介绍/点咖啡/问路/购物/看医生）补真实 AB 长对话 + 场景动画；新增**问答式分支交互**（`CONV_FLOWS`：每轮 2 选项、选后才推进、分支汇合、角色头像气泡） |
| 跟读页 | 打分加「重听标准音」AB 对比 + 重新录音 |
| 进度页 | 日历重复 `card-title` 结构 bug 修复 + 上/下月导航；解锁码输入框+「立即解锁」；「怎么获取解锁码」按钮交互修复（原 `onclick` 引号截断导致无反应）+ 一键复制微信号（带 `execCommand` 兜底） |

**未做（本轮范围外，已与康哥确认）**：Cloudflare Workers 后端、付费卡密、ICP 备案、真 AI 语音打分（需后端）。

---

## 二、代码仓库位置与技术栈

**仓库地址**：`https://github.com/Dukekang0124/english-speaking-app`
**分支**：`main`（本地最新 commit `24a71c7`，即线上回滚点）
**线上地址**：`https://english-speaking-app-e37.pages.dev`（Cloudflare Pages 自动部署，免备案，¥0）

**关键目录**（项目根：`D:\写作工具\知识管理\01-Projects-项目\求职与作品集\03-作品集\英语开口练`）：
- `english-speaking-app/index.html` —— **最新源文件（679KB），本次待部署版本**。所有功能改动都在这里。
- `english-speaking-app-github/index.html` —— GitHub 副本（614KB，**旧版，需同步**）。`.git` 在此目录内。
- `cloudflare-workers/` —— 后端 Worker 源码（**未部署，本轮不涉及**）。

**技术栈**：
- 纯 HTML/CSS/JS 单文件，无框架、无构建步骤、零 npm 依赖。
- TTS：有道语音源优先 + Web Speech API 兜底；含中文走 `zh-CN` 混合播放。
- 打分：浏览器免费 `webkitSpeechRecognition` 识别 + 本地词匹配估算（**非真 ASR**，页面已注明）。
- 存储：浏览器 `localStorage`（打卡/解锁/反馈本地态）。
- 部署：Cloudflare Pages，推送 `main` 即触发构建（输出目录 `/`，无构建命令）。

---

## 三、待你（豆包）检查与部署的任务清单

### 优先级 P0 — 上线部署（必须）
1. **同步源文件到 GitHub 副本**
   ```powershell
   Copy-Item -Force "D:\写作工具\知识管理\01-Projects-项目\求职与作品集\03-作品集\英语开口练\english-speaking-app\index.html" "D:\写作工具\知识管理\01-Projects-项目\求职与作品集\03-作品集\英语开口练\english-speaking-app-github\index.html"
   ```
   校验：同步后 `english-speaking-app-github/index.html` 应含 `toggleDailyRecord`、`CONV_FLOWS`、`kz910124` 三个标记。

2. **推送触发部署**
   ```bash
   cd "D:/写作工具/知识管理/01-Projects-项目/求职与作品集/03-作品集/英语开口练/english-speaking-app-github"
   git add -A
   git commit -m "feat: MVP功能整改 - 逐句打分/对话分支/解锁帮助等"
   git push origin main
   ```

3. **验证线上生效**：访问 `https://english-speaking-app-e37.pages.dev`，确认以下新版特征可见：
   - 挑战页每句有「🎤 录音跟读」+ 独立「准确度/流利度」打分卡
   - 对话页 5 个核心场景进入后是问答式分支（选选项才推进）
   - 进度页「怎么获取解锁码」点击弹窗 + 一键复制微信号有 toast 反馈

### 优先级 P1 — 质量检查（建议你做，非阻塞上线）
4. **静态校验**：确认 `index.html` 内 `<script>` 无语法错误（可用 `node -e` 读 HTML 抽 `<script>` 走 `vm.Script` 校验，九思已逐轮通过）。
5. **死代码清理（可选）**：旧 `toggleRecord('daily')` 已成死代码（每日录音改逐句），无害，可保留或清理。

### 优先级 P2 — 人工项（康哥/你协调，不阻塞）
6. **真机测试矩阵**：iOS Safari、安卓微信内置浏览器、安卓 Chrome —— 验证 TTS 出声（尤其中文 `zh-CN` 发音）、录音回放、选项交互、复制微信号。
7. **内容人工校对**：301 词 + 50 跟读句 + 新对话分支回复英文是否自然准确。

---

## 四、文档与环境配置说明

**相关文档**（项目内）：
- `MVP功能规划.md` / `PROJECT_SUMMARY.md` / `README.md` —— 产品定位与范围
- `05-验收上线/` —— 原上线检查清单（可复用其已验收项）
- `产品商业化评估/` —— 商业评估与灰度验证方案
- `.workbuddy/memory/2026-08-28.md` —— 今日开发流水记录（含每轮改动细节）

**环境配置**：
- 部署无需本地构建环境；Cloudflare Pages 连接 GitHub 仓库自动构建。
- 若需自定义域名：当前选免备案路线，可不绑自有域；如需 `.xyz` 绑定在 Cloudflare Pages 后台操作（仍是灰区，不做 ICP）。
- 统计埋点（可选）：Cloudflare Web Analytics 后台一键开启，零代码改动，用于看周 UV / 开口人数。

**回滚方案**：
- 推送后线上异常 → Cloudflare Pages「Deployments」一键 Rollback 到旧版；或 `git revert` 回 `24a71c7` 重新推送。
- 本地 `english-speaking-app/index.html.bak-2026-08-27` 为旧版备份兜底。

---

## 五、接手后的目标与交付标准

**目标**：将已开发完成的最新 MVP 正式部署上线，使真实用户可通过 `english-speaking-app-e37.pages.dev` 正常使用全部整改功能，并开始回收真实反馈。

**交付标准（验收口径）**：
1. ✅ 线上 `pages.dev` 版本 = 最新源文件（含上述 P0-3 全部特征）。
2. ✅ 部署无报错，页面首屏可加载、TTS/录音核心路径在桌面 Chrome 可用。
3. ✅ 解锁码输入、复制微信号、反馈导出三条交互链路无 JS 报错（控制台 clean）。
4. ✅ 回滚路径已确认可用（记录 Rollback 入口位置）。
5. ✅ 向康哥交付一份「部署完成报告」：含线上地址、本次上线的功能清单、已知限制（打分非真 ASR、真机待测）、下一步建议。

**已知限制（务必在报告中向康哥说明，避免误导）**：
- 语音打分为本地词匹配估算，非声学层 AI 评分；真 AI 打分需后端（本轮不部署）。
- 对话分支回复为脚本预设，非 AI 实时生成（零后端、永远可用）。
- 真机（iOS/安卓微信）兼容性与新内容校对为人工待办项。

---

**交接状态**：开发侧代码已冻结于 `english-speaking-app/index.html`（18:41 版，含音频播放顺序修复）。你只需执行第三节 P0 三步即可上线。如遇推送权限/Cloudflare 后台操作需人工，请直接回报康哥，勿擅自改功能逻辑。
