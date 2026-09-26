/* 把 .tmp-books/shucong-137books.epub 切成 8 块，输出到 .tmp-books/books-out/
 * 写法：每块一次性整读进独立内存再落盘，杜绝异步 write 复用 Buffer 的坑
 * （v1 用 setImmediate 复用同一 buf，write() 按引用排队，数据被后续读覆盖 →
 *  分块内容错乱但大小正确，手机/桌面导入后 foliate 报 File type not supported）
 * 内置验证：8 块拼接 SHA-256 必须等于源文件，否则退出码 1
 * 用法：node split-books.js */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const SRC = path.join(__dirname, '.tmp-books', 'shucong-137books.epub');
const OUT = path.join(__dirname, '.tmp-books', 'books-out');
const PARTS = 8;

(async () => {
  const src = fs.readFileSync(SRC);
  const total = src.length;
  const per = Math.ceil(total / PARTS);
  console.log('total:', total, 'bytes | per-part:', per, 'bytes | parts:', PARTS);
  const srcSha = crypto.createHash('sha256').update(src).digest('hex');
  console.log('src sha256:', srcSha);

  fs.mkdirSync(OUT, { recursive: true });
  const sizes = [];
  const parts = [];
  for (let i = 0; i < PARTS; i++) {
    const start = i * per;
    const end = Math.min(total, start + per);
    const partBuf = Buffer.alloc(end - start);
    src.copy(partBuf, 0, start, end);
    const name = 'shucong-137books.epub.part' + String(i + 1).padStart(2, '0');
    fs.writeFileSync(path.join(OUT, name), partBuf);
    sizes.push(partBuf.length);
    parts.push(partBuf);
    console.log(name, partBuf.length, 'bytes | sha256:', crypto.createHash('sha256').update(partBuf).digest('hex').slice(0, 16));
  }
  const joined = Buffer.concat(parts);
  const joinSha = crypto.createHash('sha256').update(joined).digest('hex');
  console.log('joined sha256:', joinSha);
  if (joinSha !== srcSha) {
    console.error('FATAL: 拼接哈希与源文件不一致！');
    process.exit(1);
  }
  fs.writeFileSync(path.join(OUT, 'manifest.json'), JSON.stringify({
    file: 'shucong-137books.epub',
    size: total,
    sha256: srcSha,
    parts: PARTS,
    partBytes: per,
    sizes: sizes
  }, null, 2));
  console.log('VERIFIED OK →', OUT);
})();
