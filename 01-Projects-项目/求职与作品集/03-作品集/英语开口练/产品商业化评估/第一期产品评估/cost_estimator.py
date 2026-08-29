#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
英语开口练 · 上线成本测算脚本（可配置参数）
============================================
场景：公开分享供约 100 人使用，预计 5%（5 人）付费。
输出：最坏 / 典型情景下的月度与年度「必须支出」，并区分
      - 固定成本（与用量无关，无论付费与否都承担）
      - 普惠可变（随所有用户使用量增长，无论付费与否）
      - 佣金相关（仅随付费营收增长）

价格来源（2026-08-27 核实）：
  - 域名 .xyz 续费标准价 ¥109/年（首年常促销，按续费价保守计）
  - Cloudflare Workers / KV / GitHub Pages / SSL：免费额度内 ¥0
  - 火山引擎 ASR 小模型流式 ¥0.0584/分钟 → 10秒跟读≈¥0.01/次
  - 豆包大模型 lite 输入¥0.6/百万tok、输出¥3.6/百万tok → 单轮对话≈¥0.001
  - 平台佣金（小红书/抖音橱窗/微信小店）取中值 5%

用法：
  python cost_estimator.py                        # 用默认参数
  python cost_estimator.py --users 200 --paid-rate 0.08
  python cost_estimator.py --pricing subscription --price 29.9
  python cost_estimator.py --no-ai                # 仅 MVP（不接 ASR/对话）
