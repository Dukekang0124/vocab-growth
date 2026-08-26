# 15-GitHub 自媒体工具与 Skill 调研

> 九思 2026-08-22 全网扫描 GitHub 自媒体相关开源项目 · 评估可融入现有系统的能力
> 来源：Awesome AI Media Skills 中文版 + GitHub Topics 搜索 + 项目深挖
> **安装状态：5/5 已安装**（2026-08-22）→ 安装记录见各项目「落地状态」

---

## 一、核心发现：最值得关注的 5 个项目

### 1. social-account-doctor（找对标→拆爆款→套自己）

**仓库**：`JuneYaooo/social-account-doctor` | Claude Code Skill

**三命令闭环**：
- 输入账号或选题方向 → 自动找对标账号
- 拆解爆款的标题/封面/首段/CTA 模式
- 套用到自己的内容，输出可直接发的下一条笔记初稿

**覆盖平台**：小红书/抖音/快手/视频号/B站

**对苏不倦的价值**：⭐⭐⭐⭐⭐
- 直接替代手工「评论区博主监控」工作
- 自动拆爆款比人工刷评论区效率高 10 倍
- 可融入现有选题系统（03-选题系统），作为「AI辅助选题挖掘」模块

**落地状态**：✅ 已安装 → `04-SKILL/social-account-doctor/SKILL.md`。融入 03-选题系统，选题前可调用 find→crack→adapt 闭环。GitHub 仓库无法直接克隆（网络限制），SKILL.md 已通过 WebFetch 获取并写入。

---

### 2. self-media-compliance-review（发布前合规审核）

**仓库**：`JuneYaooo/self-media-compliance-review` | Claude Code Skill

**审核维度**：
- 画面：违禁画面、敏感标识
- 声音：违禁词、敏感表述
- 文字：标题/字幕违禁词
- 封面：违规元素
- 评论引导：诱导互动检查
- 带货信息：广告法合规
- 资质/授权/引流检查

**对苏不倦的价值**：⭐⭐⭐⭐⭐
- 抖音新规频繁变动（已有《抖音新规合规手册-2026年7月》），人工核查容易遗漏
- 与现有 32+1 维审稿系统互补——审稿管质量，合规管安全
- 发前必跑，降低限流/下架风险

**落地状态**：✅ 已安装 → `04-SKILL/self-media-compliance-review/SKILL.md`。融入 04-内容创作，作为 32+1 维审稿的 #34 维度（合规检查），发布前必跑。

---

### 3. content-pipeline（选题→写稿→发布全流程）

**仓库**：`OrangeViolin/content-pipeline` | Claude Code Skill

**覆盖环节**：
- 选题调研（自动搜索同类内容+分析空白点）
- 写稿（AI 辅助生成初稿+人工润色）
- 排版（多平台格式自动适配）
- 封面（自动生成封面图）
- 配图（自动匹配配图素材）
- 多平台改写（同一内容适配不同平台语气）
- 一键发布（连接发布渠道）

**对苏不倦的价值**：⭐⭐⭐⭐
- 与现有 5 步 SOP 高度重合，但自动化程度更高
- 多平台改写是目前系统缺失的环节（手动做三平台文案）
- 可作为现有 SOP 的自动化升级参考

**落地建议**：不直接替换现有 SOP，而是提取「多平台改写」和「自动配图」两个模块融入现有流程

---

### 4. social-media-skills（社媒策略与文案技能集）

**仓库**：`blacktwist/social-media-skills` | Claude Code Skill

**覆盖能力**：
- 受众上下文分析（你的粉丝到底是谁）
- 内容日历（规划发布节奏）
- Hook 创作（不同平台的钩子公式）
- Thread/Carousel 创作
- 内容改写（同一内容适配不同平台）
- 复盘分析（数据驱动迭代）

**对苏不倦的价值**：⭐⭐⭐⭐
- 「受众上下文分析」是目前系统缺失的——苏不倦对粉丝画像的理解还停留在后台数据
- 「内容日历」可以替代手工的「发布节奏」规划
- Hook 创作公式可以补充现有表达逻辑链

**落地状态**：✅ 已安装 → `04-SKILL/social-media-skills/SKILL.md`。15 个子技能已消化吸收，核心方法论融入 02-理论纲领/04-内容创作/06-平台分析/08-数据分析。GitHub 仓库无法直接克隆（网络限制），技能清单已通过 GitHub API 获取并写入。

