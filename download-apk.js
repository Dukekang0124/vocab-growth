const fs = require('fs');
const path = require('path');
const https = require('https');
// token 不入库：优先环境变量 GH_TOKEN，其次本地 .gh-token 文件（已被 .gitignore 排除）
const TOKEN = process.env.GH_TOKEN
  || fs.readFileSync(path.join(__dirname, '.gh-token'), 'utf8').trim();
const REPO = 'Dukekang0124/vocab-growth';
const RUN_ID = 34676008219;

function apiGet(url) {
  return new Promise((resolve, reject) => {
    const opts = { headers: { 'Authorization': 'token ' + TOKEN, 'Accept': 'application/vnd.github.v3+json', 'User-Agent': 'vocab-growth' } };
    https.get(url, opts, res => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          return https.get(res.headers.location, opts, r2 => {
            let d2 = ''; r2.on('data', c => d2 += c);
            r2.on('end', () => resolve(JSON.parse(d2)));
          }).on('error', reject);
        }
        resolve(JSON.parse(data));
      });
      res.on('error', reject);
    }).on('error', reject);
  });
}

function downloadFile(url, dest, withAuth) {
  return new Promise((resolve, reject) => {
    const headers = { 'User-Agent': 'vocab-growth' };
    if (withAuth !== false) headers['Authorization'] = 'token ' + TOKEN;
    const opts = { headers: headers };
    https.get(url, opts, res => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return downloadFile(res.headers.location, dest, false);
      }
      if (res.statusCode !== 200) {
        return reject(new Error('HTTP ' + res.statusCode + ' at ' + url.slice(0, 80)));
      }
      const file = fs.createWriteStream(dest);
      res.pipe(file);
      file.on('finish', () => file.close(() => resolve(dest)));
      file.on('error', reject);
    }).on('error', reject);
  });
}

async function main() {
  // 1. Get artifact
  const runs = await apiGet(`https://api.github.com/repos/${REPO}/actions/runs/${RUN_ID}/artifacts`);
  const artifact = runs.artifacts[0];
  if (!artifact) { console.log('NO_ARTIFACT'); return; }
  console.log('Artifact: ' + artifact.name + ' ' + Math.round(artifact.size_in_bytes/1024) + 'KB');

  // 2. Download artifact zip
  const tmpZip = path.join(require('os').tmpdir(), 'v30final.zip');
  await downloadFile(`https://api.github.com/repos/${REPO}/actions/artifacts/${artifact.id}/zip`, tmpZip);
  console.log('Downloaded: ' + Math.round(fs.statSync(tmpZip).size/1024) + 'KB');

  // 3. Extract APK
  const AdmZip = require(path.join(__dirname, 'node_modules', 'adm-zip'));
  const zip = new AdmZip(tmpZip);
  const apkEntry = zip.getEntries().find(e => e.entryName.endsWith('.apk'));
  if (!apkEntry) { console.log('NO_APK_IN_ZIP'); return; }
  const apkData = apkEntry.getData();

  // 4. Put on desktop
  const desk = path.join(require('os').homedir(), 'Desktop');
  fs.writeFileSync(path.join(desk, 'vocab-growth-1.0.30.apk'), apkData);
  console.log('DESKTOP: vocab-growth-1.0.30.apk ' + Math.round(apkData.length/1024/1024*10)/10 + ' MB');

  // 5. Copy to repo-root apk-releases (归档只存仓库根；Pages 由 deploy.yml 按清单 stage)
  const relDir = path.join(__dirname, 'apk-releases');
  fs.mkdirSync(relDir, { recursive: true });
  fs.writeFileSync(path.join(relDir, 'vocab-growth-1.0.30.apk'), apkData);
  console.log('HOSTED: ' + path.join(relDir, 'vocab-growth-1.0.30.apk'));
}
main().catch(e => console.log('ERROR: ' + e.message));
