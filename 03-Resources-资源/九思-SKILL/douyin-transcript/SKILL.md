---
name: douyin-transcript
description: 抖音视频口播→逐字稿。用 Playwright 驱动本机已登录的系统 Chrome，拦截 aweme 接口拿到完整视频直链，再用 SenseVoice(sherpa-onnx) + VAD 分段本地转写。专治"抖音反爬+App-Bound加密读不出cookie"导致口播全文抓不到的问题。当用户给出抖音视频链接/ID、要提取口播文案或做内容拆解时使用。
---

# 抖音口播→逐字稿 (douyin-transcript)

## 何时用
- 用户丢来一个抖音视频链接/短链/ID，要"口播全文""逐字稿""文案提取""内容拆解"。
- 注意：直接 WebFetch / yt-dlp 读 cookie 都会失败（抖音反爬 + Chrome App-Bound Encryption 锁死 cookie 文件）。本 skill 绕过它。

## 核心原理（为什么能成 · 确定性 v2）
**不读加密的 cookie 文件，而是启动本机已经登录抖音的真实 Chrome，让 Chrome 自己处理鉴权**，再用 Playwright 拦截抖音第一方接口 `aweme/v1/web/aweme/detail/` 拿到**完整视频直链**，`ctx.request.fetch` 带 `Referer` 下完整 MP4，最后用 **SenseVoice + VAD 分段**本地转写。

- 这是从合作伙伴 Hermes/九思 的成熟方案学来的（07-Hermes/记忆归档/迁移条目-2026-08-16.md + cdp_extract.py）。阿Q/九思 复用并固化为确定性流程。
- **下载关键**：抖音音频实际走 `douyinvod.com` 206 分片流式传输，监听 response body 拼接极不稳定。改为主动调 aweme detail 取 `play_addr` 完整直链 + Referer 下载整段 MP4（必带 `Referer: https://www.douyin.com/`，否则只回 351 字节）。
- **转写关键（v2 升级）**：换 faster-whisper 为 **SenseVoice(sherpa-onnx int8) + VAD 分段**。SenseVoice 是短句模型，整段喂长音频会截断/漏识别，必须先用 silero-vad 切段（单段 ≤15s）再逐段转写。实测 36x 实时，比 whisper(3.5x) 快 10 倍，中文更准、自带标点。

## 前置依赖（一次性，用 setup.py 一键重建）
隔离 venv + 轻量依赖（**无需 torch 全家桶**）：
- `pip install sherpa-onnx av numpy`（几十 MB）
- 模型（放 `models/`，D 盘，全离线）：
  - SenseVoice int8：`models/sherpa-onnx-sense-voice-zh-en-ja-ko-yue-2024-07-17/model.int8.onnx`(229MB) + `tokens.txt`
  - VAD：`models/silero_vad.onnx`(2.2MB)
- 下载源用**阿里 ModelScope**（GitHub 被墙，ModelScope 国内 60MB/s）：
  - `modelscope.cn/models/poloniumrock/SenseVoiceSmallOnnx` → model.int8.onnx / tokens.txt
  - `modelscope.cn/models/gomodels/sherpa` → vad/silero_vad.onnx
- **环境丢了？一条命令恢复**：`python setup.py`（自动建 venv + 装依赖 + 下模型）

## 用法
```
python scripts/douyin_to_text.py <抖音视频URL或ID> [--out DIR] [--engine sensevoice|whisper] [--language zh]
```
- **输入支持三种**：纯数字视频 ID / 完整视频 URL（`www.douyin.com/video/{id}`）/ **分享短链**（`v.douyin.com/xxx`，自动解析 302 重定向提取 vid，实测可用）。
- 默认引擎 `sensevoice`（推荐）。`whisper` 为旧引擎 fallback（需装 faster-whisper+torch）。
- 输出：`<out>/<视频ID>.mp4`（完整视频）+ `<out>/<视频ID>.txt`（逐字稿）。
- 若 `<out>/<视频ID>.mp4` 已存在，自动跳过下载直接转写（此时不加载 playwright，纯离线转写）。

## 关键步骤（脚本已固化）
1. `ensure_profile()`：`chrome-profile/` 副本不存在则从本机 Chrome User Data 复制（继承登录态 + non-default 目录满足远程调试）。
2. `launch_persistent_context(user_data_dir=副本, executable_path=系统Chrome, headless=False, args=anti-throttle)`。
3. `page.goto(video_url)` → sleep(3) → `page.evaluate` 调 `fetch('/aweme/v1/web/aweme/detail/?aweme_id=...', {credentials:'include'})` 取 `play_addr.url_list[0]`（多数视频 `bit_rate_audio` 为空，直接用 play_addr）。
4. `ctx.request.fetch(dl_url, headers={"Referer":"https://www.douyin.com/"}, timeout=300000)` 下完整 MP4。
5. SenseVoice 转写：PyAV 抽 16k 单声道 → silero-vad 切段（threshold 0.5 / min_silence 0.5s / min_speech 0.25s / max_speech 15s）→ 逐段 `OfflineRecognizer.from_sense_voice`(int8, num_threads=8, use_itn=True) decode → 拼接。
6. 写出 `<out>/<vid>.txt`（带标点），再人工校对存 `<vid>.proofread.txt`。

## 踩坑清单（必看）
- **Chrome 必须关掉再跑**（同 User Data 单进程）；脚本用副本目录，和日常 Chrome 互不干扰。
- `user_data_dir` 是 `launch_persistent_context` 的参数，不是 `launch` 的。
- **下载必须带 Referer** `https://www.douyin.com/`，否则只下 351 字节。
- **别用 response 分片拼接**（douyinvod 206 分片缓冲随机，易半截）→ 用 aweme detail 取 play_addr 完整直链。
- **SenseVoice 必须 VAD 分段**：整段喂 8 分钟音频会截断（实测 993 字 vs 正确 2858 字）。逐段转写既快(36x)又完整。
- **num_threads 用 8**（4→8 提速 9%，16 会崩）。
- **GitHub 下载模型会失败**（Connection reset）→ 用 ModelScope 国内源（setup.py 已配好）。
- **print 要加 flush**：转写脚本重定向到管道时 stdout 块缓冲，进程若 native 崩溃，无 flush 的日志会全丢（排查坑）。
- **转写后人工校对专有名词**：SenseVoice 已大幅减少同音字错误，但人名人号/工具名（Codex/Claude Code/WorkBuddy/Hermes 等）仍可能错，需人工校对。

## 性能（实测，CPU 16 核）
| 引擎 | 转 8 分钟音频 | 实时速度 | 依赖 |
|---|---|---|---|
| faster-whisper small | ~150s | 3.5x | torch(200MB+) |
| **SenseVoice int8 + VAD** | **~15s** | **36x** | sherpa-onnx+av+numpy(几十MB) |
- 3 个姜胡说视频（430/452/523s）合计 38.7s，比 whisper 快约 10 倍，模型加载 0.8s（whisper 十几秒）。

## 输出后处理
拿到 .txt 后，按目标做：
- 内容拆解 → 提炼核心论点/结构/金句 → 沉淀进 `02-知识库/` 对应主题库。
- 追更竞品 → 提取选题/结构 → 进 `01-Projects-项目/OPC指挥部/自媒体系统/选题系统`。
- 校对稿（.proofread.txt）可直接作为「附录·口播逐字稿」嵌回视频笔记，优先级高于公开转述。
