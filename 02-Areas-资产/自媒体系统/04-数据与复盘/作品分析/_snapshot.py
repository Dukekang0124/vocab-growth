import json, asyncio, urllib.request, sys, re
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
    ws_url = creator['webSocketDebuggerUrl']
    async with websockets.connect(ws_url, ping_interval=None, max_size=50*1024*1024) as ws:
        mid = 0
        async def send(obj):
            nonlocal mid
            mid += 1
            obj['id'] = mid
            await ws.send(json.dumps(obj))
            try: return await asyncio.wait_for(ws.recv(), timeout=20)
            except: return json.dumps({'error':'timeout'})
        async def ev(expr):
            r = await send({'method':'Runtime.evaluate','params':{'expression':expr,'returnByValue':True,'awaitPromise':True}})
            try:
                v = json.loads(r).get('result',{}).get('result',{})
            except: return ''
            return v.get('value', v.get('description',''))

        # 首页粉丝数
        await send({'method':'Page.navigate','params':{'url':'https://creator.douyin.com/creator-micro/home'}})
        await asyncio.sleep(7)
        home = str(await ev("document.body.innerText"))
        # 粉丝/获赞上下文
        m = re.search(r'粉丝\s*([\d.,万]+)[\s\S]{0,40}?获赞\s*([\d.,万]+)', home)
        if m:
            print(f'FANS={m.group(1)}  LIKE={m.group(2)}')
        else:
            idx = home.find('粉丝')
            print('粉丝上下文:', home[idx:idx+60].replace('\n','|') if idx>=0 else '未找到粉丝字段')

asyncio.run(main())