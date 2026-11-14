import fs from 'node:fs';
import path from 'node:path';

const dirs = [
  'C:/giri/v7/v8/public/assets/vendor/elementskit-lite',
  'C:/giri/v7/v8/public/assets/vendor/elementskit',
  'C:/giri/v7/v8/public/assets/css',
];
const files = [];
(function walk(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p);
    else if (e.name.toLowerCase().endsWith('.css')) files.push(p);
  }
})(dirs[0]);
(function walk2(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk2(p);
    else if (e.name.toLowerCase().endsWith('.css')) files.push(p);
  }
})(dirs[2]);

for (const f of files) {
  const c = fs.readFileSync(f, 'utf8');
  let i = -1;
  while ((i = c.indexOf('offcanvas', i + 1)) !== -1) {
    const ctx = c.slice(Math.max(0, i - 80), i + 220).replace(/\s+/g, ' ');
    if (!ctx.includes('elementskit-menu-offcanvas-elements {') || true) {
      console.log('==', path.basename(f), '@', i);
      console.log(ctx);
      console.log();
    }
  }
}
