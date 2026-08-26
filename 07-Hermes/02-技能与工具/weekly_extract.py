"""Extract Douyin video list from creator center with full data parsing."""
import json
import asyncio
import websockets
import urllib.request
import re
from datetime import datetime

async def cdp_evaluate(ws_url, expression):
    async with websockets.connect(ws_url) as ws:
        await ws.send(json.dumps({
            'id': 1, 'method': 'Runtime.evaluate',
            'params': {'expression': expression, 'returnByValue': True, 'awaitPromise': True}
        }))
        result = await ws.recv()
        return json.loads(result)

def parse_video_items(raw_text):
    """Parse video item text into structured data."""
    # Split by double newlines to get individual video blocks
    # Each video block typically has multiline text
    videos = []
    
    # Pattern: look for date patterns like "2026年XX月XX日"
    blocks = re.split(r'\n(?=置顶|\d{4}年)', raw_text)
    
    for block in blocks:
        if not block.strip():
            continue
        
        video = {}
        
        # Extract date
        date_match = re.search(r'(\d{4}年\d{2}月\d{2}日)', block)
        if date_match:
            date_str = date_match.group(1)
            video['date'] = date_str.replace('年', '-').replace('月', '-').replace('日', '')
        
        # Extract duration
        dur_match = re.search(r'(\d{2}:\d{2})', block)
        if dur_match:
            video['duration'] = dur_match.group(1)
        
        # Extract title - usually the line before tags or after duration
        title_match = re.search(r'\d{2}:\d{2}\n(.+?)(?:\n编辑作品|\n#|\n\d{4}年)', block)
        if not title_match:
            title_match = re.search(r'置顶\n(?:\d{2}:\d{2}\n)?(.+?)(?:\n编辑作品|\n#|\n\d{4}年)', block)
        if title_match:
            video['title'] = title_match.group(1).strip()
        
        # Extract hashtags
        tags = re.findall(r'#(\S+)', block)
        if tags:
            video['tags'] = tags
        
        # Extract metrics
        metrics_map = {
            '播放': 'plays',
            '平均播放时长': 'avg_watch_time',
            '封面点击率': 'ctr',
            '点赞': 'likes',
            '评论': 'comments',
            '分享': 'shares',
            '收藏': 'saves',
            '弹幕': 'danmaku'
        }
        
        for cn, en in metrics_map.items():
            m = re.search(rf'{cn}\n([\d.万]+)', block)
            if m:
                val = m.group(1)
                if '万' in val:
                    val = float(val.replace('万', '')) * 10000
                video[en] = float(val) if '.' in str(val) else int(val)
        
        # Extract publish status
        if '已发布' in block:
            video['status'] = 'published'
        
        # Extract is_pinned
        if block.startswith('置顶'):
            video['pinned'] = True
        
        if 'date' in video or 'title' in video:
            videos.append(video)
    
    return videos

async def main():
    # Get CDP targets
    resp = urllib.request.urlopen('http://127.0.0.1:9222/json/list')
    pages = json.loads(resp.read())
    target = pages[0]
    ws_url = target['webSocketDebuggerUrl']
    
    # Make sure we're on creator content page
    url_check = await cdp_evaluate(ws_url, 'window.location.href')
    result_val = url_check.get('result', {}).get('result', {}).get('value', '')
    
    if 'creator' not in result_val:
        print("Navigating to creator center...")
        async with websockets.connect(ws_url) as ws:
            await ws.send(json.dumps({
                'id': 1, 'method': 'Page.navigate',
                'params': {'url': 'https://creator.douyin.com/creator-micro/content/manage'}
            }))
            await ws.recv()
        await asyncio.sleep(5)
    
    # Scroll down to load more videos
    print("Scrolling to load more videos...")
    for i in range(5):
        await cdp_evaluate(ws_url, 'window.scrollTo(0, document.body.scrollHeight)')
        await asyncio.sleep(2)
    
    # Extract all video text
    print("Extracting video data...")
    raw = await cdp_evaluate(ws_url, '''
    (function() {
        var items = document.querySelectorAll('[class*="video"], [class*="work"], [class*="content-item"], [class*="list-item"]');
        var allText = [];
        items.forEach(function(item) {
            var t = item.innerText || item.textContent || '';
            if (t.length > 10) allText.push(t);
        });
        if (allText.length === 0) {
            return document.body.innerText.substring(0, 50000);
        }
        return allText.join('\\n---SEPARATOR---\\n');
    })()
    ''')
    
    raw_text = raw.get('result', {}).get('result', {}).get('value', '')
    print(f"Raw text length: {len(raw_text)}")
    
    # Parse videos
    videos = parse_video_items(raw_text)
    
    # Filter this week's videos (7/27 - 8/2)
    this_week_start = '2026-07-27'
    this_week_end = '2026-08-02'
    
    this_week_videos = []
    for v in videos:
        d = v.get('date', '')
        if d and this_week_start <= d <= this_week_end:
            this_week_videos.append(v)
    
    print(f"\n=== Weekly Report ===")
    print(f"Total videos parsed: {len(videos)}")
    print(f"This week ({this_week_start} to {this_week_end}): {len(this_week_videos)} videos")
    
    if this_week_videos:
        print("\n--- This week's videos ---")
        for v in this_week_videos:
            print(json.dumps(v, ensure_ascii=False, indent=2))
    else:
        print("\nNo videos published this week!")
        # Show recent videos for context
        print("\n--- Recent videos (last 10 parsed) ---")
        recent = sorted([v for v in videos if v.get('date')], key=lambda x: x.get('date', ''), reverse=True)[:10]
        for v in recent:
            print(json.dumps(v, ensure_ascii=False, indent=2))
    
    # Also try to get account stats
    print("\n=== Account Stats ===")
    # Navigate to main douyin page to check follower count
    async with websockets.connect(ws_url) as ws:
        await ws.send(json.dumps({
            'id': 2, 'method': 'Page.navigate',
            'params': {'url': 'https://www.douyin.com/user/self'}
        }))
        await ws.recv()
    await asyncio.sleep(4)
    
    profile = await cdp_evaluate(ws_url, '''
    (function() {
        var follower = document.querySelector('[data-e2e="follower-count"], .follower-count');
        var fans = document.querySelector('[class*="fans"], [class*="follower"]');
        return JSON.stringify({
            title: document.title,
            bodySample: document.body ? document.body.innerText.substring(0, 2000) : ''
        });
    })()
    ''')
    print(json.dumps(profile, ensure_ascii=False)[:2000])

asyncio.run(main())
