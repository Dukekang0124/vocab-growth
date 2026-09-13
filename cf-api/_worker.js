// 词汇生长 · 语音识别 API（Cloudflare Pages Functions）
// 照 Sinoky sinoky.pages.dev 的成熟模式：前端录音 → 这里的 /api/asr → Workers AI Whisper → 文字
// 免费额度：Workers AI 每天 10,000 neurons，个人口语陪练绰绰有余
const ALLOWED_ORIGINS = [
  'https://dukekang0124.github.io',   // 线上网页
  'https://localhost',                // Capacitor APK WebView
  'http://localhost',                 // 本地调试
  'http://127.0.0.1',
  'http://localhost:8432',
  'http://127.0.0.1:8432'
];
function json(obj, status, extra) {
  return new Response(JSON.stringify(obj), {
    status: status,
    headers: Object.assign({ 'Content-Type': 'application/json' }, extra || {})
  });
}
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const CORS = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    };
    if (request.method === 'OPTIONS') return new Response(null, { headers: CORS });
    if (url.pathname === '/health') return json({ ok: true, ts: Date.now() }, 200, CORS);
    if (url.pathname === '/api/asr' && request.method === 'POST') {
      // 来源白名单（无 origin 的调用如 curl 健康检查放行）
      const origin = request.headers.get('origin');
      if (origin && ALLOWED_ORIGINS.indexOf(origin) < 0) {
        return json({ ok: false, error: 'origin not allowed' }, 403, CORS);
      }
      try {
        const buf = await request.arrayBuffer();
        if (!buf || buf.byteLength < 100) return json({ ok: false, error: 'no audio' }, 400, CORS);
        if (buf.byteLength > 15 * 1024 * 1024) return json({ ok: false, error: 'audio too large' }, 413, CORS);
        const bytes = new Uint8Array(buf);
        let binary = '';
        for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
        const r = await env.AI.run('@cf/openai/whisper-large-v3-turbo', { audio: btoa(binary) });
        const text = String((r && (r.text || r.transcription)) || '').trim();
        return json({ ok: true, text: text }, 200, CORS);
      } catch (e) {
        return json({ ok: false, error: String((e && e.message) || e) }, 500, CORS);
      }
    }
    return json({ ok: false, error: 'not found' }, 404, CORS);
  }
};
