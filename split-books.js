/* 把 .tmp-books/shucong-137books.epub 切成 8 块，输出到 .tmp-books/books-out/
 * 块大小与 app/js/shelf.js 的 BUILTIN_PART_BYTES 一致（ceil(总大小/8)）
 * 用法：node split-books.js */
const fs = require('fs');
const path = require('path');

const SRC = path.join(__dirname, '.tmp-books', 'shucong-137books.epub');
const OUT = path.join(__dirname, '.tmp-books', 'books-out');
const PARTS = 8;

const stat = fs.statSync(SRC);
const total = stat.size;
const per = Math.ceil(total / PARTS);
console.log('total:', total, 'bytes | per-part:', per, 'bytes | parts:', PARTS);

fs.mkdirSync(OUT, { recursive: true });
const sizes = [];
const buf = Buffer.alloc(Math.min(per, 4 * 1024 * 1024));
(async () => {
const fd = fs.openSync(SRC, 'r');
for (let i = 0; i < PARTS; i++) {
  const start = i * per;
  const end = Math.min(total, start + per);
  const name = 'shucong-137books.epub.part' + String(i + 1).padStart(2, '0');
  const out = fs.createWriteStream(path.join(OUT, name));
  let pos = start;
  await new Promise((res, rej) => {
    out.on('error', rej);
    (function pump() {
      if (pos >= end) { out.end(res); return; }
      const n = fs.readSync(fd, buf, 0, Math.min(buf.length, end - pos), pos);
      if (n <= 0) { out.end(res); return; }
      out.write(n === buf.length ? buf : buf.subarray(0, n));
      pos += n;
      setImmediate(pump);
    })();
  });
  sizes.push(end - start);
  console.log(name, end - start, 'bytes');
}
fs.closeSync(fd);
fs.writeFileSync(path.join(OUT, 'manifest.json'), JSON.stringify({
  name: '书虫入门级-6级套装（共137册）.epub',
  file: 'shucong-137books.epub',
  size: total,
  parts: PARTS,
  partBytes: per,
  sizes: sizes
}, null, 2));
console.log('DONE →', OUT);
})();
