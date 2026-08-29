# 交接文档：英语开口练 · 推送 commit `bbcb195` 并上线

> 交接方：九思（WorkBuddy 内置 AI，开发侧）
> 接手方：豆包 agent（GitHub 操作侧）
> 交接时间：2026-08-29 08:40（GMT+8）
> **任务性质：只需完成"推送 + 上线验证"，无需任何代码改动**

---

## 0. 一句话任务

把本地已提交但**从未推送到远程**的 1 个 commit（`bbcb195`，中→英盲说模式）推到 GitHub `main` 分支，触发 Cloudflare Pages 自动部署，并验证线上生效。

**你不需要写代码、不需要理解业务逻辑。** 改动已经打包成 patch，你只负责应用到仓库并推送。

---

## 1. 项目背景与当前进度

### 1.1 产品是什么

「英语开口练」—— 纯前端单文件 Web App（`index.html`，706KB），帮用户练英语口语。无框架、无构建步骤，仓库里只有两个文件：`index.html` 和 `_headers`。

### 1.2 部署架构（重要）

```
本地 index.html
    ↓ git push origin main
GitHub 仓库 main 分支
    ↓ Cloudflare Pages 自动监听（约 1 分钟）
线上站点 https://english-speaking-app-e37.pages.dev
```

- **仓库地址**：`https://github.com/Dukekang0124/english-speaking-app.git`
- **分支**：`main`（唯一分支，无 PR 流程，直接推 main）
- **线上地址**：`https://english-speaking-app-e37.pages.dev`
- **触发方式**：push 到 main 即自动部署，**无需手动触发 CI**

### 1.3 当前代码状态（2026-08-29 08:40 已用 git 命令核实）

| 项目 | 值 |
|---|---|
| **远程服务器真实 HEAD** | `f09dbcf553bb14313b2ead3102db001671a47c94` |
| **本地 HEAD（待推）** | `bbcb1954a9153cd802e995505916b9866535f297` |
| **待推送 commit 数** | **1 个** |
| **改动文件** | `index.html`（+198 / -10） |
| **关系** | `f09dbcf` 是 `bbcb195` 的直接父提交 → **fast-forward，安全可推** |

远程 `main` 完整历史（共 10 个 commit，`24a71c7` 为根提交）：

```
f09dbcf feat: 阶段一止血 - 听读打卡解耦 + 打分词序敏感 + 逐词纠错 + 无评分环境自评   ← 远程当前位置
8255229 fix: 移除练习中自动弹出的反馈弹窗 + 微信TTS失败仅提示一次
b1ecf82 feat: 微信端能力探测与降级 + 移动端布局修复
6259f17 feat: 微信分享卡片优化(OG/theme-color) + 部署缓存配置(_headers)
841241a feat: 语音模块移植 - 中英分段串行播放 + 中文音频源
32df5de feat: MVP功能整改 - 逐句打分/对话分支/解锁帮助等
a6ecca0 v1.1.1: 修复新用户解锁状态
35aa27e v1.1: 修复微信TTS+免费体验门槛+应用内反馈+词卡数量修复
af49cec 修复：内测期显示反馈卡片
5bb664a 内测版：有道TTS+免费开放+反馈入口+埋点
24a71c7 Add files via upload
```

> 注：`35aa27e`、`a6ecca0`、`32df5de` 三个 commit 正是豆包 agent 此前推送的，你对该仓库已有写权限基础。

### 1.4 阻塞点（为什么需要你接手）

九思运行在无交互终端的沙箱中，**GitHub 推送链路已确认不可用**：

| 尝试 | 结果 |
|---|---|
| `git push origin main` | ❌ `fatal: could not read Username for 'https://github.com': terminal prompts disabled` |
| Windows 凭据管理器 | ❌ 无任何 GitHub/git 相关凭据条目（`cmdkey /list` 查询为空） |
| SSH 22 端口 | ⚠️ 网络可达（能完成握手），但无 SSH key，且密钥生成未获授权 |
| `gh` CLI | ❌ 未安装 |
| HTTPS 443 | ⚠️ 不稳定，实测出现过一次 21 秒超时（重试后 code=200） |

**结论**：九思无法完成 push，但不影响你——只要你的环境有 GitHub 凭据（此前推送记录证明有），即可独立完成。

---

## 2. 起始阶段与前置条件

### 2.1 你从哪一步开始

