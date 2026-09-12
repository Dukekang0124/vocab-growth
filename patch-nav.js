/* 导航架构重构补丁：顶部+底部双导航栏 */
const fs = require('fs');
const p = 'js/app.js';
let s = fs.readFileSync(p, 'utf8');
let ok = true;

function rep(oldStr, newStr, label) {
  if (!s.includes(oldStr)) { console.log('FAIL: ' + label); ok = false; return; }
  s = s.replace(oldStr, newStr);
}

/* 1) render() 路由重写 */
rep(
`    if (!PAGES[tab]) tab = 'today';
    /* 音标页归属开口练（它的地基板块），导航高亮跟开口练走 */
    var navTab = tab === 'sounds' ? 'workshop' : tab;
    document.querySelectorAll('.nav-btn').forEach(function (b) {
      b.classList.toggle('active', b.dataset.tab === navTab);
    });`,

`    if (!PAGES[tab]) tab = 'today';
    /* 底部导航映射 */
    var BOTTOM_MAP = { today:'today', learn:'learn', review:'learn', workshop:'learn', chunks:'learn', sounds:'learn',
      library:'mine', records:'mine', achievements:'mine', stats:'mine',
      settings:'settings', 'settings-data':'settings', 'settings-about':'settings' };
    var bt = BOTTOM_MAP[tab] || 'today';
    document.querySelectorAll('.bn-btn').forEach(function (b) {
      b.classList.toggle('active', b.dataset.bt === bt);
    });
    /* 顶部二级子导航 */
    renderSubNav(tab, bt);`,

'route rewrite'
);

/* 2) 更新 subNav badge → bottomNav badge */
rep(
`    updateNavBadge();`,
`    updateNavBadge();`,
'badge call (no change needed, just verifying)'
);

/* 3) updateNavBadge 改为更新底部导航 badge */
rep(
`  function updateNavBadge() {`,
`  function updateNavBadge() {
    /* 更新底部导航的学习 tab badge */`,
'updateNavBadge header'
);

/* 4) updateNavBadge 内 .nav-btn 改为 .bn-btn */
rep(
`    document.querySelectorAll('.nav-btn .nav-badge').forEach(function (el) { el.remove(); });`,
`    document.querySelectorAll('.bn-btn .nav-badge').forEach(function (el) { el.remove(); });`,
'badge remove selector'
);
rep(
`    var reviewBtn = document.querySelector('.nav-btn[data-tab="review"]');`,
`    var reviewBtn = document.querySelector('.bn-btn[data-bt="learn"]');`,
'badge add selector'
);

/* 5) 在 renderSubNav 函数（新增）+ PAGES 路由拆分 */
/* 在 render() 函数后面加 renderSubNav + 路由映射辅助函数 */
const afterRender = `    /* 存储故障警告：只提示一次 */`;
rep(afterRender, `
  /* ---------- 顶部二级子导航渲染 ---------- */
  var SUB_NAVS = {
    learn: [
      { r: 'learn',    t: '📖 学词' },
      { r: 'review',   t: '🔄 复习' },
      { r: 'workshop', t: '🎤 开口练' },
      { r: 'chunks',   t: '💬 说法' },
      { r: 'sounds',   t: '🔤 音标' }
    ],
    mine: [
      { r: 'library',      t: '📚 词汇库' },
      { r: 'records',      t: '📝 造句记录' },
      { r: 'achievements', t: '🏆 成就' },
      { r: 'stats',        t: '📊 统计' }
    ],
    settings: [
      { r: 'settings',       t: '⚙️ 通用' },
      { r: 'settings-data',  t: '🗂️ 数据' },
      { r: 'settings-about', t: 'ℹ️ 关于' }
    ]
  };
  function renderSubNav(tab, bt) {
    var el = document.getElementById('subNav');
    if (!el) return;
    var items = SUB_NAVS[bt];
    if (!items || items.length < 2) { el.innerHTML = ''; el.style.display = 'none'; return; }
    el.style.display = 'flex';
    el.innerHTML = items.map(function (item) {
      var active = tab === item.r || (tab === 'sounds' && item.r === 'sounds');
      return '<button class="sn-btn' + (active ? ' on' : '') + '" onclick="VG_APP.go(\\'#' + item.r + '\\')">' + item.t + '</button>';
    }).join('');
  }

` + afterRender, 'renderSubNav function'
);

