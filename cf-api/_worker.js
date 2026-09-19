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
    /* 免费英英词典兜底：代理 dictionaryapi.dev 并归一化（CF→CF 可达，绕开国内直连失败） */
    if (url.pathname === '/api/define' && request.method === 'GET') {
      const origin = request.headers.get('origin');
      if (origin && ALLOWED_ORIGINS.indexOf(origin) < 0) {
        return json({ ok: false, error: 'origin not allowed' }, 403, CORS);
      }
      const word = (url.searchParams.get('word') || '').toLowerCase().replace(/[^a-z'-]/g, '').slice(0, 40);
      if (!word) return json({ ok: false, error: 'word required' }, 400, CORS);
      try {
        let ipa = '', defs = [];
        /* 源1: dictionaryapi.dev（时常宕机） */
        try {
          const r = await fetch('https://api.dictionaryapi.dev/api/v2/entries/en/' + encodeURIComponent(word), {
            headers: { 'User-Agent': 'vocab-growth/1.0' }
          });
          if (r.ok) {
            const data = await r.json();
            const first = Array.isArray(data) && data[0];
            if (first) {
              ipa = ((first.phonetics || []).find(p => p && p.text) || {}).text || '';
              for (const m of (first.meanings || [])) {
                for (const d of (m.definitions || []).slice(0, 1)) {
                  if (d.definition && defs.length < 3) defs.push((m.partOfSpeech ? m.partOfSpeech + '. ' : '') + d.definition);
                }
                if (defs.length >= 3) break;
              }
            }
          }
        } catch (e) {}
        /* 源2: Wiktionary REST（Wikimedia，稳定） */
        if (!defs.length) {
          try {
            const r2 = await fetch('https://en.wiktionary.org/api/rest_v1/page/definition/' + encodeURIComponent(word), {
              headers: { 'User-Agent': 'vocab-growth/1.0 (contact: kz910124@weixin)' }
            });
            if (r2.ok) {
              const j2 = await r2.json();
              const enSections = (j2.en || []);
              for (const sec of enSections) {
                for (const d of (sec.definitions || [])) {
                  if (defs.length >= 3) break;
                  const html = (d.definition || '').toString();
                  const text = html.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
                  if (text) defs.push((sec.partOfSpeech ? sec.partOfSpeech + '. ' : '') + text);
                }
                if (defs.length >= 3) break;
              }
            }
          } catch (e) {}
        }
        if (!defs.length) return json({ ok: true, word: word, ipa: '', defs: [], miss: true }, 200, CORS);
        return json({ ok: true, word: word, ipa: ipa.replace(/^\/|\/$/g, ''), defs: defs }, 200, CORS);
      } catch (e) {
        return json({ ok: false, error: String((e && e.message) || e) }, 502, CORS);
      }
    }
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
