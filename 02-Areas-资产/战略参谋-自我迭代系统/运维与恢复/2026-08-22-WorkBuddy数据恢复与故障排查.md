---
分类: 03-运维与恢复
---

# WorkBuddy 数据恢复与故障排查手册

> 记录于 2026-08-22 · 一次「卸载重装导致数据看似全丢」事故的完整复盘

## 一、事故现象

关闭 WorkBuddy 后点了「更新按钮」，重开后：历史对话列表、身份文件（IDENTITY/SOUL/USER）、长期记忆（MEMORY.md）全部消失，界面像全新安装。

## 二、根因（一句话）

**不是更新，是卸载重装 + 迁移脚本找错路径。**

完整链条：

1. **触发**：点「更新按钮」实际走的是腾讯电脑管家（`qm-uninstall.exe`）的**卸载重装**，不是原地升级。证据：卸载前后版本号都是 `5.3.14`、build 完全一致；`update` 日志每次 `No update available (HTTP 204)`。
2. **冷藏**：卸载时把 `C:\Users\Admin\.workbuddy` 整体改名成 `.workbuddy.old` 保留（未删除，数据安全）。
3. **找错路径**：重装后首次启动（`startup_type=first_install`）跑数据迁移，但迁移源路径写死为 `AppData\Roaming\WorkBuddy\codebuddy-sessions.vscdb`（更老的 VS Code 扩展版路径），**没有读同级的 `.workbuddy.old`**，迁移 0 条。
4. **结果**：数据在界面上「消失」，实际全在 `.old` 里，一个字节没丢。

## 三、排查方法（下次照做）

1. 先别慌，数据目录大概率没删，只是被改名。看 `C:\Users\Admin\` 下有没有 `.workbuddy.old`（或 `.workbuddy.bak`）。
2. 看迁移日志：`~/.workbuddy/logs/migration/migration-YYYYMMDD.log`，搜 `exists=false` 和 `Skipped`，确认它找的是哪个路径。
3. 看版本号：对比 `~/.workbuddy/last-launch.json` 和 `~/.workbuddy.old/last-launch.json`，若版本号相同 → 是卸载重装，不是升级。
4. 看卸载日志：`~/.workbuddy.old/logs/update/qm-uninstall.log`，确认是否腾讯电脑管家触发。
5. 查数据库：`workbuddy.db` 的 `sessions` 表行数。旧库（.old 里）行数多、新库行数少 → 数据没迁移过来。

## 四、恢复步骤（已验证）

关键前提：新旧 `workbuddy.db` 的 `sessions`/`automations`/`session_usage` 表 schema 完全一致，可直接 INSERT 合并。

1. **恢复文件类**（身份、记忆）：
   ```
   cp ~/.workbuddy.old/MEMORY.md ~/.workbuddy/MEMORY.md
   cp ~/.workbuddy.old/IDENTITY.md ~/.workbuddy/IDENTITY.md
   cp ~/.workbuddy.old/USER.md ~/.workbuddy/USER.md
   cp ~/.workbuddy.old/SOUL.md ~/.workbuddy/SOUL.md
   ```
2. **恢复数据库**（对话历史、定时任务）——用 Python sqlite3：
   ```python
   con = sqlite3.connect('~/.workbuddy/workbuddy.db', timeout=30)
   con.execute("ATTACH DATABASE '~/.workbuddy.old/workbuddy.db' AS old")
   for t in ['sessions','automations','session_usage']:
       con.execute(f"INSERT OR IGNORE INTO main.{t} SELECT * FROM old.{t}")
   con.commit()
   ```
3. **恢复项目/任务/计划**：`cp -rn ~/.workbuddy.old/projects/* ~/.workbuddy/projects/`（tasks、plans 同理）
4. **恢复 skill 接入**：`~/.workbuddy/skills` 用 junction 指向 `D:\写作工具\知识管理\08-九思搭档知识库\04-SKILL`（`mklink /J`，无需管理员）
5. **重启 WorkBuddy**，历史会话才会在侧边栏刷新出来。

## 五、关键路径清单

| 项 | 路径 |
|---|---|
| 新数据目录 | `C:\Users\Admin\.workbuddy\` |
| 旧数据备份 | `C:\Users\Admin\.workbuddy.old\` |
| 对话库 | `~/.workbuddy/workbuddy.db`（sessions/automations/session_usage 表） |
| 记忆 | `~/.workbuddy/MEMORY.md` |
| 身份 | `~/.workbuddy/IDENTITY.md`、`SOUL.md`、`USER.md` |
| 自定义 skill | `D:\写作工具\知识管理\08-九思搭档知识库\04-SKILL\` |
| 迁移日志 | `~/.workbuddy/logs/migration/` |
| 更新日志 | `~/.workbuddy/logs/update/` |

## 六、预防措施（已落地）

1. **自动备份**：已建定时任务「WorkBuddy 数据自动备份」，每天 23:30 把 `workbuddy.db`、`MEMORY.md`、身份文件、`04-SKILL` 备份到 `D:\写作工具\知识管理\08-九思搭档知识库\备份\WorkBuddy数据\<日期>\`。
2. **更新前自查**：以后点更新前，先手动把 `~/.workbuddy` 复制一份到 D 盘；或确认这次更新是否是「卸载重装」式。
3. **待反馈**：卸载重装后 `.workbuddy.old` 未自动恢复，属产品缺陷，建议向官方反馈。