/* 6) PAGES.library 拆分：library 保持 bank+weak，新增 records/achievements/stats 路由 */
/* 修改 PAGES.library 的 tab 列表（只保留 bank+weak） */
rep(
"      ['records', '📝 造句记录'], ['achv', '🏆 成就'], ['stats', '📊 学习统计'], ['data', '🗂️ 数据管理']",
"",
'remove old tabs from library'
);
/* library 只保留 bank+weak */
rep(
"      ['bank', '📚 主动词汇库'], ['weak', '🔴 薄弱词清单'],",
"      ['bank', '📚 主动词汇库'], ['weak', '🔴 薄弱词清单'],",
'keep bank+weak tabs'
);

/* 7) 在 PAGES.library 后新增独立路由页面 */
const libEndAnchor = "  function switchLib(tab) { libTab = tab; render(); }";
rep(libEndAnchor,
libEndAnchor + `

  /* ---------- 独立路由：造句记录 / 成就 / 统计（从 library 拆出） ---------- */
  PAGES.records = function (main) {
    main.innerHTML = '<div class="tabbar"><button class="on">📝 造句记录</button></div><div id="libBody"></div>';
    renderLibBody();
    /* 强制切换到 records tab */
    libTab = 'records';
    renderLibBody();
  };
  PAGES.achievements = function (main) {
    main.innerHTML = '<div class="tabbar"><button class="on">🏆 成就</button></div><div id="libBody"></div>';
    libTab = 'achv';
    renderLibBody();
  };
  PAGES.stats = function (main) {
    main.innerHTML = '<div class="tabbar"><button class="on">📊 学习统计</button></div><div id="libBody"></div>';
    libTab = 'stats';
    renderLibBody();
  };

  /* ---------- 设置页（从 library data tab 拆出独立） ---------- */
  PAGES.settings = function (main, param) {
    var sub = param || 'general';
    if (sub === 'data') { renderSettingsData(main); return; }
    if (sub === 'about') { renderSettingsAbout(main); return; }
    renderSettingsGeneral(main);
  };
  function settingsShell(title, activeTab, bodyHtml) {
    return '<div class="card"><div class="card-title">' + title + '</div>' + bodyHtml + '</div>';
  }
  function settingsTabBar(active) {
    var tabs = [['general','⚙️ 通用'],['data','🗂️ 数据'],['about','ℹ️ 关于']];
    return '<div class="tabbar">' + tabs.map(function(t) {
      return '<button class="' + (active === t[0] ? 'on' : '') + '" onclick="VG_APP.go(\\'#settings' + (t[0]==='general'?'':'-'+t[0]) + '\\')">' + t[1] + '</button>';
    }).join('') + '</div>';
  }
  function renderSettingsGeneral(main) {
    var remind = (window.VG_IMMERSION && VG_IMMERSION.remindSupported()) ?
      '<div class="install-guide"><b>🔔 每日学习提醒</b>' +
      '<span style="display:flex;align-items:center;gap:10px;flex-wrap:wrap">' +
      '<label style="display:inline-flex;align-items:center;gap:6px;cursor:pointer;font-size:14px">' +
      '<input type="checkbox" id="remindChk"' + (VG_IMMERSION.getRemindSetting().enabled ? ' checked' : '') + ' onchange="VG_APP.toggleRemind(this)"> 每天到点提醒我学习</label>' +
      '<input type="time" id="remindTime" value="' + remindHHMM() + '" onchange="VG_APP.setRemindTime(this.value)" style="border:1px solid var(--line);border-radius:8px;padding:4px 8px;font-size:14px">' +
      '</span><span style="font-size:12px;color:var(--ink-2)">到点推送一条学习提醒（首次开启需允许通知权限）</span></div>' : '';
    main.innerHTML = settingsTabBar('general') +
      settingsShell('⚙️ 通用设置',
      '<div class="install-guide"><b>🎨 外观</b>' +
      '<span style="display:flex;align-items:center;gap:10px"><label style="display:inline-flex;align-items:center;gap:6px;cursor:pointer;font-size:14px"><input type="checkbox" ' + (document.documentElement.classList.contains('dark') ? 'checked' : '') + ' onchange="VG_APP.toggleDark()"> 深色模式</label></span>' +
      '<span style="display:flex;align-items:center;gap:10px"><label style="font-size:14px">发音语速</label><button class="btn btn-sm btn-outline" onclick="VG_APP.toggleSpeed()" id="speedBtn2">🐢 慢 / 🐇 常</button></span></div>' +
      remind +
      '<div class="install-guide"><b>📖 学习偏好</b>' +
      '<span style="font-size:13px;color:var(--ink-2)">难度选择和自测模式在对应学习页面内设置（上下文相关）</span></div>');
  }
  function renderSettingsData(main) {
    main.innerHTML = settingsTabBar('data') +
      '<div class="card"><div class="card-title">🗂️ 数据管理<span class="hint">数据只存在本机浏览器 · 定期导出备份</span></div>' +
      '<div style="display:flex;gap:10px;flex-wrap:wrap">' +
      '<button class="btn" onclick="VG_APP.exportData()">⬇️ 导出备份 JSON</button>' +
      '<label class="btn btn-outline" style="display:inline-block">⬆️ 导入备份<input type="file" accept=".json" style="display:none" onchange="VG_APP.importData(this)"></label>' +
      '<button class="btn btn-outline" onclick="VG_APP.exportFeedback()">💬 导出反馈记录</button>' +
      '<button class="btn btn-outline" onclick="VG_APP.replayGuides()">🌱 重看新手引导</button>' +
      '<button class="btn btn-outline" style="color:var(--red);border-color:var(--red)" onclick="VG_APP.resetData()">↩️ 重置为种子数据</button></div>' +
      '<p style="font-size:13px;color:var(--ink-2);margin-top:12px">种子数据 = OB「英语自学建设系统」2026-08-28 的真实快照。重置会清空你此后的一切学习痕迹。</p></div>';
  }
  function renderSettingsAbout(main) {
    main.innerHTML = settingsTabBar('about') +
      '<div class="card"><div class="card-title">ℹ️ 关于与更新</div>' +
      '<div class="install-guide"><b>🔄 版本更新</b>' +
      '<span>当前版本 v' + (window.VG_UPDATE ? VG_UPDATE.APP_VERSION : '?') + '</span>' +
      '<span style="margin-top:4px"><button class="btn btn-sm" onclick="VG_APP.checkUpdate(\\'updateResult\\')">🔄 检查更新</button>' +
      '<label style="display:inline-flex;align-items:center;gap:4px;margin-left:8px;font-size:13px;color:var(--ink-2);cursor:pointer">' +
      '<input type="checkbox" id="upAutoChk"' + (updateAutoOn() ? ' checked' : '') + ' onchange="VG_APP.toggleAutoUpdate(this)"> 自动检查更新</label></span>' +
      '<div id="updateResult" style="font-size:12px;color:var(--ink-2);margin-top:6px"></div></div>' +
      '<div class="install-guide"><b>🔧 网络自检</b>' +
      '<span style="margin-top:4px"><button class="btn btn-sm btn-outline" onclick="VG_APP.netDiag()">检查发音网络</button></span>' +
      '<div id="diagResult" style="font-size:12px;color:var(--ink-2)"></div></div>' +
      '<div class="install-guide"><b>📲 安装到手机桌面</b>' +
      '<span>📱 iPhone：Safari 打开 → 分享 ⬆️ → 添加到主屏幕</span>' +
      '<span>🤖 安卓：Chrome → ⋮ → 安装应用</span>' +
      '<span>⚠️ 微信里请先点「···」→「在浏览器打开」</span></div>' +
      '<p style="font-size:13px;color:var(--ink-2);margin-top:12px">🌱 词汇生长 · 不背单词，让单词长出来</p></div>';
  }`,
'settings pages + library split routes'
);

/* 8) renderLibBody 移除 records/achv/stats/data 分支（已在独立路由处理） */
/* 由于 renderLibBody 里的 switch-case 结构，records/achv/stats/data 的内容仍需要——但独立路由也调用 renderLibBody，
   所以保留 renderLibBody 的完整逻辑，只是 tabbar 由各路由自行渲染 */

/* 9) api 暴露新增 */
rep(
'    oxfSearch: oxfSearch,',
'    oxfSearch: oxfSearch, renderSubNav: renderSubNav,',
'api expose renderSubNav'
);

/* 写入 */
if (ok) {
  fs.writeFileSync(p, s);
  console.log('✅ 导航架构重构补丁应用成功');
} else {
  console.log('❌ 补丁失败，文件未修改');
  process.exit(1);
}
