// 阶段2 补充：把 DIALOGS 里"陈述事实、不是回话"的废话干扰项(correct:false)
// 替换成贴合题干、自然但答错的回复。按 (a 题干, 旧文案) 双键定位，误伤防护：
//  - 只匹配 ",correct:false" 的 text，绝不改 correct:true
//  - 只在 a 题干出现后的 500 字符窗口内查找，避免跨题
// 用法：node stage2-fix-distractors.js <index.html> <map.json>
const fs = require('fs');
const FILE = process.argv[2];
const MAP = process.argv[3];
if (!FILE || !MAP) { console.log('用法: node stage2-fix-distractors.js <index.html> <map.json>'); process.exit(1); }

let s = fs.readFileSync(FILE, 'utf8');
const entries = JSON.parse(fs.readFileSync(MAP, 'utf8'));

let done = 0, miss = 0;
const misses = [];
for (const e of entries) {
  const anchor = "a:'" + e.a + "'";
  const target = "text:'" + e.old + "',correct:false";
  const neu = "text:'" + e.neu + "',correct:false";
  let foundThis = false;
  let from = 0;
  while (true) {
    const ai = s.indexOf(anchor, from);
    if (ai < 0) break;
    const win = s.slice(ai, ai + 500);
    const ti = win.indexOf(target);
    if (ti >= 0) {
      const gp = ai + ti;
      s = s.slice(0, gp) + neu + s.slice(gp + target.length);
      done++; foundThis = true;
      from = gp + neu.length;
    } else {
      from = ai + anchor.length;
    }
  }
  if (!foundThis) { miss++; misses.push('未匹配: a=' + e.a + ' | old=' + e.old); }
}
fs.writeFileSync(FILE, s);
console.log('已替换:', done, '| 未匹配:', miss);
if (miss) misses.forEach(m => console.log('  - ' + m));
