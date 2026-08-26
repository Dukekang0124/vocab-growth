---
created: 2026-07-14
source: "090909 知识库方案（via 得到大脑）"
tags: [工具评测, Obsidian, 知识库, 第二大脑]
---

# 零代码个人知识库方案：Obsidian + Claudian + Web Clipper

## 核心方案

三款工具实现「刷到好内容→1秒收藏→自动提炼→存入本地知识库」的闭环：

| 工具 | 作用 | 一句话 |
|---|---|---|
| Obsidian | 本地知识库 | 双向链接，数据全本地 |
| Claudian 插件 | 内置 AI 能力 | 在知识库内直接问答、加工内容 |
| Web Clipper 扩展 | Chrome 剪藏 | 1 秒把网页/视频存入 Obsidian |

## 核心优势

- 解决「收藏=白嫖」的痛点——存完可检索、可关联
- 全本地存储，隐私安全
- 零代码，非程序员可用

## 苏不倦适用判断

🟢 你已经有 Obsidian + Hermes，Claudian 和 Web Clipper 可以进一步补全：
- Web Clipper → 替代手动截图发我，直接剪藏到 Obsidian
- Claudian → Obsidian 内直接调用 AI，不跳转

## 跟已有系统关系

- [[02-Areas-资产/战略参谋-自我迭代系统/AI学习与创作系统/搭档经验/AI架构的独立性原则]] ← Obsidian 作为独立知识库载体
- [[02-Areas-资产/战略参谋-自我迭代系统/AI学习与创作系统/系统配置]] ← 可加入工具评测清单

## Obsidian AI Skills 生态补充

| 优先级 | Skill | 说明 |
|---|---|---|
| 🟢 基座 | kepano/obsidian-skills (4万⭐) | Obsidian 官方 5 件套：markdown/bases/json-canvas/cli/defuddle |
| 🟢 相关 | obsidian-second-brain (3K⭐) | 44 命令跨 6 CLI，**含 Hermes**，vault 自演化 |
| 🟡 按需 | 其余 7 个 | 中文教程集/一键 bootstrap 等，非当前刚需 |

安装：`npx skills add https://github.com/kepano/obsidian-skills`
