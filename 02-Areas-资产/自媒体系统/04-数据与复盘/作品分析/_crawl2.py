import json, asyncio, urllib.request, time, sys
import websockets

PORT = 9222

async def main():
    pages = json.loads(urllib.request.urlopen(f'http://127.0.0.1:{PORT}/json/list').read())
    creator = next((p for p in pages if p.get('type')=='page' and 'creator.douyin.com' in p.get('url','')), pages[0])
    ws_url = creator['webSocketDebuggerUrl']
    print(f'using {ws_url[:50]}', flush=True)
    async with websockets.connect(ws_url, ping_interval=None, max_size=50*1024*1024) as ws:
        mid = 0
        async def send(obj):
            nonlocal mid
            mid += 1
            obj['id'] = mid
            await ws.send(json.dumps(obj))
            try:
                r = await asyncio.wait_for(ws.recv(), timeout=15)
            except Exception as e:
                return json.dumps({'error':str(e)})
            return r
        async def ev(expr):
            r = await send({'method':'Runtime.evaluate','params':{'expression':expr,'returnByValue':True,'awaitPromise':True}})
            try:
                v = json.loads(r).get('result',{}).get('result',{})
            except:
                return f'RAW:{r[:200]}'
            return v.get('value', v.get('description',''))

        # 确保在内容管理页
        cur = await ev('location.href')
        print('当前URL:', cur, flush=True)
        if 'creator-micro/content/manage' not in str(cur):
            await send({'method':'Page.navigate','params':{'url':'https://creator.douyin.com/creator-micro/content/manage'}})
            await asyncio.sleep(9)
            print('已导航', flush=True)

        # 点"已发布"tab
        r = await ev("""(function(){
            var c = Array.from(document.querySelectorAll('*')).find(e=>e.children.length<=1 && e.innerText && e.innerText.trim()==='已发布');
            if(c){c.click();return 'clicked '+c.tagName;}
            return 'notfound';
        })()""")
        print('点已发布:', r, flush=True)
        await asyncio.sleep(5)

        # 读顶部计数（找"共 X"或数字）
        head = await ev("document.body.innerText.slice(0,600).replace(/\\n/g,'|')")
        print('头部:', head, flush=True)

        # 数编辑作品
        def cnt_js(): return "Array.from(document.querySelectorAll('*')).filter(e=>e.innerText && e.innerText.trim()==='编辑作品').length"
        c0 = await ev(cnt_js())
        print('初始编辑作品数:', c0, flush=True)

        # 滚动容器
        info = await ev("var el=document.querySelector('[class*=\"list-scroll\"]'); el?JSON.stringify({sh:el.scrollHeight,st:el.scrollTop,ch:el.clientHeight}):'NOEL'")
        print('滚动容器:', info, flush=True)

        # 混合滚动尝试
        prev = int(c0) if str(c0).isdigit() else 0
        stable = 0
        for i in range(60):
            # 直接用 scrollTop 拉到底 + dispatch scroll
            await ev("""(function(){
                var el=document.querySelector('[class*="list-scroll"]');
                if(!el) return 'noel';
                el.scrollTop = el.scrollHeight;
                el.dispatchEvent(new Event('scroll'));
                return el.scrollHeight;
            })()""")
            await asyncio.sleep(1.5)
            sh = await ev("var el=document.querySelector('[class*=\"list-scroll\"]'); el?el.scrollHeight:0")
            c = await ev(cnt_js())
            ci = int(c) if str(c).isdigit() else 0
            print(f'轮{i} sh={sh} 编辑={c}', flush=True)
            if ci > prev:
                prev = ci; stable = 0
            else:
                stable += 1
                if stable >= 5:
                    print('稳定停止', flush=True); break
        final = await ev(cnt_js())
        print('FINAL 编辑作品数:', final, flush=True)

asyncio.run(main())