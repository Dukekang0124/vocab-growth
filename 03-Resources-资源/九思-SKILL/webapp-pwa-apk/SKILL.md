---
name: webapp-pwa-apk
description: 把一个已上线的单文件 HTML web app（无框架无构建）做成「可安装 PWA + 可离线」并准备好 Android APK 出包脚手架。适用于康哥要求"打 APK / 装到手机上 / 离线能用 / 加到主屏幕"时。含可行性判定、PWA 改造、图标生成、版本更新机制、下载落地页、Capacitor 出包指南与签名/分发要点。
agent_created: true
---

# 单文件 Web App → PWA + Android APK

## 何时用
用户提出"能不能打成 APK""装到手机""离线能用""加到主屏幕""应用商店上架"等需求，且对象是单文件 HTML（无框架无构建、部署在 Cloudflare Pages 之类静态托管）。

## 核心结论（先给结论，别绕）
对单文件 HTML app：**技术可行（FEASIBLE）**，可零业务改写打进 APK。真正限制只有三个：
1. **Android 系统 WebView 禁用 Web Speech TTS**（Chromium #710238）。主音源若是 CDN `<audio>` 照常出声；只有 `speechSynthesis` 兜底在原生壳失效。
2. **推送往往是"新增"不是"保留"**——先 grep 确认应用到底有没有 `Notification`/`FCM`/`serviceWorker.push`。几乎没有纯前端 app 真有推送，别把"保留推送"当既有功能。
3. **离线能力通常为零**（无 SW / 无 manifest），需补。

功能存活判定口径：列出矩阵（离线 / localStorage / TTS / 录音 / 推送 / 更新），逐项标 ✅保留 / ⚠️降级 / ❌需新建。

## 执行流程

### 1. 能力审计（只读，别改）
grep 确认：`localStorage` / `IndexedDB`（持久化）、`serviceWorker` / `manifest`（是否已有 PWA）、`fetch` / `new Audio(` / 外部 CDN（网络依赖）、`getUserMedia` / `MediaRecorder`（麦克风）、`Notification` / `FCM`（推送）、`<script src=` / `import`（是否真·零依赖）。

### 2. PWA 改造（web 侧，沙箱内可全做）
- `manifest.webmanifest`：`name` / `short_name` / `icons` / `display:"standalone"` / `start_url:"/"` / `scope:"/"` / `theme_color` / `background_color`。
- `sw.js`：**同源 network-first**（在线即最新）、失败回退缓存（离线可开）；**外源 CDN 不缓存**（离线本就用不了，缓存了反而脏）。
- head 加 `<link rel="manifest" href="manifest.webmanifest">` + `<meta name="mobile-web-app-capable" content="yes">`。
- **注册 SW + 版本检查必须放进已有的 DOM 就绪路径（DOMContentLoaded 守卫）内，并 try/catch 兜底**——见下方"铁律"。

### 3. 图标生成（沙箱常无 PIL）
用 Python **标准库 `struct` + `zlib` 手写 PNG 编码器**（RGBA 像素缓冲 → zlib 压缩 → IHDR/IDAT/IEND chunk + CRC32），零依赖生成 192/512。几何图形（圆角底 + 圆形气泡 + 尾三角 + 描边）即可，不必画字。
校验：`unpack('>II', data[16:24])` 读宽高确认尺寸合法。

### 4. 版本更新机制
- 站内 `version.json` + 应用内 `APP_VERSION` 常量，启动比对不符弹横幅跳落地页。
- **铁律：改 web 时两者必须同步 +1**，否则用户侧会误弹"有新版本"。
- 托管平台的缓存头（如 Cloudflare `_headers`）必须给 `sw.js` / `version.json` 单独设 `no-cache`，否则全站 5 分钟缓存会让更新滞后。

### 5. 下载落地页
`download.html`：PWA 安装指引（分步）+ APK 直链 + **微信内"在浏览器打开"提示**（微信不支持 PWA 安装）+ 离线卖点 + 隐私政策位。APK 直链可先占位，注明出包后启用。

### 6. APK 出包脚手架（沙箱做不了，留档给用户本机）
沙箱通常**无 JDK / 无 Android SDK**，出不了包 → 产出配置 + 指南，用户本机执行：
- `capacitor.config.json`（appId / appName / webDir / androidScheme）
- 同步脚本（把最新 `index.html` 复制进 `android/app/src/main/assets/public/`，**并去掉 PWA 的 manifest 链接**避免原生壳 404）
- 指南 md：前置环境 → `cap init` / `cap add android` → 同步 → `AndroidManifest` 权限（`RECORD_AUDIO` / `INTERNET`）→ `keytool` 生成 keystore → `cap build android --release` → 分发 → 更新机制
- `assetlinks.json` 模板（后续上 TWA/商店做 Digital Asset Links 校验用）

## 分发方案选型（中国用户 / solo 运营语境）
| 方式 | 签名 | 审核 | 适用 |
|---|---|---|---|
| **A 自签名 APK 官网直下** | 自有 keystore | **无** | ✅ 主推：零审核、随时发版、微信可分享 |
| **D PWA 添加到主屏幕** | 无需 | 无 | ✅ 轻量入口，更新随站点自动生效 |
| B 国内商店（华为等，TWA） | 各店自有 | 1–3 天 + 隐私政策 | 第二阶段，增信/搜索曝光 |
| C Google Play | AAB + Play App Signing（强制） | $25 + 审核 | ❌ 国内无 GMS，仅出海 |

推荐 **A + D**，B/C 按需要再做。

## 铁律与踩坑
- **init 必须等 DOM 就绪**：单文件 app 的 `<script>` 若在中上部，同步 init 只能引用它**之前**的 DOM。新增 SW 注册/版本检查务必放进 `DOMContentLoaded` 守卫内并 try/catch，否则失败会中断整条 init → 全用户首屏空白（本项目曾出 P0：`78d9080`）。
- **验收口径是"清空 localStorage 全新加载后首屏非空白 + 0 JS error"**，不是 `node --check` 通过——语法检查查不出解析期 DOM 顺序问题。
- **keystore 必须离线备份**：丢失 = 无法以同一身份发更新，用户得卸载重装。
- **验证 patch 能否还原目标提交**：`git checkout <父commit> -- .` **不会删除父提交中不存在的新增文件**（它们在 index 里是 tracked），`git clean -fd` 也删不掉 → `git apply` 报 `already exists in working directory`。**正解用 `git reset --hard <父commit>`**，验证完 `git reset --hard <目标commit>` 还原。
- **JSON 校验别用 `require()`**：`require('./x.webmanifest')` 会被 Node 当 JS 解析报 SyntaxError，误判文件坏。用 `JSON.parse(fs.readFileSync(p,'utf8'))`。
- **推送别当"保留"**：先 grep 确认。要做 = Firebase 项目 + FCM + 后端发消息（约 1–2 周增量），单列第二阶段。

## 产出清单（交给用户）
PWA 四件套（manifest / sw.js / 两张图标）、版本文件、下载落地页、缓存头覆盖、APK 脚手架（config + 同步脚本 + 指南）、交接文档（若推送需代推）。
