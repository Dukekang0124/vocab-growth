# 交接文档（豆包）· 英语开口练 阶段二立住 + 废话干扰项清理

> 九思（开发侧）已在本地完成代码改动并提交，沙箱无法 `git push`（无 tty / push 出口挂起）。
> 现把物料交给你，麻烦**推上去**即可，不用写代码。

---

## 1. 一句话任务
把本地已提交的两个 commit（`1aa300c` 阶段二立住 + `697790d` 废话干扰项清理）推到 `Dukekang0124/english-speaking-app` 的 `main` 分支。

## 2. 项目背景与当前进度
- **产品**：英语开口练 —— 纯前端单文件 web app（`index.html`，无框架无构建）。
- **部署架构**：Cloudflare Pages，仓库 `main` 分支 push 后**自动部署**，线上 `https://english-speaking-app-e37.pages.dev`。
- **本次两轮提交内容**：
  - `1aa300c` 阶段二立住：内容口语化（地道美式，30 场景 120 句）、全站 319 句美式音标 + 渲染、`{{name}}` 变量 / 新手引导 / 分数持久化、TTS+录音加固。
  - `697790d` 废话干扰项清理：DIALOGS 选择题里 66 条"同义反复/答非所问"的 `correct:false` 干扰项（`Water is wet.`/`35 is a number.`/`Stairs have steps.`/`Cars drive on roads.` 等），替换为贴合题干、自然但答错的回复。**只动 `text:` 字段，没碰 `correct:true`，没加 phonetic**（MC 选项本就不渲染音标），`correct:true`/`correct:false` 仍为 120/120。
- **已核实状态**：
  | 项 | 值 |
  |---|---|
  | 远程真实 HEAD（`git ls-remote origin`） | `bbcb1954a9153cd802e995505916b9866535f297`（你上次代推的，待你再核对）|
  | 本地 HEAD（部署副本 english-speaking-app-github） | `697790d`（基于 bbcb195，未分叉，fast-forward）|
  | 本地工作树 | 干净（index.html md5 = `3d02be5b73b24055b82dc34db24b75a2`）|
- **阻塞点**：沙箱 `git push origin main` 在 push 出口挂起（无 tty 弹不出凭据），故转交你推送。

## 3. 起始阶段与前置条件
- 权限：对该 GitHub 仓库有 **write / push** 权限（你此前已成功代推 `bbcb195`）。
- 物料目录（同目录）：
  - `english-speaking-app-github/`（即部署副本仓库，**本地已含两个 commit**，直接 push 即可）
  - `0001-feat-name-TTS.patch` —— `1aa300c` 补丁（已验证可逐字节还原）
  - `0002-fix-DIALOGS-66.patch` —— `697790d` 补丁（已验证可逐字节还原）
  - `index.html` —— 兜底完整文件（与目标 `697790d` 内容一致）
- 不需要任何代码改动，只需推送。

## 4. 分步操作指引
**方案 A（直接 push 部署副本，最简单）**
1. 进入部署副本工作树，先 `git ls-remote origin` 核对远程 HEAD 仍是 `bbcb195`（若已变，先 `git fetch` 再判断，**禁止强推**）。
2. 确认 `git log --oneline -3` 本地 HEAD = `697790d`（含 `1aa300c`）。
3. `git push origin main` → 预期：两个 commit 一起推上、push 成功。

**方案 B（patch 兜底，若副本不可用）**
1. 在自己有推送权的仓库工作树，`git ls-remote origin` 核对远程 HEAD 仍是 `bbcb195`。
2. `git apply 0001-feat-name-TTS.patch` → `git apply 0002-fix-DIALOGS-66.patch` → 预期 index.html 被更新。
3. `git add index.html && git commit` 串成两次提交（或直接用方案 A 的副本）。
4. `git push origin main`。
5. 若 `git apply` 报 `Patch failed`，改用 `index.html` 整文件覆盖后 commit + push。

## 5. 完成标准
- [ ] 代码层：`git log --oneline -3 origin/main` 能看到 `697790d` 与 `1aa300c`，`git diff --stat` 仅 `index.html` 改动。
- [ ] 部署层：push 后约 5 分钟，无痕/Ctrl+F5 访问 `https://english-speaking-app-e37.pages.dev` 能看到新版（每日句下方出现美式音标；选择题误项不再是废话）。
- [ ] 功能层（可选，真机无法回归，交康哥）：iPhone Safari / 安卓微信 TTS 出声、录音回放、盲说打卡、分数持久化。

## 6. 注意事项 / 回滚
- **不要强推**：只用普通 push；远程若领先，先 `git fetch` 核对，分叉则停下问康哥。
- 回滚首选：`git revert HEAD && git push`（保留历史）。
- CDN 缓存：push 完线上仍是旧版属正常，等缓存过期或无痕访问，勿误判部署失败（线上 `_headers` 设 `max-age=300`）。
- 已知坑：`git am` 在本仓库会失败并卡 am 冲突态，务必用 `git apply`；`git -C <中文路径>` 会静默失效，中文路径先 `cd` 进入再执行。

## 速查表（验收锚点）
| 文件 | MD5 |
|---|---|
| index.html（目标 commit 697790d） | `3d02be5b73b24055b82dc34db24b75a2` |
| 基线 bbcb195 的 index.html | `0888a03bd9d35882c0b193ff04bc23aa` |

> 验证记录：沙箱内 `git checkout bbcb195 -- index.html` → 顺序应用 `0001`+`0002` patch → md5 命中 `3d02be5b...`（`MATCH_OK`），已恢复工作树至 `697790d`。
