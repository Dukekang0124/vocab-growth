---
created: 2026-07-25
source: Andrej Karpathy @ Sequoia Ascent 2026
source_url: https://karpathy.bearblog.dev/sequoia-ascent-2026/
source_level: 🟢
confidence: ✅已验证
tags:
  - AI认知
  - Agent工程
  - 核心竞争力
  - Software3.0
---

# Karpathy：Software 3.0、Agentic Engineering与不可外包的理解

> Andrej Karpathy 在红杉 AI Ascent 2026 的炉边对谈。他不是在预测未来，他是在描述自己作为一个20年程序员被AI重构的真实体验。

## 一、Software 3.0：上下文窗口就是新程序

| 代际 | 定义 | 人类做什么 |
|:--|:--|:--|
| Software 1.0 | 人手写精确代码 | 写每一行逻辑 |
| Software 2.0 | 神经网络从数据学习 | 准备数据集+目标函数 |
| **Software 3.0** | **通过提示词/上下文/工具/记忆编程LLM** | **设计可被Agent执行的指令块** |

核心转变：LLM是interpreter，context window是被执行的"程序"。比传统代码不精确，但更有适应力。

## 二、MenuGen：当软件消失

Karpathy的MenuGen经历了两个版本：
- **1.0/2.0版本**：前端+后端+API+Auth+Payments+Vercel部署——完整App
- **3.0版本**：菜单照片→Gemini→在原图上叠加菜品图。结束。

> "有些App不是被AI加速，而是不应该以App的形式存在。"

**当神经网络能直接做端到端的媒体→媒体转换，所有中间层都是多余的脚手架。**

## 三、锯齿状智能公式

```
能力峰值 ≈ 可验证性 × 训练关注度 × 数据覆盖 × 经济价值
```

模型在某些领域飞、某些领域崩——不是通用智能不均匀，是四个因子乘积不同。

实战意义：你的应用是否落在「模型的轨道上」？训练高密度领域（编程/数学）模型会飞；冷门领域可能撞墙。

## 四、不可外包的1% 🔥

> "You can outsource your thinking, but you can't outsource your understanding."

Agent可以替你写代码，但无法替你理解系统设计。

五项不可外包的能力：
1. **品味（Taste）** — 知道什么值得做
2. **判断（Judgment）** — 知道结果是否可疑
3. **理解（Understanding）** — 知道为什么这样设计
4. **规格（Spec）** — 知道让Agent做什么
5. **守门（Guardrails）** — 知道哪里会出事

Karpathy自己的教训：MenuGen的Agent用邮箱匹配Stripe和Google账号——代码语法完美，逻辑是地雷。因为Stripe邮箱和Google邮箱可以不一样。只有人能理解这个隐患。

## 五、跟苏不倦的关系

### 1. 求职定位
- Karpathy说未来的"百倍工程师"不是写代码最快的，是用Agent把想法变产品还守住质量的人
- **你的定位**：不是技术人员，但理解AI能力边界——知道什么交给Agent、什么必须人判断
- 面试可以说的：「我不写代码，但我搭建了11窗口的Agent工作流系统。Agent = Model + Harness，我在Harness层」

### 2. 自媒体内容
- 「AI时代最值钱的能力不是会用AI，是知道AI哪里会翻车」→ 口播选题
- "锯齿状智能"概念可以做成系列：AI为什么能考过律师但不会过马路

### 3. 你已经走在这条路上
- 你的Hermes 11窗口系统 = Software 3.0的个人实践
- "AI擅长Style不擅长Substance" = 被Karpathy从技术底层验证
- 运营/内容背景的"判断力" = 恰好是Karpathy说的不可外包的1%

## 🔍 验证记录
- 来源级别：🟢 Karpathy本人（OpenAI联合创始人/前Tesla Autopilot负责人）
- 置信度：✅ 一手来源
- 锚点通过：5/5（bearblog.dev个人博客+YouTube Sequoia官方1.4M播放+LinkedIn确认+MenuGen独立博客+Animals vs Ghosts独立文章）
- 知识库交叉：与[[02-Areas-资产/战略参谋-自我迭代系统/AI学习与创作系统/环境认知]]一致
- 学科映射：波兰尼悖论——"我们知道的多于我们能言说的"
