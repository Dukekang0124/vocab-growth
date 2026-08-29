# -*- coding: utf-8 -*-
"""
模型使用统计 CLI
================
子命令:
  record   记录一次模型调用
  stats    查看统计 (环节×模型 / 累计 / 趋势)
  report   生成 HTML 汇总报告
  config   设置/查看阈值
  alerts   查看/确认/解除预警
  reset    清空调用记录与预警 (周期重置)

示例:
  python cli.py record --stage chat --model GLM-4-Flash
  python cli.py record --stage codegen --model GPT-4o --tokens 1200 --meta '{"file":"x.py"}'
  python cli.py stats --by cumulative
  python cli.py report --out report.html
  python cli.py config --list
  python cli.py config --model GLM-4-Flash --limit 800 --period day
  python cli.py alerts --list
"""
from __future__ import annotations
import argparse, json, sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from tracker import Tracker


def _print_table(rows: list, cols: list):
    if not rows:
        print("（无数据）")
        return
    widths = {c: max(len(c), *(len(str(r.get(c, ""))) for r in rows)) for c in cols}
    line = " | ".join(c.ljust(widths[c]) for c in cols)
    print(line)
    print("-" * len(line))
    for r in rows:
        print(" | ".join(str(r.get(c, "")).ljust(widths[c]) for c in cols))


def cmd_record(a, t: Tracker):
    meta = json.loads(a.meta) if a.meta else None
    res = t.record(stage=a.stage, model=a.model, status=a.status,
                   tokens=a.tokens, cost=a.cost, meta=meta, ts=a.ts)
    print(f"已记录 call_id={res['call_id']}")
    if res["alert"]:
        print(f"[预警:{res['alert']['level']}] {res['alert']['message']}")


def cmd_stats(a, t: Tracker):
    if a.by == "stage-model":
        rows = t.stats_by_stage_model(stage=a.stage, model=a.model, since=a.since, until=a.until)
        _print_table(rows, ["stage", "model", "cnt", "first_ts", "last_ts"])
    elif a.by == "cumulative":
        rows = t.cumulative_by_model(since=a.since, until=a.until)
        _print_table(rows, ["model", "total"])
    elif a.by == "timeline":
        rows = t.timeline(bucket=a.bucket, stage=a.stage, model=a.model, since=a.since, until=a.until)
        _print_table(rows, ["bucket", "count"])
    elif a.by == "summary":
        print(json.dumps(t.summary(), ensure_ascii=False, indent=2))


def cmd_report(a, t: Tracker):
    out = t.export_report(a.out, since=a.since, until=a.until, fmt=a.format)
    print("报告已生成:", os.path.abspath(out))


def cmd_config(a, t: Tracker):
    if a.list:
        _print_table(t.get_thresholds(), ["model", "stage", "limit_n", "warn_ratio", "period"])
        return
    if not a.model or a.limit is None:
        print("设置阈值需 --model 与 --limit"); sys.exit(1)
    t.set_threshold(a.model, a.limit, warn_ratio=a.warn or 0.8, stage=a.stage, period=a.period)
    print(f"已设置阈值: {a.model} stage={a.stage} limit={a.limit} warn={a.warn} period={a.period}")


def cmd_alerts(a, t: Tracker):
    if a.ack:
        t.acknowledge_alert(a.ack); print("已确认:", a.ack); return
    if a.resolve:
        t.resolve_alert(a.resolve); print("已解除:", a.resolve); return
    rows = t.get_alerts(resolved=a.resolved, level=a.level)
    _print_table(rows, ["id", "level", "model", "stage", "ts", "resolved", "message"])


def cmd_reset(a, t: Tracker):
    t.reset_counts(model=a.model)
    print("已清空记录" + (f" (模型={a.model})" if a.model else ""))


def build_parser():
    p = argparse.ArgumentParser(description="模型使用统计与分析工具")
    p.add_argument("--db", help="指定数据库路径 (默认同目录 usage.db)")
    sub = p.add_subparsers(dest="cmd", required=True)

    pr = sub.add_parser("record", help="记录一次模型调用")
    pr.add_argument("--stage", required=True)
    pr.add_argument("--model", required=True)
    pr.add_argument("--status", default="ok")
    pr.add_argument("--tokens", type=int)
    pr.add_argument("--cost", type=float)
    pr.add_argument("--meta", help="JSON 字符串")
    pr.add_argument("--ts", help="时间(ISO/epoch), 默认现在")
    pr.set_defaults(func=cmd_record)

    ps = sub.add_parser("stats", help="查看统计")
    ps.add_argument("--by", default="stage-model",
                    choices=["stage-model", "cumulative", "timeline", "summary"])
    ps.add_argument("--stage"); ps.add_argument("--model")
    ps.add_argument("--since"); ps.add_argument("--until")
    ps.add_argument("--bucket", default="day", choices=["day", "week", "month"])
    ps.set_defaults(func=cmd_stats)

    pp = sub.add_parser("report", help="生成 HTML/Markdown 报告")
    pp.add_argument("--out", default="report.html")
    pp.add_argument("--format", dest="format", default="html", choices=["html", "md"])
    pp.add_argument("--since"); pp.add_argument("--until")
    pp.set_defaults(func=cmd_report)

    pc = sub.add_parser("config", help="设置/查看阈值")
    pc.add_argument("--list", action="store_true")
    pc.add_argument("--model"); pc.add_argument("--stage")
    pc.add_argument("--limit", type=int)
    pc.add_argument("--warn", type=float, default=0.8)
    pc.add_argument("--period", choices=["day", "week", "month", None])
    pc.set_defaults(func=cmd_config)

    pa = sub.add_parser("alerts", help="预警管理")
    pa.add_argument("--list", action="store_true")
    pa.add_argument("--resolved", type=bool, default=None)
    pa.add_argument("--level", choices=["warn", "limit", None])
    pa.add_argument("--ack", type=int, help="确认预警ID")
    pa.add_argument("--resolve", type=int, help="解除预警ID")
    pa.set_defaults(func=cmd_alerts)

    prs = sub.add_parser("reset", help="清空记录")
    prs.add_argument("--model")
    prs.set_defaults(func=cmd_reset)
    return p


def main():
    args = build_parser().parse_args()
    t = Tracker(db_path=args.db)
    args.func(args, t)
    t.close()


if __name__ == "__main__":
    main()
