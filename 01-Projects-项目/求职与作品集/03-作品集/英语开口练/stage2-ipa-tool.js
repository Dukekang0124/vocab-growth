// 阶段2 工具：抽取练习句子 -> 按"口语化改写映射"回注 en + 自动生成美式 IPA(phonetic)
// 用法（在本目录，NODE_PATH 指向 node workspace）：
//   node stage2-ipa-tool.js <index.html> extract            -> 输出 sentences-raw.txt（所有 en/text 字段）
//   node stage2-ipa-tool.js <index.html> apply <map.json>   -> 按 {原句: 新句} 回注 en + phonetic（仅改映射内的句子）
//   node stage2-ipa-tool.js <index.html> ipa-all            -> 给所有还没有 phonetic 的 en: 字段补音标
const fs = require('fs');
const cmudict = require('C:/Users/Admin/.workbuddy/binaries/node/workspace/node_modules/cmudict');
const D = new cmudict.CMUDict();

// ARPABET -> 美式 IPA（含重音 ˈ ˌ）
const MAP = {AA:'ɑ',AE:'æ',AH:'ʌ',AO:'ɔ',AW:'aʊ',AY:'aɪ',EH:'ɛ',ER:'ɚ',EY:'eɪ',IH:'ɪ',IY:'i',OW:'oʊ',OY:'ɔɪ',UH:'ʊ',UW:'u',B:'b',CH:'tʃ',D:'d',DH:'ð',F:'f',G:'ɡ',HH:'h',JH:'dʒ',K:'k',L:'l',M:'m',N:'n',NG:'ŋ',P:'p',R:'r',S:'s',SH:'ʃ',T:'t',TH:'θ',V:'v',W:'w',Y:'j',Z:'z',ZH:'ʒ'};
function arpaToIpa(s) {
  return s.split(' ').map(x => {
    const m = x.match(/^([A-Z]+)([0-2])?$/);
    if (!m) return x;
    const ph = MAP[m[1]] || x;
    const st = m[2];
    return st === '1' ? 'ˈ' + ph : st === '2' ? 'ˌ' + ph : ph;
  }).join('');
}
function wordIpa(w) {
  w = (w || '').toLowerCase();
  if (!w) return null;
  let r = D.get(w);
  if (!r) { const w2 = w.replace(/'/g, ''); if (w2 !== w) r = D.get(w2); }
  if (!r) return null;
  const arr = Array.isArray(r) ? r : [r];
  return '/' + arpaToIpa(arr[0]) + '/';
}
// 整句美式 IPA：{{name}} 替换为 Alex 以便查词；未登录词保留原词（小写）
function sentenceIpa(en) {
  const tmp = en.replace(/\{\{name\}\}/g, 'Alex');
  const words = tmp.split(/[^A-Za-z']+/).filter(Boolean);
  const parts = words.map(w => { const ipa = wordIpa(w); return ipa ? ipa.slice(1, -1) : w.toLowerCase(); });
  return '/' + parts.join(' ') + '/';
}
function pickQuote(s) {
  if (s.indexOf('"') >= 0) return "'";
  if (s.indexOf("'") >= 0) return '"';
  return "'";
}
const FIELD_PRE = {'{':1, ',':1, ' ':1, '\t':1, '\n':1, ';':1, '(':1};

const FILE = process.argv[2];
const mode = process.argv[3];
if (!FILE || !mode) { console.log('用法: node stage2-ipa-tool.js <index.html> extract|apply|ipa-all <map.json>'); process.exit(1); }

if (mode === 'extract') {
  const s = fs.readFileSync(FILE, 'utf8');
  const re = /(?:en|text):\s*['"]([^'"]*)['"]/g;
  let m, out = [], i = 0;
  while ((m = re.exec(s))) out.push((++i) + '\t' + m[1]);
  fs.writeFileSync('sentences-raw.txt', out.join('\n'));
  console.log('抽取句子/选项数:', out.length);
} else if (mode === 'apply') {
  const map = JSON.parse(fs.readFileSync(process.argv[4], 'utf8'));
  let s = fs.readFileSync(FILE, 'utf8');
  let cnt = 0, miss = 0;
  for (const [orig, neu] of Object.entries(map)) {
    if (!neu || neu === orig) continue;
    const ipa = sentenceIpa(neu);
    const patterns = ["en:'" + orig + "'", 'en:"' + orig + '"'];
    let replaced = false;
    for (const p of patterns) {
      if (s.includes(p)) {
        const q = pickQuote(neu);
        s = s.replace(p, 'en:' + q + neu + q + ', phonetic:' + q + ipa + q);
        cnt++; replaced = true; break;
      }
    }
    if (!replaced) { console.log('未匹配:', orig); miss++; }
  }
  fs.writeFileSync(FILE, s);
  console.log('回注句数:', cnt, '| 未匹配:', miss);
} else if (mode === 'ipa-all') {
  let s = fs.readFileSync(FILE, 'utf8');
  let out = '', i = 0, n = s.length, cnt = 0;
  while (true) {
    const idx = s.indexOf('en:', i);
    if (idx < 0) { out += s.slice(i); break; }
    const pre = idx === 0 ? '{' : s[idx - 1];
    if (!FIELD_PRE[pre]) { out += s.slice(i, idx + 3); i = idx + 3; continue; }
    out += s.slice(i, idx);
    let p = idx + 3;
    const q = s[p];
    if (q !== "'" && q !== '"') { out += 'en:'; i = p; continue; }
    p++;
    let txt = '';
    while (p < n && s[p] !== q) { if (s[p] === '\\') { txt += s[p + 1]; p += 2; } else { txt += s[p]; p++; } }
    p++;
    let j = p; while (j < n && (s[j] === ' ' || s[j] === '\t')) j++;
    const token = 'en:' + q + txt + q;
    while (j < n && (s[j] === ' ' || s[j] === '\t' || s[j] === ',')) j++;
    if (s.substr(j, 9) === 'phonetic:') { out += token; i = p; continue; }
    const ipa = sentenceIpa(txt);
    out += token + ", phonetic:'" + ipa + "'";
    cnt++; i = p;
  }
  fs.writeFileSync(FILE, out);
  console.log('已补音标句数:', cnt);
}
