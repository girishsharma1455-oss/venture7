import fs from 'node:fs';

for (const f of process.argv.slice(2)) {
  const s = fs.readFileSync(f, 'utf8');
  const counts = {};
  const samples = {};
  const re = /<(link|style|script)\b[^>]*>/g;
  let m;
  while ((m = re.exec(s))) {
    const tag = m[1];
    const t = m[0];
    let key;
    if (tag === 'link') {
      const id = (t.match(/id="([^"]+)"/) || [null, '?'])[1];
      key = 'link#' + id;
    } else if (tag === 'script') {
      const src = (t.match(/src="([^"]+)"/) || [null, '(inline)'])[1];
      key = 'script:' + (src === '(inline)' ? 'inline' : src.split('?')[0].split('/').slice(0, 3).join('/'));
    } else {
      const id = (t.match(/id="([^"]+)"/) || [null, '?'])[1];
      const rel = (t.match(/data-related="([^"]+)"/) || [null, ''])[1];
      key = 'style:' + (id !== '?' ? '#' + id : rel ? 'related=' + rel : '(anon)');
    }
    counts[key] = (counts[key] || 0) + 1;
    if (!samples[key]) samples[key] = t.slice(0, 160);
  }
  console.log('\n===== ' + f);
  for (const [k, v] of Object.entries(counts).sort()) console.log('  ' + k + ' : ' + v);
}
