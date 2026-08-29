# GitHub 开源「深度消化一本书」工具推荐清单

> 整理时间：2026-08-26 ｜ 目的：帮康哥把一本书从「读」到「拆」到「记」到「用（口播/笔记）」全链路开源化
> 说明：下列全部为开源/可本地部署项目，覆盖四类能力 —— ①PDF/EPUB 导入 ②自动生成读书笔记 ③概念关联（知识图谱/语义链接）④复习提醒（间隔重复）。

---

## 一、先给结论（康哥怎么用最划算）

你的地基已经是 **Obsidian  vault（PARA 结构）+ 九思读书消化 SKILL + cangjie 拆书 + 读书→口播飞轮**。所以工具组合建议：

| 环节 | 推荐工具 | 理由 |
|---|---|---|
| 一键拆书（PDF/EPUB → 摘要+导图） | **ebook-to-mindmap** 或 **idlearn** | 拖进书就出思维导图/分章摘要，零代码优先选前者 |
| 多 Agent 陪读问答 | **read-box** | 国产、Windows 一键装、能问答+出题+导出 Markdown |
| 概念关联（进你现有 vault） | **Smart Connections**（Obsidian 插件） | 直接吃你的 OB 笔记，AI 语义找关联，零额外迁移 |
| 复习提醒（间隔重复） | **Anki** + **Incrementum** | Anki 是标准；Incrementum 直接吃 PDF/EPUB 做增量阅读 |
| 阅读器+标注+双向链接 | **Readest** 或 **My-Epub-Reader** | 前者好看跨端，后者带知识图谱导出 |
| 笔记→卡片 | **PDF-Guru** | 把你的读书笔记/导图批量转 Anki 卡 |

---

## 二、AI 一键拆解 / 摘要 / 思维导图类

### 1. ebook-to-mindmap
- **仓库**：https://github.com/SSShooter/ebook-to-mindmap
- **核心功能**：上传 PDF/EPUB → AI 一键生成「章节思维导图 + 整书思维导图 + 文字总结」；智能章节检测（跳过前言目录）；支持 DeepSeek/Gemini/OpenAI；浏览器本地直连 API，不经第三方；带缓存、可自定义 Prompt；导图可缩放拖拽。
- **使用方式**：本地部署（Docker/Node），配置 API Key 后网页上传即可。
- **适用场景**：囤书多、想快速抓一本书骨架；做读书笔记/口播提纲前先让 AI 啃一遍。
- ✅ PDF/EPUB 导入 ｜ ✅ 自动摘要 ｜ ❌ 概念关联（仅单本）｜ ❌ 复习提醒

### 2. idlearn
- **仓库**：https://github.com/diomir0/idlearn
- **核心功能**：PDF/EPUB → 按目录分章提取 → 嵌套摘要（防长文幻觉）+ 每章 5 条 Q&A + 自动生成 **Anki 卡组（基础卡/Cloze 卡）** + Markdown 导出；支持本地 Ollama（mistral:7B）或 OpenAI 兼容 API；带缓存。
- **使用方式**：`conda env create -f environment.yml` → `python main.py` 开桌面 GUI，勾选章节即可。
- **适用场景**：学生/研究者，想「读一本→直接出复习卡」一条龙；重视本地隐私。
- ✅ PDF/EPUB ｜ ✅ 自动摘要+Q&A ｜ ✅ 复习卡（Anki）｜ ❌ 跨书概念关联

### 3. read-box（本地多 Agent 桌面读书辅助）
- **仓库**：https://github.com/wenhui426/read-box
- **核心功能**：PDF/EPUB/TXT 自动识别章节结构 → AI 提炼（章节摘要/核心概念/金句）→ 基于书内容问答（带引用）→ 章节测验/全书考试/自适应测 → 导出完整读书笔记 Markdown；支持 DeepSeek/OpenAI/Ollama；有 Windows 安装包（零配置）也能当 AI Skill 用。
- **使用方式**：下 exe 双击装；或开发者跑后端(FastAPI)+前端(Vue)。
- **适用场景**：想要「读书陪练」体验、不想自己搭环境；中文友好。
- ✅ PDF/EPUB/TXT ｜ ✅ 自动笔记+问答 ｜ ❌ 概念关联 ｜ ❌ 复习提醒（但能导出到 Anki 类工具）

