# -*- coding: utf-8 -*-
import csv, json, math, collections, re

OUT = r"D:\写作工具\知识管理\08-九思搭档知识库\06-自媒体规划\04-数据与复盘\作品分析"
rows = []
with open(f'{OUT}\\_alldata.csv', encoding='utf-8-sig') as f:
    for r in csv.DictReader(f):
        r['play'] = int(r['play']) if r['play'] else 0
        r['like'] = int(r['like']) if r['like'] else 0
        r['comment'] = int(r['comment']) if r['comment'] else 0
        r['share'] = int(r['share']) if r['share'] else 0
        r['save'] = int(r['save']) if r['save'] else 0
        r['rate1'] = float(r['rate1']) if r['rate1'] else None
        r['rate2'] = float(r['rate2']) if r['rate2'] else None
        r['fans'] = int(r['fans']) if r['fans'] else 0
        rows.append(r)

print(f'总作品数: {len(rows)}')
print(f'总播放: {sum(r["play"] for r in rows):,}')
print(f'总收藏: {sum(r["save"] for r in rows):,}')
print(f'总吸粉: {sum(r["fans"] for r in rows) if "fans" in rows[0] else 0:,}')

# 播放量分档
buckets = collections.Counter()
for r in rows:
    p = r['play']
    if p >= 100000: buckets['10万+'] += 1
    elif p >= 30000: buckets['3-10万'] += 1
    elif p >= 10000: buckets['1-3万'] += 1
    elif p >= 3000: buckets['3000-1万'] += 1
    elif p >= 1000: buckets['1000-3000'] += 1
    else: buckets['<1000'] += 1
print('\n播放量分档:')
for k in ['10万+','3-10万','1-3万','3000-1万','1000-3000','<1000']:
    print(f'  {k}: {buckets[k]}条')

# Spearman 相关系数
def rank(vals):
    order = sorted(range(len(vals)), key=lambda i: vals[i])
    r = [0]*len(vals)
    for i, idx in enumerate(order):
        r[idx] = i
    return r

def spearman(x, y):
    n = len(x)
    rx, ry = rank(x), rank(y)
    d2 = sum((a-b)**2 for a, b in zip(rx, ry))
    return 1 - 6*d2/(n*(n*n-1))

print('\n播放量 vs 各指标 Spearman 相关:')
for label, key in [('点赞','like'),('评论','comment'),('分享','share'),('收藏','save'),('吸粉','fans')]:
    x = [r['play'] for r in rows]
    y = [r[key] for r in rows]
    print(f'  play vs {label}: {spearman(x,y):.3f}')

# 完播率 vs 播放（仅有权重数据且为完播率组的）
cmp = [r for r in rows if r['rate1_label']=='完播率']
print(f'\n有完播率数据的作品: {len(cmp)}条')
x = [r['play'] for r in cmp]
y = [r['rate1'] for r in cmp]
print(f'  play vs 完播率 Spearman: {spearman(x,y):.3f}')
print(f'  完播率均值: {sum(y)/len(y):.2f}%  中位数: {sorted(y)[len(y)//2]:.2f}%')
# 爆款 vs 扑街的完播率对比
hot = [r['rate1'] for r in cmp if r['play']>=30000]
cold = [r['rate1'] for r in cmp if r['play']<30000]
print(f'  播放>=3万作品完播率均值: {sum(hot)/len(hot):.2f}% (n={len(hot)})')
print(f'  播放<3万作品完播率均值: {sum(cold)/len(cold):.2f}% (n={len(cold)})')

# 收藏/播放 比率（藏播比 = 每万播放带来的收藏）
print('\n高播放作品(>=3万) 关键指标横向:')
hot_rows = sorted([r for r in rows if r['play']>=30000], key=lambda r:-r['play'])
for r in hot_rows:
    ratio = r['save']/r['play']*100
    print(f'  {r["play"]/10000:6.1f}万播放 | 藏{r["save"]:5d} 藏播比{ratio:.2f}% | 赞{r["like"]:5d} | {r["title"][:30]}')

# 关键词分类对比
def classify(r):
    t = r['title']
    neg = bool(re.search(r'别|千万别|没用|都不是|别再|瞎学|弯路|用错|根本|反而|自欺|白费|死于|停止|戒掉|扎心|真相|问题出在|别再假装', t))
    resource = bool(re.search(r'书单|播客|App|App |动画|美剧|资源|工具|电影|清单|4000', t))
    return ('反常识否定' if neg else '') + ('资源推荐' if resource else '') or ('其他' if not neg and not resource else '')

print('\n按标题关键词分组 (收藏/播放均值):')
groups = collections.defaultdict(list)
for r in rows:
    t = r['title']
    g = '反常识否定' if re.search(r'别|千万别|没用|都不是|别再|瞎学|弯路|用错|根本|反而|自欺|白费|死于|停止|戒掉|扎心|真相|问题出在|假装|用这个方法', t) else ''
    if not g and re.search(r'书单|播客|App|动画|美剧|资源|工具|电影|清单|4000|绝望主妇|摩登家庭', t):
        g = '资源推荐'
    if not g:
        g = '方法/认知/实录'
    groups[g].append(r)
for g, rs in sorted(groups.items(), key=lambda kv:-len(kv[1])):
    n = len(rs)
    avg_play = sum(r['play'] for r in rs)//n
    med_play = sorted(r['play'] for r in rs)[n//2]
    avg_save = sum(r['save'] for r in rs)//n
    print(f'  {g}: {n}条 | 平均播放{avg_play:,} 中位{med_play:,} | 平均收藏{avg_save:,}')

# 输出完整排序到文件，供后面写报告
with open(f'{OUT}\\_ranked.json','w',encoding='utf-8') as f:
    json.dump(sorted(rows, key=lambda r:-r['play']), f, ensure_ascii=False, indent=1)
print('\n已输出 _ranked.json')