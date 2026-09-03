# 词汇生长 · Android APK 打包指南（本机执行）

>  adapted from「我能说英语」APK打包指南（同作者同流程，已验证可行）。
> 沙箱无 JDK / Android SDK，出包必须在本机完成。
> 产物：可直装 APK，桌面图标 = 小苏，离线可打开复习。

---

## 〇、前置环境（本机装一次）

| 工具 | 作用 | 装法 |
|---|---|---|
| Node.js 18+ | 跑 Capacitor CLI | 已有则跳过 |
| JDK 17 | Android 构建依赖 | `scoop install openjdk17` 或 Adoptium 官网 |
| Android SDK | 编译 APK | Android Studio 装「Android SDK Command-line Tools」+ Platform（API 35） |
| Capacitor CLI | 原生壳工具 | `npm i -g @capacitor/cli` |

环境变量：`ANDROID_HOME` → SDK 目录；`JAVA_HOME` → JDK。

## 一、初始化（首次做一次）

在 `词汇生长/03-设计开发/` 下：

```bash
npm init -y
npm i @capacitor/core @capacitor/cli @capacitor/android
npx cap init "词汇生长" com.subujuan.vocab --webdir app
# 用 android-kit/capacitor.config.json 覆盖生成的（appId/appName 已配好）
```

## 二、生成安卓工程 + 塞入网页

```bash
npx cap add android
powershell -ExecutionPolicy Bypass -File vocab-growth-app/android-kit/sync-web.ps1
npx cap sync android
```

## 三、权限（如未自动加）

`android/app/src/main/AndroidManifest.xml` 确认含：

```xml
<uses-permission android:name="android.permission.INTERNET" />
<uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />
```
（词汇生长不需要 RECORD_AUDIO——开口说已降级为跟读自评，无需麦克风。）

## 四、签名密钥（⚠️ 必须离线备份！）

```bash
keytool -genkey -v -keystore vocab-release.keystore -alias vocab -keyalg RSA -keysize 2048 -validity 10000
```
**keystore 丢失 = 无法以同一身份发更新。** 备份到加密云盘/移动硬盘。

## 五、出发行版 APK

```bash
npx cap build android --release
```
产物：`android/app/build/outputs/apk/release/app-release.apk`。
分发：发给用户微信直接传文件安装（安卓允许），或挂到网页下载链接。

## 六、后续更新

- web 层改动 → 重跑 sync-web.ps1 + `npx cap sync android` → 重打 APK
- PWA（浏览器安装）用户：推送 GitHub 即自动更新，无需重打包

## 七、已知限制（同「我能说英语」）

| 项 | 说明 |
|---|---|
| WebView 内 Edge 神经音源 | 原生壳网络直连 bing 端点可能仍不通，自动回落百度 TTS（需联网） |
| 离线时发音 | TTS 需外网；复习/看板离线可用 |
| 语音识别 | 与微信同样受限，开口说为跟读自评，打包不改现状 |
| iOS | 无法侧载 APK；iPhone 用户走 PWA（Safari 添加到主屏幕）路径 |
