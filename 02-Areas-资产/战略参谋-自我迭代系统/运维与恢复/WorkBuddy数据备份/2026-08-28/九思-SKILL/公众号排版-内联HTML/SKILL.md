---
name: 公众号排版-内联HTML
description: 把纯文本/Markdown 文章排版成可直接粘进微信公众号编辑器的单文件内联样式 HTML。零外部 CSS/JS、手机竖屏友好。内置组件库：突出标题、关键数据彩色高亮、术语/英文行内高亮、卡片布局（步骤/要点）、踩坑警示框、核心公式引用框、真假对比框、图片占位框。触发词：公众号排版、微信文章、排版成HTML、内容工厂排版、公众号HTML。
agent_created: true
---

# 公众号排版 · 内联 HTML 组件库

> 2026-08-23 由「内容工厂」流程实测固化：康哥英语自学文《既然1.3万人让我背单词，我还是不背》一篇，按本技能产出可直接粘公众号的单文件 HTML。

## 何时使用
- 把任意文章（技术博文 / 自媒体文案 / 方法论）排版成微信公众号可发布 HTML
- 需要「标题突出 + 数据高亮 + 卡片 + 警示框」等结构化视觉，又必须微信兼容
- 接到排版类任务，先查本技能，不复造轮子

## 铁律（微信兼容）
- **全内联 `style=""`**，禁用 `<style>` 块、外部 CSS/JS、CSS 变量、`position:absolute`、复杂 flex 横排
- 卡片用**竖向全宽堆叠** `div`，适配手机；不用横向 flex 避免微信渲染差异
- 字体：正文 `font-family:-apple-system,"PingFang SC","Microsoft YaHei",sans-serif`；术语高亮 `font-family:Consolas,"Courier New",monospace`
- 根容器 `max-width:680px;margin:0 auto;padding:18px 16px 32px;`
- 图片在微信需单独上传，故用**占位框**生成，交付后人工替换 `<img src>`

## 配色（暖橙活力，可改）
| 角色 | 色值 |
|------|------|
| 主色橙红 | `#FF6B35` |
| 强调数据·红 | `#E63946` |
| 辅助数据·蓝 | `#2D6CDF` |
| 警示黄底 | `#FFF3CD` / 边 `#F4C430` |
| 卡片白底 | `#FFFFFF` / 描边 `#FFD9C2` |
| 术语高亮底 | `#FFF1E8` / 橙字 `#FF6B35` |
| 正文 | `#2B2B2B`，字号 16px，行高 1.85 |

## 组件库（复制即用）

### 1. 主标题 + 橙分割线
```html
<h1 style="font-size:25px;line-height:1.4;font-weight:800;color:#1A1A1A;margin:8px 0 6px;">既然<span style="color:#FF6B35;">1.3万</span>人让我背单词，我还是不背</h1>
<div style="height:4px;width:64px;background:#FF6B35;border-radius:3px;margin:10px 0 20px;"></div>
```

### 2. 关键数据高亮
```html
<span style="color:#E63946;font-weight:700;">1.3万</span>   <!-- 主数据 红 -->
<span style="color:#2D6CDF;font-weight:700;">50</span>      <!-- 次数据 蓝 -->
```

### 3. 术语/英文行内高亮（`<code>`）
```html
<code style="font-family:Consolas,'Courier New',monospace;background:#FFF1E8;color:#FF6B35;padding:1px 5px;border-radius:4px;font-size:15px;">how much</code>
```

### 4. 踩坑警示框
```html
<div style="background:#FFF3CD;border-left:5px solid #F4C430;border-radius:8px;padding:14px 16px;margin:20px 0;">
  <div style="font-size:15px;font-weight:800;color:#9A6B00;margin-bottom:6px;">⚠ 踩坑教训</div>
  <p style="font-size:15.5px;line-height:1.8;margin:0;color:#5C4A00;">背单词，是「背了忘、忘了背」的假努力。</p>
</div>
```

