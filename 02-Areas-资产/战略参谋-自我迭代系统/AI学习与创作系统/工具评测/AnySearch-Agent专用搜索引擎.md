---
created: 2026-07-13
source: "AnySearch 评测（量子位）"
tags: [工具评测, 搜索, Agent工具]
---

# AnySearch —— Agent 专用搜索引擎

## 基本信息

| 项目 | 详情 |
|---|---|
| 产品 | AnySearch |
| 定位 | 给 AI Agent 用的搜索引擎，不是给人用的 |
| 团队 | 中国团队 |
| 成绩 | 300 题基准测试 76.4% 准确率，超 Parallel 和 Brave Search |
| 价格 | 免费额度：每天 1000 次 |
| 网站 | http://www.anysearch.com |
| GitHub | https://github.com/anysearch-ai |

## 跟通用搜索的区别

| 通用搜索（Google/Bing） | AnySearch |
|---|---|
| 返回网页链接和摘要 | 返回结构化数据 |
| 面向人类阅读 | 面向 Agent 解析 |
| 大量冗余文本浪费 token | 精简输出省 token |
| 单一网页源 | 20+ 数据源（代码库/法律/学术） |

## 核心功能

- **智能路由**：自动选最佳数据源（代码查 GitHub、法规查法律库）
- **去重排序**：过滤重复内容，优先高质量信息
- **Markdown 输出**：方便 Agent 直接解析

## 苏不倦能用在哪

🟡 目前直接需求不大——Hermes 自带搜索够用。但如果以后需要 Agent 做深度研究（比如竞品调研、行业分析），AnySearch 的结构化输出比通用搜索更省钱省 token。

**建议：先收藏，深度研究场景再试。**
