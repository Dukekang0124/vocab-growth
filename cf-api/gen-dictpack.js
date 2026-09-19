/* kajweb/dict 词书分片 → 离线词典包
 * 源: CET4/6, 考研, 专四专八, TOEFL, IELTS, GRE, GMAT, SAT, BEC（学术/阅读高频全覆盖）
 * 输出: cf-api/dict-pack.json { word: [音标, 中文释义, ''] }
 * 与牛津3000互补：基础词牛津有，本包补中高级词汇 */
'use strict';
const https = require('https');
const fs = require('fs');
const path = require('path');
const AdmZip = require(path.join(__dirname, '..', 'node_modules', 'adm-zip'));
const TOKEN = fs.readFileSync(path.join(__dirname, '..', '.gh-token'), 'utf8').trim();
const OUT = path.join(__dirname, 'dict-pack.json');

function api(path, accept) {
  return new Promise((res, rej) => {
    function go(url, depth) {
      https.get(url, { headers: { 'User-Agent': 'x', 'Authorization': 'token ' + TOKEN, 'Accept': accept || 'application/json' } }, x => {
        if (x.statusCode >= 300 && x.statusCode < 400 && x.headers.location && depth < 5) { x.resume(); return go(x.headers.location, depth + 1); }
        const c = []; x.on('data', d => c.push(d)); x.on('end', () => res({ code: x.statusCode, buf: Buffer.concat(c) }));
      }).on('error', rej);
    }
    go('https://api.github.com' + path, 0);
  });
}
const sleep = ms => new Promise(r => setTimeout(r, ms));

(async () => {
  const listingRaw = await api('/repos/kajweb/dict/contents/book');
  const listing = JSON.parse(listingRaw.buf.toString());
  if (!Array.isArray(listing)) { console.log('list fail', JSON.stringify(listing).slice(0, 100)); return; }
  const WANT = /^(1521164\d+_)?(CET4|CET6|KaoYan|Level4|Level8|TOEFL|IELTS|GRE|GMAT|SAT|BEC|Level4luan|Level8luan|KaoYanluan|IELTSluan|TOEFFLluan|GREluan|GMATluan|SATluan|BECluan)/i;
  const files = listing.filter(f => f.name.endsWith('.zip') && WANT.test(f.name.replace(/^\d+_/, '')));
  console.log('shards to fetch:', files.length);
  const pack = {};
  let shards = 0, words = 0;
  for (const f of files) {
    let ok = false;
    for (let attempt = 0; attempt < 3 && !ok; attempt++) {
      try {
        const r = await api('/repos/kajweb/dict/contents/book/' + f.name, 'application/vnd.github.raw+json');
        if (r.code !== 200) throw new Error('HTTP ' + r.code);
        const z = new AdmZip(r.buf);
        for (const e of z.getEntries()) {
          const txt = e.getData().toString('utf8');
          /* 文件是若干 JSON 对象顺序拼接（NDJSON 无换行也可能有），逐对象切分 */
          const re = /\{"wordRank"[\s\S]*?\}\s*(?=\{"wordRank"|$)/g;
          let m;
          while ((m = re.exec(txt))) {
            let j;
            try { j = JSON.parse(m[0]); } catch (e2) { continue; }
            const w = (j.headWord || '').toLowerCase().trim();
            const wc = j.content && j.content.word;
            const wcc = wc && wc.content;
            if (!w || !/^[a-z][a-z'’-]*$/.test(w) || w.length > 30 || pack[w]) continue;
            let zh = '';
            if (wcc && Array.isArray(wcc.trans)) {
              zh = wcc.trans.map(t => ((t.pos || '') + ' ' + (t.tranCn || '')).trim()).filter(Boolean).join('；');
            }
            if (!zh && wcc && wcc.netdescs) zh = '';
            if (!zh) continue;
            const pho = (wcc && (wcc.usphone || wcc.ukphone || '')) + '';
            pack[w] = [pho, zh.length > 110 ? zh.slice(0, 109) + '…' : zh, ''];
            words++;
          }
        }
        ok = true; shards++;
        if (shards % 5 === 0) console.log('…', shards, 'shards,', words, 'words');
      } catch (e) {
        console.log('retry', f.name, String(e.message).slice(0, 50));
        await sleep(2500);
      }
    }
    await sleep(300);
  }
  fs.writeFileSync(OUT, JSON.stringify(pack));
  console.log('DONE: shards=' + shards + ' words=' + words + ' size=' + Math.round(fs.statSync(OUT).size / 1048576 * 10) / 10 + 'MB');
})();
