/* 一次性补丁：深色模式切换按钮 + 启动恢复 + api 暴露 */
const fs = require('fs');

/* 1) index.html 顶栏加按钮 */
let html = fs.readFileSync('index.html', 'utf8');
const btnA = '<button class="icon-btn" id="speedBtn"';
if (!html.includes(btnA)) { console.log('FAIL: speedBtn anchor'); process.exit(1); }
if (!html.includes('darkBtn')) {
  html = html.replace(btnA, '<button class="icon-btn" id="darkBtn" onclick="VG_APP.toggleDark()" title="深色模式">🌙</button>\n          ' + btnA);
  fs.writeFileSync('index.html', html);
}
console.log('index darkBtn: ' + html.includes('darkBtn'));

/* 2) app.js 加函数 + 启动调用 + api 暴露 */
let js = fs.readFileSync('js/app.js', 'utf8');
if (!js.includes('toggleDark')) {
  const fnCode = [
    '',
    '  /* ---------- 深色模式 ---------- */',
    '  function toggleDark() {',
    "    var el = document.documentElement;",
    "    var dark = el.classList.toggle('dark');",
    "    try { localStorage.setItem('vocab_dark', dark ? '1' : '0'); } catch (e) {}",
    "    var btn = document.getElementById('darkBtn');",
    "    if (btn) btn.textContent = dark ? '\\u2600' : '\\uD83C\\uDF19';",
    '  }',
    '  function restoreDark() {',
    "    try { if (localStorage.getItem('vocab_dark') === '1') { document.documentElement.classList.add('dark'); var b = document.getElementById('darkBtn'); if (b) b.textContent = '\\u2600'; } } catch (e) {}",
    '  }',
    ''
  ].join('\n');
  const initA = '  /* ---------- \u542f\u52a8 ---------- */';
  if (!js.includes(initA)) { console.log('FAIL: init anchor'); process.exit(1); }
  js = js.replace(initA, fnCode + '\n' + initA);

  /* 启动调用 restoreDark */
  const speedA = "$('#speedBtn').textContent";
  if (!js.includes(speedA)) { console.log('FAIL: speed anchor'); process.exit(1); }
  js = js.replace(speedA, "restoreDark();\n    " + speedA);

  /* api 暴露 */
  const apiA = '    toggleRemind: toggleRemind,';
  if (!js.includes(apiA)) { console.log('FAIL: api anchor'); process.exit(1); }
  js = js.replace(apiA, '    toggleDark: toggleDark,\n    ' + apiA);

  fs.writeFileSync('js/app.js', js);
}
console.log('js dark wired: ' + js.includes('toggleDark'));
