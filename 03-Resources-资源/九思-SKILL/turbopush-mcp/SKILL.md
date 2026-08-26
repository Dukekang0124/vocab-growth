---
name: turbopush-mcp
description: 多平台内容发布 MCP Server，支持抖音/小红书/B站/视频号/公众号/知乎/微博等 18+ 平台的一键发布。AI Agent 可通过 MCP 协议直接调用发布能力。
source: https://github.com/xueyc1f/turbopush-mcp
installed: 2026-08-22
status: 已评估，待网络条件允许时部署
---

# TurboPush MCP — 多平台内容发布

## 是什么

TurboPush 是一个 Go 语言编写的 MCP Server，让 AI Agent 可以直接发布内容到多个平台。

**覆盖平台**：抖音、小红书、B站、视频号、公众号、知乎、微博、头条号、百家号、快手、搜狐号、网易号、CSDN、简书、掘金、SegmentFault、腾讯云社区、阿里云社区

## 核心能力

### 平台管理
- `list_platforms` — 获取支持平台列表
- `list_accounts` — 获取所有平台账号
- `list_logged_accounts` — 获取已登录账号

### 内容管理
- `create_article` — 创建文章
- `update_article` — 更新文章
- `publish_article` — 发布文章
- `list_articles` — 获取内容列表
- `get_article` — 获取内容详情

### 发布流程
```
创建文章 → 设置封面/标签 → 预览 → 发布 → 获取发布链接
```

## 安装方式

### 方式一：脚本安装（推荐）
```bash
curl -fsSL https://raw.githubusercontent.com/xueyc1f/turbopush-mcp/main/install.sh | bash
```

### 方式二：Windows 手动下载
前往 Releases 页面下载 `turbo-push-mcp-x86_64-pc-windows-msvc.exe`

### 方式三：源码编译
```bash
git clone https://github.com/xueyc1f/turbopush-mcp.git
cd turbopush-mcp
go build -o turbo-push-mcp .
```

## 九思适配说明

**当前状态**：已评估，待安装。原因是：
1. 需要 Go 1.25+ 编译环境（Windows 需要安装 Go）
2. GitHub 网络连通性问题（需要代理或镜像）
3. 需要先验证各平台是否允许 API 发布（避免封号风险）

**融入位置**：05-拍摄与发布 → 发布自动化

**启用条件**：
1. 网络环境支持 GitHub 访问
2. 各平台账号已登录 TurboPush
3. 确认平台 API 发布不违反 ToS

**替代方案**：在 TurboPush 安装前，发布流程仍使用现有手工 SOP（逐平台发布）。TurboPush 是效率提升而非必需。

**安全提醒**：TurboPush 需要在本地运行并登录各平台账号。请确保：
- 不在公共网络环境使用
- 定期检查账号安全状态
- 发布频率控制在平台允许范围内