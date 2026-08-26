import json, asyncio, urllib.request, sys
import websockets

PORT = 9222

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

        # 导航到创作者中心首页
        await send({'method':'Page.navigate','params':{'url':'https://creator.douyin.com/creator-micro/home'}})
        await asyncio.sleep(8)

        # 抓包含"粉丝"上下文
        txt = await ev("document.body.innerText")
        sys.stderr.write('PAGE LEN='+str(len(txt))+'\n')
        # 打印前 3000 字符找粉丝数字
        head = txt[:3000].replace('\r','')
        print('=== 首页文本片段 ===')
        print(head)

asyncio.run(main())