#!/usr/bin/env python3
"""
听力70%对照卡生图脚本
方案A：Seedream 5.0 API（参考图+文字）
方案B：HTML+CSCover → Chrome截图（兜底）
"""
import base64, json, requests, subprocess, os, sys

REF_IMG = r"D:\写作工具\知识管理\01-Projects-项目\OPC指挥部\九思对外输出\06-设计源文件\形象资产-苏不倦\cartoon-final.png"
OUT_DIR = r"D:\写作工具\知识管理\01-Projects-项目\求职与作品集\03-作品集-英语开口练\产品商业化评估\第一期产品评估\听力70%对照卡"
os.makedirs(OUT_DIR, exist_ok=True)

# 读取参考图
with open(REF_IMG, "rb") as f:
    ref_b64 = base64.b64encode(f.read()).decode()
print(f"参考图 base64 长度: {len(ref_b64)}")

# ── 方案A：Seedream API ───────────────────────────────────────────────
API_KEY = os.environ.get("HERMES_TOKENRHYTHM_API_KEY", "")
# 从 config.yaml 读取
import yaml
with open(r"C:\Users\Admin\AppData\Local\hermes\config.yaml") as f:
    cfg = yaml.safe_load(f)
tr_key = cfg["providers"]["tokenrhythm"]["api_key"]
base_url = cfg["providers"]["tokenrhythm"]["base_url"]  # https://tokenrhythm.studio/v1

print(f"\n=== 方案A：尝试 Seedream ===")
print(f"base_url: {base_url}")

# Seedream 走 volcengine ark 的 images/generations，但 tokenrhythm 可能有自己的封装
# 先试标准 OpenAI images/generations 格式
prompt = """A clean educational illustration card, 3:4 vertical ratio. 
Top right: a cute cartoon man with brown short hair, round black glasses, blue hoodie, friendly smile (reference character provided).
Center: large clear Chinese text "听力70%对照卡" with a 📷 camera icon.
Below: three bullet points in clean modern Chinese typography:
  · 裸听1分钟，听懂七成以上 → 正合适
  · 只懂五到七成 → 降一级再听  
  · 五成以下 → 别再磨了，再降两级
Bottom: a descent ladder graphic showing "BBC新闻 → 慢速新闻 → 日常对话播客 → 儿童动画" with arrows, label "落地阶梯就一条".
Style: flat minimalist illustration, soft gradient background (light blue to white), clean typography, no clutter, professional education app aesthetic."""

headers = {
    "Authorization": f"Bearer {tr_key}",
    "Content-Type": "application/json"
}

# Seedream 5.0 on tokenrhythm - try both endpoints
payloads = [
    # 方式1：images/generations（标准OpenAI兼容）
    {
        "model": "seed-2.1-pro",
        "prompt": prompt,
        "image": f"data:image/png;base64,{ref_b64}",
        "response_format": "b64_json",
        "size": "2048x2732"
    },
    # 方式2：chat/completions（Seedream 5.0 Pro有时走这个）
    {
        "model": "seed-2.1-pro",
        "messages": [{"role": "user", "content": [{"type": "image_url", "image_url": {"url": f"data:image/png;base64,{ref_b64}"}}, {"type": "text", "text": prompt}]}],
        "response_format": {"type": "json_object"}
    }
]

success = False
for i, payload in enumerate(payloads):
    print(f"\n尝试方式{i+1}: {list(payload.keys())}")
    try:
        resp = requests.post(f"{base_url}/images/generations", headers=headers, json=payload, timeout=120)
        print(f"  status: {resp.status_code}")
        if resp.status_code == 200:
            data = resp.json()
            img_b64 = data["data"][0]["b64_json"]
            out_path = os.path.join(OUT_DIR, "听力70%对照卡_seedream.png")
            with open(out_path, "wb") as f:
                f.write(base64.b64decode(img_b64))
            print(f"  ✅ 保存成功: {out_path}")
            success = True
            break
        else:
            print(f"  ❌ {resp.text[:200]}")
    except Exception as e:
        print(f"  ❌ 异常: {e}")

