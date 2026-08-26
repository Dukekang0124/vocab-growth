#!/usr/bin/env python3
"""变更台账核对-每日扫描
检测共享资源是否被修改但未登记到变更台账。
逻辑：比较共享资源的最新修改时间 vs 变更台账的更新时间。
如果资源比台账新，说明有改动没登记 → 输出提醒（非空stdout = cron会投递）。
"""
import os
import sys
import time

# 共享资源清单（重点监控）
RESOURCES = [
    r"C:\Users\Admin\AppData\Local\hermes\cron\jobs.json",
    r"C:\Users\Admin\AppData\Local\hermes\config.yaml",
    r"C:\Users\Admin\AppData\Local\hermes\.env",
    r"C:\Users\Admin\AppData\Local\hermes\skills",
    r"D:\写作工具\知识管理\07-Hermes\scripts",
    r"C:\Users\Admin\AppData\Local\hermes\SOUL.md",
]

LEDGER = r"D:\写作工具\知识管理\07-Hermes\变更台账.md"

def get_mtime(path):
    """获取文件/目录的最新修改时间"""
    try:
        if os.path.isfile(path):
            return os.path.getmtime(path)
        if os.path.isdir(path):
            latest = 0
            for root, dirs, files in os.walk(path):
                # 跳过 .git、__pycache__、node_modules
                dirs[:] = [d for d in dirs if d not in (".git", "__pycache__", "node_modules", ".archive")]
                for f in files:
                    fp = os.path.join(root, f)
                    try:
                        latest = max(latest, os.path.getmtime(fp))
                    except OSError:
                        pass
            return latest
    except OSError:
        return 0
    return 0

def main():
    if not os.path.exists(LEDGER):
        print("⚠️ 变更台账不存在——请先创建 07-Hermes/变更台账.md")
        return

    ledger_mtime = os.path.getmtime(LEDGER)
    now = time.time()

    changed_unlogged = []
    for res in RESOURCES:
        if not os.path.exists(res):
            continue  # 不存在的不报（可能是可选的）
        mtime = get_mtime(res)
        if mtime > ledger_mtime + 60:  # 台账晚1分钟内的修改视为已登记
            age_h = (now - mtime) / 3600
            changed_unlogged.append((res, age_h))

    if changed_unlogged:
        print("🔴 变更台账核对：发现未登记的改动！")
        print(f"（台账最后更新：{time.strftime('%Y-%m-%d %H:%M', time.localtime(ledger_mtime))}）")
        print()
        print("以下共享资源在台账登记之后被修改，可能未跑 change-impact-check：")
        for path, age in changed_unlogged:
            print(f"  • {path}  （{age:.1f}小时前修改）")
        print()
        print("处理：①确认这些改动是否已登记 ②若未登记，跑 change-impact-check 五步流程补登记")
    else:
        # 静默：无输出 = cron no_agent 模式不投递
        pass

if __name__ == "__main__":
    main()
