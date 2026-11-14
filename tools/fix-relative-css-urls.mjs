/**
 * The synced stylesheets were flattened into /assets/css/live/, so relative
 * url() references (../fonts/x.woff) no longer resolve. This rewrites every
 * relative reference against the file's original live URL and points it at the
 * local /assets copy.
 */
import fs from 'node:fs';
import path from 'node:path';

const V8 = 'C:/giri/v7/v8';
const PUB = path.join(V8, 'public');
const CACHE = path.join(V8, 'tools/live-css-cache.json');

const cache = JSON.parse(fs.readFileSync(CACHE, 'utf8')); // live url -> local path
const localToLive = new Map();
for (const [liveUrl, localPath] of Object.entries(cache)) {
  localToLive.set(localPath, liveUrl);
}

function localFor(absoluteLiveUrl) {
  const u = absoluteLiveUrl.split('?')[0];
  if (u.startsWith('/wp-content/uploads/')) return '/assets/uploads/' + u.slice('/wp-content/uploads/'.length);
  if (u.startsWith('/wp-content/themes/venture7/')) return '/assets/theme/' + u.slice('/wp-content/themes/venture7/'.length);
  if (u.startsWith('/wp-content/plugins/')) return '/assets/vendor/' + u.slice('/wp-content/plugins/'.length);
  if (u.startsWith('/_ext/')) return '/assets/vendor/' + u.slice('/_ext/'.length);
  return null;
}

const dir = path.join(PUB, 'assets/css/live');
let changed = 0;
let rewritten = 0;
const wanted = new Set();

for (const f of fs.readdirSync(dir)) {
  if (!f.endsWith('.css')) continue;
  const localPath = '/assets/css/live/' + f;
  const liveUrl = localToLive.get(localPath);
  if (!liveUrl) continue;
  const abs = path.join(dir, f);
  const c = fs.readFileSync(abs, 'utf8');
  const out = c.replace(/url\(\s*["']?([^"')]+)["']?\s*\)/g, (full, ref) => {
    if (/^(?:https?:)?\/\//.test(ref) || ref.startsWith('/') || ref.startsWith('data:')) return full;
    try {
      const resolved = new URL(ref, liveUrl).pathname;
      const local = localFor(resolved);
      if (!local) return full;
      wanted.add(local);
      rewritten++;
      return `url("${local}")`;
    } catch {
      return full;
    }
  });
  if (out !== c) {
    fs.writeFileSync(abs, out);
    changed++;
  }
}
console.log('css files changed:', changed, '| relative refs rewritten:', rewritten);

// fetch any media we do not have yet
const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36';
let ok = 0;
let gone = 0;
for (const ref of wanted) {
  const dest = path.join(PUB, decodeURIComponent(ref.replace(/^\//, '')));
  if (fs.existsSync(dest)) continue;
  const origins = [];
  if (ref.startsWith('/assets/uploads/'))
    origins.push('https://www.venture7.com/wp-content/uploads/' + ref.slice('/assets/uploads/'.length));
  else if (ref.startsWith('/assets/theme/'))
    origins.push('https://www.venture7.com/wp-content/themes/venture7/' + ref.slice('/assets/theme/'.length));
  else if (ref.startsWith('/assets/vendor/'))
    origins.push('https://www.venture7.com/wp-content/plugins/' + ref.slice('/assets/vendor/'.length));
  let fetched = false;
  for (const o of origins) {
    try {
      const res = await fetch(o, { headers: { 'user-agent': UA } });
      if (!res.ok) continue;
      const buf = Buffer.from(await res.arrayBuffer());
      fs.mkdirSync(path.dirname(dest), { recursive: true });
      fs.writeFileSync(dest, buf);
      console.log('  fetched', buf.length, 'bytes', ref);
      fetched = true;
      ok++;
      break;
    } catch {
      /* next origin */
    }
  }
  if (!fetched) {
    gone++;
    console.log('  unavailable', ref);
  }
}
console.log(`media fetched: ${ok} | unavailable: ${gone}`);
