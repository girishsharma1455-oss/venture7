/**
 * Syncs the site's current CSS (and inline style blocks) from the live site
 * into the port, page by page.
 *
 * The original mirror was captured a while ago and the site has changed since
 * (new sections, re-compiled breeze bundles). This pulls the live stylesheets
 * and inline <style> blocks for every route, rewrites their asset URLs to the
 * local /assets tree and writes a map the page generator consumes.
 *
 * Usage: node tools/sync-live-css.mjs [--pages=20]   (no flag = all routes)
 */
import fs from 'node:fs';
import path from 'node:path';

const V8 = 'C:/giri/v7/v8';
const OUT_CSS = path.join(V8, 'public/assets/css/live');
const MAP_FILE = path.join(V8, 'tools/live-css-map.json');
const CSS_CACHE_FILE = path.join(V8, 'tools/live-css-cache.json');
const ORIGIN = 'https://www.venture7.com';
const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36';

const only = process.argv.find((a) => a.startsWith('--pages='));
const LIMIT = only ? Number(only.split('=')[1]) : Infinity;

const routes = JSON.parse(fs.readFileSync(path.join(V8, 'routes.json'), 'utf8')).map((r) => r.route);
const targets = routes.slice(0, LIMIT);

// resume support
let map = {};
try {
  map = JSON.parse(fs.readFileSync(MAP_FILE, 'utf8'));
} catch {
  map = {};
}
let cssCache = new Map();
try {
  cssCache = new Map(Object.entries(JSON.parse(fs.readFileSync(CSS_CACHE_FILE, 'utf8'))));
} catch {
  cssCache = new Map();
}
const pending = targets.filter((r) => !map[r]);
console.log(`routes: ${targets.length} | already synced: ${targets.length - pending.length} | pending: ${pending.length}`);

/* ---------- URL rewriting (live -> local /assets) ---------- */
function rewriteUrls(text) {
  return text
    .replace(/https?:\/\/(?:www\.|cdn\.)?venture7\.com\/wp-content\/uploads\//gi, '/assets/uploads/')
    .replace(/https?:\/\/(?:www\.|cdn\.)?venture7\.com\/wp-content\/themes\/venture7\//gi, '/assets/theme/')
    .replace(/https?:\/\/(?:www\.|cdn\.)?venture7\.com\/wp-content\/plugins\//gi, '/assets/vendor/')
    .replace(/https?:\/\/(?:www\.|cdn\.)?venture7\.com\/wp-content\//gi, '/assets/vendor/')
    .replace(/https?:\/\/(?:www\.|cdn\.)?venture7\.com\/_ext\//gi, '/assets/vendor/')
    .replace(/https?:\/\/(?:www\.|cdn\.)?venture7\.com\//gi, '/')
    .replace(/\/_ext\//g, '/assets/vendor/');
}

function localName(url) {
  const base = url.split('?')[0].split('/').pop() || 'style.css';
  return base.replace(/[^a-zA-Z0-9._-]/g, '_');
}

/* ---------- helpers ---------- */
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function get(url, asText = true) {
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await fetch(url, { headers: { 'user-agent': UA, accept: '*/*' } });
      if (!res.ok) return null;
      return asText ? await res.text() : Buffer.from(await res.arrayBuffer());
    } catch {
      await sleep(400);
    }
  }
  return null;
}

fs.mkdirSync(OUT_CSS, { recursive: true });

const failed = [];

async function fetchCss(url) {
  if (cssCache.has(url)) return cssCache.get(url);
  const body = await get(url);
  if (!body) {
    cssCache.set(url, null);
    return null;
  }
  const name = localName(url);
  const dest = path.join(OUT_CSS, name);
  fs.writeFileSync(dest, rewriteUrls(body));
  const local = '/assets/css/live/' + name;
  cssCache.set(url, local);
  return local;
}

let done = 0;
for (const route of pending) {
  const liveUrl = ORIGIN + route;
  const html = await get(liveUrl);
  if (!html) {
    failed.push({ route, reason: 'page fetch failed' });
    continue;
  }

  // stylesheets served by the site itself (skip google fonts / jsdelivr etc.)
  const sheetUrls = [];
  const linkRe = /<link[^>]*rel=["']stylesheet["'][^>]*>/gi;
  let m;
  while ((m = linkRe.exec(html))) {
    const href = (m[0].match(/href=["']([^"']+)["']/i) || [])[1];
    if (!href) continue;
    const abs = href.startsWith('http') ? href : ORIGIN + href;
    if (/fonts\.googleapis|fonts\.gstatic|cdn\.jsdelivr|cdnjs/.test(abs)) continue; // already self-hosted
    if (!/venture7\.com/.test(abs)) continue;
    sheetUrls.push(abs);
  }

  const localSheets = [];
  for (const u of sheetUrls) {
    const local = await fetchCss(u);
    if (local) localSheets.push(local);
  }

  // inline style blocks (the theme's own critical CSS)
  const styleRe = /<style([^>]*)>([\s\S]*?)<\/style>/gi;
  const styles = [];
  while ((m = styleRe.exec(html))) {
    const attrs = m[1] || '';
    const css = (m[2] || '').trim();
    if (!css) continue;
    if (/sourceURL/.test(css)) continue;
    styles.push({ id: (attrs.match(/id=["']([^"']+)["']/i) || [])[1] || '', css: rewriteUrls(css) });
  }

  map[route] = { css: localSheets, styles };
  done++;
  // save as we go so a long run can be resumed
  fs.writeFileSync(MAP_FILE, JSON.stringify(map, null, 1));
  fs.writeFileSync(CSS_CACHE_FILE, JSON.stringify([...cssCache], null, 1));
  if (done % 10 === 0) process.stdout.write(`  synced ${done}/${pending.length}\n`);
  await sleep(60);
}

fs.writeFileSync(MAP_FILE, JSON.stringify(map, null, 1));
fs.writeFileSync(CSS_CACHE_FILE, JSON.stringify([...cssCache], null, 1));
console.log(`\nroutes synced now: ${done}/${pending.length} | map total: ${Object.keys(map).length}`);
console.log('unique css files:', new Set(Object.values(map).flatMap((m) => m.css)).size);
console.log('failed:', failed.length);
for (const f of failed.slice(0, 10)) console.log('   FAIL', f.route, f.reason);
