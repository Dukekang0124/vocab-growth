#!/usr/bin/env python3
"""Gateway 健康看门狗 —— 每 N 分钟检查一次，挂了就自动拉起来。

检查项：
1. gateway_state.json 是否正常
2. PID 进程是否存活
3. 飞书/微信是否 connected
4. 任一异常 → hermes gateway restart

输出：挂了重启时输出状态变更；健康时静默（不打扰用户）。
"""

import json
import os
import subprocess
import sys
import time
from pathlib import Path

HERMES_DIR = Path(os.environ.get("HERMES_DIR", Path.home() / "AppData/Local/hermes"))
STATE_FILE = HERMES_DIR / "gateway_state.json"
LOG_FILE = HERMES_DIR / "logs" / "watchdog.log"
HERMES_BIN = HERMES_DIR / "venv" / "Scripts" / "hermes.exe"

CHECK_INTERVAL = 600  # 10 分钟


def log(msg: str) -> None:
    timestamp = time.strftime("%Y-%m-%d %H:%M:%S")
    line = f"[{timestamp}] {msg}"
    print(line, flush=True)
    try:
        with open(LOG_FILE, "a", encoding="utf-8") as f:
            f.write(line + "\n")
    except OSError:
        pass


def read_state() -> dict | None:
    """读取 gateway_state.json，返回 dict 或 None。"""
    try:
        with open(STATE_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    except (FileNotFoundError, json.JSONDecodeError):
        return None


def pid_alive(pid: int) -> bool:
    """检查 PID 是否存活（Windows 兼容）。"""
    try:
        import ctypes
        kernel32 = ctypes.windll.kernel32
        handle = kernel32.OpenProcess(0x0400, False, pid)  # PROCESS_QUERY_INFORMATION
        if handle:
            kernel32.CloseHandle(handle)
            return True
        return False
    except Exception:
        # 兜底：用 tasklist
        try:
            result = subprocess.run(
                ["tasklist", "/FI", f"PID eq {pid}"],
                capture_output=True, text=True, timeout=5
            )
            return f"{pid}" in result.stdout and "No tasks" not in result.stdout
        except Exception:
            return False


def restart_gateway() -> bool:
    """重启 gateway，返回是否成功。"""
    try:
        result = subprocess.run(
            [str(HERMES_BIN), "gateway", "restart"],
            capture_output=True, text=True, timeout=120,
            cwd=str(HERMES_DIR)
        )
        if result.returncode == 0:
            log("✅ gateway restart 成功")
            time.sleep(10)  # 等连接建立
            return True
        else:
            log(f"❌ gateway restart 失败: {result.stderr[:200]}")
            return False
    except Exception as e:
        log(f"❌ gateway restart 异常: {e}")
        return False


def check_and_fix() -> str | None:
    """检查 gateway 状态，异常时重启。返回 None = 健康，返回 str = 做了什么。"""
    state = read_state()
    
    if state is None:
        log("⚠️ gateway_state.json 不存在或损坏 → 重启")
        restart_gateway()
        return "gateway_state.json 缺失/损坏，已重启"
    
    gw_state = state.get("gateway_state", "")
    pid = state.get("pid", 0)
    platforms = state.get("platforms", {})
    feishu_ok = platforms.get("feishu", {}).get("state") == "connected"
    weixin_ok = platforms.get("weixin", {}).get("state") == "connected"
    
    # 检查1: gateway_state 标记
    if gw_state != "running":
        log(f"⚠️ gateway_state={gw_state}（非 running）→ 重启")
        restart_gateway()
        return f"gateway 状态异常({gw_state})，已重启"
    
    # 检查2: PID 存活
    if not pid_alive(pid):
        log(f"⚠️ PID {pid} 已死 → 重启")
        restart_gateway()
        return f"gateway PID {pid} 已死，已重启"
    
    # 检查3: 连接状态
    issues = []
    if not feishu_ok:
        issues.append("飞书未连接")
    if not weixin_ok:
        issues.append("微信未连接")
    
    if issues:
        log(f"⚠️ 连接异常: {', '.join(issues)} → 重启")
        restart_gateway()
        return f"gateway 连接异常({', '.join(issues)})，已重启"
    
    return None  # 一切正常


if __name__ == "__main__":
    result = check_and_fix()
    if result:
        # 有动作 → 输出给 cron 推送
        print(result, flush=True)
        sys.exit(1)  # 非零退出 = 有动作，让 cron 感知
    # 健康 → 静默（no output = no notification）
