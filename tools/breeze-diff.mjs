import fs from 'node:fs';

const dir = 'C:/giri/v7/v8/public/wp-content/cache/breeze-minification/css';
const a = fs.readFileSync(dir + '/breeze_www-venture7-com-1-13800-20e330ae7a0e.css', 'utf8');
const b = fs.readFileSync(dir + '/breeze_salesforce-implementation-1-7964-33d6a2ff4667.css', 'utf8');
const c = fs.readFileSync(dir + '/breeze_career-1-152-4eb9543574ec.css', 'utf8');
const d = fs.readFileSync(dir + '/breeze_blog-benefits-of-automation-testing-over-manual-testing-for-multilingual-sites-1-2948-73b0e1f81e1e.css', 'utf8');

function diffStats(x, y) {
  const n = Math.min(x.length, y.length);
  let i = 0;
  while (i < n && x[i] === y[i]) i++;
  let j = 0;
  while (n - 1 - j >= i && x[x.length - 1 - j] === y[y.length - 1 - j]) j++;
  return { samePrefix: i, sameSuffix: j, diffMidX: x.slice(i, x.length - j).length, diffMidY: y.slice(i, y.length - j).length, lenX: x.length, lenY: y.length };
}
console.log('home vs agentic-ai:', JSON.stringify(diffStats(a, b), null, 2));
console.log('home vs career     :', JSON.stringify(diffStats(a, c), null, 2));
console.log('home vs blog-2948  :', JSON.stringify(diffStats(a, d), null, 2));
