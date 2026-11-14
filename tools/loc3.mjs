import fs from 'node:fs';
const f = 'C:/giri/v7/v8/src/app/devops/page.tsx';
const s = fs.readFileSync(f, 'utf8');
const i = s.indexOf('wp-custom-logo devOps elementor');
console.log('pos', i);
console.log(JSON.stringify(s.slice(i - 50, i + 700)));
