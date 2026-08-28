#!/usr/bin/env python3
"""
cdp_extract.py — 抖音创作者中心 CDP 自愈提取器 v3.0
用法：python cdp_extract.py <视频URL>
自动：检查Chrome调试端口→挂了就自启→连接CDP→抓数据→输出JSON
"""
import asyncio, json, os, sys, urllib.request, time, subprocess, re, websockets
from pathlib import Path

# ===== 配置 =====
CHROME_PATH = r"C:\Program Files\Google\Chrome\Application\chrome.exe"
CDP_PORT = 9222
CDP_WS_URL = f"http://localhost:{CDP_PORT}/json/version"
PROFILE_DIR = r"C:\Users\Admin\AppData\Local\Google\Chrome\User Data"
OUTPUT_DIR = r"D:\写作工具\知识管理\02-Areas-资产\自媒体系统\04-数据与复盘\作品分析\数据截图"
LOG_FILE = r"D:\写作工具\知识管理\07-Hermes\scripts\cdp_extract.log"

def log(msg):
    with open(LOG_FILE, "a", encoding="utf-8") as f:
        f.write(f"[{time.strftime('%H:%M:%S')}] {msg}\n")
    print(msg)

# ===== 步骤1：确保Chrome带着调试端口在跑 =====
def ensure_chrome_running():
    """检查9222端口，挂了就启动新Chrome实例"""
    try:
        resp = urllib.request.urlopen(CDP_WS_URL, timeout=3)
        log("✅ CDP端口9222已监听，Chrome已运行")
        return True
    except Exception:
        log("⚠️  CDP端口未监听，启动Chrome...")
        # 杀旧进程
        try:
            subprocess.run(["taskkill", "/F", "/IM", "chrome.exe"], 
                          capture_output=True, timeout=5)
        except: pass
        time.sleep(1)
        # 启动Chrome，不kill主Chrome（独立端口）
        cmd = [
            CHROME_PATH,
            f"--remote-debugging-port={CDP_PORT}",
            f"--user-data-dir={PROFILE_DIR}",
            "--no-first-run",
            "--no-default-browser-check",
        ]
        log(f"启动Chrome: {' '.join(cmd[:3])}...")
        subprocess.Popen(cmd, creationflags=0x08000000 if os.name == 'nt' else 0)
        # 等CDP就绪
        for i in range(15):
            time.sleep(1)
            try:
                urllib.request.urlopen(CDP_WS_URL, timeout=2)
                log(f"✅ Chrome调试端口已就绪（{i+1}秒）")
                return True
            except: pass
        log("❌ Chrome启动超时")
        return False

# ===== 步骤2：获取页面列表，连接目标 =====
async def get_targets():
    """获取所有CDP目标"""
    resp = urllib.request.urlopen("http://localhost:9222/json/list", timeout=5)
    return json.loads(resp.read())

async def connect_ws(url):
    """连接WebSocket"""
    return await asyncio.wait_for(websockets.connect(url), timeout=30)

# ===== 步骤3：抓单条视频数据 =====
async def extract_video(ws, url, target_page_id):
    """抓取单条视频数据"""
    try:
        # 导航到视频页
        await ws.send(json.dumps({
            "id": 1,
            "method": "Page.navigate",
            "params": {"url": url}
        }))
        # 等待加载
        await asyncio.sleep(8)
        
        # 抓取页面文本
        result = await ws.send(json.dumps({
            "id": 2,
            "method": "Runtime.evaluate",
            "params": {"expression": "document.body ? document.body.innerText : ''"}
        }))
        text = json.loads(result)["result"]["result"]["value"]
        
        # 抓评论数/播放量/点赞等
        data_extract = await ws.send(json.dumps({
            "id": 3,
            "method": "Runtime.evaluate",
            "params": {"expression": """
                (() => {
                    const els = document.querySelectorAll('[class*="like"],[class*="digg"],[class*="play"],[class*="comment"],[class*="forward"]');
                    return Array.from(els).map(e => ({text: e.innerText, class: e.className}));
                })()
            """}
        }))
        meta = json.loads(data_extract)["result"]["result"]["value"]
        
        return {"text_len": len(text), "meta_elements": meta[:20], "raw_url": url}
    except Exception as e:
        return {"error": str(e)}
    finally:
        await ws.close()

# ===== 步骤4：主流程 =====
async def main(target_url):
    log(f"\n{'='*50}")
    log(f"开始抓取: {target_url}")
    
    # 1. 确保Chrome在跑
    if not ensure_chrome_running():
        sys.exit(1)
    
    # 2. 获取目标列表
    targets = await asyncio.get_event_loop().run_in_executor(None, get_targets)
    log(f"找到 {len(targets)} 个CDP目标")
    
    # 3. 找抖音视频目标的ws url
    douyin_target = None
    for t in targets:
        if "douyin.com" in t.get("url", ""):
            douyin_target = t
            break
    
    if not douyin_target:
        # 新建一个tab
        new_tab = asyncio.get_event_loop().run_in_executor(None, lambda: urllib.request.urlopen(
            f"http://localhost:{CDP_PORT}/json/new?{target_url}", timeout=5
        ).read())
        douyin_target = {"url": target_url, "wsUrl": targets[0]["wsUrl"]} if targets else None
    
    if not douyin_target:
        log("❌ 找不到抖音页面目标")
        sys.exit(1)
    
    log(f"连接目标: {douyin_target.get('url','')}")
    
    # 4. 抓取数据
    try:
        async with websockets.connect(douyin_target["wsUrl"]) as ws:
            result = await extract_video(ws, target_url, douyin_target.get("id"))
            log(f"✅ 抓取完成: {json.dumps(result, ensure_ascii=False)[:500]}")
            # 保存到文件
            out_file = os.path.join(OUTPUT_DIR, f"video_{int(time.time())}.json")
            os.makedirs(OUTPUT_DIR, exist_ok=True)
            with open(out_file, "w", encoding="utf-8") as f:
                json.dump(result, f, ensure_ascii=False, indent=2)
            log(f"结果已保存到: {out_file}")
    except Exception as e:
        log(f"❌ WebSocket抓取失败: {e}")
        # 兜底：抓当前可见文本
        try:
            import urllib.request
            resp = urllib.request.urlopen(target_url, timeout=10)
            with open(os.path.join(OUTPUT_DIR, "fallback_raw.html"), "w", encoding="utf-8") as f:
                f.write(resp.read().decode("utf-8", errors="ignore")[:50000])
            log("已保存fallback HTML")
        except: pass

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("用法: python cdp_extract.py <抖音视频URL>")
        sys.exit(1)
    asyncio.run(main(sys.argv[1]))