if not success:
    # ── 方案B：HTML + Chrome headless 截图 ─────────────────────────
    print("\n=== 方案B：HTML+CSCover截图 ===")
    
    html_content = f"""<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>听力70%对照卡</title>
<style>
  * {{ margin: 0; padding: 0; box-sizing: border-box; }}
  body {{
    width: 810px;
    height: 1080px;
    background: linear-gradient(160deg, #1a1a2e 0%, #16213e 40%, #0f3460 100%);
    font-family: "PingFang SC", "Microsoft YaHei", "Helvetica Neue", sans-serif;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 40px 30px;
    position: relative;
    overflow: hidden;
  }}
  /* 装饰圆圈 */
  body::before {{
    content: "";
    position: absolute;
    top: -100px; right: -100px;
    width: 400px; height: 400px;
    background: radial-gradient(circle, rgba(0,212,255,0.12) 0%, transparent 70%);
    border-radius: 50%;
  }}
  body::after {{
    content: "";
    position: absolute;
    bottom: -80px; left: -80px;
    width: 300px; height: 300px;
    background: radial-gradient(circle, rgba(255,107,53,0.10) 0%, transparent 70%);
    border-radius: 50%;
  }}
  .card {{
    background: rgba(255,255,255,0.06);
    backdrop-filter: blur(12px);
    border: 1px solid rgba(255,255,255,0.12);
    border-radius: 24px;
    padding: 40px 36px;
    width: 100%;
    max-width: 750px;
    position: relative;
    z-index: 1;
  }}
  /* 标题区 */
  .header {{
    text-align: center;
    margin-bottom: 32px;
  }}
  .header .icon {{
    font-size: 42px;
    margin-bottom: 8px;
  }}
  .header h1 {{
    font-size: 40px;
    font-weight: 700;
    color: #ffffff;
    letter-spacing: 2px;
  }}
  .header h1 span {{
    color: #00d4ff;
  }}
  /* 三条规则 */
  .rules {{
    display: flex;
    flex-direction: column;
    gap: 16px;
    margin-bottom: 32px;
  }}
  .rule {{
    display: flex;
    align-items: center;
    gap: 14px;
    background: rgba(255,255,255,0.05);
    border-radius: 14px;
    padding: 16px 20px;
    border-left: 4px solid;
  }}
  .rule.good {{ border-left-color: #00e676; }}
  .rule.warn {{ border-left-color: #ffb347; }}
  .rule.bad  {{ border-left-color: #ff5252; }}
  .rule .num {{
    width: 32px; height: 32px;
    border-radius: 50%;
    display: flex; align-items: center; justify-content: center;
    font-size: 14px; font-weight: 700; color: #fff;
    flex-shrink: 0;
  }}
  .rule.good .num {{ background: #00e676; color: #1a1a2e; }}
  .rule.warn .num {{ background: #ffb347; color: #1a1a2e; }}
  .rule.bad  .num {{ background: #ff5252; }}
  .rule .text {{
    font-size: 18px;
    color: rgba(255,255,255,0.92);
    line-height: 1.5;
  }}
  .rule .text strong {{
    color: #ffffff;
    font-weight: 600;
  }}
  /* 阶梯区 */
  .ladder {{
    background: rgba(0,212,255,0.08);
    border: 1px solid rgba(0,212,255,0.25);
    border-radius: 16px;
    padding: 20px 24px;
  }}
  .ladder .label {{
    font-size: 13px;
    color: rgba(255,255,255,0.5);
    text-transform: uppercase;
    letter-spacing: 2px;
    margin-bottom: 12px;
    text-align: center;
  }}
  .ladder .steps {{
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    flex-wrap: nowrap;
  }}
  .ladder .step {{
    background: rgba(255,255,255,0.1);
    border: 1px solid rgba(255,255,255,0.15);
    border-radius: 10px;
    padding: 10px 14px;
    font-size: 15px;
    color: rgba(255,255,255,0.9);
    white-space: nowrap;
    font-weight: 500;
  }}
  .ladder .arrow {{
    color: #00d4ff;
    font-size: 18px;
    flex-shrink: 0;
  }}
  /* 底部标签 */
  .footer {{
    text-align: center;
    margin-top: 24px;
    font-size: 12px;
    color: rgba(255,255,255,0.3);
    letter-spacing: 1px;
  }}
  /* 卡通形象占位（实际渲染时嵌入参考图） */
  .character {{
    position: absolute;
    top: 20px;
    right: 20px;
    width: 120px;
    height: 120px;
    border-radius: 50%;
    overflow: hidden;
    border: 3px solid rgba(255,255,255,0.2);
    z-index: 2;
  }}
  .character img {{
    width: 100%;
    height: 100%;
    object-fit: cover;
  }}
</style>
</head>
<body>
  <!-- 苏不倦卡通形象 -->
  <div class="character">
    <img src="file:///{REF_IMG.replace(chr(92), '/')}" alt="苏不倦">
  </div>

  <div class="card">
    <div class="header">
      <div class="icon">📷</div>
      <h1>听力<span>70%</span>对照卡</h1>
    </div>

    <div class="rules">
      <div class="rule good">
        <div class="num">1</div>
        <div class="text"><strong>裸听1分钟，听懂七成以上</strong> → 正合适</div>
      </div>
      <div class="rule warn">
        <div class="num">2</div>
        <div class="text"><strong>只懂五到七成</strong> → 降一级再听</div>
      </div>
      <div class="rule bad">
        <div class="num">3</div>
        <div class="text"><strong>五成以下</strong> → 别再磨了，再降两级</div>
      </div>
    </div>

    <div class="ladder">
      <div class="label">落地阶梯就一条</div>
      <div class="steps">
        <div class="step">BBC新闻</div>
        <div class="arrow">→</div>
        <div class="step">慢速新闻</div>
        <div class="arrow">→</div>
        <div class="step">日常对话播客</div>
        <div class="arrow">→</div>
        <div class="step">儿童动画</div>
      </div>
    </div>
  </div>

  <div class="footer">苏不倦 · 英语学习干货</div>
</body>
</html>"""

    html_path = os.path.join(OUT_DIR, "听力70%对照卡.html")
    with open(html_path, "w", encoding="utf-8") as f:
        f.write(html_content)
    print(f"HTML 已写入: {html_path}")

    # Chrome headless 截图
    chrome_path = r"C:\Program Files\Google\Chrome\Application\chrome.exe"
    screenshot_path = os.path.join(OUT_DIR, "听力70%对照卡.png")

    cmd = [
        chrome_path,
        f"--headless=new",
        "--disable-gpu",
        "--no-sandbox",
        f"--window-size=810,1080",
        f"--screenshot={screenshot_path}",
        f"--virtual-time-budget=5000",
        f"file:///{html_path.replace(chr(92), '/')}",
    ]
    print(f"执行: {' '.join(cmd[:5])} ...")
    result = subprocess.run(cmd, capture_output=True, timeout=30)
    if result.returncode == 0 and os.path.exists(screenshot_path):
        print(f"✅ 截图成功: {screenshot_path}")
    else:
        print(f"❌ 截图失败: {result.stderr.decode()[:200] if result.stderr else 'unknown'}")
        # 尝试用 playwright
        try:
            from playwright.sync_api import sync_playwright
            with sync_playwright() as p:
                browser = p.chromium.launch(headless=True)
                page = browser.new_page(viewport={"width": 810, "height": 1080})
                page.goto(f"file:///{html_path.replace(chr(92), '/')}")
                page.wait_for_timeout(2000)
                page.screenshot(path=screenshot_path, full_page=True)
                browser.close()
                print(f"✅ Playwright 截图成功: {screenshot_path}")
        except Exception as e2:
            print(f"❌ Playwright 也失败: {e2}")
            print(f"\n兜底：请手动打开 {html_path} 截图")

print("\n=== 完成 ===")
