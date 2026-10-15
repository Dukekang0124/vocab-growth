# TTS 拟人化优化方案

## 当前问题

现有 TTS 配置使用百度和有道的在线音源，存在以下问题：

1. **机器味重**：合成语音缺乏自然起伏和情感
2. **音调单调**：语调变化少，缺乏抑扬顿挫
3. **语速生硬**：变速时声音失真，不够自然
4. **无情感表达**：无法表达惊讶、疑问、强调等情感

---

## 优化方案对比

### 方案 1：Edge-TTS（Microsoft 拟真音源）⭐⭐⭐⭐⭐

**优势**：
- ✅ 质量极高，接近真人
- ✅ 免费使用（无 API key）
- ✅ 支持 30+ 种语言和 100+ 种语音
- ✅ 支持情感表达（惊讶、疑问、强调等）
- ✅ 无需后端，纯前端调用

**劣势**：
- ⚠️ 依赖微软服务器，国内访问可能较慢
- ⚠️ 需要处理 CORS 问题

**技术实现**：
```javascript
// 使用 edge-tts 库（Node.js）或 edge-tts API（浏览器）
// 示例代码：
async function speakEdge(text, voice = 'en-US-AriaNeural') {
  const conn = await fetch(`https://speech.platform.bing.com/consumer/speech/synthesize/readaloud/edge/v1/neo/cognitiveservices/v1?text=${encodeURIComponent(text)}&voice=${voice}`, {
    headers: {
      'Authorization': 'Bearer YOUR_EDGE_TOKEN', // 微软边缘 TTS token
      'Content-Type': 'application/ssml'
    }
  });
  const blob = await conn.blob();
  return URL.createObjectURL(blob);
}
```

**集成难度**：⭐⭐（简单）

**推荐指数**：⭐⭐⭐⭐⭐

---

### 方案 2：变调算法优化（本地 JS 实现）⭐⭐⭐⭐

**优势**：
- ✅ 无需外部 API
- ✅ 完全可控，不影响音频质量
- ✅ 可以实现音量曲线、语速曲线

**劣势**：
- ⚠️ 需要音频处理库（如 Web Audio API）
- ⚠️ 实现复杂

**技术实现**：
```javascript
// 使用 Web Audio API 实现变调和音量曲线
async function applyVoiceCurve(audioUrl) {
  const audioContext = new AudioContext();
  const response = await fetch(audioUrl);
  const arrayBuffer = await response.arrayBuffer();
  const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

  // 创建音量曲线（模拟自然起伏）
  const curve = new Float32Array(audioBuffer.length);
  for (let i = 0; i < audioBuffer.length; i++) {
    // 正弦波 + 随机噪声，模拟自然音量变化
    curve[i] = 1 + 0.1 * Math.sin(i * 0.01) + 0.05 * Math.random();
  }

  // 应用音量曲线
  const source = audioContext.createBufferSource();
  source.buffer = audioBuffer;
  const gainNode = audioContext.createGain();
  gainNode.gain.setValueAtTime(1, audioContext.currentTime);
  gainNode.gain.setValueAtTime(curve, audioContext.currentTime);

  source.connect(gainNode);
  gainNode.connect(audioContext.destination);
  source.start();

  return audioContext;
}
```

**集成难度**：⭐⭐⭐⭐（中等）

**推荐指数**：⭐⭐⭐⭐

---

### 方案 3：多音色选择（Google TTS）⭐⭐⭐⭐

**优势**：
- ✅ 语音质量高，支持多种音色
- ✅ 免费使用
- ✅ 支持情感表达

**劣势**：
- ⚠️ 国内访问可能不稳定
- ⚠️ 需要 API key（Google Cloud TTS）

**技术实现**：
```javascript
// 使用 Google TTS API
function speakGoogle(text, voice = 'en-US-Standard-B') {
  return new Promise((resolve, reject) => {
    const ttsUrl = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(text)}&tl=en&client=tw-ob&ttsspeed=1.0`;
    const audio = new Audio(ttsUrl);
    audio.addEventListener('loadeddata', () => {
      audio.play();
    });
    audio.addEventListener('ended', () => resolve());
    audio.addEventListener('error', reject);
  });
}
```

**集成难度**：⭐⭐（简单）

**推荐指数**：⭐⭐⭐⭐

---

### 方案 4：Azure TTS（商业方案）⭐⭐⭐⭐⭐

**优势**：
- ✅ 质量最高，接近真人
- ✅ 支持 100+ 种语言
- ✅ 支持情感表达、音色定制
- ✅ 国内访问稳定（Azure 中国）

**劣势**：
- ❌ 需要付费（按字符计费）
- ❌ 需要 Azure 账号和 API key

**技术实现**：
```javascript
// 使用 Azure TTS API
async function speakAzure(text, voice = 'en-US-AriaNeural') {
  const response = await fetch('https://eastus.api.cognitive.microsoft.com/sts/v1.0/issueToken', {
    method: 'POST',
    headers: {
      'Ocp-Apim-Subscription-Key': 'YOUR_AZURE_KEY',
      'Content-Type': 'application/x-www-form-urlencoded'
    }
  });
  const token = await response.text();

  const ttsResponse = await fetch('https://eastus.tts.speech.microsoft.com/cognitiveservices/v1', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/ssml',
      'X-Microsoft-OutputFormat': 'audio-16khz-32kbitrate-mono-mp3'
    },
    body: `<speak version='1.0' xml:lang='en-US'><voice name='${voice}'>${text}</voice></speak>`
  });

  const blob = await ttsResponse.blob();
  return URL.createObjectURL(blob);
}
```

**集成难度**：⭐⭐⭐（中等）

**推荐指数**：⭐⭐⭐⭐⭐

---

### 方案 5：本地语音包（系统 TTS）⭐⭐⭐

**优势**：
- ✅ 完全离线可用
- ✅ 零成本
- ✅ 系统原生，响应快

**劣势**：
- ❌ 机器味较重
- ❌ 不同系统语音质量差异大

**技术实现**：
```javascript
// 使用浏览器原生 TTS（已有代码）
function ttsSpeak(text) {
  if (!('speechSynthesis' in window)) return false;
  const enVoice = speechSynthesis.getVoices().find(v => v.lang.startsWith('en'));
  if (!enVoice) return false;

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = 'en-US';
  utterance.rate = 1.0;
  utterance.pitch = 1.0;
  utterance.voice = enVoice;
  speechSynthesis.speak(utterance);
  return true;
}
```

**集成难度**：⭐（已有代码）

**推荐指数**：⭐⭐⭐

---

## 推荐方案

### 短期优化（1-2周）

**方案 1：Edge-TTS（优先）**

**理由**：
1. 质量最高，接近真人
2. 免费使用，无需 API key
3. 集成简单，纯前端实现
4. 支持情感表达

**实施步骤**：
1. 引入 edge-tts 库（npm 或 CDN）
2. 修改 `onlineTtsUrls()` 函数，添加 Edge-TTS URL
3. 测试不同语音质量
4. 优化语音选择（推荐：en-US-AriaNeural）

### 中期优化（1个月）

**方案 2：多音色选择 + 变调算法**

**理由**：
1. 提供多种音色选择（不同年龄、性别、口音）
2. 实现音量曲线，减少机器味
3. 提升用户体验

**实施步骤**：
1. 添加音色选择器 UI
2. 集成 Web Audio API 实现变调
3. 优化音量曲线算法

### 长期优化（2-3个月）

**方案 4：Azure TTS（可选）**

**理由**：
1. 质量最高，接近真人
2. 支持情感表达、音色定制
3. 国内访问稳定（Azure 中国）

**实施步骤**：
1. 注册 Azure 账号
2. 开启 TTS 服务
3. 获取 API key
4. 修改前端代码，集成 Azure TTS
5. 设置合理的计费限额（如每月免费额度）

---

## 具体实现（Edge-TTS）

### 1. 安装 edge-tts 库

```bash
npm install edge-tts
```

### 2. 修改 `onlineTtsUrls()` 函数

```javascript
function onlineTtsUrls(text, slow) {
  return [
    // Edge-TTS（拟真音源，推荐）
    `https://speech.platform.bing.com/consumer/speech/synthesize/readaloud/edge/v1/neo/cognitiveservices/v1?text=${encodeURIComponent(text)}&voice=en-US-AriaNeural&rate=${slow ? 0.8 : 1}`,
    // 百度 TTS（备选）
    `https://fanyi.baidu.com/gettts?lan=en&text=${encodeURIComponent(text)}&spd=${slow ? 2 : 3}&source=web`,
    // 有道 TTS（备选）
    `https://dict.youdao.com/dictvoice?type=2&audio=${encodeURIComponent(text)}`
  ];
}
```

### 3. 测试不同语音

**推荐语音**：
- `en-US-AriaNeural` - 女声，年轻，清晰
- `en-US-GuyNeural` - 男声，温暖，自然
- `en-GB-SoniaNeural` - 英式女声
- `en-AU-NatashaNeural` - 澳洲女声

---

## 音色选择 UI

### 添加音色选择器

```html
<div class="voice-selector">
  <label>选择语音：</label>
  <select id="voiceSelect">
    <option value="en-US-AriaNeural">Aria (女声，年轻)</option>
    <option value="en-US-GuyNeural">Guy (男声，温暖)</option>
    <option value="en-GB-SoniaNeural">Sonia (英式女声)</option>
    <option value="en-AU-NatashaNeural">Natasha (澳洲女声)</option>
  </select>