**从「应用 patch 到仓库」开始。** 不要从零写代码，也不要重新实现任何逻辑。

完整链路：

```
① 获取交接物料 → ② clone 仓库 → ③ 核对远程 HEAD → ④ 应用 patch
→ ⑤ MD5 校验 → ⑥ commit → ⑦ push → ⑧ 线上验证
```

### 2.2 前置条件清单

| # | 条件 | 说明 |
|---|---|---|
| 1 | 对 `Dukekang0124/english-speaking-app` 有 **push 权限** | 此前推送过 `35aa27e`/`a6ecca0`/`32df5de`，应已具备 |
| 2 | 本机装有 `git` | 任意 2.x 版本 |
| 3 | 能访问 `github.com` | 若遇超时属正常抖动，**重试 2-3 次**即可 |
| 4 | 能读取交接物料文件 | 见 2.3 |

### 2.3 交接物料（3 个文件）

**目录绝对路径**：

```
D:\写作工具\知识管理\01-Projects-项目\求职与作品集\03-作品集\英语开口练\开发过程归档\05-验收上线\交接-豆包agent-2026-08-29\
```

| 文件名 | 大小 | 用途 |
|---|---|---|
| `bbcb195-中英盲说模式.patch` | 15.9 KB | **方案 A 主推**：git patch，保留完整中文 commit 信息 |
| `index.html` | 706 KB | **方案 B 兜底**：改动后的完整文件，直接覆盖 |
| `README-交接文档（豆包agent）.md` | — | 本文档 |

> **若你读不到上述本地文件**：请让康哥把 `bbcb195-中英盲说模式.patch` 的内容直接贴给你（15.9KB，纯文本，可直接粘贴）。

---

## 3. 分步操作指引

### 方案 A：应用 patch（推荐，优先走这条）

#### 步骤 A1 — clone 仓库

```bash
git clone https://github.com/Dukekang0124/english-speaking-app.git
cd english-speaking-app
```

**预期结果**：得到 `index.html` 和 `_headers` 两个文件。

#### 步骤 A2 — 核对远程 HEAD（**必做，跳过会导致误判**）

```bash
git fetch origin
git log --oneline -1 origin/main
```

**预期结果**：输出 `f09dbcf feat: 阶段一止血 - 听读打卡解耦 + ...`

- ✅ 一致 → 继续
- ❌ 不一致 → **立即停止**，把实际输出回报康哥。说明远程已被别人改动，需重新对齐。

> **为什么必做**：本仓库此前出现过"本地远程跟踪 ref 陈旧"导致误判的情况（`refs/remotes/origin/main` 停在旧的 `24a71c7`，而服务器实际已是 `f09dbcf`）。不 fetch 就动手极易误操作。

#### 步骤 A3 — 校验基线文件 MD5

```bash
md5sum index.html        # Linux/Mac/Git Bash
certutil -hashfile index.html MD5   # Windows CMD
```

**预期结果**：`3bb50a8e7f6fd12863643c55602e37cc`

- ✅ 一致 → 基线正确，patch 可安全应用
- ❌ 不一致 → **停止**，改用方案 B

#### 步骤 A4 — 应用 patch

```bash
git apply -p1 --verbose "路径/bbcb195-中英盲说模式.patch"
```

**预期结果**：输出 `Applied patch index.html cleanly.`

> ⚠️ **不要用 `git am`！** 已实测：`git am` 在本仓库会报 `Patch failed at 0001` 并让仓库卡在 am 冲突态（需要 `git am --abort` 才能恢复）。**`git apply` 实测通过**，用 `git apply` 就行。

如果 `git apply` 失败并提示冲突/上下文不符 → 改用**方案 B**。

#### 步骤 A5 — 校验结果 MD5（**关键验收点**）

```bash
md5sum index.html
```

**预期结果**：`0888a03bd9d35882c0b193ff04bc23aa`

- ✅ 一致 → patch 100% 正确还原，继续
- ❌ 不一致 → **立即停止**，回滚（`git checkout -- index.html`），改用方案 B

> 这个 MD5 是九思在真实仓库中**实测演练验证过的**：`f09dbcf` 基线 `3bb50a8e...` → 打 patch → `0888a03b...`，与目标 commit 内容逐字节一致。

#### 步骤 A6 — 提交

```bash
git add index.html
git commit -m "feat: 对标词汇生长 - 中→英盲说模式 + 分层抢救七层提示 + 遗忘深度复习队列"
```

