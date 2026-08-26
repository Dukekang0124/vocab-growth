# -*- coding: utf-8 -*-
"""
每日窗口动态广播 - 扫描状态日志提取今日变更，汇总推送
解决"窗口间互不知情、用户重复提醒"问题。
每天18:30由cron触发，输出今日各窗口动态（非空stdout=投递微信）。
同时写入 OB 07-Hermes/每日窗口动态.md（其他窗口启动可读）。
"""
import os
import re
import sys
import datetime

LOG = r"D:\写作工具\知识管理\07-Hermes\状态日志.md"
OUT = r"D:\写作工具\知识管理\07-Hermes\每日窗口动态.md"

def extract_today():
    """从状态日志提取今天的变更行"""
    today = datetime.date.today().strftime("%Y-%m-%d")
    entries = []
    try:
        with open(LOG, "r", encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if not line or not line.startswith("|"):
                    continue
                # 行格式: | 日期 | 窗口 | 做了什么 |
                parts = [p.strip() for p in line.split("|")[1:-1]]
                if len(parts) < 3:
                    continue
                date, window, what = parts[0], parts[1], parts[2]
                if date.startswith(today):
                    entries.append((window, what))
    except OSError:
        return []
    return entries

def main():
    entries = extract_today()
    if not entries:
        return  # 无变更=静默（cron no_agent 不投递）

    today = datetime.date.today().strftime("%Y-%m-%d")
    lines = [f"📋 今日窗口动态（{today}）", ""]
    # 按窗口分组
    by_window = {}
    for window, what in entries:
        by_window.setdefault(window, []).append(what)
    for window in sorted(by_window.keys()):
        lines.append(f"**{window}**：")
        for what in by_window[window]:
            lines.append(f"  • {what}")
        lines.append("")
    text = "\n".join(lines)

    # 写入 OB（覆盖今日，其他窗口可读）
    try:
        with open(OUT, "w", encoding="utf-8") as f:
            f.write("# 📋 每日窗口动态\n\n> 自动生成（cron 18:30）。其他窗口启动时读这份文件，即可知道今天各窗口干了什么。\n\n" + text + "\n")
    except OSError:
        pass

    # stdout = cron 投递内容（非空=推送微信）
    print(text)

if __name__ == "__main__":
    main()
