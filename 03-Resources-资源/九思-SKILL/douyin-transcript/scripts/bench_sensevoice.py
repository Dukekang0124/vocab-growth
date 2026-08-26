#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""基准测试：SenseVoice(VAD分段) 转写 3 个已有 MP4 的速度 vs 字数。
用法：python bench_sensevoice.py
"""
import sys, time, faulthandler
from pathlib import Path

faulthandler.enable()
sys.path.insert(0, str(Path(__file__).resolve().parent))
from douyin_to_text import transcribe_sensevoice

AUDIO = Path(r"D:\写作工具\知识管理\08-九思搭档知识库\02-知识库\自媒体学习库\audio")
VIDS = [
    ("7676456624885665059", "边学边卖", 430.2),
    ("7676127273287683328", "用AI别外包", 452.4),
    ("7675749702352129321", "走窄门", 523.4),
]

total = 0.0
for vid, name, dur in VIDS:
    mp4 = AUDIO / f"{vid}.mp4"
    if not mp4.exists():
        print(f"[跳过] 缺 {mp4}", flush=True)
        continue
    t0 = time.time()
    text = transcribe_sensevoice(mp4, "zh")
    dt = time.time() - t0
    total += dt
    print(f"===== [{name}] {vid} =====", flush=True)
    print(f"音频 {dur}s → 总耗时 {dt:.1f}s（{dur/dt:.0f}x 实时）  字数 {len(text)}", flush=True)

print(f"\n===== 3 视频合计 {total:.1f}s =====", flush=True)
print("[对比] faster-whisper small：约 120-150s/个（3.5x），3 个合计 6-7 分钟", flush=True)
