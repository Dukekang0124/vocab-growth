const https = require('https');
const fs = require('fs');
const path = require('path');
const TOKEN = fs.readFileSync(path.join(__dirname, '.gh-token'), 'utf8').trim();
const OWNER = 'Dukekang0124', REPO = 'vocab-growth';
const EPUB_PATH = 'D:/电子书/已上传-微信读书/英文书籍/书虫入门级-6级套装（本套装共137册） (布鲁克 (Helen Brooke)) (z-library.sk, 1lib.sk, z-lib.sk).epub';
const EPUB_NAME = 'shucong-137books.epub';

function api(method, reqPath, data, headers) {
  return new Promise((res, rej) => {
    const h = Object.assign({ 'Authorization': 'token ' + TOKEN, 'User-Agent': 'vocab-growth' }, headers || {});
    if (data && !(headers || {})['Content-Type']) h['Content-Type'] = 'application/json';
    if (data && data.length) h['Content-Length'] = data.length;
    const r = https.request({ hostname: 'api.github.com', path: reqPath, method, headers: h }, x => {
      const c = []; x.on('data', d => c.push(d));
      x.on('end', () => res({ code: x.statusCode, headers: x.headers, body: Buffer.concat(c) }));
    });
    r.on('error', rej);
    if (data) r.write(data);
    r.end();
  });
}

function uploadAsset(uploadUrl, filePath, fileName) {
  return new Promise((res, rej) => {
    const fileSize = fs.statSync(filePath).size;
    const h = {
      'Authorization': 'token ' + TOKEN,
      'User-Agent': 'vocab-growth',
      'Content-Type': 'application/octet-stream',
      'Content-Length': fileSize
    };
    const url = new URL(uploadUrl);
    const r = https.request({ hostname: url.hostname, path: url.pathname + url.search, method: 'POST', headers: h }, x => {
      const c = []; x.on('data', d => c.push(d));
      x.on('end', () => { console.log('upload response:', x.statusCode); res({ code: x.statusCode, body: Buffer.concat(c).toString() }); });
    });
    r.on('error', rej);
    const stream = fs.createReadStream(filePath);
    stream.pipe(r);
    stream.on('error', rej);
  });
}

(async () => {
  // 1. Create release
  console.log('Creating release...');
  const relData = JSON.stringify({
    tag_name: 'builtin-books-v1',
    name: '内置书库 · 书虫入门级-6级套装（137册）',
    body: '词汇生长内置书库资源。点击下载后自动导入书架。\n\n来源：书虫·牛津英汉双语读物（外研社）\n格式：EPUB（141MB）',
    draft: false,
    prerelease: false
  });
  const rel = await api('POST', `/repos/${OWNER}/${REPO}/releases`, Buffer.from(relData));
  const relJson = JSON.parse(rel.body);
  if (rel.code !== 201) { console.log('Release creation failed:', rel.code, rel.body.slice(0, 200)); return; }
  console.log('Release created:', relJson.id, relJson.upload_url.split('?')[0]);

  // 2. Upload EPUB
  console.log('Uploading EPUB (141MB, this may take 5-10 minutes)...');
  const uploadUrl = relJson.upload_url.replace('{?name,label}', '?name=' + EPUB_NAME);
  const up = await uploadAsset(uploadUrl, EPUB_PATH, EPUB_NAME);
  const upJson = JSON.parse(up.body);
  if (up.code === 201) {
    console.log('EPUB uploaded:', upJson.name, Math.round(upJson.size / 1048576) + 'MB');
    console.log('Download URL:', upJson.browser_download_url);
    fs.writeFileSync(path.join(__dirname, 'builtin-book-url.txt'), upJson.browser_download_url);
  } else {
    console.log('Upload failed:', up.code, up.body.slice(0, 200));
  }
})().catch(e => console.log('ERR', e.message));
