# douyin-transcript · 抖音口播转写 Skill

把"抖音视频 → 口播逐字稿"做成可复用能力。复刻自合作伙伴 Hermes/九思 的成熟方案。

## 目录
- `SKILL.md` — 能力说明、原理、踩坑清单
- `scripts/douyin_to_text.py` — 抓取+转写主脚本（默认 SenseVoice+VAD）
- `scripts/bench_sensevoice.py` — 转写速度基准测试
- `scripts/test_vad.py` — VAD 分段验证脚本
- `setup.py` — 一键重建环境（venv + 依赖 + 模型）
- `models/` — SenseVoice int8 + silero_vad 模型（放 D 盘，离线）
- `chrome-profile/` — 已登录抖音的 Chrome profile 副本
- `output/` — 默认输出（实际口播产物建议放各知识库 audio/ 目录）

## 一句话流程
复制本机已登录 Chrome 的 User Data 到 chrome-profile 副本 → Playwright 启动该副本 → 拦截 aweme detail 接口取 `play_addr` 完整直链 → 带 Referer 下载完整 MP4 → SenseVoice(int8)+VAD 分段转写 → .txt 逐字稿（详见 SKILL.md）

## 环境重建（环境丢了别慌）
```
python setup.py
```
自动：建 venv → 装 sherpa-onnx/av/numpy → 从 ModelScope 下载 SenseVoice+VAD 模型。30 秒恢复，不用再装 torch。

## 注意
- 跑之前**关闭 Chrome**（同一 User Data 只能一个进程）。
- 模型已缓存，无需联网下载大模型。
- 转写完人工校对专有名词（SenseVoice 已大幅减少同音字错误）。
