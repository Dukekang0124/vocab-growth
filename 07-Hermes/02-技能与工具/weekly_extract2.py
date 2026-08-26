"""Precise Douyin video extraction — deduplicate and get exact metrics."""
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

def deduplicate_videos(videos):
    """Deduplicate by plays + title similarity."""
    seen = {}
    result = []
    for v in videos:
        key = f"{v.get('plays', 0)}_{v.get('date', '')}"
        title = v.get('title', '')
        if key not in seen or (title and len(title) > len(seen[key].get('title', ''))):
            if key in seen:
                # Merge: keep the one with more fields
                existing = seen[key]
                for k, val in v.items():
                    if val and not existing.get(k):
                        existing[k] = val
            else:
                seen[key] = v
                result.append(v)
    return result

async def main():
    resp = urllib.request.urlopen('http://127.0.0.1:9222/json/list')
    pages = json.loads(resp.read())
    ws_url = pages[0]['webSocketDebuggerUrl']
    
    # Go to creator center
    async with websockets.connect(ws_url) as ws:
        await ws.send(json.dumps({
            'id': 1, 'method': 'Page.navigate',
            'params': {'url': 'https://creator.douyin.com/creator-micro/content/manage'}
        }))
        await ws.recv()
    await asyncio.sleep(5)
    
    # Get all video items with more structured approach
    # Use a more targeted selector
    raw = await cdp_evaluate(ws_url, '''
    (function() {
        var results = [];
        // Try to find the table rows / list items with data
        var rows = document.querySelectorAll('tr, [class*="row"], [class*="item"], [class*="card"]');
        rows.forEach(function(row) {
            var text = row.innerText || row.textContent || '';
            if (text.includes('2026年') && text.includes('已发布')) {
                results.push(text);
            }
        });
        
        // If nothing found, try broader approach
        if (results.length === 0) {
            var allElements = document.querySelectorAll('*');
            var tempTexts = [];
            allElements.forEach(function(el) {
                var t = el.innerText || '';
                if (t.includes('2026年') && t.includes('已发布') && t.includes('播放')) {
                    tempTexts.push(t);
                }
            });
            // Deduplicate by length
            var seen = {};
            tempTexts.forEach(function(t) {
                seen[t.length] = t;
            });
            results = Object.values(seen);
        }
        
        return JSON.stringify(results.slice(0, 30));
    })()
    ''')
    
    raw_text = raw.get('result', {}).get('result', {}).get('value', '')
    print(f"Got {len(raw_text)} chars of raw data")
    
    # Parse
    try:
        items = json.loads(raw_text)
        print(f"Found {len(items)} unique items")
        
        all_videos = []
        for item in items:
            videos_in_item = parse_videos(item)
            all_videos.extend(videos_in_item)
        
        all_videos = deduplicate_videos(all_videos)
        
        # Sort by date
        all_videos.sort(key=lambda x: x.get('date', ''), reverse=True)
        
        this_week = [v for v in all_videos if '2026-07-27' <= v.get('date', '') <= '2026-08-02']
        
        print(f"\nTotal unique videos: {len(all_videos)}")
        print(f"This week (7/27-8/2): {len(this_week)}")
        print()
        
        for v in this_week:
            print(f"--- {v.get('date')} | 播放:{v.get('plays', '?')} | 赞:{v.get('likes', '?')} | 评:{v.get('comments', '?')} | 收:{v.get('saves', '?')} | 分:{v.get('shares', '?')} ---")
            print(f"  标题: {v.get('title', '无标题')[:80]}")
            if v.get('tags'):
                print(f"  标签: {', '.join(v['tags'])}")
            if v.get('duration'):
                print(f"  时长: {v['duration']} | 均播:{v.get('avg_watch_time', '?')}秒 | CTR:{v.get('ctr', '?')}%")
            print()
        
        # Also show recent non-this-week for context
        recent_other = [v for v in all_videos if v.get('date', '') < '2026-07-27'][:3]
        if recent_other:
            print("=== 上周最后3条 ===")
            for v in recent_other:
                print(f"  {v.get('date')} | 播放:{v.get('plays', '?')} | {v.get('title', '')[:60]}")
        
    except json.JSONDecodeError as e:
        print(f"JSON parse error: {e}")
        print(f"Raw (first 2000): {raw_text[:2000]}")

def parse_videos(text):
    """Parse one text block into video objects."""
    videos = []
    # Split by date markers
    blocks = re.split(r'\n(?=\d{4}年\d{2}月\d{2}日)', text)
    
    for block in blocks:
        v = {}
        date_m = re.search(r'(\d{4})年(\d{2})月(\d{2})日', block)
        if date_m:
            v['date'] = f"{date_m.group(1)}-{date_m.group(2)}-{date_m.group(3)}"
        
        dur_m = re.search(r'(\d{2}:\d{2})', block)
        if dur_m:
            v['duration'] = dur_m.group(1)
        
        # Title: after duration, before 编辑作品 or hashtag section
        title_m = re.search(r'\d{2}:\d{2}\n(.+?)(?:\n编辑作品|\n设置权限|\n\d{4}年)', block, re.DOTALL)
        if title_m:
            title = title_m.group(1).strip()
            # Remove hashtags from title if they're separate
            v['title'] = title
        
        # Tags
        v['tags'] = re.findall(r'#(\S+)', block)
        
        # Metrics
        metrics = {
            '播放': ('plays', int), '平均播放时长': ('avg_watch_time', int),
            '封面点击率': ('ctr', float), '点赞': ('likes', int),
            '评论': ('comments', int), '分享': ('shares', int),
            '收藏': ('saves', int), '弹幕': ('danmaku', int)
        }
        for cn, (en, typ) in metrics.items():
            m = re.search(rf'{cn}\n([\d.万]+)', block)
            if m:
                val = m.group(1)
                try:
                    if '万' in val:
                        v[en] = int(float(val.replace('万', '')) * 10000)
                    else:
                        v[en] = typ(val)
                except ValueError:
                    pass
        
        if '已发布' in block:
            v['status'] = 'published'
        if '置顶' in block.split('\n')[0]:
            v['pinned'] = True
        
        if v.get('date') and v.get('status'):
            videos.append(v)
    
    return videos

asyncio.run(main())
