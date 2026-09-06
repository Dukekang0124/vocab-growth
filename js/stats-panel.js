/* ============================================================
 * 词汇生长 — 学习统计面板 (js/stats-panel.js)
 * 依赖：Chart.js（assets/vendor/chart.umd.js）、VG_APP._store、VG_SRS
 * 三图：近 14 天复习量 / 词汇状态分布 / 未来 7 天复习预测
 * 由 app.js 的词汇库 stats 分支调用：renderStatsTab(body)
 * ============================================================ */
var _statsCharts = [];

function destroyStatsCharts() {
  _statsCharts.forEach(function (c) { try { c.destroy(); } catch (e) {} });
  _statsCharts = [];
}

function renderStatsTab(body) {
  destroyStatsCharts();
  if (typeof Chart === 'undefined') { body.innerHTML = '<div class="empty">统计图表加载失败，请刷新重试</div>'; return; }
  var words = (window.VG_APP && VG_APP._store) ? VG_APP._store.getWords() : [];
  var reviewLog = (VG_APP._store.state && VG_APP._store.state.reviewLog) || [];

  /* 数据聚合 */
  var days14 = [], cnt14 = [], i, d;
  for (i = 13; i >= 0; i--) {
    d = new Date(); d.setDate(d.getDate() - i);
    var key = VG_SRS.todayStr(d);
    days14.push((d.getMonth() + 1) + '/' + d.getDate());
    cnt14.push(reviewLog.filter(function (r) { return r.date === key; }).length);
  }
  function isUntested(w) { return w.depth === 'untested' || w.depth == null; }
  var fam = words.filter(function (w) { return !isUntested(w) && w.depth <= 1; }).length;
  var blur = words.filter(function (w) { return !isUntested(w) && w.depth > 1 && w.depth <= 3; }).length;
  var weakN = words.filter(function (w) { return !isUntested(w) && w.depth > 3; }).length;
  var untested = words.filter(isUntested).length;
  var fut7 = [], futCnt = [], total = 0;
  for (i = 0; i < 7; i++) {
    d = new Date(); d.setDate(d.getDate() + i);
    var k2 = VG_SRS.todayStr(d);
    var n = i === 0 ? (VG_APP._store.getStats().dueCount) : words.filter(function (w) { return w.nextReview === k2; }).length;
    fut7.push((d.getMonth() + 1) + '/' + d.getDate());
    futCnt.push(n); total += n;
  }

  body.innerHTML =
    '<div class="card"><div class="card-title">📊 近 14 天复习量</div><div style="height:250px"><canvas id="stRev"></canvas></div></div>' +
    '<div class="card"><div class="card-title">📚 词汇状态分布</div><div style="height:230px"><canvas id="stDist"></canvas></div>' +
    '<div style="display:flex;gap:14px;justify-content:center;flex-wrap:wrap;font-size:13px;color:var(--ink-2);margin-top:10px">' +
    '<span>🟢 记牢 ' + fam + '</span><span>🟡 模糊 ' + blur + '</span><span>🔴 快忘 ' + weakN + '</span><span>⬜ 未测 ' + untested + '</span></div></div>' +
    '<div class="card"><div class="card-title">🔮 未来 7 天复习预测</div>' +
    '<p style="font-size:13px;color:var(--ink-2);margin-bottom:8px">接下来一周有 <b>' + total + '</b> 个词到期——按时复习，别让它们堆积。</p>' +
    '<div style="height:230px"><canvas id="stFut"></canvas></div></div>';

  var INK = '#5C6B62';
  _statsCharts.push(new Chart(document.getElementById('stRev'), {
    type: 'bar',
    data: { labels: days14, datasets: [{ label: '复习词数', data: cnt14, backgroundColor: '#66BB6A', borderRadius: 6 }] },
    options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, ticks: { precision: 0, color: INK } }, x: { ticks: { color: INK, maxRotation: 0, autoSkipPadding: 12 } } } }
  }));
  _statsCharts.push(new Chart(document.getElementById('stDist'), {
    type: 'doughnut',
    data: { labels: ['记牢', '模糊', '快忘', '未测'], datasets: [{ data: [fam, blur, weakN, untested], backgroundColor: ['#66BB6A', '#FFD54F', '#E57373', '#ECEFF1'], borderWidth: 0 }] },
    options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom', labels: { color: INK } } } }
  }));
  _statsCharts.push(new Chart(document.getElementById('stFut'), {
    type: 'bar',
    data: { labels: fut7, datasets: [{ label: '到期词数', data: futCnt, backgroundColor: '#A5D6A7', borderRadius: 6 }] },
    options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, ticks: { precision: 0, color: INK } }, x: { ticks: { color: INK } } } }
  }));
}
