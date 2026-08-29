#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
模型使用统计与分析工具 - 九思
用法:
  python usage_tracker.py log --model "豆包2.1 Pro" --category "办公任务/Agent" --task "任务描述"
  python usage_tracker.py log --model "豆包2.1 Turbo" --category "内容创作" --task "写口播脚本" --cost low
  python usage_tracker.py report
  python usage_tracker.py check
"""

import json
import sys
import os
import argparse
from datetime import datetime, timedelta
from collections import defaultdict

DATA_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), "usage_data.json")
HTML_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), "模型使用统计看板.html")
MD_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), "模型使用统计.md")


def load_data():
    with open(DATA_FILE, "r", encoding="utf-8") as f:
        return json.load(f)


def save_data(data):
    with open(DATA_FILE, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)


def log_usage(model, category, task, cost="high", notes=""):
    data = load_data()
    record = {
        "id": len(data["records"]) + 1,
        "timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        "model": model,
        "category": category,
        "task": task,
        "cost_type": cost,
        "notes": notes
    }
    data["records"].append(record)
    save_data(data)
    print(f"[OK] 记录已保存: [{category}] {model} - {task}")
    
    # 检查阈值
    warnings = check_thresholds(data, model, category)
    for w in warnings:
        print(f"[WARNING] {w}")
    return record


def check_thresholds(data=None, model=None, category=None):
    if data is None:
        data = load_data()
    warnings = []
    now = datetime.now()
    today_str = now.strftime("%Y-%m-%d")
    five_hours_ago = now - timedelta(hours=5)
    seven_days_ago = now - timedelta(days=7)
    
    thresholds = data.get("thresholds", {})
    global_th = data.get("global_thresholds", {})
    
    # 按模型统计今日和5小时窗口
    model_today = defaultdict(int)
    model_5h = defaultdict(int)
    cat_today = defaultdict(int)
    cat_5h = defaultdict(int)
    high_cost_today = 0
    high_cost_5h = 0
    high_cost_7d = 0
    
    for r in data["records"]:
        ts = datetime.strptime(r["timestamp"], "%Y-%m-%d %H:%M:%S")
        m = r["model"]
        c = r["category"]
        is_high = r.get("cost_type") == "high"
        if r["timestamp"].startswith(today_str):
            model_today[m] += 1
            cat_today[c] += 1
            if is_high:
                high_cost_today += 1
        if ts >= five_hours_ago:
            model_5h[m] += 1
            cat_5h[c] += 1
            if is_high:
                high_cost_5h += 1
        if ts >= seven_days_ago:
            if is_high:
                high_cost_7d += 1
    
    # 全局高算力阈值检查（7天滚动）
    limit_7d = global_th.get("high_cost_7d", 20)
    if high_cost_7d >= limit_7d:
        warnings.append(f"🔴 高算力7天滚动已用 {high_cost_7d}/{limit_7d} 次，已达上限! 预计{ (seven_days_ago + timedelta(days=7)).strftime('%m-%d %H:%M')} 恢复")
    elif high_cost_7d >= limit_7d * 0.8:
        warnings.append(f"🟡 高算力7天滚动已用 {high_cost_7d}/{limit_7d} 次，接近上限!")
    
    # 全局高算力5小时窗口
    limit_5h = global_th.get("high_cost_5h", 5)
    if high_cost_5h >= limit_5h:
        warnings.append(f"🔴 高算力5小时窗口已用 {high_cost_5h}/{limit_5h} 次，已触发限流!")
    elif high_cost_5h >= limit_5h * 0.8:
        warnings.append(f"🟡 高算力5小时窗口已用 {high_cost_5h}/{limit_5h} 次，接近限流!")
    
    # 检查模型阈值
    for m_name, th in thresholds.items():
        if th.get("daily", -1) > 0:
            used = model_today.get(m_name, 0)
            limit = th["daily"]
            if used >= limit:
                warnings.append(f"模型 [{m_name}] 今日已用 {used}/{limit} 次，已达上限!")
            elif used >= limit * 0.8:
                warnings.append(f"模型 [{m_name}] 今日已用 {used}/{limit} 次，接近上限!")
        if th.get("window_5h", -1) > 0:
            used = model_5h.get(m_name, 0)
            limit = th["window_5h"]
            if used >= limit:
                warnings.append(f"模型 [{m_name}] 5小时窗口已用 {used}/{limit} 次，已触发限流!")
            elif used >= limit * 0.8:
                warnings.append(f"模型 [{m_name}] 5小时窗口已用 {used}/{limit} 次，接近限流!")
    
    # 检查环节阈值（办公任务、图片、视频）
    cat_thresholds = {
        "办公任务/Agent": thresholds.get("办公任务/Agent", {}),
        "图片生成": thresholds.get("图片生成", {}),
        "视频生成": thresholds.get("视频生成", {})
    }
    for c_name, th in cat_thresholds.items():
        if th.get("daily", -1) > 0:
            used = cat_today.get(c_name, 0)
            limit = th["daily"]
            if used >= limit:
                warnings.append(f"环节 [{c_name}] 今日已用 {used}/{limit} 次，已达上限!")
            elif used >= limit * 0.8:
                warnings.append(f"环节 [{c_name}] 今日已用 {used}/{limit} 次，接近上限!")
    
    return warnings


def generate_report():
    data = load_data()
    records = data["records"]
    models = data["models"]
    categories = data["categories"]
    thresholds = data["thresholds"]
    
    now = datetime.now()
    today_str = now.strftime("%Y-%m-%d")
    five_hours_ago = now - timedelta(hours=5)
    seven_days_ago = now - timedelta(days=7)
    global_th = data.get("global_thresholds", {})
    
    # 统计
    total = len(records)
    today_count = sum(1 for r in records if r["timestamp"].startswith(today_str))
    high_cost = sum(1 for r in records if r.get("cost_type") == "high")
    high_cost_today = sum(1 for r in records if r.get("cost_type") == "high" and r["timestamp"].startswith(today_str))
    high_cost_5h = sum(1 for r in records if r.get("cost_type") == "high" and datetime.strptime(r["timestamp"], "%Y-%m-%d %H:%M:%S") >= five_hours_ago)
    high_cost_7d = sum(1 for r in records if r.get("cost_type") == "high" and datetime.strptime(r["timestamp"], "%Y-%m-%d %H:%M:%S") >= seven_days_ago)
    limit_7d = global_th.get("high_cost_7d", 20)
    limit_5h = global_th.get("high_cost_5h", 5)
    
    # 模型统计
    model_counts = defaultdict(int)
    for r in records:
        model_counts[r["model"]] += 1
    
    # 环节统计
    cat_counts = defaultdict(int)
    for r in records:
        cat_counts[r["category"]] += 1
    
    # 最近7天趋势
    date_counts = defaultdict(int)
    for i in range(7):
        d = (now - timedelta(days=i)).strftime("%m-%d")
        date_counts[d] = 0
    for r in records:
        d = r["timestamp"][5:10]
        if d in date_counts:
            date_counts[d] += 1
    trend_dates = list(reversed(list(date_counts.keys())))
    trend_values = [date_counts[d] for d in trend_dates]
    
    # 模型×环节交叉
    cross = defaultdict(lambda: defaultdict(int))
    for r in records:
        cross[r["model"]][r["category"]] += 1
    
    # 预警
    warnings = check_thresholds(data)
    
    # 5小时窗口统计
    count_5h = sum(1 for r in records if datetime.strptime(r["timestamp"], "%Y-%m-%d %H:%M:%S") >= five_hours_ago)
    
    # 最近20条记录
    recent = records[-20:][::-1]
    
    # 高算力消耗占比
    cost_breakdown = defaultdict(int)
    for r in records:
        cost_breakdown[r.get("cost_type", "unknown")] += 1
    
    # 准备JSON数据注入HTML
    chart_data = {
        "modelLabels": list(model_counts.keys()),
        "modelValues": list(model_counts.values()),
        "catLabels": list(cat_counts.keys()),
        "catValues": list(cat_counts.values()),
        "trendDates": trend_dates,
        "trendValues": trend_values,
        "crossModels": list(cross.keys()),
        "crossCategories": categories,
        "crossData": {m: [cross[m].get(c, 0) for c in categories] for m in cross},
        "costLabels": list(cost_breakdown.keys()),
        "costValues": list(cost_breakdown.values()),
        "recent": recent,
        "warnings": warnings,
        "thresholds": thresholds,
        "summary": {
            "total": total,
            "today": today_count,
            "highCost": high_cost,
            "highCostToday": high_cost_today,
            "highCost5h": high_cost_5h,
            "highCost7d": high_cost_7d,
            "limit7d": limit_7d,
            "limit5h": limit_5h,
            "count5h": count_5h,
            "warningCount": len(warnings)
        },
        "allRecords": records,
        "models": models,
        "categories": categories,
        "globalThresholds": global_th
    }
    
    html = generate_html(chart_data)
    with open(HTML_FILE, "w", encoding="utf-8") as f:
        f.write(html)
    print(f"[OK] 看板已生成: {HTML_FILE}")
    
    # 同时生成Markdown报告（OB原生查看）
    md = generate_markdown(chart_data)
    with open(MD_FILE, "w", encoding="utf-8") as f:
        f.write(md)
    print(f"[OK] OB报告已生成: {MD_FILE}")
    
    print(f"     总记录: {total} | 今日: {today_count} | 高算力: {high_cost} | 预警: {len(warnings)}")
    if warnings:
        for w in warnings:
            print(f"     [WARNING] {w}")


def generate_markdown(d):
    """生成OB原生Markdown报告，含Mermaid图表"""
    s = d["summary"]
    now_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    
    lines = []
    lines.append("# 模型使用统计")
    lines.append("")
    lines.append(f"> 自动生成于 {now_str} · 九思自动记录 · [完整HTML看板](模型使用统计看板.html)")
    lines.append("")
    
    # 统计卡片
    lines.append("## 总览")
    lines.append("")
    lines.append("| 总调用 | 今日 | 高算力·5h | 高算力·7天 | 高算力累计 | 预警 |")
    lines.append("|:---:|:---:|:---:|:---:|:---:|:---:|")
    warn_str = f"🔴 {s['warningCount']}条" if s['warningCount'] > 0 else "🟢 正常"
    h5 = f"{s['highCost5h']}/{s['limit5h']}"
    h7 = f"{s['highCost7d']}/{s['limit7d']}"
    h7_status = "🔴" if s['highCost7d'] >= s['limit7d'] else "🟡" if s['highCost7d'] >= s['limit7d']*0.8 else "🟢"
    h5_status = "🔴" if s['highCost5h'] >= s['limit5h'] else "🟡" if s['highCost5h'] >= s['limit5h']*0.8 else "🟢"
    lines.append(f"| {s['total']} | {s['today']}（高{s['highCostToday']}） | {h5_status}{h5} | {h7_status}{h7} | {s['highCost']}（{round(s['highCost']/s['total']*100) if s['total'] else 0}%） | {warn_str} |")
    lines.append("")
    lines.append("> ⚠️ **7天滚动额度是最关键指标**：超过后豆包会锁定高算力功能7天，只能用普通对话。接近80%时请控制使用。")
    lines.append("")
    
    # 预警
    lines.append("## 阈值预警")
    lines.append("")
    if d["warnings"]:
        for w in d["warnings"]:
            lines.append(f"- **{w}**")
    else:
        lines.append("- 🟢 所有模型和环节均在限额范围内")
    lines.append("")
    
    # 模型占比饼图
    lines.append("## 模型使用占比")
    lines.append("")
    lines.append("```mermaid")
    lines.append("pie title 模型使用占比")
    for label, value in zip(d["modelLabels"], d["modelValues"]):
        lines.append(f'    "{label}" : {value}')
    lines.append("```")
    lines.append("")
    
    # 算力类型饼图
    lines.append("## 算力消耗类型")
    lines.append("")
    cost_map = {"high": "高算力", "low": "普通", "free": "免费"}
    lines.append("```mermaid")
    lines.append("pie title 算力消耗类型")
    for label, value in zip(d["costLabels"], d["costValues"]):
        lines.append(f'    "{cost_map.get(label, label)}" : {value}')
    lines.append("```")
    lines.append("")
    
    # 7天趋势
    lines.append("## 最近7天趋势")
    lines.append("")
    max_val = max(d["trendValues"]) if d["trendValues"] else 1
    y_max = max(max_val + 2, 5)
    lines.append("```mermaid")
    lines.append("xychart-beta")
    lines.append('    title "最近7天使用趋势"')
    lines.append(f'    x-axis [{", ".join(d["trendDates"])}]')
    lines.append(f'    y-axis "次数" 0 --> {y_max}')
    lines.append(f'    bar [{", ".join(str(v) for v in d["trendValues"])}]')
    lines.append("```")
    lines.append("")
    
    # 环节分布
    lines.append("## 环节分布")
    lines.append("")
    lines.append("| 环节 | 次数 | 占比 |")
    lines.append("|---|:---:|:---:|")
    total_c = sum(d["catValues"]) if d["catValues"] else 1
    for label, value in sorted(zip(d["catLabels"], d["catValues"]), key=lambda x: -x[1]):
        pct = round(value / total_c * 100)
        bar = "█" * int(pct / 5)
        lines.append(f"| {label} | {value} | {pct}% {bar} |")
    lines.append("")
    
    # 模型×环节交叉表
    lines.append("## 模型×环节交叉表")
    lines.append("")
    active_cats = [c for c in d["crossCategories"] if any(d["crossData"][m][d["crossCategories"].index(c)] > 0 for m in d["crossModels"])]
    header = "| 模型 | " + " | ".join(c[:6] for c in active_cats) + " | 合计 |"
    sep = "|---" + "|---:" * len(active_cats) + "|---:|"
    lines.append(header)
    lines.append(sep)
    for m in d["crossModels"]:
        vals = [d["crossData"][m][d["crossCategories"].index(c)] for c in active_cats]
        row_total = sum(vals)
        lines.append(f"| {m} | " + " | ".join(str(v) if v > 0 else "" for v in vals) + f" | **{row_total}** |")
    lines.append("")
    
    # 最近记录
    lines.append("## 最近记录")
    lines.append("")
    lines.append("| 时间 | 模型 | 环节 | 任务 | 算力 |")
    lines.append("|---|---|---|---|---|")
    cost_emoji = {"high": "🔴高", "low": "🔵普", "free": "🟢免"}
    for r in d["recent"][:15]:
        task = (r.get("task", "") or "")[:35]
        lines.append(f"| {r['timestamp'][5:16]} | {r['model']} | {r['category']} | {task} | {cost_emoji.get(r.get('cost_type',''), '')} |")
    lines.append("")
    
    # 阈值参考
    lines.append("## 额度说明")
    lines.append("")
    gt = d.get("globalThresholds", {})
    lines.append(f"> **当前套餐**：{gt.get('plan', '标准套餐')}")
    lines.append(f">")
    lines.append(f"> **官方额度（以豆包页面为准）**：近7天 {gt.get('official_7d_quota','?')} 额度，当前时段 {gt.get('official_5h_quota','?')} 额度")
    lines.append(f">")
    lines.append(f"> **本工具按调用次数统计**，与官方额度值换算关系：1次高算力≈10额度（粗略估算），次数仅供参考，额度请以豆包官方页面为准。")
    lines.append("")
    lines.append("## 阈值参考（按次数估算）")
    lines.append("")
    lines.append("| 监控维度 | 次数阈值 | 对应官方额度 | 说明 |")
    lines.append("|---|:---:|:---:|---|")
    lines.append(f"| 高算力·7天滚动 | {gt.get('high_cost_7d','?')}次 | ≈{gt.get('official_7d_quota','?')}额度 | 超过后锁定7天 |")
    lines.append(f"| 高算力·5小时窗口 | {gt.get('high_cost_5h','?')}次 | ≈{gt.get('official_5h_quota','?')}额度 | 滚动窗口限流 |")
    for name, th in d["thresholds"].items():
        daily = th.get("daily", -1)
        win5 = th.get("window_5h", -1)
        daily_str = str(daily) if daily > 0 else "无限"
        win5_str = str(win5) if win5 > 0 else "-"
        lines.append(f"| {name} | {daily_str}/日 | {win5_str}/5h | {th.get('note', '')} |")
    lines.append("")
    
    lines.append("---")
    lines.append("*每次记录后自动重新生成 · 数据文件：[usage_data.json](usage_data.json) · 工具脚本：[usage_tracker.py](usage_tracker.py)*")
    
    return "\n".join(lines)


def generate_html(d):
    data_json = json.dumps(d, ensure_ascii=False)
    return f'''<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>模型使用统计看板 - 九思</title>
<script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js"></script>
<style>
* {{ margin:0; padding:0; box-sizing:border-box; }}
body {{ font-family: -apple-system, "Microsoft YaHei", sans-serif; background:#0f1117; color:#e0e0e0; padding:20px; }}
h1 {{ text-align:center; font-size:22px; margin-bottom:6px; color:#fff; }}
.subtitle {{ text-align:center; font-size:12px; color:#666; margin-bottom:20px; }}
.cards {{ display:grid; grid-template-columns:repeat(auto-fit,minmax(160px,1fr)); gap:12px; margin-bottom:20px; }}
.card {{ background:#1a1d28; border-radius:10px; padding:16px; border:1px solid #2a2d3a; }}
.card .label {{ font-size:12px; color:#888; margin-bottom:6px; }}
.card .value {{ font-size:28px; font-weight:bold; }}
.card .value.green {{ color:#4ade80; }}
.card .value.yellow {{ color:#fbbf24; }}
.card .value.red {{ color:#f87171; }}
.card .value.blue {{ color:#60a5fa; }}
.card .sub {{ font-size:11px; color:#666; margin-top:4px; }}
.warning-box {{ background:#2a1a1a; border:1px solid #f87171; border-radius:10px; padding:14px; margin-bottom:20px; }}
.warning-box h3 {{ color:#f87171; font-size:14px; margin-bottom:8px; }}
.warning-box ul {{ list-style:none; }}
.warning-box li {{ font-size:13px; color:#fca5a5; padding:3px 0; }}
.warning-box.ok {{ background:#1a2a1a; border-color:#4ade80; }}
.warning-box.ok h3 {{ color:#4ade80; }}
.warning-box.ok li {{ color:#86efac; }}
.charts {{ display:grid; grid-template-columns:1fr 1fr; gap:16px; margin-bottom:20px; }}
.chart-box {{ background:#1a1d28; border-radius:10px; padding:16px; border:1px solid #2a2d3a; }}
.chart-box h3 {{ font-size:14px; color:#aaa; margin-bottom:12px; }}
.chart-box.full {{ grid-column:1/-1; }}
table {{ width:100%; border-collapse:collapse; font-size:12px; }}
th {{ text-align:left; padding:8px 6px; color:#888; border-bottom:1px solid #2a2d3a; font-weight:normal; }}
td {{ padding:7px 6px; border-bottom:1px solid #1f2230; }}
tr:hover {{ background:#1f2230; }}
.badge {{ display:inline-block; padding:2px 8px; border-radius:4px; font-size:11px; }}
.badge.high {{ background:#7f1d1d; color:#fca5a5; }}
.badge.low {{ background:#1e3a5f; color:#93c5fd; }}
.badge.free {{ background:#1a3a2a; color:#86efac; }}
.filters {{ display:flex; gap:10px; margin-bottom:16px; flex-wrap:wrap; }}
.filters select, .filters input {{ background:#1a1d28; color:#e0e0e0; border:1px solid #2a2d3a; border-radius:6px; padding:6px 10px; font-size:12px; }}
.cross-table {{ overflow-x:auto; }}
.cross-table th, .cross-table td {{ text-align:center; min-width:60px; }}
.cross-table td:first-child, .cross-table th:first-child {{ text-align:left; position:sticky; left:0; background:#1a1d28; }}
.footer {{ text-align:center; font-size:11px; color:#444; margin-top:20px; }}
@media(max-width:768px) {{ .charts {{ grid-template-columns:1fr; }} }}
</style>
</head>
<body>
<h1>模型使用统计看板</h1>
<div class="subtitle">九思自动记录 · 数据来源：usage_data.json · 更新时间：<span id="updateTime"></span></div>

<div class="cards" id="cards"></div>

<div id="warningBox"></div>

<div class="filters">
  <select id="filterModel"><option value="">全部模型</option></select>
  <select id="filterCategory"><option value="">全部环节</option></select>
  <select id="filterCost"><option value="">全部算力</option><option value="high">高算力</option><option value="low">普通</option><option value="free">免费</option></select>
  <input type="date" id="filterDateFrom">
  <span style="color:#666;font-size:12px;line-height:30px;">至</span>
  <input type="date" id="filterDateTo">
</div>

<div class="charts">
  <div class="chart-box"><h3>模型使用占比</h3><canvas id="pieChart"></canvas></div>
  <div class="chart-box"><h3>环节分布</h3><canvas id="barChart"></canvas></div>
  <div class="chart-box full"><h3>最近7天使用趋势</h3><canvas id="lineChart"></canvas></div>
  <div class="chart-box"><h3>算力消耗类型</h3><canvas id="costChart"></canvas></div>
  <div class="chart-box"><h3>模型×环节交叉表</h3><div class="cross-table"><table id="crossTable"></table></div></div>
  <div class="chart-box full"><h3>最近记录</h3><div style="max-height:400px;overflow-y:auto;"><table id="recentTable"></table></div></div>
</div>

<div class="footer">九思模型使用统计工具 v1.0 · 数据存储于OB九思-数字资产 · 铁律：所有调用必记录</div>

<script>
const D = {data_json};
document.getElementById('updateTime').textContent = new Date().toLocaleString('zh-CN');

// 填充筛选器
const fm = document.getElementById('filterModel');
D.models.forEach(m => {{ const o=document.createElement('option'); o.value=m; o.textContent=m; fm.appendChild(o); }});
const fc = document.getElementById('filterCategory');
D.categories.forEach(c => {{ const o=document.createElement('option'); o.value=c; o.textContent=c; fc.appendChild(o); }});

// 卡片
const s = D.summary;
document.getElementById('cards').innerHTML = `
  <div class="card"><div class="label">总调用次数</div><div class="value blue">${{s.total}}</div><div class="sub">累计记录</div></div>
  <div class="card"><div class="label">今日调用</div><div class="value green">${{s.today}}</div><div class="sub">高算力 ${{s.highCostToday}} 次</div></div>
  <div class="card"><div class="label">高算力·5小时</div><div class="value ${{s.highCost5h>=s.limit5h?'red':s.highCost5h>=s.limit5h*0.8?'yellow':'green'}}">${{s.highCost5h}}/${{s.limit5h}}</div><div class="sub">滚动窗口限流</div></div>
  <div class="card"><div class="label">高算力·7天滚动</div><div class="value ${{s.highCost7d>=s.limit7d?'red':s.highCost7d>=s.limit7d*0.8?'yellow':'green'}}">${{s.highCost7d}}/${{s.limit7d}}</div><div class="sub">关键!超了锁7天</div></div>
  <div class="card"><div class="label">高算力累计</div><div class="value yellow">${{s.highCost}}</div><div class="sub">占比 ${{s.total?Math.round(s.highCost/s.total*100):0}}%</div></div>
  <div class="card"><div class="label">预警状态</div><div class="value ${{s.warningCount>0?'red':'green'}}">${{s.warningCount>0?s.warningCount+'条':'正常'}}</div><div class="sub">阈值监控</div></div>
`;

// 预警
const wb = document.getElementById('warningBox');
if (D.warnings.length > 0) {{
  wb.innerHTML = '<div class="warning-box"><h3>阈值预警</h3><ul>' + D.warnings.map(w=>'<li>'+w+'</li>').join('') + '</ul></div>';
}} else {{
  wb.innerHTML = '<div class="warning-box ok"><h3>阈值正常</h3><ul><li>所有模型和环节均在限额范围内</li></ul></div>';
}}

// 图表颜色
const colors = ['#60a5fa','#4ade80','#fbbf24','#f87171','#a78bfa','#f472b6','#22d3ee','#fb923c','#94a3b8','#84cc16','#e879f9'];

// 饼图
new Chart(document.getElementById('pieChart'), {{
  type:'doughnut',
  data:{{ labels:D.modelLabels, datasets:[{{data:D.modelValues, backgroundColor:colors}}] }},
  options:{{ responsive:true, plugins:{{legend:{{position:'right',labels:{{color:'#aaa',font:{{size:11}}}}}}}} }}
}});

// 柱状图
new Chart(document.getElementById('barChart'), {{
  type:'bar',
  data:{{ labels:D.catLabels, datasets:[{{label:'次数',data:D.catValues,backgroundColor:'#60a5fa'}}] }},
  options:{{ responsive:true, plugins:{{legend:{{display:false}}}}, scales:{{x:{{ticks:{{color:'#888',font:{{size:10}}}}}},y:{{ticks:{{color:'#888'}},grid:{{color:'#2a2d3a'}}}}}} }}
}});

// 折线图
new Chart(document.getElementById('lineChart'), {{
  type:'line',
  data:{{ labels:D.trendDates, datasets:[{{label:'调用次数',data:D.trendValues,borderColor:'#4ade80',backgroundColor:'rgba(74,222,128,0.1)',fill:true,tension:0.3}}] }},
  options:{{ responsive:true, plugins:{{legend:{{labels:{{color:'#aaa'}}}}}}, scales:{{x:{{ticks:{{color:'#888'}},grid:{{color:'#2a2d3a'}}}},y:{{ticks:{{color:'#888'}},grid:{{color:'#2a2d3a'}}}}}} }}
}});

// 算力类型饼图
new Chart(document.getElementById('costChart'), {{
  type:'pie',
  data:{{ labels:D.costLabels.map(l=>({{high:'高算力',low:'普通',free:'免费'}}[l]||l)), datasets:[{{data:D.costValues,backgroundColor:['#f87171','#60a5fa','#4ade80']}}] }},
  options:{{ responsive:true, plugins:{{legend:{{position:'bottom',labels:{{color:'#aaa',font:{{size:11}}}}}}}} }}
}});

// 交叉表
let crossHtml = '<tr><th>模型</th>' + D.crossCategories.map(c=>'<th>'+c.substring(0,4)+'</th>').join('') + '</tr>';
D.crossModels.forEach(m => {{
  crossHtml += '<tr><td>'+m+'</td>' + D.crossData[m].map(v=>'<td>'+(v||'')+'</td>').join('') + '</tr>';
}});
document.getElementById('crossTable').innerHTML = crossHtml;

// 最近记录
function renderRecent(records) {{
  let html = '<tr><th>时间</th><th>模型</th><th>环节</th><th>任务</th><th>算力</th></tr>';
  records.forEach(r => {{
    const costBadge = {{high:'<span class="badge high">高算力</span>',low:'<span class="badge low">普通</span>',free:'<span class="badge free">免费</span>'}}[r.cost_type]||'';
    html += '<tr><td>'+r.timestamp.substring(5)+'</td><td>'+r.model+'</td><td>'+r.category+'</td><td>'+(r.task||'').substring(0,40)+'</td><td>'+costBadge+'</td></tr>';
  }});
  document.getElementById('recentTable').innerHTML = html;
}}
renderRecent(D.recent);

// 筛选
function applyFilter() {{
  const fm=document.getElementById('filterModel').value;
  const fc=document.getElementById('filterCategory').value;
  const fcost=document.getElementById('filterCost').value;
  const ffrom=document.getElementById('filterDateFrom').value;
  const fto=document.getElementById('filterDateTo').value;
  let filtered = D.allRecords.filter(r => {{
    if(fm && r.model!==fm) return false;
    if(fc && r.category!==fc) return false;
    if(fcost && r.cost_type!==fcost) return false;
    if(ffrom && r.timestamp.substring(0,10)<ffrom) return false;
    if(fto && r.timestamp.substring(0,10)>fto) return false;
    return true;
  }});
  renderRecent(filtered.reverse().slice(0,50));
}}
['filterModel','filterCategory','filterCost','filterDateFrom','filterDateTo'].forEach(id=>{{
  document.getElementById(id).addEventListener('change',applyFilter);
}});
</script>
</body>
</html>'''


def main():
    parser = argparse.ArgumentParser(description="模型使用统计工具")
    sub = parser.add_subparsers(dest="command")
    
    log_p = sub.add_parser("log", help="记录一次模型调用")
    log_p.add_argument("--model", required=True, help="模型名称")
    log_p.add_argument("--category", required=True, help="环节分类")
    log_p.add_argument("--task", required=True, help="任务描述")
    log_p.add_argument("--cost", default="high", choices=["high","low","free"], help="算力类型: high=高算力, low=普通, free=免费")
    log_p.add_argument("--notes", default="", help="备注")
    
    sub.add_parser("report", help="生成HTML看板")
    sub.add_parser("check", help="检查阈值预警")
    
    args = parser.parse_args()
    
    if args.command == "log":
        log_usage(args.model, args.category, args.task, args.cost, args.notes)
    elif args.command == "report":
        generate_report()
    elif args.command == "check":
        warnings = check_thresholds()
        if warnings:
            for w in warnings:
                print(f"[WARNING] {w}")
        else:
            print("[OK] 所有模型和环节均在限额范围内")
    else:
        parser.print_help()


if __name__ == "__main__":
    main()
