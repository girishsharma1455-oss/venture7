/**
 * One-time migration: every locally-referenced asset from the old WordPress
 * public/ tree is copied into public/assets/** with clean, WP-free paths.
 *
 * Run: node tools/migrate-assets.mjs [--execute]
 * Default is dry-run (reports what would happen + what is missing).
 */
import fs from 'node:fs';
import path from 'node:path';
import * as cheerio from 'cheerio';

const EXECUTE = process.argv.includes('--execute');
const V8 = 'C:/giri/v7/v8';
const PUB = path.join(V8, 'public');
const RAW = 'C:/giri/v7/venture7-clone/raw';

const rel = (p) => path.relative(PUB, p).replace(/\\/g, '/');
const mkdirp = (p) => fs.mkdirSync(p, { recursive: true });
const copy = (src, dst) => {
  if (!fs.existsSync(src)) { missing.push(src); return; }
  mkdirp(path.dirname(dst));
  if (fs.statSync(src).isDirectory()) {
    fs.cpSync(src, dst, { recursive: true });
  } else {
    fs.copyFileSync(src, dst);
  }
  copied.push([rel(src), rel(dst)]);
};

const copied = [];
const missing = [];

/* ---------- 1) rewrite rules (old public URL path -> new public URL path) ---------- */
// Order matters: longest/most-specific first. Always root-absolute paths.
// root-absolute refs are stored DECODED so checks work on the real on-disk names;
// file URLs with raw unicode (e.g. \u00ae) and spaces then resolve correctly.
function toUrlPath(v) {
  try { return decodeURIComponent(v); } catch { return v; }
}

function targetFor(urlPath) {
  let p = toUrlPath(urlPath);
  if (p.startsWith('/wp-content/uploads/elementor/google-fonts/')) {
    return '/assets/uploads/elementor/google-fonts/' + p.slice('/wp-content/uploads/elementor/google-fonts/'.length);
  }
  if (p.startsWith('/wp-content/uploads/')) {
    return '/assets/uploads/' + p.slice('/wp-content/uploads/'.length);
  }
  if (p.startsWith('/wp-content/plugins/')) {
    return '/assets/vendor/' + p.slice('/wp-content/plugins/'.length);
  }
  if (p.startsWith('/wp-content/themes/venture7/')) {
    return '/assets/theme/' + p.slice('/wp-content/themes/venture7/'.length);
  }
  if (p.startsWith('/wp-content/cache/breeze-minification/css/')) {
    const base = p.slice('/wp-content/cache/breeze-minification/css/'.length);
    const m = base.match(/-([0-9a-f]{12})\.css$/);
    return '/assets/css/pages/' + (m ? 'breeze-' + m[1] + '.css' : base);
  }
  if (p.startsWith('/_ext/')) {
    return '/assets/vendor/' + p.slice('/_ext/'.length);
  }
  if (p.startsWith('/wp-includes/')) {
    return null; // intentionally dropped (emoji + block library .css)
  }
  return null;
}

/* ---------- 2) collect referenced local assets from all raw pages ---------- */
function walk(dir, acc = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, acc);
    else if (e.name.endsWith('.html')) acc.push(p);
  }
  return acc;
}

const rawFiles = walk(RAW);
const refs = new Set();

