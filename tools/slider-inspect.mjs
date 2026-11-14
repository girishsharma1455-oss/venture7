import fs from 'node:fs';

const h = fs.readFileSync('C:/giri/v7/venture7-clone/raw/home.html', 'utf8');
const i = h.indexOf('id="n2-ss-3"');
console.log('n2-ss-3 at', i);
const seg = h.slice(i, i + 3000);
console.log(seg);

// find the slider settings block (nextend JSON)
const m = h.match(/n2-ss-slider-3[^>]*>/);
console.log('\nslider-3 tag:', m ? m[0] : 'none');
