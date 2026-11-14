import fs from 'node:fs';
import path from 'node:path';

const dir = 'C:/giri/v7/v8/public/wp-content/cache/breeze-minification/css';
const files = fs.readdirSync(dir);
console.log('css files in breeze cache:', files.length);

const bySize = new Map();
let total = 0;
for (const f of files) {
  const s = fs.statSync(path.join(dir, f));
  total += s.size;
  const key = s.size;
  bySize.set(key, (bySize.get(key) || 0) + 1);
}
console.log('total size MB:', (total / 1024 / 1024).toFixed(1));

const hashes = new Map();
for (const f of files) {
  const m = f.match(/-([0-9a-f]{12})\.css$/);
  const h = m ? m[1] : f;
  hashes.set(h, (hashes.get(h) || 0) + 1);
}
console.log('unique content hashes:', hashes.size);
for (const [h, n] of [...hashes].sort((a, b) => b[1] - a[1]).slice(0, 15)) {
  console.log(' hash', h, 'x', n);
}
