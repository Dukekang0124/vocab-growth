---
name: agnes-image-video
description: 调用 Agnes AI 的图片生成和视频生成 API。适用于用户使用以下意图时触发：生成图片、AI 绘画、文生图、图生图、视频生成、AI 视频、文生视频、图生视频、使用 Agnes 模型生成内容。基础配置：Base URL https://apihub.agnes-ai.com/v1，认证方式 Bearer Token。
agent_created: true
---

# Agnes Image & Video Skill

## Overview

本 Skill 提供 Agnes AI 图片生成（Text-to-Image / Image-to-Image）和视频生成（Text-to-Video）能力的完整调用指南。Agnes AI API 完全兼容 OpenAI 格式，只需替换 Base URL、API Key 和 Model Name 即可使用。

**何时使用此 Skill：**
- 用户要求生成图片、AI 绘画、文生图
- 用户要求图生图、图片编辑、风格转换
- 用户要求生成视频、AI 视频、文生视频
- 用户明确提到使用 Agnes Image 或 Agnes Video 模型
- 用户提供 API Key 需要调用 Agnes AI 服务

## 基础配置

### 必需参数

| 参数 | 值 |
|------|-----|
| Base URL | `https://apihub.agnes-ai.com/v1` |
| 认证头 | `Authorization: Bearer YOUR_API_KEY` |
| Content-Type | `application/json` |

### 可用模型

| 模型 ID | 类型 | 说明 |
|---------|------|------|
| `agnes-image-2.1-flash` | 图片 | 最新款，支持最高 4K，约 10 秒出图 |
| `agnes-image-2.0-flash` | 图片 | 上一代图像模型 |
| `agnes-video-v2.0` | 视频 | 支持 1080P，异步任务模式，原生音视频同步 |
| `agnes-2.0-flash` | 文本 | 旗舰文本模型，1M token 上下文窗口 |

**注意：** API Key 只在创建时显示一次，务必立即保存。

## 图片生成（Text-to-Image）

### 接口

```
POST https://apihub.agnes-ai.com/v1/images/generations
```

### 请求参数

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| model | string | 是 | 模型 ID，如 `agnes-image-2.1-flash` |
| prompt | string | 是 | 图片描述文本（英文效果最佳） |
| size | string | 是 | 尺寸档位，支持 `1K`/`2K`/`3K`/`4K` 或精确尺寸如 `1024x768` |
| ratio | string | 否 | 宽高比，配合 size 档位使用：`1:1`、`3:4`、`4:3`、`16:9`、`9:16`、`2:3`、`3:2`、`21:9`，默认 `1:1` |
| n | integer | 否 | 生成数量，默认 1，最大 4 |
| return_base64 | boolean | 否 | 返回 Base64 格式图片数据（默认返回 URL） |
| extra_body | object | 否 | 高级参数，见下方说明 |

### size 规格表

| 宽高比 | 1K | 2K | 3K | 4K |
|--------|----|----|----|----|
| `1:1` | 1024×1024 | 2048×2048 | 3072×3072 | 4096×4096 |
| `16:9` | 1312×736 | 2624×1472 | 3936×2208 | 5248×2944 |
| `9:16` | 736×1312 | 1472×2624 | 2208×3936 | 2944×5248 |
| `4:3` | 1152×864 | 2304×1728 | 3456×2592 | 4608×3456 |
| `3:4` | 864×1152 | 1728×2304 | 2592×3456 | 3456×4608 |

### extra_body 参数

| 字段 | 类型 | 说明 |
|------|------|------|
| `response_format` | string | 输出格式：`url`（默认）或 `b64_json` |
| `image` | string[] | 输入图片数组（图生图时使用），支持公开 HTTPS URL 或 Data URI Base64 |

### 响应格式

```json
{
  "created": 1780000000,
  "data": [
    {
      "url": "https://storage.googleapis.com/agnes-aigc/xxx.png",
      "b64_json": null,
      "revised_prompt": "..."
    }
  ]
}
```

### curl 示例

```bash
# 文生图：URL 输出
curl https://apihub.agnes-ai.com/v1/images/generations \
  -H "Authorization: Bearer $AGNES_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "agnes-image-2.1-flash",
    "prompt": "A luminous floating city above a misty canyon at sunrise, cinematic realism",
    "size": "1024x768"
  }'

# 文生图：2K 16:9 输出
curl https://apihub.agnes-ai.com/v1/images/generations \
  -H "Authorization: Bearer $AGNES_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "agnes-image-2.1-flash",
    "prompt": "A cinematic product hero image, clean lighting, high detail",
    "size": "2K",
    "ratio": "16:9"
  }'
```

## 图生图（Image-to-Image）

在 `extra_body` 中提供输入图片，即可对已有图片进行编辑/风格转换。

### curl 示例

