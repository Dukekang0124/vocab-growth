---
name: douyin-data-extract
description: 抖音账号数据抓取。用 CDP(Chrome DevTools Protocol) 驱动本机已登录抖音的 Chrome，自动抓创作者中心完整数据（播放/封面点击率CTR/赞/评/藏/享/粉丝）和单条视频（正文+评论+作品列表+推荐区对标）。专治"抖音数据要手动进后台一个个看"的问题。当用户要查/分析自己或他人抖音账号数据、做作品复盘时使用。
source: 07-Hermes/scripts（cdp_extract.py + weekly_extract.py）
installed: 2026-08-23
---

# 抖音账号数据抓取 (douyin-data-extract)

> 与 douyin-transcript 互补：transcript 抓「口播说了什么」，本 skill 抓「数据表现」。

## 何时用
- 抓苏不倦自己账号数据（播放/CTR/赞评藏享/粉丝），做作品分析
- 抓单条视频的正文、评论区、作品列表
- 打「自动抓数据 → 九思四层拆解 → 写作品分析报告」闭环

## 核心原理
- **CDP = Chrome DevTools Protocol**：复用本机已登录抖音的 Chrome（`hermes-chrome-profile`），通过调试端口 9222 发指令。
- 本质 = 「手动打开创作者中心看数据」的自动化版，脚本代劳了点击/滚动/提取。
- 脚本来源：`07-Hermes/scripts/cdp_extract.py` + `weekly_extract.py`（Hermes/九思 成熟方案，**2026-08-23 已实战跑通**，登录态有效）。

## 脚本清单

> ⚠️ **Admin 环境实际在用的脚本在 `作品分析/` 目录**（已适配，2026-08-24 实测跑通）；`07-Hermes/scripts/` 是原始版（硬编码 `C:/Users/11/` + `ensure_cdp` 会 taskkill 杀光 Chrome），**别直接用**。

| 脚本 | 位置 | 抓什么 | 状态 |
|:--|:--|:--|:--|
| `_check_new.py` | `06-自媒体规划/04-数据与复盘/作品分析/` | 粉丝数 + 最新作品列表（快查，~30秒）| ✅ 实测 6743 |
| `_crawl_full.py` | 同上 | 全量单条指标：播放/赞/评/藏/享/吸粉/完播/2秒跳出 → `_alldata.csv` | ✅ 实测 109 条 |
| `cdp_extract.py` | `07-Hermes/scripts/` | 单条视频（原始版，需适配 Admin）| ⚠️ 硬编码 C:/Users/11/ |
| `weekly_extract.py` | `07-Hermes/scripts/` | 创作者中心（原始版，需适配 Admin）| ⚠️ 硬编码 C:/Users/11/ |

## 前置依赖
- Python 3.10 + `pip install websockets` ✅
- 本机 Chrome（`C:/Program Files/Google/Chrome/Application/chrome.exe`）✅
- 本机 Chrome 已登录抖音（适配脚本只连 9222 端口，不依赖具体 profile 路径）✅

## 用法（Admin 环境，走适配脚本）
```bash
# 前提：Chrome 已带 9222 调试端口常驻（登录抖音），否则先手动启动一次

# ① 快查：粉丝数 + 最新作品（复盘的"发现新作品"这步）
python "_check_new.py"

# ② 全量抓单条指标（复盘的"拉数据"这步 → _alldata.csv）
python "_crawl_full.py"
```
> 在 `作品分析/` 目录下执行。两脚本只「连接已开的 Chrome(9222)」，不启动 Chrome、不 taskkill，安全。

## 踩坑（必看）
1. **`ensure_cdp` 会 taskkill 杀所有 Chrome** → 跑前确认没有要紧浏览器窗口（或用独立 profile）。
2. **`weekly_extract.py` 日期硬编码**（"本周"过滤写死）→ 不影响主数据，`body.innerText` 兜底能拿全量作品列表。
3. **Chrome 启动写系统文件触发 sandbox 拦截报错** → 但脚本主体已正常产出，报错可忽略。
4. **DOM 选择器在新版创作者中心会漏/重复**（`[class*="video"]`）→ `body.innerText` 兜底可靠，直接看 Account Stats 段的 `bodySample`。

## 输出后处理
- 播放/CTR → 补进 `06-自媒体规划/04-数据与复盘/作品分析/` 各报告的数据快照
- 完播率/2秒跳出 → 需进创作者中心单条「视频数据」详情（脚本待补抓详情页）
- 推荐区对标内容 → 喂 `social-account-doctor` 拆解
- 抓到的新数据 → 同步更新 `作品分析/00-作品分析索引.md` 的账号基准