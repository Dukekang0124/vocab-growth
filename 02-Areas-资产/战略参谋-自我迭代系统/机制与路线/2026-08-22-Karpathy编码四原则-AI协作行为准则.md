---
分类: 01-机制与路线
---

# Karpathy 编码四原则：AI 协作行为准则（汉化+对照版）

> 来源：Andrej Karpathy（OpenAI 创始成员、前特斯拉 AI 总监）2026-01 在 X 吐槽 LLM 编码坏习惯的推文，被社区整理成 `andrej-karpathy-skills` 仓库（17万 star，纯 Markdown，0 代码）。
> 仓库：https://github.com/multica-ai/andrej-karpathy-skills
> 本文：汉化 + 与九思已有准则对照 + 未来 vibe coding 落地指引。

## 一、Karpathy 说的问题（原文观点）

> "The models make wrong assumptions on your behalf and just run along with them without checking."
> （模型替你拍板假设，不核对就一路跑下去。）

> "They really like to overcomplicate code and APIs, bloat abstractions, don't clean up dead code... implement a bloated construction over 1000 lines when 100 would do."
> （模型喜欢把代码和 API 弄复杂、堆抽象、留死代码……100 行能解决的非要写 1000 行。）

> "They still sometimes change/remove comments and code they don't sufficiently understand as side effects."
> （模型还会顺手改动/删除它自己都没真正理解的代码和注释，哪怕与任务无关。）

## 二、四原则汉化 + 九思对照

### 原则① Think Before Coding（先想再写）

- **原意**：不假设、不藏困惑、摆出权衡；不确定就问，不默默选一种理解就开干。
- **说人话**：动手前先想清楚，不懂就问，别猜。
- **九思对照**：≈ 康哥定的「先查后做」——接任务第 0 步先查已有资源，不凭记忆瞎猜路径；不确定的历史操作先搜历史再行动，不凭推断。
- **vibe coding 用法**：让 AI 先复述需求 + 列出假设再动手，而不是直接生成。

### 原则② Simplicity First（简约至上）

- **原意**：最小代码解决，不要投机性抽象、不要没被要求的"灵活性"，200 行能 50 行就重写。
- **说人话**：能简单就别搞复杂，够用就好。
- **九思对照**：≈ 康哥「稳定好用」而非「多装东西」；MCP 不盲目堆、只按需装；方案宁缺毋滥。
- **vibe coding 用法**：明确告诉 AI"不要过度设计、不要造没要求的抽象"。

### 原则③ Surgical Changes（外科手术式修改）

- **原意**：只动该动的，别顺手"优化"旁边的代码/注释/格式；只清理自己造成的垃圾，不动已有的死代码。
- **说人话**：改 A 就别碰 B，只收拾自己弄乱的。
- **九思对照**：≈ 独立性铁律——学习 Hermes 方法论但绝不改动 Hermes 任何机制文件（AGENTS.md、目录结构、规则）；只管理自己的 08-九思搭档知识库。
- **vibe coding 用法**：要求 AI"每行改动都能追溯到需求，不顺手重构"。

### 原则④ Goal-Driven Execution（目标驱动执行）

- **原意**：把模糊指令变成可验收目标。"修 bug"→"写复现测试→跑通→验收"；多步任务先列计划+每步验证点。
- **说人话**：把"干这事"变成"做到什么标准算成"，循环到验收通过。
- **九思对照**：≈ 执行协议收尾四查（①沉淀了吗②固化了吗③合并了吗④最后一环了吗）+ 自动化模型卡点（未确认不宣布完成）。
- **vibe coding 用法**：给 AI 验收标准而不是过程指令："让测试通过"比"帮我修"高效得多。

## 三、为什么康哥早就在用这套（核心洞察）

Karpathy 四原则 vs 康哥已定铁律：

| Karpathy 原则 | 康哥已有的对应 |
|---|---|
| 先想再写 | 先查后做（接任务第 0 步） |
| 简约至上 | 稳定好用、不装多余东西、宁缺毋滥 |
| 外科手术式修改 | 独立性铁律（不碰 Hermes 机制） |
| 目标驱动 | 收尾四查、自动化模型卡点 |

**结论：这套 17 万 star 的"AI 协作圣经"，本质就是康哥已经在执行的九思行为准则。英雄所见略同，这是强验证——不是 Karpathy 教我们，而是我们和他在同一个认知方向上。**

## 四、未来 vibe coding 落地指引（康哥学写代码那天用）

1. **Cursor**：下载仓库的 `.cursor/rules/karpathy-guidelines.mdc` 放进项目 `.cursor/rules/`，一行搞定，AI 自动遵守。
2. **Claude Code**：`/plugin marketplace add forrestchang/andrej-karpathy-skills` → `/plugin install andrej-karpathy-skills@karpathy-skills`。
3. **通用**：curl 仓库根 `CLAUDE.md` 到项目根目录即可（小于百行）。

## 五、注意事项

- 仓库根**无 LICENSE 文本**（README/plugin 声明 MIT）——个人使用无风险，重新打包商用需谨慎。
- 本质是 Multica（AI agent 编排平台）的**商业获客资产**：17 万 star 靠"内容营销"（Karpathy IP 引流），不是工程复杂度的体现。看到"内容型 repo"的 star 数，别当工程实力。
- 内容为英文、编码导向，办公场景需汉化适配（本文即汉化版）。

## 六、沉淀状态

- 2026-08-22 由九思汉化沉淀，放 01-机制与路线。
- 关联：九思OS 行为准则、未来 vibe coding 学习路线。
