import fs from 'node:fs';
import * as cheerio from 'cheerio';

const h = fs.readFileSync('C:/giri/v7/venture7-clone/raw/home.html', 'utf8');
const $ = cheerio.load(h);
const el = $('.n2-ss-slider-controls .n2-ss-widget').first();
console.log('len:', el.length);
console.log('outerHTML:', $.html(el));
console.log('attr style:', JSON.stringify(el.attr('style')));
