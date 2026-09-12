/* 打包 web 热更新资源 zip（供 @capgo/capacitor-updater 应用内下载）
 * 用法：node pack-web.js <版本号>  → 产物 apk-releases/web-<版本>.zip
 * zip 根 = index.html 所在层（app/ 内容，排除 _promo/ 开发临时件） */
const AdmZip = require('adm-zip');
const fs = require('fs');
const path = require('path');
const version = process.argv[2] || '1.0.15';
const ROOT = path.join(__dirname, 'app');
const zip = new AdmZip();
function walk(dir, rel) {
  for (const name of fs.readdirSync(dir)) {
    if (name === '_promo' || name === 'releases' || name === 'apk-releases' || name === 'node_modules') continue;
    const full = path.join(dir, name);
    const r = rel ? rel + '/' + name : name;
    if (fs.statSync(full).isDirectory()) walk(full, r);
    else zip.addFile(r, fs.readFileSync(full));
  }
}
walk(ROOT, '');
const out = path.join(__dirname, 'apk-releases', 'web-' + version + '.zip');
zip.writeZip(out);
console.log('PACKED: ' + out + ' ' + Math.round(fs.statSync(out).size / 1024) + ' KB, entries: ' + zip.getEntries().length);
