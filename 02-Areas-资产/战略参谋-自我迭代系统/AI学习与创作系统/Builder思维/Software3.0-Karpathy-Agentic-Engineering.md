---
created: 2026-07-21
source: "Sequoia AI Ascent 2026: Andrej Karpathy"
tags: [Agent, Software3.0, Agentic-Engineering, Karpathy, 工作流]
---

# Software 3.0：从 Vibe Coding 到 Agentic Engineering

## 核心洞察

Karpathy 在 Sequoia AI Ascent 2026 定义了 Software 3.0：**通过 prompts、context、agents、tools、memory 和 verification 来编程。** 关键转折发生在 2025 年末——编码 Agent 从「辅助补全」跨过阈值，开始独立推进整个工作流。

最重要的金句：**「你可以外包思考，但不能外包理解。」**（You can outsource thinking. You cannot outsource understanding.）

## 跟苏不倦的关系

### 在做但没命名的事

你现在的 Hermes 11 窗口 + 80+ Skill + Obsidian 知识库 + cronjob 定时任务，就是 Software 3.0 的运营实践：

- **Context Window = 编程界面**：你通过 SOUL.md、窗口清单、状态日志给 Agent 上下文，而不是写死代码
- **Agent-native 架构**：你的系统不是给人类点击按钮设计的，是 Agent 读指令、执行、纠错、写日志的闭环
- **Verifiability 驱动**：你的脚本审稿 Skill 输出检查清单，复盘 Skill 输出数据对比——都是「你能验证什么，AI 就能自动化什么」

### 面试翻译

❌ 旧说法：「我用 DeepSeek 写脚本、用即梦做图」  
✅ 新说法：「我搭了一套 Software 3.0 内容产线——11 个专业窗口各司其职，Agent 自主完成选题判断、脚本审稿、多平台发布、数据复盘。一个人做到以前编导+剪辑+运营 3 个人的产出。」

### 关键框架：Verifiability

Karpathy 的核心洞察：**AI 自动化的是你能验证的东西，不是你能指定的东西。**

这对运营岗的启示：运营的很多工作（数据分析、A/B 测试、内容排期）天然具备可验证性 → 这些是 AI 最容易替代的。而策略判断、品牌调性、用户洞察 → 「理解」层 → 这些是人的壁垒。

## 跟已有笔记的呼应

- [[AI Agent自动化工作流实战指南]] — 四象限+四层架构是对 Software 3.0 的工程落地
- [[张咋啦AI学习法]] — Follow Builders, Karpathy 就是最该 Follow 的 Builder
- [[一人公司超级个体时代]] — Software 3.0 是一人公司的技术底座

## 可行动项

- [ ] 面试自我介绍重写一版，用 Software 3.0 叙事替代「我用 AI 工具」
- [ ] 考虑写一篇「运营人的 Software 3.0」文章 → Learn in Public
- [ ] 作品集网站中加入「Agent-native 工作流架构图」
