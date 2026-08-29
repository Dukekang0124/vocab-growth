# 英语开口练 · 部署上线操作指南（P0）

> 目标：**1 天内让真实用户可访问、可付费解锁的英语开口练**
> 架构：GitHub Pages（前端静态）+ Cloudflare Workers（卡密/API 后端）+ .xyz 域名 + Cloudflare 代理

---

## 0. 当前进度

| 环节 | 状态 | 文件 |
|---|---|---|
| 前端代码改造（解锁走云端） | ✅ 已完成 | `english-speaking-app/index.html` |
| 原始代码备份 | ✅ 已完成 | `english-speaking-app/index.html.bak-2026-08-27` |
| Workers 后端代码（P0+P1+P2 接口预留） | ✅ 已完成 | `cloudflare-workers/src/index.js` |
| Workers 配置文件 | ✅ 已完成 | `cloudflare-workers/wrangler.toml` |
| 域名购买 | ⏳ 待你操作 | — |
| Cloudflare 账号 | ⏳ 待你操作 | — |
| KV 命名空间创建 | ⏳ 待你操作 | — |
| Workers 部署 | ⏳ 待你操作 | — |
| 自定义域名绑定 | ⏳ 待你操作 | — |
| 前端代码 push 到 GitHub | ⏳ 待你操作 | — |

---

## 1. 前置准备（约 30 分钟）

### 1.1 你需要准备

- ✅ **一张银行卡**：买域名（约 ¥10）+ Cloudflare 不收费
- ✅ **一个邮箱**：用于 Cloudflare / 域名注册
- ✅ **本地 Git 环境**：用于推送代码到 GitHub
- ✅ **Node.js 18+**：用于 wrangler CLI（WorkBuddy 已自带 Node 22，可直接用）

### 1.2 已有资源确认

- ✅ GitHub 仓库：`https://github.com/Dukekang0124/english-speaking-app`（已有）
- ✅ GitHub Pages 已部署：`https://dukekang0124.github.io/english-speaking-app/`（已有，但国内不稳）

---

## 2. Step 1：购买 .xyz 域名（约 ¥10/年）

推荐平台：**腾讯云 / 阿里云 / Cloudflare Registrar** 任选一个。

### 推荐：Cloudflare Registrar（最省事）

