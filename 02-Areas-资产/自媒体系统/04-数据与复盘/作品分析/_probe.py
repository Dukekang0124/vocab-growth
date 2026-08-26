import json, asyncio, urllib.request, time, sys
import websockets

PORT = 9222

def num(v):
    if v is None: return None
    v = v.strip().replace(',','')
    try:
        if '万' in v: return int(float(v.replace('万',''))*10000)
        if '亿' in v: return int(float(v.replace('亿',''))*100000000)
        return int(float(v))
    except: return None

async def main():
    # 列出所有 tab
    pages = json.loads(urllib.request.urlopen(f'http://127.0.0.1:{PORT}/json/list').read())
    print(f'=== {len(pages)} pages ===')
    for p in pages:
        print(f'  [{p.get("type")}] {p.get("url","")[:80]}')
    # 找 creator 页
    creator = next((p for p in pages if p.get('type')=='page' and 'creator.douyin.com' in p.get('url','')), None)
    ws_url = (creator or pages[0])['webSocketDebuggerUrl']
    print(f'=== using {ws_url[:60]} ===')
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
            v = json.loads(r).get('result',{}).get('result',{})
            return v.get('value', v.get('description',''))
        # 导航到内容管理
        await send({'method':'Page.navigate','params':{'url':'https://creator.douyin.com/creator-micro/content/manage'}})
        await asyncio.sleep(8)
        # 当前筛选 tab 文本
        tabs = await ev("Array.from(document.querySelectorAll('[class*=\"tab\"], [role=\"tab\"]')).map(e=>e.innerText).filter(x=>x&&x.length<12).join('|')")
        print('TABS:', tabs)
        # 数编辑作品
        cnt = await ev("document.querySelectorAll('button').length")
        edit = await ev("Array.from(document.querySelectorAll('*')).filter(e=>e.innerText==='编辑作品').length")
        print('编辑作品节点数:', edit)
        # 滚动容器
        info = await ev("var el=document.querySelector('[class*=\"list-scroll\"]'); el?JSON.stringify({sh:el.scrollHeight,st:el.scrollTop,ch:el.clientHeight}):'NO EL'")
        print('容器:', info)
        # 全文长度
        print('innerText长度:', await ev("document.body.innerText.length"))
        # 找一个"作品 (320)"的位置
        print('标题栏文本:', await ev("document.body.innerText.slice(0,400).replace(/\\n/g,' / ')"))

asyncio.run(main())