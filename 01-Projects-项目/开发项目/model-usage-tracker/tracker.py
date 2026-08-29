# -*- coding: utf-8 -*-
"""
模型使用统计与分析核心模块 (Tracker)
====================================
自动记录 / 分析在不同业务环节调用的模型、次数、时间，识别触发调用上限的情况。

数据模型 (SQLite):
  calls      每次模型调用记录
  thresholds 各模型(及可选环节)的调用上限阈值
  alerts     接近/达到上限时生成的预警

设计要点:
  - 零外部依赖，仅用 Python 标准库 (sqlite3 / json / datetime)。
  - 阈值支持 global / 指定环节(stage) 两级；支持 period(day/week/month) 周期窗口计数。
  - record() 写入后自动按阈值评估并去重生成 warn / limit 预警。
  - export_report() 生成单文件离线 HTML，支持按环节 / 模型 / 时间筛选。
"""
from __future__ import annotations

import sqlite3
import json
import os
import time
import datetime as dt
from typing import Optional, Any, Dict, List

# --------------------------------------------------------------------------- #
# 工具函数
# --------------------------------------------------------------------------- #

def _now() -> dt.datetime:
    return dt.datetime.now()

def _to_epoch(d: dt.datetime) -> float:
    return d.timestamp()

def _parse_time(value: Any) -> Optional[float]:
    """接受 ISO 字符串 / datetime / epoch(int,float) -> epoch(float)。"""
    if value is None:
        return None
    if isinstance(value, (int, float)):
        return float(value)
    if isinstance(value, dt.datetime):
        return _to_epoch(value)
    s = str(value).strip()
    # 尝试 ISO
    try:
        return _to_epoch(dt.datetime.fromisoformat(s))
    except ValueError:
        pass
    # 尝试日期 YYYY-MM-DD -> 当日 00:00
    try:
        return _to_epoch(dt.datetime.strptime(s, "%Y-%m-%d"))
    except ValueError:
        pass
    raise ValueError(f"无法解析时间: {value!r}")

def _window_start(period: Optional[str]) -> Optional[dt.datetime]:
    now = _now()
    if not period:
        return None
    if period == "day":
        return now.replace(hour=0, minute=0, second=0, microsecond=0)
    if period == "week":
        monday = now - dt.timedelta(days=now.weekday())
        return monday.replace(hour=0, minute=0, second=0, microsecond=0)
    if period == "month":
        return now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    raise ValueError(f"未知 period: {period!r}")


# --------------------------------------------------------------------------- #
# Tracker
# --------------------------------------------------------------------------- #

