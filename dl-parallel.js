/* 4 路并行断点续传下载 shucong EPUB（绕开单连接限速）
 * 先把已有的顺序下载文件切到各分段种子，再并行拉剩余区间
 * 用法：node dl-parallel.js */
const https = require('https');
const fs = require('fs');
const path = require('path');

const DIR = path.join(__dirname, '.tmp-books');
const OUT = path.join(DIR, 'shucong-137books.epub');
const URL0 = 'https://github.com/Dukekang0124/vocab-growth/releases/download/builtin-books-v1/shucong-137books.epub';
const TOTAL = 148094596;
const W = 4; // 并行数
const winSize = Math.ceil(TOTAL / W);
const wins = [];
for (let i = 0; i < W; i++) {
  const s = i * winSize;
  wins.push({ start: s, end: Math.min(TOTAL, s + winSize), file: path.join(DIR, 'win' + i) });
}

function fetchOnce(url, headers) {
  return new Promise((res, rej) => {
    const req = https.get(url, { headers }, r => {
      if (r.statusCode >= 300 && r.statusCode < 400 && r.headers.location) {
        r.resume();
        return fetchOnce(r.headers.location, headers).then(res, rej);
      }
      /* 连接 45 秒无数据视为死连接，销毁后由上层重试 */
      r.socket.setTimeout(45000, () => { r.destroy(new Error('socket idle timeout')); });
      res(r);
    });
    req.setTimeout(45000, () => req.destroy(new Error('connect timeout')));
    req.on('error', rej);
  });
}

async function sizeProbe() {
  for (let i = 0; i < 5; i++) {
    try {
      const r = await fetchOnce(URL0, { 'User-Agent': 'vocab-growth', 'Range': 'bytes=0-0' });
      r.resume();
      const cr = r.headers['content-range'];
      if (cr) return parseInt(cr.split('/')[1], 10);
    } catch (e) { /* retry */ }
  }
  return 0;
}

async function downloadWin(w, tag) {
  const want = w.end - w.start;
  for (;;) {
    let have = fs.existsSync(w.file) ? fs.statSync(w.file).size : 0;
    if (have >= want) { console.log(tag, 'done', have); return; }
    try {
      const r = await fetchOnce(URL0, { 'User-Agent': 'vocab-growth', 'Range': 'bytes=' + (w.start + have) + '-' + (w.end - 1) });
      if (r.statusCode !== 206) { r.resume(); throw new Error('HTTP ' + r.statusCode + ' (want 206)'); }
      await new Promise((res, rej) => {
        const f = fs.createWriteStream(w.file, { flags: 'a' });
        r.pipe(f);
        f.on('finish', res);
        f.on('error', rej);
        r.on('error', rej);
      });
    } catch (e) {
      console.log(tag, 'retry at', fs.existsSync(w.file) ? fs.statSync(w.file).size : 0, '-', e.message);
      await new Promise(r => setTimeout(r, 1200));
    }
  }
}

(async () => {
  const real = await sizeProbe();
  if (real && real !== TOTAL) { console.log('SIZE MISMATCH remote=' + real); process.exit(1); }
  /* 旧顺序下载文件 → 分段种子 */
  if (fs.existsSync(OUT)) {
    const have = fs.statSync(OUT).size;
    for (const w of wins) {
      if (fs.existsSync(w.file)) continue;
      const from = Math.max(0, Math.min(have, w.start));
      const to = Math.min(have, w.end);
      if (to > from) {
        const buf = Buffer.alloc(to - from);
        const fd = fs.openSync(OUT, 'r');
        fs.readSync(fd, buf, 0, buf.length, from);
        fs.closeSync(fd);
        fs.writeFileSync(w.file, buf);
      }
    }
    fs.unlinkSync(OUT);
    console.log('seeded windows from previous partial (' + have + ' bytes)');
  }
  const t0 = Date.now();
  await Promise.all(wins.map((w, i) => downloadWin(w, '[W' + i + ']')));
  /* 合并 */
  const out = fs.createWriteStream(OUT);
  for (const w of wins) {
    const sz = fs.statSync(w.file).size;
    if (sz !== w.end - w.start) { console.log('BAD window size', sz, 'want', w.end - w.start); process.exit(1); }
    await new Promise((res, rej) => {
      const rs = fs.createReadStream(w.file);
      rs.pipe(out, { end: false });
      rs.on('end', res);
      rs.on('error', rej);
    });
  }
  await new Promise(res => out.end(res));
  const finalSize = fs.statSync(OUT).size;
  console.log('MERGED', finalSize, 'bytes in', Math.round((Date.now() - t0) / 1000) + 's');
  if (finalSize !== TOTAL) process.exit(1);
  console.log('OK');
  process.exit(0);
})();
