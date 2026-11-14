import fs from 'node:fs';
import path from 'node:path';

const files = [
  'C:/giri/v7/v8/public/assets/uploads/elementor/css/post-6.css',
  'C:/giri/v7/v8/public/assets/css/pages/breeze-20e330ae7a0e.css',
];
for (const f of files) {
  if (!fs.existsSync(f)) { console.log('missing', f); continue; }
  const c = fs.readFileSync(f, 'utf8');
  console.log('\n###', path.basename(f));
  // rules with font-size:30px that look like elementor heading defaults
  const mediaRe = /@media[^{]*\{/g;
  let m;
  const found = [];
  while ((m = mediaRe.exec(c))) {
    let depth = 1, i = m.index + m[0].length;
    while (i < c.length && depth > 0) { if (c[i] === '{') depth++; else if (c[i] === '}') depth--; i++; }
    const block = c.slice(m.index, i);
    const cond = m[0].replace(/@media\s*/, '').replace(/\{$/, '').trim();
    const hits = (block.match(/[^{}]*\{[^{}]*font-size:\s*30px[^{}]*\}/g) || [])
      .filter(r => /(h2|heading|elementor-heading-title)/.test(r));
    if (hits.length) found.push([cond, hits.slice(0, 4)]);
  }
  for (const [cond, hits] of found.slice(0, 8)) {
    console.log(' @media', cond);
    for (const h of hits) console.log('   ', h.replace(/\s+/g, ' ').slice(0, 190));
  }
}
