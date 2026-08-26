import json, asyncio, urllib.request, re, sys
import websockets

PORT = 9222

def num(v):
    if not v: return None
    v = v.strip().replace(',','')
    try:
        if '万' in v: return int(float(v.replace('万',''))*10000)
        return int(float(v))
    except: return None

async def main():
    pages = json.loads(urllib.request.urlopen(f'http://127.0.0.1:{PORT}/json/list').read())
    creator = next((p for p in pages if p.get('type')=='page' and 'creator.douyin.com' in p.get('url','')), pages[0])
    ws = creator['webSocketDebuggerUrl']
    async with websockets.connect(ws, ping_interval=None, max_size=50*1024*1024) as c:
        mid = 0
        async def send(obj):
            nonlocal mid
            mid += 1; obj['id'] = mid
            await c.send(json.dumps(obj))
            try: return await asyncio.wait_for(c.recv(), timeout=20)
            except: return json.dumps({'error':'timeout'})
        async def ev(expr):
            r = await send({'method':'Runtime.evaluate','params':{'expression':expr,'returnByValue':True,'awaitPromise':True}})
            try:
                v = json.loads(r).get('result',{}).get('result',{})
            except: return ''
            return v.get('value', v.get('description',''))

        # 首页粉丝
        await send({'method':'Page.navigate','params':{'url':'https://creator.douyin.com/creator-micro/home'}})
        await asyncio.sleep(7)
        home = str(await ev("document.body.innerText"))
        f = re.search(r'粉丝\s*([\d.,万]+)', home)
        print(f'FANS={f.group(1) if f else "?"}')

        # 内容管理，抓最新作品
        await send({'method':'Page.navigate','params':{'url':'https://creator.douyin.com/creator-micro/content/manage'}})
        await asyncio.sleep(8)
        await ev("""(function(){var c=Array.from(document.querySelectorAll('*')).find(e=>e.children.length<=1&&e.innerText&&e.innerText.trim()==='已发布');if(c)c.click();return 1;})()""")
        await asyncio.sleep(5)
        # 抓容器文本，提取作品块
        txt = str(await ev("var el=document.querySelector('[class*=\"list-scroll\"]')||document.body; el.innerText"))
        # 找第一个日期（最近的已发布，跳过置顶）
        dates = re.findall(r'(\d{4})年(\d{2})月(\d{2})日', txt)
        dates = [f'{a}-{b}-{c}' for a,b,c in dates]
        print('最新出现的日期(unique前8):', list(dict.fromkeys(dates))[:8])
        # 标题
        titles = re.findall(r'\d{1,2}:\d{2}\n([^\n]+?)\n编辑作品', txt)
        print('最新作品标题(前5):')
        for t in titles[:5]:
            print('  -', t.strip()[:50])

asyncio.run(main())