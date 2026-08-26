---
name: ai-image-post
description: AI 生图全流程：用 ImageGen（混元生图）生成 → 去右下角"AI生成 WORKBUDDY"水印 → PIL 叠加中文标题（AI 渲染中文易崩，叠加最稳）→ 裁剪到目标尺寸（如 336x200 社区封面）→ 归档到 03-数字资产库/设计资产。适用于：生成封面图、海报、配图；图片带水印需要清理；需要给图加中文标题；需要调整图片尺寸。触发词：封面图、生图、去水印、加标题、336x200、配图。
agent_created: true
---

# AI 生图后期处理流程（混元生图 + PIL）

> 2026-08-22 由康哥实测验证固化：WorkBuddy 内置 ImageGen（混元生图）是免费积分生图主力，中文渲染强（海报文字准），但会带水印、渲染 prompt 里的英文词、AI 直接渲染中文易崩——所以用"AI 生图打底 + PIL 后期"的标准工作流。

## 何时使用
- 生成封面图 / 海报 / 自媒体配图（尤其要带中文标题的）
- 已生成的图带"AI生成 WORKBUDDY"水印需要清理
- 需要把图裁剪到固定尺寸（社区封面 336x200 等）

## 标准流程（5 步）

### Step 1：ImageGen 生图（混元）
- 用系统 ImageGen 工具，`quality: "high"`，尺寸给大图（如 `1536x1024` 或 `1024x1536`），后续缩放不糊
- **Prompt 技巧**（三招提升质量）：
  1. 描述要具体：风格词（flat vector / photorealistic / minimal）+ 光影 + 构图
  2. 中文标题**不要**直接交给 AI 渲染（容易崩、会把 prompt 词当文字画进去）——生图时只描述画面主体
  3. 避免在 prompt 里出现完整英文短语，会被模型渲染成图内文字（如"tech editorial cover"会被画出来）
- ⚠️ 积分成本：约 5-10 积分/张，生成前必须告知用户

### Step 2：检查 + 裁剪去水印
- 混元生图右下角通常带"AI生成 WORKBUDDY"水印 → 用 PIL 裁掉底部区域
- 同时检查顶部/底部是否被渲染了 prompt 里的英文词 → 一并裁掉
- 裁剪比例参考：顶部裁 18-20%，底部裁 20-30%（按水印实际位置调）

### Step 3：PIL 叠加中文标题
- 字体：`C:/Windows/Fonts/msyhbd.ttc`（微软雅黑粗体，标题用）、`msyh.ttc`（正文/辅助）
- 底部加深色半透明蒙版（如 `(13, 27, 62, 240)`）保证中文可读
- 主标题 + 副标题居中，可加顶部 `#WorkBuddy` 橙色徽章（可选）

### Step 4：裁剪到目标尺寸
- 先按目标比例裁剪中间视觉区（保持主体），再 resize 到目标尺寸（LANCZOS）
- 社区封面：336x200（约 1.68:1）；抖音封面：常用 3:4 或 9:16

### Step 5：归档
- 成品存 `08-九思搭档知识库/03-数字资产库/设计资产/`（命名：`主题-类型-尺寸.png`）
- 高清底图（去水印前的 AI 原图）可留作素材，但**重命名**为清晰文件名（去 prompt 残留）

## 关键代码模板（Python + Pillow）

```python
from PIL import Image, ImageDraw, ImageFont

# 1. 打开 AI 生图源
src = Image.open(src_path).convert("RGB")
W0, H0 = src.size

# 2. 裁剪去水印（顶部/底部）
middle = src.crop((0, int(H0*0.20), W0, H0 - int(H0*0.30)))

# 3. 按目标比例裁剪 + 缩放
W_T, H_T = 336, 200  # 目标尺寸
scale = H_T / middle.size[1]
middle = middle.resize((int(middle.size[0]*scale), H_T), Image.LANCZOS)
left = (middle.size[0] - W_T) // 2
final_bg = middle.crop((left, 0, left + W_T, H_T))

# 4. 叠加中文标题
draw = ImageDraw.Draw(final_bg, "RGBA")
draw.rectangle([0, H_T-55, W_T, H_T], fill=(13, 27, 62, 240))  # 底部蒙版
f_mid = ImageFont.truetype("C:/Windows/Fonts/msyhbd.ttc", 20)
t1 = "标题文字"
w1 = int(draw.textlength(t1, font=f_mid))
draw.text(((W_T-w1)/2, H_T-45), t1, font=f_mid, fill=(255,255,255,255))

final_bg.save(out_path, "PNG")
```

## 踩坑记录
| 坑 | 解法 |
|---|---|
| 右下角"AI生成 WORKBUDDY"水印 | 底部裁掉 20-30% |
| prompt 里的英文词被画进图里 | 生图 prompt 避免完整英文短语；已发生就裁剪 |
| AI 直接渲染中文崩/错字 | **永远用 PIL 叠加中文**，不让 AI 画中文 |
| 生成图比例和需求不符 | 先裁中间视觉区再缩放，保留主体 |

## 模型选择参考
- **混元生图**（WorkBuddy 内置 ImageGen）：免费积分 5-10/张，中文强、写实人像好——日常主力 ✅
- **即梦/可灵**（connector）：顶流效果，但需账号额度（非纯免费）——追求 9.5+ 分时用
- **Agnes**（agnes-image-2.1-flash）：4K 免费 API，但中文差、失败率高——不推荐主力
- 生图质量与对话模型（Flash/Pro）**无关**，走独立生图通道
