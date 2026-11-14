import fs from 'node:fs';
const f = 'C:/giri/v7/v8/src/app/page.tsx';
const s = fs.readFileSync(f, 'utf8');
const i = s.indexOf('-widgetOffset: 10');
if (i < 0) { console.log('not found'); process.exit(); }
console.log('pos:', i);
console.log(JSON.stringify(s.slice(i - 80, i + 30)));
