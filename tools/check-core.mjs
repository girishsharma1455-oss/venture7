import fs from 'node:fs';
import * as cheerio from 'cheerio';

const h = fs.readFileSync('C:/giri/v7/venture7-clone/raw/venture7-research.html', 'utf8');
const $ = cheerio.load(h);
const out = $.html($('#menu-item-14103'));
console.log(out);