"""

import argparse

# ============ 可配置参数（默认值）============
DEFAULTS = {
    "total_users": 100,          # 总使用人数
    "paid_rate": 0.05,           # 付费率（5%）
    "price": 29.9,               # 客单价（买断价 or 月费，取决于 pricing）
    "pricing": "one_time",       # one_time=买断 / subscription=订阅月费
    "domain_year": 109.0,        # 域名年费（.xyz 续费标准价，保守）
    "asr_per_call": 0.01,        # ASR 每次约 ¥0.01（10秒跟读）
    "llm_per_turn": 0.001,       # 对话大模型每轮约 ¥0.001（豆包 lite）
    "commission_rate": 0.05,     # 平台佣金率（取中值 5%）
    "enable_ai": True,           # 是否启用 ASR+对话（完整版=True / MVP=False）
    "days_month": 30,
    # 使用强度（每人每日）
    "repeat_typical": 5,         # 典型：每人每日跟读次数
    "repeat_worst": 20,          # 最坏：每人每日跟读次数
    "dialog_typical": 2,         # 典型：每人每日对话轮次
    "dialog_worst": 10,          # 最坏：每人每日对话轮次
}


def calc(p: dict, worst: bool, force_mvp: bool = False):
    users = p["total_users"]
    paid = max(1, round(users * p["paid_rate"]))
    rep = p["repeat_worst"] if worst else p["repeat_typical"]
    dlg = p["dialog_worst"] if worst else p["dialog_typical"]
    dm = p["days_month"]
    ai_on = p["enable_ai"] and not force_mvp

    # —— 固定：与用量无关，无论付费与否都承担 ——
    domain_month = p["domain_year"] / 12.0

    # —— 普惠可变：所有用户都用（ASR/LLM），无论付费与否 ——
    if ai_on:
        asr_month = users * rep * dm * p["asr_per_call"]
        llm_month = users * dlg * dm * p["llm_per_turn"]
    else:
        asr_month = 0.0
        llm_month = 0.0
    usage_var_month = asr_month + llm_month   # 随用量增长（普惠）

    # —— 佣金：仅随付费营收增长 ——
    if p["pricing"] == "subscription":
        commission_month = paid * p["price"] * p["commission_rate"]
    else:  # 买断：佣金一次性，按月均摊
        commission_month = paid * p["price"] * p["commission_rate"] / 12.0

    fixed_month = domain_month                       # 固定
    variable_month = usage_var_month + commission_month
    total_month = fixed_month + variable_month
    total_year = total_month * 12

    # 营收（用于经济性对比）
    if p["pricing"] == "subscription":
        revenue_year = paid * p["price"] * 12
    else:
        revenue_year = paid * p["price"]

    return {
        "paid": paid,
        "domain_month": domain_month,
        "asr_month": asr_month,
        "llm_month": llm_month,
        "commission_month": commission_month,
        "fixed_month": fixed_month,
        "usage_var_month": usage_var_month,
        "variable_month": variable_month,
        "total_month": total_month,
        "total_year": total_year,
        "revenue_year": revenue_year,
        "ai_on": ai_on,
    }


def fmt(x):
    return f"¥{x:,.2f}"


def main():
    ap = argparse.ArgumentParser(description="英语开口练成本测算")
    ap.add_argument("--total-users", type=int, help="总使用人数")
    ap.add_argument("--paid-rate", type=float, help="付费率 如 0.05")
    ap.add_argument("--price", type=float, help="客单价")
    ap.add_argument("--pricing", choices=["one_time", "subscription"], help="买断/订阅")
    ap.add_argument("--domain-year", type=float, help="域名年费")
    ap.add_argument("--commission-rate", type=float, help="平台佣金率")
    ap.add_argument("--asr-per-call", type=float, help="ASR 每次单价")
    ap.add_argument("--llm-per-turn", type=float, help="对话每轮单价")
    ap.add_argument("--repeat-typical", type=int)
    ap.add_argument("--repeat-worst", type=int)
    ap.add_argument("--dialog-typical", type=int)
    ap.add_argument("--dialog-worst", type=int)
    ap.add_argument("--no-ai", action="store_true", help="仅 MVP（不接 ASR/对话）")
    args = ap.parse_args()

    p = dict(DEFAULTS)
    for k, v in vars(args).items():
        if v is None:
            continue
        if k == "no_ai":
            if v:  # 仅当显式 --no-ai 时才关闭 AI
                p["enable_ai"] = False
            continue
        p[k] = v

    paid = max(1, round(p["total_users"] * p["paid_rate"]))
    print("=" * 64)
    print("  英语开口练 · 上线成本测算（可配置）")
    print("=" * 64)
    print(f"  [参数] 总用户={p['total_users']}  付费率={p['paid_rate']*100:.0f}%  "
          f"付费用户={paid}  客单价={fmt(p['price'])}  计费={p['pricing']}")
    print(f"  [参数] 域名年费={fmt(p['domain_year'])}  ASR/次=¥{p['asr_per_call']:.3f}  "
          f"LLM/轮=¥{p['llm_per_turn']:.3f}  佣金率={p['commission_rate']*100:.0f}%")
    print("-" * 64)

    scenarios = [
        ("MVP（无AI）",      calc(p, worst=False, force_mvp=True)),
        ("完整版 · 典型",     calc(p, worst=False)),
        ("完整版 · 最坏",     calc(p, worst=True)),
    ]

    hdr = f"  {'情景':<14}{'固定月':>10}{'普惠可变月':>12}{'佣金月':>10}{'总月':>12}{'总年':>12}"
    print(hdr)
    print("  " + "-" * 58)
    for name, r in scenarios:
        print(f"  {name:<14}{fmt(r['fixed_month']):>10}{fmt(r['usage_var_month']):>12}"
              f"{fmt(r['commission_month']):>10}{fmt(r['total_month']):>12}{fmt(r['total_year']):>12}")

    print("-" * 64)
    print("  [成本属性区分]")
    print("   ① 无论付费与否都承担 = 固定(域名) + 普惠可变(全用户ASR/LLM)")
    for name, r in scenarios:
        base = r["fixed_month"] + r["usage_var_month"]
        if r["ai_on"]:
            detail = f"域名 {fmt(r['fixed_month'])} + ASR {fmt(r['asr_month'])} + LLM {fmt(r['llm_month'])}"
        else:
            detail = f"域名 {fmt(r['fixed_month'])}（未启用AI）"
        print(f"      {name:<14} → {fmt(base)}/月  （{detail}）")
    print("   ② 仅随付费/营收增长 = 平台佣金")
    for name, r in scenarios:
        if r["ai_on"]:
            print(f"      {name:<14} → {fmt(r['commission_month'])}/月")
    print("-" * 64)

    # 经济性洞察（买断 vs 订阅）
    full_typ = calc(p, worst=False)
    print("  [经济性洞察] 以「完整版·典型」对比年营收：")
    print(f"     预计年营收（{p['pricing']}）= {fmt(full_typ['revenue_year'])}")
    print(f"     预计年成本（完整典型）= {fmt(full_typ['total_year'])}")
    delta = full_typ["revenue_year"] - full_typ["total_year"]
    verdict = "盈利" if delta > 0 else "亏损（成本>营收）"
    print(f"     年度差额 = {fmt(delta)}  →  {verdict}")
    mvp_r = calc(p, worst=False, force_mvp=True)
    print(f"     若仅 MVP（不接ASR/对话）年成本 = {fmt(mvp_r['total_year'])}  →  "
          f"{'盈利' if full_typ['revenue_year']-mvp_r['total_year']>0 else '接近打平'}")
    print("=" * 64)


if __name__ == "__main__":
    main()
