# -*- coding: utf-8 -*-
"""
演示脚本: 注入跨环节 / 跨模型 / 跨时间样本数据, 并生成可查看的 demo 报告。
运行: python demo.py  -> 生成 demo.db + demo_report.html
"""
import os, json, datetime as dt
from tracker import Tracker

HERE = os.path.dirname(os.path.abspath(__file__))
db = os.path.join(HERE, "demo.db")
report = os.path.join(HERE, "demo_report.html")
for f in (db, report):
    if os.path.exists(f):
        try:
            os.remove(f)
        except OSError:
            pass  # 沙箱回收站不可用时忽略, 后续会覆盖写入

t = Tracker(db_path=db)  # 默认读取同目录 config.json 播种阈值
t.reset_counts()          # 清空旧调用/预警, 保证每次演示数据干净

# 为演示效果, 将部分阈值调小, 便于直观看到预警
t.set_threshold("GLM-4-Flash", limit=30, warn_ratio=0.8, period="day")
t.set_threshold("GPT-4o", limit=20, warn_ratio=0.85, period="month")
t.set_threshold("混元生图(ImageGen)", limit=8, warn_ratio=0.8, stage="image", period="month")

now = dt.datetime.now()

def seed(stage, model, n, day_offset, tokens=None):
    base = (now - dt.timedelta(days=day_offset)).replace(hour=10, minute=0, second=0)
    for i in range(n):
        ts = base + dt.timedelta(minutes=i * 7)
        t.record(stage, model, tokens=tokens, ts=ts)

# GLM-4-Flash 今日 26 次 -> 接近上限(24) 触发 warn
seed("chat", "GLM-4-Flash", 10, 0)
seed("codegen", "GLM-4-Flash", 9, 0)
seed("retrieval", "GLM-4-Flash", 7, 0)
seed("chat", "GLM-4-Flash", 5, 1)
seed("retrieval", "GLM-4-Flash", 4, 2)
seed("codegen", "GLM-4-Flash", 3, 3)

# GPT-4o 本月累计 21 次 -> 达到上限(20) 触发 limit
seed("codegen", "GPT-4o", 6, 0)
seed("chat", "GPT-4o", 5, 1)
seed("codegen", "GPT-4o", 4, 2)
seed("chat", "GPT-4o", 3, 4)
seed("retrieval", "GPT-4o", 3, 5)

# Claude-3.7 常规量
seed("codegen", "Claude-3.7", 4, 0)
seed("chat", "Claude-3.7", 3, 2)

# 混元生图(image) 7 次 -> 接近上限(6) 触发 warn
seed("image", "混元生图(ImageGen)", 7, 0)
seed("video", "可灵(Kling)", 2, 0)
seed("video", "可灵(Kling)", 1, 3)

t.export_report(report)
print("DEMO SUMMARY:", json.dumps(t.summary(), ensure_ascii=False))
print("ALERTS:", len(t.get_alerts()))
for a in t.get_alerts():
    print("  -", a["level"], "|", a["message"])
print("REPORT:", report)
