# Agnes AI API 完整参考文档

## 基础信息

- **Base URL**: `https://apihub.agnes-ai.com/v1`
- **认证方式**: `Authorization: Bearer YOUR_API_KEY`
- **协议兼容性**: OpenAI 兼容

## 模型列表

| 模型 ID | 类型 | 特性 |
|---------|------|------|
| `agnes-2.0-flash` | 文本 | 旗舰模型，1M token 上下文，Claw-Eval 60.9% |
| `agnes-1.5-flash` | 文本 | 轻量版文本模型 |
| `agnes-image-2.1-flash` | 图片 | 支持 4K 分辨率，约 10 秒出图，Elo 1178 |
| `agnes-image-2.0-flash` | 图片 | 上一代图像模型 |
| `agnes-video-v2.0` | 视频 | 1080P 原生音视频同步，异步任务模式，Elo 934 |

## 图片生成 API（Text-to-Image）

### 端点

```
POST /v1/images/generations
```

### 请求体

| 字段 | 类型 | 必填 | 默认值 | 说明 |
|------|------|------|--------|------|
| model | string | 是 | - | 模型 ID |
| prompt | string | 是 | - | 图片描述 |
| size | string | 是 | - | 尺寸档位：`1K`/`2K`/`3K`/`4K`，或精确尺寸如 `1024x768` |
| ratio | string | 否 | `1:1` | 宽高比：`1:1`/`3:4`/`4:3`/`16:9`/`9:16`/`2:3`/`3:2`/`21:9` |
| n | integer | 否 | 1 | 生成数量（1-4） |
| return_base64 | boolean | 否 | false | 返回 Base64 格式 |
| extra_body | object | 否 | - | 高级参数（见下表） |

### extra_body 字段

| 字段 | 类型 | 说明 |
|------|------|------|
| response_format | string | 输出格式：`url`（默认）或 `b64_json` |
| image | string[] | 输入图片数组（图生图时使用），支持 HTTPS URL 或 Data URI Base64 |

### 尺寸规格表

| 宽高比 | 1K | 2K | 3K | 4K |
|--------|----|----|----|----|
| `1:1` | 1024×1024 | 2048×2048 | 3072×3072 | 4096×4096 |
| `16:9` | 1312×736 | 2624×1472 | 3936×2208 | 5248×2944 |
| `9:16` | 736×1312 | 1472×2624 | 2208×3936 | 2944×5248 |
| `4:3` | 1152×864 | 2304×1728 | 3456×2592 | 4608×3456 |
| `3:4` | 864×1152 | 1728×2304 | 2592×3456 | 3456×4608 |
| `2:3` | 832×1248 | 1664×2496 | 2496×3744 | 3328×4992 |
| `3:2` | 1248×832 | 2496×1664 | 3744×2496 | 4992×3328 |
| `21:9` | 1568×672 | 3136×1344 | 4704×2016 | 6272×2688 |

### 响应体

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

### 示例

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

# 图生图：URL 输入 + URL 输出
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

## 视频生成 API（Text-to-Video）

### 端点（创建任务）

```
POST /v1/videos
```

### 请求体

| 字段 | 类型 | 必填 | 默认值 | 说明 |
|------|------|------|--------|------|
| model | string | 是 | - | 模型 ID |
| prompt | string | 是 | - | 视频描述 |
| width | integer | 否 | 1152 | 视频宽度 |
| height | integer | 否 | 768 | 视频高度 |
| num_frames | integer | 否 | 121 | 总帧数 |
| frame_rate | integer | 否 | 24 | 帧率 (fps) |

### 响应体

```json
{
  "video_id": "xxxxx",
  "status": "created"
}
```

### 查询端点

```
GET https://apihub.agnes-ai.com/agnesapi?video_id=xxxxx
```

### 响应体（完成后）

```json
{
  "video_id": "xxxxx",
  "status": "completed",
  "url": "https://...",
  "prompt": "..."
}
```

### 状态值

- `created` — 任务已创建
- `processing` — 生成中
- `completed` / `success` — 生成完成
- `failed` / `error` — 生成失败

### 示例

```bash
# 创建任务
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

# 查询结果（替换 video_id）
curl "https://apihub.agnes-ai.com/agnesapi?video_id=xxxxx" \
  -H "Authorization: Bearer $AGNES_API_KEY"
```

## 错误码

| HTTP 状态码 | 说明 |
|-------------|------|
| 401 | API Key 无效或过期 |
| 403 | 权限不足 |
| 429 | 请求过于频繁（配额限制） |
| 500 | 服务端错误 |

## 配额与限制

- 注册后自动获得 **100 免费 credits**
- 视频为异步生成，耗时取决于视频长度和复杂度
- 建议轮询间隔 5-10 秒
- 建议客户端超时 60-360 秒

## 安全提示

- API Key 是敏感信息，妥善保管
- 不要提交到公开仓库
- 不要在前端代码中暴露
- 如泄露请立即在控制台重置

## 重要注意事项

1. **域名**：必须是 `apihub.agnes-ai.com`，不是 `api.agnes-ai.com`
2. **response_format**：必须放在 `extra_body` 中，不能放在请求体顶层
3. **图生图输入**：支持公开 HTTPS URL 或 Data URI Base64，不支持私有图片
4. **prompt 语言**：英文效果最佳，中文 prompt 建议先翻译成英文
