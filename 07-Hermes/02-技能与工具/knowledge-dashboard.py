#!/usr/bin/env python
"""
知识周转率仪表盘
每周运行一次，分析 vault 健康状况：
- 文件总量 & 分布
- 新增/修改趋势
- 热引用排行榜（哪些文件被链最多）
- 孤儿文件（无人链接）
- 积灰文件（长期未修改）
"""

import os
import re
import json
from pathlib import Path
from datetime import datetime, timezone
import time

VAULT = Path("D:/写作工具/知识管理")
EXCLUDE_DIRS = {".obsidian", ".trash", ".weread-cache", "copilot", "weread", "07-Hermes", ".git", "Wechatsync"}
WIKI_DIR = VAULT / "06-Wiki"
HERMES_DIR = VAULT / "07-Hermes"

def get_all_md_files():
    """Get all .md files in vault, excluding system dirs"""
    files = []
    for md in VAULT.rglob("*.md"):
        rel = str(md.relative_to(VAULT))
        parts = rel.replace("\\", "/").split("/")
        if any(p in EXCLUDE_DIRS for p in parts):
            continue
        stats = md.stat()
        files.append({
            "path": rel,
            "folder": parts[0] if parts else "",
            "name": md.stem,
            "size_kb": round(stats.st_size / 1024, 1),
            "created": stats.st_ctime,
            "modified": stats.st_mtime
        })
    return files

def count_backlinks(files):
    """Count how many times each note is linked by [[NoteName]] in other notes"""
    name_to_path = {f["name"]: f["path"] for f in files}
    link_counts = {f["name"]: 0 for f in files}
    
    for f in files:
        try:
            content = Path(VAULT / f["path"]).read_text(encoding="utf-8", errors="ignore")
            # Find all [[links]] in content
            links = re.findall(r'\[\[([^\[\]]+?)(?:\||\])', content)
            for link in links:
                link = link.strip()
                if link in link_counts:
                    link_counts[link] += 1
        except:
            pass
    
    return link_counts

def find_orphans(files, link_counts):
    """Find notes with zero incoming links (excluding MOCs and special files)"""
    orphans = []
    for f in files:
        name = f["name"]
        # Skip MOCs, special files, and concept-tracker
        if name.endswith("-MOC") or name in ("引导文件", "自动仪表盘", "未命名", "项目看板"):
            continue
        if link_counts.get(name, 0) == 0:
            orphans.append(f)
    return orphans

def by_folder(files):
    """Group files by top-level folder"""
    folders = {}
    for f in files:
        folder = f["folder"]
        if folder not in folders:
            folders[folder] = 0
        folders[folder] += 1
    return dict(sorted(folders.items()))

def recent_activity(files, days=7):
    """Count files created or modified in last N days"""
    now = time.time()
    cutoff = now - (days * 86400)
    
    new = [f for f in files if f["created"] > cutoff]
    modified = [f for f in files if f["modified"] > cutoff and f["created"] <= cutoff]
    return new, modified

def hot_topics(files, link_counts, top_n=20):
    """Find notes with most backlinks"""
    ranked = [(link_counts.get(f["name"], 0), f["name"], f["path"]) for f in files]
    ranked.sort(reverse=True)
    return [r for r in ranked if r[0] > 0][:top_n]

def main():
    files = get_all_md_files()
    link_counts = count_backlinks(files)
    orphans = find_orphans(files, link_counts)
    folders = by_folder(files)
    new_7d, mod_7d = recent_activity(files, 7)
    new_30d, mod_30d = recent_activity(files, 30)
    hot = hot_topics(files, link_counts)
    
    # Wiki-specific stats
    wiki_files = [f for f in files if f["path"].startswith("06-Wiki")]
    wiki_link_counts = {f["name"]: link_counts.get(f["name"], 0) for f in wiki_files}
    
    report = {
        "report_time": datetime.now().strftime("%Y-%m-%d %H:%M"),
        "report_ts": time.time(),
        "vault_stats": {
            "total_files": len(files),
            "total_size_mb": round(sum(f["size_kb"] for f in files) / 1024, 1),
            "total_folders": len(folders),
            "orphan_count": len(orphans),
            "orphan_percent": round(len(orphans) / max(len(files), 1) * 100, 1)
        },
        "by_folder": folders,
        "activity_7d": {
            "new": len(new_7d),
            "modified": len(mod_7d),
            "total": len(new_7d) + len(mod_7d),
            "new_files": [f["path"] for f in new_7d],
            "modified_files": [f["path"] for f in mod_7d if f not in new_7d]
        },
        "activity_30d": {
            "new": len(new_30d),
            "modified": len(mod_30d),
            "total": len(new_30d) + len(mod_30d)
        },
        "wiki_stats": {
            "total_concepts": len(wiki_files),
            "most_linked": [
                {"name": name, "links": count}
                for count, name, path in hot
                if path.startswith("06-Wiki")
            ][:10]
        },
        "most_referenced_overall": [
            {"name": name, "links": count, "path": path}
            for count, name, path in hot[:20]
        ],
        "orphan_notes": [
            {"name": f["name"], "path": f["path"], "modified": 
             datetime.fromtimestamp(f["modified"]).strftime("%m-%d")}
            for f in sorted(orphans, key=lambda x: x["modified"])[:30]
        ],
        "cold_notes": [
            {"name": f["name"], "path": f["path"], "last_modified": 
             datetime.fromtimestamp(f["modified"]).strftime("%m-%d")}
            for f in sorted(files, key=lambda x: x["modified"])[:15]
            if f["modified"] < time.time() - 90*86400
        ]
    }
    
    print(json.dumps(report, ensure_ascii=False, indent=2))

if __name__ == "__main__":
    main()