**预期结果**：生成 1 个新 commit，`git log --oneline -1` 显示上述信息。

#### 步骤 A7 — 推送

```bash
git push origin main
```

**预期结果**：`f09dbcf..新commit  main -> main`，无报错。

→ 推送成功后跳到**第 4 节 完成标准**。

---

### 方案 B：整文件覆盖（方案 A 失败时的兜底）

当 patch 因任何原因应用不上时使用，效果完全等价。

#### 步骤 B1 — clone 仓库并核对 HEAD

同 A1、A2（`git fetch origin` + `git log --oneline -1 origin/main` 应为 `f09dbcf`）。

#### 步骤 B2 — 覆盖文件

```bash
cp "路径/index.html" ./index.html
```

即用交接目录里的 706KB `index.html` **完整替换**仓库中的同名文件。

#### 步骤 B3 — 校验 MD5

```bash
md5sum index.html
```

**预期结果**：`0888a03bd9d35882c0b193ff04bc23aa`（与方案 A 的目标值相同）

#### 步骤 B4 — 提交并推送

```bash
git add index.html
git commit -m "feat: 对标词汇生长 - 中→英盲说模式 + 分层抢救七层提示 + 遗忘深度复习队列"
git push origin main
```

> 方案 B 的 `git diff` 会显示与方案 A 完全相同的 +198/-10 改动，因为改的是同一个文件。

---

## 4. 完成标准（结束条件）

任务**必须同时满足以下全部条件**才算结束。任何一条不满足都不能宣告完成。

### 4.1 代码层面

- [ ] `git log --oneline -1 origin/main` 显示为新 commit（不再是 `f09dbcf`）
- [ ] `git diff f09dbcf..origin/main --stat` 显示 `index.html | 208 +++...`（+198/-10）
- [ ] 远程 `index.html` 的 MD5 = `0888a03bd9d35882c0b193ff04bc23aa`

### 4.2 部署层面

- [ ] Cloudflare Pages 构建成功（访问 https://english-speaking-app-e37.pages.dev 返回 200）
- [ ] **线上页面副标题已更新**为：
  > 遮住英文先自己说，卡住再要提示 —— 不用录音也能练

  （旧版副标题与此不同，这是判断新版本是否已上线最直观的标志）

### 4.3 功能层面（线上抽查，非代码检查）

改动包含 3 个新功能，任选方式验证：

| 功能 | 验证方法 | 预期 |
|---|---|---|
| **G1 盲说遮罩** | 每日练习区点「我想试试」 | 英文变成 `■■■`，播放按钮被禁用（无法偷看/偷听答案） |
| **G2 分层抢救** | 连续点「提示」按钮 | 逐层递进：第1层给词性/词数 → 第2层给词义 → 第3层给首字母 → 第4层给词长 → 第5层给前半句 → 第6层给全句 |
| **G3 遗忘深度** | 完成练习后看复习区 | 出现「今天就再练一次」标记；红/黄/绿深度徽章；复习区不含当日场景 |

> 这三个功能**不依赖录音权限**，在任意浏览器/微信内均可验证。

---

## 5. 注意事项

### 5.1 已实测的坑（**这些都是九思踩过的，别重复踩**）

| # | 坑 | 表现 | 正确做法 |
|---|---|---|---|
| 1 | **`git am` 会失败** | `Patch failed at 0001`，仓库卡在 am 状态 | 用 **`git apply`**。若已卡住，先 `git am --abort` 恢复 |
| 2 | **本地远程跟踪 ref 陈旧** | `origin/main` 停在 `24a71c7`，但服务器实际是 `f09dbcf` | **push 前必做 `git fetch origin`**，用 `git log origin/main` 核对，不要用缓存的 ref 判断 |
| 3 | **push 报错但不是真失败** | `! [remote rejected] main -> main (cannot lock ref)` 看似失败，**实际远程已更新成功** | 报错后先 `git fetch origin && git log --oneline origin/main -3` 核对真实状态，**不要盲目重复 push** |
| 4 | **线上缓存 5 分钟** | 仓库根目录 `_headers` 设了 `Cache-Control: max-age=300` | push 完立刻访问可能仍是旧版。**等 5 分钟或用无痕窗口/强制刷新（Ctrl+F5）**再验证 |
| 5 | **HTTPS 443 偶发超时** | `Failed to connect to github.com:443 after 21091 ms` | 网络抖动，重试 2-3 次即可，不是被墙也不是凭据问题 |
| 6 | **Windows bat 中文编码** | 含括号的中文 echo 会被 `)` 截断，导致脚本提前退出 | 若需写 .bat，用 GBK 编码 + 文案无括号 + goto 结构（与本文档无关，仅作背景） |

