import fs from 'node:fs';

const src = fs.readFileSync('C:/giri/v7/v8/tools/_sample.tsx', 'utf8');
// The converter may wrap in @return / var @jsx directives — inspect the head
console.log(JSON.stringify(src.slice(0, 400)));
console.log('...');
console.log(JSON.stringify(src.slice(-400)));
