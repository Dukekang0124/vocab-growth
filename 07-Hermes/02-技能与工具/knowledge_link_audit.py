# -*- coding: utf-8 -*-
"""
知识互联盘点 - 扫描06-Wiki/03-核心概念的双链现状
输出：每个概念的入链数（被谁引用）、出链数（引用了谁），找出孤岛/枢纽
"""
import os
import re
from collections import defaultdict

CONCEPT_DIR = r"D:\写作工具\知识管理\06-Wiki\03-核心概念"
VAULT = r"D:\写作工具\知识管理"

def get_concepts():
    """所有概念文件名（去.md）"""
    concepts = set()
    for f in os.listdir(CONCEPT_DIR):
        if f.endswith(".md"):
            concepts.add(f[:-3])
    return concepts

def scan_links():
    """扫描整个vault，统计每个概念被引用的次数"""
    concepts = get_concepts()
    inlinks = defaultdict(int)  # 概念 -> 被引次数
    link_sources = defaultdict(list)  # 概念 -> 被哪些文件引用
    
    for root, dirs, files in os.walk(VAULT):
        dirs[:] = [d for d in dirs if d not in (".git", ".obsidian", "node_modules", ".trash")]
        for f in files:
            if not f.endswith(".md"):
                continue
            fp = os.path.join(root, f)
            try:
                content = open(fp, encoding="utf-8", errors="ignore").read()
            except OSError:
                continue
            for concept in concepts:
                # 匹配 [[概念]] 或 [[概念|别名]] 或 [[路径/概念]]
                pat = r"\[\[[^\]]*" + re.escape(concept) + r"[^\]]*\]\]"
                if re.search(pat, content):
                    inlinks[concept] += 1
                    link_sources[concept].append(os.path.relpath(fp, VAULT))
    
    return concepts, inlinks, link_sources

def main():
    concepts, inlinks, link_sources = scan_links()
    print(f"概念总数: {len(concepts)}")
    print()
    print("=" * 60)
    print("【孤岛概念】被引用 0 次（没人链到它们）")
    print("=" * 60)
    islands = [c for c in concepts if inlinks[c] == 0]
    for c in sorted(islands):
        print(f"  • {c}")
    print(f"  共 {len(islands)} 个孤岛")
    print()
    print("=" * 60)
    print("【枢纽概念】被引用 ≥3 次（知识网络核心）")
    print("=" * 60)
    hubs = [(c, n) for c, n in inlinks.items() if n >= 3]
    for c, n in sorted(hubs, key=lambda x: -x[1]):
        print(f"  • {c}: {n}次")
    print()
    print("=" * 60)
    print("【正常概念】被引用 1-2 次")
    print("=" * 60)
    normal = [(c, n) for c, n in inlinks.items() if 0 < n < 3]
    for c, n in sorted(normal, key=lambda x: -x[1]):
        print(f"  • {c}: {n}次")

if __name__ == "__main__":
    main()