### 5.2 验证方法汇总

```bash
# 1. 推送后立即核对远程真实状态（不要信本地缓存的 ref）
git fetch origin
git log --oneline -3 origin/main

# 2. 确认改动内容
git diff f09dbcf..origin/main --stat
# 预期： index.html | 208 ++++++++++++++++++++++++++++++++++++++++++++++++---
#        1 file changed, 198 insertions(+), 10 deletions(-)

# 3. 确认线上已更新（注意 5 分钟缓存，加随机参数绕过）
curl -s "https://english-speaking-app-e37.pages.dev/index.html?t=$(date +%s)" | grep -o "遮住英文先自己说"
# 预期输出：遮住英文先自己说
```

### 5.3 回滚方案

若上线后发现严重问题，按**影响程度**选择：

| 场景 | 操作 | 影响 |
|---|---|---|
| **推荐：安全回滚** | `git revert HEAD` → `git push origin main` | 新增一个 revert commit，保留历史，可再回滚回来。**首选** |
| 紧急：强制回退 | `git reset --hard f09dbcf` → `git push --force origin main` | 抹掉历史。**仅限确认无他人改动时使用，本项目严禁随意强推** |
| 临时止血 | Cloudflare Pages 控制台回滚到上一版本部署 | 不动 git 历史，最快生效 |

**回滚后的验证**：访问线上，副标题应恢复为旧版文案（不再是"遮住英文先自己说..."）。

### 5.4 边界提醒

- **禁止 force push**（`git push -f`）——仓库有他人（九思、豆包）协作，强推会覆盖他人工作
- **只改 `index.html`**——`_headers` 是缓存配置，**不要动**
- 仓库只有 `main` 一个分支，**无 PR 流程**，直接推 main 即可
- 若发现远程 HEAD 不是 `f09dbcf`（说明有其他人推了新 commit），**立即停止并回报康哥**，不要强行覆盖

---

## 附录 A：本次改动的功能说明（背景参考，不需要你实现）

| 模块 | 内容 |
|---|---|
| **G1 盲说遮罩** | 参照「词汇生长」的**生产模式**（production mode）：先遮住英文，用户看着中文自己产出英文，卡住了才逐层要提示。解决了原产品只有"识别模式"（听/读现成答案）导致学不会的核心问题 |
| **G2 分层抢救** | 7 层提示阶梯（实际按 rescue 值 0-6 计）：词性/词数 → 词义 → 首字母 → 各词长度 → 前半句 → 全句。全部由句子**自动计算生成**，无需人工维护内容 |
| **G3 遗忘深度** | 按 rescue 层数分档：≤1 层=记得牢🟢（隔天复习）、2-3 层=有点生🟡（当天复习）、≥4 层=要攻克🔴（当天复习）。生成复习队列，红色优先 |

设计文档：`开发过程归档/03-设计开发/设计开发-对标词汇生长的生产模式改造.md`
测试文档：`开发过程归档/04-测试验证/测试验证-盲说模式与遗忘深度.md`（12/12 项检查通过）

## 附录 B：关键哈希值速查

| 对象 | MD5 / SHA |
|---|---|
| `f09dbcf` 版 `index.html` MD5 | `3bb50a8e7f6fd12863643c55602e37cc` |
| **`bbcb195` 版 `index.html` MD5** | **`0888a03bd9d35882c0b193ff04bc23aa`** ← 目标值 |
| 远程当前 HEAD | `f09dbcf553bb14313b2ead3102db001671a47c94` |
| 待推 commit | `bbcb1954a9153cd802e995505916b9866535f297` |

---

## 完成后请回报

请把以下结果回报给康哥（直接贴命令输出即可）：

1. `git log --oneline -3 origin/main`
2. `git diff f09dbcf..origin/main --stat`
3. 线上访问截图，或 `curl` 验证输出
4. 若中途改用方案 B，说明方案 A 在哪一步失败

---

*文档结束。有任何与本文档描述不符的情况，停止操作并回报，不要自行尝试解决。*
