# 交接文档：品牌升级 v1.5.0

## 背景
App 进行品牌升级：名称从「英语开口练」改为「我能说英语」，App 图标替换为「苏不倦」IP 形象（皮克斯风格 3D 卡通男孩）。

## 起始点
远程 HEAD：`ea99743`（补 privacy 隐私页，已上线）

## 前置条件
- 有该仓库 `main` 分支的写权限
- 沙箱 `english-speaking-app-github` 目录已处于干净状态（当前已 commit，待 push）

## 改动内容
| 文件 | 改动 |
|---|---|
| `index.html` | title/og:title/og:site_name/logo文字/APP_VERSION(1.4.1→1.5.0) |
| `manifest.webmanifest` | name/short_name 改名 |
| `sw.js` | 注释改名 |
| `privacy.html` | title/h1/正文 改名 |
| `download.html` | title/img alt/h1/步骤文案/版本号(1.4.1→1.5.0) |
| `version.json` | version(1.4.1→1.5.0)/note 改名 |
| `icon-512.png` | **新图标**：苏不倦 IP 形象（原图标 MD5 `a141e5f3`，新图标 MD5 `c9d639cd`）|
| `icon-192.png` | **新图标**（原 MD5 `6391a597`，新图标 MD5 `a4066b45`）|

## 分步操作
1. 在本地仓库执行：
   ```
   git fetch origin
   git checkout main
   git pull origin main
   git apply --reject ../交接-品牌升级v1.5.0/brand-upgrade.patch
   # 如果有冲突文件，直接用完整文件覆盖（目录下的 index.html 等 8 个文件）
   git add -A
   git commit -m "feat: 品牌升级 - 改名'我能说英语' + 新App图标（苏不倦IP形象）"
   git push origin main
   ```

2. 推送成功后等待约 5 分钟（Cloudflare Pages CDN 缓存），验证：
   - 首页标题显示「我能说英语 · 300词就能开口」
   - 桌面图标为新 IP 形象（皮克斯风格男孩）
   - `/privacy.html` 和 `/download.html` 名称已更新

## 完成标准
- 远端 `main` 最新 commit hash 以 `9a61c0f` 开头（可 `git log --oneline -1` 确认）
- 线上页面标题、manifest、图标均为新版
- 旧名「英语开口练」在全站零出现（除技术标识 `kaikou*`）

## 已踩坑
- **图标生成顺序**：必须先改图标 + push 上线，再回 PWABuilder 点 Generate。顺序反了 = 丑图标被烤进 APK + keystore 已生成，改图标须重出包并上传同一个 keystore。
- **版本同步**：`index.html` 的 `APP_VERSION` 与 `version.json` 的 `version` 必须一致，否则用户侧误弹「有新版本」横幅。本版：两者均改为 `1.5.0`。

## 关键 MD5（验收锚点）
| 文件 | 新 MD5 |
|---|---|
| `icon-512.png` | `965022bae4908b9eb67a899116334570` |
| `icon-192.png` | `d7179e143467278030bf989b6bd2df77` |
| `index.html` | `fc6ca8720bf43add73e5aa98e32fd4b5` |

## 回滚方案
如需回滚，执行：
```
git revert 9a61c0f
git push origin main
```
或直接 push 上一版本 `ea99743` 的内容（但会丢失隐私页，不推荐）。
