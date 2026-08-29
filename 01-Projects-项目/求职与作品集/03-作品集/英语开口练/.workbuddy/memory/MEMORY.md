# 英语开口练 · 项目长期记忆

> 最后更新：2026-08-29

## 一、产品与部署铁律（最高优先级）
- **唯一源文件**：`english-speaking-app/index.html`（纯单文件，无框架无构建）。所有功能改动只改这里。
- **部署副本**：`english-speaking-app-github/index.html`（含 .git）。上线 = 源覆盖副本 → `git add -A` → `git commit` → `git push origin main` → Cloudflare Pages 自动部署。
- **线上地址**：`https://english-speaking-app-e37.pages.dev`（免备案，¥0）。仓库 `Dukekang0124/english-speaking-app`，分支 `main`。
- **远程历史（重要，2026-08-29 多次核实）**：远程 main 当前 HEAD = `ea99743`（补 privacy 隐私页，已上线）。完整链（在 bbcb195 基础上继续）：九思 `1aa300c`(阶段二立住) → 九思 `697790d`(清 66 条废话干扰项) → 九思/豆包 `78d9080`(修复首屏空白 P0 + 对话 {{name}} 字面量 bug) → 九思 `ad9cd76`(PWA 化 + 版本检查 + 下载落地页) → 九思 `ea99743`(补 privacy.html，均豆包 push)。**push 前必须先 `git ls-remote` 核对远程 HEAD，禁止强推**，否则覆盖他人工作。
- **分工（2026-08-29 定）**：九思（开发侧/本助手）只改功能层+本地 commit；**九思沙箱无 GitHub 写权限**（无 tty 弹不出凭据、凭据管理器空、无 SSH key），凡是需要 push 的任务，九思打包 patch + 完整文件 + 交接文档，交豆包 agent 推送（她有该仓库写权限）。豆包 2026-08-29 已成功代推 `bbcb195`。
- **本地无未推（2026-08-29 13:05）**：全部 commit 已上线，三方（远程/部署副本/源）一致，工作树干净。下一轮改动从 `ea99743` 开始。

## 二、开发过程归档规范（5 阶段沉淀法，适用于全部开发任务）
> 根目录：`英语开口练/开发过程归档/`，含 5 阶段文件夹 + `README-开发阶段归档规范.md`
- 01-需求调研 / 02-需求分析 / 03-设计开发 / 04-测试验证 / 05-验收上线
- 每阶段完成即沉淀对应文档（需求/分析/改动diff/校验/部署报告），确保可沉淀可追溯可复用。
- 部署类任务 push 受阻必须写明阻塞原因 + 待执行命令。

## 三、关键架构点（避坑）
- TTS：`speak()` → `splitByLang()` 分段 → `playAudioSegment()` 串行播放。中英文混排靠 `onended` 推进下一段（**切勿用 `onplaying` 提前 resolve，会并发错序**）。
- TTS 音源：英文优先有道 `dictvoice` + 百度 `gettts?lan=en`；中文百度 `gettts?lan=zh`；兜底 Web Speech（`onend` 串行）。微信 X5 内 speechSynthesis 常不可用。
- 打分：本地 `webkitSpeechRecognition` + **词序敏感估算**（非真 ASR）。2026-08-29 重写，勿改回：
  - `accuracy` = LCS(`lcsLength`) / 目标词数 —— **词序敏感，倒着念不再满分**（旧实现用 `Set` 存在性比对，倒读得 100 分）
  - `fluency` = 语速分(`calcSpeedScore`，1.5–3.5 词/秒为正常区间) × 0.7 + 简洁分(LCS/说出词数) × 0.3 —— 杜绝"说得越长分越高"
  - 综合 = `accuracy × 0.7 + fluency × 0.3`（漏词是硬伤，不能靠流畅补回来）
  - 语速依赖录音时长：`recordStartTime` / `lastRecordDurationSec`，三处录音流程都要维护
  - 逐词纠错：`alignWords()` 输出 hit/miss/extra，渲染在 `.score-diff`
