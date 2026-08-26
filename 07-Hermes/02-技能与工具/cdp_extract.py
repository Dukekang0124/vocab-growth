#!/usr/bin/env python3
"""CDP 自愈提取器 v2.0——自动重启Chrome + 提取数据 + 截图封面"""
import subprocess, sys, json, urllib.request, time, base64, os

CHROME = "C:/Program Files/Google/Chrome/Application/chrome.exe"
PROFILE = "C:/Users/11/hermes-chrome-profile"
PORT = 9222
DOUYIN = "https://www.douyin.com"

def ensure_cdp():
    try:
        urllib.request.urlopen(f"http://127.0.0.1:{PORT}/json/list", timeout=3)
        return True
    except:
        subprocess.run(["taskkill", "//F", "//IM", "chrome.exe"], capture_output=True)
        time.sleep(2)
        subprocess.Popen([CHROME, f"--user-data-dir={PROFILE}", f"--remote-debugging-port={PORT}", DOUYIN])
        time.sleep(8)
        try:
            urllib.request.urlopen(f"http://127.0.0.1:{PORT}/json/list", timeout=3)
            return True
        except:
            return False

async def extract_video(url, screenshot_path=None):
    import asyncio, websockets
    resp = urllib.request.urlopen('http://127.0.0.1:9222/json/list', timeout=5)
    ws_url = json.loads(resp.read())[0]['webSocketDebuggerUrl']
    
    async with websockets.connect(ws_url, ping_interval=None, max_size=10*1024*1024) as ws:
        await ws.send(json.dumps({'id':1,'method':'Page.navigate','params':{'url':url}}))
        await asyncio.wait_for(ws.recv(), timeout=10)
        await asyncio.sleep(4)
        
        txt = ''
        scr = None
        
        await ws.send(json.dumps({'id':2,'method':'Runtime.evaluate','params':{'expression':'(function(){var a=document.body.innerText;var i=a.indexOf("全部评论");if(i<0){i=a.indexOf("发布时间");if(i<0)i=0}else{i=Math.max(0,i-80)}return a.substring(i,i+2000)})()'}}))
        r = await asyncio.wait_for(ws.recv(), timeout=10)
        txt = json.loads(r).get('result',{}).get('result',{}).get('value','')
        
        if screenshot_path:
            await ws.send(json.dumps({'id':3,'method':'Page.captureScreenshot','params':{'format':'png'}}))
            r = await asyncio.wait_for(ws.recv(), timeout=10)
            b64 = json.loads(r).get('result',{}).get('data','')
            if b64:
                os.makedirs(os.path.dirname(screenshot_path) or '.', exist_ok=True)
                with open(screenshot_path, 'wb') as f:
                    f.write(base64.b64decode(b64))
        
        return txt

def extract(url, screenshot=False):
    import asyncio
    if not ensure_cdp():
        print("CDP FAILED", file=sys.stderr)
        sys.exit(1)
    sp = f"D:/写作工具/知识管理/01-Projects-项目/OPC指挥部/自媒体系统/苏不倦自媒体方法论/英语知识类口播方法论/抖音账号分析系统/数据截图/{int(time.time())}.png" if screenshot else None
    result = asyncio.run(extract_video(url, sp))
    if sp:
        print(f"SCREENSHOT: {sp}")
    print(result)

if __name__ == '__main__':
    import asyncio
    url = sys.argv[1] if len(sys.argv) > 1 else DOUYIN
    sc = '--screenshot' in sys.argv
    extract(url, sc)
