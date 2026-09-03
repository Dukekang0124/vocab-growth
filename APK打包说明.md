# 词汇生长 APK 打包说明

## 当前状态

✅ 已完成：
1. 评分引擎修复（语法基线 70 + 自然度基线 40 + 参考句对比 + 重配权重）
2. APK 图标修复（Python Pillow 生成自适应图标）
3. TTS Worker 代码创建（等待部署）

⏳ 待完成：
4. 打包 APK（需要本机 JDK 17 + Android SDK）

---

## APK 打包步骤

### 前置环境（本机装一次）

| 工具 | 作用 | 装法 |
|---|---|---|
| Node.js 18+ | 跑 Capacitor CLI | [官网下载](https://nodejs.org/) |
| JDK 17 | Android 构建依赖 | `scoop install openjdk17` 或 [Adoptium](https://adoptium.net/) |
| Android SDK | 编译 APK | Android Studio → "Android SDK Command-line Tools" + API 35 |
| Capacitor CLI | 原生壳工具 | 已安装（通过 npm） |

### 环境变量

```bash
set JAVA_HOME=C:\Program Files\Eclipse Adoptium\jdk-17.0.x
set ANDROID_HOME=C:\Users\你的用户名\AppData\Local\Android\Sdk
```

### 打包步骤

#### 1. 签名密钥（首次必须）

```bash
cd "D:\写作工具\知识管理\01-Projects-项目\求职与作品集\03-作品集\词汇生长\03-设计开发\vocab-growth-app"

keytool -genkey -v -keystore vocab-release.keystore -alias vocab -keyalg RSA -keysize 2048 -validity 10000
```

**重要**：keystore 丢失 = 无法以同一身份发更新。备份到加密云盘/移动硬盘。

#### 2. 构建 APK

```bash
npx cap build android --release
```

产物位置：`android/app/build/outputs/apk/release/app-release.apk`

---

## 已修复的问题

### 1. 评分引擎 ✅

**问题**：垃圾句子 "I go store." 仍得高分（70-80+）

**修复**：
- 语法基线从 100 → 70
- 自然度基线从 55 → 40
- 添加参考句对比（Levenshtein 相似度）
- 重配权重：参考句对比 0.25 + 自然度 0.30 + 语法 0.20 + 完整度 0.15 + 词汇 0.10

**验证结果**：
- "I go store." → 49（D）
- "I saw a dolphin." → 61（C）
- "We saw dolphins and they swam away." → 94（A）

### 2. APK 图标 ✅

**问题**：桌面图标显示旧设计（小苏 + 绿色新芽）

**修复**：
- 使用 Python Pillow 生成完整的 Android 自适应图标
- 5个密度的 launcher 图标（mdpi/hdpi/xhdpi/xxhdpi/xxxhdpi）
- 自适应图标 foreground + XML 配置
- 已复制到 Capacitor Android 资源目录

### 3. APK 发音 🔴 待部署 TTS Worker

**问题**：说法库/听示范发音没有声音

**根本原因**：
- 前端代码引用的 TTS Worker 不存在：`https://vocab-tts.kang7108558.workers.dev/?u=`
- 导致所有音频播放失败

**解决方案**：

#### 方案 1：使用已有的 TTS Worker（推荐）

英语开口练已有 TTS Worker：`https://kaikou-tts.kang7108558.workers.dev/`

修改 `app.js` 第 318 行：
```javascript
var TTS_PROXY = 'https://kaikou-tts.kang7108558.workers.dev/?u=';
```

#### 方案 2：部署新的 TTS Worker

```bash
cd "D:\写作工具\知识管理\01-Projects-项目\求职与作品集\03-作品集\词汇生长\cloudflare-workers"

# 登录 Cloudflare
npx wrangler login

# 部署 Worker
npx wrangler deploy
```

部署成功后会返回 Worker URL，类似：
```
https://vocab-tts-xxxxx.workers.dev
```

修改 `app.js` 中的 TTS_PROXY。

---

## 文件清单

### 已创建的文件

```
词汇生长/cloudflare-workers/
├── tts-proxy.js          # TTS Worker 代码
├── wrangler.toml         # Worker 配置
└── 部署指南.md           # 详细的部署说明

词汇生长/03-设计开发/vocab-growth-app/
├── generate-icons.py     # 图标生成脚本
├── APK打包说明.md        # 本文档
├── capacitor.config.json # Capacitor 配置
└── resources/
    ├── icon-512.png      # 源图标（小苏）
    ├── icon-192.png
    ├── ic_launcher-*.png # 生成的 launcher 图标
    ├── ic_launcher_foreground.png
    └── ic_launcher.xml   # 自适应图标配置
```

### 已同步到 Android 工程

```
android/app/src/main/res/
├── mipmap-mdpi/ic_launcher.png
├── mipmap-hdpi/ic_launcher.png
├── mipmap-xhdpi/ic_launcher.png
├── mipmap-xxhdpi/ic_launcher.png
├── mipmap-xxxhdpi/ic_launcher.png
├── mipmap-xxhdpi/ic_launcher_foreground.png
├── mipmap-xxhdpi/ic_launcher.xml
└── values/colors.xml     # 白色背景
```

---

## 验证清单

打包完成后，验证以下功能：

- [ ] 桌面图标显示"小苏 + 绿色新芽"（自适应图标）
- [ ] 说法库点击"播放"按钮能听到英文朗读
- [ ] 提交错误句子（如 "I go store."）得低分（< 60）
- [ ] 提交正确句子（如 "I saw a dolphin."）得中等分（60-70）
- [ ] 提交完美句子（如 "We saw dolphins and they swam away."）得高分（> 90）

---

## 分发方式

### 方式 1：微信直接传文件

1. 将 `app-release.apk` 发送到微信
2. 在安卓手机上点击文件直接安装

### 方式 2：云盘下载

1. 上传 `app-release.apk` 到百度网盘/阿里云盘
2. 分享链接给用户

### 方式 3：GitHub Release

1. 将 `app-release.apk` 添加到 GitHub Release
2. 用户从 Release 页面下载

---

## 后续更新

### Web 层改动

```bash
# 1. 修改代码
# 2. 同步到 Android
npx cap sync android

# 3. 重新打包
npx cap build android --release
```

### PWA 用户

- 推送到 GitHub Pages
- PWA 用户自动更新，无需重打包

---

## 注意事项

1. **Keystore 备份**：必须离线备份，丢失无法发更新
2. **TTS Worker**：必须部署成功，否则发音无声音
3. **网络权限**：确保 AndroidManifest.xml 包含 `INTERNET` 权限
4. **签名密钥**：每次打包使用同一 keystore，否则无法更新
