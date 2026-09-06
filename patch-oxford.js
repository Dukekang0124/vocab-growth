/* 一次性补丁：学词页接入「日常高频（牛津 3000）」板块 */
const fs = require('fs');
const p = 'js/app.js';
let s = fs.readFileSync(p, 'utf8');

/* 1) renderLearn 输出加入 oxfordHtml（OPD 板块之后） */
const outAnchor = "'<div class=\"group-grid\">' + cards + '</div></div>' + opdHtml + myNewHtml;";
if (!s.includes(outAnchor)) { console.log('FAIL: renderLearn anchor'); process.exit(1); }
const outRepl = "'<div class=\"group-grid\">' + cards + '</div></div>' + opdHtml + oxfordHtml + myNewHtml;";
s = s.replace(outAnchor, outRepl);

/* 2) oxfordHtml 变量计算（插在 main.innerHTML 赋值之前） */
const beforeAnchor = '    main.innerHTML = lockHtml + goalsHtmlOnLearn() +';
if (!s.includes(beforeAnchor)) { console.log('FAIL: main.innerHTML anchor'); process.exit(1); }
const varDef = [
  "    /* 日常高频（牛津 3000）：VG_OXFORD 分级词库，搜索/筛选/分页收词 */",
  "    var oxfordHtml = (typeof VG_OXFORD !== 'undefined') ? (",
  "      '<div class=\"card\"><div class=\"card-title\">📖 日常高频（牛津 3000）<span class=\"hint\">老外高频词 · 收进词库走完整学习链</span></div>' +",
  "      '<div class=\"oxf-toolbar\"><input id=\"oxfSearch\" placeholder=\"搜索单词…\" oninput=\"VG_APP.oxfSearch(this.value)\">' +",
  "      '<select id=\"oxfLevel\" onchange=\"VG_APP.oxfLevel(this.value)\">' +",
  "      '<option value=\"all\">全部等级</option><option value=\"a1\">A1 入门</option><option value=\"a2\">A2 基础</option><option value=\"b1\">B1 进阶</option><option value=\"b2\">B2 高阶</option>' +",
  "      '</select></div><div id=\"oxfList\"></div>' +",
  "      '<div id=\"oxfPager\"></div></div>'",
  "    ) : '';",
  ""
].join('\n');
s = s.replace(beforeAnchor, varDef + beforeAnchor);

