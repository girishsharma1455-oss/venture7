import fs from 'node:fs';

const h = fs.readFileSync('C:/giri/v7/venture7-clone/raw/home.html', 'utf8');
const i = h.indexOf('id="n2-ss-3"');
const j = h.indexOf('id="n2-ss-4"', i);
const slider = h.slice(i, j > 0 ? j : i + 30000);
console.log('slider3 total length:', slider.length);

// .n2-ss-slider-4 onwards
const i4 = slider.indexOf('class="n2-ss-slider-4');
console.log('slider-4 at', i4);
console.log(slider.slice(i4, i4 + 3500));
