# 词汇生长 APK 打包脚本
# 在 Windows PowerShell 中运行此脚本

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "词汇生长 APK 打包脚本" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# 检查 Java
Write-Host "[1/5] 检查 Java 环境..." -ForegroundColor Yellow
try {
    $javaVersion = java -version 2>&1 | Select-String "version"
    Write-Host "✓ Java 已安装: $javaVersion" -ForegroundColor Green
} catch {
    Write-Host "✗ Java 未安装，请先安装 JDK 17" -ForegroundColor Red
    Write-Host "  下载地址: https://adoptium.net/" -ForegroundColor Gray
    exit 1
}

# 检查 Android SDK
Write-Host ""
Write-Host "[2/5] 检查 Android SDK..." -ForegroundColor Yellow
if ($env:ANDROID_HOME) {
    Write-Host "✓ ANDROID_HOME 已设置: $env:ANDROID_HOME" -ForegroundColor Green
} else {
    Write-Host "✗ ANDROID_HOME 未设置" -ForegroundColor Red
    Write-Host "  请设置环境变量: $env:ANDROID_HOME = 'C:\Users\$env:USERNAME\AppData\Local\Android\Sdk'" -ForegroundColor Gray
    exit 1
}

# 检查 Gradle
Write-Host ""
Write-Host "[3/5] 检查 Gradle..." -ForegroundColor Yellow
try {
    $gradleVersion = gradle --version 2>&1 | Select-String "Gradle"
    Write-Host "✓ Gradle 已安装: $gradleVersion" -ForegroundColor Green
} catch {
    Write-Host "✗ Gradle 未安装" -ForegroundColor Red
    Write-Host "  请安装 Android Studio，它会自动安装 Gradle" -ForegroundColor Gray
    exit 1
}

# 同步文件
Write-Host ""
Write-Host "[4/5] 同步 Web 文件到 Android 工程..." -ForegroundColor Yellow
npx cap sync android
if ($LASTEXITCODE -ne 0) {
    Write-Host "✗ 同步失败" -ForegroundColor Red
    exit 1
}
Write-Host "✓ 文件同步完成" -ForegroundColor Green

# 签名密钥检查
Write-Host ""
Write-Host "[5/5] 检查签名密钥..." -ForegroundColor Yellow
$keystorePath = ".\vocab-release.keystore"
if (Test-Path $keystorePath) {
    Write-Host "✓ 签名密钥已存在: $keystorePath" -ForegroundColor Green
} else {
    Write-Host "⚠ 签名密钥不存在，将创建新的密钥" -ForegroundColor Yellow
    Write-Host "  请输入密钥密码（建议: vocab1234）" -ForegroundColor Gray
    $password = Read-Host "密码"
    if ([string]::IsNullOrWhiteSpace($password)) {
        $password = "vocab1234"
    }

    keytool -genkey -v -keystore vocab-release.keystore -alias vocab -keyalg RSA -keysize 2048 -validity 10000 -storepass $password -keypass $password
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✓ 签名密钥创建成功" -ForegroundColor Green
    } else {
        Write-Host "✗ 签名密钥创建失败" -ForegroundColor Red
        exit 1
    }
}

# 构建 APK
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "开始打包 APK..." -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

$releaseApk = ".\android\app\build\outputs\apk\release\app-release.apk"

# 清理旧构建
Write-Host "清理旧构建..." -ForegroundColor Yellow
gradlew clean -p android

# 构建 Release APK
Write-Host "构建 Release APK（这可能需要 5-10 分钟）..." -ForegroundColor Yellow
gradlew assembleRelease -p android

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Green
    Write-Host "✓ APK 打包成功！" -ForegroundColor Green
    Write-Host "========================================" -ForegroundColor Green
    Write-Host ""
    Write-Host "APK 位置: $releaseApk" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "文件信息:" -ForegroundColor Yellow
    $apkInfo = Get-Item $releaseApk
    Write-Host "  文件大小: $([math]::Round($apkInfo.Length / 1MB, 2)) MB"
    Write-Host "  创建时间: $apkInfo.CreationTime"
    Write-Host ""
    Write-Host "下一步:" -ForegroundColor Yellow
    Write-Host "  1. 将 APK 发送到微信，在手机上直接安装" -ForegroundColor Gray
    Write-Host "  2. 或上传到云盘（百度网盘/阿里云盘）分享" -ForegroundColor Gray
    Write-Host "  3. 或上传到 GitHub Release 供用户下载" -ForegroundColor Gray
    Write-Host ""

    # 询问是否打开文件
    $open = Read-Host "是否立即打开 APK 文件？(y/n)"
    if ($open -eq 'y' -or $open -eq 'Y') {
        Start-Process $releaseApk
    }
} else {
    Write-Host ""
    Write-Host "✗ APK 打包失败" -ForegroundColor Red
    Write-Host "请检查错误信息，确保 Java 和 Android SDK 正确配置" -ForegroundColor Gray
    exit 1
}
