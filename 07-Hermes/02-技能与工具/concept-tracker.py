#!/usr/bin/env python
"""
概念抽取跟踪脚本
用法:
  python concept-tracker.py check   → 扫描新文件，输出待处理列表
  python concept-tracker.py save batch.json  → 标记文件已处理，写入新概念
"""

import json
import sys
import os
from pathlib import Path

VAULT = Path("D:/写作工具/知识管理")
STATE_FILE = VAULT / "07-Hermes/concept-tracker-state.json"
WIKI_DIR = VAULT / "06-Wiki"
EXCLUDE_DIRS = {".obsidian", ".trash", ".weread-cache", "copilot", "weread", "07-Hermes", ".git"}
EXCLUDE_FILES = {"引导文件.md", "自动仪表盘.md"}

def load_state():
    if STATE_FILE.exists():
        with open(STATE_FILE, encoding="utf-8") as f:
            return json.load(f)
    return {"last_run": 0, "processed_files": {}}

def save_state(state):
    STATE_FILE.parent.mkdir(parents=True, exist_ok=True)
    with open(STATE_FILE, "w", encoding="utf-8") as f:
        json.dump(state, f, indent=2, ensure_ascii=False)

def find_new_files(state):
    """Find .md files modified since last run, excluding known dirs"""
    last_run = state.get("last_run", 0)
    already_processed = state.get("processed_files", {})  # dict: path -> last processed mtime
    
    new_files = []
    for md_file in sorted(VAULT.rglob("*.md")):
        rel = str(md_file.relative_to(VAULT))
        parts = rel.replace("\\", "/").split("/")
        
        # Skip excluded dirs
        if any(p in EXCLUDE_DIRS for p in parts):
            continue
        if md_file.name in EXCLUDE_FILES:
            continue
        
        mtime = md_file.stat().st_mtime
        
        # Include if: never processed, or modified since last run
        if rel not in already_processed or mtime > already_processed.get(rel, 0):
            new_files.append({
                "path": rel,
                "abs_path": str(md_file),
                "mtime": mtime,
                "size": md_file.stat().st_size,
                "folder": parts[0] if parts else ""
            })
    
    return new_files

def get_existing_concepts():
    """List existing concept files in 06-Wiki (non-MOC, non-special)"""
    if not WIKI_DIR.exists():
        return {}
    
    concepts = {}
    for f in WIKI_DIR.rglob("*.md"):  # rglob 递归子目录（00-MOC/01-外部输入/02-系统建设/03-核心概念）
        name = f.stem
        # Skip MOC files and special files
        if name.endswith("-MOC") or name in ("引导文件", "自动仪表盘", "未命名"):
            continue
        # Read title from first line
        content = f.read_text(encoding="utf-8")[:500]
        first_line = content.split("\n")[0] if content else ""
        title = first_line.lstrip("#").strip() if first_line.startswith("#") else name
        concepts[name] = {
            "title": title,
            "path": str(f.relative_to(VAULT))
        }
    return concepts

def read_file_content(md_file_path):
    """Read the first 3000 chars of a file for concept extraction"""
    try:
        content = Path(md_file_path).read_text(encoding="utf-8")
        return content[:3000]  # Limit to save tokens
    except Exception as e:
        return f"[读取失败: {e}]"

def do_check():
    """Check mode: output new files + existing concepts as JSON"""
    state = load_state()
    new_files = find_new_files(state)
    existing = get_existing_concepts()
    
    # Read content for new files
    file_batches = {}
    for f in new_files:
        folder = f["folder"]
        if folder not in file_batches:
            file_batches[folder] = []
        f["content_excerpt"] = read_file_content(f["abs_path"])
        file_batches[folder].append(f)
    
    result = {
        "mode": "check",
        "new_files_count": len(new_files),
        "new_files_by_folder": {
            folder: [
                {"path": f["path"], "size": f["size"], "mtime": f["mtime"]}
                for f in files
            ]
            for folder, files in file_batches.items()
        },
        "existing_concepts_count": len(existing),
        "existing_concepts": sorted(existing.keys()),
        "existing_concepts_detail": existing,
        "vault_path": str(VAULT),
        "wiki_path": str(WIKI_DIR),
        "last_run": state.get("last_run", 0),
        "last_run_readable": time_to_str(state.get("last_run", 0))
    }
    
    print(json.dumps(result, ensure_ascii=False, indent=2))

def do_save(batch_file):
    """Save mode: mark files as processed + write new concept files"""
    state = load_state()
    
    with open(batch_file, encoding="utf-8") as f:
        batch = json.load(f)
    
    now = time.time()
    
    # Mark processed files
    for fp in batch.get("processed_files", []):
        state["processed_files"][fp] = now
    
    # Write new concept files
    written = []
    for concept in batch.get("new_concepts", []):
        name = concept.get("name", "")
        if not name:
            continue
        # Sanitize filename
        safe_name = sanitize_filename(name)
        concept_path = WIKI_DIR / "03-核心概念" / f"{safe_name}.md"
        
        # Skip if exists
        if concept_path.exists():
            print(f"⚠️ 已存在: {safe_name}")
            continue

        content = format_concept(concept)
        concept_path.parent.mkdir(parents=True, exist_ok=True)
        concept_path.write_text(content, encoding="utf-8")
        written.append(safe_name)
    
    state["last_run"] = now
    save_state(state)
    
    result = {
        "mode": "save",
        "files_marked": len(batch.get("processed_files", [])),
        "concepts_written": written,
        "concepts_skipped_duplicates": len(batch.get("new_concepts", [])) - len(written)
    }
    print(json.dumps(result, ensure_ascii=False, indent=2))

def sanitize_filename(name):
    """Make a filename-safe version of the concept name"""
    # Remove emojis and special chars
    safe = re.sub(r'[^\w\u4e00-\u9fff\s-]', '', name)
    safe = safe.strip().replace(' ', '-')
    safe = re.sub(r'-+', '-', safe)
    return safe[:80]  # Limit length

def format_concept(concept):
    """Format a concept as a markdown note"""
    name = concept.get("name", "")
    definition = concept.get("definition", "")
    why_matters = concept.get("why_matters", "")
    source = concept.get("source", "")
    related = concept.get("related_concepts", [])
    problem = concept.get("problem", "")  # 解决什么问题（姜胡说知识卡片视角）
    
    parts = [
        f"# {name}",
        "",
        f"**定义**: {definition}",
        "",
    ]
    if source:
        parts.append(f"**来源**: [[{source}]]")
        parts.append("")
    if problem:
        parts.append("**解决什么问题** 🆕（知识卡片视角）:")
        parts.append(f"- 问题：{problem}")
        parts.append("")
    if why_matters:
        parts.append(f"**为什么重要**: {why_matters}")
        parts.append("")
    if related:
        related_links = " | ".join(f"[[{r}]]" for r in related)
        parts.append(f"**相关概念**: {related_links}")
        parts.append("")
    
    return "\n".join(parts)

import re
import time

def time_to_str(ts):
    if not ts:
        return "从未"
    try:
        from datetime import datetime
        return datetime.fromtimestamp(ts).strftime("%Y-%m-%d %H:%M")
    except:
        return str(ts)

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("用法: python concept-tracker.py check | save <batch.json>")
        sys.exit(1)
    
    action = sys.argv[1]
    if action == "check":
        do_check()
    elif action == "save" and len(sys.argv) >= 3:
        do_save(sys.argv[2])
    else:
        print("未知命令或缺少参数")
        sys.exit(1)
