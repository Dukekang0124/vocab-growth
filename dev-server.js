/* 本地静态服务器（8931），带 CORS，用于桌面端复现书虫打开问题 */
const http = require('http');
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, 'app');
http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  let p = decodeURIComponent(req.url.split('?')[0].split('#')[0]);
  if (p === '/') p = '/index.html';
  const full = path.join(ROOT, p);
  if (!full.startsWith(ROOT) || !fs.existsSync(full) || fs.statSync(full).isDirectory()) {
    res.writeHead(404); return res.end('nf');
  }
  const ext = path.extname(full).toLowerCase();
  const mt = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.svg': 'image/svg+xml', '.woff2': 'font/woff2' };
  res.setHeader('Content-Type', mt[ext] || 'application/octet-stream');
  fs.createReadStream(full).pipe(res);
}).listen(8931, '127.0.0.1', () => console.log('dev server on 8931'));
