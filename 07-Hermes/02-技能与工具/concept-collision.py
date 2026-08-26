#!/usr/bin/env python
"""
完整版概念碰撞引擎（Cognitive Dagger）
用 sentence-transformers 计算概念向量相似度，找出「相关性适中（0.55-0.80）」的概念对
→ 输出候选碰撞对，供 AI 做碰撞分析

用法:
  python concept-collision.py index    → 重建向量索引（扫描 03-核心概念）
  python concept-collision.py pick N   → 随机挑 N 对相关性适中的概念
"""

import os
import sys
import json
import random
from pathlib import Path

os.environ.setdefault("HF_ENDPOINT", "https://hf-mirror.com")
os.environ.setdefault("HF_HOME", "D:/hermes-models")  # Windows 格式路径，勿用 /d/ 前缀

WIKI_DIR = Path("D:/写作工具/知识管理/06-Wiki/03-核心概念")
DB_DIR = Path("D:/hermes-models/chroma-db")

def load_concepts():
    """Load all concept files as {name: text}"""
    concepts = {}
    if not WIKI_DIR.exists():
        return concepts
    for f in sorted(WIKI_DIR.glob("*.md")):
        content = f.read_text(encoding="utf-8")
        # Keep first 2000 chars as embedding source
        concepts[f.stem] = content[:2000]
    return concepts

def get_model():
    from sentence_transformers import SentenceTransformer
    model = SentenceTransformer("paraphrase-multilingual-MiniLM-L12-v2")
    return model

def do_index():
    """Build vector index of all concepts"""
    concepts = load_concepts()
    if not concepts:
        print(json.dumps({"error": "无概念文件"}, ensure_ascii=False))
        return
    
    model = get_model()
    names = list(concepts.keys())
    texts = [concepts[n] for n in names]
    
    print(f"编码 {len(names)} 个概念...", file=sys.stderr)
    embeddings = model.encode(texts, normalize_embeddings=True)
    
    DB_DIR.mkdir(parents=True, exist_ok=True)
    
    # Save names + embeddings as npy
    import numpy as np
    np.save(DB_DIR / "concept_names.npy", np.array(names, dtype=object), allow_pickle=True)
    np.save(DB_DIR / "concept_embeddings.npy", embeddings)
    
    print(json.dumps({
        "indexed": len(names),
        "concepts": names,
        "db_path": str(DB_DIR)
    }, ensure_ascii=False, indent=2))

def do_pick(n_pairs=3):
    """Pick N concept pairs with moderate similarity (0.55-0.80)"""
    import numpy as np
    
    if not (DB_DIR / "concept_names.npy").exists():
        print(json.dumps({"error": "索引未建立，先运行 index"}, ensure_ascii=False))
        return
    
    names = np.load(DB_DIR / "concept_names.npy", allow_pickle=True).tolist()
    embeddings = np.load(DB_DIR / "concept_embeddings.npy")
    
    # Compute cosine similarity matrix
    sim = embeddings @ embeddings.T
    
    # Find pairs with moderate similarity
    candidates = []
    for i in range(len(names)):
        for j in range(i+1, len(names)):
            s = float(sim[i][j])
            if 0.55 <= s <= 0.80:
                candidates.append((s, names[i], names[j]))
    
    if not candidates:
        print(json.dumps({"error": "没有相关性适中的概念对", "n_concepts": len(names)}, ensure_ascii=False))
        return
    
    candidates.sort(reverse=True)
    
    # Pick N random from top 60% (avoid always picking the same)
    top = candidates[:max(6, len(candidates) // 2)]
    picked = random.sample(top, min(n_pairs, len(top)))
    
    result = []
    for s, a, b in picked:
        result.append({
            "concept_a": a,
            "concept_b": b,
            "similarity": round(s, 3)
        })
    
    print(json.dumps({
        "n_concepts": len(names),
        "candidate_pairs": len(candidates),
        "pairs": result
    }, ensure_ascii=False, indent=2))

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("用法: python concept-collision.py index | pick [N]")
        sys.exit(1)
    
    action = sys.argv[1]
    if action == "index":
        do_index()
    elif action == "pick":
        n = int(sys.argv[2]) if len(sys.argv) > 2 else 3
        do_pick(n)
    else:
        print("未知命令")
        sys.exit(1)
