---
name: chubbyskills
description: 全渠道内容采集→知识库工具集。将抖音/B站/小红书/公众号/播客/X等内容一键转 Markdown 入库 Obsidian，支持索引、搜索、语义检索、知识卡片。让 AI Agent 能读取你的知识库。
source: https://github.com/chubbyguan/chubbyskills
installed: 2026-08-22
status: 已评估，待网络条件允许时部署
---

# Chubby Skills — 全渠道内容采集与知识库

## 是什么

三层次工具：
1. **采集层**：B站/YouTube/抖音/小红书/公众号/X/播客 → 统一 Markdown
2. **知识层**：Markdown 入库 Obsidian，支持索引、搜索、语义检索、知识卡片
3. **Agent 层**：通过 MCP server 让 AI Agent 读取知识库

## 平台能力

| 平台 | 技能 | 能力 |
|---|---|---|
| B站 | bilibili-transcribe | 字幕优先，视频转录，批量 URL |
| YouTube | youtube-transcribe | 字幕优先，转录，翻译，中英对照 |
| 抖音 | douyin-transcribe | 视频转文字稿 |
| 小红书 | xiaohongshu-ingest | 图文存图、视频转录、爆款拆解、衍生选题 |
| 公众号 | wechat-article-ingest | 文章/PDF 转 Markdown |
| 播客 | podcast-transcribe | 小宇宙/喜马拉雅/RSS/本地音频转录 |
| X/Twitter | x-ingest | 推文正文、图片、视频转录 |
| 知乎 | zhihu-transcribe | 视频转文字稿 |
| 微博 | weibo-transcribe | 视频转文字稿 |

## 核心工作流

```
刷到好内容 → 扔链接 → chubby_ingest.py → Markdown → vault_index.py → 知识库
                                                              ↓
                                              Agent 通过 MCP 搜索/读取
```

## 安装方式

### 轻量模式（推荐）
```bash
git clone https://github.com/chubbyguan/chubbyskills.git
cd chubbyskills
bash setup.sh  # 默认 light：图文/公众号/知识库/Agent
```

### 完整模式
```bash
bash setup.sh all  # 包含视频转录重依赖（ffmpeg/funasr/torch）
```

### 分档安装
```bash
bash setup.sh video     # 视频转录
bash setup.sh podcast   # 播客转录
bash setup.sh wechat    # 公众号/PDF
```

## 九思适配说明

**当前状态**：已评估，待安装。原因是：
1. Python 依赖链较长（funasr/torch/faster-whisper 等重依赖）
2. GitHub 网络连通性问题
3. 需要先确认 Obsidian vault 路径兼容性

**融入位置**：09-学习进化 → 学习效率提升

**最值得使用的子技能**：
1. **xiaohongshu-ingest** — 自动采集小红书爆款笔记→选题库（与 social-account-doctor 互补）
2. **bilibili-transcribe** — 自动转写 B站视频→知识库（替代手工笔记）
3. **content-enrich** — 自动摘要/要点/标签/价值判断（替代手工消化）

**替代方案**：在 Chubby Skills 安装前，内容采集仍使用现有手工流程（WebFetch → Markdown → 知识库）。Chubby Skills 是自动化升级。

**与 social-account-doctor 的分工**：
- social-account-doctor：找对标 → 拆爆款 → 生成自己的内容
- chubbyskills：采集别人内容 → 转知识库 → 检索复用
- 两者互补：一个管产出，一个管输入