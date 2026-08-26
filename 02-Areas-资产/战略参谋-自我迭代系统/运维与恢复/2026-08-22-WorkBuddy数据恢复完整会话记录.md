---
分类: 03-运维与恢复
---

# WorkBuddy 数据恢复完整会话记录

> 记录于 2026-08-22 · 本次会话（be156de1）完整复盘 · 归档至「系统问题」

## 一句话概述

康哥关闭 WorkBuddy 后点了「更新按钮」，重开后历史对话、身份、记忆看似全部消失。经排查：**不是更新，是卸载重装 + 迁移脚本找错路径**，数据从头到尾一条没丢，已全部恢复并加固防再犯。

## 会话背景

2026-08-22 上午，康哥关掉 WorkBuddy 后点了「更新」，重开后发现之前所有对话和记录都不见了，来求助。

## 完整时间线

### 阶段一：数据恢复（第一轮）
- 排查发现：旧数据被完整备份到 `C:\Users\Admin\.workbuddy.old`，新目录 `~/.workbuddy` 是全新的空目录
- 旧 `workbuddy.db`（120KB，9 条会话）schema 与新库完全一致，直接用 SQL INSERT 合并恢复
- 恢复内容：9 条历史会话、1 条定时任务、7 条用量记录、身份文件（IDENTITY/SOUL/USER）、长期记忆 MEMORY.md、projects/tasks/plans
- 身份文件里旧名「阿Q」统一改为「九思」

### 阶段二：体检 + 根因锁定（第二轮，重启后）
- 重启后验证：数据持久，迁移逻辑幂等跳过，不会再重置
- **根因修正**：不是「更新到新版本」，而是「卸载重装」——三个铁证：
  1. 卸载前后版本号都是 `5.3.14`、build 完全一致
  2. `qm-uninstall.log` 显示 11:22-11:25 腾讯电脑管家对 `D:\AI` 执行卸载
  3. 康哥确认「点了更新按钮」（实际触发卸载重装）
- 完整根因链：**卸载 → 数据目录改名 `.old` 冷藏 → 重装后迁移脚本找错路径（去翻老版 codebuddy-sessions.vscdb，从没读 `.old`）→ 迁移 0 条 → 表现为"全没了"**
- 遗留 3 项修复：skill junction 重连、目录名统一（08-阿Q知识库→08-九思搭档知识库）、身份名统一（阿Q→九思）

### 阶段三：修复 4 个会话点不开（第三轮）
- 现象：自媒体学习库、英语开口练、分析公众号、智谱免费模型 4 个会话点不开
- 根因：这 4 个时间戳目录实际在 `工作空间\` 子目录下，但上轮改 cwd 时漏了插入「工作空间」层
- 修正：SQL 插入 `工作空间\` 层，10 条会话 cwd 全部指向存在目录

### 阶段四：深度体检（第四轮）
- 全面对比 `.old` 与新目录，逐项核对配置与会话
- 发现并修复 3 个小问题：GLM-4-Flash 模型配置、settings 省钱开关、智谱会话 model 字段被降级 auto
- 确认无恙：WEREAD_API_KEY 环境变量、MCP（agent-mail）、4 个自定义 skill、身份、记忆

### 阶段五：自动化模型约定（第五轮）
- 康哥定：自动化任务一律用不花钱但质量最高的免费模型
- 落地：2 条 automation 的 model_id 从 `deepseek-v4-pro` 改为 `custom-local:GLM-4-Flash`（智谱免费模型），并写入长期记忆

## 关键决策与操作清单

| 操作 | 说明 |
|---|---|
| db 合并 | 旧 sessions/automations/session_usage INSERT 进新库（schema 一致） |
| 身份恢复 | IDENTITY/SOUL/USER.md 从 .old 迁回，阿Q→九思 |
| 记忆恢复 | MEMORY.md 从 .old 迁回 |
| skill 接入 | `~/.workbuddy/skills` 用 junction 指向 `08-九思搭档知识库\04-SKILL` |
| 目录名统一 | 08-阿Q知识库 → 08-九思搭档知识库（记忆/约定/定时任务/会话 cwd） |
| 模型恢复 | GLM-4-Flash 补回 models.json |
| 省钱配置 | settings.json 补回 enableModelOptimization=false |
| 自动化模型 | 改 GLM-4-Flash（免费） |

## 根因结论

**卸载重装 + 新版迁移逻辑缺「从 .old 恢复」分支。**

康哥点「更新按钮」→ 腾讯电脑管家执行卸载重装 → `~/.workbuddy` 被改名 `.old` 冷藏 → 重装后迁移脚本源路径写死为 `AppData\Roaming\WorkBuddy\codebuddy-sessions.vscdb`（更老版本路径），没读同级的 `.old` → 迁移 0 条 → 数据在界面"消失"（实际全在 `.old`）。

## 防再犯机制（三层保险）

1. **自动备份**：定时任务「WorkBuddy 数据自动备份」每天 23:30 备份 db+记忆+身份+04-SKILL 到 D 盘
2. **一键恢复脚本**：`02-知识库/2026-08-22-WorkBuddy数据恢复脚本.py`
3. **恢复手册**：`02-知识库/2026-08-22-WorkBuddy数据恢复与故障排查.md`

**规避口诀**：更新前先手动把 `C:\Users\Admin\.workbuddy` 复制一份到 D 盘。

## 遗留待办

- `.workbuddy.old` 备份观察 2-3 天后清理（与 8/28 skill 兜底副本清理合并）
- `~/.workbuddy/skills.empty.bak` 空目录待确认后删

## 关联文档

- `02-知识库/2026-08-22-WorkBuddy数据恢复与故障排查.md`（技术手册）
- `02-知识库/2026-08-22-WorkBuddy数据恢复脚本.py`（一键恢复）
