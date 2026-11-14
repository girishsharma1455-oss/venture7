import fs from 'node:fs';
const f = 'C:/giri/v7/v8/src/app/devops/page.tsx';
const s = fs.readFileSync(f, 'utf8');
// Find element with trailing `" ;` pattern
const re = /<p[^>]*animated/g;
let m;
while ((m = re.exec(s))) console.log(m.index, '::', JSON.stringify(s.slice(m.index, m.index + 220)));
