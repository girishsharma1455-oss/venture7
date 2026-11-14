/**
 * Rewrites asset paths INSIDE the copied CSS files so they point at the new
 * /assets/... tree instead of /wp-content/..., /_ext/... etc.
 * Run once after migrate-assets.mjs --execute.
 */
import fs from 'node:fs';
import path from 'node:path';

const ASSETS = 'C:/giri/v7/v8/public/assets';

const rules = [
  // absolute origin first (case-insensitive scheme/host)
  [/https?:\/\/(www\.)?venture7\.com\/wp-content\/uploads\//gi, '/assets/uploads/'],
  [/https?:\/\/(www\.)?venture7\.com\/wp-content\/themes\/venture7\//gi, '/assets/theme/'],
  [/https?:\/\/(www\.)?venture7\.com\/wp-content\/plugins\//gi, '/assets/vendor/'],
  [/https?:\/\/(www\.)?venture7\.com\/wp-content\/cache\/breeze-minification\/css\//gi, '/assets/css/pages/'],
  [/https?:\/\/(www\.)?venture7\.com\/_ext\//gi, '/assets/vendor/'],
  [/https?:\/\/(www\.)?venture7\.com\//gi, '/'],
  // protocol-relative
  [/\/\/www\.venture7\.com\//gi, '/'],
  // root-absolute
  [/\/wp-content\/uploads\//gi, '/assets/uploads/'],
  [/\/wp-content\/themes\/venture7\//gi, '/assets/theme/'],
  [/\/wp-content\/plugins\//gi, '/assets/vendor/'],
  [/\/wp-content\/cache\/breeze-minification\/css\//gi, '/assets/css/pages/'],
  [/\/_ext\//gi, '/assets/vendor/'],
  [/\/wp-content\//gi, '/assets/vendor/'], // anything else under wp-content -> vendor (rare)
];

const cssFiles = [];
(function walk(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p);
    else if (e.name.toLowerCase().endsWith('.css')) cssFiles.push(p);
  }
})(ASSETS);

let changed = 0;
let wpIncludes = 0;
for (const f of cssFiles) {
  const s = fs.readFileSync(f, 'utf8');
  let out = s;
  for (const [re, rep] of rules) out = out.replace(re, rep);
  const m = out.match(/\/wp-includes\//g);
  if (m) wpIncludes += m.length;
  if (out !== s) {
    fs.writeFileSync(f, out);
    changed++;
  }
}
console.log('css files scanned:', cssFiles.length, '| rewritten:', changed, '| remaining /wp-includes refs:', wpIncludes);
