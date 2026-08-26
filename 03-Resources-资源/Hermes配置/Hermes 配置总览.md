# Hermes 配置总览

> 最后更新：2026-07-09

## 模型配置

| 用途 | 模型 | 提供商 |
|------|------|------|
| 主模型 | DeepSeek V4 Pro | DeepSeek API |
| 图片识别 | GLM-5V-Turbo | 智谱 Z.AI |

## 功能配置

| 功能 | 状态 | 说明 |
|------|:--:|------|
| 微信互通 | ✅ | Tencent iLink Bot API，account `2d57b2d9aa44@im.bot` |
| 语音转文字 | ✅ | faster-whisper，本地运行 |
| 文字转语音 | ✅ | Edge TTS，免费 |
| 图片识别 | ✅ | 智谱 GLM |
| 文档读取 | ✅ | 内置，支持 PDF/Word/Excel |

## 已安装 Skill

| Skill | 来源 | 用途 |
|------|------|------|
| gstack | Garry Tan | 开发工作流（58 个技能） |
| scrapling | 官方 | 反反爬虫网页抓取 |
| career-transition-coaching | 自创 | 求职转型分析 |
| job-search-strategy | 自创 | 求职策略引擎 |
| hermes-wechat-gateway | 自创 | 微信配置指南 |
| hermes-domestic-vision-setup | 自创 | 国内视觉模型配置 |
| SOUL.md | 自创 | Hermes 人格设定 |

## 关键路径

- 配置：`C:\Users\11\AppData\Local\hermes\config.yaml`
- 密钥：`C:\Users\11\AppData\Local\hermes\.env`
- SOUL.md：`C:\Users\11\AppData\Local\hermes\SOUL.md`
- 技能目录：`C:\Users\11\AppData\Local\hermes\skills\`

## 常用命令

```bash
hermes gateway restart   # 重启微信网关
hermes doctor            # 诊断
hermes skills list       # 查看技能
/reset                   # 重载配置
```
