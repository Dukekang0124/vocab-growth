# -*- coding: utf-8 -*-
"""
集成示例: 如何把统计工具接入你的代码 / 自动化任务, 实现"自动埋点"。
运行: python integration.py  (使用临时库, 不污染正式 usage.db)
"""
import os, tempfile
from tracker import Tracker, track, track_call


def demo():
    tmp = os.path.join(tempfile.gettempdir(), "mut_integration_demo.db")
    if os.path.exists(tmp):
        os.remove(tmp)
    t = Tracker(db_path=tmp)
    t.set_threshold("GLM-4-Flash", limit=5, warn_ratio=0.8, period="day")

    # 1) 直接记录
    t.record("chat", "GLM-4-Flash", tokens=320)

    # 2) 装饰器: 函数调用结束后自动记录 (model 可固定或推断)
    @track(t, stage="codegen", model="GPT-4o")
    def generate_code(prompt: str) -> str:
        return f"# code for {prompt}"

    generate_code("hello world")

    # 3) 上下文管理器: 包裹任意代码块
    with track_call(t, "retrieval", "GLM-4-Flash", query="什么是 RAG"):
        _ = "search results..."

    # 4) 自动化任务中一行命令式记录 (CLI 等价)
    t.record("image", "混元生图(ImageGen)")

    print("累计统计:")
    for r in t.cumulative_by_model():
        print(f"  {r['model']}: {r['total']}")
    print("预警:", [a["message"] for a in t.get_alerts()])
    t.close()


if __name__ == "__main__":
    demo()
