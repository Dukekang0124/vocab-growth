---
标题: GitHub爆火！一个让你用手机远程操控所有AI Agent的开源神器（Paseo）
作者: 丛林
公众号: 极客之家
来源: 微信公众号
链接: https://mp.weixin.qq.com/s/mdtHVncfhL2LJigCzIOvlQ
采集日期: 2026-08-22
形式: 图文文章（开源工具测评）
标签: [AI工具, Paseo, Agent管理, 开源, 工具评估, 远程操控]
分类: AI学习库
---

# Paseo：手机远程操控所有 AI Agent 的开源调度台

> 来源：公众号「极客之家」2026-08-15。GitHub 1.3 万 Star。
> 定位：不是编程 agent，而是**管 agent 的调度台**——把 Claude Code / Codex / Copilot / OpenCode / Pi 收进同一个界面，手机远程操控。
> 本文 = 文章深度提炼 + 功能速览 + 九思延伸思考 + 全维度评估（康哥视角）。

---

## 一、文章核心论点（一句话）

> **Paseo 不造 agent，它管 agent。** 绕开跟大厂拼模型能力的路，专做管理层。

它解决的不是"哪个 agent 更聪明"，而是"三四个 agent 同时开着，管不过来"。

---

## 二、Paseo 是什么（先澄清边界）

- **不是**又一个编程 agent，自己一行代码不写。
- **是**一个调度台：你机器上本来就在用的 agent（Claude Code、Codex、Copilot、OpenCode、Pi）全部收进同一个界面管。
- agent 还是跑在你自己机器上，**账号、配置、开发环境全是你原来那套**，Paseo 只是加一层管理。
- 客户端：桌面端、手机端（iOS/Android）、网页、命令行都有，连的都是你电脑上的本地服务。
- 官方说法：**活在你的电脑上干，人在哪儿都能盯着。**

---

## 三、核心功能速览

| 功能 | 说明 |
|------|------|
| **多 agent 一界面** | 所有在跑的 agent 一个列表，谁在跑/谁闲着/谁报错一眼扫过；可 `@` 文件、`/` 命令 |
| **手机遥控** | 扫码配对（桌面 Settings → Pair Device），出门也能批改文件、看进度 |
| **语音输入** | 按住说话转文字发给 agent；语音**本地跑**，录音不发出去 |
| **多任务并行隔离** | 每个 agent 分一个 git worktree，独立分支和目录干活，不互相踩文件 |
| **界面审改动/提 PR** | Changes / Files 两个页签看改动，界面内提交、开 PR、跳 GitHub |
| **命令行 + SDK** | `paseo run/ls/attach/send`；TypeScript SDK 可脚本编排 agent |
| **多 agent 协作** | `/paseo-handoff` 交接（如 Claude 出方案 → Codex 实现）；`/paseo-advisor` 顾问（只出第二意见）；`/paseo-committee` 双 agent 复盘找根因 |
| **隐私友好** | 不带遥测、不追踪、不要求登录；远程走端到端加密 relay；也可局域网直连或 Tailscale |

---

## 四、安装与使用

```bash
# 桌面 app（最简单）：paseo.sh/download 或 GitHub releases
# CLI：
npm install -g @getpaseo/cli && paseo
# Docker：
docker run -d --name paseo -p 6767:6767 \
  -e PASEO_PASSWORD=change-me \
  -v "$PWD/paseo-home:/home/paseo" \
  -v "$PWD:/workspace" \
  ghcr.io/getpaseo/paseo:latest
```

使用流程：界面选项目文件夹 → 起 agent（选模型和供应商）→ 大白话发任务（如"设计一个单点登录系统，代码要落地，不确定的节点等我确认后执行"）→ 看它一步步跑 → 需要批准时点一下（手机上一样）→ 跑完在 Changes 页签审改动 → 提交、开 PR。

**前提**：机器上得有至少一个能用的 agent CLI（Claude Code / Codex），凭据用你自己配的。Paseo 不提供 agent 服务本身。

---

## 五、它为什么火（踩中 4 个真实麻烦）

| 真实麻烦 | Paseo 的解法 |
|----------|-------------|
| ① agent 越用越多，管不过来 | 所有 agent 收进一个列表 |
| ② 人被钉在电脑前 | 进度揣在兜里，手机随时处理 |
| ③ 并行任务互相踩文件 | git worktree 隔离 |
| ④ 收尾很碎（看改动/提交/PR 来回换工具） | 收进一个界面 |

