# -*- coding: utf-8 -*-
import csv, collections, json

OUT = r"D:\写作工具\知识管理\08-九思搭档知识库\06-自媒体规划\04-数据与复盘\作品分析"
rows = []
with open(f'{OUT}\\_alldata.csv', encoding='utf-8-sig') as f:
    for r in csv.DictReader(f):
        r['play'] = int(r['play']) if r['play'] else 0
        r['save'] = int(r['save']) if r['save'] else 0
        r['fans'] = int(r['fans']) if r['fans'] else 0
        r['date'] = r['date'] or ''
        rows.append(r)

n = len(rows)
has_fans = [r for r in rows if r['fans'] > 0]
print(f'总作品 {n} 条；有吸粉数据的 {len(has_fans)} 条')
print(f'吸粉数据总和(样本) = {sum(r["fans"] for r in rows):,}')

# 吸粉 Top 20
print('\n=== 吸粉 Top 20 ===')
top = sorted(rows, key=lambda r:-r['fans'])[:20]
for r in top:
    print(f'  {r["date"]} 吸粉{r["fans"]:4d} | 播放{r["play"]/10000:6.1f}万 | {r["title"][:28]}')

# 爆款 vs 长尾 吸粉贡献
hot = [r for r in rows if r['play'] >= 30000]
tail = [r for r in rows if r['play'] < 30000]
hot_fans = sum(r['fans'] for r in hot)
tail_fans = sum(r['fans'] for r in tail)
total = hot_fans + tail_fans
print(f'\n=== 吸粉结构 ===')
print(f'爆款(≥3万播放) {len(hot)} 条 → 吸粉 {hot_fans:,} ({hot_fans/total*100:.1f}%)')
print(f'长尾(<3万播放) {len(tail)} 条 → 吸粉 {tail_fans:,} ({tail_fans/total*100:.1f}%)')

# 每万播放吸粉效率
print('\n=== 吸粉效率(每万播放吸粉数) ===')
for r in sorted(rows, key=lambda r:-(r['fans']/r['play']) if r['play'] else 0)[:15]:
    if r['play'] == 0: continue
    eff = r['fans']/r['play']*10000
    print(f'  {eff:5.1f} 粉/万播放 | 播放{r["play"]:6d} 吸粉{r["fans"]:4d} | {r["title"][:26]}')

# 按月吸粉（近半年）
print('\n=== 按月吸粉（有日期数据）===')
monthly = collections.defaultdict(lambda: [0,0])
for r in rows:
    if r['date'] and len(r['date']) >= 7:
        m = r['date'][:7]
        monthly[m][0] += r['fans']
        monthly[m][1] += 1
for m in sorted(monthly):
    print(f'  {m}: 吸粉{monthly[m][0]:5d} / {monthly[m][1]:3d}条')