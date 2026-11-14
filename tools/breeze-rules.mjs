import fs from 'node:fs';

const dir = 'C:/giri/v7/v8/public/wp-content/cache/breeze-minification/css';
const files = {
  home: dir + '/breeze_www-venture7-com-1-13800-20e330ae7a0e.css',
  career: dir + '/breeze_career-1-152-4eb9543574ec.css',
  blog: dir + '/breeze_blog-benefits-of-automation-testing-over-manual-testing-for-multilingual-sites-1-2948-73b0e1f81e1e.css',
  salesforce: dir + '/breeze_salesforce-implementation-1-7964-33d6a2ff4667.css',
};

function rules(f) {
  const s = fs.readFileSync(f, 'utf8');
  const m = s.match(/[^{}]+{[^{}]*}/g) || [];
  return new Set(m.map((r) => r.replace(/\s+/g, '')));
}
const R = Object.fromEntries(Object.entries(files).map(([k, f]) => [k, rules(f)]));
for (const k of Object.keys(R)) console.log(k, 'rules:', R[k].size);

function overlap(a, b) {
  let same = 0;
  for (const r of R[a]) if (R[b].has(r)) same++;
  return same;
}
for (const [a, b] of [['home', 'career'], ['home', 'blog'], ['home', 'salesforce'], ['career', 'blog']]) {
  console.log(`${a} ∩ ${b}:`, overlap(a, b), '/', R[a].size, '~', ((100 * overlap(a, b)) / R[a].size).toFixed(1) + '% of', a);
}
