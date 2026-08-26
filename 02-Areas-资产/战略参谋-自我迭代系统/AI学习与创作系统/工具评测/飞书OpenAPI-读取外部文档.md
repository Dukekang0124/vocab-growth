# 飞书OpenAPI-读取外部文档

> 2026-08-08 ⑩号窗口实测。对应 Skill：`feishu-doc-reader`。

## 用途

用户发飞书文档链接（简历/方案/知识库）时，直接读正文，无需登录、无需浏览器。

## 实测记录

2026-08-08 读泛函推荐的两个实习生简历（小肖/小黄）成功：
- 小肖简历（wiki链接）：`VgkQwlulFiJffskH8IccCC4Hnye`
- 小黄简历（docx链接）：`AnGCdUplpoyQEcxHhDDcIn41nXc`
- 两份都是飞书文档，API 直接返回完整正文

## 技术要点

| 步骤 | 操作 |
|:--|:--|
| 取token | POST `/auth/v3/tenant_access_token/internal`，用 config.yaml 的 feishu app_id/secret |
| 提取doc_token | 从链接尾部取，wiki/docx 通用 |
| 读正文 | GET `/docx/v1/documents/{doc_token}/raw_content`，取 `data.content` |

## 注意
- web_extract 对飞书链接返回空——必须走 API
- token 有效期约2小时，每次用前重新获取
- app_secret 从 config.yaml 读，不硬编码
