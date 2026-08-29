# -*- coding: utf-8 -*-
import csv, os
from plotly.offline import get_plotlyjs
import plotly.graph_objects as go
import plotly.express as px

SRC = r"D:/写作工具/知识管理/02-Areas-资产/自媒体系统/04-数据与复盘/作品分析/_alldata.csv"
OUT = r"D:/写作工具/知识管理/02-Areas-资产/自媒体系统/04-数据与复盘/作品分析/苏不倦账号数据可视化看板.html"

rows = []
with open(SRC, encoding="utf-8-sig") as f:
    for r in csv.DictReader(f):
        rows.append(r)

def to_int(v):
    try: return int(float(v))
    except: return 0
def to_float(v):
    try: return float(v)
    except: return None

for r in rows:
    r["play"] = to_int(r["play"])
    r["like"] = to_int(r["like"])
    r["comment"] = to_int(r["comment"])
    r["share"] = to_int(r["share"])
    r["save"] = to_int(r["save"])
    r["fans"] = to_int(r["fans"])
    r["danmaku"] = to_int(r["danmaku"]) if r["danmaku"] else 0
    r["completion"] = None
    r["two_sec"] = None
    r["ctr"] = None
    r["avg_play"] = None
    if r["rate1_label"] == "完播率":
        r["completion"] = to_float(r["rate1"])
        r["two_sec"] = to_float(r["rate2"])
    elif r["rate1_label"] == "封面点击率":
        r["ctr"] = to_float(r["rate1"])
        r["avg_play"] = to_float(r["rate2"])
    r["like_rate"] = round(r["like"]/r["play"]*100, 2) if r["play"] else 0
    r["save_like"] = round(r["save"]/r["like"]*100, 1) if r["like"] else 0
    r["fans_per_10k"] = round(r["fans"]/r["play"]*10000, 1) if r["play"] else 0

rows_sorted = sorted(rows, key=lambda x: x["date"])

def pearson(xs, ys):
    pairs = [(a,b) for a,b in zip(xs,ys) if a is not None and b is not None]
    n=len(pairs)
    if n<2: return None
    ax=[p[0] for p in pairs]; ay=[p[1] for p in pairs]
    mx=sum(ax)/n; my=sum(ay)/n
    cov=sum((a-mx)*(b-my) for a,b in pairs)
    vx=sum((a-mx)**2 for a in ax); vy=sum((b-my)**2 for b in ay)
    if vx==0 or vy==0: return None
    return round(cov/(vx**0.5*vy**0.5), 3)

plays=[r["play"] for r in rows]
r_save=pearson(plays,[r["save"] for r in rows])
r_like=pearson(plays,[r["like"] for r in rows])
r_compl=pearson(plays,[r["completion"] for r in rows if r["completion"] is not None])

tot_play=sum(plays)
tot_like=sum(r["like"] for r in rows)
tot_save=sum(r["save"] for r in rows)
tot_comment=sum(r["comment"] for r in rows)
tot_share=sum(r["share"] for r in rows)
tot_fans=sum(r["fans"] for r in rows)
n=len(rows)
best=max(rows, key=lambda x: x["play"])
dates=[r["date"] for r in rows_sorted]
SHORT=12

def layout_kw(h=380, title="", legend_orient="h", legend_y=1.02):
    return dict(
        template="plotly_dark", height=h, title=title,
        paper_bgcolor="#0f1117", plot_bgcolor="#0f1117",
        font=dict(color="#e8eaf0", size=12),
        margin=dict(l=55,r=20,t=50,b=45),
        title_font_size=15,
        legend=dict(orientation=legend_orient, yanchor="bottom", y=legend_y, x=0),
    )

PAL=["#ff5c8a","#4ea8ff","#ffd166","#06d6a0","#b388ff","#ff8c42"]

def annotate(fig, txt, color):
    fig.add_annotation(x=0.05, y=0.95, xref="paper", yref="paper",
        showarrow=False, text=txt, font=dict(color=color, size=13))

def short_title(t):
    return t[:SHORT]+"…" if len(t)>SHORT else t

# --- KPI cards ---
cards_data = [
    ("作品数", f"{n}", "#4ea8ff"),
    ("总播放", f"{tot_play:,}", "#06d6a0"),
    ("总获赞", f"{tot_like:,}", "#ff5c8a"),
    ("总收藏", f"{tot_save:,}", "#ffd166"),
    ("总评论", f"{tot_comment:,}", "#b388ff"),
    ("总分享", f"{tot_share:,}", "#ff8c42"),
    ("总吸粉", f"{tot_fans}", "#4ea8ff"),
    ("单篇最高播放", f"{best['play']:,}", "#ffd166"),
    ("单篇标题(摘要)", short_title(best["title"]), "#4ea8ff"),
    ("播放-收藏相关系数", f"{r_save}", "#06d6a0"),
    ("播放-完播相关系数", f"{r_compl}", "#ffd166"),
]
# --- Figures ---
# 1 播放趋势
fig1=px.line(x=dates, y=[r["play"] for r in rows_sorted], markers=True,
             labels={"x":"发布日期","y":"播放量"})
