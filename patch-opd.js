/* 一次性补丁：①OPD 主题卡渐变横幅+主题图形 ②牛津列表发音按钮 */
const fs = require('fs');
const p = 'js/app.js';
let s = fs.readFileSync(p, 'utf8');

/* 1) OPD 主题视觉映射 + opdCards 横幅 */
const opdAnchor = "        return '<div class=\"group-card opd-card\" onclick=\"VG_APP.go(\\'#learn?' + encodeURIComponent('opd:' + t.id) + '\\')\">' +\n          '<h3>' + esc(t.name) + '</h3><div class=\"g-story\">' + esc(t.en) + ' · 牛津图解</div>' +\n          '<div class=\"g-meta\">' + t.words.length + ' 词 · 已收 ' + collected + '</div></div>';";
if (!s.includes(opdAnchor)) { console.log('FAIL: opd anchor'); process.exit(1); }
const opdRepl = [
  "        var ov = OPD_ART[t.id] || { e: '📘', g: 'linear-gradient(135deg,#66BB6A,#2E7D32)' };",
  "        return '<div class=\"group-card opd-card\" onclick=\"VG_APP.go(\\'#learn?' + encodeURIComponent('opd:' + t.id) + '\\')\">' +",
  "        '<div class=\"opd-art\" style=\"background:' + ov.g + '\"><span class=\"opd-art-emoji\">' + ov.e + '</span><span class=\"opd-art-en\">' + esc(t.en) + '</span></div>' +",
  "        '<h3>' + esc(t.name) + '</h3><div class=\"g-story\">' + esc(t.en) + ' · 牛津图解</div>' +",
  "        '<div class=\"g-meta\">' + t.words.length + ' 词 · 已收 ' + collected + '</div></div>';"
].join('\n');
s = s.replace(opdAnchor, opdRepl);

/* 2) OPD_ART 映射表（放 renderLearn 前） */
const artAnchor = "    /* 日常高频（牛津 3000）：VG_OXFORD 分级词库，搜索/筛选/分页收词 */";
if (!s.includes(artAnchor)) { console.log('FAIL: art anchor'); process.exit(1); }
const artMap = [
  "    var OPD_ART = {",
  "      'opd-smalltalk': { e: '💬', g: 'linear-gradient(135deg,#F48FB1,#FF8A65)' },",
  "      'opd-weather':   { e: '⛅', g: 'linear-gradient(135deg,#90CAF9,#5C6BC0)' },",
  "      'opd-opposites': { e: '🔀', g: 'linear-gradient(135deg,#CE93D8,#4DB6AC)' },",
  "      'opd-family':    { e: '👨‍👩‍👧', g: 'linear-gradient(135deg,#FFCC80,#FF8A65)' },",
  "      'opd-morning':   { e: '🌅', g: 'linear-gradient(135deg,#FFE082,#FFAB40)' },",
  "      'opd-evening':   { e: '🌙', g: 'linear-gradient(135deg,#7986CB,#4527A0)' },",
  "      'opd-feelings':  { e: '🩹', g: 'linear-gradient(135deg,#80CBC4,#26A69A)' },",
  "      'opd-emotions':  { e: '😄', g: 'linear-gradient(135deg,#FFF176,#FF8A80)' },",
  "      'opd-kitchen':   { e: '🍳', g: 'linear-gradient(135deg,#FFCC80,#D4A017)' },",
  "      'opd-food':      { e: '🍎', g: 'linear-gradient(135deg,#EF9A9A,#66BB6A)' },",
  "      'opd-clothes':   { e: '👕', g: 'linear-gradient(135deg,#9FA8DA,#3949AB)' },",
  "      'opd-body':      { e: '💪', g: 'linear-gradient(135deg,#4DD0E1,#0097A7)' },",
  "      'opd-aches':     { e: '🤒', g: 'linear-gradient(135deg,#FFAB91,#E57373)' },",
  "      'opd-places':    { e: '🏙️', g: 'linear-gradient(135deg,#90A4AE,#455A64)' },",
  "      'opd-transport': { e: '🚌', g: 'linear-gradient(135deg,#81D4FA,#0288D1)' },",
  "      'opd-airport':   { e: '✈️', g: 'linear-gradient(135deg,#B0BEC5,#37474F)' },",
  "      'opd-jobs':      { e: '💼', g: 'linear-gradient(135deg,#9FA8DA,#283593)' },",
  "      'opd-fun':       { e: '🎡', g: 'linear-gradient(135deg,#F48FB1,#AB47BC)' },",
  "      'opd-outdoors':  { e: '🏕️', g: 'linear-gradient(135deg,#A5D6A7,#33691E)' },",
  "      'opd-sports':    { e: '⚽', g: 'linear-gradient(135deg,#C5E1A5,#558B2F)' }",
  "    };",
  ""
].join('\n');
s = s.replace(artAnchor, artMap + artAnchor);

/* 3) 牛津列表行加发音按钮 */
const opsAnchor = "        '<div class=\"oxf-ops\">' + (owned ? '<span class=\"badge badge-green\">已收</span>' :";
if (!s.includes(opsAnchor)) { console.log('FAIL: oxf ops anchor'); process.exit(1); }
const opsRepl = "        '<div class=\"oxf-ops\"><button class=\"speak-btn\" title=\"听发音\" onclick=\"VG_APP.speakText(' + JSON.stringify(w.word).replace(/'/g, \"\\\\'\") + ')\">🔊</button> ' + (owned ? '<span class=\"badge badge-green\">已收</span>' :";
s = s.replace(opsAnchor, opsRepl);

/* 4) CSS（追加样式文件级注释里管理） */
fs.writeFileSync(p, s);
console.log('patched app.js');
