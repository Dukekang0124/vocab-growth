"""Weekly Douyin report via CDP — navigate and extract video data."""
import json
import asyncio
import websockets
import urllib.request
import time

async def get_pages():
    """Get all CDP targets."""
    resp = urllib.request.urlopen('http://127.0.0.1:9222/json/list')
    pages = json.loads(resp.read())
    return pages

async def cdp_navigate(ws_url, target_url):
    """Navigate to a URL."""
    async with websockets.connect(ws_url) as ws:
        await ws.send(json.dumps({
            'id': 1,
            'method': 'Page.navigate',
            'params': {'url': target_url}
        }))
        result = await ws.recv()
        return json.loads(result)

async def cdp_evaluate(ws_url, expression):
    """Evaluate JS and return result."""
    async with websockets.connect(ws_url) as ws:
        await ws.send(json.dumps({
            'id': 1,
            'method': 'Runtime.evaluate',
            'params': {
                'expression': expression,
                'returnByValue': True,
                'awaitPromise': True
            }
        }))
        result = await ws.recv()
        return json.loads(result)

async def main():
    pages = await get_pages()
    print(f"Found {len(pages)} pages")
    
    # Find a page that's usable (not empty)
    target = pages[0]
    ws_url = target['webSocketDebuggerUrl']
    print(f"Using page: {target['id']} at {target.get('url', 'no url')[:80]}")
    
    # Navigate to Douyin
    print("Navigating to Douyin...")
    nav_result = await cdp_navigate(ws_url, 'https://www.douyin.com')
    print(f"Navigate result: {json.dumps(nav_result, ensure_ascii=False)[:300]}")
    
    # Wait for page load
    await asyncio.sleep(8)
    
    # Check current URL
    url_result = await cdp_evaluate(ws_url, 'window.location.href')
    print(f"Current URL: {json.dumps(url_result, ensure_ascii=False)[:300]}")
    
    # Check if we're logged in by looking for user data
    login_check = await cdp_evaluate(ws_url, '''
    (function() {
        try {
            var userInfo = localStorage.getItem('userInfo');
            var hasLogin = !!document.querySelector('[data-e2e="user-avatar"]');
            var title = document.title;
            return JSON.stringify({userInfo: userInfo ? 'found' : 'none', hasLogin: hasLogin, title: title});
        } catch(e) {
            return JSON.stringify({error: e.message});
        }
    })()
    ''')
    print(f"Page state: {json.dumps(login_check, ensure_ascii=False)[:500]}")
    
    # Navigate to creator center / 作品管理
    print("\nNavigating to creator center...")
    await cdp_navigate(ws_url, 'https://creator.douyin.com/creator-micro/content/manage')
    await asyncio.sleep(5)
    
    url2 = await cdp_evaluate(ws_url, 'window.location.href')
    print(f"Creator center URL: {json.dumps(url2, ensure_ascii=False)[:300]}")
    
    title2 = await cdp_evaluate(ws_url, 'document.title')
    print(f"Page title: {json.dumps(title2, ensure_ascii=False)[:200]}")
    
    # Try to extract video list
    print("\nTrying to get video list from page...")
    video_data = await cdp_evaluate(ws_url, '''
    (function() {
        var videos = [];
        // Try to find video items
        var items = document.querySelectorAll('[data-e2e="video-item"], .video-item, .work-item, [class*="video"], [class*="work"], [class*="content-item"]');
        items.forEach(function(item, i) {
            var text = item.innerText || item.textContent || '';
            videos.push({index: i, text: text.substring(0, 200)});
        });
        if (videos.length === 0) {
            // Just get some page structure
            var body = document.body.innerText.substring(0, 1000);
            return JSON.stringify({noVideos: true, bodySample: body, title: document.title});
        }
        return JSON.stringify({count: videos.length, videos: videos.slice(0, 5)});
    })()
    ''')
    print(f"Video data: {json.dumps(video_data, ensure_ascii=False)[:1500]}")
    
    return "Done"

asyncio.run(main())
