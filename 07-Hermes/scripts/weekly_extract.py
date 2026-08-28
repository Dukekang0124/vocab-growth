#!/usr/bin/env python3
"""
weekly_extract.py — 抖音创作者中心周数据提取器 v3.0
抓取创作者中心作品列表：播放量/点赞/评论/收藏/分享/封面点击率
用法：python weekly_extract.py
"""
import asyncio, json, os, sys, urllib.request, time, subprocess
from pathlib import Path

CHROME_PATH = r"C:\Program Files\Google\Chrome\Application\chrome.exe"
CDP_PORT = 9222
CDP_WS_URL = f"http://localhost:{CDP_PORT}/json/version"
PROFILE_DIR = r"C:\Users\Admin\AppData\Local\Google\Chrome\User Data"
OUTPUT_DIR = r"D:\写作工具\知识管理\02-Areas-资产\自媒体系统\04-数据与复盘"
LOG_FILE = r"D:\写作工具\知识管理\07-Hermes\scripts\cdp_extract.log"

def log(msg):
    with open(LOG_FILE, "a", encoding="utf-8") as f:
        f.write(f"[{time.strftime('%H:%M:%S')}] {msg}\n")
    print(msg)

def ensure_chrome_running():
    try:
        urllib.request.urlopen(CDP_WS_URL, timeout=3)
        log("✅ CDP端口9222已监听")
        return True
    except:
        log("⚠️ 启动Chrome...")
        subprocess.run(["taskkill", "/F", "/IM", "chrome.exe"], capture_output=True)
        time.sleep(1)
        cmd = [CHROME_PATH, f"--remote-debugging-port={CDP_PORT}", 
               f"--user-data-dir={PROFILE_DIR}", "--no-first-run", "--no-default-browser-check"]
        subprocess.Popen(cmd, creationflags=0x08000000 if os.name == 'nt' else 0)
        for i in range(15):
            time.sleep(1)
            try:
                urllib.request.urlopen(CDP_WS_URL, timeout=2)
                log(f"✅ Chrome就绪（{i+1}s）")
                return True
            except: pass
        return False

async def extract_creator_center(ws, url):
    """抓创作者中心数据"""
    try:
        await ws.send(json.dumps({"id": 1, "method": "Page.navigate", "params": {"url": url}}))
        await asyncio.sleep(12)  # 等页面加载
        
        # 抓全量页面文本（兜底）
        result = await ws.send(json.dumps({
            "id": 2, "method": "Runtime.evaluate",
            "params": {"expression": "document.body ? document.body.innerText : ''"}
        }))
        text = json.loads(result)["result"]["result"]["value"]
        
        # 尝试抓数据卡片（作者ID/昵称/粉丝/播放量等）
        meta_result = await ws.send(json.dumps({
            "id": 3, "method": "Runtime.evaluate",
            "params": {"expression": """
                (() => {
                    // 找所有含数字+单位的元素
                    const nodes = Array.from(document.querySelectorAll('*'));
                    const captures = [];
                    const patterns = [
                        /\\d[\\d,]*\\s*(万播放|万赞|万播放量)/,
                        /\\d[\\d,]*\\s*(播放|赞|评论|收藏|分享)/,
                        /粉丝[:：]\\s*\\d[\\d,]*/
                    ];
                    for (const n of nodes) {
                        const t = n.textContent?.trim();
                        if (t && t.length < 60 && t.length > 2) {
                            for (const p of patterns) {
                                if (p.test(t)) { captures.push(t); break; }
                            }
                        }
                    }
                    return [...new Set(captures)].slice(0, 50);
                })()
            """}
        }))
        metas = json.loads(meta_result)["result"]["result"]["value"]
        
        return {"full_text": text, "data_points": metas, "url": url}
    except Exception as e:
        return {"error": str(e)}
    finally:
        await ws.close()

async def main():
    log(f"\n{'='*50}")
    log("抖音创作者中心数据抓取")
    
    if not ensure_chrome_running():
        sys.exit(1)
    
    TARGET_URL = "https://creator.douyin.com/creator-micro/data/service/archive"
    
    targets = json.loads(urllib.request.urlopen(f"http://localhost:{CDP_PORT}/json/list", timeout=5).read())
    douyin = next((t for t in targets if "douyin.com" in t.get("url","")), None)
    if not douyin:
        log("❌ 没有找到抖音创作者中心页面，请先在Chrome打开并登录")
        sys.exit(1)
    
    log(f"连接: {douyin['url']}")
    try:
        import websockets
        async with websockets.connect(douyin["wsUrl"]) as ws:
            result = await extract_creator_center(ws, TARGET_URL)
            log(f"✅ 抓取完成")
            out_file = os.path.join(OUTPUT_DIR, f"creator_data_{time.strftime('%Y%m%d_%H%M')}.json")
            os.makedirs(OUTPUT_DIR, exist_ok=True)
            with open(out_file, "w", encoding="utf-8") as f:
                json.dump(result, f, ensure_ascii=False, indent=2)
            log(f"结果: {out_file}")
            print(f"\n数据预览（前500字符）:\n{str(result)[:500]}")
    except Exception as e:
        log(f"❌ 抓取失败: {e}")

if __name__ == "__main__":
    asyncio.run(main())
