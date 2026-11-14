import fs from 'node:fs';
import path from 'node:path';

const root = 'C:/giri/v7/v8/src';
const patterns = ['/wp-content/', '/wp-includes/', '/wp-admin/', '/_ext/', 'wp-content', 'wp-admin'];

function walk(dir, acc = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, acc);
    else if (p.endsWith('.tsx') || p.endsWith('.ts') || p.endsWith('.css')) acc.push(p);
  }
  return acc;
}

const files = walk(root);
const counts = Object.fromEntries(patterns.map((p) => [p, 0]));
const samples = [];

for (const f of files) {
  const s = fs.readFileSync(f, 'utf8');
  for (const p of patterns) {
    let idx = 0, n = 0;
    while ((idx = s.indexOf(p, idx)) !== -1) { n++; idx++; }
    counts[p] += n;
    if (samples.length < 12 && n) {
      idx = s.indexOf(p);
      samples.push(path.relative(root, f) + ' :: ' + s.slice(Math.max(0, idx - 60), idx + 100).replace(/\n/g, ' '));
    }
  }
}
console.log('counts:', counts);
for (const s of samples) console.log('\n', s);
