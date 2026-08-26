import json, asyncio, urllib.request, subprocess, time, sys, re
import websockets

CHROME = "C:/Program Files/Google/Chrome/Application/chrome.exe"
PROFILE = "C:/Users/11/hermes-chrome-profile"
PORT = 9222
OUT = r"D:\写作工具\知识管理\08-九思搭档知识库\06-自媒体规划\04-数据与复盘\作品分析"

def ensure_cdp():
    try:
        urllib.request.urlopen(f"http://127.0.0.1:{PORT}/json/list", timeout=3); return True
    except:
        subprocess.run(["taskkill","//F","//IM","chrome.exe"], capture_output=True); time.sleep(2)
        subprocess.Popen([CHROME,f"--user-data-dir={PROFILE}",f"--remote-debugging-port={PORT}","https://www.douyin.com"]); time.sleep(8)
        try:
            urllib.request.urlopen(f"http://127.0.0.1:{PORT}/json/list", timeout=3); return True
        except: return False

def num(v):
    if v is None: return None
    v = v.strip().replace(',','')
    try:
        if '万' in v: return int(float(v.replace('万',''))*10000)
        if '亿' in v: return int(float(v.replace('亿',''))*100000000)
        return int(float(v))
    except: return None

async def main():
    if not ensure_cdp():
        print("CDP FAILED", file=sys.stderr); sys.exit(1)
    pages = json.loads(urllib.request.urlopen(f'http://127.0.0.1:{PORT}/json/list').read())
    ws_url = pages[0]['webSocketDebuggerUrl']
    async with websockets.connect(ws_url, ping_interval=None, max_size=50*1024*1024) as ws:
        mid = 0
        async def send(obj):
            nonlocal mid
            mid += 1
            obj['id'] = mid
            await ws.send(json.dumps(obj))
            return await ws.recv()
        async def ev(expr):
            r = await send({'method':'Runtime.evaluate','params':{'expression':expr,'returnByValue':True,'awaitPromise':True}})
            return json.loads(r).get('result',{}).get('result',{}).get('value','')
        # 导航
        await send({'method':'Page.navigate','params':{'url':'https://creator.douyin.com/creator-micro/content/manage'}})
        await asyncio.sleep(7)
        # 拿容器中心坐标
        coord = await ev("var el=document.querySelector('[class*=\"list-scroll\"]'); var r=el.getBoundingClientRect(); JSON.stringify({x:Math.round(r.x+r.width*0.5), y:Math.round(r.y+r.height*0.6)})")
        x, y = json.loads(coord)['x'], json.loads(coord)['y']
        sys.stderr.write(f'container center {x},{y}\n')
        # 先 mouseMoved 到容器
        await send({'method':'Input.dispatchMouseEvent','params':{'type':'mouseMoved','x':x,'y':y}})
        prev = 0; stable = 0
        sh_js = "var el=document.querySelector('[class*=\"list-scroll\"]'); el?el.scrollHeight:0"
        for i in range(120):
            for _ in range(6):
                await send({'method':'Input.dispatchMouseEvent','params':{'type':'mouseWheel','x':x,'y':y,'deltaX':0,'deltaY':900}})
            await asyncio.sleep(2.5)
            sh = int(await ev(sh_js) or 0)
            sys.stderr.write(f'scroll {i} sh={sh}\n')
            if sh > prev:
                prev = sh; stable = 0
            else:
                stable += 1
                if stable >= 7: break
        txt = await ev('document.body.innerText')
        open(f'{OUT}\\_full_dump.txt','w',encoding='utf-8').write(txt)
        sys.stderr.write(f'TOTAL LEN={len(txt)}\n')

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
            'idx': i, 'play': num(g[0]), 'like': num(g[1]), 'comment': num(g[2]),
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

if __name__ == '__main__':
    txt = asyncio.run(main())
    rows = parse(txt)
    print(f'\n=== PARSED {len(rows)} rows ===')
    json.dump(rows, open(f'{OUT}\\_full_data.json','w',encoding='utf-8'), ensure_ascii=False, indent=1)
    import csv
    with open(f'{OUT}\\_full_data.csv','w',encoding='utf-8-sig',newline='') as f:
        w = csv.writer(f)
        w.writerow(['date','title','play','like','comment','share','save','danmaku','rate1_label','rate1','rate2_label','rate2','fans','duration'])
        for r in rows:
            w.writerow([r['date'],r['title'],r['play'],r['like'],r['comment'],r['share'],r['save'],r['danmaku'],r['rate1_label'],r['rate1'],r['rate2_label'],r['rate2'],r['fans'],r['duration']])
    print(f'Saved {len(rows)} rows')