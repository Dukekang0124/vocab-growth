import json, asyncio, urllib.request, time, sys
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
            return await ws.recv()
        async def ev(expr):
            r = await send({'method':'Runtime.evaluate','params':{'expression':expr,'returnByValue':True,'awaitPromise':True}})
            v = json.loads(r).get('result',{}).get('result',{})
            return v.get('value', v.get('description',''))

        # 1. 点击"已发布"tab
        print('=== 点击已发布tab ===')
        await ev("""(function(){
            var tabs = Array.from(document.querySelectorAll('[class*="tab"], [role="tab"], span, div')).filter(e=>e.innerText==='已发布');
            return JSON.stringify(tabs.map(t=>t.tagName+'/'+(t.className||'').toString().slice(0,40)));
        })()""")
        # 找可点击的"已发布"（通常是 li 或 div 容器）
        res = await ev("""(function(){
            var nodes = Array.from(document.querySelectorAll('*')).filter(e=>e.children.length<=2 && e.innerText.trim()==='已发布');
            return JSON.stringify(nodes.map(n=>n.tagName+'/'+(n.className||'').toString().slice(0,60)));
        })()""")
        print('已发布候选节点:', res)
        # 点击
        click = await ev("""(function(){
            var n = Array.from(document.querySelectorAll('*')).find(e=>e.children.length<=2 && e.innerText.trim()==='已发布');
            if(!n) return 'NOT FOUND';
            n.click();
            return 'CLICKED ' + n.tagName;
        })()""")
        print('点击结果:', click)
        await asyncio.sleep(5)
        # 统计
        cnt = await ev("Array.from(document.querySelectorAll('*')).filter(e=>e.innerText==='编辑作品').length")
        print('已发布tab下 编辑作品数:', cnt)
        print('innerText长度:', await ev("document.body.innerText.length"))
        info = await ev("var el=document.querySelector('[class*=\"list-scroll\"]'); el?JSON.stringify({sh:el.scrollHeight,st:el.scrollTop,ch:el.clientHeight}):'NO EL'")
        print('容器:', info)

        # 2. 滚动到底，尽量加载全部
        print('=== 开始滚动加载 ===')
        coord = await ev("var el=document.querySelector('[class*=\"list-scroll\"]'); var r=el.getBoundingClientRect(); JSON.stringify({x:Math.round(r.x+r.width*0.5), y:Math.round(r.y+r.height*0.7)})")
        x, y = json.loads(coord)['x'], json.loads(coord)['y']
        await send({'method':'Input.dispatchMouseEvent','params':{'type':'mouseMoved','x':x,'y':y}})
        prev_cnt = 0; stable = 0
        for i in range(80):
            for _ in range(8):
                await send({'method':'Input.dispatchMouseEvent','params':{'type':'mouseWheel','x':x,'y':y,'deltaX':0,'deltaY':1200}})
            await asyncio.sleep(2.0)
            sh = int(await ev("var el=document.querySelector('[class*=\"list-scroll\"]'); el?el.scrollHeight:0") or 0)
            c = int(await ev("Array.from(document.querySelectorAll('*')).filter(e=>e.innerText==='编辑作品').length") or 0)
            print(f'  轮{i}: sh={sh} 编辑作品={c}')
            if c > prev_cnt:
                prev_cnt = c; stable = 0
            else:
                stable += 1
                if stable >= 6:
                    print('连续无增长，停止'); break
        # 最终
        print('=== 最终统计 ===')
        print('编辑作品总数:', await ev("Array.from(document.querySelectorAll('*')).filter(e=>e.innerText==='编辑作品').length"))
        print('innerText长度:', await ev("document.body.innerText.length"))

asyncio.run(main())