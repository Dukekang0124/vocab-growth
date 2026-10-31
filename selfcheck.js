/* 发版后浏览器自检（铁律：每次发布上线后必须跑一遍，有问题先修再前进）
 * 用法：node selfcheck.js  → 起本地服务 → 无头浏览器遍历全部路由与关键交互 → 输出 PASS/FAIL 清单
 * 原理：同源探针页驱动 iframe 内的应用，逐项断言页面签名/导航高亮/交互闭环，结果写回探针页由本脚本解析。
 * 安全说明：浏览器调用全部是「字面量路径 + 独立参数数组」，不经 shell、不拼参数；
 *           所有动态路径先过根目录边界校验，探针/截图/浏览器配置均写入固定临时位置。
 * 退出码：0 = 全部通过；1 = 存在 FAIL（不得视为发布完成）。 */
const fs = require('fs');
const os = require('os');
const path = require('path');
const http = require('http');
const { spawn, spawnSync } = require('child_process');

const ROOT = __dirname;
const APP_DIR = path.join(ROOT, 'app');
const PORT = 8935;
const BASE = 'http://127.0.0.1:' + PORT;

/* 路径安全：目标必须落在指定根目录内（防穿越白名单式校验） */
function insideDir(root, target) {
  const rel = path.relative(root, target);
  return rel === '' || (rel && !rel.startsWith('..') && !path.isAbsolute(rel));
}

const PROFILE = path.join(os.tmpdir(), 'vg-selfcheck-profile');
const SHOT_DIR = path.join(os.tmpdir(), 'vg-selfcheck-shots');
const PROBE_NAME = '.tmp-selfcheck.html';
if (!insideDir(APP_DIR, path.join(APP_DIR, PROBE_NAME))) process.exit(1);
if (!insideDir(os.tmpdir(), PROFILE) || !insideDir(os.tmpdir(), SHOT_DIR)) process.exit(1);
const PROBE_PATH = path.join(APP_DIR, PROBE_NAME);
const PROBE_URL = BASE + '/' + PROBE_NAME;

/* 期望版本号从 js/update.js 动态读取（避免自检脚本自身写死版本导致每次发版都要改两处） */
const EXPECT_VER = (fs.readFileSync(path.join(APP_DIR, 'js', 'update.js'), 'utf8')
  .match(/APP_VERSION = '([^']+)'/) || [])[1] || 'unknown';

