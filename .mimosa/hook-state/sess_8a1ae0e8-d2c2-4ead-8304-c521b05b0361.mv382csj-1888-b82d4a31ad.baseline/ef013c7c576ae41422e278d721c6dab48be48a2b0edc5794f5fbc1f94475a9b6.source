/* 内联事件零死链检查（学自「我能说英语」_smoke-test.js 的做法）
 * 用法：node _smoke-test.js
 * 扫描 index.html 里所有 onclick/onchange/onsubmit 中的 VG_APP.xxx 调用，
 * 逐一到 js/app.js 的 api 导出对象里核对是否真的存在。 */
const fs = require('fs');
const path = require('path');

const html = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf8');
const appJs = fs.readFileSync(path.join(__dirname, 'js', 'app.js'), 'utf8');

/* 收集 api 导出对象里的所有 key（截取 "var api = {" 到 "};" 的段落） */
const apiMatch = appJs.match(/var api = \{([\s\S]*?)\n  \};/);
if (!apiMatch) { console.error('✗ 找不到 api 导出对象'); process.exit(1); }
const apiKeys = new Set();
const keyRe = /([A-Za-z_$][\w$]*)\s*:/g;
let m;
while ((m = keyRe.exec(apiMatch[1])) !== null) apiKeys.add(m[1]);

/* 收集 HTML 里全部内联事件中引用的 VG_APP.xxx */
const callRe = /VG_APP\.([A-Za-z_$][\w$]*)/g;
const called = new Set();
const inlineRe = /on(?:click|change|submit|input)="([^"]*)"/g;
let im;
while ((im = inlineRe.exec(html)) !== null) {
  let cm;
  const cRe = new RegExp(callRe.source, 'g');
  while ((cm = cRe.exec(im[1])) !== null) called.add(cm[1]);
}

/* app.js 内部生成的动态 HTML 也会带 onclick，一并扫（宽松：全文件扫） */
let dm;
const dRe = new RegExp(callRe.source, 'g');
while ((dm = dRe.exec(appJs)) !== null) called.add(dm[1]);

/* 核对 */
const missing = [...called].filter(k => !apiKeys.has(k) && !['_store'].includes(k));

console.log('内联/动态事件引用的 VG_APP 方法数:', called.size);
console.log('api 导出方法数:', apiKeys.size);
if (missing.length) {
  console.error('✗ 死链（HTML/JS 调用了但 api 未导出）:');
  missing.forEach(k => console.error('  - VG_APP.' + k));
  process.exit(1);
} else {
  console.log('✓ 零死链：所有 VG_APP.xxx 调用都有对应导出');
}
