/**
 * 英语开口练 · Cloudflare Workers 后端
 *
 * 路由:
 *   GET  /api/card/verify?code=&dev=    卡密校验（前端解锁用）
 *   POST /api/card/generate             卡密生成（后台脚本用，需 AdminKey）
 *   POST /api/card/list                 卡密列表（后台用，需 AdminKey）
 *   POST /api/asr                       ASR 打分（P0: 简单反馈；P1: 接火山/讯飞）
 *   POST /api/dialogue                  大模型对话 SSE 流式
 *   GET  /api/progress?uid=             拉取学习进度
 *   POST /api/progress                  上传学习进度
 *
 * 绑定（wrangler.toml 里需配）:
 *   - KV 命名空间 CARDS    (卡密库)
 *   - KV 命名空间 PROGRESS (用户进度)
 *   - KV 命名空间 RATE     (IP 限速)
 *   - 变量 ADMIN_KEY        (后台生成卡密的密钥)
 *   - 变量 VOLC_APP_ID      (P1 火山引擎 ASR)
 *   - 变量 VOLC_ACCESS_TOKEN
 *   - 变量 DOUBAO_API_KEY   (P2 豆包对话)
 */

const CARD_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'; // 去歧义（去 I L O 0 1）
const CARD_LEN = 12;
const RATE_LIMIT_PER_DAY = 20; // 单 IP 每日最多验证次数

// ============== 工具函数 ==============

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  });
}

function getClientIp(req) {
  return req.headers.get('cf-connecting-ip') || req.headers.get('x-forwarded-for') || '0.0.0.0';
}

function getToday() {
  return new Date().toISOString().slice(0, 10).replace(/-/g, '');
}

function genCardCode() {
  let raw = '';
  for (let i = 0; i < CARD_LEN; i++) {
    raw += CARD_ALPHABET[Math.floor(Math.random() * CARD_ALPHABET.length)];
  }
  return raw.match(/.{1,4}/g).join('-'); // XXXX-XXXX-XXXX
}

async function checkRateLimit(env, ip) {
  const key = `ip:${ip}:${getToday()}`;
  const cur = parseInt((await env.RATE.get(key)) || '0');
  if (cur >= RATE_LIMIT_PER_DAY) return false;
  await env.RATE.put(key, String(cur + 1), { expirationTtl: 86400 });
  return true;
}

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-Admin-Key',
  };
}

function corsPreflight() {
  return new Response(null, { status: 204, headers: corsHeaders() });
}

// ============== 卡密路由 ==============

async function verifyCard(env, code, devId, ip) {
  // IP 限速
  if (!(await checkRateLimit(env, ip))) {
    return { ok: false, msg: '今日验证次数已用完，明天再来' };
  }

  const key = `card:${code.toUpperCase()}`;
  const card = await env.CARDS.get(key, 'json');

  if (!card) return { ok: false, msg: '卡密不存在，请检查输入' };

  // 过期
  if (card.status === 'expired') return { ok: false, msg: '此卡密已作废' };
  if (card.expiredAt && Date.now() > card.expiredAt) return { ok: false, msg: '卡密已过期，请联系康哥续期' };

  // 未使用：首次激活
  if (card.status === 'unused') {
    card.status = 'used';
    card.uid = devId;
    card.usedAt = Date.now();
    await env.CARDS.put(key, JSON.stringify(card));
    return { ok: true, msg: '解锁成功！', batch: card.batch };
  }

  // 已使用：校验设备
  if (card.uid === devId) {
    return { ok: true, msg: '解锁成功（已绑定此设备）' };
  }
  return { ok: false, msg: '此卡密已绑定其他设备，如需更换设备请联系康哥' };
}

async function generateCards(env, body, adminKey) {
  if (!adminKey || body.adminKey !== adminKey) {
    return json({ ok: false, msg: '无权访问' }, 403);
  }
  const { count = 1, batch = 'B001', platform = 'other', expireDays = 365 } = body;
  if (count < 1 || count > 500) return json({ ok: false, msg: 'count 范围 1-500' }, 400);

  const expiredAt = Date.now() + expireDays * 86400 * 1000;
  const codes = [];
  for (let i = 0; i < count; i++) {
    const code = genCardCode();
    const card = {
      status: 'unused',
      platform,
      batch,
      expiredAt,
      uid: null,
      usedAt: null,
      createdAt: Date.now(),
    };
    await env.CARDS.put(`card:${code}`, JSON.stringify(card));
    codes.push(code);
  }
  return json({ ok: true, count, batch, expiredAt, codes });
}

async function listCards(env, adminKey) {
  if (adminKey !== env.ADMIN_KEY) return json({ ok: false, msg: '无权访问' }, 403);
  // KV list（注意：免费版 list 有 limit）
  const list = await env.CARDS.list({ prefix: 'card:', limit: 1000 });
  const items = await Promise.all(
    list.keys.map(async k => {
      const v = await env.CARDS.get(k.name, 'json');
      return v ? { code: k.name.slice(5), ...v } : null;
    })
  );
  return json({ ok: true, total: items.length, items: items.filter(Boolean) });
}

// ============== ASR 路由（P0: 简单反馈；P1: 接真 ASR） ==============

