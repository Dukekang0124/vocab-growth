/**
 * Edge-TTS 集成代码
 * 将 Microsoft Edge 拟真音源集成到词汇生长应用
 *
 * 使用方法：
 * 1. 复制此文件到 js/ 目录
 * 2. 在 index.html 中引入：&lt;script src="js/edge-tts-integration.js"&gt;&lt;/script&gt;
 * 3. 修改 onlineTtsUrls() 函数
 */

// ============== Edge-TTS 集成 ==============

/**
 * 语音列表（推荐）
 * en-US-AriaNeural: 女声，年轻，清晰
 * en-US-GuyNeural: 男声，温暖，自然
 * en-GB-SoniaNeural: 英式女声
 * en-AU-NatashaNeural: 澳洲女声
 * en-CA-LiamNeural: 加拿大男声
 * en-IN-NeerjaNeural: 印度女声
 */
var EDGE_VOICES = {
  'en-US-AriaNeural': 'Aria (女声，年轻)',
  'en-US-GuyNeural': 'Guy (男声，温暖)',
  'en-GB-SoniaNeural': 'Sonia (英式女声)',
  'en-AU-NatashaNeural': 'Natasha (澳洲女声)',
  'en-CA-LiamNeural': 'Liam (加拿大男声)',
  'en-IN-NeerjaNeural': 'Neerja (印度女声)',
  'en-ZA-LeoNeural': 'Leo (南非男声)',
  'en-NZ-MollyNeural': 'Molly (新西兰女声)'
};

var currentVoice = 'en-US-AriaNeural'; // 默认语音

/**
 * 获取 Edge-TTS URL
 * @param {string} text - 要合成的文本
 * @param {number} rate - 语速 (0.5 - 2.0)
 * @param {string} voice - 语音 ID
 * @returns {string} Edge-TTS URL
 */
function getEdgeTTSUrl(text, rate, voice) {
  rate = rate || 1.0;
  voice = voice || currentVoice;

  // Edge-TTS API
  return `https://speech.platform.bing.com/consumer/speech/synthesize/readaloud/edge/v1/neo/cognitiveservices/v1?text=${encodeURIComponent(text)}&voice=${voice}&rate=${rate}`;
}

/**
 * 播放 Edge-TTS 音频
 * @param {string} text - 要合成的文本
 * @param {number} rate - 语速 (0.5 - 2.0)
 * @param {string} voice - 语音 ID
 * @returns {Promise&lt;HTMLAudioElement&gt;} 音频元素
 */
function playEdgeTTS(text, rate, voice) {
  return new Promise((resolve, reject) => {
    const audioUrl = getEdgeTTSUrl(text, rate, voice);
    const audio = new Audio(audioUrl);

    audio.addEventListener('loadeddata', () => {
      // 恢复之前的语速设置
      audio.playbackRate = rate;
    });

    audio.addEventListener('error', (e) => {
      console.error('Edge-TTS 播放失败:', e);
      reject(e);
    });

    audio.addEventListener('ended', () => {
      resolve(audio);
    });

    audio.play().catch(reject);
  });
}

/**
 * 修改 onlineTtsUrls() 函数，添加 Edge-TTS 支持
 * 在 app.js 中替换原有的 onlineTtsUrls() 函数：
 */
function onlineTtsUrls(text, slow) {
  var rate = slow ? 0.8 : 1.0; // 慢速模式语速 0.8

  return [
    // Edge-TTS（拟真音源，推荐，优先）
    getEdgeTTSUrl(text, rate, currentVoice),
    // 百度 TTS（备选）
    'https://fanyi.baidu.com/gettts?lan=en&text=' + encodeURIComponent(text) + '&spd=' + (slow ? 2 : 3) + '&source=web',
    // 有道 TTS（备选）
    'https://dict.youdao.com/dictvoice?type=2&audio=' + encodeURIComponent(text)
  ];
}

// ============== 音色选择器 UI ==============

/**
 * 添加音色选择器到页面
 * 在 app.js 的 init() 函数中调用：
 */
function initVoiceSelector() {
  // 创建音色选择器容器
  var container = document.createElement('div');
  container.className = 'voice-selector';
  container.innerHTML = `
    <label for="voiceSelect">选择语音：</label>
    <select id="voiceSelect">
      ${Object.entries(EDGE_VOICES).map(([id, name]) =>
        `<option value="${id}" ${id === currentVoice ? 'selected' : ''}>${name}</option>`
      ).join('')}
    </select>
  `;

  // 添加到页面底部
  document.body.appendChild(container);

  // 监听变化
  document.getElementById('voiceSelect').addEventListener('change', function() {
    currentVoice = this.value;
    console.log('切换语音到:', EDGE_VOICES[currentVoice]);
  });
}

// ============== 测试代码 ==============

/**
 * 测试所有语音
 */
function testAllVoices() {
  var testText = 'Hello, this is a test of the voice quality.';
  var voices = Object.keys(EDGE_VOICES);

  console.log('开始测试 ' + voices.length + ' 种语音...');

  voices.forEach(function(voiceId, index) {
    setTimeout(function() {
      console.log('测试语音:', EDGE_VOICES[voiceId]);
      playEdgeTTS(testText, 1.0, voiceId);
    }, index * 3000); // 每 3 秒测试一个语音
  });
}

// ============== 使用示例 ==============

/*
// 在 index.html 中引入此文件：
&lt;script src="js/edge-tts-integration.js"&gt;&lt;/script&gt;

// 在 app.js 的 init() 函数中调用：
initVoiceSelector();

// 测试所有语音：
testAllVoices();

// 或者在控制台手动调用：
playEdgeTTS('Hello, vocabulary growth!', 1.0, 'en-US-AriaNeural');
*/

// ============== 注意事项 ==============

/*
1. Edge-TTS 免费使用，无需 API key
2. 需要网络连接，国内访问可能较慢
3. 支持情感表达（惊讶、疑问、强调等）
4. 语速范围：0.5 - 2.0
5. 如果 Edge-TTS 不可用，会自动回落到百度/有道 TTS
6. 推荐在设置页面提供音色选择，提升用户体验
*/
