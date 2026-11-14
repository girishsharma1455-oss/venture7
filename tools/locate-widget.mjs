import fs from 'node:fs';
const f = 'C:/giri/v7/v8/src/app/page.tsx';
const s = fs.readFileSync(f, 'utf8');
const i = s.indexOf('-widgetOffset');
if (i >= 0) console.log(JSON.stringify(s.slice(i - 150, i + 80)));
