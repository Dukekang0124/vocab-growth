#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""测试 VAD 分段 + SenseVoice 逐段转写（验证长音频不截断）。
用法：python test_vad.py
"""
import sys, time, faulthandler
from pathlib import Path

faulthandler.enable()
sys.path.insert(0, str(Path(__file__).resolve().parent))
from douyin_to_text import extract_audio_16k, clean_tags, MODEL_DIR
import sherpa_onnx

VAD_MODEL = MODEL_DIR.parent / "silero_vad.onnx"
mp4 = Path(r"D:\写作工具\知识管理\08-九思搭档知识库\02-知识库\自媒体学习库\audio\7675749702352129321.mp4")

sr, samples = extract_audio_16k(mp4)
print(f"音频 {len(samples)/sr:.1f}s", flush=True)

# --- VAD 分段 ---
cfg = sherpa_onnx.VadModelConfig()
cfg.silero_vad.model = str(VAD_MODEL)
cfg.silero_vad.threshold = 0.5
cfg.silero_vad.min_silence_duration = 0.5
cfg.silero_vad.min_speech_duration = 0.25
cfg.silero_vad.max_speech_duration = 15  # 单段最长 15s，避免段太长又退化
cfg.sample_rate = sr
vad = sherpa_onnx.VoiceActivityDetector(cfg, buffer_size_in_seconds=30)

segs = []
chunk = 1600  # 0.1s
for i in range(0, len(samples), chunk):
    vad.accept_waveform(samples[i:i + chunk])
    while not vad.empty():
        seg = vad.front
        s = seg.samples
        segs.append(s.copy() if hasattr(s, "copy") else s)
        vad.pop()
vad.flush()
while not vad.empty():
    seg = vad.front
    s = seg.samples
    segs.append(s.copy() if hasattr(s, "copy") else s)
    vad.pop()

total_speech = sum(len(s) for s in segs) / sr
print(f"VAD 分成 {len(segs)} 段，语音总时长 {total_speech:.1f}s（原 {len(samples)/sr:.1f}s，裁掉静音 {(1-total_speech/(len(samples)/sr))*100:.0f}%）", flush=True)

# --- 逐段 SenseVoice 转写 ---
print("[*] 加载 SenseVoice...", flush=True)
r = sherpa_onnx.OfflineRecognizer.from_sense_voice(
    model=str(MODEL_DIR / "model.int8.onnx"), tokens=str(MODEL_DIR / "tokens.txt"),
    num_threads=8, use_itn=True, language="zh", debug=False,
)
t0 = time.time()
parts = []
for idx, s in enumerate(segs):
    st = r.create_stream()
    st.accept_waveform(sr, s)
    r.decode_stream(st)
    parts.append(clean_tags(st.result.text))
dt = time.time() - t0
full = "".join(parts)
print(f"逐段转写耗时 {dt:.1f}s（语音 {total_speech:.0f}s → {total_speech/dt:.1f}x 实时），总字数 {len(full)}", flush=True)
print("===== 结果预览 =====", flush=True)
print(full[:400], flush=True)
print("...", flush=True)
print(full[-400:], flush=True)
