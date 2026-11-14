import fs from 'node:fs';
import path from 'node:path';

const dir = 'C:/giri/v7/v8/public/assets/css/live';
const PUB = 'C:/giri/v7/v8/public';
const files = fs.readdirSync(dir).filter((f) => f.endsWith('.css'));
const want = new Set();
for (const f of files) {
  const c = fs.readFileSync(path.join(dir, f), 'utf8');
  const re = /url\(\s*["']?(?:URL\()?(\/assets\/[^"')]+)["']?\)?\s*\)/gi;
  let m;
  while ((m = re.exec(c))) want.add(m[1].split('?')[0]);
}
const missing = [...want].filter((r) => !fs.existsSync(PUB + decodeURIComponent(r)));
console.log('media referenced:', want.size, '| missing:', missing.length);
for (const m of missing) {
  const where = [];
  for (const f of files) {
    const c = fs.readFileSync(path.join(dir, f), 'utf8');
    if (c.includes(m)) where.push(f);
  }
  console.log('  ' + m + '   <- ' + where.slice(0, 3).join(', '));
}
