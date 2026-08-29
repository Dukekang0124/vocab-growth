---
name: investing-skills
description: 康哥个人投资方法论 skill 集——价值投资 + 指数投资 + FIRE + 风险规避四大方向的可调用技能。Use when the user asks about 投资 / 理财 / 资产配置 / 买股票 / 财务自由 / 风险规避，或需要调用某位投资大师的方法论来分析具体问题。Triggers on "投资", "理财", "资产配置", "买股票", "财务自由", "价值投资", "指数投资".
---

# investing-skills — 康哥投资方法论 skill 集

> 建立：2026-08-22
> 来源：吸收 Hermes ⑫号窗口投资辅助系统 + 深读 Anthropic `financial-services` 官方 skill 结构后改造
> 格式：Anthropic 五段式（YAML frontmatter + 分步 workflow + 量化阈值 + 固定输出模板 + 免责声明）

## 定位

这是康哥个人投资知识体系的可调用 skill 层。每条 skill 只干一件事、给出可执行标准、带免责声明，不荐股、不预测、不做买卖决策。

## 已完成 skill（5 个，均有内容源）

| Skill | 来源 | 一句话 | 触发词 |
|---|---|---|---|
| bogle-index-investing | 约翰·博格 | 低成本指数定投，长期持有不动 | 指数投资/定投/费用率 |
| bogleheads-guide | 博格头指南 | 资产配置 + 年龄-债券法则 + 行为纪律 | 资产配置/退休/4%法则 |
| duan-yongping-investing | 段永平问答录 | 商业模式×企业文化×合理价格 | 买股票/商业模式/估值 |
| simple-path-to-wealth | J.L. Collins | FIRE：花得比赚少→投盈余→远离债 | 财务自由/FIRE/储蓄率 |
| darwin-investing | 普拉克·普拉萨德 | 规避风险→ROCE>20%→永久持有 | 规避风险/ROCE/高质量企业 |

## 待补 skill（3 个，暂无内容源，不编造）

| Skill | 来源 | 缺什么 | 补源路径 |
|---|---|---|---|
| psychology-of-money | Morgan Housel《金钱心理学》 | 无书文本/无详细笔记 | 需提供书文本，或读后提炼 |
| munger-mental-models | 查理·芒格《穷查理宝典》 | 无内容源 | 同上 |
| value-investing-checklist | 姜胡说《价值心法》Part3 | 无内容源 | 同上 |

> 说明：这 3 个只在 07-个人投资规划/README 里有名字，Hermes 目录内搜不到详细内容。按"不凭记忆编造"原则，暂登记待补，等有文本再走 cangjie-skill 拆书流程。

## 目录结构

```
investing-skills/
├── SKILL.md                 ← 本文件（总入口）
└── skills/
    ├── bogle-index-investing/SKILL.md
    ├── bogleheads-guide/SKILL.md
    ├── duan-yongping-investing/SKILL.md
    ├── simple-path-to-wealth/SKILL.md
    └── darwin-investing/SKILL.md
```

## 与已有 skill 的衔接

- **cangjie-skill**：拆书蒸馏。3 个待补 skill 拿到书文本后，用 cangjie 流程蒸馏。
- **段永平 Skill（duan-yongping-grounded-qa）**：原在 07-个人投资规划/04-平台研究与市场 下，是"问答式 skill"；本集的 duan-yongping-investing 是"方法论式 skill"，两者互补不冲突。
- 投资决策检查清单、VIX/VXN 参考表仍在 07-个人投资规划/02-决策工具，属"工具层"而非"方法论 skill 层"。
