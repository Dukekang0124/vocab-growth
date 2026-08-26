import json, asyncio, urllib.request, time, sys, re, csv
import websockets

PORT = 9222
OUT = r"D:\写作工具\知识管理\08-九思搭档知识库\06-自媒体规划\04-数据与复盘\作品分析"

def num(v):
    if v is None: return None
    v = v.strip().replace(',','')
    try:
        if '万' in v: return int(float(v.replace('万',''))*10000)
        if '亿' in v: return int(float(v.replace('亿',''))*100000000)
        return int(float(v))
    except: return None

def parse(txt):
    metric = re.compile(
        r'播放\n([\d.万]+)\n点赞\n([\d.万]+)\n评论\n([\d.万]+)\n分享\n([\d.万]+)\n收藏\n([\d.万]+)'
        r'(?:\n弹幕\n([\d.万]+))?'
        r'(?:\n(封面点击率|完播率)\n([\d.]+%?))?'
        r'(?:\n(平均播放占比|2秒跳出率)\n([\d.]+%?))?'
        r'\n吸粉量\n([\d.万]+)'
    )
    title = re.compile(r'(\d{1,2}:\d{2})\n([^\n]+?)\n编辑作品')
    date_pat = re.compile(r'(\d{4})年(\d{2})月(\d{2})日 \d{2}:\d{2}')
    ms = list(metric.finditer(txt))
    ts = list(title.finditer(txt))
    ds = [(m.start(), f"{m.group(1)}-{m.group(2)}-{m.group(3)}") for m in date_pat.finditer(txt)]
    rows = []
    for i, m in enumerate(ms):
        g = m.groups()
        row = {
            'play': num(g[0]), 'like': num(g[1]), 'comment': num(g[2]),
            'share': num(g[3]), 'save': num(g[4]), 'danmaku': num(g[5]),
            'rate1_label': g[6] if g[6] else None, 'rate1': float(g[7].replace('%','')) if g[7] else None,
            'rate2_label': g[8] if g[8] else None, 'rate2': float(g[9].replace('%','')) if g[9] else None,
            'fans': num(g[10]), 'duration': None, 'title': None, 'date': None,
        }
        if i < len(ts):
            row['duration'] = ts[i].group(1); row['title'] = ts[i].group(2).strip()
        cur = m.start()
        dd = [x for x in ds if x[0] < cur]
        if dd: row['date'] = dd[-1][1]
        rows.append(row)
    return rows

async def main():
    pages = json.loads(urllib.request.urlopen(f'http://127.0.0.1:{PORT}/json/list').read())
    creator = next((p for p in pages if p.get('type')=='page' and 'creator.douyin.com' in p.get('url','')), pages[0])
    ws_url = creator['webSocketDebuggerUrl']
    async with websockets.connect(ws_url, ping_interval=None, max_size=50*1024*1024) as ws:
        mid = 0
        async def send(obj):
            nonlocal mid
            mid += 1
            obj['id'] = mid
            await ws.send(json.dumps(obj))
            try:
                return await asyncio.wait_for(ws.recv(), timeout=20)
            except:
                return json.dumps({'error':'timeout'})
        async def ev(expr):
            r = await send({'method':'Runtime.evaluate','params':{'expression':expr,'returnByValue':True,'awaitPromise':True}})
            try:
                v = json.loads(r).get('result',{}).get('result',{})
            except:
                return ''
            return v.get('value', v.get('description',''))

        cur = await ev('location.href')
        if 'content/manage' not in str(cur):
            await send({'method':'Page.navigate','params':{'url':'https://creator.douyin.com/creator-micro/content/manage'}})
            await asyncio.sleep(9)
        # 点已发布
        await ev("""(function(){var c=Array.from(document.querySelectorAll('*')).find(e=>e.children.length<=1&&e.innerText&&e.innerText.trim()==='已发布');if(c)c.click();return 1;})()""")
        await asyncio.sleep(5)

        # 累积采集：scrollTop 从0逐步下移，每步 dump 容器 innerText 并累积
        seen = {}   # key=(date,play,title) -> row
        last_sh = 0
        st = 0
        step = 1400
        for i in range(60):
            await ev(f"""(function(){{var el=document.querySelector('[class*="list-scroll"]');if(el)el.scrollTop={st};return 1;}})()""")
            await asyncio.sleep(1.0)
            txt = await ev("var el=document.querySelector('[class*=\"list-scroll\"]'); el?el.innerText:''")
            sh = await ev("var el=document.querySelector('[class*=\"list-scroll\"]'); el?el.scrollHeight:0")
            sh = int(sh) if str(sh).isdigit() else 0
            if isinstance(txt, str):
                for r in parse(txt):
                    key = (r['date'], r['play'], r['title'])
                    seen[key] = r
            sys.stderr.write(f'step{i} st={st} sh={sh} seen={len(seen)}\n')
            if sh > last_sh:
                last_sh = sh
            if st >= sh - 800 and sh > 0:
                # 再往下探几次确认到底
                if i > 3 and sh == last_sh:
                    break
            st += step

    rows = list(seen.values())
    # 按日期倒序排序
    rows.sort(key=lambda r: r['date'] or '', reverse=True)
    print(f'\n=== TOTAL {len(rows)} works ===', flush=True)
    json.dump(rows, open(f'{OUT}\\_alldata.json','w',encoding='utf-8'), ensure_ascii=False, indent=1)
    with open(f'{OUT}\\_alldata.csv','w',encoding='utf-8-sig',newline='') as f:
        w = csv.writer(f)
        w.writerow(['date','title','play','like','comment','share','save','danmaku','rate1_label','rate1','rate2_label','rate2','fans','duration'])
        for r in rows:
            w.writerow([r['date'],r['title'],r['play'],r['like'],r['comment'],r['share'],r['save'],r['danmaku'],r['rate1_label'],r['rate1'],r['rate2_label'],r['rate2'],r['fans'],r['duration']])
    print(f'Saved {len(rows)} rows', flush=True)

asyncio.run(main())