#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
抖音视频口播 → 逐字稿  (九思 · 确定性版 v2)

核心链路（实测稳定，绕开抖音反爬 + Chrome App-Bound Encryption）：
  1. Playwright 驱动【系统 Chrome】+ 独立 profile（已登录抖音）——
     不读加密 cookie，让 Chrome 自己处理鉴权。
  2. 主动调用 aweme detail 接口（page.evaluate fetch 第一方可信接口）→
     取 play_addr 完整直链（单个完整文件，非 206 分片流）。
  3. ctx.request.fetch(带 Referer) 直接下载完整 MP4（规避 CORS/安全SDK拦截）。
  4. 转写引擎（默认 SenseVoice，比 whisper 快 5 倍+，中文更准，自带标点）：
       - sensevoice : sherpa-onnx + SenseVoice int8（离线、轻量、快）
       - whisper    : faster-whisper small（旧引擎，fallback）

用法：
  python douyin_to_text.py <抖音视频URL或ID> [--out DIR] [--engine sensevoice|whisper] [--language zh]

依赖（sensevoice 引擎）：
  sherpa-onnx, av   （模型：models/sherpa-onnx-sense-voice-zh-en-ja-ko-yue-2024-07-17/）
依赖（whisper 引擎）：
  faster-whisper, torch(cpu)
