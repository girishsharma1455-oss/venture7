import * as cheerio from 'cheerio';
import fs from 'node:fs';

const h = fs.readFileSync('C:/giri/v7/venture7-clone/raw/future-of-work.html', 'utf8');
const $ = cheerio.load(h);
const out = $.html($('p.banner__para').first());
console.log(JSON.stringify(out));
const i = out.indexOf('banner__para');
console.log(JSON.stringify(out.slice(i, i + 30)));
