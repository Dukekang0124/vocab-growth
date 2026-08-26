# -*- coding: utf-8 -*-
"""
九思OS核心协议自检 - 每天检查关键协议是否"活着"
检测：①SOUL关键铁律是否完整 ②台账/状态日志是否在登记（检测有没有丢环节）
输出：有问题→非空stdout→推送提醒；正常→静默
"""
import os, datetime, re

HERMES = r"C:\Users\Admin\AppData\Local\hermes"
SOUL = os.path.join(HERMES, "SOUL.md")
TAIZHANG = r"D:\写作工具\知识管理\07-Hermes\变更台账.md"
ZHUANGTAI = r"D:\写作工具\知识管理\07-Hermes\状态日志.md"

issues = []
today = datetime.date.today().strftime("%Y-%m-%d")

# 1. SOUL 关键协议检查
soul_content = ""
if os.path.exists(SOUL):
    with open(SOUL, encoding="utf-8") as f:
        soul_content = f.read()

key_protocols = [
    ("收尾四查", "收尾四查强制协议"),
    ("沉淀内化", "沉淀内化铁律"),
    ("提醒内化", "提醒内化铁律"),
    ("集体自主进化", "集体自主进化"),
    ("九思OS", "九思OS"),
    ("高维进化", "高维进化系统"),
    ("独立思考", "独立思考铁律"),
    ("沉淀自觉", "沉淀自觉铁律"),
    ("变更影响", "变更影响检查"),
]
for name, kw in key_protocols:
    if kw not in soul_content:
        issues.append(f"⚠️ SOUL 缺失关键协议: {name} ({kw})")

# 2. 台账/状态日志最近3天是否有登记（检测有没有丢环节）
recent_taizhang = False
if os.path.exists(TAIZHANG):
    with open(TAIZHANG, encoding="utf-8") as f:
        tz = f.read()
    # 找最近3天日期的登记
    for d in range(3):
        check = (datetime.date.today() - datetime.timedelta(days=d)).strftime("%Y-%m-%d")
        if check in tz:
            recent_taizhang = True
            break
if not recent_taizhang:
    issues.append("⚠️ 变更台账最近3天无登记——可能有操作没走变更流程")

recent_zhuangtai = False
if os.path.exists(ZHUANGTAI):
    with open(ZHUANGTAI, encoding="utf-8") as f:
        zt = f.read()
    for d in range(3):
        check = (datetime.date.today() - datetime.timedelta(days=d)).strftime("%Y-%m-%d")
        if check in zt:
            recent_zhuangtai = True
            break
if not recent_zhuangtai:
    issues.append("⚠️ 状态日志最近3天无记录——可能有操作没登记")

# 输出
if issues:
    print(f"🔍 九思OS核心协议自检（{today}）发现 {len(issues)} 个问题：")
    for i in issues:
        print(i)
    print("请检查并修复。")
else:
    # 正常：静默（不推送）
    pass