### 4. llm-ebook-summarizer
- **仓库**：https://github.com/danngalann/llm-ebook-summarizer
- **核心功能**：EPUB/PDF 分章（支持嵌套 Part/Chapter/Section）摘要；Ollama 32B 级量化模型保证质量；含父级引言避免上下文缺失；可翻译任意语言、合并单文件。
- **使用方式**：`python main.py book.epub` → 输出 `001_xxx.md` 每章一份；`python translate.py es` 翻译；`merge_markdowns.py` 合并。
- **适用场景**：追求摘要质量、愿意本地跑大模型；做逐章结构化笔记。
- ✅ EPUB/PDF ｜ ✅ 分章摘要 ｜ ❌ 概念关联/复习

### 5. AI-reads-books-page-by-page
- **仓库**：https://github.com/henryalps/AI-reads-books-page-by-page
- **核心功能**：PDF/EPUB/TXT/网页 URL → 逐页或逐章分析，按间隔生成渐进式摘要；自动章节识别（中英文）；支持断点续跑；OpenAI API。
- **使用方式**：`pip install -r requirements.txt` → 配置 `.env` 的 `OPENAI_API_KEY` → `python read_books.py` 输入路径。
- **适用场景**：长书分段消化、想要「读到哪总结到哪」的渐进感。
- ✅ PDF/EPUB/TXT/URL ｜ ✅ 摘要 ｜ ❌ 概念关联/复习

---

## 三、阅读器 + 笔记 + 知识图谱类

### 6. My-Epub-Reader（带个人知识图谱）
- **仓库**：https://github.com/Balasubramanian-pg/My-Epub-Reader
- **核心功能**：EPUB 阅读 + 一流标注 + **双向链接个人知识图谱**（笔记为一级实体、可互链、自动反链）+ 确定性 Markdown/YAML 导出（知识不锁死在 app 里）。Kotlin/Compose，Room 本地库。
- **使用方式**：Android/桌面编译运行（偏开发者向）。
- **适用场景**：想要「读书即建知识网络」、重视导出所有权。
- ✅ EPUB ｜ ✅ 标注笔记 ｜ ✅ 概念关联（双向链接图谱）｜ ❌ 复习提醒

### 7. Readest（开源电子书阅读器）
- **仓库**：https://github.com/readest/readest
- **核心功能**：EPUB/MOBI/AZW3/FB2/CBZ/TXT/PDF 阅读；高亮/标注/书签、摘录做笔记；词典/Wikipedia 查询；DeepL/Yandex 翻译、TTS；跨端同步；并行阅读两本。
- **使用方式**：各平台装 App 或 Web 版（web.readest.com），开源可自编译。
- **适用场景**：日常沉浸式深读+标注，替代商业阅读器；AI 摘要为规划中功能。
- ✅ 多格式（含 PDF）｜ ✅ 标注笔记 ｜ ❌ 概念关联/复习（靠导出接其他工具）

### 8. obsidian-epub-annotator（Obsidian 插件）
- **仓库**：https://github.com/asfalots/obsidian-epub-annotator
- **核心功能**：在 Obsidian 内直接读 EPUB、5 色高亮、批注自动存为 Markdown（按颜色归类）；可点链接跳回书内位置；进度记忆。
- **使用方式**：放进 `.obsidian/plugins/` 启用，笔记 frontmatter 加 `epub-file:`。
- **适用场景**：已经用 Obsidian 的人，想把书的高亮直接沉淀进 vault。
- ✅ EPUB ｜ ✅ 标注→Markdown ｜ ❌ 概念关联/复习（但进 vault 后可接 Smart Connections）

---

## 四、概念关联（AI 语义链接 / 知识图谱）

### 9. Smart Connections（Obsidian 插件）
- **仓库**：https://github.com/brianpetro/obsidian-smart-connections
- **核心功能**：用本地 embedding 模型（默认 BGE-micro，离线零配置）给 vault 所有笔记建向量；写笔记时实时显示「语义相关笔记」（不只关键词匹配，能找「说同一事但用词不同」的笔记）；语义搜索 Lookup；Smart Chat 以笔记为上下文；语义聚类图谱可视化。
- **使用方式**：Obsidian 社区插件装启用即可，默认本地模型自动索引；也可接 Ollama/云端 1000+ 模型。
- **适用场景**：**最贴合你现有 vault** —— 把每本书的读书笔记、口播脚本、九思 SKILL 互相打通，自动发现跨书关联。
- ❌ 不直接吃 PDF/EPUB（吃你已经写好的笔记）｜ ❌ 自动笔记 ｜ ✅ 概念关联（强）｜ ❌ 复习提醒

