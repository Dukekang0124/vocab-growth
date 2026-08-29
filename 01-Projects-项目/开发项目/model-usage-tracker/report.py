# -*- coding: utf-8 -*-
"""
HTML 汇总报告生成器
====================
读取 Tracker 数据, 生成单文件离线 HTML (内联 CSS/JS, 无外部依赖)。
支持按 环节 / 模型 / 时间 维度筛选与展示。
"""
from __future__ import annotations

import json
import datetime as dt
from typing import Optional, Any


def build_report(tracker, html_path: str,
                 since: Any = None, until: Any = None,
                 raw_cap: int = 5000) -> None:
    thresholds = tracker.get_thresholds()
    alerts = tracker.get_alerts()
    raw = tracker.raw_calls(since=since, until=until, limit=raw_cap)
    stats = tracker.stats_by_stage_model(since=since, until=until)
    cumulative = tracker.cumulative_by_model(since=since, until=until)
    timeline = tracker.timeline(bucket="day", since=since, until=until)
    summary = tracker.summary()

    data = {
        "generated_at": dt.datetime.now().isoformat(timespec="seconds"),
        "summary": summary,
        "thresholds": thresholds,
        "alerts": alerts,
        "raw": raw,
        "stats": stats,
        "cumulative": cumulative,
        "timeline": timeline,
    }
    payload = json.dumps(data, ensure_ascii=False)

    html = _TEMPLATE.replace("/*__DATA__*/", payload)
    with open(html_path, "w", encoding="utf-8") as f:
        f.write(html)


def build_markdown(tracker, md_path: str,
                  since: Any = None, until: Any = None) -> None:
    """生成 Markdown 报告, 可直接放进 Obsidian vault 实时查看 (OB 热重载)。"""
    import os
    s = tracker.summary()
    alerts = tracker.get_alerts()
    cumulative = tracker.cumulative_by_model(since=since, until=until)
    stats = tracker.stats_by_stage_model(since=since, until=until)
    timeline = tracker.timeline(bucket="day", since=since, until=until)
    recent = tracker.raw_calls(since=since, until=until, limit=30)

    L = []
    L.append("# 模型使用统计 (自动生成, 勿手改)\n")
    L.append(f"> 生成时间: {dt.datetime.now().isoformat(timespec='seconds')}  \n")
    L.append(f"> 数据范围: {s['first_call'] or '—'} ~ {s['last_call'] or '—'}\n")

    L.append("## 概览\n")
    L.append(f"- 总调用次数: **{s['total_calls']}**")
    L.append(f"- 模型数: **{s['distinct_models']}**  | 环节数: **{s['distinct_stages']}**")
    L.append(f"- 未解除预警: **{s['open_alerts']}**\n")

    L.append("## 预警 (接近 / 达到上限)\n")
    if not alerts:
        L.append("_无预警_")
    else:
        for a in alerts:
            tag = "已达到上限" if a["level"] == "limit" else "接近上限"
            mark = "✅已解除" if a.get("resolved") else f"⚠️{tag}"
            L.append(f"- {mark} {a['message']}  _({a['ts']})_")
    L.append("")

    L.append("## 各模型累计调用\n")
    L.append("| 模型 | 累计次数 |")
    L.append("|---|---:|")
    for r in cumulative:
        L.append(f"| {r['model']} | {r['total']} |")
    L.append("")

    L.append("## 环节 × 模型\n")
    L.append("| 环节 | 模型 | 次数 | 首次 | 末次 |")
    L.append("|---|---|---:|---|---|")
    for r in stats:
        L.append(f"| {r['stage']} | {r['model']} | {r['cnt']} | {r['first_ts']} | {r['last_ts']} |")
    L.append("")

    L.append("## 每日趋势\n")
    L.append("| 日期 | 次数 |")
    L.append("|---|---:|")
    for r in timeline:
        L.append(f"| {r['bucket']} | {r['count']} |")
    L.append("")

    L.append("## 最近调用 (Top 30)\n")
    L.append("| 时间 | 环节 | 模型 | 状态 | token |")
    L.append("|---|---|---|---|---:|")
    for r in recent:
        L.append(f"| {r['ts']} | {r['stage']} | {r['model']} | {r['status']} | {r.get('tokens') or ''} |")
    L.append("")

    os.makedirs(os.path.dirname(os.path.abspath(md_path)), exist_ok=True)
    with open(md_path, "w", encoding="utf-8") as f:
        f.write("\n".join(L) + "\n")


