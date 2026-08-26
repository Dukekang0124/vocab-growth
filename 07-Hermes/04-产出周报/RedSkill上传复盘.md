# 📋 RedSkill上传实战复盘（2026-08-12，5次被拒）

> 结论：cover-pipeline不适合RedSkill（平台错配），停止尝试。完整经验沉淀，避免重蹈。

## 尝试历程（5次）

| # | ID | 改进 | 结果 |
|:--|:--|:--|:--|
| 1 | cover-pipeline | 原始版 | ❌ |
| 2 | cover-workflow | 去产品名+用户价值简介 | ❌ |
| 3 | cover-helper | 加scripts可执行 | ❌ |
| 4 | cover-gen | 删多余文件+删营销措辞 | ❌ |
| 5 | cover-maker | 手动上传+中文名+新ID | ❌ |

## 关键发现

1. **平台不给具体原因**（只有通用雷区清单）→ 无法针对性改
2. **5次改进都不行** → 不是"改得不够好"，是"东西不适合"
3. **本质（平台错配）**：RedSkill只接受"开箱即用产品"（不依赖外部API/装了就能用）
   - cover-pipeline依赖外部AI生图API（用户需自行申请）→ 不是"完整产品" → 被拒合理

## RedSkill过审标准（以后做对了再上）

```
✅ 不依赖外部API（装了直接能用）
✅ 描述场景化："遇到XX？粘贴进来，30秒给你XX"（不是"帮你做XX"）
✅ 无任何外部链接/Git地址/营销词（保证过审/100%/最好）
✅ 无本地路径/API key/个人身份信息
✅ 目录纯净（只SKILL.md+scripts，无多余md/备份）
✅ 发布前用skill-publish-audit（已装）
✅ Skill ID提交后不可改名且占用不可复用（被拒就换新ID）
```

## 双平台战略（已确立）

```
GitHub = 原生代码交付（放方法论/源码/原材料）→ cover-pipeline已成功
RedSkill = 验收产品交付（放开箱即用的产品级Skill）→ 以后做对再上
```

## 工具沉淀

- `skill-publish-audit` 已装（RedSkill商店，发布前必跑）
- `redskillhub-upload` CLI已装（Windows补丁：spawnSync shell:true）
- 手动上传流程：创作者服务平台→RedSkill→上传zip→填中文名/新ID/版本

## 教训

- **不无限试**：5次+分析过才停（止损原则）
- **不平台错配**：先判断"原材料还是产品"，再决定放GitHub还是RedSkill
- **方法论文档→GitHub**（cover-pipeline这类），**开箱即用工具→RedSkill**