### 10. CognitiveSB（AI 学习伴侣）
- **仓库**：https://github.com/Sudhanshukumar0007/CognitiveSB
- **核心功能**：PDF/DOCX/TXT/YouTube → 4 种对话模式（苏格拉底/费曼/通俗/备考）+ 结构化笔记 + MCQ 测验 + 简答题 LLM 评分 + **Anki 间隔重复卡（SM-2）** + **交互式知识图谱**（点节点问 AI）。LangGraph RAG + FAISS + SQLite。
- **使用方式**：后端 Flask+Celery+Redis，前端 React，`pip install -r requirements.txt` + 配 `GROQ_API_KEY`。
- **适用场景**：想要「边读边被苏格拉底式拷问 + 自动出卡 + 看知识地图」的综合体。
- ✅ PDF/DOCX/TXT/URL ｜ ✅ 自动笔记+测验 ｜ ✅ 知识图谱 ｜ ✅ 复习卡（SM-2）

---

## 五、复习提醒（间隔重复 / 增量阅读）

### 11. Anki
- **仓库**：https://github.com/ankitects/anki （Android 端 https://github.com/ankidroid/Anki-Android）
- **核心功能**：间隔重复（SM-2 变体）抽认卡；支持图文音视频/LaTeX；插件生态丰富；跨端同步；本地优先。
- **使用方式**：桌面免费，建卡或导 .apkg 牌组；手机 AnkiDroid 免费、AnkiMobile 付费。
- **适用场景**：所有需要「长期记住」的场景；前面多个工具都能导出 Anki 卡直接喂它。
- ❌ 不直接拆书 ｜ ❌ 自动笔记（靠别的工具生成导入）｜ ❌ 概念关联 ｜ ✅ 复习提醒（最强标准）

### 12. Incrementum（增量阅读 + 间隔重复）
- **仓库**：https://github.com/melpomenex/Incrementum （又名 incrementum-tauri）
- **核心功能**：增量阅读 + 间隔重复（FSRS-6/SM-2 等多算法）；导入 **PDF/EPUB/MD/HTML/TXT + 音视频 + YouTube/Arxiv/RSS**；高亮摘录、标签分类；多种卡型（基础/Cloze/Q&A/选择题/图像遮挡）；**知识图谱 2D/3D**；AI 辅助生成卡/摘要；可迁移 Anki(.apkg)/SuperMemo 数据；Obsidian 集成；146 主题。
- **使用方式**：Tauri 桌面应用，需 Node18+Rust 工具链编译或下 releases。
- **适用场景**：想把「读长文档 + 自动排复习 + 看知识图谱」合一的人；功能最全但偏重。
- ✅ PDF/EPUB/多格式 ｜ ✅ 高亮摘录（非自动摘要）｜ ✅ 知识图谱 ｜ ✅ 复习提醒（多算法）

### 13. Logseq（开源大纲笔记，内置 PDF 标注+间隔重复）
- **仓库**：https://github.com/logseq/logseq
- **核心功能**：AGPL 开源、本地 Markdown/Org；大纲式双向链接；**内置 PDF 标注**（高亮直接变 block 入图谱）；任意 block 加 `#card` 即变间隔重复卡；白板；图谱视图。
- **使用方式**：下载即用，把 PDF 拖进去标注，block 末尾加 `#card`。
- **适用场景**：喜欢大纲/块引用思维、想「标注即卡片」零摩擦复习；与 Obsidian 二选一或互补（你已用 OB，可仅借鉴其 PDF 标注思路）。
- ✅ PDF（标注）｜ ✅ 标注+块笔记 ｜ ✅ 双向链接图谱 ｜ ✅ 内置间隔重复

