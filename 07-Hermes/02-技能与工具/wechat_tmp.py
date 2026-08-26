# -*- coding: utf-8 -*-
"""微信文章提取：滚动加载"""
import asyncio
from playwright.async_api import async_playwright

URL = "https://mp.weixin.qq.com/s/jFNU7aw6PBJnbemJq2JjLg"
CHROME = r"C:\Program Files\Google\Chrome\Application\chrome.exe"

async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch(executable_path=CHROME, headless=True, args=["--no-sandbox"])
        page = await browser.new_page(viewport={"width": 1280, "height": 800})
        await page.goto(URL, timeout=60000, wait_until="domcontentloaded")
        for _ in range(15):
            await page.mouse.wheel(0, 1500)
            await page.wait_for_timeout(500)
        await page.wait_for_timeout(1500)
        content = await page.evaluate("""() => {
            const el = document.querySelector('#js_content') || document.querySelector('.rich_media_content');
            return el ? el.innerText.slice(0, 6000) : 'NO_CONTENT';
        }""")
        title = await page.title()
        print("=== 标题 ===")
        print(title)
        print("\n=== 正文 ===")
        print(content[:5000])
        await browser.close()

asyncio.run(main())
