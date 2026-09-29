/* 发布一致性检查（每次发版推送前必跑）
 * 校验：manifest.latest ↔ js/update.js APP_VERSION ↔ sw.js CACHE ↔ bundle.version 四点一致
 * 历史教训：sw.js CACHE 静默不轮转 → SW 永不换版 → 更新弹窗死循环
 * 用法：node check-release.js  （退出码非 0 = 不得发布） */
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname);
const read = f => fs.readFileSync(path.join(ROOT, f), 'utf8');

const manifest = JSON.parse(read('app/update-manifest.json'));
const appv = (read('app/js/update.js').match(/APP_VERSION = '([^']+)'/) || [])[1];
const cache = (read('app/sw.js').match(/vocab-v([\d.]+)/) || [])[1];
const apkVer = (read('app/js/update.js').match(/APK_VERSION = '([^']+)'/) || [])[1];

const problems = [];
if (!manifest.latest) problems.push('manifest.latest 缺失');
if (manifest.latest !== appv) problems.push(`manifest.latest(${manifest.latest}) ≠ APP_VERSION(${appv})`);
if (manifest.latest !== cache) problems.push(`manifest.latest(${manifest.latest}) ≠ sw.js CACHE(${cache})`);
if (manifest.bundle.version !== manifest.latest) problems.push(`bundle.version(${manifest.bundle.version}) ≠ latest(${manifest.latest})`);
if (!manifest.bundle || !manifest.bundle.url) problems.push('bundle.url 缺失（应用内热更将失败）');
if (manifest.apk && manifest.apk.version && manifest.apk.version !== apkVer) {
  console.log('⚠ 提示：manifest.apk.version(' + manifest.apk.version + ') ≠ update.js APK_VERSION(' + apkVer + ')');
  console.log('  APK_VERSION 应与最近一次构建的 APK 一致；若本轮未出新壳可忽略。');
}

if (problems.length) {
  console.error('✗ 发布检查不通过：');
  problems.forEach(p => console.error('  - ' + p));
  process.exit(1);
}
console.log('✓ 发布检查通过：latest=' + manifest.latest + ' | APP_VERSION=' + appv + ' | CACHE=vocab-v' + cache + ' | bundle=' + manifest.bundle.version + ' | apk=' + manifest.apk.version);