async function handleASR(req, env) {
  const blob = await req.arrayBuffer();
  const targetText = req.headers.get('x-target') || '';
  const sizeKB = Math.round(blob.byteLength / 1024);

  // P0: 基础反馈（基于音频时长粗估，不调 ASR）
  // P1 升级: 内部 fetch 火山引擎/讯飞，返回 {text, score}
  //   火山 ASR REST: POST https://openspeech.bytedance.com/api/v1/asr
  //     Header: Authorization: Bearer; Content-Type: application/json
  //     Body: { app: { appid, token, cluster }, audio: { data: base64 }, requests: { ... } }
  //     鉴权 token 每日刷新，需缓存
  if (!env.VOLC_APP_ID || !env.VOLC_ACCESS_TOKEN) {
    // 降级：返回粗反馈
    return json({
      ok: true,
      text: null,
      score: {
        sizeKB,
        feedback: sizeKB < 5 ? '录音过短，请重试（建议 ≥ 1 秒）' : '录音已收到，待接入 AI 打分',
      },
      mode: 'fallback',
    });
  }

  // ===== 以下为 P1 真 ASR 接入预留 =====
  // 1) 读取音频二进制 → base64
  // const audioBase64 = btoa(String.fromCharCode(...new Uint8Array(blob)));
  // 2) 调火山 REST
  // const r = await fetch('https://openspeech.bytedance.com/api/v1/asr', { ... });
  // 3) 拿到 asr_text 后做打分（编辑距离 / 词错率）
  // const score = calcCER(targetText, asrText);
  // return json({ ok: true, text: asrText, score: { ... } });

  return json({ ok: true, msg: 'ASR P1 待启用', mode: 'todo' });
}

// ============== 大模型对话（P2） ==============

async function handleDialogue(req, env) {
  if (!env.DOUBAO_API_KEY) return json({ ok: false, msg: '对话功能未启用' }, 503);

  // 接豆包 SSE 流式
  // const body = await req.json();
  // const upstream = await fetch('https://ark.cn-beijing.volces.com/api/v3/chat/completions', {
  //   method: 'POST',
  //   headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ' + env.DOUBAO_API_KEY },
  //   body: JSON.stringify({ model: 'doubao-pro-32k', stream: true, messages: body.messages }),
  // });
  // return new Response(upstream.body, {
  //   headers: { 'Content-Type': 'text/event-stream', ...corsHeaders() },
  // });

  return json({ ok: false, msg: '对话功能 P2 待启用' }, 503);
}

// ============== 进度同步 ==============

async function getProgress(env, uid) {
  const p = await env.PROGRESS.get(`prog:${uid}`, 'json');
  return json({ ok: true, progress: p });
}

async function saveProgress(env, uid, state) {
  // 限制大小（KV value 最大 25 MB，但建议 < 100 KB）
  const trimmed = JSON.stringify(state).slice(0, 100 * 1024);
  await env.PROGRESS.put(`prog:${uid}`, trimmed);
  return json({ ok: true });
}

// ============== 主入口 ==============

export default {
  async fetch(req, env, ctx) {
    if (req.method === 'OPTIONS') return corsPreflight();

    const url = new URL(req.url);
    const path = url.pathname;
    const ip = getClientIp(req);

    try {
      // --- 卡密 ---
      if (path === '/api/card/verify' && req.method === 'GET') {
        const code = url.searchParams.get('code') || '';
        const dev = url.searchParams.get('dev') || '';
        if (!code || !dev) return json({ ok: false, msg: '参数缺失' }, 400);
        const r = await verifyCard(env, code, dev, ip);
        return new Response(JSON.stringify(r), {
          headers: { 'Content-Type': 'application/json; charset=utf-8', ...corsHeaders() },
        });
      }
      if (path === '/api/card/generate' && req.method === 'POST') {
        const body = await req.json().catch(() => ({}));
        return generateCards(env, body, env.ADMIN_KEY);
      }
      if (path === '/api/card/list' && req.method === 'POST') {
        const body = await req.json().catch(() => ({}));
        return listCards(env, body.adminKey);
      }

      // --- ASR ---
      if (path === '/api/asr' && req.method === 'POST') {
        const r = await handleASR(req, env);
        return new Response(await r.text(), {
          status: r.status,
          headers: { 'Content-Type': 'application/json; charset=utf-8', ...corsHeaders() },
        });
      }

      // --- 对话（P2 启用） ---
      if (path === '/api/dialogue' && req.method === 'POST') {
        return handleDialogue(req, env);
      }

      // --- 进度 ---
      if (path === '/api/progress' && req.method === 'GET') {
        const uid = url.searchParams.get('uid') || '';
        if (!uid) return json({ ok: false, msg: 'uid 缺失' }, 400);
        return getProgress(env, uid);
      }
      if (path === '/api/progress' && req.method === 'POST') {
        const body = await req.json().catch(() => ({}));
        const uid = body.uid || '';
        if (!uid) return json({ ok: false, msg: 'uid 缺失' }, 400);
        return saveProgress(env, uid, body.state);
      }

      return json({ ok: false, msg: 'Not Found' }, 404);
    } catch (e) {
      return json({ ok: false, msg: 'Server Error', detail: e.message }, 500);
    }
  },
};