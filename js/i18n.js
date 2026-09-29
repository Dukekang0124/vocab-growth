/* ============================================================
 * 词汇生长 — 语言切换引擎 (js/i18n.js)
 * 1) 界面语言：中文(默认) / English —— 高频界面文案精确替换
 *    （DOM 文本节点精确匹配词典，MutationObserver 自动跟进动态渲染）
 * 2) 学习内容语言：中文(默认) / English / 双语 —— 词义、复习提示词按语言取值
 *    （词库数据自带英文释义 def，切 English 时复习提示从"看中文拼英文"
 *      变为"看英文释义拼英文"，词卡同步调整）
 * 设置入口：设置 → 通用 → 语言 / Language
 * ============================================================ */
var VG_I18N = (function () {
  'use strict';

  var LS_UI = 'vgUiLang', LS_CONTENT = 'vgContentLang';

  /* ---------- 界面文案词典（精确匹配整段文本节点） ---------- */
  var UI = {
    /* 底部导航 */
    '今日': 'Today', '学习': 'Learn', '阅读': 'Read', '我的': 'Me', '设置': 'Settings',
    /* 学习子导航 */
    '学词': 'New Words', '复习': 'Review', '开口练': 'Speaking', '说法': 'Phrases', '音标': 'Sounds',
    /* 我的子导航 */
    '词汇库': 'Vocabulary', '造句记录': 'Sentences', '成就': 'Achievements', '统计': 'Stats',
    /* 设置子页 */
    '通用': 'General', '数据': 'Data', '关于': 'About',
    '⚙️ 通用': '⚙️ General', '🗂️ 数据': '🗂️ Data', 'ℹ️ 关于': 'ℹ️ About',
    '⚙️ 通用设置': '⚙️ General Settings', '🗂️ 数据管理': '🗂️ Data Management',
    /* 高频按钮 */
    '开始复习（每次 5 词）': 'Start Review (5 words)',
    '开始第一个词 →': 'Start the first word →',
    '去复习': 'Go Review', '去开口练用掉': 'Use it in Speaking',
    '再来一轮': 'One more round', '回今日': 'Back to Today',
    '确认': 'Confirm', '提交 · 立即评分': 'Submit & Score',
    '🔊 发音': '🔊 Sound', '再听': 'Replay', '确认': 'Confirm',
    '✅ 已会说对': '✅ Got it right', '📝 记下来待巩固': '📝 Review later', '🔄 再练一次': '🔄 Try again',
    '导入图书': 'Import Books', '免费获取书虫套装（137册·141MB）': 'Get Bookworm Series (137 books)',
    '拆分为单册': 'Split into books', '删除': 'Delete', '在读': 'Reading', '已读': 'Finished', '全部': 'All',
    '开始测试': 'Start Test', '重新测试': 'Retake', '完成': 'Done',
    '保存': 'Save', '切换语速': 'Speech Speed',
    '导出备份 JSON': 'Export Backup (JSON)', '导出反馈记录': 'Export Feedback',
    '重看新手引导': 'Replay Guide', '重置为种子数据': 'Reset to Seed Data',
    '深色模式': 'Dark Mode', '检查更新': 'Check for Updates',
    '反馈建议': 'Feedback', '知道了': 'Got it', '✕ 知道了': '✕ Got it',
    '看看你的词库 →': 'Open my vocabulary →',
    '选一个词群看看 →': 'Browse word groups →',
    '选一个词试造句 →': 'Pick a word →',
    '看看高频说法 →': 'Browse phrases →',
    '从元音开始听 →': 'Start from vowels →',
    '📚 主动词汇库': '📚 Active Vocabulary', '🔴 薄弱词清单': '🔴 Weak Words',
    '开始我的第一天 →': 'Start my day one →',
    /* 首页仪表盘 */
    '🎯 今日目标': '🎯 Today\'s Goals', '完成四件事就打卡': 'Finish 4 to check in',
    '复习 5 词': 'Review 5', '造句 1 句': '1 Sentence', '开口 1 次': 'Speak ×1', '阅读 10 分钟': 'Read 10 min',
    '📅 今日主题': '📅 Today\'s Topic', '点开收 2 个词，今天就把它用出去 →': 'Tap to collect 2 words →',
    '主动词汇': 'Active', '已造句': 'Sentenced', '待复习': 'Due', '薄弱词': 'Weak', '连续天数': 'Streak',
    '📌 今日一句': '📌 Sentence of the Day', '🔊 跟读': '🔊 Read aloud', '✍️ 造个句': '✍️ Use it', '🎲 换一条': '🎲 Shuffle',
    '今天用掉': 'Use Today', '词汇生长曲线': 'Growth Curve', '累计主动词汇量': 'Total active words',
    '里程碑': 'Milestones', '暂无里程碑， 30 词见': 'First milestone at 30 words',
    /* 板块标题 */
    '📚 书架': '📚 Bookshelf', '点书开读 · 点词查词 · 长按生词': 'Tap to read · tap word to look up · long-press to collect',
    '支持 EPUB / MOBI / AZW3 / TXT / MD / DOCX；大合集自动拆分为单册。PDF 即将支持。': 'EPUB / MOBI / AZW3 / TXT / MD / DOCX supported. PDF coming soon.',
    '📖 词群学习': '📖 Word Groups', '📚 图解词库': '📚 Picture Dictionary',
    '💬 地道说法库': '💬 Phrase Bank', '自测模式': 'Self-test',
    '🔤 发音地基 · 48 国际音标': '🔤 Phonetics · 48 IPA',
    '复习：分层抢救': 'Review: Layered Rescue',
    '🎤 开口练': '🎤 Speaking', '💬 说法库': '💬 Phrases',
    '我的词汇': 'My Vocabulary', '📊 词汇量测试': '📊 Vocabulary Test',
    '🌱 今日': '🌱 Today', '📖 学习': '📖 Learn', '📚 阅读': '📚 Read', '👤 我的': '👤 Me', '⚙️ 设置': '⚙️ Settings',
    '📋 今日看板': '📋 Today\'s Board', '📖 学新词': '📖 Learn New Words',
    '🎯 今天': '🎯 Today', '词汇生长': 'Vocabulary Growth',
    /* 复习页 */
    '中 → 英 · 拼出这个词': '中 → 英 · Spell the word',
    '听音辨词': 'Listen & Recall', '听发音 → 回忆这个词': 'Hear it → recall the word',
    '词群': 'Group',
    /* AI 学伴 */
    '🌱 AI 学伴小苗': '🌱 AI Buddy', '发送': 'Send',
    /* 更新弹窗 */
    '发现新版本': 'New version found', '立即更新': 'Update now', '稍后提醒': 'Later', '跳过此版本': 'Skip',
    '更新内容': "What's new", '立即下载并安装': 'Download & Install',
    /* 设置语言卡 */
    '界面语言': 'Interface', '学习内容': 'Content', '双语': 'Bilingual',
    '语言 / Language': '语言 / Language'
  };

  /* ---------- 状态 ---------- */
  function ui() { try { return localStorage.getItem(LS_UI) || 'zh'; } catch (e) { return 'zh'; } }
  function content() { try { return localStorage.getItem(LS_CONTENT) || 'zh'; } catch (e) { return 'zh'; } }
  function setUi(v) { try { localStorage.setItem(LS_UI, v); } catch (e) {} state.ui = v; }
  function setContent(v) { try { localStorage.setItem(LS_CONTENT, v); } catch (e) {} state.content = v; }

  var state = { ui: ui(), content: content() };

  /* ---------- 界面替换引擎 ---------- */
  var applying = false, pending = null, timer = null;

  function walk(root) {
    if (state.ui !== 'en' || applying) return;
    applying = true;
    try {
      var w = document.createTreeWalker(root || document.body, NodeFilter.SHOW_TEXT, null);
      var n, k, en;
      while ((n = w.nextNode())) {
        var v = n.nodeValue;
        if (!v || v.length < 1 || v.length > 60) continue;
        k = v.trim();
        if (!k) continue;
        en = UI[k];
        if (en && en !== k) n.nodeValue = v.replace(k, en);
      }
    } catch (e) {}
    applying = false;
    if (pending) { pending = false; schedule(); }
  }

  function schedule() {
    if (applying) { pending = true; return; }
    clearTimeout(timer);
    timer = setTimeout(function () { walk(document.body); }, 180);
  }

  function boot() {
    if (state.ui !== 'en') return;
    walk(document.body);
    var mo = new MutationObserver(schedule);
    mo.observe(document.body, { childList: true, subtree: true });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else setTimeout(boot, 0);

  /* ---------- 学习内容取值 ---------- */
  /* 复习提示词：zh 模式看中文拼英文；en 模式看英文释义拼英文；both 双展示 */
  function rescuePrompt(w) {
    var c = content();
    var head = { zh: '中 → 英 · 拼出这个词', en: 'Definition → Word · Spell it', both: '中/EN → 英 · 拼出这个词' }[c];
    var zh = esc(w.zh || w.simple || '—');
    var en = esc(w.def || w.simple || '—');
    if (c === 'en') return { head: head, html: '<div class="rescue-zh">' + en + '</div>' };
    if (c === 'both') return { head: head, html: '<div class="rescue-zh">' + zh + '</div><div style="font-size:14px;color:var(--ink-2);margin-top:4px">' + en + '</div>' };
    return { head: head, html: '<div class="rescue-zh">' + zh + '</div>' };
  }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }

  /* 词卡释义行：en/both 模式在中文释义上方插入英文释义行 */
  function meaningRow(w) {
    var c = content();
    if (c === 'zh') return '';
    var def = w.def || w.simple || '';
    if (!def) return '';
    return '<div class="wc-row"><span class="lbl">EN · </span>' + esc(def) + '</div>';
  }

  return {
    t: function (s) { return state.ui === 'en' ? (UI[s] || s) : s; },
    walk: walk,
    ui: ui, content: content, setUi: setUi, setContent: setContent,
    rescuePrompt: rescuePrompt,
    meaningRow: meaningRow
  };
})();
