"""技能使用频率扫描器——基于 Hermes 原生 .usage.json
姜胡说方法论「技能使用扫描」的落地实现。
每月跑一次：扫描所有 Skill 的使用情况，分在用/闲置/废弃三类。
"""
import json
import datetime
import os

USAGE_FILE = r"C:\Users\Admin\AppData\Local\hermes\skills\.usage.json"
OUTPUT_DIR = r"D:\写作工具\知识管理\07-Hermes\技能使用扫描"

def main():
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    
    with open(USAGE_FILE, "r", encoding="utf-8") as f:
        data = json.load(f)
    
    now = datetime.datetime.now(datetime.timezone.utc)
    week_ago = now - datetime.timedelta(days=7)
    month_ago = now - datetime.timedelta(days=30)
    
    in_use = []       # use_count > 0 且最近在用
    dormant = []      # 曾经用过但30天没动
    never_used = []   # use_count = 0
    archived = []     # state = archived
    
    for name, info in data.items():
        state = info.get("state", "active")
        if state == "archived":
            archived.append(name)
            continue
        
        count = info.get("use_count", 0)
        last_used = info.get("last_used_at")
        
        if count == 0:
            never_used.append((name, info.get("created_at", "")[:10]))
        elif last_used:
            try:
                last_dt = datetime.datetime.fromisoformat(last_used.replace("Z", "+00:00"))
                if last_dt < month_ago:
                    dormant.append((name, count, last_used[:10]))
                else:
                    in_use.append((name, count, last_used[:10]))
            except:
                in_use.append((name, count, str(last_used)[:10]))
        else:
            in_use.append((name, count, "?"))
    
    # 生成报告
    today = now.strftime("%Y-%m-%d")
    report = f"""# 技能使用扫描报告 {today}

> 数据源：Hermes 原生 `.usage.json`（use_count / last_used_at）
> 姜胡说方法论「技能使用扫描」落地——定期看看哪些技能在跑、哪些在吃灰。
> 原则：**不自动删任何技能**。只列出来，由用户/⑥号窗口决定处置。

## 📊 总览

| 分类 | 数量 | 说明 |
|:--|:--|:--|
| ✅ 在用（30天内用过） | {len(in_use)} | 正常运转 |
| 😴 闲置（用过但30天没动） | {len(dormant)} | 可能过时/被替代 |
| 🆕 从未使用 | {len(never_used)} | 建了没用过——重点关注 |
| 📦 已归档 | {len(archived)} | 已被系统归档 |

**总数：{len(data)} 个技能**

---

## 🆕 从未使用（{len(never_used)} 个）— 最该处理的

> 判断标准：创建了但 use_count=0。要么没用上，要么是冗余。

| 技能 | 创建时间 | 建议 |
|:--|:--|:--|
"""
    
    for name, created in sorted(never_used, key=lambda x: x[1]):
        report += f"| {name} | {created} | ⚠️ 确认是否还需要 |\n"
    
    report += f"""
---

## 😴 闲置（{len(dormant)} 个）— 用过但30天没碰

| 技能 | 用次数 | 最后使用 |
|:--|:--|:--|
"""
    for name, count, last in sorted(dormant, key=lambda x: x[2]):
        report += f"| {name} | {count} | {last} |\n"
    
    report += f"""
---

## ✅ 在用（{len(in_use)} 个）— 高亮高频

> 只看使用次数≥5的。

| 技能 | 用次数 | 最后使用 |
|:--|:--|:--|
"""
    for name, count, last in sorted(in_use, key=lambda x: -x[1])[:15]:
        report += f"| {name} | {count} | {last} |\n"
    
    report += f"""
---

## 📦 已归档（{len(archived)} 个）

{', '.join(archived) if archived else '无'}

---

## 🎯 行动建议

1. **从未使用**的：逐个确认——是没场景？还是已有替代？不需要的标记给⑥号窗口归档
2. **闲置**的：30天没动说明当前没场景，但保留（可能以后用），不急着删
3. **在用**的：这些是系统主力，确保它们是最新版本
"""
    
    out_path = os.path.join(OUTPUT_DIR, f"技能使用扫描-{today}.md")
    with open(out_path, "w", encoding="utf-8") as f:
        f.write(report)
    
    print(f"✅ 报告已生成: {out_path}")
    print(f"在用{len(in_use)} / 闲置{len(dormant)} / 从未{len(never_used)} / 归档{len(archived)}")
    
    # 输出摘要供 cron 推送
    summary = f"🧠 技能使用扫描 {today}：在用{len(in_use)} | 闲置{len(dormant)} | 从未使用{len(never_used)} | 归档{len(archived)}"
    if never_used:
        summary += f"\n⚠️ 从未使用{len(never_used)}个，前5：{', '.join(n for n, _ in never_used[:5])}"
    print(summary)

if __name__ == "__main__":
    main()
