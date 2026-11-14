import fs from 'node:fs';
import path from 'node:path';

const dirs = ['C:/giri/v7/v8/public/assets/css/pages'];
const files = [];
for (const d of dirs) {
  for (const f of fs.readdirSync(d)) if (f.endsWith('.css')) files.push(path.join(d, f));
}

const target = 'service-slider';
for (const f of files) {
  const c = fs.readFileSync(f, 'utf8');
  // find media blocks containing .service-slider
  const mediaRe = /@media[^{]*\{/g;
  let m;
  while ((m = mediaRe.exec(c))) {
    // find matching close brace
    let depth = 1, i = m.index + m[0].length;
    while (i < c.length && depth > 0) { if (c[i] === '{') depth++; else if (c[i] === '}') depth--; i++; }
    const block = c.slice(m.index, i);
    if (block.includes(target) && /font-size/.test(block)) {
      const cond = m[0].replace(/@media\s*/, '').replace(/\{$/, '').trim();
      const rules = block.match(/[^{}]*service-slider[^{}]*\{[^{}]*\}/g) || [];
      const hits = rules.filter(r => /font-size/.test(r));
      if (hits.length) {
        console.log('FILE', path.basename(f));
        console.log('  @media', cond);
        for (const h of hits.slice(0, 6)) console.log('   ', h.replace(/\s+/g, ' ').slice(0, 200));
      }
    }
  }
}