### 5. 核心公式 / 引用框
```html
<div style="background:#FFF1E8;border:1px solid #FFD9C2;border-radius:12px;padding:20px 18px;margin:22px 0;text-align:center;">
  <div style="font-size:23px;font-weight:800;color:#FF6B35;margin-bottom:10px;">会用 &gt; 背会</div>
  <p style="font-size:15.5px;line-height:1.85;margin:0;color:#5A3A2A;text-align:left;">背会一个单词，你一定会忘。但用会一个单词，你会记住一辈子。</p>
</div>
```

### 6. 步骤/要点卡片（竖向堆叠，序号徽章）
```html
<div style="background:#FFFFFF;border:1px solid #FFD9C2;border-radius:12px;padding:16px;margin:12px 0;box-shadow:0 2px 8px rgba(255,107,53,0.08);">
  <div style="display:flex;align-items:center;margin-bottom:8px;">
    <span style="display:inline-block;width:26px;height:26px;line-height:26px;text-align:center;background:#FF6B35;color:#fff;font-weight:800;border-radius:50%;font-size:15px;margin-right:10px;">1</span>
    <span style="font-size:17px;font-weight:800;color:#FF6B35;">可理解输入</span>
  </div>
  <p style="font-size:15.5px;line-height:1.8;margin:0;color:#444;">不背单词书，去看漫画书虫以及日常对话的情景剧……</p>
</div>
```

### 7. 真假 / 对比收束框
```html
<div style="border-radius:12px;overflow:hidden;margin:24px 0;border:1px solid #EEE;">
  <div style="background:#FDECEA;padding:14px 16px;">
    <div style="font-size:14px;font-weight:700;color:#C0392B;margin-bottom:4px;">✗ 假努力</div>
    <div style="font-size:16px;font-weight:800;color:#C0392B;">背单词</div>
  </div>
  <div style="background:#E8F5F0;padding:14px 16px;">
    <div style="font-size:14px;font-weight:700;color:#1E8A6B;margin-bottom:4px;">✓ 真学习</div>
    <div style="font-size:16px;font-weight:800;color:#1E8A6B;">用单词</div>
  </div>
</div>
```

### 8. 图片占位框（交付后替换 `<img src>`）
```html
<div style="background:#F2F2F2;border:1px dashed #C9C9C9;border-radius:10px;height:180px;display:flex;flex-direction:column;align-items:center;justify-content:center;margin:18px 0;text-align:center;">
  <div style="font-size:30px;margin-bottom:6px;">📷</div>
  <div style="font-size:14px;color:#888;font-weight:600;">图片占位：1.3万人劝背单词</div>
  <div style="font-size:12px;color:#aaa;margin-top:4px;">上传后替换为 &lt;img src="..."&gt;</div>
</div>
```

### 9. H2 小标题（左侧色条）
```html
<h2 style="font-size:19px;font-weight:800;color:#1A1A1A;margin:26px 0 14px;padding-left:12px;border-left:5px solid #FF6B35;">我的三步学法</h2>
```

## 标准流程（5 步）
1. **清理原文标记**：删 `⏸`（分段暂停）、`🎵`（结尾音乐）；`📷` 转图片占位框
2. **选配色主题**：默认暖橙活力；知识科普可切蓝绿
3. **套组件**：按文章结构选标题/数据高亮/卡片/警示框/对比框/图片占位
4. **写单文件 HTML**：全内联样式，本地浏览器核对手机竖屏（行高/间距/断行）
5. **交付 + 沉淀**：交付 HTML；原文+成品沉淀 OB（如 `02-Areas-资产/自媒体系统/`）

## 复用注意
- 本文为「内容工厂」Remixer 思路的落地：一篇源文 → 一种平台原生格式（公众号 HTML）
- 改配色只动顶部色值表，组件结构不动
- 非技术文时，把「代码/术语高亮」映射为英文词/关键词高亮，视觉更贴主题