```bash
# URL 输入 + URL 输出
curl https://apihub.agnes-ai.com/v1/images/generations \
  -H "Authorization: Bearer $AGNES_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "agnes-image-2.1-flash",
    "prompt": "Transform the scene into a rain-soaked cyberpunk night with neon reflections",
    "size": "1024x768",
    "extra_body": {
      "image": ["https://example.com/input-image.png"],
      "response_format": "url"
    }
  }'
```

## 视频生成（Text-to-Video）

视频生成是**异步流程**：先创建任务，再用返回的 `video_id` 轮询查询结果。

### Step 1：创建视频任务

```
POST https://apihub.agnes-ai.com/v1/videos
```

#### 请求参数

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| model | string | 是 | 模型 ID，如 `agnes-video-v2.0` |
| prompt | string | 是 | 视频描述文本 |
| width | integer | 否 | 视频宽度，默认 1152 |
| height | integer | 否 | 视频高度，默认 768 |
| num_frames | integer | 否 | 总帧数，默认 121 |
| frame_rate | integer | 否 | 帧率，默认 24 |

#### 响应格式

```json
{
  "video_id": "xxxxx",
  "status": "created"
}
```

### Step 2：轮询查询结果

```
GET https://apihub.agnes-ai.com/agnesapi?video_id=xxxxx
```

轮询间隔建议 5-10 秒，直到状态变为 `completed` 并返回视频 URL。

### curl 示例（创建任务）

```bash
curl -X POST https://apihub.agnes-ai.com/v1/videos \
  -H "Authorization: Bearer $AGNES_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "agnes-video-v2.0",
    "prompt": "A cinematic shot of a cat walking on the beach at sunset, soft ocean waves, warm golden lighting, realistic motion",
    "height": 768,
    "width": 1152,
    "num_frames": 121,
    "frame_rate": 24
  }'
```

## Python 调用示例

```python
import requests
import time
import os

API_KEY = os.environ.get("AGNES_API_KEY")
BASE_URL = "https://apihub.agnes-ai.com/v1"
HEADERS = {"Authorization": f"Bearer {API_KEY}", "Content-Type": "application/json"}

# 文生图
def generate_image(prompt: str, size: str = "1024x1024",
                   ratio: str = "1:1", model: str = "agnes-image-2.1-flash") -> str:
    resp = requests.post(f"{BASE_URL}/images/generations", json={
        "model": model, "prompt": prompt, "size": size, "ratio": ratio
    }, headers=HEADERS)
    resp.raise_for_status()
    return resp.json()["data"][0]["url"]

# 图生图
def generate_image_from_image(prompt: str, input_url: str,
                               size: str = "1024x768", model: str = "agnes-image-2.1-flash") -> str:
    resp = requests.post(f"{BASE_URL}/images/generations", json={
        "model": model, "prompt": prompt, "size": size,
        "extra_body": {"image": [input_url], "response_format": "url"}
    }, headers=HEADERS)
    resp.raise_for_status()
    return resp.json()["data"][0]["url"]

# 视频生成（异步）
def generate_video(prompt: str, width: int = 1152, height: int = 768,
                   num_frames: int = 121, frame_rate: int = 24,
                   model: str = "agnes-video-v2.0") -> str:
    # Step 1: 创建任务
    resp = requests.post(f"{BASE_URL}/videos", json={
        "model": model, "prompt": prompt,
        "width": width, "height": height,
        "num_frames": num_frames, "frame_rate": frame_rate
    }, headers=HEADERS)
    resp.raise_for_status()
    video_id = resp.json()["video_id"]

    # Step 2: 轮询结果
    while True:
        time.sleep(5)
        check = requests.get("https://apihub.agnes-ai.com/agnesapi",
                             params={"video_id": video_id}, headers=HEADERS)
        result = check.json()
        if result.get("status") in ("completed", "success"):
            return result["url"]
        elif result.get("status") in ("failed", "error"):
            raise RuntimeError(f"Video generation failed: {result}")
```

## 注意事项

1. **域名正确性**：API 网关是 `apihub.agnes-ai.com`，不是 `api.agnes-ai.com`
2. **API Key 安全**：不要暴露在公开仓库、前端代码或截图/录屏中
3. **response_format 位置**：必须放在 `extra_body` 中，不能放在请求体顶层
4. **视频异步**：视频生成需要时间，务必使用轮询机制等待结果，建议客户端超时 60-360 秒
5. **Prompt 语言**：英文 Prompt 效果最佳，中文可翻译成英文再传入
6. **图生图输入**：支持公开 HTTPS URL 或 Data URI Base64，不支持需要登录的私有图片
7. **免费额度**：注册后自动获得 100 免费 credits

## 参考资料

详细 API 文档和完整参数说明，请参考：`references/api_reference.md`
