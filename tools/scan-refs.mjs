import fs from 'node:fs';

const files = process.argv.slice(2);
for (const f of files) {
  const s = fs.readFileSync(f, 'utf8');
  const re = /(?:src|href)="([^"]+)"/g;
  const buckets = {};
  let m;
  while ((m = re.exec(s))) {
    const u = m[1].split('?')[0];
    const top = u.startsWith('/') ? u.split('/').slice(0, 3).join('/') : (u.includes('://') ? new URL(u).host : 'relative:' + u.slice(0, 20));
    buckets[top] = (buckets[top] || 0) + 1;
  }
  console.log('\n===== ' + f.split(/[\\/]/).slice(-4).join('/'));
  for (const [k, v] of Object.entries(buckets).sort((a, b) => b[1] - a[1])) console.log('  ' + k + ' : ' + v);
}
