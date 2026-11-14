import fs from 'node:fs';
import * as cheerio from 'cheerio';

const h = fs.readFileSync('C:/giri/v7/venture7-clone/raw/home.html', 'utf8');
const $ = cheerio.load(h);
const css = $('style[data-related="n2-ss-3"]').text();

// print rules relevant to visibility/state
const keep = [];
for (const rule of css.split('}')) {
  if (/slide-background|n2-ss-slide[^a-z-]|n2-ss-layers|visibility|opacity|transform/.test(rule)) keep.push(rule.trim() + '}');
}
console.log(keep.slice(0, 60).join('\n\n'));
