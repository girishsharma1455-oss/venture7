/**
 * Rewrites root-relative /wp-content/... urls inside the synced CSS to the
 * local /assets tree and fetches the media they point at (trying the site's
 * www + CDN origins).
 */
import fs from 'node:fs';
import path from 'node:path';

const V8 = 'C:/giri/v7/v8';
const PUB = path.join(V8, 'public');
const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36';

const rewrite = (t) =>
  t
    .replace(/\/wp-content\/uploads\//gi, '/assets/uploads/')
    .replace(/\/wp-content\/themes\/venture7\//gi, '/assets/theme/')
    .replace(/\/wp-content\/plugins\//gi, '/assets/vendor/')
    .replace(/\/wp-content\//gi, '/assets/vendor/')
    .replace(/\/_ext\//gi, '/assets/vendor/');

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
let changed = 0;
for (const f of files) {
  const c = fs.readFileSync(f, 'utf8');
  const out = rewrite(c);
  if (out !== c) {
    fs.writeFileSync(f, out);
    changed++;
  }
  const re = /url\(\s*["']?(?:URL\()?(\/assets\/[^"')]+)["']?\)?\s*\)/gi;
  let m;
  while ((m = re.exec(out))) wanted.add(m[1].split('?')[0]);
}
console.log('css files rewritten:', changed, '| media referenced:', wanted.size);

const originsFor = (ref) => {
  const list = [];
  if (ref.startsWith('/assets/uploads/'))
    list.push('https://www.venture7.com/wp-content/uploads/' + ref.slice('/assets/uploads/'.length));
  else if (ref.startsWith('/assets/theme/'))
    list.push('https://www.venture7.com/wp-content/themes/venture7/' + ref.slice('/assets/theme/'.length));
  else if (ref.startsWith('/assets/vendor/'))
    list.push('https://www.venture7.com/wp-content/plugins/' + ref.slice('/assets/vendor/'.length));
  // the site also serves media from its CDN hosts
  if (ref.startsWith('/assets/uploads/')) {
    const rel = ref.slice('/assets/uploads/'.length);
    list.push('https://assets.venture7.com/wp-content/uploads/' + rel);
    list.push('https://cdn.venture7.com/wp-content/uploads/' + rel);
  }
  return list;
};

let ok = 0;
let gone = 0;
for (const ref of wanted) {
  const abs = path.join(PUB, decodeURIComponent(ref.replace(/^\//, '')));
  if (fs.existsSync(abs)) continue;
  let fetched = false;
  for (const origin of originsFor(ref)) {
    try {
      const res = await fetch(origin, { headers: { 'user-agent': UA } });
      if (!res.ok) continue;
      const buf = Buffer.from(await res.arrayBuffer());
      fs.mkdirSync(path.dirname(abs), { recursive: true });
      fs.writeFileSync(abs, buf);
      console.log('  fetched', buf.length, 'bytes', ref, '<-', origin.split('/')[2]);
      fetched = true;
      ok++;
      break;
    } catch {
      /* try the next origin */
    }
  }
  if (!fetched) gone++;
}
console.log(`media fetched: ${ok} | still unavailable: ${gone}`);
