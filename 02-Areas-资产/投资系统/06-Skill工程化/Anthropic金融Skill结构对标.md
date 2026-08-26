# Anthropic金融Skill结构对标（九思Skill化参考）

> 深读日期：2026-08-22
> 对象：`anthropics/financial-services`（真实 star 34,455，Apache 2.0，main 分支，634 文件 / 100+ skill）
> 用途：九思做投资 skill 的**第一参考模板**——结构、命名、分层、免责声明，直接抄作业

---

## 一、结论先行

Anthropic 官方金融 skill 库证明了三点，对九思最有价值：

1. **Skill = 一个原子能力**：每个 SKILL.md 只干一件事（idea-generation、dcf-model、comps-analysis、financial-plan…），不是"大而全的助手"。
2. **三层架构**：命名 Agent（端到端工作流）→ 垂直插件（按行业打包 skill）→ 原子 skill。九思的 8 大方法论 skill 对应"垂直插件"这一层。
3. **每个 skill 都带免责声明**：明确"不构成投资建议，输出需人工签字复核"。这正好对应康哥铁律"不荐股、不预测、不做买卖决策"。

---

## 二、SKILL.md 的标准结构（可直接套用）

以 `equity-research/skills/idea-generation/SKILL.md` 为例，拆解出**五段式模板**：

```markdown
---
name: idea-generation              # ① skill 名（kebab-case）
description: ...Triggers on "idea generation", "stock screen"...   # ② 描述 + 触发词
---

# 标题

## Workflow                        # ③ 分步流程（Step 1 → Step N）

### Step 1: 收集参数
### Step 2: 量化筛选（给具体指标阈值，不是空话）
### Step 3: 主题扫射
### Step 4: 输出模板（固定表格格式）
### Step 5: 输出清单

## Important Notes                 # ④ 注意事项（含合规/风控提示）

- 屏幕只给候选，不给结论
- 反拥挤交易提示
- 逆向 idea 需要催化剂
```

**关键点（九思现在缺的）**：
- **YAML 触发词**：让 skill 能被自动触发，而不是等用户手动喊名字。九思的 8 大方法论 skill 现在只是文档，没有这个 frontmatter。
- **量化标准**：不写"关注好公司"，而是写"ROE>15%、FCF 转化率高、净留存>110%（SaaS）"这种可直接执行的阈值。
- **固定输出模板**：让每次结果可对比、可追踪。

---

## 三、与九思已有 skill 的对标表

| 九思现有（07 库方法论） | 对应 Anthropic skill | 差距 | 补法 |
|---|---|---|---|
| 段永平投资问答录 | equity-research 系列 | 缺 YAML 触发词 + 量化筛选步骤 | 加 frontmatter + 决策三维漏斗转成打分表 |
| 博格指数投资 | （无直接对应，偏个人） | 缺"再平衡触发阈值"的量化 | 补"偏离目标>5% 就再平衡"这类可执行规则 |
| 博格头投资指南 | financial-plan | 缺现金流/退休测算表格 | 补 age-bond 法则的表格化输出 |
| 达尔文进化论投资 | idea-generation 的 Short Screen | 缺"六类规避清单"的勾选化 | 把六类风险转成 checklist |
| 简单财富之路（FIRE） | financial-plan 的 retirement 段 | 缺 FIRE 目标倒推表格 | 补 4% 法则 × 年支出 的表格 |
| 投资决策检查清单 | （已是 checklist，做得好） | 已达标 ✅ | 保持 |
| VIX/VXN 参考表 | （无对应） | 已达标 ✅ | 保持 |
| 金钱心理学 / 芒格 | （行为层，Anthropic 没覆盖） | 九思的**差异化优势** ✅ | 保持并强化 |

**一句话判断**：九思的"方法论内容"已经够扎实，缺的是**工程化**——把内容从"文档"升级成"带 frontmatter + 量化阈值 + 固定输出模板的 SKILL.md"。

---

## 四、仓库三层架构（九思可借鉴的目录设计）

```
plugins/
  agent-plugins/      # 命名 Agent：一个自包含的端到端工作流（Pitch Agent 等）
  vertical-plugins/   # 按垂直领域打包 skill + 命令 + 数据连接器
  partner-built/      # 合作方（LSEG、S&P Global）的插件
```

**对九思的映射建议**：
- 康哥的 8 大方法论 → 对应 `vertical-plugins`（按"价值投资/指数投资/行为金融"垂直打包）
- 未来若要"一键出投研报告"→ 才需要 `agent-plugins` 那种多 skill 编排的命名 Agent
- 段永平 Skill（已在 04-平台研究里）→ 应迁到 `04-SKILL/`，补成标准 SKILL.md

---

## 五、康哥最该抄的 3 个 skill 全文（可找原仓库对照）

| skill | 路径 | 为什么值得抄 |
|---|---|---|
| `idea-generation` | equity-research/skills/ | 选股量化筛选模板最完整，直接改造成 A 股版 |
| `financial-plan` | wealth-management/skills/ | 个人财务规划的 7 步流程，康哥 FIRE 目标可套用 |
| `comps-analysis` | financial-analysis/skills/ | 同业对比分析的标准表格，段永平"公司四问"可借鉴 |

---

## 六、免责声明（九思必须学）

Anthropic 原话要点：
> "本仓库任何内容不构成投资/法律/税务/会计建议。Agent 只产出分析师初稿——模型、备忘录、研究笔记——供合格专业人士复核。它们不做投资建议、不执行交易、不绑定风险、不记账、不批准开户；所有产出都需人工签字。"

**九思的对应（已有，但需固化到每个 skill）**：
> 不荐股、不预测涨跌、不做买卖决策。只提供分析框架和决策参考，最终判断由康哥自己做。

---

*沉淀于 08-九思搭档知识库/07-个人投资规划 · 2026-08-22*
*数据来源：GitHub API 实时读取（star 34455，main 分支文件树 + 3 个代表性 SKILL.md 全文）*
