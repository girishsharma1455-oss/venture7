import fs from 'node:fs';
import path from 'node:path';

const root = 'C:/giri/v7/v8/src';
const out = 'C:/giri/v7/v8/tools/ref-report.txt';

function walk(dir, acc = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, acc);
    else acc.push(p);
  }
  return acc;
}

const files = walk(root).filter((f) => f.endsWith('.tsx') || f.endsWith('.ts') || f.endsWith('.css'));
const report = [];
const patterns = ['wp-content/plugins', 'wp-content/themes', 'wp-content/uploads', 'wp-content/cache', '/_ext/cdn.jsdelivr', '/_ext/cdnjs', '/_ext/fonts', 'custom-style.css', 'venture7/style.css', 'smartslider', 'wp-includes', 'wp-admin', 'www.venture7.com'];
const counts = Object.fromEntries(patterns.map((p) => [p, 0]));
const samples = Object.fromEntries(patterns.map((p) => [p, []]));

for (const f of files) {
  const s = fs.readFileSync(f, 'utf8');
  for (const p of patterns) {
    let i = -1;
    let n = 0;
    let idx = 0;
    while ((idx = s.indexOf(p, idx)) !== -1 && n < 2) { n++; i = idx; idx++; }
    counts[p] += n;
    if (samples[p].length < 3 && i >= 0) {
      samples[p].push(path.relative(root, f) + ' :: ' + s.slice(Math.max(0, i - 70), i + 150).replace(/\n/g, ' '));
    }
  }
}

for (const p of patterns) {
  report.push(`\n==== ${p} ====`);
  for (const s of samples[p]) report.push(s);
}
fs.writeFileSync(out, report.join('\n'));
console.log('counts:', JSON.stringify(counts, null, 2));
