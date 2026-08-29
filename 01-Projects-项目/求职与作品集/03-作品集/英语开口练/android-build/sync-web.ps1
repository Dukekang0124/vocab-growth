# sync-web.ps1 —— 把最新网页(index.html)塞进 Capacitor 原生壳
# 用法：在 capacitor 工程根目录（含 android/ 文件夹）下运行
#   powershell -ExecutionPolicy Bypass -File sync-web.ps1
# 说明：复制 english-speaking-app/index.html 到
#   android/app/src/main/assets/public/index.html
# 并去掉 PWA 的 <link rel="manifest">（原生壳不需要，避免 404）。
$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$src  = Join-Path $root 'english-speaking-app\index.html'
$destDir = Join-Path $root 'android\app\src\main\assets\public'
$dest = Join-Path $destDir 'index.html'

if (-not (Test-Path $src)) { Write-Error "未找到源文件: $src"; exit 1 }
if (-not (Test-Path $destDir)) { New-Item -ItemType Directory -Path $destDir | Out-Null }

$html = Get-Content $src -Raw -Encoding UTF8
# 去掉 PWA manifest 链接（原生壳不需要）
$html = $html -replace '<link rel="manifest" href="manifest.webmanifest">\r?\n', ''
Set-Content -Path $dest -Value $html -Encoding UTF8
Write-Host "✅ 已同步网页到原生壳: $dest"
Write-Host "   下一步: npx cap sync android"