_TEMPLATE = r"""<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>模型使用统计与分析报告</title>
<style>
:root{--bg:#0f1115;--panel:#181b22;--panel2:#1f232c;--border:#2a2f3a;
--text:#e6e9ef;--muted:#8b93a3;--accent:#5b9dff;--warn:#f5a623;--limit:#ff5b5b;
--ok:#39d98a;}
*{box-sizing:border-box}
body{margin:0;background:var(--bg);color:var(--text);
font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"PingFang SC","Microsoft YaHei",sans-serif;
font-size:14px;line-height:1.5}
header{padding:18px 22px;border-bottom:1px solid var(--border);
display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:10px}
h1{font-size:18px;margin:0}
.sub{color:var(--muted);font-size:12px}
.wrap{padding:18px 22px;max-width:1280px;margin:0 auto}
.cards{display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:12px;margin-bottom:18px}
.card{background:var(--panel);border:1px solid var(--border);border-radius:10px;padding:14px}
.card .n{font-size:24px;font-weight:700}
.card .l{color:var(--muted);font-size:12px;margin-top:2px}
.panel{background:var(--panel);border:1px solid var(--border);border-radius:10px;padding:16px;margin-bottom:16px}
.panel h2{font-size:15px;margin:0 0 12px}
.filters{display:flex;gap:12px;flex-wrap:wrap;align-items:flex-end}
.filters label{display:flex;flex-direction:column;gap:4px;font-size:12px;color:var(--muted)}
select,input[type=date]{background:var(--panel2);border:1px solid var(--border);
color:var(--text);border-radius:7px;padding:7px 9px;font-size:13px}
button{background:var(--accent);color:#06101f;border:none;border-radius:7px;
padding:8px 14px;font-weight:600;cursor:pointer}
button.ghost{background:transparent;border:1px solid var(--border);color:var(--text)}
.row{display:grid;grid-template-columns:1fr 1fr;gap:16px}
@media(max-width:820px){.row{grid-template-columns:1fr}}
.bar{display:flex;align-items:center;gap:8px;margin:6px 0}
.bar .name{width:170px;font-size:12px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.bar .track{flex:1;background:var(--panel2);border-radius:5px;height:18px;overflow:hidden}
.bar .fill{height:100%;background:var(--accent);border-radius:5px}
.bar .val{width:54px;text-align:right;font-size:12px;color:var(--muted)}
.alert{border-left:4px solid var(--warn);background:var(--panel2);
border-radius:6px;padding:10px 12px;margin:8px 0;font-size:13px}
.alert.limit{border-left-color:var(--limit)}
.alert .t{color:var(--muted);font-size:11px}
table{width:100%;border-collapse:collapse;font-size:12px}
th,td{text-align:left;padding:7px 8px;border-bottom:1px solid var(--border)}
th{color:var(--muted);font-weight:600;position:sticky;top:0;background:var(--panel)}
.tag{display:inline-block;padding:1px 7px;border-radius:10px;font-size:11px}
.tag.warn{background:rgba(245,166,35,.18);color:var(--warn)}
.tag.limit{background:rgba(255,91,91,.18);color:var(--limit)}
.tag.ok{background:rgba(57,217,138,.15);color:var(--ok)}
.scroll{max-height:420px;overflow:auto;border:1px solid var(--border);border-radius:8px}
.muted{color:var(--muted)}
.empty{color:var(--muted);font-style:italic;padding:10px 0}
</style>
</head>
<body>
<header>
  <div><h1>模型使用统计与分析报告</h1>
  <div class="sub" id="gen"></div></div>
  <div class="sub" id="range"></div>
</header>
<div class="wrap">
  <div class="cards" id="cards"></div>

  <div class="panel">
    <h2>筛选</h2>
    <div class="filters">
      <label>环节<select id="f-stage"><option value="">全部</option></select></label>
      <label>模型<select id="f-model"><option value="">全部</option></select></label>
      <label>起始日期<input type="date" id="f-from"></label>
      <label>结束日期<input type="date" id="f-to"></label>
      <button id="apply">应用筛选</button>
      <button class="ghost" id="reset">重置</button>
    </div>
  </div>

  <div class="panel">
    <h2>预警 (接近 / 达到上限)</h2>
    <div id="alerts"></div>
  </div>

  <div class="row">
    <div class="panel">
      <h2>各模型累计调用 (筛选后)</h2>
      <div id="by-model"></div>
    </div>
    <div class="panel">
      <h2>各环节调用分布 (筛选后)</h2>
      <div id="by-stage"></div>
    </div>
  </div>

  <div class="panel">
    <h2>每日调用趋势</h2>
    <div id="timeline"></div>
  </div>

  <div class="panel">
    <h2>原始调用明细 (最新在前, 上限 5000)</h2>
    <div class="scroll">
      <table id="tbl">
        <thead><tr><th>时间</th><th>环节</th><th>模型</th><th>状态</th><th>token</th><th>备注</th></tr></thead>
        <tbody></tbody>
      </table>
    </div>
  </div>
</div>

<script>
const DATA = /*__DATA__*/;
document.getElementById('gen').textContent = '生成于 ' + DATA.generated_at;
(function(){
  const s = DATA.summary;
  const cards = [
    ['总调用次数', s.total_calls],
    ['模型数', s.distinct_models],
    ['环节数', s.distinct_stages],
    ['未解除预警', s.open_alerts],
    ['首次调用', s.first_call || '—'],
    ['最近调用', s.last_call || '—'],
  ];
  document.getElementById('cards').innerHTML = cards.map(c=>
    `<div class="card"><div class="n">${c[1]}</div><div class="l">${c[0]}</div></div>`).join('');
})();

// 填充下拉
(function(){
  const stages = [...new Set(DATA.raw.map(r=>r.stage))].sort();
  const models = [...new Set(DATA.raw.map(r=>r.model))].sort();
  const ss=document.getElementById('f-stage'), sm=document.getElementById('f-model');
  stages.forEach(v=>ss.insertAdjacentHTML('beforeend',`<option value="${v}">${v}</option>`));
  models.forEach(v=>sm.insertAdjacentHTML('beforeend',`<option value="${v}">${v}</option>`));
  if(DATA.raw.length){
    const ts = DATA.raw.map(r=>r.ts.slice(0,10)).sort();
    document.getElementById('f-from').value = ts[0];
    document.getElementById('f-to').value = ts[ts.length-1];
    document.getElementById('range').textContent = '数据范围: '+ts[0]+' ~ '+ts[ts.length-1];
  }
})();

function inRange(ts, from, to){
  const d = ts.slice(0,10);
  if(from && d < from) return false;
  if(to && d > to) return false;
  return true;
}
function filtered(){
  const st=document.getElementById('f-stage').value;
  const md=document.getElementById('f-model').value;
  const from=document.getElementById('f-from').value;
  const to=document.getElementById('f-to').value;
  return DATA.raw.filter(r=>
    (!st || r.stage===st) && (!md || r.model===md) && inRange(r.ts, from, to));
}

function renderBars(el, arr, key, valKey){
  if(!arr.length){el.innerHTML='<div class="empty">无数据</div>';return;}
  const max=Math.max(...arr.map(x=>x[valKey]));
  el.innerHTML=arr.map(x=>{
    const v=x[valKey]; const pct=max?Math.round(v/max*100):0;
    return `<div class="bar"><div class="name" title="${x[key]}">${x[key]}</div>
    <div class="track"><div class="fill" style="width:${pct}%"></div></div>
    <div class="val">${v}</div></div>`;
  }).join('');
}

function renderAlerts(){
  const el=document.getElementById('alerts');
  if(!DATA.alerts.length){el.innerHTML='<div class="empty">无预警</div>';return;}
  el.innerHTML=DATA.alerts.map(a=>{
    const cls=a.level==='limit'?'limit':''; const tag=a.level==='limit'?'达到上限':'接近上限';
    const open=a.resolved?'<span class="muted">已解除</span>':`<span class="tag ${a.level}">${tag}</span>`;
    return `<div class="alert ${cls}">${open} &nbsp; ${a.message}
    <div class="t">${a.ts}</div></div>`;
  }).join('');
}

function render(){
  const rows=filtered();
  // 模型累计
  const byModel={}; rows.forEach(r=>byModel[r.model]=(byModel[r.model]||0)+1);
  const modelArr=Object.entries(byModel).map(([k,v])=>({model:k,cnt:v})).sort((a,b)=>b.cnt-a.cnt);
  renderBars(document.getElementById('by-model'), modelArr, 'model','cnt');
  // 环节分布
  const byStage={}; rows.forEach(r=>byStage[r.stage]=(byStage[r.stage]||0)+1);
  const stageArr=Object.entries(byStage).map(([k,v])=>({stage:k,cnt:v})).sort((a,b)=>b.cnt-a.cnt);
  renderBars(document.getElementById('by-stage'), stageArr, 'stage','cnt');
  // 趋势 (按筛选后数据按日聚合)
  const byDay={}; rows.forEach(r=>{const d=r.ts.slice(0,10);byDay[d]=(byDay[d]||0)+1;});
  const days=Object.keys(byDay).sort();
  const tl=document.getElementById('timeline');
  if(!days.length){tl.innerHTML='<div class="empty">无数据</div>';}
  else{
    const max=Math.max(...days.map(d=>byDay[d]));
    tl.innerHTML=days.map(d=>`<div class="bar"><div class="name">${d}</div>
    <div class="track"><div class="fill" style="width:${Math.round(byDay[d]/max*100)}%"></div></div>
    <div class="val">${byDay[d]}</div></div>`).join('');
  }
  // 明细
  const tb=document.querySelector('#tbl tbody');
  tb.innerHTML=rows.slice(0,5000).map(r=>{
    const meta=r.meta?JSON.stringify(r.meta):'';
    const cls=r.status==='error'?'limit':(r.status==='ok'?'ok':'warn');
    return `<tr><td>${r.ts}</td><td>${r.stage}</td><td>${r.model}</td>
    <td><span class="tag ${cls}">${r.status}</span></td><td>${r.tokens??''}</td>
    <td class="muted">${meta}</td></tr>`;
  }).join('');
}

document.getElementById('apply').onclick=render;
document.getElementById('reset').onclick=()=>{
  document.getElementById('f-stage').value='';
  document.getElementById('f-model').value='';
  const ts=DATA.raw.map(r=>r.ts.slice(0,10)).sort();
  document.getElementById('f-from').value=ts[0]||'';
  document.getElementById('f-to').value=ts[ts.length-1]||'';
  render();
};
renderAlerts(); render();
</script>
</body>
</html>
"""
