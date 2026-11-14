import fs from 'node:fs';
import path from 'node:path';

const dir = 'C:/giri/v7/v8/public/wp-content/cache/breeze-minification/css';
const files = fs.readdirSync(dir);
const byHash = new Map();
for (const f of files) {
  const m = f.match(/-([0-9a-f]{12})\.css$/);
  const h = m ? m[1] : f;
  if (!byHash.has(h)) byHash.set(h, []);
  byHash.get(h).push(f);
}
let total = 0;
const sizes = [];
for (const [h, list] of byHash) {
  const s = fs.statSync(path.join(dir, list[0])).size;
  total += s;
  sizes.push([h, s, list[0]]);
}
sizes.sort((a, b) => b[1] - a[1]);
console.log('unique files:', sizes.length, 'unique total MB:', (total / 1024 / 1024).toFixed(1));
for (const [h, s, f] of sizes.slice(0, 20)) console.log(String(Math.round(s / 1024)).padStart(6), 'KB', h, f.slice(0, 60));
