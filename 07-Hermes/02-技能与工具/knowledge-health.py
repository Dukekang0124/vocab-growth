#!/usr/bin/env python
"""
知识库健康检查（内容级）
检查 03-核心概念 的概念库质量：
- 孤立概念（没有被任何其他概念/笔记引用）
- 交叉引用不足（概念网络密度低）
- 概念文件损坏（缺定义/缺来源）
- 重复概念（含义相近的不同文件名）
- 过时引用（引用了不存在的笔记）

用法: python knowledge-health.py
"""

import os
import re
import json
from pathlib import Path
from datetime import datetime

WIKI_DIR = Path("D:/写作工具/知识管理/06-Wiki")
CONCEPT_DIR = WIKI_DIR / "03-核心概念"
VAULT = Path("D:/写作工具/知识管理")

def extract_links(text):
    """提取笔记中的 [[链接]]"""
    return set(re.findall(r"\[\[([^\[\]]+?)(?:\||\]])", text))

def check():
    if not CONCEPT_DIR.exists():
        print(json.dumps({"error": "概念目录不存在"}, ensure_ascii=False))
        return

    concepts = {}
    for f in sorted(CONCEPT_DIR.glob("*.md")):
        content = f.read_text(encoding="utf-8")
        concepts[f.stem] = content

    report = {
        "check_time": datetime.now().strftime("%Y-%m-%d %H:%M"),
        "total_concepts": len(concepts),
        "issues": []
    }

    # 1. 损坏检查：缺定义/缺来源
    for name, content in concepts.items():
        if "**定义**" not in content:
            report["issues"].append({"type": "缺定义", "concept": name, "detail": "没有定义字段"})
        if "**来源**" not in content and "**来源**: 概念碰撞" not in content:
            report["issues"].append({"type": "缺来源", "concept": name, "detail": "没有来源字段"})
        if "**相关概念**" not in content:
            report["issues"].append({"type": "孤立风险", "concept": name, "detail": "没有相关概念链接"})

    # 2. 孤立概念检查：出链和入链
    import time as _time
    now = _time.time()
    GRACE_DAYS = 30  # 新概念宽容期：30天内不报孤立
    all_text = "\n".join(concepts.values())
    for name, content in concepts.items():
        # 宽容期：文件 mtime 在 30 天内 → 跳过孤立检查（新概念还没机会被引用）
        f = CONCEPT_DIR / f"{name}.md"
        if f.exists() and (now - f.stat().st_mtime) < GRACE_DAYS * 86400:
            continue
        # 出链：本文件引用了哪些概念
        own_links = extract_links(content)
        has_outlink = bool(own_links)
        # 入链：其他概念文件里有多少次引用了本概念
        ref_count = all_text.count(f"[[{name}]]") + all_text.count(f"[[{name}|")
        # 减去自身文件里的自我引用（一般没有，但安全起见）
        if ref_count > 0:
            ref_count -= 1
        has_inlink = ref_count > 0

        if not has_outlink and not has_inlink:
            report["issues"].append({"type": "真孤立概念", "concept": name, "detail": "既无出链也无入链，未接入概念网络"})
        elif has_outlink and not has_inlink:
            # 只有出链：方向待补，提醒但不标红
            report["issues"].append({"type": "半孤立(单向链接)", "concept": name, "detail": "有出链但无反向引用，可考虑补双向链接"})

    # 3. 断链：引用了不存在的笔记
    all_links = set()
    for name, content in concepts.items():
        all_links.update(extract_links(content))
    for link in sorted(all_links):
        # 跳过外部链接和带路径的
        if link.startswith("http") or "/" in link or "|" in link:
            continue
        # 检查是否存在于 vault 任意位置
        found = list(VAULT.rglob(f"{link}.md"))
        if not found:
            report["issues"].append({"type": "断链", "concept": "未知", "detail": f"[[{link}]] 引用的笔记不存在"})

    # 4. 重复概念检测（文件名相似度粗判）
    names = list(concepts.keys())
    for i in range(len(names)):
        for j in range(i+1, len(names)):
            a, b = names[i], names[j]
            # 简单相似度：一个包含另一个，或共同前缀>4字
            if a in b or b in a:
                report["issues"].append({"type": "疑似重复", "concept": f"{a} / {b}", "detail": "文件名互相包含"})

    # 5. 知识待办积压检查（2026-08-02 加入，来源：姜胡说「AI+知识库」）
    TODO_FILE = VAULT / "07-Hermes" / "知识待办.md"
    todo_stats = {"total": 0, "open": 0, "done": 0, "oldest_open_days": None}
    if TODO_FILE.exists():
        todo_content = TODO_FILE.read_text(encoding="utf-8")
        open_items = [l for l in todo_content.split("\n") if l.strip().startswith("- [ ]")]
        done_items = [l for l in todo_content.split("\n") if l.strip().startswith("- [x]")]
        todo_stats["open"] = len(open_items)
        todo_stats["done"] = len(done_items)
        todo_stats["total"] = len(open_items) + len(done_items)
        # 检查积压：开放待办超过 5 条或存在超过 14 天未完成的
        if open_items:
            import datetime as _dt
            oldest = None
            for item in open_items:
                m = re.search(r"(\d{4}-\d{2}-\d{2})", item)
                if m:
                    try:
                        d = _dt.datetime.strptime(m.group(1), "%Y-%m-%d")
                        if oldest is None or d < oldest:
                            oldest = d
                    except ValueError:
                        pass
            if oldest:
                days = (_dt.datetime.now() - oldest).days
                todo_stats["oldest_open_days"] = days
                if len(open_items) >= 5:
                    report["issues"].append({"type": "待办积压", "concept": "知识待办", "detail": f"开放待办 {len(open_items)} 条（≥5），最老 {days} 天未完成"})
                elif days >= 14:
                    report["issues"].append({"type": "待办超期", "concept": "知识待办", "detail": f"最老待办已 {days} 天未完成"})
    report["todo_stats"] = todo_stats

    # 汇总
    report["issue_count"] = len(report["issues"])
    report["healthy"] = len(report["issues"]) == 0
    print(json.dumps(report, ensure_ascii=False, indent=2))

if __name__ == "__main__":
    check()
