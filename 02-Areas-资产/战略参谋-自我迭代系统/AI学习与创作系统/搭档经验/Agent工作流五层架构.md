---
created: 2026-07-15
source: "Anthropic Agent 工作流设计（via 截图）"
tags: [搭档经验, Agent工作流, 自动化架构]
---

# Agent 工作流五层架构

## 核心框架

Anthropic 内部营销团队用 Claude Cowork 实现的自动化架构：

| 层级              | 做什么                                | 你的对应                                                 | 状态     |
| --------------- | ---------------------------------- | ---------------------------------------------------- | ------ |
| **1. 定时触发**     | 周日晚上自动启动                           | cronjob 每 2 天 10:00 + 每周日 22:00                      | ✅      |
| **2. Skill 体系** | Prep → Proofreading → Action-items | 审稿 → 排版 → 发布 + ai-content-curation 四维扫描              | ✅      |
| **3. 调度分层**     | Dispatcher → 专家 Skill → 人工确认       | Hermes → web_search/terminal/write_file/vision → 你确认 | ✅      |
| **4. 独立审计**     | Audit Agent 独立验证                   | Gateway 健康检查 + 周报文件完整性标记                             | 🟡 基础版 |
| **5. 持续反思**     | 重复 2 次纠正 → 写入 Skill                | 审稿闭环：你改脚本 → 我对比差异 → 更新 Skill                         | ✅      |

## 关键原则验证

| 原则 | 状态 |
|---|---|
| 重复 2 次以上的修正 → 写入 Skill | ✅ 审稿闭环已在跑 |
| 先做 Proofreading Skill | ✅ oral-script-review 六维度审稿 |
| 定时任务替代人工 | ✅ cronjob 双任务 |
| 审计独立于执行 | 🟡 Gateway 检查有，但未独立 Audit Agent |

> 五层架构跑了四层半。第四层独立审计仍是基础版——未来可升级为独立 Audit Agent 自动校验。

## 跟已有笔记的呼应

- [[02-Areas-资产/战略参谋-自我迭代系统/AI学习与创作系统/搭档经验/把AI当COO不是实习生]] ← 五层架构 = COO 模式的工程实现
- [[02-Areas-资产/战略参谋-自我迭代系统/AI学习与创作系统/搭档经验/AI上夜班-夜间自动化实践]] ← 定时触发层
- [[02-Areas-资产/战略参谋-自我迭代系统/AI学习与创作系统/搭档经验/Skill的进化闭环]] ← 持续反思层
- [[02-Areas-资产/战略参谋-自我迭代系统/AI学习与创作系统/Builder思维/Agent长期运行的四大架构]] ← 独立审计层
