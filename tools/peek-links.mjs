import fs from 'node:fs';

const f = 'C:/giri/v7/v8/src/app/page.tsx';
const s = fs.readFileSync(f, 'utf8');
const links = [...s.matchAll(/<link rel="stylesheet" href="([^"]+)"/g)].map((m) => m[1]);
console.log('stylesheet links:', links.length);
for (const l of links.slice(0, 10)) console.log('  ', l);
console.log('  ...');
for (const l of links.slice(-6)) console.log('  ', l);
console.log('script refs:', [...s.matchAll(/src="([^"]*\.js[^"]*)"/g)].map((m) => m[1]).slice(0, 8));
console.log('theme script mentions:', [...s.matchAll(/\/assets\/theme\/js\/[a-zA-Z0-9._-]+/g)].map((m) => m[0]));
