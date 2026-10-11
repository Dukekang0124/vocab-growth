const fs = require('fs');
const lines = fs.readFileSync('js/app.js', 'utf8').split('\n');
const Q = String.fromCharCode(39); // single quote
const BS = String.fromCharCode(92); // backslash
// 构造正确行：onclick 双引号内嵌 \' 表示 JS 字符串的单引号
const good = "        return '<div class=\"group-card opd-card\" onclick=\"VG_APP.go("
  + BS + Q + '#learn?' + BS + Q
  + " + encodeURIComponent("
  + BS + Q + 'opd:' + BS + Q
  + " + t.id) + "
  + BS + Q + '#learn' + BS + Q
  + ")\\">' +";
lines[931] = good;
fs.writeFileSync('js/app.js', lines.join('\n'));
console.log('fixed line 932');