### 14. PDF-Guru（文档→Anki 卡）
- **仓库**：https://github.com/kevin2li/PDF-Guru
- **核心功能**：AI 把教材/论文/读书笔记转 Anki 卡（Q&A、Cloze、选择题）；PDF 管理套件（OCR、合并、拆分、旋转）；支持电子书/思维导图/视频截图转卡；Zotero 集成；多端同步；导出 Markdown/TXT/XLSX/PDF。
- **使用方式**：Web 应用（guru.kevin2li.com）或自部署，上传文档即可生成卡组。
- **适用场景**：已有读书笔记/导图，想批量变成可复习的 Anki 卡。
- ✅ PDF/多格式 ｜ ✅ 自动生成卡（笔记→卡）｜ ❌ 概念关联 ｜ ✅ 复习卡（导出 Anki）

### 15. study-buddy（Agent 制卡 + 速查表）
- **仓库**：https://github.com/seanpatrickmay/study-buddy
- **核心功能**：PDF/PPT/DOCX → CrewAI 多 Agent 提取概念 → 生成 Anki 卡 + 一页 LaTeX 速查表；Chroma 向量检索；Web UI。
- **使用方式**：`pip install -r requirements.txt` + `OPENAI_API_KEY` → `python run_webapp.py` 开 8000 端口。
- **适用场景**：备考/讲课，要「文档→卡+ cheat sheet」。
- ✅ PDF/PPT/DOCX ｜ ✅ 自动卡+速查 ｜ ❌ 概念关联 ｜ ✅ 复习卡

---

## 六、能力对照速查表

| 工具 | PDF 导入 | EPUB 导入 | 自动读书笔记 | 概念关联 | 复习提醒 |
|---|:--:|:--:|:--:|:--:|:--:|
| ebook-to-mindmap | ✅ | ✅ | ✅(导图/总结) | ❌ | ❌ |
| idlearn | ✅ | ✅ | ✅(摘要+Q&A) | ❌ | ✅(Anki) |
| read-box | ✅ | ✅ | ✅(摘要/金句/问答) | ❌ | ❌(可导出) |
| llm-ebook-summarizer | ✅ | ✅ | ✅(分章) | ❌ | ❌ |
| AI-reads-books-page-by-page | ✅ | ✅ | ✅(渐进) | ❌ | ❌ |
| My-Epub-Reader | ❌ | ✅ | ✅(标注) | ✅(双向链接) | ❌ |
| Readest | ✅(实验) | ✅ | ✅(标注) | ❌ | ❌ |
| obsidian-epub-annotator | ❌ | ✅ | ✅(→MD) | ❌(接SC) | ❌ |
| Smart Connections | 吃笔记 | 吃笔记 | ❌ | ✅✅(语义) | ❌ |
| CognitiveSB | ✅ | ❌ | ✅(笔记+测验) | ✅(图谱) | ✅(SM-2) |
| Anki | ❌ | ❌ | ❌(导入) | ❌ | ✅✅ |
| Incrementum | ✅ | ✅ | ✅(摘录) | ✅(图谱) | ✅✅(多算法) |
| Logseq | ✅(标注) | ❌ | ✅(块) | ✅(链接) | ✅(内置) |
| PDF-Guru | ✅ | ✅ | ✅(→卡) | ❌ | ✅(→Anki) |
| study-buddy | ✅ | ❌ | ✅(→卡) | ❌ | ✅(→Anki) |

---

## 七、落地建议（结合你的飞轮）

1. **拆书环节**：新书先丢 `ebook-to-mindmap` 出整书导图 + 章节导图，作为「骨架」喂给九思读书消化机制（cangjie RIA-TV++）。
2. **陪读问答**：`read-box` 或 `CognitiveSB` 做章节问答/苏格拉底拷问，产出的笔记落进 OB `02-知识库/读书消化/`。
3. **概念关联**：装 **Smart Connections** 插件，让每本书笔记、口播脚本、九思 SKILL 自动互链——这是「超越感觉」里讲的多视角/关联思维的直接技术落地。
4. **复习+口播**：用 `PDF-Guru`/`idlearn` 把笔记转 Anki 卡，按飞轮定期复习并回流到口播选题。
5. **阅读器**：日常深读换 `Readest`（跨端好看），高亮导出进 vault。

> 全部本地优先/可自部署，符合「数据不出去、系统留 C 盘、内容放 D 盘」的约定。需要我帮你把其中某一个（比如 read-box 或 Smart Connections）实际装起来跑通，说一声。
