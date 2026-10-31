/* 本地静态服务器（默认 8931，可用 --port N 指定），带 CORS，用于本地调试与发版自检 */
const http = require('http');
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, 'app');
const PORT = (function () {
  const i = process.argv.indexOf('--port');
  const n = i > -1 ? Number(process.argv[i + 1]) : 0;
  return n > 0 && n < 65536 ? n : 8931;
})();
http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  let p = decodeURIComponent(req.url.split('?')[0].split('#')[0]);
  if (p === '/') p = '/index.html';
  const full = path.resolve(ROOT, '.' + p);
  /* 双重防护：resolve 后必须仍在 ROOT 内（relative 为空即同目录/子目录），拒绝任何穿越 */
  if (path.relative(ROOT, full).startsWith('..') || path.isAbsolute(path.relative(ROOT, full)) ||
      !fs.existsSync(full) || fs.statSync(full).isDirectory()) {
    res.writeHead(404); return res.end('nf');
  }
  const ext = path.extname(full).toLowerCase();
  const mt = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.svg': 'image/svg+xml', '.woff2': 'font/woff2' };
  res.setHeader('Content-Type', mt[ext] || 'application/octet-stream');
  res.setHeader('Cache-Control', 'no-store');
  fs.createReadStream(full).pipe(res);
}).listen(PORT, '127.0.0.1', () => console.log('dev server on ' + PORT));
