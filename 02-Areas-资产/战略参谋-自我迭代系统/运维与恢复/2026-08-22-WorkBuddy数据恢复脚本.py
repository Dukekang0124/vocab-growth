#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
WorkBuddy 数据一键恢复脚本
用途：卸载重装 / 版本更新后，数据看似丢失时，从 ~/.workbuddy.old 恢复回 ~/.workbuddy
用法：用 WorkBuddy 自带的 Python 运行，或任意 Python3：
    python 本脚本.py
（若路径含中文，建议在文件所在目录下运行：cd 到脚本目录后 python 脚本名.py）
"""
import sqlite3, json, os, shutil

OLD = os.path.expanduser('~/.workbuddy.old')
NEW = os.path.expanduser('~/.workbuddy')

def main():
    print('=== WorkBuddy 数据恢复 ===')
    if not os.path.isdir(OLD):
        print('未找到旧数据目录', OLD, '，无需恢复。')
        return

    # 1. 恢复纯文本文件（身份 + 记忆）
    files = ['MEMORY.md', 'IDENTITY.md', 'USER.md', 'SOUL.md']
    for f in files:
        src, dst = os.path.join(OLD, f), os.path.join(NEW, f)
        if os.path.isfile(src):
            shutil.copy2(src, dst)
            print('  文件恢复:', f)

    # 2. 合并 models.json（补缺失的自定义模型）
    _merge_models()

    # 3. 合并数据库（会话 / 定时任务 / 用量）
    _merge_db()

    print('恢复完成。请重启 WorkBuddy 后查看历史会话。')
    print('注意：~/.workbuddy.old 先保留，确认无误后再手动清理。')

def _merge_models():
    old_p, new_p = os.path.join(OLD, 'models.json'), os.path.join(NEW, 'models.json')
    if not (os.path.isfile(old_p) and os.path.isfile(new_p)):
        return
    try:
        new = json.load(open(new_p, encoding='utf-8'))
        old = json.load(open(old_p, encoding='utf-8'))
        ids = {m['id'] for m in new}
        added = [m for m in old if m['id'] not in ids]
        if added:
            new += added
            json.dump(new, open(new_p, 'w', encoding='utf-8'), ensure_ascii=False, indent=2)
            print('  模型恢复:', [m['id'] for m in added])
    except Exception as e:
        print('  模型合并跳过:', e)

def _merge_db():
    old_db, new_db = os.path.join(OLD, 'workbuddy.db'), os.path.join(NEW, 'workbuddy.db')
    if not (os.path.isfile(old_db) and os.path.isfile(new_db)):
        print('  数据库不存在，跳过')
        return
    try:
        con = sqlite3.connect(new_db, timeout=30)
        cur = con.cursor()
        cur.execute(f"ATTACH DATABASE '{old_db}' AS old")
        for t in ['sessions', 'automations', 'session_usage']:
            try:
                cur.execute(f"INSERT OR IGNORE INTO main.{t} SELECT * FROM old.{t}")
                print(f'  数据库恢复 {t}: 影响 {cur.rowcount} 行')
            except Exception as e:
                print(f'  表 {t} 跳过:', e)
        con.commit()
        con.close()
    except Exception as e:
        print('  数据库恢复失败:', e)

if __name__ == '__main__':
    main()
