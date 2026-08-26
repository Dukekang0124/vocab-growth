#!/usr/bin/env python
"""
Wiki 索引更新器
重新生成 06-Wiki/index.md（AI 可读索引）——每页一句话摘要。
挂在周日 10:30 仪表盘之后运行。

用法: python update-index.py
"""

import os
import re
from pathlib import Path
from datetime import datetime

WIKI_DIR = Path("D:/写作工具/知识管理/06-Wiki")

def get_summary(path):
    """提取文件的一句话摘要：定义行 > 描述行(>) > 第一段正文"""
    try:
        content = path.read_text(encoding="utf-8")
    except Exception:
        return "（读取失败）"
    # 找 **定义**
    m = re.search(r'\*\*定义\*\*:?\s*(.+?)(?:\n|$)', content)
    if m:
        return m.group(1).strip()[:80]
    # 找 > 描述行（内容地图/说明），跳过 [[双链]]
    for line in content.split("\n"):
        t = line.strip()
        if t.startswith(">") and "[[" not in t and len(t) > 5:
            return t.lstrip("> ").strip()[:80]
    # 找第一段正文（跳过标题/链接/表格/代码）
    for line in content.split("\n"):
        t = line.strip()
        if t and not t.startswith("#") and not t.startswith(">") and not t.startswith("---") and not t.startswith("![") and not t.startswith("|") and not t.startswith("```") and not t.startswith("[["):
            return t[:80]
    # 回退：标题
    m2 = re.search(r'^#\s+(.+)$', content, re.M)
    if m2:
        return m2.group(1).strip()[:80]
    return "（无摘要）"

def build():
    sections = {
        "00-MOC": "MOC 地图索引",
        "01-外部输入": "外部输入（胡子哥/姜胡说/小秦同学）",
        "02-系统建设": "系统建设（知识库搭建方法论）",
        "03-核心概念": "核心概念（自生长概念库）",
    }

    lines = []
    lines.append("---")
    lines.append("type: wiki-index")
    lines.append(f"updated: {datetime.now().strftime('%Y-%m-%d')}")
    lines.append("---")
    lines.append("")
    lines.append("# 📇 Wiki 索引（AI 可读版）")
    lines.append("")
    lines.append("> 本文件是 06-Wiki 的内容目录，每页一句话摘要。AI 查询时先读本文件定位相关页面，再深入阅读。")
    lines.append("> 维护：由 `07-Hermes/update-index.py` 自动重新生成（周日 cron）。")
    lines.append("")

    total = 0
    for folder, label in sections.items():
        dirpath = WIKI_DIR / folder
        if not dirpath.is_dir():
            continue
        files = sorted(dirpath.glob("*.md"))
        if not files:
            continue
        lines.append(f"## {label} ({folder}/)")
        lines.append("")
        for f in files:
            name = f.stem
            summary = get_summary(f)
            lines.append(f"- [[{name}]] — {summary}")
            total += 1
        lines.append("")

    # 根目录（排除 index/log 自身）
    lines.append("## 根目录")
    lines.append("")
    for f in sorted(WIKI_DIR.glob("*.md")):
        if f.stem in ("index", "log", "引导文件", "自动仪表盘"):
            continue
        name = f.stem
        summary = get_summary(f)
        lines.append(f"- [[{name}]] — {summary}")
        total += 1
    lines.append("")

    content = "\n".join(lines)
    out = WIKI_DIR / "index.md"
    out.write_text(content, encoding="utf-8")
    print(f"✅ index.md 已更新：{total} 个页面")

if __name__ == "__main__":
    build()