/* 3) 渲染与交互函数（插在 goalsHtmlOnLearn 函数定义之前） */
const fnAnchor = '  function goalsHtmlOnLearn() {';
if (!s.includes(fnAnchor)) { console.log('FAIL: goalsHtmlOnLearn anchor'); process.exit(1); }
const fns = [
  "  /* ---------- 日常高频（牛津 3000）：搜索 + CEFR 筛选 + 分页 + 批量收词 ---------- */",
  "  var oxfState = { q: '', level: 'all', page: 0 };\n  var OXF_PAGE_SIZE = 60;\n",
  "  function oxfAllWords() {",
  "    var all = [];",
  "    VG_OXFORD.LEVELS.forEach(function (l) { l.words.forEach(function (w) { all.push(w); }); });",
  "    return all;",
  "  }",
  "  function oxfFiltered() {",
  "    var q = oxfState.q.toLowerCase();",
  "    return oxfAllWords().filter(function (w) {",
  "      if (oxfState.level !== 'all' && w.cefr !== oxfState.level) return false;",
  "      if (q && w.word.indexOf(q) < 0) return false;",
  "      return true;",
  "    });",
  "  }",
  "  function oxfOwned(word) { return !!store.getWord(word.toLowerCase()); }",
  "  function oxfToolbarHTML() { return ''; } /* 工具栏已内联在板块骨架里 */",
  "  function oxfPagerHTML() { return ''; } /* 分页条由 renderOxfList 输出 */",
  "  function renderOxfList() {",
  "    var listEl = document.getElementById('oxfList');",
  "    var pagerEl = document.getElementById('oxfPager');",
  "    if (!listEl) return;",
  "    var all = oxfFiltered();",
  "    var pages = Math.max(1, Math.ceil(all.length / OXF_PAGE_SIZE));",
  "    if (oxfState.page >= pages) oxfState.page = pages - 1;",
  "    var slice = all.slice(oxfState.page * OXF_PAGE_SIZE, (oxfState.page + 1) * OXF_PAGE_SIZE);",
  "    var h = slice.map(function (w) {",
  "      var owned = oxfOwned(w.word);",
  "      return '<div class=\"oxf-row' + (owned ? ' owned' : '') + '\">' +",
  "        '<div class=\"oxf-main\"><b>' + esc(w.word) + '</b> <span class=\"oxf-pos\">' + esc(w.pos) + '</span>' +",
  "        '<span class=\"oxf-ipa\">/' + esc(w.ipa) + '/</span> <span class=\"oxf-cefr\">' + esc(w.cefr.toUpperCase()) + '</span></div>' +",
  "        '<div class=\"oxf-def\">' + esc(w.def || '') + '</div>' +",
  "        (w.ex ? '<div class=\"oxf-ex\">' + esc(w.ex) + '</div>' : '') +",
  "        '<div class=\"oxf-ops\">' + (owned ? '<span class=\"badge badge-green\">已收</span>' :",
  "        '<button class=\"btn btn-sm\" onclick=\"VG_APP.collectOxf(\\'' + esc(w.word).replace(/'/g, \"\\\\'\" ) + '\\')\">➕ 收词</button>') + '</div></div>';",
  "    }).join('');",
  "    listEl.innerHTML = (h || '<div class=\"empty\">没有匹配的词</div>') +",
  "      '<div style=\"text-align:center;margin-top:14px\"><button class=\"btn btn-outline\" onclick=\"VG_APP.collectOxfPage()\">📦 收本页未收词（' +",
  "      slice.filter(function (w) { return !oxfOwned(w.word); }).length + ' 个）</button></div>';",
  "    var unownedTotal = all.filter(function (w) { return !oxfOwned(w.word); }).length;",
  "    pagerEl.innerHTML = '<div style=\"display:flex;gap:12px;justify-content:center;align-items:center;margin-top:12px;font-size:14px;color:var(--ink-2)\">' +",
  "      '<button class=\"btn btn-sm btn-outline\" ' + (oxfState.page > 0 ? '' : 'disabled') + ' onclick=\"VG_APP.oxfPage(-1)\">‹ 上一页</button>' +",
  "      '<span>第 ' + (oxfState.page + 1) + ' / ' + pages + ' 页 · 共 ' + all.length + ' 词 · 未收 ' + unownedTotal + '</span>' +",
  "      '<button class=\"btn btn-sm btn-outline\" ' + (oxfState.page < pages - 1 ? '' : 'disabled') + ' onclick=\"VG_APP.oxfPage(1)\">下一页 ›</button></div>';",
  "  }",
  "  function oxfSearch(q) { oxfState.q = String(q || '').trim(); oxfState.page = 0; renderOxfList(); }",
  "  function oxfLevel(v) { oxfState.level = v || 'all'; oxfState.page = 0; renderOxfList(); }",
  "  function oxfPage(delta) { oxfState.page = Math.max(0, oxfState.page + delta); renderOxfList(); }",
  "  function collectOxf(word) {",
  "    var item = oxfAllWords().filter(function (w) { return w.word.toLowerCase() === word.toLowerCase(); })[0];",
  "    if (!item) return;",
  "    collectOxfItem(item);",
  "  }",
  "  function collectOxfItem(item) {",
  "    var r = store.addCustomWord({",
  "      word: item.word, ipa: item.ipa ? '/' + item.ipa + '/' : '', pos: item.pos,",
  "      simple: item.def, zh: '', chunk: '', exEn: item.ex, exZh: '',",
  "      note: 'Oxford3000·' + item.cefr.toUpperCase()",
  "    }, 'daily');",
  "    if (!r.ok) { toast(r.error, 'warn'); return false; }",
  "    return true;",
  "  }",
  "  function collectOxfPage() {",
  "    var slice = oxfFiltered().slice(oxfState.page * OXF_PAGE_SIZE, (oxfState.page + 1) * OXF_PAGE_SIZE);",
  "    var okN = 0, skipN = 0;",
  "    slice.forEach(function (item) {",
  "      if (oxfOwned(item.word)) { skipN++; return; }",
  "      if (collectOxfItem(item)) okN++; else skipN++;",
  "    });",
  "    toast(okN > 0 ? '🌱 已收 ' + okN + ' 词（跳过 ' + skipN + '）——明天进复习队列，今天记得用掉' : '本页没有可收的新词', okN > 0 ? 'ok' : 'warn');",
  "    renderOxfList();",
  "  }",
  ""
].join('\n');
s = s.replace(fnAnchor, fns + fnAnchor);

/* 4) api 暴露 */
const apiA = '    toggleRemind: toggleRemind, setRemindTime: setRemindTime,';
if (!s.includes(apiA)) { console.log('FAIL: api anchor'); process.exit(1); }
s = s.replace(apiA, apiA + '\n    oxfSearch: oxfSearch, oxfLevel: oxfLevel, oxfPage: oxfPage, collectOxf: collectOxf, collectOxfPage: collectOxfPage, renderOxfList: renderOxfList,');

fs.writeFileSync(p, s);
console.log('oxford board wired OK');
