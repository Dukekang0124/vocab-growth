# 英语开口练 · Android APK 打包指南（本地执行）

> 沙箱无 JDK / Android SDK，出包必须在本机（Windows/Mac）完成。
> 本指南把 web 层（已做好的 `index.html`）打进原生壳，产出可直装 APK。
> 技术结论见 `计划文件/radiant-nebula-curie.md`：**可行**，改动量很小。

---

## 〇、前置环境（本机装一次）

| 工具 | 作用 | 装法 |
|---|---|---|
| Node.js 18+ | 跑 Capacitor CLI | 已有则跳过 |
| JDK 17 | Android 构建依赖 | `scoop install openjdk17` 或 Oracle/Adoptium 官网 |
| Android SDK | 编译 APK | Android Studio 装「Android SDK Command-line Tools」+ 一个 Platform（API 35） |
| Capacitor CLI | 把 web 包进原生壳 | `npm i -g @capacitor/cli` |

环境变量：`ANDROID_HOME` 指向 SDK 目录；`JAVA_HOME` 指向 JDK。

---

## 一、初始化 Capacitor 工程（首次做一次）

在 `英语开口练/` 目录下：

```bash
npm init -y
npm i @capacitor/core @capacitor/cli @capacitor/android
npx cap init "英语开口练" com.kaikou.english --webdir app
# 用仓库里的 capacitor.config.json 覆盖生成的（已配好 appId/appName）
```

`capacitor.config.json` 已就绪（appId=`com.kaikou.english`，webDir=`app`）。

## 二、生成安卓工程

```bash
npx cap add android
```
产物：`android/` 文件夹（原生壳，含 `AndroidManifest.xml`、Gradle）。

## 三、把网页塞进壳

```bash
powershell -ExecutionPolicy Bypass -File android-build/sync-web.ps1
npx cap sync android
```
`sync-web.ps1` 会复制最新 `index.html` 并去掉 PWA 的 manifest 链接（原生壳不需要）。

## 四、权限声明（如未自动加）

打开 `android/app/src/main/AndroidManifest.xml`，确认含：

```xml
<uses-permission android:name="android.permission.RECORD_AUDIO" />
<uses-permission android:name="android.permission.INTERNET" />
<uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />
```
（`RECORD_AUDIO` = 麦克风录音；`INTERNET` = TTS CDN 联网。）

## 五、生成签名密钥（⚠️ 必须离线备份！）

```bash
keytool -genkey -v -keystore kaikou-release.keystore \
  -alias kaikou -keyalg RSA -keysize 2048 -validity 10000
```
- 记住密码与 alias。
- **keystore 丢失 = 无法以同一身份发更新**（用户得卸载重装）。备份到加密云盘/移动硬盘。
- 记下签名 SHA256（用于后续 TWA 的 `assetlinks.json`）：
  ```bash
  keytool -list -v -keystore kaikou-release.keystore -alias kaikou
  ```

## 六、出发行版 APK

```bash
npx cap build android --release
```
按提示选 keystore（或手动 `apksigner` 签名生成的未签名 APK）。
产物：`android/app/build/outputs/apk/release/app-release.apk`。

## 七、分发

1. 把 `app-release.apk` 放到仓库根目录（即 `english-speaking-app/` 对应部署目录），命名为 `app-release.apk`。
2. 改 `download.html` 里 APK 按钮的 `href` 为 `/app-release.apk`（当前是占位）。
3. 提交 + 推 Cloudflare（走现有豆包交接流程），落地页即出现可下载 APK。

---

## 八、后续更新机制

- **日常文案/音标/逻辑改动**：只改 web 层 → 重跑 `sync-web.ps1` + `cap sync` + 重打 APK → 发新版。
- **自动提示更新**：app 启动拉 `version.json`，版本号不符弹「有新版本」横幅跳 `download.html`。改 web 时记得把 `index.html` 里的 `APP_VERSION` 和 `version.json` 的 `version` 同步 +1（如 `1.4.1` → `1.4.2`）。
- **PWA / TWA 用户**：改 Cloudflare 即自动生效，无需重打壳。

---

## 九、（第二阶段可选）TWA / 商店上架

- **TWA（华为/小米等国内商店）**：`npx @bubblewrap/cli init --manifest https://english-speaking-app-e37.pages.dev/manifest.webmanifest`，把 `android-build/assetlinks.json` 填好 SHA256 后放到站点 `.well-known/assetlinks.json`，构建上传商店。需开发者号 + 审核 + 隐私政策。
- **Google Play（出海）**：出 **AAB**（非 APK）+ Play App Signing 强制；`$25` 注册；国内基本不可达（无 GMS）。
- **推送（打卡提醒）**：接 `@capacitor/push-notifications` + Firebase 项目 + 后端发消息（约 1–2 周增量），本期未做。

---

## 十、已知限制（务必心里有数）

| 项 | 说明 |
|---|---|
| WebView TTS 兜底失效 | 原生壳（Capacitor/自写 WebView）下 Web Speech 被 Android 禁用；主音源（有道/Baidu CDN `<audio>`）照常出声，需联网。可后接 `@capacitor-community/text-to-speech` 补系统 TTS。 |
| 离线 TTS 不出声 | TTS CDN 需外网；地铁等弱网场景用「盲说模式」（不依赖麦克风/网络）照样练。 |
| 语音识别本就弱 | `webkitSpeechRecognition` 在 WebView/微信均不稳，app 已降级为自评，打包不改现状。 |
| keystore 丢失 | 无法同身份更新，必须备份。 |
| 微信内不支持 PWA 安装 | 引导用户「在浏览器打开」再装/加桌面。 |
