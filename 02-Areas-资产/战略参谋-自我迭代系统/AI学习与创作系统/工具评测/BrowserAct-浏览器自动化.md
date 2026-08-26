---
created: 2026-07-23
source: "YouCore公众号 + GitHub browser-act/skills | 来源级别：🟡（首次）"
confidence: "✅已验证"
tags: [浏览器自动化, 反爬, Agent工具, 小红书]
---

# BrowserAct：给AI Agent装上真实浏览器的操控能力

> 开源 `browser-act/skills`。一句话安装：`npx skills add browser-act/skills --skill browser-act`

## 核心能力

- **隐身浏览器**：指纹伪装+TLS轮换+验证码自动解决
- **登录态复用**：直接操控你Chrome里已登录的页面（微信公众平台/小红书/知乎不用重新登录）
- **stealth-extract**：从反爬页面直接提取结构化内容，Token消耗降低95%
- **skill-forge**：观察一次操作流程→自动生成可复用Skill
- **多会话并发**：同时跑多个网站互不干扰

## 待解决场景

| 痛点 | 可解？ |
|:--|:--|
| 小红书IP风控 | ✅ 隐身浏览器+登录态 |
| 公众号需要token | ✅ 登录态复用 |
| 验证码拦截 | ✅ 云端自动解决 |

## 待试

等有空时装一下——这是目前最有希望解决小红书直抓问题的方案。装好后一句话：「用隐身浏览器打开小红书搜索XXX」
