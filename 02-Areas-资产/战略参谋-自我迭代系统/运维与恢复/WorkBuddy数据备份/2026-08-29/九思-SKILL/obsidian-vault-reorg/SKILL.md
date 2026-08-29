---
name: obsidian-vault-reorg
description: Obsidian/PARA 笔记库重组 + 全面核查 + 断链修复的可复用工作流。当用户要整理/合并 Obsidian vault（目录归并、PARA 化、查重去冗余、修 wikilink 断链、修插件/模板/Daily Notes 配置、清理空目录）时使用。覆盖审计→规划→幂等脚本（全量备份+junction保护+哈希去重）→执行→验证→固化全链路。
---

# Obsidian Vault 重组与核查工作流

本 skill 沉淀自一次真实的「Hermes + 九思共享 vault → PARA 标准化」重组（2026-08-26）。
核心价值：**用脚本批量搬目录/修链接时，Obsidian 的 `alwaysUpdateLinks` 不会触发**（只在 Obsidian 内用 UI 移动才触发），所以必须自己写链接修复；且删除受沙箱 safe-delete 护栏约束。

## 适用场景
- 多套知识库/多前缀目录（如 `九思-XXX` / `OPC指挥部`）合并进统一 PARA 结构
- 全盘核查：插件一致性、配置错误、断链、空目录、孤儿文件、frontmatter
- 重组后断链修复（路径段重映射 + 唯一基名回退）
- 清理空壳目录 / 收编游离目录

## 硬规则（踩坑结论，必须遵守）
1. **先全量备份再动**：`shutil.copytree(vault, backup_dir)`（避开 `.trash`）。每个阶段独立备份，命名带时间戳。可一键回滚。
2. **junction 只进不出**：`C:\Users\Admin\.workbuddy\skills` → `03-Resources-资源/九思-SKILL` 是硬链，搬移/删除脚本绝对不能动这个目录及其内容。保护名单里必须含 `九思-SKILL`、`.obsidian`、`.git`。
3. **插件数据目录保留在根**：`Excalidraw/`、`copilot/`、`weread/` 是 Obsidian 插件按相对路径写数据的位置，移走会导致下次打开时旧位重建空目录、历史（画图/对话/读书标注）丢失。**归并计划必须排除它们**。
4. **wikilink 不要带 `.md`**：标准 Obsidian 链接是 `[[笔记名]]` 不是 `[[笔记名.md]]`。修链接时改写目标要 `os.path.splitext(np)[0]` 去扩展名，否则污染笔记且非标准。
5. **删除走回收站、回收站不可用则失败闭合**：环境的 safe-delete 护栏要求删除走回收站（`windows-sandbox-recycle-bin-unavailable`）。`os.remove/os.rmdir` 在沙箱内/外都会被拦截、**零删除**。空目录清理若被拦，属有意安全行为，记录即可，不等同脚本 bug。
6. **不要伪造笔记**：断链分「可修」（目标存在、只是路径错/隐式）与「不可修」（笔记从未创建=前向链接，或歧义多候选）。后者只登记不修，等人工补写或接受。
7. **WB 配置改动需关闭态**：改 `C:\Users\Admin\.workbuddy\app\app-config.json` 的 `defaultWorkspacePath` 根除空壳重建，必须在 WorkBuddy 完全关闭时改，否则可能被运行时覆盖/重建。

## 标准工作流

### Step 1 — 审计（只读，先摸清）
脚本：`obsidian-audit.py`（见下方「参考脚本」）。产出：
- 库体 stats（文件数 / md 数 / 空目录数 / 孤儿文件数）
- 断裂 wikilink 清单（分类：path 缺失 / basename 缺失 / 图片缺失）
- 配置复核（app.json / daily-notes.json / templates.json / periodic-notes.json / community-plugins.json）
- 插件启用与安装目录一致性
- frontmatter 规范率

