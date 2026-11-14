/**
 * Final cleanup: protocol-relative (//host/...) asset URLs in the synced CSS
 * and inline styles are rewritten to the local /assets tree, and any media
 * they point at that we do not have yet is downloaded.
 */
import fs from 'node:fs';
import path from 'node:path';

const V8 = 'C:/giri/v7/v8';
const PUB = path.join(V8, 'public');
const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36';

function rewrite(text) {
  return text
    .replace(/\/\/(?:[\w-]+\.)*venture7\.com\/wp-content\/uploads\//gi, '/assets/uploads/')
    .replace(/\/\/(?:[\w-]+\.)*venture7\.com\/wp-content\/themes\/venture7\//gi, '/assets/theme/')
    .replace(/\/\/(?:[\w-]+\.)*venture7\.com\/wp-content\/plugins\//gi, '/assets/vendor/')
    .replace(/\/\/(?:[\w-]+\.)*venture7\.com\/wp-content\//gi, '/assets/vendor/')
    .replace(/\/\/(?:[\w-]+\.)*venture7\.com\/_ext\//gi, '/assets/vendor/')
    .replace(/\/\/(?:[\w-]+\.)*venture7\.com\//gi, '/');
}

/* 1) css files */
const cssDir = path.join(PUB, 'assets/css/live');
const files = [];
(function walk(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p);
    else if (p.endsWith('.css')) files.push(p);
  }
})(cssDir);

let changed = 0;
const wanted = new Set();
for (const f of files) {
  const c = fs.readFileSync(f, 'utf8');
  const out = rewrite(c);
  if (out !== c) {
    fs.writeFileSync(f, out);
    changed++;
  }
  const re = /url\(\s*["']?(?:URL\()?(\/assets\/[^"')]+)["']?\)?\s*\)/gi;
  let m;
  while ((m = re.exec(out))) wanted.add(m[1]);
}
console.log('css files rewritten:', changed);

/* 2) inline styles in the map */
const MAP_FILE = path.join(V8, 'tools/live-css-map.json');
const mapJson = JSON.parse(fs.readFileSync(MAP_FILE, 'utf8'));
let s = 0;
for (const entry of Object.values(mapJson)) {
  for (const st of entry.styles || []) {
    const before = st.css;
    st.css = rewrite(st.css);
    if (st.css !== before) {
      s++;
      const re = /url\(\s*["']?(?:URL\()?(\/assets\/[^"')]+)["']?\)?\s*\)/gi;
      let m;
      while ((m = re.exec(st.css))) wanted.add(m[1]);
    }
  }
}
fs.writeFileSync(MAP_FILE, JSON.stringify(mapJson, null, 1));
console.log('inline style blocks rewritten:', s);

/* 3) fetch media that is still missing */
let ok = 0;
let gone = 0;
for (const ref of wanted) {
  const abs = path.join(PUB, ref.replace(/^\//, ''));
  if (fs.existsSync(abs)) continue;
  let origin = null;
  if (ref.startsWith('/assets/uploads/'))
    origin = 'https://www.venture7.com/wp-content/uploads/' + ref.slice('/assets/uploads/'.length);
  else if (ref.startsWith('/assets/theme/'))
    origin = 'https://www.venture7.com/wp-content/themes/venture7/' + ref.slice('/assets/theme/'.length);
  else if (ref.startsWith('/assets/vendor/'))
    origin = 'https://www.venture7.com/wp-content/plugins/' + ref.slice('/assets/vendor/'.length);
  if (!origin) { gone++; continue; }
  try {
    const res = await fetch(origin, { headers: { 'user-agent': UA } });
    if (!res.ok) { gone++; continue; }
    const buf = Buffer.from(await res.arrayBuffer());
    fs.mkdirSync(path.dirname(abs), { recursive: true });
    fs.writeFileSync(abs, buf);
    console.log('  fetched', buf.length, 'bytes', ref);
    ok++;
  } catch {
    gone++;
  }
}
console.log(`media fetched: ${ok} | unavailable: ${gone}`);
