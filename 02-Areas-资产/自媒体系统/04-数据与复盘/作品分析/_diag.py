import json, asyncio, urllib.request, subprocess, time, sys
import websockets

CHROME = "C:/Program Files/Google/Chrome/Application/chrome.exe"
PROFILE = "C:/Users/11/hermes-chrome-profile"
PORT = 9222

def ensure_cdp():
    try:
        urllib.request.urlopen(f"http://127.0.0.1:{PORT}/json/list", timeout=3); return True
    except:
        subprocess.run(["taskkill","//F","//IM","chrome.exe"], capture_output=True); time.sleep(2)
        subprocess.Popen([CHROME,f"--user-data-dir={PROFILE}",f"--remote-debugging-port={PORT}","https://www.douyin.com"]); time.sleep(8)
        try:
            urllib.request.urlopen(f"http://127.0.0.1:{PORT}/json/list", timeout=3); return True
        except: return False

async def cdp(ws_url, expr):
    async with websockets.connect(ws_url, ping_interval=None, max_size=30*1024*1024) as ws:
        await ws.send(json.dumps({'id':1,'method':'Runtime.evaluate','params':{'expression':expr,'returnByValue':True,'awaitPromise':True}}))
        r = await ws.recv()
        return json.loads(r).get('result',{}).get('result',{}).get('value','')

async def main():
    ensure_cdp()
    pages = json.loads(urllib.request.urlopen(f'http://127.0.0.1:{PORT}/json/list').read())
    ws_url = pages[0]['webSocketDebuggerUrl']
    async with websockets.connect(ws_url, ping_interval=None, max_size=30*1024*1024) as ws:
        await ws.send(json.dumps({'id':1,'method':'Page.navigate','params':{'url':'https://creator.douyin.com/creator-micro/content/manage'}}))
        await ws.recv()
    await asyncio.sleep(6)

    report = await cdp(ws_url, '''(function(){
      var el = document.querySelector('[class*="list-scroll"]');
      if(!el) return 'NO EL';
      var before = {sh: el.scrollHeight, st: el.scrollTop, ch: el.clientHeight};
      // 方法1：直接滚到底
      el.scrollTop = el.scrollHeight;
      return JSON.stringify({before: before, after: {st: el.scrollTop}});
    })()''')
    print('STEP1 set scrollTop:', report)
    await asyncio.sleep(4)
    report2 = await cdp(ws_url, '''(function(){
      var el = document.querySelector('[class*="list-scroll"]');
      if(!el) return 'NO EL';
      var s = {sh: el.scrollHeight, st: el.scrollTop, ch: el.clientHeight};
      var bodyLen = document.body.innerText.length;
      var loading = document.body.innerText.indexOf('加载中');
      return JSON.stringify({scroll: s, bodyLen: bodyLen, loadingIdx: loading});
    })()''')
    print('STEP2 after 4s:', report2)

    # 方法2：派发滚轮事件
    await cdp(ws_url, '''(function(){
      var el = document.querySelector('[class*="list-scroll"]');
      if(!el) return;
      for(var i=0;i<10;i++){
        el.dispatchEvent(new WheelEvent('wheel', {deltaY: 800, bubbles: true, cancelable: true}));
      }
      el.scrollTop = el.scrollHeight;
    })()''')
    await asyncio.sleep(4)
    report3 = await cdp(ws_url, '''(function(){
      var el = document.querySelector('[class*="list-scroll"]');
      if(!el) return 'NO EL';
      return JSON.stringify({sh: el.scrollHeight, st: el.scrollTop, bodyLen: document.body.innerText.length, loadingIdx: document.body.innerText.indexOf('加载中')});
    })()''')
    print('STEP3 wheel:', report3)

asyncio.run(main())