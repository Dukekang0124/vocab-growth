# -*- coding: utf-8 -*-
"""
上下文沉淀检查 v4 - 用 content 长度估算活跃上下文（token_count 未写入时兜底）
估算规则：3字符≈1 token，每条消息 +10 开销
检测各窗口会话是否接近压缩触发线（65万），提前提醒沉淀
用法: python context_check.py [--full]
输出: 达到提醒线的窗口清单（无输出=全部健康，cron no_agent 模式静默）
"""
import sqlite3
import os
import sys

STATE_DB = os.path.expandvars(r'C:\Users\Admin\AppData\Local\hermes\state.db')
# 压缩触发线 65万（0.65 × 100万），提醒线 = 80% = 52万，危险线 = 58万
ALERT_LINE = 520_000
DANGER_LINE = 580_000

WINDOWS = {
    '20260726_095329_3dd18f': '①自媒体系统',
    '20260727_111531_eab130': '②生存与发展作战室',
    '20260801_202139_c0fd67': '③一人公司指挥部',
    '20260731_103017_293bfa': '④产品化系统',
    '20260729_093512_71c07a': '⑤知识库系统',
    '20260726_100300_1cd283': '⑥系统配置',
    '20260731_103501_4b3fed': '⑦复盘系统',
    '20260726_202601_7a464b': '⑧自我迭代系统',
    '20260731_110047_54aed6': '⑨总长',
    '20260726_100556_2abf61': '⑩AI学习与创作系统',
    '20260726_095904_bda206': '⑪英语自学建设系统',
    '20260731_110730_6e66a9': '⑫投资辅助系统',
}

def main():
    if not os.path.exists(STATE_DB):
        print("⚠ state.db 不存在")
        return

    conn = sqlite3.connect(STATE_DB)
    cur = conn.cursor()

    alerts = []
    danger = []
    ok_count = 0
    details = []

    for sid, name in WINDOWS.items():
        # 活跃消息：active=1 且未压缩（compacted=0 或 NULL）
        cur.execute('''SELECT COUNT(*), COALESCE(SUM(LENGTH(COALESCE(content,''))),0)
                       FROM messages WHERE session_id=? AND active=1
                       AND (compacted=0 OR compacted IS NULL)''', (sid,))
        cnt, chars = cur.fetchone()
        # 3字符≈1token + 每条消息10开销
        tokens = chars // 3 + cnt * 10
        if tokens >= DANGER_LINE:
            danger.append((name, tokens, cnt))
        elif tokens >= ALERT_LINE:
            alerts.append((name, tokens, cnt))
        else:
            ok_count += 1
        details.append((name, tokens, cnt))

    conn.close()

    if '--full' in sys.argv:
        print("📊 各窗口活跃上下文（估算）")
        for n, t, c in sorted(details, key=lambda x: -x[1]):
            pct = t / 650000 * 100
            print(f"  {n}: {t/10000:.1f}万 tokens ({c}条, 压缩线{pct:.0f}%)")

    lines = []
    if danger:
        lines.append("🔴 危险线（接近压缩，建议立即沉淀）：")
        for n, t, c in danger:
            lines.append(f"  {n}: {t/10000:.1f}万 tokens")
    if alerts:
        lines.append("🟡 提醒线（建议沉淀）：")
        for n, t, c in alerts:
            lines.append(f"  {n}: {t/10000:.1f}万 tokens")
    if lines:
        lines.insert(0, "📊 上下文沉淀检查")
        lines.append("")
        lines.append("💡 建议：去对应窗口说「沉淀上下文」，把有价值内容倒进OB，释放空间。")
        print("\n".join(lines))
    # 无输出 = 全健康（cron 静默）

if __name__ == '__main__':
    main()
