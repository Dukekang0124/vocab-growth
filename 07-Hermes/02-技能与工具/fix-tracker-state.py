# 一次性修复：全量标记文件为已处理
import json
import time
from pathlib import Path

VAULT = Path("D:/写作工具/知识管理")
EXCLUDE_DIRS = {".obsidian", ".trash", ".weread-cache", "copilot", "weread", "07-Hermes", ".git"}
EXCLUDE_FILES = {"引导文件.md", "自动仪表盘.md"}

now = time.time()
processed = {}

for md in sorted(VAULT.rglob("*.md")):
    rel = str(md.relative_to(VAULT))
    parts = rel.replace("\\", "/").split("/")
    if any(p in EXCLUDE_DIRS for p in parts):
        continue
    if md.name in EXCLUDE_FILES:
        continue
    processed[rel] = now

state = {
    "last_run": now,
    "processed_files": processed,
    "note": "2026-08-01 全量标记：迁移后674个假新文件全部标记为已处理。初始概念抽取(8个)已完成。周日只扫标记之后的真新文件。"
}
with open("concept-tracker-state.json", "w", encoding="utf-8") as f:
    json.dump(state, f, indent=2, ensure_ascii=False)

print("已标记文件数:", len(processed))
