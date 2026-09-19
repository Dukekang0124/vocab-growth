/* ============================================================
 * 词汇生长 — 全局点词查词 (js/lookup.js)
 * 依赖：VG_OXFORD（离线词库）、VG_APP（_store/speakText）、VG_AI（问小苗）、VG_QUOTA（收词计额）
 * 词源三层：
 *   1. 离线牛津 3000/5000（毫秒级，含英英+中文+音标+例句）
 *   2. 自建 Worker /api/define（牛津外生词的英英+音标，免费通道）
 *   3. 「问小苗」——AI 解释任何词（额度内）
 * 交互：点词出底部卡片；发音复用 TTS 双轨链；一键收进词库进 SRS 复习闭环
 * ============================================================ */
var VG_LOOKUP = (function () {
  'use strict';

  var API = 'https://vocab-growth-api.pages.dev/api/define?word=';
  var PACK_URL = 'https://vocab-growth-api.pages.dev/dict-pack.json';
  var packData = null;      /* { word: [phonetic, zh, en] } 离线包懒加载 */
  var packLoading = null;

  /* ---- 离线词典包（IndexedDB vgLookup.kv） ---- */
  function packDb() {
    return new Promise(function (res, rej) {
      var rq = indexedDB.open('vgLookup', 1);
      rq.onupgradeneeded = function () { if (!rq.result.objectStoreNames.contains('kv')) rq.result.createObjectStore('kv'); };
      rq.onsuccess = function () { res(rq.result); };
      rq.onerror = function () { rej(rq.error); };
    });
  }
  function packGet() {
    if (packData) return Promise.resolve(packData);
    if (packLoading) return packLoading;
    packLoading = packDb().then(function (d) {
      return new Promise(function (res) {
        var rq = d.transaction('kv').objectStore('kv').get('ecdict');
        rq.onsuccess = function () { packData = rq.result || null; res(packData); };
        rq.onerror = function () { res(null); };
      });
    });
    return packLoading;
  }
  function packPut(data) {
    return packDb().then(function (d) {
      return new Promise(function (res, rej) {
        var rq = d.transaction('kv', 'readwrite').objectStore('kv').put(data, 'ecdict');
        rq.onsuccess = function () { packData = data; res(); };
        rq.onerror = function () { rej(rq.error); };
      });
    });
  }
  function downloadPack() {
    toast2('📥 词典包下载中…（约 10MB，一次即可）');
    return fetch(PACK_URL)
      .then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
      .then(function (j) { return packPut(j); })
      .then(function () { toast2('✅ 离线词典包就绪', 'ok'); return true; })
      .catch(function (e) { toast2('词典包下载失败：' + e.message, 'err'); return false; });
  }
  function packLookup(word) {
    if (!packData) return null;
    var cands = lemmas(word);
    for (var i = 0; i < cands.length; i++) {
      var hit = packData[cands[i]];
      if (hit) return { ipa: hit[0] || '', zh: hit[1] || '', def: hit[2] || '', src: 'pack' };
    }
    return null;
  }
  var idx = null;          /* word -> entry 拍平索引（懒构建） */
  var el = null;           /* 卡片 DOM */
  var seq = 0;             /* 防竞态：远程结果回来时卡片可能已换词 */

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function toast2(msg, type) { if (window.VG_APP && VG_APP._toast) VG_APP._toast(msg, type); }

  /* ---------- 索引与词形还原 ---------- */
  function buildIndex() {
    if (idx) return idx;
    idx = {};
    try {
      var levels = (window.VG_OXFORD && VG_OXFORD.LEVELS) || [];
      levels.forEach(function (lv) {
        (lv.words || []).forEach(function (w) {
          if (!idx[w.word]) idx[w.word] = w;
        });
      });
    } catch (e) {}
    return idx;
  }
  /* 词形还原：dolphins→dolphin, went 有限处理（后缀剥离优先，不规则词靠牛津原词命中） */
  function lemmas(word) {
    var w = String(word || '').toLowerCase().replace(/^[^a-z]+|[^a-z]+$/g, '');
    if (!w) return [];
    var out = [w];
    function add(x) { if (x && x.length > 1 && out.indexOf(x) < 0) out.push(x); }
    if (/ies$/.test(w)) add(w.slice(0, -3) + 'y');
    if (/es$/.test(w)) add(w.slice(0, -2));
    if (/s$/.test(w) && !/ss$/.test(w)) add(w.slice(0, -1));
    if (/ing$/.test(w)) { add(w.slice(0, -3)); add(w.slice(0, -3) + 'e'); add(w.slice(0, -3) + w.slice(-4, -3)); }
    if (/ed$/.test(w)) { add(w.slice(0, -2)); add(w.slice(0, -1)); add(w.slice(0, -2) + w.slice(-3, -2)); }
    if (/'s$/.test(w) || /\u2019s$/.test(w)) add(w.replace(/['\u2019]s$/, ''));
    return out;
  }
  function localLookup(word) {
    var index = buildIndex();
    var cands = lemmas(word);
    for (var i = 0; i < cands.length; i++) {
      var hit = index[cands[i]];
      if (hit) {
        return {
          word: hit.word, ipa: hit.ipa || '', pos: hit.pos || '',
          def: hit.def || '', zh: hit.zh || '', ex: hit.ex || '',
          cefr: (hit.cefr || '').toUpperCase(), src: 'oxford'
        };
      }
    }
    return null;
  }

  /* ---------- 远程兜底（生词英英） ---------- */
  function remoteLookup(word) {
    if (!navigator.onLine) return Promise.resolve(null);
    var my = ++seq;
    var ctl = typeof AbortController !== 'undefined' ? new AbortController() : null;
    var timer = ctl ? setTimeout(function () { try { ctl.abort(); } catch (e) {} }, 12000) : null;
    return fetch(API + encodeURIComponent(word.toLowerCase()), ctl ? { signal: ctl.signal } : {})
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (j) {
        if (timer) clearTimeout(timer);
        if (!j || !j.ok || my !== seq) return null;
        return { ipa: j.ipa || '', defs: j.defs || [], src: 'web' };
      })
      .catch(function () { if (timer) clearTimeout(timer); return null; });
  }

  /* ---------- 查词卡 ---------- */
  function ensureCard() {
    if (el) return;
    el = document.createElement('div');
    el.id = 'lkCard';
    document.body.appendChild(el);
    el.addEventListener('click', function (e) {
      if (e.target === el) hide();
    });
  }
  function hide() { if (el) el.classList.remove('open'); }
  function show(word, opts) {
    opts = opts || {};
    var clean = String(word || '').replace(/^[^A-Za-z\u2019'-]+|[^A-Za-z\u2019'-]+$/g, '');
    if (!clean || clean.length < 2 || !/[A-Za-z]/.test(clean)) return;
    ensureCard();
    el.classList.add('open');
    var local = localLookup(clean);
    var head =
      '<div class="lk-head"><div><span class="lk-word">' + esc(local ? local.word : clean.toLowerCase()) + '</span>' +
      (local && local.cefr ? '<span class="lk-cefr">' + local.cefr + '</span>' : '') + '</div>' +
      '<button class="lk-speak" title="发音">🔊</button>' +
      '<button class="lk-close" title="关闭">✕</button></div>';
    var body;
    if (local) {
      body =
        (local.ipa ? '<div class="lk-ipa">/' + esc(local.ipa) + '/</div>' : '') +
        (local.pos ? '<div class="lk-pos">' + esc(local.pos) + '</div>' : '') +
        (local.def ? '<div class="lk-sec">英英释义</div><div class="lk-def">' + esc(local.def) + '</div>' : '') +
        (local.zh ? '<div class="lk-sec">中文</div><div class="lk-zh">' + esc(local.zh) + '</div>' : '') +
        (local.ex ? '<div class="lk-sec">例句</div><div class="lk-ex">' + esc(local.ex) + '</div>' : '');
    } else {
      body = '<div class="lk-remote" id="lkRemote">🔍 正在查询…</div>';
      /* 离线词典包层：本地未命中时查包，包未下载则查网络后提示下载 */
      packGet().then(function (pk) {
        var box = document.getElementById('lkRemote');
        var hit = pk ? packLookup(clean) : null;
        if (hit && box) {
          box.innerHTML =
            (hit.ipa ? '<div class="lk-ipa">/' + esc(hit.ipa) + '/</div>' : '') +
            (hit.zh ? '<div class="lk-sec">中文</div><div class="lk-zh">' + esc(hit.zh) + '</div>' : '') +
            (hit.def ? '<div class="lk-sec">英英释义</div><div class="lk-def">' + esc(hit.def) + '</div>' : '') +
            '<div class="lk-src">📚 离线词典包</div>';
          return;
        }
        remoteLookup(clean).then(function (r) {
          var box2 = document.getElementById('lkRemote');
          if (!box2) return;
          if (r && r.defs.length) {
            box2.innerHTML =
              (r.ipa ? '<div class="lk-ipa">/' + esc(r.ipa) + '/</div>' : '') +
              '<div class="lk-sec">网络英英释义</div>' +
              r.defs.map(function (d) { return '<div class="lk-def">' + esc(d) + '</div>'; }).join('');
          } else if (!pk) {
            box2.innerHTML = '这个词不在牛津3000里。<button class="lk-dlpack">📥 下载离线词典包（覆盖全部生词中文释义，约 10MB）</button>';
            var b = box2.querySelector('.lk-dlpack');
            if (b) b.onclick = function () {
              b.disabled = true; b.textContent = '下载中…';
              downloadPack().then(function (ok) {
                if (!ok) { b.disabled = false; b.textContent = '重试下载'; return; }
                var hit2 = packLookup(clean);
                if (hit2 && box2) {
                  box2.innerHTML =
                    (hit2.ipa ? '<div class="lk-ipa">/' + esc(hit2.ipa) + '/</div>' : '') +
                    (hit2.zh ? '<div class="lk-sec">中文</div><div class="lk-zh">' + esc(hit2.zh) + '</div>' : '') +
                    (hit2.def ? '<div class="lk-sec">英英释义</div><div class="lk-def">' + esc(hit2.def) + '</div>' : '');
                }
              });
            }
          } else {
            box2.innerHTML = '牛津词库未收录。点下方「问小苗」，AI 给你讲透这个词';
          }
        });
      });
    }
    el.innerHTML = head + '<div class="lk-body">' + body + '</div>' +
      '<div class="lk-acts">' +
      '<button class="lk-collect">🌱 ' + (inLib(clean) ? '已在词库' : '收进词库') + '</button>' +
      '<button class="lk-ask">💬 问小苗</button></div>';

    el.querySelector('.lk-close').onclick = hide;
    el.querySelector('.lk-speak').onclick = function () {
      var t = local ? local.word : clean.toLowerCase();
      if (window.VG_APP && VG_APP.speakText) VG_APP.speakText(t);
    };
    el.querySelector('.lk-collect').onclick = function () { collect(clean, local); };
    el.querySelector('.lk-ask').onclick = function () { askAI(clean, opts.bookTitle); hide(); };

    if (!local) {
      remoteLookup(clean).then(function (r) {
        var box = document.getElementById('lkRemote');
        if (!box) return;
        if (!r || !r.defs.length) { box.innerHTML = '牛津词库未收录。点下方「问小苗」，AI 给你讲透这个词'; return; }
        box.innerHTML =
          (r.ipa ? '<div class="lk-ipa">/' + esc(r.ipa) + '/</div>' : '') +
          '<div class="lk-sec">网络英英释义</div>' +
          r.defs.map(function (d) { return '<div class="lk-def">' + esc(d) + '</div>'; }).join('');
      });
    }
  }
  function inLib(word) {
    try { return !!(window.VG_APP && VG_APP._store && VG_APP._store.getWord(word.toLowerCase())); }
    catch (e) { return false; }
  }
  function collect(word, local) {
    if (inLib(word)) { toast2('这个词已在词库里', 'ok'); return; }
    var f = {
      word: (local ? local.word : word.toLowerCase()),
      ipa: local ? local.ipa : '',
      pos: local ? local.pos : '',
      simple: local ? local.def : '',
      zh: local ? local.zh : '',
      chunk: '',
      exEn: local ? local.ex : '',
      exZh: '',
      note: local && local.cefr ? 'Oxford3000·' + local.cefr : '阅读查词'
    };
    var r = VG_APP._store.addCustomWord(f, 'daily');
    if (!r.ok) { toast2(r.error || '收词失败', r.locked ? 'warn' : 'err'); return; }
    /* 先确认收词成功再扣学习额度（被新词上限拦下时不白扣） */
    if (window.VG_QUOTA && !VG_QUOTA.gate('learn')) return;
    toast2('🌱 已收进词库：' + f.word + '（明天首复习）', 'ok');
    var b = el.querySelector('.lk-collect');
    if (b) b.textContent = '🌱 已在词库';
  }
  function askAI(word, bookTitle) {
    if (!window.VG_AI) { toast2('AI 学伴未加载'); return; }
    var q = '我在阅读' + (bookTitle ? '《' + bookTitle + '》' : '书') + '时遇到单词「' + word.toLowerCase() + '」，请按你的三步法教我：核心意思、高频搭配、贴近生活的例句，然后让我用它造句。';
    VG_AI.askWord(q);
  }

  /* ---------- 阅读器交互：长按查词 + 快点分区（左/右翻页，中间归宿主） ----------
     caretRangeFromPoint 总会吸附最近文本，"点空白"不可靠——
     所以查词改长按触发（微信读书同款），快照点交给分区处理 */
  function attachWordTap(doc, opts, rootSel, onMiss) {
    if (!doc) return;
    var lpTimer = null, lpFired = false, sx = 0, sy = 0;
    doc.addEventListener('pointerdown', function (e) {
      if (e.target.closest && e.target.closest('a')) return;
      if (rootSel && !(e.target.closest && e.target.closest(rootSel))) return;
      var tocP = document.getElementById('srTocPanel');
      if (tocP && tocP.style.display !== 'none') return;      /* 目录打开时不做长按查词 */
      lpFired = false; sx = e.clientX; sy = e.clientY;
      clearTimeout(lpTimer);
      lpTimer = setTimeout(function () {
        var word = wordAtPoint(doc.ownerDocument || doc, sx, sy);
        if (word) {
          lpFired = true;
          show(word, opts || {});
          try { if (navigator.vibrate) navigator.vibrate(15); } catch (err) {}
        }
      }, 450);
    });
    doc.addEventListener('pointermove', function (e) {
      if (Math.abs(e.clientX - sx) > 12 || Math.abs(e.clientY - sy) > 12) clearTimeout(lpTimer);
    });
    doc.addEventListener('pointerup', function () { clearTimeout(lpTimer); });
    doc.addEventListener('pointercancel', function () { clearTimeout(lpTimer); });
    doc.addEventListener('click', function (e) {
      if (lpFired) { e.preventDefault(); lpFired = false; return; }   /* 长按刚出卡，吞掉后续 click */
      if (e.target.closest && e.target.closest('a')) return;
      if (rootSel && !(e.target.closest && e.target.closest(rootSel))) return;
      var sel = doc.getSelection ? doc.getSelection() : null;
      if (sel && !sel.isCollapsed) return;
      var w = (doc.documentElement && doc.documentElement.clientWidth) || window.innerWidth;
      if (typeof onMiss === 'function') onMiss(e.clientX / w);
    });
  }
  function wordAtPoint(doc, x, y) {
    var range = null;
    if (doc.caretRangeFromPoint) range = doc.caretRangeFromPoint(x, y);
    else if (doc.caretPositionFromPoint) {
      var p = doc.caretPositionFromPoint(x, y);
      if (p) { range = doc.createRange(); range.setStart(p.offsetNode, p.offset); }
    }
    if (!range || !range.startContainer) return null;
    var node = range.startContainer;
    if (node.nodeType !== 3) {                     /* 非文本节点：试试父级里的短文本 */
      if (node.textContent && node.textContent.length < 40 && /[A-Za-z]/.test(node.textContent)) {
        var one = node.textContent.trim().match(/[A-Za-z\u2019'-]+/);
        return one ? one[0] : null;
      }
      return null;
    }
    var text = node.textContent, off = range.startOffset;
    var m = /[A-Za-z\u2019'-]+/g, mm, best = null;
    while ((mm = m.exec(text))) {
      if (off >= mm.index && off <= mm.index + mm[0].length) { best = mm[0]; break; }
    }
    return best;
  }

  return {
    show: show, hide: hide, attachWordTap: attachWordTap,
    localLookup: localLookup, _lemmas: lemmas
  };
})();
