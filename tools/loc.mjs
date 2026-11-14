import fs from 'node:fs';
const f = 'C:/giri/v7/v8/src/app/devops/page.tsx';
const s = fs.readFileSync(f, 'utf8');
const i = s.indexOf('animate pulse animated');
console.log('pos', i);
console.log(JSON.stringify(s.slice(i - 150, i + 220)));