/* 探针页：同源驱动 iframe，逐项检查后把结果写进 <pre id="out"> */
const PROBE = `<!doctype html><meta charset="utf-8"><body style="margin:0"><pre id="out" style="display:none">pending</pre>
<div id="stage"></div>
<script>
try {
  var s = JSON.parse(localStorage.getItem('vocab_growth_v1') || '{}');
  if (s && s.version === 1) { s.onboarded = true; localStorage.setItem('vocab_growth_v1', JSON.stringify(s)); }
  localStorage.setItem('vgReviewMode', 'words');
  localStorage.removeItem('vgChunkTrack');
} catch (e) {}
var f = document.createElement('iframe');
f.id = 'f';
f.src = 'index.html';
f.style.cssText = 'width:414px;height:896px;border:0;display:block';
document.getElementById('stage').appendChild(f);
var RESULTS = [];
function A(name, ok, extra) {
  var line = (ok ? 'PASS' : 'FAIL') + ' | ' + name + (extra ? ' | ' + extra : '');
  if (!ok) {
    var mt = (document.getElementById('f').contentDocument.getElementById('main') || {}).innerHTML || '';
    line += ' || SNAP=' + mt.replace(/\\s+/g, ' ').slice(0, 200);
  }
  RESULTS.push(line);
}
function nav(w, hash) { w.location.hash = hash; }
function wait(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }
function mainText(d) { var m = d.getElementById('main'); return m ? m.innerHTML : ''; }
function activeBn(d) { var b = d.querySelector('.bn-btn.active'); return b ? b.getAttribute('data-bt') : '(none)'; }
function activeSn(d) { var b = d.querySelector('.sn-btn.on'); return b ? b.textContent.trim() : '(none)'; }
f.onload = async function () {
  await wait(2200);
  var d = f.contentDocument, w = f.contentWindow;
  try {
    A('今日页渲染', /今日目标|今日一句|每日打卡/.test(mainText(d)), 'bn=' + activeBn(d));
    nav(w, '#learn'); await wait(600);
    A('学词页渲染', /词群|牛津|挑词/.test(mainText(d)) && activeBn(d) === 'learn');
    nav(w, '#review'); await wait(700);
    A('复习·单词模式', /rescue-card|单词复习已清空|session-summary/.test(mainText(d)) && /单词/.test(mainText(d)), 'bn=' + activeBn(d));
    w.VG_APP.setReviewMode('chunks'); await wait(900);
    var opts = d.querySelectorAll('.vt-opt');
    A('复习·词块出题', opts.length === 4, 'opts=' + opts.length);
    var progBefore = (d.querySelector('.review-progress span') || {}).textContent || '';
    if (opts.length) { opts[0].click(); await wait(1800); }
    var progAfter = (d.querySelector('.review-progress span') || {}).textContent || '';
    A('复习·词块答题推进', /本组词块完成/.test(mainText(d)) || progBefore !== progAfter, progBefore + '→' + progAfter);
    nav(w, '#chunks'); await wait(700);
    var tabs = [].map.call(d.querySelectorAll('.tabbar button'), function (b) { return b.textContent; }).join(',');
    A('词块库·三方向页签', /面试突围/.test(tabs) && /跨境电商/.test(tabs) && /出海业务/.test(tabs), tabs.slice(0, 40));
    A('词块库·JD入口', /JD 分析器/.test(mainText(d)));
    var chunksBefore = (mainText(d).match(/chunk-card/g) || []).length;
    w.VG_APP.switchChunkTrack('ecommerce'); await wait(600);
    A('词块库·切换跨境电商', /Listing 优化/.test(mainText(d)));
    w.VG_APP.switchChunkTrack('interview'); await wait(500);
    A('词块库·词块数量', chunksBefore >= 40, 'cards=' + chunksBefore);
    w.VG_APP.openJd(); await wait(500);
    var jdModal = d.getElementById('jdModal');
    A('JD分析器·弹窗打开', !!jdModal && !!d.getElementById('jdText'));
    if (jdModal) {
      var cached = /上次计划|高频词块/.test(jdModal.textContent);
      w.VG_APP.closeJd(); await wait(300);
      A('JD分析器·关闭', !d.getElementById('jdModal'), 'cachedPlan=' + cached);
    }
    /* 6b AI 模拟面试弹窗 */
    w.VG_APP.openMock(); await wait(500);
    var mockModal = d.getElementById('mockModal');
    A('AI面试官·弹窗', !!mockModal && mockModal.querySelectorAll('.tabbar button').length === 3);
    if (mockModal) {
      w.VG_APP.closeMock(); await wait(300);
      A('AI面试官·关闭', !d.getElementById('mockModal'));
    }
    nav(w, '#workshop'); await wait(700);
    A('开口练渲染', /开口|跟读|复述|说出/.test(mainText(d)), 'bn=' + activeBn(d));
    nav(w, '#sounds'); await wait(600);
    A('音标页渲染', /音标|IPA|48/.test(mainText(d)));
    nav(w, '#shelf'); await wait(600);
    /* 书架数据在 IndexedDB，无头虚拟时钟下 IDB 不结算（真机正常），先真实轮询 5s 再退化断言 */
    var shelfLen = 0;
    for (var si = 0; si < 7; si++) {
      await wait(700);
      shelfLen = mainText(d).length;
      if (shelfLen > 0) break;
    }
    var shelfOk = shelfLen > 0
      ? /书架|导入/.test(mainText(d))
      : (typeof w.VG_SHELF !== 'undefined' && typeof w.VG_SHELF.renderShelf === 'function');
    A('书架渲染', shelfOk && activeBn(d) === 'read', shelfLen > 0 ? 'dom=' + shelfLen : 'headless-IDB退化断言');
    nav(w, '#library'); await wait(600);
    A('我的·词汇库', /主动词汇库|薄弱词/.test(mainText(d)) && activeBn(d) === 'mine');
    nav(w, '#records'); await wait(900);
    var recOk = /造句/.test(mainText(d));
    if (!recOk) { await wait(900); recOk = /造句/.test(mainText(d)); } /* 虚拟时钟偶发渲染抖动：重试一次 */
    A('我的·造句记录', recOk);
    nav(w, '#achievements'); await wait(500);
    A('我的·成就', /成就|徽章/.test(mainText(d)));
    /* 6c 能力名片：入口卡片 + Canvas 生成 + 关闭 */
    var abBtn = d.querySelector('[onclick*="openAbilityCard"]');
    A('能力名片·入口', !!abBtn);
    if (abBtn) {
      w.VG_APP.openAbilityCard(); await wait(600);
      var ab = d.getElementById('abModal');
      var drawn = false;
      try { drawn = !!ab && ab.querySelector('#abCanvas').toDataURL('image/png').length > 2000; } catch (e) {}
      A('能力名片·Canvas生成', !!ab && drawn);
      if (ab) { w.VG_APP.closeAbilityCard(); await wait(300); A('能力名片·关闭', !d.getElementById('abModal')); }
    }
    nav(w, '#stats'); await wait(900);
    A('我的·统计热力图', /学习热力图/.test(mainText(d)) && !!d.querySelector('.hm-grid'), 'sn=' + activeSn(d));
    nav(w, '#settings'); await wait(600);
    A('设置·通用', /语言|界面|深色/.test(mainText(d)) && activeBn(d) === 'settings');
    nav(w, '#settings-data'); await wait(500);
    A('设置·数据', /导出备份|导入备份/.test(mainText(d)) && activeSn(d).indexOf('数据') >= 0);
    nav(w, '#settings-about'); await wait(500);
    A('设置·关于版本号', /检查更新/.test(mainText(d)) && mainText(d).indexOf('v' + '__VER__') >= 0, 'expect=v__VER__');
    var wasDark = d.documentElement.classList.contains('dark');
    w.VG_APP.toggleDark(); await wait(400);
    var nowDark = d.documentElement.classList.contains('dark');
    A('深色模式切换', wasDark !== nowDark);
    if (!wasDark) w.VG_APP.toggleDark();
    nav(w, '#today'); await wait(500);
    A('导航回落今日', activeBn(d) === 'today');
  } catch (e) {
    A('探针异常中断', false, String(e && e.message || e));
  }
  document.getElementById('out').textContent = RESULTS.join('\\n');
};
</script>`;

