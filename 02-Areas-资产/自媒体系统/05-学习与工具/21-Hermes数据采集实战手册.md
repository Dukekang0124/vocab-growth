# 21-Hermes数据采集实战手册

> 九思 2026-08-23 · 实战跑通后沉淀
> 配套：[17-数据采集分层方案](17-数据采集分层方案.md)（战略层），本手册是操作层

---

## 一、这是什么

Hermes 自研的 CDP（Chrome DevTools Protocol）抓取脚本，复用已登录抖音的 Chrome，自动抓创作者中心 + 单条视频数据。**已验证跑通，登录态有效。**

## 二、脚本清单（`07-Hermes/scripts/`）

| 脚本 | 作用 | 状态 |
|:--|:--|:--|
| `cdp_extract.py` | 抓单条视频（数据+评论+账号+作品列表+推荐区） | ✅ 跑通 |
| `weekly_extract.py` | 抓创作者中心（播放/CTR/赞评藏享/粉丝） | ✅ 跑通 |
| `weekly_comments.py` | 抓评论页 | 未实测 |
| `weekly_report_cdp.py` | 周报编排 | 未实测 |

## 三、前置条件

- Python 3.10 + `pip install websockets`（已装 ✅）
- Chrome 已装（`C:/Program Files/Google/Chrome/Application/chrome.exe` ✅）
- `C:/Users/11/hermes-chrome-profile` 已登录抖音（现成，登录态有效 ✅）

## 四、怎么跑

```bash
# 抓单条视频
python "D:\写作工具\知识管理\07-Hermes\scripts\cdp_extract.py" "https://www.douyin.com/video/<视频ID>"

# 抓创作者中心（需先跑一次 cdp_extract 让 Chrome 带着调试端口 9222 启动）
python "D:\写作工具\知识管理\07-Hermes\scripts\weekly_extract.py"
```

## 五、能抓到什么（实测）

- **单条视频**：标题/数据/评论区全文/账号粉丝/完整作品列表/推荐区对标内容
- **创作者中心**：播放量、封面点击率 CTR、赞/评/藏/享/弹幕、作品列表、账号粉丝、简介

## 六、踩坑记录

1. **taskkill 会杀所有 Chrome**：跑前确认没有要紧的 Chrome 窗口（或在独立 profile 下跑）
2. **日期硬编码**：`weekly_extract.py` 的"本周"过滤写死日期；不影响主数据（body.innerText 兜底能拿全量作品列表）
3. **sandbox 误报**：Chrome 启动写系统文件会触发 sandbox 拦截报错，但脚本主体已正常产出
4. **DOM 选择器偏差**：新版创作者中心 DOM 变了，`parse_video_items` 会重复/漏项，但 `body.innerText` 兜底能拿全量

## 七、与作品分析联动

- 跑 `weekly_extract.py` → 拿到播放量 → 补进 `04-数据与复盘/作品分析/` 各报告
- 完播率/2秒跳出需进创作者中心单条「视频数据」详情，脚本待补抓详情页
- 数据分析闭环：Hermes 脚本抓数据 → 九思四层拆解 → 写作品分析报告