作者诚实评价：**切入点准**（管 agent 而非造 agent）；但它**解决不了 agent 犯蠢**（该改错文件还是改错），只是让你更快发现、更快纠正。**适合重度使用 CLI agent 的人**，平时不用这些工具的人装了没意义。

---

## 六、九思的延伸思考（结合康哥场景）

### 1. 结论先行：康哥当前**用不上，不建议装**

Paseo 的硬前提是**重度使用 Claude Code / Codex 这类 CLI 编程 agent**。康哥的实际情况：
- 非技术岗，vibe coding 是**未来想学**，还没学；
- 深度使用的是 WorkBuddy（桌面 app，不在 Paseo 管理范围）和国内大模型（Kimi/豆包/通义/文心）；
- 文章作者自己都说了："平时就不用这些工具的话，装它没有意义，先别折腾。"

所以：**这篇笔记的核心价值不是"装 Paseo"，而是"理解 agent 调度这个思路"。**

### 2. 值得借鉴的三个机制（搬到九思OS）

| Paseo 机制 | 本质 | 九思OS 可借鉴点 |
|-----------|------|----------------|
| `/paseo-handoff`（交接） | 一个 agent 的方案交给另一个实现 | 九思不同窗口/任务之间的**接力协作**，避免重复造 |
| `/paseo-advisor`（顾问） | 拉一个 agent 当第二意见，不接手干活 | 重要决策前，九思可"拉一个审查视角"独立审一遍 |
| `/paseo-committee`（复盘） | 两个 agent 一起复盘找根因 | 九思收尾"四查"可升级为**双视角复盘**（执行视角 + 审查视角） |

### 3. 工具评估框架（这篇文章本身就是好样本）

作者评 Paseo 用了三个问题，**这个框架可以固化**：
1. **踩中了什么真实麻烦？**（痛点真实性验证）
2. **它解决不了什么？**（局限诚实性）
3. **适合谁？**（目标用户匹配度）

评估任何 AI 工具前，先问这三个问题，比看功能列表靠谱。

---

## 七、Paseo 全维度评估（康哥视角，6 维度）

| 维度 | 评估 |
|------|------|
| ✅ **好处** | 当前为 0——没有 CLI agent 可管，装了也是空架子 |
| ❌ **坏处/风险** | 装了对康哥是"多一个不用工具"的负担；Docker 部署有 `PASEO_PASSWORD` 暴露风险；远程 relay 依赖第三方 |
| 🎯 **对康哥有什么用** | 现在没有；**未来**若学 vibe coding 且重度用 CLI agent，是"手机遥控 + 多 agent 调度"的好工具 |
| 🚫 **为什么用不上** | ① 不用 Claude Code/Codex/Copilot CLI ② WorkBuddy 是桌面 app 不在其管理范围 ③ 国内模型生态下可用替代少 |
| ⚡ **token 消耗** | 不装，0 |
| 💡 **结论** | **不装（明确）**。保持观察，列入"未来 vibe coding 学习路线"的候选；但**今天动手装 = 浪费** |

---

## 八、行动清单

- [x] 评估结论：Paseo 康哥当前**不装**（理由见第七节）。
- [ ] 借鉴三协作机制（handoff/adviser/committee）到九思OS——先想清楚哪个窗口场景适用，再落地。
- [ ] 把「工具评估三问」（踩中什么麻烦/解决不了什么/适合谁）固化进 proactive-solution-finder skill。
- [ ] 若未来开始学 vibe coding 且重度用 CLI agent，回头重新评估 Paseo（此笔记作评估底稿）。

---

## 九、待补 / 风险提示

- ✅ 本文为完整图文测评，正文已完整抓取。
- ⚠️ 本文为作者个人测评视角，Paseo 实际体验（稳定性/隐私 relay 实现）需实测才能验证，九思未安装（康哥也用不上，不测）。
- ⚠️ Docker 版有 `PASEO_PASSWORD` 默认弱密码风险，若未来真用务必改强密码 + 局域网/Tailscale。

---

*沉淀人：九思 · 2026-08-22 · 结论：不装，借鉴思路*