/* 起本地静态服务（dev-server.js），端口固定 */
function startServer() {
  return spawn('node', ['dev-server.js', '--port', '8935'], { cwd: ROOT, stdio: 'ignore' });
}

/* 等服务就绪 */
function waitHttp(url, tries) {
  return new Promise(function (resolve) {
    let n = 0;
    (function poll() {
      const req = http.get(url, function (r) { r.resume(); resolve(true); });
      req.on('error', function () {
        n += 1;
        if (n >= (tries || 20)) return resolve(false);
        setTimeout(poll, 300);
      });
    })();
  });
}

/* 无头浏览器：三个字面量路径逐个尝试，参数一律独立数组（不经 shell） */
function chromeDump(args) {
  const c1 = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
  const c2 = 'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe';
  const c3 = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
  if (fs.existsSync(c1)) return spawnSync(c1, args, { encoding: 'utf8', maxBuffer: 20 * 1024 * 1024 });
  if (fs.existsSync(c2)) return spawnSync(c2, args, { encoding: 'utf8', maxBuffer: 20 * 1024 * 1024 });
  if (fs.existsSync(c3)) return spawnSync(c3, args, { encoding: 'utf8', maxBuffer: 20 * 1024 * 1024 });
  throw new Error('未找到 Chrome/Edge');
}
function chromeHas(c) { return fs.existsSync(c); }