for (const f of rawFiles) {
  const html = fs.readFileSync(f, 'utf8');
  const $ = cheerio.load(html, { decodeEntities: false });

  // quoted src/href/poster attributes anywhere
  $('[src],[href],[poster]').each((_, el) => {
    for (const attr of ['src', 'href', 'poster']) {
      const v = $(el).attr(attr);
      if (!v) continue;
      // root-absolute only (skip external, data:, #, mailto:)
      if (v.startsWith('/')) refs.add(toUrlPath(v.split('?')[0].split('#')[0]).trim());
      else if (/^https?:\/\/(www\.)?venture7\.com\//.test(v)) refs.add(toUrlPath(new URL(v).pathname).trim());
    }
  });
  // url(...) in style attributes and <style> blocks
  const styleText = [];
  $('[style]').each((_, el) => styleText.push($(el).attr('style') || ''));
  $('style').each((_, el) => styleText.push($(el).text() || ''));
  for (const t of styleText) {
    const re = /url\((['"]?)([^'")]+)\1\)/g;
    let m;
    while ((m = re.exec(t))) {
      const u = m[2];
      if (u.startsWith('/')) refs.add(toUrlPath(u.split('?')[0]).trim());
      else if (/^https?:\/\/(www\.)?venture7\.com\//.test(u)) refs.add(toUrlPath(new URL(u).pathname).trim());
    }
  }
}

console.log('raw pages scanned:', rawFiles.length, '| unique root-absolute refs:', refs.size);

/* ---------- 3) compute copy operations ---------- */
// Large trees copied wholly (needed by relative refs inside CSS):
const wholeTrees = [
  ['wp-content/uploads', 'assets/uploads'],
  ['wp-content/plugins', 'assets/vendor'],
  ['wp-content/themes/venture7', 'assets/theme'],
  ['_ext', 'assets/vendor'],
];

(async () => {
if (EXECUTE) {
  // tree copies
  for (const [from, to] of wholeTrees) {
    const src = path.join(PUB, ...from.split('/'));
    const dst = path.join(PUB, ...to.split('/'));
    if (fs.existsSync(src)) {
      console.log('copy  ', from, '->', to);
      copy(src, dst);
    } else {
      console.log('MISSING tree', from);
      missing.push(src);
    }
  }
  // breeze bundles, deduped by content hash
  const breezeDir = path.join(PUB, 'wp-content/cache/breeze-minification/css');
  const seen = new Map(); // hash -> retained file name
  if (fs.existsSync(breezeDir)) {
    for (const f of fs.readdirSync(breezeDir)) {
      if (!f.endsWith('.css')) continue;
      const m = f.match(/-([0-9a-f]{12})\.css$/);
      const hash = m ? m[1] : f.replace(/\.css$/, '');
      if (seen.has(hash)) continue;
      seen.set(hash, f);
      copy(path.join(breezeDir, f), path.join(PUB, 'assets/css/pages/breeze-' + hash + '.css'));
    }
  }
  // Anything still missing? Download it from the live site into the new tree.
  {
    let ok = 0, fail = 0;
    for (const r of refs) {
      const t = targetFor(r);
      if (!t) continue;
      const dst = path.join(PUB, t.replace(/^\//, ''));
      if (fs.existsSync(dst)) continue;
      const url = 'https://www.venture7.com' + encodeURI(r);
      try {
        const res = await fetch(url, { headers: { 'user-agent': 'Mozilla/5.0' } });
        if (!res.ok) { console.log('   FAIL', res.status, r); fail++; continue; }
        const buf = Buffer.from(await res.arrayBuffer());
        mkdirp(path.dirname(dst));
        fs.writeFileSync(dst, buf);
        console.log('   OK  ', buf.length, 'bytes', r);
        ok++;
      } catch (e) {
        console.log('   FAIL', r, e.message);
        fail++;
      }
    }
    console.log(`downloaded from live site: ${ok} ok, ${fail} failed`);
  }
} else {
  // dry-run: report referenced-but-missing targets and per-rule target usage
  const used = new Map();
  for (const r of refs) {
    const t = targetFor(r);
    if (t === null) {
      used.set('[DROP] ' + r.split('/')[1], (used.get('[DROP] ' + r.split('/')[1]) || 0) + 1);
      continue;
    }
    const seg = t.split('/').slice(0, 3).join('/');
    used.set(seg, (used.get(seg) || 0) + 1);
    const srcAbs = path.join(PUB, r.replace(/^\//, ''));
    if (!fs.existsSync(srcAbs)) missing.push(r);
  }
  console.log('\nref target buckets:');
  for (const [k, v] of [...used].sort((a, b) => b[1] - a[1])) console.log(String(v).padStart(5), k);
  console.log('\nmissing referenced files:', missing.length);
  for (const m of missing.slice(0, 40)) console.log('  MISS', m);
  console.log('\n(dry run — pass --execute to copy)');
}
})().catch((e) => { console.error('MIGRATION FAILED', e); process.exit(1); });
