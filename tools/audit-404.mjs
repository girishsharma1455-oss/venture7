/**
 * 404 audit: every root-absolute reference in the generated pages and the CSS
 * files must resolve to a file under public/. Reports the misses.
 */
import fs from 'node:fs';
import path from 'node:path';

const PUB = 'C:/giri/v7/v8/public';
const SRC = 'C:/giri/v7/v8/src';
const missing = new Map();
const seen = new Set();

const routes = new Set(
  JSON.parse(fs.readFileSync('C:/giri/v7/v8/routes.json', 'utf8')).map((r) => r.route)
);

function check(urlPath, from) {
  if (!urlPath || seen.has(urlPath)) return;
  seen.add(urlPath);
  let p = urlPath.split('?')[0].split('#')[0];
  if (!p.startsWith('/')) return;
  let decoded;
  try { decoded = decodeURIComponent(p); } catch { decoded = p; }
  // route-ish links (no file extension in final segment) -> check the route exists
  const lastSeg = decoded.replace(/\/+$/, '').split('/').pop() || '';
  if (!lastSeg.includes('.')) {
    const route = decoded.endsWith('/') ? decoded : decoded + '/';
    if (routes.has(route)) return;
    if (!missing.has(urlPath)) missing.set(urlPath, from + '  [ROUTE]');
    return;
  }
  const abs = path.join(PUB, decoded.replace(/^\//, ''));
  if (fs.existsSync(abs)) return;
  if (!missing.has(urlPath)) missing.set(urlPath, from);
}

function scanFile(f) {
  const s = fs.readFileSync(f, 'utf8');
  const from = f;
  // attributes
  const re = /(?:src|href|poster)="([^"]+)"/g;
  let m;
  while ((m = re.exec(s))) {
    if (m[1].startsWith('/')) check(m[1].trim(), from);
  }
  // srcset candidate URLs
  const re2 = /srcSet="([^"]+)"/g;
  while ((m = re2.exec(s))) {
    for (const part of m[1].split(',')) {
      const u = part.trim().split(/\s+/)[0];
      if (u.startsWith('/')) check(u.trim(), from);
    }
  }
  // url(...)
  const re3 = /url\((['"]?)([^'")]+)\1\)/g;
  while ((m = re3.exec(s))) {
    const u = m[2];
    if (u.startsWith('/')) check(u.trim(), from);
  }
}

const allFiles = [];
(function walk(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p);
    else if (p.endsWith('.tsx') || p.endsWith('.ts') || p.endsWith('.css')) allFiles.push(p);
  }
})(SRC);

// CSS files under public/assets
(function walk2(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk2(p);
    else if (p.endsWith('.css')) allFiles.push(p);
  }
})(path.join(PUB, 'assets'));

for (const f of allFiles) scanFile(f);

console.log('root-absolute refs checked:', seen.size);
console.log('missing targets:', missing.size);
for (const [u, from] of [...missing].slice(0, 60)) {
  console.log('  MISS', u, '   <-', path.relative('C:/giri/v7/v8', from).replace(/\\/g, '/'));
}
