---
name: model-usage-tracker
summary: 模型使用统计与分析工具——按环节自动记录模型调用、统计频次、按阈值预警上限、生成可筛选的 HTML 汇总报告。零依赖, 单机可用。
type: tool
agent_created: true
location: D:\写作工具\知识管理\01-Projects-项目\开发项目\model-usage-tracker\
---

# 模型使用统计与分析工具 (model-usage-tracker)

## 何时用
- 想统计「在不同环节分别调了哪些模型、各用多少次」。
- 想设定各模型调用上限, 接近/达到时预警。
- 需要一份可按 环节/模型/时间 筛选查看的汇总报告。

## 位置与依赖
- 路径: `D:\写作工具\知识管理\01-Projects-项目\开发项目\model-usage-tracker\`
- 纯 Python 标准库 (sqlite3/json/datetime), 托管 Python 路径:
  `C:\Users\Admin\.workbuddy\binaries\python\versions\3.13.12\python.exe`
- 数据库默认 `usage.db` (同目录), 阈值默认 `config.json`。

## 自动埋点的三种方式
1. 直接: `python cli.py record --stage chat --model GLM-4-Flash --tokens 320`
2. 装饰器: `@track(tracker, stage="codegen", model="GPT-4o")` 包函数, 调用结束自动记录。
3. 上下文管理器: `with track_call(tracker, "retrieval", "GLM-4-Flash"): ...`
- 接入 WorkBuddy 自动化: 在自动化 prompt 关键步骤插入 `python cli.py record ...` 一行即可。

## 接入 WorkBuddy 自动化 (已落地, 2026-08-26)
- 已创建每日看板自动化 `automation-1787755016969`「模型使用统计·每日看板刷新」: 每日 23:00 跑, 调 `cli.py report --format md` 刷新 OB 看板 + `cli.py alerts --list` 汇报预警。cwds 指向 model-usage-tracker 目录。
- **⚠️ 模型卡点(铁律)**: automation 工具不暴露 model 字段。新建后必须手动把该 automation 的模型改为免费模型 `GLM-4-Flash`(智谱免费), 否则该 automation 视为未完成。
- **真实调用埋点模板**(贴进任何会调模型的自动化 prompt 末尾即可累计真实数据):
  `C:/Users/Admin/.workbuddy/binaries/python/versions/3.13.12/python.exe "D:/写作工具/知识管理/01-Projects-项目/开发项目/model-usage-tracker/cli.py" record --stage <chat|codegen|retrieval|image|video> --model <模型名>`
- **已接入(2026-08-26)**: 「主动扫描官网/GitHub新能力」自动化 (automation-1787376221234, 周一21:00) prompt 末尾已加埋点 `record --stage retrieval --model GLM-4-Flash`, 每次跑即在 usage.db 累计 1 次检索调用。
- **已接入(2026-08-26)**: 两个 once 任务「WB重启后续任务提醒」(automation-1787704687718) 与「提醒清理 skill 迁移兜底副本」(automation-1787306597416, 08-28) 也加埋点 `record --stage automation --model GLM-4-Flash`。提醒类用 `automation` 环节, 与人工 `chat` 区分, 看板可辨自动化触发量。

## 常用命令 (CLI)
- `python cli.py record --stage <环节> --model <模型> [--tokens N] [--meta '{}'] [--ts ISO]`
- `python cli.py stats --by cumulative|stage-model|timeline|summary [--stage X --model Y --since D --until D]`
- `python cli.py report --out report.html [--format md] [--since D --until D]`
- `python cli.py config --list` / `python cli.py config --model X --limit N [--warn 0.8] [--stage S] [--period day|week|month]`
- `python cli.py alerts --list [--level warn|limit] [--ack ID] [--resolve ID]`
- 全局可加 `--db 指定库路径` (默认 usage.db)
- 演示: `python demo.py` 生成 `demo.db` + `demo_report.html`

## 在 Obsidian (OB) 实时查看
- 报告支持 Markdown 格式: `python cli.py report --format md --out <vault路径>.md`
- **自动实时**: `config.json` 的 `auto_report` 已启用, 每次 `record` 后自动把报告重写到
  `D:\写作工具\知识管理\02-Areas-资产\九思-数字资产\模型使用统计.md`。
  OB 热重载该文件 → 打开即是实时看板 (静态表格/图表; 交互筛选仅浏览器 HTML 版可用, OB 会清 `<script>`)。
- 想换位置/关闭自动: 改 `config.json` 的 `auto_report.path` / `enabled`。
- 关闭自动后手动刷新: 跑一次 `python cli.py report --format md --out <vault路径>.md` 即可。

## 核心数据结构
- `calls`: 每次调用 (stage, model, ts, ts_epoch, status, tokens, cost, meta)
- `thresholds`: 阈值 (model, stage[空串=全局], limit_n, warn_ratio, period)
- `alerts`: 预警 (model, stage, level[warn/limit], ts, acknowledged, resolved)

## ⚠️ 关键坑 (已修复, 勿回退)
- **SQLite UNIQUE(model, stage) 对 NULL 视为不同值** → 全局阈值用 `stage=''` (空串) 而非 NULL, 否则 `set_threshold` 会插入重复行、旧的大限值胜出、预警永不触发。相关代码:`_seed_default_thresholds` / `set_threshold` / `_evaluate` / `_count` 均按空串处理。

## 设计要点
- 阈值分两级: stage 专属优先于 全局。
- period 支持 day/week/month 周期窗口计数 (如免费模型按日限)。
- 预警去重: 同 model+stage+level 已有未解除预警则不再重复生成。
- 报告为单文件离线 HTML (内联 CSS/JS), 前端按环节/模型/日期实时筛选, 含频次柱状图、环节分布、每日趋势、预警列表、原始明细。
