import fs from 'node:fs';
const f = 'C:/giri/v7/v8/src/app/devops/page.tsx';
const s = fs.readFileSync(f, 'utf8');
const i = s.indexOf('animation');
console.log('pos-animation', i);
const j = s.indexOf('elementor-widget-devops__para');
console.log('pos-para-el', j);
if (j >= 0) console.log(JSON.stringify(s.slice(j - 100, j + 320)));
