#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
一键重建 douyin-transcript 环境（venv + 依赖 + 模型）

用途：当隔离 venv 被重置、或换机器时，一条命令恢复全部环境，
彻底解决"环境会丢 → 重装 torch 全家桶 → 耗时久"的问题。

用法（用任意 Python 3 跑，会自动建 venv）：
  python setup.py
"""
import sys, subprocess, urllib.request
from pathlib import Path

SKILL_DIR = Path(__file__).resolve().parent
VENV_DIR = Path(r"C:\Users\Admin\.workbuddy\binaries\python\envs\default")
BASE_PYTHON = r"C:\Users\Admin\.workbuddy\binaries\python\versions\3.13.12\python.exe"
MODEL_DIR = SKILL_DIR / "models" / "sherpa-onnx-sense-voice-zh-en-ja-ko-yue-2024-07-17"
# 国内镜像：阿里 ModelScope（GitHub 常被墙，此源国内快，且只下 int8 版 229MB，避开 895MB 完整版）
MODEL_INT8_URL = "https://modelscope.cn/models/poloniumrock/SenseVoiceSmallOnnx/resolve/master/model.int8.onnx"
TOKENS_URL = "https://modelscope.cn/models/poloniumrock/SenseVoiceSmallOnnx/resolve/master/tokens.txt"
VAD_URL = "https://modelscope.cn/models/gomodels/sherpa/resolve/master/vad/silero_vad.onnx"
VAD_PATH = SKILL_DIR / "models" / "silero_vad.onnx"


def venv_python() -> Path:
    return VENV_DIR / "Scripts" / "python.exe"


def step1_venv():
    if venv_python().exists():
        print("[✓] venv 已存在，跳过")
        return
    print("[1/3] 创建隔离 venv ...")
    subprocess.run([BASE_PYTHON, "-m", "venv", str(VENV_DIR)], check=True)
    print("[✓] venv 创建完成")


def step2_deps():
    print("[2/3] 安装依赖 sherpa-onnx / av / numpy / playwright（轻量，几十MB，无需 torch）...")
    subprocess.run([str(venv_python()), "-m", "pip", "install", "-q", "sherpa-onnx", "av", "numpy", "playwright"], check=True)
    print("[✓] 依赖安装完成（playwright 用系统 Chrome，无需再下载浏览器）")


def step3_model():
    files = [
        (MODEL_DIR / "model.int8.onnx", MODEL_INT8_URL, "model.int8.onnx"),
        (MODEL_DIR / "tokens.txt", TOKENS_URL, "tokens.txt"),
        (VAD_PATH, VAD_URL, "silero_vad.onnx"),
    ]
    if all(p.exists() for p, _, _ in files):
        print("[✓] SenseVoice + VAD 模型已存在，跳过")
        return
    print("[3/3] 下载模型（ModelScope 国内源，放 D 盘）...")
    MODEL_DIR.mkdir(parents=True, exist_ok=True)
    VAD_PATH.parent.mkdir(parents=True, exist_ok=True)
    for path, url, name in files:
        if path.exists():
            continue
        print(f"    下载 {name} ...")
        urllib.request.urlretrieve(url, path)
    print("[✓] 模型下载完成")


if __name__ == "__main__":
    step1_venv()
    step2_deps()
    step3_model()
    print("\n✅ 环境就绪！用法：")
    print(f'  {venv_python()} "{SKILL_DIR / "scripts" / "douyin_to_text.py"}" <抖音视频URL或ID> [--out DIR]')
