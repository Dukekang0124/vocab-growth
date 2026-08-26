"""Get follower count and last week's report."""
import json
import asyncio
import websockets
import urllib.request
import re

async def cdp_evaluate(ws_url, expression):
    async with websockets.connect(ws_url) as ws:
        await ws.send(json.dumps({
            'id': 1, 'method': 'Runtime.evaluate',
            'params': {'expression': expression, 'returnByValue': True, 'awaitPromise': True}
        }))
        result = await ws.recv()
        return json.loads(result)

async def main():
    resp = urllib.request.urlopen('http://127.0.0.1:9222/json/list')
    pages = json.loads(resp.read())
    ws_url = pages[0]['webSocketDebuggerUrl']
    
    # Navigate to self page
    async with websockets.connect(ws_url) as ws:
        await ws.send(json.dumps({
            'id': 1, 'method': 'Page.navigate',
            'params': {'url': 'https://www.douyin.com/user/self'}
        }))
        await ws.recv()
    await asyncio.sleep(4)
    
    # Extract follower count
    stats = await cdp_evaluate(ws_url, '''
    (function() {
        var body = document.body.innerText;
        var fansMatch = body.match(/粉丝\\s*\\n\\s*([\\d.万]+)/);
        var fans = fansMatch ? fansMatch[1] : null;
        if (!fans) {
            fansMatch = body.match(/粉丝[\\s:：]*([\\d.万]+)/);
            fans = fansMatch ? fansMatch[1] : "not found";
        }
        var worksMatch = body.match(/作品\\s*\\n\\s*(\\d+)/);
        var works = worksMatch ? worksMatch[1] : null;
        var likesMatch = body.match(/获赞\\s*\\n\\s*([\\d.万]+)/);
        var likes = likesMatch ? likesMatch[1] : null;
        return JSON.stringify({fans: fans, works: works, likes: likes});
    })()
    ''')
    result = stats.get('result', {}).get('result', {}).get('value', '')
    print(f"Stats: {result}")
    
    # Try to get detailed data for video ID: look at the 8/1 video comments
    # Go to the specific video
    # Actually let's try the data center for more structured data
    async with websockets.connect(ws_url) as ws:
        await ws.send(json.dumps({
            'id': 2, 'method': 'Page.navigate',
            'params': {'url': 'https://creator.douyin.com/creator-micro/data/overview'}
        }))
        await ws.recv()
    await asyncio.sleep(4)
    
    overview = await cdp_evaluate(ws_url, '''
    (function() {
        return JSON.stringify({title: document.title, body: document.body.innerText.substring(0, 3000)});
    })()
    ''')
    result2 = overview.get('result', {}).get('result', {}).get('value', '')
    print(f"\nData overview: {result2[:2000]}")

asyncio.run(main())
