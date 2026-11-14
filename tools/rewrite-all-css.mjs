import fs from 'node:fs';
import path from 'node:path';

const PUB = 'C:/giri/v7/v8/public';

const rewrite = (t) =>
  t
    .replace(/https?:\/\/(?:[\w-]+\.)*venture7\.com\/wp-content\/uploads\//gi, '/assets/uploads/')
    .replace(/https?:\/\/(?:[\w-]+\.)*venture7\.com\/wp-content\/themes\/venture7\//gi, '/assets/theme/')
    .replace(/https?:\/\/(?:[\w-]+\.)*venture7\.com\/wp-content\/plugins\//gi, '/assets/vendor/')
    .replace(/https?:\/\/(?:[\w-]+\.)*venture7\.com\/wp-content\//gi, '/assets/vendor/')
    .replace(/https?:\/\/(?:[\w-]+\.)*venture7\.com\/_ext\//gi, '/assets/vendor/')
    .replace(/https?:\/\/(?:[\w-]+\.)*venture7\.com\//gi, '/')
    .replace(/\/\/(?:[\w-]+\.)*venture7\.com\/wp-content\/uploads\//gi, '/assets/uploads/')
    .replace(/\/\/(?:[\w-]+\.)*venture7\.com\/wp-content\/themes\/venture7\//gi, '/assets/theme/')
    .replace(/\/\/(?:[\w-]+\.)*venture7\.com\/wp-content\/plugins\//gi, '/assets/vendor/')
    .replace(/\/\/(?:[\w-]+\.)*venture7\.com\/wp-content\//gi, '/assets/vendor/')
    .replace(/\/\/(?:[\w-]+\.)*venture7\.com\/_ext\//gi, '/assets/vendor/')
    .replace(/\/\/(?:[\w-]+\.)*venture7\.com\//gi, '/')
    .replace(/\/wp-content\/uploads\//gi, '/assets/uploads/')
    .replace(/\/wp-content\/themes\/venture7\//gi, '/assets/theme/')
    .replace(/\/wp-content\/plugins\//gi, '/assets/vendor/')
    .replace(/\/wp-content\//gi, '/assets/vendor/')
    .replace(/\/_ext\//gi, '/assets/vendor/');

const roots = ['assets/css/pages', 'assets/css/live', 'assets/vendor', 'assets/theme', 'assets/uploads'];
let changed = 0;
let scanned = 0;
for (const r of roots) {
  const dir = path.join(PUB, r);
  if (!fs.existsSync(dir)) continue;
  (function walk(d) {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, e.name);
      if (e.isDirectory()) walk(p);
      else if (p.toLowerCase().endsWith('.css')) {
        scanned++;
        const c = fs.readFileSync(p, 'utf8');
        const out = rewrite(c);
        if (out !== c) {
          fs.writeFileSync(p, out);
          changed++;
        }
      }
    }
  })(dir);
}
console.log('css files scanned:', scanned, '| rewritten:', changed);