fig1.update_traces(line=dict(color=PAL[1], width=2.5), marker=dict(size=6))
fig1.update_layout(**layout_kw(360, "📈 播放量趋势 (按发布日)"))

# 2 互动趋势
fig2=go.Figure()
for col,name,c in [("like","赞",PAL[0]),("comment","评",PAL[2]),("save","藏",PAL[3]),("share","享",PAL[4]),("fans","吸粉",PAL[5])]:
    fig2.add_trace(go.Scatter(x=dates, y=[r[col] for r in rows_sorted], name=name, mode="lines+markers", line=dict(width=2), marker=dict(size=5)))
fig2.update_layout(**layout_kw(360, "💬 互动指标趋势 (赞/评/藏/享/吸粉)"))

# 3 TOP12
top=sorted(rows, key=lambda x: x["play"], reverse=True)[:12]
top=sorted(top, key=lambda x: x["play"])
fig3=px.bar(x=[r["play"] for r in top], y=[short_title(r["title"]) for r in top], orientation="h",
            text=[r["play"] for r in top], labels={"x":"播放量","y":""})
fig3.update_traces(marker=dict(color=PAL[0]), textposition="outside")
fig3.update_layout(**layout_kw(380, "🏆 播放量 TOP 12", "v", 1.15))

# 4 播放vs收藏
sc=[r for r in rows if r["save"]>0]
fig4=px.scatter(x=[r["play"] for r in sc], y=[r["save"] for r in sc],
                log_x=True, log_y=True, hover_name=[short_title(r["title"]) for r in sc],
                labels={"x":"播放量(对数)","y":"收藏量(对数)"})
fig4.update_traces(marker=dict(color=PAL[3], size=9, opacity=0.8, line=dict(width=0.5,color="#fff")))
fig4.update_layout(**layout_kw(380, f"🔗 播放 vs 收藏  r={r_save:.3f} (强正相关→收藏是播放引擎)"))
if r_save: annotate(fig4, f"相关系数 {r_save:.3f}", PAL[3])

# 5 播放vs完播率
cc=[r for r in rows if r["completion"] is not None]
fig5=px.scatter(x=[r["play"] for r in cc], y=[r["completion"] for r in cc],
                log_x=True, hover_name=[short_title(r["title"]) for r in cc],
                labels={"x":"播放量(对数)","y":"完播率 %"})
fig5.update_traces(marker=dict(color=PAL[2], size=9, opacity=0.8, line=dict(width=0.5,color="#fff")))
fig5.update_layout(**layout_kw(380, f"🚫 播放 vs 完播率  r={r_compl:.3f} (近乎无关→低完播是品类水位)"))
if r_compl: annotate(fig5, f"相关系数 {r_compl:.3f}", PAL[2])

# 6 CTR vs 播放
ct=[r for r in rows if r["ctr"] is not None]
fig6=px.scatter(x=[r["ctr"] for r in ct], y=[r["play"] for r in ct],
                hover_name=[short_title(r["title"]) for r in ct],
                labels={"x":"封面点击率 %","y":"播放量"})
fig6.update_traces(marker=dict(color=PAL[4], size=9, opacity=0.8, line=dict(width=0.5,color="#fff")))
fig6.update_layout(**layout_kw(360, "🎯 封面点击率 vs 播放量"))

# 7 赞播比 + 藏赞比
fig7=go.Figure()
fig7.add_trace(go.Bar(x=dates, y=[r["like_rate"] for r in rows_sorted], name="赞播比%", marker_color=PAL[0]))
fig7.add_trace(go.Scatter(x=dates, y=[r["save_like"] for r in rows_sorted], name="藏赞比%", mode="lines+markers", line=dict(color=PAL[3],width=2.5)))
fig7.update_layout(**layout_kw(360, "❤️ 赞播比(柱) vs 藏赞比(线)"))

# 8 相关性热力图
metrics=[("播放","play"),("点赞","like"),("评论","comment"),("收藏","save"),("分享","share"),("吸粉","fans"),("完播率","completion"),("CTR","ctr")]
valid=[m for m in metrics if any(r[m[1]] is not None for r in rows)]
vals=[]; labels=[]
for mi,(name,col) in enumerate(valid):
    row=[]
    for mj,(name2,col2) in enumerate(valid):
        corr=pearson([r[col] for r in rows], [r[col2] for r in rows])
        corr="" if corr is None else f"{corr:.2f}"
        vals.append(corr); labels.append(f"{mi}-{mj}")
    labels_row=[n for n,_ in valid]
# reshape
import numpy as np
arr=np.full((len(valid), len(valid)), "")
for mi,(name,col) in enumerate(valid):
    for mj,(name2,col2) in enumerate(valid):
        c=pearson([r[col] for r in rows], [r[col2] for r in rows])
        arr[mi,mj]=f"{c:.2f}" if c is not None else ""