- 对话分支：独立 `CONV_FLOWS` 数据结构（不破坏原 `DIALOGS`）。
- **打卡双路径（2026-08-29 新增，勿改回）**：打卡按钮由 `updateDailyCompleteBtn()` 统一控制，**始终可见**。录音数或听读数达到当日句子总数即可打卡（二选一）。
  - 原因：原实现按钮只在 `mediaRecorder.onstop` 里 `display='block'`，导致微信等无录音环境的用户**永远无法打卡、streak 恒为 0**，整套留存机制在最大流量入口失效。
  - 追踪字段：`dailyHeard` / `dailyRecSent`（均按日期自动重置）
  - 听读入口：`playDailySentence(i, rate)`，所有播放按钮必须走它，否则听读进度不记录
- **能力探测分两级（2026-08-29 新增）**：`canRecord`（能否录音）与 `canScore`（能否自动评分 = canRecord && speechRecognition）**必须分开判断**。
  - Android 微信 X5 等环境能录音但无语音识别，若只判 canRecord，用户录完只会看到一行灰字、事前无预警。
  - 录音按钮统一用 `recordBtnHtml()` 生成三态；无评分环境首次录音前 `warnNoScoreOnce()` 提示，录完提供自评星星兜底。
- **盲说模式 = 生产模式（2026-08-29 新增，勿改回识别模式）**：
  - 产品根基区分「识别模式」（看英文念、选择题、看词看释义）与「生产模式」（给中文/场景自己产出英文）。**只有生产模式能练出主动词汇**——这是康哥写在 OB 方法论第 1 条的洞察。
  - 盲说区 `blindBoxHtml(key, sceneIdx, sentIdx, s)`：点「我想试试」→ 英文变 `■` 遮罩 + 播放禁用 → 用户看中文自己说 → 揭示对照。
  - **盲说最大价值：不依赖录音/语音识别，微信等降级环境可完整使用**，是唯一在所有环境都能跑通的核心练习。
  - `blindState` 是运行时状态（不落盘），key 用复合键（`d{idx}` 当日 / `r{scene}-{sent}` 复习区），避免不同区域索引冲突。
- **遗忘深度体系（2026-08-29 新增）**：`state.sentenceStats[key] = {last, rescue, depth, due, times, greenStreak}`
  - `rescue` = 用到第几层提示才想起（0=自己想起来，6=直接看答案），是「记忆强度信号」
  - `calcDepth`：0-1 绿（记得牢）/ 2-3 黄（有点生）/ 4+ 红（要攻克）
  - `calcDue`：绿=隔天，黄/红=今天（对标词汇生长「🟡当天+隔天」）
  - 分层提示 `hintForSentence()` **由句子自动计算**（词性/词义/首字母/词长/半句/全句），**无需维护额外内容**——低成本复用的关键设计
  - 复习区只回收**往日场景**句子，今日场景在主区显示「今天就再练一次」，避免重复渲染
  - 来源：OB「词汇生长」三环教学法 v2.0（学→复→用），三原理为「记忆靠挣扎不靠重复 / 语言是语块不是单词 / 遗忘是数据不是失败」
- **前端单文件 app init 铁律（2026-08-29 固化，勿改回）**：init 必须包 `DOMContentLoaded` 守卫，或 `<script>` 置 `</body>` 末尾；凡 init/新增 DOM/引导层改动，验收口径 = 清空 localStorage 全新加载后首屏非空白 + 0 JS error（**不是** `node --check` 通过——语法检查查不出解析期 DOM 顺序问题）。来源：线上 `78d9080` P0 首屏空白 bug（init 引用 `</script>` 之后的 `#onboardStep` → null 抛错中断整条 init）。全局版见「机制与路线/Karpathy编码四原则」第七节。
- **PWA 化（2026-08-29 新增，勿删）**：站点已是可安装 PWA —— `manifest.webmanifest` + `sw.js`（同源 network-first，离线可开）+ `icon-192/512.png`，head 里 `link rel=manifest`；`_headers` 单独给 `sw.js`/`version.json` 设 `no-cache`（否则全站 5 分钟缓存会让更新滞后）。
  - SW 注册 + 版本检查都在 `bootApp`（`DOMContentLoaded` 路径）内，**异步且 try/catch 兜底**，失败绝不能影响首屏渲染。
  - 版本号同步铁律：改 web 时 `index.html` 的 `APP_VERSION` 与 `version.json` 的 `version` **必须一起 +1**，否则用户侧误弹「有新版本」。