一键重建环境：python setup.py
"""
import sys, os, re, asyncio, argparse, time
from pathlib import Path

CHROME = r"C:\Program Files\Google\Chrome\Application\chrome.exe"
REAL_USER_DATA = r"C:\Users\Admin\AppData\Local\Google\Chrome\User Data"

# 动态路径（基于脚本自身位置，抗目录改名）
SKILL_DIR = Path(__file__).resolve().parent.parent
USER_DATA = SKILL_DIR / "chrome-profile"
MODEL_DIR = SKILL_DIR / "models" / "sherpa-onnx-sense-voice-zh-en-ja-ko-yue-2024-07-17"

os.environ.setdefault("HF_HUB_DISABLE_XET", "1")

ANTI_THROTTLE = [
    "--no-sandbox",
    "--disable-blink-features=AutomationControlled",
    "--disable-background-timer-throttling",
    "--disable-backgrounding-occluded-windows",
    "--disable-renderer-backgrounding",
]


def ensure_profile(ud: Path):
    """Chrome 远程调试拒绝默认 User Data，必须用副本。不存在则从真实目录复制(继承登录态)。"""
    if ud.is_dir() and any(ud.iterdir()):
        return
    import shutil
    print(f"[*] 首次初始化专用 profile(复制登录态) → {ud}")
    shutil.copytree(REAL_USER_DATA, ud, ignore=shutil.ignore_patterns("*.tmp", "Cache", "cached_*.png"))
    print("[+] 复制完成，已继承抖音登录态")


def norm_url(arg: str) -> str:
    """归一化为标准视频 URL。支持纯数字 / 完整URL / v.douyin.com 短链。"""
    vid = extract_vid(arg)
    if vid:
        return f"https://www.douyin.com/video/{vid}"
    return arg.strip()


UA = ("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
      "(KHTML, like Gecko) Chrome/120.0 Safari/537.36")


def resolve_short_link(url: str) -> str:
    """解析 v.douyin.com 短链，返回重定向后的最终 URL。"""
    import urllib.request
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    with urllib.request.urlopen(req, timeout=15) as resp:
        return resp.geturl()


def extract_vid(arg: str):
    """从纯数字 / 完整URL / 短链 提取视频 ID；失败返回 None。"""
    arg = arg.strip()
    if arg.isdigit():
        return arg
    m = re.search(r"/video/(\d+)", arg)
    if m:
        return m.group(1)
    if "v.douyin.com" in arg:
        try:
            final = resolve_short_link(arg)
            m = re.search(r"/video/(\d+)", final)
            if m:
                return m.group(1)
        except Exception as e:
            print(f"[!] 短链解析失败({e})，稍后在浏览器中解析")
    return None


async def download_media(url: str, out: Path, user_data_dir: Path) -> Path:
    """下载完整 MP4，返回媒体文件路径。"""
    vid = url.rstrip("/").split("/")[-1].split("?")[0]
    media_path = out / f"{vid}.mp4"
    if media_path.exists() and media_path.stat().st_size > 5000:
        print(f"[*] 已存在媒体文件，跳过下载 → {media_path}")
        return media_path

    # 仅当确实需要下载时才导入 playwright（转写已有文件不依赖它）
    from playwright.async_api import async_playwright

    ensure_profile(user_data_dir)
    print(f"[*] 目标: {url}")
    async with async_playwright() as p:
        ctx = await p.chromium.launch_persistent_context(
            user_data_dir=str(user_data_dir), executable_path=CHROME,
            headless=False, args=ANTI_THROTTLE, viewport={"width": 1280, "height": 900},
        )
        page = await ctx.new_page()
        await page.goto(url, wait_until="domcontentloaded", timeout=60000)
        await asyncio.sleep(3)

        # 短链兜底：若 vid 非纯数字（urllib 解析被反爬拦了），从真实页面 URL 提取
        if not vid.isdigit():
            m = re.search(r"/video/(\d+)", page.url)
            if not m:
                print(f"[X] 无法从页面 URL 提取视频 ID: {page.url}")
                await ctx.close()
                return None
            vid = m.group(1)
            media_path = out / f"{vid}.mp4"

        print("[*] 调用 aweme detail 接口取直链...")
        js = """async (awemeId) => {
          try {
            const r = await fetch(`/aweme/v1/web/aweme/detail/?aweme_id=${awemeId}`, {credentials:'include'});
            const d = await r.json();
            const v = (d.aweme_detail || (d.data&&d.data[0]&&d.data[0].aweme_detail) || {}).video || {};
            const br = (v.bit_rate_audio||[]).map(b => (b.play_api&&b.play_api.url_list&&b.play_api.url_list[0]) || (b.url_list&&b.url_list[0]) || null).filter(Boolean);
            const play = (v.play_addr&&v.play_addr.url_list&&v.play_addr.url_list[0]) || null;
            return {br, play, status: r.status};
          } catch(e) { return {error: String(e)}; }
        }"""
        res = await page.evaluate(js, vid)
        audio_url = (res.get("br") or [None])[0] if isinstance(res, dict) else None
        video_url = res.get("play") if isinstance(res, dict) else None
        dl_url = audio_url or video_url
        if not dl_url:
            print(f"[X] 未取得直链: {res}")
            await ctx.close()
            return None
        print(f"[*] 直链类型: {'audio(独立音轨)' if audio_url else 'video(含音轨MP4)'}")

        print("[*] 下载完整音视频(带 Referer)...")
        resp = await ctx.request.fetch(dl_url, headers={"Referer": "https://www.douyin.com/"}, timeout=300000)
        data = await resp.body()
        if not data or len(data) < 5000:
            print(f"[X] 下载异常 status={resp.status} 大小={len(data) if data else 0}")
            await ctx.close()
            return None
        media_path.write_bytes(data)
        print(f"[+] 媒体大小: {len(data)/1024/1024:.1f} MB")
        await ctx.close()
    return media_path


def extract_audio_16k(path: Path):
    """PyAV 读媒体 → 重采样 16kHz 单声道 → float32 numpy (在 [-1,1])。返回 (sample_rate, samples)。"""
    import av
    import numpy as np
    container = av.open(str(path))
    stream = container.streams.audio[0]
    resampler = av.AudioResampler(format="s16", layout="mono", rate=16000)
    chunks = []
    for frame in container.decode(stream):
        for rf in resampler.resample(frame):
            arr = rf.to_ndarray()
            chunks.append(arr.reshape(-1))
    if not chunks:
        raise RuntimeError("未解析到音频流")
    pcm = np.concatenate(chunks).astype(np.float32) / 32768.0
    return 16000, pcm


def clean_tags(text: str) -> str:
    """去掉 SenseVoice 富文本标签 <|zh|><|NEUTRAL|> 等，并规整空白。"""
    text = re.sub(r"<\|[^|]*\|>", "", text)
    text = re.sub(r"\s+", "", text)
    return text.strip()


def transcribe_sensevoice(media_path: Path, language: str) -> str:
    import gc
    import sherpa_onnx

    model_path = MODEL_DIR / "model.int8.onnx"
    tokens_path = MODEL_DIR / "tokens.txt"
    vad_model = SKILL_DIR / "models" / "silero_vad.onnx"
    if not (model_path.exists() and tokens_path.exists()):
        raise FileNotFoundError(
            f"未找到 SenseVoice 模型，请先运行 `python setup.py` 下载。\n缺少: {MODEL_DIR}"
        )
    if not vad_model.exists():
        raise FileNotFoundError(f"未找到 VAD 模型 silero_vad.onnx，请先运行 `python setup.py` 下载。\n缺少: {vad_model}")

    # 线程数：实测 4→8 提速约 9%，16 会崩（onnxruntime 并行度到顶），cap 到 8
    num_threads = min(os.cpu_count() or 4, 8)

    print("[*] 加载 SenseVoice(sherpa-onnx, int8)...")
    t0 = time.time()
    recognizer = sherpa_onnx.OfflineRecognizer.from_sense_voice(
        model=str(model_path),
        tokens=str(tokens_path),
        num_threads=num_threads,
        use_itn=True,
        language=language,
        debug=False,
    )
    print(f"[*] 抽音频(16k 单声道)...")
    sr, samples = extract_audio_16k(media_path)
    print(f"[*] 音频 {len(samples)/sr:.1f}s，VAD 切段 + 逐段转写...")

    # VAD 分段（关键：SenseVoice 是短句模型，整段喂长音频会截断；逐段转写既快又准）
    cfg = sherpa_onnx.VadModelConfig()
    cfg.silero_vad.model = str(vad_model)
    cfg.silero_vad.threshold = 0.5
    cfg.silero_vad.min_silence_duration = 0.5
    cfg.silero_vad.min_speech_duration = 0.25
    cfg.silero_vad.max_speech_duration = 15  # 单段最长 15s
    cfg.sample_rate = sr
    vad = sherpa_onnx.VoiceActivityDetector(cfg, buffer_size_in_seconds=30)

    segs = []
    chunk = 1600  # 0.1s
    for i in range(0, len(samples), chunk):
        vad.accept_waveform(samples[i:i + chunk])
        while not vad.empty():
            s = vad.front.samples
            segs.append(s.copy())
            vad.pop()
    vad.flush()
    while not vad.empty():
        s = vad.front.samples
        segs.append(s.copy())
        vad.pop()

    parts = []
    for s in segs:
        st = recognizer.create_stream()
        st.accept_waveform(sr, s)
        recognizer.decode_stream(st)
        parts.append(clean_tags(st.result.text))

    n_segs = len(segs)
    # 释放资源，避免连续转写多个视频时内存累积
    del recognizer, vad, segs
    gc.collect()

    full = "".join(parts)
    dt = time.time() - t0
    print(f"[+] 转写完成，耗时 {dt:.1f}s（{n_segs} 段，速度 {len(samples)/sr/dt:.1f}x 实时）")
    return full


def transcribe_whisper(media_path: Path, model_size: str) -> str:
    from faster_whisper import WhisperModel

    print(f"[*] 加载 faster-whisper({model_size}, cpu int8)...")
    model = WhisperModel(model_size, device="cpu", compute_type="int8")
    segments, info = model.transcribe(
        str(media_path), beam_size=5, condition_on_previous_text=False, vad_filter=True,
    )
    print(f"[*] 语言: {info.language}  时长: {info.duration:.1f}s")
    texts = [seg.text.strip() for seg in segments if seg.text.strip()]
    return "\n".join(texts)


async def run(url: str, out_dir: str, engine: str, language: str, model_size: str, user_data_dir: Path):
    out = Path(out_dir)
    out.mkdir(parents=True, exist_ok=True)

    media_path = await download_media(url, out, user_data_dir)
    if media_path is None:
        return None

    vid = media_path.stem
    txt_path = out / f"{vid}.txt"

    if engine == "whisper":
        full = transcribe_whisper(media_path, model_size)
    else:
        full = transcribe_sensevoice(media_path, language)

    txt_path.write_text(full, encoding="utf-8")
    print(f"[+] 逐字稿 → {txt_path}  ({len(full)} 字)")
    return str(txt_path)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("url")
    ap.add_argument("--out", default=str(SKILL_DIR / "output"))
    ap.add_argument("--engine", default="sensevoice", choices=["sensevoice", "whisper"])
    ap.add_argument("--language", default="zh")
    ap.add_argument("--model", default="small")  # 仅 whisper 引擎用
    ap.add_argument("--user-data-dir", default=str(USER_DATA))
    args = ap.parse_args()
    url = norm_url(args.url)
    try:
        res = asyncio.run(run(url, args.out, args.engine, args.language, args.model, Path(args.user_data_dir)))
    except Exception as e:
        print(f"[X] 运行失败: {e}")
        sys.exit(1)
    if not res:
        sys.exit(2)


if __name__ == "__main__":
    main()
