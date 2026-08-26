---
name: dir-rename-junction
description: 目录改名 + junction 重连工作流。适用于：改含 junction/symlink 的目录名、WorkBuddy 工作空间路径迁移、改目录名后应用打不开（junction 悬空导致 ENOENT 崩溃）。核心：改名 + 重连 junction + 同步路径引用必须原子化完成，零间隙。触发词：改目录名、重命名文件夹、迁移工作空间、junction 重连、改名后打不开、目录改名。
agent_created: true
---

# 目录改名 + junction 重连工作流

> 2026-08-22 实战固化（康哥地盘 08-WorkBuddy知识库 → 08-九思搭档知识库）。

## 何时用
- 改含 junction/symlink 的目录名
- WorkBuddy 工作空间 / 地盘路径迁移
- 改名后应用打不开（报 `ENOENT: mkdir '...junction...'`）

## 根因（先判断是不是这个病）
WorkBuddy 启动时 `ensureWorkbuddyDataDirs` 会 `mkdir ~/.workbuddy/skills`。
若只改目录名、不重连 junction → 软链接悬空 → mkdir 报 ENOENT → 主进程崩溃。
**证据**：`C:\Users\Admin\.workbuddy\logs\Crash-Log\crash-report-main-*.json` 的 errorMessage。

## 执行步骤（原子化，5 步）

1. **杀进程**：`taskkill /F /IM WorkBuddy.exe` + 等 2 秒（否则目录被锁，改名 Permission denied）
2. **清空壳**：新目录存在且为空 → 删除（非空则中止，防丢数据）
3. **改名**：`os.rename(OLD, NEW)`（Python UTF-8 原生支持中文）
4. **立即重连 junction**（紧跟改名，零间隙）：
   - 删旧链接（junction 用 rmdir，symlink 用 unlink）
   - `mklink /J <link> <target>`（subprocess 传 Unicode 参数，不乱码）
5. **验证**：新目录 + junction 能列出内容 + 技能库可访问

## 关键代码（复制即用）

```python
import ctypes, os, subprocess
FILE_ATTRIBUTE_REPARSE_POINT = 0x400

def is_reparse_point(path):
    attrs = ctypes.windll.kernel32.GetFileAttributesW(path)
    return attrs != 0xFFFFFFFF and bool(attrs & FILE_ATTRIBUTE_REPARSE_POINT)

def remove_junction(path):
    if not os.path.lexists(path): return True
    if not is_reparse_point(path): return False  # 真目录不删
    for fn in (lambda: os.rmdir(path), lambda: os.unlink(path)):
        try: fn(); return True
        except OSError: continue
    return subprocess.run(["cmd","/c","rmdir",path]).returncode == 0

def make_junction(link, target):
    return subprocess.run(["cmd","/c","mklink","/J",link,target], capture_output=True).returncode == 0
```

## 坑清单（避免重踩）

| 坑 | 解法 |
|---|---|
| `os.path.islink()` 对 junction 返回 False | 用 ctypes GetFileAttributesW + REPARSE_POINT(0x400) 判断 |
| bat 写中文（UTF-8）→ cmd GBK 乱码 | bat 纯 ASCII 启动器 + Python 核心逻辑 |
| 漏改状态文件里的旧路径 | 见下方"路径引用同步清单" |
| WorkBuddy 自动建空壳挡路 | 脚本里自动清空壳 |
| 历史快照/日志/审计里的旧路径 | **不改**（破坏 undo/版本/审计，且不影响运行）|

## 路径引用同步清单（改名必查，一个不漏）

- `~/.workbuddy/app/app-config.json`（defaultWorkspacePath）
- `~/.workbuddy/USER.md`（每会话注入）、`MEMORY.md`（跨会话）
- `~/.workbuddy/workbuddy.db`（sessions.cwd 等所有表，用 sqlite REPLACE）
- `~/.workbuddy/sessions.json` + sessions/*.json、artifact-index/*.json
- automation（db 的 automations 表：prompt + cwds）
- OB 文档 + 工作空间 memory 日志

## 验证清单（改名后必查）

1. 目录名唯一正确，旧目录消失
2. junction 指向新路径，能列出技能
3. WorkBuddy 正常打开
4. 全盘 grep 旧路径，功能文件零残留（历史快照除外）
