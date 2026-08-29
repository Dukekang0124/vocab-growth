# 交接文档（豆包）· PWA 化 + APK 直装就绪

> 英语开口练阶段二收尾的延伸：把 web 版做成「可安装 + 可离线 + 可出 APK」形态。
> 沙箱无 tty / 无 Android SDK，出包需你本机；本次仅推 web 侧改动（PWA + 落地页），APK 出包留待康哥本机按指南执行。

## 一、本次改动（本地提交 `ad9cd76`，父 `78d9080`）

| 文件 | 作用 |
|---|---|
| `index.html` | head 加 `<link rel="manifest">` + `mobile-web-app-capable`；init 安全路径注册 SW、启动版本检查；新增 `APP_VERSION='1.4.1'`、`registerSW()`、`checkUpdate()`（DOM 就绪守卫内，零功能改动） |
| `manifest.webmanifest` | PWA 清单：名称/图标/standalone/深底主题色 |
| `sw.js` | Service Worker：同源 network-first 缓存，离线可开；外源 TTS CDN 不缓存 |
| `icon-192.png` / `icon-512.png` | PWA 安装图标（纯标准库生成，无依赖） |
| `version.json` | 版本号 `1.4.1`，供 app 启动时比对更新 |
| `download.html` | 下载落地页：PWA 安装指引 + APK 直链（占位，出包后启用） |
| `_headers` | 给 `sw.js`/`version.json` 加 `no-cache`，避免更新滞后 |

## 二、验证（九思已做）

- `index.html` 内联脚本 `node --check` → SYNTAX_OK
- 图标 PNG 尺寸 192/512 合法；manifest/version.json JSON 合法；sw.js 含 install/fetch 监听
- **补丁实测**：在 `78d9080` 上 `git apply` 本目录 `0001-*.patch` → `index.html` MD5 `07b01e5a...` 与目标逐字节一致（MATCH_OK），其余新增文件齐全；已 `reset --hard ad9cd76` 还原，工作树干净

## 三、你执行步骤

1. `git fetch origin` → 确认远程 `origin/main` 仍是 `78d9080`（推前务必 `git ls-remote origin` 核对，别信本地 tracking）
2. 应用补丁：`git apply` 本目录 `0001-feat-PWA-manifest-SW-APK.patch`（或整文件兜底：把本目录同名文件覆盖进仓库根目录）
3. `git add -A` → `git commit`（保留我的 commit message）
4. `git push origin main`（普通 fast-forward，勿强推）
5. 回报 `git log --oneline -3 origin/main` + 线上 `https://english-speaking-app-e37.pages.dev` 验证（CDN 缓存 5 分钟，用无痕/Ctrl+F5）
   - 线上应能看到：① 安卓 Chrome 地址栏出现「安装」图标；② `/download.html` 可访问；③ 离线（断网）刷新仍能打开应用

## 四、完成标准

- 远程 HEAD = `ad9cd76`
- 线上 PWA 可安装、可离线打开、版本检查无报错

## 五、回滚

- Cloudflare Pages → Deployments 选历史版本 Rollback；或 `git revert ad9cd76 && git push`。全程未用 force push。

## 六、不在本次范围（已在仓库留档）

- **APK 出包**：`英语开口练/APK打包指南.md` + `capacitor.config.json` + `android-build/`（sync-web.ps1、assetlinks.json 模板）。需康哥本机装 Android SDK 后按指南出包，产出 `app-release.apk` 放回仓库根并改 `download.html` 链接。
- **推送/打卡提醒**：本期未做（应用当前零推送功能，属新增需求）。

## 七、关键 MD5 锚点

- 目标 `index.html` MD5 = `07b01e5ae93ec2f404f0ec213673c637`
- 远程当前 HEAD = `78d9080`（推前再核对一次）
