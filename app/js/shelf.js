/* ============================================================
 * 词汇生长 — 书架与阅读器 (js/shelf.js)
 * 依赖：VG_APP（toast，可选）
 * 能力：
 *   - 书架页：导入 EPUB/MOBI/AZW3/TXT/MD/DOCX，删除，继续阅读
 *   - 存储：IndexedDB（vgShelf：meta/blobs/docs 三仓），书籍不占 localStorage
 *   - 阅读器：EPUB/MOBI/AZW3 走 foliate-js；TXT/MD/DOCX 转 HTML 自渲染分页
 *   - 设置：字号 5 档、行距 2 档、四背景（纸白/护眼米黄(默认)/护眼豆绿/深色）
 *   - 进度：每本书独立记忆，重开续读
 * 查词/收词：P2 接入（选择事件已预留）
 * ============================================================ */
var VG_SHELF = (function () {
  'use strict';

  var DB_NAME = 'vgShelf', DB_VER = 1;
  var THEMES = {
    paper: { name: '纸白', bg: '#FDFBF7', fg: '#2B2B26' },
    sepia: { name: '护眼米黄', bg: '#F5ECD8', fg: '#4A3F2E' },
    green: { name: '护眼豆绿', bg: '#E3EDE3', fg: '#2F4032' },
    dark:  { name: '深色', bg: '#14171C', fg: '#C9CDD4' }
  };
  var FONT_SIZES = [15, 17, 19, 21, 24];
  var LINE_HEIGHTS = [1.7, 1.95];
  var FMT_FOLIATE = ['epub', 'mobi', 'azw3', 'azw', 'prc'];
  var FMT_DOC = ['txt', 'md', 'markdown', 'docx'];

  var db = null, R = {};   /* R = 当前阅读会话状态 */

  /* 动态 import 在经典脚本里按脚本自身 URL 解析；算出站点内绝对基址（兼容 Pages 子路径） */
  var SHELF_BASE = (function () {
    try { return document.currentScript.src.replace(/js\/shelf\.js.*$/, ''); } catch (e) { return '/'; }
  })();

  /* ---------- IndexedDB ---------- */
  function idb() {
    if (db) return Promise.resolve(db);
    return new Promise(function (res, rej) {
      var rq = indexedDB.open(DB_NAME, DB_VER);
      rq.onupgradeneeded = function () {
        var d = rq.result;
        if (!d.objectStoreNames.contains('meta')) d.createObjectStore('meta', { keyPath: 'id' });
        if (!d.objectStoreNames.contains('blobs')) d.createObjectStore('blobs', { keyPath: 'id' });
        if (!d.objectStoreNames.contains('docs')) d.createObjectStore('docs', { keyPath: 'id' });
      };
      rq.onsuccess = function () { db = rq.result; res(db); };
      rq.onerror = function () { rej(rq.error); };
    });
  }
  function tx(store, mode, fn) {
    return idb().then(function (d) {
      return new Promise(function (res, rej) {
        var t = d.transaction(store, mode);
        var rq = fn(t.objectStore(store));
        rq.onsuccess = function () { res(rq.result); };
        rq.onerror = function () { rej(rq.error); };
      });
    });
  }
  function metaPut(m) { return tx('meta', 'readwrite', function (s) { return s.put(m); }); }
  function metaGet(id) { return tx('meta', 'readonly', function (s) { return s.get(id); }); }
  function metaAll() { return tx('meta', 'readonly', function (s) { return s.getAll(); }); }
  function metaDel(id) {
    return tx('meta', 'readwrite', function (s) { return s.delete(id); }).then(function () {
      return tx('blobs', 'readwrite', function (s) { return s.delete(id); }).catch(function () {});
    }).then(function () {
      return tx('docs', 'readwrite', function (s) { return s.delete(id); }).catch(function () {});
    });
  }
  function blobPut(id, blob) { return tx('blobs', 'readwrite', function (s) { return s.put({ id: id, blob: blob }); }); }
  function blobGet(id) { return tx('blobs', 'readonly', function (s) { return s.get(id); }).then(function (r) { return r && r.blob; }); }
  function docPut(id, html) { return tx('docs', 'readwrite', function (s) { return s.put({ id: id, html: html }); }); }
  function docGet(id) { return tx('docs', 'readonly', function (s) { return s.get(id); }).then(function (r) { return r && r.html; }); }

  /* ---------- 工具 ---------- */
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function extOf(name) {
    var m = /\.([a-z0-9]+)$/i.exec(name || '');
    return m ? m[1].toLowerCase() : '';
  }
  function baseName(name) { return (name || '').replace(/\.[a-z0-9]+$/i, '').replace(/^\s+|\s+$/g, '') || '未命名'; }
  function toast2(msg, type) { if (window.VG_APP && VG_APP._toast) VG_APP._toast(msg, type); else console.log('[SHELF]', msg); }

  /* TXT/MD → HTML 文档 */
  function decodeText(buf) {
    try { return new TextDecoder('utf-8', { fatal: true }).decode(buf); }
    catch (e) { try { return new TextDecoder('gbk').decode(buf); } catch (e2) { return new TextDecoder('utf-8').decode(buf); } }
  }
  function txtToHtml(text) {
    var lines = text.replace(/\r\n?/g, '\n').split('\n');
    var out = [], inList = false;
    var chapterRe = /^(第\s*[0-9零一二三四五六七八九十百千两]+\s*[章回节卷集部篇]|CHAPTER\s+[IVXLC0-9]+|Chapter\s+\d+.*|Prologue|Epilogue)\s*/i;
    for (var i = 0; i < lines.length; i++) {
      var l = lines[i].replace(/\s+$/, '');
      if (!l.trim()) { if (inList) { out.push('</ul>'); inList = false; } continue; }
      if (chapterRe.test(l.trim()) && l.trim().length < 40) {
        if (inList) { out.push('</ul>'); inList = false; }
        out.push('<h2>' + esc(l.trim()) + '</h2>'); continue;
      }
      if (/^#{1,6}\s+/.test(l)) {
        if (inList) { out.push('</ul>'); inList = false; }
        var lv = l.match(/^#+/)[0].length;
        out.push('<h' + Math.min(lv + 1, 6) + '>' + esc(l.replace(/^#+\s+/, '')) + '</h' + Math.min(lv + 1, 6) + '>'); continue;
      }
      if (/^[-*+]\s+/.test(l)) {
        if (!inList) { out.push('<ul>'); inList = true; }
        out.push('<li>' + inline(l.replace(/^[-*+]\s+/, '')) + '</li>'); continue;
      }
      if (inList) { out.push('</ul>'); inList = false; }
      out.push('<p>' + inline(l) + '</p>');
    }
    if (inList) out.push('</ul>');
    function inline(s) {
      return esc(s)
        .replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>')
        .replace(/\*([^*]+)\*/g, '<i>$1</i>')
        .replace(/`([^`]+)`/g, '<code>$1</code>');
    }
    return out.join('\n');
  }
  function docxToHtml(buf) {
    if (!window.mammoth) return Promise.reject(new Error('docx 引擎未加载'));
    return mammoth.convertToHtml({ arrayBuffer: buf }).then(function (r) { return r.value; });
  }

  /* ---------- 导入 ---------- */
  function importFiles(files) {
    var arr = Array.prototype.slice.call(files || []);
    if (!arr.length) return;
    var chain = Promise.resolve();
    var done = 0, fail = 0;
    arr.forEach(function (f) {
      chain = chain.then(function () { return importOne(f).then(function () { done++; }, function (e) { fail++; toast2('《' + baseName(f.name) + '》导入失败：' + e.message, 'err'); }); });
    });
    chain.then(function () {
      if (done) toast2('📚 已导入 ' + done + ' 本到书架', 'ok');
      if (R.shelfVisible) renderShelf(document.getElementById('main'));
    });
  }
  function importOne(f) {
    var ext = extOf(f.name);
    var isF = FMT_FOLIATE.indexOf(ext) >= 0;
    var isD = FMT_DOC.indexOf(ext) >= 0;
    if (!isF && !isD) {
      if (ext === 'pdf' || ext === 'doc') return Promise.reject(new Error(ext.toUpperCase() + ' 格式即将支持，请先转成 EPUB/TXT'));
      return Promise.reject(new Error('不支持的格式 .' + ext));
    }
    if (f.size > 200 * 1024 * 1024) return Promise.reject(new Error('文件超过 200MB 上限'));
    var id = 'bk_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7);
    var meta = {
      id: id, title: baseName(f.name), author: '', fmt: ext,
      size: f.size, addedAt: Date.now(), lastReadAt: 0,
      progress: { cfi: '', fraction: 0, page: 0 }, pref: null, kind: isF ? 'foliate' : 'doc'
    };
    var p;
    if (isF) {
      p = blobPut(id, f).then(function () {
        /* 合集自动拆分：仅大文件（>20MB）才尝试，普通书不会误拆 */
        if (f.size > 20 * 1024 * 1024) {
          return tryAutoSplit(f, meta).catch(function (e) { dbg('auto-split skip: ' + (e && e.message || e)); });
        }
      });
    } else {
      if (ext === 'docx') {
        p = f.arrayBuffer().then(docxToHtml).then(function (html) { return docPut(id, html); });
      } else {
        p = f.arrayBuffer().then(function (buf) {
          var html = txtToHtml(decodeText(buf));
          return docPut(id, html);
        });
      }
    }
    return p.then(function () { return metaPut(meta); })
      .catch(function (e) { metaDel(id); throw e; });
  }

  /* ---------- 合集拆分 ---------- */
  var FRONT_RE = /^(封面|总目录|目录|版权|前言|序|出版说明|返回总目录)/;
  function cleanTitle(s) {
    var t = String(s || '').replace(/\s+/g, ' ').trim();
    var prev;
    while (prev !== t) { prev = t; t = t.replace(/[（(][^（）()]*[)）]\s*$/, '').trim(); }
    return t || String(s || '').trim();
  }
  function tryAutoSplit(fileOrBlob, parentMeta) {
    return import(SHELF_BASE + 'assets/vendor/foliate/view.js').then(function (mod) {
      return mod.makeBook(fileOrBlob);
    }).then(function (book) {
      /* 递归下探找"书单层"：取最浅的 ≥8 项组（同层全收，更深忽略）。
         兼容 顶层平铺 / 总目录→级别→各册 的多级嵌套 */
      var tops = [], bestDepth = Infinity;
      (function walk(items, depth) {
        if (depth > bestDepth) return;
        var bookish = (items || []).filter(function (t) { return t.label && !FRONT_RE.test(t.label.trim()); });
        if (bookish.length >= 8 || depth === bestDepth) {
          if (depth < bestDepth) { bestDepth = depth; tops = bookish.slice(); }
          else { tops = tops.concat(bookish); }
          return;
        }
        (items || []).forEach(function (t) { if (t.subitems) walk(t.subitems, depth + 1); });
      })(book.toc || [], 0);
      if (tops.length < 8) return 0;                     /* 普通书，不拆 */
      var total = book.sections.length;
      /* href→节索引：用文件名映射（splitTOCHref 对部分合集返回空） */
      var secIdx = {};
      book.sections.forEach(function (sec, i) {
        var b = String(sec.id || '').split('/').pop();
        if (b && !(b in secIdx)) secIdx[decodeURIComponent(b)] = i;
      });
      function idxOf(href) {
        if (book.resolveHref) {
          try { var r = book.resolveHref(href); if (r && typeof r.index === 'number') return r.index; } catch (e) {}
        }
        return secIdx[String(href || '').split('/').pop()];
      }
      var chain = Promise.resolve();
      var made = 0;
      tops.forEach(function (t, j) {
        chain = chain.then(function () {
          return Promise.resolve(idxOf(t.href)).then(function (i0) {
            var idx0 = typeof i0 === 'number' ? i0 : null;
            if (idx0 == null) return;
            var nextIdx = (j + 1 < tops.length && tops[j + 1].href)
              ? Promise.resolve(idxOf(tops[j + 1].href)).then(function (i2) { return typeof i2 === 'number' ? i2 : total; })
              : Promise.resolve(total);
            return Promise.resolve(nextIdx).then(function (idx1) {
              var sub = {
                id: parentMeta.id + '_s' + j,
                parentId: parentMeta.id,
                title: cleanTitle(t.label) || t.label.trim(),
                author: parentMeta.author || '',
                fmt: parentMeta.fmt, kind: 'sub', order: j,
                startHref: t.href, startIdx: idx0, endIdx: Math.max(idx0 + 1, idx1),
                startFrac: idx0 / total, endFrac: Math.min(1, Math.max(idx0 + 1, idx1) / total),
                size: 0, addedAt: parentMeta.addedAt + j, lastReadAt: 0,
                progress: { cfi: '', fraction: 0, page: 0 }, pref: null
              };
              made++;
              return metaPut(sub);
            });
          });
        });
      });
      return chain.then(function () {
        if (made >= 8) {
          parentMeta.splitInto = made;
          parentMeta.title = parentMeta.title;
          return metaPut(parentMeta).then(function () {
            dbg('split into ' + made + ' books');
            return made;
          });
        }
        return 0;
      });
    });
  }
  /* 存量书手动拆分入口 */
  function splitExisting(id) {
    dbg('splitExisting: ' + id);
    metaGet(id).then(function (m) {
      dbg('split metaGet: ' + (m ? m.kind + '/' + (m.splitInto || 0) : 'NULL'));
      if (!m || m.kind !== 'foliate') { toast2('这本书不需要拆分'); return; }
      if (m.splitInto) { toast2('已经拆分过了'); return; }
      toast2('📖 正在分析目录，大书需要一点时间…');
      blobGet(id).then(function (blob) {
        dbg('split blob ready');
        return tryAutoSplit(blob, m);
      }).then(function (n) {
        dbg('split result: ' + n);
        if (n >= 8) { toast2('🎉 已拆分为 ' + n + ' 本单册', 'ok'); renderShelf(document.getElementById('main')); }
        else toast2('这本书的结构不适合拆分', 'warn');
      }).catch(function (e) {
        dbg('split ERR: ' + (e && e.message || e));
        toast2('拆分失败：' + (e && e.message || e), 'err');
      });
    }).catch(function (e) { dbg('split metaGet ERR: ' + (e && e.message || e)); });
  }

  /* ---------- 书架页 ---------- */
  function coverHtml(m) {
    var hue = 0; for (var i = 0; i < m.id.length; i++) hue = (hue * 31 + m.id.charCodeAt(i)) % 360;
    var pct = Math.round((m.progress.fraction || 0) * 100);
    return '<div class="sf-cover" style="background:linear-gradient(160deg,hsl(' + hue + ',42%,88%),hsl(' + ((hue + 40) % 360) + ',38%,76%))">' +
      '<span class="sf-fmt">' + esc(m.fmt.toUpperCase()) + '</span>' +
      '<div class="sf-title">' + esc(m.title) + '</div>' +
      (m.author ? '<div class="sf-author">' + esc(m.author) + '</div>' : '') +
      (pct > 0 ? '<div class="sf-pbar"><i style="width:' + pct + '%"></i></div><div class="sf-pct">' + pct + '%</div>' : '') +
      '</div>';
  }
  function renderShelf(main) {
    R.shelfVisible = true;
    metaAll().then(function (list) {
      /* 已拆分的合集父本不再显示（子册即书架） */
      var shown = list.filter(function (m) { return !m.splitInto; });
      shown.sort(function (a, b) { return (b.lastReadAt || b.addedAt) - (a.lastReadAt || a.addedAt); });
      var cards = shown.map(function (m) {
        var splitBtn = (m.kind === 'foliate' && !m.splitInto && m.size > 20 * 1024 * 1024)
          ? '<button onclick="VG_SHELF.splitExisting(\'' + m.id + '\')">拆分为单册</button>' : '';
        return '<div class="sf-card" onclick="VG_SHELF.openReader(\'' + m.id + '\')">' + coverHtml(m) +
          '<div class="sf-ops">' + splitBtn + '<button onclick="VG_SHELF.delBook(event,\'' + m.id + '\')">删除</button></div></div>';
      }).join('');
      main.innerHTML =
        '<div class="card"><div class="card-title">📚 书架<span class="hint">点书开读 · 点词查词</span>' +
        '<button class="btn btn-sm" style="margin-left:8px;flex-shrink:0" onclick="document.getElementById(\'sfFile\').click()">⬆️ 导入图书</button>' +
        '<input type="file" id="sfFile" multiple accept=".epub,.mobi,.azw3,.azw,.prc,.txt,.md,.markdown,.docx" style="display:none" onchange="VG_SHELF.importFiles(this.files);this.value=\'\'"></div>' +
        '<div class="sf-tip">支持 EPUB / MOBI / AZW3 / TXT / MD / DOCX；大合集自动拆分为单册。PDF 即将支持。</div>' +
        (shown.length ? '<div class="sf-grid">' + cards + '</div>' :
          '<div class="sf-empty">🌱 书架还是空的<br><span>导入一本英文书，点词就能查意思、收进词库</span></div>') +
        '</div>';
    }).catch(function (e) {
      main.innerHTML = '<div class="card">书架加载失败：' + esc(e.message) + '</div>';
    });
  }
  function delBook(ev, id) {
    if (ev) ev.stopPropagation();
    metaGet(id).then(function (m) {
      if (!m) return;
      if (m.kind === 'sub') {
        if (!confirm('从书架移除《' + m.title + '》？（合集文件保留，可重新拆分恢复）')) return;
        metaDel(id).then(function () { renderShelf(document.getElementById('main')); });
        return;
      }
      if (m.splitInto) {
        if (!confirm('《' + m.title + '》已拆分为 ' + m.splitInto + ' 册。\n删除将移除整包文件和全部单册，确定？')) return;
        metaAll().then(function (all) {
          var subs = all.filter(function (x) { return x.parentId === m.id; });
          var chain = Promise.resolve();
          subs.forEach(function (s) { chain = chain.then(function () { return metaDel(s.id); }); });
          return chain.then(function () { return metaDel(m.id); });
        }).then(function () { renderShelf(document.getElementById('main')); });
        return;
      }
      if (!confirm('删除《' + m.title + '》？阅读进度也会清除')) return;
      metaDel(id).then(function () { renderShelf(document.getElementById('main')); });
    });
  }

  /* ---------- 阅读器 ---------- */
  function prefs(m) {
    var p = m.pref || {};
    return {
      size: p.size == null ? 3 : p.size,          /* FONT_SIZES 下标 */
      line: p.line == null ? 0 : p.line,
      theme: p.theme || 'sepia'
    };
  }
  function dbg(msg) { try { (window.__shelfLog = window.__shelfLog || []).push(msg); } catch (e) {} }
  function savePrefs(m, p) {
    m.pref = p;
    metaPut(m);
    applyDocStyles();
    if (R.view && R.view.renderer && R.view.renderer.setStyles) R.view.renderer.setStyles(readerCSS());
  }
  function readerCSS() {
    var t = THEMES[R.pref.theme], fs = FONT_SIZES[R.pref.size], lh = LINE_HEIGHTS[R.pref.line];
    return '@namespace epub "http://www.idpf.org/2007/ops";' +
      'html,body{background:' + t.bg + ' !important;color:' + t.fg + ' !important;}' +
      'body{font-size:' + fs + 'px !important;line-height:' + lh + ' !important;}' +
      'p,li,blockquote,dd{line-height:' + lh + ' !important;}' +
      'a{color:#2E7D32;}h1,h2,h3{color:' + t.fg + ' !important;}';
  }
  function openReader(id) {
    metaGet(id).then(function (m) {
      if (!m) { toast2('书不存在'); return; }
      m.lastReadAt = Date.now(); metaPut(m);
      buildReaderUI(m);
      dbg('reader UI built: ' + !!document.getElementById('sfReader'));
      /* 子册：读父文件，记子书进度；百分比按单册区间映射 */
      if (m.kind === 'sub') {
        R.fracSpan = [m.startFrac, m.endFrac];
        metaGet(m.parentId).then(function (parent) {
          if (!parent) { toast2('合集文件丢失，请重新导入合集', 'err'); return; }
          return blobGet(parent.id).then(function (blob) { openFoliate(m, blob, m.startHref); });
        }).catch(function (e) { toast2('打开失败：' + (e && e.message || e), 'err'); });
      } else if (m.kind === 'foliate') {
        R.fracSpan = null;
        openFoliate(m);
      } else {
        openDoc(m);
      }
    }).catch(function (e) {
      dbg('openReader ERR: ' + (e && e.message || e));
      toast2('打开失败：' + (e && e.message || e), 'err');
    });
  }
  function buildReaderUI(m) {
    var old = document.getElementById('sfReader');
    if (old) old.remove();
    var wrap = document.createElement('div');
    wrap.id = 'sfReader';
    wrap.innerHTML =
      '<div class="sr-top"><button id="srBack">✕</button>' +
      '<button id="srToc" title="目录">☰</button><span id="srTitle">' + esc(m.title) + '</span>' +
      '<button id="srAa">Aa</button></div>' +
      '<div class="sr-toc" id="srTocPanel" style="display:none"></div>' +
      '<div class="sr-body" id="srBody"></div>' +
      '<div class="sr-bar"><button id="srPrev">‹</button>' +
      '<input type="range" id="srSlider" min="0" max="1000" value="0">' +
      '<button id="srNext">›</button></div>' +
      '<div class="sr-progress" id="srPct">0%</div>' +
      '<div class="sr-settings" id="srSettings" style="display:none">' +
      '  <div class="sr-row"><span>字号</span>' + FONT_SIZES.map(function (s, i) {
        return '<button data-size="' + i + '">' + s + '</button>';
      }).join('') + '</div>' +
      '  <div class="sr-row"><span>行距</span>' + LINE_HEIGHTS.map(function (l, i) {
        return '<button data-line="' + i + '">' + (i === 0 ? '标准' : '宽松') + '</button>';
      }).join('') + '</div>' +
      '  <div class="sr-row"><span>背景</span>' + Object.keys(THEMES).map(function (k) {
        return '<button data-theme="' + k + '">' + THEMES[k].name + '</button>';
      }).join('') + '</div>' +
      '</div>';
    document.body.appendChild(wrap);
    R.meta = m; R.pref = prefs(m);
    document.getElementById('srBack').onclick = closeReader;
    document.getElementById('srToc').onclick = toggleToc;
    /* 微信读书式点侧翻页：左 22% 上一页，右 22% 下一页（点词查词优先） */
    document.getElementById('srBody').addEventListener('click', function (e) {
      if (e.target.closest('a')) return;
      var lk = document.getElementById('lkCard');
      if (lk && lk.classList.contains('open')) return;
      var r = this.getBoundingClientRect();
      var x = e.clientX - r.left, w = r.width;
      if (x < w * 0.22) nav(-1);
      else if (x > w * 0.78) nav(1);
    });
    document.getElementById('srAa').onclick = function () {
      var s = document.getElementById('srSettings');
      s.style.display = s.style.display === 'none' ? 'block' : 'none';
    };
    document.getElementById('srPrev').onclick = function () { nav(-1); };
    document.getElementById('srNext').onclick = function () { nav(1); };
    document.getElementById('srSlider').onchange = function () {
      var p = this.value / 1000;
      if (R.kind === 'foliate' && R.view && R.view.goToFraction) R.view.goToFraction(toGlobal(p));
      else if (R.kind === 'doc') goPage(Math.round(p * (R.pages - 1)));
    };
    var set = document.getElementById('srSettings');
    set.addEventListener('click', function (e) {
      var b = e.target.closest('button'); if (!b) return;
      if (b.dataset.size != null) R.pref.size = +b.dataset.size;
      else if (b.dataset.line != null) R.pref.line = +b.dataset.line;
      else if (b.dataset.theme) R.pref.theme = b.dataset.theme;
      savePrefs(R.meta, R.pref); markSettings();
    });
    markSettings();
  }
  function markSettings() {
    var set = document.getElementById('srSettings');
    if (!set) return;
    Array.prototype.forEach.call(set.querySelectorAll('button'), function (b) {
      var on = (b.dataset.size != null && +b.dataset.size === R.pref.size) ||
               (b.dataset.line != null && +b.dataset.line === R.pref.line) ||
               (b.dataset.theme && b.dataset.theme === R.pref.theme);
      b.className = on ? 'on' : '';
    });
  }
  /* ---- 目录抽屉 ---- */
  var tocData = null;
  function flattenToc(items, depth, out) {
    (items || []).forEach(function (t) {
      out.push({ label: (t.label || '').trim(), href: t.href || '', depth: depth });
      if (t.subitems) flattenToc(t.subitems, depth + 1, out);
    });
    return out;
  }
  function toggleToc() {
    var p = document.getElementById('srTocPanel');
    if (!p) return;
    if (p.style.display !== 'none') { p.style.display = 'none'; return; }
    p.innerHTML = '<div class="sr-toc-head">📖 目录</div><div class="sr-toc-list" id="srTocList"><div class="sr-toc-empty">目录解析中…</div></div>';
    p.style.display = 'flex';
    if (R.kind !== 'foliate' || !R.view || !R.view.book) { if (R.kind === 'doc') renderDocToc(); return; }
    if (!tocData) tocData = flattenToc(R.view.book.toc, 0, []);
    renderFoliateToc();
  }
  function renderFoliateToc() {
    var list = document.getElementById('srTocList');
    var p = document.getElementById('srTocPanel');
    if (!list || !tocData) return;
    var items = tocData;
    if (R.meta.kind === 'sub' && R.meta.startIdx != null) {
      items = tocData.filter(function (t) {
        if (!t.href) return false;
        try {
          var r = R.view.book.resolveHref(t.href);
          return r && typeof r.index === 'number' && r.index >= R.meta.startIdx && r.index < R.meta.endIdx;
        } catch (e) { return false; }
      });
    }
    if (!items.length) { list.innerHTML = '<div class="sr-toc-empty">本册暂无目录</div>'; return; }
    list.innerHTML = items.map(function (t) {
      return '<div class="sr-toc-item" style="padding-left:' + (10 + t.depth * 14) + 'px" data-href="' + esc(t.href) + '">' + esc(t.label || '（无标题）') + '</div>';
    }).join('');
    list.onclick = function (e) {
      var it = e.target.closest('.sr-toc-item');
      if (!it || !it.dataset.href) return;
      p.style.display = 'none';
      R.view.goTo(it.dataset.href).catch(function () {});
    };
  }
  function renderDocToc() {
    var list = document.getElementById('srTocList');
    var p = document.getElementById('srTocPanel');
    if (!list) return;
    var inner = document.querySelector('.sr-inner');
    if (!inner) { list.innerHTML = ''; return; }
    var hs = Array.from(inner.querySelectorAll('h1,h2,h3'));
    if (!hs.length) { list.innerHTML = '<div class="sr-toc-empty">本文档无标题结构</div>'; return; }
    hs.forEach(function (h, i) { h.setAttribute('data-toc-i', i); });
    list.innerHTML = hs.map(function (h, i) {
      var d = h.tagName === 'H1' ? 0 : h.tagName === 'H2' ? 1 : 2;
      return '<div class="sr-toc-item" style="padding-left:' + (10 + d * 14) + 'px" data-i="' + i + '">' + esc(h.textContent.slice(0, 60)) + '</div>';
    }).join('');
    list.onclick = function (e) {
      var it = e.target.closest('.sr-toc-item');
      if (!it) return;
      p.style.display = 'none';
      var h = inner.querySelector('[data-toc-i="' + it.dataset.i + '"]');
      if (!h) return;
      var outer = document.querySelector('.sr-docpager');
      var gap = 48, w = outer.clientWidth;
      var page = Math.max(0, Math.round((h.offsetLeft + 22) / (w + gap)));
      goPage(page);
    };
  }

  /* ---- 阅读时长计时（今日打卡第4项：阅读 10 分钟） ---- */
  var readTimer = null;
  function startReadTimer() {
    stopReadTimer();
    readTimer = setInterval(function () {
      if (document.visibilityState !== 'visible') return;
      R.readSec = (R.readSec || 0) + 1;
      if (R.readSec % 30 === 0) persistReadSec();
    }, 1000);
  }
  function stopReadTimer() { if (readTimer) { clearInterval(readTimer); readTimer = null; } }
  function persistReadSec() {
    try {
      var today = VG_SRS.todayStr();
      var rs = JSON.parse(localStorage.getItem('vgReadSec') || '{}');
      if (rs.date !== today) rs = { date: today, sec: 0 };
      rs.sec = (rs.sec || 0) + (R.readSec || 0);
      R.readSec = 0;
      localStorage.setItem('vgReadSec', JSON.stringify(rs));
    } catch (e) {}
  }

  function closeReader() {
    stopReadTimer(); persistReadSec();
    /* 最终落盘真实位置（relocate 可能被懒渲染的杂音覆盖） */
    if (R.view && R.view.lastLocation && R.meta) {
      var loc = R.view.lastLocation;
      R.meta.progress = { cfi: loc.cfi || '', fraction: loc.fraction || 0, page: 0 };
      try { metaPut(R.meta); } catch (e) {}
    }
    var w = document.getElementById('sfReader');
    if (w) w.remove();
    if (R.view) { try { R.view.close(); } catch (e) {} }
    R = { shelfVisible: true };
    renderShelf(document.getElementById('main'));
  }
  /* 全书 fraction ↔ 单册进度映射（子册） */
  function toLocal(f) {
    if (!R.fracSpan) return f;
    var s = R.fracSpan[0], e = R.fracSpan[1];
    return Math.max(0, Math.min(1, (f - s) / (e - s)));
  }
  function toGlobal(p) {
    if (!R.fracSpan) return p;
    var s = R.fracSpan[0], e = R.fracSpan[1];
    return s + Math.max(0, Math.min(1, p)) * (e - s);
  }
  function setPct(f) {
    var pct = Math.round(toLocal(f) * 1000) / 10;
    var el = document.getElementById('srPct');
    var sl = document.getElementById('srSlider');
    if (el) el.textContent = pct + '%';
    if (sl && document.activeElement !== sl) sl.value = Math.round(toLocal(f) * 1000);
  }
  function nav(dir) {
    if (R.kind === 'foliate' && R.view) { dir < 0 ? R.view.goLeft() : R.view.goRight(); }
    else if (R.kind === 'doc') goPage(R.page + dir);
  }

  /* --- foliate（EPUB/MOBI/AZW3） --- */
  var parsedCache = null;   /* {key, book} 大书解析缓存：同书重开秒开 */
  function openFoliate(m, blobOverride, jumpHref) {
    R.kind = 'foliate';
    R.readSec = 0; startReadTimer();
    tocData = null;
    toast2('📖 正在打开…');
    var cacheKey = m.parentId || m.id;
    var cached = parsedCache && parsedCache.key === cacheKey ? parsedCache.book : null;
    var p = (cached || blobOverride) ? Promise.resolve(cached || blobOverride) : blobGet(cacheKey);
    p.then(function (blob) {
      dbg('blob loaded: ' + Math.round(blob.size / 1048576) + 'MB');
      if (!blob) throw new Error('书籍文件丢失，请重新导入');
      return import(SHELF_BASE + 'assets/vendor/foliate/view.js').then(function () {
        dbg('view.js imported');
        /* 关闭 zip.js 的 web worker（我们的包里没有 worker 文件，避免 404 报错） */
        return import(SHELF_BASE + 'assets/vendor/foliate/vendor/zip.js').then(function (z) {
          try { z.configure({ useWebWorkers: false }); } catch (e) {}
          dbg('zip configured');
        }).catch(function () {});
      }).then(function () {
        var view = document.createElement('foliate-view');
        R.view = view;
        dbg('view element created');
        var saved = m.progress || {};
        var restored = false;
        view.addEventListener('load', function () {
          dbg('section load event');
          /* 点词查词：给本节文档挂 tap 取词 */
          try {
            view.renderer.getContents().forEach(function (c) {
              if (c.doc && !c.doc.__lkTap) {
                c.doc.__lkTap = true;
                if (window.VG_LOOKUP) VG_LOOKUP.attachWordTap(c.doc, { bookTitle: R.meta.title }, null, function (rel) {
                  if (rel < 0.25) nav(-1); else if (rel > 0.75) nav(1);
                });
              }
            });
          } catch (e) {}
          if (!R.meta.author && view.book && view.book.metadata) {
            var md = view.book.metadata || {};
            var t = (md.title || '').trim(), a = (md.author || '').trim();
            if (t || a) {
              R.meta.title = t || R.meta.title;
              R.meta.author = a || R.meta.author;
              metaPut(R.meta);
              var tt = document.getElementById('srTitle');
              if (tt) tt.textContent = R.meta.title;
            }
          }
          if (!restored && (saved.cfi || saved.fraction > 0)) {
            restored = true;
            if (saved.cfi) view.goTo(saved.cfi).catch(function () {});
            else if (view.goToFraction) view.goToFraction(saved.fraction);
          }
          try { view.renderer.setStyles(readerCSS()); } catch (e) {}
        });
        view.addEventListener('relocate', function (e) {
          var loc = e.detail || {};
          R.meta.progress = { cfi: loc.cfi || '', fraction: loc.fraction || 0, page: 0 };
          setPct(loc.fraction || 0);
          /* 节流写库：连翻页/懒渲染会连发 relocate，只落最终位置（closeReader 兜底再存一次） */
          if (R._saveTimer) clearTimeout(R._saveTimer);
          R._saveTimer = setTimeout(function () { metaPut(R.meta); }, 600);
        });
        var body = document.getElementById('srBody');
        body.innerHTML = '';
        body.appendChild(view);
        dbg('view attached, calling open()');
        return view.open(cached || blob).then(function () {
          if (!cached && blob) { try { parsedCache = { key: cacheKey, book: view.book }; } catch (e) {} }
          dbg(cached ? 'cache hit open' : 'view.open resolved');
          try { view.renderer.setStyles(readerCSS()); } catch (e) {}
          /* 官方 demo 用法：open 后需手动 next() 触发首个 section 渲染 */
          view.renderer.next();
          dbg('renderer.next() done');
          /* 子册区间：用 foliate 自己的页面权重比例（节索引比例与 fraction 不对齐） */
          if (R.meta.kind === 'sub' && typeof view.getSectionFractions === 'function') {
            try {
              var frs = view.getSectionFractions();
              if (frs && frs.length && typeof frs[R.meta.startIdx] === 'number') {
                R.fracSpan = [frs[R.meta.startIdx], R.meta.endIdx < frs.length ? frs[R.meta.endIdx] : 1];
                dbg('fracSpan aligned');
              }
            } catch (e) {}
          }
          /* 恢复进度：优先续读 CFI，其次单册起点；等首屏稳定后跳转 */
          var hasProgress = saved.cfi || saved.fraction > 0;
          setTimeout(function () {
            if (hasProgress) {
              if (saved.cfi) view.goTo(saved.cfi).catch(function () {});
              else if (view.goToFraction) view.goToFraction(saved.fraction);
              dbg('progress restored: ' + (saved.cfi || saved.fraction));
            } else if (jumpHref) {
              view.goTo(jumpHref).catch(function () {});
              dbg('jumped to sub-book: ' + jumpHref);
            }
          }, 500);
        }).catch(function (e) { dbg('view.open ERR: ' + (e && e.message || e)); throw e; });
      });
    }).catch(function (e) {
      dbg('openFoliate ERR: ' + (e && e.message || e));
      toast2('打开失败：' + (e && e.message || e), 'err');
      closeReader();
    });
  }

  /* --- 自渲染分页（TXT/MD/DOCX） --- */
  function openDoc(m) {
    R.kind = 'doc';
    docGet(m.id).then(function (html) {
      if (html == null) throw new Error('内容丢失，请重新导入');
      var body = document.getElementById('srBody');
      body.innerHTML = '<div class="sr-docpager"><div class="sr-inner">' + html + '</div></div>';
      applyDocStyles();
      /* 点词查词（限定在正文区域内） */
      try {
        if (window.VG_LOOKUP) VG_LOOKUP.attachWordTap(document, { bookTitle: m.title }, '.sr-inner', function (rel) {
          if (rel < 0.25) nav(-1); else if (rel > 0.75) nav(1);
        });
      } catch (e) {}
      requestAnimationFrame(function () { layoutDoc(m.progress.page || 0); });
      window.addEventListener('resize', docResize);
    }).catch(function (e) { toast2('打开失败：' + e.message, 'err'); closeReader(); });
  }
  function docResize() {
    if (R.kind !== 'doc') return;
    layoutDoc(R.page || 0);
  }
  function layoutDoc(page) {
    var outer = document.querySelector('.sr-docpager');
    var inner = document.querySelector('.sr-inner');
    if (!outer || !inner) return;
    var w = outer.clientWidth, gap = 48;
    inner.style.columnWidth = w + 'px';
    inner.style.columnGap = gap + 'px';
    inner.style.width = w + 'px';
    var total = inner.scrollWidth;
    R.pages = Math.max(1, Math.round((total + gap) / (w + gap)));
    goPage(Math.min(page, R.pages - 1));
  }
  function goPage(p) {
    var outer = document.querySelector('.sr-docpager');
    var inner = document.querySelector('.sr-inner');
    if (!outer || !inner || !R.pages) return;
    R.page = Math.max(0, Math.min(p, R.pages - 1));
    var w = outer.clientWidth, gap = 48;
    inner.style.transform = 'translateX(' + (-(R.page * (w + gap))) + 'px)';
    var f = R.pages > 1 ? R.page / (R.pages - 1) : 0;
    setPct(f);
    R.meta.progress = { cfi: '', fraction: f, page: R.page };
    metaPut(R.meta);
  }
  function applyDocStyles() {
    var inner = document.querySelector('.sr-inner');
    if (!inner) return;
    var t = THEMES[R.pref.theme];
    inner.style.background = t.bg;
    inner.style.color = t.fg;
    inner.style.fontSize = FONT_SIZES[R.pref.size] + 'px';
    inner.style.lineHeight = LINE_HEIGHTS[R.pref.line];
    var outer = document.querySelector('.sr-docpager');
    if (outer) { outer.style.background = t.bg; outer.style.color = t.fg; }
    var top = document.querySelector('.sr-top'), bar = document.querySelector('.sr-bar');
    if (top && bar) {
      var soft = R.pref.theme === 'dark' ? '#1D2129' : 'rgba(0,0,0,.06)';
      top.style.background = soft; bar.style.background = soft;
      top.style.color = t.fg; bar.style.color = t.fg;
    }
  }

  return {
    renderShelf: renderShelf, importFiles: importFiles,
    openReader: openReader, delBook: delBook, closeReader: closeReader,
    splitExisting: splitExisting
  };
})();
