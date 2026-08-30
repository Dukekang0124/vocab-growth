# 把最新 web 层复制进 Capacitor 的 webDir（app/）
# 原生壳不需要 PWA manifest 与 Service Worker，复制的 index.html 里去掉这两处引用
$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot   # vocab-growth-app/
New-Item -ItemType Directory -Force -Path "$root\android-kit\app" | Out-Null

$html = Get-Content "$root\index.html" -Raw -Encoding UTF8
$html = $html -replace '<link rel="manifest"[^>]*>', ''
$html = $html -replace "navigator\.serviceWorker\.register\('sw\.js'\)[^;]*;", ''
Set-Content "$root\android-kit\app\index.html" $html -Encoding UTF8

# 一并复制运行依赖（js/css/assets 与 index.html 同级引用，需保持相对结构）
Copy-Item "$root\css" "$root\android-kit\app\css" -Recurse -Force
Copy-Item "$root\js" "$root\android-kit\app\js" -Recurse -Force
Copy-Item "$root\assets" "$root\android-kit\app\assets" -Recurse -Force

Write-Host "sync done -> android-kit/app/"
