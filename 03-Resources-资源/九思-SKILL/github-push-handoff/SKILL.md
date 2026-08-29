---
name: github-push-handoff
description: 沙箱/无 tty 环境无法 git push 时，把未推送的 commit 打包成 patch + 完整文件 + 交接文档，交给有权限的 agent 或人独立完成推送。当出现 `could not read Username` / `terminal prompts disabled` / 凭据弹窗出不来 / 部署 bat 脚本失败 时调用。适用于任何 GitHub 项目的上线交接。
agent_created: true
---

# GitHub 推送受阻交接

## 何时用

出现以下任一情况：
- `git push` 报 `could not read Username for 'https://github.com': terminal prompts disabled`
- 无 tty 环境（沙箱/CI）弹不出凭据框
- 用户双击部署 bat 脚本失败，但你看不到报错截图
- 需要把代码交给另一个 agent（如豆包）或人去推

**先花 2 分钟确认真的推不了，别一上来就交接。**

## 第一步：逐项核实（必做，别猜）

```bash
git ls-remote origin              # ① 能否读？能读说明网络通
git push origin main 2>&1 | tail -3   # ② 看真实报错
cmdkey /list | grep -i git        # ③ Windows 凭据管理器有无缓存
ls ~/.ssh/                        # ④ 有无 SSH key
which gh                          # ⑤ gh CLI 是否可用
```

判定：
- ① 成功 + ② 报 Username → **真·凭据问题，走交接**
- ① 超时 → 网络抖动，**重试 2-3 次**再说（GitHub 443 会偶发 20s+ 超时）
- ③ 有缓存 → 试试 `GIT_TERMINAL_PROMPT=0 git push`，可能直接成

## 第二步：确认待推内容

```bash
git ls-remote origin            # ← 唯一可信的远程真实 HEAD
git log --oneline -1            # 本地 HEAD
git merge-base --is-ancestor <远程HEAD> HEAD && echo "fast-forward 安全"
git log --oneline <远程HEAD>..HEAD    # 待推 commit 列表
git diff --stat <远程HEAD>..HEAD      # 待改文件
```

> ⚠️ **绝不要信本地 `refs/remotes/origin/main`**——实测过它陈旧停在旧 commit，与服务器差 9 个提交。判断远程状态只用 `git ls-remote` 或先 `git fetch origin`。

若不是 fast-forward（已分叉）→ 停止，先问用户，禁止强推。

## 第三步：打包物料

```bash
mkdir -p <交接目录>
git format-patch -1 <commit> -o <交接目录>   # patch（保留中文 commit 信息）
cp <改动文件> <交接目录>/                     # 完整文件兜底
```

## 第四步：实测验证 patch（**不做这步不许交接**）

在真实仓库 detached HEAD 演练，确认 patch 能逐字节还原：

```bash
cd <repo>
BASE=$(git rev-parse HEAD~0) 2>/dev/null
git checkout -q <父commit>
md5sum index.html                    # 记基线 MD5
git apply "<交接目录>/xxx.patch"
md5sum index.html                    # 与目标比对
git checkout -q -- index.html && git checkout -q <原分支>   # 务必恢复
```

MD5 一致才算通过。**验证完必须恢复仓库并确认工作树干净。**

## 第五步：写交接文档

交接目录建 `README-交接文档（<接手方>）.md`，含 6 段：
1. **一句话任务** —— 接手方要干什么（通常只是推上去，不用写代码）
2. **项目背景与当前进度** —— 产品是啥、部署架构（push 触发什么 CI/CD）、已核实的状态表、**阻塞点**（把第一步的排查结果贴出来）
3. **起始阶段与前置条件** —— 从哪步开始、需要什么权限/工具、物料文件绝对路径
4. **分步操作指引** —— 方案A（patch，推荐）+ 方案B（整文件覆盖，兜底），每步写「操作 + 预期结果 + 不符怎么办」
5. **完成标准** —— 代码层/部署层/功能层三个 checklist，全满足才算完
6. **注意事项** —— 已踩的坑、验证命令、回滚方案（优先 `git revert`，禁 `push -f`）

关键 MD5 单独做「速查表」放附录，作为验收锚点。

## 第六步：给用户一句话启动语

单独给一句可直接复制发给接手方的话（见下方模板），别让用户自己去总结。

## 必写进文档的坑（都是实测踩出来的）

| 坑 | 症状 | 正解 |
|---|---|---|
| **`git am` 会失败** | `Patch failed at 0001`，仓库卡在 am 冲突态 | **用 `git apply`**；已卡住则 `git am --abort` |
| **`git -C <中文绝对路径>` 失效** | `cannot change to`，且静默产出空文件 | 空文件 MD5 = `d41d8cd98f00b204e9800998ecf8427e`，见此值即知中招。中文路径用 `cd` 进入后再执行 |
| **`git apply --directory=` 误判** | 输出 `Skipped patch` 但文件没改 | 进目标目录用相对路径 apply |
| **CDN/缓存延迟** | push 完访问线上仍是旧版 | 查 `_headers` 的 `max-age`；等缓存过期或用无痕/Ctrl+F5，勿误判部署失败 |
| **push 报错但其实是假失败** | `remote rejected ... cannot lock ref` | 先 `git fetch && git log origin/main -3` 核对，别盲目重复 push |

## 回滚方案（写进文档）

- 首选：`git revert HEAD` + push（保留历史，可再回滚）
- 紧急：`git reset --hard <旧commit>` + `git push -f` —— **仅限确认无他人改动，禁止随意强推**
- 最快：托管平台控制台回滚上一版本部署（不动 git 历史）

## 启动语模板

```
请读这份交接文档并完成任务：
<文档绝对路径>

物料在同目录下：xxx.patch（主推）+ index.html（兜底）。
先 git ls-remote origin 核对远程 HEAD 是 <xxx>，再动手。
完成后把 git log --oneline -3 origin/main 和线上验证结果回报给我。
```