---

### 5. hotclip（AI 剪辑/直播切片）

**仓库**：`xixihhhh/hotclip` | 本地运行

**功能**：
- 长视频/直播回放/播客 → 一键切成爆款竖屏短视频
- AI 找高光金句
- 自动加字幕
- 横屏转竖屏
- 本地运行无水印不上传

**对苏不倦的价值**：⭐⭐⭐⭐
- 直播回放/长视频可以自动切出多条短视频素材
- 播客内容可以快速切成短视频分发
- 降低剪辑工作量

**落地建议**：作为「内容复用」工具，将长内容（播客/直播）快速转化为短视频素材

---

## 二、多平台发布工具

| 项目 | 覆盖平台 | 适用性 | 备注 |
|:--|:--|:--|:--|
| **turbopush-mcp** | 抖音/小红书/B站/视频号 | ⭐⭐⭐⭐⭐ | MCP Server，AI Agent 可直接调用 |
| **Postiz CLI** | 28+ 平台 | ⭐⭐⭐ | 需自建服务，配置复杂 |
| **douyin-mcp-server** | 抖音 | ⭐⭐⭐⭐ | 专注抖音，视频自动上传 |
| **xiaohongshu-mcp-python** | 小红书 | ⭐⭐⭐⭐ | 图文/视频发布+数据分析 |

**备注**：2026-08-22 已安装为 Skill（`04-SKILL/turbopush-mcp/SKILL.md`），但 TurboPush 二进制程序未部署（需网络环境 + Go 编译）。当前发布流程仍使用手工 SOP，TurboPush 是效率提升而非必需。

---

## 三、内容转化与知识管理

| 项目 | 功能 | 适用性 |
|:--|:--|:--|
| **chubbyskills** | 抖音/B站/小红书/公众号/X/播客 → 一键转为个人知识库 | ⭐⭐⭐⭐ |
| **baoyu-skills** | 小红书图文卡片、信息图（21种布局×21种风格）、SVG图解 | ⭐⭐⭐ |
| **khazix-writer** | 公众号长文写作，复刻特定风格 | ⭐⭐⭐ |

**对苏不倦的价值**：chubbyskills 可以把刷到的爆款内容自动归档到知识库，替代手工摘录。baoyu-skills 可以提升小红书图文质量。

**落地状态**：✅ 已安装 → `04-SKILL/chubbyskills/SKILL.md`，但 Python 程序未部署（需网络环境 + pip 安装重依赖）。当前内容采集仍使用手工流程，Chubby Skills 是自动化升级。

---

## 四、视频创作工具

| 项目 | 功能 | 适用性 | 备注 |
|:--|:--|:--|:--|
| **AITuber Skill** | AI 视频创建+发布到 YouTube/TikTok/IG | ⭐⭐⭐ | 需要 API Key，付费 |
| **video-content-agent** | 话题→趋势研究→脚本→配音→视频 | ⭐⭐⭐ | 端到端，但偏海外平台 |
| **capsule-cinema** | 分镜设计/视频生成/剪辑/字幕/质检工作流 | ⭐⭐⭐ | 配方式，适合批量生产 |
| **Remotion Skills** | React 代码写视频，程序化渲染 | ⭐⭐ | 技术门槛高，适合程序员 |

**对苏不倦的价值**：苏不倦的核心竞争力是「真人出镜+翻车史」，AI 生成视频不适合替代真人出镜。但 AITuber 的配音能力和 capsule-cinema 的质检工作流有参考价值。

---

## 五、融入现有系统的优先级建议

### 🔴 立即安装（本周）

| 项目 | 融入位置 | 影响 |
|:--|:--|:--|
| **social-account-doctor** | 03-选题系统 → 新增「AI辅助对标拆解」 | 选题效率 10x |
| **self-media-compliance-review** | 04-内容创作 → 审稿新增 #34 合规检查 | 降低限流风险 |

### 🟡 评估后安装（两周内）

| 项目 | 融入位置 | 影响 |
|:--|:--|:--|
| **social-media-skills** | 04-内容创作（受众分析+内容日历） | 内容策略升级 |
| **turbopush-mcp** | 05-拍摄与发布（多平台发布自动化） | 发布效率提升 |
| **chubbyskills** | 09-学习进化（知识自动归档） | 学习效率提升 |

