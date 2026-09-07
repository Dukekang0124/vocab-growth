/* ============================================================
 * 词汇生长 — 应用内更新机制 (js/update.js)
 * 渠道：PWA（Service Worker 热更，下载/校验/启用/重启全自动）/
 *       APK（@capgo/capacitor-updater 应用内热更新：下载 zip → 热切换，全程不跳出应用）
 * 版本清单：./update-manifest.json（与应用同源托管，随 Pages 发布）
 *
 * 发布铁律（三同步）：APP_VERSION ↔ sw.js CACHE 名 ↔
 * update-manifest.json 的 latest 必须为同一版本号，缺一更新链路即断
 * ============================================================ */
(function () {
  'use strict';

  /* ← 发布新版本时改这里（同时改 sw.js CACHE 与 update-manifest.json） */
  var APP_VERSION = '1.0.21';
  var MANIFEST_URL = './update-manifest.json';
  /* APK（Capacitor 本地打包）里相对路径指向安装包内的旧清单，
   * 必须fetch线上清单才能检测到新版本 → 引导下载新 APK。
   * 双通道：github.io 在大陆手机网络时通时不通，失败自动切 jsDelivr
   * （jsDelivr 对 @main 文件缓存最长 12h，deploy.yml 部署后自动 purge 保新鲜） */
  var REMOTE_MANIFEST_URL = 'https://dukekang0124.github.io/vocab-growth/update-manifest.json';
  var REMOTE_MANIFEST_URL_BACKUP = 'https://cdn.jsdelivr.net/gh/Dukekang0124/vocab-growth@main/app/update-manifest.json';
  var FETCH_TIMEOUT = 6000;      /* 清单请求超时 */
  var ACTIVATE_FALLBACK = 9000;  /* 等新 SW 接管的兜底时长，超时强制刷新 */
  var STALL_TIMEOUT = 25000;     /* 下载进度停滞判定的看门狗 */

  /* ---------- 基础工具 ---------- */

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function toast(msg, type, ms) {
    if (window.VG_APP && typeof window.VG_APP._toast === 'function') {
      window.VG_APP._toast(msg, type, ms);
    }
  }

  function getStore() {
    return (window.VG_APP && window.VG_APP._store) || null;
  }

  /* semver：major.minor.patch 逐段比较，缺段/非法段按 0 */
  function cmpVersion(a, b) {
    var pa = String(a || '').split('.');
    var pb = String(b || '').split('.');
    for (var i = 0; i < 3; i++) {
      var na = parseInt(pa[i], 10) || 0;
      var nb = parseInt(pb[i], 10) || 0;
      if (na > nb) return 1;
      if (na < nb) return -1;
    }
    return 0;
  }

  /* APK（Capacitor WebView 加载本地文件，无法靠 SW 热更） */
  function isApk() {
    return !!(window.Capacitor && typeof window.Capacitor.isNativePlatform === 'function' &&
      window.Capacitor.isNativePlatform());
  }

  /* ---------- 版本清单获取 ---------- */

  function fetchManifest() {
    /* APK 检测线上清单，双通道：github.io 失败（超时/HTTP错）自动切 jsDelivr 备源；
     * PWA 用同源相对路径。每次请求 5 秒超时，不让坏通道拖慢检测 */
    var urls = isApk()
      ? [REMOTE_MANIFEST_URL, REMOTE_MANIFEST_URL_BACKUP]
      : [MANIFEST_URL];

    function attempt(idx) {
      if (idx >= urls.length) return Promise.reject(new Error('所有更新通道均不可达'));
      var url = urls[idx] + '?_t=' + Date.now(); /* 绕过 HTTP 缓存 */
      return Promise.race([
        fetch(url, { cache: 'no-store' }),
        new Promise(function (_, rej) { setTimeout(function () { rej(new Error('网络超时')); }, 5000); })
      ]).then(function (res) {
        if (!res.ok) throw new Error('HTTP ' + res.status);
        return res.json();
      }).then(function (mf) {
        if (!mf || !String(mf.latest || '').trim()) throw new Error('清单格式不正确');
        return mf;
      }).catch(function (e) {
        if (idx + 1 < urls.length) return attempt(idx + 1);
        throw e;
      });
    }
    return attempt(0);
  }

  function isForced(info) {
    var mf = info.manifest || {};
    if (mf.force === true) return true;
    if (mf.minRequired && cmpVersion(info.current, mf.minRequired) < 0) return true;
    return false;
  }

  /* ---------- 检查更新 ---------- */

  var _checking = false;

  /**
   * checkUpdate(source) → Promise<info>
   * source 'manual'：总是返回真实结果（不受 skipped 影响）
   * source 'auto'  ：用户跳过的版本视为无更新
   * info = { hasUpdate, current, latest, manifest }
   */
  function checkUpdate(source) {
    if (_checking) return Promise.resolve(null);
    _checking = true;
    return fetchManifest().then(function (mf) {
      _checking = false;
      var store = getStore();
      if (store) { try { store.setUpdatePref({ lastCheck: Date.now() }); } catch (e) {} }
      var latest = String(mf.latest || '').trim();
      var info = {
        hasUpdate: cmpVersion(latest, APP_VERSION) > 0,
        current: APP_VERSION,
        latest: latest,
        manifest: mf
      };
      if (source === 'auto' && info.hasUpdate && getStore()) {
        try {
          var mf = info.manifest;
          /* 强制更新无视「跳过该版本」：minRequired 之下 / force=true 必须弹 */
          var forced = mf.force === true || (mf.minRequired && cmpVersion(info.current, mf.minRequired) < 0);
          if (!forced) {
            var skipped = getStore().getUpdatePref().skipped || [];
            if (skipped.indexOf(latest) >= 0) info.hasUpdate = false;
          }
        } catch (e) {}
      }
      return info;
    }, function (err) {
      _checking = false;
      throw err;
    });
  }

  /* 手动检查：结果写进 resultEl（数据管理页的 #updateResult） */
  function manualCheck(resultEl) {
    var el = resultEl ? document.getElementById(resultEl) : null;
    if (el) el.innerHTML = '🔄 正在检查更新…';
    return checkUpdate('manual').then(function (r) {
      if (!r) return r;
      if (!r.hasUpdate) {
        if (el) el.innerHTML = '✅ 已是最新版本 v' + esc(r.current);
        return r;
      }
      if (el) el.innerHTML = '🆕 发现新版本 v' + esc(r.latest);
      showUpdateDialog(r);
      return r;
    }).catch(function (e) {
      if (el) {
        el.innerHTML = '<span style="color:var(--red)">⚠️ 检查失败：' + esc(e && e.message || '网络不可用') +
          '</span> <button class="btn btn-sm btn-outline" style="margin-left:6px" onclick="VG_UPDATE.manualCheck(\'' +
          resultEl + '\')">🔄 重试</button>';
      }
      throw e;
    });
  }

  /* ---------- 更新对话框（复刻 feedback-modal 结构，动态注入） ---------- */

  function closeUpdateDialog() {
    var el = document.getElementById('upModal');
    if (el) el.remove();
  }

  function showUpdateDialog(info) {
    closeUpdateDialog(); /* 防重复弹窗 */
    var forced = isForced(info);
    var mf = info.manifest || {};
    var apkMode = isApk();

    var notes = (mf.notes || []).map(function (n) { return '<li>' + esc(n) + '</li>'; }).join('');
    var meta = [];
    if (mf.publishedAt) meta.push('📅 ' + esc(mf.publishedAt));
    if (mf.size) meta.push('📦 ' + esc(mf.size));
    if (apkMode && mf.apk && mf.apk.version) meta.push('安装包 v' + esc(mf.apk.version));

    var el = document.createElement('div');
    el.className = 'feedback-modal up-modal';
    el.id = 'upModal';
    el.innerHTML =
      '<div class="feedback-modal-content up-content">' +
      '<div class="feedback-modal-header"><h3>🌱 发现新版本 v' + esc(info.latest) + '</h3>' +
      (forced ? '' : '<button class="feedback-modal-close" data-up-close="1" title="关闭">✕</button>') + '</div>' +
      '<div class="up-body">' +
      '<div class="up-meta">' + (meta.length ? meta.join('<span class="up-dot">·</span>') : '') + '</div>' +
      '<div class="up-current">当前版本 v' + esc(info.current) +
      (forced ? ' · <b class="up-force-tag">此版本必须更新后才能继续使用</b>' : '') + '</div>' +
      (notes ? '<div class="up-notes-title">📝 更新日志</div><ul class="up-notes">' + notes + '</ul>' : '') +
      '<div class="up-progress-wrap" id="upProgressWrap" style="display:none">' +
      '<div class="up-stage" id="upStage">正在下载更新包…</div>' +
      '<div class="up-bar" id="upBar"><i id="upBarFill"></i></div>' +
      '<div class="up-pct" id="upPct"></div>' +
      '<div class="up-err" id="upErr" style="display:none"></div>' +
      '</div>' +
      '</div>' +
      '<div class="feedback-modal-actions" id="upActions">' +
      (apkMode
        ? '<button class="btn" id="upGo">⬇️ 立即更新</button>'
        : '<button class="btn" id="upGo">⬇️ 立即更新</button>') +
      (forced ? '' :
        '<button class="btn btn-outline" data-up-later="1">稍后提醒</button>' +
        '<button class="btn btn-outline" data-up-skip="1">跳过这个版本</button>') +
      '</div>' +
      (apkMode ? '<div class="up-apk-tip">💡 APK 无法自动安装：下载新安装包后打开安装即可覆盖升级，学习数据不会丢失。</div>' : '') +
      '</div>';
    document.body.appendChild(el);
    /* flex（而非 block）：.feedback-modal 的居中靠 align/justify，block 会掉到左上角 */
    el.style.display = 'flex';

    /* 关闭路径只有可选更新才有；强制更新连遮罩点击都不给关 */
    if (!forced) {
      el.querySelector('[data-up-close]').onclick = closeUpdateDialog;
      el.querySelector('[data-up-later]').onclick = closeUpdateDialog;
      el.querySelector('[data-up-skip]').onclick = function () {
        var store = getStore();
        if (store) { try { store.skipVersion(info.latest); } catch (e) {} }
        toast('已跳过 v' + info.latest + '，自动检查将不再提醒', 'ok');
        closeUpdateDialog();
      };
    }
    el.querySelector('#upGo').onclick = function () {
      applyUpdate(info); /* 内部自动分流：APK→应用内热更新，网页→SW 更新 */
    };
  }

  /* ---------- 下载 / 校验 / 启用 / 重启（PWA 路径） ---------- */

  var _installing = false;
  var _stallTimer = null;
  var _lastInfo = null;

  function setStage(text, indeterminate) {
    var stage = document.getElementById('upStage');
    var bar = document.getElementById('upBar');
    if (stage) stage.textContent = text;
    if (bar) bar.classList.toggle('up-indeterminate', !!indeterminate);
  }

  function setProgress(done, total) {
    var bar = document.getElementById('upBar');
    var fill = document.getElementById('upBarFill');
    var pct = document.getElementById('upPct');
    if (bar) bar.classList.remove('up-indeterminate');
    var p = total > 0 ? Math.round((done / total) * 100) : 0;
    if (fill) fill.style.width = p + '%';
    if (pct) pct.textContent = done + ' / ' + total + ' 个文件 · ' + p + '%';
  }

  function resetProgressUI() {
    var wrap = document.getElementById('upProgressWrap');
    var bar = document.getElementById('upBar');
    var fill = document.getElementById('upBarFill');
    var pct = document.getElementById('upPct');
    var err = document.getElementById('upErr');
    if (wrap) wrap.style.display = 'block';
    if (bar) bar.classList.remove('up-bar-err', 'up-indeterminate');
    if (fill) fill.style.width = '0';
    if (pct) pct.textContent = '';
    if (err) { err.style.display = 'none'; err.textContent = ''; }
  }

  function updateFail(msg) {
    _installing = false;
    clearTimeout(_stallTimer);
    setStage('😢 更新失败', false);
    var bar = document.getElementById('upBar');
    if (bar) bar.classList.add('up-bar-err');
    var err = document.getElementById('upErr');
    if (err) { err.style.display = 'block'; err.textContent = msg + '，请检查网络后重试'; }
    var pct = document.getElementById('upPct');
    if (pct) pct.textContent = '';
    /* 插入重试按钮 */
    var acts = document.getElementById('upActions');
    if (acts && !document.getElementById('upRetry')) {
      var btn = document.createElement('button');
      btn.className = 'btn';
      btn.id = 'upRetry';
      btn.textContent = '🔄 重试';
      btn.onclick = function () {
        btn.remove();
        resetProgressUI();
        applyUpdate(_lastInfo);
      };
      acts.insertBefore(btn, acts.firstChild);
    }
  }

  function applyUpdate(info) {
    _lastInfo = info;
    var wrap = document.getElementById('upProgressWrap');
    var go = document.getElementById('upGo');
    if (wrap) wrap.style.display = 'block';
    if (go) { go.disabled = true; go.textContent = '更新中…'; }
    /* 隐藏「稍后/跳过」，更新过程不可中断 */
    var acts = document.getElementById('upActions');
    if (acts) {
      Array.prototype.forEach.call(acts.querySelectorAll('[data-up-later],[data-up-skip]'), function (b) { b.style.display = 'none'; });
    }
    var retry = document.getElementById('upRetry');
    if (retry) retry.remove();
    resetProgressUI();

    /* APK：应用内热更新——下载 zip → 热切换 → 即时生效，全程不离开应用 */
    if (isApk()) { applyNativeUpdate(info); return; }

    /* 无 SW 环境（微信 / 首次访问未注册）：刷新直接吃网络最新版 */
    if (!('serviceWorker' in navigator) || !navigator.serviceWorker.controller) {
      setStage('正在刷新到新版本…', true);
      setTimeout(function () { location.replace('./index.html?_v=' + APP_VERSION + '&_t=' + Date.now()); }, 600);
      return;
    }

    _installing = true;
    setStage('正在下载更新包…', true);

    /* 下载停滞看门狗：每收到一次进度就重置 */
    clearTimeout(_stallTimer);
    _stallTimer = setTimeout(function () {
      if (_installing) updateFail('下载长时间没有进展');
    }, STALL_TIMEOUT);

    /* 新 SW 安装失败会被浏览器丢弃为 redundant */
    navigator.serviceWorker.getRegistration().then(function (reg) {
      if (!reg) { /* 没有 SW 注册（异常路径）：直接刷新 */
        location.reload();
        return;
      }
      reg.addEventListener('updatefound', function () {
        var nw = reg.installing;
        if (!nw) return;
        nw.addEventListener('statechange', function () {
          if (nw.state === 'redundant' && _installing) updateFail('安装包校验未通过');
        });
      });
      return reg.update().then(function () {
        setStage('校验通过，正在启用新版本…', true);
        setProgress(1, 1);
        waitAndReload(reg);
      });
    }).catch(function (e) {
      if (_installing) updateFail('更新请求失败：' + (e && e.message || '未知错误'));
    });
  }

  /* 新 SW skipWaiting 激活后接管页面 → controllerchange → 刷新；
   * 兜底：ACTIVATE_FALLBACK 内没等到也强制刷新（network-first 在线时仍拉得到新文件） */
  /* ---------- APK 应用内热更新（@capgo/capacitor-updater，自托管 zip） ----------
   * 下载 web 资源 zip（manifest.bundle.url，jsDelivr 直链）→ 进度条 → 热切换 → reload。
   * 全程留在应用内，无需跳浏览器、无需重装 APK。插件缺失/失败时回退 downloadApk。 */
  function nativeUpdaterPlugin() {
    return window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.CapacitorUpdater;
  }

  function applyNativeUpdate(info) {
    var CU = nativeUpdaterPlugin();
    var bundleUrl = info.manifest.bundle && info.manifest.bundle.url;
    if (!CU || typeof CU.download !== 'function' || !bundleUrl) {
      /* 插件缺失（老 APK）或清单未配置热更包 → 回退跳浏览器下载新安装包 */
      setStage('正在打开下载页…', true);
      downloadApk(info.manifest);
      return;
    }
    _installing = true;
    setStage('正在下载更新包…', true);
    clearTimeout(_stallTimer);
    _stallTimer = setTimeout(function () { if (_installing) updateFail('下载长时间没有进展'); }, STALL_TIMEOUT);

    var gotBundle = null;
    try {
      /* 下载进度事件（percent 0-100）驱动真实进度条 */
      CU.addListener && CU.addListener('download', function (s) {
        if (!s || s.percent == null) return;
        clearTimeout(_stallTimer);
        _stallTimer = setTimeout(function () { if (_installing) updateFail('下载长时间没有进展'); }, STALL_TIMEOUT);
        setProgress(Math.round(s.percent), 100);
        setStage('正在下载更新包…', false);
      });
    } catch (e) {}

    CU.download({ url: bundleUrl, version: String(info.latest) }).then(function (bundle) {
      gotBundle = bundle;
      setStage('校验完成，正在切换新版本…', true);
      setProgress(1, 1);
      return CU.set({ id: bundle.id });
    }).then(function () {
      clearTimeout(_stallTimer);
      try { sessionStorage.setItem('vg_upgraded', '1'); } catch (e) {}
      setTimeout(function () { location.reload(); }, 600);
    }).catch(function (e) {
      /* 自动重试 2 次（手机网络下载 10MB 包中途断连很常见），间隔 2 秒 */
      _dlRetry = (_dlRetry || 0) + 1;
      if (_dlRetry <= 2) {
        clearTimeout(_stallTimer);
        setStage('下载中断，正在重试（第 ' + _dlRetry + ' 次）…', true);
        var fill = document.getElementById('upBarFill');
        if (fill) fill.style.width = '0';
        _stallTimer = setTimeout(function () { if (_installing) updateFail('下载长时间没有进展'); }, STALL_TIMEOUT);
        setTimeout(function () { /* 递归调自身重新 download */
          CU.download({ url: bundleUrl, version: String(info.latest) }).then(function (bundle) {
            gotBundle = bundle;
            setStage('校验完成，正在切换新版本…', true);
            setProgress(1, 1);
            return CU.set({ id: bundle.id });
          }).then(function () {
            clearTimeout(_stallTimer);
            try { sessionStorage.setItem('vg_upgraded', '1'); } catch (e) {}
            setTimeout(function () { location.reload(); }, 600);
          }).catch(function () {
            /* 第二次重试也失败 → 自动回退 APK 下载，不再等用户手动点 */
            _installing = false;
            clearTimeout(_stallTimer);
            setStage('热更新多次失败，自动切换为下载安装包方式…', true);
            setTimeout(function () { downloadApk(info.manifest); }, 1500);
          });
        }, 2000);
      } else {
        /* 重试已用完 → 自动回退 */
        _installing = false;
        clearTimeout(_stallTimer);
        setStage('热更新多次失败，自动切换为下载安装包方式…', true);
        setTimeout(function () { downloadApk(info.manifest); }, 1500);
      }
    });
  }

  /* Capgo 机制：热更后的首个会话必须上报“运行正常”，否则插件会自动回滚旧版本 */
  function notifyBundleReady() {
    if (!isApk()) return;
    var CU = nativeUpdaterPlugin();
    if (CU && typeof CU.notifyAppReady === 'function') {
      try { CU.notifyAppReady(); } catch (e) {}
    }
  }

  function waitAndReload(reg) {
    var fired = false;
    var go = function () {
      if (fired) return;
      fired = true;
      clearTimeout(_stallTimer);
      try { sessionStorage.setItem('vg_upgraded', '1'); } catch (e) {}
      location.reload();
    };
    if (navigator.serviceWorker.controller) {
      navigator.serviceWorker.addEventListener('controllerchange', go);
    } else {
      /* 页面原本无控制器，新 SW claim 后等待下一轮 */
      setTimeout(go, 1200);
    }
    setTimeout(go, ACTIVATE_FALLBACK);
  }

  /* SW install 逐文件缓存时广播进度（sw.js 端 postMessage） */
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.addEventListener('message', function (e) {
      var d = e.data || {};
      if (d.type === 'up-progress' && _installing) {
        setProgress(d.done, d.total);
        clearTimeout(_stallTimer);
        _stallTimer = setTimeout(function () {
          if (_installing) updateFail('下载长时间没有进展');
        }, STALL_TIMEOUT);
      }
      if (d.type === 'up-error' && _installing) {
        updateFail('「' + (d.message || '部分文件') + '」下载失败');
      }
    });
  }

  /* ---------- APK：引导下载新安装包 ---------- */

  function downloadApk(mf) {
    var url = mf && mf.apk && mf.apk.url;
    if (!url) { /* 没有托管地址时绝不跳 GitHub（大陆手机必被拦），明确告知 */
      toast('新安装包还没发布，请稍后再试', 'warn', 3500);
      return;
    }
    /* Capacitor WebView 内没有下载能力：_system 交系统浏览器打开下载；
     * 普通浏览器直接跳转触发下载 */
    if (isApk()) {
      try { window.open(url, '_system'); return; } catch (e) {}
    }
    location.href = url;
  }

  /* ---------- 自动检测调度 ---------- */

  function autoCheck() {
    var store = getStore();
    if (!store) return;
    try {
      var p = store.getUpdatePref();
      if (!p.auto) return;
      var interval = (p.intervalHours || 24) * 3600 * 1000;
      if (Date.now() - (p.lastCheck || 0) < interval) return;
    } catch (e) { return; }
    checkUpdate('auto').then(function (r) {
      if (r && r.hasUpdate) showUpdateDialog(r);
    }).catch(function () { /* 自动检查失败静默，等下个周期 */ });
  }

  /* 自动开关（数据管理页 checkbox） */
  function setAuto(on) {
    var store = getStore();
    if (store) { try { store.setUpdatePref({ auto: !!on }); } catch (e) {} }
    toast(on ? '✅ 已开启自动检查更新' : '已关闭自动检查更新（可随时手动检查）', 'ok');
  }

  /* 启动 8 秒后首次检查（避开首屏渲染与新手引导），此后每 30 分钟轮询（受 intervalHours 节流） */
  setTimeout(autoCheck, 8000);
  setInterval(autoCheck, 30 * 60 * 1000);
  /* 热更后的会话上报「运行正常」：缺这一步插件会自动回滚到旧版本 */
  notifyBundleReady();

  /* ---------- 暴露 ---------- */
  window.VG_UPDATE = {
    APP_VERSION: APP_VERSION,
    cmpVersion: cmpVersion,
    isApk: isApk,
    checkUpdate: checkUpdate,
    manualCheck: manualCheck,
    showUpdateDialog: showUpdateDialog,
    closeUpdateDialog: closeUpdateDialog,
    applyUpdate: applyUpdate,
    setAuto: setAuto
  };
})();