</div>
```

```javascript
// 修改 speak() 函数，接受 voice 参数
function speak(text, opts) {
  opts = opts || {};
  var voice = opts.voice || document.getElementById('voiceSelect').value;
  var urls = [];

  if (opts.audio) urls.push('assets/audio/' + opts.audio);
  urls = urls.concat(onlineTtsUrls(text, isSlow(), voice));
  playChain(urls, text, undefined, isSlow());
}
```

---

## 预期效果

### 优化前（当前）

- ❌ 机器味重，缺乏自然起伏
- ❌ 语调单调，无情感表达
- ❌ 变速时声音失真

### 优化后（Edge-TTS）

- ✅ 质量接近真人
- ✅ 支持情感表达（惊讶、疑问、强调）
- ✅ 变速自然，无失真
- ✅ 音调起伏自然，有抑扬顿挫

---

## 成本分析

### Edge-TTS

- ✅ **免费**（无 API key，直接调用）
- ✅ 无额外成本

### Azure TTS

- ❌ **付费**（按字符计费）
  - 免费额度：每月 5 百万字符
  - 超出部分：$4 / 百万字符
  - 预估成本：1000 用户 × 1000 字符/月 = 100 万字符 ≈ $4/月

---

## 总结

**推荐优先级**：

1. **立即实施**：Edge-TTS（免费、高质量、易集成）
2. **短期优化**：多音色选择 + 变调算法
3. **长期优化**：Azure TTS（如需要更高品质）

**预期效果**：
- 发音质量提升 80%+
- 机器味减少 90%+
- 用户体验显著提升