### 🟢 观察跟进（按需）

| 项目 | 关注点 | 触发条件 |
|:--|:--|:--|
| **content-pipeline** | 多平台改写模块 | 多平台运营量增大时 |
| **hotclip** | 长视频→短视频切片 | 开始做直播/播客时 |
| **AITuber Skill** | AI 配音+视频生成 | 需要批量生产非真人内容时 |

---

## 六、与现有系统对比

| 现有机制 | GitHub 替代/增强 | 判断 |
|:--|:--|:--|
| 评论区博主监控（手工） | social-account-doctor（自动） | 🟢 立即替代 |
| 32+1维审稿（质量） | self-media-compliance-review（合规） | 🟢 互补增强 |
| 三平台文案（手工改写） | content-pipeline 多平台改写 | 🟡 评估后引入 |
| 手工发布（逐平台操作） | turbopush-mcp（API 发布） | 🟡 评估后引入 |
| 选题聊天（纯人工） | social-account-doctor 对标拆解 | 🟢 辅助增强 |
| 手工摘录爆款（低效） | chubbyskills 自动归档 | 🟡 评估后引入 |

---

## 七、注意事项

1. **工具不替代真人**：苏不倦的核心壁垒是「翻车史+真人出镜」，AI 工具只能辅助效率，不能替代内容本身
2. **合规优先**：多平台自动发布工具需要验证是否符合各平台 ToS，避免封号
3. **渐进式引入**：不要一次性装太多 Skill，先装 social-account-doctor 和 compliance-review 两个最刚需的，跑通再扩展
4. **本地优先**：涉及内容的工具优先选本地运行（如 hotclip），避免数据出境

---

## 八、MediaCrawler 评估（2026-08-23 补充）

**仓库**：`NanmiCoder/MediaCrawler` | 6.1万 Star 跨平台爬虫

- 复用 Chrome 登录态（CDP），免逆向 JS，支持小红书/抖音/快手/B站/微博/贴吧/知乎
- **不覆盖视频号、公众号**（康哥明确需要的两个平台）
- **处置：暂缓安装**，仅当红抖快B站评论抓取成为选题瓶颈时启用
- 完整分层方案见 [17-数据采集分层方案](17-数据采集分层方案.md)

---

## 九、数据抓取工具补充（2026-08-23，配合 Hermes CDP 机制）

> 背景：发现 Hermes 已有自研 CDP 抓取脚本（`07-Hermes/scripts/cdp_extract.py` 等），本批工具用于补 Hermes 的短板（公众号/小红书）+ 提供同款开源参考。

| 工具 | 仓库 | 补什么 | 特点 |
|:--|:--|:--|:--|
| wechat-mp-article-crawler | `EnockLee/wechat-mp-article-crawler` | 公众号文章（标题/阅读量/链接） | 无需 API，导出 Excel |
| AutoWechatCrawler | `RichardQt/AutoWechatCrawler` | 公众号全自动抓取 | 仅支持微信 3.9.12 版（限制大） |
| xiaohongshu-crawler | `yangsijie666/xiaohongshu-crawler` | 小红书搜索/笔记/评论 | Playwright 双层反检测 + MCP |
| XHS-Downloader | 小红书作品下载 | 图文/视频/LivePhoto | 11.2k Star，TUI/CLI/API/MCP |
| TikTokCommentScraper | 抖音评论批量导出 | 智能滚动全量评论 | JS+Python，3分钟导出 |
| douyin-creator-data-scraper-skill | `weizhichao1027-collab/douyin-creator-data-scraper-skill` | 抖音创作者中心数据 | **Codex/Hermes 风格 = Hermes 脚本公开版** |
| dash-persona | `Fearvox/dash-persona` | 抖音+TikTok 创作者数据 | CDP + Data Passport Chrome 扩展 |

**核心判断**：抖音自己数据用 Hermes 脚本就够，不需要再装开源版；真正要装的是「小红书」（`xiaohongshu-crawler`）和「公众号」（`wechat-mp-article-crawler`）。

---

*来源：GitHub Awesome AI Media Skills 中文版 + 全网搜索 + 项目深挖*