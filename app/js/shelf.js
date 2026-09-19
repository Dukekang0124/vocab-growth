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
  /* 图片 → 压缩封面 dataURL */
  function coverDataURL(src) {
    return new Promise(function (res) {
      var img = new Image();
      img.onload = function () {
        try {
          var W = 300, H = Math.round(img.height * (W / img.width)) || 400;
          var cv = document.createElement('canvas');
          cv.width = W; cv.height = H;
          cv.getContext('2d').drawImage(img, 0, 0, W, H);
          res(cv.toDataURL('image/jpeg', 0.72));
        } catch (e) { res(null); }
      };
      img.onerror = function () { res(null); };
      img.src = src;
    });
  }
  function blobToCover(blob) {
    return new Promise(function (res) {
      var url = URL.createObjectURL(blob);
      coverDataURL(url).then(function (d) { URL.revokeObjectURL(url); res(d); });
    });
  }
  /* 子册封面：抽该册第一个 section 里的第一张大图 */
  var coverJobs = 0;
  function extractSubCover(book, sub) {
    if (sub.cover || coverJobs > 3) return Promise.resolve();
    coverJobs++;
    var sec = book.sections[sub.startIdx] || book.sections[sub.startIdx + 1];
    if (!sec || !sec.load) { coverJobs--; return Promise.resolve(); }
    return sec.load().then(function (r) {
      var doc = r && r.doc ? r.doc : r;
      /* load() 可能返回 blob URL 字符串（foliate 的 loadReplaced）：自行解析 HTML */
      var htmlUrl = typeof doc === 'string' ? doc : null;
      var pick = function (img) {
        if (!img) return Promise.resolve(null);
        var src = img.getAttribute('src');
        if (!src) return Promise.resolve(null);
        var abs = src.indexOf('blob:') === 0 ? src : (function () {
          try { return sec.resolveHref(src); } catch (e) { return src; }
        })();
        var got = function (u) {
          if (u.indexOf('blob:') === 0) {
            return fetch(u).then(function (ir) { return ir.blob(); }).then(blobToCover);
          }
          /* zip 内部路径：走 foliate 的 loadBlob */
          if (book && book.loadBlob) {
            return book.loadBlob(u).then(function (b) { return blobToCover(b); });
          }
          return fetch(u).then(function (ir) { return ir.blob(); }).then(blobToCover);
        };
        return got(abs).catch(function () {
          if (abs !== src) return got(src);
          throw new Error('img fetch failed');
        });
      };
      if (doc && doc.querySelector) {
        var im1 = doc.querySelector('img');
        dbg('cover[' + sub.title.slice(0, 10) + '] dom img=' + (im1 ? 'yes' : 'none'));
        return pick(im1);
      }
      if (!htmlUrl) return null;
      return fetch(htmlUrl).then(function (hr) { return hr.text(); }).then(function (html) {
        var d2 = new DOMParser().parseFromString(html, 'application/xhtml+xml');
        var im = d2.querySelector('img');
        dbg('cover[' + sub.title.slice(0, 10) + '] html img=' + (im ? 'yes' : 'none'));
        return pick(im);
      });
    }).then(function (d) {
      try { sec.unload && sec.unload(); } catch (e) {}
      coverJobs--;
      if (d) {
        sub.cover = d;
        return metaPut(sub);
      }
    }).catch(function (e) {
      coverJobs--;
      dbg('cover ERR[' + sub.title.slice(0, 10) + ']: ' + String(e && e.message || e).slice(0, 60));
    });
  }
  /* 后台补封面：父书 getCover + 全部子册逐个抽图（书架自愈，每 24 张刷新） */
  var coverBackfillRunning = false;
  function backfillCovers() {
    if (coverBackfillRunning) return;
    coverBackfillRunning = true;
    dbg('backfill covers start');
    metaAll().then(function (all) {
      var parents = all.filter(function (m) { return m.kind === 'foliate' && !m.cover; });
      var subs = all.filter(function (m) { return m.kind === 'sub' && !m.cover; })
        .sort(function (a, b) { return a.order - b.order; });
      dbg('backfill parents=' + parents.length + ' subs=' + subs.length);
      dbg('backfill parents=' + parents.length + ' subs=' + subs.length);
      if (!parents.length && !subs.length) { coverBackfillRunning = false; return; }
      var done = 0;
      function tick() {
        if ((done % 24) === 0 && R.shelfVisible) renderShelf(document.getElementById('main'));
      }
      var chain = Promise.resolve();
      parents.forEach(function (p) {
        chain = chain.then(function () {
          return blobGet(p.id).then(function (blob) {
            dbg('parent blob: ' + (blob ? Math.round(blob.size / 1048576) + 'MB' : 'null'));
            if (!blob) return;
            return import(SHELF_BASE + 'assets/vendor/foliate/view.js').then(function (mod) {
              return mod.makeBook(blob);
            }).then(function (book) {
              if (!book.getCover) return;
              return book.getCover().then(function (cb) {
                dbg('getCover: ' + (cb ? Math.round(cb.size / 1024) + 'KB' : 'null'));
                if (!cb) return;
                return blobToCover(cb).then(function (d) {
                  if (d) { p.cover = d; return metaPut(p); }
                });
              });
            });
          }).catch(function () {});
        });
      });
      var subQueue = subs.slice();
      function nextSub(book) {
        if (!subQueue.length) {
          coverBackfillRunning = false;
          dbg('backfill done: ' + done + ' covers');
          if (done) { coverBackfillRunning = false; if (R.shelfVisible) renderShelf(document.getElementById('main')); }
          return;
        }
        var sub = subQueue.shift();
        chain = (book ? Promise.resolve(book) : Promise.resolve(null)).then(function (b) {
          return extractSubCover(b, sub).then(function () {
            done++; tick();
            return nextSub(b || undefined);
          });
        });
      }
      /* 子册封面需书对象：用第一个有 blob 的父书 */
      var srcParent = parents[0] || (all.find(function (m) { return m.kind === 'sub' && m.parentId; }) || {}).parentId;
      if (subs.length && srcParent) {
        blobGet(parents.length ? parents[0].id : srcParent).then(function (blob) {
          if (!blob) { coverBackfillRunning = false; return; }
          import(SHELF_BASE + 'assets/vendor/foliate/view.js').then(function (mod) {
            return mod.makeBook(blob);
          }).then(function (book) { nextSub(book); });
        }).catch(function () { coverBackfillRunning = false; });
      } else {
        chain.then(function () { coverBackfillRunning = false; });
      }
    });
  }

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
    return '<div class="sf-cover' + (m.cover ? ' has-img' : '') + '" style="background:linear-gradient(160deg,hsl(' + hue + ',42%,88%),hsl(' + ((hue + 40) % 360) + ',38%,76%))">' +
      (m.cover ? '<img class="sf-coverimg" src="' + m.cover + '" alt="">' : '') +
      '<span class="sf-fmt">' + esc(m.fmt.toUpperCase()) + '</span>' +
      '<div class="sf-title">' + esc(m.title) + '</div>' +
      (m.author ? '<div class="sf-author">' + esc(m.author) + '</div>' : '') +
      (pct > 0 ? '<div class="sf-pbar"><i style="width:' + pct + '%"></i></div><div class="sf-pct">' + pct + '%</div>' : '') +
      '</div>';
  }
  function renderShelf(main) {
    R.shelfVisible = true;
    if (R.filter == null) R.filter = 'reading';
    metaAll().then(function (list) {
      /* 已拆分的合集父本不再显示（子册即书架） */
      var shown = list.filter(function (m) { return !m.splitInto; });
      var reading = shown.filter(function (m) { return !m.finished; });
      var finished = shown.filter(function (m) { return m.finished; })
        .sort(function (a, b) { return (b.finishedAt || 0) - (a.finishedAt || 0); });
      var list2 = R.filter === 'finished' ? finished : (R.filter === 'all' ? shown : reading);
      var list = list2;
      shown.sort(function (a, b) { return (b.lastReadAt || b.addedAt) - (a.lastReadAt || a.addedAt); });
      var cards = list.map(function (m) {
        var splitBtn = (m.kind === 'foliate' && !m.splitInto && m.size > 20 * 1024 * 1024)
          ? '<button onclick="VG_SHELF.splitExisting(\'' + m.id + '\')">拆分为单册</button>' : '';
        var unfinBtn = m.finished
          ? '<button onclick="VG_SHELF.unmarkFinished(event,\'' + m.id + '\')">取消已读</button>' : '';
        return '<div class="sf-card" onclick="VG_SHELF.openReader(\'' + m.id + '\')">' + coverHtml(m) +
          (m.finished ? '<span class="sf-fin">✓ 已读</span>' : '') +
          '<div class="sf-ops">' + unfinBtn + splitBtn + '<button onclick="VG_SHELF.delBook(event,\'' + m.id + '\')">删除</button></div></div>';
      }).join('');
      main.innerHTML =
        '<div class="card"><div class="card-title">📚 书架<span class="hint">点书开读 · 点词查词 · 长按生词</span>' +
        '<button class="btn btn-sm" style="margin-left:8px;flex-shrink:0" onclick="document.getElementById(\'sfFile\').click()">⬆️ 导入图书</button>' +
        '<input type="file" id="sfFile" multiple accept=".epub,.mobi,.azw3,.azw,.prc,.txt,.md,.markdown,.docx" style="display:none" onchange="VG_SHELF.importFiles(this.files);this.value=\'\'"></div>' +
        '<div class="sf-tip">支持 EPUB / MOBI / AZW3 / TXT / MD / DOCX；大合集自动拆分为单册。PDF 即将支持。</div>' +
        '<div class="sf-tabs">' +
        '<button class="' + (R.filter === 'reading' ? 'on' : '') + '" onclick="VG_SHELF.setFilter(&quot;reading&quot;)">在读 ' + reading.length + '</button>' +
        '<button class="' + (R.filter === 'finished' ? 'on' : '') + '" onclick="VG_SHELF.setFilter(&quot;finished&quot;)">已读 ' + finished.length + '</button>' +
        '<button class="' + (R.filter === 'all' ? 'on' : '') + '" onclick="VG_SHELF.setFilter(&quot;all&quot;)">全部 ' + shown.length + '</button>' +
        '</div>' +
        (shown.length ? '<div class="sf-grid">' + cards + '</div>' :
          '<div class="sf-empty">🌱 书架还是空的<br><span>导入一本英文书，点词就能查意思、收进词库</span></div>') +
        '</div>';
      setTimeout(backfillCovers, 800);   /* 后台补真实封面，不阻塞书架 */
    }).catch(function (e) {
      main.innerHTML = '<div class="card">书架加载失败：' + esc(e.message) + '</div>';
    });
  }
  function setFilter(f) { R.filter = f; renderShelf(document.getElementById('main')); }
  function unmarkFinished(ev, id) {
    if (ev) ev.stopPropagation();
    metaGet(id).then(function (m) {
      if (!m) return;
      m.finished = false; m.finishedDeclined = false;
      metaPut(m).then(function () {
        toast2('已恢复到「在读」', 'ok');
        renderShelf(document.getElementById('main'));
      });
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
      theme: p.theme || 'sepia',
      turn: p.turn || 'slide',                    /* slide | curl | none */
      bright: p.bright == null ? 0 : p.bright     /* 压暗层 0-45% */
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
      '<button id="srToc" title="目录">☰</button><button id="srListen" title="听书">🎧</button><span id="srTitle">' + esc(m.title) + '</span>' +
      '<button id="srAa">Aa</button></div>' +
      '<div class="sr-toc" id="srTocPanel" style="display:none"><div class="sr-toc-inner" id="srTocInner"></div></div>' +
      '<div class="sr-dim" id="srDim" style="display:none"></div>' +
      '<div class="sr-chap" id="srChap"></div>' +
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
      '  <div class="sr-row"><span>翻页</span>' + [['slide', '滑动'], ['curl', '仿真'], ['none', '无']].map(function (p) {
        return '<button data-turn="' + p[0] + '">' + p[1] + '</button>';
      }).join('') + '</div>' +
      '  <div class="sr-row"><span>亮度</span><input type="range" id="srBright" min="0" max="45" style="flex:1;accent-color:#2E7D32"></div>' +
      '</div>';
    document.body.appendChild(wrap);
    R.meta = m; R.pref = prefs(m);
    document.getElementById('srBack').onclick = closeReader;
    document.getElementById('srToc').onclick = toggleToc;
    document.getElementById('srListen').onclick = lmOpen;
    /* 外层垫片点击（iframe 外的边距区域）同样分区 */
    document.getElementById('srBody').addEventListener('click', function (e) {
      if (e.target.closest('a')) return;
      var r = this.getBoundingClientRect();
      zoneTap((e.clientX - r.left) / r.width);
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
      else if (b.dataset.turn) R.pref.turn = b.dataset.turn;
      savePrefs(R.meta, R.pref); markSettings(); applyTurnMode();
    });
    markSettings();
    var br = document.getElementById('srBright');
    if (br) br.oninput = function () {
      R.pref.bright = +this.value;
      savePrefs(R.meta, R.pref);
      applyDim();
    };
    applyDim();
  }
  function applyDim() {
    var d = document.getElementById('srDim');
    if (d) {
      d.style.display = R.pref.bright > 0 ? 'block' : 'none';
      d.style.background = 'rgba(0,0,0,' + (R.pref.bright / 100) + ')';
    }
  }
  function markSettings() {
    var set = document.getElementById('srSettings');
    if (!set) return;
    Array.prototype.forEach.call(set.querySelectorAll('button'), function (b) {
      var on = (b.dataset.size != null && +b.dataset.size === R.pref.size) ||
               (b.dataset.line != null && +b.dataset.line === R.pref.line) ||
               (b.dataset.theme && b.dataset.theme === R.pref.theme) ||
               (b.dataset.turn && b.dataset.turn === R.pref.turn);
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
    document.getElementById('srTocInner').innerHTML = '<div class="sr-toc-head">📖 目录</div><div class="sr-toc-list" id="srTocList"><div class="sr-toc-empty">目录解析中…</div></div>';
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
    /* 手势守卫：滚动列表的触摸结束不该被当成点击（手机上会'随意缩回'/误跳章） */
    p.addEventListener('pointerdown', function (e) { p._sx = e.clientX; p._sy = e.clientY; p._moved = false; });
    p.addEventListener('pointermove', function (e) {
      if (p._sx != null && (Math.abs(e.clientX - p._sx) > 12 || Math.abs(e.clientY - p._sy) > 12)) p._moved = true;
    });
    list.onclick = function (e) {
      if (p._moved) return;
      var it = e.target.closest('.sr-toc-item');
      if (!it || !it.dataset.href) return;
      p.style.display = 'none';
      R.view.goTo(it.dataset.href).catch(function () {});
    };
    p.onclick = function (e) {
      if (p._moved) return;
      if (e.target === p || e.target === document.getElementById('srTocInner')) p.style.display = 'none';
    };   /* 点背景收起（滚动误触不算） */
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

  /* ---- 读完标记 ---- */
  function showFinishedBar() {
    if (document.getElementById('srFinBar')) return;
    var bar = document.createElement('div');
    bar.id = 'srFinBar';
    bar.innerHTML = '🎉 读到结尾了！标记为「已读」吗？' +
      '<button onclick="VG_SHELF.markFinished(true)">✓ 标记已读</button>' +
      '<button onclick="VG_SHELF.markFinished(false)">以后再说</button>';
    var reader = document.getElementById('sfReader');
    reader.insertBefore(bar, document.querySelector('.sr-bar'));
  }
  function markFinished(yes) {
    var b = document.getElementById('srFinBar');
    if (b) b.remove();
    if (!R.meta) return;
    if (yes) {
      R.meta.finished = true;
      R.meta.finishedAt = Date.now();
      metaPut(R.meta);
      toast2('🎉 已标记读完，归类到书架「已读」分组', 'ok');
      if (window.VG_IMMERSION && VG_IMMERSION.fireConfetti) VG_IMMERSION.fireConfetti('big');
    } else {
      R.meta.finishedDeclined = true;
      metaPut(R.meta);
    }
  }

  /* ---- 听书模式页：整本书章节计划 + 轮询式播放引擎 ---- */
  var LM = { sents: [], idx: 0, plan: [], ch: 0, playing: false, speed: 1, open: false, engineOk: null, failed: 0 };
  var lmTimer = null;
  /* 非正文章节过滤（封面/版权/目录/封底/练习/译文等不进入播放） */
  var LM_SKIP = /封面|封底|扉页|版权|copyright|cover|总目录|目录|contents|简介|关于|前言|序言|致谢|acknowledg|出版说明|参考译文|注释|ACTIVITIES|Exercise|Word list|词汇表|points for/i;
  function isApk() {
    try { return !!(window.Capacitor && Capacitor.isNativePlatform && Capacitor.isNativePlatform()); }
    catch (e) { return false; }
  }
  function getListenText() {
    if (R.kind === 'foliate') {
      try { return R.view.renderer.getContents()[0].doc.body.innerText || ''; } catch (e) { return ''; }
    }
    var inner = document.querySelector('.sr-inner');
    return inner ? inner.innerText : '';
  }
  function lmSplit(text) {
    var parts = String(text || '').replace(/\s+/g, ' ').split(/(?<=[.!?。！？；;])\s*/);
    var out = [], cur = '';
    parts.forEach(function (p) {
      if (!p || !p.trim()) return;
      if ((cur + ' ' + p).length > 240) { if (cur) out.push(cur.trim()); cur = p; }
      else cur = cur ? cur + ' ' + p : p;
    });
    if (cur.trim()) out.push(cur.trim());
    return out.length ? out : [String(text).slice(0, 240)];
  }
  function lmPosKey() { return (R.meta && (R.meta.parentId || R.meta.id)) || 'book'; }
  function lmSavePos() {
    try {
      var all = JSON.parse(localStorage.getItem('vgListenPos') || '{}');
      all[lmPosKey()] = { ch: LM.ch, sent: LM.idx, at: Date.now(), label: (LM.plan[LM.ch] || {}).label || '' };
      localStorage.setItem('vgListenPos', JSON.stringify(all));
    } catch (e) {}
  }
  function lmLoadPos() {
    try {
      var all = JSON.parse(localStorage.getItem('vgListenPos') || '{}');
      return all[lmPosKey()] || null;
    } catch (e) { return null; }
  }
  /* 章节计划：目录 → 过滤非正文 → 章节边界（子册限定范围） */
  function lmBuildPlan() {
    if (R.kind !== 'foliate' || !R.view || !R.view.book) return [];
    var book = R.view.book;
    var lo = 0, hi = book.sections.length;
    if (R.meta.kind === 'sub') { lo = R.meta.startIdx; hi = R.meta.endIdx; }
    var items = [];
    (function flat(items2, d) {
      (items2 || []).forEach(function (it) {
        items.push({ label: (it.label || '').trim(), href: it.href || '', depth: d });
        if (it.subitems) flat(it.subitems, d + 1);
      });
    })(book.toc, 0);
    var seen = {}, plan = [];
    items.forEach(function (it) {
      if (!it.href || !it.label) return;
      var idx = null;
      try {
        var r = book.resolveHref(it.href);
        if (r && typeof r.index === 'number') idx = r.index;
      } catch (e) {}
      if (idx == null || idx < lo || idx >= hi) return;
      var label = it.label;
      if (!label || LM_SKIP.test(label)) return;
      if (seen[idx]) return;
      seen[idx] = true;
      plan.push({ label: label.slice(0, 40), href: it.href, index: idx });
    });
    plan.sort(function (a, b) { return a.index - b.index; });
    if (!plan.length) plan = [{ label: '正文', href: '', index: lo }];
    return plan;
  }
  /* ============ 对外入口 ============ */
  function lmOpen() {
    if (LM.open) { lmClose(); return; }
    LM.open = true; LM.playing = false; LM.failed = 0; LM.idx = 0;
    var wrap = document.createElement('div');
    wrap.id = 'listenMode';
    wrap.innerHTML =
      '<div class="lm-head"><button id="lmClose">✕ 退出听书</button><span class="lm-cap">🎧 听书模式</span></div>' +
      '<div class="lm-book" id="lmBook"></div>' +
      '<div class="lm-body"><div class="lm-sent" id="lmSent">正在准备…</div></div>' +
      '<div class="lm-meta" id="lmMeta"></div>' +
      '<div class="lm-ctrl">' +
      '  <button id="lmPrev">⏮</button>' +
      '  <button id="lmPlay" class="lm-playbtn">▶</button>' +
      '  <button id="lmNext">⏭</button>' +
      '</div>' +
      '<div class="lm-speed">' +
      '  <button data-sp="0.8">0.8x</button><button data-sp="1" class="on">1x</button><button data-sp="1.25">1.25x</button>' +
      '</div>' +
      '<div class="lm-engine" id="lmEngine"></div>';
    document.body.appendChild(wrap);
    var bm = document.getElementById('lmBook');
    if (bm) bm.textContent = R.meta ? R.meta.title : '';
    document.getElementById('lmClose').onclick = lmClose;
    document.getElementById('lmPlay').onclick = function () { LM.playing ? lmPause() : lmResume(); };
    document.getElementById('lmPrev').onclick = function () { lmJumpChapter(Math.max(0, LM.ch - 1), 0); };
    document.getElementById('lmNext').onclick = function () { lmJumpChapter(Math.min(LM.plan.length - 1, LM.ch + 1), 0); };
    Array.prototype.forEach.call(wrap.querySelectorAll('.lm-speed button'), function (b) {
      b.onclick = function () {
        LM.speed = +b.dataset.sp;
        Array.prototype.forEach.call(wrap.querySelectorAll('.lm-speed button'), function (x) { x.className = ''; });
        b.className = 'on';
      };
    });
    /* 章节计划：默认从第一章正文开播；有记忆则给出"继续上次" */
    LM.plan = lmBuildPlan();
    LM.ch = 0;
    var pos = lmLoadPos();
    lmRender();
    if (pos && pos.ch > 0 && pos.ch < LM.plan.length) {
      lmSetStatus('上次听到「' + (pos.label || '').slice(0, 16) + '」，默认从第一章开始');
      lmResumeChip(pos);
    } else {
      lmSetStatus('从第一章开始…');
    }
    lmStartChapter(0, 0, true);
  }
  function lmResumeChip(pos) {
    var eng = document.getElementById('lmEngine');
    if (!eng) return;
    eng.innerHTML = '<button class="lm-resume">⏱ 继续上次：' + (pos.label || '').slice(0, 18) + '</button>';
    var b = eng.querySelector('.lm-resume');
    if (b) b.onclick = function () {
      eng.innerHTML = '';
      for (var i = 0; i < LM.plan.length; i++) {
        if (LM.plan[i].label === pos.label) { lmStopSpeech(); lmStartChapter(i, pos.sent || 0, false); return; }
      }
      lmStopSpeech();
      lmStartChapter(Math.min(pos.ch, LM.plan.length - 1), pos.sent || 0, false);
    };
  }
  /* 打开/跳转章节的统一入口：轮询等内容真正渲染（自校验，无 promise 链） */
  function lmStartChapter(ch, sent, fromStart) {
    clearInterval(lmTimer);
    LM.ch = Math.max(0, Math.min(ch, LM.plan.length - 1));
    LM.playing = true;
    var c = LM.plan[LM.ch];
    lmSetStatus('第 ' + (LM.ch + 1) + '/' + LM.plan.length + ' 章 · ' + (c.label || '').slice(0, 14));
    if (c.href && R.kind === 'foliate') {
      try { R.view.goTo(c.href); } catch (e) {}
    }
    var tries = 0, lastText = '';
    lmTimer = setInterval(function () {
      if (!LM.open || !LM.playing) { clearInterval(lmTimer); return; }
      tries++;
      var text = getListenText().trim();
      if (text && text !== lastText) { lastText = text; tries = 0; }
      var sents = lmSplit(text).filter(function (x) { return x.replace(/[^A-Za-z一-龥]/g, '').length > 1; });
      /* 内容就绪（有正文句子）或超时（20 次）→ 开始/跳过 */
      if (sents.length) {
        clearInterval(lmTimer);
        LM.sents = sents;
        LM.idx = Math.min(sent || 0, sents.length - 1);
        lmRender();
        lmSpeakTick();
        return;
      }
      /* 空页（封面/版权等）→ 自动跳下一章 */
      if (tries >= 6) {
        clearInterval(lmTimer);
        lmSetStatus('跳过无文字部分…');
        setTimeout(function () {
          if (!LM.open) return;
          if (LM.ch + 1 >= LM.plan.length) { lmFinish(); return; }
          lmStartChapter(LM.ch + 1, 0, fromStart);
        }, 700);
      }
    }, 500);
  }
  /* 句子推进（看门狗：无声挂起/硬超时都强制下一句） */
  function lmSpeakTick() {
    if (!LM.open || !LM.playing) return;
    if (LM.idx >= LM.sents.length) { lmNextChapter(); return; }
    lmRender();
    lmSavePos();
    var text = LM.sents[LM.idx];
    var my = LM.ch + '|' + LM.idx + '|' + LM.sents.length;
    var advanced = false;
    function advance() {
      if (advanced || !LM.open || !LM.playing) return;
      advanced = true;
      LM.idx++;
      setTimeout(lmSpeakTick, 240);
    }
    speakWithEnd(text, LM.speed, advance, function () {
      LM.failed++;
      LM.engineOk = false;
      lmRender();
      if (LM.failed >= 3) { LM.playing = false; lmRender(); return; }
      advance();
    });
  }
  function lmNextChapter() {
    if (!LM.open) return;
    if (LM.ch + 1 >= LM.plan.length) { lmFinish(); return; }
    lmStartChapter(LM.ch + 1, 0, false);
  }
  function lmFinish() {
    LM.playing = false;
    lmSavePosClear();
    lmSetStatus('🎉 全书听完！太棒了');
  }
  function lmPause() { LM.playing = false; lmStopSpeech(); lmRender(); }
  function lmResume() { LM.playing = true; lmSpeakTick(); }
  function lmStopSpeech() {
    try {
      var T = window.Capacitor && Capacitor.Plugins && Capacitor.Plugins.TextToSpeech;
      if (T && T.stop) T.stop();
    } catch (e) {}
    try { if ('speechSynthesis' in window) speechSynthesis.cancel(); } catch (e) {}
  }
  function lmClose() {
    LM.open = false; LM.playing = false;
    lmStopSpeech();
    clearInterval(lmTimer);
    var w = document.getElementById('listenMode');
    if (w) w.remove();
  }
  function lmSetStatus(t) {
    var sent = document.getElementById('lmSent');
    if (sent) { sent.textContent = t; sent.className = 'lm-sent'; }
  }
  function lmRender() {
    var sent = document.getElementById('lmSent');
    var meta = document.getElementById('lmMeta');
    var play = document.getElementById('lmPlay');
    var eng = document.getElementById('lmEngine');
    if (sent) {
      sent.textContent = LM.sents[LM.idx] || (LM.playing ? '…' : '已暂停');
      sent.className = 'lm-sent' + (LM.playing ? '' : ' paused');
    }
    var chapLabel = (LM.plan[LM.ch] || {}).label || '';
    if (meta) meta.textContent = '第 ' + (LM.idx + 1) + ' / ' + (LM.sents.length || 1) + ' 句 · 第 ' + (LM.ch + 1) + '/' + (LM.plan.length || 1) + ' 章 · ' + chapLabel.slice(0, 16);
    if (play) play.textContent = LM.playing ? '⏸' : '▶';
    if (eng) {
      if (LM.engineOk === false && LM.failed >= 3) {
        eng.textContent = '⚠ 语音未能发声：请检查系统语音引擎/音量，或使用 APK 版（内置离线语音）。文字仍逐句显示。';
      } else eng.textContent = '';
    }
  }
  /* 带倍速的朗读（看门狗：无声挂起/硬超时推进，绝不卡死） */
  function speakWithEnd(text, rate, onEnd, onFail) {
    var zh = /[一-龥]/.test(text.charAt(0));
    var lang = zh ? 'zh-CN' : 'en-US';
    if (isApk()) {
      var T = window.Capacitor && Capacitor.Plugins && Capacitor.Plugins.TextToSpeech;
      if (T && T.speak) {
        T.speak({ text: text, lang: lang, rate: rate || 1 }).then(onEnd).catch(function () { onFail(); });
        return;
      }
      onFail(); return;
    }
    if ('speechSynthesis' in window) {
      try {
        var voices = speechSynthesis.getVoices() || [];
        var v = null;
        for (var i = 0; i < voices.length; i++) {
          if (zh ? /^zh/i.test(voices[i].lang || '') : /^en/i.test(voices[i].lang || '')) { v = voices[i]; break; }
        }
        if (!v) { onFail(); return; }
        speechSynthesis.cancel();
        var u = new SpeechSynthesisUtterance(text);
        u.lang = lang; u.voice = v; u.rate = rate || 1;
        var done = false;
        var fin = function () { if (!done) { done = true; onEnd(); } };
        u.onend = fin; u.onerror = function () { onFail(); };
        speechSynthesis.speak(u);
        var hard = Math.max(4200, text.length * 130);
        setTimeout(function () { fin(); }, hard);
        setTimeout(function () {
          if (done) return;
          var ticks = 0;
          var iv = setInterval(function () {
            if (done) { clearInterval(iv); return; }
            var sp = false;
            try { sp = speechSynthesis.speaking || speechSynthesis.pending; } catch (e) {}
            if (!sp) ticks++; else ticks = 0;
            if (ticks >= 2) { clearInterval(iv); fin(); }
          }, 1200);
        }, 2600);
        return;
      } catch (e) {}
    }
    onFail();
  }

    function closeReader() {
    stopReadTimer(); persistReadSec(); lmClose();
    /* 最终落盘真实位置（relocate 可能被懒渲染的杂音覆盖） */
    if (R.view && R.view.lastLocation && R.meta) {
      var loc = R.view.lastLocation;
      R.meta.progress = { cfi: loc.cfi || '', fraction: loc.fraction || 0, page: 0 };
      metaPut(R.meta).then(function () {
        if (R.shelfVisible) renderShelf(document.getElementById('main'));
      }).catch(function () {});
    }
    var w = document.getElementById('sfReader');
    if (w) w.remove();
    if (R.view) { try { R.view.close(); } catch (e) {} }
    var wasVisible = R.shelfVisible;
    R = { shelfVisible: wasVisible };
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
  /* 微信读书式分区：左30%上一页 / 右30%下一页 / 中间呼出或隐藏菜单 */
  function zoneTap(rel) {
    var lk = document.getElementById('lkCard');
    if (lk && lk.classList.contains('open')) { VG_LOOKUP.hide(); return; }
    if (rel < 0.3) nav(-1);
    else if (rel > 0.7) nav(1);
    else toggleBars();
  }
  function toggleBars() {
    ['sr-top', 'sr-bar'].forEach(function (id) {
      var el = document.querySelector('.' + id);
      if (el) el.style.display = el.style.display === 'none' ? '' : 'none';
    });
    var ch = document.getElementById('srChap');
    if (ch) ch.style.visibility = ch.style.visibility === 'hidden' ? 'visible' : 'hidden';
  }
  function applyTurnMode() {
    if (R.view && R.view.renderer) {
      R.view.renderer.toggleAttribute('animated', R.pref.turn === 'slide');
    }
  }
  /* 仿真翻页：快照当前页 → 3D 翻页动画盖在上面 → 内容在页下切换 */
  function curlFlip(dir) {
    var docEl = null;
    try { docEl = (R.view.renderer.getContents()[0] || {}).doc; } catch (e) {}
    var body = docEl && docEl.body;
    if (!body || !window.html2canvas) { dir < 0 ? R.view.goLeft() : R.view.goRight(); return; }
    /* 手机上快照可能慢：1.5s 未出图直接走普通翻页，绝不卡住用户 */
    var fell = false;
    var to = setTimeout(function () { fell = true; dir < 0 ? R.view.goLeft() : R.view.goRight(); }, 1500);
    html2canvas(body, { backgroundColor: null, scale: 1, logging: false })
      .then(function (cv) {
        if (fell) return;
        clearTimeout(to);
        var overlay = document.createElement('div');
        overlay.className = 'sr-curl ' + (dir > 0 ? 'next' : 'prev');
        /* 旧页：斜切剥离（右下角先掀），带微弯曲 */
        var front = document.createElement('img');
        front.className = 'curl-front';
        front.src = cv.toDataURL('image/jpeg', 0.85);
        overlay.appendChild(front);
        /* 折痕阴影带：压在新页上随剥离边移动 */
        var fold = document.createElement('div');
        fold.className = 'curl-fold';
        overlay.appendChild(fold);
        document.getElementById('srBody').appendChild(overlay);
        setTimeout(function () { dir > 0 ? R.view.goRight() : R.view.goLeft(); }, 60);
        setTimeout(function () { overlay.remove(); }, 460);
      })
      .catch(function () {
        if (fell) return;
        clearTimeout(to);
        dir < 0 ? R.view.goLeft() : R.view.goRight();
      });
  }
  function nav(dir) {
    if (R.kind === 'foliate' && R.view) {
      if (R.pref.turn === 'curl') { curlFlip(dir); return; }
      dir < 0 ? R.view.goLeft() : R.view.goRight();
    }
    else if (R.kind === 'doc') goPage(R.page + dir);
  }

  /* --- foliate（EPUB/MOBI/AZW3） --- */
  var parsedCache = null;   /* {key, book} 大书解析缓存：同书重开秒开 */
  function openFoliate(m, blobOverride, jumpHref) {
    R.kind = 'foliate';
    R.restorePending = true;
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
        var firstLoad = false;
        view.addEventListener('load', function () {
          firstLoad = true;
          dbg('section load event');
          /* 点词查词：给本节文档挂 tap 取词 */
          try {
            view.renderer.getContents().forEach(function (c) {
              if (c.doc && !c.doc.__lkTap) {
                c.doc.__lkTap = true;
                if (window.VG_LOOKUP) VG_LOOKUP.attachWordTap(c.doc, { bookTitle: R.meta.title }, null, zoneTap);
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
          setPct(toLocal(loc.fraction || 0));
          if (R.restorePending) return;   /* 恢复完成前不落进度，防首屏 relocate 污染 */
          R.meta.progress = { cfi: loc.cfi || '', fraction: loc.fraction || 0, page: 0 };
          var chap = document.getElementById('srChap');
          if (chap) chap.textContent = (loc.tocItem && loc.tocItem.label ? loc.tocItem.label.trim().slice(0, 20) : '');
          /* 读完检测：进度 ≥98.5% 且未标记过 → 一次性询问 */
          if (!R.meta.finished && !R.meta.finishedDeclined && toLocal(loc.fraction || 0) >= 0.985) {
            showFinishedBar();
          }
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
          applyTurnMode();
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
          /* 等首个 section 真正渲染完成（load 事件）再跳转，否则 goTo 会无声失效 */
          (function waitFirst(cb, tries) {
            if (firstLoad || tries <= 0) cb();
            else setTimeout(function () { waitFirst(cb, tries - 1); }, 250);
          })(function () {
            var preCfi = (view.lastLocation && view.lastLocation.cfi) || '';
            function attempt(tries) {
              var pr;
              if (hasProgress) pr = saved.cfi ? view.goTo(saved.cfi) : (view.goToFraction ? view.goToFraction(saved.fraction) : Promise.resolve());
              else pr = view.goTo(jumpHref);
              pr.then(function () {
                setTimeout(function () {
                  var now = (view.lastLocation && view.lastLocation.cfi) || '';
                  if (now !== preCfi || tries <= 1) {
                    R.restorePending = false;
                    dbg('restored at ' + now.slice(0, 26) + ' tries=' + tries);
                  } else attempt(tries - 1);
                }, 500);
              }).catch(function () {
                if (tries > 1) setTimeout(function () { attempt(tries - 1); }, 400);
                else { R.restorePending = false; dbg('restore gave up'); }
              });
            }
            attempt(6);
          }, 40);
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
        if (window.VG_LOOKUP) VG_LOOKUP.attachWordTap(document, { bookTitle: m.title }, '.sr-inner', zoneTap);
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
    splitExisting: splitExisting, setFilter: setFilter, unmarkFinished: unmarkFinished,
    markFinished: markFinished
  };
})();
