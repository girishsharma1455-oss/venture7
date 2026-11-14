/**
 * Downloads assets that the freshly synced live CSS references but that the
 * old mirror never captured (new images/fonts uploaded since).
 * Local path -> live origin mapping is the inverse of the rewrite rules.
 */
import fs from 'node:fs';
import path from 'node:path';

const V8 = 'C:/giri/v7/v8';
const PUB = path.join(V8, 'public');
const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36';

function liveOrigin(localPath) {
  if (localPath.startsWith('/assets/uploads/'))
    return 'https://www.venture7.com/wp-content/uploads/' + localPath.slice('/assets/uploads/'.length);
  if (localPath.startsWith('/assets/theme/'))
    return 'https://www.venture7.com/wp-content/themes/venture7/' + localPath.slice('/assets/theme/'.length);
  if (localPath.startsWith('/assets/vendor/'))
    return 'https://www.venture7.com/wp-content/plugins/' + localPath.slice('/assets/vendor/'.length);
  return null;
}

// 1) collect every /assets/... reference from the synced css + the style map
const refs = new Set();
const files = [];
(function walk(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p);
    else if (p.endsWith('.css')) files.push(p);
  }
})(path.join(PUB, 'assets/css/live'));

const urlRe = /url\((['"]?)([^'")]+)\1\)/g;
for (const f of files) {
  const s = fs.readFileSync(f, 'utf8');
  let m;
  while ((m = urlRe.exec(s))) {
    const u = m[2];
    if (u.startsWith('/assets/')) refs.add(u.split('?')[0]);
  }
}
const mapFile = path.join(V8, 'tools/live-css-map.json');
if (fs.existsSync(mapFile)) {
  const map = JSON.parse(fs.readFileSync(mapFile, 'utf8'));
  for (const entry of Object.values(map)) {
    for (const s of entry.styles || []) {
      let m;
      while ((m = urlRe.exec(s.css))) {
        const u = m[2];
        if (u.startsWith('/assets/')) refs.add(u.split('?')[0]);
      }
    }
  }
}

console.log('asset references found in synced css:', refs.size);

let missing = 0;
let downloaded = 0;
let failed = 0;
for (const ref of refs) {
  let decoded;
  try { decoded = decodeURIComponent(ref); } catch { decoded = ref; }
  const abs = path.join(PUB, decoded.replace(/^\//, ''));
  if (fs.existsSync(abs)) continue;
  missing++;
  const origin = liveOrigin(decoded);
  if (!origin) { failed++; continue; }
  try {
    const res = await fetch(origin, { headers: { 'user-agent': UA } });
    if (!res.ok) { failed++; continue; }
    const buf = Buffer.from(await res.arrayBuffer());
    fs.mkdirSync(path.dirname(abs), { recursive: true });
    fs.writeFileSync(abs, buf);
    downloaded++;
  } catch {
    failed++;
  }
}
console.log('missing locally:', missing, '| downloaded:', downloaded, '| unavailable:', failed);