### Step 2 — 规划归并（MERGE_PLAN）
源→目标映射表，每条含：冲突处理（同名异内容加 `__冲突-九思` 后缀）、去重（内容 sha256）、保护名单。示例：
```
源 02-Areas-资产/九思-自媒体  → 目标 01-Projects-项目/OPC指挥部/自媒体系统
源 05-Skills                  → 目标 07-Hermes/02-技能与工具
```

### Step 3 — 执行归并（幂等脚本）
- 顶层文件用 `os.path.isfile` 分支搬（避免 `os.walk` 漏搬顶层文件导致父目录判非空不删）
- 目标为空时跳过（避免退化成撒到 vault 根）
- 空壳目录（0 文件）直接删；有内容的先核对再搬

### Step 4 — 断链修复（最易翻车）
脚本：`obsidian-link-fix-final.py`。逻辑：
1. 路径段前缀映射 `PREFIX_MAP`（本会话所有已知移动：old → new），校验新目标 `.md` 真实存在才改写。
2. 唯一基名回退：`[[Note]]` 若库内唯一同名笔记存在 → 改写为完整路径（显式、去歧义）。
3. 图片：按基名在库内查找，命中唯一则改写相对路径。
4. 其余（缺失笔记 / 歧义 / 目录链接）→ 登记跳过，不修。
- **幂等**：已正确的链接 `new_inner == inner` 不改写；重跑安全。

### Step 5 — 配置修复（MED 级错误）
- `app.json` → `newFileFolderPath` 指向存在的收件箱（如 `00-inbox`）；`attachmentFolderPath` 指向 `附件` 而非 `/`（避免散落根）。
- `templates.json` → `folder` 指向存在的模板目录；明确 Templater 为主、关闭核心 Templates 冲突。
- `periodic-notes.json` → 配 `daily` 指向 Daily Notes 实际落点。
- 补建缺失的 `00-inbox` / `模板` / `附件` 目录。
- 补建当日每日复盘（若缺）。

### Step 6 — 验证（必须）
- 重跑审计脚本，确认断链数下降、配置 JSON 仍合法。
- 根级游离目录已清除、目标内容完整。

### Step 7 — 固化（经验资产化）
把本次流程写成 skill（即本文件），脚本存 `D:\写作工具\` 并归档 OB。

## 参考脚本（已落盘 D:\写作工具\）
- `obsidian-audit.py` — 全面核查（断链/配置/空目录/孤儿/frontmatter）
- `obsidian-link-fix-final.py` — 断链修复（前缀映射 + 基名回退，全量备份，幂等）
- `link-audit-remaining.py` — 复检残留断链
- `linkfix-categorize.py` — 残链分类（folder-link / missing / ambiguous）
- `vault-reorg-t2/t3/t4.py` — 各阶段归并执行
- `obsidian-remediation.py` — 综合修复（备份+断链+配置+复盘+T1补丁）

## 关键陷阱速查
| 现象 | 根因 | 处置 |
|---|---|---|
| 搬完目录后大量断链 | 脚本搬文件，Obsidian 不自动改链 | 必须自己跑 link-repair |
| `[[Note.md]]` 链接变多 | 修链接时忘了去 .md 扩展名 | `os.path.splitext` 去掉 |
| 审计报 312 断链，其实很多 `[[Note]]` 能打开 | 严格扫描把「隐式基名链接」算成断链（假阳性） | 基名唯一存在即视为有效，改写为显式路径 |
| 空目录删不掉 | 沙箱 safe-delete 要求回收站，当前不可用 | 记录为环境约束，非 bug |
| 删 `九思-投资` 后内容丢了 | 实际是空壳，内容首轮已并入目标系统 | 先查文件数再删，零丢失 |
| 关闭 WB 后旧目录又冒出来 | `app-config.json` 的 `defaultWorkspacePath` 指向已删目录，WB 重启重建空壳 | 关闭态改配置指向新名 |