- 登录 [dash.cloudflare.com](https://dash.cloudflare.com/) → 左侧 **Domain Registration** → **Register Domains**
- 搜索 `kaikou`（或你想要的名字）
- 选择 `.xyz` 后缀 → 加入购物车 → 结算（约 $1.5/年 ≈ ¥10）
- 付款后域名自动添加到你的 Cloudflare 账号，**自动启用 Cloudflare DNS**（省了手动配 DNS）

### 备选：腾讯云/阿里云

- 搜索 `kaikou.xyz` → 加入购物车 → 实名认证 → 付款
- 付款后**需要手动**把 DNS 切到 Cloudflare（步骤 5）

> 💡 **域名命名建议**：`kaikou.xyz` / `kaikou99.xyz` / `speak99.xyz` / `english999.xyz`，短、好记、与"开口"主题契合。挑一个未被占的就行。

---

## 3. Step 2：Cloudflare 账号 + 添加站点（5 分钟）

如果买域名时已注册 Cloudflare 账号，跳过此步。

1. 注册 [dash.cloudflare.com](https://dash.cloudflare.com/)（免费计划即可，Workers 也在免费额度内）
2. 左侧 **Workers & Pages** → 确认能进入
3. 左侧 **Workers & Pages** → 右侧顶部 **Create** → **Workers** → 输入子域（如 `kaikou-api`）→ 创建
   - 子域最终域名：`kaikou-api.your-subdomain.workers.dev`

---

## 4. Step 3：部署 Workers 后端（核心，20 分钟）

### 4.1 本地安装 wrangler CLI

```bash
npm install -g wrangler
# 验证
wrangler --version
```

### 4.2 登录 Cloudflare

```bash
wrangler login
```
会弹出浏览器授权页，按提示走完。

### 4.3 创建 KV 命名空间（3 个）

```bash
cd "D:\写作工具\知识管理\01-Projects-项目\求职与作品集\03-作品集-英语开口练\cloudflare-workers"

# 创建生产环境 KV
wrangler kv namespace create CARDS
wrangler kv namespace create PROGRESS
wrangler kv namespace create RATE

# 创建预览环境 KV（用于本地测试）
wrangler kv namespace create CARDS --preview
wrangler kv namespace create PROGRESS --preview
wrangler kv namespace create RATE --preview
```

每条命令会输出类似：
```
🌀 Creating namespace with title "CARDS"
✨ Success!
Add the following to your configuration file in your kv_namespaces array:
{ binding = "CARDS", id = "abc123xxxxxxxxxx" }
```

### 4.4 把 ID 填到 wrangler.toml

编辑 `wrangler.toml`，把 6 个 `REPLACE_WITH_REAL_*_ID` 替换成上一步得到的真实 ID。

### 4.5 设置 Secrets（ADMIN_KEY + 未来 ASR/LLM Key）

```bash
# 后台生成卡密的密钥（自定义强密码，务必记牢！）
wrangler secret put ADMIN_KEY
# 按提示输入你的强密码（如：k@k0u-2026-xYz!9K）

# P1 阶段启用火山引擎 ASR 时再设：
# wrangler secret put VOLC_APP_ID
# wrangler secret put VOLC_ACCESS_TOKEN

# P2 阶段启用豆包对话时再设：
# wrangler secret put DOUBAO_API_KEY
```

### 4.6 本地测试（可选但推荐）

```bash
wrangler dev
```
浏览器打开 `http://localhost:8787/api/card/verify?code=test&dev=test123`
应该返回：`{"ok":false,"msg":"卡密不存在，请检查输入"}`

### 4.7 部署到生产

```bash
wrangler deploy
```

成功后输出：
```
Published kaikou-api (x.xx sec)
  https://kaikou-api.your-subdomain.workers.dev
```

记下这个 URL，下一步要用。

---

## 5. Step 4：绑定自定义域名到 Workers（10 分钟）

把 Workers 绑到你的域名（如 `kaikou.xyz`），这样前端访问 `/api/*` 是同域请求，不会触发跨域。

1. Cloudflare Dashboard → **Workers & Pages** → 点 `kaikou-api` → 顶部 **Settings** → **Triggers** → **Custom Domains**
2. 点 **Add Custom Domain** → 输入 `kaikou.xyz`（或子域 `api.kaikou.xyz`）
3. Cloudflare 会自动添加 DNS 记录，等待几分钟生效

如果用 `kaikou.xyz` 作为主域，建议用**子域**绑 Workers（如 `api.kaikou.xyz`），主域绑 GitHub Pages。

### 调整前端 API_BASE

编辑 `english-speaking-app/index.html`，把：
```js
const API_BASE = '';
```
改为：
```js
const API_BASE = 'https://api.kaikou.xyz';  // 改成你的实际子域
```

---

## 6. Step 5：GitHub Pages 自定义域名（15 分钟）

### 6.1 创建 CNAME 文件

在 `english-speaking-app/` 目录下新建 `CNAME` 文件（无后缀），内容：
```
kaikou.xyz
```

### 6.2 推送到 GitHub

```bash
cd "D:\写作工具\知识管理\01-Projects-项目\求职与作品集\03-作品集-英语开口练\english-speaking-app"
git add .
git commit -m "feat: 接入云端卡密校验（Workers）+ P0部署"
git push origin main
```

### 6.3 GitHub 设置

1. 打开 `https://github.com/Dukekang0124/english-speaking-app/settings/pages`
2. **Custom domain** 输入 `kaikou.xyz` → Save
3. 等待 DNS 检查通过（首次可能要等几分钟到几小时）
4. 勾选 **Enforce HTTPS**（GitHub 自动签 Let's Encrypt 证书）

---

## 7. Step 6：Cloudflare DNS 配置（10 分钟）

如果域名是 Cloudflare Registrar 注册的，DNS 默认在 Cloudflare，可跳过。

如果是腾讯云/阿里云买的：
1. 把域名的 Nameservers 改为 Cloudflare 提供的 NS 记录（如 `anna.ns.cloudflare.com`）
2. 等待 NS 生效（最长 24 小时，通常 1-2 小时）

然后在 Cloudflare DNS 里添加：

| 类型 | 名称 | 内容 | 代理 |
|---|---|---|---|
| A | @ | 185.199.108.153 | 🟠 Proxied |
| A | @ | 185.199.109.153 | 🟠 Proxied |
| A | @ | 185.199.110.153 | 🟠 Proxied |
| A | @ | 185.199.111.153 | 🟠 Proxied |
| CNAME | www | dukekang0124.github.io. | 🟠 Proxied |
| CNAME | api | kaikou-api.your-subdomain.workers.dev | 🟠 DNS only |

（最后那条 api 是给 Workers 用的；如果你按第 5 步用了自定义域 + Triggers 添加，Cloudflare 会自动加，无需手动）

---

## 8. Step 7：SSL/TLS 配置（5 分钟）

Cloudflare Dashboard → 你的域名 → **SSL/TLS** → Overview：
- 模式选 **Full**（不是 Full Strict，Pages 自签证书会失败）

**Edge Certificates** → 开启：
- ✅ Always Use HTTPS
- ✅ Minimum TLS Version: TLS 1.2
- ✅ Automatic HTTPS Rewrites

---

## 9. 卡密生成后台用法

### 生成一批卡密

```bash
curl -X POST https://kaikou.xyz/api/card/generate \
  -H "Content-Type: application/json" \
  -d '{
    "adminKey": "你的ADMIN_KEY值",
    "count": 10,
    "batch": "B001-小红书首发",
    "platform": "redbook",
    "expireDays": 365
  }'
```

返回：
```json
{
  "ok": true,
  "count": 10,
  "batch": "B001-小红书首发",
  "expiredAt": 1767225600000,
  "codes": ["ABCD-EFGH-JKMN", ...]
}
```

把这 10 个卡密手动发到小红书/抖音/微信小店给下单用户。

### 查询卡密状态

```bash
curl -X POST https://kaikou.xyz/api/card/list \
  -H "Content-Type: application/json" \
  -d '{"adminKey": "你的ADMIN_KEY值"}'
```

返回所有卡密 + 状态（unused/used/expired）+ 绑定设备ID。

---

## 10. 验证清单（P0 上线标准）

打开 `https://kaikou.xyz`，逐项检查：

- [ ] **域名可访问**：浏览器打开 `https://kaikou.xyz` 显示绿色锁头 + 页面正常渲染
- [ ] **微信可访问**：用手机微信扫域名，能正常打开（不被拦截）
- [ ] **TTS 正常**：点任意句子"播放"按钮，能听到英文朗读
- [ ] **录音功能**：点"录音"按钮，弹出麦克风授权，授权后能录+回放
- [ ] **老码兼容**：在解锁框输入 `kaikou99` 仍能解锁（兜底逻辑保留）
- [ ] **新卡密**：输入生成的真卡密 → "解锁成功" → 全功能开放
- [ ] **换设备拒绝**：在另一台设备输入同一个卡密 → "此卡密已绑定其他设备"
- [ ] **错误卡密**：输入不存在卡密 → "卡密不存在，请检查输入"

---

## 11. 故障排查

| 现象 | 可能原因 | 解决 |
|---|---|---|
| 域名打不开 | DNS 未生效 | 等待 1-24 小时；`nslookup kaikou.xyz` 看是否解析到 Cloudflare |
| 微信拦截 | 域名被风控 | 引导用户"浏览器打开"；备选 Cloudflare Pages |
| Workers 404 | 路由未匹配 | 检查 wrangler.toml `main` 路径；`wrangler tail` 看实时日志 |
| 卡密校验返回 500 | KV 未创建/未绑定 | 检查 wrangler.toml 里 ID 是否填对；`wrangler kv:list` 看是否存在 |
| `kaikou99` 老码失效 | 误改了 tryUnlock 函数 | git 回滚到 `index.html.bak-2026-08-27` 或恢复兜底分支 |

---

## 12. P1 / P2 / P3 路线（继续打磨）

### P1（一周内）：ASR + 打分 + 进度同步

- 申请火山引擎 ASR（`https://www.volcengine.com/product/asr`）→ 填 `VOLC_APP_ID` + `VOLC_ACCESS_TOKEN` 到 Workers
- 改前端 `index.html` 在 1817/2106 onstop 加 `fetch('/api/asr')`，UI 展示"你说：… 准确度 92%"
- `wrangler secret put VOLC_APP_ID` → 启用真打分

### P2（两周内）：AI 对话陪练

- 申请豆包 API Key（`https://www.volcengine.com/product/doubao`）→ `wrangler secret put DOUBAO_API_KEY`
- 前端新增对话 Tab，调 `/api/dialogue` SSE 流式
- 复用现有 20 个场景角色

### P3（一月内）：店铺 webhook 自动发卡

- 小红书/抖音/微信小店的对接（这些平台对个人开发者不一定开放 webhook，需要逐个调研）
- 简版：用户下单 → 你手机收到通知 → 半自动生成卡密 → 私信发给用户
- 进阶：写脚本监听店铺消息，自动生成+自动发

---

## 13. 合规声明

ASR 上传音频需更新隐私页（当前页面写"音频仅本地"），需要补充：
- ASR 用途：评分
- 留存期：不留存（只传输不存储）
- 撤回机制：用户可清除 localStorage 撤销授权

这块在 P1 启用真 ASR 时再改。

---

**预计总耗时**：1-2 小时（其中 Cloudflare/DNS 等待 1-24 小时是并行进行的，可边等边做其他事）

**总成本**：域名 ¥10/年 + Cloudflare 免费 + Workers 免费额度（100k 请求/天）

需要九思协助任何步骤，告诉我"卡在 X 步"，我帮你看。