- **打包 Android APK（2026-08-29 评估，结论=可行）**：单文件 HTML 可零业务改写打进 APK（Capacitor 离线壳 + 自签名直下 + PWA 安装，分发走 A+D）。三个真限制：① Android WebView 禁用 Web Speech TTS（主音源 CDN `<audio>` 照常，仅离线兜底失效）；② 应用**当前零推送功能**，要做属新增需 Firebase+后端；③ 离线 TTS 原本判断"不出声"，**但 2026-08-29 康哥安卓 Chrome PWA 真机实测：飞行模式下 TTS 仍能出声**（Chrome 本地语音引擎 / HTTP 缓存兜底）——非绝对保证（不同设备/浏览器可能无声），但实测通过，卖点可写"离线也能练"。脚手架见 `APK打包指南.md` / `capacitor.config.json` / `android-build/`（**需康哥本机 Android SDK 出包，沙箱无 JDK/SDK 出不了**）。**keystore 必须离线备份**（丢失=无法同身份更新）。
- **真机 PWA 回归通过（2026-08-29 13:48 康哥回填）**：安卓 Chrome 装出「独立窗口图标（带 Chrome 标志，无地址栏）」✅；飞行模式能进首页 ✅；飞行模式下 TTS 播放仍有声 ✅。PWA 安装 + 离线壳两项全部通过。剩余：APK 出包（PWABuilder 或本机 SDK）+ iOS Safari / 安卓微信 TTS 出声与录音（清单仍在 `测试验证-真机回归-iOS与微信.md` 待回填）。
- **验证 patch 的正确姿势（2026-08-29 踩坑固��，勿再用旧法）**：验证"补丁能否还原目标提交"时，`git checkout <父commit> -- .` **不会删除"父提交中不存在的新增文件"**（它们在 index 里是 tracked），`git clean -fd` 也删不掉 → `git apply` 报 `already exists in working directory`。**正解：`git reset --hard <父commit>`**（同时清 index + 工作树），apply 验证完再 `git reset --hard <目标commit>` 还原。
- **JSON 校验别用 `require()`**：`require('./x.webmanifest')` 会被 Node 当 JS 解析报 SyntaxError（误判文件坏）。要用 `JSON.parse(fs.readFileSync(path,'utf8'))`。
- **图标生成（2026-08-29）**：沙箱 venv 已装 **Pillow 12.3.0**（`~/.workbuddy/binaries/python/envs/default`）；Arial Bold 在 `C:\Windows\Fonts\arialbd.ttf`。生成图标用 Pillow + **4x 超采样（2048→LANCZOS 回 512/192）**，**勿回退**旧 `gen_icons.py` 的纯 Python 逐像素光栅化（无抗锯齿，192px 是噪点）。maskable 图标规范：全出血方形底（Android/iOS 自动裁圆角，**勿预裁圆角**）+ 图形内容控在中心半径 ≤170（512 画布，maskable 安全区=中心 80%）+ 48px 必须可辨（真验收场）。脚本 `gen-icons-candidates.py`。
- **图标与 APK 顺序（2026-08-29）**：PWABuilder 的 Android 出包请求直接取线上 manifest 的 `iconUrl`/`maskableIconUrl` → **先改图标 + push 上线，再点 Generate**。顺序反了 = 丑图标被烤进 APK 且 keystore 已生成，改图标须重出包并上传同一个 keystore 才能保持更新身份。


## 四、环境注意（2026-08-28 已纠正，此前结论错误）
- ❌ **旧结论（错误）**："本沙箱无法访问 github.com"。✅ **真正原因**：git 全局被配了失效代理 `http://127.0.0.1:80`，导致 `CONNECT tunnel failed, response 500`。
- **解法**：`git config --global --unset http.proxy` `git config --global --unset https.proxy`，清掉后 GitHub 立即可达（用 `git ls-remote origin` 验证）。
- **沙箱 push 链路彻底不可用（2026-08-29 逐项核实，结论已定，勿再重复尝试）**：
  - 现象：`git push origin main` → `could not read Username for 'https://github.com': terminal prompts disabled`
  - 逐项排查：`git ls-remote` ✅ 可读；Windows 凭据管理器 ❌ 无任何 git/github 条目；SSH 22 ⚠️ 可达但 `~/.ssh` 无 key 且 ssh-keygen 被沙箱拒；`gh` ❌ 未安装
  - 根因：无 tty 弹不出凭据框 + 无缓存凭据可复用。**不是网络被封、不是 PAT 失效。**
  - → **凡是需要 push 的任务，一律走「打包 patch + 写交接文档」交给豆包 agent（她有该仓库写权限，历史 commit `35aa27e`/`a6ecca0`/`32df5de` 均为她推送）**
