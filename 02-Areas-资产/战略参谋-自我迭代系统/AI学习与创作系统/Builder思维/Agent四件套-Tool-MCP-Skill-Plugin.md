---
created: 2026-07-13
source: "WorkBuddy Harness 工程万字复盘（量子位）"
tags: [Builder思维, Agent, 架构]
---

# Agent 四件套：Tool / MCP / Skill / Plugin

## 核心框架

理解 Agent 怎么工作的，就四个概念：

| 概念 | 一句话 | 苏不倦系统里的对应 |
|---|---|---|
| **Tool（工具调用）** | 模型调用外部 API 干活 | Hermes 的 web_search、terminal、浏览器 |
| **MCP（模型上下文协议）** | 统一的工具连接标准，让不同工具能插进同一个 Agent | 就像手机应用商店——基础模型是裸机，MCP 让你按需安装日历/数据库/地图等能力 |
| **Skill（技能）** | 可复用的流程封装 | 口播审稿清单、排版 SOP、发布流水线 |
| **Plugin（插件）** | 外部扩展模块，扩展 Agent 能力边界 | 微信 Gateway、Obsidian 连接 |

## 为什么这个框架重要

面试时聊 AI，两个层次：

| 层次 | 说法 | 对方感受 |
|---|---|---|
| 🔴 「我会用 AI」 | 「我用 DeepSeek 写脚本、Kimi 做 PPT」 | 所有人都会 |
| 🟢 「我理解 Agent 架构」 | 「我把创作流程封装成了 Skill，通过 MCP 协议连接工具层，用 Plugin 扩展系统能力」 | **这个人不是在用 AI，是在搭建 AI 系统** |

不需要你会写代码——能说清楚这四个概念在你系统里对应什么，就够了。

## 补充：为什么叫 Harness 工程

「Harness」= 马具/挽具——把马的力气用在正确方向上。Agent 也一样：裸模型很强，但没有 Harness（Skill + Tool + Plugin + 上下文管理）就乱撞。

你现在的 Hermes + Obsidian + 微信 + Skill 系统，就是你的 Harness。

## 跟已有笔记的呼应

- [[02-Areas-资产/战略参谋-自我迭代系统/AI学习与创作系统/Builder思维/智能体等于模型加工具加循环]] ← 四件套讲组件，那篇讲运行逻辑
- [[02-Areas-资产/战略参谋-自我迭代系统/AI学习与创作系统/Builder思维/Agent长期运行的四大架构]] ← 四件套落地后的工程挑战
- [[02-Areas-资产/战略参谋-自我迭代系统/AI学习与创作系统/Builder思维/Skill和CLI-经验指导能力]] ← Skill 在四件套中的定位
