import fs from 'node:fs';
import path from 'node:path';

const roots = ['C:/giri/v7/v8/public/assets/css', 'C:/giri/v7/v8/public/assets/vendor'];
const files = [];
for (const root of roots) {
  (function walk(dir) {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, e.name);
      if (e.isDirectory()) walk(p);
      else if (p.toLowerCase().endsWith('.css')) files.push(p);
    }
  })(root);
}

const hits = [];
for (const f of files) {
  const c = fs.readFileSync(f, 'utf8');
  const re = /[^{}]*elementskit-dropdown[^{}]*\{[^{}]*\}/g;
  let m;
  while ((m = re.exec(c))) {
    const rule = m[0].replace(/\s+/g, ' ');
    if (/visibility:\s*visible|display:\s*block|opacity:\s*1/.test(rule) && !/opacity:0|visibility:hidden/.test(rule)) {
      hits.push(path.relative('C:/giri/v7/v8/public', f).replace(/\\/g, '/') + ' :: ' + rule.slice(0, 200));
    }
  }
}
console.log('reveal rules found:', hits.length);
for (const h of hits.slice(0, 15)) console.log(' -', h);
