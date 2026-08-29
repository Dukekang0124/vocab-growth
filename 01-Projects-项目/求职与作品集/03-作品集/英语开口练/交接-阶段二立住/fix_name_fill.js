const fs = require('fs');
const f = "D:\\写作工具\\知识管理\\01-Projects-项目\\求职与作品集\\03-作品集\\英语开口练\\english-speaking-app-github\\index.html";
let s = fs.readFileSync(f, 'utf8');
const EOL = s.includes('\r\n') ? '\r\n' : '\n';

// Each pair must match EXACTLY ONCE. Abort on any mismatch without writing.
const pairs = [
  // 1) appendConvBubble: fill name for display + TTS
  [
`function appendConvBubble(side, who, avatar, en, zh, speakText, autoplay) {
  const msgs = document.getElementById('dialogMessages');`,
`function appendConvBubble(side, who, avatar, en, zh, speakText, autoplay) {
  en = fillName(en); zh = fillName(zh); speakText = fillName(speakText || en);
  const msgs = document.getElementById('dialogMessages');`
  ],
  // 2) renderConvTurn prompt + option buttons
  [
`  let optsHtml = '<div class="conv-prompt">' + (turn.prompt || '请选一句你的回复：') + '</div>';
  turn.options.forEach((o, oi) => {
    optsHtml += '<button class="dialog-option conv-opt" onclick="chooseConv(' + oi + ')">' + o.text + '</button>';
  });`,
`  let optsHtml = '<div class="conv-prompt">' + fillName(turn.prompt || '请选一句你的回复：') + '</div>';
  turn.options.forEach((o, oi) => {
    optsHtml += '<button class="dialog-option conv-opt" onclick="chooseConv(' + oi + ')">' + fillName(o.text) + '</button>';
  });`
  ],
  // 3) chooseConv feedback tip
  [
`    fb.textContent = (opt.good ? '✓ ' : '💡 ') + opt.tip;`,
`    fb.textContent = (opt.good ? '✓ ' : '💡 ') + fillName(opt.tip);`
  ],
  // 4) renderDialogScript
  [
`  d.script.forEach((line, i) => {
    const side = line.sp === 'A' ? 'a' : 'b';
    html += '<div class="dialog-bubble ' + side + ' script-line" style="animation-delay:' + (i * 0.07) + 's">' +
      '<div class="speaker">' + (line.role || line.sp) + '</div>' +
      '<div class="text">' + line.en + '</div>' +
      '<div class="zh">' + line.zh + '</div>' +
      '<button class="play-mini" onclick="speak(\\'' + line.en.replace(/'/g, "\\\\'") + '\\')">🔊</button>' +
    '</div>';
  });`,
`  d.script.forEach((line, i) => {
    const side = line.sp === 'A' ? 'a' : 'b';
    const lEn = fillName(line.en), lZh = fillName(line.zh);
    html += '<div class="dialog-bubble ' + side + ' script-line" style="animation-delay:' + (i * 0.07) + 's">' +
      '<div class="speaker">' + (line.role || line.sp) + '</div>' +
      '<div class="text">' + lEn + '</div>' +
      '<div class="zh">' + lZh + '</div>' +
      '<button class="play-mini" onclick="speak(\\'' + lEn.replace(/'/g, "\\\\'") + '\\')">🔊</button>' +
    '</div>';
  });`
  ],
  // 5a) renderDialogRound A bubble
  [
`    html += '<div class="dialog-bubble a"><div class="speaker">A</div><div class="text">' + r.a + '</div>' +
      '<button class="play-mini" onclick="speak(\\'' + r.a.replace(/'/g, "\\\\'") + '\\')">`,
`    const rA = fillName(r.a);
    html += '<div class="dialog-bubble a"><div class="speaker">A</div><div class="text">' + rA + '</div>' +
      '<button class="play-mini" onclick="speak(\\'' + rA.replace(/'/g, "\\\\'") + '\\')">`
  ],
  // 5b) renderDialogRound chosen bubble
  [
`      const chosen = r.options.find(o => o.selected);
      html += '<div class="dialog-bubble b"><div class="speaker">你</div><div class="text">' + chosen.text + '</div></div>';`,
`      const chosen = r.options.find(o => o.selected);
      html += '<div class="dialog-bubble b"><div class="speaker">你</div><div class="text">' + fillName(chosen.text) + '</div></div>';`
  ],
  // 5c) renderDialogRound correct answer feedback
  [
`round.correct ? '回答正确！' : '不太对，正确答案是：' + round.options.find(o => o.correct).text;`,
`round.correct ? '回答正确！' : '不太对，正确答案是：' + fillName(round.options.find(o => o.correct).text);`
  ],
  // 5d) renderDialogRound option buttons
  [
`      optsHtml += '<button class="dialog-option" onclick="answerDialog(' + oi + ')">' + o.text + '</button>';`,
`      optsHtml += '<button class="dialog-option" onclick="answerDialog(' + oi + ')">' + fillName(o.text) + '</button>';`
  ]
];

let problems = [];
for (let i=0;i<pairs.length;i++){
  let [oldStr, newStr] = pairs[i];
  if (EOL === '\r\n') { oldStr = oldStr.replace(/\r?\n/g,'\r\n'); newStr = newStr.replace(/\r?\n/g,'\r\n'); }
  const count = s.split(oldStr).length - 1;
  if (count !== 1) { problems.push(`#${i+1} matched ${count} times (need exactly 1)`); continue; }
  s = s.replace(oldStr, newStr);
}
if (problems.length){ console.error('ABORT:\n' + problems.join('\n')); process.exit(1); }
fs.writeFileSync(f, s, { encoding:'utf8' });
console.log('ALL 8 REPLACEMENTS APPLIED OK');
