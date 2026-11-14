/**
 * The live CSS references media on the site's media CDN (assets.venture7.com).
 * Rewrite those to the local /assets tree and download the files so the port
 * stays self-contained.
 */
import fs from 'node:fs';
import path from 'node:path';

const V8 = 'C:/giri/v7/v8';
const PUB = path.join(V8, 'public');
const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36';

const HOSTS = /(?:https?:)?\/\/(?:[\w-]+\.)*venture7\.com/gi;

function rewrite(text) {
  return text
    .replace(/https?:\/\/(?:[\w-]+\.)*venture7\.com\/wp-content\/uploads\//gi, '/assets/uploads/')
    .replace(/https?:\/\/(?:[\w-]+\.)*venture7\.com\/wp-content\/themes\/venture7\//gi, '/assets/theme/')
    .replace(/https?:\/\/(?:[\w-]+\.)*venture7\.com\/wp-content\/plugins\//gi, '/assets/vendor/')
    .replace(/https?:\/\/(?:[\w-]+\.)*venture7\.com\/wp-content\//gi, '/assets/vendor/')
    .replace(/https?:\/\/(?:[\w-]+\.)*venture7\.com\/_ext\//gi, '/assets/vendor/');
}

// collect the media the css points at
const cssDir = path.join(PUB, 'assets/css/live');
const files = [];
(function walk(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p);
    else if (p.endsWith('.css')) files.push(p);
  }
})(cssDir);

const wanted = new Set();
for (const f of files) {
  const c = fs.readFileSync(f, 'utf8');
  const re = /url\(\s*["']?((?:https?:)?\/\/[^"')]+)["']?\s*\)/g;
  let m;
  while ((m = re.exec(c))) {
    const u = m[1];
    if (HOSTS.test(u)) {
      HOSTS.lastIndex = 0;
      wanted.add(u);
    }
    HOSTS.lastIndex = 0;
  }
}
console.log('media urls referenced from the live css:', wanted.size);

// 1) download them into the local tree
const localOf = (u) => {
  const p = u.replace(/^https?:\/\/(?:[\w-]+\.)*venture7\.com/gi, '');
  return p.startsWith('/wp-content/uploads/')
    ? '/assets/uploads/' + p.slice('/wp-content/uploads/'.length)
    : p.startsWith('/wp-content/themes/venture7/')
      ? '/assets/theme/' + p.slice('/wp-content/themes/venture7/'.length)
      : p.startsWith('/wp-content/plugins/')
        ? '/assets/vendor/' + p.slice('/wp-content/plugins/'.length)
        : p.startsWith('/_ext/')
          ? '/assets/vendor/' + p.slice('/_ext/'.length)
          : null;
};

let downloaded = 0;
let already = 0;
let gone = 0;
const map = new Map();
for (const u of wanted) {
  const local = localOf(u);
  if (!local) { gone++; continue; }
  map.set(u, local);
  const abs = path.join(PUB, local.replace(/^\//, ''));
  if (fs.existsSync(abs)) { already++; continue; }
  try {
    const res = await fetch(u.startsWith('//') ? 'https:' + u : u, { headers: { 'user-agent': UA } });
    if (!res.ok) { gone++; continue; }
    const buf = Buffer.from(await res.arrayBuffer());
    fs.mkdirSync(path.dirname(abs), { recursive: true });
    fs.writeFileSync(abs, buf);
    downloaded++;
  } catch {
    gone++;
  }
}
console.log(`downloaded: ${downloaded} | already local: ${already} | unavailable: ${gone}`);

// 2) rewrite the css files
let changed = 0;
for (const f of files) {
  const c = fs.readFileSync(f, 'utf8');
  let out = c;
  for (const [u, local] of map) out = out.split(u).join(local);
  out = out.replace(/https?:\/\/(?:[\w-]+\.)*venture7\.com\/wp-content\/uploads\//gi, '/assets/uploads/');
  out = out.replace(/https?:\/\/(?:[\w-]+\.)*venture7\.com\/wp-content\/themes\/venture7\//gi, '/assets/theme/');
  out = out.replace(/https?:\/\/(?:[\w-]+\.)*venture7\.com\/wp-content\/plugins\//gi, '/assets/vendor/');
  out = out.replace(/https?:\/\/(?:[\w-]+\.)*venture7\.com\/wp-content\//gi, '/assets/vendor/');
  out = out.replace(/https?:\/\/(?:[\w-]+\.)*venture7\.com\/_ext\//gi, '/assets/vendor/');
  out = out.replace(/https?:\/\/(?:[\w-]+\.)*venture7\.com\//gi, '/');
  if (out !== c) {
    fs.writeFileSync(f, out);
    changed++;
  }
}
console.log('css files rewritten:', changed);

// 3) same for the inline styles stored in the map
const MAP_FILE = path.join(V8, 'tools/live-css-map.json');
if (fs.existsSync(MAP_FILE)) {
  const mapJson = JSON.parse(fs.readFileSync(MAP_FILE, 'utf8'));
  let s = 0;
  for (const entry of Object.values(mapJson)) {
    for (const st of entry.styles || []) {
      const before = st.css;
      st.css = rewrite(st.css);
      if (st.css !== before) s++;
    }
  }
  fs.writeFileSync(MAP_FILE, JSON.stringify(mapJson, null, 1));
  console.log('inline style blocks rewritten:', s);
}
