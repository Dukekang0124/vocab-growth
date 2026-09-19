/* ECDICT SQLite → 精简离线词典包
 * 输入: /tmp/ecdict-sqlite-28.zip 解压出的 ecdict.db
 * 输出: cf-api/dict-pack.json  { word: [phonetic, 中文释义(截断), 英英释义(截断)] }
 * 选词: BNC 或 COCA 频率表内的词（阅读高频 ~60k），覆盖阅读 99%+ 词汇 */
'use strict';
const { DatabaseSync } = require('node:sqlite');
const fs = require('fs');
const path = require('path');

const DB_PATH = process.argv[2] || 'C:/Users/Admin/AppData/Local/Temp/ecdict.db';
const OUT_PATH = path.join(__dirname, 'dict-pack.json');

const db = new DatabaseSync(DB_PATH, { readOnly: true });
const rows = db.prepare(
  "SELECT word, phonetic, translation, definition, bnc, frq FROM stardict WHERE (bnc > 0 OR frq > 0) AND translation != ''"
).all();

const pack = {};
let kept = 0;
function trim(s, n) {
  s = String(s || '').split(/\n|\\n/)[0].replace(/\s+/g, ' ').trim();
  return s.length > n ? s.slice(0, n - 1) + '…' : s;
}
for (const r of rows) {
  const w = String(r.word || '').trim().toLowerCase();
  if (!/^[a-z][a-z'’-]*$/.test(w) || w.length < 2 || w.length > 30) continue;
  if (pack[w]) continue;
  const zh = trim(r.translation, 110);
  if (!zh) continue;
  const en = trim(r.definition, 95);
  const pho = String(r.phonetic || '').replace(/^\/|\/$/g, '').trim();
  pack[w] = [pho, zh, en];
  kept++;
  if (kept >= 90000) break;
}

fs.writeFileSync(OUT_PATH, JSON.stringify(pack));
const mb = Math.round(fs.statSync(OUT_PATH).size / 1048576 * 10) / 10;
console.log(`dict-pack.json: ${kept} words, ${mb} MB → ${OUT_PATH}`);