class Tracker:
    def __init__(self, db_path: Optional[str] = None, config_path: Optional[str] = None):
        base = os.path.dirname(os.path.abspath(__file__))
        self.db_path = db_path or os.path.join(base, "usage.db")
        self.config_path = config_path or os.path.join(base, "config.json")
        self._conn = sqlite3.connect(self.db_path)
        self._conn.row_factory = sqlite3.Row
        self._init_db()
        self._seed_default_thresholds()
        # 自动汇报: 每次 record 后把报告落到 OB vault (实时查看)
        cfg = self._load_config()
        ar = cfg.get("auto_report") or {}
        self.auto_report = bool(ar.get("enabled", False))
        self.auto_report_path = ar.get("path")
        self.auto_report_fmt = ar.get("format", "md")

    # ---- 初始化 ---------------------------------------------------------- #
    def _init_db(self) -> None:
        c = self._conn
        c.executescript("""
        CREATE TABLE IF NOT EXISTS calls (
            id        INTEGER PRIMARY KEY AUTOINCREMENT,
            stage     TEXT NOT NULL,
            model     TEXT NOT NULL,
            ts        TEXT NOT NULL,
            ts_epoch  REAL NOT NULL,
            status    TEXT DEFAULT 'ok',
            tokens    INTEGER,
            cost      REAL,
            meta      TEXT
        );
        CREATE INDEX IF NOT EXISTS idx_calls_stage ON calls(stage);
        CREATE INDEX IF NOT EXISTS idx_calls_model ON calls(model);
        CREATE INDEX IF NOT EXISTS idx_calls_ts    ON calls(ts_epoch);

        CREATE TABLE IF NOT EXISTS thresholds (
            id         INTEGER PRIMARY KEY AUTOINCREMENT,
            model      TEXT NOT NULL,
            stage      TEXT,                -- NULL = 全局
            limit_n    INTEGER NOT NULL,
            warn_ratio REAL DEFAULT 0.8,
            period     TEXT,                -- NULL=累计 / day / week / month
            UNIQUE(model, stage)
        );

        CREATE TABLE IF NOT EXISTS alerts (
            id         INTEGER PRIMARY KEY AUTOINCREMENT,
            call_id    INTEGER,
            model      TEXT NOT NULL,
            stage      TEXT,
            level      TEXT NOT NULL,       -- warn / limit
            ts         TEXT NOT NULL,
            ts_epoch   REAL NOT NULL,
            message    TEXT,
            acknowledged INTEGER DEFAULT 0,
            resolved   INTEGER DEFAULT 0
        );
        CREATE INDEX IF NOT EXISTS idx_alerts_model ON alerts(model, stage, level);
        """)
        c.commit()

    def _seed_default_thresholds(self) -> None:
        """用 config.json 中的默认阈值填充未存在的项（不覆盖已手动设定）。"""
        cfg = self._load_config()
        for t in cfg.get("thresholds", []):
            stage = t.get("stage") or ""   # 全局用空串, 避免 SQLite UNIQUE 对 NULL 视为不同值
            exists = self._conn.execute(
                "SELECT 1 FROM thresholds WHERE model=? AND stage=?",
                (t["model"], stage),
            ).fetchone()
            if not exists:
                self._conn.execute(
                    "INSERT INTO thresholds(model, stage, limit_n, warn_ratio, period) "
                    "VALUES(?,?,?,?,?)",
                    (t["model"], stage, int(t["limit"]),
                     float(t.get("warn_ratio", 0.8)), t.get("period")),
                )
        self._conn.commit()

    def _load_config(self) -> dict:
        if not self.config_path or not os.path.exists(self.config_path):
            return {}
        try:
            with open(self.config_path, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception:
            return {}

    # ---- 写入: 记录一次调用 ---------------------------------------------- #
    def record(self, stage: str, model: str, status: str = "ok",
               tokens: Optional[int] = None, cost: Optional[float] = None,
               meta: Optional[dict] = None, ts: Any = None) -> dict:
        """
        记录一次模型调用。返回 {call_id, alert}。
        stage : 业务环节, 如 chat / codegen / retrieval / image / video ...
        """
        now = _now() if ts is None else (
            dt.datetime.fromtimestamp(_parse_time(ts)) if not isinstance(ts, dt.datetime)
            else ts)
        row = {
            "stage": stage,
            "model": model,
            "ts": now.isoformat(timespec="seconds"),
            "ts_epoch": _to_epoch(now),
            "status": status,
            "tokens": tokens,
            "cost": cost,
            "meta": json.dumps(meta or {}, ensure_ascii=False),
        }
        cur = self._conn.execute(
            "INSERT INTO calls(stage, model, ts, ts_epoch, status, tokens, cost, meta) "
            "VALUES(:stage,:model,:ts,:ts_epoch,:status,:tokens,:cost,:meta)", row)
        call_id = cur.lastrowid
        self._conn.commit()
        alert = self._evaluate(stage, model, call_id, now)
        self._maybe_auto_report()   # 实时落到 OB vault
        return {"call_id": call_id, "alert": alert}

    def _maybe_auto_report(self) -> None:
        if self.auto_report and self.auto_report_path:
            try:
                self.export_report(self.auto_report_path, fmt=self.auto_report_fmt)
            except Exception:
                pass  # 自动汇报失败不影响主流程

    def _evaluate(self, stage: str, model: str, call_id: int,
                  now: dt.datetime) -> Optional[dict]:
        """按阈值评估并生成去重预警。"""
        ths = self._conn.execute(
            "SELECT * FROM thresholds WHERE model=?", (model,)).fetchall()
        # 优先 stage 专属阈值, 其次 global (stage=="" 表示全局)
        stage_th = next((t for t in ths if (t["stage"] or "") == stage), None)
        global_th = next((t for t in ths if (t["stage"] or "") == ""), None)
        chosen = stage_th or global_th
        if not chosen:
            return None

        period = chosen["period"]
        ws = _window_start(period)
        count = self._count(model, chosen["stage"], period, ws)
        limit = chosen["limit_n"]
        warn_at = max(1, int(limit * chosen["warn_ratio"]))

        if count >= limit:
            level = "limit"
        elif count >= warn_at:
            level = "warn"
        else:
            return None

        # 去重: 同 model+stage+level 已有未解除预警则跳过
        dup = self._conn.execute(
            "SELECT 1 FROM alerts WHERE model=? AND stage=? AND level=? AND resolved=0 "
            "LIMIT 1",
            (model, chosen["stage"] or "", level)).fetchone()
        if dup:
            return None

        scope = f"环节[{stage}]" if chosen["stage"] else "全局"
        period_label = {"day": "今日", "week": "本周", "month": "本月"}.get(period or "", "累计")
        msg = (f"{model} {scope} {period_label}调用 {count}/{limit} "
               f"已{'达到' if level=='limit' else '接近'}上限")
        cur = self._conn.execute(
            "INSERT INTO alerts(call_id, model, stage, level, ts, ts_epoch, message) "
            "VALUES(?,?,?,?,?,?,?)",
            (call_id, model, chosen["stage"], level, now.isoformat(timespec="seconds"),
             _to_epoch(now), msg))
        self._conn.commit()
        return {"id": cur.lastrowid, "level": level, "count": count,
                "limit": limit, "message": msg}

    def _count(self, model: str, stage: Optional[str], period: Optional[str],
               ws: Optional[dt.datetime]) -> int:
        q = "SELECT COUNT(*) FROM calls WHERE model=?"
        params: List[Any] = [model]
        if stage:   # 空串=全局, 不按环节过滤
            q += " AND stage=?"
            params.append(stage)
        if ws is not None:
            q += " AND ts_epoch >= ?"
            params.append(_to_epoch(ws))
        return int(self._conn.execute(q, params).fetchone()[0])

    # ---- 阈值管理 -------------------------------------------------------- #
    def set_threshold(self, model: str, limit: int, warn_ratio: float = 0.8,
                      stage: Optional[str] = None, period: Optional[str] = None) -> None:
        stage = stage or ""   # 全局用空串
        self._conn.execute(
            "INSERT INTO thresholds(model, stage, limit_n, warn_ratio, period) "
            "VALUES(?,?,?,?,?) "
            "ON CONFLICT(model, stage) DO UPDATE SET "
            "limit_n=excluded.limit_n, warn_ratio=excluded.warn_ratio, period=excluded.period",
            (model, stage, int(limit), float(warn_ratio), period))
        self._conn.commit()

    @staticmethod
    def _norm_stage(row: dict) -> dict:
        d = dict(row)
        if d.get("stage") == "":
            d["stage"] = None
        return d

    def get_thresholds(self) -> List[dict]:
        rows = self._conn.execute(
            "SELECT model, stage, limit_n, warn_ratio, period FROM thresholds "
            "ORDER BY model, stage=''").fetchall()
        return [self._norm_stage(dict(r)) for r in rows]

    # ---- 查询 / 统计 ------------------------------------------------------ #
    def _where(self, stage: Optional[str], model: Optional[str],
               since: Any, until: Any) -> tuple:
        clauses, params = [], []
        if stage:
            clauses.append("stage=?"); params.append(stage)
        if model:
            clauses.append("model=?"); params.append(model)
        if since is not None:
            clauses.append("ts_epoch >= ?"); params.append(_parse_time(since))
        if until is not None:
            clauses.append("ts_epoch <= ?"); params.append(_parse_time(until))
        where = (" WHERE " + " AND ".join(clauses)) if clauses else ""
        return where, params

    def raw_calls(self, stage: Optional[str] = None, model: Optional[str] = None,
                  since: Any = None, until: Any = None, limit: int = 500) -> List[dict]:
        where, params = self._where(stage, model, since, until)
        rows = self._conn.execute(
            f"SELECT * FROM calls{where} ORDER BY ts_epoch DESC LIMIT ?",
            params + [limit]).fetchall()
        out = []
        for r in rows:
            d = dict(r)
            try:
                d["meta"] = json.loads(d["meta"]) if d["meta"] else {}
            except Exception:
                pass
            out.append(d)
        return out

    def stats_by_stage_model(self, stage: Optional[str] = None, model: Optional[str] = None,
                             since: Any = None, until: Any = None) -> List[dict]:
        where, params = self._where(stage, model, since, until)
        rows = self._conn.execute(
            f"SELECT stage, model, COUNT(*) AS cnt, "
            f"MIN(ts) AS first_ts, MAX(ts) AS last_ts "
            f"FROM calls{where} GROUP BY stage, model ORDER BY cnt DESC", params)
        return [dict(r) for r in rows]

    def cumulative_by_model(self, since: Any = None, until: Any = None) -> List[dict]:
        where, params = self._where(None, None, since, until)
        # _where 已含 stage/model, 这里仅用时间
        time_clauses, time_params = [], []
        if since is not None:
            time_clauses.append("ts_epoch >= ?"); time_params.append(_parse_time(since))
        if until is not None:
            time_clauses.append("ts_epoch <= ?"); time_params.append(_parse_time(until))
        tw = (" WHERE " + " AND ".join(time_clauses)) if time_clauses else ""
        rows = self._conn.execute(
            f"SELECT model, COUNT(*) AS total FROM calls{tw} GROUP BY model ORDER BY total DESC",
            time_params)
        return [dict(r) for r in rows]

    def timeline(self, bucket: str = "day", stage: Optional[str] = None,
                 model: Optional[str] = None, since: Any = None, until: Any = None) -> List[dict]:
        """按 day / week / month 分桶统计调用量。"""
        where, params = self._where(stage, model, since, until)
        if bucket == "day":
            fmt = "%Y-%m-%d"
        elif bucket == "week":
            fmt = "%Y-W%W"
        elif bucket == "month":
            fmt = "%Y-%m"
        else:
            raise ValueError("bucket 仅支持 day/week/month")
        rows = self._conn.execute(
            f"SELECT strftime('{fmt}', ts) AS b, COUNT(*) AS cnt "
            f"FROM calls{where} GROUP BY b ORDER BY b", params)
        return [{"bucket": r["b"], "count": r["cnt"]} for r in rows]

    def summary(self) -> dict:
        total = self._conn.execute("SELECT COUNT(*) FROM calls").fetchone()[0]
        models = self._conn.execute("SELECT COUNT(DISTINCT model) FROM calls").fetchone()[0]
        stages = self._conn.execute("SELECT COUNT(DISTINCT stage) FROM calls").fetchone()[0]
        first = self._conn.execute("SELECT MIN(ts) FROM calls").fetchone()[0]
        last = self._conn.execute("SELECT MAX(ts) FROM calls").fetchone()[0]
        open_alerts = self._conn.execute(
            "SELECT COUNT(*) FROM alerts WHERE resolved=0").fetchone()[0]
        return {"total_calls": total, "distinct_models": models,
                "distinct_stages": stages, "first_call": first, "last_call": last,
                "open_alerts": open_alerts}

    # ---- 预警 ------------------------------------------------------------ #
    def get_alerts(self, resolved: Optional[bool] = None, level: Optional[str] = None) -> List[dict]:
        clauses, params = [], []
        if resolved is not None:
            clauses.append("resolved=?"); params.append(0 if not resolved else 1)
        if level:
            clauses.append("level=?"); params.append(level)
        where = (" WHERE " + " AND ".join(clauses)) if clauses else ""
        rows = self._conn.execute(
            f"SELECT * FROM alerts{where} ORDER BY ts_epoch DESC", params)
        return [self._norm_stage(dict(r)) for r in rows]

    def acknowledge_alert(self, alert_id: int) -> None:
        self._conn.execute("UPDATE alerts SET acknowledged=1 WHERE id=?", (alert_id,))
        self._conn.commit()

    def resolve_alert(self, alert_id: int) -> None:
        self._conn.execute("UPDATE alerts SET resolved=1 WHERE id=?", (alert_id,))
        self._conn.commit()

    def reset_counts(self, model: Optional[str] = None) -> None:
        """清空调用记录与预警 (用于周期重置)。可选仅针对某模型。"""
        if model:
            self._conn.execute("DELETE FROM calls WHERE model=?", (model,))
            self._conn.execute("DELETE FROM alerts WHERE model=?", (model,))
        else:
            self._conn.execute("DELETE FROM calls")
            self._conn.execute("DELETE FROM alerts")
        self._conn.commit()

    # ---- 报告 ------------------------------------------------------------ #
    def export_report(self, path: str, since: Any = None, until: Any = None,
                      fmt: str = "html") -> str:
        if fmt == "md":
            from report import build_markdown
            build_markdown(self, path, since=since, until=until)
        else:
            from report import build_report
            build_report(self, path, since=since, until=until)
        return path

    def close(self):
        self._conn.close()


# --------------------------------------------------------------------------- #
# 便捷装饰器 / 上下文管理器 (自动埋点)
# --------------------------------------------------------------------------- #

def make_tracker(db_path: Optional[str] = None) -> Tracker:
    return Tracker(db_path)


class track_call:
    """上下文管理器: with track_call(tracker, 'codegen', 'gpt-4'): ... """
    def __init__(self, tracker: Tracker, stage: str, model: str, **meta):
        self.tracker = tracker
        self.stage = stage
        self.model = model
        self.meta = meta

    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        status = "error" if exc_type else "ok"
        self.tracker.record(self.stage, self.model, status=status, meta=self.meta)
        return False


def track(tracker: Tracker, stage: str, model: Optional[str] = None,
          get_model=None):
    """函数装饰器: 调用结束后自动记录。model 可固定或从返回值/参数推断。"""
    import functools
    def decorator(func):
        @functools.wraps(func)
        def wrapper(*args, **kwargs):
            m = model
            if m is None and get_model:
                m = get_model(*args, **kwargs)
            if m is None:
                m = "unknown"
            try:
                res = func(*args, **kwargs)
                tracker.record(stage, m, status="ok", meta={"func": func.__name__})
                return res
            except Exception:
                tracker.record(stage, m, status="error", meta={"func": func.__name__})
                raise
        return wrapper
    return decorator


if __name__ == "__main__":
    t = Tracker()
    print("Tracker ready. DB:", t.db_path)
    print("Summary:", t.summary())