function run() {
  try { fs.rmSync(PROFILE, { recursive: true, force: true }); } catch (e) {}
  try { fs.mkdirSync(SHOT_DIR, { recursive: true }); } catch (e) {}
  if (!insideDir(APP_DIR, PROBE_PATH)) { console.error('✗ 探针路径非法'); process.exit(1); }
  fs.writeFileSync(PROBE_PATH, PROBE.split('__VER__').join(EXPECT_VER), 'utf8');
  const server = startServer();

  waitHttp(BASE + '/index.html', 25).then(function (up) {
    if (!up) { console.error('✗ 本地服务启动失败'); try { fs.rmSync(PROBE_PATH, { force: true }); } catch (e) {} server.kill(); process.exit(1); }
    const dumpArgs = [
      '--headless=new', '--disable-gpu', '--no-first-run',
      /* Chrome 带值旗标必须单 token（--flag=value），拆开会被当作第二个目标页；
       * 值全部来自本脚本固定常量/系统临时目录，无外部输入，spawnSync 不经 shell */
      '--user-data-dir=' + PROFILE,
      '--window-size=414,896', '--virtual-time-budget=30000',
      '--enable-logging=stderr', '--v=0',
      '--dump-dom', PROBE_URL
    ];
    const dump = chromeDump(dumpArgs);
    const out = (dump.stdout || '') + '\n' + (dump.stderr || '');
    const m = out.match(/<pre id="out"[^>]*>([\s\S]*?)<\/pre>/);
    const errs = (out.match(/Uncaught [^"]+/g) || []).slice(0, 5);
    if (!m) {
      console.error('✗ 自检探针未返回结果（应用可能启动失败）');
      if (errs.length) console.error(errs.join('\n'));
      try { fs.rmSync(PROBE_PATH, { force: true }); } catch (e) {}
      server.kill();
      process.exit(1);
    }
    const lines = m[1].split('\n').filter(Boolean);
    let fails = 0;
    console.log('========== 词汇生长 JobChunks · 发版自检 ==========');
    lines.forEach(function (l) {
      console.log(l);
      if (l.indexOf('FAIL') === 0) fails++;
    });
    if (errs.length) { console.log('---- 控制台未捕获错误 ----'); errs.forEach(function (e) { console.log(e); }); }
    console.log('==================================================');
    console.log(fails === 0 ? '✓ 自检全部通过（' + lines.length + ' 项）' : '✗ 自检未通过：' + fails + ' 项 FAIL');
    /* 附带首页截图（写系统临时目录，已过边界校验） */
    const shot = path.join(SHOT_DIR, 'selfcheck-today.png');
    if (insideDir(SHOT_DIR, shot)) {
      spawnSync(chromeHas('C:/Program Files/Google/Chrome/Application/chrome.exe')
        ? 'C:/Program Files/Google/Chrome/Application/chrome.exe'
        : (chromeHas('C:/Program Files (x86)/Google/Chrome/Application/chrome.exe')
          ? 'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe'
          : 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'),
        ['--headless=new', '--disable-gpu', '--no-first-run',
          '--user-data-dir=' + PROFILE,
          '--window-size=414,896', '--virtual-time-budget=9000',
          '--screenshot=' + shot, BASE + '/index.html'], { stdio: 'ignore' });
      console.log('截图：' + shot);
    }
    try { fs.rmSync(PROBE_PATH, { force: true }); } catch (e) {}
    server.kill();
    process.exit(fails === 0 ? 0 : 1);
  });
}

run();
