---
created: 2026-07-29
source: 爱范儿（基于Thariq Shihipar @trq212 / Anthropic Claude Code团队）
source_level: 🟢
confidence: ✅ 高
anchors_verified: 3/3
tags: [Skill, 提示词工程, 模型进化, Harness Engineering]
---

# Skill瘦身指南：模型变聪明后该删什么

> Claude Opus 5/Fable 5发布后，Claude Code团队删掉了80%系统提示词，内部评测性能无损失。
> 信号：模型越聪明，你的Skill越应该像地图（指南），而不是护栏（约束）。

## 核心事件

Claude Code工程师Thariq Shihipar发文：团队为Opus 5和Fable 5删除了Claude Code超过80%的系统提示词。重新跑内部编码评测后，**没有测到任何性能损失**。

这不是说Skill没用了。而是说：以前为了弥补模型不足而存在的"中间层"该退场了。

## Thariq六条转变

| # | 旧做法 | 新做法 | 原理 |
|:--|:--|:--|:--|
| 1 | 给AI硬规则（"必须验证""不要加注释"） | 相信AI判断力（"按周围代码风格工作"） | 旧规则是为防最差结果，新模型不需要 |
| 2 | 写工具调用示例 | 只定义接口字段 | 示例反而限制模型发挥 |
| 3 | 所有说明常驻上下文 | 按需加载（Progressive Disclosure） | 用不上的说明=噪音 |
| 4 | 同一条要求写两处 | 去重，只保留一份 | 重复=冲突风险 |
| 5 | 用户手动标记记忆 | AI自动保存关键信息 | 模型自己能判断什么值得记 |
| 6 | 只给Markdown文档 | HTML原型/代码/测试/评分表都行 | 多种材料比纯文字更准确 |

## 四层上下文架构

Thariq把给AI的信息分为四层：

| 层 | 是什么 | 怎么用 |
|:--|:--|:--|
| System Prompt | 产品环境+基本任务 | 一般不修改，定义AI的"身份" |
| CLAUDE.md | 项目特殊规定 | **保持简短**，只记录AI看文件结构发现不了的事 |
| Skills | 按需打开的任务指南 | 不要写死规则，领域独特知识最适合放这里 |
| References | 当前任务的参考资料 | 原型/代码/评分表，用户@选中交给AI |

## 对你的Skill体系意味着什么

你的28个Skill不是白建。但需要审计——分三类：

| 类别 | 示例 | 处理 |
|:--|:--|:--|
| 🔴 防旧模型犯错的硬规则 | "完成后必须验证""不要添加无关内容""禁止编造数据" | **删。** 新模型自己能判断 |
| 🟡 例子太多/写得太死的 | 工具调用示例、过于具体的"必须三步走" | **简。** 保留接口定义，删示例 |
| 🟢 你的领域独特知识 | 苏不倦风格清单、英语学习方法论、审稿标准 | **保留。** 这是模型没有的东西 |

## 与已有实践的共振

- 你系统的"Skill按触发词加载"= Thariq的Progressive Disclosure——理念完全一致
- 上次扫描Garry Tan「skillify it」= 把工作变Skill。本期 = Skill本身也要进化
- Hermes的SOUL.md≈System Prompt, Memory≈CLAUDE.md, Skills≈按需加载, 知识库≈References

## 🔍 验证记录

| 项目 | 结果 |
|:--|:--|
| 来源 | Thariq Shihipar @trq212（Anthropic Claude Code工程师）|
| 验证方式 | X原文 + YouTube演讲 + Simon Willison独立采访 → 三源交叉确认 |
| 锚点 | 80%删除比例 ✅ / Thariq身份 ✅ / Progressive Disclosure概念 ✅ |
| 偏差 | "80%"仅指system prompt，不含CLAUDE.md和Skills。不是所有提示词都该删80% |
| 交叉引用 | [[02-Areas-资产/战略参谋-自我迭代系统/AI学习与创作系统/Builder思维/Garry-Tan-永远不做一次性工作]]（递进关系）+ [[02-Areas-资产/战略参谋-自我迭代系统/AI学习与创作系统/Builder思维/Skill的本质-不是提示词是能力商品]] + [[02-Areas-资产/战略参谋-自我迭代系统/AI学习与创作系统/搭档经验/Skill的进化闭环]] |

## 行动建议

本周：打开你最常用的3个Skill（推荐oral-script-review、ai-content-curation、topic-selection），删掉所有"防呆"规则，只保留你的领域经验和判断标准。然后用一条脚本验证删后表现。