names=[n for n,_ in valid]
fig8=px.imshow(arr, labels=dict(x="指标", y="指标", color="相关系数"),
               color_continuous_scale="RdBu_r", aspect="auto",
               title="📊 互动指标相关系数矩阵")
fig8.update_layout(**layout_kw(420, f"📊 互动指标相关系数矩阵 (红=正/蓝=负)"))

# assemble
html_lines=[]
js=get_plotlyjs()
html_lines.append(f"""<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="utf-8"/>
<title>苏不倦抖音账号数据可视化看板</title>
<script src="{js}"></script>
<style>
body{{background:#0f1117;color:#e8eaf0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;margin:0;padding:20px}}
h1{{text-align:center;margin-bottom:6px}}
.subtitle{{text-align:center;color:#9aa0ad;font-size:13px;margin-bottom:24px}}
.grid{{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:20px}}
.card{{background:#1a1d27;border-radius:8px;padding:16px;text-align:center}}
.card .val{{font-size:24px;font-weight:bold;margin:4px 0}}
.card .label{{font-size:12px;color:#9aa0ad}}
.plotly-chart{{background:#0f1117;border-radius:8px;padding:10px;margin-bottom:20px}}
.section-title{{font-size:16px;font-weight:bold;margin:24px 0 10px;color:#ffd166}}
.note{{background:#1a1d27;border-left:4px solid #ffd166;padding:10px 14px;margin:16px 0;border-radius:4px;font-size:13px;color:#9aa0ad}}
@media (max-width:1200px){{.grid{{grid-template-columns:repeat(2,1fr)}}}}
</style>
</head>
<body>
<h1>📊 苏不倦抖音账号数据可视化看板</h1>
<p class="subtitle">数据来源: _alldata.csv (CDP 自动抓取) · 统计周期: 2026-05-02 ~ 2026-08-24 · 作品数 {n}</p>
<div class="grid">
<div class="card" style="border-top:3px solid {PAL[1]}"><div class="label">作品数</div><div class="val">{n}</div></div>
<div class="card" style="border-top:3px solid {PAL[3]}"><div class="label">总播放</div><div class="val">{tot_play:,}</div></div>
<div class="card" style="border-top:3px solid {PAL[0]}"><div class="label">总获赞</div><div class="val">{tot_like:,}</div></div>
<div class="card" style="border-top:3px solid {PAL[2]}"><div class="label">总收藏</div><div class="val">{tot_save:,}</div></div>
<div class="card" style="border-top:3px solid {PAL[4]}"><div class="label">总评论</div><div class="val">{tot_comment:,}</div></div>
<div class="card" style="border-top:3px solid {PAL[5]}"><div class="label">总分享</div><div class="val">{tot_share:,}</div></div>
<div class="card" style="border-top:3px solid {PAL[1]}"><div class="label">总吸粉</div><div class="val">{tot_fans}</div></div>
<div class="card" style="border-top:3px solid {PAL[3]}"><div class="label">单篇最高播放</div><div class="val">{best['play']:,}</div><div class="label" style="margin-top:4px">{short_title(best['title'])}</div></div>
<div class="card" style="border-top:3px solid #06d6a0"><div class="label">播放-收藏相关系数</div><div class="val" style="color:{PAL[3]}">{r_save}</div></div>
<div class="card" style="border-top:3px solid #ffd166"><div class="label">播放-完播相关系数</div><div class="val" style="color:{PAL[2]}">{r_compl}</div></div>
<div class="card" style="border-top:3px solid #b388ff"><div class="label">平均播放(每作品)</div><div class="val">{round(tot_play/n):,}</div></div>
<div class="card" style="border-top:3px solid #4ea8ff"><div class="label">单赞成本(分钟)</div><div class="val">{round(tot_play/tot_like,1)}</div><div class="label">播放/赞</div></div>
</div>
<div class="note">
<strong>定论速览</strong>：播放量与<strong>收藏</strong>强相关 (r={r_save})，与<strong>完播率</strong>近乎无关 (r={r_compl})。爆款公式 = 反常识钩子 × 大众高频动作 × 可收藏干货。详见 <a href="../25-账号全量复盘与稳定定论.md" target="_blank" style="color:#4ea8ff">25-账号全量复盘与稳定定论</a>。
</div>
""")

for idx, fig in enumerate([fig1,fig2,fig3,fig4,fig5,fig6,fig7,fig8]):
    d = fig.to_html(full_html=False, include_plotlyjs=False)
    html_lines.append(f'<div class="plotly-chart">{d}</div>')

html_lines.append("""
<p style="text-align:center;color:#9aa0ad;font-size:12px;margin:24px 0">
由九思自动生成 · Plotly 交互式可视化 · 数据来自 CDP 抓创作者中心
</p>
</body></html>
""")

with open(OUT, "w", encoding="utf-8") as f:
    f.write("".join(html_lines))
print("OK:", OUT)
print("文件大小:", os.path.getsize(OUT), "bytes")