- **交接标准动作（push 受阻时必做，2026-08-29 定）**：
  1. `git format-patch -1 <commit> -o <交接目录>` 生成 patch（中文 commit 信息用 MIME-UTF8 编码，git 可正确解码）
  2. `cp index.html <交接目录>/` 放完整文件作**兜底**（patch 应用失败时整文件覆盖）
  3. **必须实测验证 patch**：在真实仓库 `git checkout <父commit>` → `git apply patch` → MD5 比对目标 commit → `git checkout -` 恢复。**不验证就交接 = 不负责任**
  4. 写交接文档（背景/起始点/前置条件/分步/完成标准/已踩坑/回滚方案），目标是接手方零沟通可执行
  5. 关键 MD5 写进文档作验收锚点
- **交接实测坑（写进文档，别让接手方重踩）**：
  - **`git am` 在本仓库会失败**（`Patch failed at 0001`）并让仓库卡在 am 冲突态，需 `git am --abort` 恢复 → **必须用 `git apply`**
  - `git -C <含中文的绝对路径>` 失效：报 `cannot change to` 且静默产出空文件（空文件 MD5 = `d41d8cd98f00b204e9800998ecf8427e`，见此值即知出错）→ 中文路径用 `cd` 进入后再执行
  - `git apply --directory=<dir>` 会误判"已应用"输出 `Skipped patch` 但文件未改 → 进目标目录用相对路径 apply
  - **线上缓存 5 分钟**：`_headers` 设 `max-age=300`，push 完立刻访问仍是旧版 → 验证需等待/无痕/Ctrl+F5，勿误判部署失败
- **排查口诀**：push 报 `CONNECT tunnel failed 500` → 先查 `git config --global --get http.proxy`，十有八九是代理配置失效，不是网络被封。
- **判断远程真实状态的唯一可靠方法**：`git ls-remote origin`（直连服务器）。**不要信本地 `refs/remotes/origin/main`**——2026-08-29 实测它陈旧停在 `24a71c7`，而服务器实际已是 `f09dbcf`，差了 9 个 commit。
- **`packed-refs` 无法刷新（2026-08-29 实测，本仓库 fs 怪象）**：`origin/main` 写在 `.git/packed-refs`（最后修改 2026-08-28 08:10，之后再未被更新）。`git fetch` 虽打印 `24a71c7..bbcb195 main -> origin/main`，但实际 ref 没变；`git update-ref refs/remotes/origin/main <sha>` 退出码 0 但同样不改 packed-refs（沙箱只读/锁定）。**结论**：本地 `origin/main` 跟踪 ref 永远不可信，远程状态一律 `git ls-remote origin` 判断；工作树 `HEAD` + `index.html` MD5 才是本地真相源（已确认 `bbcb195` 逐字节正确）。
- **2026-08-28 新增踩坑**：康哥双击 bat push 时报 `! [remote rejected] main -> main (cannot lock ref 'refs/heads/main': is at XXX but expected YYY)`，看似失败，**实际远程已是 XXX（部署成功）**。根因=本机 remote tracking 未刷新，Git 还以为远程在旧的 YYY。
  - 排查法：`git fetch origin && git log --oneline origin/main -3`，对比远程真实 HEAD 与本地期望值。
  - 结论：这个报错是"远端比我新"的**假失败**，不要重复 push，先 fetch 核对。
  - 预防：bat 脚本里 push 前应先 `git fetch origin`。

## 五、Windows 批处理（.bat）中文踩坑
- `chcp 65001` 放批处理里会导致脚本解析错乱、提前退出（闪退）——**不要加**。
- echo 中文行内若含括号（如 `Git 凭据(PAT)`），`)` 会提前关闭 `if (...) ` 块，后续中文被当命令执行 → 报"XXX 不是内部或外部命令"。
- 正确写法：**GBK 编码 + 文案无括号 + goto 标签结构（不用括号块）+ 每个出口分支 pause**。
- 用 Python 写仓库内文本文件时，文本模式会把 CRLF 读成 LF，写入必须 `newline="\r\n"`，否则 git 认为整个文件都被改动。
