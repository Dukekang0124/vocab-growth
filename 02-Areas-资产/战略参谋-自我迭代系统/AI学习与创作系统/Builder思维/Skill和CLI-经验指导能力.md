---
created: 2026-07-14
source: "Skill和CLI官方设计逻辑（via 截图）"
tags: [Builder思维, Skill, CLI]
---

# Skill 和 CLI：经验指导能力

## 核心观点

官方设计逻辑：**Skill（经验）和 CLI（执行工具）是互补关系，不是上下级。**

| 误解 | 正确理解 |
|---|---|
| CLI 是底层，Skill 是上层封装 | 两者是平行互补的 |
| Skill 只能调用 CLI | Skill 提供经验判断，CLI 负责执行 |
| 有 CLI 就够了 | Skill 封装的是「怎么用」的知识 |

## 跟苏不倦的关系

你的系统里已经有了两者的雏形——Skill（审稿清单、排版 SOP）+ CLI（Hermes 的工具调用）。理解这个互补关系，能帮你设计出更好的协作流程。

## 跟已有笔记的呼应

- [[02-Areas-资产/战略参谋-自我迭代系统/AI学习与创作系统/Builder思维/Skill的本质-不是提示词是能力商品]] ← Skill 是什么
- [[02-Areas-资产/战略参谋-自我迭代系统/AI学习与创作系统/Builder思维/Agent四件套-Tool-MCP-Skill-Plugin]] ← 四件套中 Skill 的位置
