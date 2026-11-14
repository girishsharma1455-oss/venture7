import fs from 'node:fs';
import htmltojsx from 'htmltojsx';

const file = process.argv[2] || 'C:/giri/v7/venture7-clone/raw/home.html';
const h = fs.readFileSync(file, 'utf8');

const converter = new htmltojsx({ useShortFunctionName: false });
const out = converter.convert(h);
fs.writeFileSync('C:/giri/v7/v8/tools/_sample.tsx', out.replace(/\n/g, '\n'));
console.log('bytes in:', h.length, 'bytes out:', out.length);
