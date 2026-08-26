"""Get comments for this week's videos via CDP."""
import json, asyncio, websockets, urllib.request, re

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
    
    # Go to creator center interaction management
    async with websockets.connect(ws_url) as ws:
        await ws.send(json.dumps({
            'id': 1, 'method': 'Page.navigate',
            'params': {'url': 'https://creator.douyin.com/creator-micro/interaction/comment'}
        }))
        await ws.recv()
    await asyncio.sleep(5)
    
    # Get comments page
    comments_raw = await cdp_evaluate(ws_url, '''
    (function() {
        var body = document.body.innerText;
        return JSON.stringify({title: document.title, body: body.substring(0, 5000)});
    })()
    ''')
    result = comments_raw.get('result', {}).get('result', {}).get('value', '')
    print(f"Comments page: {result[:3000]}")
    
    # Also try to get individual video comments from the content page
    # Navigate to content management and click on a video's comment
    async with websockets.connect(ws_url) as ws:
        await ws.send(json.dumps({
            'id': 2, 'method': 'Page.navigate',
            'params': {'url': 'https://creator.douyin.com/creator-micro/content/manage'}
        }))
        await ws.recv()
    await asyncio.sleep(4)
    
    # Try to click on comments link of first non-pinned video
    click_result = await cdp_evaluate(ws_url, '''
    (function() {
        // Find all elements containing 评论 text and near a video title
        var all = document.querySelectorAll('*');
        var commentLinks = [];
        all.forEach(function(el) {
            var t = el.innerText || el.textContent || '';
            if (t === '评论' || t === '评论管理') {
                var parent = el.closest('a, button, [class*="click"], [class*="link"]');
                if (parent) {
                    commentLinks.push({tag: el.tagName, text: t, parentTag: parent.tagName});
                }
            }
        });
        return JSON.stringify({found: commentLinks.length, links: commentLinks.slice(0, 5)});
    })()
    ''')
    print(f"\nComment links: {json.dumps(click_result, ensure_ascii=False)[:500]}")

asyncio.run(main())
