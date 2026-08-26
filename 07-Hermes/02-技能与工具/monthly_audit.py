# -*- coding: utf-8 -*-
"""月度Skill全量审计 - 幽灵检测/使用统计/记忆健康"""
import json, os, sys

skills_root = r"C:\Users\Admin\AppData\Local\hermes\skills"
usage_path = os.path.join(skills_root, ".usage.json")

with open(usage_path, encoding="utf-8") as f:
    usage = json.load(f)

# 磁盘上所有实际存在的 SKILL.md
disk_skills = set()
for root, dirs, files in os.walk(skills_root):
    if "SKILL.md" in files:
        name = os.path.basename(root)
        disk_skills.add(name)

usage_skills = set(usage.keys())

ghosts = sorted(usage_skills - disk_skills)
disk_only = sorted(disk_skills - usage_skills)

print(f"usage记录数: {len(usage_skills)}")
print(f"磁盘SKILL.md数: {len(disk_skills)}")
print(f"\n=== 幽灵Skill (usage有记录但磁盘无文件): {len(ghosts)} ===")
for g in ghosts:
    print(f"  - {g}")

print(f"\n=== 磁盘有但usage无记录: {len(disk_only)} ===")
for d in disk_only:
    print(f"  - {d}")

print("\n=== 无SKILL.md的非category目录 ===")
for d in sorted(os.listdir(skills_root)):
    dp = os.path.join(skills_root, d)
    if os.path.isdir(dp) and not os.path.exists(os.path.join(dp, "SKILL.md")):
        subs = os.listdir(dp)
        print(f"  {d}/ -> {subs[:6]}{'...' if len(subs)>6 else ''}")

print("\n=== 从未使用过 (use_count=0, active) ===")
never_used = []
for name, info in usage.items():
    if info.get("use_count", 0) == 0 and info.get("state") == "active":
        never_used.append(name)
print(f"共 {len(never_used)} 个:")
for n in sorted(never_used):
    print(f"  - {n}")

# 低频使用 (1-2次)
print("\n=== 低频使用 (1-2次) ===")
low_used = []
for name, info in usage.items():
    if info.get("use_count", 0) in (1, 2) and info.get("state") == "active":
        low_used.append((name, info.get("use_count", 0)))
print(f"共 {len(low_used)} 个:")
for n, c in sorted(low_used):
    print(f"  - {n} ({c}次)")

# 14天未更新的active skill
print("\n=== 超14天未更新但active ===")
from datetime import datetime, timezone
now = datetime.now(timezone.utc)
stale = []
for name, info in usage.items():
    last = info.get("last_patched_at") or info.get("last_used_at")
    if info.get("state") == "active" and last:
        try:
            dt = datetime.fromisoformat(last)
            days = (now - dt).days
            if days > 14:
                stale.append((name, days))
        except Exception:
            pass
print(f"共 {len(stale)} 个:")
for n, d in sorted(stale, key=lambda x: -x[1]):
    print(f"  - {n} ({d}天)")
